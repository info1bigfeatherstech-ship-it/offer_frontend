/**
 * Storefront session guard (ecomm + wholesale).
 *
 * Same email may exist as two accounts. A wholesale JWT / hijacked wholesaler
 * user must never drive ecomm cart/wishlist/address, and the reverse.
 * Decode is client-side only (no signature verify) — backend remains source of truth.
 */

export const PORTAL_SCOPE_MISMATCH_CODES = Object.freeze([
  "PORTAL_ACCESS_DENIED",
  "STOREFRONT_SCOPE_FORBIDDEN",
]);

const SCOPE_CODE_SET = new Set(PORTAL_SCOPE_MISMATCH_CODES);
const ADMIN_PORTALS = new Set(["admin-ecomm", "admin-wholesale"]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Safe JWT payload decode. Returns null on any failure (never throws).
 */
export function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function isScopeMismatchCode(code) {
  return SCOPE_CODE_SET.has(String(code || "").trim());
}

export function isScopeMismatchAxiosError(error) {
  try {
    return isScopeMismatchCode(error?.response?.data?.code);
  } catch {
    return false;
  }
}

export function isSilentPortalScopePayload(payload) {
  try {
    if (!payload || typeof payload !== "object") return false;
    if (payload.silent === true) return true;
    return isScopeMismatchCode(payload.code);
  } catch {
    return false;
  }
}

/**
 * Customer access token allowed on this storefront?
 * Undecodable tokens return true so a decode bug cannot wipe a valid session.
 */
export function isCustomerTokenCompatible(token, expectedPortal) {
  try {
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;

    const portal = normalize(payload.portal);
    const userType = normalize(payload.userType);
    const role = normalize(payload.role);
    const expected = normalize(expectedPortal);

    if (ADMIN_PORTALS.has(portal) || userType === "admin") {
      return false;
    }

    if (expected === "ecomm") {
      if (portal === "wholesale" || portal === "admin-wholesale") return false;
      if (userType === "wholesaler" || role === "wholesaler") return false;
      return true;
    }

    if (expected === "wholesale") {
      if (portal === "ecomm" || portal === "admin-ecomm") return false;
      if (userType === "wholesaler" || role === "wholesaler" || portal === "wholesale") {
        return true;
      }
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Admin token for this admin portal. Missing portal (legacy) is allowed.
 * Explicit wrong portal is rejected. Undecodable → allow (401 path handles it).
 */
export function isAdminTokenCompatible(token, expectedAdminPortal) {
  try {
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    const portal = normalize(payload.portal);
    if (!portal) return true;
    return portal === normalize(expectedAdminPortal);
  } catch {
    return true;
  }
}

export function thunkRejectFromAxios(error, fallbackMessage) {
  try {
    const data = error?.response?.data;
    const code = data?.code || null;
    const silent = isScopeMismatchCode(code);
    return {
      message: silent ? undefined : data?.message || error?.message || fallbackMessage,
      status: error?.response?.status ?? null,
      code,
      silent,
    };
  } catch {
    return { message: fallbackMessage, status: null, code: null, silent: false };
  }
}

export function sanitizeStoredTokenIfIncompatible({
  storageKey,
  expectedPortal,
  kind,
}) {
  try {
    if (typeof localStorage === "undefined" || !storageKey) return false;
    const token = localStorage.getItem(storageKey);
    if (!token) return false;
    const ok =
      kind === "admin"
        ? isAdminTokenCompatible(token, expectedPortal)
        : isCustomerTokenCompatible(token, expectedPortal);
    if (ok) return true;
    localStorage.removeItem(storageKey);
    return false;
  } catch {
    return false;
  }
}
