import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw, AlertCircle, X } from 'lucide-react';

import {
  fetchWishlist,
  removeFromWishlist,
  clearWishlistErrors,
  selectWishlistItems,
  selectWishlistLoading,
  selectWishlistError,
} from '../../../components/REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';

// ── Reuse existing shared components ─────────────────────────────────────────
import ProductCard from '../../Product_segment/ProductCard';
import SkeletonCard from '../../Product_segment/Product_Card_Skelleton/SkeletonCard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [UserWishlist] ERROR in ${context}`);
//   console.error('Error:', error);
//   console.log('Info:', info);
//   console.groupEnd();
// };

// ─────────────────────────────────────────────────────────────────────────────
// UserWishlist
// ─────────────────────────────────────────────────────────────────────────────
const UserWishlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ── Redux ─────────────────────────────────────────────────────────────────
  const items   = useSelector(selectWishlistItems);
  console.log("Wishlist", items);
  
  const loading = useSelector(selectWishlistLoading);
  const error   = useSelector(selectWishlistError);

  // ── Fetch on mount — self-contained ──────────────────────────────────────
  useEffect(() => {
    console.log('💛 [UserWishlist] mounted — fetching wishlist');
    dispatch(fetchWishlist())
      .unwrap()
      .then((d) => console.log(`✅ [UserWishlist] loaded ${d?.products?.length ?? 0} items`))
      .catch((e) => logError('fetchWishlist on mount', e));

    return () => { dispatch(clearWishlistErrors()); };
  }, [dispatch]);

     const getCategoryName = (productCategory) => {
     
     if (!productCategory) return "Uncategorized";
     const found = categories.find((cat) => cat._id === productCategory || cat.name === productCategory
    );
    return found ? found.name : "Uncategorized";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Wishlist item shape from API:
  //   item.productId → fully populated product object (same shape as CatProducts)
  //   item.productId.variants[] → variants with images, prices etc.
  //
  // ProductCard expects a `product` prop that matches the product API shape.
  // So we simply pass item.productId as the product — it's already populated.
  // ─────────────────────────────────────────────────────────────────────────
 // ✅ Correct
const products = items
  .map((item) => item?.product)   // directly product object lo
  .filter(Boolean);               // null/undefined hata do
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);

  return (
   <div className="space-y-5 sm:space-y-8">

  {/* ── Header ── */}
  <div className="flex items-start sm:items-center justify-between gap-3">

    <div className="min-w-0">
      <h1
        className="
         text-lg sm:text-xl
         md:text-2xl
          font-black
          text-gray-900
          tracking-tight
          break-words
        "
      >
        Saved Items
      </h1>

      {!loading.fetch && products.length > 0 && (
        <p
          className="
            mt-1
            text-xs sm:text-sm
            text-gray-400
            font-medium
            break-words
          "
        >
          {products.length} item{products.length !== 1 ? "s" : ""} saved
        </p>
      )}
    </div>

    <button
      onClick={() => dispatch(fetchWishlist())}
      disabled={loading.fetch}
      aria-label="Refresh wishlist"
      className="
        shrink-0
        p-2.5
        hover:bg-gray-100
        cursor-pointer
        rounded-xl
        transition-colors
        disabled:opacity-40
      "
    >
      <RefreshCw
        size={18}
        className={`text-gray-400 ${
          loading.fetch ? "animate-spin" : ""
        }`}
      />
    </button>
  </div>

  {/* ── Error banner ── */}
  {(error.fetch || error.remove || error.add) && (
    <div
      className="
        flex items-start gap-3
        bg-red-50
        border border-red-100
        rounded-2xl
        px-4 py-3
      "
    >
      <AlertCircle
        size={16}
        className="text-red-400 mt-0.5 shrink-0"
      />

      <p
        className="
          flex-1
          text-xs sm:text-sm
          font-semibold
          text-red-600
          break-words
          leading-relaxed
        "
      >
        {error.fetch?.message ||
          error.remove?.message ||
          error.add?.message ||
          "Something went wrong"}
      </p>

      <button
        onClick={() => dispatch(clearWishlistErrors())}
        className="
          text-red-300
          hover:text-red-500
          transition-colors
          shrink-0
          cursor-pointer
        "
      >
        <X size={14} />
      </button>
    </div>
  )}

  {/* ── Loading skeletons ── */}
  {loading.fetch && products.length === 0 && (
    <div
      className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        gap-4 sm:gap-5 md:gap-6
      "
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="
            animate-pulse
            rounded-3xl
            overflow-hidden
          "
        >
          {/* Image */}
          <div
            className="
              aspect-[4/5]
              bg-zinc-100
              rounded-2xl
              mb-4
              overflow-hidden
              relative
            "
          >
            <div
              className="
                absolute inset-0
                -translate-x-full
                animate-[shimmer_1.5s_infinite]
                bg-gradient-to-r
                from-transparent
                via-white/50
                to-transparent
              "
            />
          </div>

          {/* Category */}
          <div className="h-2.5 bg-zinc-100 rounded-full w-1/4 mb-3" />

          {/* Title */}
          <div className="h-3.5 bg-zinc-100 rounded-full w-11/12 mb-2" />
          <div className="h-3.5 bg-zinc-100 rounded-full w-3/4 mb-4" />

          {/* Price */}
          <div className="flex items-center gap-3">
            <div className="h-4 bg-zinc-200 rounded-full w-20" />
            <div className="h-3 bg-zinc-100 rounded-full w-12" />
            <div className="h-3 bg-zinc-100 rounded-full w-10 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )}

  {/* ── Fetch failed + empty ── */}
  {error.fetch && products.length === 0 && !loading.fetch && (
    <div
      className="
        flex flex-col
        items-center justify-center
        py-16 sm:py-20
        gap-4
        text-center
      "
    >
      <AlertCircle size={36} className="text-red-300" />

      <p
        className="
          text-gray-500
          font-medium
          text-sm
          leading-relaxed
          max-w-sm
          px-4
        "
      >
        {error.fetch.message || "Failed to load wishlist"}
      </p>

      <button
        onClick={() => dispatch(fetchWishlist())}
        className="
          flex items-center gap-2
          bg-[#F7A221]
          text-white
          text-xs
          font-bold
          uppercase
          tracking-wider
          px-6 py-3
          rounded-2xl
          hover:bg-black
          transition-colors
          active:scale-95
          cursor-pointer
        "
      >
        <RefreshCw size={14} />
        Try Again
      </button>
    </div>
  )}

  {/* ── Products grid ── */}
  {products.length > 0 && (
    <div
      className="
       grid
    grid-cols-2
    md:grid-cols-3
    gap-2 sm:gap-4 lg:gap-5
      "
    >
      {products.map((product, idx) => (
       <div
  key={product._id || product.slug || idx}
  className="
    min-w-0
    scale-[0.98] sm:scale-100
    origin-top
  "
>
          <ProductCard
            product={product}
            index={idx}
            seed={idx}
          />
        </div>
      ))}
    </div>
  )}

  {/* ── Empty state ── */}
  {!loading.fetch &&
    !error.fetch &&
    products.length === 0 && (
      <div
        className="
          flex flex-col
          items-center justify-center
          py-20 sm:py-24
          gap-5
          text-center
          px-4
        "
      >
        <div
          className="
            w-16 h-16 sm:w-24 sm:h-24
            bg-orange-50
            rounded-full
            flex items-center justify-center
          "
        >
          <Heart
            size={32}
            className="text-[#F7A221]"
          />
        </div>

        <div>
          <h3
            className="
              text-lg sm:text-xl
              font-black
              text-gray-900
              tracking-tight
            "
          >
            Nothing saved yet
          </h3>

          <p
            className="
              text-gray-400
              text-sm
              mt-1
              max-w-xs
              leading-relaxed
            "
          >
            Browse products and tap the heart icon
            to save items here
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="
            text-[#F7A221]
            font-black
            text-xs
            uppercase
            underline
            underline-offset-4
            hover:text-[#e6941e]
            transition-colors
            cursor-pointer
          "
        >
          Start Shopping
        </button>
      </div>
    )}
</div>
  );
};

export default UserWishlist;
