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
