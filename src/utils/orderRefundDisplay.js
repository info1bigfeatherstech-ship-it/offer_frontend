const CANCELLATION_REFUND_STATUSES = new Set([
  "refund_pending",
  "refunded",
  "refund_failed",
  "refund_unavailable",
  "not_required",
]);

const PRODUCT_RETURN_STATUSES = new Set([
  "requested",
  "approved",
  "rejected",
  "received",
  "refund_pending",
  "refunded",
  "refund_failed",
  "qc_passed",
  "closed",
]);

/** Admin/user cancelled order — refund tracked separately from product returns. */
export function isCancellationRefundOrder(order) {
  if (!order) return false;
  const orderSt = String(order.orderStatus || "").toLowerCase();
  if (orderSt !== "cancelled") return false;

  const ri = order.returnInfo || {};
  if (ri.refundContext === "cancellation") return true;
  if (ri.refundContext === "product_return") return false;

  const st = String(ri.status || "").toLowerCase();
  if (CANCELLATION_REFUND_STATUSES.has(st) && !ri.reasonType) return true;

  const ps = String(order.paymentStatus || "").toLowerCase();
  return ["refunded", "partially_refunded"].includes(ps);
}

/** Post-delivery return flow (user raised return with proofs). */
export function isProductReturnOrder(order) {
  if (!order || isCancellationRefundOrder(order)) return false;
  const orderSt = String(order.orderStatus || "").toLowerCase();
  if (orderSt === "return_requested") return true;

  const ri = order.returnInfo || {};
  if (ri.refundContext === "product_return") return true;
  if (ri.reasonType) return true;

  const st = String(ri.status || "").toLowerCase();
  return PRODUCT_RETURN_STATUSES.has(st);
}

export function cancellationRefundHeadline(order) {
  const st = String(order?.returnInfo?.status || "").toLowerCase();
  const ps = String(order?.paymentStatus || "").toLowerCase();

  if (st === "refunded" || ps === "refunded") {
    return "Payment refunded";
  }
  if (st === "refund_pending" || ps === "partially_refunded") {
    return "Refund processing";
  }
  if (st === "refund_failed") {
    return "Refund failed";
  }
  if (st === "refund_unavailable") {
    return "Refund unavailable";
  }
  if (st === "not_required") {
    return "No online refund needed";
  }
  return "Order cancelled";
}

export function cancellationRefundDetail(order) {
  const st = String(order?.returnInfo?.status || "").toLowerCase();
  const ps = String(order?.paymentStatus || "").toLowerCase();
  const method = String(order?.paymentInfo?.method || "").toLowerCase();
  const amount = order?.returnInfo?.refundAmount ?? order?.totalAmount;

  if (st === "refunded" || ps === "refunded") {
    return method === "online"
      ? `Your online payment has been refunded${amount != null ? ` (${amount} INR)` : ""}. It may take 5–7 business days to reflect in your bank/UPI.`
      : "This order was cancelled. No return pickup applies.";
  }
  if (st === "refund_pending") {
    return "Refund to your original payment method is in progress.";
  }
  if (st === "refund_failed") {
    return "We could not complete the automatic refund. Please contact support with your order ID.";
  }
  if (st === "refund_unavailable") {
    return "Automatic refund could not be started. Support may process it manually.";
  }
  if (st === "not_required") {
    return method === "cod"
      ? "COD order was cancelled before delivery — no payment was collected online."
      : "No online payment was captured for this order.";
  }
  return "This order was cancelled by the store before shipment.";
}

export function productReturnStatusLabel(status) {
  const st = String(status || "").toLowerCase();
  const map = {
    requested: "Return requested",
    approved: "Return approved",
    rejected: "Return rejected",
    received: "Item received at warehouse",
    refund_pending: "Refund processing",
    refunded: "Refunded",
    refund_failed: "Refund failed",
    qc_passed: "Quality check passed",
    closed: "Closed",
  };
  return map[st] || st.replace(/_/g, " ");
}
