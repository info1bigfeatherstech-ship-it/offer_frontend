// roles.js
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for role-based tab access.
// To give a role access to a new tab → just add the tab id here.
// To add a new role → add one new key with its allowed tab ids.
// Nothing else in the codebase needs to change.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:              "admin",
  PRODUCT_MANAGER:    "product_manager",
  ORDER_MANAGER:      "order_manager",
  MARKETING_MANAGER:  "marketing_manager",
  INVENTORY_MANAGER:  "inventory_manager",
  PACKING_VIEWER:     "packing_viewer",
  // User: "user",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]:             ["products", "analytics", "archived", "seoanalysis","customers","staff","demo", "orders","returns_refunds","rto","support","orders","outofstock","customerreview","website","ecommerce","marketing","settings","utilities","wholesaler"],
  [ROLES.PRODUCT_MANAGER]:   ["products", "archived"],
  [ROLES.ORDER_MANAGER]:     ["orders", "returns_refunds", "rto", "settings"],
  [ROLES.MARKETING_MANAGER]: ["analytics"],
  [ROLES.INVENTORY_MANAGER]: ["products"],
  [ROLES.PACKING_VIEWER]:    ["orders"],
  // [ROLES.User]: ["user"],
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]:             "Super Admin",
  [ROLES.PRODUCT_MANAGER]:   "Product Manager",
  [ROLES.ORDER_MANAGER]:     "Order Manager",
  [ROLES.MARKETING_MANAGER]: "Marketing Manager",
  [ROLES.INVENTORY_MANAGER]: "Inventory Manager",
  [ROLES.PACKING_VIEWER]:    "Packing Viewer",
};

/** Full catalog create/edit/delete — not inventory_manager */
export function canManageProductCatalog(role) {
  return role === ROLES.ADMIN || role === ROLES.PRODUCT_MANAGER;
}

export function isInventoryManagerRole(role) {
  return role === ROLES.INVENTORY_MANAGER;
}

export function isPackingViewerRole(role) {
  return String(role || "").toLowerCase() === ROLES.PACKING_VIEWER;
}

/** Confirmed + Ready to Ship + Processing (until courier pickup / In transit). */
export const PACKING_VIEWER_ORDER_TABS = Object.freeze([
  "Confirmed",
  "Ready to Ship",
  "Processing",
]);

/** Actions packing_viewer may run in Orders UI. */
export const PACKING_VIEWER_ORDER_ACTIONS = Object.freeze([
  "downloadLabel",
  "openDetail",
  "track",
]);

export function filterCapsForPackingViewer(caps) {
  if (!caps || typeof caps !== "object") return {};
  const next = {};
  for (const key of PACKING_VIEWER_ORDER_ACTIONS) {
    if (caps[key]) next[key] = true;
  }
  // Always allow opening the order for packing.
  next.openDetail = true;
  return next;
}
