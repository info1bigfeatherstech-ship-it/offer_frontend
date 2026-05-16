/** Money helpers for checkout “MRP → sale discount → coupon” display (totals still come from the server quote). */

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function saleWindowOk(ps, now) {
  const saleStart = ps.saleStartDate ? new Date(ps.saleStartDate) : null;
  const saleEnd = ps.saleEndDate ? new Date(ps.saleEndDate) : null;
  return (
    (!saleStart || Number.isNaN(saleStart.getTime()) || now >= saleStart) &&
    (!saleEnd || Number.isNaN(saleEnd.getTime()) || now <= saleEnd)
  );
}

/** Cart GET formats lines with `product` + `price` { base, sale, current, isSaleActive }; DB lines may use `priceSnapshot` only. */
function getResolvedVariant(item) {
  const vid = String(item?.variantId || "");
  const prod =
    item?.product ||
    (item?.productId && typeof item.productId === "object" && (item.productId.variants || item.productId.title)
      ? item.productId
      : null);
  if (!prod?.variants?.length) return null;
  return prod.variants.find((x) => String(x._id) === vid) || prod.variants[0];
}

/**
 * Per-unit selling price from cart line (matches cart model: sale if valid & < base).
 * @param {object} item — cart line with optional priceSnapshot
 * @param {Date} [now]
 * @returns {number}
 */
export function getCartLineUnitPay(item, now = new Date()) {
  const ip = item?.price;
  if (ip && (Number.isFinite(Number(ip.current)) || Number.isFinite(Number(ip.base)))) {
    const cur = Number(ip.current);
    if (Number.isFinite(cur) && cur >= 0) return round2(cur);
    const b = Number(ip.base);
    const s = ip.sale != null ? Number(ip.sale) : NaN;
    if (ip.isSaleActive && Number.isFinite(s) && Number.isFinite(b) && b > 0 && s < b) return round2(s);
    if (Number.isFinite(b) && b > 0) return round2(b);
    if (Number.isFinite(s) && s > 0) return round2(s);
  }

  const ps = item?.priceSnapshot || {};
  const base = Number(ps.base);
  const saleRaw = ps.sale != null ? Number(ps.sale) : NaN;
  const saleDatesOk = saleWindowOk(ps, now);
  const saleOk =
    Number.isFinite(saleRaw) &&
    Number.isFinite(base) &&
    base > 0 &&
    saleRaw < base &&
    saleDatesOk;
  if (saleOk) return round2(saleRaw);
  if (Number.isFinite(base) && base > 0) return round2(base);
  if (Number.isFinite(saleRaw) && saleRaw > 0) return round2(saleRaw);

  const v = getResolvedVariant(item);
  const pb = Number(v?.price?.base);
  const psa = v?.price?.sale != null ? Number(v.price.sale) : NaN;
  if (Number.isFinite(psa) && Number.isFinite(pb) && pb > 0 && psa < pb) return round2(psa);
  if (Number.isFinite(pb) && pb > 0) return round2(pb);
  const fallback = Number(item?.price?.sale ?? item?.price?.base);
  return Number.isFinite(fallback) ? round2(fallback) : 0;
}

/**
 * Per-unit MRP (list) for display — base from snapshot, API `price`, or variant; never collapse to sale before checking base.
 */
export function getCartLineUnitMrp(item, now = new Date()) {
  const ipb = Number(item?.price?.base);
  if (Number.isFinite(ipb) && ipb > 0) return round2(ipb);

  const ps = item?.priceSnapshot || {};
  const base = Number(ps.base);
  if (Number.isFinite(base) && base > 0) return round2(base);

  const v = getResolvedVariant(item);
  const vb = Number(v?.price?.base);
  if (Number.isFinite(vb) && vb > 0) return round2(vb);

  return getCartLineUnitPay(item, now);
}

/**
 * Aggregate MRP and catalog (base→sale) discount from cart lines; reconcile to quote.itemsSubtotal when needed.
 * @param {Array<object>} cartItems
 * @param {object} quote — checkout quote (itemsSubtotal, promotionDiscount, …)
 */
export function computeCheckoutPsychologyPricing(cartItems, quote) {
  const itemsSubtotal = round2(quote?.itemsSubtotal ?? 0);
  const promotionDiscount = round2(quote?.promotionDiscount ?? 0);
  const now = new Date();

  let mrpTotal = 0;
  let saleWeighted = 0;

  for (const item of cartItems || []) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    if (!qty) continue;
    const unitMrp = getCartLineUnitMrp(item, now);
    const unitPay = getCartLineUnitPay(item, now);
    mrpTotal = round2(mrpTotal + unitMrp * qty);
    saleWeighted = round2(saleWeighted + unitPay * qty);
  }

  if (!(mrpTotal > 0) && itemsSubtotal > 0) {
    mrpTotal = itemsSubtotal;
  }

  let catalogDiscount = Math.max(0, round2(mrpTotal - saleWeighted));
  if (itemsSubtotal > 0) {
    const drift = Math.abs(saleWeighted - itemsSubtotal);
    if (drift > 0.05) {
      catalogDiscount = Math.max(0, round2(mrpTotal - itemsSubtotal));
    }
  }

  if (mrpTotal + 0.05 < itemsSubtotal) {
    mrpTotal = itemsSubtotal;
    catalogDiscount = 0;
  }

  return {
    mrpTotal: round2(mrpTotal),
    catalogDiscount: round2(catalogDiscount),
    itemsSubtotal,
    promotionDiscount,
    couponApplied: quote?.couponApplied ? String(quote.couponApplied) : null,
  };
}

/** Total customer savings shown in the cart summary green strip (catalog + coupon). */
export function computeCheckoutTotalSavings(psych, quote) {
  const catalog = round2(psych?.catalogDiscount ?? 0);
  const coupon = round2(quote?.promotionDiscount ?? 0);
  return round2(catalog + coupon);
}

/**
 * Extra amount customer pays on full COD vs same cart/address online full quote.
 * Used for COD nudge popup and “Pay online” savings badge.
 */
export function computeCodVsOnlineSavings(codPayable, onlinePayable) {
  const cod = Number(codPayable);
  const online = Number(onlinePayable);
  if (!Number.isFinite(cod) || !Number.isFinite(online)) return 0;
  return round2(Math.max(0, cod - online));
}
