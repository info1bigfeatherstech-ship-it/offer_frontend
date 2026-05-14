import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  X, ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  RefreshCw, AlertCircle, Star, MapPin, CheckCircle2,
  XCircle, Loader2, Truck, Edit2,
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

import {
  checkDelivery,
  selectDelivery,
  selectCheckoutLoading,
  selectCheckoutError,
} from '../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice';

import { selectDefaultAddress } from '../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice';

import axiosInstance from '../../SERVICES/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

const logError = (context, error, info = {}) => {
  console.group(`🔴 [CartSidebar] ERROR in ${context}`);
  console.error('Error:', error);
  console.log('Info:', info);
  console.groupEnd();
};

// ─────────────────────────────────────────────────────────────────────────────
// DeliverySection
// ─────────────────────────────────────────────────────────────────────────────
const DeliverySection = ({ isLoggedIn, userPincode }) => {
  const dispatch        = useDispatch();
  const delivery        = useSelector(selectDelivery);
  const checkoutLoading = useSelector(selectCheckoutLoading);
  const checkoutError   = useSelector(selectCheckoutError);

  // pincode used for the "free-type" input when no saved address / guest
  const [pincode,           setPincode]           = useState('');
  // editing mode — logged-in user with saved address wants to check a different pincode
  const [isEditing,         setIsEditing]         = useState(false);
  const [tempPincode,       setTempPincode]       = useState('');
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false);

  // Prevent double auto-check on strict-mode double-mount
  const hasAutoChecked = useRef(false);

  // ── Auto-check saved pincode when the sidebar opens ──────────
  useEffect(() => {
    if (
      isLoggedIn &&
      userPincode &&
      /^\d{6}$/.test(userPincode) &&
      !hasAutoChecked.current
    ) {
      hasAutoChecked.current = true;
      /* eslint-disable react-hooks/set-state-in-effect -- sync local pincode with saved address before checkDelivery */
      setPincode(userPincode);
      setIsDeliveryLoading(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      dispatch(checkDelivery({ pincode: userPincode }))
        .finally(() => setIsDeliveryLoading(false));
    }
  }, [userPincode, dispatch, isLoggedIn]);

  // ── Reset auto-check flag if userPincode changes (e.g. address updated) ──
  useEffect(() => {
    hasAutoChecked.current = false;
  }, [userPincode]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleCheck = () => {
    if (!/^\d{6}$/.test(pincode)) return;
    setIsDeliveryLoading(true);
    dispatch(checkDelivery({ pincode }))
      .finally(() => setIsDeliveryLoading(false));
  };

  const handleEditClick = () => {
    setTempPincode('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempPincode('');
    // Restore auto-checked result for saved pincode (already in Redux, no re-fetch needed)
  };

  const handleTempCheck = () => {
    if (!/^\d{6}$/.test(tempPincode)) return;
    setIsDeliveryLoading(true);
    setPincode(tempPincode);
    dispatch(checkDelivery({ pincode: tempPincode }))
      .finally(() => {
        setIsDeliveryLoading(false);
        setIsEditing(false);
        setTempPincode('');
      });
  };

  const isChecking = !!(checkoutLoading?.delivery) || isDeliveryLoading;

  // "Has result" means Redux has a checked pincode that matches what we're showing
  const hasResult =
    delivery.isDeliverable !== null &&
    delivery.checkedPincode === pincode &&
    !isEditing;

  // ── View: spinner while auto-checking saved pincode ──────────
  if (isChecking && isLoggedIn && userPincode && !isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-gray-50 border border-gray-100">
        <Loader2 size={14} className="animate-spin text-[#F7A221]" />
        <span className="text-[11px] font-medium text-gray-500">Checking delivery to {userPincode}…</span>
      </div>
    );
  }

  // ── View: saved pincode delivery result (not editing) ────────
  if (isLoggedIn && userPincode && !isEditing && hasResult) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border ${
            delivery.isDeliverable
              ? 'bg-green-50 border-green-100'
              : 'bg-red-50 border-red-100'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {delivery.isDeliverable ? (
              <>
                <Truck size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-green-800">
                    Delivery to{' '}
                    <span className="text-green-600">{delivery.checkedPincode}</span>
                  </p>
                  {delivery.estimatedDays && (
                    <p className="text-[10px] text-green-600 font-bold mt-0.5">
                      Arrives in{' '}
                      <span className="font-black">{delivery.estimatedDays} business days</span>
                      {delivery.courierName ? ` via ${delivery.courierName}` : ''}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-black text-red-700">
                    Not deliverable to {delivery.checkedPincode}
                  </p>
                  <p className="text-[10px] text-red-500 font-medium mt-0.5">
                    {delivery.message || "We don't deliver to this pincode yet"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Edit / check different pincode */}
          <button
            onClick={handleEditClick}
            className="p-1.5 hover:bg-white/70 rounded-full transition-colors flex-shrink-0 cursor-pointer ml-2"
            aria-label="Change pincode"
            title="Check a different pincode"
          >
            <Edit2 size={14} className="text-gray-500" />
          </button>
        </div>

        {checkoutError?.delivery && (
          <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
            <XCircle size={11} /> {checkoutError.delivery.message}
          </p>
        )}
      </div>
    );
  }

  // ── View: input field for guests / no saved address / editing mode ──
  // When in editing mode for a logged-in user with saved address, we show
  // the temp input. For guests / no address, we show the regular input.
  const inputValue    = isEditing ? tempPincode    : pincode;
  const setInputValue = isEditing ? setTempPincode : setPincode;
  const checkHandler  = isEditing ? handleTempCheck : handleCheck;
  const checkDisabled = inputValue.length !== 6 || isChecking;

  return (
    <div className="flex flex-col gap-2">
      {/* If editing, show a small hint */}
      {isEditing && (
        <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
          <MapPin size={10} className="text-[#F7A221]" />
          Check delivery for a different pincode (saved: {userPincode})
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-2 flex-1">
          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setInputValue(v);
            }}
            onKeyDown={(e) => e.key === 'Enter' && checkHandler()}
            placeholder="Enter pincode"
            className="bg-transparent text-xs font-bold outline-none w-full placeholder-gray-400"
            maxLength={6}
            autoFocus={isEditing}
          />
        </div>

        <button
          onClick={checkHandler}
          disabled={checkDisabled}
          className="text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black disabled:opacity-40 transition-colors cursor-pointer flex-shrink-0"
        >
          {isChecking ? <Loader2 size={12} className="animate-spin" /> : 'Check'}
        </button>

        {/* Cancel only in editing mode */}
        {isEditing && (
          <button
            onClick={handleCancelEdit}
            className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
          >
            Cancel
          </button>
        )}

        {/* Inline result pill — only for guest / no-address check (not editing mode) */}
        {!isChecking && !isEditing && hasResult && (
          delivery.isDeliverable ? (
            <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
              <CheckCircle2 size={13} />
              <span className="text-[11px] font-black whitespace-nowrap">
                {delivery.estimatedDays ? `${delivery.estimatedDays}d` : '✓'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-500 flex-shrink-0">
              <XCircle size={13} />
              <span className="text-[11px] font-black whitespace-nowrap">N/A</span>
            </div>
          )
        )}
      </div>

      {checkoutError?.delivery && (
        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
          <XCircle size={11} /> {checkoutError.delivery.message}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CartItem — cart line (guest rows get `product` merged in CartSidebar after fetch)
// ─────────────────────────────────────────────────────────────────────────────
const CartItem = ({ item, onUpdateQty, onRemove, isUpdating, isRemoving, productPath, onClose }) => {
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
  const brand          = product?.brand || null;
  const variantAttrs   = item.variantAttributesSnapshot ?? matchedVariant?.attributes ?? [];
  const qty            = item.quantity || 1;
  const itemTotal      = price != null ? price * qty : null;

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

          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {brand && (
              <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
                {brand}
              </span>
            )}
            {variantAttrs.map((a) => (
              <span key={a._id || a.key} className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
                · {a.key}: {a.value}
              </span>
            ))}
          </div>

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

  // ── Lock body scroll when open ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow       = 'hidden';
      document.body.style.willChange     = 'scroll-position';
    } else {
      document.body.style.overflow       = '';
      document.body.style.willChange     = '';
    }
    return () => {
      document.body.style.overflow       = '';
      document.body.style.willChange     = '';
    };
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
          productId:   String(item.productId),
          variantId:   String(item.variantId),
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
          productId:   String(item.productId),
          variantId:   String(item.variantId),
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
            <DeliverySection isLoggedIn={isLoggedIn} userPincode={userPincode} />

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-tighter text-gray-700">
                  Subtotal
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






//fix the code navigation issue click on image and title only navigate to product page, not on qty update or remove

//  import React, { useEffect, useMemo, useState } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import {
//   X, ShoppingBag, Trash2, Plus, Minus, ArrowRight,
//   RefreshCw, AlertCircle, Star, MapPin, CheckCircle2,
//   XCircle, Loader2, Truck,
// } from 'lucide-react';
// import { Link, useNavigate } from 'react-router-dom';

// import {
//   fetchCart,
//   updateCartItem,
//   removeCartItem,
//   updateGuestCartItem,
//   removeGuestCartItem,
//   clearCartErrors,
//   selectCartItems,
//   selectCartGuestItems,
//   selectCartTotalAmount,
//   selectCartLoading,
//   selectCartError,
//   selectDisplayCartCount,
// } from '../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice';

// import {
//   checkDelivery,
//   selectDelivery,
//   selectCheckoutLoading,
//   selectCheckoutError,
// } from '../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice';

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────────
// const fmt = (n) => {
//   if (n == null) return '—';
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     maximumFractionDigits: 0,
//   }).format(n);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [CartSidebar] ERROR in ${context}`);
//   console.error('Error:', error);
//   console.log('Info:', info);
//   console.groupEnd();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // DeliverySection — shown in sidebar footer above subtotal
// //
// // Logic:
// //   - Logged-in + has saved address pincode  → auto-check + show estimated date
// //   - Logged-in + no saved address           → show compact pincode input
// //   - Guest                                  → show compact pincode input
// // ─────────────────────────────────────────────────────────────────────────────
// const DeliverySection = ({ isLoggedIn, userPincode }) => {
//   const dispatch        = useDispatch();
//   const delivery        = useSelector(selectDelivery);
//   const checkoutLoading = useSelector(selectCheckoutLoading);
//   const checkoutError   = useSelector(selectCheckoutError);

//   const [pincode, setPincode]         = useState(userPincode || '');
//   const hasAutoChecked                = React.useRef(false);

//   // Auto-check if user has a saved pincode
//   useEffect(() => {
//     if (
//       userPincode &&
//       /^\d{6}$/.test(userPincode) &&
//       !hasAutoChecked.current
//     ) {
//       hasAutoChecked.current = true;
//       setPincode(userPincode);
//       dispatch(checkDelivery({ pincode: userPincode }));
//     }
//   }, [userPincode, dispatch]);

//   const handleCheck = () => {
//     if (!/^\d{6}$/.test(pincode)) return;
//     dispatch(checkDelivery({ pincode }));
//   };

//   const isChecking = checkoutLoading?.delivery;
//   const hasResult  = delivery.isDeliverable !== null && delivery.checkedPincode === pincode;

//   return (
//     <div className="flex flex-col gap-2">

//       {/* ── If user has address: show delivery status banner ── */}
//       {isLoggedIn && userPincode && hasResult ? (
//         <div
//           className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 border ${
//             delivery.isDeliverable
//               ? 'bg-green-50 border-green-100'
//               : 'bg-red-50 border-red-100'
//           }`}
//         >
//           {delivery.isDeliverable ? (
//             <>
//               <Truck size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
//               <div>
//                 <p className="text-[11px] font-black text-green-800">
//                   Delivery to <span className="text-green-600">{delivery.checkedPincode}</span>
//                 </p>
//                 {delivery.estimatedDays && (
//                   <p className="text-[10px] text-green-600 font-bold mt-0.5">
//                     Arrives in{' '}
//                     <span className="font-black">{delivery.estimatedDays} business days</span>
//                     {delivery.courierName ? ` via ${delivery.courierName}` : ''}
//                   </p>
//                 )}
//               </div>
//             </>
//           ) : (
//             <>
//               <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
//               <div>
//                 <p className="text-[11px] font-black text-red-700">
//                   Not deliverable to {delivery.checkedPincode}
//                 </p>
//                 <p className="text-[10px] text-red-500 font-medium mt-0.5">
//                   {delivery.message || "We don't deliver to this pincode yet"}
//                 </p>
//               </div>
//             </>
//           )}
//         </div>

//       ) : (
//         /* ── No address or guest: compact pincode input ── */
//         <div className="flex items-center gap-2">
//           <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-2 flex-1">
//             <MapPin size={12} className="text-gray-400 flex-shrink-0" />
//             <input
//               type="text"
//               value={pincode}
//               onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
//               onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
//               placeholder="Enter pincode"
//               className="bg-transparent text-xs font-bold outline-none w-full placeholder-gray-400"
//               maxLength={6}
//             />
//           </div>

//           <button
//             onClick={handleCheck}
//             disabled={pincode.length !== 6 || isChecking}
//             className="text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black disabled:opacity-40 transition-colors cursor-pointer flex-shrink-0"
//           >
//             {isChecking
//               ? <Loader2 size={12} className="animate-spin" />
//               : 'Check'
//             }
//           </button>

//           {/* Inline result pill */}
//           {hasResult && (
//             delivery.isDeliverable ? (
//               <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
//                 <CheckCircle2 size={13} />
//                 <span className="text-[11px] font-black whitespace-nowrap">
//                   {delivery.estimatedDays ? `${delivery.estimatedDays}d` : '✓'}
//                 </span>
//               </div>
//             ) : (
//               <div className="flex items-center gap-1 text-red-500 flex-shrink-0">
//                 <XCircle size={13} />
//                 <span className="text-[11px] font-black whitespace-nowrap">N/A</span>
//               </div>
//             )
//           )}
//         </div>
//       )}

//       {/* API error */}
//       {checkoutError?.delivery && (
//         <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
//           <XCircle size={11} /> {checkoutError.delivery.message}
//         </p>
//       )}
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // GuestCartItem — minimal display for guest (no populated product data)
// // ─────────────────────────────────────────────────────────────────────────────
// const GuestCartItem = ({ item, onRemove, onUpdateQty, isUpdating, isRemoving }) => {
//   const productSlug = item.productSlug || item._productSlug;
//   const qty         = item.quantity || 1;
//   const displayName = productSlug?.replace(/-/g, ' ') || 'Product';
//   const price       = item.price || null;
//   const itemTotal   = price != null ? price * qty : null;

//   return (
//     <div className="flex gap-4 group py-2">
//       {/* Image placeholder */}
//       <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
//         <ShoppingBag size={24} className="text-gray-300" />
//       </div>

//       {/* Details */}
//       <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
//         <div>
//           <div className="flex justify-between items-start gap-2">
//             <h3 className="text-sm font-bold text-gray-900 line-clamp-1 uppercase tracking-tight flex-1">
//               {displayName}
//             </h3>
//             {itemTotal != null && (
//               <p className="text-sm font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
//                 {fmt(itemTotal)}
//               </p>
//             )}
//           </div>
//           <p className="text-[10px] text-gray-400 mt-1 font-medium">
//             Sign in to see full details
//           </p>
//           {price != null && (
//             <p className="mt-0.5 text-xs text-gray-400">
//               {fmt(price)} × {qty}
//             </p>
//           )}
//         </div>

//         <div className="flex items-center justify-between mt-2">
//           <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
//             <button
//               onClick={() => onUpdateQty(item, qty - 1)}
//               disabled={qty <= 1 || isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Decrease quantity"
//             >
//               <Minus size={13} />
//             </button>
//             <span className="px-3 text-xs font-bold min-w-[2rem] text-center">
//               {isUpdating ? '…' : qty}
//             </span>
//             <button
//               onClick={() => onUpdateQty(item, qty + 1)}
//               disabled={isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Increase quantity"
//             >
//               <Plus size={13} />
//             </button>
//           </div>

//           <button
//             onClick={() => onRemove(item)}
//             disabled={isRemoving}
//             className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
//             aria-label="Remove item"
//           >
//             {isRemoving
//               ? <RefreshCw size={16} className="animate-spin" />
//               : <Trash2 size={16} />
//             }
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CartItem — for logged-in users
// // ✅ API returns item.product as the populated object (NOT item.productId)
// //    item.productId is always a plain string ID from the backend
// // ─────────────────────────────────────────────────────────────────────────────
// const CartItem = ({ item, onUpdateQty, onRemove, isUpdating, isRemoving }) => {

//   // ✅ FIX: Backend populates product data under item.product
//   const product = item.product ?? null;

//   // ✅ FIX: Find matched variant from item.product.variants
//   const matchedVariant = product
//     ? (product.variants?.find(
//         (v) => String(v._id) === String(item.variantId)
//       ) ?? product.variants?.[0] ?? null)
//     : null;

//   // ✅ FIX: Use item.product.title first, fallback to item.product.name
//   const name = product
//     ? (product.title || product.name)
//     : (item._productSlug?.replace(/-/g, ' ') || 'Product');

//   // ✅ FIX: Image from matched variant inside item.product.variants
//   const image =
//     matchedVariant?.images?.[0]?.url ||
//     product?.variants?.[0]?.images?.[0]?.url ||
//     null;

//   // ✅ FIX: Price from item.price (cart-level price snapshot from backend)
//   const price =
//     item.price?.sale ??
//     item.price?.base ??
//     matchedVariant?.finalPrice ??
//     matchedVariant?.price?.sale ??
//     matchedVariant?.price?.base ??
//     null;

//   const basePrice   = item.price?.base ?? null;
//   const discountPct = item.price?.discountPercentage ?? 0;

//   // ✅ FIX: Brand from item.product.brand
//   const brand = product?.brand || null;

//   // Variant attributes for display
//   const variantAttrs = item.variantAttributesSnapshot ?? matchedVariant?.attributes ?? [];

//   const qty       = item.quantity || 1;
//   const itemTotal = price != null ? price * qty : null;

//   return (
//     <div className="flex gap-4 group py-2 cursor-pointer">
//       {/* Image */}
//       <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
//         {image ? (
//           <img
//             src={image}
//             alt={name}
//             className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
//             onError={(e) => {
//               e.target.style.display = 'none';
//               logError('CartItem img load failed', new Error('Image load failed'), { name, image });
//             }}
//           />
//         ) : (
//           <div className="h-full w-full flex items-center justify-center bg-gray-100">
//             <ShoppingBag size={24} className="text-gray-300" />
//           </div>
//         )}
//       </div>

//       {/* Details */}
//       <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
//         <div>
//           <div className="flex justify-between items-start gap-2">
//             <h3 className="text-sm font-bold text-gray-900 line-clamp-1 uppercase tracking-tight flex-1">
//               {name}
//             </h3>
//             {itemTotal != null && (
//               <p className="text-sm font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
//                 {fmt(itemTotal)}
//               </p>
//             )}
//           </div>

//           {/* Brand + variant attributes */}
//           <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
//             {brand && (
//               <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
//                 {brand}
//               </span>
//             )}
//             {variantAttrs.map((a) => (
//               <span
//                 key={a._id || a.key}
//                 className="text-[10px] text-gray-400 uppercase font-medium tracking-wider"
//               >
//                 · {a.key}: {a.value}
//               </span>
//             ))}
//           </div>

//           {/* Price line */}
//           <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
//             {price != null && (
//               <p className="text-xs text-gray-400">{fmt(price)} × {qty}</p>
//             )}
//             {basePrice && basePrice !== price && (
//               <span className="text-[10px] text-gray-400 line-through">{fmt(basePrice)}</span>
//             )}
//             {discountPct > 0 && (
//               <span className="text-[10px] text-green-500 font-semibold">{discountPct}% OFF</span>
//             )}
//           </div>
//         </div>

//         <div className="flex items-center justify-between mt-2">
//           {/* Qty controls */}
//           <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
//             <button
//               onClick={() => onUpdateQty(item, qty - 1)}
//               disabled={qty <= 1 || isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Decrease quantity"
//             >
//               <Minus size={13} />
//             </button>
//             <span className="px-3 text-xs font-bold min-w-[2rem] text-center">
//               {isUpdating ? '…' : qty}
//             </span>
//             <button
//               onClick={() => onUpdateQty(item, qty + 1)}
//               disabled={isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Increase quantity"
//             >
//               <Plus size={13} />
//             </button>
//           </div>

//           {/* Remove */}
//           <button
//             onClick={() => onRemove(item)}
//             disabled={isRemoving}
//             className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
//             aria-label="Remove item"
//           >
//             {isRemoving
//               ? <RefreshCw size={16} className="animate-spin" />
//               : <Trash2 size={16} />
//             }
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CartSidebar — Main Component
// // ─────────────────────────────────────────────────────────────────────────────
// const CartSidebar = ({ isOpen, onClose, onOpenAuth, user }) => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // ── Selectors ─────────────────────────────────────────────────────────────
//   const items       = useSelector(selectCartItems);
//   const guestItems  = useSelector(selectCartGuestItems);
//   const totalAmount = useSelector(selectCartTotalAmount);
//   const totalItems  = useSelector(selectDisplayCartCount);
//   const loading     = useSelector(selectCartLoading);
//   const error       = useSelector(selectCartError);
//   const { isLoggedIn } = useSelector((state) => state.auth);

//   // Per-item loading state
//   const [itemLoading, setItemLoading] = useState({});

//   const setItemState = (itemId, key, val) =>
//     setItemLoading((prev) => ({
//       ...prev,
//       [itemId]: { ...prev[itemId], [key]: val },
//     }));

//   // ── Which items to show ────────────────────────────────────────────────────
//   const currentItems = isLoggedIn ? items : guestItems;

//   // ── Computed subtotal for guest cart ──────────────────────────────────────
//   const subtotal = useMemo(() => {
//     if (isLoggedIn) return totalAmount;
//     return guestItems.reduce((sum, item) => {
//       const price = item.price ?? 0;
//       return sum + price * (item.quantity || 1);
//     }, 0);
//   }, [isLoggedIn, totalAmount, guestItems]);

//   // ── Extract user's saved pincode for delivery auto-check ──────────────────
//   // user.addresses is typically an array; pick the default/first address
//   const userPincode = useMemo(() => {
//     if (!isLoggedIn || !user) return '';
//     const addresses = user.addresses || [];
//     const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
//     return defaultAddr?.pincode || defaultAddr?.zip || '';
//   }, [isLoggedIn, user]);

//   // ── Fetch cart when sidebar opens (logged-in only) ─────────────────────────
//   useEffect(() => {
//     if (isOpen && isLoggedIn) {
//       dispatch(fetchCart())
//         .unwrap()
//         .then(() => console.log('✅ [CartSidebar] cart refreshed'))
//         .catch((e) => logError('fetchCart on open', e));
//     }
//   }, [isOpen, isLoggedIn, dispatch]);

//   // ── Body scroll lock ───────────────────────────────────────────────────────
//   useEffect(() => {
//     document.body.style.overflow = isOpen ? 'hidden' : 'unset';
//     return () => { document.body.style.overflow = 'unset'; };
//   }, [isOpen]);

//   // ── Clear errors when closing ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) dispatch(clearCartErrors());
//   }, [isOpen, dispatch]);

//   // ── Helper: stable item ID for loading state tracking ─────────────────────
//   // ✅ FIX: Use item.product?.slug (not item.productId which is a string)
//   const getItemId = (item) =>
//     item._id || `${item.product?.slug || item._productSlug || item.productSlug}-${item.variantId}`;

//   // ── Handlers ──────────────────────────────────────────────────────────────
//   const handleUpdateQty = async (item, newQty) => {
//     if (newQty < 1) {
//       await handleRemove(item);
//       return;
//     }
//     const itemId = getItemId(item);

//     if (isLoggedIn) {
//       setItemState(itemId, 'updating', true);
//       try {
//         // ✅ FIX: item.productId is the plain string ID from backend
//         await dispatch(updateCartItem({
//           productId:   String(item.productId),
//           variantId:   String(item.variantId),
//           quantity:    newQty,
//           productSlug: item.product?.slug || item._productSlug,
//         })).unwrap();
//       } catch (e) {
//         logError('updateCartItem', e, { newQty, itemId });
//       } finally {
//         setItemState(itemId, 'updating', false);
//       }
//     } else {
//       setItemState(itemId, 'updating', true);
//       dispatch(updateGuestCartItem({
//         productSlug: item.productSlug || item._productSlug,
//         variantId:   String(item.variantId),
//         quantity:    newQty,
//       }));
//       setTimeout(() => setItemState(itemId, 'updating', false), 100);
//     }
//   };

//   const handleRemove = async (item) => {
//     const itemId = getItemId(item);

//     if (isLoggedIn) {
//       setItemState(itemId, 'removing', true);
//       try {
//         // ✅ FIX: item.productId is the plain string ID from backend
//         await dispatch(removeCartItem({
//           productId:   String(item.productId),
//           variantId:   String(item.variantId),
//           productSlug: item.product?.slug || item._productSlug,
//         })).unwrap();
//       } catch (e) {
//         logError('removeCartItem', e, { itemId });
//       } finally {
//         setItemState(itemId, 'removing', false);
//       }
//     } else {
//       setItemState(itemId, 'removing', true);
//       dispatch(removeGuestCartItem({
//         productSlug: item.productSlug || item._productSlug,
//         variantId:   String(item.variantId),
//       }));
//       setTimeout(() => setItemState(itemId, 'removing', false), 100);
//     }
//   };

//   // ── Get loading state for an item ─────────────────────────────────────────
//   const getItemLoading = (item) => {
//     const itemId = getItemId(item);           // ✅ FIX: uses getItemId, not ad-hoc string
//     return itemLoading[itemId] || { updating: false, removing: false };
//   };

//   const isFetching  = loading.fetch;
//   const fetchFailed = error.fetch;

//   const handleCart = () => {
//     if (!isLoggedIn) {
//       onOpenAuth?.();
//     } else {
//       navigate('/account/usercart');
//     }
//     onClose();
//   };

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <>
//       {/* Backdrop */}
//       <div
//         className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-500 ${
//           isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
//         }`}
//         onClick={onClose}
//         aria-hidden="true"
//       />

//       {/* Sidebar panel */}
//       <div
//         className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[101] shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${
//           isOpen ? 'translate-x-0' : 'translate-x-full'
//         }`}
//         role="dialog"
//         aria-modal="true"
//         aria-label="Shopping cart"
//       >

//         {/* ── Header ── */}
//         <div className="px-6 py-5 border-b flex items-center justify-between bg-white sticky top-0 z-10">
//           <div className="flex items-center gap-3">
//             <ShoppingBag size={22} className="text-[#F7A221]" />
//             <h2 className="text-lg font-black uppercase tracking-tighter">
//               Your Cart
//               <span className="ml-2 text-sm font-bold text-gray-400">({totalItems})</span>
//             </h2>
//           </div>
//           <button
//             onClick={onClose}
//             aria-label="Close cart"
//             className="p-2 hover:bg-gray-100 rounded-full transition-all hover:rotate-90 duration-300"
//           >
//             <X size={22} />
//           </button>
//         </div>

//         {/* ── Error banner ── */}
//         {(fetchFailed || error.update || error.remove) && (
//           <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
//             <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
//             <div className="flex-1 min-w-0">
//               <p className="text-xs font-semibold text-red-700">
//                 {fetchFailed?.message || error.update?.message || error.remove?.message || 'Something went wrong'}
//               </p>
//             </div>
//             <button
//               onClick={() => dispatch(clearCartErrors())}
//               className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
//               aria-label="Dismiss error"
//             >
//               <X size={14} />
//             </button>
//           </div>
//         )}

//         {/* ── Body ── */}
//         <div className="flex-1 overflow-y-auto px-6 py-4">

//           {/* Loading */}
//           {isFetching && currentItems.length === 0 ? (
//             <div className="h-full flex flex-col items-center justify-center gap-3">
//               <RefreshCw size={24} className="text-gray-300 animate-spin" />
//               <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
//                 Loading your cart…
//               </p>
//             </div>

//           /* Fetch failed + empty */
//           ) : fetchFailed && currentItems.length === 0 ? (
//             <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
//               <AlertCircle size={32} className="text-red-300" />
//               <p className="text-sm text-gray-500 font-medium max-w-[200px]">
//                 {fetchFailed.message || 'Failed to load cart'}
//               </p>
//               <button
//                 onClick={() => dispatch(fetchCart())}
//                 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#F7A221] text-white px-5 py-2.5 rounded-xl hover:bg-[#e6941e] transition-colors active:scale-95"
//               >
//                 <RefreshCw size={13} /> Try Again
//               </button>
//             </div>

//           /* Items list */
//           ) : currentItems.length > 0 ? (
//             <div className="divide-y divide-gray-50 scrollbar-hide">
//               {currentItems.map((item, index) => {
//                 const loadingState = getItemLoading(item);

//                 // ✅ FIX: Use item.product?.slug for key and link path
//                 const itemKey     = item._id || `${item.product?.slug || item._productSlug || item.productSlug}-${item.variantId}-${index}`;
//                 const productSlug = item.product?.slug || item._productSlug;
//                 const path        = productSlug ? `/products/${productSlug}` : '#';

//                 // Guest: simplified component
//                 if (!isLoggedIn) {
//                   return (
//                     <div key={itemKey} className="py-2">
//                       <GuestCartItem
//                         item={item}
//                         onUpdateQty={handleUpdateQty}
//                         onRemove={handleRemove}
//                         isUpdating={loadingState.updating}
//                         isRemoving={loadingState.removing}
//                       />
//                     </div>
//                   );
//                 }

//                 // Logged-in: full CartItem with link
//                 return (
//                   <Link
//                     key={itemKey}
//                     onClick={onClose}
//                     to={path}
//                     className="block py-2"
//                   >
//                     <CartItem
//                       item={item}
//                       onUpdateQty={handleUpdateQty}
//                       onRemove={handleRemove}
//                       isUpdating={loadingState.updating}
//                       isRemoving={loadingState.removing}
//                     />
//                   </Link>
//                 );
//               })}

//               {/* Guest sign-in nudge */}
//               {!isLoggedIn && (
//                 <div className="my-6 p-5 bg-gray-50 rounded-[24px] border border-dashed border-gray-200">
//                   <div className="flex items-start gap-3">
//                     <Star size={16} className="text-[#F7A221] mt-1 shrink-0" />
//                     <div>
//                       <p className="text-[11px] font-black uppercase tracking-tight text-gray-900">
//                         Sign in to sync
//                       </p>
//                       <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
//                         Don't lose your cart items. Log in to sync across all your devices.
//                       </p>
//                       {/* ✅ UPGRADE: calls onOpenAuth() (sidebar auth modal), not navigate('/login') */}
//                       <button
//                         onClick={() => { onOpenAuth?.(); onClose(); }}
//                         className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:underline cursor-pointer"
//                       >
//                         Login Now →
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//           /* Empty state */
//           ) : (
//             <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
//               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
//                 <ShoppingBag size={32} className="text-gray-200" />
//               </div>
//               <div>
//                 <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
//                   Your cart is empty
//                 </p>
//                 <p className="text-gray-400 text-xs mt-1">Add something you love</p>
//               </div>
//               <button
//                 onClick={onClose}
//                 className="text-[#F7A221] font-black text-xs uppercase underline underline-offset-4 hover:text-[#e6941e] transition-colors"
//               >
//                 Start Shopping
//               </button>
//             </div>
//           )}
//         </div>

//         {/* ── Footer ── */}
//         {currentItems.length > 0 && (
//           <div className="border-t px-6 py-5 bg-gray-50/50 space-y-3">

//             {/* ✅ NEW: Delivery checker — auto-shows address date or pincode input */}
//             <DeliverySection isLoggedIn={isLoggedIn} userPincode={userPincode} />

//             <div className="border-t border-gray-100 pt-3 space-y-3">
//               {/* Subtotal */}
//               <div className="flex justify-between items-center">
//                 <span className="text-sm font-black uppercase tracking-tighter text-gray-700">
//                   Subtotal
//                 </span>
//                 <span className="text-base font-black text-gray-900">
//                   {subtotal > 0 ? fmt(subtotal) : '—'}
//                 </span>
//               </div>
//               <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
//                 Shipping and taxes calculated at checkout
//               </p>

//               {/* CTA buttons */}
//               <div className="space-y-2 pt-1">
//                 <Link
//                   to="/checkout"
//                   onClick={onClose}
//                   className="w-full bg-black text-white py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 hover:bg-[#F7A221] transition-all active:scale-95 shadow-lg shadow-black/10"
//                 >
//                   Proceed to Checkout
//                   <ArrowRight size={15} />
//                 </Link>
//                 {/* ✅ FIX: <button> not <Link> — avoids broken onClose prop on Link */}
//                 <button
//                   onClick={handleCart}
//                   className="w-full bg-white border-2 border-black text-black py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95"
//                 >
//                   View Full Cart
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

// export default CartSidebar;
// TRY TO MATCH THE CONTENT SAME AS WISHLISTSIDE BAR NOTHING CHANGE >>>>>>
// import React, { useEffect, useMemo } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
// import { Link } from 'react-router-dom';

// import {
//   fetchCart,
//   updateCartItem,
//   removeCartItem,
//   updateGuestCartItem,
//   removeGuestCartItem,
//   clearCartErrors,
//   selectCartItems,
//   selectCartGuestItems,
//   selectCartTotalAmount,
//   selectCartTotalItems,
//   selectCartLoading,
//   selectCartError,
//   selectDisplayCartCount,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────────
// const fmt = (n) => {
//   if (n == null) return "—";
//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(n);
// };

// const logError = (context, error, info = {}) => {
//   console.group(`🔴 [CartSidebar] ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CartItem — extracts data correctly from both logged-in and guest item shapes
// // ─────────────────────────────────────────────────────────────────────────────
// const CartItem = ({ item, isLoggedIn, onUpdateQty, onRemove, isUpdating, isRemoving }) => {

//   const isPopulated = typeof item.productId === "object" && item.productId !== null;

//   // ── Find the specific variant that was added ──────────────────────────────
//   // API: item.variantId matches item.productId.variants[]._id
//   const matchedVariant = isPopulated
//     ? (item.productId.variants?.find(
//         (v) => String(v._id) === String(item.variantId)
//       ) ?? item.productId.variants?.[0] ?? null)
//     : null;

//   // Name — title first ("Studio Light - Red Edition"), fallback to name
//   const name = isPopulated
//     ? (item.productId.title || item.productId.name)
//     : (item.name || item.productSlug || "Product");

//   // Image — from the MATCHED variant images[], not product-level
//   // API: item.productId.variants[matched].images[0].url
//   const image =
//     matchedVariant?.images?.[0]?.url ||
//     item.productId?.variants?.[0]?.images?.[0]?.url ||
//     item.image ||
//     null;

//   // Price — from priceSnapshot (backend attaches this per cart item)
//   // priceSnapshot = { base, sale }
//   const price =
//     item.priceSnapshot?.sale ??
//     item.priceSnapshot?.base ??
//     matchedVariant?.finalPrice ??
//     matchedVariant?.price?.sale ??
//     matchedVariant?.price?.base ??
//     null;

//   // Variant attributes for display (Color: Red etc)
//   const variantAttrs = item.variantAttributesSnapshot ?? matchedVariant?.attributes ?? [];

//   // Category — API returns category as plain string ID (not populated)
//   // Use brand as display label instead
//   const category = item.productId?.brand || null;

//   const qty = item.quantity || 1;
//   const itemTotal = price != null ? price * qty : null;

//   return (
//     <div className="flex gap-4 group py-2">
//       {/* Image */}
//       <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
//         {image ? (
//           <img
//             src={image}
//             alt={name}
//             className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
//             onError={(e) => {
//               e.target.style.display = "none";
//               logError("CartItem img", new Error("Image load failed"), { name, image });
//             }}
//           />
//         ) : (
//           <div className="h-full w-full flex items-center justify-center bg-gray-100">
//             <ShoppingBag size={24} className="text-gray-300" />
//           </div>
//         )}
//       </div>

//       {/* Details */}
//       <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
//         <div>
//           <div className="flex justify-between items-start gap-2">
//             <h3 className="text-sm font-bold text-gray-900 line-clamp-1 uppercase tracking-tight flex-1">
//               {name}
//             </h3>
//             {itemTotal != null && (
//               <p className="text-sm font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
//                 {fmt(itemTotal)}
//               </p>
//             )}
//           </div>
//           {/* Brand + variant attributes (Color: Red etc) */}
//           <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
//             {category && (
//               <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
//                 {category}
//               </span>
//             )}
//             {variantAttrs.map((a) => (
//               <span key={a._id || a.key} className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">
//                 · {a.key}: {a.value}
//               </span>
//             ))}
//           </div>
//           {price != null && (
//             <p className="mt-0.5 text-xs text-gray-400">
//               {fmt(price)} × {qty}
//             </p>
//           )}
//         </div>

//         <div className="flex items-center justify-between mt-2">
//           {/* Qty controls */}
//           <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
//             <button
//               onClick={() => onUpdateQty(item, qty - 1)}
//               disabled={qty <= 1 || isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Decrease quantity"
//             >
//               <Minus size={13} />
//             </button>
//             <span className="px-3 text-xs font-bold min-w-[2rem] text-center">
//               {isUpdating ? "…" : qty}
//             </span>
//             <button
//               onClick={() => onUpdateQty(item, qty + 1)}
//               disabled={isUpdating}
//               className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
//               aria-label="Increase quantity"
//             >
//               <Plus size={13} />
//             </button>
//           </div>

//           {/* Remove */}
//           <button
//             onClick={() => onRemove(item)}
//             disabled={isRemoving}
//             className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
//             aria-label="Remove item"
//           >
//             {isRemoving ? (
//               <RefreshCw size={16} className="animate-spin" />
//             ) : (
//               <Trash2 size={16} />
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // CartSidebar
// // ─────────────────────────────────────────────────────────────────────────────
// const CartSidebar = ({ isOpen, onClose }) => {
//   const dispatch = useDispatch();

//   // ── Selectors ─────────────────────────────────────────────────────────────
//   const items       = useSelector(selectCartItems);
//   const guestItems  = useSelector(selectCartGuestItems);
//   const totalAmount = useSelector(selectCartTotalAmount);
//   const totalItems  = useSelector(selectDisplayCartCount);
//   const loading     = useSelector(selectCartLoading);
//   const error       = useSelector(selectCartError);
//   const { isLoggedIn } = useSelector((state) => state.auth);

//   // ── Which items to show ────────────────────────────────────────────────────
//   const currentItems = isLoggedIn ? items : guestItems;

//   // ── Computed subtotal for guest cart (slice doesn't compute it) ────────────
//   const subtotal = useMemo(() => {
//     if (isLoggedIn) return totalAmount;
//     // Guest items may have price attached when you call addGuestCartItem
//     return guestItems.reduce((sum, item) => {
//       const price = item.price ?? 0;
//       return sum + price * (item.quantity || 1);
//     }, 0);
//   }, [isLoggedIn, totalAmount, guestItems]);

//   // ── Fetch cart when sidebar opens (logged in only) ─────────────────────────
//   useEffect(() => {
//     if (isOpen && isLoggedIn) {
//       console.log("🛒 [CartSidebar] opened — refreshing cart from DB");
//       dispatch(fetchCart())
//         .unwrap()
//         .then(() => console.log("✅ [CartSidebar] cart refreshed"))
//         .catch((e) => logError("fetchCart on open", e));
//     }
//   }, [isOpen, isLoggedIn, dispatch]);

//   // ── Body scroll lock ───────────────────────────────────────────────────────
//   useEffect(() => {
//     document.body.style.overflow = isOpen ? "hidden" : "unset";
//     return () => { document.body.style.overflow = "unset"; };
//   }, [isOpen]);

//   // ── Clear errors when closing ──────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) dispatch(clearCartErrors());
//   }, [isOpen, dispatch]);

//   // ── Handlers ──────────────────────────────────────────────────────────────
//   const handleUpdateQty = (item, newQty) => {
//     if (newQty < 1) return;
//     if (isLoggedIn) {
//       dispatch(updateCartItem({
//         productId: item.productId?._id || item.productId,
//         variantId: item.variantId,
//         quantity:  newQty,
//         productSlug: item._productSlug,
//       }))
//         .unwrap()
//         .catch((e) => logError("updateCartItem", e, { newQty }));
//     } else {
//       dispatch(updateGuestCartItem({
//         productSlug: item.productSlug,
//         variantId:   item.variantId,
//         quantity:    newQty,
//       }));
//     }
//   };

//   const handleRemove = (item) => {
//     if (isLoggedIn) {
//       dispatch(removeCartItem({
//         productId:   item.productId?._id || item.productId,
//         variantId:   item.variantId,
//         productSlug: item._productSlug,
//       }))
//         .unwrap()
//         .catch((e) => logError("removeCartItem", e));
//     } else {
//       dispatch(removeGuestCartItem({
//         productSlug: item.productSlug,
//         variantId:   item.variantId,
//       }));
//     }
//   };

//   const isFetching  = loading.fetch;
//   const isUpdating  = loading.update;
//   const isRemoving  = loading.remove;
//   const fetchFailed = error.fetch;

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <>
//       {/* Backdrop */}
//       <div
//         className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-500 ${
//           isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//         }`}
//         onClick={onClose}
//         aria-hidden="true"
//       />

//       {/* Sidebar panel */}
//       <div
//         className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[101] shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${
//           isOpen ? "translate-x-0" : "translate-x-full"
//         }`}
//         role="dialog"
//         aria-modal="true"
//         aria-label="Shopping cart"
//       >

//         {/* ── Header ── */}
//         <div className="px-6 py-5 border-b flex items-center justify-between bg-white sticky top-0 z-10">
//           <div className="flex items-center gap-3">
//             <ShoppingBag size={22} className="text-[#F7A221]" />
//             <h2 className="text-lg font-black uppercase tracking-tighter">
//               Your Cart
//               <span className="ml-2 text-sm font-bold text-gray-400">
//                 ({totalItems})
//               </span>
//             </h2>
//           </div>
//           <button
//             onClick={onClose}
//             aria-label="Close cart"
//             className="p-2 hover:bg-gray-100 rounded-full transition-all hover:rotate-90 duration-300"
//           >
//             <X size={22} />
//           </button>
//         </div>

//         {/* ── Error banner ── */}
//         {(fetchFailed || error.update || error.remove) && (
//           <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
//             <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
//             <div className="flex-1 min-w-0">
//               <p className="text-xs font-semibold text-red-700">
//                 {fetchFailed?.message || error.update?.message || error.remove?.message || "Something went wrong"}
//               </p>
//             </div>
//             <button
//               onClick={() => dispatch(clearCartErrors())}
//               className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
//             >
//               <X size={14} />
//             </button>
//           </div>
//         )}

//         {/* ── Body ── */}
//         <div className="flex-1 overflow-y-auto px-6 py-4">

//           {/* Loading state */}
//           {isFetching && currentItems.length === 0 ? (
//             <div className="h-full flex flex-col items-center justify-center gap-3">
//               <RefreshCw size={24} className="text-gray-300 animate-spin" />
//               <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
//                 Loading your cart…
//               </p>
//             </div>

//           /* Fetch failed + empty */
//           ) : fetchFailed && currentItems.length === 0 ? (
//             <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
//               <AlertCircle size={32} className="text-red-300" />
//               <p className="text-sm text-gray-500 font-medium">
//                 {fetchFailed.message || "Failed to load cart"}
//               </p>
//               <button
//                 onClick={() => dispatch(fetchCart())}
//                 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#F7A221] text-white px-5 py-2.5 rounded-xl hover:bg-[#e6941e] transition-colors active:scale-95"
//               >
//                 <RefreshCw size={13} /> Try Again
//               </button>
//             </div>

//           /* Items list */
//           ) : currentItems.length > 0 ? (
//             <div className="divide-y divide-gray-50">
//               {currentItems.map((item, index) => (
//                 <div key={item._id || `${item.productSlug || item._productSlug}-${item.variantId}-${index}`} className="py-2">
//                   <CartItem
//                     item={item}
//                     isLoggedIn={isLoggedIn}
//                     onUpdateQty={handleUpdateQty}
//                     onRemove={handleRemove}
//                     isUpdating={isUpdating}
//                     isRemoving={isRemoving}
//                   />
//                 </div>
//               ))}
//             </div>

//           /* Empty state */
//           ) : (
//             <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
//               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
//                 <ShoppingBag size={32} className="text-gray-200" />
//               </div>
//               <div>
//                 <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
//                   Your cart is empty
//                 </p>
//                 <p className="text-gray-400 text-xs mt-1">
//                   Add something you love
//                 </p>
//               </div>
//               <button
//                 onClick={onClose}
//                 className="text-[#F7A221] font-black text-xs uppercase underline underline-offset-4 hover:text-[#e6941e] transition-colors"
//               >
//                 Start Shopping
//               </button>
//             </div>
//           )}
//         </div>

//         {/* ── Footer ── */}
//         {currentItems.length > 0 && (
//           <div className="border-t px-6 py-5 bg-gray-50/50 space-y-4">
//             {/* Subtotal */}
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-black uppercase tracking-tighter text-gray-700">
//                 Subtotal
//               </span>
//               <span className="text-base font-black text-gray-900">
//                 {subtotal > 0 ? fmt(subtotal) : "—"}
//               </span>
//             </div>
//             <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
//               Shipping and taxes calculated at checkout
//             </p>

//             {/* CTA buttons */}
//             <div className="space-y-2 pt-1">
//               <Link
//                 to="/checkout"
//                 onClick={onClose}
//                 className="w-full bg-black text-white py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 hover:bg-[#F7A221] transition-all active:scale-95 shadow-lg shadow-black/10"
//               >
//                 Proceed to Checkout
//                 <ArrowRight size={15} />
//               </Link>
//               <Link
//                 to="/cart"
//                 onClick={onClose}
//                 className="w-full bg-white border-2 border-black text-black py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95"
//               >
//                 View Full Cart
//               </Link>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

// export default CartSidebar;