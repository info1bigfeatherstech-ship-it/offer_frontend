import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import { toast } from "react-toastify";

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

const CustomerSubmissionsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });
  const [filterProductId, setFilterProductId] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, source: "customer" };
      if (filterProductId.trim()) params.productId = filterProductId.trim();
      if (filterActive === "true" || filterActive === "false") params.isActive = filterActive;

      const res = await axiosInstance.get("/admin/product-reviews", { params });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load reviews");
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
  }, [page, filterProductId, filterActive]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (row, nextActive) => {
    setBusyId(row._id);
    try {
      await axiosInstance.patch(`/admin/product-reviews/${row._id}/status`, {
        isActive: nextActive,
      });
      toast.success(nextActive ? "Review published" : "Review hidden");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Customer submissions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              New reviews start inactive. Activate to show on the storefront.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Filter by product ObjectId"
              value={filterProductId}
              onChange={(e) => {
                setPage(1);
                setFilterProductId(e.target.value);
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[200px]"
            />
            <select
              value={filterActive}
              onChange={(e) => {
                setPage(1);
                setFilterActive(e.target.value);
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All statuses</option>
              <option value="false">Pending / hidden</option>
              <option value="true">Active</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16 text-slate-500 text-sm">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No customer reviews found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-center">Rating</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3">Photos</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          {r.product?.thumb ? (
                            <img
                              src={r.product.thumb}
                              alt=""
                              className="w-10 h-10 rounded border border-slate-100 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-800 truncate">
                              {r.product?.title || "—"}
                            </p>
                            {r.product?.slug && (
                              <p className="text-[11px] text-slate-400 truncate">{r.product.slug}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        <div className="font-medium text-slate-900">
                          {r.customer?.name || "—"}
                        </div>
                        <div className="text-slate-500 text-xs">{r.customer?.phone || ""}</div>
                        {r.verifiedPurchase ? (
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Verified · {r.orderId || "order"}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{r.rating} ★</td>
                      <td className="px-4 py-3 text-[13px] text-slate-600 max-w-md align-top">
                        {r.comment?.trim() ? (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {r.comment}
                          </p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {Array.isArray(r.images) && r.images.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {r.images.slice(0, 3).map((img) => (
                              <a
                                key={img.publicId || img.url}
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={img.url}
                                  alt=""
                                  className="w-10 h-10 rounded border border-slate-100 object-cover"
                                />
                              </a>
                            ))}
                            {r.images.length > 3 ? (
                              <span className="text-[10px] text-slate-500 self-center">
                                +{r.images.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap align-top">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            r.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-800 border-amber-100"
                          }`}
                        >
                          {r.isActive ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.isActive ? (
                          <button
                            type="button"
                            disabled={busyId === r._id}
                            onClick={() => toggleActive(r, false)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === r._id}
                            onClick={() => toggleActive(r, true)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
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
              Page {page} of {pagination.pages} ({pagination.total} total)
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
    </div>
  );
};

export default CustomerSubmissionsTab;
