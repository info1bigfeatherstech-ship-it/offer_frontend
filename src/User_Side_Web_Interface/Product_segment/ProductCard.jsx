import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Heart, Eye, Minus, Plus, Loader2, Star } from "lucide-react";

import {
  addToWishlist, removeFromWishlist,
  addGuestItem, removeGuestItem,
  selectIsWishlisted,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";

import {
  addToCart, updateCartItem, removeCartItem,
  addGuestCartItem, updateGuestCartItem, removeGuestCartItem,
  selectCartItemBySlug,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

import LazyImage from "./LazyImage";
import { fetchCategories } from "../../components/ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice";
import { getProductRatingDisplay } from "../../utils/productRatingDisplay";

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatPrice = (n) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
};

const formatCount = (count) => {
  if (!count) return "0";
  if (count < 100) return count.toString();
  return Math.floor(count / 100) * 100 + "+";
};

const logError = (ctx, err, info = {}) => {
  console.group(`🔴 [ProductCard] ${ctx}`);
  console.error(err);
  console.log(info);
  console.groupEnd();
};


// ── Component ─────────────────────────────────────────────────────────────────
const ProductCard = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories } = useSelector((s) => s.categories);

  const { isLoggedIn } = useSelector((state) => state.auth);
  const wishlisted = useSelector(selectIsWishlisted(product?.slug));
  const cartItem = useSelector(selectCartItemBySlug(product?.slug));

  const [localLoading, setLocalLoading] = useState({
    add: false, update: false, remove: false, wishlist: false,
  });
  const setL = (k, v) => setLocalLoading((p) => ({ ...p, [k]: v }));
  const isProcessing = localLoading.add || localLoading.update || localLoading.remove;
  const getCategoryName = (productCategory) => {

    if (!productCategory) return "Uncategorized";
    const found = categories.find((cat) => cat._id === productCategory || cat.name === productCategory
    );
    return found ? found.name : "Uncategorized";
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const variant = product?.variants?.[0] ?? {};
  const name = product?.name || product?.title;
  const title = product?.title || product?.name || "Product";

  const salePrice = variant.price?.sale ?? variant.price?.base ?? null;
  const basePrice = variant.price?.base ?? null;
  const hasDiscount = basePrice != null && salePrice != null && basePrice > salePrice;
  const discountPct = variant.discountPercentage ??
    (hasDiscount ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null);
  const imgUrl = variant.images?.[0]?.url || null;
  const maxStock = variant.inventory?.trackInventory
    ? (variant.inventory?.quantity ?? 0) : Infinity;
  const inStock = maxStock > 0;
  const isInCart = !!cartItem;
  const currentQty = cartItem?.quantity ?? 0;
  const isAtMaxStock = currentQty >= maxStock && maxStock !== Infinity;

  const isOnSale = Array.isArray(product?.appliedTags)
    && product.appliedTags.includes("on-sale");

  const category = typeof product?.category === "object"
    ? product.category?.name
    : product?.category || "";

  const ratingUi = useMemo(() => getProductRatingDisplay(product, null), [product]);

  useEffect(() => {
    dispatch(fetchCategories());
    // console.log("I m being rendered");

  }, [dispatch])


  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCardClick = () => {
    if (product?.slug) navigate(`/products/${product.slug}`);
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    if (!product?.slug || localLoading.wishlist) return;
    setL("wishlist", true);
    try {
      if (isLoggedIn) {
        if (wishlisted) {
          await dispatch(removeFromWishlist({ productSlug: product.slug })).unwrap();
          toast.success("Removed from wishlist", { icon: "💔" });
        } else {
          await dispatch(addToWishlist({ productSlug: product.slug })).unwrap();
          toast.success("Added to wishlist", { icon: "❤️" });
        }
      } else {
        if (wishlisted) { dispatch(removeGuestItem(product.slug)); toast.success("Removed", { icon: "💔" }); }
        else { dispatch(addGuestItem(product.slug)); toast.success("Saved to wishlist", { icon: "❤️" }); }
      }
    } catch (err) {
      logError("handleWishlist", err, { slug: product.slug });
      toast.error(err?.message || "Wishlist action failed");
    } finally { setL("wishlist", false); }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (isInCart || isProcessing || !inStock || !product?.slug) return;
    setL("add", true);
    try {
      if (isLoggedIn) {
        await dispatch(addToCart({
          productSlug: product.slug,
          variantId: variant?._id?.toString(),
          quantity: 1,
        })).unwrap();
      } else {
        dispatch(addGuestCartItem({
          productId: product._id,
          productSlug: product.slug,
          variantId: variant?._id?.toString() || "",
          quantity: 1,
        }));
      }
      toast.success("Added to cart");
    } catch (err) {
      logError("handleAddToCart", err, { slug: product.slug });
      toast.error(err?.message || "Failed to add to cart");
    } finally { setL("add", false); }
  };

  const handleIncrement = async (e) => {
    e.stopPropagation();
    if (isAtMaxStock) { toast.warning(`Max stock reached (${maxStock})`); return; }
    if (isProcessing) return;
    const newQty = currentQty + 1;
    setL("update", true);
    try {
      if (isLoggedIn) {
        await dispatch(updateCartItem({
          productId: String(cartItem?.productId?._id || cartItem?.productId),
          variantId: String(cartItem?.variantId),
          quantity: newQty,
          productSlug: product.slug,
        })).unwrap();
      } else {
        dispatch(updateGuestCartItem({
          productSlug: product.slug,
          variantId: variant?._id?.toString() || "",
          quantity: newQty,
        }));
      }
    } catch (err) {
      logError("handleIncrement", err);
      toast.error(err?.message || "Failed to update");
    } finally { setL("update", false); }
  };

  const handleDecrement = async (e) => {
    e.stopPropagation();
    if (isProcessing) return;
    const newQty = currentQty - 1;
    if (isLoggedIn) {
      if (newQty <= 0) {
        setL("remove", true);
        try {
          await dispatch(removeCartItem({
            productId: String(cartItem?.productId?._id || cartItem?.productId),
            variantId: String(cartItem?.variantId),
            productSlug: product.slug,
          })).unwrap();
          toast.info("Removed from cart");
        } catch (err) {
          logError("handleDecrement→remove", err);
          toast.error(err?.message || "Failed to remove");
        } finally { setL("remove", false); }
      } else {
        setL("update", true);
        try {
          await dispatch(updateCartItem({
            productId: String(cartItem?.productId?._id || cartItem?.productId),
            variantId: String(cartItem?.variantId),
            quantity: newQty,
            productSlug: product.slug,
          })).unwrap();
        } catch (err) {
          logError("handleDecrement→update", err);
          toast.error(err?.message || "Failed to update");
        } finally { setL("update", false); }
      }
    } else {
      if (newQty <= 0) {
        dispatch(removeGuestCartItem({ productSlug: product.slug, variantId: variant?._id?.toString() || "" }));
        toast.info("Removed from cart");
      } else {
        dispatch(updateGuestCartItem({ productSlug: product.slug, variantId: variant?._id?.toString() || "", quantity: newQty }));
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="group relative flex flex-col cursor-pointer rounded-2xl bg-white border border-zinc-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={handleCardClick}
    >
      {/* ── IMAGE ── */}
      <div className="relative w-full aspect-square bg-zinc-50 overflow-hidden">

        <LazyImage
          src={imgUrl}
          alt={name}
          aspectRatio="1/1"
          objectFit="cover"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] md:text-[15px] font-black uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Discount + Sale badge stack */}
        {discountPct && inStock && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
            <span className="text-[10px] md:text-[15px] bg-[#EB4C4C] text-white px-2 py-0.5 rounded-md shadow-sm">
              {discountPct}% OFF
            </span>

            {isOnSale && (
              <span className="text-[10px] md:text-[12px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-md shadow-sm tracking-wide leading-none">
                SALE
              </span>
            )}
          </div>
        )}

        {/* Action buttons — visible on hover (desktop) / always visible (mobile) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10
          md:translate-x-10 md:opacity-0
          md:group-hover:translate-x-0 md:group-hover:opacity-100
          transition-all duration-300"
        >
          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            disabled={localLoading.wishlist}
            aria-label="Toggle wishlist"
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${wishlisted
              ? "bg-red-500 text-white"
              : "bg-white/90 backdrop-blur-sm text-zinc-600 hover:bg-red-500 hover:text-white"
              } disabled:opacity-50`}
          >
            {localLoading.wishlist
              ? <Loader2 size={13} className="animate-spin" />
              : <Heart size={14} className={wishlisted ? "fill-current" : ""} />
            }
          </button>

          {/* View */}
          <button
            onClick={(e) => { e.stopPropagation(); if (product?.slug) navigate(`/products/${product.slug}`); }}
            aria-label="View product"
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all active:scale-90"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 gap-1">

        {/* Category */}
        {category && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-medium truncate">
            {getCategoryName(category)}
          </span>
        )}

        {/* Title + Rating row */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-yellow-600 transition-colors leading-snug flex-1">
            {name}
          </h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] md:text-[12px] font-semibold text-zinc-600">
              {Number(ratingUi.average).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Sold info — hidden on very small screens */}
        {product?.soldInfo?.count > 0 && (
          <p className="text-[9px] sm:text-[10px] text-zinc-500 hidden sm:block">
            <span className="font-bold text-red-500">{formatCount(product.soldInfo.count)} bought</span>
            {" "}in past month
          </p>
        )}

        {/* Price */}
        {/* Price */}
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-bold text-zinc-900">
              ₹{formatPrice(salePrice)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-zinc-400 line-through">
                ₹{formatPrice(basePrice)}
              </span>
            )}
          </div>


        </div>

        {/* ── CART ACTIONS ── */}
        <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>

          {/* Out of stock */}
          {!inStock && (
            <button disabled className="w-full py-2 text-[10px] font-bold bg-zinc-100 text-zinc-400 rounded-xl cursor-not-allowed">
              Out of Stock
            </button>
          )}

          {/* Add to cart */}
          {inStock && !isInCart && (
            <button
              onClick={handleAddToCart}
              disabled={localLoading.add}
              className={`w-full py-2 sm:py-3.5 cursor-pointer text-[10px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 ${localLoading.add
                ? "bg-zinc-300 text-white hover:bg-[#F7A221] cursor-wait"
                : "bg-zinc-900 text-white hover:bg-[#F7A221]"
                } disabled:opacity-60`}
            >
              {localLoading.add ? (
                <><Loader2 size={12} className="animate-spin" /> Adding...</>
              ) : "ADD TO CART"}
            </button>
          )}

          {/* Qty controls */}

          {inStock && isInCart && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center w-full border-2 border-zinc-900 rounded-xl overflow-hidden">
                <button
                  onClick={handleDecrement}
                  disabled={isProcessing}
                  className="w-9 h-9 sm:w-10 cursor-pointer sm:h-10 flex items-center justify-center bg-zinc-100 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {localLoading.remove
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Minus size={13} />}
                </button>
                <div className="flex-1 text-center text-xs sm:text-sm font-bold text-zinc-900 select-none">
                  {localLoading.update
                    ? <Loader2 size={11} className="animate-spin mx-auto" />
                    : currentQty}
                </div>
                <button
                  onClick={handleIncrement}
                  disabled={isAtMaxStock || isProcessing}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center  cursor-pointer bg-zinc-900 text-white hover:bg-orange-400 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {localLoading.update
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Plus size={13} />}
                </button>
              </div>
              {isAtMaxStock && (
                <p className="text-[9px] text-center text-orange-500 font-semibold">
                  Max stock reached
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

// code WORKING BUT UPPER CODE HAVE SOME MORE OPTIMIZATION PLUS NEW THINGS>>>>>>>>>>>>>>>>
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { Heart, Eye, Minus, Plus, Loader2, ShoppingCart } from "lucide-react";

// import {
//   addToWishlist,
//   removeFromWishlist,
//   addGuestItem,
//   removeGuestItem,
//   selectIsWishlisted,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";

// import {
//   addToCart,
//   updateCartItem,
//   removeCartItem,
//   addGuestCartItem,
//   updateGuestCartItem,
//   removeGuestCartItem,
//   selectCartItemBySlug,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const formatPrice = (amount) => {
//   if (amount == null) return "—";
//   return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [ProductCard] ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ── Component ─────────────────────────────────────────────────────────────────
// const ProductCard = ({ product, index }) => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const { isLoggedIn } = useSelector((state) => state.auth);
//   const wishlisted = useSelector(selectIsWishlisted(product?.slug));

//   // ✅ per-card local loading — NOT global Redux loading
//   // This prevents ALL cards spinning when ONE card is loading
//   const [localLoading, setLocalLoading] = useState({
//     add: false,
//     update: false,
//     remove: false,
//     wishlist: false,
//   });

//   const setLoading = (key, val) =>
//     setLocalLoading((prev) => ({ ...prev, [key]: val }));

//   const isProcessing = localLoading.add || localLoading.update || localLoading.remove;

//   // ── Cart state from Redux — reads by slug ─────────────────────────────────
//   const cartItem = useSelector(selectCartItemBySlug(product?.slug));
//   const isInCart = !!cartItem;
//   const currentQty = cartItem?.quantity ?? 0;

//   // ── Product derived values ────────────────────────────────────────────────
//   const variant = product?.variants?.[0] ?? {};
//   const title = product?.title || product?.name || "Untitled product";
//   const salePrice = variant.price?.sale ?? variant.price?.base ?? null;
//   const basePrice = variant.price?.base ?? null;
//   const hasDiscount = basePrice != null && salePrice != null && basePrice > salePrice;
//   const discountPct = variant.discountPercentage ??
//     (hasDiscount ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null);
//   const imgUrl = variant.images?.[0]?.url || null;
//   const maxStock = variant.inventory?.trackInventory
//     ? (variant.inventory?.quantity ?? 0)
//     : Infinity;
//   const inStock = maxStock > 0;
//   const isAtMaxStock = currentQty >= maxStock && maxStock !== Infinity;

//   // ── Navigation ────────────────────────────────────────────────────────────
//   const handleCardClick = () => {
//     if (!product?.slug) {
//       logError("handleCardClick", new Error("Missing slug"), { product });
//       return;
//     }
//     navigate(`/products/${product.slug}`);
//   };

//   // ── Wishlist ──────────────────────────────────────────────────────────────
//   const handleWishlist = async (e) => {
//     e.stopPropagation();
//     if (!product?.slug) return;
//     if (localLoading.wishlist) return;

//     setLoading("wishlist", true);
//     try {
//       if (isLoggedIn) {
//         if (wishlisted) {
//           await dispatch(removeFromWishlist({ productSlug: product.slug })).unwrap();
//           toast.success("Removed from wishlist", { icon: "💔" });
//           console.log(`✅ [ProductCard] slug="${product.slug}" removed from wishlist`);
//         } else {
//           await dispatch(addToWishlist({ productSlug: product.slug })).unwrap();
//           toast.success("Added to wishlist", { icon: "❤️" });
//           console.log(`✅ [ProductCard] slug="${product.slug}" added to wishlist`);
//         }
//       } else {
//         if (wishlisted) {
//           dispatch(removeGuestItem(product.slug));
//           toast.success("Removed from wishlist", { icon: "💔" });
//         } else {
//           dispatch(addGuestItem(product.slug));
//           toast.success("Saved to wishlist", { icon: "❤️" });
//         }
//       }
//     } catch (error) {
//       logError("handleWishlist", error, { slug: product.slug });
//       toast.error(error?.message || "Wishlist action failed");
//     } finally {
//       setLoading("wishlist", false);
//     }
//   };

//   // ── Add to cart (first time only) ────────────────────────────────────────
//   const handleAddToCart = async (e) => {
//     e.stopPropagation();

//     // ✅ Hard guards — no double dispatch ever
//     if (isInCart) return;
//     if (isProcessing) return;
//     if (!inStock) return;
//     if (!product?.slug) {
//       logError("handleAddToCart", new Error("Missing slug"), { product });
//       return;
//     }

//     setLoading("add", true);
//     try {
//       if (isLoggedIn) {
//         await dispatch(addToCart({
//           productSlug: product.slug,
//           variantId: variant?._id?.toString(),
//           quantity: 1,
//         })).unwrap();
//         // toast.success("Added to cart 🛒");
//         toast.success(
//           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//             <ShoppingCart size={18} />
//             <span>Added to cart</span>
//           </div>
//         );
//         console.log(`✅ [ProductCard] slug="${product.slug}" added to cart`);
//       } else {
//         dispatch(addGuestCartItem({
//           productSlug: product.slug,
//           variantId: variant?._id?.toString() || "",
//           quantity: 1,
//         }));
//         // toast.success("Added to cart 🛒");
//         toast.success(
//           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//             <ShoppingCart size={18} />
//             <span>Added to cart</span>
//           </div>
//         );
//         console.log(`✅ [ProductCard] guest slug="${product.slug}" added`);
//       }
//     } catch (error) {
//       logError("handleAddToCart", error, { slug: product.slug });
//       toast.error(error?.message || "Failed to add to cart");
//     } finally {
//       setLoading("add", false);
//     }
//   };

//   // ── Increment ─────────────────────────────────────────────────────────────
//   const handleIncrement = async (e) => {
//     e.stopPropagation();
//     if (isAtMaxStock) {
//       toast.warning(`Max stock reached (${maxStock})`);
//       return;
//     }
//     if (isProcessing) return;

//     const newQty = currentQty + 1;
//     setLoading("update", true);
//     try {
//       if (isLoggedIn) {
//         await dispatch(updateCartItem({
//           productId: String(cartItem?.productId?._id || cartItem?.productId),
//           variantId: String(cartItem?.variantId),
//           quantity: newQty,
//           productSlug: product.slug,
//         })).unwrap();
//         console.log(`✅ [ProductCard] slug="${product.slug}" qty → ${newQty}`);
//       } else {
//         dispatch(updateGuestCartItem({
//           productSlug: product.slug,
//           variantId: variant?._id?.toString() || "",
//           quantity: newQty,
//         }));
//       }
//     } catch (error) {
//       logError("handleIncrement", error, { slug: product.slug, newQty });
//       toast.error(error?.message || "Failed to update quantity");
//     } finally {
//       setLoading("update", false);
//     }
//   };

//   // ── Decrement ─────────────────────────────────────────────────────────────
//   const handleDecrement = async (e) => {
//     e.stopPropagation();
//     if (isProcessing) return;

//     const newQty = currentQty - 1;

//     if (isLoggedIn) {
//       if (newQty <= 0) {
//         setLoading("remove", true);
//         try {
//           await dispatch(removeCartItem({
//             productId: String(cartItem?.productId?._id || cartItem?.productId),
//             variantId: String(cartItem?.variantId),
//             productSlug: product.slug,
//           })).unwrap();
//           toast.info("Removed from cart");
//           console.log(`✅ [ProductCard] slug="${product.slug}" removed from cart`);
//         } catch (error) {
//           logError("handleDecrement → remove", error, { slug: product.slug });
//           toast.error(error?.message || "Failed to remove from cart");
//         } finally {
//           setLoading("remove", false);
//         }
//       } else {
//         setLoading("update", true);
//         try {
//           await dispatch(updateCartItem({
//             productId: String(cartItem?.productId?._id || cartItem?.productId),
//             variantId: String(cartItem?.variantId),
//             quantity: newQty,
//             productSlug: product.slug,
//           })).unwrap();
//           console.log(`✅ [ProductCard] slug="${product.slug}" qty → ${newQty}`);
//         } catch (error) {
//           logError("handleDecrement → update", error, { slug: product.slug, newQty });
//           toast.error(error?.message || "Failed to update quantity");
//         } finally {
//           setLoading("update", false);
//         }
//       }
//     } else {
//       // Guest
//       if (newQty <= 0) {
//         dispatch(removeGuestCartItem({
//           productSlug: product.slug,
//           variantId: variant?._id?.toString() || "",
//         }));
//         toast.info("Removed from cart");
//       } else {
//         dispatch(updateGuestCartItem({
//           productSlug: product.slug,
//           variantId: variant?._id?.toString() || "",
//           quantity: newQty,
//         }));
//       }
//     }
//   };

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div
//       className="group flex flex-col cursor-pointer font-sans"
//       style={{ animationDelay: `${index * 50}ms` }}
//       onClick={handleCardClick}

//     >
//       {/* ── IMAGE ── */}
//       <div className="relative aspect-[1/1] overflow-hidden bg-zinc-50 rounded-sm mb-4">
//         {imgUrl ? (
//           <img
//             src={imgUrl}
//             alt={title}
//             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
//             loading="lazy"
//             onError={(e) => {
//               e.target.style.display = "none";
//               logError("img load", new Error("Image failed"), {
//                 slug: product?.slug,
//                 url: imgUrl,
//               });
//             }}
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[10px] uppercase bg-zinc-100">
//             No Image
//           </div>
//         )}

//         {/* Out of stock overlay */}
//         {!inStock && (
//           <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
//             <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-3 py-1">
//               Out of Stock
//             </span>
//           </div>
//         )}

//         {/* Discount badge */}
//         {discountPct && inStock && (
//           <div className="absolute top-3 left-3">
//             <span className="text-[9px] font-black bg-yellow-500 text-white px-2 py-0.5 rounded">
//               {discountPct}%
//             </span>
//           </div>
//         )}

//         {/* Wishlist + View buttons */}
//         <div className="absolute  top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
//           <button
//             onClick={handleWishlist}
//             disabled={localLoading.wishlist}
//             className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border transition-colors ${wishlisted
//                 ? "bg-red-500 border-red-500 text-white"
//                 : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white"
//               }`}
//           >
//             {localLoading.wishlist
//               ? <Loader2 size={12} className="animate-spin" />
//               : <Heart size={14} className={wishlisted ? "fill-current" : ""} />
//             }
//           </button>
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               if (product?.slug) navigate(`/products/${product.slug}`);
//             }}
//             className="w-8 h-8 cursor-pointer bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all"
//           >
//             <Eye size={14} />
//           </button>
//         </div>
//       </div>

//       {/* ── TEXT INFO ── */}
//       <div className="space-y-1">
//         <div className="flex justify-between items-center">
//           <span className="text-[10px] font-bold uppercase text-zinc-400">
//             {typeof product?.category === "object"
//               ? product.category?.name
//               : product?.category || "General"}
//           </span>
//           {discountPct && inStock && (
//             <span className="text-[8px] font-bold text-yellow-600 uppercase">
//               {discountPct}% off
//             </span>
//           )}
//         </div>

//         <h3 className="text-[11px] md:text-xs font-lato uppercase tracking-wider text-zinc-900 group-hover:text-yellow-600 transition-colors truncate">
//           {title}
//         </h3>

//         <div className="flex items-center gap-2 pt-0.5 pb-2">
//           <span className="text-sm md:text-base font-bold text-zinc-900">
//             ₹{formatPrice(salePrice)}
//           </span>
//           {hasDiscount && (
//             <span className="text-[10px] text-zinc-300 line-through font-bold">
//               ₹{formatPrice(basePrice)}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* ── CART BUTTON AREA ── */}
//       <div className="mt-auto" onClick={(e) => e.stopPropagation()}>

//         {/* Case 1 — Out of stock */}
//         {!inStock && (
//           <button
//             disabled
//             className="w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] bg-zinc-200 text-zinc-400 cursor-not-allowed"
//           >
//             Out of Stock
//           </button>
//         )}

//         {/* Case 2 — In stock, NOT in cart */}
//         {inStock && !isInCart && (
//           <button
//             onClick={handleAddToCart}
//             disabled={localLoading.add}
//             className={`w-full py-3 text-[9px] cursor-pointer font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${localLoading.add
//                 ? "bg-zinc-400 text-white cursor-wait"
//                 : "bg-zinc-900 text-white hover:bg-yellow-600"
//               }`}
//           >
//             {localLoading.add ? (
//               <>
//                 <Loader2 size={12} className="animate-spin" />
//                 Adding...
//               </>
//             ) : (
//               "Add To Bag"
//             )}
//           </button>
//         )}

//         {/* Case 3 — In cart → qty controls */}
//         {inStock && isInCart && (
//           <>
//             <div className="flex items-center w-full border border-zinc-200 overflow-hidden">
//               {/* Decrement / Remove */}
//               <button
//                 onClick={handleDecrement}
//                 disabled={isProcessing}
//                 className={`flex-shrink-0 cursor-pointer w-10 h-10 flex items-center justify-center transition-all ${isProcessing
//                     ? "bg-zinc-100 text-zinc-300 cursor-wait"
//                     : "bg-zinc-100 text-zinc-700 hover:bg-red-500 hover:text-white"
//                   }`}
//               >
//                 {localLoading.remove
//                   ? <Loader2 size={12} className="animate-spin" />
//                   : <Minus size={12} />
//                 }
//               </button>

//               {/* Current qty */}
//               <div className="flex-1 text-center text-[11px] font-black text-zinc-900 bg-white py-2 select-none">
//                 {localLoading.update
//                   ? <Loader2 size={12} className="animate-spin mx-auto" />
//                   : currentQty
//                 }
//               </div>

//               {/* Increment */}
//               <button
//                 onClick={handleIncrement}
//                 disabled={isAtMaxStock || isProcessing}
//                 className={`flex-shrink-0 cursor-pointer w-10 h-10 flex items-center justify-center transition-all ${isAtMaxStock
//                     ? "bg-zinc-100 text-zinc-300 cursor-not-allowed"
//                     : isProcessing
//                       ? "bg-zinc-100 text-zinc-300 cursor-wait"
//                       : "bg-zinc-900 text-white hover:bg-yellow-600"
//                   }`}
//               >
//                 {localLoading.add
//                   ? <Loader2 size={12} className="animate-spin" />
//                   : <Plus size={12} />
//                 }
//               </button>
//             </div>

//             {/* Max stock warning */}
//             {isAtMaxStock && (
//               <p className="text-[8px] text-center text-orange-500 font-bold mt-1 uppercase tracking-wider">
//                 Max stock reached
//               </p>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProductCard;

// code working but upper code have some error handling for other things>>>>>>>>>>>
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ShoppingCart, Heart, Eye, Star } from "lucide-react";
// import { toast } from 'react-toastify';
// import { useDispatch, useSelector } from 'react-redux';
// import {
//   addToWishlist,
//   removeFromWishlist,
//   addGuestItem,
//   removeGuestItem,
//   selectIsWishlisted,
// } from '../../components/REDUX_FEATURES/REDUX_SLICES/userWishlistSlice';
// import {
//   addToCart,
//   addGuestCartItem,
//   selectIsInCart,
// } from '../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice';
// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers (Logic preserved)
// // ─────────────────────────────────────────────────────────────────────────────
// const formatPrice = (amount) => {
//   if (amount == null) return "—";
//   return new Intl.NumberFormat("en-IN", {
//     maximumFractionDigits: 0
//   }).format(amount);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [ProductCard] ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Product Card Component
// // ─────────────────────────────────────────────────────────────────────────────
// const ProductCard = ({ product, index }) => {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const { isLoggedIn } = useSelector((state) => state.auth);
//   // Functional Logic preserved
//   // const [wishlisted, setWishlisted] = useState(false);
//   const wishlisted = useSelector(selectIsWishlisted(product.slug));
//   const isInCart = useSelector(selectIsInCart(product.slug));
//   const [addedToCart, setAddedToCart] = useState(false);

//   const variant = product.variants?.[0] ?? {};
//   const title = product.title || product.name || "Untitled product";
//   const salePrice = variant.price?.sale ?? variant.price?.base ?? null;
//   const basePrice = variant.price?.base ?? null;
//   const hasDiscount = basePrice != null && salePrice != null && basePrice > salePrice;
//   const discountPct = variant.discountPercentage ?? (hasDiscount ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null);
//   const imgUrl = variant.images?.[0]?.url || null;
//   const inStock = variant.inventory?.quantity > 0 ?? product.inStock ?? true;
//   const rating = product.rating?.value ?? 0;

//   const handleCardClick = () => navigate(`/products/${product.slug}`);

//   // const handleAddToCart = (e) => {
//   //   e.stopPropagation();
//   //   setAddedToCart(true);
//   //   setTimeout(() => setAddedToCart(false), 1500);
//   // };
//    // ── Cart handler ───────────────────────────────────────────────────────────
//   const handleAddToCart = async (e) => {
//     e.stopPropagation();

//     if (isLoggedIn) {
//       try {
//         await dispatch(addToCart({
//           productSlug: product.slug,
//           variantId: variant?._id,
//           quantity: 1,
//         })).unwrap();
//         setAddedToCart(true);
//         setTimeout(() => setAddedToCart(false), 1500);
//         toast.success("Added to cart 🛒");
//         console.log(`✅ [ProductCard] slug="${product.slug}" added to cart`);
//       } catch (error) {
//         console.error(`❌ [ProductCard] addToCart failed:`, error);
//         toast.error(error?.message || "Failed to add to cart");
//       }
//     } else {
//       // guest
//       dispatch(addGuestCartItem({
//         productSlug: product.slug,
//         variantId: variant?._id?.toString(),
//         quantity: 1,
//       }));
//       setAddedToCart(true);
//       setTimeout(() => setAddedToCart(false), 1500);
//       toast.success("Added to cart 🛒");
//       console.log(`✅ [ProductCard] guest slug="${product.slug}" added to local cart`);
//     }
//   };

//   const handleWishlist = async (e) => {
//     e.stopPropagation();

//     if (isLoggedIn) {
//       if (wishlisted) {
//         try {
//           await dispatch(removeFromWishlist({ productSlug: product.slug })).unwrap();
//           toast.success(`Removed from wishlist`, {
//             icon: "💔",
//           });
//         } catch (error) {
//           console.error(`❌ [ProductCard] removeFromWishlist failed:`, error);
//           toast.error(error?.message || "Failed to remove from wishlist");
//         }
//       } else {
//         try {
//           await dispatch(addToWishlist({ productSlug: product.slug })).unwrap();
//           toast.success(`Added to wishlist`, {
//             icon: "❤️",
//           });
//         } catch (error) {
//           console.error(`❌ [ProductCard] addToWishlist failed:`, error);
//           toast.error(error?.message || "Failed to add to wishlist");
//         }
//       }
//     } else {
//       // guest — no API call so no async needed
//       if (wishlisted) {
//         dispatch(removeGuestItem(product.slug));
//         toast.success("Removed from wishlist", { icon: "💔" });
//       } else {
//         dispatch(addGuestItem(product.slug));
//         toast.success("Added to wishlist", { icon: "❤️" });
//       }
//     }
//   };
//   //   const handleWishlist = (e) => {
//   //   e.stopPropagation();

//   //   if (isLoggedIn) {
//   //     // logged in — hit the API
//   //     if (wishlisted) {
//   //       console.log(`💛 [ProductCard] Removing slug="${product.slug}" from wishlist`);
//   //       dispatch(removeFromWishlist({ productSlug: product.slug }));
//   //     } else {
//   //       console.log(`💛 [ProductCard] Adding slug="${product.slug}" to wishlist`);
//   //       dispatch(addToWishlist({ productSlug: product.slug }));
//   //     }
//   //   } else {
//   //     // guest — save to localStorage via Redux
//   //     if (wishlisted) {
//   //       console.log(`💛 [ProductCard] Guest removing slug="${product.slug}"`);
//   //       dispatch(removeGuestItem(product.slug));
//   //     } else {
//   //       console.log(`💛 [ProductCard] Guest adding slug="${product.slug}"`);
//   //       dispatch(addGuestItem(product.slug));
//   //     }
//   //   }
//   // };

//   return (
//     <div
//       className="group flex flex-col cursor-pointer font-sans"
//       style={{ animationDelay: `${index * 50}ms` }}
//       onClick={handleCardClick}
//     >
//       {/* ── IMAGE AREA (UI from Image) ── */}
//       <div className="relative aspect-[1/1] overflow-hidden bg-zinc-50 rounded-sm mb-4">
//         {imgUrl ? (
//           <img
//             src={imgUrl}
//             alt={title}
//             className="w-full h-full object-cover transition-transform duration-700"
//             loading="lazy"
//             onError={(e) => {
//               e.target.style.display = "none";
//               logError("img load", new Error("Image failed"), { slug: product.slug, url: imgUrl });
//             }}
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center text-zinc-300 text-[10px] uppercase bg-zinc-100">
//             No Image
//           </div>
//         )}

//         {/* Wishlist & View Buttons (UI from Image) */}
//         <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
//           <button
//             onClick={handleWishlist}
//             className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${wishlisted ? "bg-red-500 border-red-500 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white"
//               }`}
//           >
//             <Heart size={14} className={wishlisted ? "fill-current" : ""} />
//           </button>
//           <button className="w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all">
//             <Eye size={14} />
//           </button>
//         </div>
//       </div>

//       {/* ── TEXT INFO (UI from Image) ── */}
//       <div className="space-y-1">
//         <div className="flex justify-between items-center">
//           <span className="text-[10px] font-bold uppercase  text-zinc-400">
//             {/* Fix: Accessing .name property to prevent Object error */}
//             {typeof product.category === 'object' ? product.category?.name : (product.category || "Apparel")}
//           </span>
//           {discountPct && (
//             <span className="text-[8px] font-bold text-yellow-600 uppercase"></span>
//           )}
//         </div>

//         <h3 className="text-[11px] md:text-xs font-lato uppercase tracking-wider text-zinc-900 group-hover:text-yellow-600 transition-colors truncate">
//           {title}
//         </h3>

//         <div className="flex items-center gap-2 pt-0.5 pb-2">
//           <span className="text-sm md:text-base font-bold text-zinc-900">
//             ₹{formatPrice(salePrice)}
//           </span>
//           {hasDiscount && (
//             <span className="text-[10px] text-zinc-300 line-through font-bold">
//               ₹{formatPrice(basePrice)}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* ── ADD TO BAG BUTTON (UI from Image) ── */}
//       <div className="mt-auto">
//         <button
//           onClick={handleAddToCart}
//           disabled={!inStock}
//           className={`w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${addedToCart
//             ? "bg-green-600 text-white"
//             : inStock
//               ? "bg-zinc-900 text-white hover:bg-yellow-600"
//               : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
//             }`}
//         >
//           {addedToCart ? "Added ✓" : inStock ? "Add To Bag" : "Out of Stock"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProductCard;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ShoppingCart, Heart, Eye, Star } from "lucide-react";

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers (copied from original)
// // ─────────────────────────────────────────────────────────────────────────────
// const formatPrice = (amount) => {
//   if (amount == null) return "—";
//   return new Intl.NumberFormat("en-IN", {
//     maximumFractionDigits: 0
//   }).format(amount);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [ProductCard] ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Product Card Component
// // ─────────────────────────────────────────────────────────────────────────────
// const ProductCard = ({ product, index }) => {
//   const navigate = useNavigate();

//   // Local UI state — replace with Redux cart/wishlist dispatch when ready
//   const [wishlisted, setWishlisted] = useState(false);
//   const [addedToCart, setAddedToCart] = useState(false);

//   // ── Data lives in variants[0] — this is the actual API shape ──────────────
//   const variant     = product.variants?.[0] ?? {};
//   const title       = product.title || product.name || "Untitled product";

//   // Price — from variant, backend already computes finalPrice
//   const salePrice   = variant.price?.sale ?? variant.price?.base ?? null;
//   const basePrice   = variant.price?.base ?? null;
//   const hasDiscount = basePrice != null && salePrice != null && basePrice > salePrice;
//   const discountPct = variant.discountPercentage    // backend sends this pre-computed
//     ?? (hasDiscount ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null);

//   // Images — inside variant.images[]
//   const imgUrl = variant.images?.[0]?.url || null;

//   // Stock — inside variant.inventory
//   const inStock = variant.inventory?.quantity > 0 ?? product.inStock ?? true;

//   // Rating — top level (not in variants)
//   const rating      = product.rating?.value ?? 0;
//   const ratingCount = product.rating?.count ?? 0;

//   const handleCardClick = () => navigate(`/products/${product.slug}`);

//   const handleAddToCart = (e) => {
//     e.stopPropagation();
//     // 🔌 Replace with: dispatch(addItemToCart(product)) when cart Redux is ready
//     setAddedToCart(true);
//     setTimeout(() => setAddedToCart(false), 1500);
//   };

//   const handleWishlist = (e) => {
//     e.stopPropagation();
//     // 🔌 Replace with: dispatch(toggleWishlistItem(product)) when wishlist Redux is ready
//     setWishlisted((prev) => !prev);
//   };

//   return (
//     <div
//       className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer relative flex flex-col"
//       style={{ animationDelay: `${index * 50}ms` }}
//       onClick={handleCardClick}
//     >
//       {/* ── Wishlist button ── */}
//       <button
//         aria-label="Toggle wishlist"
//         onClick={handleWishlist}
//         className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-200"
//       >
//         <Heart
//           size={16}
//           className={wishlisted ? "text-red-500 fill-red-500" : "text-gray-400"}
//         />
//       </button>

//       {/* ── Discount badge ── */}
//       {discountPct && (
//         <div className="absolute top-3 left-3 z-10 bg-[#f7a221] text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
//           {discountPct}%
//         </div>
//       )}

//       {/* ── Image ── */}
//       <div className="relative h-52 sm:h-56 bg-gray-50 overflow-hidden flex-shrink-0">
//         {imgUrl ? (
//           <img
//             src={imgUrl}
//             alt={title}
//             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//             loading="lazy"
//             onError={(e) => {
//               e.target.style.display = "none";
//               logError("img load", new Error("Image failed"), {
//                 slug: product.slug,
//                 url: imgUrl,
//               });
//             }}
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm select-none bg-gray-100">
//             No Image
//           </div>
//         )}

//         {/* Hover overlay */}
//         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 pointer-events-none">
//           <span className="text-white text-xs font-semibold bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
//             <Eye size={12} /> View Details
//           </span>
//         </div>
//       </div>

//       {/* ── Body ── */}
//       <div className="p-4 flex flex-col flex-grow">
//         <h3 className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2 mb-1 group-hover:text-[#f7a221] transition-colors duration-200 leading-snug min-h-[2.5rem]">
//           {title}
//         </h3>

//         {/* Rating */}
//         {rating > 0 && (
//           <div className="flex items-center gap-1 text-xs mb-2">
//             <Star size={11} className="fill-yellow-400 text-yellow-400" />
//             <span className="font-semibold text-gray-700">{rating}</span>
//             {ratingCount > 0 && (
//               <span className="text-gray-400">({ratingCount})</span>
//             )}
//           </div>
//         )}

//         {/* Price */}
//         <div className="mt-auto flex items-baseline gap-2 mb-3 flex-wrap">
//           <span className="text-base sm:text-lg font-bold text-gray-900">
//             {formatPrice(salePrice)}
//           </span>
//           {hasDiscount && (
//             <span className="text-xs text-gray-400 line-through">
//               {formatPrice(basePrice)}
//             </span>
//           )}
//         </div>

//         {/* Attributes */}
//         {product.attributes?.length > 0 && (
//           <div className="flex flex-wrap gap-1 mb-3">
//             {product.attributes.slice(0, 2).map((attr) => (
//               <span
//                 key={attr._id ?? attr.key}
//                 className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
//               >
//                 {attr.key}: {attr.value}
//               </span>
//             ))}
//             {product.attributes.length > 2 && (
//               <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
//                 +{product.attributes.length - 2}
//               </span>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Add to Cart ── */}
//       <div className="px-4 pb-4">
//         <button
//           onClick={handleAddToCart}
//           disabled={!inStock}
//           className={`w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${
//             addedToCart
//               ? "bg-green-500"
//               : inStock
//               ? "bg-black hover:bg-[#f7a221]"
//               : "bg-gray-300 cursor-not-allowed"
//           }`}
//         >
//           <ShoppingCart size={15} />
//           {addedToCart ? "Added ✓" : inStock ? "Add to Cart" : "Out of Stock"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProductCard;