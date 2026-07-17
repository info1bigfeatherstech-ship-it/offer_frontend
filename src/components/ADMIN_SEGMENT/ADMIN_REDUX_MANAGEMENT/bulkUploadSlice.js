import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from "../../../SERVICES/axiosInstance";

function extractApiErrorPayload(err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    return {
      message: data.message || err.message || 'Request failed',
      downloadUrl: data.downloadUrl || null,
      errorReportFileName: data.errorReportFileName || null,
      failed: data.failed ?? null,
      aborted: Boolean(data.aborted),
      success: data.success === false ? false : data.success,
    };
  }

  const raw = String(err?.message || err || '');
  // Chrome throws this when the on-disk file changed after <input type="file"> selection.
  if (/ERR_UPLOAD_FILE_CHANGED/i.test(raw) || /Upload.*changed/i.test(raw)) {
    return {
      message:
        'Upload failed because the CSV/ZIP file changed on disk after you selected it. ' +
        'Please re-select the files (do not edit/save them while uploading) and try again.',
      downloadUrl: null,
      aborted: false,
    };
  }
  if (err?.code === 'ERR_NETWORK' || /Network Error/i.test(raw)) {
    return {
      message:
        'Network error while uploading. If you edited the CSV/ZIP after selecting it, re-select the files and retry. ' +
        'Otherwise check your connection and try again.',
      downloadUrl: null,
      aborted: false,
    };
  }

  return { message: raw || 'Request failed', downloadUrl: null, aborted: false };
}

/**
 * Clone a browser File into an in-memory File.
 * Prevents Chrome `net::ERR_UPLOAD_FILE_CHANGED` if the user (or Excel) touches
 * the original path between pick and upload.
 */
export async function stabilizeUploadFile(file) {
  if (!file) return null;
  if (!(file instanceof Blob)) {
    throw new Error('Invalid file selected');
  }
  const buffer = await file.arrayBuffer();
  const name = typeof file.name === 'string' && file.name ? file.name : 'upload.bin';
  const type = file.type || 'application/octet-stream';
  return new File([buffer], name, { type, lastModified: Date.now() });
}

// ─── STEP 1: Preview CSV/Excel ───────────────────────────────
export const previewCSV = createAsyncThunk(
  'bulkUpload/previewCSV',
  async (file, { rejectWithValue, dispatch }) => {
    try {
      if (!file) return rejectWithValue('CSV/Excel file is required');

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

      const summary = data.summary || {};
      const rawProducts = data.products || [];
      const invalidCount =
        summary.invalidProducts ?? rawProducts.filter((p) => p.hasErrors).length;
      const validCount =
        summary.validProducts ?? rawProducts.filter((p) => !p.hasErrors).length;

      return {
        totalProducts  : summary.totalProducts   ?? rawProducts.length,
        validCount,
        invalidCount,
        importBlocked  : Boolean(summary.importBlocked ?? invalidCount > 0),
        hasImageUrls   : rawProducts.some(p => p.hasImages),
        uploadType     : data.uploadType || 'CSV only',
        downloadUrl    : data.downloadUrl || null,
        errorReportFileName: data.errorReportFileName || null,
        warning        : data.warning || null,
        preview: rawProducts.map(p => ({
          name          : p.name,
          category      : p.category,
          variantCount  : p.variantCount   ?? 0,
          productCode   : (p.variants || []).map(v => v.productCode).filter(Boolean),
          totalQuantity : p.totalQuantity  ?? 0,
          imageUrlCount : p.variants?.reduce((s, v) => s + (v.imageCount || 0), 0) ?? (p.hasImages ? 1 : 0),
          hasErrors     : p.hasErrors      ?? false,
          errors        : p.errors || p.productErrors || [],
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
    } catch (err) {
      return rejectWithValue(extractApiErrorPayload(err).message);
    }
  }
);

// ─── STEP 2A: Mode A — image URLs already in Excel ──────────
export const importWithUrls = createAsyncThunk(
  'bulkUpload/importWithUrls',
  async (csvFile, { rejectWithValue, dispatch }) => {
    try {
      if (!csvFile) return rejectWithValue('CSV/Excel file is required');

      const fd = new FormData();
      fd.append('csvFile',   csvFile);
      fd.append('imageMode', 'url');

      const { data } = await axiosInstance.post(`/admin/products/import-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000,
        onUploadProgress: (e) => {
          if (e.total) {
            const uploadPct = Math.round((e.loaded / e.total) * 40);
            dispatch(setImportPct(uploadPct));
          }
        },
      });

      return normalizeImportResult(data);
    } catch (err) {
      const payload = extractApiErrorPayload(err);
      if (payload.aborted || payload.downloadUrl) {
        return {
          ...normalizeImportResult({
            totalRows: err?.response?.data?.totalRows,
            inserted: 0,
            updated: 0,
            failed: payload.failed ?? 0,
            downloadUrl: payload.downloadUrl,
          }),
          aborted: true,
          abortMessage: payload.message,
        };
      }
      return rejectWithValue(payload.message);
    }
  }
);

// ─── STEP 2B: Mode B — ZIP folder of images ─────────────────
export const importWithZip = createAsyncThunk(
  'bulkUpload/importWithZip',
  async ({ csvFile, zipFile }, { rejectWithValue, dispatch }) => {
    try {
      if (!csvFile) return rejectWithValue('CSV/Excel file is required');
      if (!zipFile) return rejectWithValue('Images ZIP file is required');

      const fd = new FormData();
      fd.append('csvFile',    csvFile);
      fd.append('imagesZip',  zipFile);
      fd.append('imageMode',  'zip');

      const { data } = await axiosInstance.post(`/admin/products/bulk-new-products`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000,
        onUploadProgress: (e) => {
          if (e.total) {
            const uploadPct = Math.round((e.loaded / e.total) * 60);
            dispatch(setImportPct(uploadPct));
          }
        },
      });

      return normalizeImportResult(data, 'zip');
    } catch (err) {
      const payload = extractApiErrorPayload(err);
      if (payload.aborted || payload.downloadUrl) {
        return {
          ...normalizeImportResult({
            totalRows: err?.response?.data?.totalRows,
            successful: 0,
            failed: payload.failed ?? 0,
            downloadUrl: payload.downloadUrl,
          }, 'zip'),
          aborted: true,
          abortMessage: payload.message,
        };
      }
      return rejectWithValue(payload.message);
    }
  }
);

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
    errorReportFileName: data.errorReportFileName || null,
    imageMode         : mode,
    aborted           : Boolean(data.aborted),
    abortMessage      : data.message && data.aborted ? data.message : null,
    products: buildSummaryRows({ inserted, updated, failed }),
  };
}

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
      name      : `${failed} row${failed !== 1 ? 's' : ''} failed — nothing was listed`,
      status    : 'failed',
      imageCount: null,
      warnings  : [],
      errors    : ['Download the error report below for row number, product name, product code, and reason'],
      isSummary : true,
    });
  }
  return rows;
}

const initialState = {
  step        : 'mode',
  imageMode   : null,
  // Serializable file metadata only — actual File blobs live in component state.
  csvMeta     : null, // { name, size } | null
  zipMeta     : null,
  csvPct      : 0,
  previewing  : false,
  previewData : null,
  csvError    : null,
  importPct   : 0,
  importing   : false,
  result      : null,
  importError : null,
};

const slice = createSlice({
  name: 'bulkUpload',
  initialState,
  reducers: {
    setImageMode    : (s, a) => {
      s.imageMode = a.payload;
      s.step = 'upload';
      s.csvMeta = null;
      s.zipMeta = null;
      s.previewData = null;
      s.csvError = null;
      s.importError = null;
      s.result = null;
    },
    setCsvMeta      : (s, a) => { s.csvMeta = a.payload; s.csvError = null; },
    setZipMeta      : (s, a) => { s.zipMeta = a.payload; },
    setCsvPct       : (s, a) => { s.csvPct    = a.payload; },
    setImportPct    : (s, a) => { s.importPct = a.payload; },
    goToStep        : (s, a) => { s.step      = a.payload; },
    resetBulkUpload : ()     => ({ ...initialState }),
    clearResult: (s) => { s.result = null; s.importError = null; s.step = 'mode'; },
  },
  extraReducers: (b) => {
    b.addCase(previewCSV.pending,   (s) => { s.previewing = true;  s.csvError = null; s.csvPct = 0; });
    b.addCase(previewCSV.fulfilled, (s, a) => { s.previewing = false; s.previewData = a.payload; s.step = 'preview'; s.csvPct = 100; });
    b.addCase(previewCSV.rejected,  (s, a) => { s.previewing = false; s.csvError = a.payload; s.csvPct = 0; });

    b.addCase(importWithUrls.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
    b.addCase(importWithUrls.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; s.importPct = 100; });
    b.addCase(importWithUrls.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'upload'; s.importPct = 0; });

    b.addCase(importWithZip.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
    b.addCase(importWithZip.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; s.importPct = 100; });
    b.addCase(importWithZip.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'zip'; s.importPct = 0; });
  },
});

export const {
  setImageMode, setCsvMeta, setZipMeta, setCsvPct, setImportPct,
  goToStep, resetBulkUpload, clearResult,
} = slice.actions;

export default slice.reducer;
