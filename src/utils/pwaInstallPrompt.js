/**
 * PWA install prompt helpers.
 * Soft banner once per page load until installed; exit reminder once per browser session.
 */

const EXIT_SHOWN_SESSION_KEY = 'owb_pwa_install_exit_shown';
/** Legacy key — cleared so old 7-day dismiss does not block forever. */
const LEGACY_DISMISS_KEY = 'owb_pwa_install_dismissed_at';

/**
 * Survives React StrictMode remounts (useRef resets on remount).
 * Ensures the open install modal is shown at most once per document load.
 */
let openPromptShownForLoad = false;

export function clearLegacyInstallDismiss() {
  try {
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // ignore
  }
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.navigator.standalone === true) return true;
  } catch {
    // ignore
  }
  return false;
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

export function markExitShownThisSession() {
  try {
    sessionStorage.setItem(EXIT_SHOWN_SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function wasExitShownThisSession() {
  try {
    return sessionStorage.getItem(EXIT_SHOWN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Soft install UI whenever the app is not installed (browser event optional). */
export function canOfferInstall() {
  return !isPwaInstalled();
}

/**
 * Claim the one open-prompt show for this document load.
 * @returns {boolean} true if caller may show the open prompt
 */
export function claimOpenPromptShow() {
  if (openPromptShownForLoad) return false;
  openPromptShownForLoad = true;
  return true;
}

export function wasOpenPromptShownThisLoad() {
  return openPromptShownForLoad;
}
