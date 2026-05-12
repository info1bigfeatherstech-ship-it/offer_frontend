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
 * Stable per-product placeholder star distribution.
 * Always returns an array ordered 5→1 with `pct` values that sum to exactly 100,
 * and 5★ is guaranteed the largest slice (1★ the smallest).
 *
 * Derived from the same hash seed as getFallbackDisplayRating, so the bars
 * stay stable across re-renders for a given product.
 *
 * @param {object|null|undefined} product
 * @returns {{ star: number, pct: number }[]}
 */
export function getFallbackDistribution(product) {
  const seed = product?.slug || product?._id || "product";
  const h = hashString(seed);

  // Pull 5 small positive numbers from different bit-slices of the seed.
  // Range 5..24 keeps every bar visible (no empty slivers).
  const raw = [
    5 + ((h >>> 0)  % 20),
    5 + ((h >>> 5)  % 20),
    5 + ((h >>> 10) % 20),
    5 + ((h >>> 15) % 20),
    5 + ((h >>> 20) % 20),
  ];

  // Sort descending so the biggest random pick lands on 5★, smallest on 1★.
  raw.sort((a, b) => b - a);

  // Top-heavy multipliers shape this like a real review histogram while
  // preserving 5★ ≥ 4★ ≥ 3★ ≥ 2★ ≥ 1★ ordering (multipliers are non-increasing
  // and raw is sorted descending, so the product sequence is non-increasing).
  const weights = [
    raw[0] * 6,
    raw[1] * 3,
    raw[2] * 2,
    raw[3] * 1,
    raw[4] * 1,
  ];

  const sum = weights.reduce((a, b) => a + b, 0);
  const pcts = weights.map((w) => Math.floor((w / sum) * 100));

  // Absorb floor-rounding drift into the largest bucket so the total is
  // exactly 100 and 5★ stays the largest slice.
  pcts[0] += 100 - pcts.reduce((a, b) => a + b, 0);

  return [5, 4, 3, 2, 1].map((star, i) => ({ star, pct: pcts[i] }));
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
