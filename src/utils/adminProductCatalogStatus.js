/**
 * Admin product/variant lifecycle — keep in sync with backend storefrontCatalog.js read rules.
 */

export function getEffectiveEcommStatus(product) {
  const direct = product?.channelStatus?.ecomm;
  if (direct === "active" || direct === "draft" || direct === "archived") return direct;
  const legacy = product?.status;
  if (legacy === "active" || legacy === "draft" || legacy === "archived") return legacy;
  return "draft";
}

export function getEffectiveVariantEcommStatus(variant) {
  const direct = variant?.channelVisibility?.ecomm;
  if (direct === "active" || direct === "draft" || direct === "archived") return direct;
  return variant?.isActive === false ? "draft" : "active";
}

export function ecommStatusAdminLabel(status) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Inactive";
}
