import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetAdminRtoOrdersQuery,
  useGetAdminRtoAnalyticsQuery,
  useLazyExportAdminRtoReportQuery,
  useAdminAutoSyncRtoStatusesMutation,
  useAdminRtoRefundMutation,
  useAdminRtoRejectMutation,
  useAdminRtoBulkActionMutation,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import {
  selectAdminRtoListQueryArgs,
  selectAdminRtoAnalyticsQueryArgs,
  setRtoActiveSection,
  setRtoStatusFilter,
  setRtoSearchInput,
  commitRtoSearch,
  clearRtoSearch,
  setRtoPage,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";

const RTO_SECTIONS = [
  { id: "dashboard", label: "RTO Management" },
  { id: "all", label: "All RTO Orders" },
  { id: "customer_related", label: "Customer Related RTO" },
  { id: "courier_related", label: "Courier Related RTO" },
  { id: "partial_paid", label: "Partial Paid RTO" },
  { id: "refund_pending", label: "Refund Pending" },
  { id: "refund_processed", label: "Refund Processed" },
  { id: "refund_rejected", label: "Refund Rejected" },
  { id: "closed", label: "Closed RTOs" },
  { id: "redispatch", label: "Re-dispatch Requests", placeholder: true },
  { id: "cod_restricted", label: "COD Restricted Customers", placeholder: true },
  { id: "reports", label: "RTO Reports" },
  { id: "analytics", label: "RTO Analytics" },
];

function fmtInr(n, { decimals = 0 } = {}) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

/** Detailed amounts in refund breakdown (paise-level fees). */
function fmtInrDetail(n) {
  return fmtInr(n, { decimals: 2 });
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function statusBadgeClass(st) {
  const s = String(st || "").toLowerCase();
  if (s === "refunded") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s === "refund_rejected") return "bg-red-50 text-red-800 border-red-200";
  if (s === "closed") return "bg-slate-100 text-slate-700 border-slate-200";
  if (s === "resolved") return "bg-slate-100 text-slate-700 border-slate-200";
  if (s === "refund_failed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function reasonCategoryBadgeClass(cat) {
  const c = String(cat || "").toLowerCase();
  if (c === "customer") return "bg-orange-50 text-orange-800 border-orange-200";
  if (c === "courier") return "bg-violet-50 text-violet-800 border-violet-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function refundTrackBadge(track) {
  if (!track) return null;
  const t = String(track).toLowerCase();
  const map = {
    initiated: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  return map[t] || "bg-slate-50 text-slate-600 border-slate-200";
}

function paymentTypeBadgeClass(key) {
  const k = String(key || "").toLowerCase();
  if (k === "full_paid") return "bg-slate-50 text-slate-700 border-slate-200";
  if (k === "partial_paid") return "bg-amber-50/80 text-amber-900 border-amber-100";
  if (k === "cod") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

/** Row action buttons — muted, matches admin UI */
const BTN_REFUND =
  "px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 min-w-[72px]";
const BTN_DENY =
  "px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 min-w-[72px]";
const BTN_CLOSE =
  "px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 min-w-[80px]";
const BTN_ACTION_MENU =
  "inline-flex items-center justify-between gap-2 min-w-[112px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50";

function isNoRefundPayment(row) {
  const k = String(row?.paymentType?.key || "").toLowerCase();
  return k === "partial_paid" || k === "cod";
}

/** Build refund deduction lines from API `refundCalculation` / saved `rtoDeductions`. */
function buildRefundBreakdown(row) {
  if (!row || isNoRefundPayment(row)) return null;

  const calc = row.refundCalculation || {};
  const saved = row.rtoDeductions || {};
  const useSaved = saved.platformFee != null && row.rtoRefundAmount != null;
  const ded = useSaved ? saved : calc.deductions || saved;

  const cartValue =
    Number(ded.cartValue ?? calc.cartValue ?? row.subtotalInr) || 0;
  const forwardShipping =
    Number(ded.forwardShipping ?? row.deliveryChargesInr) || 0;
  const orderTotal =
    Number(ded.orderTotal ?? calc.orderTotal) ||
    round2(cartValue + forwardShipping);
  const rtoShipping = Number(ded.rtoShipping) || 0;
  const platformFeePercent = Number(ded.platformFeePercent) || 0;
  const platformFee = Number(ded.platformFee) || 0;
  const totalDeductions =
    Number(calc.totalDeductions) || round2(forwardShipping + rtoShipping + platformFee);
  const netRefund =
    row.rtoRefundAmount != null
      ? Number(row.rtoRefundAmount)
      : Number(calc.maxRefundableInr ?? calc.netRefund) || 0;

  return {
    cartValue,
    orderTotal,
    forwardShipping,
    rtoShipping,
    platformFee,
    platformFeePercent,
    totalDeductions,
    netRefund,
    eligible: Boolean(calc.eligible),
    processed: row.rtoRefundAmount != null,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function RefundBreakdownPanel({ breakdown, variant = "compact" }) {
  if (!breakdown) return null;

  const isModal = variant === "modal";
  const wrap = isModal
    ? "rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 text-xs"
    : "mt-2 rounded-lg border border-slate-100 bg-slate-50/90 p-2 space-y-0.5 text-[10px] leading-snug";
  const labelClass = isModal ? "text-slate-500" : "text-slate-500";
  const valueClass = isModal ? "text-slate-800 font-medium tabular-nums" : "text-slate-700 font-semibold tabular-nums";
  const minusClass = "text-red-600/90";

  const Line = ({ label, value, negative, bold, accent }) => (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold pt-1 border-t border-slate-200 mt-1" : ""}`}>
      <span className={labelClass}>{label}</span>
      <span className={`${valueClass} ${negative ? minusClass : ""} ${accent ? "text-emerald-700" : ""}`}>
        {negative ? "− " : ""}
        {fmtInrDetail(value)}
      </span>
    </div>
  );

  return (
    <div className={wrap}>
      {isModal && (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Refund breakdown</p>
      )}
      <Line label="Cart value" value={breakdown.cartValue} />
      <Line label="Forward shipping" value={breakdown.forwardShipping} negative />
      <div className="flex justify-between gap-2 border-t border-dashed border-slate-200 pt-0.5">
        <span className={labelClass}>Order total (cart + shipping)</span>
        <span className={valueClass}>{fmtInrDetail(breakdown.orderTotal)}</span>
      </div>
      <Line label="RTO return shipping" value={breakdown.rtoShipping} negative />
      <Line
        label={`Platform fee${breakdown.platformFeePercent ? ` (${breakdown.platformFeePercent}%)` : ""}`}
        value={breakdown.platformFee}
        negative
      />
      <Line label="Total deductions" value={breakdown.totalDeductions} negative bold />
      <Line
        label={breakdown.processed ? "Refunded to customer" : "Net refund"}
        value={breakdown.netRefund}
        bold
        accent={breakdown.netRefund > 0}
      />
      {!breakdown.eligible && !breakdown.processed && breakdown.netRefund <= 0 && (
        <p className="text-[10px] text-amber-800 pt-1">Not eligible for Razorpay refund</p>
      )}
    </div>
  );
}

function AmountCell({ row, breakdown: breakdownProp, expanded, onToggle }) {
  const breakdown = breakdownProp ?? buildRefundBreakdown(row);
  const canShowBreakdown = Boolean(breakdown);

  return (
    <td className="p-3 align-top min-w-[200px]">
      <div className="font-bold">{fmtInr(row.amountInr)}</div>
      {row.paymentType && (
        <span
          className={`inline-flex mt-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${paymentTypeBadgeClass(row.paymentType.key)}`}
          title={row.paymentType.detail}
        >
          {row.paymentType.label}
        </span>
      )}
      {row.paymentType?.key === "partial_paid" && (
        <div className="text-[10px] text-amber-800 mt-0.5">
          Paid {fmtInr(row.amountPaidInr)} of {fmtInr(row.amountInr)}
        </div>
      )}
      {isNoRefundPayment(row) && (
        <div className="text-[10px] text-slate-500 mt-0.5">No refund — close case when done</div>
      )}
      {canShowBreakdown && (
        <>
          {breakdown.netRefund > 0 && (
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
              {breakdown.processed ? "Refunded" : "Net refund"}: {fmtInrDetail(breakdown.netRefund)}
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 underline-offset-2 hover:underline"
          >
            {expanded ? "Hide breakdown ▲" : "View breakdown ▼"}
          </button>
          {expanded && <RefundBreakdownPanel breakdown={breakdown} variant="compact" />}
        </>
      )}
      {row.refundBlockedReason && !row.canRefund && row.paymentType?.key === "full_paid" && (
        <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] leading-tight">{row.refundBlockedReason}</div>
      )}
    </td>
  );
}

function buildRowActionItems(row) {
  const items = [];

  if (row.canRefund) {
    items.push({
      key: "refund",
      label: row.rtoStatus === "refund_failed" ? "Retry refund" : "Refund",
      tone: "primary",
    });
  }

  if (row.canReject) {
    items.push({
      key: "reject",
      label: "Deny refund",
      tone: "danger",
    });
  }

  if (row.canClose) {
    items.push({
      key: "close",
      label: "Close case",
      tone: "neutral",
    });
  }

  return items;
}

function finalStatusLabel(row) {
  if (row.rtoStatus === "refunded") return "Refunded";
  if (row.rtoStatus === "refund_rejected") return "Refund rejected";
  if (row.rtoStatus === "closed") return "Closed";
  if (row.rtoStatus === "refund_failed") return "Refund failed";
  return "No actions";
}

function RowActionMenu({ row, busy, onAction }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const items = buildRowActionItems(row);
  const hasActions = items.length > 0;
  const statusLabel = finalStatusLabel(row);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = (actionKey) => {
    setOpen(false);
    onAction(actionKey, row);
  };

  if (!hasActions) {
    return (
      <span
        className={`inline-flex min-w-[112px] items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold ${statusBadgeClass(row.rtoStatus)}`}
      >
        {statusLabel}
      </span>
    );
  }

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        className={BTN_ACTION_MENU}
        disabled={busy}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>Actions</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="p-1.5">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => handleSelect(item.key)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                  item.tone === "danger"
                    ? "text-red-700 hover:bg-red-50"
                    : item.tone === "primary"
                      ? "text-slate-800 hover:bg-slate-50"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RtoActionModal({ modal, note, onNoteChange, onClose, onConfirm, loading }) {
  if (!modal) return null;

  const row = modal.row;
  const isPartial = row && isNoRefundPayment(row);
  const shipReason = row?.shiprocketReason || row?.rtoReason || "—";
  const breakdown = row ? buildRefundBreakdown(row) : null;
  const netRefund = breakdown?.netRefund ?? row?.refundCalculation?.netRefund;

  let title = "Confirm action";
  let description = "";
  let confirmLabel = "Confirm";
  let confirmClass = BTN_DENY;

  if (modal.type === "refund") {
    title = "Process Razorpay refund";
    description =
      "This will initiate a real Razorpay refund to the customer. Use only when delivery/logistics was at fault — not for customer refusal.";
    confirmLabel = loading ? "Processing…" : `Refund ${netRefund > 0 ? fmtInrDetail(netRefund) : ""}`.trim();
    confirmClass = BTN_REFUND;
  } else if (modal.type === "close") {
    title = "Close RTO case";
    description =
      "This closes the RTO in admin records without triggering a Razorpay refund. Use only when no further refund action is required.";
    confirmLabel = loading ? "Closing…" : "Close case";
    confirmClass = BTN_CLOSE;
  } else if (modal.type === "reject") {
    title = "Deny refund";
    description =
      "No Razorpay refund will be issued. Use when the customer refused delivery or policy does not allow a refund.";
    confirmLabel = loading ? "Saving…" : "Deny refund";
    confirmClass = BTN_DENY;
  } else if (modal.type === "bulk-reject") {
    title = "Bulk close / deny";
    description = `Mark ${modal.count} selected orders as closed with no refund. Razorpay will not be called.`;
    confirmLabel = loading ? "Saving…" : "Confirm";
    confirmClass = BTN_DENY;
  } else if (modal.type === "bulk-refund") {
    title = "Bulk Razorpay refund";
    description = `Initiate refund for ${modal.count} selected orders (eligible only).`;
    confirmLabel = loading ? "Processing…" : "Confirm refunds";
    confirmClass = BTN_REFUND;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{description}</p>
        </div>
        {row && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-1">
            <p>
              <span className="text-slate-500">Order:</span>{" "}
              <span className="font-mono font-semibold text-slate-800">{row.orderId}</span>
            </p>
            <p>
              <span className="text-slate-500">Shiprocket:</span>{" "}
              <span className="text-slate-800">{shipReason}</span>
            </p>
            {row.rtoReasonCategoryLabel && (
              <p>
                <span className="text-slate-500">Category:</span>{" "}
                <span className="text-slate-700">{row.rtoReasonCategoryLabel}</span>
              </p>
            )}
          </div>
        )}
        {modal.type === "refund" && breakdown && (
          <RefundBreakdownPanel breakdown={breakdown} variant="modal" />
        )}
        {(modal.type === "reject" || modal.type === "close" || modal.type === "bulk-reject") && (
          <div>
            <label className="text-xs font-semibold text-slate-600">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder={
                modal.type === "close"
                  ? "e.g. Case closed after review"
                  : isPartial
                    ? "e.g. Partial payment — case closed, no refund"
                    : "e.g. Customer refused — no refund"
              }
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={BTN_DENY} disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass} disabled={loading}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50/50",
    emerald: "border-emerald-200 bg-emerald-50/50",
    blue: "border-blue-200 bg-blue-50/50",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}

export default function RtoTab() {
  const dispatch = useDispatch();
  const rtoUi = useSelector((s) => s.adminRtoUi);
  const listArgs = useSelector(selectAdminRtoListQueryArgs);
  const analyticsArgs = useSelector(selectAdminRtoAnalyticsQueryArgs);

  const [selected, setSelected] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const [actionErr, setActionErr] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalNote, setModalNote] = useState("");
  const [expandedBreakdown, setExpandedBreakdown] = useState(() => new Set());

  const toggleBreakdown = useCallback((orderId) => {
    setExpandedBreakdown((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const showList = !["reports", "analytics", "redispatch", "cod_restricted"].includes(rtoUi.activeSection);
  const showListSummary = showList && rtoUi.activeSection !== "dashboard";

  const { data: listData, isLoading, isFetching, error, refetch } = useGetAdminRtoOrdersQuery(listArgs, {
    skip: !showList,
    pollingInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useGetAdminRtoAnalyticsQuery(analyticsArgs, {
    skip: rtoUi.activeSection !== "analytics" && rtoUi.activeSection !== "dashboard",
    pollingInterval: 60000,
  });

  const [exportReport, exportState] = useLazyExportAdminRtoReportQuery();
  const [refundOrder, refundState] = useAdminRtoRefundMutation();
  const [rejectOrder, rejectState] = useAdminRtoRejectMutation();
  const [bulkAction, bulkState] = useAdminRtoBulkActionMutation();
  const [autoSyncRtoStatuses] = useAdminAutoSyncRtoStatusesMutation();
  const autoSyncBusyRef = useRef(false);

  /** Silent background sync: Shiprocket → DB for stale RTO (not yet warehouse-delivered). */
  useEffect(() => {
    if (!showList) return undefined;

    let cancelled = false;
    let initialTimer;
    let intervalId;

    const syncArgs = {
      from: listArgs.from,
      to: listArgs.to,
      rangePreset: listArgs.rangePreset,
      presetDays: listArgs.presetDays,
      staleMinutes: 15,
    };

    const runAutoSync = async () => {
      if (cancelled || autoSyncBusyRef.current || document.hidden) return;
      autoSyncBusyRef.current = true;
      try {
        let complete = false;
        let guard = 0;
        while (!cancelled && !complete && guard < 12) {
          guard += 1;
          const result = await autoSyncRtoStatuses(syncArgs).unwrap();
          complete = Boolean(result?.data?.summary?.complete);
          const remaining = result?.data?.summary?.remainingStale ?? 0;
          const timedOut = Boolean(result?.data?.summary?.timedOut);
          if (complete || remaining <= 0 || !timedOut) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        /* background sync — no user-facing error */
      } finally {
        autoSyncBusyRef.current = false;
      }
    };

    initialTimer = setTimeout(runAutoSync, 3500);
    intervalId = setInterval(runAutoSync, 90_000);

    const onVisibility = () => {
      if (!document.hidden && !cancelled) runAutoSync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    showList,
    listArgs.from,
    listArgs.to,
    listArgs.rangePreset,
    listArgs.presetDays,
    autoSyncRtoStatuses,
  ]);

  const orders = listData?.data?.orders || [];
  const pagination = listData?.data?.pagination || {};
  const summary = listData?.data?.summaryCounts || analyticsData?.data?.kpis || {};
  const kpis = analyticsData?.data?.kpis || summary;
  const trend = analyticsData?.data?.trend || [];

  const allSelected = orders.length > 0 && selected.length === orders.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? [] : orders.map((o) => o.orderId));
  }, [allSelected, orders]);

  const toggleOne = useCallback((orderId) => {
    setSelected((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  }, []);

  const openRefundModal = (row) => {
    setActionErr(null);
    setActionMsg(null);
    setModalNote("");
    setModal({ type: "refund", row });
  };

  const openRejectModal = (row) => {
    setActionErr(null);
    setActionMsg(null);
    setModalNote(
      row.rtoReasonCategory === "customer"
        ? "Customer fault — no refund per policy"
        : ""
    );
    setModal({ type: "reject", row });
  };

  const openCloseModal = (row) => {
    setActionErr(null);
    setActionMsg(null);
    setModalNote(
      isNoRefundPayment(row)
        ? "Partial payment / COD — case closed, no Razorpay refund"
        : "Case closed after admin review"
    );
    setModal({ type: "close", row });
  };

  const handleRowAction = useCallback(
    (actionKey, row) => {
      if (actionKey === "refund") {
        openRefundModal(row);
        return;
      }
      if (actionKey === "reject") {
        openRejectModal(row);
        return;
      }
      if (actionKey === "close") {
        openCloseModal(row);
      }
    },
    []
  );

  const closeModal = () => {
    if (refundState.isLoading || rejectState.isLoading || bulkState.isLoading) return;
    setModal(null);
    setModalNote("");
  };

  const confirmModal = async () => {
    if (!modal) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      if (modal.type === "refund") {
        const res = await refundOrder({ orderId: modal.row.orderId }).unwrap();
        setActionMsg(res.message || "Refund initiated");
      } else if (modal.type === "reject" || modal.type === "close") {
        const res = await rejectOrder({
          orderId: modal.row.orderId,
          action: modal.type === "close" ? "close" : "reject",
          note: modalNote.trim() || undefined,
        }).unwrap();
        setActionMsg(
          modal.type === "close" ? "RTO case closed (no refund)" : res.message || "Refund denied"
        );
      } else if (modal.type === "bulk-refund") {
        const res = await bulkAction({ orderIds: selected, action: "refund" }).unwrap();
        setActionMsg(res.message || "Bulk refund done");
        setSelected([]);
      } else if (modal.type === "bulk-reject") {
        const res = await bulkAction({
          orderIds: selected,
          action: modal.action || "close",
          note: modalNote.trim() || undefined,
        }).unwrap();
        setActionMsg(res.message || "Bulk close done");
        setSelected([]);
      }
      closeModal();
    } catch (e) {
      setActionErr(e?.data?.message || e?.message || "Action failed");
    }
  };

  const handleBulk = (action) => {
    if (!selected.length) return;
    setActionErr(null);
    setActionMsg(null);
    setModalNote(action === "close" ? "Closed — no refund" : "");
    setModal({
      type: action === "refund" ? "bulk-refund" : "bulk-reject",
      action,
      count: selected.length,
    });
  };

  const handleExport = async () => {
    try {
      const blob = await exportReport({
        ...analyticsArgs,
        section: rtoUi.activeSection === "dashboard" ? "all" : rtoUi.activeSection,
        status: rtoUi.statusFilter || undefined,
        search: rtoUi.search || undefined,
      }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rto-report-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setActionErr(e?.data?.message || e?.message || "Export failed");
    }
  };

  const topError = useMemo(
    () =>
      actionErr ||
      error?.data?.message ||
      refundState.error?.data?.message ||
      rejectState.error?.data?.message ||
      bulkState.error?.data?.message ||
      null,
    [actionErr, error, refundState.error, rejectState.error, bulkState.error]
  );

  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen">
      <RtoActionModal
        modal={modal}
        note={modalNote}
        onNoteChange={setModalNote}
        onClose={closeModal}
        onConfirm={confirmModal}
        loading={refundState.isLoading || rejectState.isLoading || bulkState.isLoading}
      />
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar sections */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-4">
            <div className="px-3 py-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">RTO</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Return to Origin</p>
            </div>
            <nav className="max-h-[70vh] overflow-auto p-1">
              {RTO_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => dispatch(setRtoActiveSection(sec.id))}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold mb-0.5 ${
                    rtoUi.activeSection === sec.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sec.label}
                  {sec.placeholder && (
                    <span className="ml-1 text-[9px] opacity-70">(soon)</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900">RTO Management</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage orders returned to origin due to delivery failure
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showList && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                >
                  {isFetching ? "Refreshing…" : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {actionMsg && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {actionMsg}
            </p>
          )}
          {topError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {topError}
            </p>
          )}

          {/* Placeholder sections */}
          {(rtoUi.activeSection === "redispatch" || rtoUi.activeSection === "cod_restricted") && (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
              <p className="text-lg font-black text-slate-800">Coming soon</p>
              <p className="text-sm text-slate-500 mt-2">
                This section is reserved for a future release.
              </p>
            </div>
          )}

          {/* Reports */}
          {rtoUi.activeSection === "reports" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-black text-slate-900">RTO Reports</h3>
              <p className="text-sm text-slate-500">
                Export RTO orders as CSV (all RTO orders by default; respects current search/section filters).
              </p>
              <button
                type="button"
                onClick={handleExport}
                disabled={exportState.isLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {exportState.isLoading ? "Exporting…" : "Download CSV Report"}
              </button>
            </div>
          )}

          {/* Analytics */}
          {(rtoUi.activeSection === "analytics" || rtoUi.activeSection === "dashboard") && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               <SummaryCard label="Total RTO" value={kpis.totalRto ?? kpis.total ?? 0} tone="blue" />
                <SummaryCard label="Pending" value={kpis.pending ?? 0} tone="amber" />
                <SummaryCard label="Refunded" value={kpis.refunded ?? 0} tone="emerald" />
                <SummaryCard label="Closed" value={kpis.closed ?? kpis.resolved ?? 0} />
              </div>

              {rtoUi.activeSection === "analytics" && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">KPIs</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Customer related</span>
                      <p className="font-bold text-slate-900">{kpis.customerRelated ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Courier related</span>
                      <p className="font-bold text-slate-900">{kpis.courierRelated ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Eligible for refund</span>
                      <p className="font-bold text-slate-900">{kpis.eligibleForRefund ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Refund failed</span>
                      <p className="font-bold text-slate-900">{kpis.refundFailed ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Total refunded (INR)</span>
                      <p className="font-bold text-slate-900">{fmtInr(kpis.totalRefundAmountInr ?? 0)}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 pt-2">RTO trend</h3>
                  {analyticsLoading && <p className="text-sm text-slate-500">Loading analytics…</p>}
                  {!analyticsLoading && trend.length === 0 && (
                    <p className="text-sm text-slate-500">No trend data in range.</p>
                  )}
                  <div className="space-y-2">
                    {trend.map((t) => (
                      <div key={t.date} className="flex items-center gap-3 text-xs">
                        <span className="w-24 text-slate-500 shrink-0">{t.date}</span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.round((t.count / maxTrend) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-bold text-slate-700">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders table */}
          {showList && (
            <>
              {showListSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Total RTO" value={summary.total ?? 0} tone="blue" />
                <SummaryCard label="Pending" value={summary.pending ?? 0} tone="amber" />
                <SummaryCard label="Refunded" value={summary.refunded ?? 0} tone="emerald" />
                <SummaryCard label="Closed" value={summary.closed ?? summary.resolved ?? 0} />
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
                <select
                  value={rtoUi.statusFilter}
                  onChange={(e) => dispatch(setRtoStatusFilter(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="refund_failed">Refund failed</option>
                  <option value="refund_rejected">Refund rejected</option>
                  <option value="closed">Closed</option>
                  <option value="resolved">Resolved (legacy)</option>
                </select>
                <input
                  type="search"
                  placeholder="Search order ID / phone / name / Shiprocket ID…"
                  value={rtoUi.searchInput}
                  onChange={(e) => dispatch(setRtoSearchInput(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && dispatch(commitRtoSearch())}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xs flex-1 min-w-[160px]"
                />
                <button
                  type="button"
                  onClick={() => dispatch(commitRtoSearch())}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Apply
                </button>
                {rtoUi.search && (
                  <button
                    type="button"
                    onClick={() => dispatch(clearRtoSearch())}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  disabled={!selected.length || bulkState.isLoading}
                  onClick={() => handleBulk("refund")}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Bulk Refund
                </button>
                <button
                  type="button"
                  disabled={!selected.length || bulkState.isLoading}
                  onClick={() => handleBulk("close")}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-200"
                >
                  Bulk Close
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
                <div className="overflow-x-auto overflow-y-visible rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-[10px] uppercase tracking-widest text-slate-500">
                        <th className="p-3 w-8">
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                        </th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">RTO Status</th>
                        <th className="p-3">Shiprocket</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Returned</th>
                        <th className="p-3">Refund</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            Loading RTO orders…
                          </td>
                        </tr>
                      )}
                      {!isLoading && orders.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            No RTO orders found.
                          </td>
                        </tr>
                      )}
                      {orders.map((row) => {
                        const rowBreakdown = buildRefundBreakdown(row);
                        return (
                          <tr key={row.orderId} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(row.orderId)}
                              onChange={() => toggleOne(row.orderId)}
                              aria-label={`Select ${row.orderId}`}
                            />
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-900">{row.orderId}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{row.customerName}</div>
                            <div className="text-slate-500">{row.contactPhone || "—"}</div>
                          </td>
                          <AmountCell
                            row={row}
                            breakdown={rowBreakdown}
                            expanded={expandedBreakdown.has(row.orderId)}
                            onToggle={() => toggleBreakdown(row.orderId)}
                          />
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusBadgeClass(row.rtoStatus)}`}
                            >
                              {row.rtoStatus || "pending"}
                            </span>
                            {row.adminActionRequired && (
                              <div className="text-[10px] text-red-600 font-semibold mt-1">Refund action due</div>
                            )}
                            {!row.warehouseDelivered && row.paymentType?.key === "full_paid" && (
                              <div className="text-[10px] text-slate-500 mt-1">Awaiting warehouse</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-[10px] font-semibold text-slate-700">{row.rtoStageLabel}</div>
                            <div className="text-slate-500 truncate max-w-[140px]" title={row.providerStatus}>
                              {row.providerStatus || "—"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div
                              className="text-[11px] text-slate-800 font-medium leading-snug max-w-[180px]"
                              title={row.rtoReason || row.shiprocketReason || "—"}
                            >
                              {row.rtoReason || row.shiprocketReason || "—"}
                            </div>
                            {row.rtoReasonCategory && row.rtoReasonCategory !== "unknown" && (
                              <span
                                className={`inline-flex mt-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${reasonCategoryBadgeClass(row.rtoReasonCategory)}`}
                              >
                                {row.rtoReasonCategoryLabel || row.rtoReasonCategory}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{fmtDate(row.returnedAt)}</td>
                          <td className="p-3 align-top">
                            {row.refundTrackStatus && (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${refundTrackBadge(row.refundTrackStatus)}`}
                              >
                                {row.refundTrackStatus}
                              </span>
                            )}
                            {!row.refundTrackStatus && row.rtoRefundAmount != null && (
                              <span className="text-emerald-700 font-semibold">{fmtInrDetail(row.rtoRefundAmount)}</span>
                            )}
                            {rowBreakdown?.processed && (
                              <div className="text-[9px] text-slate-500 mt-1 leading-tight">
                                Fee {fmtInrDetail(rowBreakdown.platformFee)} · RTO{" "}
                                {fmtInrDetail(rowBreakdown.rtoShipping)}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <RowActionMenu
                              row={row}
                              busy={refundState.isLoading || rejectState.isLoading}
                              onAction={handleRowAction}
                            />
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => dispatch(setRtoPage(pagination.page - 1))}
                        className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={!pagination.hasNextPage}
                        onClick={() => dispatch(setRtoPage(pagination.page + 1))}
                        className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
