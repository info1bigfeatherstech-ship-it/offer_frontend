import React, { useEffect, useMemo } from 'react';
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  ShieldCheck, RefreshCw, AlertCircle,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  updateGuestCartItem,
  removeGuestCartItem,
  clearCartErrors,
  selectCartItems,
  selectCartGuestItems,
  selectCartTotalAmount,
  selectCartLoading,
  selectCartError,
  selectDisplayCartCount,
} from '../../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice';

import { resetCheckout } from '../../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice';

import { selectDefaultAddress } from '../../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice';

import CartDeliverySection from '../../../components/Common/CartDeliverySection';

import { fetchCategories } from '../../../components/ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice';
import { getProductCategoryDisplayName } from '../../../utils/getProductCategoryDisplayName';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
import { formatInr as fmt } from '../../../utils/formatInr';

const logError = (context, error, info = {}) => {
  console.group(`🔴 [UserCart] ERROR in ${context}`);
  console.error('Error:', error);
  console.log('Info:', info);
  console.groupEnd();
};

// ─────────────────────────────────────────────────────────────────────────────
// CartRowItem — single clean component (File 1 pattern)
// API shape: item.product = populated object, item.productId = plain string ID
// item.price = { base, sale, current, discountPercentage }
// ─────────────────────────────────────────────────────────────────────────────
const CartRowItem = ({ item, isLoggedIn, onUpdate, onRemove, isUpdating, isRemoving, categories = [] }) => {

  // ✅ API returns item.product as the populated product object
  const product = item.product ?? null;

  // ✅ Find matched variant from item.product.variants
  const matchedVariant = product
    ? (product.variants?.find(
        (v) => String(v._id) === String(item.variantId)
      ) ?? product.variants?.[0] ?? null)
    : null;

  // ✅ Use item.product.title then item.product.name
  const name = product
    ? (product.title || product.name)
    : (item._productSlug?.replace(/-/g, ' ') || 'Product');

  // ✅ Slug for linking
  const slug = product?.slug || item._productSlug || null;

  // ✅ Image from matched variant inside item.product.variants
  const image =
    matchedVariant?.images?.[0]?.url ||
    product?.variants?.[0]?.images?.[0]?.url ||
    null;

  // ✅ Price from item.price (cart-level snapshot)
  const price       = item.price?.sale ?? item.price?.base ?? null;
  const basePrice   = item.price?.base ?? null;
  const discountPct = item.price?.discountPercentage ?? 0;

  const qty       = item.quantity || 1;
  const itemTotal = price != null ? price * qty : null;

  const categoryLabel = useMemo(
    () => getProductCategoryDisplayName(product?.category, categories),
    [product?.category, categories]
  );
  const showCategory = categoryLabel !== 'Uncategorized';

  return (
    <div className="flex gap-3 md:gap-6 py-2">

      {/* Image */}
      <div className="w-14 h-14 md:w-24 md:h-24 rounded-lg flex-shrink-0">
        <div className="w-full h-full bg-zinc-100 p-1 rounded-lg">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full rounded-lg object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                logError('CartRowItem img', new Error('Image load failed'), { name, image });
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag size={20} className="text-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col md:flex-row md:justify-between md:items-center py-0.5 min-w-0 gap-2 md:gap-4">

        {/* Left — name + category + price */}
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link to={`/products/${slug}`}>
              <h3 className="text-xs md:text-base leading-snug line-clamp-2 hover:text-[#F7A221] transition-colors text-gray-900 font-semibold">
                {name}
              </h3>
            </Link>
          ) : (
            <h3 className="text-xs md:text-base text-gray-900 leading-snug line-clamp-2 font-semibold">
              {name}
            </h3>
          )}

          {showCategory && (
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
                {categoryLabel}
              </span>
            </div>
          )}

          {/* Price row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="font-semibold text-xs md:text-sm">{fmt(price)}</span>
            {basePrice && basePrice !== price && (
              <span className="text-gray-400 text-[11px] line-through">{fmt(basePrice)}</span>
            )}
            {discountPct > 0 && (
              <span className="font-semibold text-[11px] text-[#79AE6F]">{discountPct}% OFF</span>
            )}
          </div>
        </div>

        {/* Right — trash + qty + total */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Remove */}
          <button
            onClick={() => onRemove(item)}
            disabled={isRemoving}
            aria-label="Remove item"
            className="p-1 text-red-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0"
          >
            {isRemoving
              ? <RefreshCw size={14} className="animate-spin" />
              : <Trash2 size={14} />
            }
          </button>

          {/* Qty controls */}
          <div className="flex items-center rounded-full px-1 py-0.5 border border-gray-300">
            <button
              onClick={() => onUpdate(item, qty - 1)}
              disabled={qty <= 1 || isUpdating}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus size={11} />
            </button>
            <span className="px-2 font-semibold text-xs min-w-[1.5rem] text-center">
              {isUpdating ? '…' : qty}
            </span>
            <button
              onClick={() => onUpdate(item, qty + 1)}
              disabled={isUpdating}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={11} />
            </button>
          </div>

          {/* Item total */}
          {itemTotal != null && (
            <p className="font-semibold text-sm text-gray-900 md:min-w-[4rem] md:text-right whitespace-nowrap">
              {fmt(itemTotal)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UserCart — Main Page
// ─────────────────────────────────────────────────────────────────────────────
const UserCart = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();           // ✅ UPGRADE: smart checkout routing

  // ── Selectors ─────────────────────────────────────────────────────────────
  const items       = useSelector(selectCartItems);
  const guestItems  = useSelector(selectCartGuestItems);
  const totalAmount = useSelector(selectCartTotalAmount);
  const totalCount  = useSelector(selectDisplayCartCount);
  const loading     = useSelector(selectCartLoading);
  const error       = useSelector(selectCartError);
  const { isLoggedIn } = useSelector((state) => state.auth);
  const categories = useSelector((state) => state.categories?.categories ?? []);

  // Same as CartSidebar / Navbar: default saved address pincode for delivery check
  const defaultAddress = useSelector(selectDefaultAddress);
  const userPincode = useMemo(() => {
    if (!isLoggedIn || !defaultAddress) return '';
    return String(
      defaultAddress.postalCode ||
        defaultAddress.pincode ||
        defaultAddress.zip ||
        ''
    ).trim();
  }, [isLoggedIn, defaultAddress]);

  const currentItems = isLoggedIn ? items : guestItems;

  // ── Fetch on mount (logged in) ─────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchCart())
        .unwrap()                             // ✅ File 1 fix kept
        .then(() => console.log('✅ [UserCart] cart loaded'))
        .catch((e) => logError('fetchCart', e));
    }
    return () => dispatch(clearCartErrors());
  }, [isLoggedIn, dispatch]);

  useEffect(() => {
    if (categories.length > 0) return;
    dispatch(fetchCategories()).catch(() => {});
  }, [dispatch, categories.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdate = (item, newQty) => {
    if (newQty < 1) { handleRemove(item); return; }
    if (isLoggedIn) {
      dispatch(updateCartItem({
        productId:   String(item.productId),  // ✅ File 1 fix: String(), not ?._id
        variantId:   String(item.variantId),
        quantity:    newQty,
        productSlug: item.product?.slug || item._productSlug,
      }))
        .unwrap()
        .catch((e) => logError('updateCartItem', e, { newQty }));
    } else {
      dispatch(updateGuestCartItem({
        productSlug: item.productSlug || item._productSlug,
        variantId:   String(item.variantId),
        quantity:    newQty,
      }));
    }
  };

  const handleRemove = (item) => {
    if (isLoggedIn) {
      dispatch(removeCartItem({
        productId:   String(item.productId),  // ✅ File 1 fix: String(), not ?._id
        variantId:   String(item.variantId),
        productSlug: item.product?.slug || item._productSlug,
      }))
        .unwrap()
        .catch((e) => logError('removeCartItem', e));
    } else {
      dispatch(removeGuestCartItem({
        productSlug: item.productSlug || item._productSlug,
        variantId:   String(item.variantId),
      }));
    }
  };

  // ✅ UPGRADE: smart checkout — redirect guests to login, reset stale checkout state
  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login?redirect=/checkout');
      return;
    }
    dispatch(resetCheckout());
    navigate('/checkout');
  };

  const isFetching = loading.fetch;
  const isUpdating = loading.update;
  const isRemoving = loading.remove;

  // ── Cart total (line items only; shipping/taxes at checkout) ───────────────
  const subtotal = isLoggedIn
    ? totalAmount
    : guestItems.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity || 1), 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isFetching && currentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <RefreshCw size={28} className="text-gray-300 animate-spin" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
          Loading your cart…
        </p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error.fetch && currentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <AlertCircle size={32} className="text-red-300" />
        <p className="text-gray-500 text-sm font-medium max-w-sm">
          {error.fetch.message || 'Failed to load cart'}
        </p>
        <button
          onClick={() => dispatch(fetchCart())}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-[#F7A221] text-white px-6 py-3 rounded-xl hover:bg-black transition-colors active:scale-95"
        >
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (currentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
          <ShoppingBag size={36} className="text-gray-200" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">
            Your cart is empty
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            Add something you love to get started
          </p>
        </div>
        <Link
          to="/"
          className="bg-black text-white text-xs font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl hover:bg-[#F7A221] transition-all active:scale-95"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">

      {/* Error banner */}
      {(error.update || error.remove) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-700 flex-1">
            {error.update?.message || error.remove?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => dispatch(clearCartErrors())}
            className="text-red-300 hover:text-red-500 transition-colors"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col">

        {/* ── Items list ── */}
        <div className="xl:col-span-2 space-y-3 sm:space-y-4 overflow-y-auto scrollbar-hide max-h-[500px]">
          {currentItems.map((item, index) => {
            // ✅ File 1 fix: stable key using item.product?.slug
            const itemKey = item._id || `${item.product?.slug || item._productSlug || item.productSlug}-${item.variantId}-${index}`;
            return (
              <div key={itemKey} className="p-4 sm:p-6 transition-all duration-300">
                <CartRowItem
                  item={item}
                  isLoggedIn={isLoggedIn}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  isUpdating={isUpdating}
                  isRemoving={isRemoving}
                  categories={categories}
                />
              </div>
            );
          })}
        </div>

        <hr className="border-gray-300 block" />

        {/* ✅ UPGRADE: Delivery pincode checker */}
        <div className="px-1 sm:px-2 mt-4">
          <CartDeliverySection isLoggedIn={isLoggedIn} userPincode={userPincode} />
        </div>

        <hr className="border-gray-200 block my-4" />

        {/* ── Order summary: cart line total only ── */}
        <div className="flex flex-col gap-4 px-1 sm:px-2">

          <div className="flex items-center justify-between">
            <span className="font-bold text-base sm:text-lg">Total</span>
            <span className="font-bold text-base sm:text-lg">{fmt(subtotal)}</span>
          </div>

          {/* ✅ UPGRADE: <button> with smart checkout handler (login guard + resetCheckout) */}
          <button
            onClick={handleCheckout}
            className="w-full px-4 py-3 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors active:scale-95 cursor-pointer"
          >
            <span className="text-white font-semibold flex items-center text-base">
              Checkout <ArrowRight size={16} className="ml-2" />
            </span>
          </button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400">
            <div className="flex items-center gap-1">
              <ShieldCheck size={11} className="text-gray-500" />
              <span><strong className="text-gray-600 font-semibold">Secured</strong> Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck size={11} className="text-gray-500" />
              <span><strong className="text-gray-600 font-semibold">Verified</strong> Merchant</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserCart;
