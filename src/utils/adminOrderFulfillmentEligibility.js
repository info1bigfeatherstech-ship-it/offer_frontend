/**
 * Admin list + bulk actions — keep in sync with backend `evaluateOrderPaymentForShiprocketFulfillment`.
 * List rows expose `canConfirmForFulfillment` from GET /admin/orders; use these helpers for bulk UI.
 */

/**
 * @param {{ orderStatus?: string } | null | undefined} row
 */
export function isAdminOrderRowPending(row) {
  return String(row?.orderStatus || "").toLowerCase() === "pending";
}

/**
 * Bulk confirm: pending and server-evaluated payment gate (same as order detail Confirm).
 * @param {{ orderStatus?: string, canConfirmForFulfillment?: boolean } | null | undefined} row
 */
export function canAdminBulkConfirmOrderRow(row) {
  if (!isAdminOrderRowPending(row)) return false;
  return row?.canConfirmForFulfillment === true;
}

/**
 * Bulk cancel: any pending order (payment not required).
 * @param {{ orderStatus?: string } | null | undefined} row
 */
export function canAdminBulkCancelOrderRow(row) {
  return isAdminOrderRowPending(row);
}
