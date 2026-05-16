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
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Saved Items</h1>
          {!loading.fetch && products.length > 0 && (
            <p className="text-sm text-gray-400 mt-1 font-medium">
              {products.length} item{products.length !== 1 ? 's' : ''} saved
            </p>
          )}
        </div>
        <button
          onClick={() => dispatch(fetchWishlist())}
          disabled={loading.fetch}
          aria-label="Refresh wishlist"
          className="p-2 hover:bg-gray-100 cursor-pointer rounded-xl transition-colors disabled:opacity-40"
        >
          <RefreshCw
            size={18}
            className={`text-gray-400 ${loading.fetch ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* ── Error banner ── */}
      {(error.fetch || error.remove || error.add) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-600 flex-1">
            {error.fetch?.message || error.remove?.message || error.add?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => dispatch(clearWishlistErrors())}
            className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Loading skeletons — reuse SkeletonCard ── */}
     {loading.fetch && products.length === 0 && (
  <div className="grid grid-cols-1 md:grid-cols-1 gap-5 md:gap-6">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="animate-pulse">
        {/* Image */}
        <div className="aspect-[4/5] bg-zinc-100 rounded-2xl mb-4 overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
        {/* Category tag */}
        <div className="h-2.5 bg-zinc-100 rounded-full w-1/4 mb-3" />
        {/* Title — 2 lines */}
        <div className="h-3.5 bg-zinc-100 rounded-full w-11/12 mb-2" />
        <div className="h-3.5 bg-zinc-100 rounded-full w-3/4 mb-4" />
        {/* Price row */}
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
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle size={36} className="text-red-300" />
          <p className="text-gray-500 font-medium">
            {error.fetch.message || 'Failed to load wishlist'}
          </p>
          <button
            onClick={() => dispatch(fetchWishlist())}
            className="flex items-center gap-2 bg-[#F7A221] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-2xl hover:bg-black transition-colors active:scale-95"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── Products grid — reuse ProductCard ── */}
      {products.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
    {products.map((product, idx) => (
      <ProductCard
        key={product._id || product.slug || idx}
        product={product}
        index={idx}
        seed={idx}
        
      />
    ))}
  </div>
)}

      {/* ── Empty state ── */}
      {!loading.fetch && !error.fetch && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center">
            <Heart size={36} className="text-[#F7A221]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              Nothing saved yet
            </h3>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              Browse products and tap the heart icon to save items here
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-[#F7A221] font-black text-xs uppercase underline underline-offset-4 hover:text-[#e6941e] transition-colors"
          >
            Start Shopping
          </button>
        </div>
      )}

    </div>
  );
};

export default UserWishlist;

// import React from 'react';
// import { ShoppingBag, X } from 'lucide-react';

// const UserWishlist = () => {
//   return (
//     <div className="space-y-8">
//       <h1 className="text-3xl font-black text-gray-900 tracking-tight">Saved Items</h1>
      
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//         {/* Wishlist Card */}
//         <div className="relative group bg-gray-50 rounded-[32px] overflow-hidden p-4 hover:shadow-2xl transition-all duration-500 border border-gray-100">
//           <button className="absolute top-6 right-6 z-10 bg-white/80 backdrop-blur-md p-2 rounded-full hover:bg-red-500 hover:text-white transition-all">
//             <X size={16} />
//           </button>
          
//           <div className="aspect-[4/5] bg-gray-200 rounded-2xl mb-4 overflow-hidden">
//              {/* Product Image Here */}
//              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold uppercase text-[10px]">Image Placeholder</div>
//           </div>

//           <div className="px-2">
//             <h3 className="font-black text-gray-900 truncate">Premium Cotton T-Shirt</h3>
//             <p className="text-lg font-black text-[#F7A221] mt-1">₹899</p>
            
//             <button className="w-full mt-4 bg-black text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-95">
//               <ShoppingBag size={18} />
//               Add to Cart
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UserWishlist;