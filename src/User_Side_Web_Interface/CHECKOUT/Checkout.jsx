import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Loader2, MapPin, CreditCard, Truck, CheckCircle2, Check,
  Package, AlertCircle, ArrowLeft, ShoppingBag,
  Banknote, X, Clock, ChevronDown, ChevronUp, Gift,
  Minus, Plus, Trash2,
} from "lucide-react";

// Redux � checkout
import {
  fetchCheckoutQuote,
  fetchCheckoutSettings,
  fetchAvailableCoupons,
  confirmCheckoutQuote,
  placeOrder,
  setSelectedAddress,
  setPaymentMethod,
  setPaymentPlan,
  setBalanceCollection,
  setCouponCode,
  resetCheckout,
  resetQuote,
  clearCheckoutErrors,
  validateCouponCode,
  selectQuote,
  selectQuoteId,
  selectPlacedOrder,
  selectSelectedAddressId,
  selectPaymentMethod,
  selectPaymentPlan,
  selectBalanceCollection,
  selectCouponCode,
  selectAvailableCoupons,
  selectCouponValidation,
  selectCheckoutLoading,
  selectCheckoutError,
  selectCheckoutPolicy,
  selectCheckoutPolicyLoading,
  getRazorpayKey,
  selectRazorpayKey,
  selectRazorpayKeyLoading,
  selectRazorpayKeyError,
  verifyRazorpayPayment,
  selectPaymentVerification,
  resetPaymentVerification,
  abandonOnlineCheckout,
  clearPlacedOrderForDismissedGateway,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";

// Redux � address
import {
  selectDefaultAddress, selectOtherAddresses,
  addAddress, selectAddressLoading, selectAddressError,
  clearAddressErrors,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";

// Redux � cart
import {
  selectCartItems, selectDisplayCartCount,
  updateCartItem, removeCartItem,
  fetchCart,
} from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// Redux � auth
import { selectUser } from "../../components/REDUX_FEATURES/REDUX_SLICES/authSlice";
import axiosInstance from "../../SERVICES/axiosInstance";

// Components
import AddressSelector from "./AddressSelector/AddressSelector";
import PriceBreakdown from "./PriceBreakdown/PriceBreakdown";
import {
  computeCheckoutPsychologyPricing,
  computeCheckoutTotalSavings,
  computeCodVsOnlineSavings,
  getCartLineUnitPay,
  getCartLineUnitMrp,
} from "../../utils/checkoutPriceDisplay";
import { formatInr as fmt } from "../../utils/formatInr";
import SavingsBanner from "../../components/Common/SavingsBanner";
import { AddressFormModal } from "../User_Dash_Segment/UserSubPages/UserAddress";
import RazorpayCheckout, {
  PaymentErrorModal, PaymentLoadingModal,
} from "./RazorpayCheckout/RazorpayCheckout";

// --- PAYMENT STATE MACHINE ----------------------------------------------------
// idle        ? before Razorpay opens
// initiated   ? Razorpay modal open
// success     ? payment captured (before backend verification)
// failed      ? payment.failed event
// cancelled   ? user closed modal without paying
// verified    ? backend verification complete
const PAYMENT_STATE = {
  IDLE: "idle",
  INITIATED: "initiated",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
  VERIFIED: "verified",
};

/** Same figure as COD nudge / �Get extra discount� � full online vs COD handling. */
const createCheckoutAttemptKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const isQuoteRefreshError = (errorCode) =>
  errorCode === "QUOTE_STALE" || errorCode === "QUOTE_EXPIRED";

/** Aligns with backend checkout policy (1�100 when partial is enabled). */
const getServerPartialPercent = (policy) => {
  if (!policy?.partialPaymentEnabled) return null;
  const p = Number(policy.partialPaymentPercent);
  if (!Number.isFinite(p)) return 25;
  const rounded = Math.round(p * 100) / 100;
  return Math.min(100, Math.max(1, rounded));
};

const formatPercentLabel = (n) => {
  if (n == null || !Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2).replace(/\.?0+$/, "");
  return s;
};

// -----------------------------------------------------------------------------
// Order Success Screen
// -----------------------------------------------------------------------------
const OrderSuccess = ({ order, onViewOrders }) => {
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setProcessing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5"
        style={{ background: "#FFFBF4" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "#FEF3E2" }}>
            <Loader2 size={36} className="animate-spin" style={{ color: "#F7A221" }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "#111" }}>Processing Order</h1>
            <p className="text-sm font-medium mt-1.5" style={{ color: "#6b7280" }}>
              Please wait while we confirm your order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "#FFFBF4" }}>
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "#F0FFF4" }}>
          <CheckCircle2 size={40} style={{ color: "#15803D" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#111" }}>Order Placed!</h1>
          <p className="text-sm font-medium mt-1.5" style={{ color: "#6b7280" }}>
            {order.paymentMethod === "cod"
              ? "We'll process your order shortly."
              : "Payment confirmed. Order is on its way!"}
          </p>
        </div>
        <div className="rounded-2xl p-5 text-left space-y-3"
          style={{ background: "#fff", border: "1px solid #f0e8d8" }}>
          {[
            { label: "Order ID", value: order.orderId },
            {
              label: order.paymentMethod === "cod" ? "Total" : "Paid",
              value: fmt(order.totalAmount),
            },
            {
              label: "Payment",
              value: order.paymentMethod === "cod" ? "Cash on Delivery" : "Online",
            },
            { label: "Status", value: "Confirmed", badge: true },
          ].map(({ label, value, badge }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest"
                style={{ color: "#9ca3af" }}>{label}</span>
              {badge
                ? <span className="text-xs font-black px-3 py-1 rounded-full"
                    style={{ background: "#F0FFF4", color: "#15803D" }}>{value}</span>
                : <span className="text-sm font-black" style={{ color: "#111" }}>{value}</span>
              }
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onViewOrders}
            className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "#111", color: "#F7A221", border: "none" }}>
            View Orders
          </button>
          <a href="/"
            className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center transition-all active:scale-95"
            style={{ border: "2px solid #f0e8d8", color: "#6b7280" }}>
            Shop More
          </a>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Step Indicator
// -----------------------------------------------------------------------------
const StepIndicator = ({ step, onGoToStep }) => (
  <div className="flex items-center justify-center px-4 py-3"
    style={{ background: "#fff", borderBottom: "1px solid #f0e8d8" }}>
    <div className="flex items-center" style={{ gap: 0, width: "100%", maxWidth: 360 }}>
      {[
        { n: 1, label: "Address" },
        { n: 2, label: "Summary" },
        { n: 3, label: "Payment" },
      ].map(({ n, label }, idx) => {
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            {n < step ? (
              <button
                type="button"
                onClick={() => onGoToStep?.(n)}
                className="flex flex-col items-center cursor-pointer transition-opacity hover:opacity-80"
                style={{ minWidth: 68, background: "none", border: "none", padding: 0 }}
                aria-label={`Go back to ${label}`}
              >
                <div className="flex items-center justify-center font-black transition-all"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", fontSize: 12,
                    background: done ? "#111" : active ? "#F7A221" : "#f0e8d8",
                    color: done ? "#F7A221" : active ? "#111" : "#bbb",
                  }}>
                  {done ? <Check size={14} strokeWidth={3} aria-hidden /> : n}
                </div>
                <span className="font-black uppercase mt-1 text-center"
                  style={{
                    fontSize: 9, letterSpacing: "0.05em",
                    color: done || active ? "#111" : "#9ca3af",
                  }}>
                  {label}
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-center" style={{ minWidth: 68 }}>
                <div className="flex items-center justify-center font-black transition-all"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", fontSize: 12,
                    background: done ? "#111" : active ? "#F7A221" : "#f0e8d8",
                    color: done ? "#F7A221" : active ? "#111" : "#bbb",
                  }}>
                  {done ? <Check size={14} strokeWidth={3} aria-hidden /> : n}
                </div>
                <span className="font-black uppercase mt-1 text-center"
                  style={{
                    fontSize: 9, letterSpacing: "0.05em",
                    color: done || active ? "#111" : "#9ca3af",
                  }}>
                  {label}
                </span>
              </div>
            )}
            {idx < 2 && (
              <div className="flex-1 transition-all" style={{
                height: 2, marginBottom: 18,
                background: step > n ? "#F7A221" : "#f0e8d8",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const CheckoutStepBackButton = ({ onClick, children = "Back" }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
    style={{
      background: "#fff",
      color: "#111",
      borderRadius: 14,
      padding: "13px 0",
      fontSize: 12,
      letterSpacing: "0.06em",
      border: "2px solid #f0e8d8",
    }}
  >
    <ArrowLeft size={14} />
    {children}
  </button>
);

/** Payment step only � label + payable total. */
const CartSummaryCompact = ({ quote }) => (
  <div className="flex items-center justify-between px-4 py-3.5"
    style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 18 }}>
    <div className="flex items-center gap-2">
      <ShoppingBag size={15} style={{ color: "#F7A221" }} />
      <span className="font-black text-sm" style={{ color: "#111" }}>
        Cart Summary
      </span>
    </div>
    <span className="font-black" style={{ fontSize: 14, color: "#111" }}>
      {fmt(quote?.amountPayable ?? 0)}
    </span>
  </div>
);

const PrepaidSavingsPopup = ({ savingsAmount, onSwitchToPrepaid, onContinueCod, onClose }) => {
  const totalSavings = Math.max(0, Number(savingsAmount) || 0);
  if (totalSavings <= 0) return null;

  return (
    <>
      <style>{`
        @keyframes prepaid-overlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes prepaid-card-pop {
          0% { opacity: 0; transform: translateY(20px) scale(0.94); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes prepaid-gift-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes prepaid-sparkle {
          0% { opacity: 0; transform: translateY(6px) scale(0.7); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-8px) scale(1.1); }
        }
        .prepaid-popup-primary:hover {
          filter: brightness(0.96);
          box-shadow: 0 8px 24px rgba(247, 162, 33, 0.45);
        }
        .prepaid-popup-primary:active {
          transform: scale(0.98);
        }
        .prepaid-popup-cod:hover {
          background: #d6d3d1 !important;
        }
        .prepaid-popup-cod:active {
          transform: scale(0.98);
        }
        /* Fluid title: scales on all viewports; EXTRA uses em so it stays proportionally larger */
        .prepaid-savings-title {
          font-size: clamp(0.875rem, 2.2vw + 0.55rem, 1.375rem);
          line-height: 1.28;
          color: #111;
        }
        .prepaid-savings-extra {
          color: #dc2626;
          font-size: 1.08em;
          font-weight: 800;
          line-height: 1.15;
        }
        .prepaid-savings-card {
          width: min(100%, 28rem);
          max-width: min(100%, calc(100vw - 1.25rem));
        }
        .prepaid-popup-primary {
          border: 0 !important;
          outline: none;
          box-shadow: none;
        }
        .prepaid-popup-primary:focus-visible {
          outline: 2px solid #d97706;
          outline-offset: 3px;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 min-[380px]:p-4 sm:p-5"
        style={{
          background: "rgba(17, 24, 39, 0.55)",
          animation: "prepaid-overlay-fade 220ms ease-out",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prepaid-savings-title"
        aria-label="Pay online discount offer"
        onClick={onClose}
      >
        <div
          className="prepaid-savings-card relative rounded-2xl sm:rounded-3xl p-4 min-[380px]:p-5 sm:p-6 overflow-hidden mx-auto min-w-0"
          style={{
            background: "#fff",
            border: "1px solid #f0e8d8",
            boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
            animation: "prepaid-card-pop 320ms cubic-bezier(.22,1,.36,1)",
            maxHeight: "min(90vh, 520px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pay online discount popup"
            className="absolute right-3 top-3 rounded-full p-1.5 cursor-pointer z-10 transition-colors hover:bg-gray-100"
            style={{ border: "1px solid #f0e8d8", background: "#fff", color: "#6b7280" }}
          >
            <X size={14} />
          </button>

          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 8,
              right: 22,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#F7A221",
              animation: "prepaid-sparkle 1.4s ease-in-out infinite",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 22,
              right: 40,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#34D399",
              animation: "prepaid-sparkle 1.8s ease-in-out infinite 220ms",
            }}
          />

          <div className="flex items-start gap-2.5 sm:gap-3 pr-9 sm:pr-10">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: "clamp(2.25rem, 5vw, 2.5rem)",
                height: "clamp(2.25rem, 5vw, 2.5rem)",
                borderRadius: 12,
                background: "#FEF3E2",
                animation: "prepaid-gift-bounce 1.6s ease-in-out infinite",
              }}
            >
              <Gift
                className="w-[clamp(1rem,2.8vw,1.125rem)] h-[clamp(1rem,2.8vw,1.125rem)]"
                style={{ color: "#F59E0B" }}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p
                className="font-black uppercase"
                style={{
                  fontSize: "clamp(0.5rem, 1.1vw + 0.45rem, 0.5625rem)",
                  color: "#111",
                  letterSpacing: "0.06em",
                }}
              >
                Payment choice
              </p>
              <h3 id="prepaid-savings-title" className="prepaid-savings-title font-black mt-1 break-words">
                <span className="text-[#111]">Get </span>
                <span className="prepaid-savings-extra">EXTRA {fmt(totalSavings)} Discount</span>
                <span className="text-[#111]"> On Pay Online</span>
              </h3>
            </div>
          </div>

          <div className="mt-4 min-[380px]:mt-5 sm:mt-6 flex flex-col gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onSwitchToPrepaid}
              className="prepaid-popup-primary w-full py-3 min-[380px]:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-transform duration-150 text-[clamp(0.7rem,1.5vw+0.45rem,0.95rem)] sm:text-[clamp(0.75rem,1.2vw+0.5rem,1rem)]"
              style={{
                color: "#111",
                background: "#F7A221",
                cursor: "pointer",
              }}
            >
              Pay online
            </button>
            <button
              type="button"
              onClick={onContinueCod}
              className="prepaid-popup-cod w-full py-3 min-[380px]:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-wide transition-transform duration-150 text-[clamp(0.7rem,1.5vw+0.45rem,0.95rem)] sm:text-[clamp(0.75rem,1.2vw+0.5rem,1rem)]"
              style={{
                color: "#111",
                background: "#e7e5e4",
                border: "1px solid #d6d3d1",
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              Cash On Delivery
            </button>
          </div>
        </div>
      </div>
    </>
  );
};


// -----------------------------------------------------------------------------
// Order Summary Card (collapsible) � with real cart controls
// -----------------------------------------------------------------------------
const OrderSummaryCard = ({
  cartItems,
  cartCount,
  quote,
  dispatch,
  onCartMutationSuccess,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [updatingId, setUpdatingId] = useState(null);

  const subtotal = quote?.itemsSubtotal ?? 0;
  const discount = quote?.promotionDiscount ?? 0;
  const delivery = quote?.deliveryCharges ?? 0;
  const gst = quote?.taxes ?? 0;
  const total = quote?.amountPayable ?? subtotal;

  const psych = useMemo(
    () => computeCheckoutPsychologyPricing(cartItems, quote),
    [cartItems, quote]
  );

  const totalSavings = useMemo(
    () => computeCheckoutTotalSavings(psych, quote),
    [psych, quote]
  );

  const handleUpdateQty = useCallback(async (item, delta) => {
    const productId = String(item.productId?._id || item.productId);
    const variantId = String(item.variantId);
    const newQty = item.quantity + delta;
    const key = `${productId}-${variantId}`;

    if (newQty < 1) return; // use remove for qty = 0
    setUpdatingId(key);
    try {
      await dispatch(updateCartItem({
        productId,
        variantId,
        quantity: newQty,
        productSlug: item._productSlug,
      })).unwrap();
      await onCartMutationSuccess?.();
    } catch (e) {
      toast.error(e?.message || "Could not update quantity", { theme: "dark" });
    } finally {
      setUpdatingId(null);
    }
  }, [dispatch, onCartMutationSuccess]);

  const handleRemove = useCallback(async (item) => {
    const productId = String(item.productId?._id || item.productId);
    const variantId = String(item.variantId);
    const key = `${productId}-${variantId}`;
    setUpdatingId(key);
    try {
      await dispatch(removeCartItem({
        productId,
        variantId,
        productSlug: item._productSlug,
      })).unwrap();
      await onCartMutationSuccess?.();
    } catch (e) {
      toast.error(e?.message || "Could not remove item", { theme: "dark" });
    } finally {
      setUpdatingId(null);
    }
  }, [dispatch, onCartMutationSuccess]);

  return (
    <div style={{
      background: "#fff", border: "1px solid #f0e8d8",
      borderRadius: 18, overflow: "hidden",
    }}>
      {/* Toggle header � always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
        style={{ background: "transparent", border: "none" }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBag size={15} style={{ color: "#F7A221" }} />
          <span className="font-black text-sm" style={{ color: "#111" }}>
            Cart Summary
          </span>
          {/* <span className="font-black px-2 py-0.5 rounded-full"
            style={{ fontSize: 11, background: "#F7A221", color: "#111" }}>
            {cartCount}
          </span> */}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black" style={{ fontSize: 14, color: "#111" }}>
          {cartCount} item{cartCount !== 1 ? "s" : ""}
          </span>
          {open
            ? <ChevronUp size={16} style={{ color: "#9ca3af" }} />
            : <ChevronDown size={16} style={{ color: "#9ca3af" }} />
          }
        </div>
      </button>

      {/* Expandable body */}
      <div style={{
        maxHeight: open ? "70vh" : 0,
        overflow: "hidden",
        transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ borderTop: "1px solid #f0e8d8", overflowY: "auto", maxHeight: "60vh" }}>

          {/* Items */}
          <div className="px-4 py-3 space-y-3">
            {cartItems.map((item) => {
              const productId = String(item.productId?._id || item.productId);
              const variantId = String(item.variantId);
              const key = `${productId}-${variantId}`;
              const isUpdating = updatingId === key;

              const variant = item.product?.variants?.find(
                v => String(v._id) === variantId
              ) ?? item.product?.variants?.[0];
              const image = variant?.images?.[0]?.url || null;
              const name = item.product?.title || item.product?.name || "Product";
              const sizeName = variant?.size || variant?.name || "";
              const unitPay = getCartLineUnitPay(item);
              const unitMrp = getCartLineUnitMrp(item);
              const qty = item.quantity || 1;
              const linePay = unitPay * qty;
              const lineMrp = unitMrp * qty;
              const hasDiscount = unitMrp > unitPay + 0.01;

              return (
                <div key={key} className="flex items-center gap-3">
                  {/* Image */}
                  <div className="flex-shrink-0 overflow-hidden"
                    style={{ width: 56, height: 56, borderRadius: 10, background: "#f5f5f5" }}>
                    {image
                      ? <img src={image} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} style={{ color: "#d1d5db" }} />
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate" style={{ fontSize: 13, color: "#111" }}>
                      {name}
                    </p>
                    {sizeName && (
                      <p style={{ fontSize: 11, color: "#9ca3af" }}>{sizeName}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="font-black" style={{ fontSize: 13, color: "#111" }}>
                        {fmt(linePay)}
                      </p>
                      {hasDiscount && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            textDecoration: "line-through",
                          }}
                        >
                          {fmt(lineMrp)}
                        </span>
                      )}
                      {qty > 1 && (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          ({fmt(unitPay)}  {qty})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={isUpdating}
                      className="flex items-center justify-center cursor-pointer transition-all active:scale-95"
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: "#fff5f5", border: "none",
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                    >
                      {isUpdating
                        ? <Loader2 size={10} className="animate-spin" style={{ color: "#ef4444" }} />
                        : <Trash2 size={11} style={{ color: "#ef4444" }} />
                      }
                    </button>

                    {/* Qty stepper */}
                    <div className="flex items-center gap-1"
                      style={{
                        border: "1px solid #f0e8d8", borderRadius: 8,
                        background: "#fff", padding: "2px",
                      }}>
                      <button
                        onClick={() => handleUpdateQty(item, -1)}
                        disabled={isUpdating || item.quantity <= 1}
                        className="flex items-center justify-center cursor-pointer transition-all active:scale-95"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: item.quantity <= 1 ? "#f9f9f9" : "#f0e8d8",
                          border: "none",
                          opacity: isUpdating || item.quantity <= 1 ? 0.4 : 1,
                          cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        <Minus size={10} style={{ color: "#111" }} />
                      </button>

                      <span className="font-black text-center"
                        style={{ fontSize: 12, color: "#111", minWidth: 20, textAlign: "center" }}>
                        {isUpdating ? "" : item.quantity}
                      </span>

                      <button
                        onClick={() => handleUpdateQty(item, 1)}
                        disabled={isUpdating}
                        className="flex items-center justify-center cursor-pointer transition-all active:scale-95"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: "#F7A221", border: "none",
                          opacity: isUpdating ? 0.4 : 1,
                        }}
                      >
                        <Plus size={10} style={{ color: "#111" }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price breakdown � SubTotal, base?sale discount, coupon, shipping, tax (totals from quote) */}
          <div className="px-4 pt-2 space-y-2"
            style={{ borderTop: "1px solid #f0e8d8" }}>
            <p className="font-black text-xs mb-1" style={{ color: "#111" }}>
              Price Details
            </p>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, color: "#6b7280" }}>Total Cart Value</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {fmt(psych.mrpTotal)}
              </span>
            </div>
            {psych.catalogDiscount > 0 ? (
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, color: "#6b7280" }}>Discount</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                  - {fmt(psych.catalogDiscount)}
                </span>
              </div>
            ) : null}
            {discount > 0 ? (
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  Additional discount
                  {quote?.couponApplied ? ` (${quote.couponApplied})` : ""}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                  - {fmt(discount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, color: "#6b7280" }}>Shipping</span>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: delivery === 0 ? "#15803D" : "#374151",
              }}>{delivery === 0 ? "FREE" : fmt(delivery)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, color: "#6b7280" }}>Other Taxes</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{fmt(gst)}</span>
            </div>

            <div className="flex justify-between items-center pt-2"
              style={{ borderTop: "1px dashed #e5e7eb" }}>
              <span className="font-black" style={{ fontSize: 14, color: "#111" }}>You Pay</span>
              <span className="font-black" style={{ fontSize: 14, color: "#111" }}>
                {fmt(total)}
              </span>
            </div>

          </div>

          <SavingsBanner amount={totalSavings} />
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Checkout � Main Component
// -----------------------------------------------------------------------------
const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // -- Redux selectors --------------------------------------------------------
  const quote = useSelector(selectQuote);
  const quoteId = useSelector(selectQuoteId);
  const placedOrder = useSelector(selectPlacedOrder);
  const selectedAddressId = useSelector(selectSelectedAddressId);
  const paymentMethod = useSelector(selectPaymentMethod);
  const paymentPlan = useSelector(selectPaymentPlan);
  const balanceCollection = useSelector(selectBalanceCollection);
  const couponCode = useSelector(selectCouponCode);
  const availableCoupons = useSelector(selectAvailableCoupons);
  const couponValidation = useSelector(selectCouponValidation);
  const loading = useSelector(selectCheckoutLoading);
  const error = useSelector(selectCheckoutError);
  const razorpayKey = useSelector(selectRazorpayKey);
  const razorpayKeyLoading = useSelector(selectRazorpayKeyLoading);
  const razorpayKeyError = useSelector(selectRazorpayKeyError);
  const paymentVerification = useSelector(selectPaymentVerification);
  const checkoutPolicy = useSelector(selectCheckoutPolicy);
  const checkoutPolicyLoading = useSelector(selectCheckoutPolicyLoading);
  const defaultAddr = useSelector(selectDefaultAddress);
  const otherAddrs = useSelector(selectOtherAddresses);
  const addressLoading = useSelector(selectAddressLoading);
  const addressError = useSelector(selectAddressError);
  const cartItems = useSelector(selectCartItems);
  const cartCount = useSelector(selectDisplayCartCount);
  const user = useSelector(selectUser);

  // -- Local state ------------------------------------------------------------
  const [step, setStep] = useState(1);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [showCouponsList, setShowCouponsList] = useState(false);
  const [isCouponManuallyApplied, setIsCouponManuallyApplied] = useState(false);
  const [showPrepaidSavingsPopup, setShowPrepaidSavingsPopup] = useState(false);
  const [codVsOnlineSavings, setCodVsOnlineSavings] = useState(0);
  // Payment state machine
  const [razorpayPaymentState, setRazorpayPaymentState] = useState(PAYMENT_STATE.IDLE);

  // Place order single-fire guard
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const placeOrderInFlight = useRef(false);
  const checkoutAttemptKeyRef = useRef(null);
  const shouldEvaluateCodNudgeRef = useRef(false);
  const onlineFullPayableRef = useRef(null);
  const codSavingsPrefetchKeyRef = useRef(null);
  const gatewayDismissRecoveryInFlight = useRef(false);
  const gatewayDismissHandlerRef = useRef(async () => {});

  // Derived
  const allAddresses = [...(defaultAddr ? [defaultAddr] : []), ...otherAddrs];
  const selectedAddress = allAddresses.find(a => a._id === selectedAddressId);

  const policyPartialPercent = getServerPartialPercent(checkoutPolicy);
  const partialPlanEnabled = checkoutPolicy?.partialPaymentEnabled === true;
  const showCodOption = checkoutPolicy?.codEnabled !== false;

  const checkoutMode =
    paymentMethod === "cod"
      ? "cod"
      : paymentPlan === "advance" && balanceCollection === "cod"
        ? "advance_cod"
        : "online_full";

  const getPartialPayNowAmount = () => {
    const total = quote?.amountPayable ?? 0;
    if (paymentPlan === "full") return total;
    const pct = policyPartialPercent;
    if (pct == null) return Math.round(total * 0.25);
    return Math.round((total * pct) / 100);
  };

  const advanceAmount = paymentPlan === "full" ? 0 : getPartialPayNowAmount();
  const advancePreviewNow =
    quote?.amountPayable != null && policyPartialPercent != null
      ? Math.round((quote.amountPayable * policyPartialPercent) / 100)
      : 0;

  // -- Scroll to top on mount and step change ---------------------------------
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    checkoutAttemptKeyRef.current = null;
    shouldEvaluateCodNudgeRef.current = false;
    setShowPrepaidSavingsPopup(false);
    setCodVsOnlineSavings(0);
    onlineFullPayableRef.current = null;
    codSavingsPrefetchKeyRef.current = null;
    setIsCouponManuallyApplied(false);
    if (couponCode) {
      dispatch(setCouponCode(""));
      setCouponInput("");
    }
  }, [selectedAddressId]);

  useEffect(() => {
    if (checkoutMode !== "online_full" || loading.quote) return;
    const onlinePayable = Number(quote?.amountPayable);
    if (Number.isFinite(onlinePayable) && onlinePayable >= 0) {
      onlineFullPayableRef.current = onlinePayable;
    }
  }, [checkoutMode, quote?.amountPayable, loading.quote]);

  useEffect(() => {
    if (step !== 3 || checkoutMode !== "online_full" || loading.quote) return;
    if (!selectedAddressId) return;

    const onlinePayable = Number(quote?.amountPayable);
    if (!Number.isFinite(onlinePayable) || onlinePayable < 0) return;

    onlineFullPayableRef.current = onlinePayable;

    const prefetchKey = `${selectedAddressId}|${couponCode || ""}|${onlinePayable}`;
    if (codSavingsPrefetchKeyRef.current === prefetchKey) return;
    codSavingsPrefetchKeyRef.current = prefetchKey;

    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.post("/checkout/quote", {
          addressId: selectedAddressId,
          couponCode: isCouponManuallyApplied ? couponCode || undefined : undefined,
          paymentMethodHint: "cod",
          paymentPlan: "full",
          balanceCollection: "online",
        });
        if (cancelled || !res.data?.success) return;
        const savings = computeCodVsOnlineSavings(
          res.data?.amountPayable,
          onlinePayable
        );
        setCodVsOnlineSavings(savings);
      } catch {
        if (!cancelled) codSavingsPrefetchKeyRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    step,
    checkoutMode,
    loading.quote,
    selectedAddressId,
    quote?.amountPayable,
    couponCode,
    isCouponManuallyApplied,
  ]);

  useEffect(() => {
    if (checkoutMode !== "cod") {
      setShowPrepaidSavingsPopup(false);
      return;
    }
    if (!shouldEvaluateCodNudgeRef.current || loading.quote) return;
    if (!quote || !Number.isFinite(Number(quote.amountPayable))) return;

    const codPayable = Number(quote.amountPayable);
    const onlinePayable = onlineFullPayableRef.current;
    const savings = computeCodVsOnlineSavings(codPayable, onlinePayable);

    shouldEvaluateCodNudgeRef.current = false;
    setCodVsOnlineSavings(savings);

    if (paymentPlan === "full" && savings > 0) {
      setShowPrepaidSavingsPopup(true);
    } else {
      setShowPrepaidSavingsPopup(false);
    }
  }, [checkoutMode, loading.quote, quote, paymentPlan]);

  useEffect(() => {
    dispatch(fetchCheckoutSettings());
  }, [dispatch]);

  useEffect(() => {
    if (paymentPlan === "half" || paymentPlan === "seventy") {
      dispatch(setPaymentPlan("advance"));
      dispatch(setBalanceCollection("cod"));
    }
  }, [paymentPlan, dispatch]);

  useEffect(() => {
    if (!checkoutPolicy) return;
    if (
      !checkoutPolicy.partialPaymentEnabled &&
      (paymentPlan !== "full" || balanceCollection === "cod")
    ) {
      dispatch(setPaymentPlan("full"));
      dispatch(setBalanceCollection("online"));
    }
  }, [checkoutPolicy, paymentPlan, balanceCollection, dispatch]);

  useEffect(() => {
    if (!checkoutPolicy) return;
    if (!checkoutPolicy.codEnabled && (paymentMethod === "cod" || balanceCollection === "cod")) {
      dispatch(setPaymentMethod("online"));
      dispatch(setPaymentPlan("full"));
      dispatch(setBalanceCollection("online"));
    }
  }, [checkoutPolicy, paymentMethod, balanceCollection, dispatch]);

  useEffect(() => {
    if (step !== 3 || !checkoutPolicy) return;
    if (paymentMethod == null) {
      dispatch(setPaymentMethod("online"));
      dispatch(setPaymentPlan("full"));
      dispatch(setBalanceCollection("online"));
    }
  }, [step, checkoutPolicy, paymentMethod, dispatch]);

  // -- Fetch Razorpay key when online selected --------------------------------
  useEffect(() => {
    if (paymentMethod === "online" && !razorpayKey && !razorpayKeyLoading && !razorpayKeyError) {
      dispatch(getRazorpayKey());
    }
  }, [paymentMethod, razorpayKey, razorpayKeyLoading, razorpayKeyError, dispatch]);

  // -- Guard: empty cart ? home -----------------------------------------------
  useEffect(() => {
    if (!loading.quote && cartItems.length === 0 && !placedOrder) {
      navigate("/", { replace: true });
    }
  }, [cartItems.length, placedOrder, loading.quote, navigate]);

  useEffect(() => {
    if (step === 3) {
      dispatch(fetchAvailableCoupons());
    }
  }, [step, dispatch]);

  useEffect(() => {
    setCouponInput(couponCode || "");
  }, [couponCode]);

  // -- Cleanup on unmount -----------------------------------------------------
  useEffect(() => {
    return () => {
      dispatch(clearCheckoutErrors());
      dispatch(resetPaymentVerification());
    };
  }, [dispatch]);

  // -- Handlers --------------------------------------------------------------

  const requestQuote = useCallback(
    async ({
      addressId = selectedAddressId,
      paymentHint = paymentMethod || "online",
      plan = paymentPlan,
      balance = balanceCollection,
      unwrap = false,
      ...rest
    } = {}) => {
      const hasCouponOverride = Object.prototype.hasOwnProperty.call(rest, "coupon");
      const coupon = hasCouponOverride
        ? rest.coupon
        : (isCouponManuallyApplied ? (couponCode || undefined) : undefined);

      if (!addressId) {
        return null;
      }
      if (loading.quote) {
        if (unwrap) {
          throw new Error("Checkout totals are already refreshing. Please wait.");
        }
        return null;
      }

      const action = dispatch(
        fetchCheckoutQuote({
          addressId,
          couponCode: coupon == null ? undefined : coupon,
          paymentMethodHint: paymentHint,
          paymentPlan: plan,
          balanceCollection: balance,
        })
      );

      if (!unwrap) {
        return action;
      }

      return action.unwrap();
    },
    [
      dispatch,
      selectedAddressId,
      isCouponManuallyApplied,
      couponCode,
      paymentMethod,
      paymentPlan,
      balanceCollection,
      loading.quote,
    ]
  );

  // RazorpayCheckout mounts with a stale `onClose` if we pass an inline async handler; keep latest logic in a ref.
  useEffect(() => {
    gatewayDismissHandlerRef.current = async () => {
      if (gatewayDismissRecoveryInFlight.current) {
        return;
      }
      gatewayDismissRecoveryInFlight.current = true;

      try {
        setShowRazorpay(false);
        setRazorpayOrderData(null);
        setRazorpayPaymentState(PAYMENT_STATE.CANCELLED);

        const oid = placedOrder?.order?.orderId;
        if (!oid) {
          setRazorpayPaymentState(PAYMENT_STATE.IDLE);
          return;
        }

        try {
          await dispatch(abandonOnlineCheckout(oid)).unwrap();
        } catch (err) {
          const msg =
            err?.message ||
            "Could not return to checkout. Your order may still be pending.";
          toast.error(msg, { theme: "dark" });
          toast.info("You can complete payment from My orders if this keeps happening.", {
            theme: "dark",
          });
          setRazorpayPaymentState(PAYMENT_STATE.IDLE);
          return;
        }

        checkoutAttemptKeyRef.current = null;
        dispatch(resetQuote());
        dispatch(resetPaymentVerification());

        let cartOk = false;
        let lastCartErr = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await dispatch(fetchCart()).unwrap();
            cartOk = true;
            break;
          } catch (e) {
            lastCartErr = e;
            await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          }
        }
        if (!cartOk) {
          console.error("[checkout] fetchCart after abandon failed", lastCartErr);
          toast.error(
            "Your order was released on the server, but this page could not reload your bag. Please refresh the browser.",
            { theme: "dark", autoClose: 8000 }
          );
          dispatch(clearPlacedOrderForDismissedGateway());
          setRazorpayPaymentState(PAYMENT_STATE.IDLE);
          return;
        }

        if (selectedAddressId && (step === 2 || step === 3)) {
          try {
            await requestQuote({ unwrap: true });
          } catch (qe) {
            toast.error(
              qe?.message ||
                "Could not refresh totals. Change payment option or address and try again.",
              { theme: "dark" }
            );
          }
        }

        dispatch(clearPlacedOrderForDismissedGateway());
        setRazorpayPaymentState(PAYMENT_STATE.IDLE);
        toast.success(
          "Payment window closed. Your bag was restored  pick COD, full pay, or partial, then confirm.",
          { theme: "dark", autoClose: 5000 }
        );
      } finally {
        gatewayDismissRecoveryInFlight.current = false;
      }
    };
  }, [
    dispatch,
    placedOrder,
    selectedAddressId,
    step,
    requestQuote,
  ]);

  const handleQuoteRefreshAfterCartMutation = useCallback(async () => {
    checkoutAttemptKeyRef.current = null;
    dispatch(resetQuote());

    if (!selectedAddressId || (step !== 2 && step !== 3)) {
      return;
    }

    try {
      await requestQuote({ unwrap: true });
      toast.info("Checkout totals refreshed.", { theme: "dark" });
    } catch (refreshError) {
      toast.error(refreshError?.message || "Could not refresh checkout totals", { theme: "dark" });
    }
  }, [dispatch, requestQuote, selectedAddressId, step]);

  const handleStep1Next = () => {
    if (loading.quote) return;
    if (!selectedAddressId) {
      toast.error("Please select a delivery address", { theme: "dark" });
      return;
    }
    setStep(2);
    // Refresh quote when entering order summary (step 2).
    const hint = paymentMethod === "cod" ? "cod" : "online";
    const isAdvanceCod =
      paymentMethod === "online" && paymentPlan === "advance" && balanceCollection === "cod";
    const plan = paymentMethod === "cod" || !isAdvanceCod ? "full" : "advance";
    const balance = paymentMethod === "cod" || !isAdvanceCod ? "online" : "cod";
    requestQuote({ paymentHint: hint, plan, balance });
  };

  const handleStep2Next = () => {
    if (loading.quote) return;
    if (!quote) {
      toast.error("Please wait for order totals to load", { theme: "dark" });
      return;
    }
    setStep(3);
  };

  const selectCheckoutPaymentMode = (mode) => {
    checkoutAttemptKeyRef.current = null;
    shouldEvaluateCodNudgeRef.current = mode === "cod";
    if (mode !== "cod") {
      setShowPrepaidSavingsPopup(false);
    }
    if (mode === "cod") {
      const onlinePayable = Number(quote?.amountPayable);
      if (
        paymentMethod !== "cod" &&
        paymentPlan === "full" &&
        Number.isFinite(onlinePayable) &&
        onlinePayable >= 0
      ) {
        onlineFullPayableRef.current = onlinePayable;
      }
      dispatch(setPaymentMethod("cod"));
      dispatch(setPaymentPlan("full"));
      dispatch(setBalanceCollection("online"));
    } else if (mode === "online_full") {
      dispatch(setPaymentMethod("online"));
      dispatch(setPaymentPlan("full"));
      dispatch(setBalanceCollection("online"));
    } else if (mode === "advance_cod") {
      dispatch(setPaymentMethod("online"));
      dispatch(setPaymentPlan("advance"));
      dispatch(setBalanceCollection("cod"));
    }
    // Refetch whenever payment mode changes and we have an address (even if quote is null so
    // totals stay in sync with Shiprocket pricing mode for confirmCheckout).
    if (selectedAddressId) {
      dispatch(resetQuote());
      dispatch(setSelectedAddress(selectedAddressId));
      const hint = mode === "cod" ? "cod" : "online";
      const plan = mode === "advance_cod" ? "advance" : "full";
      const bal = mode === "advance_cod" ? "cod" : "online";
      requestQuote({
        addressId: selectedAddressId,
        paymentHint: hint,
        plan,
        balance: bal,
      });
    }
  };

  const handleApplyCoupon = async (inputCode) => {
    const normalized = String(inputCode || "").trim().toUpperCase();
    if (!normalized) {
      toast.error("Please enter a coupon code", { theme: "dark" });
      return;
    }
    if (!selectedAddressId) {
      toast.error("Please select address first", { theme: "dark" });
      return;
    }
    try {
      await dispatch(validateCouponCode({ couponCode: normalized })).unwrap();
      setIsCouponManuallyApplied(true);
      dispatch(setCouponCode(normalized));
      await requestQuote({ coupon: normalized, unwrap: true });
      toast.success(`Coupon ${normalized} applied`, { theme: "dark" });
    } catch (err) {
      // toast.error(err?.message || "Coupon is not valid", { theme: "dark" });
    }
  };

  const handleRemoveCoupon = async () => {
    if (!selectedAddressId) return;
    setIsCouponManuallyApplied(false);
    dispatch(setCouponCode(""));
    try {
      await requestQuote({ coupon: null, unwrap: true });
      toast.info("Coupon removed", { theme: "dark" });
    } catch (err) {
      toast.error(err?.message || "Could not refresh totals", { theme: "dark" });
    }
  };

  // -- Add address directly (no UserAddress page) ----------------------------
  const handleAddAddressSubmit = async (formData) => {
    try {
      await dispatch(addAddress(formData)).unwrap();
      toast.success("Address added!", { theme: "dark" });
      setShowAddressModal(false);
      dispatch(clearAddressErrors());
    } catch (e) {
      const detail =
        Array.isArray(e?.errors) && e.errors.length
          ? e.errors.map((x) => x.message).filter(Boolean).join(" ")
          : "";
      toast.error(detail || e?.message || "Failed to save address", { theme: "dark" });
    }
  };

  const handleAddAddressClose = () => {
    setShowAddressModal(false);
    dispatch(clearAddressErrors());
  };

  // -- Place order � guarded against double-fire -----------------------------
  const handlePlaceOrder = async () => {
    // Guard: prevent double-click / multiple calls
    if (placeOrderInFlight.current || isPlacingOrder) return;
    if (!quoteId || !selectedAddressId) {
      toast.error("Missing quote or address. Please refresh.", { theme: "dark" });
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method before placing your order.", { theme: "dark" });
      return;
    }

    placeOrderInFlight.current = true;
    setIsPlacingOrder(true);

    try {
      const idempotencyKey =
        checkoutAttemptKeyRef.current || createCheckoutAttemptKey();
      checkoutAttemptKeyRef.current = idempotencyKey;

      const advancePercentForApi =
        paymentMethod === "online" && paymentPlan !== "full" && policyPartialPercent != null
          ? policyPartialPercent
          : undefined;

      // Step 1: Confirm quote
      const confirmResult = await dispatch(confirmCheckoutQuote({
        quoteId,
        paymentMethod,
        paymentPlan,
        paymentAdvancePercent: advancePercentForApi,
        balanceCollection,
      })).unwrap();

      // Step 2: Place order
      const orderResult = await dispatch(placeOrder({
        addressId: selectedAddressId,
        paymentMethod,
        quoteId: confirmResult.quoteId || quoteId,
        couponCode: couponCode || undefined,
        onlinePaymentMode: paymentPlan,
        paymentAdvancePercent: advancePercentForApi,
        balanceCollection,
        idempotencyKey,
      })).unwrap();

      // Step 3: Handle by payment method
      if (paymentMethod === "cod") {
              await new Promise(resolve => setTimeout(resolve, 4000))
        toast.success("?? Order placed successfully!", { theme: "dark", autoClose: 3000 });
        checkoutAttemptKeyRef.current = null;
        setTimeout(() => {
          dispatch(resetCheckout());
          navigate("/account/userorders", {
            state: { justPlaced: true }
          });
        }, 1500);
      } else if (paymentMethod === "online") {
        if (!orderResult.razorpayOrder) {
          throw new Error(
            orderResult.razorpayErrorDetail?.description ||
            "Failed to initiate payment. Please try again."
          );
        }
        if (!razorpayKey && !razorpayKeyLoading) {
          await dispatch(getRazorpayKey()).unwrap();
        }
        if (!razorpayKey && razorpayKeyError) {
          throw new Error("Payment gateway not configured. Please use COD.");
        }
        setRazorpayPaymentState(PAYMENT_STATE.IDLE);
        setRazorpayOrderData(orderResult.razorpayOrder);
        setShowRazorpay(true);
      }
    } catch (e) {
      const msg = e?.message || "Failed to place order";
      if (isQuoteRefreshError(e?.code)) {
        checkoutAttemptKeyRef.current = null;
        toast.info(msg, { theme: "dark" });
        requestQuote({
          addressId: selectedAddressId,
          paymentHint: paymentMethod || "online",
          plan: paymentPlan,
          balance: balanceCollection,
        });
      } else if (e?.code === "IDEMPOTENCY_REQUEST_IN_PROGRESS") {
        toast.info("Your order is already being processed. Please wait a moment.", { theme: "dark" });
      } else if (e?.code === "IDEMPOTENCY_KEY_REUSED") {
        checkoutAttemptKeyRef.current = null;
        toast.error("Checkout session changed. Please place the order again.", { theme: "dark" });
      } else if (e?.code === "MISSING_RAZORPAY_ENV") {
        toast.error("Payment not configured. Please use COD for now.", { theme: "dark" });
      } else {
        toast.error(msg, { theme: "dark" });
      }
      setPaymentError(msg);
      setShowPaymentErrorModal(true);
    } finally {
      setIsPlacingOrder(false);
      placeOrderInFlight.current = false;
    }
  };

  // -- Razorpay callbacks -----------------------------------------------------

  const handleRazorpaySuccess = async (response) => {
    // paymentState is already "success" (set inside RazorpayCheckout before this fires)
    // Razorpay modal may or may not have closed � either way we show verification overlay
    setShowRazorpay(false);
    try {
      const currentOrderId = placedOrder?.order?.orderId || response.notes?.orderId;
      if (!currentOrderId) throw new Error("Order ID not found. Please contact support.");

      await dispatch(verifyRazorpayPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        orderId: currentOrderId,
      })).unwrap();

      setRazorpayPaymentState(PAYMENT_STATE.VERIFIED);
      checkoutAttemptKeyRef.current = null;

      toast.success("✅ Payment verified! Order confirmed.", { theme: "dark", autoClose: 3000 });
      setTimeout(() => {
        dispatch(resetCheckout());
        navigate("/account/userorders", { state: { justPlaced: true } });
      }, 1500);
    } catch (err) {
      setRazorpayPaymentState(PAYMENT_STATE.FAILED);
      const verificationMessage = err?.code === "PAYMENT_NOT_CAPTURED_YET"
        ? "Payment is received but capture is still pending. Please wait a moment and check your orders again."
        : (err?.message || "Payment verification failed. Please contact support.");
      setPaymentError(verificationMessage);
      setShowPaymentErrorModal(true);
    }
  };

  const handleRazorpayFailure = (error) => {
    setShowRazorpay(false);
    setRazorpayPaymentState(PAYMENT_STATE.FAILED);
    setShowPaymentErrorModal(false);
    setPaymentError(null);

    const msg = error?.error?.description || "Payment failed. Please try again.";
    toast.error(msg, { theme: "dark" });

    checkoutAttemptKeyRef.current = null;
  };

  const handleRazorpayClose = useCallback(() => {
    setShowPaymentErrorModal(false);
    setPaymentError(null);
    void gatewayDismissHandlerRef.current();
  }, []);

  const handleRetryPayment = () => {
    setShowPaymentErrorModal(false);
    setPaymentError(null);
    setRazorpayPaymentState(PAYMENT_STATE.IDLE);
    handlePlaceOrder();
  };

  const handleSwitchToPrepaidFromPopup = () => {
    setShowPrepaidSavingsPopup(false);
    selectCheckoutPaymentMode("online_full");
  };

  const handleContinueCodFromPopup = () => {
    setShowPrepaidSavingsPopup(false);
  };

  // -- Derived button state ---------------------------------------------------
  const isPlaceOrderDisabled =
    !quote ||
    !paymentMethod ||
    loading.quote ||
    loading.confirm ||
    loading.placeOrder ||
    loading.abandonCheckout ||
    isPlacingOrder ||
    paymentVerification.loading ||
    (paymentMethod === "online" && !razorpayKey && !razorpayKeyLoading && !razorpayKeyError);
  const couponApplyDisabled =
    !selectedAddressId ||
    step !== 3 ||
    loading.quote ||
    cartItems.length === 0 ||
    couponValidation.loading ||
    !String(couponInput || "").trim();
  const couponShortfallInr =
    couponValidation.error?.code === "COUPON_MIN_ORDER_NOT_MET"
      ? Number(couponValidation.error?.details?.shortfallInr || 0)
      : 0;

  // -- Success screens --------------------------------------------------------
  if (placedOrder?.order && paymentMethod === "cod" && !paymentVerification.loading) {
    return (
      <OrderSuccess
        order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
        onViewOrders={() => { dispatch(resetCheckout()); navigate("/account/userorders"); }}
      />
    );
  }

  // -- Main render ------------------------------------------------------------
  return (
    <div className="min-h-screen" style={{ background: "#FFFBF4" }}>

      {/* -- Sticky Header -- */}
      <header className="sticky top-0  flex items-center justify-between px-4"
        style={{ background: "#fff", borderBottom: "1px solid #f0e8d8", height: 56 }}>
        <button
          onClick={() => {
            if (step === 1) navigate(-1);
            else setStep(step - 1);
          }}
          className="flex items-center gap-1.5 cursor-pointer transition-colors"
          style={{ background: "none", border: "none", color: "#9ca3af" }}
          onMouseEnter={e => e.currentTarget.style.color = "#111"}
          onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
        >
          <ArrowLeft size={18} />
          <span className="font-black text-xs uppercase tracking-widest">
            {step === 1 ? "Cart" : "Back"}
          </span>
        </button>

        {/* Logo */}
        <span className="font-black text-lg select-none" style={{ letterSpacing: "-0.02em" }}>
          <span style={{ color: "#111" }}>Offer</span>
          <span style={{ color: "#F7A221" }}>Wale</span>
          <span style={{ color: "#111" }}>Baba</span>
        </span>

        {/* Spacer */}
        <div style={{ width: 72 }} />
      </header>

      {/* -- Step Indicator -- */}
      <StepIndicator
        step={step}
        onGoToStep={(n) => {
          if (n < step) setStep(n);
        }}
      />

      {/* -- Body -- */}
      <div className="px-4 py-5 space-y-4" style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* Global error */}
        {(error.quote || error.confirm || error.placeOrder) && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "#fff5f5", border: "1px solid #fed7d7" }}>
            <AlertCircle size={15} style={{ color: "#ef4444" }} className="flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-xs font-bold" style={{ color: "#b91c1c" }}>
              {error.placeOrder?.message || error.confirm?.message || error.quote?.message}
            </p>
            <button onClick={() => dispatch(clearCheckoutErrors())} className="cursor-pointer"
              style={{ background: "none", border: "none", color: "#fca5a5" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------
            STEP 1 � ADDRESS
        ------------------------------------------------------ */}
        {step === 1 && (
          <div className="p-4 space-y-4"
            style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 20 }}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center font-black flex-shrink-0"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "#F7A221", color: "#111", fontSize: 14,
                }}>
                1
              </div>
              <h2 className="font-black text-base" style={{ color: "#111" }}>
                Delivery Address
              </h2>
            </div>

            <AddressSelector onAddAddress={() => setShowAddressModal(true)} />

            <button
              onClick={handleStep1Next}
              disabled={!selectedAddressId}
              className="w-full font-black uppercase transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background: "#111", color: "#F7A221",
                borderRadius: 14, padding: "15px 0",
                fontSize: 13, letterSpacing: "0.04em",
                border: "none",
                opacity: !selectedAddressId ? 0.4 : 1,
                cursor: !selectedAddressId ? "not-allowed" : "pointer",
              }}
            >
              Continue to Order Summary
            </button>
          </div>
        )}

        {/* ------------------------------------------------------
            STEP 2 � ORDER SUMMARY
        ------------------------------------------------------ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 space-y-4"
              style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 20 }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center font-black flex-shrink-0"
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#F7A221", color: "#111", fontSize: 14,
                  }}>
                  2
                </div>
                <h2 className="font-black text-base" style={{ color: "#111" }}>
                  Order Summary
                </h2>
              </div>

              {quote?.deliveryEstimate && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] w-fit"
                  style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}>
                  <Truck size={13} style={{ color: "#15803D" }} />
                  <span className="font-bold" style={{ fontSize: 13, color: "#15803D" }}>
                    {quote.deliveryEstimate}
                  </span>
                </div>
              )}

              <OrderSummaryCard
                cartItems={cartItems}
                cartCount={cartCount}
                quote={quote}
                dispatch={dispatch}
                onCartMutationSuccess={handleQuoteRefreshAfterCartMutation}
                defaultOpen
              />

              <CheckoutStepBackButton onClick={() => setStep(1)}>
                Back to Address
              </CheckoutStepBackButton>

              <button
                type="button"
                onClick={handleStep2Next}
                disabled={!quote || loading.quote}
                className="w-full font-black uppercase transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: "#111", color: "#F7A221",
                  borderRadius: 14, padding: "15px 0",
                  fontSize: 13, letterSpacing: "0.04em",
                  border: "none",
                  opacity: !quote || loading.quote ? 0.4 : 1,
                  cursor: !quote || loading.quote ? "not-allowed" : "pointer",
                }}
              >
                {loading.quote ? "Loading totals" : "Proceed to Payment"}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------
            STEP 3 � PAYMENT
        ------------------------------------------------------ */}
        {step === 3 && (
          <div className="space-y-4">
            <style>{`
              @keyframes pay-online-discount-shimmer {
                0% { transform: translateX(-130%) skewX(-16deg); }
                100% { transform: translateX(230%) skewX(-16deg); }
              }
              .pay-online-discount-badge {
                position: relative;
                overflow: hidden;
                display: inline-block;
              }
              .pay-online-discount-badge::after {
                content: "";
                position: absolute;
                inset: -2px 0;
                width: 42%;
                background: linear-gradient(
                  105deg,
                  transparent 0%,
                  rgba(255, 255, 255, 0.15) 38%,
                  rgba(255, 255, 255, 0.72) 50%,
                  rgba(255, 255, 255, 0.15) 62%,
                  transparent 100%
                );
                animation: pay-online-discount-shimmer 2.6s ease-in-out infinite;
                pointer-events: none;
                z-index: 0;
              }
              .pay-online-discount-badge__text {
                position: relative;
                z-index: 1;
              }
              @media (prefers-reduced-motion: reduce) {
                .pay-online-discount-badge::after {
                  animation: none;
                }
              }
            `}</style>

            <CartSummaryCompact quote={quote} />

            {/* -- Address done summary -- */}
            {selectedAddress && (
              <div className="p-4"
                style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 18 }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center"
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#111", color: "#F7A221",
                      }}
                    >
                      <Check size={12} strokeWidth={3} aria-hidden />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest"
                      style={{ color: "#111" }}>
                      Delivering to
                    </span>
                  </div>
                  <button onClick={() => setStep(1)}
                    className="font-black uppercase cursor-pointer transition-colors"
                    style={{
                      fontSize: 10, color: "#F7A221",
                      background: "none", border: "none", letterSpacing: "0.06em",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#111"}
                    onMouseLeave={e => e.currentTarget.style.color = "#F7A221"}
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-start gap-3 px-3 py-3 rounded-xl"
                  style={{ background: "#FFFBF4" }}>
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: "#FEF3E2" }}>
                    <MapPin size={13} style={{ color: "#F7A221" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black" style={{ fontSize: 13, color: "#111" }}>
                      {selectedAddress.fullName}
                    </p>
                    <p className="truncate" style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      {[selectedAddress.houseNumber, selectedAddress.area, selectedAddress.city]
                        .filter(Boolean).join(", ")}  {selectedAddress.postalCode}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* -- Payment card -- */}
            <div className="p-4 space-y-4"
              style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 20 }}>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center font-black flex-shrink-0"
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#F7A221", color: "#111", fontSize: 14,
                  }}>
                  3
                </div>
                <h2 className="font-black text-base" style={{ color: "#111" }}>
                  Payment Method
                </h2>
              </div>

              <p className="font-black uppercase"
                style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.06em" }}>
                Choose How to Pay
              </p>

              {checkoutPolicyLoading && !checkoutPolicy ? (
                <p className="text-[11px] text-gray-400 font-medium py-2">Loading payment options</p>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => selectCheckoutPaymentMode("online_full")}
                    className="w-full text-left cursor-pointer transition-all active:scale-[0.98]"
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      border: `2px solid ${checkoutMode === "online_full" ? "#111" : "#f0e8d8"}`,
                      background: checkoutMode === "online_full" ? "#111" : "#fff",
                      color: checkoutMode === "online_full" ? "#F7A221" : "#111",
                      transition: "all 0.2s",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: `2px solid ${checkoutMode === "online_full" ? "#F7A221" : "#d1d5db"}`,
                        }}
                      >
                        {checkoutMode === "online_full" && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#F7A221",
                            }}
                          />
                        )}
                      </div>
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 38, height: 38, borderRadius: 10, background: "#EBF8FF" }}
                      >
                        <CreditCard size={17} style={{ color: "#3b82f6" }} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col items-stretch text-left">
                        <p
                          className="font-black text-sm w-full text-left"
                          style={{
                            color: checkoutMode === "online_full" ? "#F7A221" : "#111",
                            lineHeight: 1.25,
                          }}
                        >
                          Pay Online Full Amount
                        </p>
                        {codVsOnlineSavings > 0 ? (
                        <div className="flex justify-start w-full mt-1.5">
                          <span
                            className="pay-online-discount-badge font-black shrink-0 whitespace-nowrap"
                            style={{
                              fontSize: 10,
                              padding: "6px 16px",
                              borderRadius: 999,
                              background: "#dc2626",
                              color: "#ffffff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                            }}
                          >
                            <span className="pay-online-discount-badge__text">
                              Get Extra Discount {fmt(codVsOnlineSavings)}
                            </span>
                          </span>
                        </div>
                        ) : null}
                        <p className="text-[11px] opacity-80 mt-1.5 w-full text-left">
                          Pay Only  {fmt(quote?.amountPayable)} UPI, cards, net banking
                        </p>
                      </div>
                    </div>
                  </button>

                  {partialPlanEnabled && policyPartialPercent != null && (
                    <button
                      type="button"
                      onClick={() => selectCheckoutPaymentMode("advance_cod")}
                      className="w-full text-left cursor-pointer transition-all active:scale-[0.98]"
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        border: `2px solid ${checkoutMode === "advance_cod" ? "#111" : "#f0e8d8"}`,
                        background: checkoutMode === "advance_cod" ? "#111" : "#fff",
                        color: checkoutMode === "advance_cod" ? "#F7A221" : "#111",
                        transition: "all 0.2s",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `2px solid ${checkoutMode === "advance_cod" ? "#F7A221" : "#d1d5db"}`,
                          }}
                        >
                          {checkoutMode === "advance_cod" && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#F7A221",
                              }}
                            />
                          )}
                        </div>
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{ width: 38, height: 38, borderRadius: 10, background: "#FEF3E2" }}
                        >
                          <Banknote size={17} style={{ color: "#b45309" }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm">
                            Pay {formatPercentLabel(policyPartialPercent)}% Online Now
                          </p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Balance On delivery (COD) {fmt(advancePreviewNow)} Pay Online Now
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* {checkoutMode === "advance_cod" && quote?.amountPayable != null && (
                    <p className="text-center px-1" style={{ fontSize: 10, color: "#3b82f6" }}>
                      {formatPercentLabel(policyPartialPercent)}% charged online now; remaining{" "}
                      {fmt(quote.amountPayable - advanceAmount)} is collected as cash on delivery.
                    </p>
                  )} */}

                  {showCodOption && (
                    <button
                      type="button"
                      onClick={() => selectCheckoutPaymentMode("cod")}
                      className="w-full text-left cursor-pointer transition-all active:scale-[0.98]"
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        border: `2px solid ${checkoutMode === "cod" ? "#111" : "#f0e8d8"}`,
                        background: checkoutMode === "cod" ? "#111" : "#fff",
                        transition: "all 0.2s",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `2px solid ${checkoutMode === "cod" ? "#F7A221" : "#d1d5db"}`,
                          }}
                        >
                          {checkoutMode === "cod" && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#F7A221",
                              }}
                            />
                          )}
                        </div>
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: checkoutMode === "cod" ? "rgba(255,255,255,0.15)" : "#F0FFF4",
                          }}
                        >
                          <Banknote
                            size={17}
                            style={{ color: checkoutMode === "cod" ? "#fff" : "#16a34a" }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className="font-black text-sm"
                              style={{ color: checkoutMode === "cod" ? "#F7A221" : "#111" }}
                            >
                              Cash On Delivery Full Amount
                            </p>


                           
                          </div>
                          <p
                            style={{
                              opacity: 0.85,
                              fontSize: 11,
                              marginTop: 1,
                              color: checkoutMode === "cod" ? "rgba(247,162,33,0.65)" : "black",
                            }}
                          >
                            Pay the full order Amount  when your order arrives
                          </p>
                          
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* -- Coupon card -- */}
              <div className="p-4 space-y-3" style={{ background: "#fff", border: "1px solid #f0e8d8", borderRadius: 20 }}>
                <div className="flex items-center justify-between">
                  <p className="font-black uppercase" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.06em" }}>
                    Apply Coupon
                  </p>
                  {couponCode ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] font-black uppercase"
                      style={{ color: "#ef4444", background: "none", border: "none", letterSpacing: "0.06em", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="w-full min-w-0 px-3 py-2 rounded-xl border text-sm sm:flex-1"
                    style={{ borderColor: "#f0e8d8", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon(couponInput)}
                    disabled={couponApplyDisabled}
                    className="w-full shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase sm:w-auto"
                    style={{
                      background: "#111",
                      color: "#F7A221",
                      border: "none",
                      opacity: couponApplyDisabled ? 0.6 : 1,
                      cursor: couponApplyDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {couponValidation.loading ? "Applying..." : "Apply"}
                  </button>
                </div>

                {quote?.couponApplied && quote?.promotionDiscount > 0 && (
                  <p className="text-[11px] font-bold" style={{ color: "#15803D" }}>
                    {quote.couponApplied} applied You saved {fmt(quote.promotionDiscount)}
                  </p>
                )}

                {/* {couponValidation.error?.message && (
                  <p className="text-[11px] font-bold" style={{ color: "#b91c1c" }}>
                    {couponValidation.error.message}
                  </p>
                // )} } */}
                {couponShortfallInr > 0 && (
                  <p className="text-[11px] font-bold" style={{ color: "#2563eb" }}>
                    Add {fmt(couponShortfallInr)} more to use this coupon.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowCouponsList((v) => !v)}
                  className="text-[11px] font-bold"
                  style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showCouponsList ? "Hide available coupons" : "View available coupons"}
                </button>

                {showCouponsList && (
                  <div className="space-y-2 max-h-44 overflow-auto pr-1">
                    {availableCoupons.length === 0 ? (
                      <p className="text-[11px]" style={{ color: "#9ca3af" }}>No active coupons available.</p>
                    ) : (
                      availableCoupons.map((c) => (
                        <button
                          type="button"
                          key={c.code}
                          onClick={() => {
                            setCouponInput(c.code);
                            handleApplyCoupon(c.code);
                          }}
                          className="w-full text-left p-2 rounded-lg"
                          style={{ border: "1px solid #f0e8d8", background: "#FFFBF4", cursor: "pointer" }}
                        >
                          <p className="text-xs font-black" style={{ color: "#111" }}>
                            {c.code}  {c.discountType === "fixed" ? `${fmt(c.discountValue)} OFF` : `${c.discountValue}% OFF`}
                          </p>
                          <p className="text-[10px]" style={{ color: "#6b7280" }}>
                            Min order {fmt(c.minOrderValue || 0)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Razorpay key error */}
              {paymentMethod === "online" && razorpayKeyError && (
                <div className="flex items-center gap-2 px-3 py-3 rounded-2xl"
                  style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
                  <AlertCircle size={12} style={{ color: "#d97706" }} />
                  <p style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                    {razorpayKeyError}. Please use COD or try again later.
                  </p>
                </div>
              )}

              {/* Quote loading */}
              {loading.quote && (
                <div className="flex items-center justify-center gap-2 py-3"
                  style={{ color: "#9ca3af" }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Calculating delivery &amp; taxes
                  </span>
                </div>
              )}

              <CheckoutStepBackButton onClick={() => setStep(2)}>
                Back to Order Summary
              </CheckoutStepBackButton>

              {/* -- Place Order Button -- */}
              <button
                onClick={handlePlaceOrder}
                disabled={isPlaceOrderDisabled}
                className="w-full font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: "#F7A221", color: "#111",
                  borderRadius: 16, padding: "17px 0",
                  fontSize: 15, letterSpacing: "0.04em",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(247,162,33,0.3)",
                  opacity: isPlaceOrderDisabled ? 0.4 : 1,
                  cursor: isPlaceOrderDisabled ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  if (!isPlaceOrderDisabled) {
                    e.currentTarget.style.background = "#e08c0a";
                    e.currentTarget.style.boxShadow = "0 6px 28px rgba(247,162,33,0.45)";
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#F7A221";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(247,162,33,0.3)";
                }}
              >
                {loading.confirm || loading.placeOrder || isPlacingOrder || paymentVerification.loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {paymentVerification.loading ? "Verifying Payment" : "Placing Order"}
                  </>
                ) : loading.quote ? (
                  <><Loader2 size={16} className="animate-spin" /> Getting Quote</>
                ) : (
                  <>
                    Place Order {" "}
                    {paymentMethod === "online" && paymentPlan !== "full"
                      ? fmt(getPartialPayNowAmount())
                      : fmt(quote?.amountPayable)}
                  </>
                )}
              </button>

              {/* Security line */}
              <p className="text-center flex items-center justify-center gap-1"
                style={{ fontSize: 10, color: "#9ca3af" }}>
                 {paymentMethod === "online" ? "Secured by Razorpay" : "100% Safe Checkout"}
              </p>

              {/* Terms */}
              <p className="text-center" style={{ fontSize: 10, color: "#9ca3af" }}>
                By placing this order you agree to our <Link to="/policies/terms-conditions" className="text-[#F7A221] underline">Terms &amp; Conditions</Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* -- Address Form Modal � opens DIRECTLY -- */}
      {showAddressModal && (
        <AddressFormModal
          initial={null}
          onSubmit={handleAddAddressSubmit}
          onClose={handleAddAddressClose} 
          isSaving={addressLoading.add}
          error={addressError.add}
        />
      )}

      {/* -- Razorpay Checkout -- */}
      {showRazorpay && razorpayOrderData && razorpayKey && (
        <RazorpayCheckout
          razorpayOrder={razorpayOrderData}
          razorpayKey={razorpayKey}
          orderId={placedOrder?.order?.orderId}
          totalAmount={quote?.amountPayable}
          userEmail={user?.email}
          userName={user?.name}
          userPhone={selectedAddress?.phone}
          paymentState={razorpayPaymentState}
          onPaymentStateChange={setRazorpayPaymentState}
          onSuccess={handleRazorpaySuccess}
          onFailure={handleRazorpayFailure}
          onClose={handleRazorpayClose}
        />
      )}

      {/* -- Payment verification overlay -- */}
      {(paymentVerification.loading || razorpayPaymentState === PAYMENT_STATE.SUCCESS) && (
        <PaymentLoadingModal message="Verifying your payment please wait" />
      )}

      {showPrepaidSavingsPopup && codVsOnlineSavings > 0 && (
        <PrepaidSavingsPopup
          savingsAmount={codVsOnlineSavings}
          onSwitchToPrepaid={handleSwitchToPrepaidFromPopup}
          onContinueCod={handleContinueCodFromPopup}
          onClose={handleContinueCodFromPopup}
        />
      )}

      {/* -- Payment Error Modal -- */}
    {showPaymentErrorModal && (
  <PaymentErrorModal
    error={paymentError}
    orderId={placedOrder?.order?.orderId}  // ? add this
    onRetry={handleRetryPayment}
    onClose={() => {
      setShowPaymentErrorModal(false);
      setPaymentError(null);
    }}
  />
)}
    </div>
  );
};

export default Checkout;

// code is working but upper code have better ui


// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   ChevronRight, ChevronLeft, Loader2, MapPin,
//   CreditCard, Truck, CheckCircle2, Package,
//   AlertCircle, ArrowLeft, ShoppingBag, Banknote,
//   X, Clock,
// } from "lucide-react";

// // Redux � checkout
// import {
//   fetchCheckoutQuote,
//   confirmCheckoutQuote,
//   placeOrder,
//   setSelectedAddress,
//   setPaymentMethod,
//   setPaymentPlan,
//   resetCheckout,
//   resetQuote ,
//   clearCheckoutErrors,
//   selectQuote,
//   selectQuoteId,
//   selectConfirmed,
//   selectPlacedOrder,
//   selectSelectedAddressId,
//   selectPaymentMethod,
//   selectPaymentPlan,
//   selectCheckoutLoading,
//   selectCheckoutError,
//   getRazorpayKey,
//   selectRazorpayKey,
//   selectRazorpayKeyLoading,
//   selectRazorpayKeyError,
//   verifyRazorpayPayment,
//   selectPaymentVerification,
//   resetPaymentVerification,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";

// // Redux � address
// import {
//   selectDefaultAddress,
//   selectOtherAddresses,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";

// // Redux � cart
// import {
//   selectCartItems,
//   selectDisplayCartCount,
//   selectCartTotalAmount,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// // Redux � auth
// import { selectUser } from "../../components/REDUX_FEATURES/REDUX_SLICES/authSlice";

// // Components
// import AddressSelector from "./AddressSelector/AddressSelector";
// import PriceBreakdown from "./PriceBreakdown/PriceBreakdown";
// import AddressFormModal from "../User_Dash_Segment/UserSubPages/UserAddress";
// import RazorpayCheckout, { PaymentErrorModal, PaymentLoadingModal } from "./RazorpayCheckout/RazorpayCheckout";

// const fmt = (n) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(n ?? 0);

// // -----------------------------------------------------------------------------
// // Order Success Screen
// // -----------------------------------------------------------------------------
// const OrderSuccess = ({ order, onViewOrders }) => (
//   <div className="min-h-screen bg-white flex items-center justify-center p-6">
//     <div className="max-w-md w-full text-center space-y-6">
//       <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto">
//         <CheckCircle2 size={48} className="text-green-500" />
//       </div>
//       <div>
//         <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed!</h1>
//         <p className="text-gray-500 font-medium mt-2">
//           {order.paymentMethod === "cod" 
//             ? "We've received your order and will process it shortly."
//             : "Payment successful! Your order has been confirmed."}
//         </p>
//       </div>
//       <div className="bg-gray-50 rounded-[28px] p-6 text-left space-y-3">
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Order ID</span>
//           <span className="text-sm font-black text-gray-900">{order.orderId}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">
//             {order.paymentMethod === "cod" ? "Total Amount" : "Amount Paid"}
//           </span>
//           <span className="text-sm font-black text-gray-900">{fmt(order.totalAmount)}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Payment</span>
//           <span className="text-sm font-black text-gray-900 uppercase">
//             {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
//           </span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Status</span>
//           <span className="text-xs font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
//             {order.orderStatus === "confirmed" ? "Confirmed" : order.orderStatus}
//           </span>
//         </div>
//       </div>
//       <div className="flex gap-3">
//         <button
//           onClick={onViewOrders}
//           className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           View Orders
//         </button>
//         <a
//           href="/"
//           className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-600 hover:border-black hover:text-black transition-all text-center cursor-pointer"
//         >
//           Continue Shopping
//         </a>
//       </div>
//     </div>
//   </div>
// );

// // -----------------------------------------------------------------------------
// // Checkout � Main Page
// // -----------------------------------------------------------------------------
// const Checkout = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // Redux state
//   const quote = useSelector(selectQuote);
//   const quoteId = useSelector(selectQuoteId);
//   const confirmed = useSelector(selectConfirmed);
//   const placedOrder = useSelector(selectPlacedOrder);
//   const selectedAddressId = useSelector(selectSelectedAddressId);
//   const paymentMethod = useSelector(selectPaymentMethod);
//   const paymentPlan = useSelector(selectPaymentPlan);
//   const loading = useSelector(selectCheckoutLoading);
//   const error = useSelector(selectCheckoutError);
//   const razorpayKey = useSelector(selectRazorpayKey);
//   const razorpayKeyLoading = useSelector(selectRazorpayKeyLoading);
//   const razorpayKeyError = useSelector(selectRazorpayKeyError);
//   const paymentVerification = useSelector(selectPaymentVerification);

//   const defaultAddr = useSelector(selectDefaultAddress);
//   const otherAddrs = useSelector(selectOtherAddresses);
//   const cartItems = useSelector(selectCartItems);
//   const cartCount = useSelector(selectDisplayCartCount);
//   const user = useSelector(selectUser);

//   // Local state
//   const [step, setStep] = useState(1);
//   const [showAddressModal, setShowAddressModal] = useState(false);
//   const [showRazorpay, setShowRazorpay] = useState(false);
//   const [razorpayOrderData, setRazorpayOrderData] = useState(null);
//   const [paymentError, setPaymentError] = useState(null);
//   const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
//   const [isPlacingOrder, setIsPlacingOrder] = useState(false);

//   const allAddresses = [
//     ...(defaultAddr ? [defaultAddr] : []),
//     ...otherAddrs,
//   ];
//   const selectedAddress = allAddresses.find((a) => a._id === selectedAddressId);

//   // Fetch Razorpay key when online payment is selected
//   useEffect(() => {
//     if (paymentMethod === "online" && !razorpayKey && !razorpayKeyLoading && !razorpayKeyError) {
//       dispatch(getRazorpayKey());
//     }
//   }, [paymentMethod, razorpayKey, razorpayKeyLoading, razorpayKeyError, dispatch]);

//   // Guard: redirect to cart if cart is empty
//   useEffect(() => {
//     if (!loading.quote && cartItems.length === 0 && !placedOrder) {
//       navigate("/", { replace: true });
//     }
//   }, [cartItems.length, placedOrder, loading.quote, navigate]);

//   // Fetch quote when selected address changes and we're on step 2
//   useEffect(() => {
//     if (step === 2 && selectedAddressId && !quote && !loading.quote) {
//       handleFetchQuote();
//     }
//   }, [step, selectedAddressId]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       dispatch(clearCheckoutErrors());
//       dispatch(resetPaymentVerification());
//     };
//   }, [dispatch]);

//   useEffect(()=>{
//     window.scrollTo({ top: 0, behavior: "smooth"})
//   }, [])

//   // -- Handlers --------------------------------------------------------------

//   const handleFetchQuote = async () => {
//     if (!selectedAddressId) return;
//     try {
//       await dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       ).unwrap();
//     } catch (e) {
//       toast.error(e?.message || "Could not get delivery quote", { theme: "dark" });
//     }
//   };

//   const handleStep1Next = () => {
//     if (!selectedAddressId) {
//       toast.error("Please select a delivery address", { theme: "dark" });
//       return;
//     }
//     setStep(2);
//     if (!quote) {
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       );
//     }
//   };

//   const handlePaymentMethodSelect = (method) => {
//     dispatch(setPaymentMethod(method));
//     if (method === "online") {
//       // Reset payment plan to full when switching to online
//       dispatch(setPaymentPlan("full"));
//     }
//     // Re-fetch quote for the new payment method
//     if (quote && selectedAddressId) {
//       dispatch(resetQuote());
//       dispatch(setSelectedAddress(selectedAddressId));
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: method,
//         })
//       );
//     }
//   };

//   const handlePaymentPlanSelect = (plan) => {
//     dispatch(setPaymentPlan(plan));
//     // Re-fetch quote for the new payment plan (affects totals for advance)
//     if (quote && selectedAddressId) {
//       dispatch(resetQuote());
//       dispatch(setSelectedAddress(selectedAddressId));
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       );
//     }
//   };

//   const handlePlaceOrder = async () => {
//     if (!quoteId || !selectedAddressId) {
//       toast.error("Missing quote or address. Please refresh the page.", { theme: "dark" });
//       return;
//     }

//     setIsPlacingOrder(true);

//     try {
//       // Step 1: Confirm the quote
//       const confirmResult = await dispatch(
//         confirmCheckoutQuote({
//           quoteId,
//           paymentMethod,
//           paymentPlan,
//         })
//       ).unwrap();

//       // Step 2: Create order
//       const orderResult = await dispatch(
//         placeOrder({
//           addressId: selectedAddressId,
//           paymentMethod,
//           quoteId: confirmResult.quoteId || quoteId,
//           onlinePaymentMode: paymentPlan,
//         })
//       ).unwrap();

//       // Step 3: Handle based on payment method
//       if (paymentMethod === "cod") {
//         toast.success("?? Order placed successfully!", { theme: "dark", autoClose: 3000 });
//         // Wait a bit before redirecting so user sees success
//         setTimeout(() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }, 1500);
//       } else if (paymentMethod === "online") {
//         // Check if we have razorpay order data
//         if (!orderResult.razorpayOrder) {
//           throw new Error(orderResult.razorpayErrorDetail?.description || "Failed to initiate payment. Please try again.");
//         }
        
//         // Check if razorpay key is available
//         if (!razorpayKey && !razorpayKeyLoading) {
//           await dispatch(getRazorpayKey()).unwrap();
//         }
        
//         if (!razorpayKey && razorpayKeyError) {
//           throw new Error("Payment gateway not configured. Please contact support or try COD.");
//         }
        
//         setRazorpayOrderData(orderResult.razorpayOrder);
//         setShowRazorpay(true);
//       }
//     } catch (e) {
//       const errorMessage = e?.message || "Failed to place order";
      
//       // Handle specific error cases
//       if (e?.code === "QUOTE_STALE") {
//         toast.info("Prices updated � please review and confirm", { theme: "dark" });
//         dispatch(fetchCheckoutQuote({ addressId: selectedAddressId, paymentMethodHint: paymentMethod }));
//       } else if (e?.code === "MISSING_RAZORPAY_ENV") {
//         toast.error("Payment not configured. Please use COD for now.", { theme: "dark" });
//       } else {
//         toast.error(errorMessage, { theme: "dark" });
//       }
      
//       setPaymentError(errorMessage);
//       setShowPaymentErrorModal(true);
//     } finally {
//       setIsPlacingOrder(false);
//     }
//   };

// const handleRazorpaySuccess = async (response) => {
//   // Razorpay modal is already closed by the component
//   // Show loading modal while verifying
//   setShowRazorpay(false);
  
//   try {
//     // Get the orderId from placedOrder or from the response notes
//     const currentOrderId = placedOrder?.order?.orderId || response.notes?.orderId;
    
//     if (!currentOrderId) {
//       throw new Error("Order ID not found. Please contact support.");
//     }
    
//     // Verify payment on backend
//     await dispatch(
//       verifyRazorpayPayment({
//         razorpay_order_id: response.razorpay_order_id,
//         razorpay_payment_id: response.razorpay_payment_id,
//         razorpay_signature: response.razorpay_signature,
//         orderId: currentOrderId,
//       })
//     ).unwrap();
    
//     toast.success("?? Payment successful! Order confirmed.", { theme: "dark", autoClose: 3000 });
    
//     // Clear checkout state and redirect to orders page
//     setTimeout(() => {
//       dispatch(resetCheckout());
//       navigate("/account/userorders");
//     }, 1500);
//   } catch (err) {
//     console.error("Payment verification failed:", err);
//     setPaymentError(err?.message || "Payment verification failed. Please contact support.");
//     setShowPaymentErrorModal(true);
//   }
// };

//   const handleRazorpayFailure = (error) => {
//     setShowRazorpay(false);
//     setPaymentError(error || "Payment failed. Please try again.");
//     setShowPaymentErrorModal(true);
//   };

//   const handleRazorpayClose = () => {
//     setShowRazorpay(false);
//     toast.info("Payment cancelled. You can try again or choose COD.", { theme: "dark" });
//   };

//   const handleRetryPayment = () => {
//     setShowPaymentErrorModal(false);
//     setPaymentError(null);
//     // Retry the order placement
//     handlePlaceOrder();
//   };

//   // -- Order placed � show success screen -----------------------------------
//   if (placedOrder?.order && paymentMethod === "cod" && !paymentVerification.loading) {
//     return (
//       <OrderSuccess
//         order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
//         onViewOrders={() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }}
//       />
//     );
//   }

//   // For online orders, show success only after verification
//   if (placedOrder?.order && paymentMethod === "online" && paymentVerification.success) {
//     return (
//       <OrderSuccess
//         order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
//         onViewOrders={() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }}
//       />
//     );
//   }

//   // Calculate advance amount for display
//   const advanceAmount = quote?.amountPayable ? Math.round(quote.amountPayable * 25 / 100) : 0;

//   // -- Main render ----------------------------------------------------------
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
//         <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
//           <button
//             onClick={() => step === 1 ? navigate(-1) : setStep(1)}
//             className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors cursor-pointer"
//           >
//             <ArrowLeft size={18} />
//             <span className="text-xs font-black uppercase tracking-widest">
//               {step === 1 ? "Back to Cart" : "Back"}
//             </span>
//           </button>

//           <h1 className="text-sm font-black uppercase tracking-widest text-gray-900">
//             Checkout
//           </h1>

//           <div className="flex items-center gap-2">
//             {[
//               { n: 1, label: "Address" },
//               { n: 2, label: "Payment" },
//             ].map(({ n, label }) => (
//               <div key={n} className="flex items-center gap-1.5">
//                 <div
//                   className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
//                     step >= n ? "bg-black text-white" : "bg-gray-100 text-gray-400"
//                   }`}
//                 >
//                   {step > n ? "?" : n}
//                 </div>
//                 <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
//                   step >= n ? "text-gray-900" : "text-gray-400"
//                 }`}>
//                   {label}
//                 </span>
//                 {n < 2 && <ChevronRight size={12} className="text-gray-300" />}
//               </div>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Body */}
//       <div className="max-w-5xl mx-auto px-4 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

//           {/* -- Left Panel -- */}
//           <div className="space-y-6">

//             {/* Global error */}
//             {(error.quote || error.confirm || error.placeOrder) && (
//               <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
//                 <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
//                 <div className="flex-1">
//                   <p className="text-xs font-bold text-red-700">
//                     {error.placeOrder?.message ||
//                       error.confirm?.message ||
//                       error.quote?.message}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => dispatch(clearCheckoutErrors())}
//                   className="text-red-400 hover:text-red-600 cursor-pointer"
//                 >
//                   <X size={14} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 1: Address -- */}
//             {step === 1 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">1</div>
//                   <h2 className="text-lg font-black text-gray-900">Delivery Address</h2>
//                 </div>

//                 <AddressSelector
//                   onAddAddress={() => setShowAddressModal(true)}
//                 />

//                 <button
//                   onClick={handleStep1Next}
//                   disabled={!selectedAddressId}
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   Continue to Payment <ChevronRight size={16} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 2: Payment -- */}
//             {step === 2 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">2</div>
//                   <h2 className="text-lg font-black text-gray-900">Payment Method</h2>
//                 </div>

//                 {/* Selected address summary */}
//                 {selectedAddress && (
//                   <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
//                     <MapPin size={14} className="text-[#F7A221] mt-0.5 flex-shrink-0" />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
//                         Delivering to
//                       </p>
//                       <p className="text-sm font-black text-gray-900">{selectedAddress.fullName}</p>
//                       <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
//                         {[selectedAddress.houseNumber, selectedAddress.area, selectedAddress.city]
//                           .filter(Boolean)
//                           .join(", ")}{" "}
//                         � {selectedAddress.postalCode}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => { setStep(1); }}
//                       className="text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:text-black transition-colors cursor-pointer whitespace-nowrap"
//                     >
//                       Change
//                     </button>
//                   </div>
//                 )}

//                 {/* Payment options */}
//                 <div className="space-y-3">
//                   {/* COD */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("cod")}
//                     className={`w-full text-left p-4 rounded-[24px] border-2 transition-all cursor-pointer ${
//                       paymentMethod === "cod"
//                         ? "border-black bg-black/[0.02]"
//                         : "border-gray-100 hover:border-gray-300"
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
//                         paymentMethod === "cod" ? "border-black bg-black" : "border-gray-300"
//                       }`}>
//                         {paymentMethod === "cod" && <div className="w-2 h-2 bg-white rounded-full" />}
//                       </div>
//                       <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <Banknote size={18} className="text-green-600" />
//                       </div>
//                       <div>
//                         <p className="font-black text-sm text-gray-900">Cash on Delivery</p>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           Pay when your order arrives
//                         </p>
//                       </div>
//                     </div>
//                   </button>

//                   {/* Online / Razorpay */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("online")}
//                     className={`w-full text-left p-4 rounded-[24px] border-2 transition-all cursor-pointer ${
//                       paymentMethod === "online"
//                         ? "border-black bg-black/[0.02]"
//                         : "border-gray-100 hover:border-gray-300"
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
//                         paymentMethod === "online" ? "border-black bg-black" : "border-gray-300"
//                       }`}>
//                         {paymentMethod === "online" && <div className="w-2 h-2 bg-white rounded-full" />}
//                       </div>
//                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <CreditCard size={18} className="text-blue-500" />
//                       </div>
//                       <div>
//                         <p className="font-black text-sm text-gray-900">Pay Online</p>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           UPI, Cards, Net Banking via Razorpay
//                         </p>
//                       </div>
//                     </div>
//                   </button>
//                 </div>

//                 {/* Payment Plan Selector (only for online) */}
//                 {paymentMethod === "online" && (
//                   <div className="mt-5 pt-3 border-t border-gray-100">
//                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
//                       Payment Plan
//                     </p>
//                     <div className="flex gap-3">
//                       <button
//                         onClick={() => handlePaymentPlanSelect("full")}
//                         className={`flex-1 p-3 rounded-xl border-2 transition-all ${
//                           paymentPlan === "full"
//                             ? "border-black bg-black text-white"
//                             : "border-gray-200 bg-white text-gray-700"
//                         }`}
//                       >
//                         <div className="text-center">
//                           <span className="text-xs font-black">Pay Full</span>
//                           <p className="text-[11px] mt-1 opacity-80">{fmt(quote?.amountPayable)}</p>
//                         </div>
//                       </button>
//                       <button
//                         onClick={() => handlePaymentPlanSelect("advance")}
//                         className={`flex-1 p-3 rounded-xl border-2 transition-all ${
//                           paymentPlan === "advance"
//                             ? "border-black bg-black text-white"
//                             : "border-gray-200 bg-white text-gray-700"
//                         }`}
//                       >
//                         <div className="text-center">
//                           <div className="flex items-center justify-center gap-1">
//                             <span className="text-xs font-black">Pay Advance</span>
//                             <Clock size={10} />
//                           </div>
//                           <p className="text-[11px] mt-1 opacity-80">
//                             {fmt(advanceAmount)} + {fmt(quote?.amountPayable - advanceAmount)} later
//                           </p>
//                         </div>
//                       </button>
//                     </div>
//                     {paymentPlan === "advance" && (
//                       <p className="text-[10px] text-blue-500 font-medium mt-2 text-center">
//                         Pay 25% now, remaining at delivery
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* Razorpay key error warning */}
//                 {paymentMethod === "online" && razorpayKeyError && (
//                   <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
//                     <p className="text-[11px] text-yellow-700 font-medium flex items-center gap-2">
//                       <AlertCircle size={12} />
//                       {razorpayKeyError}. Please use COD or try again later.
//                     </p>
//                   </div>
//                 )}

//                 {/* Place order button */}
//                 <button
//                   onClick={handlePlaceOrder}
//                   disabled={
//                     !quote ||
//                     loading.quote ||
//                     loading.confirm ||
//                     loading.placeOrder ||
//                     isPlacingOrder ||
//                     paymentVerification.loading ||
//                     (paymentMethod === "online" && (!razorpayKey && !razorpayKeyLoading && !razorpayKeyError))
//                   }
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   {loading.confirm || loading.placeOrder || isPlacingOrder || paymentVerification.loading ? (
//                     <><Loader2 size={16} className="animate-spin" /> 
//                       {paymentVerification.loading ? "Verifying Payment..." : "Placing Order�"}
//                     </>
//                   ) : loading.quote ? (
//                     <><Loader2 size={16} className="animate-spin" /> Getting Quote�</>
//                   ) : (
//                     <>Place Order � {paymentMethod === "online" && paymentPlan === "advance" ? fmt(advanceAmount) : fmt(quote?.amountPayable)}</>
//                   )}
//                 </button>

//                 <p className="text-center text-[10px] text-gray-400 font-bold mt-3">
//                   By placing this order you agree to our Terms & Conditions
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* -- Right Panel � Order Summary -- */}
//           <div className="space-y-4">
//             <div className="bg-white rounded-[32px] p-6 shadow-sm">
//               <div className="flex items-center gap-2 mb-5">
//                 <ShoppingBag size={16} className="text-gray-400" />
//                 <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
//                   Order Summary
//                 </h3>
//                 <span className="ml-auto text-xs font-black text-gray-400">
//                   {cartCount} item{cartCount !== 1 ? "s" : ""}
//                 </span>
//               </div>

//               {/* Cart items preview */}
//               <div className="space-y-3 mb-5">
//                 {cartItems.slice(0, 3).map((item, i) => {
//                   const matchedVariant = item.product?.variants?.find(
//                     (v) => String(v._id) === String(item.variantId)
//                   ) ?? item.product?.variants?.[0];
//                   const image = matchedVariant?.images?.[0]?.url || null;
//                   const name = item.product?.title || item.product?.name || "Product";
//                   const price = item.price?.sale ?? item.price?.base;

//                   return (
//                     <div key={i} className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
//                         {image ? (
//                           <img src={image} alt={name} className="w-full h-full object-cover" />
//                         ) : (
//                           <div className="w-full h-full flex items-center justify-center">
//                             <Package size={14} className="text-gray-300" />
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
//                         <p className="text-[11px] text-gray-400 font-medium">
//                           Qty: {item.quantity}
//                         </p>
//                       </div>
//                       <p className="text-xs font-black text-gray-900">
//                         {fmt(price * item.quantity)}
//                       </p>
//                     </div>
//                   );
//                 })}
//                 {cartItems.length > 3 && (
//                   <p className="text-[10px] text-gray-400 font-bold text-center">
//                     +{cartItems.length - 3} more item{cartItems.length - 3 > 1 ? "s" : ""}
//                   </p>
//                 )}
//               </div>

//               <div className="border-t border-gray-100 pt-4">
//                 {loading.quote && (
//                   <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
//                     <Loader2 size={14} className="animate-spin" />
//                     <span className="text-xs font-bold">Calculating totals�</span>
//                   </div>
//                 )}

//                 {error.quote && !loading.quote && (
//                   <div className="space-y-3">
//                     <p className="text-xs text-red-500 font-bold">{error.quote.message}</p>
//                     {selectedAddressId && (
//                       <button
//                         onClick={handleFetchQuote}
//                         className="w-full py-3 text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black border border-[#F7A221] rounded-2xl transition-colors cursor-pointer"
//                       >
//                         Retry Quote
//                       </button>
//                     )}
//                   </div>
//                 )}

//                 {quote && !loading.quote && (
//                   <PriceBreakdown
//                     quote={quote}
//                     itemCount={cartCount}
//                     paymentMethod={paymentMethod}
//                     paymentPlan={paymentPlan}
//                     compact
//                   />
//                 )}

//                 {!quote && !loading.quote && !error.quote && step === 1 && (
//                   <div className="text-center py-2">
//                     <p className="text-xs text-gray-400 font-medium">
//                       Select an address to see delivery charges & final total
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {quote?.deliveryEstimate && (
//               <div className="bg-white rounded-[28px] p-5 shadow-sm flex items-center gap-3">
//                 <Truck size={18} className="text-[#F7A221] flex-shrink-0" />
//                 <div>
//                   <p className="text-xs font-black text-gray-900">Estimated Delivery</p>
//                   <p className="text-[11px] text-gray-500 font-medium mt-0.5">
//                     {quote.deliveryEstimate}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Address form modal */}
//       {showAddressModal && (
//         <AddressFormModal
//           initial={null}
//           onSubmit={async () => {
//             setShowAddressModal(false);
//           }}
//           onClose={() => setShowAddressModal(false)}
//           isSaving={false}
//           error={null}
//         />
//       )}

//       {/* Razorpay Checkout Modal */}
//       {showRazorpay && razorpayOrderData && razorpayKey && (
//         <RazorpayCheckout
//           razorpayOrder={razorpayOrderData}
//           razorpayKey={razorpayKey}
//           orderId={placedOrder?.order?.orderId}
//           totalAmount={quote?.amountPayable}
//           userEmail={user?.email}
//           userName={user?.name}
//           userPhone={selectedAddress?.phone}
//           onSuccess={handleRazorpaySuccess}
//           onFailure={handleRazorpayFailure}
//           onClose={handleRazorpayClose}
//           onRetry={handleRetryPayment}
//         />
//       )}

//       {/* Payment verification loading */}
//       {paymentVerification.loading && (
//         <PaymentLoadingModal message="Verifying your payment..." />
//       )}

//       {/* Payment Error Modal */}
//       {showPaymentErrorModal && (
//         <PaymentErrorModal
//           error={paymentError}
//           onRetry={handleRetryPayment}
//           onClose={() => {
//             setShowPaymentErrorModal(false);
//             setPaymentError(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// export default Checkout;


// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   ChevronRight, ChevronLeft, Loader2, MapPin,
//   CreditCard, Truck, CheckCircle2, Package,
//   AlertCircle, ArrowLeft, ShoppingBag, Banknote,
//   X, Clock,
// } from "lucide-react";

// // Redux � checkout
// import {
//   fetchCheckoutQuote,
//   confirmCheckoutQuote,
//   placeOrder,
//   setSelectedAddress,
//   setPaymentMethod,
//   setPaymentPlan,
//   resetCheckout,
//   resetQuote ,
//   clearCheckoutErrors,
//   selectQuote,
//   selectQuoteId,
//   selectConfirmed,
//   selectPlacedOrder,
//   selectSelectedAddressId,
//   selectPaymentMethod,
//   selectPaymentPlan,
//   selectCheckoutLoading,
//   selectCheckoutError,
//   getRazorpayKey,
//   selectRazorpayKey,
//   selectRazorpayKeyLoading,
//   selectRazorpayKeyError,
//   verifyRazorpayPayment,
//   selectPaymentVerification,
//   resetPaymentVerification,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";

// // Redux � address
// import {
//   selectDefaultAddress,
//   selectOtherAddresses,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";

// // Redux � cart
// import {
//   selectCartItems,
//   selectDisplayCartCount,
//   selectCartTotalAmount,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// // Redux � auth
// import { selectUser } from "../../components/REDUX_FEATURES/REDUX_SLICES/authSlice";

// // Components
// import AddressSelector from "./AddressSelector/AddressSelector";
// import PriceBreakdown from "./PriceBreakdown/PriceBreakdown";
// import AddressFormModal from "../User_Dash_Segment/UserSubPages/UserAddress";
// import RazorpayCheckout, { PaymentErrorModal, PaymentLoadingModal } from "./RazorpayCheckout/RazorpayCheckout";

// const fmt = (n) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(n ?? 0);

// // -----------------------------------------------------------------------------
// // Order Success Screen
// // -----------------------------------------------------------------------------
// const OrderSuccess = ({ order, onViewOrders }) => (
//   <div className="min-h-screen bg-white flex items-center justify-center p-6">
//     <div className="max-w-md w-full text-center space-y-6">
//       <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto">
//         <CheckCircle2 size={48} className="text-green-500" />
//       </div>
//       <div>
//         <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed!</h1>
//         <p className="text-gray-500 font-medium mt-2">
//           {order.paymentMethod === "cod" 
//             ? "We've received your order and will process it shortly."
//             : "Payment successful! Your order has been confirmed."}
//         </p>
//       </div>
//       <div className="bg-gray-50 rounded-[28px] p-6 text-left space-y-3">
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Order ID</span>
//           <span className="text-sm font-black text-gray-900">{order.orderId}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">
//             {order.paymentMethod === "cod" ? "Total Amount" : "Amount Paid"}
//           </span>
//           <span className="text-sm font-black text-gray-900">{fmt(order.totalAmount)}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Payment</span>
//           <span className="text-sm font-black text-gray-900 uppercase">
//             {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
//           </span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Status</span>
//           <span className="text-xs font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
//             {order.orderStatus === "confirmed" ? "Confirmed" : order.orderStatus}
//           </span>
//         </div>
//       </div>
//       <div className="flex gap-3">
//         <button
//           onClick={onViewOrders}
//           className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           View Orders
//         </button>
//         <a
//           href="/"
//           className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-600 hover:border-black hover:text-black transition-all text-center cursor-pointer"
//         >
//           Continue Shopping
//         </a>
//       </div>
//     </div>
//   </div>
// );

// // -----------------------------------------------------------------------------
// // Checkout � Main Page
// // -----------------------------------------------------------------------------
// const Checkout = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // Redux state
//   const quote = useSelector(selectQuote);
//   const quoteId = useSelector(selectQuoteId);
//   const confirmed = useSelector(selectConfirmed);
//   const placedOrder = useSelector(selectPlacedOrder);
//   const selectedAddressId = useSelector(selectSelectedAddressId);
//   const paymentMethod = useSelector(selectPaymentMethod);
//   const paymentPlan = useSelector(selectPaymentPlan);
//   const loading = useSelector(selectCheckoutLoading);
//   const error = useSelector(selectCheckoutError);
//   const razorpayKey = useSelector(selectRazorpayKey);
//   const razorpayKeyLoading = useSelector(selectRazorpayKeyLoading);
//   const razorpayKeyError = useSelector(selectRazorpayKeyError);
//   const paymentVerification = useSelector(selectPaymentVerification);

//   const defaultAddr = useSelector(selectDefaultAddress);
//   const otherAddrs = useSelector(selectOtherAddresses);
//   const cartItems = useSelector(selectCartItems);
//   const cartCount = useSelector(selectDisplayCartCount);
//   const user = useSelector(selectUser);

//   // Local state
//   const [step, setStep] = useState(1);
//   const [showAddressModal, setShowAddressModal] = useState(false);
//   const [showRazorpay, setShowRazorpay] = useState(false);
//   const [razorpayOrderData, setRazorpayOrderData] = useState(null);
//   const [paymentError, setPaymentError] = useState(null);
//   const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
//   const [isPlacingOrder, setIsPlacingOrder] = useState(false);

//   const allAddresses = [
//     ...(defaultAddr ? [defaultAddr] : []),
//     ...otherAddrs,
//   ];
//   const selectedAddress = allAddresses.find((a) => a._id === selectedAddressId);

//   // Fetch Razorpay key when online payment is selected
//   useEffect(() => {
//     if (paymentMethod === "online" && !razorpayKey && !razorpayKeyLoading && !razorpayKeyError) {
//       dispatch(getRazorpayKey());
//     }
//   }, [paymentMethod, razorpayKey, razorpayKeyLoading, razorpayKeyError, dispatch]);

//   // Guard: redirect to cart if cart is empty
//   useEffect(() => {
//     if (!loading.quote && cartItems.length === 0 && !placedOrder) {
//       navigate("/", { replace: true });
//     }
//   }, [cartItems.length, placedOrder, loading.quote, navigate]);

//   // Fetch quote when selected address changes and we're on step 2
//   useEffect(() => {
//     if (step === 2 && selectedAddressId && !quote && !loading.quote) {
//       handleFetchQuote();
//     }
//   }, [step, selectedAddressId]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       dispatch(clearCheckoutErrors());
//       dispatch(resetPaymentVerification());
//     };
//   }, [dispatch]);

//   // -- Handlers --------------------------------------------------------------

//   const handleFetchQuote = async () => {
//     if (!selectedAddressId) return;
//     try {
//       await dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       ).unwrap();
//     } catch (e) {
//       toast.error(e?.message || "Could not get delivery quote", { theme: "dark" });
//     }
//   };

//   const handleStep1Next = () => {
//     if (!selectedAddressId) {
//       toast.error("Please select a delivery address", { theme: "dark" });
//       return;
//     }
//     setStep(2);
//     if (!quote) {
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       );
//     }
//   };

//   const handlePaymentMethodSelect = (method) => {
//     dispatch(setPaymentMethod(method));
//     if (method === "online") {
//       // Reset payment plan to full when switching to online
//       dispatch(setPaymentPlan("full"));
//     }
//     // Re-fetch quote for the new payment method
//     if (quote && selectedAddressId) {
//       dispatch(resetQuote());
//       dispatch(setSelectedAddress(selectedAddressId));
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: method,
//         })
//       );
//     }
//   };

//   const handlePaymentPlanSelect = (plan) => {
//     dispatch(setPaymentPlan(plan));
//     // Re-fetch quote for the new payment plan (affects totals for advance)
//     if (quote && selectedAddressId) {
//       dispatch(resetQuote());
//       dispatch(setSelectedAddress(selectedAddressId));
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: paymentMethod,
//         })
//       );
//     }
//   };

//   const handlePlaceOrder = async () => {
//     if (!quoteId || !selectedAddressId) {
//       toast.error("Missing quote or address. Please refresh the page.", { theme: "dark" });
//       return;
//     }

//     setIsPlacingOrder(true);

//     try {
//       // Step 1: Confirm the quote
//       const confirmResult = await dispatch(
//         confirmCheckoutQuote({
//           quoteId,
//           paymentMethod,
//           paymentPlan,
//         })
//       ).unwrap();

//       // Step 2: Create order
//       const orderResult = await dispatch(
//         placeOrder({
//           addressId: selectedAddressId,
//           paymentMethod,
//           quoteId: confirmResult.quoteId || quoteId,
//           onlinePaymentMode: paymentPlan,
//         })
//       ).unwrap();

//       // Step 3: Handle based on payment method
//       if (paymentMethod === "cod") {
//         toast.success("?? Order placed successfully!", { theme: "dark", autoClose: 3000 });
//         // Wait a bit before redirecting so user sees success
//         setTimeout(() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }, 1500);
//       } else if (paymentMethod === "online") {
//         // Check if we have razorpay order data
//         if (!orderResult.razorpayOrder) {
//           throw new Error(orderResult.razorpayErrorDetail?.description || "Failed to initiate payment. Please try again.");
//         }
        
//         // Check if razorpay key is available
//         if (!razorpayKey && !razorpayKeyLoading) {
//           await dispatch(getRazorpayKey()).unwrap();
//         }
        
//         if (!razorpayKey && razorpayKeyError) {
//           throw new Error("Payment gateway not configured. Please contact support or try COD.");
//         }
        
//         setRazorpayOrderData(orderResult.razorpayOrder);
//         setShowRazorpay(true);
//       }
//     } catch (e) {
//       const errorMessage = e?.message || "Failed to place order";
      
//       // Handle specific error cases
//       if (e?.code === "QUOTE_STALE") {
//         toast.info("Prices updated � please review and confirm", { theme: "dark" });
//         dispatch(fetchCheckoutQuote({ addressId: selectedAddressId, paymentMethodHint: paymentMethod }));
//       } else if (e?.code === "MISSING_RAZORPAY_ENV") {
//         toast.error("Payment not configured. Please use COD for now.", { theme: "dark" });
//       } else {
//         toast.error(errorMessage, { theme: "dark" });
//       }
      
//       setPaymentError(errorMessage);
//       setShowPaymentErrorModal(true);
//     } finally {
//       setIsPlacingOrder(false);
//     }
//   };

//   const handleRazorpaySuccess = async (response) => {
//     setShowRazorpay(false);
    
//     try {
//       // Verify payment on backend
//       await dispatch(
//         verifyRazorpayPayment({
//           razorpay_order_id: response.razorpay_order_id,
//           razorpay_payment_id: response.razorpay_payment_id,
//           razorpay_signature: response.razorpay_signature,
//           orderId: placedOrder?.order?.orderId,
//         })
//       ).unwrap();
      
//       toast.success("?? Payment successful! Order confirmed.", { theme: "dark", autoClose: 3000 });
      
//       // Clear checkout state and redirect
//       setTimeout(() => {
//         dispatch(resetCheckout());
//         navigate("/account/userorders");
//       }, 1500);
//     } catch (err) {
//       console.error("Payment verification failed:", err);
//       setPaymentError(err?.message || "Payment verification failed. Please contact support.");
//       setShowPaymentErrorModal(true);
//     }
//   };

//   const handleRazorpayFailure = (error) => {
//     setShowRazorpay(false);
//     setPaymentError(error || "Payment failed. Please try again.");
//     setShowPaymentErrorModal(true);
//   };

//   const handleRazorpayClose = () => {
//     setShowRazorpay(false);
//     toast.info("Payment cancelled. You can try again or choose COD.", { theme: "dark" });
//   };

//   const handleRetryPayment = () => {
//     setShowPaymentErrorModal(false);
//     setPaymentError(null);
//     // Retry the order placement
//     handlePlaceOrder();
//   };

//   // -- Order placed � show success screen -----------------------------------
//   if (placedOrder?.order && paymentMethod === "cod" && !paymentVerification.loading) {
//     return (
//       <OrderSuccess
//         order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
//         onViewOrders={() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }}
//       />
//     );
//   }

//   // For online orders, show success only after verification
//   if (placedOrder?.order && paymentMethod === "online" && paymentVerification.success) {
//     return (
//       <OrderSuccess
//         order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
//         onViewOrders={() => {
//           dispatch(resetCheckout());
//           navigate("/account/userorders");
//         }}
//       />
//     );
//   }

//   // Calculate advance amount for display
//   const advanceAmount = quote?.amountPayable ? Math.round(quote.amountPayable * 25 / 100) : 0;

//   // -- Main render ----------------------------------------------------------
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
//         <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
//           <button
//             onClick={() => step === 1 ? navigate(-1) : setStep(1)}
//             className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors cursor-pointer"
//           >
//             <ArrowLeft size={18} />
//             <span className="text-xs font-black uppercase tracking-widest">
//               {step === 1 ? "Back to Cart" : "Back"}
//             </span>
//           </button>

//           <h1 className="text-sm font-black uppercase tracking-widest text-gray-900">
//             Checkout
//           </h1>

//           <div className="flex items-center gap-2">
//             {[
//               { n: 1, label: "Address" },
//               { n: 2, label: "Payment" },
//             ].map(({ n, label }) => (
//               <div key={n} className="flex items-center gap-1.5">
//                 <div
//                   className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
//                     step >= n ? "bg-black text-white" : "bg-gray-100 text-gray-400"
//                   }`}
//                 >
//                   {step > n ? "?" : n}
//                 </div>
//                 <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
//                   step >= n ? "text-gray-900" : "text-gray-400"
//                 }`}>
//                   {label}
//                 </span>
//                 {n < 2 && <ChevronRight size={12} className="text-gray-300" />}
//               </div>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Body */}
//       <div className="max-w-5xl mx-auto px-4 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

//           {/* -- Left Panel -- */}
//           <div className="space-y-6">

//             {/* Global error */}
//             {(error.quote || error.confirm || error.placeOrder) && (
//               <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
//                 <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
//                 <div className="flex-1">
//                   <p className="text-xs font-bold text-red-700">
//                     {error.placeOrder?.message ||
//                       error.confirm?.message ||
//                       error.quote?.message}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => dispatch(clearCheckoutErrors())}
//                   className="text-red-400 hover:text-red-600 cursor-pointer"
//                 >
//                   <X size={14} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 1: Address -- */}
//             {step === 1 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">1</div>
//                   <h2 className="text-lg font-black text-gray-900">Delivery Address</h2>
//                 </div>

//                 <AddressSelector
//                   onAddAddress={() => setShowAddressModal(true)}
//                 />

//                 <button
//                   onClick={handleStep1Next}
//                   disabled={!selectedAddressId}
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   Continue to Payment <ChevronRight size={16} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 2: Payment -- */}
//             {step === 2 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">2</div>
//                   <h2 className="text-lg font-black text-gray-900">Payment Method</h2>
//                 </div>

//                 {/* Selected address summary */}
//                 {selectedAddress && (
//                   <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
//                     <MapPin size={14} className="text-[#F7A221] mt-0.5 flex-shrink-0" />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
//                         Delivering to
//                       </p>
//                       <p className="text-sm font-black text-gray-900">{selectedAddress.fullName}</p>
//                       <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
//                         {[selectedAddress.houseNumber, selectedAddress.area, selectedAddress.city]
//                           .filter(Boolean)
//                           .join(", ")}{" "}
//                         � {selectedAddress.postalCode}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => { setStep(1); }}
//                       className="text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:text-black transition-colors cursor-pointer whitespace-nowrap"
//                     >
//                       Change
//                     </button>
//                   </div>
//                 )}

//                 {/* Payment options */}
//                 <div className="space-y-3">
//                   {/* COD */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("cod")}
//                     className={`w-full text-left p-4 rounded-[24px] border-2 transition-all cursor-pointer ${
//                       paymentMethod === "cod"
//                         ? "border-black bg-black/[0.02]"
//                         : "border-gray-100 hover:border-gray-300"
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
//                         paymentMethod === "cod" ? "border-black bg-black" : "border-gray-300"
//                       }`}>
//                         {paymentMethod === "cod" && <div className="w-2 h-2 bg-white rounded-full" />}
//                       </div>
//                       <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <Banknote size={18} className="text-green-600" />
//                       </div>
//                       <div>
//                         <p className="font-black text-sm text-gray-900">Cash on Delivery</p>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           Pay when your order arrives
//                         </p>
//                       </div>
//                     </div>
//                   </button>

//                   {/* Online / Razorpay */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("online")}
//                     className={`w-full text-left p-4 rounded-[24px] border-2 transition-all cursor-pointer ${
//                       paymentMethod === "online"
//                         ? "border-black bg-black/[0.02]"
//                         : "border-gray-100 hover:border-gray-300"
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
//                         paymentMethod === "online" ? "border-black bg-black" : "border-gray-300"
//                       }`}>
//                         {paymentMethod === "online" && <div className="w-2 h-2 bg-white rounded-full" />}
//                       </div>
//                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <CreditCard size={18} className="text-blue-500" />
//                       </div>
//                       <div>
//                         <p className="font-black text-sm text-gray-900">Pay Online</p>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           UPI, Cards, Net Banking via Razorpay
//                         </p>
//                       </div>
//                     </div>
//                   </button>
//                 </div>

//                 {/* Payment Plan Selector (only for online) */}
//                 {paymentMethod === "online" && (
//                   <div className="mt-5 pt-3 border-t border-gray-100">
//                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
//                       Payment Plan
//                     </p>
//                     <div className="flex gap-3">
//                       <button
//                         onClick={() => handlePaymentPlanSelect("full")}
//                         className={`flex-1 p-3 rounded-xl border-2 transition-all ${
//                           paymentPlan === "full"
//                             ? "border-black bg-black text-white"
//                             : "border-gray-200 bg-white text-gray-700"
//                         }`}
//                       >
//                         <div className="text-center">
//                           <span className="text-xs font-black">Pay Full</span>
//                           <p className="text-[11px] mt-1 opacity-80">{fmt(quote?.amountPayable)}</p>
//                         </div>
//                       </button>
//                       <button
//                         onClick={() => handlePaymentPlanSelect("advance")}
//                         className={`flex-1 p-3 rounded-xl border-2 transition-all ${
//                           paymentPlan === "advance"
//                             ? "border-black bg-black text-white"
//                             : "border-gray-200 bg-white text-gray-700"
//                         }`}
//                       >
//                         <div className="text-center">
//                           <div className="flex items-center justify-center gap-1">
//                             <span className="text-xs font-black">Pay Advance</span>
//                             <Clock size={10} />
//                           </div>
//                           <p className="text-[11px] mt-1 opacity-80">
//                             {fmt(advanceAmount)} + {fmt(quote?.amountPayable - advanceAmount)} later
//                           </p>
//                         </div>
//                       </button>
//                     </div>
//                     {paymentPlan === "advance" && (
//                       <p className="text-[10px] text-blue-500 font-medium mt-2 text-center">
//                         Pay 25% now, remaining at delivery
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* Razorpay key error warning */}
//                 {paymentMethod === "online" && razorpayKeyError && (
//                   <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
//                     <p className="text-[11px] text-yellow-700 font-medium flex items-center gap-2">
//                       <AlertCircle size={12} />
//                       {razorpayKeyError}. Please use COD or try again later.
//                     </p>
//                   </div>
//                 )}

//                 {/* Place order button */}
//                 <button
//                   onClick={handlePlaceOrder}
//                   disabled={
//                     !quote ||
//                     loading.quote ||
//                     loading.confirm ||
//                     loading.placeOrder ||
//                     isPlacingOrder ||
//                     paymentVerification.loading ||
//                     (paymentMethod === "online" && (!razorpayKey && !razorpayKeyLoading && !razorpayKeyError))
//                   }
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   {loading.confirm || loading.placeOrder || isPlacingOrder || paymentVerification.loading ? (
//                     <><Loader2 size={16} className="animate-spin" /> 
//                       {paymentVerification.loading ? "Verifying Payment..." : "Placing Order�"}
//                     </>
//                   ) : loading.quote ? (
//                     <><Loader2 size={16} className="animate-spin" /> Getting Quote�</>
//                   ) : (
//                     <>Place Order � {paymentMethod === "online" && paymentPlan === "advance" ? fmt(advanceAmount) : fmt(quote?.amountPayable)}</>
//                   )}
//                 </button>

//                 <p className="text-center text-[10px] text-gray-400 font-bold mt-3">
//                   By placing this order you agree to our Terms & Conditions
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* -- Right Panel � Order Summary -- */}
//           <div className="space-y-4">
//             <div className="bg-white rounded-[32px] p-6 shadow-sm">
//               <div className="flex items-center gap-2 mb-5">
//                 <ShoppingBag size={16} className="text-gray-400" />
//                 <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
//                   Order Summary
//                 </h3>
//                 <span className="ml-auto text-xs font-black text-gray-400">
//                   {cartCount} item{cartCount !== 1 ? "s" : ""}
//                 </span>
//               </div>

//               {/* Cart items preview */}
//               <div className="space-y-3 mb-5">
//                 {cartItems.slice(0, 3).map((item, i) => {
//                   const matchedVariant = item.product?.variants?.find(
//                     (v) => String(v._id) === String(item.variantId)
//                   ) ?? item.product?.variants?.[0];
//                   const image = matchedVariant?.images?.[0]?.url || null;
//                   const name = item.product?.title || item.product?.name || "Product";
//                   const price = item.price?.sale ?? item.price?.base;

//                   return (
//                     <div key={i} className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
//                         {image ? (
//                           <img src={image} alt={name} className="w-full h-full object-cover" />
//                         ) : (
//                           <div className="w-full h-full flex items-center justify-center">
//                             <Package size={14} className="text-gray-300" />
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
//                         <p className="text-[11px] text-gray-400 font-medium">
//                           Qty: {item.quantity}
//                         </p>
//                       </div>
//                       <p className="text-xs font-black text-gray-900">
//                         {fmt(price * item.quantity)}
//                       </p>
//                     </div>
//                   );
//                 })}
//                 {cartItems.length > 3 && (
//                   <p className="text-[10px] text-gray-400 font-bold text-center">
//                     +{cartItems.length - 3} more item{cartItems.length - 3 > 1 ? "s" : ""}
//                   </p>
//                 )}
//               </div>

//               <div className="border-t border-gray-100 pt-4">
//                 {loading.quote && (
//                   <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
//                     <Loader2 size={14} className="animate-spin" />
//                     <span className="text-xs font-bold">Calculating totals�</span>
//                   </div>
//                 )}

//                 {error.quote && !loading.quote && (
//                   <div className="space-y-3">
//                     <p className="text-xs text-red-500 font-bold">{error.quote.message}</p>
//                     {selectedAddressId && (
//                       <button
//                         onClick={handleFetchQuote}
//                         className="w-full py-3 text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black border border-[#F7A221] rounded-2xl transition-colors cursor-pointer"
//                       >
//                         Retry Quote
//                       </button>
//                     )}
//                   </div>
//                 )}

//                 {quote && !loading.quote && (
//                   <PriceBreakdown
//                     quote={quote}
//                     itemCount={cartCount}
//                     paymentMethod={paymentMethod}
//                     paymentPlan={paymentPlan}
//                     compact
//                   />
//                 )}

//                 {!quote && !loading.quote && !error.quote && step === 1 && (
//                   <div className="text-center py-2">
//                     <p className="text-xs text-gray-400 font-medium">
//                       Select an address to see delivery charges & final total
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {quote?.deliveryEstimate && (
//               <div className="bg-white rounded-[28px] p-5 shadow-sm flex items-center gap-3">
//                 <Truck size={18} className="text-[#F7A221] flex-shrink-0" />
//                 <div>
//                   <p className="text-xs font-black text-gray-900">Estimated Delivery</p>
//                   <p className="text-[11px] text-gray-500 font-medium mt-0.5">
//                     {quote.deliveryEstimate}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Address form modal */}
//       {showAddressModal && (
//         <AddressFormModal
//           initial={null}
//           onSubmit={async () => {
//             setShowAddressModal(false);
//           }}
//           onClose={() => setShowAddressModal(false)}
//           isSaving={false}
//           error={null}
//         />
//       )}

//       {/* Razorpay Checkout Modal */}
//       {showRazorpay && razorpayOrderData && razorpayKey && (
//         <RazorpayCheckout
//           razorpayOrder={razorpayOrderData}
//           razorpayKey={razorpayKey}
//           orderId={placedOrder?.order?.orderId}
//           totalAmount={quote?.amountPayable}
//           userEmail={user?.email}
//           userName={user?.name}
//           userPhone={selectedAddress?.phone}
//           onSuccess={handleRazorpaySuccess}
//           onFailure={handleRazorpayFailure}
//           onClose={handleRazorpayClose}
//           onRetry={handleRetryPayment}
//         />
//       )}

//       {/* Payment verification loading */}
//       {paymentVerification.loading && (
//         <PaymentLoadingModal message="Verifying your payment..." />
//       )}

//       {/* Payment Error Modal */}
//       {showPaymentErrorModal && (
//         <PaymentErrorModal
//           error={paymentError}
//           onRetry={handleRetryPayment}
//           onClose={() => {
//             setShowPaymentErrorModal(false);
//             setPaymentError(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// export default Checkout;
// upper code getting update by addding online razropay etc >>?>?>?>?>???????????>>>>>>>>>>>>>>>>>>>>>

// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import {
//   ChevronRight, ChevronLeft, Loader2, MapPin,
//   CreditCard, Truck, CheckCircle2, Package,
//   AlertCircle, ArrowLeft, ShoppingBag, Banknote,
//   X,
// } from "lucide-react";

// // Redux � checkout
// import {
//   fetchCheckoutQuote,
//   confirmCheckoutQuote,
//   placeOrder,
//   setSelectedAddress,
//   setPaymentMethod,
//   resetCheckout,
//   clearCheckoutErrors,
//   selectQuote,
//   selectQuoteId,
//   selectConfirmed,
//   selectPlacedOrder,
//   selectSelectedAddressId,
//   selectPaymentMethod,
//   selectCheckoutLoading,
//   selectCheckoutError,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";

// // Redux � address
// import {
//   selectDefaultAddress,
//   selectOtherAddresses,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/Useraddressslice";

// // Redux � cart
// import {
//   selectCartItems,
//   selectDisplayCartCount,
//   selectCartTotalAmount,
// } from "../../components/REDUX_FEATURES/REDUX_SLICES/userCartSlice";

// // Components
// import AddressSelector from "./AddressSelector/AddressSelector";
// import PriceBreakdown from "./PriceBreakdown/PriceBreakdown";
// import AddressFormModal from "../User_Dash_Segment/UserSubPages/UserAddress"; // reuse existing modal

// const fmt = (n) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(n ?? 0);

// // -----------------------------------------------------------------------------
// // Coming Soon Modal � for online/Razorpay
// // -----------------------------------------------------------------------------
// const ComingSoonModal = ({ onClose }) => (
//   <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
//     <div className="relative bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center">
//       <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
//         <CreditCard size={28} className="text-[#F7A221]" />
//       </div>
//       <h3 className="text-xl font-black text-gray-900 mb-2">Coming Soon!</h3>
//       <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
//         Online payment via Razorpay is coming very soon. For now, please use
//         Cash on Delivery.
//       </p>
//       <button
//         onClick={onClose}
//         className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//       >
//         Got it, use COD
//       </button>
//     </div>
//   </div>
// );

// // -----------------------------------------------------------------------------
// // Order Success Screen
// // -----------------------------------------------------------------------------
// const OrderSuccess = ({ order, onViewOrders }) => (
//   <div className="min-h-screen bg-white flex items-center justify-center p-6">
//     <div className="max-w-md w-full text-center space-y-6">
//       {/* Animated checkmark */}
//       <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto">
//         <CheckCircle2 size={48} className="text-green-500" />
//       </div>

//       <div>
//         <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed!</h1>
//         <p className="text-gray-500 font-medium mt-2">
//           We've received your order and will process it shortly.
//         </p>
//       </div>

//       {/* Order summary card */}
//       <div className="bg-gray-50 rounded-[28px] p-6 text-left space-y-3">
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Order ID</span>
//           <span className="text-sm font-black text-gray-900">{order.orderId}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total Paid</span>
//           <span className="text-sm font-black text-gray-900">{fmt(order.totalAmount)}</span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Payment</span>
//           <span className="text-sm font-black text-gray-900 uppercase">
//             {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
//           </span>
//         </div>
//         <div className="flex justify-between items-center">
//           <span className="text-xs font-black uppercase tracking-widest text-gray-400">Status</span>
//           <span className="text-xs font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
//             {order.orderStatus}
//           </span>
//         </div>
//       </div>

//       <div className="flex gap-3">
//         <button
//           onClick={onViewOrders}
//           className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           View Orders
//         </button>
//         <a
//           href="/"
//           className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-600 hover:border-black hover:text-black transition-all text-center cursor-pointer"
//         >
//           Continue Shopping
//         </a>
//       </div>
//     </div>
//   </div>
// );

// // -----------------------------------------------------------------------------
// // Checkout � Main Page
// // -----------------------------------------------------------------------------
// const Checkout = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   // Redux state
//   const quote = useSelector(selectQuote);
//   const quoteId = useSelector(selectQuoteId);
//   const confirmed = useSelector(selectConfirmed);
//   const placedOrder = useSelector(selectPlacedOrder);
//   const selectedAddressId = useSelector(selectSelectedAddressId);
//   const paymentMethod = useSelector(selectPaymentMethod);
//   const loading = useSelector(selectCheckoutLoading);
//   const error = useSelector(selectCheckoutError);

//   const defaultAddr = useSelector(selectDefaultAddress);
//   const otherAddrs = useSelector(selectOtherAddresses);
//   const cartItems = useSelector(selectCartItems);
//   const cartCount = useSelector(selectDisplayCartCount);
//   const cartTotal = useSelector(selectCartTotalAmount);

//   // Local state
//   const [step, setStep] = useState(1); // 1 = address, 2 = payment
//   const [showAddressModal, setShowAddressModal] = useState(false);
//   const [showComingSoon, setShowComingSoon] = useState(false);

//   // Build full address list for display
//   const allAddresses = [
//     ...(defaultAddr ? [defaultAddr] : []),
//     ...otherAddrs,
//   ];

//   const selectedAddress = allAddresses.find((a) => a._id === selectedAddressId);

//   // Guard: redirect to cart if cart is empty
//   useEffect(() => {
//     if (!loading.quote && cartItems.length === 0 && !placedOrder) {
//       navigate("/", { replace: true });
//     }
//   }, [cartItems.length, placedOrder, loading.quote, navigate]);

//   // Fetch quote whenever selected address changes and we're on step 2
//   useEffect(() => {
//     if (step === 2 && selectedAddressId && !quote && !loading.quote) {
//       handleFetchQuote();
//     }
//   }, [step, selectedAddressId]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       dispatch(clearCheckoutErrors());
//     };
//   }, [dispatch]);

//   // -- Handlers --------------------------------------------------------------

//   const handleFetchQuote = async () => {
//     if (!selectedAddressId) return;
//     try {
//       await dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: "cod",
//         })
//       ).unwrap();
//     } catch (e) {
//       toast.error(e?.message || "Could not get delivery quote", { theme: "dark" });
//     }
//   };

//   const handleStep1Next = () => {
//     if (!selectedAddressId) {
//       toast.error("Please select a delivery address", { theme: "dark" });
//       return;
//     }
//     setStep(2);
//     // Fetch quote for selected address
//     if (!quote) {
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: "cod",
//         })
//       );
//     }
//   };

//   const handlePaymentMethodSelect = (method) => {
//     if (method === "online") {
//       setShowComingSoon(true);
//       return;
//     }
//     dispatch(setPaymentMethod(method));
//     // Re-fetch quote if method changed and quote exists
//     if (quote && selectedAddressId) {
//       dispatch(resetCheckout());
//       dispatch(setSelectedAddress(selectedAddressId));
//       dispatch(
//         fetchCheckoutQuote({
//           addressId: selectedAddressId,
//           paymentMethodHint: method,
//         })
//       );
//     }
//   };

//   const handlePlaceOrder = async () => {
//     if (!quoteId || !selectedAddressId) return;

//     try {
//       // Step 1: Confirm the quote
//       const confirmResult = await dispatch(
//         confirmCheckoutQuote({
//           quoteId,
//           paymentMethod: "cod",
//           paymentPlan: "full",
//         })
//       ).unwrap();

//       // Step 2: Place the order using the confirmed quoteId
//       await dispatch(
//         placeOrder({
//           addressId: selectedAddressId,
//           paymentMethod: "cod",
//           quoteId: confirmResult.quoteId || quoteId,
//         })
//       ).unwrap();

//       toast.success("?? Order placed successfully!", { theme: "dark", autoClose: 3000 });
//     } catch (e) {
//       const msg = e?.message || "Failed to place order";

//       // If quote stale � re-fetch automatically
//       if (e?.code === "QUOTE_STALE") {
//         toast.info("Prices updated � please review and confirm", { theme: "dark" });
//         dispatch(fetchCheckoutQuote({ addressId: selectedAddressId, paymentMethodHint: "cod" }));
//         return;
//       }

//       toast.error(msg, { theme: "dark" });
//     }
//   };

//   // -- Order placed � show success screen -----------------------------------
//   if (placedOrder?.order) {
//     return (
//       <OrderSuccess
//         order={{ ...placedOrder.order, paymentMethod: placedOrder.paymentMethod }}
//         onViewOrders={() => {
//           dispatch(resetCheckout());
//           navigate("/account/orders");
//         }}
//       />
//     );
//   }

//   // -- Main render ----------------------------------------------------------
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
//         <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
//           <button
//             onClick={() => step === 1 ? navigate(-1) : setStep(1)}
//             className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors cursor-pointer"
//           >
//             <ArrowLeft size={18} />
//             <span className="text-xs font-black uppercase tracking-widest">
//               {step === 1 ? "Back to Cart" : "Back"}
//             </span>
//           </button>

//           <h1 className="text-sm font-black uppercase tracking-widest text-gray-900">
//             Checkout
//           </h1>

//           {/* Step indicators */}
//           <div className="flex items-center gap-2">
//             {[
//               { n: 1, label: "Address" },
//               { n: 2, label: "Payment" },
//             ].map(({ n, label }) => (
//               <div key={n} className="flex items-center gap-1.5">
//                 <div
//                   className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
//                     step >= n ? "bg-black text-white" : "bg-gray-100 text-gray-400"
//                   }`}
//                 >
//                   {step > n ? "?" : n}
//                 </div>
//                 <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
//                   step >= n ? "text-gray-900" : "text-gray-400"
//                 }`}>
//                   {label}
//                 </span>
//                 {n < 2 && <ChevronRight size={12} className="text-gray-300" />}
//               </div>
//             ))}
//           </div>
//         </div>
//       </header>

//       {/* Body */}
//       <div className="max-w-5xl mx-auto px-4 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

//           {/* -- Left Panel -- */}
//           <div className="space-y-6">

//             {/* Global error */}
//             {(error.quote || error.confirm || error.placeOrder) && (
//               <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
//                 <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
//                 <div className="flex-1">
//                   <p className="text-xs font-bold text-red-700">
//                     {error.placeOrder?.message ||
//                       error.confirm?.message ||
//                       error.quote?.message}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => dispatch(clearCheckoutErrors())}
//                   className="text-red-400 hover:text-red-600 cursor-pointer"
//                 >
//                   <X size={14} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 1: Address -- */}
//             {step === 1 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">1</div>
//                   <h2 className="text-lg font-black text-gray-900">Delivery Address</h2>
//                 </div>

//                 <AddressSelector
//                   onAddAddress={() => setShowAddressModal(true)}
//                 />

//                 <button
//                   onClick={handleStep1Next}
//                   disabled={!selectedAddressId}
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   Continue to Payment <ChevronRight size={16} />
//                 </button>
//               </div>
//             )}

//             {/* -- Step 2: Payment -- */}
//             {step === 2 && (
//               <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm">
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">2</div>
//                   <h2 className="text-lg font-black text-gray-900">Payment Method</h2>
//                 </div>

//                 {/* Selected address summary */}
//                 {selectedAddress && (
//                   <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
//                     <MapPin size={14} className="text-[#F7A221] mt-0.5 flex-shrink-0" />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
//                         Delivering to
//                       </p>
//                       <p className="text-sm font-black text-gray-900">{selectedAddress.fullName}</p>
//                       <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
//                         {[selectedAddress.houseNumber, selectedAddress.area, selectedAddress.city]
//                           .filter(Boolean)
//                           .join(", ")}{" "}
//                         � {selectedAddress.postalCode}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => { setStep(1); }}
//                       className="text-[10px] font-black uppercase tracking-widest text-[#F7A221] hover:text-black transition-colors cursor-pointer whitespace-nowrap"
//                     >
//                       Change
//                     </button>
//                   </div>
//                 )}

//                 {/* Payment options */}
//                 <div className="space-y-3">
//                   {/* COD */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("cod")}
//                     className={`w-full text-left p-4 rounded-[24px] border-2 transition-all cursor-pointer ${
//                       paymentMethod === "cod"
//                         ? "border-black bg-black/[0.02]"
//                         : "border-gray-100 hover:border-gray-300"
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
//                         paymentMethod === "cod" ? "border-black bg-black" : "border-gray-300"
//                       }`}>
//                         {paymentMethod === "cod" && <div className="w-2 h-2 bg-white rounded-full" />}
//                       </div>
//                       <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <Banknote size={18} className="text-green-600" />
//                       </div>
//                       <div>
//                         <p className="font-black text-sm text-gray-900">Cash on Delivery</p>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           Pay when your order arrives
//                         </p>
//                       </div>
//                     </div>
//                   </button>

//                   {/* Online / Razorpay � coming soon */}
//                   <button
//                     type="button"
//                     onClick={() => handlePaymentMethodSelect("online")}
//                     className="w-full text-left p-4 rounded-[24px] border-2 border-gray-100 hover:border-gray-300 transition-all cursor-pointer opacity-60"
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
//                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
//                         <CreditCard size={18} className="text-blue-500" />
//                       </div>
//                       <div className="flex-1">
//                         <div className="flex items-center gap-2">
//                           <p className="font-black text-sm text-gray-900">Pay Online</p>
//                           <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
//                             Coming Soon
//                           </span>
//                         </div>
//                         <p className="text-xs text-gray-400 font-medium mt-0.5">
//                           UPI, Cards, Net Banking via Razorpay
//                         </p>
//                       </div>
//                     </div>
//                   </button>
//                 </div>

//                 {/* Place order button */}
//                 <button
//                   onClick={handlePlaceOrder}
//                   disabled={
//                     !quote ||
//                     loading.quote ||
//                     loading.confirm ||
//                     loading.placeOrder ||
//                     paymentMethod !== "cod"
//                   }
//                   className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F7A221] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
//                 >
//                   {loading.confirm || loading.placeOrder ? (
//                     <><Loader2 size={16} className="animate-spin" /> Placing Order�</>
//                   ) : loading.quote ? (
//                     <><Loader2 size={16} className="animate-spin" /> Getting Quote�</>
//                   ) : (
//                     <>Place Order � {fmt(quote?.amountPayable)}</>
//                   )}
//                 </button>

//                 <p className="text-center text-[10px] text-gray-400 font-bold mt-3">
//                   By placing this order you agree to our Terms & Conditions
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* -- Right Panel � Order Summary -- */}
//           <div className="space-y-4">
//             {/* Cart summary */}
//             <div className="bg-white rounded-[32px] p-6 shadow-sm">
//               <div className="flex items-center gap-2 mb-5">
//                 <ShoppingBag size={16} className="text-gray-400" />
//                 <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
//                   Order Summary
//                 </h3>
//                 <span className="ml-auto text-xs font-black text-gray-400">
//                   {cartCount} item{cartCount !== 1 ? "s" : ""}
//                 </span>
//               </div>

//               {/* Cart items preview */}
//               <div className="space-y-3 mb-5">
//                 {cartItems.slice(0, 3).map((item, i) => {
//                   const matchedVariant = item.product?.variants?.find(
//                     (v) => String(v._id) === String(item.variantId)
//                   ) ?? item.product?.variants?.[0];
//                   const image = matchedVariant?.images?.[0]?.url || null;
//                   const name = item.product?.title || item.product?.name || "Product";
//                   const price = item.price?.sale ?? item.price?.base;

//                   return (
//                     <div key={i} className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
//                         {image ? (
//                           <img src={image} alt={name} className="w-full h-full object-cover" />
//                         ) : (
//                           <div className="w-full h-full flex items-center justify-center">
//                             <Package size={14} className="text-gray-300" />
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
//                         <p className="text-[11px] text-gray-400 font-medium">
//                           Qty: {item.quantity}
//                         </p>
//                       </div>
//                       <p className="text-xs font-black text-gray-900">
//                         {fmt(price * item.quantity)}
//                       </p>
//                     </div>
//                   );
//                 })}
//                 {cartItems.length > 3 && (
//                   <p className="text-[10px] text-gray-400 font-bold text-center">
//                     +{cartItems.length - 3} more item{cartItems.length - 3 > 1 ? "s" : ""}
//                   </p>
//                 )}
//               </div>

//               <div className="border-t border-gray-100 pt-4">
//                 {/* Quote loading */}
//                 {loading.quote && (
//                   <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
//                     <Loader2 size={14} className="animate-spin" />
//                     <span className="text-xs font-bold">Calculating totals�</span>
//                   </div>
//                 )}

//                 {/* Quote error */}
//                 {error.quote && !loading.quote && (
//                   <div className="space-y-3">
//                     <p className="text-xs text-red-500 font-bold">{error.quote.message}</p>
//                     {selectedAddressId && (
//                       <button
//                         onClick={handleFetchQuote}
//                         className="w-full py-3 text-xs font-black uppercase tracking-widest text-[#F7A221] hover:text-black border border-[#F7A221] rounded-2xl transition-colors cursor-pointer"
//                       >
//                         Retry Quote
//                       </button>
//                     )}
//                   </div>
//                 )}

//                 {/* Price breakdown */}
//                 {quote && !loading.quote && (
//                   <PriceBreakdown
//                     quote={quote}
//                     itemCount={cartCount}
//                     paymentMethod={paymentMethod}
//                     compact
//                   />
//                 )}

//                 {/* No quote yet (step 1) */}
//                 {!quote && !loading.quote && !error.quote && step === 1 && (
//                   <div className="text-center py-2">
//                     <p className="text-xs text-gray-400 font-medium">
//                       Select an address to see delivery charges & final total
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Delivery info */}
//             {quote?.deliveryEstimate && (
//               <div className="bg-white rounded-[28px] p-5 shadow-sm flex items-center gap-3">
//                 <Truck size={18} className="text-[#F7A221] flex-shrink-0" />
//                 <div>
//                   <p className="text-xs font-black text-gray-900">Estimated Delivery</p>
//                   <p className="text-[11px] text-gray-500 font-medium mt-0.5">
//                     {quote.deliveryEstimate}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>

//         </div>
//       </div>

//       {/* Address form modal */}
//       {showAddressModal && (
//         <AddressFormModal
//           initial={null}
//           onSubmit={async (formData) => {
//             // Parent handles add via existing UserAddress dispatch
//             // We just close the modal here � AddressSelector will re-fetch
//             setShowAddressModal(false);
//           }}
//           onClose={() => setShowAddressModal(false)}
//           isSaving={false}
//           error={null}
//         />
//       )}

//       {/* Coming soon modal for online payment */}
//       {showComingSoon && <ComingSoonModal onClose={() => setShowComingSoon(false)} />}
//     </div>
//   );
// };

// export default Checkout;
