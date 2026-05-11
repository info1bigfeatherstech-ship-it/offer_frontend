import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import { toast } from "react-toastify";
import StarRatingInput from "../../../../User_Side_Web_Interface/Product_segment/StarRatingInput";

const defaultCreateForm = () => ({
  productCode: "",
  rating: 5,
  comment: "",
  displayName: "",
  isActive: true,
});

/* ─── atoms ─── */

const StarDisplay = ({ value }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={14} height={14} viewBox="0 0 24 24"
        fill={i <= value ? "#f59e0b" : "none"}
        stroke={i <= value ? "#f59e0b" : "#e2e8f0"} strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ))}
  </div>
);

const StarIconSolid = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const Avatar = ({ name }) => {
  const initials = (name || "C").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const palettes = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
  ];
  const cls = palettes[(name?.charCodeAt(0) || 0) % palettes.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ring-2 ring-white shadow-sm ${cls}`}>
      {initials}
    </div>
  );
};

const StatusPill = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full border
    ${active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
    {active ? "Live" : "Hidden"}
  </span>
);

const Toggle = ({ checked, onChange }) => (
  <label className="relative inline-block w-10 h-[22px] cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className={`absolute inset-0 rounded-full transition-colors duration-200 ${checked ? "bg-emerald-500" : "bg-slate-200"}`} />
    <span className={`absolute w-4 h-4 bg-white rounded-full top-[3px] shadow-sm transition-all duration-200 ${checked ? "left-[22px]" : "left-[3px]"}`} />
  </label>
);

const Spinner = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" className="animate-spin shrink-0">
    <path d="M21 12a9 9 0 1 1-18 0" strokeLinecap="round" />
  </svg>
);

const FieldLabel = ({ children, optional }) => (
  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
    {children}
    {optional && <span className="text-slate-300 normal-case text-[10.5px] font-normal tracking-normal">optional</span>}
  </label>
);

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 bg-white outline-none font-[inherit] transition-all duration-150 placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 focus:shadow-sm";

/* ─── main ─── */

const GeneratedReviewsTab = () => {
  const [reviews, setReviews]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [page, setPage]                       = useState(1);
  const [pagination, setPagination]           = useState({ total: 0, pages: 0, limit: 20 });
  const [form, setForm]                       = useState(defaultCreateForm);
  const [resolvedProduct, setResolvedProduct] = useState(null);
  const [resolveMeta, setResolveMeta]         = useState({ status: "idle", message: "" });
  const [saving, setSaving]                   = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [busyId, setBusyId]                   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/product-reviews", { params: { page, limit: 20, source: "admin" } });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load");
      setReviews(Array.isArray(res.data.reviews) ? res.data.reviews : []);
      setPagination(res.data.pagination || { total: 0, pages: 0, limit: 20 });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Could not load reviews");
      setReviews([]);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const raw = form.productCode.trim();
    if (!raw) { setResolvedProduct(null); setResolveMeta({ status: "idle", message: "" }); return; }
    const t = setTimeout(async () => {
      const code = raw.toUpperCase();
      setResolvedProduct(null);
      setResolveMeta({ status: "loading", message: "" });
      try {
        const res = await axiosInstance.get(`/admin/products/variant/${encodeURIComponent(code)}`);
        if (!res.data?.success || !res.data?.product?._id) throw new Error(res.data?.message || "Not found");
        const p = res.data.product;
        const v = res.data.variant || {};
        const thumb = Array.isArray(v.images) && v.images[0]?.url ? v.images[0].url : null;
        setResolvedProduct({ id: String(p._id), title: p.title || p.name || "—", slug: p.slug || "", thumb, productCode: res.data.matchedProductCode || code });
        setResolveMeta({ status: "ok", message: "" });
      } catch (err) {
        setResolvedProduct(null);
        setResolveMeta({ status: "error", message: err?.response?.data?.message || err?.message || "No product found" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [form.productCode]);

  const createReview = async (e) => {
    e.preventDefault();
    if (!resolvedProduct?.id || resolveMeta.status === "loading") { toast.error("Enter a valid product code and wait for the preview."); return; }
    setSaving(true);
    try {
      const res = await axiosInstance.post("/admin/product-reviews/generated", { productId: resolvedProduct.id, rating: Number(form.rating), comment: form.comment.trim(), displayName: form.displayName.trim(), isActive: Boolean(form.isActive) });
      if (!res.data?.success) throw new Error(res.data?.message || "Create failed");
      toast.success("Review created");
      setForm(defaultCreateForm());
      setResolvedProduct(null);
      setResolveMeta({ status: "idle", message: "" });
      setPage(1);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Create failed");
    } finally { setSaving(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing?._id) return;
    setSaving(true);
    try {
      const res = await axiosInstance.put(`/admin/product-reviews/generated/${editing._id}`, { rating: Number(editing.rating), comment: String(editing.comment || "").trim(), displayName: String(editing.displayName || "").trim(), isActive: Boolean(editing.isActive) });
      if (!res.data?.success) throw new Error(res.data?.message || "Update failed");
      toast.success("Review updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Update failed");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Permanently delete this review?")) return;
    setBusyId(id);
    try {
      await axiosInstance.delete(`/admin/product-reviews/generated/${id}`);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally { setBusyId(null); }
  };

  const toggleQuick = async (row, next) => {
    setBusyId(row._id);
    try {
      await axiosInstance.patch(`/admin/product-reviews/${row._id}/status`, { isActive: next });
      toast.success(next ? "Review is now live" : "Review hidden");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally { setBusyId(null); }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] px-8 py-8">

      <div className="max-w-[1160px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/25">
              <StarIconSolid />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 tracking-tight leading-snug">Generated Reviews</h1>
              <p className="text-[12.5px] text-slate-400 mt-0.5">Curated storefront reviews — toggle visibility anytime</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <StarIconSolid />
            <span className="text-[14px] font-bold text-slate-800">{pagination.total ?? 0}</span>
            <span className="text-[12px] text-slate-400 font-medium">reviews</span>
          </div>
        </div>

        {/* ── Layout ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "375px minmax(0,1fr)", alignItems: "start" }}>

          {/* ══ FORM ══ */}
          <div className="sticky top-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <p className="text-[13px] font-bold text-slate-900">Create Review</p>
              <p className="text-[11.5px] text-slate-400 mt-0.5">Attach a review to any product</p>
            </div>

            <form onSubmit={createReview} className="px-6 py-6 flex flex-col gap-5">

              {/* Product code */}
              <div>
                <FieldLabel>Product Code</FieldLabel>
                <div className="relative">
                  <input
                    required value={form.productCode}
                    onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
                    className={`${inputCls} uppercase font-mono tracking-[0.06em] pr-9`}
                    placeholder="e.g. 4321-01"
                    autoComplete="off"
                  />
                  {resolveMeta.status === "loading" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"><Spinner /></span>
                  )}
                  {resolveMeta.status === "ok" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </span>
                  )}
                </div>

                {resolveMeta.status === "loading" && form.productCode.trim() && (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400 mt-2">
                    <Spinner size={11} /> Looking up…
                  </p>
                )}

                {resolveMeta.status === "error" && form.productCode.trim() && (
                  <div className="mt-2 flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[12px] text-red-600 leading-snug">{resolveMeta.message}</span>
                  </div>
                )}

                {resolveMeta.status === "ok" && resolvedProduct && (
                  <div className="mt-2 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    {resolvedProduct.thumb
                      ? <img src={resolvedProduct.thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-emerald-200 shrink-0" />
                      : <div className="w-10 h-10 rounded-lg bg-emerald-100 shrink-0 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8v4h8V3z"/>
                          </svg>
                        </div>
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-emerald-800 truncate">{resolvedProduct.title}</p>
                      <p className="text-[10px] text-emerald-500 font-mono tracking-widest mt-0.5">{resolvedProduct.productCode}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              {/* Rating */}
              <div>
                <FieldLabel>Rating</FieldLabel>
                <StarRatingInput value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} disabled={saving} size={26} />
              </div>

              {/* Display name */}
              <div>
                <FieldLabel optional>Display Name</FieldLabel>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  className={inputCls} placeholder="e.g. Priya S."
                />
              </div>

              {/* Comment */}
              <div>
                <FieldLabel optional>Comment</FieldLabel>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={3} className={`${inputCls} resize-y leading-relaxed`}
                  placeholder="Write review text here…"
                />
              </div>

              <div className="h-px bg-slate-100" />

              {/* Visibility */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 px-4 py-3.5">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Visible on storefront</p>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">Customers see this immediately</p>
                </div>
                <Toggle checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              </div>

              <button
                type="submit"
                disabled={saving || resolveMeta.status === "loading" || !resolvedProduct?.id}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-[13px] font-semibold rounded-xl py-3 transition-all duration-150 shadow-lg shadow-slate-900/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
              >
                {saving
                  ? <><Spinner /> Saving…</>
                  : <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                      Create Review
                    </>
                }
              </button>
            </form>
          </div>

          {/* ══ TABLE ══ */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-900">All Reviews</p>
                {!loading && reviews.length > 0 && (
                  <p className="text-[11.5px] text-slate-400 mt-0.5">Showing {reviews.length} of {pagination.total}</p>
                )}
              </div>
              {!loading && reviews.length > 0 && pagination.pages > 1 && (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-lg px-2.5 py-1">
                  {page} / {pagination.pages}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2.5 py-24 text-slate-400 text-[13px]">
                <Spinner /> Loading reviews…
              </div>

            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center py-24 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                  </svg>
                </div>
                <p className="text-[14px] font-bold text-slate-700">No reviews yet</p>
                <p className="text-[12.5px] text-slate-400 mt-1.5 max-w-[220px] leading-relaxed">Create your first curated review using the form on the left.</p>
              </div>

            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                  <thead>
                    <tr className="border-b border-slate-100">
                      {[["Product","left"],["Reviewer","left"],["Rating","left"],["Comment","left"],["Status","center"],["","right"]].map(([h, align]) => (
                        <th key={h + align}
                          className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] bg-slate-50/80"
                          style={{ textAlign: align }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r, i) => (
                      <tr key={r._id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors duration-100 group"
                        style={{ animation: "rowIn 0.2s ease both", animationDelay: `${i * 0.03}s` }}>

                        <td className="px-5 py-4" style={{ maxWidth: 160 }}>
                          <span className="text-[13px] font-semibold text-slate-800 block truncate">{r.product?.title || "—"}</span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.displayName} />
                            <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">{r.displayName || "Customer"}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StarDisplay value={r.rating} />
                          <span className="text-[10px] text-slate-400 font-semibold mt-1 block tracking-wide">{r.rating} / 5</span>
                        </td>

                        <td className="px-5 py-4" style={{ maxWidth: 220 }}>
                          {r.comment
                            ? <span className="text-[12.5px] text-slate-500 block truncate leading-relaxed">"{r.comment}"</span>
                            : <span className="text-[12px] text-slate-300 italic">No comment</span>
                          }
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            disabled={busyId === r._id}
                            onClick={() => toggleQuick(r, !r.isActive)}
                            className={`transition-opacity ${busyId === r._id ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <StatusPill active={r.isActive} />
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              type="button"
                              onClick={() => setEditing({ _id: r._id, rating: r.rating, comment: r.comment || "", displayName: r.displayName || "", isActive: r.isActive })}
                              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r._id}
                              onClick={() => remove(r._id)}
                              className="inline-flex items-center text-[11.5px] font-medium text-red-500 bg-white border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm disabled:opacity-40"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-[12px] text-slate-400">
                  Page <span className="font-semibold text-slate-600">{page}</span> of {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-[12.5px] font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                    ← Prev
                  </button>
                  <button type="button" disabled={page >= pagination.pages || loading} onClick={() => setPage((p) => p + 1)}
                    className="text-[12.5px] font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ EDIT MODAL ══ */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/50 backdrop-blur-[3px]"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl shadow-slate-900/30 border border-slate-200 overflow-hidden"
            style={{ animation: "slideUp 0.22s ease" }}
          >
            <div className="px-7 pt-6 pb-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50 to-white">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Edit Review</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">Changes are reflected on storefront immediately</p>
              </div>
              <button type="button" onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={saveEdit} className="px-7 py-6 flex flex-col gap-5">
              <div>
                <FieldLabel>Rating</FieldLabel>
                <StarRatingInput value={editing.rating} onChange={(n) => setEditing((x) => ({ ...x, rating: n }))} disabled={saving} size={26} />
              </div>

              <div>
                <FieldLabel>Display Name</FieldLabel>
                <input value={editing.displayName} onChange={(e) => setEditing((x) => ({ ...x, displayName: e.target.value }))}
                  className={inputCls} placeholder="Customer" />
              </div>

              <div>
                <FieldLabel>Comment</FieldLabel>
                <textarea value={editing.comment} onChange={(e) => setEditing((x) => ({ ...x, comment: e.target.value }))}
                  rows={3} className={`${inputCls} resize-y leading-relaxed`} />
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 px-4 py-3.5">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Visible on storefront</p>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">Toggle customer visibility</p>
                </div>
                <Toggle checked={editing.isActive} onChange={(e) => setEditing((x) => ({ ...x, isActive: e.target.checked }))} />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-[13px] font-semibold rounded-xl py-3 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-40">
                  {saving ? <><Spinner /> Saving…</> : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditing(null)}
                  className="text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-5 py-3 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
};

export default GeneratedReviewsTab;



// import React, { useCallback, useEffect, useState } from "react";
// import axiosInstance from "../../../../SERVICES/axiosInstance";
// import { toast } from "react-toastify";
// import StarRatingInput from "../../../../User_Side_Web_Interface/Product_segment/StarRatingInput";

// const defaultCreateForm = () => ({
//   productCode: "",
//   rating: 5,
//   comment: "",
//   displayName: "",
//   isActive: true,
// });

// const GeneratedReviewsTab = () => {
//   const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });
//   const [form, setForm] = useState(defaultCreateForm);
//   const [resolvedProduct, setResolvedProduct] = useState(null);
//   const [resolveMeta, setResolveMeta] = useState({ status: "idle", message: "" });
//   const [saving, setSaving] = useState(false);
//   const [editing, setEditing] = useState(null);
//   const [busyId, setBusyId] = useState(null);

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await axiosInstance.get("/admin/product-reviews", {
//         params: { page, limit: 20, source: "admin" },
//       });
//       if (!res.data?.success) {
//         throw new Error(res.data?.message || "Failed to load");
//       }
//       setReviews(Array.isArray(res.data.reviews) ? res.data.reviews : []);
//       setPagination(res.data.pagination || { total: 0, pages: 0, limit: 20 });
//     } catch (err) {
//       console.error(err);
//       toast.error(err?.response?.data?.message || err.message || "Could not load reviews");
//       setReviews([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [page]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const raw = form.productCode.trim();
//     if (!raw) {
//       setResolvedProduct(null);
//       setResolveMeta({ status: "idle", message: "" });
//       return undefined;
//     }

//     const t = setTimeout(async () => {
//       const code = raw.toUpperCase();
//       setResolvedProduct(null);
//       setResolveMeta({ status: "loading", message: "" });
//       try {
//         const res = await axiosInstance.get(
//           `/admin/products/variant/${encodeURIComponent(code)}`
//         );
//         if (!res.data?.success || !res.data?.product?._id) {
//           throw new Error(res.data?.message || "Product not found");
//         }
//         const p = res.data.product;
//         const v = res.data.variant || {};
//         const thumb = Array.isArray(v.images) && v.images[0]?.url ? v.images[0].url : null;
//         const matched = res.data.matchedProductCode || code;
//         setResolvedProduct({
//           id: String(p._id),
//           title: p.title || p.name || "—",
//           slug: p.slug || "",
//           thumb,
//           productCode: matched,
//         });
//         setResolveMeta({ status: "ok", message: "" });
//       } catch (err) {
//         setResolvedProduct(null);
//         setResolveMeta({
//           status: "error",
//           message:
//             err?.response?.data?.message ||
//             err?.message ||
//             "No product found for this code",
//         });
//       }
//     }, 450);

//     return () => clearTimeout(t);
//   }, [form.productCode]);

//   const createReview = async (e) => {
//     e.preventDefault();
//     const productId = resolvedProduct?.id;
//     if (!productId || resolveMeta.status === "loading") {
//       toast.error("Enter a valid product code and wait for the preview to load.");
//       return;
//     }
//     setSaving(true);
//     try {
//       const body = {
//         productId,
//         rating: Number(form.rating),
//         comment: form.comment.trim(),
//         displayName: form.displayName.trim(),
//         isActive: Boolean(form.isActive),
//       };
//       const res = await axiosInstance.post("/admin/product-reviews/generated", body);
//       if (!res.data?.success) {
//         throw new Error(res.data?.message || "Create failed");
//       }
//       toast.success("Generated review created");
//       setForm(defaultCreateForm());
//       setResolvedProduct(null);
//       setResolveMeta({ status: "idle", message: "" });
//       setPage(1);
//       await load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || err.message || "Create failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const saveEdit = async (e) => {
//     e.preventDefault();
//     if (!editing?._id) return;
//     setSaving(true);
//     try {
//       const body = {
//         rating: Number(editing.rating),
//         comment: String(editing.comment || "").trim(),
//         displayName: String(editing.displayName || "").trim(),
//         isActive: Boolean(editing.isActive),
//       };
//       const res = await axiosInstance.put(`/admin/product-reviews/generated/${editing._id}`, body);
//       if (!res.data?.success) {
//         throw new Error(res.data?.message || "Update failed");
//       }
//       toast.success("Review updated");
//       setEditing(null);
//       await load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || err.message || "Update failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const remove = async (id) => {
//     if (!window.confirm("Delete this generated review permanently?")) return;
//     setBusyId(id);
//     try {
//       await axiosInstance.delete(`/admin/product-reviews/generated/${id}`);
//       toast.success("Deleted");
//       await load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Delete failed");
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const toggleQuick = async (row, next) => {
//     setBusyId(row._id);
//     try {
//       await axiosInstance.patch(`/admin/product-reviews/${row._id}/status`, { isActive: next });
//       toast.success(next ? "Activated" : "Deactivated");
//       await load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Update failed");
//     } finally {
//       setBusyId(null);
//     }
//   };

//   return (
//     <div className="bg-[#F8FAFC] min-h-screen p-4 sm:p-6">
//       <div className="max-w-[1600px] mx-auto space-y-6">
//         <div>
//           <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
//             Generated reviews
//           </h1>
//           <p className="text-sm text-slate-500 mt-1">
//             Storefront-visible when active. Uses display name you set (optional).
//           </p>
//         </div>

//         <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
//           <h2 className="text-sm font-semibold text-slate-800 mb-4">Create review</h2>
//           <form onSubmit={createReview} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-xs font-medium text-slate-600 mb-1">
//                 Product code
//               </label>
//               <input
//                 required
//                 value={form.productCode}
//                 onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
//                 className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 uppercase placeholder:normal-case"
//                 placeholder="e.g. 4321-01 or single-variant BASE"
//                 autoComplete="off"
//               />
//               <p className="text-[11px] text-slate-500">
//                 Same code as on the variant (inventory). Preview loads automatically.
//               </p>

//               {resolveMeta.status === "loading" && form.productCode.trim() && (
//                 <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
//                   <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
//                   Looking up product…
//                 </div>
//               )}

//               {resolveMeta.status === "error" && form.productCode.trim() && (
//                 <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
//                   {resolveMeta.message}
//                 </p>
//               )}

//               {resolveMeta.status === "ok" && resolvedProduct && (
//                 <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
//                   {resolvedProduct.thumb ? (
//                     <img
//                       src={resolvedProduct.thumb}
//                       alt=""
//                       className="w-14 h-14 rounded-lg object-cover border border-emerald-100/80 shrink-0"
//                     />
//                   ) : (
//                     <div className="w-14 h-14 rounded-lg bg-emerald-100/80 border border-emerald-100 shrink-0" />
//                   )}
//                   <div className="min-w-0 flex-1">
//                     <p className="text-sm font-semibold text-slate-900 truncate">
//                       {resolvedProduct.title}
//                     </p>
//                     <p className="text-[11px] text-slate-500 truncate">
//                       Code:{" "}
//                       <span className="font-mono font-medium text-slate-700">
//                         {resolvedProduct.productCode}
//                       </span>
//                       {resolvedProduct.slug ? (
//                         <>
//                           {" "}
//                           · /{resolvedProduct.slug}
//                         </>
//                       ) : null}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div>
//               <span className="block text-xs font-medium text-slate-600 mb-2">Rating</span>
//               <StarRatingInput
//                 value={form.rating}
//                 onChange={(n) => setForm((f) => ({ ...f, rating: n }))}
//                 disabled={saving}
//                 size={28}
//               />
//             </div>
//             <div>
//               <label className="block text-xs font-medium text-slate-600 mb-1">
//                 Display name (optional)
//               </label>
//               <input
//                 value={form.displayName}
//                 onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
//                 className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
//                 placeholder="Happy customer"
//               />
//             </div>
//             <div className="md:col-span-2">
//               <label className="block text-xs font-medium text-slate-600 mb-1">
//                 Comment (optional)
//               </label>
//               <textarea
//                 value={form.comment}
//                 onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
//                 rows={3}
//                 className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
//               />
//             </div>
//             <div className="md:col-span-2 flex items-center gap-2">
//               <input
//                 id="gen-active"
//                 type="checkbox"
//                 checked={form.isActive}
//                 onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
//               />
//               <label htmlFor="gen-active" className="text-sm text-slate-700">
//                 Active on storefront
//               </label>
//             </div>
//             <div className="md:col-span-2">
//               <button
//                 type="submit"
//                 disabled={
//                   saving ||
//                   resolveMeta.status === "loading" ||
//                   !resolvedProduct?.id
//                 }
//                 className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
//               >
//                 {saving ? "Saving…" : "Create"}
//               </button>
//             </div>
//           </form>
//         </div>

//         <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
//           <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
//             <h2 className="text-sm font-semibold text-slate-800">All generated</h2>
//           </div>
//           {loading ? (
//             <div className="py-16 text-center text-slate-500 text-sm">Loading…</div>
//           ) : reviews.length === 0 ? (
//             <div className="py-16 text-center text-slate-500 text-sm">No generated reviews yet.</div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse min-w-[640px]">
//                 <thead className="bg-[#F8FAFC] text-[11px] font-semibold text-slate-500 uppercase">
//                   <tr>
//                     <th className="px-4 py-3">Product</th>
//                     <th className="px-4 py-3">Name</th>
//                     <th className="px-4 py-3 text-center">★</th>
//                     <th className="px-4 py-3">Comment</th>
//                     <th className="px-4 py-3 text-center">Active</th>
//                     <th className="px-4 py-3 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {reviews.map((r) => (
//                     <tr key={r._id}>
//                       <td className="px-4 py-3 text-[13px] max-w-[200px] truncate">
//                         {r.product?.title || "—"}
//                       </td>
//                       <td className="px-4 py-3 text-sm">{r.displayName || "Customer"}</td>
//                       <td className="px-4 py-3 text-center">{r.rating}</td>
//                       <td className="px-4 py-3 text-[13px] text-slate-600 max-w-xs truncate">
//                         {r.comment || "—"}
//                       </td>
//                       <td className="px-4 py-3 text-center">
//                         <button
//                           type="button"
//                           disabled={busyId === r._id}
//                           onClick={() => toggleQuick(r, !r.isActive)}
//                           className={`text-xs font-semibold ${
//                             r.isActive ? "text-rose-600" : "text-emerald-600"
//                           } disabled:opacity-50`}
//                         >
//                           {r.isActive ? "On" : "Off"}
//                         </button>
//                       </td>
//                       <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
//                         <button
//                           type="button"
//                           onClick={() =>
//                             setEditing({
//                               _id: r._id,
//                               rating: r.rating,
//                               comment: r.comment || "",
//                               displayName: r.displayName || "",
//                               isActive: r.isActive,
//                             })
//                           }
//                           className="text-xs font-semibold text-blue-600"
//                         >
//                           Edit
//                         </button>
//                         <button
//                           type="button"
//                           disabled={busyId === r._id}
//                           onClick={() => remove(r._id)}
//                           className="text-xs font-semibold text-rose-600 disabled:opacity-50"
//                         >
//                           Delete
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>

//         {pagination.pages > 1 && (
//           <div className="flex items-center justify-between text-sm text-slate-600">
//             <span>
//               Page {page} of {pagination.pages}
//             </span>
//             <div className="flex gap-2">
//               <button
//                 type="button"
//                 disabled={page <= 1 || loading}
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//                 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <button
//                 type="button"
//                 disabled={page >= pagination.pages || loading}
//                 onClick={() => setPage((p) => p + 1)}
//                 className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {editing && (
//         <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
//           <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
//             <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit generated review</h3>
//             <form onSubmit={saveEdit} className="space-y-3">
//               <div>
//                 <span className="block text-xs font-medium text-slate-600 mb-2">Rating</span>
//                 <StarRatingInput
//                   value={editing.rating}
//                   onChange={(n) => setEditing((x) => ({ ...x, rating: n }))}
//                   disabled={saving}
//                   size={28}
//                 />
//               </div>
//               <div>
//                 <label className="block text-xs font-medium text-slate-600 mb-1">
//                   Display name
//                 </label>
//                 <input
//                   value={editing.displayName}
//                   onChange={(e) =>
//                     setEditing((x) => ({ ...x, displayName: e.target.value }))
//                   }
//                   className="w-full text-sm border rounded-lg px-3 py-2"
//                 />
//               </div>
//               <div>
//                 <label className="block text-xs font-medium text-slate-600 mb-1">Comment</label>
//                 <textarea
//                   value={editing.comment}
//                   onChange={(e) => setEditing((x) => ({ ...x, comment: e.target.value }))}
//                   rows={3}
//                   className="w-full text-sm border rounded-lg px-3 py-2"
//                 />
//               </div>
//               <div className="flex items-center gap-2">
//                 <input
//                   id="ed-active"
//                   type="checkbox"
//                   checked={editing.isActive}
//                   onChange={(e) =>
//                     setEditing((x) => ({ ...x, isActive: e.target.checked }))
//                   }
//                 />
//                 <label htmlFor="ed-active" className="text-sm">
//                   Active
//                 </label>
//               </div>
//               <div className="flex gap-2 pt-2">
//                 <button
//                   type="submit"
//                   disabled={saving}
//                   className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
//                 >
//                   Save
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setEditing(null)}
//                   className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default GeneratedReviewsTab;
