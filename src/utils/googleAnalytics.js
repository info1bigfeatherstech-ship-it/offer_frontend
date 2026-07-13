/**
 * GA4 (gtag) loader for the storefront.
 * Admin SEO Analytics reads the same GA4 property via Data API — this is the collect side.
 *
 * Set `VITE_GA_MEASUREMENT_ID=G-XXXXXXXX` in frontend/offer/.env (and production build env).
 * Leave unset to disable tracking (no scripts injected).
 */

const MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '')
  .trim()
  .toUpperCase();

let initialized = false;

export function isGaEnabled() {
  return /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);
}

export function getGaMeasurementId() {
  return isGaEnabled() ? MEASUREMENT_ID : null;
}

/**
 * Inject gtag.js once. Safe to call multiple times.
 */
export function initGoogleAnalytics() {
  if (initialized || !isGaEnabled() || typeof window === 'undefined') {
    return false;
  }

  // Avoid double-inject if index.html already has a tag.
  if (typeof window.gtag === 'function' && window.dataLayer) {
    initialized = true;
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  // SPA: we send page_view manually on route changes.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  initialized = true;
  return true;
}

/**
 * Send a page_view for React Router navigations.
 * @param {string} pagePath
 * @param {string} [pageTitle]
 */
export function trackPageView(pagePath, pageTitle) {
  if (!isGaEnabled() || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  const path = pagePath || window.location.pathname + window.location.search;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: pageTitle || document.title,
    page_location: window.location.origin + path
  });
}
