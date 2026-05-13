import { useEffect, useRef } from 'react';

/**
 * useInViewFetch
 * ──────────────
 * Attaches an IntersectionObserver to the returned `ref`.
 * Fires `onVisible` exactly ONCE when the element enters the (expanded) viewport.
 * After firing, the observer disconnects — zero ongoing overhead.
 *
 * WHY IT FIRES EXACTLY ONCE (even in React Strict Mode):
 *   React 18 Strict Mode mounts → unmounts → remounts every component in dev.
 *   A plain useRef resets on each mount, so a naive implementation fires twice.
 *   We use a module-level WeakSet keyed on the DOM element itself.
 *   The DOM node persists across Strict Mode remounts, so the WeakSet correctly
 *   tracks "has this physical element already triggered a fetch?" across mounts.
 *
 * @param {() => void} onVisible   Callback to run when element enters view
 * @param {object}     options
 * @param {string}     options.rootMargin   Expand root before triggering (default '500px')
 * @param {number}     options.threshold    0–1 intersection ratio needed   (default 0)
 * @param {boolean}    options.disabled     Skip observer entirely when true
 *
 * @returns {{ ref: React.RefObject }}  Attach `ref` to your sentinel / section element
 *
 * Usage:
 *   const { ref } = useInViewFetch(() => dispatch(fetchProducts()), {
 *     disabled: products.length > 0,   // skip if already loaded
 *     rootMargin: '500px',             // fetch 500px before section appears
 *   });
 *   <div ref={ref} aria-hidden="true" />
 */

// Module-level WeakSet — survives React Strict Mode remounts.
// Keys are the actual DOM elements, so each physical element tracks its own state.
const firedElements = new WeakSet();

const useInViewFetch = (
  onVisible,
  { rootMargin = '1500px', threshold = 0, disabled = false } = {}
) => {
  const ref         = useRef(null);
  const callbackRef = useRef(onVisible);

  // Keep callbackRef current on every render without re-running the observer effect
  callbackRef.current = onVisible;

  useEffect(() => {
    // Skip if explicitly disabled (e.g. data already loaded, not authenticated, etc.)
    if (disabled) return;

    const el = ref.current;
    if (!el) return;

    // Skip if this DOM element has already triggered a fetch.
    // This is the key guard against React 18 Strict Mode's intentional
    // double-mount in development: the DOM node survives the unmount/remount
    // cycle, so the WeakSet correctly prevents a second callback invocation.
    if (firedElements.has(el)) return;

    // Fallback for very old browsers without IntersectionObserver
    if (typeof IntersectionObserver === 'undefined') {
      firedElements.add(el);
      callbackRef.current();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedElements.has(el)) {
          firedElements.add(el);
          callbackRef.current();
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);

    // Cleanup: disconnect if component unmounts before firing
    return () => {
      observer.disconnect();
    };

  // Re-run only when `disabled` flips (e.g. data loaded from cache on first render).
  // rootMargin/threshold are static config values — deliberately excluded from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return { ref };
};

export default useInViewFetch;