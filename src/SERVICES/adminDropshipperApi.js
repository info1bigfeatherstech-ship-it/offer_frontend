/**
 * Admin dropshipper product APIs — dedicated routes only.
 * Do NOT send dropship fields through /admin/products create/update.
 */
import axiosInstance from './axiosInstance';

const BASE = '/admin/dropshipper';

export async function setDropshipPrice({ slug, productCode, dropshipBase, enable = false }) {
  const res = await axiosInstance.patch(
    `${BASE}/products/${encodeURIComponent(slug)}/variants/${encodeURIComponent(productCode)}/price`,
    { dropshipBase: Number(dropshipBase), enable: enable === true }
  );
  return res.data;
}

export async function enableDropship({ slug, productCode, dropshipBase }) {
  const body = {};
  if (dropshipBase !== undefined && dropshipBase !== null && dropshipBase !== '') {
    body.dropshipBase = Number(dropshipBase);
  }
  const res = await axiosInstance.patch(
    `${BASE}/products/${encodeURIComponent(slug)}/variants/${encodeURIComponent(productCode)}/enable`,
    body
  );
  return res.data;
}

export async function disableDropship({ slug, productCode, clearPrice = false }) {
  const res = await axiosInstance.patch(
    `${BASE}/products/${encodeURIComponent(slug)}/variants/${encodeURIComponent(productCode)}/disable`,
    { clearPrice: clearPrice === true }
  );
  return res.data;
}

export async function bulkEnableDropship(items) {
  const res = await axiosInstance.post(`${BASE}/products/bulk-enable`, { items });
  return res.data;
}

export async function bulkSetDropshipPrice(items) {
  const res = await axiosInstance.post(`${BASE}/products/bulk-set-price`, { items });
  return res.data;
}

export async function listDropshipProducts(params = {}) {
  const res = await axiosInstance.get(`${BASE}/products`, { params });
  return res.data;
}

/** Map API variant summary → local form variant patch */
export function applyDropshipVariantToLocal(variantSummary) {
  if (!variantSummary) return {};
  const dropshipBase = variantSummary.dropshipBase;
  return {
    dropship: variantSummary.dropship === true,
    price: {
      dropshipBase:
        dropshipBase != null && Number(dropshipBase) > 0 ? String(dropshipBase) : '',
    },
    channelVisibility: {
      dropship: variantSummary.channelVisibility?.dropship || 'draft',
    },
  };
}

export function getDropshipStatusMeta(variant) {
  const base = Number(variant?.price?.dropshipBase);
  const hasPrice = Number.isFinite(base) && base > 0;
  const flagged = variant?.dropship === true || hasPrice;
  const listed = variant?.channelVisibility?.dropship === 'active' && hasPrice;

  if (listed) {
    return {
      key: 'active',
      label: 'Active',
      className: 'bg-teal-100 text-teal-800',
      priceLabel: hasPrice ? `₹${base}` : null,
    };
  }
  if (hasPrice || flagged) {
    return {
      key: 'draft',
      label: 'Priced (off)',
      className: 'bg-amber-100 text-amber-800',
      priceLabel: hasPrice ? `₹${base}` : null,
    };
  }
  return {
    key: 'off',
    label: 'Off',
    className: 'bg-gray-100 text-gray-500',
    priceLabel: null,
  };
}

/**
 * Parse optional dropship price for add/create flows.
 * Empty → null (skip). Invalid non-empty → { invalid: true }.
 */
export function parseOptionalDropshipBase(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { value: null, invalid: false };
  }
  const n = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) {
    return { value: null, invalid: true };
  }
  return { value: n, invalid: false };
}

/**
 * After product/variant exists: set dropship price if provided.
 * Never throws — returns result for toast/logging.
 */
export async function applyOptionalDropshipAfterSave({
  slug,
  productCode,
  dropshipBase,
  enable = false,
}) {
  const code = String(productCode || '').trim();
  const productSlug = String(slug || '').trim();
  if (!productSlug || !code) {
    return { applied: false, skipped: true, warning: null };
  }

  const parsed = parseOptionalDropshipBase(dropshipBase);
  if (parsed.invalid) {
    return {
      applied: false,
      skipped: true,
      warning: `Invalid dropship price for ${code} — skipped (product/variant was still saved)`,
    };
  }
  if (parsed.value == null) {
    return { applied: false, skipped: true, warning: null };
  }

  try {
    const data = await setDropshipPrice({
      slug: productSlug,
      productCode: code,
      dropshipBase: parsed.value,
      enable: enable === true,
    });
    return {
      applied: true,
      skipped: false,
      warning: null,
      productCode: code,
      variant: data?.variant || null,
    };
  } catch (err) {
    return {
      applied: false,
      skipped: false,
      warning:
        err?.response?.data?.message ||
        err?.message ||
        `Failed to set dropship for ${code}`,
      productCode: code,
      variant: null,
    };
  }
}

/**
 * Apply optional dropship intents from create-product form onto the created product.
 * formData.dropshipBase / dropshipEnable → primary variant
 * formData.variants[].pendingDropshipBase / pendingDropshipEnable → extras
 */
export async function applyPendingDropshipForCreatedProduct(product, formData) {
  const warnings = [];
  let appliedCount = 0;
  const slug = product?.slug;
  if (!slug) {
    return {
      appliedCount: 0,
      warnings: ['Product created but missing slug — dropship not applied'],
    };
  }

  const serverVariants = Array.isArray(product.variants) ? product.variants : [];
  const resolveCode = (preferred, fallback) =>
    String(preferred || fallback || '')
      .trim()
      .toUpperCase();

  // Primary (variants[0] / main ProductCode)
  const primaryCode = resolveCode(
    serverVariants[0]?.productCode,
    formData?.ProductCode
  );
  const primaryResult = await applyOptionalDropshipAfterSave({
    slug,
    productCode: primaryCode,
    dropshipBase: formData?.dropshipBase,
    enable: formData?.dropshipEnable === true,
  });
  if (primaryResult.applied) appliedCount += 1;
  if (primaryResult.warning) warnings.push(primaryResult.warning);

  // Extra variants from create form
  for (const v of formData?.variants || []) {
    const code = resolveCode(v.ProductCode || v.productCode, null);
    if (!code) continue;
    const base =
      v.pendingDropshipBase ??
      v.dropshipBase ??
      v.price?.dropshipBase ??
      '';
    const enable =
      v.pendingDropshipEnable === true || v.dropshipEnable === true;
    const result = await applyOptionalDropshipAfterSave({
      slug,
      productCode: code,
      dropshipBase: base,
      enable,
    });
    if (result.applied) appliedCount += 1;
    if (result.warning) warnings.push(result.warning);
  }

  return { appliedCount, warnings };
}

export function getProductDropshipStatusMeta(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) {
    return { key: 'off', label: 'Off', className: 'bg-gray-100 text-gray-500' };
  }
  if (product?.channelStatus?.dropship === 'active') {
    return { key: 'active', label: 'Active', className: 'bg-teal-100 text-teal-800' };
  }
  const anyActive = variants.some(
    (v) =>
      v?.channelVisibility?.dropship === 'active' &&
      Number(v?.price?.dropshipBase) > 0
  );
  if (anyActive) {
    return { key: 'active', label: 'Active', className: 'bg-teal-100 text-teal-800' };
  }
  const anyPriced = variants.some((v) => Number(v?.price?.dropshipBase) > 0);
  if (anyPriced || product?.channelStatus?.dropship === 'draft') {
    return { key: 'draft', label: 'Priced (off)', className: 'bg-amber-100 text-amber-800' };
  }
  return { key: 'off', label: 'Off', className: 'bg-gray-100 text-gray-500' };
}
