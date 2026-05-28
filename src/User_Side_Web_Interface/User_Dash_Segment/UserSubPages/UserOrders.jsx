import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchUserOrders,
  fetchOrderById,
  trackOrder,
  cancelOrder,
  createReturnRequest,
  clearOrderErrors,
  clearActiveOrder,
  initiatePendingOrderPayment,
  selectOrders,
  selectActiveOrder,
  selectTracking,
  selectOrderLoading,
  selectOrderError,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/orderSlice/orderSlice";
import {
  verifyRazorpayPayment,
  selectPaymentVerification,
  resetPaymentVerification,
} from "../../../components/REDUX_FEATURES/REDUX_SLICES/checkoutSlice/checkoutSlice";
import { selectUser } from "../../../components/REDUX_FEATURES/REDUX_SLICES/authSlice";
import RazorpayCheckout, {
  PaymentLoadingModal,
  PaymentErrorModal,
} from "../../CHECKOUT/RazorpayCheckout/RazorpayCheckout";
import {
  Package, Truck, CheckCircle, ChevronRight, RefreshCw,
  XCircle, Clock, AlertCircle, ArrowLeft, MapPin,
  Loader2, ShoppingBag, CreditCard,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { formatInr as fmt } from "../../../utils/formatInr";
import {
  isCancellationRefundOrder,
  isProductReturnOrder,
  cancellationRefundHeadline,
  cancellationRefundDetail,
  productReturnStatusLabel,
} from "../../../utils/orderRefundDisplay";
import { shouldShowOnlinePaymentHoldCountdown } from "../../../utils/paymentHoldDisplay";

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/** User can resume Razorpay for an unpaid online order (matches backend initiate-pending rules). */
function isPaymentWindowExpired(order) {
  if (!order?.paymentHoldExpiresAt) return false;
  return new Date(order.paymentHoldExpiresAt).getTime() < Date.now();
}

function canResumeOnlinePayment(order) {
  if (!order) return false;
  if (order.orderStatus !== "pending") return false;
  if (order.paymentStatus !== "pending") return false;
  if (String(order.paymentInfo?.method || "").toLowerCase() !== "online") return false;
  if (Number(order.amountPaidInr) > 0.01) return false;
  if (isPaymentWindowExpired(order)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock size={11} />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle size={11} />,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-100 text-purple-700",
    icon: <RefreshCw size={11} className="animate-spin" />,
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-700",
    icon: <Truck size={11} />,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-cyan-100 text-cyan-700",
    icon: <Truck size={11} />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={11} />,
  },
  return_requested: {
    label: "Return Requested",
    color: "bg-orange-100 text-orange-700",
    icon: <RefreshCw size={11} className="animate-spin" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-600",
    icon: <XCircle size={11} />,
  },
  payment_failed: {
    label: "Payment Failed",
    color: "bg-red-100 text-red-600",
    icon: <XCircle size={11} />,
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tracking Timeline
// ─────────────────────────────────────────────────────────────────────────────
const TrackingTimeline = ({ timeline = [] }) => (
  <div className="space-y-0">
    {timeline.map((step, i) => (
      <div key={i} className="flex gap-3">
        {/* Dot + line */}
        <div className="flex flex-col items-center">
          <div
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-1 ${
              step.completed
                ? "bg-black border-black"
                : "bg-white border-gray-200"
            }`}
          >
            {step.completed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
          </div>
          {i < timeline.length - 1 && (
            <div className={`w-0.5 flex-1 min-h-[20px] my-1 ${step.completed ? "bg-black" : "bg-gray-200"}`} />
          )}
        </div>

        {/* Content */}
        <div className="pb-4">
          <p className={`text-xs font-black ${step.completed ? "text-gray-900" : "text-gray-400"}`}>
            {step.status}
          </p>
          {step.timestamp && (
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {fmtDate(step.timestamp)}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Order Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
const OrderDetail = ({ orderId, onBack, onCancel, isCancelling, cancelError }) => {
  const dispatch = useDispatch();
  const order = useSelector(selectActiveOrder);
  const user = useSelector(selectUser);
  const tracking = useSelector(selectTracking(orderId));
  const loading = useSelector(selectOrderLoading);
  const error = useSelector(selectOrderError);
  const initiatePaymentLoading = useSelector((s) => s.orders.loading.initiatePayment);
  const initiatePaymentError = useSelector((s) => s.orders.error.initiatePayment);
  const returnRequestLoading = useSelector((s) => s.orders.loading.returnRequest);
  const returnRequestError = useSelector((s) => s.orders.error.returnRequest);
  const paymentVerification = useSelector(selectPaymentVerification);

  const [showTracking, setShowTracking] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayBundle, setRazorpayBundle] = useState(null);
  const [razorpayClientError, setRazorpayClientError] = useState(null);
  const [returnReasonType, setReturnReasonType] = useState("damaged");
  const [returnReasonMessage, setReturnReasonMessage] = useState("");
  const [returnProofVideo, setReturnProofVideo] = useState(null);
  const [returnProofImages, setReturnProofImages] = useState([]);

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
    return () => {
      dispatch(clearActiveOrder());
      dispatch(resetPaymentVerification());
      setRazorpayBundle(null);
      setShowRazorpay(false);
      setRazorpayClientError(null);
    };
  }, [orderId, dispatch]);

  const handleTrack = () => {
    if (!tracking) dispatch(trackOrder(orderId));
    setShowTracking((v) => !v);
  };

  const handleContinuePayment = useCallback(async () => {
    if (!order?.orderId) return;
    setRazorpayClientError(null);
    dispatch(resetPaymentVerification());
    try {
      const data = await dispatch(initiatePendingOrderPayment(order.orderId)).unwrap();
      const key = data.razorpayKeyId;
      const rzOrder = data.razorpayOrder;
      if (!key || !rzOrder?.id) {
        throw new Error("Payment could not be started. Please try again.");
      }
      setRazorpayBundle({ key, order: rzOrder });
      setShowRazorpay(true);
    } catch {
      /* error in initiatePaymentError */
    }
  }, [dispatch, order]);

  const handleRazorpaySuccess = useCallback(
    async (response) => {
      setShowRazorpay(false);
      setRazorpayBundle(null);
      const oid = order?.orderId || response?.notes?.orderId;
      if (!oid) {
        toast.error("Missing order reference. Please contact support.", { theme: "dark" });
        return;
      }
      try {
        await dispatch(
          verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: oid,
          })
        ).unwrap();
        await dispatch(fetchOrderById(oid)).unwrap();
        dispatch(fetchUserOrders());
        dispatch(resetPaymentVerification());
        toast.success("Payment successful! Your order is confirmed.", { theme: "dark", autoClose: 3500 });
      } catch (e) {
        console.error(e);
        /* verify error surfaced via paymentVerification + modal */
      }
    },
    [dispatch, order?.orderId]
  );

  const handleRazorpayFailure = useCallback((msg) => {
    setShowRazorpay(false);
    setRazorpayBundle(null);
    setRazorpayClientError(msg || "Payment failed. Please try again.");
  }, []);

  const handleRazorpayClose = useCallback(() => {
    setShowRazorpay(false);
    setRazorpayBundle(null);
  }, []);
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }, []);
  /** Verify / Razorpay client failures — initiate errors stay inline only */
  const modalError = paymentVerification.error || razorpayClientError || null;

  const holdExpired = order && isPaymentWindowExpired(order);

  if (loading.fetchOne) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm font-bold">Loading order…</span>
      </div>
    );
  }

  if (error.fetchOne || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500 font-bold">{error.fetchOne?.message || "Order not found"}</p>
        <button onClick={onBack} className="mt-4 text-xs font-black uppercase text-gray-400 hover:text-black cursor-pointer">
          ← Back
        </button>
      </div>
    );
  }

  // Per client requirement: once the order is created, cancel option should not be shown to the customer.
const canCancel =
  ["pending", "confirmed", "processing"].includes(
    String(order?.orderStatus || "").toLowerCase()
  ) &&
  String(order?.paymentStatus || "").toLowerCase() !== "refunded";  const returnStatus = String(order?.returnInfo?.status || "").toLowerCase();
  const RETURN_WINDOW_DAYS = 2;
  const deliveredAtRaw = order?.shipmentInfo?.deliveredAt || null;
  const deliveredAt = deliveredAtRaw ? new Date(deliveredAtRaw) : null;
  const deliveredAtValid = Boolean(deliveredAt && !Number.isNaN(deliveredAt.getTime()));
  const now = new Date();
  const returnDeadlineAt = deliveredAtValid
    ? new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const returnWindowExpired = Boolean(returnDeadlineAt && now > returnDeadlineAt);

  const isCancelRefund = isCancellationRefundOrder(order);
  const isProductReturn = isProductReturnOrder(order);

  const canRaiseReturn =
    !isCancelRefund &&
    String(order.orderStatus || "").toLowerCase() === "delivered" &&
    deliveredAtValid &&
    !returnWindowExpired &&
    (!returnStatus || ["rejected", "closed"].includes(returnStatus));

  const showProductReturnCard = isProductReturn || canRaiseReturn;

  return (
  <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fadeIn">

    {/* BACK */}
    <button
      onClick={onBack}
      className="
        flex items-center gap-2
        text-[11px] sm:text-xs
        font-black uppercase tracking-widest
        text-gray-500 hover:text-black
        transition-colors
        cursor-pointer
      "
    >
      <ArrowLeft size={14} />
      All Orders
    </button>

    {/* ORDER HEADER */}
    <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

      {/* TOP */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">

        <div className="min-w-0">
          <h2
            className="
              text-lg sm:text-xl
              font-black
              text-gray-900
              break-all
              leading-tight
            "
          >
            {order.orderId}
          </h2>

          <p
            className="
              mt-1
              text-[10px] sm:text-xs
              text-gray-400
              font-bold
              uppercase
              tracking-widest
            "
          >
            {fmtDate(order.createdAt)}
          </p>
        </div>

        <div className="shrink-0">
          <StatusBadge status={order.orderStatus} />
        </div>
      </div>

      {/* TOTALS */}
      <div
        className="
          grid grid-cols-2 lg:grid-cols-4
          gap-4
          pt-4
          border-t border-gray-100
        "
      >
        {[
          { label: "Subtotal", value: fmt(order.subtotal) },
          {
            label: "Delivery",
            value:
              order.deliveryCharges === 0
                ? "FREE"
                : fmt(order.deliveryCharges),
          },
          { label: "Tax", value: fmt(order.tax) },
          {
            label: "Total",
            value: fmt(order.totalAmount),
            bold: true,
          },
        ].map(({ label, value, bold }) => (
          <div key={label} className="min-w-0">

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-widest
                text-gray-400
              "
            >
              {label}
            </p>

            <p
              className={`
                mt-1
                text-xs sm:text-sm
                break-words
                ${
                  bold
                    ? "font-black text-gray-900"
                    : "font-bold text-gray-700"
                }
              `}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* PAYMENT REQUIRED */}
      {String(order?.paymentInfo?.method || "").toLowerCase() === "online" &&
        order.orderStatus === "pending" &&
        order.paymentStatus === "pending" && (
          <div className="mt-6 pt-6 border-t border-amber-100 space-y-4">

            <div className="flex items-start gap-3 min-w-0">

              <CreditCard
                className="text-amber-600 shrink-0 mt-0.5"
                size={20}
              />

              <div className="min-w-0">

                <h3 className="text-sm sm:text-base font-black text-gray-900">
                  Payment required
                </h3>

                <p
                  className="
                    mt-1
                    text-[11px] sm:text-xs
                    text-gray-500
                    font-medium
                    leading-relaxed
                  "
                >
                  Your cart was turned into this order.
                  Complete payment to confirm it.
                </p>

                {shouldShowOnlinePaymentHoldCountdown(order) &&
                  !holdExpired && (
                    <p
                      className="
                        mt-2
                        text-[11px]
                        text-amber-800
                        font-bold
                        leading-relaxed
                      "
                    >
                      Complete before{" "}
                      {fmtDateTime(order.paymentHoldExpiresAt)}
                    </p>
                  )}
              </div>
            </div>

            {initiatePaymentError?.message && (
              <p className="text-xs text-red-600 font-bold">
                {initiatePaymentError.message}
              </p>
            )}

            {holdExpired ? (
              <p
                className="
                  text-xs
                  text-red-600
                  font-bold
                  leading-relaxed
                "
              >
                The payment window for this order has expired.
                Please place a new order.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleContinuePayment}
                disabled={initiatePaymentLoading}
                className="
                  w-full sm:w-auto min-h-[48px]
                  inline-flex items-center justify-center gap-2
                  bg-black text-white
                  text-xs font-black uppercase tracking-widest
                  px-5 sm:px-6 py-3
                  rounded-2xl
                  hover:bg-[#F7A221]
                  hover:text-black
                  transition-all
                  disabled:opacity-50
                  cursor-pointer
                "
              >
                {initiatePaymentLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}

                Continue payment
              </button>
            )}
          </div>
        )}
    </div>

    {/* ITEMS */}
    <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

      <h3
        className="
          text-[11px] sm:text-xs
          font-black uppercase tracking-widest
          text-gray-400
          mb-4
        "
      >
        Items ({order.items?.length})
      </h3>

      <div className="space-y-4">

        {order.items?.map((item, i) => {
          const image = item.productId?.images?.[0]?.url || null;

          const name =
            item.productId?.name ||
            item.productId?.title ||
            "Product";

          const price =
            item.priceSnapshot?.sale ??
            item.priceSnapshot?.base;

          return (
            <div
              key={i}
              className="
                flex items-start sm:items-center
                gap-3 sm:gap-4
              "
            >

              {/* IMAGE */}
              <div
                className="
                  w-12 h-12 sm:w-14 sm:h-14
                  bg-gray-100
                  rounded-2xl
                  overflow-hidden
                  shrink-0
                "
              >
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={18} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* INFO */}
              <div className="flex-1 min-w-0">

                <p
                  className="
                    text-xs sm:text-sm
                    font-black
                    text-gray-900
                    break-words
                    leading-snug
                  "
                >
                  {name}
                </p>

                <p
                  className="
                    mt-1
                    text-[11px] sm:text-xs
                    text-gray-400
                    font-medium
                  "
                >
                  Qty: {item.quantity} × {fmt(price)}
                </p>
              </div>

              {/* PRICE */}
              <p
                className="
                  text-xs sm:text-sm
                  font-black
                  text-gray-900
                  shrink-0
                  text-right
                "
              >
                {fmt(price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>
    </div>

    {/* DELIVERY ADDRESS */}
    {order.addressSnapshot && (
      <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-[#F7A221]" />

          <h3
            className="
              text-[11px] sm:text-xs
              font-black uppercase tracking-widest
              text-gray-400
            "
          >
            Delivery Address
          </h3>
        </div>

        <p className="text-sm sm:text-base font-black text-gray-900 break-words">
          {order.addressSnapshot.fullName}
        </p>

        <p
          className="
            mt-1
            text-[11px] sm:text-xs
            text-gray-500
            font-medium
            leading-relaxed
            break-words
          "
        >
          {[
            order.addressSnapshot.houseNumber,
            order.addressSnapshot.area,
            order.addressSnapshot.landmark,
            order.addressSnapshot.addressLine1,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>

        <p
          className="
            mt-1
            text-[11px] sm:text-xs
            font-bold
            text-gray-700
            break-words
          "
        >
          {order.addressSnapshot.city},{" "}
          {order.addressSnapshot.state} —{" "}
          {order.addressSnapshot.postalCode}
        </p>

        <p
          className="
            mt-1
            text-[11px] sm:text-xs
            text-gray-400
            font-medium
            break-words
          "
        >
          {order.addressSnapshot.phone}
        </p>
      </div>
    )}

    {/* TRACK ORDER */}
    <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

      <button
        onClick={handleTrack}
        className="
          flex items-start sm:items-center
          justify-between
          gap-3
          w-full
          cursor-pointer
        "
      >
        <div className="flex items-center gap-2">

          <Truck size={14} className="text-[#F7A221]" />

          <h3
            className="
              text-[11px] sm:text-xs
              font-black uppercase tracking-widest
              text-gray-900
            "
          >
            Track Order
          </h3>
        </div>

        {loading.track ? (
          <Loader2
            size={14}
            className="animate-spin text-gray-400"
          />
        ) : (
          <ChevronRight
            size={14}
            className={`
              text-gray-400
              transition-transform
              ${showTracking ? "rotate-90" : ""}
            `}
          />
        )}
      </button>

      {showTracking && tracking && (
        <div className="mt-5 pt-5 border-t border-gray-100">

          {tracking.trackingNumber && (
            <p
              className="
                text-[10px]
                font-black uppercase tracking-widest
                text-gray-400
                mb-4
                break-all
                leading-relaxed
              "
            >
              Tracking:
              <span className="text-gray-700 ml-1">
                {tracking.trackingNumber}
              </span>

              {tracking.courier && (
                <span className="ml-2">
                  via {tracking.courier}
                </span>
              )}
            </p>
          )}

          <TrackingTimeline timeline={tracking.timeline || []} />
        </div>
      )}
    </div>
    {/* RETURN REQUEST */}
{showProductReturnCard && (
  <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

      <h3
        className="
          text-[11px] sm:text-xs
          font-black uppercase tracking-widest
          text-gray-900
        "
      >
        Return Request
      </h3>

      {order?.returnInfo?.status && isProductReturn && (
        <span
          className="
            w-fit
            text-[10px]
            font-black
            uppercase
            tracking-widest
            px-2 py-1
            rounded-full
            bg-gray-100
            text-gray-700
          "
        >
          {productReturnStatusLabel(order.returnInfo.status)}
        </span>
      )}
    </div>

    {canRaiseReturn ? (
      <div className="mt-4 space-y-4">

        <p
          className="
            text-xs
            text-gray-500
            font-medium
            leading-relaxed
          "
        >
          Returns are available only for damaged or wrong item deliveries.
          Please provide one video and at least one image.
        </p>

        {!showReturnForm ? (
          <button
            type="button"
            onClick={() => setShowReturnForm(true)}
            className="
              w-full sm:w-auto
              inline-flex items-center justify-center gap-2
              bg-black text-white
              text-xs
              font-black
              uppercase tracking-widest
              px-5 py-3
              rounded-2xl
              hover:bg-[#F7A221]
              hover:text-black
              transition-all
            "
          >
            Raise Return Request
          </button>
        ) : (
          <div className="space-y-3 pt-2">

            <select
              value={returnReasonType}
              onChange={(e) => setReturnReasonType(e.target.value)}
              className="
                w-full
                border border-gray-200
                rounded-xl
                px-3 py-3
                text-sm
              "
            >
              <option value="damaged">
                Damaged product
              </option>

              <option value="wrong_item">
                Wrong item received
              </option>
            </select>

            <textarea
              value={returnReasonMessage}
              onChange={(e) =>
                setReturnReasonMessage(e.target.value)
              }
              rows={4}
              maxLength={500}
              placeholder="Describe what is damaged/wrong..."
              className="
                w-full
                border border-gray-200
                rounded-xl
                px-3 py-3
                text-sm
                resize-none
              "
            />

            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">
                Proof Video
              </p>

              <input
                type="file"
                accept="video/*"
                onChange={(e) =>
                  setReturnProofVideo(
                    e.target.files?.[0] || null
                  )
                }
                className="text-xs w-full"
              />
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">
                Proof Images (1-3)
              </p>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setReturnProofImages(
                    Array.from(e.target.files || []).slice(0, 3)
                  )
                }
                className="text-xs w-full"
              />
            </div>

            {returnRequestError?.message && (
              <p className="text-xs font-bold text-red-600">
                {returnRequestError.message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">

              <button
                type="button"
                onClick={() => setShowReturnForm(false)}
                className="
                  w-full sm:w-auto
                  px-4 py-3
                  text-xs
                  font-black
                  uppercase tracking-widest
                  border border-gray-200
                  rounded-xl
                "
                disabled={returnRequestLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={returnRequestLoading}
                onClick={async () => {
                  if (!returnReasonMessage.trim()) {
                    toast.error(
                      "Please describe the issue.",
                      { theme: "dark" }
                    );
                    return;
                  }

                  if (!returnProofVideo) {
                    toast.error(
                      "Please upload a proof video.",
                      { theme: "dark" }
                    );
                    return;
                  }

                  if (!returnProofImages.length) {
                    toast.error(
                      "Please upload at least one proof image.",
                      { theme: "dark" }
                    );
                    return;
                  }

                  try {
                    await dispatch(
                      createReturnRequest({
                        orderId: order.orderId,
                        reasonType: returnReasonType,
                        reasonMessage: returnReasonMessage,
                        proofVideo: returnProofVideo,
                        proofImages: returnProofImages,
                      })
                    ).unwrap();

                    await dispatch(
                      fetchOrderById(order.orderId)
                    ).unwrap();

                    dispatch(fetchUserOrders());

                    setShowReturnForm(false);
                    setReturnReasonMessage("");
                    setReturnProofVideo(null);
                    setReturnProofImages([]);

                    toast.success(
                      "Return request submitted.",
                      { theme: "dark" }
                    );
                  } catch {}
                }}
                className="
                  w-full sm:w-auto
                  px-4 py-3
                  text-xs
                  font-black
                  uppercase tracking-widest
                  rounded-xl
                  bg-black
                  text-white
                  disabled:opacity-50
                "
              >
                {returnRequestLoading
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    ) : (
      <p className="mt-3 text-xs text-gray-500 font-medium">
        {returnStatus && isProductReturn
          ? `Return status: ${productReturnStatusLabel(returnStatus)}`
          : returnWindowExpired
            ? "Return window expired. You can no longer raise a return request."
            : "Return request is available within 2 days of delivery."}
      </p>
    )}
  </div>
)}

    {/* CANCELLATION REFUND */}
    {isCancelRefund && (
      <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 border border-red-100">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <h3
            className="
              text-[11px] sm:text-xs
              font-black uppercase tracking-widest
              text-gray-900
            "
          >
            Cancellation refund
          </h3>

          <span
            className="
              w-fit
              text-[10px]
              font-black uppercase tracking-widest
              px-2 py-1
              rounded-full
              bg-emerald-50
              text-emerald-800
              border border-emerald-100
            "
          >
            {cancellationRefundHeadline(order)}
          </span>
        </div>

        <p
          className="
            mt-3
            text-xs
            text-gray-600
            font-medium
            leading-relaxed
            break-words
          "
        >
          {cancellationRefundDetail(order)}
        </p>

        {order?.returnInfo?.refundId && (
          <p
            className="
              mt-2
              text-[10px]
              text-gray-400
              font-mono
              break-all
            "
          >
            Ref ID: {order.returnInfo.refundId}
          </p>
        )}
      </div>
    )}

    {/* CANCEL ORDER */}
    {canCancel && (
      <div className="bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6">

        {cancelError && (
          <p className="text-xs text-red-500 font-bold mb-3">
            {cancelError.message}
          </p>
        )}

        {showCancelConfirm ? (
          <div className="space-y-3">

            <p className="text-sm font-bold text-gray-900">
              Are you sure you want to cancel this order?
            </p>

            <p
              className="
                text-xs
                text-gray-500
                font-medium
                leading-relaxed
              "
            >
              This cannot be undone.
              Refund (if paid online) will be initiated automatically.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">

              <button
                onClick={() => setShowCancelConfirm(false)}
                className="
                  w-full flex-1
                  py-3
                  rounded-2xl
                  border-2 border-gray-200
                  text-xs
                  font-black
                  uppercase tracking-widest
                  hover:border-black
                  transition-all
                  cursor-pointer
                "
              >
                Keep Order
              </button>

              <button
                onClick={() => onCancel(order.orderId)}
                disabled={isCancelling}
                className="
                  w-full flex-1
                  py-3
                  rounded-2xl
                  bg-red-500
                  text-white
                  text-xs
                  font-black
                  uppercase tracking-widest
                  hover:bg-red-600
                  disabled:opacity-50
                  transition-all
                  cursor-pointer
                "
              >
                {isCancelling ? (
                  <Loader2
                    size={14}
                    className="animate-spin mx-auto"
                  />
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="
              flex items-center gap-2
              text-xs
              font-black
              uppercase tracking-widest
              text-red-400
              hover:text-red-600
              transition-colors
              cursor-pointer
            "
          >
            <XCircle size={14} />
            Cancel Order
          </button>
        )}
      </div>
    )}

    {/* RAZORPAY */}
    {showRazorpay && razorpayBundle && order && (
      <RazorpayCheckout
        key={razorpayBundle.order.id}
        razorpayOrder={razorpayBundle.order}
        razorpayKey={razorpayBundle.key}
        orderId={order.orderId}
        totalAmount={order.totalAmount}
        userEmail={user?.email}
        userName={user?.name || order.addressSnapshot?.fullName}
        userPhone={order.addressSnapshot?.phone || user?.phone}
        onSuccess={handleRazorpaySuccess}
        onFailure={handleRazorpayFailure}
        onClose={handleRazorpayClose}
      />
    )}

    {/* PAYMENT LOADING */}
    {paymentVerification.loading && (
      <PaymentLoadingModal message="Verifying payment…" />
    )}

    {/* PAYMENT ERROR */}
    {modalError &&
      !paymentVerification.loading &&
      !showRazorpay && (
        <PaymentErrorModal
          error={modalError}
          onRetry={() => {
            setRazorpayClientError(null);
            dispatch(resetPaymentVerification());
            handleContinuePayment();
          }}
          onClose={() => {
            setRazorpayClientError(null);
            dispatch(resetPaymentVerification());
          }}
        />
      )}
  </div>
);
};

// ─────────────────────────────────────────────────────────────────────────────
// UserOrders — Main Component
// ─────────────────────────────────────────────────────────────────────────────
const UserOrders = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrderLoading);
  const error = useSelector(selectOrderError);

  const [activeOrderId, setActiveOrderId] = useState(  location.state?.openOrderId ?? null
);

  useEffect(() => {
    dispatch(fetchUserOrders());
    return () => dispatch(clearOrderErrors());
  }, [dispatch]);

  const handleCancel = async (orderId) => {
    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      setActiveOrderId(null); // go back to list
    } catch {
      // error shown in OrderDetail
    }
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (activeOrderId) {
    return (
      <OrderDetail
        orderId={activeOrderId}
        onBack={() => setActiveOrderId(null)}
        onCancel={handleCancel}
        isCancelling={loading.cancel}
        cancelError={error.cancel}
      />
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading.fetch) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 size={28} className="text-gray-300 animate-spin" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
          Loading orders…
        </p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error.fetch) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <AlertCircle size={32} className="text-red-300" />
        <p className="text-gray-500 text-sm font-medium max-w-sm">
          {error.fetch.message || "Failed to load orders"}
        </p>
        <button
          onClick={() => dispatch(fetchUserOrders())}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-[#F7A221] text-white px-6 py-3 rounded-xl hover:bg-black transition-colors"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
          <ShoppingBag size={36} className="text-gray-200" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">
            No orders yet
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            Your order history will appear here
          </p>
        </div>
        <a
          href="/"
          className="bg-black text-white text-xs font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl hover:bg-[#F7A221] hover:text-black transition-all"
        >
          Start Shopping
        </a>
      </div>
    );
  }

  // ── Order list ───────────────────────────────────────────────────────────
  return (
  <div className="space-y-5 sm:space-y-8 animate-fadeIn">

  {/* HEADER */}
  <header className="px-1">
    <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-gray-900">
      Purchase History
    </h1>

    <p className="mt-1 text-[11px] sm:text-sm font-bold uppercase tracking-[0.25em] text-gray-400">
      {orders.length} Order{orders.length !== 1 ? "s" : ""}
    </p>
  </header>

  {/* ORDERS */}
  <div className="space-y-4">
    {orders.map((order) => (
      <button
        key={order.orderId}
        onClick={() => setActiveOrderId(order.orderId)}
        className="
          group
          w-full
          rounded-[28px]
          border border-gray-100
          bg-gray-50
          p-4 sm:p-5
          text-left
          transition-all duration-300
          hover:border-black
          hover:bg-white
          active:scale-[0.995]
        "
      >
        <div className="flex flex-col gap-4">

          {/* TOP */}
          <div className="flex items-start gap-3 min-w-0">

            {/* ICON */}
            <div
              className="
                flex
                h-14 w-14
                shrink-0
                items-center justify-center
                rounded-2xl
                bg-white
                shadow-sm
              "
            >
              <Package size={22} className="text-gray-300" />
            </div>

            {/* CONTENT */}
            <div className="min-w-0 flex-1">

              {/* ORDER ID */}
              <h3
                className="
                  truncate
                  text-sm sm:text-[15px]
                  font-black md:text-[18px]
                  text-gray-900
                "
                title={order.orderId}
              >
                {order.orderId}
              </h3>

              {/* DATE */}
              <p
                className="
                  mt-1
                  text-[10px] sm:text-[11px]
                  font-bold
                  uppercase
                  tracking-widest
                  text-gray-400
                "
              >
                {fmtDate(order.createdAt)}
              </p>

              {/* STATUS */}
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={order.orderStatus} />
              </div>

              {/* PAYMENT TEXT */}
              {canResumeOnlinePayment(order) && (
                <p
                  className="
                    mt-3
                    max-w-md
                    text-[11px]
                    leading-relaxed
                    font-bold
                    text-amber-700
                  "
                >
                  Online payment pending — complete checkout
                </p>
              )}
            </div>
          </div>

          {/* BOTTOM */}
          <div
            className="
              flex
              items-end
              justify-between
              gap-3
              border-t border-gray-200
              pt-4
            "
          >

            {/* PRICE */}
         {/* PRICE */}
<div className="min-w-0">
  <p
    className="
      text-[10px]
      font-black
      uppercase
      tracking-[0.2em]
      text-gray-400
    "
  >
    Total
  </p>

  <p
    className="
      mt-1
      text-sm sm:text-md
      md:text-lg
      lg:text-lg
      font-black
      leading-none
      text-gray-900
    "
  >
    {fmt(order.totalAmount)}
  </p>
</div>

            {/* CTA */}
            <div
              className="
                inline-flex
                items-center
                gap-1
                rounded-full
                px-3 py-2
                text-[10px] sm:text-xs
                font-black
                uppercase
                tracking-widest
                text-gray-500
                transition-all
                group-hover:bg-black
                group-hover:text-white
                shrink-0
              "
            >
              Details
              <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </button>
    ))}
  </div>
</div>
  );
};

export default UserOrders;

// import React from 'react';
// import { Package, Truck, CheckCircle, ChevronRight } from 'lucide-react';

// const UserOrders = () => {
//   const orders = [
//     { id: 'ORD-88291', date: 'March 15, 2026', status: 'In Transit', total: '₹2,499', items: 2 },
//     { id: 'ORD-77210', date: 'March 02, 2026', status: 'Delivered', total: '₹1,200', items: 1 },
//   ];

//   return (
//     <div className="space-y-8 animate-fadeIn">
//       <header>
//         <h1 className="text-3xl font-black text-gray-900 tracking-tight">Purchase History</h1>
//         <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">Track & Manage Orders</p>
//       </header>

//       <div className="space-y-6">
//         {orders.map((order) => (
//           <div key={order.id} className="group bg-gray-50 rounded-3xl p-6 border-2 border-transparent hover:border-black hover:bg-white transition-all duration-300">
//             <div className="flex flex-col md:flex-row justify-between gap-6">
//               <div className="flex gap-4">
//                 <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
//                    <Package size={32} />
//                 </div>
//                 <div>
//                   <h3 className="font-black text-lg text-gray-900">{order.id}</h3>
//                   <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">{order.date}</p>
//                   <div className="mt-2 flex items-center gap-2">
//                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
//                       order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
//                     }`}>
//                       {order.status}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex flex-row md:flex-col justify-between md:items-end border-t md:border-t-0 pt-4 md:pt-0">
//                 <p className="text-2xl font-black text-gray-900">{order.total}</p>
//                 <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-black transition-colors">
//                   View Details <ChevronRight size={14} />
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default UserOrders;