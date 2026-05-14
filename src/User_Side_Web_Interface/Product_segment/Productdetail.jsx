import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IoLogoWhatsapp, IoLogoFacebook, IoLogoInstagram } from "react-icons/io5";
import { ChevronDown, FileText, Globe, Receipt } from "lucide-react";
import { FaTelegram } from "react-icons/fa6";
import LazyImage from "./LazyImage";
import {
  Star, Heart, Minus, Plus, ShoppingCart,
  Zap, CheckCircle2, Truck, AlertCircle,
  RefreshCw, ArrowLeft, Loader2, ArrowRight,
  Package, ShieldCheck, RotateCcw, Eye,
  Tag,
  Share2,
} from "lucide-react";
import {
  addToWishlist, removeFromWishlist,
  addGuestItem, removeGuestItem, selectIsWishlisted,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userWishlistSlice";
import {
  fetchProductBySlug, fetchRelatedProducts,
  clearCurrentProduct, clearRelatedProducts,
  selectCurrentProduct, selectRelatedProducts,
  selectProductsLoading, selectProductsError,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userProductsSlice";
import {
  addGuestCartItem, addToCart, removeCartItem, removeGuestCartItem,
  selectCartItemBySlug, updateCartItem, updateGuestCartItem,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";
import { toast } from "react-toastify";
import Breadcrumb from "./Breadcrumb/Breadcrumb";
import CatProducts from "./CatPro_segment/CatProducts";
import { fetchCategories } from "../../components/ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice";
import axiosInstance from "../../SERVICES/axiosInstance";
import { getProductRatingDisplay, getFallbackDistribution } from "../../utils/productRatingDisplay";
import StarRatingInput from "./StarRatingInput";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="flex gap-3">
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="w-[72px] h-[72px] bg-gray-200 rounded-xl" />)}
        </div>
        <div className="flex-1 bg-gray-200 rounded-2xl" style={{ minHeight: 480 }} />
      </div>
      <div className="space-y-5 pt-2">
        <div className="h-8 bg-gray-200 rounded-lg w-4/5" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-200 rounded-lg w-2/5" />
        <div className="h-12 bg-gray-200 rounded-xl w-full" />
        <div className="h-12 bg-gray-200 rounded-xl w-full" />
      </div>
    </div>
  </div>
);

// ─── Price formatter ──────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
};
const formatPrice = (n) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
};

const formatCouponLabel = (coupon) => {
  if (!coupon) return "";
  const code = String(coupon.code || "").trim().toUpperCase();
  const minOrderValue = Number(coupon.minOrderValue || 0);
  const discountValue = Number(coupon.discountValue || 0);
  const discountType = String(coupon.discountType || "").trim().toLowerCase();

  if (!code) return "";

  if (discountType === "percentage") {
    const baseText = `Use ${code} on ₹${formatPrice(minOrderValue)}+ for ${discountValue}% OFF`;
    if (coupon.maxDiscountAmount) {
      return `${baseText} (up to ₹${formatPrice(coupon.maxDiscountAmount)})`;
    }
    return baseText;
  }

  if (minOrderValue > 0) {
    return `Use ${code} on ₹${formatPrice(minOrderValue)}+ for ₹${formatPrice(discountValue)} OFF`;
  }
  return `Use ${code} for ₹${formatPrice(discountValue)} OFF`;
};

const logError = (ctx, err, info = {}) => {
  console.group(`🔴 [ProductCard] ${ctx}`);
  console.error(err);
  // console.log(info);
  console.groupEnd();
};

// ─── isStockRelatedLabel helper ───────────────────────────────────────────────
const isStockRelatedLabel = (label = "") => {
  const l = label.toLowerCase();
  return (
    l.includes("left") ||
    l.includes("stock") ||
    l.includes("remaining") ||
    l.includes("only") ||
    l.includes("hurry") ||
    l.includes("selling fast") ||
    l.includes("limited") ||
    l.includes("bache") ||        // Hindi support
    l.includes("sirf")
  );
};


// ─── Related Card ─────────────────────────────────────────────────────────────
const RelatedCard = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories } = useSelector((s) => s.categories);

  function formatCount(count) {
    if (count < 100) return count.toString();
    return Math.floor(count / 100) * 100 + "+";
  }

  const { isLoggedIn } = useSelector((state) => state.auth);
  const wishlisted = useSelector(selectIsWishlisted(product?.slug));
  const cartItem = useSelector(selectCartItemBySlug(product?.slug));

  const [localLoading, setLocalLoading] = useState({
    add: false, update: false, remove: false, wishlist: false, buyNow: false,
  });
  const setL = (k, v) => setLocalLoading((p) => ({ ...p, [k]: v }));
  const isProcessing = localLoading.add || localLoading.update || localLoading.remove;

  const getCategoryName = (productCategory) => {
    if (!productCategory) return "Uncategorized";
    const found = categories.find((cat) => cat._id === productCategory || cat.name === productCategory);
    return found ? found.name : "Uncategorized";
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const variant = product?.variants?.[0] ?? {};
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

  const category = typeof product?.category === "object"
    ? product.category?.name
    : product?.category || "";

  const ratingUi = useMemo(() => getProductRatingDisplay(product, null), [product]);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

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
          alt={title}
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

        {/* Discount badge */}
        {discountPct && inStock && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] md:text-[15px] bg-[#EB4C4C] text-white px-2 py-0.5 rounded-md shadow-sm">
              {discountPct}% OFF
            </span>
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

        {/* Sold count */}
        {product?.soldInfo?.enabled && product?.soldInfo?.count > 0 && (
          <p className="text-[9px] sm:text-[10px] text-[crimson] font-bold hidden sm:block">
            {formatCount(product.soldInfo.count)} bought in past month
          </p>
        )}

        {/* Fomo label — stock-aware: hide stock-related labels when out of stock */}
        {product?.fomo?.enabled && (product?.fomoLabel || product?.fomo?.viewingFomo?.label) &&
          (inStock || !isStockRelatedLabel(product?.fomoLabel || "")) && (
            <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2 py-1 w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
              <p className="text-[9px] font-semibold text-orange-700">
                {product.fomo?.viewingFomo?.label || product.fomoLabel}
              </p>
            </div>
          )}

        {/* Title + Rating row */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-yellow-600 transition-colors leading-snug flex-1">
            {title}
          </h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] md:text-[15px] font-semibold text-zinc-600">
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
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm sm:text-base font-bold text-zinc-900">
            ₹{formatPrice(salePrice)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-xs text-zinc-400 line-through">
              ₹{formatPrice(basePrice)}
            </span>
          )}
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
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer bg-zinc-900 text-white hover:bg-orange-400 transition-colors disabled:opacity-40 flex-shrink-0"
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

// ─── Main ProductUI ───────────────────────────────────────────────────────────
const ProductUI = ({ openAuthModal }) => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const location = useLocation();
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [openDesc, setOpenDesc] = useState(false);
  const [localLoading, setLocalLoading] = useState({
    add: false, update: false, remove: false, wishlist: false,
  });
  const [showZoom, setShowZoom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setisVisible] = useState(false);
  const [publicCoupons, setPublicCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [copiedCouponCode, setCopiedCouponCode] = useState("");
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  /** When true, optional comment textarea is shown (rating + submit are always visible). */
  const [showReviewComment, setShowReviewComment] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [filterStar, setFilterStar] = useState(null);
  const containerRef = useRef(null);
  const lensRef = useRef(null);
  const zoomRef = useRef(null);
  const rafRef = useRef(null);
  const variantRef = useRef(null);
  const copyResetTimeoutRef = useRef(null);

  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });

  const product = useSelector(selectCurrentProduct);
  // console.log("Product details", product);

  const related = useSelector(selectRelatedProducts);
  const loadingMap = useSelector(selectProductsLoading);
  const errorMap = useSelector(selectProductsError);
  const isLoading = loadingMap.product;
  const fetchError = errorMap.product;
  const wishlisted = useSelector(selectIsWishlisted(product?.slug));
  // console.log("wishlisted:", wishlisted, "slug:", product?.slug);
  const cartItem = useSelector(selectCartItemBySlug(product?.slug));
  const isInCart = !!cartItem;
  const { isLoggedIn } = useSelector((state) => state.auth);

  const setL = (key, val) => setLocalLoading((p) => ({ ...p, [key]: val }));
  const handleCopyCouponCode = useCallback(async (couponCode) => {
    const code = String(couponCode || "").trim().toUpperCase();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCouponCode(code);
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = setTimeout(() => setCopiedCouponCode(""), 1000);
      toast.success(`Copied ${code}`);
    } catch (error) {
      logError("copyCouponCode", error);
      toast.error("Unable to copy code");
    }
  }, []);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    dispatch(clearCurrentProduct());
    dispatch(clearRelatedProducts());
    setSelectedAttrs({});
    setActiveThumb(0);
    dispatch(fetchProductBySlug(slug)).unwrap()
      .then(() => dispatch(fetchRelatedProducts({ slug, limit: 5 })).unwrap().catch(() => { }))
      .catch(() => { });
    return () => { dispatch(clearCurrentProduct()); dispatch(clearRelatedProducts()); };
  }, [slug, dispatch]);

  useEffect(() => {
    const close = () => setShareOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const productId = product?._id;
    if (!productId) {
      setReviewSummary(null);
      setReviewsList([]);
      setMyReview(null);
      setShowReviewComment(false);
      return undefined;
    }
    setShowReviewComment(false);
    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        const pid = String(productId);
        const [sumRes, listRes] = await Promise.all([
          axiosInstance.get(`/product-reviews/public/${pid}/summary`),
          axiosInstance.get(`/product-reviews/public/${pid}`, { params: { limit: 50 } }),
        ]);
        if (cancelled) return;
        setReviewSummary(sumRes.data?.summary ?? null);
        setReviewsList(Array.isArray(listRes.data?.reviews) ? listRes.data.reviews : []);
      } catch (err) {
        logError("loadProductReviews", err);
        if (!cancelled) {
          setReviewSummary(null);
          setReviewsList([]);
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product?._id]);

  useEffect(() => {
    const productId = product?._id;
    if (!productId || !isLoggedIn) {
      if (!isLoggedIn) {
        setMyReview(null);
        setShowReviewComment(false);
      }
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get(`/product-reviews/mine/${String(productId)}`);
        if (!cancelled) {
          const r = res.data?.review;
          setMyReview(r || null);
          if (r) {
            setReviewForm({ rating: r.rating, comment: r.comment || "" });
          } else {
            setReviewForm({ rating: 5, comment: "" });
          }
        }
      } catch (err) {
        logError("loadMyReview", err);
        if (!cancelled) setMyReview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product?._id, isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    const loadPublicCoupons = async () => {
      setCouponsLoading(true);
      try {
        const res = await axiosInstance.get("/public/coupons");
        const coupons = Array.isArray(res?.data?.coupons) ? res.data.coupons : [];
        if (!cancelled) setPublicCoupons(coupons);
      } catch (err) {
        if (!cancelled) setPublicCoupons([]);
        logError("loadPublicCoupons", err);
      } finally {
        if (!cancelled) setCouponsLoading(false);
      }
    };
    loadPublicCoupons();
    return () => { cancelled = true; };
  }, []);

  // ✅ Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouch || isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 🔥 RAF loop
  useEffect(() => {
    const animate = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.15;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.15;
      const { x, y } = currentRef.current;
      if (lensRef.current) {
        lensRef.current.style.left = `${x * 100}%`;
        lensRef.current.style.top = `${y * 100}%`;
      }
      if (zoomRef.current) {
        zoomRef.current.style.backgroundPosition = `${x * 100}% ${y * 100}%`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const updatePosition = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;
    const padding = 0.05;
    x = Math.max(padding, Math.min(1 - padding, x));
    y = Math.max(padding, Math.min(1 - padding, y));
    targetRef.current = { x, y };
  };

  const handleMouseMove = (e) => {
    updatePosition(e.clientX, e.clientY);
  };

  // ── variant logic ──────────────────────────────────────────────────────────
  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.isActive === true),
    [product]
  );

  function formatCount(count) {
    if (count < 100) return count.toString();
    return Math.floor(count / 100) * 100 + "+";
  }

  const attrKeys = useMemo(() => {
    const s = new Set();
    activeVariants.forEach((v) => v.attributes?.forEach((a) => s.add(a.key)));
    return [...s];
  }, [activeVariants]);

  const getAllValues = useCallback((key) => {
    const s = new Set();
    activeVariants.forEach((v) =>
      v.attributes?.filter((a) => a.key === key).forEach((a) => s.add(a.value))
    );
    return [...s];
  }, [activeVariants]);

  const isAvailable = useCallback((key, value) =>
    activeVariants.some((v) => v.attributes?.some((a) => a.key === key && a.value === value)),
    [activeVariants]
  );

  const selectedVariant = useMemo(() => {
    if (!activeVariants.length) return null;

    // Agar koi bhi attr selected nahi (sab null), return first variant
    const hasAnySelection = Object.values(selectedAttrs).some((v) => v != null);
    if (!hasAnySelection) return activeVariants[0];

    let best = activeVariants[0], bestScore = -1;
    activeVariants.forEach((v) => {
      const score = Object.entries(selectedAttrs).filter(([k, val]) =>
        val != null &&
        v.attributes?.some((a) => a.key === k && a.value === val)
      ).length;
      if (score > bestScore) { bestScore = score; best = v; }
    });
    return best;
  }, [activeVariants, selectedAttrs]);

  useEffect(() => {
    if (!activeVariants.length) return;
    const init = {};
    activeVariants[0].attributes?.forEach((a) => { init[a.key] = a.value; });
    setSelectedAttrs(init);
    setActiveThumb(0);
  }, [activeVariants]);

  useEffect(() => { setActiveThumb(0); }, [selectedVariant?._id]);

  const handleAttrSelect = (key, value) => {
    setSelectedAttrs((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value, // toggle back to null
    }));
    setActiveThumb(0);
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const images = selectedVariant?.images ?? [];
  const activeImg = images[activeThumb]?.url ?? null;

  // ── Auto-slide: advance every 3s on mobile, pause when fullscreen sheet is open ──
  useEffect(() => {
    if (!isMobile || isVisible || images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveThumb((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isMobile, isVisible, images.length, activeThumb]);

  const salePrice = selectedVariant?.finalPrice ?? selectedVariant?.price?.sale ?? selectedVariant?.price?.base ?? null;
  const basePrice = selectedVariant?.price?.base ?? null;
  const hasDisc = basePrice != null && salePrice != null && basePrice > salePrice;
  const discPct = selectedVariant?.discountPercentage
    ?? (hasDisc ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null);

  const stock = selectedVariant?.inventory?.quantity ?? null;
  const inStock = product?.inStock ?? (stock == null || stock > 0);
  const lowStock = stock != null && stock > 0 && stock <= (selectedVariant?.inventory?.lowStockThreshold ?? 5);
  const maxStock = selectedVariant?.inventory?.quantity ?? 9999;
  const currentQty = cartItem?.quantity ?? 0;
  const isAtMaxStock = currentQty >= maxStock;
  const isProcessing = localLoading.add || localLoading.update || localLoading.remove;
  const topCoupons = useMemo(() => {
    return (Array.isArray(publicCoupons) ? publicCoupons : [])
      .map((coupon) => ({ ...coupon, label: formatCouponLabel(coupon) }))
      .filter((coupon) => coupon.label)
      .slice(0, 3);
  }, [publicCoupons]);

  const title = product?.title || product?.name || "Product";
  const desc = product?.description ?? "";
  const ratingDisplay = useMemo(
    () => getProductRatingDisplay(product, reviewSummary),
    [product, reviewSummary]
  );
  const displayAvg = ratingDisplay.average;
  const displayCount = ratingDisplay.count;
  const ratingIsPlaceholder = ratingDisplay.isPlaceholder;
  const soldInfo = product?.soldInfo?.count ?? 0;
  const brand = product?.brand ?? null;
  const variant = selectedVariant || {};
  const productCode = variant?.productCode || product?.code || "";

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (isInCart || isProcessing || !inStock || !product?.slug) return;
    setL("add", true);
    try {
      if (isLoggedIn) {
        await dispatch(addToCart({ productSlug: product.slug, variantId: variant?._id?.toString(), quantity: 1 })).unwrap();
      } else {
        dispatch(addGuestCartItem({ productId: product._id, productSlug: product.slug, variantId: variant?._id?.toString() || "", quantity: 1 }));
      }
      toast.success("Added to cart");
    } catch (err) { toast.error(err?.message || "Failed to add"); }
    finally { setL("add", false); }
  };

  const handleIncrement = async (e) => {
    e.stopPropagation();
    if (isAtMaxStock) { toast.warning(`Max stock reached (${maxStock})`); return; }
    if (isProcessing) return;
    const newQty = currentQty + 1;
    setL("update", true);
    try {
      if (isLoggedIn) await dispatch(updateCartItem({ productId: String(cartItem?.productId?._id || cartItem?.productId), variantId: String(cartItem?.variantId), quantity: newQty, productSlug: product.slug })).unwrap();
      else dispatch(updateGuestCartItem({ productSlug: product.slug, variantId: variant?._id?.toString() || "", quantity: newQty }));
    } catch (err) { toast.error(err?.message || "Failed to update"); }
    finally { setL("update", false); }
  };

  const handleDecrement = async (e) => {
    e.stopPropagation();
    if (isProcessing) return;
    const newQty = currentQty - 1;
    if (isLoggedIn) {
      if (newQty <= 0) {
        setL("remove", true);
        try {
          await dispatch(removeCartItem({ productId: String(cartItem?.productId?._id || cartItem?.productId), variantId: String(cartItem?.variantId), productSlug: product.slug })).unwrap();
          toast.info("Removed from cart");
        } catch (err) { toast.error(err?.message || "Failed to remove"); }
        finally { setL("remove", false); }
      } else {
        setL("update", true);
        try { await dispatch(updateCartItem({ productId: String(cartItem?.productId?._id || cartItem?.productId), variantId: String(cartItem?.variantId), quantity: newQty, productSlug: product.slug })).unwrap(); }
        catch (err) { toast.error(err?.message || "Failed to update"); }
        finally { setL("update", false); }
      }
    } else {
      if (newQty <= 0) { dispatch(removeGuestCartItem({ productSlug: product.slug, variantId: variant?._id?.toString() || "" })); toast.info("Removed from cart"); }
      else dispatch(updateGuestCartItem({ productSlug: product.slug, variantId: variant?._id?.toString() || "", quantity: newQty }));
    }
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    if (!product?.slug || localLoading.wishlist) return;
    setL("wishlist", true);
    try {
      if (isLoggedIn) {
        if (wishlisted) { await dispatch(removeFromWishlist({ productSlug: product.slug })).unwrap(); toast.success("Removed from wishlist", { icon: "💔" }); }
        else { await dispatch(addToWishlist({ productSlug: product.slug })).unwrap(); toast.success("Added to wishlist", { icon: "❤️" }); }
      } else {
        if (wishlisted) { dispatch(removeGuestItem(product.slug)); toast.success("Removed", { icon: "💔" }); }
        else { dispatch(addGuestItem(product.slug)); toast.success("Saved to wishlist", { icon: "❤️" }); }
      }
    } catch (err) { toast.error(err?.message || "Wishlist action failed"); }
    finally { setL("wishlist", false); }
  };

  const share = (type) => {
    const url = window.location.href;
    const map = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    };
    if (map[type]) window.open(map[type], "_blank");
    if (type === "instagram") { navigator?.clipboard?.writeText(url); alert("Link copied!"); }
  };

  const submitProductReview = async (e) => {
    e.preventDefault();
    if (!product?._id || !isLoggedIn) {
      toast.info("Please log in to write a review");
      return;
    }
    setReviewSubmitting(true);
    try {
      const body = {
        productId: String(product._id),
        rating: Number(reviewForm.rating),
        comment: String(reviewForm.comment || "").trim(),
      };
      if (myReview?._id) {
        await axiosInstance.put(`/product-reviews/${myReview._id}`, body);
        toast.success("Review updated");
      } else {
        await axiosInstance.post("/product-reviews", body);
        toast.success("Thanks! Your review will appear after moderation.");
      }
      const pid = String(product._id);
      const [sumRes, listRes, mineRes] = await Promise.all([
        axiosInstance.get(`/product-reviews/public/${pid}/summary`),
        axiosInstance.get(`/product-reviews/public/${pid}`, { params: { limit: 50 } }),
        axiosInstance.get(`/product-reviews/mine/${pid}`),
      ]);
      setReviewSummary(sumRes.data?.summary ?? null);
      setReviewsList(Array.isArray(listRes.data?.reviews) ? listRes.data.reviews : []);
      const r = mineRes.data?.review;
      setMyReview(r || null);
      if (r) setReviewForm({ rating: r.rating, comment: r.comment || "" });
      setShowReviewComment(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not save review";
      toast.error(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── guards ─────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="bg-gray-50 min-h-screen"><Skeleton /></div>;
  if (fetchError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-gray-600 text-sm text-center max-w-sm">{fetchError?.message || "Product not found."}</p>
      <div className="flex gap-3">
        <button onClick={() => dispatch(fetchProductBySlug(slug))} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"><RefreshCw size={14} /> Retry</button>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl"><ArrowLeft size={14} /> Go Back</button>
      </div>
    </div>
  );
  if (!product) return null;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb product={product} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py sm:py-8 sm:space-y-z">
          {isVisible && (
            <div
              className="ImageCard fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex items-end"
              onClick={() => setisVisible(false)}
            >
              {/* Sheet */}
              <div
                className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle + Header */}
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-800">
                    {activeThumb + 1} / {images.length}
                  </p>
                  <button
                    onClick={() => setisVisible(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Main Big Image */}
                <div className="w-full flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden mb-4 relative"
                  style={{ aspectRatio: "1/1" }}
                >
                  {activeImg ? (
                    <img
                      src={activeImg}
                      loading="lazy"
                      draggable="false"
                      alt={title}
                      className="w-full h-full object-contain p-4"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <Package size={48} className="text-gray-300" />
                  )}

                  {/* Prev / Next arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveThumb((p) => (p - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setActiveThumb((p) => (p + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Dot indicators */}
                {images.length > 1 && (
                  <div className="flex justify-center gap-1.5 mb-5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveThumb(i)}
                        className={`rounded-full transition-all duration-200 ${activeThumb === i
                          ? "w-4 h-2 bg-orange-400"
                          : "w-2 h-2 bg-gray-300"
                          }`}
                      />
                    ))}
                  </div>
                )}

                {/* Thumbnail grid */}
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveThumb(i)}
                      className={`rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-square
                        ${activeThumb === i
                          ? "border-orange-400 shadow-md shadow-orange-100 scale-[1.04]"
                          : "border-gray-200 hover:border-orange-300"
                        }`}
                    >
                      <img src={img.url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ MAIN PRODUCT CARD ═══════════ */}
          <div className="bg-gray-50 rounded-2xl sm:rounded-3xl overflow-hidden ">
            <div className="flex flex-col lg:grid lg:grid-cols-2">

              {/* ── LEFT: Gallery + customer reviews below ── */}
              <div className="flex flex-col w-full gap-4 lg:gap-6 lg:border-r border-gray-100 lg:pr-4 min-w-0">
                <div className="flex flex-row gap-6 min-w-0">

                  {images.length > 0 && (
                    <div className="hidden lg:flex flex-col items-center gap-0 py-3 px-2 border-r border-gray-100 bg-gray-50 flex-shrink-0 w-[76px]">
                      {images.length > 5 && (
                        <button
                          onClick={() => {
                            const el = document.getElementById("thumb-list");
                            if (el) el.scrollBy({ top: -70, behavior: "smooth" });
                          }}
                          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition flex-shrink-0"
                        >
                          ▲
                        </button>
                      )}

                      <div
                        id="thumb-list"
                        className="flex flex-col gap-2 overflow-y-auto scrollbar-hide flex-1"
                        style={{ maxHeight: 380 }}
                      >
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => { setActiveThumb(i); }}
                            className={`flex-shrink-0 w-[56px] h-[56px] rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeThumb === i
                              ? "border-orange-400 shadow-md shadow-orange-100 scale-[1.04]"
                              : "border-gray-200 hover:border-orange-300"
                              }`}
                          >
                            <img src={img.url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>

                      {images.length > 5 && (
                        <button
                          onClick={() => {
                            const el = document.getElementById("thumb-list");
                            if (el) el.scrollBy({ top: 70, behavior: "smooth" });
                          }}
                          className="w-8 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition flex-shrink-0"
                        >
                          ▼
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Main image + mobile dot nav ── */}
                  <div className="flex-1 flex flex-col">
                    <div
                      ref={containerRef}
                      className="relative w-full cursor-pointer flex items-center justify-center overflow-hidden"
                      style={{ aspectRatio: "1/1" }}
                      onClick={() => { if (isMobile) setisVisible(true); }}
                      onMouseEnter={() => { if (isMobile) return; setShowZoom(true); }}
                      onMouseLeave={() => { if (isMobile) return; setShowZoom(false); }}
                      onMouseMove={!isMobile ? handleMouseMove : undefined}
                    >
                      {activeImg ? (
                        <img
                          src={activeImg}
                          alt={title}
                          // className="w-full h-full object-cover p-4 sm:p-6"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div>No image</div>
                      )}

                      {/* ── Mobile prev/next arrows (inline gallery) ── */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveThumb((p) => (p - 1 + images.length) % images.length); }}
                            className="lg:hidden absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 active:scale-90 transition-all z-10"
                            aria-label="Previous image"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveThumb((p) => (p + 1) % images.length); }}
                            className="lg:hidden absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 active:scale-90 transition-all z-10"
                            aria-label="Next image"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </>
                      )}

                      {/* 🔥 AMAZON DOTTED LENS */}
                      {showZoom && !isMobile && (
                        <div
                          ref={lensRef}
                          className="absolute pointer-events-none"
                          style={{
                            width: "10rem",
                            height: "11rem",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "rgba(163, 89, 223, 0.35)",
                            backgroundImage: `radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)`,
                            backgroundSize: "6px 6px",
                            border: "1px solid rgba(0,0,0,0.2)",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      )}
                    </div>

                    {/* Mobile dots */}
                    {images.length > 1 && (
                      <div className="lg:hidden flex items-center justify-center gap-1.5 py-3">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveThumb(i)}
                            className={`rounded-full transition-all duration-200 ${activeThumb === i
                              ? "w-4 h-2 bg-orange-400"
                              : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>{/* end image row */}
              </div>{/* end left column */}

              <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2 lg:border-r border-gray-100 lg:pr-4 mt-4 lg:mt-0">
                {/* Reviews: directly under gallery on desktop; after product info on mobile */}
                {/* START REVIEWS SECTION */}
                {(() => {
                  const totalReviews = reviewsList.length;
                  const starCounts = ratingIsPlaceholder
                    ? getFallbackDistribution(product).map(({ star, pct }) => ({
                      star,
                      count: 0,
                      pct,
                    }))
                    : [5, 4, 3, 2, 1].map((star) => {
                      const count = reviewsList.filter((r) => Math.round(r.rating) === star).length;
                      const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                      return { star, count, pct };
                    });
                  const filteredReviews = filterStar
                    ? reviewsList.filter((r) => Math.round(r.rating) === filterStar)
                    : reviewsList;
                  const visibleReviews = filteredReviews.slice(0, visibleCount);

                  return (
                    <div className="border border-zinc-100 rounded-2xl overflow-hidden bg-white flex flex-col min-h-0 w-full">
                      {/* ── SECTION 1: HEADER ── */}
                      <div className="px-4 py-5 sm:px-6 sm:pt-6 sm:pb-4 flex-shrink-0 border-b border-zinc-100/90">
                        <p className="text-lg font-bold text-gray-900 mb-3">Customer reviews</p>

                        {reviewsLoading ? (
                          <p className="text-sm text-gray-500 py-2">Loading reviews…</p>
                        ) : (
                          <>
                            {/* Average + stars + count */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span className="text-3xl font-bold text-gray-900">
                                {Number(displayAvg).toFixed(1)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    size={18}
                                    className={s <= Math.round(Number(displayAvg))
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-gray-200 fill-gray-200"}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                {ratingIsPlaceholder
                                  ? `${displayCount} ratings`
                                  : `${displayCount} published ${displayCount === 1 ? "review" : "reviews"}`}
                              </span>
                            </div>

                            {/* Star distribution bars */}
                            <div className="space-y-1.5 mb-4">
                              {starCounts.map(({ star, pct }) => {
                                const isActive = filterStar === star;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                      setFilterStar(filterStar === star ? null : star);
                                      setVisibleCount(3);
                                    }}
                                    className={`w-full flex items-center gap-2 sm:gap-3 px-2 py-1 rounded-lg transition-colors text-sm cursor-pointer ${isActive ? "bg-amber-50" : "hover:bg-gray-50"
                                      }`}
                                  >
                                    <span className="w-12 sm:w-14 text-left text-xs sm:text-sm text-gray-600 font-medium flex-shrink-0">
                                      {star} star
                                    </span>
                                    <div className="flex-1 h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${isActive ? "bg-amber-500" : "bg-amber-400"
                                          }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="w-10 text-right text-xs text-gray-500 flex-shrink-0">
                                      {pct}%
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Clear filter button */}
                            {filterStar !== null && (
                              <button
                                type="button"
                                onClick={() => { setFilterStar(null); setVisibleCount(3); }}
                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline mb-3 cursor-pointer"
                              >
                                × Clear filter
                              </button>
                            )}

                            {/* Login prompt for logged-out users */}
                            {!isLoggedIn && (
                              <p className="text-sm text-gray-500 mt-2">
                                <button
                                  type="button"
                                  onClick={openAuthModal}
                                  className="text-orange-600 font-bold hover:underline"
                                >
                                  Log in
                                </button>{" "}
                                to leave a review
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* ── SECTION 2: YOUR REVIEW BOX (logged in only) ── */}
                      {isLoggedIn && !reviewsLoading && (
                        <div className="px-4 sm:px-6 pt-4">
                          <form
                            onSubmit={submitProductReview}
                            className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 space-y-3"
                          >
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {myReview?._id ? "Your review" : "Rate this product"}
                            </p>

                            <StarRatingInput
                              value={reviewForm.rating}
                              onChange={(n) => setReviewForm((f) => ({ ...f, rating: n }))}
                              disabled={reviewSubmitting}
                              size={30}
                            />

                            {!showReviewComment ? (
                              <button
                                type="button"
                                onClick={() => setShowReviewComment(true)}
                                className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                              >
                                Write a comment{" "}
                                <span className="font-normal text-gray-500">(optional)</span>
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Comment (optional)
                                </label>
                                <textarea
                                  value={reviewForm.comment}
                                  onChange={(e) =>
                                    setReviewForm((f) => ({ ...f, comment: e.target.value }))
                                  }
                                  rows={3}
                                  maxLength={2000}
                                  placeholder="Share your thoughts about this product…"
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition"
                                />
                                <button
                                  type="button"
                                  disabled={reviewSubmitting}
                                  onClick={() => setShowReviewComment(false)}
                                  className="text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
                                >
                                  Hide comment
                                </button>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={reviewSubmitting || reviewForm.rating === 0}
                              className={`text-sm font-semibold px-5 py-2 rounded-lg transition cursor-pointer ${reviewForm.rating === 0
                                ? "bg-zinc-900 text-white opacity-40 cursor-not-allowed"
                                : "bg-zinc-900 text-white hover:bg-zinc-800"
                                } disabled:opacity-40`}
                            >
                              {reviewSubmitting ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 size={14} className="animate-spin" />
                                  Saving…
                                </span>
                              ) : myReview?._id ? "Update review" : "Submit review"}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* ── SECTION 3: PUBLISHED REVIEWS LIST ── */}
                      <div
                        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 overscroll-y-contain [scrollbar-gutter:stable]"
                        aria-label="Published reviews list"
                      >
                        {reviewsLoading ? null : reviewsList.length === 0 ? (
                          <p className="text-sm text-gray-500">No published reviews yet.</p>
                        ) : filteredReviews.length === 0 && filterStar !== null ? (
                          <p className="text-sm text-gray-500">No reviews with {filterStar} stars.</p>
                        ) : (
                          <>
                            <ul className="space-y-3 sm:space-y-4 pb-2">
                              {visibleReviews.map((r) => (
                                <li
                                  key={r._id}
                                  className="border border-gray-100 rounded-xl p-3 sm:p-4 bg-white"
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm font-semibold text-zinc-700 uppercase">
                                        {(typeof r.author === "string" && r.author.length > 0)
                                          ? r.author.charAt(0)
                                          : "?"}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      {/* Author + Date */}
                                      <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-gray-900 truncate">
                                          {r.author}
                                        </span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                          {r.createdAt
                                            ? new Date(r.createdAt).toLocaleDateString()
                                            : ""}
                                        </span>
                                      </div>

                                      {/* Stars */}
                                      <div className="flex items-center gap-0.5 mb-1.5">
                                        {Array.from({ length: Math.round(r.rating) }).map((_, i) => (
                                          <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                                        ))}
                                      </div>

                                      {/* Comment */}
                                      {r.comment ? (
                                        <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic">No comment left</p>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>

                            {/* Load more */}
                            {visibleCount < filteredReviews.length && (
                              <div className="flex flex-col items-center gap-2 pt-3">
                                <button
                                  type="button"
                                  onClick={() => setVisibleCount((prev) => prev + 3)}
                                  className="border border-zinc-200 rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-zinc-300 transition cursor-pointer"
                                >
                                  Load more reviews
                                </button>
                                <p className="text-xs text-gray-400 text-center">
                                  Showing {Math.min(visibleCount, filteredReviews.length)} of{" "}
                                  {filteredReviews.length} reviews
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {/* END REVIEWS SECTION */}
              </div>{/* end reviews wrapper */}

              <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 flex flex-col min-w-0">
                {/* ── RIGHT: Info panel ── */}
                <div className="flex relative flex-col gap-3 p-4 sm:p-6 lg:p-7">
                  {showZoom && !isMobile && (
                    <div
                      ref={zoomRef}
                      className="hidden lg:block w-[30rem] absolute z-10 h-[42rem] rounded-2xl shadow-lg bg-white"
                      style={{
                        backgroundImage: `url(${activeImg})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "250%",
                        transition: "background-position 0.1s ease-out",
                        top: "-80px",
                      }}
                    />
                  )}

                  {/* Title */}
                  <h1 className="text-sm sm:text-2xl  text-gray-900 leading-snug tracking-tight">
                    {title}
                    {/* {product.title.length > 60 ? `${product.title}...` : product.title} */}
                  </h1>

                  {/* Brand + Rating */}
                  <div className="flex flex-col flex-wrap gap-2">
                    {brand && brand.toLowerCase() !== "generic" && (
                      <span className="text-sm text-gray-500">
                        by <span className="text-orange-500 font-semibold">{brand}</span>
                      </span>
                    )}
                    {/* PRODUCT CODE */}
                    {productCode && (
                      <span className="text-[15px] text-gray-700 font-mon">
                        {productCode}
                      </span>
                    )}
                    <div className="flex items-center w-fit px-1 py-2 rounded-lg gap-2 bg-gray-100">
                      <div className="flex text-sm items-center gap-2">
                        {Number(displayAvg).toFixed(1)}{" "}
                        <Star size={14} fill="#F7C85C" className="text-[#F7C85C]" />
                      </div>
                      <div className="w-[1.5px] h-5 bg-zinc-300"></div>
                      <div className="text-sm">
                        {displayCount}{" "}
                        {displayCount === 1 ? "rating" : "ratings"}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">{fmt(salePrice)}</span>
                    {hasDisc && (
                      <>
                        <span className="text-sm text-gray-400 line-through mb-0.5">{fmt(basePrice)}</span>
                        <span className="bg-[#79AE6F] text-white text-xs font-bold px-2.5 py-1 rounded-lg mb-0.5">
                          {discPct}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  {/* ── SOLD INFO + FOMO LABELS ── */}
                  <div className="flex flex-col gap-2">

                    {/* Sold count */}
                    {product?.soldInfo?.enabled && product?.soldInfo?.count > 0 && (
                      <p className="font-medium text-zinc-900 flex items-center gap-1 text-sm">
                        <span className="font-bold text-[crimson] text-sm">
                          {formatCount(product.soldInfo.count)} bought in past month
                        </span>
                      </p>
                    )}

                    {/* Stock Fomo — new schema (e.g. "Only 3 left!") */}
                    {product?.fomo?.stockFomo?.enabled && product?.fomo?.stockFomo?.label && inStock && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 w-fit">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <p className="text-xs font-semibold text-red-700">
                          {product.fomo.stockFomo.label}
                        </p>
                      </div>
                    )}

                    {/* Viewing Fomo — new schema (e.g. "12 people viewing now") */}
                    {product?.fomo?.viewingFomo?.enabled && product?.fomo?.viewingFomo?.label && (
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 w-fit">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        <p className="text-xs font-semibold text-orange-700">
                          {product.fomo.viewingFomo.label}
                        </p>
                      </div>
                    )}

                    {/* Fallback fomoLabel — old schema, stock-aware */}
                    {!product?.fomo?.stockFomo && !product?.fomo?.viewingFomo && product?.fomo?.enabled && product?.fomoLabel &&
                      (inStock || !isStockRelatedLabel(product.fomoLabel)) && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 w-fit">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                          </span>
                          <p className="text-xs font-semibold text-orange-700">
                            {product.fomoLabel}
                          </p>
                        </div>
                      )}

                  </div>

                  <div className="flex flex-col gap-2 ">
                    <div className="w-full h-px bg-gray-200"></div>

                    {/* ── Wishlist + Share bar ── */}
                    <div className="flex flex-col gap-3 mt-2">

                      {/* OUT OF STOCK */}
                      {!inStock && (
                        <div className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 text-center">
                          Out of Stock
                        </div>
                      )}

                      {/* IN STOCK */}
                      {inStock && (
                        <>
                          {/* All three buttons in ONE row at every viewport.
                              • Add to Cart takes the remaining space (flex-1)
                              • Wishlist+Share stays compact (shrink-0)
                              • Labels hide on mobile (icon-only) so Add to Cart
                                always has enough room for its full "Add to Cart"
                                text on one line. Equal py-3 → same height. */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* ── ADD TO CART ── */}
                            {!isInCart && (
                              <button
                                onClick={handleAddToCart}
                                disabled={localLoading.add}
                                className="
                                  flex-1 min-w-0
                                  px-4 sm:px-6 md:px-8
                                  py-3
                                  rounded-xl
                                  text-sm md:text-base
                                  font-semibold
                                  whitespace-nowrap
                                  flex items-center justify-center gap-2
                                  bg-[#F7A221] text-white
                                  hover:bg-[#F7A221]
                                  transition active:scale-[0.97]
                                  disabled:opacity-70 disabled:cursor-not-allowed
                                "
                              >
                                {localLoading.add ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <>
                                    <ShoppingCart size={16} />
                                    <span>Add to Cart</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* ── QTY CONTROLS ── */}
                            {isInCart && (
                              <div className="flex items-center flex-1 min-w-0 border border-zinc-200 rounded-xl overflow-hidden">
                                <button
                                  onClick={handleDecrement}
                                  disabled={isProcessing}
                                  className="w-10 h-10 flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-red-500 hover:text-white transition"
                                >
                                  {localLoading.remove
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Minus size={16} />}
                                </button>
                                <div className="flex-1 text-center text-sm font-semibold">
                                  {localLoading.update
                                    ? <Loader2 size={14} className="animate-spin mx-auto" />
                                    : currentQty}
                                </div>
                                <button
                                  onClick={handleIncrement}
                                  disabled={isAtMaxStock || isProcessing}
                                  className="w-10 h-10 flex items-center cursor-pointer justify-center bg-zinc-900 text-white hover:bg-yellow-500 transition"
                                >
                                  {localLoading.update
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Plus size={16} />}
                                </button>
                              </div>
                            )}

                            {/* ── WISHLIST + SHARE ──
                                Compact natural width on mobile (icon-only),
                                grows with labels at sm+. */}
                            <div className="relative shrink-0 flex rounded-2xl overflow-visible bg-gray-50">

                              {/* Wishlist */}
                              <button
                                onClick={handleWishlist}
                                disabled={localLoading.wishlist}
                                className={`px-3 sm:px-4 py-3 flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold transition-all duration-200 rounded-l-2xl active:scale-[0.98]
                                  ${wishlisted
                                    ? "text-red-500 bg-red-50"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-red-400"
                                  } disabled:opacity-50`}
                              >
                                {localLoading.wishlist
                                  ? <Loader2 size={16} className="animate-spin" />
                                  : <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : ""} />}
                                <span className="hidden sm:inline whitespace-nowrap">
                                  {wishlisted ? "Wishlisted" : "Wishlist"}
                                </span>
                              </button>

                              {/* Divider */}
                              <div className="w-px self-stretch bg-gray-200 shrink-0" />

                              {/* Share */}
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareOpen((v) => !v);
                                  }}
                                  className={`h-full py-3 px-3 sm:px-5 md:px-6 flex items-center justify-center cursor-pointer gap-2 text-sm font-semibold transition-all duration-200 rounded-r-2xl active:scale-[0.98]
                                    ${shareOpen ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                                >
                                  <Share2 size={15} />
                                  <span className="hidden sm:inline">Share</span>
                                </button>

                                {/* SHARE POPUP */}
                                {shareOpen && (
                                  <div className="absolute bottom-[calc(100%+10px)] right-0 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-lg z-50 flex gap-3">
                                    {[
                                      { type: "whatsapp", Icon: IoLogoWhatsapp, cls: "bg-green-500 hover:bg-green-600", link: "https://wa.me/message/72BTQZMTQU2AG1" },
                                      { type: "facebook", Icon: IoLogoFacebook, cls: "bg-blue-600 hover:bg-blue-700", link: "https://www.facebook.com/share/1Eej9auTBB/" },
                                      { type: "instagram", Icon: IoLogoInstagram, cls: "bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600", link: "https://www.instagram.com/offer_wale_baba?igsh=Mjd6aG84bXV5dmRn" },
                                      { type: "telegram", Icon: FaTelegram, cls: "bg-sky-500 hover:bg-sky-600", link: "https://t.me/OfferWaleBabaRetail" },
                                    ].map(({ type, Icon, cls, link }) => (
                                      <a key={type} onClick={() => { window.open(link, "_blank"); setShareOpen(false); }}
                                        className={`w-9 h-9 rounded-full ${cls} text-white flex items-center cursor-pointer justify-center hover:scale-110 active:scale-95 transition-all duration-150 shadow-sm`}>
                                        <Icon size={16} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── BUY NOW ── */}
                          <button
                            disabled={!inStock || localLoading.add || localLoading.buyNow}
                            onClick={async () => {
                              // ── Auth gate: non-logged-in users see the login modal ──
                              if (!isLoggedIn) {
                                openAuthModal();
                                return;
                              }

                              if (isInCart) { navigate("/checkout"); return; }
                              setL("buyNow", true);
                              try {
                                await dispatch(addToCart({
                                  productSlug: product.slug,
                                  variantId: variant?._id?.toString(),
                                  quantity: 1,
                                })).unwrap();
                                navigate("/checkout");
                              } catch (err) {
                                toast.error(err?.message || "Failed to proceed");
                              } finally {
                                setL("buyNow", false);
                              }
                            }}
                            className="w-full py-3 rounded-xl text-base sm:text-lg font-semibold bg-zinc-900 text-white hover:bg-[#F7A221] transition active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {localLoading.buyNow
                              ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                              : "Buy Now"
                            }
                          </button>

                        </>
                      )}
                    </div>
                    <div className="w-full h-px bg-gray-200"></div>
                  </div>

                  {inStock && lowStock && (
                    <p className="text-xs text-orange-600 font-semibold flex items-center gap-1 -mt-1">
                      <AlertCircle size={12} /> Only {stock} left — hurry!
                    </p>
                  )}

                  <div className="h-px bg-gray-100" />

                  {/* Variant Attributes */}
                  {attrKeys.length > 0 && (
                    <div className="space-y-4" ref={variantRef}>
                      {attrKeys.map((key) => (
                        <div key={key}>
                          <p className="text-xs font-bold cursor-pointer text-gray-400 uppercase tracking-widest mb-2">
                            {key}
                            {selectedAttrs[key] && (
                              <span className="ml-2 normal-case font-semibold text-gray-800 tracking-normal cursor-pointer">
                                : {selectedAttrs[key]}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {getAllValues(key).map((val) => {
                              const avail = isAvailable(key, val);
                              const active = selectedAttrs[key] === val;
                              return (
                                <button
                                  key={val}
                                  onClick={() => avail && handleAttrSelect(key, val)}
                                  disabled={!avail}
                                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-xl cursor-pointer border-2 font-medium transition-all duration-150 ${active
                                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                                    : avail
                                      ? "border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 bg-white"
                                      : "border-gray-100 text-gray-300 cursor-not-allowed line-through bg-gray-50"
                                    }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Offers */}
                  <div className="h-px bg-gray-100" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-3">Offers</p>
                    <div className="flex flex-col divide-y divide-gray-100">
                      {topCoupons.map((coupon) => (
                        <div key={coupon._id || coupon.code} className="flex items-start justify-between py-3 gap-3">
                          <div className="flex items-start gap-2.5">
                            <Tag size={18} className="text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {(() => {
                                  const code = String(coupon.code || "").trim().toUpperCase();
                                  const label = String(coupon.label || "");
                                  const prefix = `Use ${code}`;
                                  if (code && label.startsWith(prefix)) {
                                    return (
                                      <>
                                        Use <span className="font-bold text-gray-900">{code}</span>
                                        {label.slice(prefix.length)}
                                      </>
                                    );
                                  }
                                  return label;
                                })()}
                              </p>
                              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                                Coupon code - <span className="font-semibold text-gray-600">{String(coupon.code || "").toUpperCase()}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopyCouponCode(coupon.code)}
                            type="button"
                            className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
                          >
                            {copiedCouponCode === String(coupon.code || "").trim().toUpperCase() ? "Copied" : "Copy code"}
                          </button>
                        </div>
                      ))}
                      {!couponsLoading && topCoupons.length === 0 && (
                        <p className="py-3 text-sm text-gray-500">No active offers available right now.</p>
                      )}
                      {couponsLoading && (
                        <p className="py-3 text-sm text-gray-500">Loading offers...</p>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">*Coupons can be applied at checkout</p>
                  </div>

                  <div className="h-px bg-gray-100 mt-2" />
                  <div className="mt-4 border border-zinc-100 rounded-2xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenDesc((v) => !v)}
                      className="w-full flex items-center cursor-pointer justify-between px-5 sm:px-6 py-4 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="w-8 h-8 bg-purple-50 cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={15} className="text-purple-600" />
                        </div>
                        <div className="cursor-pointer">
                          <p className="text-sm font-semibold text-gray-900">Product Description</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Highlights, specs & details</p>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${openDesc ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openDesc && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100 cursor-pointer">

                        {/* About */}
                        {product?.description?.trim() && (
                          <div className="px-5 sm:px-6 py-5">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-3">About this item</p>
                            <p className="text-sm text-gray-600 font-bold leading-relaxed">{product.title}</p> <br />
                            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                          </div>
                        )}

                        {/* Highlights */}
                        {Array.isArray(product?.attributes) && product.attributes.some(a => a?.key && a?.value) && (
                          <div className="px-5 sm:px-6 py-5">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-4">Key highlights</p>
                            <div className="flex flex-col gap-3">
                              {product.attributes.filter(a => a?.key && a?.value).map((attr, i) => (
                                <div key={`${attr.key}-${i}`} className="flex items-start gap-3 text-sm">
                                  <span className="text-gray-400 min-w-[120px] flex-shrink-0">{attr.key}</span>
                                  <span className="text-gray-900 font-medium">{attr.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dimensions */}
                        {(() => {
                          const s = product?.shipping;
                          const d = s?.dimensions;
                          if (!s || (!s.weight && !d?.length && !d?.width && !d?.height)) return null;

                          const length = d?.length || 0;
                          const width = d?.width || 0;
                          const height = d?.height || 0;
                          const dimensionalFactor = 5000;

                          let volumetricWeightGm = null;
                          if (length && width && height) {
                            const volumetricWeightKg = (length * width * height) / dimensionalFactor;
                            volumetricWeightGm = Math.round(volumetricWeightKg * 1000);
                          }

                          const dims = [
                            s?.weight && { key: "Weight", value: `${s.weight} kg` },
                            d?.length && { key: "Length", value: `${d.length} cm` },
                            d?.width && { key: "Width", value: `${d.width} cm` },
                            d?.height && { key: "Height", value: `${d.height} cm` },
                            volumetricWeightGm && { key: "Volu. Weight", value: `${volumetricWeightGm} Gm` },
                          ].filter(Boolean);

                          return (
                            <div className="px-5 sm:px-6 py-5">
                              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-4">Dimensions & weight</p>
                              <div className="flex flex-col gap-3">
                                {dims.map((attr, i) => (
                                  <div key={`${attr.key}-${i}`} className="flex items-start gap-3 text-sm">
                                    <span className="text-gray-400 min-w-[120px] flex-shrink-0">{attr.key}</span>
                                    <span className="text-gray-900 font-medium">{attr.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Footer */}
                        {(() => {
                          const countryOfOrigin = product?.origin?.country;  // Removed the "null" fallback
                          const gst = product?.gst || product?.tax?.gst || null;

                          const items = [
                            ...(countryOfOrigin ? [{ key: "Country of Origin", value: countryOfOrigin }] : []),
                            ...(gst ? [{ key: "GST", value: `(${gst}%)` }] : [])
                          ];

                          if (items.length === 0) return null;

                          return (
                            <div className="px-5 sm:px-6 py-5">
                              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-4">GST</p>
                              <div className="flex flex-col gap-3">
                                {items.map((item, i) => (
                                  <div key={`${item.key}-${i}`} className="flex items-start gap-3 text-sm">
                                    <span className="text-gray-400 min-w-[120px] flex-shrink-0">{item.key}</span>
                                    <span className="text-gray-900 font-medium">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    )}
                  </div>

                </div>{/* end info panel */}
              </div>{/* end right column */}
            </div>
          </div>{/* end main card */}

          {/* ═══════════ RELATED PRODUCTS ═══════════ */}
          {related?.length > 0 && (
            <div className="pb-4">
              <div className="flex items-center mt-28 justify-between mb-1">
              <h2 className="text-base sm:text-2xl font- text-red-500">
                        Customers also bought these items
                      </h2>
                <button onClick={() => navigate(`/category/${product?.category?.slug}`)} className="hidden sm:flex text-xs sm:text-sm text-gray-400 hover:text-orange-500 sm:items-center gap-1 transition font-medium">
                  View all <ArrowRight size={13} />
                </button>
              </div>
              <div className="w-full h-px bg-zinc-400">
                <div className="w-full sm:w-1/2 h-full bg-[crimson]"></div>
              </div>
              <div className="grid grid-cols-2 mt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {related.map((p, i) => <RelatedCard key={p._id || p.slug} product={p} index={i} />)}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ProductUI;