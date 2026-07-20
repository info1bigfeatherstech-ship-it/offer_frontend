import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  X, ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  RefreshCw, AlertCircle, Star, CheckCircle2,
  XCircle, Loader2,
} from 'lucide-react';
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
} from '../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice';

import { selectDefaultAddress } from '../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice';

import axiosInstance from '../../SERVICES/axiosInstance';

import CartDeliverySection from './CartDeliverySection';

import { fetchCategories } from '../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice';
import { getProductCategoryDisplayName } from '../../utils/getProductCategoryDisplayName';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/lockBodyScroll';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
import { formatInr as fmt } from '../../utils/formatInr';

const logError = (context, error, info = {}) => {
  console.group(`🔴 [CartSidebar] ERROR in ${context}`);
  console.error('Error:', error);
  console.log('Info:', info);
  console.groupEnd();
};

// ─────────────────────────────────────────────────────────────────────────────
// CartItem — cart line (guest rows get `product` merged in CartSidebar after fetch)
// ─────────────────────────────────────────────────────────────────────────────
const CartItem = ({ item, onUpdateQty, onRemove, isUpdating, isRemoving, productPath, onClose, categories = [] }) => {
  const product = item.product ?? null;

  const matchedVariant = product
    ? (product.variants?.find((v) => String(v._id) === String(item.variantId)) ?? product.variants?.[0] ?? null)
    : null;

  const name = product
    ? (product.title || product.name)
    : (item._productSlug?.replace(/-/g, ' ') || 'Product');

  const image =
    matchedVariant?.images?.[0]?.url ||
    product?.variants?.[0]?.images?.[0]?.url ||
    null;

  const price =
    item.price?.sale ??
    item.price?.base ??
    matchedVariant?.finalPrice ??
    matchedVariant?.price?.sale ??
    matchedVariant?.price?.base ??
    null;

  const basePrice      = item.price?.base ?? null;
  const discountPct    = item.price?.discountPercentage ?? 0;
  const qty            = item.quantity || 1;
  const itemTotal      = price != null ? price * qty : null;

  const categoryLabel = useMemo(
    () => getProductCategoryDisplayName(product?.category, categories),
    [product?.category, categories]
  );
  const showCategory = categoryLabel !== 'Uncategorized';

  const handleUpdateQty = (e, newQty) => { e.stopPropagation(); onUpdateQty(item, newQty); };
  const handleRemove    = (e)         => { e.stopPropagation(); onRemove(item); };

  return (
    <div className="flex gap-4 group py-2">
      <Link to={productPath} onClick={onClose}
        className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 block">
        {image ? (
          <img src={image} alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100">
            <ShoppingBag size={24} className="text-gray-300" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
        <div>
          <div className="flex justify-between items-start gap-2">
            <Link to={productPath} onClick={onClose} className="flex-1 cursor-pointer">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-1 uppercase tracking-tight">
                {name}
              </h3>
            </Link>
            {itemTotal != null && (
              <p className="text-sm font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
                {fmt(itemTotal)}
              </p>
            )}
          </div>

          {showCategory && (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
                {categoryLabel}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {price != null && <p className="text-xs text-gray-400">{fmt(price)} × {qty}</p>}
            {basePrice && basePrice !== price && (
              <span className="text-[10px] text-gray-400 line-through">{fmt(basePrice)}</span>
            )}
            {discountPct > 0 && (
              <span className="text-[10px] text-green-500 font-semibold">{discountPct}% OFF</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={(e) => handleUpdateQty(e, qty - 1)} disabled={qty <= 1 || isUpdating}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer" aria-label="Decrease quantity">
              <Minus size={13} />
            </button>
            <span className="px-3 text-xs font-bold min-w-[2rem] text-center">
              {isUpdating ? '…' : qty}
            </span>
            <button onClick={(e) => handleUpdateQty(e, qty + 1)} disabled={isUpdating}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer" aria-label="Increase quantity">
              <Plus size={13} />
            </button>
          </div>
          <button onClick={handleRemove} disabled={isRemoving}
            className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40 cursor-pointer" aria-label="Remove item">
            {isRemoving ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CartSidebar — Main Component
// ─────────────────────────────────────────────────────────────────────────────
const CartSidebar = ({ isOpen, onClose, onOpenAuth }) => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const items        = useSelector(selectCartItems);
  // console.log("items", items);
  
  const guestItems   = useSelector(selectCartGuestItems);
  const totalAmount  = useSelector(selectCartTotalAmount);
  const totalItems   = useSelector(selectDisplayCartCount);
  const loading      = useSelector(selectCartLoading);
  const error        = useSelector(selectCartError);
  const { isLoggedIn } = useSelector((state) => state.auth);
  const categories = useSelector((state) => state.categories?.categories ?? []);

  // Same approach as Navbar — read from the address slice directly.
  // Navbar already dispatches fetchAddresses() when logged in,
  // so by the time CartSidebar opens the data is already in the store.
  const defaultAddress = useSelector(selectDefaultAddress);

  // Extract postalCode from the default address (same field name as the API response)
  const userPincode = useMemo(() => {
    if (!isLoggedIn || !defaultAddress) return '';
    return String(
      defaultAddress.postalCode ||
      defaultAddress.pincode    ||
      defaultAddress.zip        ||
      ''
    ).trim();
  }, [isLoggedIn, defaultAddress]);

  const [itemLoading, setItemLoading] = useState({});

  const setItemState = useCallback((itemId, key, val) =>
    setItemLoading((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [key]: val },
    })), []);

  const currentItems = isLoggedIn ? items : guestItems;

  const subtotal = useMemo(() => {
    if (isLoggedIn) return totalAmount;
    return guestItems.reduce((sum, item) => {
      const price = item.price ?? 0;
      return sum + price * (item.quantity || 1);
    }, 0);
  }, [isLoggedIn, totalAmount, guestItems]);

  const [guestLineProducts, setGuestLineProducts] = useState({});

  const guestCartFetchKey = useMemo(
    () =>
      guestItems
        .map((i) => `${i.productSlug || i._productSlug || ''}:${String(i.variantId || '')}`)
        .sort()
        .join('|'),
    [guestItems]
  );

  useEffect(() => {
    if (isLoggedIn) {
      setGuestLineProducts({});
      return;
    }
    if (!isOpen || guestItems.length === 0) return;

    const slugs = [
      ...new Set(
        guestItems.map((i) => i.productSlug || i._productSlug).filter(Boolean)
      ),
    ];
    if (slugs.length === 0) return;

    const ac = new AbortController();

    (async () => {
      try {
        const pairs = await Promise.all(
          slugs.map(async (slug) => {
            try {
              const { data } = await axiosInstance.get(`/products/${slug}`, {
                signal: ac.signal,
              });
              const product = data?.success ? data?.product : null;
              return { slug, product };
            } catch {
              return { slug, product: null };
            }
          })
        );
        if (ac.signal.aborted) return;
        setGuestLineProducts((prev) => {
          const next = { ...prev };
          for (const { slug, product } of pairs) {
            if (product) next[slug] = product;
          }
          return next;
        });
      } catch {
        /* aborted */
      }
    })();

    return () => ac.abort();
  }, [isOpen, isLoggedIn, guestCartFetchKey, guestItems]);

  // ── Fetch cart when sidebar opens ────────────────────────────
  useEffect(() => {
    if (isOpen && isLoggedIn) {
      dispatch(fetchCart())
        .unwrap()
        .catch((e) => logError('fetchCart on open', e));
    }
  }, [isOpen, isLoggedIn, dispatch]);

  useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    dispatch(fetchCategories()).catch(() => {});
  }, [isOpen, categories.length, dispatch]);

  // ── Lock body scroll when open (compensate scrollbar width) ───
  useEffect(() => {
    if (isOpen) lockBodyScroll();
    else unlockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  // ── Clear errors on close ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) dispatch(clearCartErrors());
  }, [isOpen, dispatch]);

  // ── Item ID helper ────────────────────────────────────────────
  const getItemId = useCallback((item) =>
    item._id ||
    `${item.product?.slug || item._productSlug || item.productSlug}-${item.variantId}`,
  []);

  // ── Remove ────────────────────────────────────────────────────
  const handleRemove = useCallback(async (item) => {
    const itemId = getItemId(item);
    setItemState(itemId, 'removing', true);
    try {
      if (isLoggedIn) {
        await dispatch(removeCartItem({
          productId:   String(item.productId?._id || item.product?._id || item.productId),
          variantId:   String(item.variantId?._id || item.variantId),
          productSlug: item.product?.slug || item._productSlug,
        })).unwrap();
      } else {
        dispatch(removeGuestCartItem({
          productSlug: item.productSlug || item._productSlug,
          variantId:   String(item.variantId),
        }));
        setTimeout(() => setItemState(itemId, 'removing', false), 100);
        return;
      }
    } catch (e) {
      logError('removeCartItem', e, { itemId });
    } finally {
      setItemState(itemId, 'removing', false);
    }
  }, [isLoggedIn, dispatch, getItemId, setItemState]);

  // ── Update quantity ───────────────────────────────────────────
  const handleUpdateQty = useCallback(async (item, newQty) => {
    if (newQty < 1) {
      await handleRemove(item);
      return;
    }
    const itemId = getItemId(item);
    setItemState(itemId, 'updating', true);
    try {
      if (isLoggedIn) {
        await dispatch(updateCartItem({
          productId:   String(item.productId?._id || item.product?._id || item.productId),
          variantId:   String(item.variantId?._id || item.variantId),
          quantity:    newQty,
          productSlug: item.product?.slug || item._productSlug,
        })).unwrap();
      } else {
        dispatch(updateGuestCartItem({
          productSlug: item.productSlug || item._productSlug,
          variantId:   String(item.variantId),
          quantity:    newQty,
        }));
        setTimeout(() => setItemState(itemId, 'updating', false), 100);
        return;
      }
    } catch (e) {
      logError('updateCartItem', e, { newQty, itemId });
    } finally {
      setItemState(itemId, 'updating', false);
    }
  }, [isLoggedIn, dispatch, getItemId, setItemState, handleRemove]);

  const getItemLoading = useCallback((item) => {
    const itemId = getItemId(item);
    return itemLoading[itemId] || { updating: false, removing: false };
  }, [itemLoading, getItemId]);

  const isFetching  = loading.fetch;
  const fetchFailed = error.fetch;

  // ── Checkout: open auth modal for guests ──────────────────────
  const handleCheckoutClick = useCallback(() => {
    if (!isLoggedIn) {
      onOpenAuth?.();
      onClose();
    } else {
      onClose();
      navigate('/checkout');
    }
  }, [isLoggedIn, onOpenAuth, onClose, navigate]);

  // ── "View Full Cart" — auth gate for guests ───────────────────
  const handleCart = useCallback(() => {
    if (!isLoggedIn) {
      onOpenAuth?.();
    } else {
      navigate('/account/usercart');
    }
    onClose();
  }, [isLoggedIn, onOpenAuth, navigate, onClose]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[101] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} className="text-[#F7A221]" />
            <h2 className="text-lg font-black uppercase tracking-tighter">
              Your Cart
              <span className="ml-2 text-sm font-bold text-gray-400">({totalItems})</span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close cart"
            className="p-2 hover:bg-gray-100 rounded-full transition-all hover:rotate-90 duration-200 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Error banner */}
        {(fetchFailed || error.update || error.remove) && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700">
                {fetchFailed?.message || error.update?.message || error.remove?.message || 'Something went wrong'}
              </p>
            </div>
            <button
              onClick={() => dispatch(clearCartErrors())}
              className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scrollable item list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isFetching && currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="text-gray-300 animate-spin" />
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                Loading your cart…
              </p>
            </div>
          ) : fetchFailed && currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <AlertCircle size={32} className="text-red-300" />
              <p className="text-sm text-gray-500 font-medium max-w-[200px]">
                {fetchFailed.message || 'Failed to load cart'}
              </p>
              <button
                onClick={() => dispatch(fetchCart())}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#F7A221] text-white px-5 py-2.5 rounded-xl hover:bg-[#e6941e] transition-colors active:scale-95 cursor-pointer"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          ) : currentItems.length > 0 ? (
            <div className="divide-y divide-gray-50 scrollbar-hide">
              {currentItems.map((item, index) => {
                const loadingState = getItemLoading(item);
                const itemKey      = item._id || `${item.product?.slug || item._productSlug || item.productSlug}-${item.variantId}-${index}`;
                const slugForPath  = item.product?.slug || item._productSlug || item.productSlug;
                const path         = slugForPath ? `/products/${slugForPath}` : '#';

                const resolvedProduct = isLoggedIn
                  ? item.product
                  : (slugForPath ? guestLineProducts[slugForPath] : null);

                const rowItem =
                  !isLoggedIn && resolvedProduct && !item.product
                    ? {
                        ...item,
                        product: resolvedProduct,
                        _productSlug: slugForPath,
                        productId:
                          item.productId != null && item.productId !== ''
                            ? item.productId
                            : resolvedProduct._id,
                      }
                    : item;

                return (
                  <div key={itemKey} className="py-2">
                    <CartItem
                      item={rowItem}
                      onUpdateQty={handleUpdateQty}
                      onRemove={handleRemove}
                      isUpdating={loadingState.updating}
                      isRemoving={loadingState.removing}
                      productPath={path}
                      onClose={handleClose}
                      categories={categories}
                    />
                  </div>
                );
              })}

              {/* Guest sign-in nudge */}
              {!isLoggedIn && (
                <div className="my-6 p-5 bg-gray-50 rounded-[24px] border border-dashed border-gray-200">
                  <div className="flex items-start gap-3">
                    <Star size={16} className="text-[#F7A221] mt-1 shrink-0" />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-gray-900">
                        Sign in to sync
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                        Don't lose your cart items. Log in to sync across all your devices.
                      </p>
                      <button
                        onClick={() => { onOpenAuth?.(); handleClose(); }}
                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:underline cursor-pointer"
                      >
                        Login Now →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty cart */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag size={32} className="text-gray-200" />
              </div>
              <div>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
                  Your cart is empty
                </p>
                <p className="text-gray-400 text-xs mt-1">Add something you love</p>
              </div>
              <button
                onClick={handleClose}
                className="text-[#F7A221] font-black text-xs uppercase underline underline-offset-4 hover:text-[#e6941e] transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer — only shown when cart has items */}
        {currentItems.length > 0 && (
          <div className="border-t px-6 py-5 bg-gray-50/50 space-y-3">
            <CartDeliverySection isLoggedIn={isLoggedIn} userPincode={userPincode} />

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-tighter text-gray-700">
                  Sub Total
                </span>
                <span className="text-base font-black text-gray-900">
                  {subtotal > 0 ? fmt(subtotal) : '—'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Shipping and taxes calculated at checkout
              </p>

              <div className="space-y-2 pt-1">
                {/* Checkout — opens auth modal for guests */}
                <button
                  onClick={handleCheckoutClick}
                  className="w-full bg-black text-white py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 hover:bg-[#F7A221] transition-all active:scale-95 shadow-lg shadow-black/10 cursor-pointer"
                >
                  {isLoggedIn ? 'Proceed to Checkout' : 'Login to Checkout'}
                  <ArrowRight size={15} />
                </button>

                <button
                  onClick={handleCart}
                  className="w-full bg-white border-2 border-black text-black py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
                >
                  View Full Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;





