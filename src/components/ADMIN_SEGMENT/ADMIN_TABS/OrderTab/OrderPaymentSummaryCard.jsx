import React from "react";
import { shouldShowOnlinePaymentHoldCountdown } from "../../../../utils/paymentHoldDisplay";

/**
 * Presentational payment card — UI only. Parent supplies labels/formatters.
 */
export default function OrderPaymentSummaryCard({
  order,
  paymentInfo: piProp,
  refundHistory: refundProp,
  showRazorpayIds = false,
  formatInr,
  formatDateTime,
  labelPaymentStatus,
  paymentMethodLabel,
}) {
  const orderSafe = order && typeof order === "object" ? order : {};
  const pi =
    piProp && typeof piProp === "object"
      ? piProp
      : orderSafe.paymentInfo && typeof orderSafe.paymentInfo === "object"
        ? orderSafe.paymentInfo
        : {};
  const refundHistory = Array.isArray(refundProp)
    ? refundProp
    : Array.isArray(orderSafe.refundHistory)
      ? orderSafe.refundHistory
      : [];

  const fmt = typeof formatInr === "function" ? formatInr : (n) => String(n ?? "—");
  const fmtDt = typeof formatDateTime === "function" ? formatDateTime : () => "—";
  const statusLabel =
    typeof labelPaymentStatus === "function"
      ? labelPaymentStatus(orderSafe.paymentStatus)
      : String(orderSafe.paymentStatus || "—");
  const methodLabel =
    typeof paymentMethodLabel === "function"
      ? paymentMethodLabel(orderSafe)
      : String(pi.method || "—");

  const payStatus = String(orderSafe.paymentStatus || "").toLowerCase();
  const balanceDue = Number(orderSafe.balanceDueInr) || 0;
  const amountPaid = Number(orderSafe.amountPaidInr) || 0;
  const billTotal = Number(orderSafe.totalAmount) || 0;
  const isPaid = payStatus === "paid";
  const hasDue = balanceDue > 0.01;

  const statusTone = isPaid
    ? "bg-blue-50 text-blue-800 border-blue-200"
    : hasDue || payStatus === "partially_paid"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : payStatus === "failed" || payStatus === "refunded"
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700 shrink-0"
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Payment details</h3>
            <p className="text-[11px] text-slate-500 truncate">Money paid vs still due</p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusTone}`}>
          {statusLabel}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Method</span>
          <span className="font-semibold text-slate-900 text-right">{methodLabel}</span>
        </div>

        <div className="rounded-md border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3 space-y-2.5">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-xs text-slate-500">Bill total</span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(billTotal)}</span>
          </div>
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-xs text-slate-500">Already paid</span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">{fmt(amountPaid)}</span>
          </div>
          {hasDue ? (
            <div className="flex justify-between items-baseline gap-3 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-2 -mx-0.5">
              <span className="text-xs font-semibold text-amber-900">Still due (COD / balance)</span>
              <span className="text-sm font-black text-amber-800 tabular-nums">{fmt(balanceDue)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-baseline gap-3 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">All clear</span>
              <span className="text-xs font-bold text-blue-700">Nothing left to collect</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline gap-3 pt-1">
          <span className="text-sm font-bold text-slate-900">Grand total</span>
          <span className="text-lg font-black text-blue-700 tabular-nums">{fmt(billTotal)}</span>
        </div>

        {shouldShowOnlinePaymentHoldCountdown(orderSafe) && (
          <div className="flex justify-between gap-2 text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 text-xs">
            <span>Payment hold expires</span>
            <span className="font-medium text-right">{fmtDt(orderSafe.paymentHoldExpiresAt)}</span>
          </div>
        )}

        {pi.paidAt ? (
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-slate-500">Paid at</span>
            <span className="font-medium text-slate-800 text-right">{fmtDt(pi.paidAt)}</span>
          </div>
        ) : null}

        {showRazorpayIds ? (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gateway references</p>
            {pi.razorpayOrderId ? (
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Razorpay order</p>
                <p className="font-mono text-[11px] text-slate-800 break-all">{pi.razorpayOrderId}</p>
              </div>
            ) : null}
            {pi.razorpayPaymentId ? (
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Razorpay payment</p>
                <p className="font-mono text-[11px] text-slate-800 break-all">{pi.razorpayPaymentId}</p>
              </div>
            ) : null}
            {pi.status ? (
              <p className="text-[11px] text-slate-500">
                Gateway session:{" "}
                <span className="font-semibold text-blue-700 capitalize">{String(pi.status)}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {pi.cancelledAt ? (
          <div className="rounded-md border border-red-100 bg-red-50/60 px-3 py-2 text-xs text-red-900">
            <p className="font-semibold">Payment cancelled</p>
            <p>{fmtDt(pi.cancelledAt)}</p>
            {pi.cancellationReason ? <p className="mt-1 text-red-800">{pi.cancellationReason}</p> : null}
          </div>
        ) : null}

        {refundHistory.length > 0 ? (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Refunds</p>
            <ul className="space-y-2">
              {refundHistory.map((r, i) => (
                <li
                  key={r.refundId || i}
                  className="text-xs text-slate-700 rounded-md border border-slate-100 bg-slate-50/50 px-2 py-2"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-mono">{r.refundId || "—"}</span>
                    <span className="font-semibold">{fmt(r.amountInr)}</span>
                  </div>
                  {r.status ? <p className="text-slate-500 mt-0.5">{r.status}</p> : null}
                  {r.createdAt ? <p className="text-slate-400 text-[10px]">{fmtDt(r.createdAt)}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
