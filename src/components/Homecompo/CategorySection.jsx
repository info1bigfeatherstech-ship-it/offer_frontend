import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import {
  fetchProductsByCategory,
  selectProductsBySlug,
  selectLoadingBySlug,
  selectErrorBySlug,
  selectPaginationBySlug,
  selectStatusBySlug,
  selectLoadMoreErrorBySlug,
} from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
import useInViewFetch from '../HOOKS/useInViewFetch';

const WAVE_PATHS = [
  "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
  "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
  "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
];

// ── Column count: 2 mobile, 3 tablet/desktop, 6 xl ──────────────────────
// Must stay in sync with the CSS grid breakpoints below
// (grid-cols-2 md:grid-cols-3 xl:grid-cols-6). If JS `cols` and CSS columns
// disagree, the virtualizer reserves the wrong row height and cards either
// overlap (JS > CSS) or leave empty trailing slots (JS < CSS).
const getColumnCount = () => {
  const w = window.innerWidth;
  if (w >= 1280) return 6; // XL: 6 cards
  if (w >= 768)  return 3; // MD and LG: 3 cards
  return 2;                // < MD: 2 cards
};

const LOAD_MORE_SKELETON_COUNT = 12; // Changed from 8 to 12 for 6 cards layout (2 rows × 6 cards)

const VirtualizedProductGrid = ({ products, loadingMore }) => {
  const listRef = useRef(null);
  const [cols, setCols] = useState(getColumnCount);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const onResize = () => setCols(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Window virtualizer needs the list's document offset; measure before paint when possible.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;

    const updateMargin = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((prev) => (Math.abs(prev - top) > 1 ? top : prev));
    };

    updateMargin();
    const ro = new ResizeObserver(updateMargin);
    ro.observe(document.body);
    window.addEventListener('resize', updateMargin);
    window.addEventListener('scroll', updateMargin, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMargin);
      window.removeEventListener('scroll', updateMargin);
    };
  }, [products.length, cols, loadingMore]);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += cols) {
      result.push(products.slice(i, i + cols));
    }
    return result;
  }, [products, cols]);

  const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
  const totalRows        = rows.length + skeletonRowCount;

  // Must track WINDOW scroll — Home scrolls on window, not an inner overflow container.
  // The old getScrollElement→parentRef never saw window scrollY, so only the first rows
  // stayed mounted and Back restoration landed on the wrong visual section.
  const rowVirtualizer = useWindowVirtualizer({
    count: totalRows,
    estimateSize: useCallback(() => {
      const w = window.innerWidth;
      if (w < 1024) return 500;
      return 420;
    }, []),
    overscan: 4,
    scrollMargin,
  });

  return (
    <div ref={listRef} style={{ width: '100%' }}>
      <div
        style={{
          height:   `${rowVirtualizer.getTotalSize()}px`,
          width:    '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isSkeletonRow = virtualRow.index >= rows.length;
          const rowItems      = isSkeletonRow
            ? Array(cols).fill(null)
            : rows[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position:  'absolute',
                top:       0,
                left:      0,
                width:     '100%',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-6 lg:gap-x-8 pb-4 md:pb-6">
                {isSkeletonRow
                  ? Array(cols).fill(null).map((_, i) => (
                      <SkeletonCard
                        key={`skel-${virtualRow.index}-${i}`}
                        seed={i}
                      />
                    ))
                  : rowItems.map((product, i) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        index={virtualRow.index * cols + i}
                        seed={i}
                      />
                    ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CategorySection = ({ slug, title }) => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [pathIndex,  setPathIndex]  = useState(0);
  const [waveActive, setWaveActive] = useState(false);

  const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
  const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
  const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
  const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);
  const selectStatus     = useMemo(() => selectStatusBySlug(slug),     [slug]);
  const selectLoadMoreError = useMemo(() => selectLoadMoreErrorBySlug(slug), [slug]);

  const products      = useSelector(selectProducts);
  let categoryname    = products[0]?.category?.slug;
  const loading       = useSelector(selectLoading);
  const error         = useSelector(selectError);
  const loadMoreError = useSelector(selectLoadMoreError);
  const pagination    = useSelector(selectPagination);
  const status        = useSelector(selectStatus);

  const loadingMore   = Boolean(loading && products.length > 0);
  const hasMore       = pagination?.hasNextPage ?? false;

  const isRateLimited = useMemo(() => {
    const statusCode = error?.status ?? loadMoreError?.status;
    const msg = String(error?.message || loadMoreError?.message || '').toLowerCase();
    return statusCode === 429 || msg.includes('too many requests') || msg.includes('slow down');
  }, [error, loadMoreError]);

  const softErrorMessage = useMemo(() => {
    if (!loadMoreError?.message) return null;
    if (isRateLimited) {
      return 'Too many requests — please wait a moment, then try Load More again.';
    }
    return loadMoreError.message;
  }, [loadMoreError, isRateLimited]);

  const triggerFetch = useCallback(() => {
    dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }));
  }, [slug, dispatch]);

  // rootMargin: '1500px' — fires the API call when the section is ~1500px
  // (≈ 2–3 full sections) below the viewport edge. This gives the network
  // request time to resolve before the user actually scrolls there.
  // Rule of thumb: rootMargin = (avg section height) × (sections to pre-load)
  // Each section ≈ 500–700px → 2 sections ahead = 1500px.
  const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
    rootMargin: '1500px',
    disabled:   status === 'success' || status === 'error',
  });

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = (pagination?.page ?? 1) + 1;
    dispatch(fetchProductsByCategory({ slug, page: nextPage, limit: 12 }));
  }, [slug, dispatch, loading, hasMore, pagination]);

  const handleRetry = useCallback(() => {
    dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 }));
  }, [slug, dispatch]);

  const handleRetryLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    handleLoadMore();
  }, [loading, hasMore, handleLoadMore]);

  const waveRef = useRef(null);

  useEffect(() => {
    if (!waveRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setWaveActive(entry.isIntersecting),
      { rootMargin: '0px', threshold: 0 }
    );
    observer.observe(waveRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!waveActive) return;
    const interval = setInterval(
      () => setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length),
      3333
    );
    return () => clearInterval(interval);
  }, [waveActive]);

  // ── IDLE sentinel ────────────────────────────────────────────────────────────
  // This placeholder holds the layout space while data loads.
  // sentinelRef is on this element — IntersectionObserver fires 1500px BEFORE
  // this div enters the viewport, so the API call starts 2-3 sections early.
  if (status === 'idle') {
    return (
      <div
        ref={sentinelRef}
        data-owb-section={slug}
        className="w-full bg-white"
        style={{ minHeight: '480px' }}
        aria-hidden="true"
      />
    );
  }

  // ── LOADING skeleton ─────────────────────────────────────────────────────────
  if (loading && products.length === 0) {
    return (
      <div data-owb-section={slug} className="w-full bg-white py-8 md:py-16 overflow-hidden">
        <section className="container mx-auto px-4">

          {/* Header ghost */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
            <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
            <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
          </div>

          {/* ── Skeleton grid: 2 cols mobile+tablet, 6 cols lg ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-6 lg:gap-x-8">
            {[...Array(12)].map((_, i) => ( // Changed from 8 to 12
              <SkeletonCard key={i} seed={i % 6} /> // Changed from i % 4 to i % 6
            ))}
          </div>

        </section>
      </div>
    );
  }

  // ── ERROR (initial load only — never wipe products already on screen) ─────
  if (error && products.length === 0) {
    return (
      <div data-owb-section={slug} className="w-full bg-white py-8 md:py-16 text-center">
        <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
        <p className="text-gray-400 text-sm mb-4">
          {isRateLimited
            ? 'Too many requests — please wait a moment and try again.'
            : (error.message || "Something went wrong")}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────────────────────────────────────────────
  return (
    <div data-owb-section={slug} className="w-full bg-white py-8 md:py-16 overflow-hidden">
      <div ref={sentinelRef} aria-hidden="true" />

      <section className="container mx-auto px-4">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
          <h3 className="text-2xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
            <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
            {title}
          </h3>
          <button
            onClick={() => navigate(`/category/${slug}`)}
            className="text-[#f7a221] hidden font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap"
          >
            Explore All
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {products.length > 0 ? (
          <>
            <VirtualizedProductGrid
              products={products}
              loadingMore={loadingMore}
            />

            {softErrorMessage ? (
              <div className="mt-6 mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <p className="text-sm text-amber-900 mb-2">{softErrorMessage}</p>
                <button
                  type="button"
                  onClick={handleRetryLoadMore}
                  disabled={loading || !hasMore}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-950 underline disabled:opacity-50"
                >
                  <RefreshCw size={12} /> Retry load more
                </button>
              </div>
            ) : null}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`
                    inline-flex items-center gap-3 px-10 py-3
                    text-[11px] font-black uppercase tracking-[0.2em]
                    border-2 border-zinc-900 transition-all duration-200
                    ${loading
                      ? 'bg-zinc-900 text-white cursor-wait opacity-80'
                      : 'bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95'
                    }
                  `}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}

            {/* View all */}
            {!hasMore && products.length > 0 && status === 'success' && (
              <button
                onClick={() => navigate(`/category/${categoryname}`)}
                className="px-10 py-3 mx-auto block mt-10 border-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all"
              >
                View All
              </button>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center">
              <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
                New Products Are Being Added Soon. Stay tuned!
              </h3>
              {/* <button
                onClick={() => navigate("/")}
                className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600"
              >
                Explore All Collections
                <ChevronRight size={14} />
              </button> */}
            </div>
          </div>
        )}
      </section>

      {/* Wave divider */}
      <div ref={waveRef} className="relative h-16 md:h-20 overflow-hidden mt-10">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-full h-full text-gray-50"
        >
          <path
            d={WAVE_PATHS[pathIndex]}
            fill="currentColor"
            style={{ transition: 'd 3333ms ease-in-out' }}
          />
        </svg>
      </div>
    </div>
  );
};

export default CategorySection;

