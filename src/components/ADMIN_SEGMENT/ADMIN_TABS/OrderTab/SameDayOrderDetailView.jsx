import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import { formatInr } from "../../../../utils/formatInr";
import { useGetAdminOrderDetailQuery } from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import OrderPaymentSummaryCard from "./OrderPaymentSummaryCard";

function formatDateHeader(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} kg`;
}

function formatPackageDims(dims) {
  if (!dims || typeof dims !== "object") return null;
  const l = Number(dims.lengthCm);
  const w = Number(dims.widthCm);
  const h = Number(dims.heightCm);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return `${l} × ${w} × ${h} cm`;
}

function lineIds(line) {
  const productId = String(line?.productId?._id || line?.productId || "").trim();
  const variantId = String(line?.variantId?._id || line?.variantId || "").trim();
  return { productId, variantId };
}

function lineImage(line) {
  return (
    line?.thumbnailUrl ||
    line?.productId?.images?.[0]?.url ||
    line?.productId?.images?.[0] ||
    null
  );
}

function formatDeliveryAddress(addr) {
  if (!addr || typeof addr !== "object") return "";
  return [
    addr.houseNumber,
    addr.building,
    addr.floor,
    addr.addressLine1,
    addr.addressLine2,
    addr.area,
    addr.landmark,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function sddStatusLabel(orderStatus) {
  const s = String(orderStatus || "").toLowerCase();
  if (s === "confirmed") return "Pending";
  if (s === "shipped") return "Shipped";
  if (s === "cancelled") return "Cancelled";
  return s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function statusBadgeClass(orderStatus) {
  const s = String(orderStatus || "").toLowerCase();
  if (s === "shipped") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "confirmed") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function paymentBadgeClass(paymentStatus) {
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "paid") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "partially_paid" || s === "partially_refunded") return "bg-amber-50 text-amber-800 border-amber-200";
  if (["failed", "refunded"].includes(s)) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function labelPaymentStatus(raw) {
  const k = String(raw || "").trim();
  const map = {
    pending: "Pending",
    initiated: "Initiated",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
    partially_paid: "Partially paid",
    partially_refunded: "Partially refunded",
  };
  return map[k] || (k ? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
}

function paymentMethodLabel(order) {
  const m = order?.paymentInfo?.method;
  if (String(m || "").toLowerCase() === "cod") return "Cash on delivery (COD)";
  if (m === "online") return "Online (Razorpay)";
  return m ? String(m) : "Online (Razorpay)";
}

function SameDayItemEditPanel({ order, orderId, disabled, onApplied }) {
  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const [draftQty, setDraftQty] = useState({});
  const [preview, setPreview] = useState(null);
  const [localMsg, setLocalMsg] = useState(null);
  const [busyPreview, setBusyPreview] = useState(false);
  const [busyApply, setBusyApply] = useState(false);

  const weightSnap = order?.shippingWeightSnapshot;
  const weightByVariantId = useMemo(() => {
    const map = new Map();
    for (const row of weightSnap?.lines || []) {
      if (row?.variantId != null) map.set(String(row.variantId), row);
    }
    return map;
  }, [weightSnap]);

  useEffect(() => {
    const next = {};
    for (const line of items) {
      const { productId, variantId } = lineIds(line);
      if (!productId || !variantId) continue;
      next[`${productId}:${variantId}`] = Number(line.quantity) || 0;
    }
    setDraftQty(next);
    setPreview(null);
    setLocalMsg(null);
  }, [orderId, items]);

  const itemUpdates = useMemo(
    () =>
      items
        .map((line) => {
          const { productId, variantId } = lineIds(line);
          if (!productId || !variantId) return null;
          const quantity = Number(draftQty[`${productId}:${variantId}`]);
          if (!Number.isFinite(quantity) || quantity < 0) return null;
          return { productId, variantId, quantity: Math.floor(quantity) };
        })
        .filter(Boolean),
    [items, draftQty]
  );

  const hasChanges = useMemo(
    () =>
      items.some((line) => {
        const { productId, variantId } = lineIds(line);
        return Number(draftQty[`${productId}:${variantId}`]) !== Number(line.quantity);
      }),
    [items, draftQty]
  );

  const busy = busyPreview || busyApply || disabled;
  const setQty = (key, next, maxQty) => {
    const v = Math.max(0, Math.min(maxQty, Math.floor(Number(next) || 0)));
    setDraftQty((prev) => ({ ...prev, [key]: v }));
    setPreview(null);
  };

  const runPreview = async () => {
    setLocalMsg(null);
    setPreview(null);
    setBusyPreview(true);
    try {
      const res = await axiosInstance.post(
        `/admin/same-day-delivery/orders/${encodeURIComponent(orderId)}/edit/preview`,
        { itemUpdates },
        { authContext: "admin" }
      );
      setPreview(res.data?.data || null);
    } catch (e) {
      setLocalMsg({ type: "err", text: e?.response?.data?.message || e?.message || "Preview failed." });
    } finally {
      setBusyPreview(false);
    }
  };

  const runApply = async () => {
    const refund = Number(preview?.after?.refundInr || preview?.refundInr) || 0;
    if (
      !window.confirm(
        refund > 0.005
          ? `Apply these item changes and refund ${formatInr(refund)} for removed / reduced items?`
          : "Apply these item quantity changes?"
      )
    ) {
      return;
    }
    setLocalMsg(null);
    setBusyApply(true);
    try {
      const res = await axiosInstance.post(
        `/admin/same-day-delivery/orders/${encodeURIComponent(orderId)}/edit`,
        { itemUpdates },
        { authContext: "admin" }
      );
      const data = res.data?.data || {};
      const refundInr = Number(data.refundInr || data.preview?.after?.refundInr) || 0;
      if (res.data?.refundWarning || data.preview?.refundWarning) {
        toast.warn(res.data?.refundWarning || data.preview?.refundWarning);
      }
      setPreview(null);
      setLocalMsg({
        type: "ok",
        text:
          res.data?.message ||
          (data.cancelledEmpty
            ? "Order cancelled — no items left."
            : refundInr > 0
              ? `Order updated. Refund ${formatInr(refundInr)} initiated where applicable.`
              : "Order updated successfully."),
      });
      if (typeof onApplied === "function") await onApplied(data);
    } catch (e) {
      setLocalMsg({ type: "err", text: e?.response?.data?.message || e?.message || "Update failed." });
    } finally {
      setBusyApply(false);
    }
  };

  if (!items.length) return null;

  const displaySubtotal = preview?.after?.subtotal ?? order?.subtotal;
  const displayTotal = preview?.after?.totalAmount ?? order?.totalAmount;
  const displayDiscount = preview?.after?.discount ?? order?.discount;
  const couponCode = order?.appliedCoupon?.code;

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">Edit items before ship</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
            Change quantity or remove a product, then Preview and Apply. Removing or reducing an item
            refunds only that amount.
          </p>
        </div>
        {weightSnap?.totalWeightKg != null && (
          <div className="text-right text-[11px] space-y-0.5 text-slate-600 shrink-0">
            <p>
              Weight{" "}
              <span className="font-semibold text-slate-900">{formatKg(weightSnap.totalWeightKg)}</span>
              {formatPackageDims(weightSnap.dims) ? (
                <>
                  {" · "}
                  <span className="font-semibold text-slate-900">{formatPackageDims(weightSnap.dims)}</span>
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((line, idx) => {
          const { productId, variantId } = lineIds(line);
          const key = `${productId}:${variantId}`;
          const name = line?.productId?.name || line?.productName || "Product";
          const sku = line?.sku || "—";
          const maxQty = Number(line.quantity) || 0;
          const qty = draftQty[key] ?? maxQty;
          const img = lineImage(line);
          const lineTotal = Number(line?.lineTotal ?? line?.priceSnapshot?.total) || 0;
          const removed = qty === 0;
          const weightRow = weightByVariantId.get(String(variantId || ""));
          return (
            <div
              key={key || idx}
              className={`px-4 py-3 flex flex-wrap items-center gap-3 ${removed ? "opacity-50 bg-slate-50/80" : ""}`}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md border border-slate-100 bg-slate-50 overflow-hidden">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">📦</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 leading-snug">{name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  SKU <span className="font-mono">{sku}</span>
                  {weightRow?.lineWeightKg != null ? ` · ${formatKg(weightRow.lineWeightKg)}` : null}
                  {formatPackageDims(weightRow) ? ` · ${formatPackageDims(weightRow)}` : null}
                  {removed ? <span className="ml-2 font-semibold text-red-600">Will be removed</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    disabled={busy || qty <= 0}
                    aria-label="Decrease quantity"
                    onClick={() => setQty(key, qty - 1, maxQty)}
                    className="h-9 w-9 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={maxQty}
                    step={1}
                    disabled={busy}
                    value={qty}
                    onChange={(e) => setQty(key, e.target.value, maxQty)}
                    className="w-12 h-9 border-x border-slate-200 text-center text-sm font-semibold text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || qty >= maxQty}
                    aria-label="Increase quantity"
                    onClick={() => setQty(key, qty + 1, maxQty)}
                    className="h-9 w-9 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <p className="w-[4.5rem] text-right text-sm font-bold text-slate-900">{formatInr(lineTotal)}</p>
                <button
                  type="button"
                  disabled={busy || qty === 0}
                  title="Remove item"
                  aria-label="Remove item"
                  onClick={() => setQty(key, 0, maxQty)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatInr(displaySubtotal)}</span>
        </div>
        {Number(displayDiscount) > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount{couponCode ? ` (${couponCode})` : ""}</span>
            <span>−{formatInr(displayDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
          <span>Total</span>
          <span>{formatInr(displayTotal)}</span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={runPreview}
          className="px-4 py-2 text-sm font-bold border border-slate-300 text-slate-800 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {busyPreview ? "Calculating…" : "Preview totals"}
        </button>
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={runApply}
          className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {busyApply ? "Applying…" : "Apply changes"}
        </button>
      </div>

      {localMsg && (
        <p
          className={`px-4 pb-3 text-xs font-medium ${
            localMsg.type === "err" ? "text-red-700" : "text-emerald-800"
          }`}
        >
          {localMsg.text}
        </p>
      )}

      {preview && (
        <div className="mx-4 mb-4 rounded-md border border-blue-100 bg-blue-50/60 p-3 space-y-2 text-xs text-slate-800">
          <p className="font-bold text-blue-900 text-[10px] uppercase tracking-wider">Preview</p>
          {preview.cancelledEmpty ? (
            <p className="font-semibold text-red-800">
              All items removed → order will be cancelled. Refund: {formatInr(preview.after?.refundInr ?? preview.refundInr)}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <p className="text-slate-500">New subtotal</p>
                <p className="font-semibold">{formatInr(preview.after?.subtotal)}</p>
              </div>
              <div>
                <p className="text-slate-500">New total</p>
                <p className="font-semibold">{formatInr(preview.after?.totalAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Refund</p>
                <p className="font-semibold">{formatInr(preview.after?.refundInr ?? preview.refundInr)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SameDayCustomerAddressCard({ order }) {
  const addr = order?.addressSnapshot || {};
  const email = order?.customer?.email || null;
  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 shrink-0"
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Customer & address</h3>
            <p className="text-[11px] text-slate-500 truncate">Who receives this order</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Name</p>
            <p className="text-slate-900 font-medium">{addr.fullName || addr.name || order?.name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Phone</p>
            <p className="text-slate-900 font-medium">{addr.phone || order?.customer?.phone || order?.phone || "—"}</p>
          </div>
          {email && (
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Email</p>
              <p className="text-blue-600 font-medium break-all">{email}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Delivery address</p>
            <p className="text-slate-700 leading-relaxed text-[13px]">{formatDeliveryAddress(addr) || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SameDayItemsReadOnly({ order }) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const weightSnap = order?.shippingWeightSnapshot;
  const coupon = order?.appliedCoupon;
  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Items in this order</h3>
        {weightSnap?.totalWeightKg != null && (
          <p className="text-[11px] text-slate-600">
            Weight <span className="font-semibold text-slate-900">{formatKg(weightSnap.totalWeightKg)}</span>
            {formatPackageDims(weightSnap.dims) ? (
              <>
                {" · "}
                <span className="font-semibold text-slate-900">{formatPackageDims(weightSnap.dims)}</span>
              </>
            ) : null}
          </p>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((line, idx) => {
          const name = line?.productId?.name || line?.productName || "Product";
          const img = lineImage(line);
          const sku = line?.sku || "—";
          const qty = line?.quantity ?? 0;
          const lineTotal = Number(line?.lineTotal ?? line?.priceSnapshot?.total) || 0;
          return (
            <div key={idx} className="px-4 py-3.5 flex gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md border border-slate-100 bg-slate-50 overflow-hidden">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Qty {qty} · SKU <span className="font-mono">{sku}</span>
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900 shrink-0">{formatInr(lineTotal)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatInr(order?.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Taxes & Others</span>
          <span>{formatInr(order?.tax)}</span>
        </div>
        {Number(order?.discount) > 0 && (
          <div className="flex justify-between text-blue-700">
            <span>Discount{coupon?.code ? ` (${coupon.code})` : ""}</span>
            <span>−{formatInr(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
          <span>Grand total</span>
          <span>{formatInr(order?.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SameDayOrderDetailView({ orderId, sddOrder, loading, onBack, onRefresh }) {
  const {
    data: detailRes,
    isLoading: detailLoading,
    isError: detailIsError,
    refetch: refetchFull,
  } = useGetAdminOrderDetailQuery(orderId, { skip: !orderId });

  const fullOrder = detailRes?.order || null;
  const order = useMemo(() => {
    if (fullOrder && sddOrder) return { ...sddOrder, ...fullOrder, fulfillmentMode: "same_day" };
    return fullOrder || sddOrder || null;
  }, [fullOrder, sddOrder]);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const isPendingShip = String(order?.orderStatus || "").toLowerCase() === "confirmed";

  const refreshAll = async () => {
    if (typeof onRefresh === "function") await onRefresh();
    try {
      await refetchFull();
    } catch {
      /* list refresh is enough */
    }
  };

  const runAction = async (path, body, confirmText) => {
    if (!orderId || actionBusy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await axiosInstance.post(
        `/admin/same-day-delivery/orders/${encodeURIComponent(orderId)}/${path}`,
        body || {},
        { authContext: "admin" }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Updated");
        if (res.data.refundWarning) toast.warn(res.data.refundWarning);
        setActionMsg({ type: "ok", text: res.data.message || "Updated" });
        await refreshAll();
      }
    } catch (err) {
      const text = err?.response?.data?.message || "Action failed.";
      toast.error(text);
      setActionMsg({ type: "err", text });
    } finally {
      setActionBusy(false);
    }
  };

  if (loading || (detailLoading && !order)) {
    return <p className="p-8 text-center text-sm text-slate-500">Loading order…</p>;
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          ← Back to same day orders
        </button>
        <p className="p-8 text-center text-sm text-red-600">
          {detailIsError ? "Could not load this order." : "Order not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 text-sm font-medium hover:text-slate-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to same day orders
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 bg-white rounded-md border border-slate-200 shadow-sm px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order</p>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            #{String(order.orderId || "").replace(/^#/, "")}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-800 border-amber-200">
              Same Day
            </span>
            <span className="text-xs text-slate-500">{formatDateHeader(order.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center lg:justify-end">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${statusBadgeClass(order.orderStatus)}`}
          >
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Status</span>
            {sddStatusLabel(order.orderStatus)}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${paymentBadgeClass(order.paymentStatus)}`}
          >
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Pay</span>
            {labelPaymentStatus(order.paymentStatus)}
          </span>
          {isPendingShip ? (
            <>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => runAction("ship", {}, "Mark this same-day order as shipped?")}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionBusy ? "Working…" : "Ship"}
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() =>
                  runAction(
                    "cancel",
                    { reason: "admin_cancelled_same_day" },
                    "Cancel this same-day order and refund the customer?"
                  )
                }
                className="px-4 py-2 text-sm font-bold border border-red-300 text-red-800 rounded-md bg-white hover:bg-red-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </div>

      {actionMsg?.text ? (
        <div
          className={`rounded-md border px-4 py-2.5 text-sm shadow-sm ${
            actionMsg.type === "err"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
          role="status"
        >
          {actionMsg.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {isPendingShip ? (
            <SameDayItemEditPanel
              order={order}
              orderId={orderId}
              disabled={actionBusy}
              onApplied={refreshAll}
            />
          ) : (
            <SameDayItemsReadOnly order={order} />
          )}
        </div>
        <div className="space-y-4 lg:sticky lg:top-4">
          <SameDayCustomerAddressCard order={order} />
          <OrderPaymentSummaryCard
            order={order}
            paymentInfo={order.paymentInfo}
            refundHistory={order.refundHistory}
            showRazorpayIds
            formatInr={formatInr}
            formatDateTime={formatDateHeader}
            labelPaymentStatus={labelPaymentStatus}
            paymentMethodLabel={paymentMethodLabel}
          />
        </div>
      </div>
    </div>
  );
}
