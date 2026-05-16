/**
 * INR display for cart, checkout, and orders — 2 decimal places (matches GST invoice / Razorpay).
 */
export function formatInr(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
