/**
 * Low-level window scroll helpers for the global ScrollRestoration system.
 * Positions themselves are keyed by React Router location.key (history entry).
 */

export function getWindowScrollY() {
  if (typeof window === "undefined") return 0;
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

export function setWindowScrollY(top) {
  if (typeof window === "undefined") return;

  const y = Math.max(0, Math.round(Number(top) || 0));
  const html = document.documentElement;
  const prevBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  try {
    window.scrollTo({ top: y, left: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, y);
  }

  html.scrollTop = y;
  document.body.scrollTop = y;
  html.style.scrollBehavior = prevBehavior;
}

/** @deprecated Use ScrollRestoration history-key store — kept as alias for Navbar same-route taps */
export function scrollWindowToTop() {
  setWindowScrollY(0);
}

export function scrollWindowToY(top) {
  setWindowScrollY(top);
}
