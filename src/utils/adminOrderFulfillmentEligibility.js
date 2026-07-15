/**
 * Admin list + bulk actions — keep in sync with backend shipment ops `actionPolicy`.
 * List rows expose `actionCapabilities` from GET /admin/orders; prefer those over heuristics.
 */

/**
 * @param {{ actionCapabilities?: Record<string, boolean> } | null | undefined} row
 * @param {string} key
 */
function rowActionEnabled(row, key) {
  const caps = row?.actionCapabilities;
  if (caps && typeof caps === "object" && key in caps) {
    return caps[key] === true;
  }
  return null;
}

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

/**
 * Bulk ship now — uses server-evaluated actionCapabilities when present.
 * @param {{ orderStatus?: string, hasAwb?: boolean, actionCapabilities?: Record<string, boolean> } | null | undefined} row
 */
export function canAdminBulkShipNowOrderRow(row) {
  if (!row) return false;
  const fromCaps = rowActionEnabled(row, "shipNow");
  if (fromCaps != null) return fromCaps;
  const st = String(row.orderStatus || "").toLowerCase();
  return st === "confirmed" && !row.hasAwb;
}

/**
 * Bulk schedule pickup.
 * @param {{ orderStatus?: string, hasAwb?: boolean, pickupScheduled?: boolean, actionCapabilities?: Record<string, boolean> } | null | undefined} row
 */
export function canAdminBulkSchedulePickupOrderRow(row) {
  if (!row) return false;
  const fromCaps = rowActionEnabled(row, "schedulePickup");
  if (fromCaps != null) return fromCaps;
  const st = String(row.orderStatus || "").toLowerCase();
  return (st === "confirmed" || st === "processing") && row.hasAwb && !row.pickupScheduled;
}

function isRowRtoBlocked(row) {
  const st = String(row?.orderStatus || "").toLowerCase();
  if (st === "rto") return true;
  const ps = String(row?.providerStatus || row?.shipmentInfo?.providerStatus || "");
  return /\brto\b/i.test(ps) || /return to origin/i.test(ps);
}

function isRowMoneyCaptured(row) {
  const pay = String(row?.paymentStatus || "").toLowerCase();
  return (pay === "paid" || pay === "partially_paid") && Number(row?.amountPaidInr || 0) > 0.01;
}

function isRowUnpaidTerminalBlocked(row) {
  const st = String(row?.orderStatus || "").toLowerCase();
  if (st !== "cancelled" && st !== "payment_failed") return false;
  return !isRowMoneyCaptured(row);
}

/**
 * Bulk manifest ZIP download.
 * @param {{ orderStatus?: string, hasAwb?: boolean, hasShipmentId?: boolean, actionCapabilities?: Record<string, boolean> } | null | undefined} row
 */
export function canAdminBulkDownloadManifestOrderRow(row) {
  if (!row) return false;
  if (isRowUnpaidTerminalBlocked(row) || isRowRtoBlocked(row)) return false;
  const fromCaps = rowActionEnabled(row, "downloadManifest");
  if (fromCaps != null) return fromCaps;
  return Boolean(row.hasShipmentId && row.hasAwb);
}

/**
 * Bulk shipping label ZIP download.
 * @param {{ orderStatus?: string, hasAwb?: boolean, hasShipmentId?: boolean, actionCapabilities?: Record<string, boolean> } | null | undefined} row
 */
export function canAdminBulkDownloadLabelOrderRow(row) {
  if (!row) return false;
  if (isRowUnpaidTerminalBlocked(row) || isRowRtoBlocked(row)) return false;
  const fromCaps = rowActionEnabled(row, "downloadLabel");
  if (fromCaps != null) return fromCaps;
  return Boolean(row.hasShipmentId && row.hasAwb);
}

/**
 * Bulk Refresh Shiprocket — sync status + backfill SRPID from pickup list.
 * @param {{ orderStatus?: string, hasAwb?: boolean, hasShipmentId?: boolean, hasShiprocketOrderId?: boolean, actionCapabilities?: Record<string, boolean> } | null | undefined} row
 */
export function canAdminBulkSyncShiprocketOrderRow(row) {
  if (!row) return false;
  if (isRowUnpaidTerminalBlocked(row) || isRowRtoBlocked(row)) return false;
  const fromCaps = rowActionEnabled(row, "syncShiprocket");
  if (fromCaps === true) return true;
  return Boolean(row.hasShiprocketOrderId || row.hasShipmentId || row.hasAwb);
}
