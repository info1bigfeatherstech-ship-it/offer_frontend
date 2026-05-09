import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';

import {
  fetchProductsByCategory,
  selectProductsBySlug,
  selectLoadingBySlug,
  selectErrorBySlug,
  selectPaginationBySlug,
  selectStatusBySlug,
} from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
import useInViewFetch from '../HOOKS/useInViewFetch';

const WAVE_PATHS = [
  "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
  "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
  "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
];

// ── Column count: 2 mobile, 6 desktop ───────────────────────────────────
const getColumnCount = () => {
  const w = window.innerWidth;
  if (w >= 1024) return 6; // LG: 6 cards
  return 2;                // Mobile + Tablet: 2 cards
};

const LOAD_MORE_SKELETON_COUNT = 12; // Changed from 8 to 12 for 6 cards layout (2 rows × 6 cards)

const VirtualizedProductGrid = ({ products, loadingMore }) => {
  const parentRef   = useRef(null);
  const [cols, setCols] = useState(getColumnCount);

  useEffect(() => {
    const onResize = () => setCols(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += cols) {
      result.push(products.slice(i, i + cols));
    }
    return result;
  }, [products, cols]);

  const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
  const totalRows        = rows.length + skeletonRowCount;

  const rowVirtualizer = useVirtualizer({
    count:            totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => {
      const w = window.innerWidth;
      if (w < 1024) return 500; // Mobile + Tablet
      return 420;               // Desktop
    }, []),
    overscan: 1,
  });

  return (
    <div ref={parentRef} style={{ width: '100%' }}>
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
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* 2 cols mobile+tablet, 6 cols desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 pb-4 md:pb-6">
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

  const products      = useSelector(selectProducts);
  let categoryname    = products[0]?.category?.slug;
  const loading       = useSelector(selectLoading);
  const error         = useSelector(selectError);
  const pagination    = useSelector(selectPagination);
  const status        = useSelector(selectStatus);

  const currentPage   = pagination?.page ?? 1;
  const loadingMore   = loading && currentPage > 1;
  const hasMore       = pagination?.hasNextPage ?? false;

  const triggerFetch = useCallback(() => {
    dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 })); // Changed from 8 to 12
  }, [slug, dispatch]);

  const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
    rootMargin: '300px',
    disabled:   status === 'success' || status === 'error',
  });

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = (pagination?.page ?? 1) + 1;
    dispatch(fetchProductsByCategory({ slug, page: nextPage, limit: 12 })); // Changed from 8 to 12
  }, [slug, dispatch, loading, hasMore, pagination]);

  const handleRetry = useCallback(() => {
    dispatch(fetchProductsByCategory({ slug, page: 1, limit: 12 })); // Changed from 8 to 12
  }, [slug, dispatch]);

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
  if (status === 'idle') {
    return (
      <div
        ref={sentinelRef}
        className="w-full bg-white"
        style={{ minHeight: '480px' }}
        aria-hidden="true"
      />
    );
  }

  // ── LOADING skeleton ─────────────────────────────────────────────────────────
  if (loading && products.length === 0) {
    return (
      <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
        <section className="container mx-auto px-4">

          {/* Header ghost */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
            <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
            <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
          </div>

          {/* ── Skeleton grid: 2 cols mobile+tablet, 6 cols lg ── */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {[...Array(12)].map((_, i) => ( // Changed from 8 to 12
              <SkeletonCard key={i} seed={i % 6} /> // Changed from i % 4 to i % 6
            ))}
          </div>

        </section>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full bg-white py-8 md:py-16 text-center">
        <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
        <p className="text-gray-400 text-sm mb-4">
          {error.message || "Something went wrong"}
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
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

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
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
                The Vault is Quiet
              </h3>
              <button
                onClick={() => navigate("/")}
                className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600"
              >
                Explore All Collections
                <ChevronRight size={14} />
              </button>
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

// bootom code show 4  cards at a time upper show 6

// import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { useVirtualizer } from '@tanstack/react-virtual';

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
//   selectStatusBySlug,
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

// import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
// import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
// import useInViewFetch from '../HOOKS/useInViewFetch';
// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// // ── Column count: 2 mobile, 2 tablet, 4 lg ───────────────────────────────────
// const getColumnCount = () => {
//   const w = window.innerWidth;
//   if (w >= 1024) return 4; // LG: 4 cards
//   return 2;                // Mobile + Tablet: 2 cards
// };

// const LOAD_MORE_SKELETON_COUNT = 8;

// const VirtualizedProductGrid = ({ products, loadingMore }) => {
//   const parentRef   = useRef(null);
//   const [cols, setCols] = useState(getColumnCount);

//   useEffect(() => {
//     const onResize = () => setCols(getColumnCount());
//     window.addEventListener('resize', onResize);
//     return () => window.removeEventListener('resize', onResize);
//   }, []);

//   const rows = useMemo(() => {
//     const result = [];
//     for (let i = 0; i < products.length; i += cols) {
//       result.push(products.slice(i, i + cols));
//     }
//     return result;
//   }, [products, cols]);

//   const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
//   const totalRows        = rows.length + skeletonRowCount;

//   const rowVirtualizer = useVirtualizer({
//     count:            totalRows,
//     getScrollElement: () => parentRef.current,
//     estimateSize: useCallback(() => {
//       const w = window.innerWidth;
//       if (w < 1024) return 500; // Mobile + Tablet
//       return 420;               // Desktop
//     }, []),
//     overscan: 1,
//   });

//   return (
//     <div ref={parentRef} style={{ width: '100%' }}>
//       <div
//         style={{
//           height:   `${rowVirtualizer.getTotalSize()}px`,
//           width:    '100%',
//           position: 'relative',
//         }}
//       >
//         {rowVirtualizer.getVirtualItems().map((virtualRow) => {
//           const isSkeletonRow = virtualRow.index >= rows.length;
//           const rowItems      = isSkeletonRow
//             ? Array(cols).fill(null)
//             : rows[virtualRow.index];

//           return (
//             <div
//               key={virtualRow.key}
//               data-index={virtualRow.index}
//               ref={rowVirtualizer.measureElement}
//               style={{
//                 position:  'absolute',
//                 top:       0,
//                 left:      0,
//                 width:     '100%',
//                 transform: `translateY(${virtualRow.start}px)`,
//               }}
//             >
//               {/* 2 cols mobile+tablet, 4 cols lg */}
//               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 pb-4 md:pb-6">
//                 {isSkeletonRow
//                   ? Array(cols).fill(null).map((_, i) => (
//                       <SkeletonCard
//                         key={`skel-${virtualRow.index}-${i}`}
//                         seed={i}
//                       />
//                     ))
//                   : rowItems.map((product, i) => (
//                       <ProductCard
//                         key={product._id}
//                         product={product}
//                         index={virtualRow.index * cols + i}
//                         seed={i}
//                       />
//                     ))
//                 }
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// const CategorySection = ({ slug, title }) => {
//   const dispatch  = useDispatch();
//   const navigate  = useNavigate();
//   const [pathIndex,  setPathIndex]  = useState(0);
//   const [waveActive, setWaveActive] = useState(false);

//   const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
//   const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
//   const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);
//   const selectStatus     = useMemo(() => selectStatusBySlug(slug),     [slug]);

//   const products      = useSelector(selectProducts);
//   let categoryname    = products[0]?.category?.slug;
//   const loading       = useSelector(selectLoading);
//   const error         = useSelector(selectError);
//   const pagination    = useSelector(selectPagination);
//   const status        = useSelector(selectStatus);

//   const currentPage   = pagination?.page ?? 1;
//   const loadingMore   = loading && currentPage > 1;
//   const hasMore       = pagination?.hasNextPage ?? false;

//   const triggerFetch = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 8 }));
//   }, [slug, dispatch]);

//   const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
//     rootMargin: '300px',
//     disabled:   status === 'success' || status === 'error',
//   });

//   const handleLoadMore = useCallback(() => {
//     if (loading || !hasMore) return;
//     const nextPage = (pagination?.page ?? 1) + 1;
//     dispatch(fetchProductsByCategory({ slug, page: nextPage, limit: 8 }));
//   }, [slug, dispatch, loading, hasMore, pagination]);

//   const handleRetry = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 8 }));
//   }, [slug, dispatch]);

//   const waveRef = useRef(null);

//   useEffect(() => {
//     if (!waveRef.current) return;
//     const observer = new IntersectionObserver(
//       ([entry]) => setWaveActive(entry.isIntersecting),
//       { rootMargin: '0px', threshold: 0 }
//     );
//     observer.observe(waveRef.current);
//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!waveActive) return;
//     const interval = setInterval(
//       () => setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length),
//       3333
//     );
//     return () => clearInterval(interval);
//   }, [waveActive]);

//   // ── IDLE sentinel ────────────────────────────────────────────────────────────
//   if (status === 'idle') {
//     return (
//       <div
//         ref={sentinelRef}
//         className="w-full bg-white"
//         style={{ minHeight: '480px' }}
//         aria-hidden="true"
//       />
//     );
//   }

//   // ── LOADING skeleton ─────────────────────────────────────────────────────────
//   if (loading && products.length === 0) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//         <section className="container mx-auto px-4">

//           {/* Header ghost */}
//           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//             <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
//             <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
//           </div>

//           {/* ── Skeleton grid: 2 cols mobile+tablet, 4 cols lg ── */}
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
//             {[...Array(8)].map((_, i) => (
//               <SkeletonCard key={i} seed={i % 4} />
//             ))}
//           </div>

//         </section>
//       </div>
//     );
//   }

//   // ── ERROR ────────────────────────────────────────────────────────────────────
//   if (error) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
//         <p className="text-gray-400 text-sm mb-4">
//           {error.message || "Something went wrong"}
//         </p>
//         <button
//           onClick={handleRetry}
//           className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//         >
//           <RefreshCw size={16} /> Try Again
//         </button>
//       </div>
//     );
//   }

//   // ── MAIN ─────────────────────────────────────────────────────────────────────
//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       <div ref={sentinelRef} aria-hidden="true" />

//       <section className="container mx-auto px-4">

//         {/* Section header */}
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-2xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button
//             onClick={() => navigate(`/category/${slug}`)}
//             className="text-[#f7a221] hidden font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap"
//           >
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {products.length > 0 ? (
//           <>
//             <VirtualizedProductGrid
//               products={products}
//               loadingMore={loadingMore}
//             />

//             {/* Load more */}
//             {hasMore && (
//               <div className="flex justify-center mt-10">
//                 <button
//                   onClick={handleLoadMore}
//                   disabled={loading}
//                   className={`
//                     inline-flex items-center gap-3 px-10 py-3
//                     text-[11px] font-black uppercase tracking-[0.2em]
//                     border-2 border-zinc-900 transition-all duration-200
//                     ${loading
//                       ? 'bg-zinc-900 text-white cursor-wait opacity-80'
//                       : 'bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95'
//                     }
//                   `}
//                 >
//                   {loadingMore ? (
//                     <>
//                       <Loader2 size={14} className="animate-spin" />
//                       Loading...
//                     </>
//                   ) : (
//                     'Load More'
//                   )}
//                 </button>
//               </div>
//             )}

//             {/* View all */}
//             {!hasMore && products.length > 0 && status === 'success' && (
//               <button
//                 onClick={() => navigate(`/category/${categoryname}`)}
//                 className="px-10 py-3 mx-auto block mt-10 border-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all"
//               >
//                 View All
//               </button>
//             )}
//           </>
//         ) : (
//           /* Empty state */
//           <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
//             <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />
//             <div className="relative z-10 flex flex-col items-center">
//               <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
//                 The Vault is Quiet
//               </h3>
//               <button
//                 onClick={() => navigate("/")}
//                 className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600"
//               >
//                 Explore All Collections
//                 <ChevronRight size={14} />
//               </button>
//             </div>
//           </div>
//         )}
//       </section>

//       {/* Wave divider */}
//       <div ref={waveRef} className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;
// import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { useVirtualizer } from '@tanstack/react-virtual';

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
//   selectStatusBySlug,
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

// import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
// import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
// import useInViewFetch from '../HOOKS/useInViewFetch';

// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// // ── FIXED: Updated logic for 4 cards on LG and 1 on Mobile ──────────────────
// const getColumnCount = () => {
//   const w = window.innerWidth;
//   if (w >= 1024) return 4; // LG screens: 4 cards
//   if (w >= 768)  return 2; // MD screens: 2 cards (optional middle-ground)
//   return 2;                // Mobile: 1 card (SOLO)
// };

// const LOAD_MORE_SKELETON_COUNT = 8;

// const VirtualizedProductGrid = ({ products, loadingMore }) => {
//   const parentRef   = useRef(null);
//   const [cols, setCols] = useState(getColumnCount);

//   useEffect(() => {
//     const onResize = () => setCols(getColumnCount());
//     window.addEventListener('resize', onResize);
//     return () => window.removeEventListener('resize', onResize);
//   }, []);

//   const rows = useMemo(() => {
//     const result = [];
//     for (let i = 0; i < products.length; i += cols) {
//       result.push(products.slice(i, i + cols));
//     }
//     return result;
//   }, [products, cols]);

//   const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
//   const totalRows        = rows.length + skeletonRowCount;

//   const rowVirtualizer = useVirtualizer({
//     count:         totalRows,
//     getScrollElement: () => parentRef.current,
//     // Mobile solo cards need more height than desktop grid items
//     estimateSize: useCallback(() => {
//         const w = window.innerWidth;
//         if (w < 768) return 550; // Mobile Solo
//         return 420;             // Tablet / Desktop
//     }, []),
//     overscan:     1,
//   });

//   return (
//     <div ref={parentRef} style={{ width: '100%' }}>
//       <div
//         style={{
//           height:   `${rowVirtualizer.getTotalSize()}px`,
//           width:    '100%',
//           position: 'relative',
//         }}
//       >
//         {rowVirtualizer.getVirtualItems().map((virtualRow) => {
//           const isSkeletonRow = virtualRow.index >= rows.length;
//           const rowItems      = isSkeletonRow
//             ? Array(cols).fill(null)
//             : rows[virtualRow.index];

//           return (
//             <div
//               key={virtualRow.key}
//               data-index={virtualRow.index}
//               ref={rowVirtualizer.measureElement}
//               style={{
//                 position:  'absolute',
//                 top:       0,
//                 left:      0,
//                 width:     '100%',
//                 transform: `translateY(${virtualRow.start}px)`,
//               }}
//             >
//               {/* FIXED: grid-cols-1 (Mobile), md:grid-cols-2, lg:grid-cols-4 (Desktop) */}
//               <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-4 md:pb-6">
//                 {isSkeletonRow
//                   ? Array(cols).fill(null).map((_, i) => (
//                       <SkeletonCard key={`skel-${virtualRow.index}-${i}`} />
//                     ))
//                   : rowItems.map((product, i) => (
//                       <ProductCard
//                         key={product._id}
//                         product={product}
//                         index={virtualRow.index * cols + i}
//                         seed={i}
//                       />
//                     ))
//                 }
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// const CategorySection = ({ slug, title }) => {
//   const dispatch  = useDispatch();
//   const navigate  = useNavigate();
//   const [pathIndex,  setPathIndex]  = useState(0);
//   const [waveActive, setWaveActive] = useState(false);

//   const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
//   const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
//   const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);
//   const selectStatus     = useMemo(() => selectStatusBySlug(slug),     [slug]);

//   const products   = useSelector(selectProducts);
//     let categoryname = products[0]?.category?.slug;
  
//   const loading    = useSelector(selectLoading);
//   const error      = useSelector(selectError);
//   const pagination = useSelector(selectPagination);
//   const status     = useSelector(selectStatus);

//   const currentPage  = pagination?.page ?? 1;
//   const loadingMore  = loading && currentPage > 1;
//   const hasMore      = pagination?.hasNextPage ?? false;

//   const triggerFetch = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 8 }));
//   }, [slug, dispatch]);

//   const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
//     rootMargin: '300px',
//     disabled:  status === 'success' || status === 'error',
//   });

//   const handleLoadMore = useCallback(() => {
//     if (loading || !hasMore) return;
//     const nextPage = (pagination?.page ?? 1) + 1;
//     dispatch(fetchProductsByCategory({ slug, page: nextPage, limit: 8 }));
//   }, [slug, dispatch, loading, hasMore, pagination]);

//   const handleRetry = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 8 }));
//   }, [slug, dispatch]);

//   const waveRef = useRef(null);

//   useEffect(() => {
//     if (!waveRef.current) return;
//     const observer = new IntersectionObserver(
//       ([entry]) => setWaveActive(entry.isIntersecting),
//       { rootMargin: '0px', threshold: 0 }
//     );
//     observer.observe(waveRef.current);
//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!waveActive) return;
//     const interval = setInterval(
//       () => setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length),
//       3333
//     );
//     return () => clearInterval(interval);
//   }, [waveActive]);

//   if (status === 'idle') {
//     return (
//       <div
//         ref={sentinelRef}
//         className="w-full bg-white"
//         style={{ minHeight: '480px' }}
//         aria-hidden="true"
//       />
//     );
//   }

//   if (loading && products.length === 0) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//         <section className="container mx-auto px-4">
//           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//             <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
//             <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
//           </div>
//           {/* Skeleton matches the 1 on Mobile / 4 on LG grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
//             {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
//           </div>
//         </section>
//       </div>
//     );
//   }

// if (error) {
//   return (
//     <div className="w-full bg-white py-8 md:py-16 text-center">
//       <p className="text-red-500 mb-2 font-medium">
//         Failed to load {title}
//       </p>
//       <p className="text-gray-400 text-sm mb-4">
//         {error.message || "Something went wrong"}
//       </p>
//       <button
//         onClick={handleRetry}
//         className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//       >
//         <RefreshCw size={16} /> Try Again
//       </button>
//     </div>
//   );
// }

//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       <div ref={sentinelRef} aria-hidden="true" />

//       <section className="container mx-auto px-4">
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-2xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button
//             onClick={() => navigate(`/category/${slug}`)}
//             className="text-[#f7a221] hidden font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap"
//           >
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {products.length > 0 ? (
//           <>
//             <VirtualizedProductGrid
//               products={products}
//               loadingMore={loadingMore}
//             />

//             {hasMore && (
//               <div className="flex justify-center mt-10">
//                 <button
//                   onClick={handleLoadMore}
//                   disabled={loading}
//                   className={`
//                     inline-flex items-center gap-3 px-10 py-3
//                     text-[11px] font-black uppercase tracking-[0.2em]
//                     border-2 border-zinc-900 transition-all duration-200
//                     ${loading
//                       ? 'bg-zinc-900 text-white cursor-wait opacity-80'
//                       : 'bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95'
//                     }
//                   `}
//                 >
//                   {loadingMore ? (
//                     <>
//                       <Loader2 size={14} className="animate-spin" />
//                       Loading...
//                     </>
//                   ) : (
//                     'Load More'
//                   )}
//                 </button>
//               </div>
//             )}

//             {!hasMore && products.length > 0 && status === 'success' && (
//               <button
//             onClick={() => navigate(`/category/${categoryname}`)}
//             className=" px-10 py-3 mx-auto block mt-10 border-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all"
//           >
//             View All
//           </button>
//             )}
//           </>
//         ) : (
//           <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
//             <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />
//             <div className="relative z-10 flex flex-col items-center">
//               <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
//                 The Vault is Quiet
//               </h3>
//               <button
//                 onClick={() => navigate("/")}
//                 className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600"
//               >
//                 Explore All Collections
//                 <ChevronRight size={14} />
//               </button>
//             </div>
//           </div>
//         )}
//       </section>

//       <div ref={waveRef} className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;

// fix the solo card issue in mobile screens 
// import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { useVirtualizer } from '@tanstack/react-virtual';

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
//   selectStatusBySlug,
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

// import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
// import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
// import useInViewFetch from '../HOOKS/useInViewFetch';

// // ── Wave paths — stable module-level reference ────────────────────────────────
// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// // ── How many columns at each breakpoint (must match Tailwind grid classes) ────
// // Used by the virtualizer to calculate row count from flat product array
// const getColumnCount = () => {
//   const w = window.innerWidth;
//   if (w >= 1024) return 5; // lg:grid-cols-5
//   if (w >= 768)  return 4; // md:grid-cols-4
//   if (w >= 640)  return 3; // sm:grid-cols-3
//   return 1;                // default grid-cols-2 (mobile)
// };

// // ── LOAD MORE SKELETONS COUNT — same as fetch limit ──────────────────────────
// const LOAD_MORE_SKELETON_COUNT = 10;

// // ── VirtualizedProductGrid ────────────────────────────────────────────────────
// // Wraps @tanstack/react-virtual for a CSS grid layout.
// // Virtualizes ROWS (each row = N columns), not individual items.
// // This way we keep our existing CSS grid and only render visible rows.
// const VirtualizedProductGrid = ({ products, loadingMore }) => {
//   const parentRef   = useRef(null);
//   const [cols, setCols] = useState(getColumnCount);

//   // Update column count on resize
//   useEffect(() => {
//     const onResize = () => setCols(getColumnCount());
//     window.addEventListener('resize', onResize);
//     return () => window.removeEventListener('resize', onResize);
//   }, []);

//   // Split flat products array into rows of `cols` items each
//   const rows = useMemo(() => {
//     const result = [];
//     for (let i = 0; i < products.length; i += cols) {
//       result.push(products.slice(i, i + cols));
//     }
//     return result;
//   }, [products, cols]);

//   // Skeleton rows appended at bottom while Load More is in-flight
//   const skeletonRowCount = loadingMore ? Math.ceil(LOAD_MORE_SKELETON_COUNT / cols) : 0;
//   const totalRows        = rows.length + skeletonRowCount;

//   // ── Virtualizer config ────────────────────────────────────────────────────
//   // estimateSize: approximate row height in px (card image + text + button)
//   // overscan: render 2 extra rows above/below viewport for smooth scroll
//   const rowVirtualizer = useVirtualizer({
//     count:        totalRows,
//     getScrollElement: () => parentRef.current,
//     estimateSize: () => 380,   // adjust if your cards are taller/shorter
//     overscan:     2,
//   });

//   return (
//     // ── Scroll container — must have a fixed height for virtualization ────
//     // We use a large enough height so the page itself scrolls, not this div.
//     // `overflow-visible` lets the page handle scrolling naturally.
//     // NOTE: for page-level scroll we use `window` as the scroll container.
//     <div ref={parentRef} style={{ width: '100%' }}>
//       {/* Total height placeholder — keeps scrollbar accurate */}
//       <div
//         style={{
//           height:   `${rowVirtualizer.getTotalSize()}px`,
//           width:    '100%',
//           position: 'relative',
//         }}
//       >
//         {rowVirtualizer.getVirtualItems().map((virtualRow) => {
//           const isSkeletonRow = virtualRow.index >= rows.length;
//           const rowItems      = isSkeletonRow
//             ? Array(cols).fill(null)          // skeleton placeholders
//             : rows[virtualRow.index];

//           return (
//             <div
//               key={virtualRow.key}
//               data-index={virtualRow.index}
//               ref={rowVirtualizer.measureElement}
//               style={{
//                 position:  'absolute',
//                 top:       0,
//                 left:      0,
//                 width:     '100%',
//                 transform: `translateY(${virtualRow.start}px)`,
//               }}
//             >
//               {/* Each row rendered as a grid strip */}
//               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-4 md:pb-6">
//                 {isSkeletonRow
//                   ? Array(cols).fill(null).map((_, i) => (
//                       <SkeletonCard key={`skel-${virtualRow.index}-${i}`} />
//                     ))
//                   : rowItems.map((product, i) => (
//                       <ProductCard
//                         key={product._id}
//                         product={product}
//                         index={virtualRow.index * cols + i}
//                       />
//                     ))
//                 }
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// // ── CategorySection ───────────────────────────────────────────────────────────
// const CategorySection = ({ slug, title }) => {
//   const dispatch  = useDispatch();
//   const navigate  = useNavigate();

//   const [pathIndex,  setPathIndex]  = useState(0);
//   const [waveActive, setWaveActive] = useState(false);

//   // ── Memoized per-slug selectors ───────────────────────────────────────────
//   const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
//   const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
//   const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);
//   const selectStatus     = useMemo(() => selectStatusBySlug(slug),     [slug]);

//   const products   = useSelector(selectProducts);
//   const loading    = useSelector(selectLoading);
//   const error      = useSelector(selectError);
//   const pagination = useSelector(selectPagination);
//   const status     = useSelector(selectStatus);

//   // ── loadingMore: true only when fetching page > 1 (Load More click) ──────
//   // Separate from `loading` so we don't re-show the full skeleton on Load More
//   const currentPage  = pagination?.page ?? 1;
//   const loadingMore  = loading && currentPage > 1;
//   const hasMore      = pagination?.hasNextPage ?? false;

//   // ── Initial fetch — fires once when section enters viewport ──────────────
//   const triggerFetch = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   }, [slug, dispatch]);

//   const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
//     rootMargin: '300px',
//     disabled:   status === 'success' || status === 'error',
//   });

//   // ── Load More handler ─────────────────────────────────────────────────────
//   const handleLoadMore = useCallback(() => {
//     if (loading || !hasMore) return;
//     const nextPage = (pagination?.page ?? 1) + 1;
//     console.log(`📄 [CategorySection] Load More slug="${slug}" → page=${nextPage}`);
//     dispatch(fetchProductsByCategory({ slug, page: nextPage, limit: 10 }));
//   }, [slug, dispatch, loading, hasMore, pagination]);

//   // ── Retry handler ─────────────────────────────────────────────────────────
//   const handleRetry = useCallback(() => {
//     console.log(`🔄 [CategorySection] Retry slug="${slug}"`);
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   }, [slug, dispatch]);

//   // ── Wave animation — paused when section is off-screen ───────────────────
//   const waveRef = useRef(null);

//   useEffect(() => {
//     if (!waveRef.current) return;
//     if (typeof IntersectionObserver === 'undefined') { setWaveActive(true); return; }

//     const observer = new IntersectionObserver(
//       ([entry]) => setWaveActive(entry.isIntersecting),
//       { rootMargin: '0px', threshold: 0 }
//     );
//     observer.observe(waveRef.current);
//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!waveActive) return;
//     const interval = setInterval(
//       () => setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length),
//       3333
//     );
//     return () => clearInterval(interval);
//   }, [waveActive]);

//   // ── Render: Idle (not yet visible) ───────────────────────────────────────
//   // Height-reserved placeholder prevents layout shift (CLS = 0)
//   if (status === 'idle') {
//     return (
//       <div
//         ref={sentinelRef}
//         className="w-full bg-white"
//         style={{ minHeight: '480px' }}
//         aria-hidden="true"
//       />
//     );
//   }

//   // ── Render: Initial Loading (first fetch, no products yet) ───────────────
//   if (loading && products.length === 0) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//         <section className="container mx-auto px-4">
//           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//             <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
//             <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
//           </div>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
//           </div>
//         </section>
//       </div>
//     );
//   }

//   // ── Render: Error ─────────────────────────────────────────────────────────
//   if (error) {
//     console.error(`❌ [CategorySection] slug="${slug}" error:`, error.message);
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
//         <p className="text-gray-400 text-sm mb-4">{error.message}</p>
//         <button
//           onClick={handleRetry}
//           className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//         >
//           <RefreshCw size={16} /> Try Again
//         </button>
//       </div>
//     );
//   }

//   // ── Render: Success ───────────────────────────────────────────────────────
//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       <div ref={sentinelRef} aria-hidden="true" />

//       <section className="container mx-auto px-4">

//         {/* Header */}
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button
//             onClick={() => navigate(`/category/${slug}`)}
//             className="text-[#f7a221] font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap"
//           >
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {/* Products — virtualized grid or empty state */}
//         {products.length > 0 ? (
//           <>
//             {/* ── Virtualized grid ── */}
//             <VirtualizedProductGrid
//               products={products}
//               loadingMore={loadingMore}
//             />

//             {/* ── Load More button ── */}
//             {hasMore && (
//               <div className="flex justify-center mt-10">
//                 <button
//                   onClick={handleLoadMore}
//                   disabled={loading}
//                   className={`
//                     inline-flex items-center gap-3 px-10 py-3
//                     text-[11px] font-black uppercase tracking-[0.2em]
//                     border-2 border-zinc-900 transition-all duration-200
//                     ${loading
//                       ? 'bg-zinc-900 text-white cursor-wait opacity-80'
//                       : 'bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95'
//                     }
//                   `}
//                 >
//                   {loadingMore ? (
//                     <>
//                       <Loader2 size={14} className="animate-spin" />
//                       Loading...
//                     </>
//                   ) : (
//                     'Load More'
//                   )}
//                 </button>
//               </div>
//             )}

//             {/* ── All loaded indicator ── */}
//             {!hasMore && products.length > 0 && status === 'success' && (
//               <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-300 mt-10">
//                 All {products.length} products loaded
//               </p>
//             )}
//           </>
//         ) : (
//           // ── Empty state — category fetched but truly 0 products ──────────
//           <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
//             <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />

//             <div className="relative z-10 flex flex-col items-center">
//               <div className="group relative mb-8 flex h-24 w-24 items-center justify-center">
//                 <div className="absolute inset-0 animate-ping rounded-full bg-zinc-100 opacity-20 duration-[3000ms]" />
//                 <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-500 group-hover:scale-110">
//                   <span className="text-4xl grayscale transition-all duration-500 group-hover:grayscale-0">🔍</span>
//                 </div>
//               </div>
//               <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
//                 The Vault is Quiet
//               </h3>
//               <p className="mx-auto max-w-xs text-sm font-medium leading-relaxed text-zinc-400">
//                 We couldn't find any items matching this selection. Perhaps a different path?
//               </p>
//               <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
//                 <button
//                   onClick={() => navigate("/")}
//                   className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600 active:scale-95"
//                 >
//                   Explore All Collections
//                   <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
//                 </button>
//                 <button
//                   onClick={() => window.location.reload()}
//                   className="border-b-2 border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 transition-all hover:border-zinc-900"
//                 >
//                   Reset Filters
//                 </button>
//               </div>
//             </div>
//             <div className="mt-16 border-t border-zinc-50 pt-8">
//               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
//                 Need help finding something specific?
//                 <a href="/contact" className="ml-2 text-zinc-900 underline underline-offset-4">Talk to us</a>
//               </p>
//             </div>
//           </div>
//         )}
//       </section>

//       {/* Wave Divider — interval paused when off-screen */}
//       <div ref={waveRef} className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;

///try to add virtulization>>>>>>>>>>>>>>>>>>>>>>>
// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw, ChevronRight } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
//   selectStatusBySlug,       // NEW — replaces products.length === 0 guard
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

// import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
// import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';
// import useInViewFetch from '../HOOKS/useInViewFetch'; //RIGHT PATH 

// // ── Wave paths — defined outside component, stable reference ─────────────────
// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// // ── CategorySection ───────────────────────────────────────────────────────────
// const CategorySection = ({ slug, title }) => {
//   const dispatch   = useDispatch();
//   const navigate   = useNavigate();
//   const [pathIndex, setPathIndex]   = useState(0);
//   const [waveActive, setWaveActive] = useState(false); // pause wave when off-screen

//   // ── Memoized selectors — same slug = same function reference ──────────────
//   const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
//   const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
//   const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);
//   const selectStatus     = useMemo(() => selectStatusBySlug(slug),     [slug]);

//   const products   = useSelector(selectProducts);
//   const loading    = useSelector(selectLoading);
//   const error      = useSelector(selectError);
//   const pagination = useSelector(selectPagination);
//   const status     = useSelector(selectStatus);

//   // ── Fetch trigger — called by IntersectionObserver, not on mount ──────────
//   // The thunk's `condition` function handles deduplication at Redux level.
//   // This callback just dispatches — Redux decides whether to actually fetch.
//   const triggerFetch = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   }, [slug, dispatch]);

//   // ── IntersectionObserver hook ─────────────────────────────────────────────
//   // `disabled` = true when data is already loaded (status === 'success')
//   // → observer never attaches, zero overhead for cached sections
//   const { ref: sentinelRef } = useInViewFetch(triggerFetch, {
//     rootMargin: '300px',
//     disabled: status === 'success',
//   });

//   // ── Wave animation — only runs when section is visible ───────────────────
//   // Separate IntersectionObserver just for the wave div visibility check
//   const waveRef = React.useRef(null);

//   useEffect(() => {
//     if (!waveRef.current) return;
//     if (typeof IntersectionObserver === 'undefined') {
//       setWaveActive(true);
//       return;
//     }

//     const observer = new IntersectionObserver(
//       ([entry]) => setWaveActive(entry.isIntersecting),
//       { rootMargin: '0px', threshold: 0 }
//     );
//     observer.observe(waveRef.current);
//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!waveActive) return; // don't run interval when off-screen
//     const interval = setInterval(() => {
//       setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length);
//     }, 3333);
//     return () => clearInterval(interval);
//   }, [waveActive]);

//   // ── Retry handler ─────────────────────────────────────────────────────────
//   const handleRetry = useCallback(() => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   }, [slug, dispatch]);

//   // ── Pagination handler ────────────────────────────────────────────────────
//   // Pagination always goes through — the `condition` in the thunk
//   // allows page !== 1 even if status is 'success'
//   const handlePageChange = useCallback((newPage) => {
//     dispatch(fetchProductsByCategory({ slug, page: newPage, limit: 10 }));
//   }, [slug, dispatch]);

//   // ── Render: Idle / Pre-visible ────────────────────────────────────────────
//   // Section hasn't entered viewport yet. Render a placeholder with the correct
//   // grid height so the page layout doesn't collapse. This is what prevents
//   // layout shift (CLS) — the page reserves space before data loads.
//   // minHeight matches ~5 rows of product cards (adjust to your card height).
//   if (status === 'idle') {
//     return (
//       <div
//         ref={sentinelRef}
//         className="w-full bg-white"
//         style={{ minHeight: '480px' }} // matches skeleton grid height
//         aria-hidden="true"
//       />
//     );
//   }

//   // ── Render: Loading ───────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//         <section className="container mx-auto px-4">
//           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//             <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
//             <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
//           </div>
//           {/* Skeleton grid — same columns as real grid, so height is identical */}
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {[...Array(10)].map((_, i) => (
//               <SkeletonCard key={i} />
//             ))}
//           </div>
//         </section>
//       </div>
//     );
//   }

//   // ── Render: Error ─────────────────────────────────────────────────────────
//   if (error) {
//     console.error(`❌ [CategorySection] slug="${slug}" error:`, error.message);
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
//         <p className="text-gray-400 text-sm mb-4">{error.message}</p>
//         <button
//           onClick={handleRetry}
//           className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//         >
//           <RefreshCw size={16} /> Try Again
//         </button>
//       </div>
//     );
//   }

//   // ── Render: Success ───────────────────────────────────────────────────────
//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       {/*
//         sentinel ref lives here too — even after success, we keep the div
//         so the ref element stays mounted. The hook ignores it (disabled=true)
//         but it keeps the DOM stable.
//       */}
//       <div ref={sentinelRef} aria-hidden="true" />

//       <section className="container mx-auto px-4">

//         {/* Header */}
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button className="text-[#f7a221] font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap">
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {/* Products Grid */}
//         {products.length > 0 ? (
//           <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {products.map((product, index) => (
//               <ProductCard key={product._id} product={product} index={index} />
//             ))}
//           </div>
//         ) : (
//           // ── Empty state ─────────────────────────────────────────────────
//           // status === 'success' but 0 products = truly empty category
//           // (not "never fetched" — that's fixed by the status guard above)
//           <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
//             <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />

//             <div className="relative z-10 flex flex-col items-center">
//               <div className="group relative mb-8 flex h-24 w-24 items-center justify-center">
//                 <div className="absolute inset-0 animate-ping rounded-full bg-zinc-100 opacity-20 duration-[3000ms]" />
//                 <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-500 group-hover:scale-110">
//                   <span className="text-4xl grayscale transition-all duration-500 group-hover:grayscale-0">
//                     🔍
//                   </span>
//                 </div>
//               </div>

//               <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
//                 The Vault is Quiet
//               </h3>
//               <p className="mx-auto max-w-xs text-sm font-medium leading-relaxed text-zinc-400">
//                 We couldn't find any items matching this selection.
//                 Perhaps a different path?
//               </p>

//               <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
//                 <button
//                   onClick={() => navigate("/")}
//                   className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600 active:scale-95"
//                 >
//                   Explore All Collections
//                   <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
//                 </button>

//                 <button
//                   onClick={() => window.location.reload()}
//                   className="border-b-2 border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 transition-all hover:border-zinc-900"
//                 >
//                   Reset Filters
//                 </button>
//               </div>
//             </div>

//             <div className="mt-16 border-t border-zinc-50 pt-8">
//               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
//                 Need help finding something specific?
//                 <a href="/contact" className="ml-2 text-zinc-900 underline underline-offset-4">Talk to us</a>
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Pagination */}
//         {pagination?.totalPages > 1 && (
//           <div className="flex justify-center items-center space-x-4 mt-10">
//             <button
//               onClick={() => handlePageChange(pagination.page - 1)}
//               disabled={!pagination.hasPrevPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasPrevPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Previous
//             </button>
//             <span className="text-gray-600 text-sm">
//               Page {pagination.page} of {pagination.totalPages}
//             </span>
//             <button
//               onClick={() => handlePageChange(pagination.page + 1)}
//               disabled={!pagination.hasNextPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasNextPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </section>

//       {/* Wave Divider — interval paused when off-screen */}
//       <div ref={waveRef} className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;


// CODE IS WORKING BUT UPPER CODE HAVE OPTIMZATION >>>???????????????????????
// import React, { useState, useEffect, useMemo } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw, ChevronRight } from 'lucide-react';
// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';
// import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
// import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';

// // ── outside component — stable reference
// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// const CategorySection = ({ slug, title }) => {
//   const dispatch = useDispatch();
//   const [pathIndex, setPathIndex] = useState(0);

//   // ── Memoize selector instances so the same function reference is reused
//   // across renders for the same slug. Without this, each render creates a
//   // brand-new selector function → react-redux detects a changed selector →
//   // warns about "different result with same parameters".
//   const selectProducts   = useMemo(() => selectProductsBySlug(slug),   [slug]);
//   const selectLoading    = useMemo(() => selectLoadingBySlug(slug),    [slug]);
//   const selectError      = useMemo(() => selectErrorBySlug(slug),      [slug]);
//   const selectPagination = useMemo(() => selectPaginationBySlug(slug), [slug]);

//   const products   = useSelector(selectProducts);
//   const loading    = useSelector(selectLoading);
//   const error      = useSelector(selectError);
//   const pagination = useSelector(selectPagination);

//   useEffect(() => {
//     if (!products || products.length === 0) {
//       dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//     }
//   }, [slug, dispatch]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length);
//     }, 3333);
//     return () => clearInterval(interval);
//   }, []);

//   const handleRetry = () => {
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   };

//   const handlePageChange = (newPage) => {
//     dispatch(fetchProductsByCategory({ slug, page: newPage, limit: 10 }));
//   };

//   // ── Loading ───────────────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//         <section className="container mx-auto px-4">
//           <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//             <div className="h-8 md:h-10 w-56 bg-gray-100 animate-pulse rounded" />
//             <div className="h-5 w-24 bg-gray-100 animate-pulse rounded mt-4 sm:mt-0" />
//           </div>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {[...Array(10)].map((_, i) => (
//               <SkeletonCard key={i} />
//             ))}
//           </div>
//         </section>
//       </div>
//     );
//   }

//   // ── Error ─────────────────────────────────────────────────────────────────
//   if (error) {
//     console.error(`❌ [CategorySection] slug="${slug}" error:`, error.message);
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
//         <p className="text-gray-400 text-sm mb-4">{error.message}</p>
//         <button
//           onClick={handleRetry}
//           className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//         >
//           <RefreshCw size={16} /> Try Again
//         </button>
//       </div>
//     );
//   }

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       <section className="container mx-auto px-4">

//         {/* Header */}
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button className="text-[#f7a221] font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap">
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {/* Products Grid */}
//         {products.length > 0 ? (
//           <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {products.map((product, index) => (
//               <ProductCard key={product._id} product={product} index={index} />
//             ))}
//           </div>
//         ) : (
//           <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-24 px-6 text-center shadow-sm">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
//             <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-zinc-100/50 blur-3xl" />

//             <div className="relative z-10 flex flex-col items-center">
//               <div className="group relative mb-8 flex h-24 w-24 items-center justify-center">
//                 <div className="absolute inset-0 animate-ping rounded-full bg-zinc-100 opacity-20 duration-[3000ms]" />
//                 <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-500 group-hover:scale-110">
//                   <span className="text-4xl grayscale transition-all duration-500 group-hover:grayscale-0">
//                     🔍
//                   </span>
//                 </div>
//               </div>

//               <h3 className="mb-2 text-xl font-black uppercase tracking-tighter text-zinc-900 md:text-2xl">
//                 The Vault is Quiet
//               </h3>
//               <p className="mx-auto max-w-xs text-sm font-medium leading-relaxed text-zinc-400">
//                 We couldn't find any items matching this selection.
//                 Perhaps a different path?
//               </p>

//               <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
//                 <button
//                   onClick={() => navigate("/")}
//                   className="group flex items-center gap-3 bg-zinc-900 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-600 active:scale-95"
//                 >
//                   Explore All Collections
//                   <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
//                 </button>

//                 <button
//                   onClick={() => window.location.reload()}
//                   className="border-b-2 border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 transition-all hover:border-zinc-900"
//                 >
//                   Reset Filters
//                 </button>
//               </div>
//             </div>

//             <div className="mt-16 border-t border-zinc-50 pt-8">
//               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
//                 Need help finding something specific?
//                 <a href="/contact" className="ml-2 text-zinc-900 underline underline-offset-4">Talk to us</a>
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Pagination */}
//         {pagination?.totalPages > 1 && (
//           <div className="flex justify-center items-center space-x-4 mt-10">
//             <button
//               onClick={() => handlePageChange(pagination.page - 1)}
//               disabled={!pagination.hasPrevPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasPrevPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Previous
//             </button>
//             <span className="text-gray-600 text-sm">
//               Page {pagination.page} of {pagination.totalPages}
//             </span>
//             <button
//               onClick={() => handlePageChange(pagination.page + 1)}
//               disabled={!pagination.hasNextPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasNextPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </section>

//       {/* Wave Divider */}
//       <div className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;
// loading dots down side code upper have skelleton 
// import React, { useState, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowRight, RefreshCw } from 'lucide-react';
// import {
//   fetchProductsByCategory,
//   selectProductsBySlug,
//   selectLoadingBySlug,
//   selectErrorBySlug,
//   selectPaginationBySlug,
// } from '../REDUX_FEATURES/REDUX_SLICES/userProductsSlice';
// import ProductCard from '../../pages/Product_segment/ProductCard';

// // ── outside component — stable reference, no re-creation on render
// const WAVE_PATHS = [
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
//   "M0,60 C400,0 800,120 1200,60 L1200,120 L0,120 Z",
//   "M0,60 C300,120 600,0 900,60 L1200,60 L1200,120 L0,120 Z",
// ];

// const CategorySection = ({ slug, title }) => {
//   const dispatch = useDispatch();
//   const [pathIndex, setPathIndex] = useState(0);

//   // ✅ each instance reads its own slug's data — zero conflict
//   const products   = useSelector(selectProductsBySlug(slug));
//   const loading    = useSelector(selectLoadingBySlug(slug));
//   const error      = useSelector(selectErrorBySlug(slug));
//   const pagination = useSelector(selectPaginationBySlug(slug));

//   // fetch on mount, skip if already cached
//   useEffect(() => {
//     if (!products || products.length === 0) {
//       console.log(`🚀 [CategorySection] Fetching slug="${slug}"`);
//       dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//     }
//   }, [slug, dispatch]);

//   // wave animation
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setPathIndex((prev) => (prev + 1) % WAVE_PATHS.length);
//     }, 3333);
//     return () => clearInterval(interval);
//   }, []);

//   const handleRetry = () => {
//     console.log(`🔄 [CategorySection] Retrying slug="${slug}"`);
//     dispatch(fetchProductsByCategory({ slug, page: 1, limit: 10 }));
//   };

//   const handlePageChange = (newPage) => {
//     console.log(`📄 [CategorySection] slug="${slug}" → page=${newPage}`);
//     dispatch(fetchProductsByCategory({ slug, page: newPage, limit: 10 }));
//   };

//   // ── Loading ───────────────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <div className="flex justify-center items-center space-x-2">
//           <div className="w-4 h-4 bg-[#f7a221] rounded-full animate-bounce" />
//           <div className="w-4 h-4 bg-[#f7a221] rounded-full animate-bounce delay-100" />
//           <div className="w-4 h-4 bg-[#f7a221] rounded-full animate-bounce delay-200" />
//         </div>
//         <p className="mt-4 text-gray-500 text-sm">Loading {title}...</p>
//       </div>
//     );
//   }

//   // ── Error ─────────────────────────────────────────────────────────────────
//   if (error) {
//     console.error(`❌ [CategorySection] slug="${slug}" error:`, error.message);
//     return (
//       <div className="w-full bg-white py-8 md:py-16 text-center">
//         <p className="text-red-500 mb-2 font-medium">Failed to load {title}</p>
//         <p className="text-gray-400 text-sm mb-4">{error.message}</p>
//         <button
//           onClick={handleRetry}
//           className="inline-flex items-center gap-2 px-6 py-2 bg-[#f7a221] text-white rounded-lg hover:bg-[#e09110] transition-colors"
//         >
//           <RefreshCw size={16} /> Try Again
//         </button>
//       </div>
//     );
//   }

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="w-full bg-white py-8 md:py-16 overflow-hidden">
//       <section className="container mx-auto px-4">

//         {/* Header */}
//         <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12">
//           <h3 className="text-xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
//             <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
//             {title}
//           </h3>
//           <button className="text-[#f7a221] font-bold flex items-center gap-2 group text-sm uppercase tracking-wider transition-all whitespace-nowrap">
//             Explore All
//             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//           </button>
//         </div>

//         {/* Products Grid */}
//         {products.length > 0 ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
//             {products.map((product, index) => (
//               <ProductCard key={product._id} product={product} index={index} />
//             ))}
//           </div>
//         ) : (
//           <div className="text-center py-16 bg-gray-50 rounded-2xl">
//             <p className="text-gray-500">No products found in this category</p>
//           </div>
//         )}

//         {/* Pagination */}
//         {pagination?.totalPages > 1 && (
//           <div className="flex justify-center items-center space-x-4 mt-10">
//             <button
//               onClick={() => handlePageChange(pagination.page - 1)}
//               disabled={!pagination.hasPrevPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasPrevPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Previous
//             </button>
//             <span className="text-gray-600 text-sm">
//               Page {pagination.page} of {pagination.totalPages}
//             </span>
//             <button
//               onClick={() => handlePageChange(pagination.page + 1)}
//               disabled={!pagination.hasNextPage}
//               className={`px-4 py-2 rounded-lg transition-colors ${
//                 pagination.hasNextPage
//                   ? 'bg-[#f7a221] text-white hover:bg-[#e09110]'
//                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//               }`}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </section>

//       {/* Wave Divider */}
//       <div className="relative h-16 md:h-20 overflow-hidden mt-10">
//         <svg
//           viewBox="0 0 1200 120"
//           preserveAspectRatio="none"
//           className="absolute bottom-0 w-full h-full text-gray-50"
//         >
//           <path
//             d={WAVE_PATHS[pathIndex]}
//             fill="currentColor"
//             style={{ transition: 'd 3333ms ease-in-out' }}
//           />
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default CategorySection;