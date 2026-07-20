/**
 * Lock body scroll without layout flicker when the vertical scrollbar disappears.
 * Compensates with padding-right equal to scrollbar width.
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  document.body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;

  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
