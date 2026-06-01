import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from "../../../SERVICES/axiosInstance";

// ─── STEP 1: Preview CSV/Excel ───────────────────────────────
export const previewCSV = createAsyncThunk(
  'bulkUpload/previewCSV',
  async (file, { rejectWithValue, dispatch }) => {
    try {
      const fd = new FormData();
      fd.append('csvFile', file);

      const { data } = await axiosInstance.post(`/admin/products/preview-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
        onUploadProgress: (e) => {
          if (e.total) {
            dispatch(setCsvPct(Math.round((e.loaded / e.total) * 100)));
          }
        },
      });

      // ── Normalize backend preview response ──────────────────
      // Backend returns: { success, summary: { totalProducts, validProducts, invalidProducts, ... }, products: [...] }
      // Frontend expects: { totalProducts, validCount, invalidCount, preview[], hasImageUrls, productCode [] }
      const summary = data.summary || {};
      const rawProducts = data.products || [];

      const normalized = {
        totalProducts  : summary.totalProducts   ?? rawProducts.length,
        validCount     : summary.validProducts   ?? rawProducts.filter(p => !p.hasErrors).length,
        invalidCount   : summary.invalidProducts ?? rawProducts.filter(p =>  p.hasErrors).length,
        hasImageUrls   : rawProducts.some(p => p.hasImages),
        uploadType     : data.uploadType || 'CSV only',
        // Map backend product shape → frontend preview table shape.
        //
        // IMPORTANT: keep the `variants` array intact. Each variant carries
        // its own `errors` and `warnings` (e.g. duplicate productCode,
        // invalid basePrice, missing image folder). Stripping it here would
        // mean the preview table can only show product-level errors and
        // admins would see "⚠" with no message for variant-level issues.
        preview: rawProducts.map(p => ({
          name          : p.name,
          category      : p.category,
          variantCount  : p.variantCount   ?? 0,
          productCode   : (p.variants || []).map(v => v.productCode).filter(Boolean),
          totalQuantity : p.totalQuantity  ?? 0,
          imageUrlCount : p.variants?.reduce((s, v) => s + (v.imageCount || 0), 0) ?? (p.hasImages ? 1 : 0),
          hasErrors     : p.hasErrors      ?? false,
          errors        : p.errors         || [],
          // Preserve per-variant errors/warnings for granular display.
          variants      : (p.variants || []).map(v => ({
            rowNumber  : v.rowNumber,
            productCode: v.productCode,
            isValid    : v.isValid,
            errors     : v.errors   || [],
            warnings   : v.warnings || [],
            hasImages  : v.hasImages,
            imageCount : v.imageCount,
          })),
        })),
      };

      return normalized;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── STEP 2A: Mode A — image URLs already in Excel ──────────
export const importWithUrls = createAsyncThunk(
  'bulkUpload/importWithUrls',
  async (csvFile, { rejectWithValue, dispatch }) => {
    try {
      const fd = new FormData();
      fd.append('csvFile',   csvFile);
      fd.append('imageMode', 'url');

      const { data } = await axiosInstance.post(`/admin/products/import-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000,
        onUploadProgress: (e) => {
          if (e.total) {
            // File upload can only reach ~40% — rest is server processing
            const uploadPct = Math.round((e.loaded / e.total) * 40);
            dispatch(setImportPct(uploadPct));
          }
        },
      });

      // ── Normalize backend import response ───────────────────
      // Backend returns: { success, totalRows, uniqueProducts, inserted, updated, failed, downloadUrl }
      // Frontend result step expects: { totalRows, insertedProducts, failedCount, products[], downloadUrl }
      return normalizeImportResult(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── STEP 2B: Mode B — ZIP folder of images ─────────────────
// NOTE: Uses /bulk-new-products endpoint (not /import-csv)
export const importWithZip = createAsyncThunk(
  'bulkUpload/importWithZip',
  async ({ csvFile, zipFile }, { rejectWithValue, dispatch }) => {
    try {
      const fd = new FormData();
      fd.append('csvFile',    csvFile);
      fd.append('imagesZip',  zipFile);   // field name matches backend multer config
      fd.append('imageMode',  'zip');

      const { data } = await axiosInstance.post(`/admin/products/bulk-new-products`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000,
        onUploadProgress: (e) => {
          if (e.total) {
            // ZIP can be large — upload itself can be 60–70% of total time
            const uploadPct = Math.round((e.loaded / e.total) * 60);
            dispatch(setImportPct(uploadPct));
          }
        },
      });

      // ── Normalize backend bulk-upload response ──────────────
      // Backend returns: { success, totalRows, successful, failed, downloadUrl }
      return normalizeImportResult(data, 'zip');
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── Shared normalizer ───────────────────────────────────────
// Converts either backend shape into what the result UI needs
function normalizeImportResult(data, mode = 'url') {
  const inserted = data.inserted    ?? data.successful ?? 0;
  const updated  = data.updated     ?? 0;
  const failed   = data.failed      ?? 0;
  const total    = data.totalRows   ?? data.total ?? (inserted + updated + failed);

  return {
    totalRows         : total,
    uniqueProducts    : data.uniqueProducts ?? inserted + updated + failed,
    insertedProducts  : inserted,
    updatedProducts   : updated,
    failedCount       : failed,
    downloadUrl       : data.downloadUrl   || null,
    imageMode         : mode,
    // Backend doesn't return per-product rows on import (only on preview)
    // We build summary rows so the result table has something to show
    products: buildSummaryRows({ inserted, updated, failed }),
  };
}

// Build placeholder rows for the result table when backend only returns counts
function buildSummaryRows({ inserted, updated, failed }) {
  const rows = [];
  if (inserted > 0) {
    rows.push({
      name      : `${inserted} product${inserted !== 1 ? 's' : ''} created`,
      status    : 'success',
      imageCount: null,
      warnings  : [],
      errors    : [],
      isSummary : true,
    });
  }
  if (updated > 0) {
    rows.push({
      name      : `${updated} product${updated !== 1 ? 's' : ''} updated`,
      status    : 'success',
      imageCount: null,
      warnings  : [],
      errors    : [],
      isSummary : true,
    });
  }
  if (failed > 0) {
    rows.push({
      name      : `${failed} product${failed !== 1 ? 's' : ''} failed`,
      status    : 'failed',
      imageCount: null,
      warnings  : [],
      errors    : ['Download the error report below for details'],
      isSummary : true,
    });
  }
  return rows;
}

// ─── Slice ───────────────────────────────────────────────────
const slice = createSlice({
  name: 'bulkUpload',
  initialState: {
    step        : 'mode',   // 'mode' | 'upload' | 'preview' | 'zip' | 'importing' | 'result'
    imageMode   : null,     // 'url' | 'zip'
    csvFile     : null,
    csvPct      : 0,
    previewing  : false,
    previewData : null,
    csvError    : null,
    zipFile     : null,
    importPct   : 0,
    importing   : false,
    result      : null,
    importError : null,
  },
  reducers: {
    setImageMode    : (s, a) => { s.imageMode = a.payload; s.step = 'upload'; },
    setCsvFile      : (s, a) => { s.csvFile   = a.payload; s.csvError = null; },
    setZipFile      : (s, a) => { s.zipFile   = a.payload; },
    setCsvPct       : (s, a) => { s.csvPct    = a.payload; },
    setImportPct    : (s, a) => { s.importPct = a.payload; },
    goToStep        : (s, a) => { s.step      = a.payload; },
    resetBulkUpload : ()     => ({
      step: 'mode', imageMode: null, csvFile: null, csvPct: 0,
      previewing: false, previewData: null, csvError: null,
      zipFile: null, importPct: 0, importing: false, result: null, importError: null,
    }),
    clearResult: (s) => { s.result = null; s.importError = null; s.step = 'mode'; },
  },
  extraReducers: (b) => {
    // Preview
    b.addCase(previewCSV.pending,   (s) => { s.previewing = true;  s.csvError = null; s.csvPct = 0; });
    b.addCase(previewCSV.fulfilled, (s, a) => { s.previewing = false; s.previewData = a.payload; s.step = 'preview'; s.csvPct = 100; });
    b.addCase(previewCSV.rejected,  (s, a) => { s.previewing = false; s.csvError = a.payload; s.csvPct = 0; });

    // Import with URLs
    b.addCase(importWithUrls.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
    b.addCase(importWithUrls.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; s.importPct = 100; });
    b.addCase(importWithUrls.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'upload'; s.importPct = 0; });

    // Import with ZIP
    b.addCase(importWithZip.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
    b.addCase(importWithZip.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; s.importPct = 100; });
    b.addCase(importWithZip.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'zip'; s.importPct = 0; });
  },
});

export const {
  setImageMode, setCsvFile, setZipFile, setCsvPct, setImportPct,
  goToStep, resetBulkUpload, clearResult,
} = slice.actions;

export default slice.reducer;

