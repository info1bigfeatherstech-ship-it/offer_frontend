import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

/**
 * Per-panel admin order storefront for x-storefront.
 * Dropshippers → Orders sets "dropship" without mutating axios defaults for ecomm Orders.
 * Module getter lets axios + RTK baseQuery read the active panel storefront outside React.
 */

const VALID = new Set(['ecomm', 'wholesale', 'dropship']);

/** @type {'ecomm'|'wholesale'|'dropship'|null} */
let activeOverride = null;

const AdminOrderStorefrontContext = createContext('ecomm');

/**
 * Active panel override, or null when the default axios ecomm header should apply.
 * @returns {'ecomm'|'wholesale'|'dropship'|null}
 */
export function getAdminOrderStorefrontOverride() {
  return activeOverride && VALID.has(activeOverride) ? activeOverride : null;
}

/**
 * @returns {'ecomm'|'wholesale'|'dropship'}
 */
export function getAdminOrderStorefront() {
  return getAdminOrderStorefrontOverride() || 'ecomm';
}

/**
 * @param {'ecomm'|'wholesale'|'dropship'|null|undefined} storefront
 */
export function setAdminOrderStorefrontOverride(storefront) {
  if (storefront == null || storefront === '') {
    activeOverride = null;
    return;
  }
  const next = String(storefront).toLowerCase().trim();
  activeOverride = VALID.has(next) ? next : null;
}

function normalizeStorefront(storefront) {
  const next = String(storefront || 'ecomm').toLowerCase().trim();
  return VALID.has(next) ? next : 'ecomm';
}

/**
 * Wrap an admin order panel so list/detail/fulfillment calls use this storefront.
 * Children mount only after the override is applied so the first RTK fetch is correct.
 * Clears on unmount so the main Orders tab stays on ecomm.
 */
export function AdminOrderStorefrontProvider({ storefront = 'ecomm', children }) {
  const normalized = useMemo(() => normalizeStorefront(storefront), [storefront]);
  const [ready, setReady] = useState(
    () => getAdminOrderStorefrontOverride() === normalized
  );

  // Sync during render so the very first child commit can already read dropship.
  if (getAdminOrderStorefrontOverride() !== normalized) {
    setAdminOrderStorefrontOverride(normalized);
  }

  useLayoutEffect(() => {
    setAdminOrderStorefrontOverride(normalized);
    setReady(true);
    return () => {
      setAdminOrderStorefrontOverride(null);
      setReady(false);
    };
  }, [normalized]);

  if (!ready) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        Loading orders…
      </div>
    );
  }

  return (
    <AdminOrderStorefrontContext.Provider value={normalized}>
      {children}
    </AdminOrderStorefrontContext.Provider>
  );
}

export function useAdminOrderStorefront() {
  return useContext(AdminOrderStorefrontContext) || getAdminOrderStorefront();
}
