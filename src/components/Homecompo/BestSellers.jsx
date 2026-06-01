import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import {
  fetchFeaturedProducts,
  selectFeaturedProducts,
  selectProductsLoading,
  selectProductsError,
  selectProductPagination,
} from '../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice';

import ProductCard from '../../User_Side_Web_Interface/Product_segment/ProductCard';
import SkeletonCard from '../../User_Side_Web_Interface/Product_segment/Product_Card_Skelleton/SkeletonCard';

const LIMIT = 12; // Changed to 12 to show 6 cards initially (2 rows of 6)

const BestSellers = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const [page, setPage] = useState(1);

  const products   = useSelector(selectFeaturedProducts);
  const loading    = useSelector(selectProductsLoading);
  const error      = useSelector(selectProductsError);
  const pagination = useSelector(selectProductPagination);

  const isLoading      = loading.featured;
  const hasError       = !!error.featured;
  const hasProducts    = products?.length > 0;
  const showSkeleton   = isLoading && page === 1;
  const isFetchingMore = isLoading && page > 1;

  // ── Initial fetch
  useEffect(() => {
    dispatch(fetchFeaturedProducts({ limit: LIMIT, page: 1 }));
  }, [dispatch]);

  // ── Load More fetch — sirf page > 1 pe
  useEffect(() => {
    if (page === 1) return;
    dispatch(fetchFeaturedProducts({ limit: LIMIT, page }));
  }, [page, dispatch]);

  const handleLoadMore = () => {
    if (isLoading) return;
    if (!canLoadMoreFeatured) return;
    setPage((prev) => prev + 1);
  };

  /** More featured items exist on the server (not yet in `products`). */
  const canLoadMoreFeatured =
    Boolean(pagination?.hasNextPage) ||
    (typeof pagination?.total === 'number' &&
      pagination.total > 0 &&
      products.length < pagination.total);

  // ── Error
  if (hasError && !hasProducts) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-20 font-sans">
        <div className="flex items-end justify-between mb-10 border-b border-zinc-100 pb-6" id="best-sellers">
          <h2 className="text-3xl md:text-5xl font-outfit tracking-tighter uppercase">
            Just <span className="text-yellow-600 font-outfit">Arrived</span>
          </h2>
        </div>
        <div className="py-20 text-center border-2 border-dashed border-zinc-100">
          <p className="text-zinc-500 mb-2">Failed to load products</p>
          <p className="text-zinc-400 text-xs mb-6">{error.featured?.message}</p>
          <button
            onClick={() => {
              setPage(1);
              dispatch(fetchFeaturedProducts({ limit: LIMIT, page: 1 }));
            }}
            className="bg-zinc-900 text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-yellow-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-20 font-">

      {/* Header */}
      <div className="flex items-end justify-between mb-10 border-b border-zinc-100 pb-6" id="best-sellers">
        <div className="space-y-1">
          
           <h3 className="text-2xl sm:text-2xl md:text-4xl font-lato flex items-center gap-2 md:gap-4 text-gray-900 mb-4 sm:mb-0">
            <span className="w-2 h-8 md:w-3 md:h-12 bg-[#f7a221] rounded-full" />
            Just Arrived
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="w-4 h-[1px] bg-yellow-600" />
            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-yellow-600 underline underline-offset-4">
              Community Favorites
            </p>
          </div>
        </div>
        {/* <button
          onClick={() => navigate('/products')}
          className="hidden sm:block text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white px-6 py-3 hover:bg-zinc-800 transition-all"
        >
          Explore All
        </button> */}
      </div>

      {/* Skeleton - matches 6 cards on large screens, 2 on small */}
      {showSkeleton && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-6 lg:gap-x-8">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Product Grid - 2 cols on mobile, 3 on tablet, 6 on large screens */}
      {!showSkeleton && hasProducts && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-6 lg:gap-x-8">
          {products.map((product, index) => (
            <div
              key={product._id || index}
              className="animate-slide-up w-full"
              style={{
                animationDelay: `${(index % 6) * 80}ms`,
                animationFillMode: 'both',
              }}
            >
              <ProductCard product={product} index={index} seed={index} />
            </div>
          ))}
        </div>
      )}

      {/* Load More / Spinner / End */}
      {!showSkeleton && hasProducts && (
        <div className="flex justify-center items-center mt-10">
          {isFetchingMore ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 font-semibold">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading more...
            </div>
          ) : canLoadMoreFeatured ? (
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="inline-flex cursor-pointer items-center gap-3 px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] border-2 border-zinc-900 bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load More
            </button>
          ) : null}
        </div>
      )}

      <style>{`
        @keyframes slideUpFade {
          0%   { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUpFade 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

    </section>
  );
};

export default BestSellers;

