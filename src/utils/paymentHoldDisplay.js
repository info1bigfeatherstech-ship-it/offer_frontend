/**
 * Checkout creates `paymentHoldExpiresAt` for unpaid-online orders — deadline before cron voids unpaid.
 * Backend clears this after Razorpay capture; callers here guard UI when stale data survives (older orders / edge cases).
 */

/**
 * @param {{ paymentHoldExpiresAt?: string | Date | null, paymentStatus?: string, paymentInfo?: { method?: string }, amountPaidInr?: number, orderStatus?: string } | null | undefined} order
 * @returns {boolean}
 */
export function shouldShowOnlinePaymentHoldCountdown(order) {
  if (!order?.paymentHoldExpiresAt) return false;
  if (String(order.paymentInfo?.method || "").toLowerCase() !== "online") return false;

  const ps = String(order.paymentStatus || "").toLowerCase();
  if (ps === "paid" || ps === "partially_paid") return false;
  if (["failed", "refunded", "partially_refunded"].includes(ps)) return false;
  if (Number(order.amountPaidInr ?? 0) > 0.01) return false;

  const os = String(order.orderStatus || "").toLowerCase();
  if (["cancelled", "payment_failed"].includes(os)) return false;

  return ps === "pending" || ps === "initiated";
}
