/** Shared order shipping snapshot display helpers (user + admin). */

export function formatKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} kg`;
}

export function formatPackageDims(dims) {
  if (!dims || typeof dims !== "object") return null;
  const l = Number(dims.lengthCm ?? dims.length);
  const w = Number(dims.widthCm ?? dims.width);
  const h = Number(dims.heightCm ?? dims.height);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return `${l} × ${w} × ${h} cm`;
}

export function dimWeightKgFromDims(dims) {
  if (!dims || typeof dims !== "object") return null;
  const l = Number(dims.lengthCm ?? dims.length);
  const w = Number(dims.widthCm ?? dims.width);
  const h = Number(dims.heightCm ?? dims.height);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return Math.round(((l * w * h) / 5000) * 100) / 100;
}

export function buildWeightByVariantId(snapshot) {
  const map = new Map();
  for (const row of snapshot?.lines || []) {
    if (row?.variantId != null) {
      map.set(String(row.variantId), row);
    }
  }
  return map;
}
