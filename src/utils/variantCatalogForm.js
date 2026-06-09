/**
 * Variant catalog helpers — primary variant (variants[0]) uses product-level fields.
 */

const toNum = (raw) => {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const emptyVariantShippingForm = () => ({
  weight: "",
  dimensions: { length: "", width: "", height: "" },
});

export function getPrimaryVariantId(product) {
  const first = product?.variants?.[0];
  return first?._id != null ? String(first._id) : null;
}

export function isPrimaryVariant(variant, product) {
  if (!variant) return true;
  const primaryId = getPrimaryVariantId(product);
  if (primaryId && variant._id != null) {
    return String(variant._id) === primaryId;
  }
  if (!Array.isArray(product?.variants) || product.variants.length === 0) return true;
  return product.variants[0] === variant;
}

export const shippingFormFromVariant = (variant, productShipping, product = null) => {
  if (product && isPrimaryVariant(variant, product)) {
    const ps = product.shipping ?? productShipping;
    return {
      weight: ps?.weight ?? "",
      dimensions: {
        length: ps?.dimensions?.length ?? "",
        width: ps?.dimensions?.width ?? "",
        height: ps?.dimensions?.height ?? "",
      },
    };
  }
  const vs = variant?.shipping;
  const hasVariantWeight = toNum(vs?.weight) != null;
  const source = hasVariantWeight ? vs : productShipping;
  return {
    weight: source?.weight ?? "",
    dimensions: {
      length: source?.dimensions?.length ?? "",
      width: source?.dimensions?.width ?? "",
      height: source?.dimensions?.height ?? "",
    },
  };
};

export const buildVariantCatalogApiPayload = ({ title, description, shipping } = {}) => {
  const payload = {};
  const t = String(title ?? "").trim();
  const d = String(description ?? "").trim();
  if (t) payload.title = t;
  if (d) payload.description = d;

  const weight = toNum(shipping?.weight);
  const length = toNum(shipping?.dimensions?.length);
  const width = toNum(shipping?.dimensions?.width);
  const height = toNum(shipping?.dimensions?.height);

  if (weight != null && length != null && width != null && height != null) {
    payload.shipping = {
      weight,
      dimensions: { length, width, height },
    };
  }

  return payload;
};

export const resolveVariantTitle = (variant, product) => {
  if (isPrimaryVariant(variant, product)) {
    return String(product?.title ?? product?.name ?? "").trim() || "Product";
  }
  const vt = String(variant?.title ?? "").trim();
  if (vt) return vt;
  return String(product?.title ?? product?.name ?? "").trim() || "Product";
};

export const resolveVariantDescription = (variant, product) => {
  if (isPrimaryVariant(variant, product)) {
    return String(product?.description ?? "").trim();
  }
  const vd = String(variant?.description ?? "").trim();
  if (vd) return vd;
  return String(product?.description ?? "").trim();
};

const hasCompleteVariantShipping = (variant) => {
  const vs = variant?.shipping;
  if (!vs) return false;
  return (
    toNum(vs.weight) != null &&
    toNum(vs.dimensions?.length) != null &&
    toNum(vs.dimensions?.width) != null &&
    toNum(vs.dimensions?.height) != null
  );
};

export const resolveVariantShipping = (variant, product) => {
  if (isPrimaryVariant(variant, product)) {
    const ps = product?.shipping;
    if (ps && toNum(ps.weight) != null) {
      return {
        weight: toNum(ps.weight),
        dimensions: {
          length: toNum(ps.dimensions?.length),
          width: toNum(ps.dimensions?.width),
          height: toNum(ps.dimensions?.height),
        },
      };
    }
    return null;
  }
  if (hasCompleteVariantShipping(variant)) {
    const vs = variant.shipping;
    return {
      weight: toNum(vs.weight),
      dimensions: {
        length: toNum(vs.dimensions?.length),
        width: toNum(vs.dimensions?.width),
        height: toNum(vs.dimensions?.height),
      },
    };
  }
  const ps = product?.shipping;
  if (ps && toNum(ps.weight) != null) {
    return {
      weight: toNum(ps.weight),
      dimensions: {
        length: toNum(ps.dimensions?.length),
        width: toNum(ps.dimensions?.width),
        height: toNum(ps.dimensions?.height),
      },
    };
  }
  return null;
};
