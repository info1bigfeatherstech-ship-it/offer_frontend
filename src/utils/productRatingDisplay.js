/**
 * Storefront rating display: real aggregates when available; otherwise a stable
 * per-product placeholder (from slug/_id) so the number does not flicker on re-render.
 */

function hashString(s) {
  const str = String(s || "");
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

export function getFallbackDisplayRating(product) {
  const seed = product?.slug || product?._id || "product";
  const h = hashString(seed);
  const value = Math.round((3.5 + (h % 131) / 100) * 10) / 10;
  const count = 12 + (h % 189);
  return { value, count };
}

/**
 * @param {object|null|undefined} product
 * @param {{ averageRating?: number|null, reviewCount?: number|null }|null|undefined} reviewSummary — PDP only; omit on cards
 * @returns {{ average: number, count: number, isPlaceholder: boolean }}
 */
export function getProductRatingDisplay(product, reviewSummary = null) {
  if (!product) {
    return { average: 4.2, count: 48, isPlaceholder: true };
  }

  const countRaw =
    reviewSummary?.reviewCount ?? product?.rating?.count ?? 0;
  const avgRaw =
    reviewSummary?.averageRating ?? product?.rating?.value ?? null;

  const count = Number(countRaw) || 0;
  const avg =
    avgRaw != null && avgRaw !== ""
      ? Number(avgRaw)
      : null;

  const hasReal = count > 0 && avg != null && !Number.isNaN(avg);

  if (hasReal) {
    return { average: avg, count, isPlaceholder: false };
  }

  const fb = getFallbackDisplayRating(product);
  return { average: fb.value, count: fb.count, isPlaceholder: true };
}
