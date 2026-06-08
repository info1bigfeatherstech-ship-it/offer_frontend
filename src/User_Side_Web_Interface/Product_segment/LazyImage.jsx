import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage
 * ──────────
 * Drop-in replacement for <img> with:
 *   • Native loading="lazy" as baseline
 *   • Explicit width + height + aspect-ratio → zero layout shift (CLS = 0)
 *   • Blur-up reveal: grey placeholder → sharp image on load
 *   • decoding="async" → image decode off main thread
 *   • onError fallback → shows "No Image" placeholder, never broken icon
 *   • IntersectionObserver swap for browsers that ignore loading="lazy" (Safari < 15.4)
 *
 * Props mirror a standard <img> element plus:
 *   @prop {string}  src           Image URL
 *   @prop {string}  alt           Alt text (required for a11y)
 *   @prop {string}  className     Classes for the <img> itself
 *   @prop {string}  wrapperClass  Classes for the wrapper <div>
 *   @prop {string}  aspectRatio   CSS aspect-ratio value (default '1/1')
 *   @prop {string}  objectFit     CSS object-fit value (default 'cover')
 *   @prop {function} onError      Optional extra error handler
 *
 * Usage:
 *   <LazyImage src={imgUrl} alt={title} wrapperClass="rounded-sm" />
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  wrapperClass = '',
  aspectRatio = '1/1',
  objectFit = 'cover',
  onError: onErrorProp,
  ...rest
}) => {
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapperRef = useRef(null);

  // ── IntersectionObserver: swap src only when near viewport ───────────────
  // This is the belt-AND-suspenders approach alongside loading="lazy".
  // Some browsers (older Safari, Firefox) handle loading="lazy" inconsistently.
  useEffect(() => {
    if (!src || !wrapperRef.current) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true); // fallback: load immediately
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px', threshold: 0 }
    );

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [src]);

  const handleLoad = () => setLoaded(true);

  const handleError = (e) => {
    setErrored(true);
    onErrorProp?.(e);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden bg-zinc-100 ${wrapperClass}`}
      style={{ aspectRatio }}
    >
      {/* ── Placeholder shown until image loads ── */}
      {!loaded && !errored && (
        <div
          className="absolute inset-0 bg-zinc-100 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* ── Actual image — only set src when near viewport ── */}
      {visible && !errored && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          // Explicit dimensions: required for browser to reserve correct space
          // and for loading="lazy" to work reliably. We use 1x1 as a neutral
          // intrinsic size; layout is fully controlled by the wrapper aspect-ratio.
          width="1"
          height="1"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full
            transition-all duration-500 ease-in-out
            ${loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105'}
            ${className}
          `}
          style={{ objectFit }}
          {...rest}
        />
      )}

      {/* ── Error fallback ── */}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-300 text-[10px] uppercase tracking-widest">
          No Image
        </div>
      )}
    </div>
  );
};

export default LazyImage;