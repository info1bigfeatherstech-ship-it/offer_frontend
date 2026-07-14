/**
 * Storefront rating display.
 *
 * Always keeps a stable per-product placeholder (hash of slug/_id) as social-proof base.
 * When real published reviews exist, they are ADDED on top — never replace the base:
 *   displayCount = baseCount + realCount
 *   displayAvg   = weighted average of base + real
 *
 * Placeholder numbers stay stable across re-renders for a given product.
 */

function hashString(s) {
  const str = String(s || "");
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

function clampAvg(n) {
  if (!Number.isFinite(n)) return 4.2;
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
}

function parseRealRating(product, reviewSummary) {
  const countRaw =
    reviewSummary?.reviewCount ?? product?.rating?.count ?? 0;
  const avgRaw =
    reviewSummary?.averageRating ?? product?.rating?.value ?? null;

  const count = Math.max(0, Math.floor(Number(countRaw) || 0));
  const avg =
    avgRaw != null && avgRaw !== ""
      ? Number(avgRaw)
      : null;

  const hasReal =
    count > 0 && avg != null && Number.isFinite(avg) && !Number.isNaN(avg);

  return {
    hasReal,
    count: hasReal ? count : 0,
    average: hasReal ? clampAvg(avg) : null,
  };
}

export function getFallbackDisplayRating(product) {
  const seed = product?.slug || product?._id || "product";
  const h = hashString(seed);
  const value = clampAvg(3.5 + (h % 131) / 100);
  const count = 12 + (h % 189);
  return { value, count };
}

/**
 * Stable per-product placeholder star distribution (pcts sum to 100, 5★ heaviest).
 * @param {object|null|undefined} product
 * @returns {{ star: number, pct: number }[]}
 */
export function getFallbackDistribution(product) {
  const seed = product?.slug || product?._id || "product";
  const h = hashString(seed);

  const raw = [
    5 + ((h >>> 0) % 20),
    5 + ((h >>> 5) % 20),
    5 + ((h >>> 10) % 20),
    5 + ((h >>> 15) % 20),
    5 + ((h >>> 20) % 20),
  ];

  raw.sort((a, b) => b - a);

  const weights = [
    raw[0] * 6,
    raw[1] * 3,
    raw[2] * 2,
    raw[3] * 1,
    raw[4] * 1,
  ];

  const sum = weights.reduce((a, b) => a + b, 0);
  const pcts = weights.map((w) => Math.floor((w / sum) * 100));
  pcts[0] += 100 - pcts.reduce((a, b) => a + b, 0);

  return [5, 4, 3, 2, 1].map((star, i) => ({ star, pct: pcts[i] }));
}

/**
 * Convert placeholder % bars into synthetic counts for blending with real reviews.
 * @param {object|null|undefined} product
 * @returns {{ star: number, count: number }[]}
 */
export function getFallbackStarCounts(product) {
  const fb = getFallbackDisplayRating(product);
  const dist = getFallbackDistribution(product);
  const baseCount = Math.max(1, fb.count);

  // Allocate from largest star down; put remainder on 5★ so total matches baseCount.
  let allocated = 0;
  const rows = dist.map(({ star, pct }, idx) => {
    if (idx === 0) return { star, count: 0 }; // fill later
    const c = Math.max(0, Math.floor((pct / 100) * baseCount));
    allocated += c;
    return { star, count: c };
  });
  rows[0].count = Math.max(0, baseCount - allocated);
  return rows;
}

/**
 * Blend placeholder histogram with real published review ratings.
 * @param {object|null|undefined} product
 * @param {Array<{ rating?: number }>|null|undefined} realReviews
 * @returns {{ star: number, count: number, pct: number }[]}
 */
export function getBlendedStarDistribution(product, realReviews = []) {
  const base = getFallbackStarCounts(product);
  const byStar = new Map(base.map((r) => [r.star, r.count]));

  const list = Array.isArray(realReviews) ? realReviews : [];
  for (const r of list) {
    const star = Math.round(Number(r?.rating));
    if (star >= 1 && star <= 5) {
      byStar.set(star, (byStar.get(star) || 0) + 1);
    }
  }

  const total = [5, 4, 3, 2, 1].reduce((s, star) => s + (byStar.get(star) || 0), 0);
  if (total <= 0) {
    return getFallbackDistribution(product).map(({ star, pct }) => ({
      star,
      count: 0,
      pct,
    }));
  }

  const pcts = [5, 4, 3, 2, 1].map((star) => {
    const count = byStar.get(star) || 0;
    return { star, count, pct: Math.floor((count / total) * 100) };
  });
  // Absorb rounding drift into largest bucket (always 5★ after blend should stay big)
  const drift = 100 - pcts.reduce((s, r) => s + r.pct, 0);
  pcts[0].pct += drift;
  return pcts;
}

/**
 * @param {object|null|undefined} product
 * @param {{ averageRating?: number|null, reviewCount?: number|null }|null|undefined} reviewSummary
 * @returns {{
 *   average: number,
 *   count: number,
 *   isPlaceholder: boolean,
 *   isBlended: boolean,
 *   realCount: number,
 *   baseCount: number
 * }}
 */
export function getProductRatingDisplay(product, reviewSummary = null) {
  if (!product) {
    return {
      average: 4.2,
      count: 48,
      isPlaceholder: true,
      isBlended: false,
      realCount: 0,
      baseCount: 48,
    };
  }

  const fb = getFallbackDisplayRating(product);
  const real = parseRealRating(product, reviewSummary);

  if (!real.hasReal) {
    return {
      average: fb.value,
      count: fb.count,
      isPlaceholder: true,
      isBlended: false,
      realCount: 0,
      baseCount: fb.count,
    };
  }

  const baseCount = fb.count;
  const realCount = real.count;
  const totalCount = baseCount + realCount;
  const blendedAvg = clampAvg(
    (fb.value * baseCount + real.average * realCount) / totalCount
  );

  return {
    average: blendedAvg,
    count: totalCount,
    isPlaceholder: false,
    isBlended: true,
    realCount,
    baseCount,
  };
}
