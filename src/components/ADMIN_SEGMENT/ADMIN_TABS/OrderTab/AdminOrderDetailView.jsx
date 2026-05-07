import React, { useMemo } from "react";

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
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

/**
 * Rich admin order detail — data-driven from GET /orders/items/:orderId (staff sees customer + SKUs).
 */
export default function AdminOrderDetailView({
  order,
  tracking,
  trackingLoading,
  trackingError,
  onRefreshTracking,
  loading,
  error,
  onBack,
}) {
  const addr = order?.addressSnapshot || {};
  const ship = order?.shipmentInfo || {};
  const coupon = order?.appliedCoupon;

  const waLink = useMemo(() => {
    const raw = String(addr.phone || order?.customer?.phone || "").replace(/\D/g, "");
    const last10 = raw.slice(-10);
    if (last10.length !== 10) return null;
    return `https://wa.me/91${last10}`;
  }, [addr.phone, order?.customer?.phone]);

  if (loading) {
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
  const pi = order.paymentInfo && typeof order.paymentInfo === "object" ? order.paymentInfo : {};
  const refundHistory = Array.isArray(order.refundHistory) ? order.refundHistory : [];
  const showRazorpayIds =
    String(pi.method || "").toLowerCase() === "online" ||
    (String(order.paymentStatus || "") === "paid" && (pi.razorpayOrderId || pi.razorpayPaymentId));
  const providerStatus = tracking?.providerStatus || ship?.providerStatus || null;
  const lastSyncedAt = tracking?.lastSyncedAt || ship?.lastSyncAt || null;
  const lastSyncError = ship?.lastError || null;
  const trackingTimeline = timelineRowsFromTracking(tracking);
  const carrierTimeline =
    trackingTimeline.length > 0
      ? trackingTimeline
      : normalizeTrackingEvents(ship?.rawEvents);

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

        {/* Shipment strip */}
        {(ship.trackingNumber || ship.courier || providerStatus) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipment</p>
              <p className="text-sm font-semibold text-slate-900">
                {ship.courier || "Courier"} {ship.trackingNumber ? `· ${ship.trackingNumber}` : ""}
              </p>
              {providerStatus && (
                <p className="text-xs text-blue-700 mt-1">
                  Carrier status: <span className="font-semibold">{providerStatus}</span>
                </p>
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
                    <p className="font-semibold text-slate-900 mt-0.5">{providerStatus || "—"}</p>
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
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Items</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((line, idx) => {
                  const name = line?.productId?.name || "Product";
                  const img = line?.thumbnailUrl || line?.productId?.images?.[0]?.url || line?.productId?.images?.[0];
                  const sku = line?.sku || "—";
                  const qty = line?.quantity ?? 0;
                  const lineTotal = Number(line?.lineTotal ?? line?.priceSnapshot?.total) || 0;
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
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                          <span>Qty: {qty}</span>
                          <span className="font-semibold text-slate-900">{formatInr(lineTotal)}</span>
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
                  <span>Tax (GST)</span>
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
                  Same as stored on the order:{" "}
                  <span className="font-mono text-[10px]">paymentStatus</span>,{" "}
                  <span className="font-mono text-[10px]">amountPaidInr</span>,{" "}
                  <span className="font-mono text-[10px]">balanceDueInr</span>,{" "}
                  <span className="font-mono text-[10px]">paymentHoldExpiresAt</span>,{" "}
                  <span className="font-mono text-[10px]">refundHistory</span>,{" "}
                  <span className="font-mono text-[10px]">paymentInfo</span>.
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
                {order.paymentHoldExpiresAt && (
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
                        Session status: <span className="font-mono">{pi.status}</span>
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
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 cursor-not-allowed border border-dashed border-slate-200"
                disabled
                title="Configure shipping provider integration"
              >
                Generate shipping label
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
              Settlement fees, payment gateway IDs, and carrier partner links can be wired when those integrations are
              enabled. This view uses your live order, items, address snapshot, and shipment fields.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
