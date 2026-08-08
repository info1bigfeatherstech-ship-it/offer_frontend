import React, { useEffect, useMemo, useState } from "react";
import {
  useAdminApplyPendingOrderEditMutation,
  useAdminPreviewPendingOrderEditMutation,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";

function formatInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
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

/**
 * Pending-order item editor: reduce qty / remove lines before Confirm.
 * Single items surface with thumbnails — parent must not render a second items list.
 */
export default function AdminPendingOrderEditPanel({ order, orderId, disabled, onApplied }) {
  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const [draftQty, setDraftQty] = useState({});
  const [preview, setPreview] = useState(null);
  const [localMsg, setLocalMsg] = useState(null);

  const [previewEdit, previewState] = useAdminPreviewPendingOrderEditMutation();
  const [applyEdit, applyState] = useAdminApplyPendingOrderEditMutation();

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

  const itemUpdates = useMemo(() => {
    return items
      .map((line) => {
        const { productId, variantId } = lineIds(line);
        if (!productId || !variantId) return null;
        const key = `${productId}:${variantId}`;
        const quantity = Number(draftQty[key]);
        if (!Number.isFinite(quantity) || quantity < 0) return null;
        return { productId, variantId, quantity: Math.floor(quantity) };
      })
      .filter(Boolean);
  }, [items, draftQty]);

  const hasChanges = useMemo(() => {
    return items.some((line) => {
      const { productId, variantId } = lineIds(line);
      const key = `${productId}:${variantId}`;
      return Number(draftQty[key]) !== Number(line.quantity);
    });
  }, [items, draftQty]);

  const busy = previewState.isLoading || applyState.isLoading || disabled;

  const setQty = (key, next, maxQty) => {
    const v = Math.max(0, Math.min(maxQty, Math.floor(Number(next) || 0)));
    setDraftQty((prev) => ({ ...prev, [key]: v }));
    setPreview(null);
  };

  const runPreview = async () => {
    setLocalMsg(null);
    setPreview(null);
    try {
      const res = await previewEdit({ orderId, itemUpdates }).unwrap();
      setPreview(res?.data || null);
    } catch (e) {
      setLocalMsg({
        type: "err",
        text: e?.data?.message || e?.message || "Preview failed.",
      });
    }
  };

  const runApply = async () => {
    if (
      !window.confirm(
        "Apply these item changes? For prepaid orders, money is NOT refunded yet — after Confirm → Ship Now, final bill uses actual courier shipping and any excess is refunded. Balance due / COD will never increase. Customer is never asked for extra."
      )
    ) {
      return;
    }
    setLocalMsg(null);
    try {
      const res = await applyEdit({ orderId, itemUpdates }).unwrap();
      const data = res?.data || {};
      setPreview(null);
      const deferred = Boolean(
        data.shippingSettlementDeferred ||
          data.refundDeferredUntilShipNow ||
          data.shipping?.shippingSettlementDeferred
      );
      setLocalMsg({
        type: data.refundWarning ? "warn" : "ok",
        text:
          res?.message ||
          (data.cancelledEmpty
            ? "Order cancelled — no items left."
            : deferred
              ? "Items updated. Refund (if any) will run after Ship Now with actual shipping."
              : "Order updated successfully."),
      });
      if (typeof onApplied === "function") {
        await onApplied(data);
      }
    } catch (e) {
      setLocalMsg({
        type: "err",
        text: e?.data?.message || e?.message || "Update failed.",
      });
    }
  };

  if (!items.length) return null;

  const displaySubtotal = preview?.after?.subtotal ?? order?.subtotal;
  const displayDelivery =
    preview?.shipping?.customerDelivery ?? order?.deliveryCharges;
  const displayTotal = preview?.after?.totalAmount ?? order?.totalAmount;
  const displayDiscount = order?.discount;
  const couponCode = order?.appliedCoupon?.code;

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">Edit items before confirm</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
            Change quantity or remove a product, then Preview and Apply. Confirm the order only after stock looks
            correct.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((line, idx) => {
          const { productId, variantId } = lineIds(line);
          const key = `${productId}:${variantId}`;
          const name = line?.productId?.name || "Product";
          const sku = line?.sku || "—";
          const maxQty = Number(line.quantity) || 0;
          const qty = draftQty[key] ?? maxQty;
          const img = lineImage(line);
          const lineTotal = Number(line?.lineTotal ?? line?.priceSnapshot?.total) || 0;
          const removed = qty === 0;
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
        <div className="flex justify-between text-slate-600">
          <span>Shipping</span>
          <span>
            {Number(displayDelivery) === 0 ? (
              <span className="text-emerald-600 font-semibold">FREE</span>
            ) : (
              formatInr(displayDelivery)
            )}
          </span>
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
          {previewState.isLoading ? "Calculating…" : "Preview totals"}
        </button>
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={runApply}
          className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {applyState.isLoading ? "Applying…" : "Apply changes"}
        </button>
      </div>

      {localMsg && (
        <p
          className={`px-4 pb-3 text-xs font-medium ${
            localMsg.type === "err"
              ? "text-red-700"
              : localMsg.type === "warn"
                ? "text-amber-800"
                : "text-emerald-800"
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
              All items removed → order will be cancelled. Refund: {formatInr(preview.refundInr)}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-slate-500">New subtotal</p>
                  <p className="font-semibold">{formatInr(preview.after?.subtotal)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Shipping (on bill now)</p>
                  <p className="font-semibold">{formatInr(preview.shipping?.customerDelivery)}</p>
                  {preview.shipping?.shippingSettlementDeferred ? (
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Held until Ship Now
                      {preview.shipping.quotedDelivery != null
                        ? ` · estimate ${formatInr(preview.shipping.quotedDelivery)}${
                            preview.shipping.quotedMock ? " (mock)" : ""
                          }`
                        : ""}
                    </p>
                  ) : (
                    preview.shipping?.quotedDelivery != null &&
                    preview.shipping.quotedDelivery !== preview.shipping.customerDelivery && (
                      <p className="text-[10px] text-slate-500">
                        Quoted {formatInr(preview.shipping.quotedDelivery)}
                        {preview.shipping.shippingIncreasedAbsorbed ? " (increase absorbed)" : ""}
                      </p>
                    )
                  )}
                </div>
                <div>
                  <p className="text-slate-500">New total</p>
                  <p className="font-semibold">{formatInr(preview.after?.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Refund now / COD due</p>
                  <p className="font-semibold">
                    Refund {formatInr(preview.refundInr)} · Due {formatInr(preview.after?.balanceDueInr)}
                  </p>
                </div>
              </div>
              {preview.shippingSettlementDeferred || preview.shipping?.shippingSettlementDeferred ? (
                <p className="text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  No refund on Apply. After Confirm → Ship Now, final total uses actual courier shipping; any excess
                  prepaid amount is refunded. Due/COD will not increase
                  {preview.refundInr > 0.005
                    ? ` (preview refund now: ${formatInr(preview.refundInr)} — deferred).`
                    : "."}
                </p>
              ) : null}
              {preview.shipping?.courierName && (
                <p className="text-slate-600">
                  Estimate courier: <span className="font-semibold">{preview.shipping.courierName}</span>
                  {preview.shipping.estimatedDays ? ` · ETA ${preview.shipping.estimatedDays}` : ""}
                </p>
              )}
            </>
          )}
          {(preview.customerNotes || []).map((n, i) => (
            <p key={i} className="text-slate-700 italic border-t border-blue-100 pt-2">
              Customer note: {n.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
