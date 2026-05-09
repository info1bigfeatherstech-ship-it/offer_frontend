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

const GeneratedReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });
  const [form, setForm] = useState(defaultCreateForm);
  const [resolvedProduct, setResolvedProduct] = useState(null);
  const [resolveMeta, setResolveMeta] = useState({ status: "idle", message: "" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/product-reviews", {
        params: { page, limit: 20, source: "admin" },
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load");
      }
      setReviews(Array.isArray(res.data.reviews) ? res.data.reviews : []);
      setPagination(res.data.pagination || { total: 0, pages: 0, limit: 20 });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || "Could not load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const raw = form.productCode.trim();
    if (!raw) {
      setResolvedProduct(null);
      setResolveMeta({ status: "idle", message: "" });
      return undefined;
    }

    const t = setTimeout(async () => {
      const code = raw.toUpperCase();
      setResolvedProduct(null);
      setResolveMeta({ status: "loading", message: "" });
      try {
        const res = await axiosInstance.get(
          `/admin/products/variant/${encodeURIComponent(code)}`
        );
        if (!res.data?.success || !res.data?.product?._id) {
          throw new Error(res.data?.message || "Product not found");
        }
        const p = res.data.product;
        const v = res.data.variant || {};
        const thumb = Array.isArray(v.images) && v.images[0]?.url ? v.images[0].url : null;
        const matched = res.data.matchedProductCode || code;
        setResolvedProduct({
          id: String(p._id),
          title: p.title || p.name || "—",
          slug: p.slug || "",
          thumb,
          productCode: matched,
        });
        setResolveMeta({ status: "ok", message: "" });
      } catch (err) {
        setResolvedProduct(null);
        setResolveMeta({
          status: "error",
          message:
            err?.response?.data?.message ||
            err?.message ||
            "No product found for this code",
        });
      }
    }, 450);

    return () => clearTimeout(t);
  }, [form.productCode]);

  const createReview = async (e) => {
    e.preventDefault();
    const productId = resolvedProduct?.id;
    if (!productId || resolveMeta.status === "loading") {
      toast.error("Enter a valid product code and wait for the preview to load.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        productId,
        rating: Number(form.rating),
        comment: form.comment.trim(),
        displayName: form.displayName.trim(),
        isActive: Boolean(form.isActive),
      };
      const res = await axiosInstance.post("/admin/product-reviews/generated", body);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Create failed");
      }
      toast.success("Generated review created");
      setForm(defaultCreateForm());
      setResolvedProduct(null);
      setResolveMeta({ status: "idle", message: "" });
      setPage(1);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing?._id) return;
    setSaving(true);
    try {
      const body = {
        rating: Number(editing.rating),
        comment: String(editing.comment || "").trim(),
        displayName: String(editing.displayName || "").trim(),
        isActive: Boolean(editing.isActive),
      };
      const res = await axiosInstance.put(`/admin/product-reviews/generated/${editing._id}`, body);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Update failed");
      }
      toast.success("Review updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this generated review permanently?")) return;
    setBusyId(id);
    try {
      await axiosInstance.delete(`/admin/product-reviews/generated/${id}`);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleQuick = async (row, next) => {
    setBusyId(row._id);
    try {
      await axiosInstance.patch(`/admin/product-reviews/${row._id}/status`, { isActive: next });
      toast.success(next ? "Activated" : "Deactivated");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Generated reviews
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Storefront-visible when active. Uses display name you set (optional).
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Create review</h2>
          <form onSubmit={createReview} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Product code
              </label>
              <input
                required
                value={form.productCode}
                onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 uppercase placeholder:normal-case"
                placeholder="e.g. 4321-01 or single-variant BASE"
                autoComplete="off"
              />
              <p className="text-[11px] text-slate-500">
                Same code as on the variant (inventory). Preview loads automatically.
              </p>

              {resolveMeta.status === "loading" && form.productCode.trim() && (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Looking up product…
                </div>
              )}

              {resolveMeta.status === "error" && form.productCode.trim() && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {resolveMeta.message}
                </p>
              )}

              {resolveMeta.status === "ok" && resolvedProduct && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                  {resolvedProduct.thumb ? (
                    <img
                      src={resolvedProduct.thumb}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-emerald-100/80 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-emerald-100/80 border border-emerald-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {resolvedProduct.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Code:{" "}
                      <span className="font-mono font-medium text-slate-700">
                        {resolvedProduct.productCode}
                      </span>
                      {resolvedProduct.slug ? (
                        <>
                          {" "}
                          · /{resolvedProduct.slug}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-2">Rating</span>
              <StarRatingInput
                value={form.rating}
                onChange={(n) => setForm((f) => ({ ...f, rating: n }))}
                disabled={saving}
                size={28}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Display name (optional)
              </label>
              <input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Happy customer"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Comment (optional)
              </label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="gen-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <label htmlFor="gen-active" className="text-sm text-slate-700">
                Active on storefront
              </label>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  resolveMeta.status === "loading" ||
                  !resolvedProduct?.id
                }
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">All generated</h2>
          </div>
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No generated reviews yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead className="bg-[#F8FAFC] text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-center">★</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3 text-center">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r._id}>
                      <td className="px-4 py-3 text-[13px] max-w-[200px] truncate">
                        {r.product?.title || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">{r.displayName || "Customer"}</td>
                      <td className="px-4 py-3 text-center">{r.rating}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-600 max-w-xs truncate">
                        {r.comment || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={busyId === r._id}
                          onClick={() => toggleQuick(r, !r.isActive)}
                          className={`text-xs font-semibold ${
                            r.isActive ? "text-rose-600" : "text-emerald-600"
                          } disabled:opacity-50`}
                        >
                          {r.isActive ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              _id: r._id,
                              rating: r.rating,
                              comment: r.comment || "",
                              displayName: r.displayName || "",
                              isActive: r.isActive,
                            })
                          }
                          className="text-xs font-semibold text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r._id}
                          onClick={() => remove(r._id)}
                          className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit generated review</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-2">Rating</span>
                <StarRatingInput
                  value={editing.rating}
                  onChange={(n) => setEditing((x) => ({ ...x, rating: n }))}
                  disabled={saving}
                  size={28}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Display name
                </label>
                <input
                  value={editing.displayName}
                  onChange={(e) =>
                    setEditing((x) => ({ ...x, displayName: e.target.value }))
                  }
                  className="w-full text-sm border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comment</label>
                <textarea
                  value={editing.comment}
                  onChange={(e) => setEditing((x) => ({ ...x, comment: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="ed-active"
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing((x) => ({ ...x, isActive: e.target.checked }))
                  }
                />
                <label htmlFor="ed-active" className="text-sm">
                  Active
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratedReviewsTab;
