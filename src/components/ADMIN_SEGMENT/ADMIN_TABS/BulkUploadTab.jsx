import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  previewCSV, importWithUrls, importWithZip,
  setImageMode, setCsvFile, setZipFile, goToStep, resetBulkUpload,
} from '../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice';
import axiosInstance from "../../../SERVICES/axiosInstance"; 
// ─── helpers ─────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();

const downloadWithAuth = async (url) => {
  try {
    const toastId = toast.loading('Downloading error report...');
    
    const response = await axiosInstance.get(url, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const downloadUrl = URL.createObjectURL(blob);
    const filename = url.split('/').pop();
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    
    toast.update(toastId, {
      render: 'Error report downloaded successfully!',
      type: 'success',
      isLoading: false,
      autoClose: 3000
    });
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download error report. Please try again.');
  }
};

// ─── Simulated progress hook ──────────────────────────────────
// Crawls from wherever the real upload % stopped toward 95%
// using an exponential ease so it feels alive during server processing.
// Snaps to 100 when the Redux fulfilled action sets importPct = 100.
function useSimulatedProgress(active, uploadPct) {
  const [displayPct, setDisplayPct] = useState(uploadPct);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => { setDisplayPct(uploadPct); }, [uploadPct]);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }
    startRef.current = performance.now();
    const startVal = uploadPct;
    const tick = (now) => {
      const elapsed  = now - startRef.current;
      const progress = 1 - Math.exp(-elapsed / 90000); // ~95% after 90s
      setDisplayPct(Math.round(Math.min(95, startVal + (95 - startVal) * progress)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return displayPct;
}

// ─── Toast body rendered inside react-toastify ────────────────
// Used for partial failures — keeps the download button right in
// the notification so the admin can act immediately.
const FailureToastBody = ({ failedCount, downloadUrl, onDownload }) => ( // ✅ Added onDownload prop
  <div className="flex flex-col gap-2">
    <p className="text-sm font-semibold text-slate-800">Import completed with issues</p>
    <p className="text-xs text-slate-600">
      {failedCount} product{failedCount !== 1 ? 's' : ''} failed to save.
      All other products were saved successfully.
    </p>
    {downloadUrl && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload(downloadUrl); // ✅ CHANGED: call onDownload instead of window.open
        }}
        className="self-start text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
      >
        ↓ Download error report
      </button>
    )}
    <p className="text-[11px] text-slate-400">
      Fix the errors in your Excel file, then re-upload from the Upload tab.
    </p>
  </div>
);
// ─── StatusBadge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    success            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    saved_with_warnings: 'bg-amber-50  text-amber-700  border-amber-200',
    failed             : 'bg-red-50    text-red-700    border-red-200',
    pending            : 'bg-slate-50  text-slate-500  border-slate-200',
  };
  const label = {
    success            : 'Saved',
    saved_with_warnings: 'Saved with warnings',
    failed             : 'Failed',
    pending            : 'Pending',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || map.pending}`}>
      {label[status] || status}
    </span>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────
const ProgressBar = ({ pct, color = 'bg-indigo-500' }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <div
      className={`h-2 rounded-full transition-all duration-500 ${color}`}
      style={{ width: `${Math.min(100, pct)}%` }}
    />
  </div>
);

// ─── DropZone ────────────────────────────────────────────────
const DropZone = ({ accept, label, hint, icon, onFile, file, disabled }) => {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handle     = (f) => { if (f && !disabled) onFile(f); };
  const onDrop     = useCallback((e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }, [disabled]);
  const onDragOver = (e) => { e.preventDefault(); !disabled && setDrag(true); };
  const onDragLeave= (e) => { e.preventDefault(); setDrag(false); };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${drag
          ? 'border-indigo-400 bg-indigo-50'
          : file
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
        }
      `}
    >
      <input
        ref={inputRef} type="file" accept={accept} className="hidden"
        disabled={disabled} onChange={(e) => handle(e.target.files[0])}
      />
      <div className="text-3xl mb-2">{file ? '✅' : icon}</div>
      {file ? (
        <p className="text-sm font-medium text-emerald-700 truncate">
          {file.name}{' '}
          <span className="text-emerald-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-1">{hint}</p>
        </>
      )}
    </div>
  );
};

// ─── Collapsible product row ──────────────────────────────────
const ProductRow = ({ item }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = item.warnings?.length > 0 || item.errors?.length > 0;
  return (
    <>
      <tr className={`border-b border-slate-100 ${item.status === 'failed' ? 'bg-red-50/30' : ''}`}>
        <td className="py-2.5 px-4 text-sm font-medium text-slate-800 max-w-[200px] truncate">
          {item.name}
          {item.isSummary && (
            <span className="ml-1.5 text-[10px] font-normal text-slate-400 uppercase tracking-wide">summary</span>
          )}
        </td>
        <td className="py-2.5 px-4"><StatusBadge status={item.status} /></td>
        <td className="py-2.5 px-4 text-sm text-slate-600 text-center">
          {item.imageCount != null ? fmt(item.imageCount) : '—'}
        </td>
        <td className="py-2.5 px-4 text-sm text-amber-600 text-center">{item.warnings?.length || 0}</td>
        <td className="py-2.5 px-4 text-sm text-red-600 text-center">{item.errors?.length || 0}</td>
        <td className="py-2.5 px-4">
          {hasDetail && (
            <button onClick={() => setOpen(o => !o)} className="text-xs text-indigo-600 hover:underline">
              {open ? '▲ Hide' : '▼ Detail'}
            </button>
          )}
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={6} className="px-4 py-2 space-y-1">
            {item.errors?.map((e, i) => (
              <div key={i} className="flex gap-2 text-xs text-red-700"><span className="mt-0.5">❌</span><span>{e}</span></div>
            ))}
            {item.warnings?.map((w, i) => (
              <div key={i} className="flex gap-2 text-xs text-amber-700"><span className="mt-0.5">⚠️</span><span>{w}</span></div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════
const BulkUploadModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const {
    step, imageMode,
    csvFile, csvPct, previewing, previewData, csvError,
    zipFile, importPct, importing, result, importError,
  } = useSelector((s) => s.adminBulkUpload);

  const [resultTab, setResultTab] = useState('all');

  // Animated display progress
  const displayImportPct = useSimulatedProgress(importing, importPct);
  const displayCsvPct    = useSimulatedProgress(previewing, csvPct);

  // ── Fire toast exactly once when result arrives ───────────────
  // We track the previous step with a ref so this only fires on
  // the transition  importing → result, never on re-renders.
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current !== 'result' && step === 'result' && result) {
      const { insertedProducts = 0, updatedProducts = 0, failedCount = 0, downloadUrl } = result;
      const savedCount = insertedProducts + updatedProducts;

      if (failedCount === 0) {
        // ✅ Everything saved
        toast.success(
          `Import complete — ${fmt(savedCount)} product${savedCount !== 1 ? 's' : ''} saved successfully!`,
          { autoClose: 5000 }
        );
      } else if (savedCount === 0) {
        // ❌ Nothing saved at all
        toast.error(
          `Import failed — all ${fmt(failedCount)} product${failedCount !== 1 ? 's' : ''} had errors. Download the error report to fix them.`,
          { autoClose: false }
        );
      } else {
        // ⚠️ Partial — some saved, some failed → persistent toast with download button
     toast.warning(
            <FailureToastBody 
              failedCount={failedCount} 
              downloadUrl={downloadUrl}
              onDownload={(url) => downloadWithAuth(url)} // ✅ ADD THIS LINE
            />,
            {
              autoClose   : false,
              closeOnClick: false,
              icon        : false,
            }
          );
      }
    }
    prevStep.current = step;
  }, [step, result]);

  const handleClose        = () => { dispatch(resetBulkUpload()); setResultTab('all'); onClose(); };
  const handlePreview      = () => { if (csvFile)            dispatch(previewCSV(csvFile)); };
  const handleModeAImport  = () => { if (csvFile)            dispatch(importWithUrls(csvFile)); };
  const handleZipImport    = () => { if (csvFile && zipFile) dispatch(importWithZip({ csvFile, zipFile })); };
 const handleDownloadReport = (url) => downloadWithAuth(url);

  if (!isOpen) return null;

  // ─── Step bar config ──────────────────────────────────────
  const modeASteps     = ['Choose mode', 'Upload Excel', 'Preview', 'Done'];
  const modeBSteps     = ['Choose mode', 'Upload Excel', 'Preview', 'Upload ZIP', 'Done'];
  const steps          = imageMode === 'zip' ? modeBSteps : modeASteps;
  const stepIndexMap   = {
    mode     : 0,
    upload   : 1,
    preview  : 2,
    zip      : 3,
    importing: imageMode === 'zip' ? 4 : 3,
    result   : imageMode === 'zip' ? 4 : 3,
  };
  const currentStepIdx = stepIndexMap[step] ?? 0;

  // ─── Result tab helpers ───────────────────────────────────
  const products  = result?.products || [];
  const tabCounts = {
    all     : products.length,
    success : products.filter(p => p.status === 'success').length,
    warnings: products.filter(p => p.status === 'saved_with_warnings').length,
    failed  : products.filter(p => p.status === 'failed').length,
  };
  const filteredProducts = products.filter(p => {
    if (resultTab === 'all')      return true;
    if (resultTab === 'success')  return p.status === 'success';
    if (resultTab === 'warnings') return p.status === 'saved_with_warnings';
    if (resultTab === 'failed')   return p.status === 'failed';
    return true;
  });

  const progressColor = imageMode === 'zip' ? 'bg-violet-500' : 'bg-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Product Upload</h2>
            <p className="text-xs text-slate-400 mt-0.5">Import products from Excel or CSV</p>
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-lg">
            ✕
          </button>
        </div>

        {/* ── Step bar ───────────────────────────────────────── */}
        {step !== 'mode' && (
          <div className="px-6 py-3 border-b border-slate-50 flex items-center gap-2">
            {steps.map((s, i) => {
              const done   = i < currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                    ${done ? 'text-emerald-600' : active ? 'text-indigo-700' : 'text-slate-300'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:block">{s}</span>
                  </div>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${done ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ══ MODE SELECTION ═══════════════════════════════════ */}
          {step === 'mode' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">How are you providing product images?</p>
              <div className="grid  grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => dispatch(setImageMode('url'))}
                  className="group border-2 border-slate-200 cursor-pointer rounded-2xl p-5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 transition-all">
                  <div className="text-3xl mb-3">🔗</div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-800 mb-1">Image URLs in Excel</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Your spreadsheet already has image URLs in the{' '}
                    <code className="bg-slate-100 px-1 rounded">images</code> column.
                    Upload just the Excel file — we fetch and upload images automatically.
                  </div>
                  <div className="mt-3 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">1 file upload →</div>
                </button>

                <button onClick={() => dispatch(setImageMode('zip'))}
                  className="group border-2 border-slate-200 cursor-pointer rounded-2xl p-5 text-left hover:border-violet-400 hover:bg-violet-50/40 transition-all">
                  <div className="text-3xl mb-3">📦</div>
                  <div className="font-semibold text-slate-800 group-hover:text-violet-800 mb-1">Upload images separately</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Images are in a ZIP file. Each folder inside the ZIP is named after the product's{' '}
                    <strong>Product Code number</strong>. Drop the images inside their Product Code folder.
                  </div>
                  <div className="mt-3 text-xs font-medium text-violet-600 group-hover:text-violet-700">Excel + ZIP →</div>
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed border border-slate-100">
                <strong className="text-slate-700">Required columns:</strong>{' '}
                name, title, category, basePrice, Product Code — everything else is optional.
                Multi-variant products: repeat the product name on multiple rows, one row per variant.
              </div>
            </div>
          )}

          {/* ══ UPLOAD — Mode A ═══════════════════════════════════ */}
          {step === 'upload' && imageMode === 'url' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                🔗 <strong>Mode: Image URLs in Excel</strong> — Make sure your Excel has an{' '}
                <code className="bg-white px-1 rounded">images</code> column with comma-separated URLs per row.
              </p>
              <DropZone accept=".csv,.xls,.xlsx" label="Drop your Excel / CSV file"
                hint="CSV, XLS or XLSX — max 10 MB" icon="📄"
                file={csvFile} onFile={(f) => dispatch(setCsvFile(f))} disabled={previewing} />
              {csvError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{csvError}</p>}
              {previewing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Parsing file…</span><span>{displayCsvPct}%</span>
                  </div>
                  <ProgressBar pct={displayCsvPct} />
                </div>
              )}
            </div>
          )}

          {/* ══ UPLOAD — Mode B ═══════════════════════════════════ */}
          {step === 'upload' && imageMode === 'zip' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                📦 <strong>Mode: Separate ZIP images</strong> — Upload your Excel first to preview
                products, then you'll upload the ZIP file.
              </p>
              <DropZone accept=".csv,.xls,.xlsx" label="Drop your Excel / CSV file"
                hint="CSV, XLS or XLSX — max 10 MB" icon="📄"
                file={csvFile} onFile={(f) => dispatch(setCsvFile(f))} disabled={previewing} />
              {csvError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{csvError}</p>}
              {previewing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Parsing file…</span><span>{displayCsvPct}%</span>
                  </div>
                  <ProgressBar pct={displayCsvPct} color="bg-violet-500" />
                </div>
              )}
            </div>
          )}

          {/* ══ PREVIEW ═══════════════════════════════════════════ */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total products', value: previewData.totalProducts, color: 'text-slate-800' },
                  { label: 'Valid',           value: previewData.validCount,    color: 'text-emerald-700' },
                  { label: 'Has errors',      value: previewData.invalidCount,  color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className={`text-2xl font-bold ${color}`}>{fmt(value)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {imageMode === 'url' && previewData.hasImageUrls && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                  ✅ Image URLs detected — they'll be downloaded and uploaded to Cloudinary on import.
                </div>
              )}
              {imageMode === 'url' && !previewData.hasImageUrls && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
                  ⚠️ No image URLs found. Products will be imported without images. You can add them manually afterwards.
                </div>
              )}

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        {['Product', 'Category', 'Variants', 'Product Codes', 'Qty', 'Images', 'Status'].map(h => (
                          <th key={h} className="py-2 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview?.map((p, i) => {
                        // Aggregate ALL error sources for this product:
                        //   1. Product-level errors (e.g. category missing, series clash)
                        //   2. Variant-level errors (e.g. productCode already exists,
                        //      invalid basePrice, duplicate productCode in same product).
                        // Backend already segregates these; the preview row should
                        // surface BOTH so the admin can see exactly why a row is invalid.
                        const productLevelErrors = (p.errors || []).map((e) => ({
                          scope: 'product',
                          text: e
                        }));
                        const variantLevelErrors = (p.variants || []).flatMap((v) =>
                          (v.errors || []).map((e) => ({
                            scope: 'variant',
                            productCode: v.productCode,
                            text: e
                          }))
                        );
                        const allErrors = [...productLevelErrors, ...variantLevelErrors];

                        // Variant warnings (e.g. images missing) — non-blocking,
                        // shown alongside but visually distinct.
                        const variantWarnings = (p.variants || []).flatMap((v) =>
                          (v.warnings || []).map((w) => ({
                            productCode: v.productCode,
                            text: w
                          }))
                        );

                        return (
                          <tr key={i} className={`border-b border-slate-50 ${p.hasErrors ? 'bg-red-50/30' : ''}`}>
                            <td className="py-2 px-3 text-xs font-medium text-slate-800 max-w-[140px] truncate">{p.name}</td>
                            <td className="py-2 px-3 text-xs text-slate-500">{p.category}</td>
                            <td className="py-2 px-3 text-xs text-center">{p.variantCount}</td>
                            <td className="py-2 px-3 text-xs text-slate-500 max-w-[100px] truncate">{p.productCode?.join(', ')}</td>
                            <td className="py-2 px-3 text-xs text-center">{fmt(p.totalQuantity)}</td>
                            <td className="py-2 px-3 text-xs text-center">{imageMode === 'url' ? (p.imageUrlCount || '—') : '(ZIP)'}</td>
                            <td className="py-2 px-3 align-top">
                              {p.hasErrors ? (
                                <div className="space-y-1 max-w-[360px]">
                                  {allErrors.map((err, idx) => (
                                    <div
                                      key={idx}
                                      className="text-[11px] leading-snug text-red-600 break-words"
                                      title={err.text}
                                    >
                                      <span className="font-semibold">⚠</span>{' '}
                                      {err.scope === 'variant' && err.productCode && err.productCode !== 'N/A' && (
                                        <span className="font-mono text-red-700">[{err.productCode}]</span>
                                      )}{' '}
                                      <span>{err.text}</span>
                                    </div>
                                  ))}
                                  {variantWarnings.map((w, idx) => (
                                    <div
                                      key={`w-${idx}`}
                                      className="text-[11px] leading-snug text-amber-700 break-words"
                                      title={w.text}
                                    >
                                      <span className="font-semibold">ⓘ</span>{' '}
                                      {w.productCode && w.productCode !== 'N/A' && (
                                        <span className="font-mono text-amber-700">[{w.productCode}]</span>
                                      )}{' '}
                                      <span>{w.text}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : variantWarnings.length > 0 ? (
                                <div className="space-y-1 max-w-[360px]">
                                  <div className="text-xs text-emerald-600">✓ OK</div>
                                  {variantWarnings.map((w, idx) => (
                                    <div
                                      key={`w-${idx}`}
                                      className="text-[11px] leading-snug text-amber-700 break-words"
                                      title={w.text}
                                    >
                                      <span className="font-semibold">ⓘ</span>{' '}
                                      {w.productCode && w.productCode !== 'N/A' && (
                                        <span className="font-mono text-amber-700">[{w.productCode}]</span>
                                      )}{' '}
                                      <span>{w.text}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-emerald-600">✓ OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewData.invalidCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠ {previewData.invalidCount} product(s) have validation errors and will be{' '}
                  <strong>skipped</strong> during import. Fix them in your file and re-upload, or proceed
                  to import only the valid ones.
                </p>
              )}
            </div>
          )}

          {/* ══ ZIP UPLOAD — Mode B ═══════════════════════════════ */}
          {step === 'zip' && (
            <div className="space-y-4">
              {previewData && (
                <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700">
                  📋 Ready to import <strong>{previewData.validCount}</strong> product(s). Now drop the ZIP file.
                </div>
              )}
              <DropZone accept=".zip" label="Drop your ZIP file of product images"
                hint="Max 500 MB — one folder per Product Code number" icon="📦"
                file={zipFile} onFile={(f) => dispatch(setZipFile(f))} disabled={importing} />
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700">ZIP folder structure:</p>
                <pre className="font-mono text-slate-500 leading-relaxed bg-white rounded-lg p-3 border border-slate-100 text-[11px]">
{`images.zip
├── 665563/          ← Product Code number
│   ├── front.jpg
│   └── back.jpg
├── 45225/
│   └── photo1.webp
└── 2233652/
    └── main.jpg`}
                </pre>
                <p className="text-slate-400">Supported: JPG, PNG, WebP — up to 5 images per variant.</p>
              </div>
              {importError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{importError}</p>
              )}
            </div>
          )}

          {/* ══ IMPORTING ═════════════════════════════════════════ */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <div className="text-5xl animate-bounce">⚡</div>
              <p className="font-semibold text-slate-800">Importing products…</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {imageMode === 'url'
                  ? 'Downloading image URLs and uploading to Cloudinary. This may take a few minutes.'
                  : 'Extracting ZIP, matching barcodes, uploading images to Cloudinary…'}
              </p>
              <div className="max-w-xs mx-auto space-y-2">
                <ProgressBar pct={displayImportPct} color={progressColor} />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {displayImportPct < 40 ? 'Uploading file…'
                      : displayImportPct < 70 ? 'Processing products…'
                      : displayImportPct < 90 ? 'Uploading images…'
                      : 'Finishing up…'}
                  </span>
                  <span>{displayImportPct}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-300">Do not close this window.</p>
            </div>
          )}

          {/* ══ RESULT ════════════════════════════════════════════ */}
          {step === 'result' && result && (
            <div className="space-y-4">

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total rows', value: result.totalRows,        color: 'text-slate-800' },
                  { label: 'Inserted',   value: result.insertedProducts, color: 'text-emerald-700' },
                  { label: 'Updated',    value: result.updatedProducts,  color: 'text-indigo-700' },
                  { label: 'Failed',     value: result.failedCount,      color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className={`text-2xl font-bold ${color}`}>{fmt(value)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* ✅ Full success banner */}
              {result.failedCount === 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-700">
                  ✅ All products imported successfully! You can close this window or import another batch.
                </div>
              )}

              {/* ⚠️ Partial or total failure — prominent download CTA */}
              {result.failedCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5">⚠️</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-amber-800">
                        {result.failedCount} product{result.failedCount !== 1 ? 's' : ''} failed to import
                      </p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        All other products were saved successfully. Download the error report to see exactly
                        which rows failed and why — fix them in your Excel file, then come back and
                        re-upload normally.
                      </p>
                    </div>
                  </div>

                 {result.downloadUrl && (
                      <button
                        onClick={() => downloadWithAuth(result.downloadUrl)} // ✅ CHANGED: call downloadWithAuth directly
                        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                      >
                        <span>↓</span>
                        <span>Download error report (CSV)</span>
                      </button>
                    )}

                  <p className="text-[11px] text-amber-600">
                    The report contains: product name · row number · exact error reason
                  </p>
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-slate-100">
                {['all', 'success', 'warnings', 'failed'].map(tab => (
                  <button key={tab} onClick={() => setResultTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors capitalize
                      ${resultTab === tab ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {tab} ({tabCounts[tab] || 0})
                  </button>
                ))}
              </div>

              {/* Result table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        {['Product', 'Status', 'Images', 'Warnings', 'Errors', ''].map(h => (
                          <th key={h} className="py-2 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p, i) => <ProductRow key={i} item={p} />)
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                            No products in this category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>{/* /body */}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            {step === 'result' ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {/* Back */}
            {step === 'upload' && (
              <button onClick={() => dispatch(goToStep('mode'))}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
            )}
            {step === 'preview' && imageMode === 'zip' && (
              <button onClick={() => dispatch(goToStep('upload'))}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
            )}
            {step === 'zip' && (
              <button onClick={() => dispatch(goToStep('preview'))}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
            )}

            {/* Mode A — Upload → Preview */}
            {step === 'upload' && imageMode === 'url' && (
              <button disabled={!csvFile || previewing} onClick={handlePreview}
                className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {previewing ? 'Parsing…' : 'Preview →'}
              </button>
            )}
            {/* Mode A — Preview → Import */}
            {step === 'preview' && imageMode === 'url' && (
              <button disabled={importing || !previewData?.validCount} onClick={handleModeAImport}
                className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Import {previewData?.validCount || 0} product{previewData?.validCount !== 1 ? 's' : ''} →
              </button>
            )}
            {/* Mode B — Upload → Preview */}
            {step === 'upload' && imageMode === 'zip' && (
              <button disabled={!csvFile || previewing} onClick={handlePreview}
                className="text-sm px-5 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {previewing ? 'Parsing…' : 'Preview →'}
              </button>
            )}
            {/* Mode B — Preview → ZIP */}
            {step === 'preview' && imageMode === 'zip' && (
              <button disabled={!previewData?.validCount} onClick={() => dispatch(goToStep('zip'))}
                className="text-sm px-5 cursor-pointer py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next: Upload ZIP →
              </button>
            )}
            {/* Mode B — ZIP → Import */}
            {step === 'zip' && (
              <button disabled={!zipFile || !csvFile || importing} onClick={handleZipImport}
                className="text-sm px-5 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {importing ? 'Importing…' : `Import ${previewData?.validCount || 0} product${previewData?.validCount !== 1 ? 's' : ''} →`}
              </button>
            )}
            {/* Result — import another batch */}
            {step === 'result' && (
              <button onClick={() => dispatch(resetBulkUpload())}
                className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
                Import another batch
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BulkUploadModal;

// upper code handles new fields plus error download report which helps admin 
// import React, { useCallback, useRef, useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import {
//   previewCSV, importWithUrls, importWithZip,
//   setImageMode, setCsvFile, setZipFile, goToStep, resetBulkUpload,
// } from '../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice';

// // ─── tiny helpers ────────────────────────────────────────────
// const fmt = (n) => Number(n || 0).toLocaleString();

// const StatusBadge = ({ status }) => {
//   const map = {
//     success            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
//     saved_with_warnings: 'bg-amber-50  text-amber-700  border-amber-200',
//     failed             : 'bg-red-50    text-red-700    border-red-200',
//     pending            : 'bg-slate-50  text-slate-500  border-slate-200',
//   };
//   const label = { success: 'Saved', saved_with_warnings: 'Saved with warnings', failed: 'Failed', pending: 'Pending' };
//   return (
//     <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || map.pending}`}>
//       {label[status] || status}
//     </span>
//   );
// };

// const ProgressBar = ({ pct, color = 'bg-indigo-500' }) => (
//   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
//     <div className={`h-2 rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
//   </div>
// );

// // ─── DropZone ────────────────────────────────────────────────
// const DropZone = ({ accept, label, hint, icon, onFile, file, disabled }) => {
//   const inputRef = useRef();
//   const [drag, setDrag] = useState(false);

//   const handle = (f) => { if (f && !disabled) onFile(f); };
//   const onDrop = useCallback((e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }, []);
//   const onDrag = (over) => (e) => { e.preventDefault(); !disabled && setDrag(over); };

//   return (
//     <div
//       onClick={() => !disabled && inputRef.current?.click()}
//       onDrop={onDrop}
//       onDragOver={onDrag(true)}
//       onDragLeave={onDrag(false)}
//       className={`
//         relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
//         ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
//         ${drag ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'}
//       `}
//     >
//       <input ref={inputRef} type="file" accept={accept} className="hidden" disabled={disabled}
//         onChange={(e) => handle(e.target.files[0])} />
//       <div className="text-3xl mb-2">{file ? '✅' : icon}</div>
//       {file
//         ? <p className="text-sm font-medium text-emerald-700 truncate">{file.name} <span className="text-emerald-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span></p>
//         : <>
//             <p className="text-sm font-semibold text-slate-700">{label}</p>
//             <p className="text-xs text-slate-400 mt-1">{hint}</p>
//           </>
//       }
//     </div>
//   );
// };

// // ─── Collapsible row for warnings/errors ─────────────────────
// const ProductRow = ({ item }) => {
//   const [open, setOpen] = useState(false);
//   const hasDetail = item.warnings?.length > 0 || item.errors?.length > 0;
//   return (
//     <>
//       <tr className={`border-b border-slate-100 ${item.status === 'failed' ? 'bg-red-50/30' : ''}`}>
//         <td className="py-2.5 px-4 text-sm font-medium text-slate-800 max-w-[200px] truncate">{item.name}</td>
//         <td className="py-2.5 px-4"><StatusBadge status={item.status} /></td>
//         <td className="py-2.5 px-4 text-sm text-slate-600 text-center">{fmt(item.imageCount)}</td>
//         <td className="py-2.5 px-4 text-sm text-amber-600 text-center">{item.warnings?.length || 0}</td>
//         <td className="py-2.5 px-4 text-sm text-red-600 text-center">{item.errors?.length || 0}</td>
//         <td className="py-2.5 px-4">
//           {hasDetail && (
//             <button onClick={() => setOpen(o => !o)} className="text-xs text-indigo-600 hover:underline">
//               {open ? '▲ Hide' : '▼ Detail'}
//             </button>
//           )}
//         </td>
//       </tr>
//       {open && hasDetail && (
//         <tr className="bg-slate-50 border-b border-slate-100">
//           <td colSpan={6} className="px-4 py-2 space-y-1">
//             {item.errors?.map((e, i) => (
//               <div key={i} className="flex gap-2 text-xs text-red-700">
//                 <span className="mt-0.5">❌</span><span>{e}</span>
//               </div>
//             ))}
//             {item.warnings?.map((w, i) => (
//               <div key={i} className="flex gap-2 text-xs text-amber-700">
//                 <span className="mt-0.5">⚠️</span><span>{w}</span>
//               </div>
//             ))}
//           </td>
//         </tr>
//       )}
//     </>
//   );
// };

// // ═══════════════════════════════════════════════════════════════
// // MAIN MODAL
// // ═══════════════════════════════════════════════════════════════
// const BulkUploadModal = ({ isOpen, onClose }) => {
//   const dispatch = useDispatch();
//   const {
//     step, imageMode,
//     csvFile, csvPct, previewing, previewData, csvError,
//     zipFile, importPct, importing, result, importError,
//   } = useSelector(s => s.adminBulkUpload);

//   const [resultTab, setResultTab] = useState('all');

//   const handleClose = () => {
//     dispatch(resetBulkUpload());
//     setResultTab('all');
//     onClose();
//   };

//   // ─── Mode A: parse + import in one shot ──────────────────
//   const handleModeAImport = () => {
//     if (!csvFile) return;
//     dispatch(importWithUrls(csvFile));
//   };

//   // ─── Mode A with preview: first preview, then import ─────
//   const handlePreview = () => {
//     if (!csvFile) return;
//     dispatch(previewCSV(csvFile));
//   };

//   // ─── Mode B: preview → zip → import ─────────────────────
//   const handleZipImport = () => {
//     if (!csvFile || !zipFile) return;
//     dispatch(importWithZip({ csvFile, zipFile }));
//   };

//   if (!isOpen) return null;

//   // ─── Step indicators ──────────────────────────────────────
//   const modeASteps = ['Choose mode', 'Upload Excel', 'Done'];
//   const modeBSteps = ['Choose mode', 'Upload Excel', 'Preview', 'Upload ZIP', 'Done'];
//   const steps      = imageMode === 'zip' ? modeBSteps : modeASteps;
//   const stepIdx    = { mode: 0, upload: 1, preview: 2, zip: 3, importing: 4, result: imageMode === 'zip' ? 4 : 2 };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
//           <div>
//             <h2 className="text-lg font-bold text-slate-900">Bulk Product Upload</h2>
//             <p className="text-xs text-slate-400 mt-0.5">Import products from Excel or CSV</p>
//           </div>
//           <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-lg">
//             ✕
//           </button>
//         </div>

//         {/* Step bar */}
//         {step !== 'mode' && (
//           <div className="px-6 py-3 border-b border-slate-50 flex items-center gap-2">
//             {steps.map((s, i) => {
//               const current = stepIdx[step] ?? 0;
//               const done    = i < current;
//               const active  = i === current;
//               return (
//                 <React.Fragment key={i}>
//                   <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors
//                     ${done ? 'text-emerald-600' : active ? 'text-indigo-700' : 'text-slate-300'}`}>
//                     <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
//                       ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
//                       {done ? '✓' : i + 1}
//                     </span>
//                     <span className="hidden sm:block">{s}</span>
//                   </div>
//                   {i < steps.length - 1 && <div className={`flex-1 h-px ${done ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
//                 </React.Fragment>
//               );
//             })}
//           </div>
//         )}

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

//           {/* ══ STEP: MODE SELECTION ══════════════════════════════ */}
//           {step === 'mode' && (
//             <div className="space-y-4">
//               <p className="text-sm text-slate-600 font-medium">How are you providing product images?</p>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

//                 {/* Mode A */}
//                 <button
//                   onClick={() => dispatch(setImageMode('url'))}
//                   className="group border-2 border-slate-200 rounded-2xl p-5 text-left hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
//                 >
//                   <div className="text-3xl mb-3">🔗</div>
//                   <div className="font-semibold text-slate-800 group-hover:text-indigo-800 mb-1">Image URLs in Excel</div>
//                   <div className="text-xs text-slate-500 leading-relaxed">
//                     Your spreadsheet already has image URLs in the <code className="bg-slate-100 px-1 rounded">images</code> column.
//                     Upload just the Excel file — we fetch and upload images automatically.
//                   </div>
//                   <div className="mt-3 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
//                     1 file upload →
//                   </div>
//                 </button>

//                 {/* Mode B */}
//                 <button
//                   onClick={() => dispatch(setImageMode('zip'))}
//                   className="group border-2 border-slate-200 rounded-2xl p-5 text-left hover:border-violet-400 hover:bg-violet-50/40 transition-all"
//                 >
//                   <div className="text-3xl mb-3">📦</div>
//                   <div className="font-semibold text-slate-800 group-hover:text-violet-800 mb-1">Upload images separately</div>
//                   <div className="text-xs text-slate-500 leading-relaxed">
//                     Images are in a ZIP file. Each folder inside the ZIP is named after the product's{' '}
//                     <strong>barcode number</strong>. Drop the images inside their barcode folder.
//                   </div>
//                   <div className="mt-3 text-xs font-medium text-violet-600 group-hover:text-violet-700">
//                     Excel + ZIP →
//                   </div>
//                 </button>
//               </div>

//               {/* CSV format reminder */}
//               <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed border border-slate-100">
//                 <strong className="text-slate-700">Required columns:</strong>{' '}
//                 name, title, category, basePrice, barcode — everything else is optional.
//                 Multi-variant products: repeat the product name on multiple rows, one row per variant.
//               </div>
//             </div>
//           )}

//           {/* ══ STEP: UPLOAD (Mode A) ════════════════════════════ */}
//           {step === 'upload' && imageMode === 'url' && (
//             <div className="space-y-4">
//               <p className="text-xs text-slate-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
//                 🔗 <strong>Mode: Image URLs in Excel</strong> — Make sure your Excel has an <code className="bg-white px-1 rounded">images</code> column
//                 with comma-separated image URLs per row.
//               </p>
//               <DropZone
//                 accept=".csv,.xls,.xlsx"
//                 label="Drop your Excel / CSV file"
//                 hint="CSV, XLS or XLSX — max 10MB"
//                 icon="📄"
//                 file={csvFile}
//                 onFile={(f) => dispatch(setCsvFile(f))}
//                 disabled={previewing}
//               />
//               {csvError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{csvError}</p>}
//               {previewing && (
//                 <div className="space-y-1">
//                   <p className="text-xs text-slate-500">Uploading… {csvPct}%</p>
//                   <ProgressBar pct={csvPct} />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* ══ STEP: UPLOAD (Mode B — just Excel, then preview) ════ */}
//           {step === 'upload' && imageMode === 'zip' && (
//             <div className="space-y-4">
//               <p className="text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
//                 📦 <strong>Mode: Separate ZIP images</strong> — Upload your Excel first to preview products, then upload the ZIP.
//               </p>
//               <DropZone
//                 accept=".csv,.xls,.xlsx"
//                 label="Drop your Excel / CSV file"
//                 hint="CSV, XLS or XLSX — max 10MB"
//                 icon="📄"
//                 file={csvFile}
//                 onFile={(f) => dispatch(setCsvFile(f))}
//                 disabled={previewing}
//               />
//               {csvError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{csvError}</p>}
//               {previewing && (
//                 <div className="space-y-1">
//                   <p className="text-xs text-slate-500">Parsing file… {csvPct}%</p>
//                   <ProgressBar pct={csvPct} color="bg-violet-500" />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* ══ STEP: PREVIEW ════════════════════════════════════ */}
//           {step === 'preview' && previewData && (
//             <div className="space-y-4">
//               {/* Summary bar */}
//               <div className="grid grid-cols-3 gap-3">
//                 {[
//                   { label: 'Total products', value: previewData.totalProducts, color: 'text-slate-800' },
//                   { label: 'Valid',           value: previewData.validCount,    color: 'text-emerald-700' },
//                   { label: 'Has errors',      value: previewData.invalidCount,  color: 'text-red-600' },
//                 ].map(({ label, value, color }) => (
//                   <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
//                     <div className={`text-2xl font-bold ${color}`}>{fmt(value)}</div>
//                     <div className="text-xs text-slate-500 mt-0.5">{label}</div>
//                   </div>
//                 ))}
//               </div>

//               {/* Mode A hint if URLs detected */}
//               {imageMode === 'url' && previewData.hasImageUrls && (
//                 <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
//                   ✅ Image URLs detected in your file — they'll be downloaded and uploaded to Cloudinary on import.
//                 </div>
//               )}
//               {imageMode === 'url' && !previewData.hasImageUrls && (
//                 <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
//                   ⚠️ No image URLs found in your Excel. Products will be imported without images.
//                   You can add images to each product manually afterwards.
//                 </div>
//               )}

//               {/* Preview table */}
//               <div className="border border-slate-100 rounded-xl overflow-hidden">
//                 <div className="overflow-x-auto max-h-60">
//                   <table className="w-full text-left">
//                     <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
//                       <tr>
//                         {['Product', 'Category', 'Variants', 'Barcodes', 'Qty', 'Images', 'Status'].map(h => (
//                           <th key={h} className="py-2 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {previewData.preview?.map((p, i) => (
//                         <tr key={i} className={`border-b border-slate-50 ${p.hasErrors ? 'bg-red-50/30' : ''}`}>
//                           <td className="py-2 px-3 text-xs font-medium text-slate-800 max-w-[140px] truncate">{p.name}</td>
//                           <td className="py-2 px-3 text-xs text-slate-500">{p.category}</td>
//                           <td className="py-2 px-3 text-xs text-center">{p.variantCount}</td>
//                           <td className="py-2 px-3 text-xs text-slate-500 max-w-[100px] truncate">{p.barcodes?.join(', ')}</td>
//                           <td className="py-2 px-3 text-xs text-center">{fmt(p.totalQuantity)}</td>
//                           <td className="py-2 px-3 text-xs text-center">{imageMode === 'url' ? (p.imageUrlCount || '—') : '(ZIP)'}</td>
//                           <td className="py-2 px-3">
//                             {p.hasErrors
//                               ? <span className="text-xs text-red-600">⚠ {p.errors?.join('; ')}</span>
//                               : <span className="text-xs text-emerald-600">✓ OK</span>
//                             }
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {previewData.invalidCount > 0 && (
//                 <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
//                   ⚠ {previewData.invalidCount} product(s) have validation errors and will be <strong>skipped</strong> during import.
//                   Fix them in your file and re-upload, or proceed to import only the valid ones.
//                 </p>
//               )}
//             </div>
//           )}

//           {/* ══ STEP: ZIP UPLOAD (Mode B only) ═══════════════════ */}
//           {step === 'zip' && (
//             <div className="space-y-4">
//               <DropZone
//                 accept=".zip"
//                 label="Drop your ZIP file of product images"
//                 hint="Max 500MB — one folder per barcode number"
//                 icon="📦"
//                 file={zipFile}
//                 onFile={(f) => dispatch(setZipFile(f))}
//                 disabled={importing}
//               />
//               {/* ZIP structure hint */}
//               <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
//                 <p className="font-semibold text-slate-700">ZIP folder structure:</p>
//                 <pre className="font-mono text-slate-500 leading-relaxed bg-white rounded-lg p-3 border border-slate-100 text-[11px]">
// {`images.zip
// ├── 665563/          ← barcode number
// │   ├── front.jpg
// │   ├── back.jpg
// │   └── side.png
// ├── 45225/
// │   ├── photo1.webp
// │   └── photo2.jpg
// └── 2233652/
//     └── main.jpg`}
//                 </pre>
//                 <p className="text-slate-400">Supported: JPG, PNG, WebP — up to 5 images per variant. ZIP can contain up to 500MB.</p>
//               </div>
//               {importError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{importError}</p>}
//             </div>
//           )}

//           {/* ══ STEP: IMPORTING ═══════════════════════════════════ */}
//           {step === 'importing' && (
//             <div className="py-8 text-center space-y-4">
//               <div className="text-5xl animate-bounce">⚡</div>
//               <p className="font-semibold text-slate-800">Importing products…</p>
//               <p className="text-xs text-slate-400">
//                 {imageMode === 'url'
//                   ? 'Downloading image URLs and uploading to Cloudinary. This may take a few minutes.'
//                   : 'Extracting ZIP, matching barcodes, uploading images to Cloudinary…'}
//               </p>
//               <div className="max-w-xs mx-auto space-y-1">
//                 <ProgressBar pct={importPct} color={imageMode === 'zip' ? 'bg-violet-500' : 'bg-indigo-500'} />
//                 <p className="text-xs text-slate-400">{importPct}% uploaded</p>
//               </div>
//               <p className="text-xs text-slate-300">Do not close this window.</p>
//             </div>
//           )}

//           {/* ══ STEP: RESULT ══════════════════════════════════════ */}
//           {step === 'result' && result && (
//             <div className="space-y-4">
//               {/* Stats */}
//               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                 {[
//                   { label: 'Total',    value: result.totalRows,         color: 'text-slate-800' },
//                   { label: 'Saved',    value: result.insertedProducts,  color: 'text-emerald-700' },
//                   { label: 'Failed',   value: result.failedCount,       color: 'text-red-600' },
//                   { label: 'Images',   value: result.products?.reduce((s, p) => s + (p.imageCount || 0), 0), color: 'text-indigo-700' },
//                 ].map(({ label, value, color }) => (
//                   <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
//                     <div className={`text-2xl font-bold ${color}`}>{fmt(value)}</div>
//                     <div className="text-xs text-slate-500 mt-0.5">{label}</div>
//                   </div>
//                 ))}
//               </div>

//               {result.zipError && (
//                 <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
//                   ⚠ {result.zipError}
//                 </div>
//               )}

//               {/* Tab bar */}
//               <div className="flex gap-1 border-b border-slate-100">
//                 {['all', 'success', 'warnings', 'failed'].map(tab => {
//                   const counts = {
//                     all     : result.products?.length,
//                     success : result.products?.filter(p => p.status === 'success').length,
//                     warnings: result.products?.filter(p => p.status === 'saved_with_warnings').length,
//                     failed  : result.products?.filter(p => p.status === 'failed').length,
//                   };
//                   return (
//                     <button key={tab} onClick={() => setResultTab(tab)}
//                       className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors capitalize
//                         ${resultTab === tab ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
//                       {tab} ({counts[tab] || 0})
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Result table */}
//               <div className="border border-slate-100 rounded-xl overflow-hidden">
//                 <div className="overflow-x-auto max-h-64">
//                   <table className="w-full text-left">
//                     <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
//                       <tr>
//                         {['Product', 'Status', 'Images', 'Warnings', 'Errors', ''].map(h => (
//                           <th key={h} className="py-2 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {result.products
//                         ?.filter(p => {
//                           if (resultTab === 'all')      return true;
//                           if (resultTab === 'success')  return p.status === 'success';
//                           if (resultTab === 'warnings') return p.status === 'saved_with_warnings';
//                           if (resultTab === 'failed')   return p.status === 'failed';
//                           return true;
//                         })
//                         .map((p, i) => <ProductRow key={i} item={p} />)
//                       }
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>

//         {/* Footer */}
//         <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
//           <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
//             {step === 'result' ? 'Close' : 'Cancel'}
//           </button>

//           <div className="flex items-center gap-2">
//             {/* Back buttons */}
//             {step === 'upload' && (
//               <button onClick={() => dispatch(goToStep('mode'))}
//                 className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
//                 ← Back
//               </button>
//             )}
//             {step === 'preview' && imageMode === 'zip' && (
//               <button onClick={() => dispatch(goToStep('upload'))}
//                 className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
//                 ← Back
//               </button>
//             )}
//             {step === 'zip' && (
//               <button onClick={() => dispatch(goToStep('preview'))}
//                 className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
//                 ← Back
//               </button>
//             )}

//             {/* Primary actions */}
//             {/* Mode A: Upload step → Preview */}
//             {step === 'upload' && imageMode === 'url' && (
//               <button
//                 disabled={!csvFile || previewing}
//                 onClick={handlePreview}
//                 className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                 {previewing ? 'Parsing…' : 'Preview →'}
//               </button>
//             )}

//             {/* Mode A: Preview → Import */}
//             {step === 'preview' && imageMode === 'url' && (
//               <button
//                 disabled={importing || (previewData?.validCount === 0)}
//                 onClick={handleModeAImport}
//                 className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                 Import {previewData?.validCount || 0} product{previewData?.validCount !== 1 ? 's' : ''} →
//               </button>
//             )}

//             {/* Mode B: Upload step → Preview */}
//             {step === 'upload' && imageMode === 'zip' && (
//               <button
//                 disabled={!csvFile || previewing}
//                 onClick={handlePreview}
//                 className="text-sm px-5 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                 {previewing ? 'Parsing…' : 'Preview →'}
//               </button>
//             )}

//             {/* Mode B: Preview → go to ZIP upload */}
//             {step === 'preview' && imageMode === 'zip' && (
//               <button
//                 onClick={() => dispatch(goToStep('zip'))}
//                 className="text-sm px-5 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors">
//                 Next: Upload ZIP →
//               </button>
//             )}

//             {/* Mode B: ZIP upload → Import */}
//             {step === 'zip' && (
//               <button
//                 disabled={!zipFile || !csvFile || importing}
//                 onClick={handleZipImport}
//                 className="text-sm px-5 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                 {importing ? 'Importing…' : `Import ${previewData?.validCount || 0} products →`}
//               </button>
//             )}

//             {/* Result: import another batch */}
//             {step === 'result' && (
//               <button
//                 onClick={() => { dispatch(resetBulkUpload()); }}
//                 className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
//                 Import another batch
//               </button>
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default BulkUploadModal;

// upload images separate in zip ?>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // ============================================================
// // BulkUploadModal.jsx
// // TWO-STEP BULK UPLOAD MODAL
// // Step 1 — Upload CSV/Excel → preview products
// // Step 2 — Upload ZIP (optional) → confirm → save to DB
// // ============================================================

// import React, { useState, useRef, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   previewCSV,
//   importZip,
//   resetBulkUpload,
//   setCsvPct,
//   setZipPct,
// } from "../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice";

// // ─────────────────────────────────────────────────────────────
// // SAMPLE TEMPLATE (images column blank — ZIP handles images)
// // ─────────────────────────────────────────────────────────────
// const SAMPLE_CSV = `name,title,description,category,brand,status,isfeatured,barcode,basePrice,salePrice,quantity,variantAttributes,productAttributes,soldEnabled,soldCount,fomoEnabled,fomoType,viewingNow,productLeft,customMessage,weight,length,width,height
// iPhone 15,Apple iPhone 15 128GB,Latest Apple smartphone,Mobiles,Apple,active,true,665563,80000,76000,45,Color:Black|Storage:128GB,Material:Aluminium|Warranty:1 Year,true,150,true,viewing_now,67,0,,0.5,15,7,1
// iPhone 15,Apple iPhone 15 128GB,Latest Apple smartphone,Mobiles,Apple,active,true,665564,80000,76000,30,Color:White|Storage:128GB,,true,150,true,viewing_now,67,0,,0.5,15,7,1
// Nike Shoes,Nike Running Shoes,Comfortable running shoes,Shoes,Nike,draft,false,45225,4000,,180,Color:Red|Size:9,Material:Mesh,true,78,false,viewing_now,0,0,,0.8,30,10,12`;

// const downloadTemplate = () => {
//   const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
//   const url  = URL.createObjectURL(blob);
//   const a    = document.createElement("a");
//   a.href     = url;
//   a.download = "bulk_upload_template.csv";
//   a.click();
//   URL.revokeObjectURL(url);
// };

// // ─────────────────────────────────────────────────────────────
// // STATUS BADGE
// // ─────────────────────────────────────────────────────────────
// const StatusBadge = ({ status }) => {
//   const map = {
//     success             : "bg-green-100 text-green-700 border-green-200",
//     saved_with_warnings : "bg-yellow-100 text-yellow-700 border-yellow-200",
//     failed              : "bg-red-100 text-red-700 border-red-200",
//     pending             : "bg-gray-100 text-gray-500 border-gray-200",
//   };
//   const label = {
//     success             : "✓ Saved",
//     saved_with_warnings : "⚠ Saved with warnings",
//     failed              : "✗ Failed",
//     pending             : "Pending",
//   };
//   return (
//     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>
//       {label[status] || status}
//     </span>
//   );
// };

// // ─────────────────────────────────────────────────────────────
// // PROGRESS BAR
// // ─────────────────────────────────────────────────────────────
// const ProgressBar = ({ pct, label, processing }) => (
//   <div className="space-y-2">
//     <div className="flex justify-between text-sm font-medium text-gray-600">
//       <span>{processing ? "Server processing…" : label}</span>
//       <span className="text-indigo-600">{processing ? "100% ✓" : `${pct}%`}</span>
//     </div>
//     <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
//       <div
//         className="h-3 rounded-full transition-all duration-300"
//         style={{
//           width     : `${processing ? 100 : pct}%`,
//           background: "linear-gradient(90deg,#6366f1,#a855f7)",
//         }}
//       />
//     </div>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────
// // DROP ZONE
// // ─────────────────────────────────────────────────────────────
// const DropZone = ({ accept, label, sublabel, hint, file, onFile, onClear, disabled }) => {
//   const inputRef = useRef(null);
//   const [drag, setDrag] = useState(false);

//   const handle = (f) => { if (f && !disabled) onFile(f); };

//   return (
//     <div
//       onClick={() => !disabled && inputRef.current?.click()}
//       onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
//       onDragLeave={() => setDrag(false)}
//       onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
//       className={`relative border-2 border-dashed rounded-2xl p-8 text-center select-none transition-all duration-200
//         ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
//         ${drag    ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
//           : file  ? "border-green-400 bg-green-50"
//                   : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"}`}
//     >
//       <input ref={inputRef} type="file" accept={accept} className="hidden"
//         onChange={(e) => handle(e.target.files[0])} disabled={disabled} />

//       {file ? (
//         <div className="flex items-center justify-center gap-4">
//           <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
//             <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
//             </svg>
//           </div>
//           <div className="text-left flex-1">
//             <p className="font-semibold text-gray-900 text-sm">{file.name}</p>
//             <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
//           </div>
//           <button type="button"
//             onClick={(e) => { e.stopPropagation(); onClear(); }}
//             className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
//             </svg>
//           </button>
//         </div>
//       ) : (
//         <>
//           <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
//             <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
//             </svg>
//           </div>
//           <p className="font-semibold text-gray-800 text-sm">{label}</p>
//           <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
//           {hint && <p className="text-xs text-gray-400 mt-2 font-mono">{hint}</p>}
//         </>
//       )}
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────
// // MAIN MODAL
// // ─────────────────────────────────────────────────────────────
// const BulkUploadModal = ({ onClose, onSuccess }) => {
//   const dispatch = useDispatch();
//   const {
//     csvUploading, csvUploadPct, preview, csvError,
//     zipUploading, zipUploadPct, processing, result, zipError,
//   } = useSelector((s) => s.adminBulkUpload);

//   const [csvFile,    setCsvFile]    = useState(null);
//   const [zipFile,    setZipFile]    = useState(null);
//   const [localCsvPct, setLocalCsvPct] = useState(0);
//   const [localZipPct, setLocalZipPct] = useState(0);
//   const [resultTab,  setResultTab]  = useState("all");
//   const [expandedRow, setExpandedRow] = useState(null);

//   const isActive = csvUploading || zipUploading || processing;

//   const reset = () => {
//     dispatch(resetBulkUpload());
//     setCsvFile(null);
//     setZipFile(null);
//     setLocalCsvPct(0);
//     setLocalZipPct(0);
//     setResultTab("all");
//     setExpandedRow(null);
//   };

//   // ── STEP 1: Upload CSV ──
//   const handlePreview = async () => {
//     if (!csvFile) return;
//     setLocalCsvPct(0);
//     await dispatch(previewCSV({
//       file: csvFile,
//       onProgress: (pct) => { setLocalCsvPct(pct); dispatch(setCsvPct(pct)); },
//     }));
//   };

//   // ── STEP 2: Import ZIP + confirm ──
//   const handleImport = async () => {
//     if (!preview?._parsedData) return;
//     setLocalZipPct(0);
//     const res = await dispatch(importZip({
//       zipFile,
//       parsedProducts: preview._parsedData,
//       onProgress: (pct) => { setLocalZipPct(pct); dispatch(setZipPct(pct)); },
//     }));
//     if (importZip.fulfilled.match(res)) onSuccess?.();
//   };

//   // ─────────────────────────────────────────────────────────
//   // RESULT PANEL
//   // ─────────────────────────────────────────────────────────
//   if (result) {
//     const all      = result.products || [];
//     const success  = all.filter(p => p.status === "success");
//     const warned   = all.filter(p => p.status === "saved_with_warnings");
//     const failed   = all.filter(p => p.status === "failed");

//     const tabData = {
//       all     : all,
//       success : success,
//       warnings: warned,
//       failed  : failed,
//     };
//     const shown = tabData[resultTab] || all;

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 z-50 overflow-y-auto mt-[10%]">
//         <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl">

//           {/* Header */}
//           <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between mt-%]">
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Import Complete</h2>
//               <p className="text-sm text-gray-500 mt-0.5">Here's what happened with your products</p>
//             </div>
//             <button onClick={() => { reset(); onClose(); }}
//               className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
//               <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
//               </svg>
//             </button>
//           </div>

//           <div className="p-6 space-y-5">

//             {/* ZIP global error */}
//             {result.zipError && (
//               <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
//                 ⚠ {result.zipError}
//               </div>
//             )}

//             {/* Stats */}
//             <div className="grid grid-cols-4 gap-3">
//               {[
//                 { label: "Total",    value: result.totalProducts,  color: "blue"  },
//                 { label: "Saved",    value: result.savedProducts,   color: "green" },
//                 { label: "Warnings", value: warned.length,          color: "yellow"},
//                 { label: "Failed",   value: result.failedProducts,  color: "red"   },
//               ].map(({ label, value, color }) => (
//                 <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3 text-center`}>
//                   <p className={`text-2xl font-bold text-${color}-700`}>{value}</p>
//                   <p className={`text-xs text-${color}-600 mt-0.5`}>{label}</p>
//                 </div>
//               ))}
//             </div>

//             {/* Tabs */}
//             <div className="flex gap-2 flex-wrap">
//               {[
//                 { key: "all",      label: `All (${all.length})`         },
//                 { key: "success",  label: `✓ Saved (${success.length})` },
//                 { key: "warnings", label: `⚠ Warnings (${warned.length})`},
//                 { key: "failed",   label: `✗ Failed (${failed.length})`  },
//               ].map(({ key, label }) => (
//                 <button key={key} onClick={() => setResultTab(key)}
//                   className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
//                     ${resultTab === key
//                       ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
//                       : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
//                   {label}
//                 </button>
//               ))}
//             </div>

//             {/* Product result table */}
//             <div className="border border-gray-200 rounded-xl overflow-hidden">
//               <div className="overflow-y-auto max-h-80">
//                 <table className="w-full text-sm">
//                   <thead className="bg-gray-50 sticky top-0 z-10">
//                     <tr>
//                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 border-b border-gray-200">#</th>
//                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 border-b border-gray-200">Product</th>
//                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 border-b border-gray-200">Status</th>
//                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 border-b border-gray-200">Images</th>
//                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 border-b border-gray-200">Details</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-100">
//                     {shown.map((p, i) => (
//                       <React.Fragment key={i}>
//                         <tr className="hover:bg-gray-50">
//                           <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
//                           <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{p.name}</td>
//                           <td className="px-4 py-2.5"><StatusBadge status={p.status}/></td>
//                           <td className="px-4 py-2.5 text-xs text-gray-600">
//                             {p.imageCount > 0
//                               ? <span className="text-green-600 font-medium">{p.imageCount} uploaded</span>
//                               : <span className="text-gray-400">none</span>}
//                           </td>
//                           <td className="px-4 py-2.5">
//                             {(p.warnings?.length > 0 || p.errors?.length > 0) && (
//                               <button
//                                 onClick={() => setExpandedRow(expandedRow === i ? null : i)}
//                                 className="text-xs text-indigo-600 hover:underline">
//                                 {expandedRow === i ? "hide" : `show ${(p.warnings?.length || 0) + (p.errors?.length || 0)} issue(s)`}
//                               </button>
//                             )}
//                           </td>
//                         </tr>
//                         {expandedRow === i && (p.warnings?.length > 0 || p.errors?.length > 0) && (
//                           <tr>
//                             <td colSpan={5} className="px-4 py-3 bg-gray-50">
//                               {p.errors?.map((e, j) => (
//                                 <p key={j} className="text-xs text-red-600 mb-1">✗ {e}</p>
//                               ))}
//                               {p.warnings?.map((w, j) => (
//                                 <p key={j} className="text-xs text-yellow-700 mb-1">⚠ {w}</p>
//                               ))}
//                             </td>
//                           </tr>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="flex gap-3">
//               <button onClick={reset}
//                 className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
//                 Upload Another Batch
//               </button>
//               <button onClick={() => { reset(); onClose(); }}
//                 className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow text-sm">
//                 Done
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // MAIN MODAL BODY
//   // ─────────────────────────────────────────────────────────
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 z-50 overflow-y-auto mt-[13%]">
//       <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col">

//         {/* Header */}
//         <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
//               </svg>
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Bulk Upload Products</h2>
//               <p className="text-sm text-gray-500">Two-step import — CSV data first, images ZIP second</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button onClick={downloadTemplate}
//               className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
//               </svg>
//               Template
//             </button>
//             <button onClick={() => { reset(); onClose(); }} disabled={isActive}
//               className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-40 transition-colors">
//               <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="p-6 space-y-6">

//           {/* ── STEP INDICATORS ── */}
//           <div className="flex items-center gap-0">
//             {[
//               { n: 1, label: "Upload CSV",    done: !!preview },
//               { n: 2, label: "Upload Images", done: !!result  },
//               { n: 3, label: "Done",          done: false      },
//             ].map(({ n, label, done }, idx) => (
//               <React.Fragment key={n}>
//                 <div className="flex items-center gap-2">
//                   <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
//                     ${done
//                       ? "bg-green-500 border-green-500 text-white"
//                       : preview && n === 2
//                       ? "bg-indigo-600 border-indigo-600 text-white"
//                       : "bg-white border-gray-300 text-gray-400"}`}>
//                     {done ? "✓" : n}
//                   </div>
//                   <span className={`text-xs font-medium ${done || (preview && n === 2) ? "text-gray-800" : "text-gray-400"}`}>
//                     {label}
//                   </span>
//                 </div>
//                 {idx < 2 && <div className="flex-1 h-px bg-gray-200 mx-2"/>}
//               </React.Fragment>
//             ))}
//           </div>

//           {/* ── STEP 1: CSV UPLOAD ── */}
//           <div className={`space-y-4 ${preview ? "opacity-60 pointer-events-none" : ""}`}>
//             <div className="flex items-center gap-2">
//               <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
//               <h3 className="font-semibold text-gray-800 text-sm">Upload product data (CSV or Excel)</h3>
//             </div>

//             {csvError && (
//               <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
//                 <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
//                 </svg>
//                 <p className="text-sm text-red-700">{csvError}</p>
//               </div>
//             )}

//             <DropZone
//               accept=".csv,.xls,.xlsx"
//               label="Drop your CSV or Excel file here"
//               sublabel="or click to browse · .csv .xls .xlsx"
//               hint="Required columns: name, category, basePrice, barcode"
//               file={csvFile}
//               onFile={setCsvFile}
//               onClear={() => setCsvFile(null)}
//               disabled={csvUploading}
//             />

//             {csvUploading && (
//               <ProgressBar pct={localCsvPct} label="Uploading CSV…" processing={false}/>
//             )}

//             {!preview && (
//               <button
//                 onClick={handlePreview}
//                 disabled={!csvFile || csvUploading}
//                 className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700
//                   disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2">
//                 {csvUploading
//                   ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Parsing…</>
//                   : "Parse & Preview →"}
//               </button>
//             )}
//           </div>

//           {/* ── PREVIEW TABLE (after step 1) ── */}
//           {preview && !result && (
//             <div className="space-y-3">
//               {/* Summary */}
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
//                   <span className="text-sm font-semibold text-gray-800">
//                     {preview.totalProducts} products detected
//                     <span className="text-gray-400 font-normal ml-1">({preview.totalRows} rows)</span>
//                   </span>
//                 </div>
//                 <div className="flex gap-2 text-xs">
//                   <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
//                     ✓ {preview.validCount} valid
//                   </span>
//                   {preview.invalidCount > 0 && (
//                     <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
//                       ✗ {preview.invalidCount} errors
//                     </span>
//                   )}
//                 </div>
//               </div>

//               {/* Preview table */}
//               <div className="border border-gray-200 rounded-xl overflow-hidden">
//                 <div className="overflow-y-auto max-h-52">
//                   <table className="w-full text-xs">
//                     <thead className="bg-gray-50 sticky top-0">
//                       <tr>
//                         {["#","Product","Category","Variants","Barcodes","Price Range","Qty","Status"].map(h => (
//                           <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                       {preview.preview.map((p, i) => (
//                         <tr key={i} className={`hover:bg-gray-50 ${p.hasErrors ? "bg-red-50" : ""}`}>
//                           <td className="px-3 py-2 text-gray-400">{i + 1}</td>
//                           <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate" title={p.name}>{p.name}</td>
//                           <td className="px-3 py-2 text-gray-600">{p.category || <span className="text-red-400">missing!</span>}</td>
//                           <td className="px-3 py-2 text-gray-600 text-center">{p.variantCount}</td>
//                           <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate" title={p.barcodes.join(", ")}>
//                             {p.barcodes.length ? p.barcodes.join(", ") : <span className="text-gray-300 italic">none</span>}
//                           </td>
//                           <td className="px-3 py-2 text-gray-600">
//                             {p.priceRange.min === p.priceRange.max
//                               ? `₹${p.priceRange.min}`
//                               : `₹${p.priceRange.min}–${p.priceRange.max}`}
//                           </td>
//                           <td className="px-3 py-2 text-gray-600">{p.totalQuantity}</td>
//                           <td className="px-3 py-2">
//                             {p.hasErrors
//                               ? <span className="text-red-600 font-medium" title={p.errors.join("; ")}>✗ {p.errors[0]}</span>
//                               : <span className="text-green-600 font-medium">✓ Ready</span>}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {preview.invalidCount > 0 && (
//                 <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
//                   <p className="text-xs text-red-700 font-medium">
//                     ⚠ {preview.invalidCount} product(s) have errors and will be skipped.
//                     Fix the CSV and re-upload to include them.
//                   </p>
//                 </div>
//               )}

//               {/* ── STEP 2: ZIP UPLOAD ── */}
//               <div className="space-y-3 pt-2">
//                 <div className="flex items-center gap-2">
//                   <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
//                   <h3 className="font-semibold text-gray-800 text-sm">Upload images ZIP (optional)</h3>
//                 </div>

//                 <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
//                   <p className="font-semibold">📁 How to structure your ZIP:</p>
//                   <p>Create one folder per variant named exactly after its barcode number.</p>
//                   <p>Example: <span className="font-mono bg-amber-100 px-1 rounded">665563/</span> folder → drop any images inside → zip it.</p>
//                   <p>Multiple variants of same product = multiple barcode folders. No image renaming needed.</p>
//                   <p className="text-amber-600">Skip this step to save products as drafts without images.</p>
//                 </div>

//                 {zipError && (
//                   <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
//                     ✗ {zipError}
//                   </div>
//                 )}

//                 <DropZone
//                   accept=".zip"
//                   label="Drop your images ZIP here"
//                   sublabel="or click to browse · .zip only · max 500MB"
//                   hint="Folder name = barcode number. Any image name works."
//                   file={zipFile}
//                   onFile={setZipFile}
//                   onClear={() => setZipFile(null)}
//                   disabled={zipUploading || processing}
//                 />

//                 {(zipUploading || processing) && (
//                   <ProgressBar
//                     pct={localZipPct}
//                     label="Uploading ZIP…"
//                     processing={processing}
//                   />
//                 )}
//                 {processing && (
//                   <div className="flex items-center justify-center gap-1.5 py-2">
//                     {[0, 0.15, 0.30].map((delay, i) => (
//                       <span key={i}
//                         className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
//                         style={{ animationDelay: `${delay}s` }}/>
//                     ))}
//                     <span className="ml-2 text-xs text-indigo-600">
//                       Uploading images to Cloudinary & saving products…
//                     </span>
//                   </div>
//                 )}

//                 <div className="flex gap-3 pt-1">
//                   <button
//                     onClick={() => { dispatch(resetBulkUpload()); setCsvFile(null); setZipFile(null); }}
//                     disabled={isActive}
//                     className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50
//                       disabled:opacity-40 transition-colors text-sm">
//                     ← Back
//                   </button>
//                   <button
//                     onClick={handleImport}
//                     disabled={isActive || !preview?._parsedData?.length}
//                     className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold
//                       rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
//                       flex items-center justify-center gap-2 transition-all shadow-lg text-sm">
//                     {isActive
//                       ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
//                           {processing ? "Saving to database…" : "Uploading…"}</>
//                       : zipFile
//                       ? `Import ${preview.validCount} products with images →`
//                       : `Import ${preview.validCount} products without images →`}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// };

// export default BulkUploadModal;


// upload product with link in exel.... ?>?>????>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// // PRODUCT_MODAL_SEGMENT/BulkUploadModal.jsx

// import React, { useState, useRef, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   importProductsCSV,
//   resetBulkUpload,
//   setUploadPct,
// } from "../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice"; // ✅ fixed import path

// // ─────────────────────────────────────────────────────────────────────────────
// // Sample CSV template
// // ─────────────────────────────────────────────────────────────────────────────
// const SAMPLE_CSV = `name,title,description,category,brand,status,isfeatured,barcode,basePrice,salePrice,quantity,variantAttributes,productAttributes,images,soldEnabled,soldCount,fomoEnabled,fomoType,viewingNow,productLeft,customMessage,weight,length,width,height
// Sony WH-1000XM5,Sony WH-1000XM5 Headphones,Industry leading noise cancellation,Electronics,Sony,active,false,1234567890,29999,24999,50,Color:Black|Size:One Size,Wireless:Yes|Driver:40mm,,false,0,false,viewing_now,0,0,,0.25,20,18,8
// Sony WH-1000XM5,Sony WH-1000XM5 Headphones,Industry leading noise cancellation,Electronics,Sony,active,false,1234567891,29999,24999,30,Color:Silver|Size:One Size,,,false,0,false,viewing_now,0,0,,0.25,20,18,8
// Nike Air Max 270,Nike Air Max 270 Running Shoes,Lightweight running shoes,Footwear,Nike,active,true,9876543210,8999,7499,100,Size:8|Color:White,Material:Mesh|Sole:Rubber,,true,245,true,product_left,0,15,,0.8,32,22,14`;

// const downloadSampleCSV = () => {
//   const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
//   const url  = URL.createObjectURL(blob);
//   const a    = document.createElement("a");
//   a.href     = url;
//   a.download = "bulk_upload_template.csv";
//   a.click();
//   URL.revokeObjectURL(url);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Parse CSV text → array of row objects
// // ─────────────────────────────────────────────────────────────────────────────
// const parseCSV = (text) => {
//   const lines = text.split(/\r?\n/).filter((l) => l.trim());
//   if (lines.length < 2) return [];
//   const headers = lines[0].split(",").map((h) => h.trim());
//   return lines.slice(1).map((line) => {
//     const values = [];
//     let cur = "", inQ = false;
//     for (let i = 0; i < line.length; i++) {
//       const ch = line[i];
//       if (ch === '"') { inQ = !inQ; }
//       else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
//       else { cur += ch; }
//     }
//     values.push(cur.trim());
//     const obj = {};
//     headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
//     return obj;
//   });
// };

// const REQUIRED_COLS  = ["name", "category", "basePrice"];
// const IMPORTANT_COLS = ["title", "brand", "status", "barcode", "salePrice", "quantity", "variantAttributes", "images"];

// // ─────────────────────────────────────────────────────────────────────────────
// // Component
// // ─────────────────────────────────────────────────────────────────────────────
// const BulkUploadModal = ({ onClose, onSuccess }) => {
//   const dispatch = useDispatch();
//   const { uploading, uploadPct, processing, result, error } =
//     useSelector((s) => s.adminBulkUpload);

//   const fileInputRef             = useRef(null);
//   const [file,       setFile]       = useState(null);
//   const [preview,    setPreview]    = useState([]);
//   const [headers,    setHeaders]    = useState([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const [parseError, setParseError] = useState(null);
//   const [localPct,   setLocalPct]   = useState(0);
//   const [resultTab,  setResultTab]  = useState("success");

//   const reset = () => {
//     dispatch(resetBulkUpload());
//     setFile(null);
//     setPreview([]);
//     setHeaders([]);
//     setParseError(null);
//     setLocalPct(0);
//     setResultTab("success");
//   };

//   const handleFile = useCallback((f) => {
//     if (!f) return;
//     if (!f.name.toLowerCase().endsWith(".csv")) {
//       setParseError("Only .csv files are supported.");
//       return;
//     }
//     dispatch(resetBulkUpload());
//     setParseError(null);
//     setLocalPct(0);
//     setFile(f);
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const rows = parseCSV(e.target.result);
//         if (!rows.length) { setParseError("CSV appears to be empty."); return; }
//         setHeaders(Object.keys(rows[0]));
//         setPreview(rows);
//       } catch (err) {
//         setParseError("Could not parse CSV: " + err.message);
//       }
//     };
//     reader.readAsText(f);
//   }, [dispatch]);

//   const onDrop = (e) => {
//     e.preventDefault();
//     setIsDragging(false);
//     handleFile(e.dataTransfer.files[0]);
//   };

//   const handleUpload = async () => {
//     if (!file) return;
//     const res = await dispatch(
//       importProductsCSV({
//         file,
//         onProgress: (pct) => {
//           setLocalPct(pct);
//           dispatch(setUploadPct(pct));
//         },
//       })
//     );
//     if (importProductsCSV.fulfilled.match(res)) {
//       onSuccess?.();
//     }
//   };

//   const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c));
//   const canUpload   = file && !parseError && missingCols.length === 0 && !uploading && !result;
//   const isActive    = uploading || processing;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 z-50 overflow-y-auto mt-[10%]">
//       <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col">

//         {/* ── Header ─────────────────────────────────────────────────────── */}
//         <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//               </svg>
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Bulk Upload Products</h2>
//               <p className="text-sm text-gray-500">Import multiple products at once via CSV file</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button onClick={downloadSampleCSV}
//               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//               </svg>
//               Download Template
//             </button>
//             <button onClick={() => { reset(); onClose(); }} disabled={isActive}
//               className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-40 transition-colors">
//               <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="p-6 space-y-6">

//           {/* ── RESULT PANEL ──────────────────────────────────────────────── */}
//           {result && (
//             <div className="space-y-5">
//               <div className="grid grid-cols-3 gap-4">
//                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
//                   <p className="text-3xl font-bold text-blue-700">{result.totalRows}</p>
//                   <p className="text-sm text-blue-600 mt-1">Total Rows</p>
//                 </div>
//                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
//                   <p className="text-3xl font-bold text-green-700">{result.insertedProducts}</p>
//                   <p className="text-sm text-green-600 mt-1">Products Created</p>
//                 </div>
//                 <div className={`rounded-xl p-4 text-center border ${result.failedCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
//                   <p className={`text-3xl font-bold ${result.failedCount > 0 ? "text-red-700" : "text-gray-400"}`}>{result.failedCount}</p>
//                   <p className={`text-sm mt-1 ${result.failedCount > 0 ? "text-red-600" : "text-gray-400"}`}>Failed Rows</p>
//                 </div>
//               </div>

//               {result.failedCount > 0 ? (
//                 <div>
//                   <div className="flex gap-2 mb-3">
//                     <button onClick={() => setResultTab("success")}
//                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${resultTab === "success" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
//                       ✅ Succeeded ({result.insertedProducts})
//                     </button>
//                     <button onClick={() => setResultTab("failed")}
//                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${resultTab === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
//                       ❌ Failed ({result.failedCount})
//                     </button>
//                   </div>

//                   {resultTab === "failed" && (
//                     <div className="border border-red-200 rounded-xl overflow-hidden">
//                       <table className="w-full text-sm">
//                         <thead className="bg-red-50">
//                           <tr>
//                             <th className="px-4 py-3 text-left font-medium text-red-700 w-10">#</th>
//                             <th className="px-4 py-3 text-left font-medium text-red-700">Product</th>
//                             <th className="px-4 py-3 text-left font-medium text-red-700">Error</th>
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-red-100">
//                           {result.failed.map((f, i) => (
//                             <tr key={i} className="hover:bg-red-50">
//                               <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
//                               <td className="px-4 py-2.5 font-medium text-gray-800">{f.product}</td>
//                               <td className="px-4 py-2.5 text-red-600">{f.error}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}

//                   {resultTab === "success" && (
//                     <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
//                       <p className="text-green-700 text-sm font-medium">
//                         🎉 {result.insertedProducts} product{result.insertedProducts !== 1 ? "s" : ""} successfully imported and are now visible in your product list.
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
//                   <p className="text-green-700 text-sm font-medium">
//                     🎉 All {result.insertedProducts} product{result.insertedProducts !== 1 ? "s" : ""} imported successfully! Head back to your product list to see them.
//                   </p>
//                 </div>
//               )}

//               <div className="flex gap-3">
//                 <button onClick={reset}
//                   className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
//                   Upload Another File
//                 </button>
//                 <button onClick={() => { reset(); onClose(); }}
//                   className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow">
//                   Done
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── PROGRESS ──────────────────────────────────────────────────── */}
//           {(uploading || processing) && !result && (
//             <div className="space-y-5">
//               <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl text-center">
//                 <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
//                 <p className="font-bold text-indigo-800 text-xl">
//                   {processing ? "Processing on server…" : `Uploading file — ${localPct}%`}
//                 </p>
//                 <p className="text-indigo-600 text-sm mt-2 max-w-sm mx-auto">
//                   {processing
//                     ? "Server is creating products, uploading images to Cloudinary and saving to database. This may take 1–2 minutes for large files."
//                     : "Sending your CSV to the server…"}
//                 </p>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex justify-between text-sm font-medium text-gray-600">
//                   <span>{processing ? "Server processing…" : "Uploading…"}</span>
//                   <span className="text-indigo-600">{processing ? "100% ✓" : `${localPct}%`}</span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
//                   <div
//                     className="h-4 rounded-full transition-all duration-500"
//                     style={{
//                       width:      `${processing ? 100 : localPct}%`,
//                       background: "linear-gradient(90deg, #6366f1, #a855f7)",
//                     }}
//                   />
//                 </div>
//                 {processing && (
//                   <div className="flex items-center justify-center gap-1.5 mt-3">
//                     {[0, 0.15, 0.30].map((delay, i) => (
//                       <span key={i}
//                         className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce"
//                         style={{ animationDelay: `${delay}s` }} />
//                     ))}
//                     <span className="ml-2 text-sm text-indigo-600">Creating products…</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* ── FILE PICKER + PREVIEW ─────────────────────────────────────── */}
//           {!uploading && !processing && !result && (
//             <>
//               {error && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
//                   <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                       d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                   <div className="flex-1">
//                     <p className="font-semibold text-red-800">Upload failed</p>
//                     <p className="text-sm text-red-700 mt-0.5">{error}</p>
//                   </div>
//                   <button onClick={reset} className="text-red-400 hover:text-red-600">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 </div>
//               )}

//               {parseError && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <p className="text-red-700 text-sm font-medium">⚠️ {parseError}</p>
//                 </div>
//               )}

//               {/* Drop zone */}
//               <div
//                 onClick={() => fileInputRef.current?.click()}
//                 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//                 onDragLeave={() => setIsDragging(false)}
//                 onDrop={onDrop}
//                 className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer select-none transition-all duration-200 ${
//                   isDragging
//                     ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
//                     : file
//                     ? "border-green-400 bg-green-50"
//                     : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
//                 }`}>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept=".csv"
//                   className="hidden"
//                   onChange={(e) => handleFile(e.target.files[0])}
//                 />
//                 {file ? (
//                   <div className="flex items-center justify-center gap-4">
//                     <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
//                       <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                       </svg>
//                     </div>
//                     <div className="text-left">
//                       <p className="font-semibold text-gray-900">{file.name}</p>
//                       <p className="text-sm text-gray-500 mt-0.5">
//                         {(file.size / 1024).toFixed(1)} KB · {preview.length} row{preview.length !== 1 ? "s" : ""} detected
//                       </p>
//                     </div>
//                     <button type="button"
//                       onClick={(e) => { e.stopPropagation(); reset(); }}
//                       className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                       <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                           d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                       </svg>
//                     </div>
//                     <p className="text-lg font-semibold text-gray-800">Drop your CSV file here</p>
//                     <p className="text-sm text-gray-500 mt-1">or click to browse · .csv files only</p>
//                     <p className="text-xs text-gray-400 mt-3">
//                       Required: <span className="font-mono text-indigo-600">name, category, basePrice</span>
//                     </p>
//                   </>
//                 )}
//               </div>

//               {/* Column badges */}
//               {headers.length > 0 && (
//                 <div>
//                   <p className="text-sm font-semibold text-gray-700 mb-2">Detected Columns</p>
//                   <div className="flex flex-wrap gap-2">
//                     {REQUIRED_COLS.map((col) => (
//                       <span key={col}
//                         className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
//                           headers.includes(col)
//                             ? "bg-green-100 text-green-700 border-green-200"
//                             : "bg-red-100 text-red-700 border-red-200"
//                         }`}>
//                         {headers.includes(col) ? "✓" : "✗"} {col}
//                         {!headers.includes(col) && " (missing!)"}
//                       </span>
//                     ))}
//                     {IMPORTANT_COLS.filter((c) => headers.includes(c)).map((col) => (
//                       <span key={col} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
//                         ✓ {col}
//                       </span>
//                     ))}
//                     {headers
//                       .filter((h) => !REQUIRED_COLS.includes(h) && !IMPORTANT_COLS.includes(h))
//                       .map((col) => (
//                         <span key={col} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
//                           {col}
//                         </span>
//                       ))}
//                   </div>
//                   {missingCols.length > 0 && (
//                     <p className="mt-2 text-sm text-red-600 font-medium">
//                       ⚠️ Missing required: <strong>{missingCols.join(", ")}</strong> — fix your CSV and re-upload.
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* Preview table */}
//               {preview.length > 0 && (
//                 <div>
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-sm font-semibold text-gray-700">
//                       Preview
//                       <span className="text-gray-400 font-normal ml-1">
//                         — first {Math.min(10, preview.length)} of {preview.length} rows · {headers.length} columns
//                       </span>
//                     </p>
//                   </div>
//                   <div className="border border-gray-200 rounded-xl overflow-hidden">
//                     <div className="overflow-x-auto max-h-64">
//                       <table className="w-full text-xs">
//                         <thead className="bg-gray-50 sticky top-0">
//                           <tr>
//                             <th className="px-3 py-2.5 text-left font-semibold text-gray-400 border-b border-gray-200">#</th>
//                             {headers.map((h) => (
//                               <th key={h}
//                                 className={`px-3 py-2.5 text-left font-semibold border-b border-gray-200 whitespace-nowrap ${
//                                   REQUIRED_COLS.includes(h) ? "text-indigo-600" : "text-gray-500"
//                                 }`}>
//                                 {h}{REQUIRED_COLS.includes(h) && <span className="text-red-400">*</span>}
//                               </th>
//                             ))}
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-100">
//                           {preview.slice(0, 10).map((row, ri) => (
//                             <tr key={ri} className="hover:bg-gray-50">
//                               <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
//                               {headers.map((h) => (
//                                 <td key={h}
//                                   title={row[h]}
//                                   className={`px-3 py-2 whitespace-nowrap max-w-[160px] truncate ${
//                                     REQUIRED_COLS.includes(h) ? "font-semibold text-gray-900" : "text-gray-600"
//                                   } ${!row[h] && REQUIRED_COLS.includes(h) ? "bg-red-50 text-red-500" : ""}`}>
//                                   {row[h] || <span className="text-gray-300 italic">—</span>}
//                                 </td>
//                               ))}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                     {preview.length > 10 && (
//                       <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
//                         <span className="text-xs text-gray-400">
//                           + {preview.length - 10} more row{preview.length - 10 !== 1 ? "s" : ""}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Tip */}
//               <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
//                 <p className="text-sm font-semibold text-amber-800 mb-1">📋 Multi-variant products</p>
//                 <p className="text-xs text-amber-700 leading-relaxed">
//                   Use <strong>multiple rows with the same product name</strong> to create variants.
//                   Each row = one variant. Use <span className="font-mono">variantAttributes</span> like{" "}
//                   <span className="font-mono bg-amber-100 px-1 rounded">Color:Black|Size:L</span> to differentiate them.
//                   Images are uploaded from comma-separated URLs in the <span className="font-mono">images</span> column (max 5 per variant).
//                 </p>
//               </div>

//               {/* Actions */}
//               <div className="flex gap-3">
//                 <button onClick={() => { reset(); onClose(); }}
//                   className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleUpload}
//                   disabled={!canUpload}
//                   className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                       d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                   </svg>
//                   {preview.length > 0 ? `Import ${preview.length} Rows` : "Upload CSV"}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BulkUploadModal;
// DOWN CODE IS ALSO WORK BUT TIME OUT ERROR OR UPLOAD FILE NOT THE CSV Type 

// // PRODUCT_MODAL_SEGMENT/BulkUploadModal.jsx
// //
// // FEATURES:
// //  • Drag & drop or click-to-browse CSV upload
// //  • Browser-side CSV preview table (parsed before upload)
// //  • Column validation badges — shows which required/optional cols detected
// //  • Download sample CSV template button
// //  • Upload progress bar (0→100% file transfer)
// //  • "Processing on server…" spinner after upload hits 100%
// //  • Results panel: inserted count, failed count, failed rows table
// //  • On success → calls onSuccess() so parent re-fetches products

// import React, { useState, useRef, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   importProductsCSV,
//   resetBulkUpload,
//   setUploadPct,
// } from "../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice";

// // ─────────────────────────────────────────────────────────────────────────────
// // Sample CSV template
// // ─────────────────────────────────────────────────────────────────────────────
// const SAMPLE_CSV = `name,title,description,category,brand,status,isfeatured,barcode,basePrice,salePrice,quantity,variantAttributes,productAttributes,images,soldEnabled,soldCount,fomoEnabled,fomoType,viewingNow,productLeft,customMessage,weight,length,width,height
// Sony WH-1000XM5,Sony WH-1000XM5 Headphones,Industry leading noise cancellation,Electronics,Sony,active,false,1234567890,29999,24999,50,Color:Black|Size:One Size,Wireless:Yes|Driver:40mm,,false,0,false,viewing_now,0,0,,0.25,20,18,8
// Sony WH-1000XM5,Sony WH-1000XM5 Headphones,Industry leading noise cancellation,Electronics,Sony,active,false,1234567891,29999,24999,30,Color:Silver|Size:One Size,,,false,0,false,viewing_now,0,0,,0.25,20,18,8
// Nike Air Max 270,Nike Air Max 270 Running Shoes,Lightweight running shoes,Footwear,Nike,active,true,9876543210,8999,7499,100,Size:8|Color:White,Material:Mesh|Sole:Rubber,,true,245,true,product_left,0,15,,0.8,32,22,14`;

// const downloadSampleCSV = () => {
//   const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
//   const url  = URL.createObjectURL(blob);
//   const a    = document.createElement("a");
//   a.href     = url;
//   a.download = "bulk_upload_template.csv";
//   a.click();
//   URL.revokeObjectURL(url);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Parse CSV text → array of row objects
// // ─────────────────────────────────────────────────────────────────────────────
// const parseCSV = (text) => {
//   const lines = text.split(/\r?\n/).filter((l) => l.trim());
//   if (lines.length < 2) return [];
//   const headers = lines[0].split(",").map((h) => h.trim());
//   return lines.slice(1).map((line) => {
//     const values = [];
//     let cur = "", inQ = false;
//     for (let i = 0; i < line.length; i++) {
//       const ch = line[i];
//       if (ch === '"') { inQ = !inQ; }
//       else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
//       else { cur += ch; }
//     }
//     values.push(cur.trim());
//     const obj = {};
//     headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
//     return obj;
//   });
// };

// const REQUIRED_COLS  = ["name", "category", "basePrice"];
// const IMPORTANT_COLS = ["title", "brand", "status", "barcode", "salePrice", "quantity", "variantAttributes", "images"];

// // ─────────────────────────────────────────────────────────────────────────────
// // Component
// // ─────────────────────────────────────────────────────────────────────────────
// const BulkUploadModal = ({ onClose, onSuccess }) => {
//   const dispatch = useDispatch();
//   const { uploading, uploadPct, processing, result, error } =
//     useSelector((s) => s.adminBulkUpload);

//   const fileInputRef             = useRef(null);
//   const [file,       setFile]       = useState(null);
//   const [preview,    setPreview]    = useState([]);
//   const [headers,    setHeaders]    = useState([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const [parseError, setParseError] = useState(null);
//   const [localPct,   setLocalPct]   = useState(0);
//   const [resultTab,  setResultTab]  = useState("success");

//   const reset = () => {
//     dispatch(resetBulkUpload());
//     setFile(null);
//     setPreview([]);
//     setHeaders([]);
//     setParseError(null);
//     setLocalPct(0);
//     setResultTab("success");
//   };

//   const handleFile = useCallback((f) => {
//     if (!f) return;
//     if (!f.name.toLowerCase().endsWith(".csv")) {
//       setParseError("Only .csv files are supported.");
//       return;
//     }
//     dispatch(resetBulkUpload());
//     setParseError(null);
//     setLocalPct(0);
//     setFile(f);
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const rows = parseCSV(e.target.result);
//         if (!rows.length) { setParseError("CSV appears to be empty."); return; }
//         setHeaders(Object.keys(rows[0]));
//         setPreview(rows);
//       } catch (err) {
//         setParseError("Could not parse CSV: " + err.message);
//       }
//     };
//     reader.readAsText(f);
//   }, [dispatch]);

//   const onDrop = (e) => {
//     e.preventDefault();
//     setIsDragging(false);
//     handleFile(e.dataTransfer.files[0]);
//   };

//   const handleUpload = async () => {
//     if (!file) return;
//     const res = await dispatch(
//       importProductsCSV({
//         file,
//         onProgress: (pct) => {
//           setLocalPct(pct);
//           dispatch(setUploadPct(pct));
//         },
//       })
//     );
//     if (importProductsCSV.fulfilled.match(res)) {
//       onSuccess?.();
//     }
//   };

//   const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c));
//   const canUpload   = file && !parseError && missingCols.length === 0 && !uploading && !result;
//   const isActive    = uploading || processing;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 z-50 overflow-y-auto mt-[10%]">
//       <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col">

//         {/* ── Header ─────────────────────────────────────────────────────── */}
//         <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//               </svg>
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">Bulk Upload Products</h2>
//               <p className="text-sm text-gray-500">Import multiple products at once via CSV file</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button onClick={downloadSampleCSV}
//               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//               </svg>
//               Download Template
//             </button>
//             <button onClick={() => { reset(); onClose(); }} disabled={isActive}
//               className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-40 transition-colors">
//               <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="p-6 space-y-6">

//           {/* ── RESULT PANEL ──────────────────────────────────────────────── */}
//           {result && (
//             <div className="space-y-5">
//               <div className="grid grid-cols-3 gap-4">
//                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
//                   <p className="text-3xl font-bold text-blue-700">{result.totalRows}</p>
//                   <p className="text-sm text-blue-600 mt-1">Total Rows</p>
//                 </div>
//                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
//                   <p className="text-3xl font-bold text-green-700">{result.insertedProducts}</p>
//                   <p className="text-sm text-green-600 mt-1">Products Created</p>
//                 </div>
//                 <div className={`rounded-xl p-4 text-center border ${result.failedCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
//                   <p className={`text-3xl font-bold ${result.failedCount > 0 ? "text-red-700" : "text-gray-400"}`}>{result.failedCount}</p>
//                   <p className={`text-sm mt-1 ${result.failedCount > 0 ? "text-red-600" : "text-gray-400"}`}>Failed Rows</p>
//                 </div>
//               </div>

//               {result.failedCount > 0 ? (
//                 <div>
//                   <div className="flex gap-2 mb-3">
//                     <button onClick={() => setResultTab("success")}
//                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${resultTab === "success" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
//                       ✅ Succeeded ({result.insertedProducts})
//                     </button>
//                     <button onClick={() => setResultTab("failed")}
//                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${resultTab === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
//                       ❌ Failed ({result.failedCount})
//                     </button>
//                   </div>

//                   {resultTab === "failed" && (
//                     <div className="border border-red-200 rounded-xl overflow-hidden">
//                       <table className="w-full text-sm">
//                         <thead className="bg-red-50">
//                           <tr>
//                             <th className="px-4 py-3 text-left font-medium text-red-700 w-10">#</th>
//                             <th className="px-4 py-3 text-left font-medium text-red-700">Product</th>
//                             <th className="px-4 py-3 text-left font-medium text-red-700">Error</th>
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-red-100">
//                           {result.failed.map((f, i) => (
//                             <tr key={i} className="hover:bg-red-50">
//                               <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
//                               <td className="px-4 py-2.5 font-medium text-gray-800">{f.product}</td>
//                               <td className="px-4 py-2.5 text-red-600">{f.error}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}

//                   {resultTab === "success" && (
//                     <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
//                       <p className="text-green-700 text-sm font-medium">
//                         🎉 {result.insertedProducts} product{result.insertedProducts !== 1 ? "s" : ""} successfully imported and are now visible in your product list.
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
//                   <p className="text-green-700 text-sm font-medium">
//                     🎉 All {result.insertedProducts} product{result.insertedProducts !== 1 ? "s" : ""} imported successfully! Head back to your product list to see them.
//                   </p>
//                 </div>
//               )}

//               <div className="flex gap-3">
//                 <button onClick={reset}
//                   className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
//                   Upload Another File
//                 </button>
//                 <button onClick={() => { reset(); onClose(); }}
//                   className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow">
//                   Done
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── PROGRESS ──────────────────────────────────────────────────── */}
//           {(uploading || processing) && !result && (
//             <div className="space-y-5">
//               <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl text-center">
//                 <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
//                 <p className="font-bold text-indigo-800 text-xl">
//                   {processing ? "Processing on server…" : `Uploading file — ${localPct}%`}
//                 </p>
//                 <p className="text-indigo-600 text-sm mt-2 max-w-sm mx-auto">
//                   {processing
//                     ? "Server is creating products, uploading images from URLs and saving everything to the database. This may take a minute for large files."
//                     : "Sending your CSV to the server…"}
//                 </p>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex justify-between text-sm font-medium text-gray-600">
//                   <span>{processing ? "Server processing…" : "Uploading…"}</span>
//                   <span className="text-indigo-600">{processing ? "100% ✓" : `${localPct}%`}</span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
//                   <div
//                     className="h-4 rounded-full transition-all duration-500"
//                     style={{
//                       width:      `${processing ? 100 : localPct}%`,
//                       background: "linear-gradient(90deg, #6366f1, #a855f7)",
//                     }}
//                   />
//                 </div>
//                 {processing && (
//                   <div className="flex items-center justify-center gap-1.5 mt-3">
//                     {[0, 0.15, 0.30].map((delay, i) => (
//                       <span key={i}
//                         className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce"
//                         style={{ animationDelay: `${delay}s` }} />
//                     ))}
//                     <span className="ml-2 text-sm text-indigo-600">Creating products…</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* ── FILE PICKER + PREVIEW ─────────────────────────────────────── */}
//           {!uploading && !processing && !result && (
//             <>
//               {/* Redux error */}
//               {error && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
//                   <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                       d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                   <div className="flex-1">
//                     <p className="font-semibold text-red-800">Upload failed</p>
//                     <p className="text-sm text-red-700 mt-0.5">{error}</p>
//                   </div>
//                   <button onClick={reset} className="text-red-400 hover:text-red-600">
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 </div>
//               )}

//               {parseError && (
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
//                   <p className="text-red-700 text-sm font-medium">⚠️ {parseError}</p>
//                 </div>
//               )}

//               {/* Drop zone */}
//               <div
//                 onClick={() => fileInputRef.current?.click()}
//                 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//                 onDragLeave={() => setIsDragging(false)}
//                 onDrop={onDrop}
//                 className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer select-none transition-all duration-200 ${
//                   isDragging
//                     ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
//                     : file
//                     ? "border-green-400 bg-green-50"
//                     : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
//                 }`}>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept=".csv"
//                   className="hidden"
//                   onChange={(e) => handleFile(e.target.files[0])}
//                 />
//                 {file ? (
//                   <div className="flex items-center justify-center gap-4">
//                     <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
//                       <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                       </svg>
//                     </div>
//                     <div className="text-left">
//                       <p className="font-semibold text-gray-900">{file.name}</p>
//                       <p className="text-sm text-gray-500 mt-0.5">
//                         {(file.size / 1024).toFixed(1)} KB · {preview.length} row{preview.length !== 1 ? "s" : ""} detected
//                       </p>
//                     </div>
//                     <button type="button"
//                       onClick={(e) => { e.stopPropagation(); reset(); }}
//                       className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                       <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                           d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                       </svg>
//                     </div>
//                     <p className="text-lg font-semibold text-gray-800">Drop your CSV file here</p>
//                     <p className="text-sm text-gray-500 mt-1">or click to browse · .csv files only</p>
//                     <p className="text-xs text-gray-400 mt-3">
//                       Required: <span className="font-mono text-indigo-600">name, category, basePrice</span>
//                     </p>
//                   </>
//                 )}
//               </div>

//               {/* Column badges */}
//               {headers.length > 0 && (
//                 <div>
//                   <p className="text-sm font-semibold text-gray-700 mb-2">Detected Columns</p>
//                   <div className="flex flex-wrap gap-2">
//                     {REQUIRED_COLS.map((col) => (
//                       <span key={col}
//                         className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
//                           headers.includes(col)
//                             ? "bg-green-100 text-green-700 border-green-200"
//                             : "bg-red-100 text-red-700 border-red-200"
//                         }`}>
//                         {headers.includes(col) ? "✓" : "✗"} {col}
//                         {!headers.includes(col) && " (missing!)"}
//                       </span>
//                     ))}
//                     {IMPORTANT_COLS.filter((c) => headers.includes(c)).map((col) => (
//                       <span key={col} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
//                         ✓ {col}
//                       </span>
//                     ))}
//                     {headers
//                       .filter((h) => !REQUIRED_COLS.includes(h) && !IMPORTANT_COLS.includes(h))
//                       .map((col) => (
//                         <span key={col} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
//                           {col}
//                         </span>
//                       ))}
//                   </div>
//                   {missingCols.length > 0 && (
//                     <p className="mt-2 text-sm text-red-600 font-medium">
//                       ⚠️ Missing required: <strong>{missingCols.join(", ")}</strong> — fix your CSV and re-upload.
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* Preview table */}
//               {preview.length > 0 && (
//                 <div>
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-sm font-semibold text-gray-700">
//                       Preview
//                       <span className="text-gray-400 font-normal ml-1">
//                         — first {Math.min(10, preview.length)} of {preview.length} rows · {headers.length} columns
//                       </span>
//                     </p>
//                   </div>
//                   <div className="border border-gray-200 rounded-xl overflow-hidden">
//                     <div className="overflow-x-auto max-h-64">
//                       <table className="w-full text-xs">
//                         <thead className="bg-gray-50 sticky top-0">
//                           <tr>
//                             <th className="px-3 py-2.5 text-left font-semibold text-gray-400 border-b border-gray-200">#</th>
//                             {headers.map((h) => (
//                               <th key={h}
//                                 className={`px-3 py-2.5 text-left font-semibold border-b border-gray-200 whitespace-nowrap ${
//                                   REQUIRED_COLS.includes(h) ? "text-indigo-600" : "text-gray-500"
//                                 }`}>
//                                 {h}{REQUIRED_COLS.includes(h) && <span className="text-red-400">*</span>}
//                               </th>
//                             ))}
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-100">
//                           {preview.slice(0, 10).map((row, ri) => (
//                             <tr key={ri} className="hover:bg-gray-50">
//                               <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
//                               {headers.map((h) => (
//                                 <td key={h}
//                                   title={row[h]}
//                                   className={`px-3 py-2 whitespace-nowrap max-w-[160px] truncate ${
//                                     REQUIRED_COLS.includes(h) ? "font-semibold text-gray-900" : "text-gray-600"
//                                   } ${!row[h] && REQUIRED_COLS.includes(h) ? "bg-red-50 text-red-500" : ""}`}>
//                                   {row[h] || <span className="text-gray-300 italic">—</span>}
//                                 </td>
//                               ))}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                     {preview.length > 10 && (
//                       <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
//                         <span className="text-xs text-gray-400">
//                           + {preview.length - 10} more row{preview.length - 10 !== 1 ? "s" : ""}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Tip */}
//               <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
//                 <p className="text-sm font-semibold text-amber-800 mb-1">📋 Multi-variant products</p>
//                 <p className="text-xs text-amber-700 leading-relaxed">
//                   Use <strong>multiple rows with the same product name</strong> to create variants.
//                   Each row = one variant. Use <span className="font-mono">variantAttributes</span> like{" "}
//                   <span className="font-mono bg-amber-100 px-1 rounded">Color:Black|Size:L</span> to differentiate them.
//                   Images are uploaded from comma-separated URLs in the <span className="font-mono">images</span> column (max 5 per variant).
//                 </p>
//               </div>

//               {/* Actions */}
//               <div className="flex gap-3">
//                 <button onClick={() => { reset(); onClose(); }}
//                   className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleUpload}
//                   disabled={!canUpload}
//                   className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none">
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                       d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                   </svg>
//                   {preview.length > 0 ? `Import ${preview.length} Rows` : "Upload CSV"}
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BulkUploadModal;
// import React, { useState, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { useDropzone } from 'react-dropzone';
// import {
//   previewBulkUpload,
//   uploadBulkProducts,
//   resetUpload,
//   setCurrentFile,
//   clearPreview,
// } from '../ADMIN_REDUX_MANAGEMENT/bulkUploadSlice';
// import { toast } from 'react-toastify';
// import * as XLSX from 'xlsx';

// const BulkUploadTab = ({onClose }) => {
//   const dispatch = useDispatch();
//   const {
//     uploadProgress,
//     uploadStatus,
//     uploadResult,
//     previewData,
//     previewLoading,
//     previewError,
//     uploadError,
//     currentFile,
//     validationErrors,
//   } = useSelector((state) => state.bulkUpload);

//   const [selectedFile, setSelectedFile] = useState(null);
//   const [showPreview, setShowPreview] = useState(false);
//   const [uploadStep, setUploadStep] = useState('upload'); // 'upload' | 'preview' | 'results'

//   // File dropzone configuration
//   const onDrop = useCallback((acceptedFiles) => {
//     const file = acceptedFiles[0];
//     if (file) {
//       // Check file type
//       const validTypes = [
//         'text/csv',
//         'application/vnd.ms-excel',
//         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//         'application/vnd.oasis.opendocument.spreadsheet',
//       ];
      
//       if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
//         toast.error('Please upload a valid CSV or Excel file');
//         return;
//       }

//       setSelectedFile(file);
//       dispatch(setCurrentFile(file));
//       setShowPreview(false);
//       setUploadStep('upload');
//     }
//   }, [dispatch]);

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: {
//       'text/csv': ['.csv'],
//       'application/vnd.ms-excel': ['.xls'],
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
//     },
//     maxFiles: 1,
//     maxSize: 10 * 1024 * 1024, // 10MB
//   });

//   // Handle file preview
//   const handlePreview = async () => {
//     if (!selectedFile) {
//       toast.error('Please select a file first');
//       return;
//     }

//     try {
//       await dispatch(previewBulkUpload(selectedFile)).unwrap();
//       setShowPreview(true);
//       setUploadStep('preview');
//       toast.success('File preview loaded successfully');
//     } catch (error) {
//       toast.error(error || 'Failed to preview file');
//     }
//   };

//   // Handle file upload
//   const handleUpload = async () => {
//     if (!selectedFile) {
//       toast.error('Please select a file first');
//       return;
//     }

//     try {
//       await dispatch(uploadBulkProducts(selectedFile)).unwrap();
//       setUploadStep('results');
//       toast.success('Bulk upload completed successfully');
//     } catch (error) {
//       toast.error(error || 'Upload failed');
//     }
//   };

//   // Handle reset
//   const handleReset = () => {
//     dispatch(resetUpload());
//     setSelectedFile(null);
//     setShowPreview(false);
//     setUploadStep('upload');
//   };

//   // Download sample CSV
//   const downloadSampleCSV = () => {
//     const headers = [
//       'name',
//       'category',
//       'basePrice',
//       'salePrice',
//       'description',
//       'brand',
//       'status',
//       'isFeatured',
//       'images',
//       'variantAttributes',
//       'productAttributes',
//       'quantity',
//       'weight',
//       'barcode',
//     ];

//     const sampleRow = [
//       'Sample Product',
//       'Electronics',
//       '1999',
//       '1499',
//       'This is a sample product description',
//       'Generic',
//       'active',
//       'true',
//       'https://example.com/image1.jpg,https://example.com/image2.jpg',
//       'color:red|size:xl',
//       'material:cotton|warranty:1year',
//       '100',
//       '500',
//       'SAMPLE123',
//     ];

//     const csvContent = [
//       headers.join(','),
//       sampleRow.join(','),
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'sample_bulk_upload.csv';
//     a.click();
//     window.URL.revokeObjectURL(url);
//   };

//   // Render upload step
//   const renderUploadStep = () => (
//     <div className="space-y-6">
//       {/* Dropzone */}
//       <div
//         {...getRootProps()}
//         className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
//           isDragActive
//             ? 'border-blue-500 bg-blue-50'
//             : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
//         }`}
//       >
//         <input {...getInputProps()} />
//         <div className="space-y-4">
//           <div className="flex justify-center">
//             <svg
//               className={`w-16 h-16 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
//               />
//             </svg>
//           </div>
//           <div>
//             <p className="text-lg font-medium text-gray-700">
//               {isDragActive
//                 ? 'Drop your file here'
//                 : 'Drag & drop your CSV or Excel file here'}
//             </p>
//             <p className="text-sm text-gray-500 mt-1">or click to browse</p>
//           </div>
//           <div className="flex justify-center gap-4 text-xs text-gray-400">
//             <span>Supported: .csv, .xlsx, .xls</span>
//             <span>•</span>
//             <span>Max size: 10MB</span>
//           </div>
//         </div>
//       </div>

//       {/* Selected file info */}
//       {selectedFile && (
//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-3">
//               <div className="p-2 bg-blue-100 rounded-lg">
//                 <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                 </svg>
//               </div>
//               <div>
//                 <p className="font-medium text-gray-900">{selectedFile.name}</p>
//                 <p className="text-sm text-gray-500">
//                   {(selectedFile.size / 1024).toFixed(2)} KB
//                 </p>
//               </div>
//             </div>
//             <div className="flex space-x-2">
//               <button
//                 onClick={handlePreview}
//                 disabled={previewLoading}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {previewLoading ? (
//                   <span className="flex items-center">
//                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                     </svg>
//                     Previewing...
//                   </span>
//                 ) : (
//                   'Preview Data'
//                 )}
//               </button>
//               <button
//                 onClick={() => {
//                   setSelectedFile(null);
//                   dispatch(clearPreview());
//                 }}
//                 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//               >
//                 Remove
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Sample download link */}
//       <div className="text-center">
//         <button
//           onClick={downloadSampleCSV}
//           className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center space-x-1"
//         >
//           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//           </svg>
//           <span>Download sample CSV template</span>
//         </button>
//       </div>
//     </div>
//   );

//   // Render preview step
//   const renderPreviewStep = () => (
//     <div className="space-y-6">
//       {/* Preview header */}
//       <div className="flex items-center justify-between">
//         <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
//         <div className="flex items-center space-x-2">
//           <span className="text-sm text-gray-500">
//             {previewData.length} rows found
//           </span>
//           {validationErrors.length > 0 && (
//             <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
//               {validationErrors.length} issues found
//             </span>
//           )}
//         </div>
//       </div>

//       {/* Validation errors */}
//       {validationErrors.length > 0 && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//           <h4 className="text-sm font-medium text-red-800 mb-2">Validation Issues:</h4>
//           <ul className="space-y-1">
//             {validationErrors.slice(0, 5).map((error, index) => (
//               <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
//                 <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 <span>{error.message || error}</span>
//               </li>
//             ))}
//             {validationErrors.length > 5 && (
//               <li className="text-sm text-gray-500">
//                 ...and {validationErrors.length - 5} more issues
//               </li>
//             )}
//           </ul>
//         </div>
//       )}

//       {/* Preview table */}
//       <div className="border border-gray-200 rounded-lg overflow-hidden">
//         <div className="max-h-96 overflow-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50 sticky top-0">
//               <tr>
//                 {previewData[0] && Object.keys(previewData[0]).map((header) => (
//                   <th
//                     key={header}
//                     className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                   >
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {previewData.slice(0, 10).map((row, rowIndex) => (
//                 <tr key={rowIndex} className="hover:bg-gray-50">
//                   {Object.values(row).map((value, colIndex) => (
//                     <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
//                       {value || '-'}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         {previewData.length > 10 && (
//           <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 border-t">
//             Showing first 10 of {previewData.length} rows
//           </div>
//         )}
//       </div>

//       {/* Action buttons */}
//       <div className="flex justify-end space-x-3">
//         <button
//           onClick={() => setUploadStep('upload')}
//           className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//         >
//           Back
//         </button>
//         <button
//           onClick={handleUpload}
//           disabled={uploadStatus === 'uploading' || validationErrors.length > 0}
//           className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           {uploadStatus === 'uploading' ? (
//             <span className="flex items-center">
//               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//               </svg>
//               Uploading...
//             </span>
//           ) : (
//             'Proceed to Upload'
//           )}
//         </button>
//       </div>

//       {/* Upload progress */}
//       {uploadStatus === 'uploading' && (
//         <div className="mt-4">
//           <div className="flex justify-between text-sm text-gray-600 mb-1">
//             <span>Uploading...</span>
//             <span>{uploadProgress}%</span>
//           </div>
//           <div className="w-full bg-gray-200 rounded-full h-2">
//             <div
//               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//               style={{ width: `${uploadProgress}%` }}
//             />
//           </div>
//         </div>
//       )}

//       {/* Error message */}
//       {previewError && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//           <p className="text-sm text-red-600">{previewError}</p>
//         </div>
//       )}
//     </div>
//   );

//   // Render results step
//   const renderResultsStep = () => (
//     <div className="space-y-6">
//       <div className="text-center">
//         <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
//           <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//           </svg>
//         </div>
//         <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Complete!</h3>
//         <p className="text-gray-500">Your bulk upload has been processed successfully</p>
//       </div>

//       {uploadResult && (
//         <div className="bg-gray-50 rounded-lg p-6">
//           <div className="grid grid-cols-3 gap-4 mb-6">
//             <div className="text-center">
//               <p className="text-2xl font-bold text-blue-600">{uploadResult.totalRows || 0}</p>
//               <p className="text-sm text-gray-500">Total Rows</p>
//             </div>
//             <div className="text-center">
//               <p className="text-2xl font-bold text-green-600">{uploadResult.insertedProducts || 0}</p>
//               <p className="text-sm text-gray-500">Products Added</p>
//             </div>
//             <div className="text-center">
//               <p className="text-2xl font-bold text-red-600">{uploadResult.failedCount || 0}</p>
//               <p className="text-sm text-gray-500">Failed</p>
//             </div>
//           </div>

//           {uploadResult.failed && uploadResult.failed.length > 0 && (
//             <div>
//               <h4 className="font-medium text-gray-900 mb-2">Failed Items:</h4>
//               <div className="max-h-40 overflow-auto">
//                 {uploadResult.failed.map((fail, index) => (
//                   <div key={index} className="text-sm text-red-600 py-1 border-b border-red-100">
//                     {fail.product}: {fail.error}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       <div className="flex justify-center space-x-3">
//         <button
//           onClick={handleReset}
//           className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//         >
//           Upload Another File
//         </button>
//         <button
//           onClick={() => window.location.reload()}
//           className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//         >
//           Go to Products
//         </button>
//       </div>
//     </div>
//   );

//   return (
//     <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//       <div className="p-6 border-b border-gray-200">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-xl font-semibold text-gray-900">Bulk Product Upload</h2>
//             <p className="text-sm text-gray-500 mt-1">
//               Upload multiple products at once using CSV or Excel files
//             </p>
//           </div>
//           <div className="flex items-center space-x-2">
//             {['upload', 'preview', 'results'].map((step, index) => (
//               <div key={step} className="flex items-center">
//                 <div
//                   className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
//                     uploadStep === step
//                       ? 'bg-blue-600 text-white'
//                       : index < ['upload', 'preview', 'results'].indexOf(uploadStep)
//                       ? 'bg-green-100 text-green-600'
//                       : 'bg-gray-100 text-gray-400'
//                   }`}
//                 >
//                   {index + 1}
//                 </div>
//                 {index < 2 && (
//                   <div className={`w-12 h-0.5 mx-1 ${
//                     index < ['upload', 'preview', 'results'].indexOf(uploadStep) - 1
//                       ? 'bg-green-500'
//                       : 'bg-gray-200'
//                   }`} />
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="p-6">
//         {uploadStep === 'upload' && renderUploadStep()}
//         {uploadStep === 'preview' && renderPreviewStep()}
//         {uploadStep === 'results' && renderResultsStep()}
//       </div>
//     </div>
//   );
// };

// export default BulkUploadTab;