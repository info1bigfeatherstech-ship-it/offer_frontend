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

/**
 * Pending-order item editor: reduce qty / remove lines before Confirm.
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
        "Apply these item changes? Unavailable item value is refunded now. Shipping stays as-paid until Ship Now (actual courier rate), then any unused shipping is refunded. Customer is never charged extra shipping."
      )
    ) {
      return;
    }
    setLocalMsg(null);
    try {
      const res = await applyEdit({ orderId, itemUpdates }).unwrap();
      const data = res?.data || {};
      setPreview(null);
      const deferred = Boolean(data.shippingSettlementDeferred || data.shipping?.shippingSettlementDeferred);
      setLocalMsg({
        type: data.refundWarning ? "warn" : "ok",
        text:
          res?.message ||
          (data.cancelledEmpty
            ? "Order cancelled — no items left."
            : deferred
              ? "Order updated. Item refund processed if due. Shipping will finalize after Ship Now."
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">
          Edit items before confirm
        </p>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          Remove out-of-stock items or reduce quantity. Discount stays as-is. Customer is never charged
          extra shipping. For prepaid orders: item value refunds on Apply; shipping is held until Ship
          Now (actual Shiprocket rate), then unused shipping is refunded. COD balance updates immediately.
        </p>
      </div>

      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
        {items.map((line, idx) => {
          const { productId, variantId } = lineIds(line);
          const key = `${productId}:${variantId}`;
          const name = line?.productId?.name || "Product";
          const sku = line?.sku || "—";
          const maxQty = Number(line.quantity) || 0;
          const qty = draftQty[key] ?? maxQty;
          return (
            <div key={key || idx} className="p-3 flex flex-wrap items-center gap-3 justify-between bg-slate-50/50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-[11px] text-slate-500 font-mono">SKU: {sku}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Line: {formatInr(line?.lineTotal ?? line?.priceSnapshot?.total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Qty</label>
                <input
                  type="number"
                  min={0}
                  max={maxQty}
                  step={1}
                  disabled={busy}
                  value={qty}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(maxQty, Math.floor(Number(e.target.value) || 0)));
                    setDraftQty((prev) => ({ ...prev, [key]: v }));
                    setPreview(null);
                  }}
                  className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-900"
                />
                <button
                  type="button"
                  disabled={busy || qty === 0}
                  onClick={() => {
                    setDraftQty((prev) => ({ ...prev, [key]: 0 }));
                    setPreview(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-md border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={runPreview}
          className="px-4 py-2 text-sm font-bold border border-slate-300 text-slate-800 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {previewState.isLoading ? "Calculating…" : "Preview totals"}
        </button>
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={runApply}
          className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {applyState.isLoading ? "Applying…" : "Apply changes"}
        </button>
      </div>

      {localMsg && (
        <p
          className={`text-xs font-medium ${
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
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-2 text-xs text-slate-800">
          <p className="font-black uppercase tracking-wider text-indigo-900 text-[10px]">Preview</p>
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
                        {preview.shipping.shippingIncreasedAbsorbed
                          ? " (increase absorbed)"
                          : ""}
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
                    Refund {formatInr(preview.refundInr)} · Due{" "}
                    {formatInr(preview.after?.balanceDueInr)}
                  </p>
                </div>
              </div>
              {preview.shippingSettlementDeferred || preview.shipping?.shippingSettlementDeferred ? (
                <p className="text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  Shipping refund is deferred: after Confirm → Ship Now, unused shipping (held minus
                  actual courier rate) is refunded automatically.
                </p>
              ) : null}
              {preview.shipping?.courierName && (
                <p className="text-slate-600">
                  Estimate courier:{" "}
                  <span className="font-semibold">{preview.shipping.courierName}</span>
                  {preview.shipping.estimatedDays
                    ? ` · ETA ${preview.shipping.estimatedDays}`
                    : ""}
                </p>
              )}
            </>
          )}
          {(preview.customerNotes || []).map((n, i) => (
            <p key={i} className="text-slate-700 italic border-t border-indigo-100 pt-2">
              Customer note: {n.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
