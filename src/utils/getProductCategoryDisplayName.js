/**
 * Resolve a storefront category label from `product.category` (any API shape)
 * plus the Redux category list (same role as admin ProductsTab helpers).
 *
 * Handles: populated `{ name, _id }`, plain `{ _id }`, string ObjectId, string name.
 *
 * @param {unknown} productCategory - `product.category` from API
 * @param {Array<{ _id?: unknown, name?: string }>} categoriesList - e.g. `state.categories.categories`
 * @param {{ fallback?: string }} [opts]
 * @returns {string}
 */
export function getProductCategoryDisplayName(
  productCategory,
  categoriesList = [],
  opts = {}
) {
  const fallback = opts.fallback ?? 'Uncategorized';
  const list = Array.isArray(categoriesList) ? categoriesList : [];

  if (productCategory == null || productCategory === '') {
    return fallback;
  }

  if (typeof productCategory === 'object') {
    const name =
      typeof productCategory.name === 'string' ? productCategory.name.trim() : '';
    if (name) return name;

    const rawId = productCategory._id ?? productCategory.id;
    if (rawId != null && String(rawId).trim() !== '') {
      const idStr = String(rawId);
      const found = list.find(
        (c) =>
          c != null &&
          (String(c._id) === idStr ||
            (c._id != null && String(c._id.toString?.()) === idStr))
      );
      if (found && typeof found.name === 'string' && found.name.trim()) {
        return found.name.trim();
      }
    }
    return fallback;
  }

  const str = String(productCategory).trim();
  if (!str) return fallback;

  const found = list.find(
    (c) =>
      c != null &&
      (String(c._id) === str ||
        (c._id != null && String(c._id.toString?.()) === str) ||
        (typeof c.name === 'string' && c.name.trim() === str))
  );
  if (found && typeof found.name === 'string' && found.name.trim()) {
    return found.name.trim();
  }

  return fallback;
}
