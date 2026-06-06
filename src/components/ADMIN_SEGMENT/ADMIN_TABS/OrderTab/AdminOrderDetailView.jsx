import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axiosInstance from "../../../../SERVICES/axiosInstance";
import {
  useAdminBulkApprovalCancelMutation,
  useAdminBulkApprovalConfirmMutation,
  useAdminFulfillmentAssignShipMutation,
  useAdminFulfillmentCancelShipmentMutation,
  useAdminFulfillmentEnsureShipmentMutation,
  useAdminFulfillmentManifestMutation,
  useAdminFulfillmentRetryPickupMutation,
  useAdminFulfillmentSchedulePickupMutation,
  useAdminFulfillmentSyncShiprocketMutation,
  useAdminFulfillmentShippingLabelMutation,
  useGetAdminPickupCalendarQuery,
} from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import { isPostConfirmOrderStatus } from "../../ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";
import { shouldShowOnlinePaymentHoldCountdown } from "../../../../utils/paymentHoldDisplay";

/** @deprecated Prefer shipmentOps.opsState — kept for legacy sync heuristics only. */
function isPickupBookedOnOrder(ship, opsState) {
  if (opsState === "AWB_ASSIGNED" || opsState === "READY_TO_SHIP" || opsState === "PROVIDER_RESET") {
    return false;
  }
  if (["PICKUP_SCHEDULED", "MANIFEST_READY", "LABEL_READY"].includes(opsState)) {
    return true;
  }
  if (!ship) return false;
  if (ship.providerSnapshot?.pickupScheduled === false) return false;
  const st = String(ship.providerStatus || "");
  if (/pickup\s*scheduled|pickup\s*queue|manifest/i.test(st)) return true;
  if (ship.pickupDate || ship.pickupScheduledAt) return true;
  return false;
}

const FULFILLMENT_PRIMARY_ACTION_LABELS = {
  shipNow: "Ship now",
  schedulePickup: "Schedule pickup",
  generateManifest: "Generate manifest",
  downloadManifest: "Download manifest",
  downloadLabel: "Download label",
  syncShiprocket: "Refresh Shiprocket",
  refreshTracking: "Refresh tracking",
  retryPickup: "Retry pickup",
  cancelShipment: "Cancel on Shiprocket",
};

const EXCEPTION_OPS_STATES = new Set([
  "PICKUP_EXCEPTION",
  "PROVIDER_RESET",
  "NEEDS_MANUAL_REVIEW",
]);

function resolveShiprocketSupportUrl(externalLinks) {
  return (
    externalLinks?.shiprocketSupportUrl ||
    externalLinks?.createTicketUrl ||
    externalLinks?.shiprocketOrderUrl ||
    "https://app.shiprocket.in/seller/support"
  );
}

function buildShiprocketSupportClipboardText({ orderId, ship, ops }) {
  const lines = [
    `Order: ${orderId || "—"}`,
    `Shiprocket order ID: ${ship?.shiprocketOrderId || "—"}`,
    `AWB: ${ship?.awbCode || ship?.trackingNumber || "—"}`,
    `Courier: ${ship?.courier || "—"}`,
    `Provider status: ${ship?.providerStatus || ops?.providerStatusRaw || "—"}`,
    `Ops state: ${ops?.opsStateLabel || ops?.opsState || "—"}`,
  ];
  return lines.join("\n");
}

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} kg`;
}

const DIM_WEIGHT_DIVISOR = 5000;

function formatPackageDims(dims) {
  if (!dims || typeof dims !== "object") return null;
  const l = Number(dims.lengthCm);
  const w = Number(dims.widthCm);
  const h = Number(dims.heightCm);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return `${l} × ${w} × ${h} cm`;
}

function dimWeightKgFromDims(dims) {
  if (!dims || typeof dims !== "object") return null;
  const l = Number(dims.lengthCm);
  const w = Number(dims.widthCm);
  const h = Number(dims.heightCm);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return Math.round(((l * w * h) / DIM_WEIGHT_DIVISOR) * 100) / 100;
}

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

/** Matches `Order.orderStatus` enum in the schema (human-readable). */
const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  payment_failed: "Payment failed",
};

/** Matches `Order.paymentStatus` enum. */
const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  initiated: "Initiated",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_paid: "Partially paid",
  partially_refunded: "Partially refunded",
};

function labelOrderStatus(raw) {
  const k = String(raw || "").trim();
  if (ORDER_STATUS_LABELS[k]) return ORDER_STATUS_LABELS[k];
  return k ? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function labelPaymentStatus(raw) {
  const k = String(raw || "").trim();
  if (PAYMENT_STATUS_LABELS[k]) return PAYMENT_STATUS_LABELS[k];
  return k ? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function statusBadgeClass(orderStatus) {
  const s = String(orderStatus || "").toLowerCase();
  if (["delivered", "confirmed"].includes(s)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["shipped", "out_for_delivery", "processing"].includes(s)) return "bg-blue-50 text-blue-700 border-blue-200";
  if (["pending", "return_requested"].includes(s)) return "bg-amber-50 text-amber-800 border-amber-200";
  if (["cancelled", "payment_failed"].includes(s)) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function paymentBadgeClass(paymentStatus) {
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "partially_paid") return "bg-amber-50 text-amber-800 border-amber-200";
  if (["failed", "refunded", "partially_refunded"].includes(s)) return "bg-red-50 text-red-700 border-red-200";
  if (["pending", "initiated"].includes(s)) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function paymentMethodLabel(order) {
  const m = order?.paymentInfo?.method;
  if (String(m || "").toLowerCase() === "cod") return "Cash on delivery (COD)";
  if (m === "online") return "Online (Razorpay)";
  return m ? String(m) : "—";
}

function normalizeTrackingEvents(rawEvents = []) {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents
    .map((event, idx) => ({
      id: `${idx}-${String(event?.status || event?.description || "event")}`,
      status: event?.status || "Shipment update",
      description: event?.description || null,
      location: event?.location || null,
      timestamp: event?.timestamp || event?.at || null,
    }))
    .filter((event) => event.status || event.description || event.timestamp);
}

function timelineRowsFromTracking(tracking) {
  const events = Array.isArray(tracking?.timeline) ? tracking.timeline : [];
  return events.map((event, idx) => ({
    id: `tl-${idx}-${String(event?.status || "step")}`,
    status: event?.status || "Shipment update",
    description: event?.description || null,
    location: event?.location || null,
    timestamp: event?.timestamp || null,
  }));
}

function localYmdTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * When GET /orders/items/:id includes `fulfillmentPaymentGate` (staff), use it.
 * Fallback for older API responses: conservative — COD or fully paid, or advance+COD with capture.
 */
function carrierFulfilmentPaymentReady(order, gateFromApi) {
  if (gateFromApi != null) return Boolean(gateFromApi.ok);
  if (!order) return false;
  const method = String(order?.paymentInfo?.method || "").toLowerCase();
  if (method === "cod") return true;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return true;
  const split = String(order?.paymentInfo?.splitMode || "").toLowerCase();
  const bc = String(order?.paymentInfo?.balanceCollectionMethod || "").toLowerCase();
  if (
    (method === "online" || method === "prepaid") &&
    split === "advance" &&
    bc === "cod" &&
    String(order?.paymentStatus || "").toLowerCase() === "partially_paid" &&
    Number(order?.amountPaidInr || 0) > 0.01
  ) {
    return true;
  }
  return false;
}

/** RTK mutation / axios-style errors from adminOrdersApi */
function fulfillmentActionErrorText(e, fallback = "Request failed.") {
  const d = e?.data;
  if (typeof d === "object" && d && d.message) return String(d.message);
  if (typeof d === "string" && d.trim()) return d;
  if (e?.message && String(e.message).trim()) return String(e.message);
  return fallback;
}

function pickupScheduleFeedback({ response, selectedDate }) {
  const r = response || {};
  const selected = String(selectedDate || "").trim();
  const saved = String(r.pickupDate || "").trim();
  if (r.alreadyScheduled && saved && selected && saved !== selected) {
    return {
      type: "warn",
      text:
        r.message ||
        `Shiprocket already has pickup on ${saved}. You selected ${selected}. Confirm on the Shiprocket panel.`,
    };
  }
  if (r.alreadyScheduled && r.shipmentOps?.actionCapabilities?.schedulePickup) {
    return {
      type: "warn",
      text:
        r.message ||
        "Shiprocket reports pickup exists, but this order still needs scheduling. Try Schedule pickup again or refresh from Shiprocket.",
    };
  }
  return {
    type: "ok",
    text:
      r.message ||
      (saved ? `Pickup scheduled for ${saved}.` : "Pickup scheduled on Shiprocket."),
  };
}

function FulfillmentStatusBanner({ msg }) {
  if (!msg?.text) return null;
  const tone =
    msg.type === "err"
      ? "bg-red-50 text-red-800 border-red-100"
      : msg.type === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-emerald-50 text-emerald-900 border-emerald-100";
  return (
    <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm border ${tone}`} role="status" aria-live="polite">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Shiprocket status</p>
      {msg.text}
    </div>
  );
}

function FulfillmentStepCard({ step, focusStep, done, title, children, id }) {
  const isActive = step === focusStep && !done;
  const shell = isActive
    ? "rounded-xl border border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200 p-4 mb-4"
    : done
      ? "rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 mb-4"
      : "rounded-xl border border-slate-200 bg-white p-4 mb-4";
  return (
    <div className={shell} id={id}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {done ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            Done
          </span>
        ) : isActive ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
            Next on Shiprocket
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Rich admin order detail — data-driven from GET /orders/items/:orderId (staff sees customer + SKUs).
 */
export default function AdminOrderDetailView({
  orderId,
  order,
  /** From staff GET /orders/items/:id — server-evaluated payment gate for Shiprocket */
  fulfillmentPaymentGate,
  tracking,
  trackingLoading,
  trackingError,
  onRefreshTracking,
  onOrderRefresh,
  loading,
  error,
  onBack,
}) {
  const [pickupDate, setPickupDate] = useState(localYmdTomorrow);
  const [actionMsg, setActionMsg] = useState(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [labelDownloadBusy, setLabelDownloadBusy] = useState(false);
  const [manifestDownloadBusy, setManifestDownloadBusy] = useState(false);

  const { data: pickupCalendarRes } = useGetAdminPickupCalendarQuery({ daysAhead: 45 });
  const pickupCalendar = pickupCalendarRes?.calendar;
  const pickupAllowedDates = useMemo(
    () => (Array.isArray(pickupCalendar?.allowedDates) ? pickupCalendar.allowedDates : []),
    [pickupCalendar?.allowedDates]
  );
  const pickupUsesShiprocketRules = Boolean(pickupCalendarRes?.preferences?.hasScheduleRules);

  const [ensureShipment, ensureState] = useAdminFulfillmentEnsureShipmentMutation();
  const [assignShip, assignState] = useAdminFulfillmentAssignShipMutation();
  const [schedulePickup, pickupState] = useAdminFulfillmentSchedulePickupMutation();
  const [syncShiprocket, syncShiprocketState] = useAdminFulfillmentSyncShiprocketMutation();
  const [fulfillmentManifest, manifestState] = useAdminFulfillmentManifestMutation();
  const [shippingLabel, labelState] = useAdminFulfillmentShippingLabelMutation();
  const [cancelShipment, cancelState] = useAdminFulfillmentCancelShipmentMutation();
  const [retryPickup, retryPickupState] = useAdminFulfillmentRetryPickupMutation();
  const [bulkConfirm, bulkConfirmState] = useAdminBulkApprovalConfirmMutation();
  const [bulkCancel, bulkCancelState] = useAdminBulkApprovalCancelMutation();

  const refreshOrder = useCallback(async () => {
    if (typeof onOrderRefresh === "function") {
      await onOrderRefresh();
    }
  }, [onOrderRefresh]);

  const syncedOnOpenRef = useRef(null);
  useEffect(() => {
    syncedOnOpenRef.current = null;
  }, [orderId]);

  useEffect(() => {
    const def = pickupCalendar?.defaultDate;
    if (def && pickupAllowedDates.includes(def)) {
      setPickupDate(def);
    }
  }, [pickupCalendar?.defaultDate, pickupAllowedDates]);

  const fulfillmentBusy =
    ensureState.isLoading ||
    assignState.isLoading ||
    pickupState.isLoading ||
    manifestState.isLoading ||
    syncShiprocketState.isLoading ||
    labelState.isLoading ||
    cancelState.isLoading ||
    retryPickupState.isLoading ||
    bulkConfirmState.isLoading ||
    bulkCancelState.isLoading;

  const orderSt = String(order?.orderStatus || "").toLowerCase();
  const isPendingOrder = orderSt === "pending";
  const showInvoiceAndLogistics = isPostConfirmOrderStatus(orderSt);
  const fulfillmentActionsBlocked = orderSt === "cancelled" || orderSt === "payment_failed";
  const fulfillmentBlockMessage = fulfillmentActionsBlocked
    ? orderSt === "cancelled"
      ? "This order was cancelled. Ship now, pickup scheduling, shipping labels, and other Shiprocket shipment actions are not available."
      : "The customer did not complete payment. Shiprocket fulfilment actions are not available."
    : null;

  const carrierPaymentReady = carrierFulfilmentPaymentReady(order, fulfillmentPaymentGate);
  const canRunFulfillmentActions = !fulfillmentActionsBlocked && carrierPaymentReady;
  const carrierPaymentHint =
    fulfillmentActionsBlocked
      ? null
      : fulfillmentPaymentGate && fulfillmentPaymentGate.ok === false
        ? fulfillmentPaymentGate.message
        : !carrierPaymentReady
          ? "Waiting for customer payment (or COD rules) before Shiprocket actions."
          : null;

  useEffect(() => {
    if (!orderId || !order || loading) return;
    const srId = order?.shipmentInfo?.shiprocketOrderId;
    if (!srId || fulfillmentActionsBlocked) return;
    if (syncedOnOpenRef.current === orderId) return;

    const opsState = order?.shipmentOps?.opsState;
    const syncHealth = order?.shipmentOps?.syncHealth;
    const capsSchedule = order?.shipmentOps?.actionCapabilities?.schedulePickup;
    const si = order?.shipmentInfo || {};
    const stalePickup = Boolean(si.pickupDate) && (opsState === "AWB_ASSIGNED" || capsSchedule);
    const needsSync =
      syncHealth === "stale" ||
      syncHealth === "unknown" ||
      syncHealth === "error" ||
      stalePickup;

    if (!needsSync) {
      syncedOnOpenRef.current = orderId;
      return;
    }

    syncedOnOpenRef.current = orderId;
    let cancelled = false;
    (async () => {
      try {
        await syncShiprocket(orderId).unwrap();
        if (!cancelled) {
          await refreshOrder();
          if (typeof onRefreshTracking === "function") await onRefreshTracking();
        }
      } catch (_) {
        /* ignore background sync errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    orderId,
    order,
    loading,
    fulfillmentActionsBlocked,
    syncShiprocket,
    refreshOrder,
    onRefreshTracking,
  ]);

  const fetchInvoiceObjectUrl = useCallback(async () => {
    const res = await axiosInstance.get(
      `/orders/admin/items/${encodeURIComponent(String(orderId))}/invoice-html`,
      { responseType: "text", headers: { Accept: "text/html" } }
    );
    const blob = new Blob([res.data], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [orderId]);

  const invoiceErrorMessage = (e) =>
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : null) ||
    e?.message ||
    "Could not load invoice.";

  const openTaxInvoice = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setInvoiceBusy(true);
    let url;
    try {
      url = await fetchInvoiceObjectUrl();
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      setActionMsg({ type: "err", text: invoiceErrorMessage(e), surface: "invoice" });
    } finally {
      setInvoiceBusy(false);
    }
  }, [orderId, fetchInvoiceObjectUrl]);

  const downloadTaxInvoice = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setInvoiceBusy(true);
    let url;
    try {
      url = await fetchInvoiceObjectUrl();
      const safeId = String(orderId)
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 80);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tax-invoice-${safeId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      setActionMsg({ type: "err", text: invoiceErrorMessage(e), surface: "invoice" });
    } finally {
      setInvoiceBusy(false);
    }
  }, [orderId, fetchInvoiceObjectUrl]);

  const printTaxInvoice = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setInvoiceBusy(true);
    let url;
    try {
      url = await fetchInvoiceObjectUrl();
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        URL.revokeObjectURL(url);
        setActionMsg({
          type: "err",
          text: "Pop-up blocked — allow pop-ups for this site to print, or use Open / Download.",
          surface: "invoice",
        });
        return;
      }
      const runPrint = () => {
        try {
          w.focus();
          w.print();
        } catch (_) {
          /* ignore */
        }
      };
      w.addEventListener("load", runPrint, { once: true });
      if (w.document?.readyState === "complete") {
        setTimeout(runPrint, 0);
      }
      setTimeout(() => URL.revokeObjectURL(url), 180000);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      setActionMsg({ type: "err", text: invoiceErrorMessage(e), surface: "invoice" });
    } finally {
      setInvoiceBusy(false);
    }
  }, [orderId, fetchInvoiceObjectUrl]);

  const fetchShippingLabelBlob = useCallback(async () => {
    const res = await axiosInstance.get(
      `/orders/admin/items/${encodeURIComponent(String(orderId))}/fulfillment/shipping-label-file`,
      { responseType: "blob" }
    );
    if (res.headers["content-type"]?.includes("application/json")) {
      const t = await res.data.text();
      const j = JSON.parse(t);
      throw new Error(j?.message || "Label fetch failed.");
    }
    return {
      blob: new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" }),
      filename: (() => {
        let filename = `Shiprocket-label-${String(orderId).replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`;
        const dispo = res.headers["content-disposition"];
        if (dispo) {
          const m = /filename\*?=(?:UTF-8''|"?)([^";\n]+)/i.exec(dispo);
          if (m && m[1]) filename = decodeURIComponent(m[1].replace(/"/g, "").trim());
        }
        return filename;
      })(),
    };
  }, [orderId]);

  const openShippingLabelInNewTab = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setLabelDownloadBusy(true);
    let objectUrl;
    try {
      const { blob } = await fetchShippingLabelBlob();
      objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setActionMsg({ type: "ok", text: "Opening Shiprocket shipping label.", surface: "label" });
      await refreshOrder();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 180000);
    } catch (e) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setActionMsg({
        type: "err",
        text: e?.message || "Could not open shipping label.",
        surface: "label",
      });
    } finally {
      setLabelDownloadBusy(false);
    }
  }, [orderId, fetchShippingLabelBlob, refreshOrder]);

  const downloadShippingLabelFile = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setLabelDownloadBusy(true);
    try {
      const { blob, filename } = await fetchShippingLabelBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setActionMsg({ type: "ok", text: "Shipping label file downloaded.", surface: "label" });
      await refreshOrder();
    } catch (e) {
      let msg = e?.message || "Label download failed.";
      if (e?.response?.data instanceof Blob) {
        try {
          const t = await e.response.data.text();
          const j = JSON.parse(t);
          if (j?.message) msg = j.message;
        } catch (_) {
          /* ignore */
        }
      } else if (e?.response?.data && typeof e.response.data === "object" && e.response.data.message) {
        msg = e.response.data.message;
      }
      setActionMsg({ type: "err", text: msg, surface: "label" });
    } finally {
      setLabelDownloadBusy(false);
    }
  }, [orderId, fetchShippingLabelBlob, refreshOrder]);

  const downloadManifestFile = useCallback(async () => {
    if (!orderId) return;
    setActionMsg(null);
    setManifestDownloadBusy(true);
    try {
      const res = await axiosInstance.get(
        `/orders/admin/items/${encodeURIComponent(String(orderId))}/fulfillment/manifest-file`,
        { responseType: "blob" }
      );
      let filename = `Shiprocket-manifest-${String(orderId).replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`;
      const dispo = res.headers["content-disposition"];
      if (dispo) {
        const m = /filename\*?=(?:UTF-8''|"?)([^";\n]+)/i.exec(dispo);
        if (m && m[1]) filename = decodeURIComponent(m[1].replace(/"/g, "").trim());
      }
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setActionMsg({ type: "ok", text: "Manifest downloaded.", surface: "manifest" });
      await refreshOrder();
    } catch (e) {
      let msg = e?.message || "Manifest download failed.";
      if (e?.response?.data instanceof Blob) {
        try {
          const t = await e.response.data.text();
          const j = JSON.parse(t);
          if (j?.message) msg = j.message;
        } catch (_) {
          /* ignore */
        }
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      }
      setActionMsg({ type: "err", text: msg, surface: "manifest" });
    } finally {
      setManifestDownloadBusy(false);
    }
  }, [orderId, refreshOrder]);

  const addr = order?.addressSnapshot || {};
  const ship = order?.shipmentInfo || {};
  const ops = order?.shipmentOps || {};
  const caps = ops.actionCapabilities || {};
  const blockReasons = ops.blockReasons || {};
  const riskFlags = ops.riskFlags || {};
  const externalLinks = ops.externalLinks || {};
  const hasCarrierAwb = Boolean(ship.awbCode || ship.trackingNumber);
  const pickupAlreadyScheduled =
    ops.opsState === "PICKUP_SCHEDULED" ||
    ops.opsState === "MANIFEST_READY" ||
    (ops.opsState === "LABEL_READY" && !caps.schedulePickup);
  const showOpsAlert =
    Boolean(ops.nextStepMessage) &&
    (riskFlags.pickupException || riskFlags.providerReset || riskFlags.needsManualReview);
  const isExceptionOpsState = EXCEPTION_OPS_STATES.has(ops.opsState);
  const showStandardFulfillmentSteps = !isExceptionOpsState;
  const showReshipStepOnly = ops.opsState === "PROVIDER_RESET";

  const copySupportContext = useCallback(async () => {
    const text = buildShiprocketSupportClipboardText({ orderId, ship, ops });
    try {
      await navigator.clipboard.writeText(text);
      setActionMsg({
        type: "ok",
        surface: "ops",
        text: "Order details copied. Paste them in Shiprocket support if needed.",
      });
    } catch {
      setActionMsg({
        type: "err",
        surface: "ops",
        text: "Could not copy to clipboard. Copy AWB and order ID manually.",
      });
    }
  }, [orderId, ship, ops]);

  const runCancelAndPrepareReship = useCallback(async () => {
    if (
      !window.confirm(
        "Cancel this shipment on Shiprocket and clear old AWB data so you can Ship now again?"
      )
    ) {
      return;
    }
    setActionMsg(null);
    try {
      const r = await cancelShipment(orderId).unwrap();
      setActionMsg({
        type: "ok",
        surface: "ops",
        text:
          r?.message ||
          "Cancelled on Shiprocket. Use Ship now below to book again.",
      });
      await refreshOrder();
    } catch (e) {
      setActionMsg({
        type: "err",
        surface: "ops",
        text: fulfillmentActionErrorText(e, "Cancel failed."),
      });
    }
  }, [cancelShipment, orderId, refreshOrder]);

  useEffect(() => {
    if (!orderId || !hasCarrierAwb || !ship.shiprocketOrderId) return;
    const needsSync =
      Boolean(ship.lastPickupError) ||
      (isPickupBookedOnOrder(ship, ops.opsState) && !ship.pickupDate && !ship.pickupScheduledAt);
    if (!needsSync) return;
    let cancelled = false;
    (async () => {
      try {
        await syncShiprocket(orderId).unwrap();
        if (!cancelled) await refreshOrder();
      } catch (_) {
        /* ignore background sync errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    orderId,
    hasCarrierAwb,
    ship.shiprocketOrderId,
    ship.pickupDate,
    ship.lastPickupError,
    ship.manifestUrl,
    ship.pickupScheduledAt,
    syncShiprocket,
    refreshOrder,
  ]);
  const quoteShip = order?.shippingSnapshot || {};
  const coupon = order?.appliedCoupon;

  const waLink = useMemo(() => {
    const raw = String(addr.phone || order?.customer?.phone || "").replace(/\D/g, "");
    const last10 = raw.slice(-10);
    if (last10.length !== 10) return null;
    return `https://wa.me/91${last10}`;
  }, [addr.phone, order?.customer?.phone]);

  if (loading && !order) {
    return (
      <div className="p-6 bg-[#F8FAFC] min-h-screen">
        <div className="max-w-6xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-40 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    const msg =
      error?.data?.message ||
      error?.message ||
      (typeof error?.data === "string" ? error.data : null) ||
      "Could not load order.";
    return (
      <div className="p-6 bg-[#F8FAFC] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 mb-6 font-medium hover:text-slate-900"
          >
            ← Back to orders
          </button>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{msg}</div>
        </div>
      </div>
    );
  }

  if (!loading && !error && !order) {
    return (
      <div className="p-6 bg-[#F8FAFC] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <button type="button" onClick={onBack} className="text-slate-600 mb-4 hover:text-slate-900">
            ← Back to orders
          </button>
          <p className="text-slate-600">Order could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const weightSnap = order.shippingWeightSnapshot;
  const weightByVariantId = new Map();
  for (const row of weightSnap?.lines || []) {
    if (row?.variantId != null) weightByVariantId.set(String(row.variantId), row);
  }
  const packageDimsLabel = formatPackageDims(weightSnap?.dims);
  const packageDimWeightKg =
    weightSnap?.totalDimWeightKg != null
      ? Number(weightSnap.totalDimWeightKg)
      : dimWeightKgFromDims(weightSnap?.dims);
  const weightSourceCatalogFallback = String(weightSnap?.source || "") === "catalog_fallback";
  const pi = order.paymentInfo && typeof order.paymentInfo === "object" ? order.paymentInfo : {};
  const refundHistory = Array.isArray(order.refundHistory) ? order.refundHistory : [];
  const showRazorpayIds =
    String(pi.method || "").toLowerCase() === "online" ||
    (String(order.paymentStatus || "") === "paid" && (pi.razorpayOrderId || pi.razorpayPaymentId));
  const providerStatusRaw = tracking?.providerStatus || ship?.providerStatus || null;
  const opsExceptionStates = new Set(["PICKUP_EXCEPTION", "PROVIDER_RESET", "NEEDS_MANUAL_REVIEW"]);
  const shiprocketMirrorOps = new Set(["AWB_ASSIGNED", "PICKUP_SCHEDULED", "MANIFEST_READY"]);
  const useOpsPrimaryStatus = ops?.opsState && opsExceptionStates.has(ops.opsState);
  const opsMirrorLine = [ops?.courierOpsLine1, ops?.courierOpsLine2].filter(Boolean).join(" · ");
  const carrierStatusDisplay = shiprocketMirrorOps.has(ops?.opsState)
    ? opsMirrorLine || providerStatusRaw || ops?.opsStateLabel
    : useOpsPrimaryStatus
      ? ops.courierOpsLine1 || ops.opsStateLabel || providerStatusRaw
      : providerStatusRaw || ops.courierOpsLine1 || ops.opsStateLabel || null;
  const carrierStatusSecondary =
    useOpsPrimaryStatus && providerStatusRaw && providerStatusRaw !== carrierStatusDisplay
      ? providerStatusRaw
      : ops.courierOpsLine2 || null;
  const hideStaleTracking = ops?.opsState === "PROVIDER_RESET";
  const lastSyncedAt = tracking?.lastSyncedAt || ship?.lastSyncAt || null;
  const lastSyncError = ship?.lastError || null;
  const trackingTimeline = timelineRowsFromTracking(tracking);
  const carrierTimeline = (() => {
    let rows =
      trackingTimeline.length > 0
        ? trackingTimeline
        : normalizeTrackingEvents(ship?.rawEvents);
    const providerNow = providerStatusRaw;
    const preInTransit = ![
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "PROVIDER_RESET",
      "PAYMENT_FAILED",
    ].includes(ops?.opsState);
    const norm = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
    const isStaleCancel = (value) =>
      /pickupcancelled|pickup cancelled|auto cancel|shipment reset on shiprocket/.test(norm(value));
    const onlyStaleCancel =
      rows.length > 0 && rows.every((row) => isStaleCancel(row.status || row.description));
    const hasCurrent =
      providerNow && rows.some((row) => norm(row.status) === norm(providerNow));
    if (preInTransit && providerNow && (!hasCurrent || onlyStaleCancel)) {
      rows = [
        ...rows.filter((row) => !isStaleCancel(row.status || row.description)),
        {
          id: "provider-current",
          status: providerNow,
          description:
            ops?.opsState === "AWB_ASSIGNED" ? "Schedule pickup on Shiprocket to continue." : null,
          location: null,
          timestamp: lastSyncedAt || new Date().toISOString(),
        },
      ];
    } else if (preInTransit && providerNow) {
      rows = rows.filter((row) => !isStaleCancel(row.status || row.description));
    }
    return rows;
  })();

  const primaryActionKey = ops?.primaryAction || "openDetail";
  const primaryActionLabel =
    ops?.primaryActionLabel || FULFILLMENT_PRIMARY_ACTION_LABELS[primaryActionKey] || "Open";
  const hasManifest = Boolean(ship.manifestUrl);
  const step1Done = hasCarrierAwb;
  const step2Done = pickupAlreadyScheduled;
  const step3Done = hasManifest;
  const fulfillmentFocusStep =
    primaryActionKey === "shipNow"
      ? 1
      : primaryActionKey === "schedulePickup"
        ? 2
        : primaryActionKey === "generateManifest" || primaryActionKey === "downloadManifest"
          ? 3
          : primaryActionKey === "downloadLabel"
            ? 4
            : !step1Done
              ? 1
              : !step2Done
                ? 2
                : !step3Done
                  ? 3
                  : 4;
  const shiprocketMirrorStatus = opsMirrorLine || ops?.courierOpsLine1 || ship.providerStatus || null;
  const showNextActionBanner =
    showInvoiceAndLogistics &&
    canRunFulfillmentActions &&
    primaryActionKey !== "openDetail" &&
    !isExceptionOpsState;

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to orders
        </button>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Order ID</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              #{String(order.orderId || "").replace(/^#/, "")}
            </h2>
            {ship?.shiprocketPickupId ? (
              <p className="text-sm font-semibold text-indigo-600 mt-1 tracking-wide">
                {String(ship.shiprocketPickupId).match(/^SRPID-/i)
                  ? String(ship.shiprocketPickupId).toUpperCase()
                  : `SRPID-${String(ship.shiprocketPickupId).replace(/\D/g, "")}`}
              </p>
            ) : null}
            <p className="text-sm text-slate-500 mt-1">{formatDateHeader(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusBadgeClass(order.orderStatus)}`}
              title="Order status (orderStatus)"
            >
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Order</span>
              {labelOrderStatus(order.orderStatus)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${paymentBadgeClass(order.paymentStatus)}`}
              title="Payment status (paymentStatus)"
            >
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Payment</span>
              {labelPaymentStatus(order.paymentStatus)}
            </span>
          </div>
        </div>

        {(carrierPaymentHint || fulfillmentBlockMessage) && (
          <div
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div
              className={`rounded-lg px-3 py-2 text-xs border ${
                fulfillmentBlockMessage
                  ? "text-slate-700 bg-slate-100 border-slate-200"
                  : "text-amber-900 bg-amber-50 border-amber-100"
              }`}
            >
              {fulfillmentBlockMessage || carrierPaymentHint}
            </div>
          </div>
        )}

        {showNextActionBanner ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Next action · Shiprocket
                </p>
                <p className="text-base font-bold text-indigo-950 mt-1">{primaryActionLabel}</p>
                {ops.nextStepMessage ? (
                  <p className="text-xs text-indigo-800 mt-1 leading-relaxed max-w-2xl">{ops.nextStepMessage}</p>
                ) : null}
                {carrierStatusDisplay ? (
                  <p className="text-[11px] text-indigo-700 mt-2">
                    Current status: <span className="font-semibold">{carrierStatusDisplay}</span>
                  </p>
                ) : null}
                {ops.opsState === "PICKUP_SCHEDULED" && ship.labelUrl && !ship.manifestUrl ? (
                  <p className="text-[10px] font-semibold text-emerald-700 mt-1.5">
                    Label downloaded on Shiprocket (manifest is the next step).
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 shrink-0">
                {primaryActionKey === "schedulePickup" && caps.schedulePickup ? (
                  <>
                    {pickupUsesShiprocketRules && pickupAllowedDates.length > 0 ? (
                      <select
                        value={pickupAllowedDates.includes(pickupDate) ? pickupDate : pickupAllowedDates[0]}
                        onChange={(e) => setPickupDate(e.target.value)}
                        disabled={fulfillmentBusy}
                        className="border border-indigo-200 rounded-lg px-2 py-2 text-xs bg-white min-w-[11rem]"
                      >
                        {pickupAllowedDates.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        disabled={fulfillmentBusy}
                        className="border border-indigo-200 rounded-lg px-2 py-2 text-xs bg-white min-w-[9.5rem]"
                      />
                    )}
                    <button
                      type="button"
                      disabled={fulfillmentBusy || !pickupDate || !carrierPaymentReady}
                      title={blockReasons.schedulePickup}
                      onClick={async () => {
                        setActionMsg(null);
                        try {
                          const r = await schedulePickup({ orderId, pickupDate }).unwrap();
                          const fb = pickupScheduleFeedback({ response: r, selectedDate: pickupDate });
                          setActionMsg({
                            type: fb.type,
                            surface: "pickup",
                            text: fb.text,
                          });
                          await refreshOrder();
                          if (typeof onRefreshTracking === "function") await onRefreshTracking();
                        } catch (e) {
                          setActionMsg({
                            type: "err",
                            surface: "pickup",
                            text: fulfillmentActionErrorText(e, "Schedule pickup failed."),
                          });
                        }
                      }}
                      className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {pickupState.isLoading ? "Scheduling…" : primaryActionLabel}
                    </button>
                  </>
                ) : primaryActionKey === "syncShiprocket" && caps.syncShiprocket ? (
                  <button
                    type="button"
                    disabled={fulfillmentBusy}
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        const r = await syncShiprocket(orderId).unwrap();
                        setActionMsg({
                          type: "ok",
                          surface: "ops",
                          text: r?.message || "Updated from Shiprocket.",
                        });
                        await refreshOrder();
                        if (typeof onRefreshTracking === "function") await onRefreshTracking();
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          surface: "ops",
                          text: fulfillmentActionErrorText(e, "Sync failed."),
                        });
                      }
                    }}
                    className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {syncShiprocketState.isLoading ? "Syncing…" : primaryActionLabel}
                  </button>
                ) : primaryActionKey === "downloadLabel" && caps.downloadLabel ? (
                  <button
                    type="button"
                    disabled={fulfillmentBusy || labelDownloadBusy}
                    onClick={() => {
                      void downloadShippingLabelFile();
                    }}
                    className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {labelDownloadBusy ? "Downloading…" : primaryActionLabel}
                  </button>
                ) : primaryActionKey === "generateManifest" && caps.generateManifest ? (
                  <button
                    type="button"
                    disabled={fulfillmentBusy || !carrierPaymentReady || !hasCarrierAwb}
                    title={blockReasons.generateManifest}
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        const r = await fulfillmentManifest(orderId).unwrap();
                        const u = r?.manifestUrl;
                        setActionMsg({
                          type: "ok",
                          surface: "manifest",
                          text: u ? "Manifest ready on Shiprocket." : "Manifest generated on Shiprocket.",
                        });
                        if (u) window.open(u, "_blank", "noopener,noreferrer");
                        await refreshOrder();
                        if (typeof onRefreshTracking === "function") await onRefreshTracking();
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          surface: "manifest",
                          text: fulfillmentActionErrorText(e, "Manifest failed."),
                        });
                      }
                    }}
                    className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {manifestState.isLoading ? "Working…" : primaryActionLabel}
                  </button>
                ) : primaryActionKey === "downloadManifest" && caps.downloadManifest ? (
                  <button
                    type="button"
                    disabled={fulfillmentBusy || manifestDownloadBusy || !carrierPaymentReady}
                    title={blockReasons.downloadManifest}
                    onClick={() => {
                      void downloadManifestFile();
                    }}
                    className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {manifestDownloadBusy ? "Downloading…" : primaryActionLabel}
                  </button>
                ) : null}
                {caps.syncShiprocket && primaryActionKey !== "syncShiprocket" ? (
                  <button
                    type="button"
                    disabled={fulfillmentBusy}
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        await syncShiprocket(orderId).unwrap();
                        await refreshOrder();
                        if (typeof onRefreshTracking === "function") await onRefreshTracking();
                      } catch (_) {
                        /* ignore */
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-indigo-300 rounded-lg bg-white text-indigo-900 hover:bg-indigo-100/60 disabled:opacity-50"
                  >
                    Refresh Shiprocket
                  </button>
                ) : null}
              </div>
            </div>
            <FulfillmentStatusBanner
              msg={
                actionMsg?.surface === "pickup" || actionMsg?.surface === "ops" ? actionMsg : null
              }
            />
          </div>
        ) : null}

        {isPendingOrder && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm space-y-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                Awaiting admin approval
              </p>
              <p className="text-xs text-amber-950/90 mt-1 leading-relaxed">
                Only admin can approve or reject pending orders. Confirm unlocks GST invoice and Shiprocket steps.
                Cancel restores stock and closes the order.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={fulfillmentBusy || !carrierPaymentReady}
                onClick={async () => {
                  setActionMsg(null);
                  try {
                    const data = await bulkConfirm({ orderIds: [orderId] }).unwrap();
                    const row = (data.results || []).find((r) => r.orderId === orderId);
                    if (row && !row.success) {
                      throw new Error(row.message || row.code || "Confirm failed.");
                    }
                    const deferred = row?.code === "CONFIRMED_SHIPMENT_DEFERRED";
                    setActionMsg({
                      type: deferred ? "warn" : "ok",
                      text:
                        row?.message ||
                        (deferred
                          ? "Order confirmed. Shiprocket create failed — retry Ship now below."
                          : "Order confirmed."),
                    });
                  } catch (e) {
                    setActionMsg({
                      type: "err",
                      text: fulfillmentActionErrorText(e, "Confirm failed."),
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {bulkConfirmState.isLoading ? "Confirming…" : "Confirm order"}
              </button>
              <button
                type="button"
                disabled={fulfillmentBusy}
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Cancel this pending order? Stock will be restored and the customer will not be shipped."
                    )
                  ) {
                    return;
                  }
                  setActionMsg(null);
                  try {
                    const data = await bulkCancel({ orderIds: [orderId] }).unwrap();
                    const row = (data.results || []).find((r) => r.orderId === orderId);
                    if (row && !row.success) {
                      throw new Error(row.message || row.code || "Cancel failed.");
                    }
                    setActionMsg({
                      type: "ok",
                      text: row?.message || "Order cancelled.",
                    });
                  } catch (e) {
                    setActionMsg({
                      type: "err",
                      text: fulfillmentActionErrorText(e, "Cancel failed."),
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-bold border border-red-300 text-red-800 rounded-lg bg-white hover:bg-red-50 disabled:opacity-50"
              >
                {bulkCancelState.isLoading ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        )}

        {hideStaleTracking && carrierStatusDisplay && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Shipment</p>
            <p className="text-sm font-semibold text-amber-950 mt-1">{carrierStatusDisplay}</p>
            {carrierStatusSecondary && (
              <p className="text-[10px] text-amber-800 mt-1">Previous Shiprocket label: {carrierStatusSecondary}</p>
            )}
            <p className="text-xs text-amber-900 mt-2">Stale AWB cleared — use Ship now after refresh.</p>
          </div>
        )}
        {(ship.trackingNumber || ship.courier || carrierStatusDisplay) && !hideStaleTracking && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipment</p>
              <p className="text-sm font-semibold text-slate-900">
                {ship.courier || "Courier"} {ship.trackingNumber ? `· ${ship.trackingNumber}` : ""}
              </p>
              {carrierStatusDisplay && (
                <p className="text-xs text-blue-700 mt-1">
                  Carrier status: <span className="font-semibold">{carrierStatusDisplay}</span>
                </p>
              )}
              {carrierStatusSecondary && (
                <p className="text-[10px] text-slate-500 mt-1">Shiprocket label: {carrierStatusSecondary}</p>
              )}
              {ship.shippedAt && (
                <p className="text-xs text-slate-500 mt-1">Shipped {formatDateHeader(ship.shippedAt)}</p>
              )}
              {ship.deliveredAt && (
                <p className="text-xs text-emerald-600 mt-0.5">Delivered {formatDateHeader(ship.deliveredAt)}</p>
              )}
            </div>
            {ship.trackingNumber && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(ship.trackingNumber + " " + (ship.courier || "tracking"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Track package
              </a>
            )}
          </div>
        )}

        {orderId && !showInvoiceAndLogistics && (isPendingOrder || fulfillmentActionsBlocked) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              {isPendingOrder ? "Invoice & logistics locked" : "Invoice & logistics not available"}
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isPendingOrder
                ? "GST tax invoice and Shiprocket steps appear after you confirm this order (Confirmed tab)."
                : "Cancelled and unpaid orders do not need a tax invoice or shipment booking."}
            </p>
          </div>
        )}

        {orderId && showInvoiceAndLogistics && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 sm:px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Your store</p>
                <h3 className="text-lg font-black tracking-tight">GST tax invoice</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  This is your store&apos;s tax invoice (HTML from your server). Anything named &quot;invoice&quot; on
                  Shiprocket&apos;s site is usually a logistics document. For GST and the customer, use this{" "}
                  <strong className="text-white">tax invoice</strong>.
                </p>
              </div>
              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={openTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-sm disabled:opacity-50"
                  >
                    {invoiceBusy ? "…" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={printTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 disabled:opacity-50"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={downloadTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-right max-w-xs leading-snug">
                  After AWB is saved, open or print again so the AWB line updates. Use the browser print dialog
                  &quot;Save as PDF&quot; if you need a PDF file.
                </p>
                {actionMsg?.surface === "invoice" && actionMsg?.text ? (
                  <div
                    className={`w-full max-w-sm rounded-lg px-3 py-2 text-xs border sm:ml-auto ${
                      actionMsg.type === "err"
                        ? "bg-red-950/90 border-red-400/50 text-red-50"
                        : "bg-emerald-950/80 border-emerald-400/40 text-emerald-50"
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {actionMsg.text}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Logistics (Shiprocket)
                </h3>
                <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                  Checkout shows an <span className="font-semibold">estimated</span> courier and delivery charge from our
                  rates. Shiprocket uses its own live partners and prices when the shipment is booked — they are not
                  always the same as checkout.
                </p>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <p className="text-slate-600 font-semibold">Quoted courier (checkout)</p>
                <p className="font-semibold text-slate-900 mt-0.5">{quoteShip.courierName || "—"}</p>
                <p className="text-slate-500 mt-1">Est. delivery: {quoteShip.estimatedDays || "—"}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                <p className="text-slate-600 font-semibold">Assigned courier (Shiprocket)</p>
                <p className="font-semibold text-slate-900 mt-0.5">{ship.courier || "—"}</p>
                <p className="text-slate-500 mt-1">After AWB assignment</p>
                {ship.courierAssignNote ? (
                  <p className="text-[10px] text-indigo-800 mt-2 leading-snug border-t border-indigo-100 pt-2">
                    {ship.courierAssignNote}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Shiprocket order ID</p>
                <p className="font-mono font-semibold break-all">{ship.shiprocketOrderId || "—"}</p>
              </div>
            </div>

            {ship.lastError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                <p className="font-semibold">Last shipment sync error</p>
                <p className="mt-0.5">{ship.lastError}</p>
                {String(ship.lastError).includes("pickup location") && (
                  <p className="mt-2 text-red-800">
                    Fix: in <code className="text-[11px] bg-red-100 px-1 rounded">backend/offerWaleBaba/.env</code> set{" "}
                    <code className="text-[11px] bg-red-100 px-1 rounded">SHIPROCKET_PICKUP_LOCATION</code> to your
                    Shiprocket pickup nickname (e.g. <code className="text-[11px] bg-red-100 px-1 rounded">work</code>),
                    save, restart the API, then use Ship again.
                  </p>
                )}
              </div>
            )}

            {showOpsAlert ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">{ops.opsStateLabel || "Shipment attention required"}</p>
                <p className="mt-1 text-xs leading-relaxed">{ops.nextStepMessage}</p>
                {ship.providerStatus ? (
                  <p className="mt-2 text-[11px] text-amber-800">Shiprocket status: {ship.providerStatus}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  {caps.retryPickup ? (
                    <button
                      type="button"
                      disabled={fulfillmentBusy}
                      title={blockReasons.retryPickup}
                      onClick={async () => {
                        setActionMsg(null);
                        try {
                          const r = await retryPickup(orderId).unwrap();
                          setActionMsg({
                            type: "ok",
                            surface: "ops",
                            text: r?.message || "Pickup retry submitted on Shiprocket.",
                          });
                          await refreshOrder();
                        } catch (e) {
                          setActionMsg({
                            type: "err",
                            surface: "ops",
                            text: fulfillmentActionErrorText(e, "Pickup retry failed."),
                          });
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-900 text-white hover:bg-amber-950 disabled:opacity-50"
                    >
                      {retryPickupState.isLoading ? "Working…" : "Retry pickup"}
                    </button>
                  ) : null}
                  {caps.openShiprocketSupport ? (
                    <button
                      type="button"
                      disabled={fulfillmentBusy}
                      onClick={() => {
                        void copySupportContext();
                        window.open(
                          resolveShiprocketSupportUrl(externalLinks),
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 bg-white hover:bg-amber-100/60"
                    >
                      Open Shiprocket support
                    </button>
                  ) : null}
                  {caps.syncShiprocket ? (
                    <button
                      type="button"
                      disabled={fulfillmentBusy}
                      onClick={async () => {
                        setActionMsg(null);
                        try {
                          const r = await syncShiprocket(orderId).unwrap();
                          setActionMsg({
                            type: "ok",
                            surface: "ops",
                            text: r?.message || "Updated from Shiprocket.",
                          });
                          await refreshOrder();
                        } catch (e) {
                          setActionMsg({
                            type: "err",
                            surface: "ops",
                            text: fulfillmentActionErrorText(e, "Sync failed."),
                          });
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 bg-white hover:bg-amber-100/60 disabled:opacity-50"
                    >
                      {syncShiprocketState.isLoading ? "Syncing…" : "Refresh Shiprocket"}
                    </button>
                  ) : null}
                  {caps.cancelShipment ? (
                    <button
                      type="button"
                      disabled={fulfillmentBusy}
                      title={blockReasons.cancelShipment}
                      onClick={() => {
                        void runCancelAndPrepareReship();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-800 bg-white hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel and ship again
                    </button>
                  ) : null}
                </div>
                <FulfillmentStatusBanner msg={actionMsg?.surface === "ops" ? actionMsg : null} />
              </div>
            ) : null}

            {fulfillmentActionsBlocked ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-800">Fulfilment actions unavailable</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Courier details above are read-only. Ship now, pickup, labels, and Shiprocket cancellation cannot be
                  used on a {labelOrderStatus(order.orderStatus).toLowerCase()} order.
                </p>
              </div>
            ) : (
              <>
              {(showStandardFulfillmentSteps || showReshipStepOnly) ? (
              <>
              <FulfillmentStepCard
                step={1}
                focusStep={fulfillmentFocusStep}
                done={step1Done}
                title="Step 1 · Create & assign"
              >
                {step1Done ? (
                  <p className="text-sm text-emerald-900">
                    <span className="font-semibold">{ship.courier || "Courier"}</span>
                    {hasCarrierAwb ? (
                      <>
                        {" "}
                        · AWB <span className="font-mono">{ship.awbCode || ship.trackingNumber}</span>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          fulfillmentBusy ||
                          Boolean(ship.awbCode || ship.trackingNumber) ||
                          !carrierPaymentReady ||
                          !caps.shipNow
                        }
                        title={blockReasons.shipNow || "Create on Shiprocket (if needed) and assign courier + AWB"}
                        onClick={async () => {
                          setActionMsg(null);
                          try {
                            const r = await ensureShipment(orderId).unwrap();
                            if (!r?.success) {
                              throw new Error(r?.message || "Shipment step failed.");
                            }
                            const si = r?.order?.shipmentInfo || {};
                            const sr = r?.shipment || {};
                            const awbFromResp = Boolean(
                              si.awbCode ||
                                si.trackingNumber ||
                                sr.awb_code ||
                                sr.awbCode ||
                                sr.tracking_number
                            );
                            let assignResult = null;
                            if (!awbFromResp) {
                              try {
                                assignResult = await assignShip({ orderId }).unwrap();
                              } catch (ae) {
                                if (ae?.data?.code === "AWB_ALREADY_ASSIGNED") {
                                  setActionMsg({
                                    type: "ok",
                                    text: "Shipment already has an AWB. Details will refresh shortly.",
                                  });
                                  return;
                                }
                                throw ae;
                              }
                            }
                            const siFinal = assignResult?.order?.shipmentInfo || si;
                            const srFinal = assignResult?.shipment || sr;
                            const awbDisp =
                              siFinal.awbCode ||
                              siFinal.trackingNumber ||
                              srFinal.awb_code ||
                              srFinal.awbCode ||
                              srFinal.tracking_number;
                            setActionMsg({
                              type: "ok",
                              surface: "ship",
                              text: awbDisp
                                ? `Courier booked. AWB / tracking: ${awbDisp}. Details refresh in a moment.`
                                : "Shipment updated. Details will refresh shortly.",
                            });
                            await refreshOrder();
                          } catch (e) {
                            setActionMsg({
                              type: "err",
                              surface: "ship",
                              text: fulfillmentActionErrorText(e, "Ship now failed."),
                            });
                          }
                        }}
                        className="px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {ensureState.isLoading || assignState.isLoading ? "Working…" : "Ship now"}
                      </button>
                    </div>
                    <FulfillmentStatusBanner msg={actionMsg?.surface === "ship" ? actionMsg : null} />
                  </>
                )}
              </FulfillmentStepCard>

              {showStandardFulfillmentSteps ? (
              <details className="group rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2">
                <summary className="text-xs font-semibold text-slate-800 cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▸</span>
                  Advanced — split steps (troubleshooting)
                </summary>
                <p className="text-[11px] text-slate-600 mt-2 mb-3 leading-relaxed max-w-xl">
                  <strong className="text-slate-800">Create on Shiprocket only</strong> pushes the order to Shiprocket
                  without assigning a courier or AWB (same as “ensure” / draft on their side).{" "}
                  <strong className="text-slate-800">Assign AWB only</strong> runs after a shipment id exists, if you
                  need to retry courier selection separately.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={fulfillmentBusy || !carrierPaymentReady}
                    title="Create forward order on Shiprocket only (no AWB)"
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        await ensureShipment(orderId).unwrap();
                        setActionMsg({ type: "ok", text: "Order pushed to Shiprocket (AWB not assigned yet)." });
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          text: fulfillmentActionErrorText(e, "Ensure failed."),
                        });
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    Create on Shiprocket only
                  </button>
                  <button
                    type="button"
                    disabled={
                      fulfillmentBusy ||
                      !carrierPaymentReady ||
                      !ship.shipmentId ||
                      Boolean(ship.awbCode || ship.trackingNumber)
                    }
                    title="Assign courier and generate AWB (shipment id required)"
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        await assignShip({ orderId }).unwrap();
                        setActionMsg({ type: "ok", text: "Courier assigned and AWB generated." });
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          text: fulfillmentActionErrorText(e, "Assign failed."),
                        });
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    Assign AWB only
                  </button>
                </div>
              </details>
              ) : null}
              </>
              ) : null}

              {showStandardFulfillmentSteps ? (
              <>
              <FulfillmentStepCard
                step={2}
                focusStep={fulfillmentFocusStep}
                done={step2Done}
                title="Step 2 · Pickup"
              >
                <p className="text-[11px] text-slate-500 mb-3 max-w-2xl leading-relaxed">
                  After AWB is assigned, schedule when the courier should collect the parcel.
                </p>
                {!pickupAlreadyScheduled && pickupUsesShiprocketRules ? (
                  <p className="text-[11px] text-slate-500 mb-2 max-w-xl">
                    Available dates follow your Shiprocket pickup schedule.
                  </p>
                ) : null}
                {!pickupAlreadyScheduled && caps.schedulePickup && pickupCalendarRes?.scheduleRulesMessage ? (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2 max-w-xl leading-relaxed">
                    {pickupCalendarRes.scheduleRulesMessage}
                  </p>
                ) : null}
                {pickupAlreadyScheduled ? (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 mb-2 max-w-xl">
                    Pickup booked on Shiprocket
                    {ship.pickupDate ? ` for ${ship.pickupDate}` : ""}. Continue with Step 3 below.
                  </p>
                ) : null}
                {!pickupAlreadyScheduled ? (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Pickup date</span>
                    {pickupUsesShiprocketRules && pickupAllowedDates.length > 0 ? (
                      <select
                        value={pickupAllowedDates.includes(pickupDate) ? pickupDate : pickupAllowedDates[0]}
                        onChange={(e) => setPickupDate(e.target.value)}
                        disabled={pickupAlreadyScheduled}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white min-w-[11rem]"
                      >
                        {pickupAllowedDates.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        disabled={pickupAlreadyScheduled}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white min-w-[9.5rem]"
                      />
                    )}
                  </label>
                  <button
                    type="button"
                    disabled={
                      fulfillmentBusy ||
                      !carrierPaymentReady ||
                      !(ship.awbCode || ship.trackingNumber) ||
                      !pickupDate ||
                      !caps.schedulePickup
                    }
                    title={blockReasons.schedulePickup}
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        const r = await schedulePickup({ orderId, pickupDate }).unwrap();
                        const fb = pickupScheduleFeedback({ response: r, selectedDate: pickupDate });
                        setActionMsg({
                          type: fb.type,
                          surface: "pickup",
                          text: fb.text,
                        });
                        await refreshOrder();
                        if (typeof onRefreshTracking === "function") await onRefreshTracking();
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          surface: "pickup",
                          text: fulfillmentActionErrorText(e, "Pickup schedule failed."),
                        });
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-indigo-300 text-indigo-800 rounded-lg bg-white hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {pickupState.isLoading ? "Working…" : "Schedule pickup"}
                  </button>
                </div>
                ) : null}
                {pickupAlreadyScheduled ? (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Courier pickup day
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      When the courier collects parcels (Shiprocket → Pickups → &quot;For …&quot; date).
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {ship.pickupDate || "—"}
                    </p>
                    {!ship.pickupDate && pickupAlreadyScheduled ? (
                      <p className="text-[10px] text-amber-700 mt-1">
                        Not in our DB yet — confirm on Shiprocket panel, then click Refresh from Shiprocket.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saved in our system</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      When we saved pickup on this order (timestamp — not the courier day).
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {formatDateHeader(ship.pickupScheduledAt) ||
                        (ship.manifestUrl ? "Yes (manifest on file)" : "—")}
                    </p>
                    {shiprocketMirrorStatus ? (
                      <p className="text-[10px] text-slate-500 mt-1">Shiprocket status: {shiprocketMirrorStatus}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={fulfillmentBusy || !carrierPaymentReady || !ship.shiprocketOrderId || !caps.syncShiprocket}
                  title={blockReasons.syncShiprocket}
                  onClick={async () => {
                    setActionMsg(null);
                    try {
                      const r = await syncShiprocket(orderId).unwrap();
                      setActionMsg({
                        type: "ok",
                        surface: "pickup",
                        text: r?.message || "Updated from Shiprocket.",
                      });
                      await refreshOrder();
                    } catch (e) {
                      setActionMsg({
                        type: "err",
                        surface: "pickup",
                        text: fulfillmentActionErrorText(e, "Sync failed."),
                      });
                    }
                  }}
                  className="mt-2 px-2.5 py-1 text-[11px] font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  {syncShiprocketState.isLoading ? "Syncing…" : "Refresh from Shiprocket"}
                </button>
                </>
                ) : null}
                {ship.lastPickupError && !pickupAlreadyScheduled ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold">Last pickup error</p>
                    <p className="mt-0.5">{ship.lastPickupError}</p>
                  </div>
                ) : null}
                <FulfillmentStatusBanner msg={actionMsg?.surface === "pickup" ? actionMsg : null} />
              </FulfillmentStepCard>

              <FulfillmentStepCard
                step={3}
                focusStep={fulfillmentFocusStep}
                done={step3Done}
                title="Step 3 · Manifest"
                id="admin-manifest-step"
              >
                <p className="text-[11px] text-slate-500 mb-2 max-w-xl leading-relaxed">
                  Same as Shiprocket panel — download manifest after pickup is scheduled.
                </p>
                {fulfillmentFocusStep === 3 && !step3Done ? (
                  <p className="text-xs font-semibold text-indigo-900 mb-2">{ops.nextStepMessage || primaryActionLabel}</p>
                ) : null}
                {ship.labelUrl && !hasManifest ? (
                  <p className="text-[10px] font-semibold text-emerald-700 mb-2">
                    Label already downloaded on Shiprocket — manifest is still required next.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {(caps.generateManifest || caps.downloadManifest) && fulfillmentFocusStep === 3 ? (
                    <button
                      type="button"
                      disabled={
                        fulfillmentBusy ||
                        !carrierPaymentReady ||
                        !hasCarrierAwb ||
                        !(caps.generateManifest || caps.downloadManifest)
                      }
                      title={blockReasons.generateManifest || blockReasons.downloadManifest}
                      onClick={async () => {
                        setActionMsg(null);
                        if (caps.downloadManifest) {
                          void downloadManifestFile();
                          return;
                        }
                        try {
                          const r = await fulfillmentManifest(orderId).unwrap();
                          const u = r?.manifestUrl;
                          setActionMsg({
                            type: "ok",
                            surface: "manifest",
                            text: u ? "Manifest ready on Shiprocket." : "Manifest generated on Shiprocket.",
                          });
                          if (u) window.open(u, "_blank", "noopener,noreferrer");
                          await refreshOrder();
                          if (typeof onRefreshTracking === "function") await onRefreshTracking();
                        } catch (e) {
                          setActionMsg({
                            type: "err",
                            surface: "manifest",
                            text: fulfillmentActionErrorText(e, "Manifest failed."),
                          });
                        }
                      }}
                      className="px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {manifestState.isLoading || manifestDownloadBusy
                        ? "Working…"
                        : caps.downloadManifest
                          ? "Download manifest (PDF)"
                          : "Download manifest"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={fulfillmentBusy || !carrierPaymentReady || !hasCarrierAwb || !caps.generateManifest}
                    title={blockReasons.generateManifest}
                    onClick={async () => {
                      setActionMsg(null);
                      try {
                        const r = await fulfillmentManifest(orderId).unwrap();
                        const u = r?.manifestUrl;
                        setActionMsg({
                          type: "ok",
                          surface: "manifest",
                          text: u ? "Manifest ready. Opening in a new tab." : "Manifest generated.",
                        });
                        if (u) window.open(u, "_blank", "noopener,noreferrer");
                        await refreshOrder();
                      } catch (e) {
                        setActionMsg({
                          type: "err",
                          surface: "manifest",
                          text: fulfillmentActionErrorText(e, "Manifest failed."),
                        });
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    {manifestState.isLoading ? "Working…" : "Open manifest"}
                  </button>
                  {!(fulfillmentFocusStep === 3 && caps.generateManifest) ? (
                  <button
                    type="button"
                    disabled={
                      fulfillmentBusy ||
                      manifestDownloadBusy ||
                      !carrierPaymentReady ||
                      !hasCarrierAwb ||
                      !caps.downloadManifest
                    }
                    title={blockReasons.downloadManifest}
                    onClick={downloadManifestFile}
                    className="px-3 py-2 text-xs font-semibold border border-slate-800 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {manifestDownloadBusy ? "Downloading…" : "Download manifest (PDF)"}
                  </button>
                  ) : null}
                </div>
                {ship.manifestUrl ? (
                  <p className="text-[11px] text-emerald-700 mt-2">Manifest URL saved on this order.</p>
                ) : null}
                <FulfillmentStatusBanner msg={actionMsg?.surface === "manifest" ? actionMsg : null} />
              </FulfillmentStepCard>

              <FulfillmentStepCard
                step={4}
                focusStep={fulfillmentFocusStep}
                done={Boolean(ship.labelUrl) && step3Done}
                title="Step 4 · Shipping label"
                id="admin-shipping-label-step"
              >
                <p className="text-[11px] text-slate-500 mb-2 max-w-xl leading-relaxed">
                  Courier AWB label from Shiprocket (parcel sticker). Not your GST tax invoice — use Invoice above for
                  tax invoice.
                </p>
                {ship.labelUrl && !step3Done ? (
                  <p className="text-[10px] font-semibold text-emerald-700 mb-2">
                    Label downloaded on Shiprocket — available after manifest step if needed again.
                  </p>
                ) : null}
                {fulfillmentFocusStep === 4 && caps.downloadLabel ? (
                  <p className="text-xs font-semibold text-indigo-900 mb-2">Next on Shiprocket: download shipping label.</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      fulfillmentBusy ||
                      labelDownloadBusy ||
                      !carrierPaymentReady ||
                      !hasCarrierAwb ||
                      !caps.downloadLabel
                    }
                    title={blockReasons.downloadLabel}
                    onClick={openShippingLabelInNewTab}
                    className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    {labelDownloadBusy ? "Working…" : "Open label"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      fulfillmentBusy ||
                      labelDownloadBusy ||
                      !carrierPaymentReady ||
                      !hasCarrierAwb ||
                      !caps.downloadLabel
                    }
                    title={blockReasons.downloadLabel}
                    onClick={downloadShippingLabelFile}
                    className="px-3 py-2 text-xs font-semibold border border-slate-800 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {labelDownloadBusy ? "Downloading…" : "Download label (PDF)"}
                  </button>
                </div>
                <FulfillmentStatusBanner msg={actionMsg?.surface === "label" ? actionMsg : null} />
              </FulfillmentStepCard>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700/80 mb-2">Shiprocket order</p>
                <button
                  type="button"
                  disabled={fulfillmentBusy || !ship.shiprocketOrderId || !caps.cancelShipment}
                  onClick={() => {
                    void runCancelAndPrepareReship();
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-red-200 text-red-700 rounded-lg bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelState.isLoading ? "Working…" : "Cancel on Shiprocket"}
                </button>
              </div>
              </>
              ) : null}
              </>
            )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Shipment tracking</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Live from Shiprocket + saved shipment events</p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshTracking}
                  disabled={Boolean(trackingLoading)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  {trackingLoading ? "Refreshing..." : "Refresh tracking"}
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Provider status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{carrierStatusDisplay || "—"}</p>
                    {carrierStatusSecondary && carrierStatusSecondary !== carrierStatusDisplay ? (
                      <p className="text-[10px] text-slate-500 mt-1">Shiprocket label: {carrierStatusSecondary}</p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Last synced</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{formatDateHeader(lastSyncedAt)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Tracking number</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{ship.trackingNumber || ship.awbCode || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Shipment id</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{ship.shipmentId || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-2">
                    <p className="text-slate-500">Shiprocket order ID</p>
                    <p className="font-mono text-[11px] font-semibold text-slate-900 mt-0.5 break-all">
                      {ship.shiprocketOrderId || "—"}
                    </p>
                  </div>
                </div>

                {trackingError?.data?.message && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Could not fetch live tracking: {trackingError.data.message}
                  </div>
                )}

                {lastSyncError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                    Last sync error: {lastSyncError}
                  </div>
                )}

                {carrierTimeline.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier timeline</p>
                    <div className="max-h-80 overflow-auto rounded-lg border border-slate-100">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                          <tr>
                            <th className="text-left px-3 py-2">Status</th>
                            <th className="text-left px-3 py-2">Time</th>
                            <th className="text-left px-3 py-2">Location</th>
                            <th className="text-left px-3 py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {carrierTimeline.map((event) => (
                            <tr key={event.id}>
                              <td className="px-3 py-2 text-slate-900 font-medium">{event.status || "—"}</td>
                              <td className="px-3 py-2 text-slate-600">{formatDateHeader(event.timestamp)}</td>
                              <td className="px-3 py-2 text-slate-600">{event.location || "—"}</td>
                              <td className="px-3 py-2 text-slate-600">{event.description || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No carrier timeline events yet.</p>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Items</h3>
                {weightSnap?.totalWeightKg != null && (
                  <div className="text-right text-xs space-y-0.5">
                    <p className="text-slate-600">
                      Total weight{" "}
                      <span className="font-semibold text-slate-900">{formatKg(weightSnap.totalWeightKg)}</span>
                    </p>
                    {packageDimsLabel && (
                      <p className="text-slate-600">
                        Total dimensions{" "}
                        <span className="font-semibold text-slate-900">{packageDimsLabel}</span>
                      </p>
                    )}
                    {packageDimWeightKg != null && (
                      <p className="text-slate-600">
                        Total dim weight{" "}
                        <span className="font-semibold text-slate-900">{formatKg(packageDimWeightKg)}</span>
                        <span className="text-slate-400 ml-1">(L×B×H÷5000)</span>
                      </p>
                    )}
                    {weightSourceCatalogFallback && (
                      <p className="text-amber-700 mt-0.5 text-[11px]">Estimated from current catalog (legacy order)</p>
                    )}
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((line, idx) => {
                  const name = line?.productId?.name || "Product";
                  const img = line?.thumbnailUrl || line?.productId?.images?.[0]?.url || line?.productId?.images?.[0];
                  const sku = line?.sku || "—";
                  const qty = line?.quantity ?? 0;
                  const lineTotal = Number(line?.lineTotal ?? line?.priceSnapshot?.total) || 0;
                  const weightRow = weightByVariantId.get(String(line?.variantId ?? ""));
                  const lineDimsLabel = weightRow ? formatPackageDims(weightRow) : null;
                  const unitDimWeightKg =
                    weightRow?.unitDimWeightKg != null
                      ? Number(weightRow.unitDimWeightKg)
                      : weightRow
                        ? dimWeightKgFromDims(weightRow)
                        : null;
                  const lineDimWeightKg =
                    weightRow?.lineDimWeightKg != null
                      ? Number(weightRow.lineDimWeightKg)
                      : unitDimWeightKg != null
                        ? Math.round(unitDimWeightKg * qty * 100) / 100
                        : null;
                  return (
                    <div key={idx} className="p-4 flex gap-4">
                      <div className="w-20 h-20 shrink-0 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">{name}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          SKU: <span className="font-mono">{sku}</span>
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>Qty: {qty}</span>
                            {weightRow && (
                              <span>
                                Weight: {formatKg(weightRow.unitWeightKg)} × {qty} ={" "}
                                <span className="font-semibold text-slate-800">{formatKg(weightRow.lineWeightKg)}</span>
                              </span>
                            )}
                          </div>
                          {lineDimsLabel && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>
                                Dimensions: <span className="font-medium text-slate-800">{lineDimsLabel}</span>
                              </span>
                              {unitDimWeightKg != null && (
                                <span>
                                  Dim weight: {formatKg(unitDimWeightKg)} × {qty} ={" "}
                                  <span className="font-semibold text-slate-800">{formatKg(lineDimWeightKg)}</span>
                                  <span className="text-slate-400 ml-1">(L×B×H÷5000)</span>
                                </span>
                              )}
                            </div>
                          )}
                          <div>
                            <span>Price: </span>
                            <span className="font-semibold text-slate-900">{formatInr(lineTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="px-4 py-4 bg-slate-50/50 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatInr(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & Others</span>
                  <span>{formatInr(order.tax)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span>
                    {Number(order.deliveryCharges) === 0 ? (
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    ) : (
                      formatInr(order.deliveryCharges)
                    )}
                  </span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount{coupon?.code ? ` (${coupon.code})` : ""}</span>
                    <span>−{formatInr(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand total</span>
                  <span>{formatInr(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 mb-4">
                Address & contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Name</p>
                  <p className="text-slate-900">{addr.fullName || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Phone</p>
                  <p className="text-slate-900">{addr.phone || order?.customer?.phone || "—"}</p>
                </div>
                {order?.customer?.email && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Email</p>
                    <p className="text-blue-600 font-medium">{order.customer.email}</p>
                  </div>
                )}
                {addr.landmark && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Landmark</p>
                    <p className="text-slate-700">{addr.landmark}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Delivery address</p>
                  <p className="text-slate-700 leading-relaxed">
                    {[addr.addressLine1, addr.addressLine2, addr.area, addr.city, addr.state, addr.postalCode, addr.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Payment</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Summary of how this order was paid, including any balance due and gateway references.
                </p>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">Payment status</span>
                  <span
                    className={`font-semibold text-right ${
                      String(order.paymentStatus || "").toLowerCase() === "paid" ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {labelPaymentStatus(order.paymentStatus)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">Method</span>
                  <span className="font-medium text-slate-900 text-right">{paymentMethodLabel(order)}</span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Order total (bill)</span>
                    <span className="font-semibold text-slate-900">{formatInr(order.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount paid</span>
                    <span className="font-semibold text-emerald-700">{formatInr(order.amountPaidInr)}</span>
                  </div>
                  {Number(order.balanceDueInr) > 0.01 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Balance due</span>
                      <span className="font-bold">{formatInr(order.balanceDueInr)}</span>
                    </div>
                  )}
                </div>
                {shouldShowOnlinePaymentHoldCountdown(order) && (
                  <div className="flex justify-between gap-2 text-amber-900 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-xs">Payment hold expires</span>
                    <span className="text-xs font-medium text-right">{formatDateHeader(order.paymentHoldExpiresAt)}</span>
                  </div>
                )}
                {pi.paidAt && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Paid at</span>
                    <span className="font-medium text-slate-900 text-right">{formatDateHeader(pi.paidAt)}</span>
                  </div>
                )}
                {showRazorpayIds && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gateway references</p>
                    {pi.razorpayOrderId && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Razorpay order</p>
                        <p className="font-mono text-[11px] text-slate-800 break-all">{pi.razorpayOrderId}</p>
                      </div>
                    )}
                    {pi.razorpayPaymentId && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Razorpay payment</p>
                        <p className="font-mono text-[11px] text-slate-800 break-all">{pi.razorpayPaymentId}</p>
                      </div>
                    )}
                    {pi.status && (
                      <p className="text-[11px] text-slate-500">
                        Gateway session: <span className="font-medium text-slate-700">{pi.status}</span>
                      </p>
                    )}
                  </div>
                )}
                {pi.cancelledAt && (
                  <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-xs text-red-900">
                    <p className="font-semibold">Cancelled</p>
                    <p>{formatDateHeader(pi.cancelledAt)}</p>
                    {pi.cancellationReason && <p className="mt-1 text-red-800">{pi.cancellationReason}</p>}
                  </div>
                )}
                {refundHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Refunds</p>
                    <ul className="space-y-2">
                      {refundHistory.map((r, i) => (
                        <li key={r.refundId || i} className="text-xs text-slate-700 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-2">
                          <div className="flex justify-between gap-2">
                            <span className="font-mono">{r.refundId || "—"}</span>
                            <span className="font-semibold">{formatInr(r.amountInr)}</span>
                          </div>
                          {r.status && <p className="text-slate-500 mt-0.5">{r.status}</p>}
                          {r.createdAt && <p className="text-slate-400 text-[10px]">{formatDateHeader(r.createdAt)}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick actions</p>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-100"
                >
                  <span aria-hidden>💬</span> WhatsApp customer
                </a>
              )}
              {showInvoiceAndLogistics ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50 border border-slate-200 disabled:opacity-50"
                  >
                    Open tax invoice
                  </button>
                  <button
                    type="button"
                    onClick={printTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50 border border-slate-200 disabled:opacity-50"
                  >
                    Print tax invoice
                  </button>
                  <button
                    type="button"
                    onClick={downloadTaxInvoice}
                    disabled={invoiceBusy || !orderId}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50 border border-slate-200 disabled:opacity-50"
                  >
                    Download tax invoice (.html)
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                  Tax invoice is available after admin confirms the order.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
              Additional settlement or partner links can be shown here when those integrations are enabled.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
