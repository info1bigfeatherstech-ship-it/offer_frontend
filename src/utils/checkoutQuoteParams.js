/**
 * Maps checkout payment UI state to /checkout/quote + /checkout/confirm fields.
 * Quote must be built with the same pricing mode that will be confirmed at place-order.
 */

export function quoteParamsForPaymentSelection({
  paymentMethod = null,
  paymentPlan = "full",
  balanceCollection = "online",
} = {}) {
  if (paymentMethod === "cod") {
    return { paymentHint: "cod", plan: "full", balance: "online" };
  }
  if (
    paymentMethod === "online" &&
    paymentPlan === "advance" &&
    balanceCollection === "cod"
  ) {
    return { paymentHint: "online", plan: "advance", balance: "cod" };
  }
  return { paymentHint: "online", plan: "full", balance: "online" };
}
