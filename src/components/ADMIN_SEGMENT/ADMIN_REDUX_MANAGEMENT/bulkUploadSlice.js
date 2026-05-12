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

// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import axios from 'axios';
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // cons/admin/products= '/admin/products';

// // ─── STEP 1: Preview CSV/Excel ───────────────────────────────
// export const previewCSV = createAsyncThunk(
//   'bulkUpload/previewCSV',
//   async (file, { rejectWithValue, dispatch }) => {
//     try {
//       const fd = new FormData();
//       fd.append('csvFile', file);
//       const { data } = await axiosInstance.post(`/admin/products/preview-csv`, fd, {
//         headers : { 'Content-Type': 'multipart/form-data' },
//         timeout : 60_000,
//         onUploadProgress: (e) => {
//           dispatch(setCsvPct(Math.round((e.loaded / e.total) * 100)));
//         },
//       });
//       return data;
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─── STEP 2A: Mode A — image URLs already in Excel ──────────
// export const importWithUrls = createAsyncThunk(
//   'bulkUpload/importWithUrls',
//   async (csvFile, { rejectWithValue, dispatch }) => {
//     try {
//       const fd = new FormData();
//       fd.append('csvFile',   csvFile);
//       fd.append('imageMode', 'url');
//       const { data } = await axiosInstance.post(`/admin/products/import-csv`, fd, {
//         headers : { 'Content-Type': 'multipart/form-data' },
//         timeout : 600_000,
//         onUploadProgress: (e) => {
//           dispatch(setImportPct(Math.round((e.loaded / e.total) * 100)));
//         },
//       });
//       return data;
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─── STEP 2B: Mode B — ZIP folder of images ─────────────────
// export const importWithZip = createAsyncThunk(
//   'bulkUpload/importWithZip',
//   async ({ csvFile, zipFile }, { rejectWithValue, dispatch }) => {
//     try {
//       const fd = new FormData();
//       fd.append('csvFile',   csvFile);
//       fd.append('zipFile',   zipFile);
//       fd.append('imageMode', 'zip');
//       const { data } = await axiosInstance.post(`/admin/products/import-csv`, fd, {
//         headers : { 'Content-Type': 'multipart/form-data' },
//         timeout : 600_000,
//         onUploadProgress: (e) => {
//           dispatch(setImportPct(Math.round((e.loaded / e.total) * 100)));
//         },
//       });
//       return data;
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// const slice = createSlice({
//   name: 'bulkUpload',
//   initialState: {
//     step       : 'mode',   // 'mode' | 'upload' | 'preview' | 'zip' | 'importing' | 'result'
//     imageMode  : null,     // 'url' | 'zip'
//     csvFile    : null,
//     csvPct     : 0,
//     previewing : false,
//     previewData: null,
//     csvError   : null,
//     zipFile    : null,
//     importPct  : 0,
//     importing  : false,
//     result     : null,
//     importError: null,
//   },
//   reducers: {
//     setImageMode   : (s, a) => { s.imageMode = a.payload; s.step = 'upload'; },
//     setCsvFile     : (s, a) => { s.csvFile   = a.payload; },
//     setZipFile     : (s, a) => { s.zipFile   = a.payload; },
//     setCsvPct      : (s, a) => { s.csvPct    = a.payload; },
//     setImportPct   : (s, a) => { s.importPct = a.payload; },
//     goToStep       : (s, a) => { s.step      = a.payload; },
//     resetBulkUpload: ()      => ({
//       step: 'mode', imageMode: null, csvFile: null, csvPct: 0,
//       previewing: false, previewData: null, csvError: null,
//       zipFile: null, importPct: 0, importing: false, result: null, importError: null,
//     }),
//     clearResult: (s) => { s.result = null; s.importError = null; s.step = 'mode'; },
//   },
//   extraReducers: (b) => {
//     b.addCase(previewCSV.pending,   (s) => { s.previewing = true;  s.csvError = null; s.csvPct = 0; });
//     b.addCase(previewCSV.fulfilled, (s, a) => { s.previewing = false; s.previewData = a.payload; s.step = 'preview'; });
//     b.addCase(previewCSV.rejected,  (s, a) => { s.previewing = false; s.csvError = a.payload; });

//     b.addCase(importWithUrls.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
//     b.addCase(importWithUrls.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; });
//     b.addCase(importWithUrls.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'upload'; });

//     b.addCase(importWithZip.pending,   (s) => { s.importing = true;  s.importError = null; s.importPct = 0; s.step = 'importing'; });
//     b.addCase(importWithZip.fulfilled, (s, a) => { s.importing = false; s.result = a.payload; s.step = 'result'; });
//     b.addCase(importWithZip.rejected,  (s, a) => { s.importing = false; s.importError = a.payload; s.step = 'zip'; });
//   },
// });

// export const { setImageMode, setCsvFile, setZipFile, setCsvPct, setImportPct, goToStep, resetBulkUpload, clearResult } = slice.actions;
// export default slice.reducer;

// upload images separete zip parsed
// // ============================================================
// // adminBulkUploadSlice.js
// // TWO-STEP BULK UPLOAD STATE MANAGEMENT
// // Step 1: previewCSV  → parse + show preview
// // Step 2: importZip   → upload ZIP + confirm save to DB
// // ============================================================

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────
// // STEP 1 THUNK — Upload CSV, get preview back
// // POST /admin/products/preview-csv
// // ─────────────────────────────────────────────────────────────
// export const previewCSV = createAsyncThunk(
//   "adminBulkUpload/previewCSV",
//   async ({ file, onProgress }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();
//       fd.append("csvFile", file);

//       const res = await axiosInstance.post("/admin/products/preview-csv", fd, {
//         headers : { "Content-Type": "multipart/form-data" },
//         timeout : 60000, // 1 min — just parsing, no Cloudinary
//         onUploadProgress: (e) => {
//           if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
//         },
//       });

//       if (res.data.success) return res.data;
//       return rejectWithValue(res.data.message || "Preview failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // STEP 2 THUNK — Upload ZIP + parsed products → save to DB
// // POST /admin/products/import-zip
// // ─────────────────────────────────────────────────────────────
// export const importZip = createAsyncThunk(
//   "adminBulkUpload/importZip",
//   async ({ zipFile, parsedProducts, onProgress }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();
//       if (zipFile) fd.append("zipFile", zipFile);
//       fd.append("products", JSON.stringify(parsedProducts));

//       const res = await axiosInstance.post("/admin/products/import-csv", fd, {
//         headers : { "Content-Type": "multipart/form-data" },
//         timeout : 600000, // 10 min — Cloudinary uploads can be slow on large batches
//         onUploadProgress: (e) => {
//           if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
//         },
//       });

//       if (res.data.success) return res.data;
//       return rejectWithValue(res.data.message || "Import failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────
// const adminBulkUploadSlice = createSlice({
//   name: "adminBulkUpload",
//   initialState: {
//     // Step 1
//     csvUploading  : false,
//     csvUploadPct  : 0,
//     preview       : null,   // { totalProducts, validCount, invalidCount, preview[], _parsedData[] }
//     csvError      : null,

//     // Step 2
//     zipUploading  : false,
//     zipUploadPct  : 0,
//     processing    : false,
//     result        : null,   // final import report
//     zipError      : null,
//   },

//   reducers: {
//     setCsvPct: (state, { payload }) => { state.csvUploadPct = payload; },
//     setZipPct: (state, { payload }) => {
//       state.zipUploadPct = payload;
//       state.processing   = payload === 100;
//     },
//     resetBulkUpload: (state) => {
//       state.csvUploading  = false;
//       state.csvUploadPct  = 0;
//       state.preview       = null;
//       state.csvError      = null;
//       state.zipUploading  = false;
//       state.zipUploadPct  = 0;
//       state.processing    = false;
//       state.result        = null;
//       state.zipError      = null;
//     },
//     clearResult: (state) => {
//       state.result     = null;
//       state.zipError   = null;
//     },
//   },

//   extraReducers: (builder) => {
//     // ── Step 1: preview CSV ──
//     builder
//       .addCase(previewCSV.pending, (state) => {
//         state.csvUploading = true;
//         state.csvUploadPct = 0;
//         state.preview      = null;
//         state.csvError     = null;
//       })
//       .addCase(previewCSV.fulfilled, (state, { payload }) => {
//         state.csvUploading = false;
//         state.csvUploadPct = 100;
//         state.preview      = payload;
//       })
//       .addCase(previewCSV.rejected, (state, { payload }) => {
//         state.csvUploading = false;
//         state.csvError     = payload;
//       });

//     // ── Step 2: import ZIP ──
//     builder
//       .addCase(importZip.pending, (state) => {
//         state.zipUploading = true;
//         state.zipUploadPct = 0;
//         state.processing   = false;
//         state.result       = null;
//         state.zipError     = null;
//       })
//       .addCase(importZip.fulfilled, (state, { payload }) => {
//         state.zipUploading = false;
//         state.zipUploadPct = 100;
//         state.processing   = false;
//         state.result       = payload;
//       })
//       .addCase(importZip.rejected, (state, { payload }) => {
//         state.zipUploading = false;
//         state.processing   = false;
//         state.zipError     = payload;
//       });
//   },
// });

// export const { setCsvPct, setZipPct, resetBulkUpload, clearResult } = adminBulkUploadSlice.actions;
// export default adminBulkUploadSlice.reducer;

// working code but upper side have bulk images upload zip system down code have link based 
// // ADMIN_REDUX_MANAGEMENT/adminBulkUploadSlice.js
// //
// // Handles bulk product import via CSV
// // Endpoint: POST /admin/products/import-csv
// // Multer expects field name: "csvFile"

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // THUNK — uploads CSV file and tracks progress via onUploadProgress
// // ✅ FIX — timeout: 300000 (5 min) overrides any axiosInstance default timeout
// // ─────────────────────────────────────────────────────────────────────────────
// export const importProductsCSV = createAsyncThunk(
//   "adminBulkUpload/importCSV",
//   async ({ file, onProgress }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();
//       fd.append("csvFile", file); // ✅ matches multer uploadCSVFile field name

//       const response = await axiosInstance.post(
//         "/admin/products/import-csv",
//         fd,
//         {
//           headers: { "Content-Type": "multipart/form-data" },
//           timeout: 300000, // ✅ 5 minutes — handles large CSV + Cloudinary image uploads
//           onUploadProgress: (progressEvent) => {
//             if (progressEvent.total && onProgress) {
//               const pct = Math.round(
//                 (progressEvent.loaded / progressEvent.total) * 100
//               );
//               onProgress(pct);
//             }
//           },
//         }
//       );

//       if (response.data.success) return response.data;
//       return rejectWithValue(response.data.message || "Import failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminBulkUploadSlice = createSlice({
//   name: "adminBulkUpload",
//   initialState: {
//     uploading:  false,
//     uploadPct:  0,
//     processing: false,
//     result:     null,
//     error:      null,
//   },
//   reducers: {
//     setUploadPct: (state, { payload }) => {
//       state.uploadPct  = payload;
//       state.processing = payload === 100;
//     },
//     resetBulkUpload: (state) => {
//       state.uploading  = false;
//       state.uploadPct  = 0;
//       state.processing = false;
//       state.result     = null;
//       state.error      = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(importProductsCSV.pending, (state) => {
//         state.uploading  = true;
//         state.uploadPct  = 0;
//         state.processing = false;
//         state.result     = null;
//         state.error      = null;
//       })
//       .addCase(importProductsCSV.fulfilled, (state, { payload }) => {
//         state.uploading  = false;
//         state.uploadPct  = 100;
//         state.processing = false;
//         state.result     = payload;
//       })
//       .addCase(importProductsCSV.rejected, (state, { payload }) => {
//         state.uploading  = false;
//         state.processing = false;
//         state.error      = payload;
//       });
//   },
// });

// export const { setUploadPct, resetBulkUpload } = adminBulkUploadSlice.actions;
// export default adminBulkUploadSlice.reducer;
// DOWN CODE IS ALSO WORK BUT TIME OUT ERROR OR UPLOAD FILE NOT THE CSV Type 
// // ADMIN_REDUX_MANAGEMENT/adminBulkUploadSlice.js
// //
// // Handles bulk product import via CSV
// // Endpoint: POST /admin/products/import-csv
// // Multer expects field name: "file" (CSV)

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // THUNK — uploads CSV file and tracks progress via onUploadProgress
// // ─────────────────────────────────────────────────────────────────────────────
// export const importProductsCSV = createAsyncThunk(
//   "adminBulkUpload/importCSV",
//   async ({ file, onProgress }, { rejectWithValue }) => {
//     try {
//       const fd = new FormData();
//       fd.append("file", file);

//       const response = await axiosInstance.post(
//         "/admin/products/import-csv",
//         fd,
//         {
//           headers: { "Content-Type": "multipart/form-data" },
//           onUploadProgress: (progressEvent) => {
//             if (progressEvent.total && onProgress) {
//               const pct = Math.round(
//                 (progressEvent.loaded / progressEvent.total) * 100
//               );
//               onProgress(pct);
//             }
//           },
//         }
//       );

//       if (response.data.success) return response.data;
//       return rejectWithValue(response.data.message || "Import failed");
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || err.message);
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────────────────────
// const adminBulkUploadSlice = createSlice({
//   name: "adminBulkUpload",
//   initialState: {
//     uploading:  false,
//     uploadPct:  0,       // 0–100 file upload progress
//     processing: false,   // true while backend processes rows after upload hits 100%
//     result:     null,    // { totalRows, insertedProducts, failedCount, failed[] }
//     error:      null,
//   },
//   reducers: {
//     setUploadPct: (state, { payload }) => {
//       state.uploadPct  = payload;
//       state.processing = payload === 100;
//     },
//     resetBulkUpload: (state) => {
//       state.uploading  = false;
//       state.uploadPct  = 0;
//       state.processing = false;
//       state.result     = null;
//       state.error      = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(importProductsCSV.pending, (state) => {
//         state.uploading  = true;
//         state.uploadPct  = 0;
//         state.processing = false;
//         state.result     = null;
//         state.error      = null;
//       })
//       .addCase(importProductsCSV.fulfilled, (state, { payload }) => {
//         state.uploading  = false;
//         state.uploadPct  = 100;
//         state.processing = false;
//         state.result     = payload;
//       })
//       .addCase(importProductsCSV.rejected, (state, { payload }) => {
//         state.uploading  = false;
//         state.processing = false;
//         state.error      = payload;
//       });
//   },
// });

// export const { setUploadPct, resetBulkUpload } = adminBulkUploadSlice.actions;
// export default adminBulkUploadSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // Initial state - remove file object from state
// const initialState = {
//   uploadProgress: 0,
//   uploadStatus: 'idle', // 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
//   uploadResult: null,
//   previewData: [],
//   previewLoading: false,
//   previewError: null,
//   uploadError: null,
//   // Store file metadata instead of the actual File object
//   currentFile: {
//     name: null,
//     size: null,
//     type: null,
//   },
//   validationErrors: [],
// };

// // Async thunk for previewing CSV data
// export const previewBulkUpload = createAsyncThunk(
//   'bulkUpload/preview',
//   async (file, { rejectWithValue }) => {
//     const formData = new FormData();
//     formData.append('csvFile', file);

//     try {
//       const response = await axios.post('/api/admin/products/preview-csv', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || 'Preview failed');
//     }
//   }
// );

// // Async thunk for bulk upload
// export const uploadBulkProducts = createAsyncThunk(
//   'bulkUpload/upload',
//   async (file, { rejectWithValue, dispatch }) => {
//     const formData = new FormData();
//     formData.append('csvFile', file);

//     try {
//       const response = await axios.post('/api/admin/products/import-csv', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//         onUploadProgress: (progressEvent) => {
//           const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
//           dispatch(setUploadProgress(percentCompleted));
//         },
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || 'Upload failed');
//     }
//   }
// );

// const bulkUploadSlice = createSlice({
//   name: 'bulkUpload',
//   initialState,
//   reducers: {
//     setUploadProgress: (state, action) => {
//       state.uploadProgress = action.payload;
//     },
//     resetUpload: (state) => {
//       state.uploadProgress = 0;
//       state.uploadStatus = 'idle';
//       state.uploadResult = null;
//       state.uploadError = null;
//       state.currentFile = {
//         name: null,
//         size: null,
//         type: null,
//       };
//       state.previewData = [];
//       state.validationErrors = [];
//     },
//     setCurrentFile: (state, action) => {
//       // Store only serializable file metadata
//       const file = action.payload;
//       state.currentFile = {
//         name: file?.name || null,
//         size: file?.size || null,
//         type: file?.type || null,
//       };
//     },
//     clearPreview: (state) => {
//       state.previewData = [];
//       state.previewError = null;
//       state.validationErrors = [];
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Preview cases
//       .addCase(previewBulkUpload.pending, (state) => {
//         state.previewLoading = true;
//         state.previewError = null;
//         state.validationErrors = [];
//       })
//       .addCase(previewBulkUpload.fulfilled, (state, action) => {
//         state.previewLoading = false;
//         state.previewData = action.payload.preview || [];
//         state.validationErrors = action.payload.errors || [];
//       })
//       .addCase(previewBulkUpload.rejected, (state, action) => {
//         state.previewLoading = false;
//         state.previewError = action.payload;
//       })
      
//       // Upload cases
//       .addCase(uploadBulkProducts.pending, (state) => {
//         state.uploadStatus = 'uploading';
//         state.uploadError = null;
//         state.uploadProgress = 0;
//       })
//       .addCase(uploadBulkProducts.fulfilled, (state, action) => {
//         state.uploadStatus = 'completed';
//         state.uploadResult = action.payload;
//         state.uploadProgress = 100;
//       })
//       .addCase(uploadBulkProducts.rejected, (state, action) => {
//         state.uploadStatus = 'failed';
//         state.uploadError = action.payload;
//         state.uploadProgress = 0;
//       });
//   },
// });

// export const { setUploadProgress, resetUpload, setCurrentFile, clearPreview } = bulkUploadSlice.actions;
// export default bulkUploadSlice.reducer;