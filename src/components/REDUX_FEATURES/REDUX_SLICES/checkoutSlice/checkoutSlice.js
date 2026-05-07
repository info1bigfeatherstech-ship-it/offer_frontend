import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../../SERVICES/axiosInstance";

// ─────────────────────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/checkout/settings
 * Store policy: COD toggle, partial payment toggle & percent (server-enforced).
 */
export const fetchCheckoutSettings = createAsyncThunk(
  "checkout/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/checkout/settings");
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load checkout settings");
      }
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to load checkout settings",
        code: err.response?.data?.code,
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/checkout/quote
 * Requires: addressId, optional couponCode, paymentMethodHint
 */
export const fetchCheckoutQuote = createAsyncThunk(
  "checkout/fetchQuote",
  async (
    {
      addressId,
      couponCode,
      paymentMethodHint,
      paymentPlan = "full",
      balanceCollection = "online",
      demoMockShipping = false,
    },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        addressId,
        couponCode: couponCode || undefined,
        paymentMethodHint: paymentMethodHint || undefined,
        demoMockShipping,
        paymentPlan,
        balanceCollection,
      };
      const res = await axiosInstance.post("/checkout/quote", body);
      if (!res.data.success) throw new Error(res.data.message || "Failed to get quote");
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to get quote",
        code: err.response?.data?.code,
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/checkout/confirm
 * Requires: quoteId, paymentMethod ("cod" | "online")
 */
export const confirmCheckoutQuote = createAsyncThunk(
  "checkout/confirmQuote",
  async (
    { quoteId, paymentMethod, paymentPlan = "full", paymentAdvancePercent, balanceCollection = "online" },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        quoteId,
        paymentMethod,
        paymentPlan,
        balanceCollection,
      };
      if (
        paymentAdvancePercent !== undefined &&
        paymentAdvancePercent !== null &&
        String(paymentPlan).toLowerCase() !== "full"
      ) {
        body.paymentAdvancePercent = paymentAdvancePercent;
      }
      const res = await axiosInstance.post("/checkout/confirm", body);
      if (!res.data.success) throw new Error(res.data.message || "Failed to confirm quote");
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to confirm quote",
        code: err.response?.data?.code,
        details: err.response?.data?.details,
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/orders/items
 * Requires: addressId, paymentMethod, quoteId, optional couponCode
 * For online payments, backend returns razorpayOrder object
 */
export const placeOrder = createAsyncThunk(
  "checkout/placeOrder",
  async (
    {
      addressId,
      paymentMethod,
      quoteId,
      couponCode,
      onlinePaymentMode = "full",
      paymentAdvancePercent,
      balanceCollection = "online",
      idempotencyKey,
    },
    { rejectWithValue }
  ) => {
    try {
      const requestConfig = idempotencyKey
        ? { headers: { "Idempotency-Key": idempotencyKey } }
        : undefined;

      const payload = {
        addressId,
        paymentMethod,
        quoteId,
        couponCode: couponCode || undefined,
        onlinePaymentMode,
        balanceCollection,
      };
      if (
        paymentAdvancePercent !== undefined &&
        paymentAdvancePercent !== null &&
        String(onlinePaymentMode).toLowerCase() !== "full"
      ) {
        payload.paymentAdvancePercent = paymentAdvancePercent;
      }

      const res = await axiosInstance.post("/orders/items", payload, requestConfig);
      if (!res.data.success) throw new Error(res.data.message || "Failed to place order");
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to place order",
        code: err.response?.data?.code,
        details: err.response?.data?.details,
        status: err.response?.status,
      });
    }
  }
);

/**
 * GET /api/public/razorpay-key
 * Fetches Razorpay key_id from backend
 */
export const getRazorpayKey = createAsyncThunk(
  "checkout/getRazorpayKey",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/public/razorpay-key");
      if (!res.data.success) throw new Error(res.data.message || "Failed to get Razorpay key");
      return res.data.keyId;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to get Razorpay key",
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/orders/verify-payment
 * Verifies Razorpay payment signature and updates order status
 */
export const verifyRazorpayPayment = createAsyncThunk(
  "checkout/verifyPayment",
  async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/orders/items/verify-payment", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId,
      });
      if (!res.data.success) throw new Error(res.data.message || "Payment verification failed");
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Payment verification failed",
        code: err.response?.data?.code,
        details: err.response?.data?.details,
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/delivery/check-delivery
 * Checks if a pincode is serviceable (used by DeliveryChecker component)
 */
export const checkDelivery = createAsyncThunk(
  "checkout/checkDelivery",
  async ({ pincode }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/delivery/check-delivery", { pincode });
      if (!res.data.success) throw new Error(res.data.message || "Delivery check failed");
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Delivery check failed",
        status: err.response?.status,
      });
    }
  }
);

/**
 * GET /api/coupons/available
 * Fetches active coupons visible to logged-in customer.
 */
export const fetchAvailableCoupons = createAsyncThunk(
  "checkout/fetchAvailableCoupons",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/coupons/available");
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load coupons");
      return res.data?.coupons || [];
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to load coupons",
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/coupons/validate
 * Pre-validates coupon for current server cart.
 */
export const validateCouponCode = createAsyncThunk(
  "checkout/validateCouponCode",
  async ({ couponCode }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/coupons/validate", {
        couponCode,
        useServercart: true,
      });
      if (!res.data?.success || !res.data?.valid) {
        throw new Error(res.data?.message || "Invalid coupon");
      }
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Invalid coupon",
        code: err.response?.data?.code,
        details: err.response?.data?.details,
        status: err.response?.status,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────
const initialState = {
  // Delivery check (DeliveryChecker component)
  delivery: {
    isDeliverable: null,
    estimatedDays: null,
    courierName: null,
    checkedPincode: null,
    message: null,
  },

  // Quote
  quote: null,
  quoteId: null,
  quoteExpiresAt: null,

  // Confirmed quote (after /confirm)
  confirmed: null,

  // Placed order result
  placedOrder: null,

  // Razorpay
  razorpayKey: null,
  razorpayKeyLoading: false,
  razorpayKeyError: null,

  // Payment verification
  paymentVerification: {
    loading: false,
    error: null,
    success: false,
  },

  // Selected address for checkout
  selectedAddressId: null,

  // Payment method and plan
  paymentMethod: null,
  paymentPlan: "full", // "full" or "advance"
  /** Remaining balance after advance: "online" (Razorpay) or "cod" (courier) */
  balanceCollection: "online",

  // Coupon
  couponCode: "",
  availableCoupons: [],
  couponValidation: {
    loading: false,
    error: null,
    valid: false,
    details: null,
  },

  /** Server checkout policy (COD / partial payment) — see GET /checkout/settings */
  checkoutPolicy: null,
  checkoutPolicyLoading: false,
  checkoutPolicyError: null,

  // Loading flags
  loading: {
    delivery: false,
    quote: false,
    confirm: false,
    placeOrder: false,
  },

  // Errors
  error: {
    delivery: null,
    quote: null,
    confirm: null,
    placeOrder: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────
const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setSelectedAddress: (state, action) => {
      state.selectedAddressId = action.payload;
      state.quote = null;
      state.quoteId = null;
      state.quoteExpiresAt = null;
      state.confirmed = null;
      state.error.quote = null;
      state.error.confirm = null;
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setPaymentPlan: (state, action) => {
      state.paymentPlan = action.payload;
    },
    setBalanceCollection: (state, action) => {
      state.balanceCollection = action.payload === "cod" ? "cod" : "online";
    },
    setCouponCode: (state, action) => {
      state.couponCode = action.payload;
    },
    setCheckoutPolicy: (state, action) => {
      state.checkoutPolicy = action.payload ?? null;
    },
    resetQuote: (state) => {
      state.quote = null;
      state.quoteId = null;
      state.quoteExpiresAt = null;
      state.confirmed = null;
      state.error.quote = null;
      state.error.confirm = null;
    },
    resetCheckout: () => initialState,
    clearCheckoutErrors: (state) => {
      state.error = initialState.error;
      state.razorpayKeyError = null;
      state.paymentVerification.error = null;
    },
    setDeliveryResult: (state, action) => {
      state.delivery = { ...state.delivery, ...action.payload };
    },
    resetPaymentVerification: (state) => {
      state.paymentVerification = initialState.paymentVerification;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchCheckoutSettings ────────────────────────────────────────────
      .addCase(fetchCheckoutSettings.pending, (state) => {
        state.checkoutPolicyLoading = true;
        state.checkoutPolicyError = null;
      })
      .addCase(fetchCheckoutSettings.fulfilled, (state, action) => {
        state.checkoutPolicyLoading = false;
        state.checkoutPolicy = action.payload?.data ?? null;
        state.checkoutPolicyError = null;
      })
      .addCase(fetchCheckoutSettings.rejected, (state, action) => {
        state.checkoutPolicyLoading = false;
        state.checkoutPolicyError = action.payload || { message: "Failed to load checkout settings" };
      })

      // ── checkDelivery ────────────────────────────────────────────────────
      .addCase(checkDelivery.pending, (state) => {
        state.loading.delivery = true;
        state.error.delivery = null;
        state.delivery.isDeliverable = null;
      })
      .addCase(checkDelivery.fulfilled, (state, action) => {
        state.loading.delivery = false;
        state.delivery = {
          isDeliverable: action.payload.isDeliverable,
          estimatedDays: action.payload.estimatedDays,
          courierName: action.payload.courierName,
          checkedPincode: action.payload.pincode,
          message: action.payload.message,
        };
      })
      .addCase(checkDelivery.rejected, (state, action) => {
        state.loading.delivery = false;
        state.error.delivery = action.payload || { message: "Delivery check failed" };
        state.delivery.isDeliverable = false;
      })

      // ── fetchAvailableCoupons ──────────────────────────────────────────────
      .addCase(fetchAvailableCoupons.pending, (state) => {
        state.couponValidation.error = null;
      })
      .addCase(fetchAvailableCoupons.fulfilled, (state, action) => {
        state.availableCoupons = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAvailableCoupons.rejected, (state, action) => {
        state.availableCoupons = [];
        state.couponValidation.error = action.payload || { message: "Failed to load coupons" };
      })

      // ── validateCouponCode ────────────────────────────────────────────────
      .addCase(validateCouponCode.pending, (state) => {
        state.couponValidation.loading = true;
        state.couponValidation.error = null;
        state.couponValidation.valid = false;
      })
      .addCase(validateCouponCode.fulfilled, (state, action) => {
        state.couponValidation.loading = false;
        state.couponValidation.valid = true;
        state.couponValidation.details = action.payload?.coupon || null;
      })
      .addCase(validateCouponCode.rejected, (state, action) => {
        state.couponValidation.loading = false;
        state.couponValidation.error = action.payload || { message: "Invalid coupon" };
        state.couponValidation.valid = false;
        state.couponValidation.details = null;
      })

      // ── fetchCheckoutQuote ───────────────────────────────────────────────
      .addCase(fetchCheckoutQuote.pending, (state) => {
        state.loading.quote = true;
        state.error.quote = null;
        state.quote = null;
        state.quoteId = null;
        state.confirmed = null;
      })
      .addCase(fetchCheckoutQuote.fulfilled, (state, action) => {
        state.loading.quote = false;
        state.quote = action.payload;
        state.quoteId = action.payload.quoteId;
        state.quoteExpiresAt = action.payload.quoteExpiresAt;
        if (action.payload?.checkoutPolicy) {
          state.checkoutPolicy = action.payload.checkoutPolicy;
        }
      })
      .addCase(fetchCheckoutQuote.rejected, (state, action) => {
        state.loading.quote = false;
        state.error.quote = action.payload || { message: "Failed to get quote" };
      })

      // ── confirmCheckoutQuote ─────────────────────────────────────────────
      .addCase(confirmCheckoutQuote.pending, (state) => {
        state.loading.confirm = true;
        state.error.confirm = null;
      })
      .addCase(confirmCheckoutQuote.fulfilled, (state, action) => {
        state.loading.confirm = false;
        state.confirmed = action.payload;
        if (action.payload?.checkoutPolicy) {
          state.checkoutPolicy = action.payload.checkoutPolicy;
        }
        if (action.payload?.totals) {
          state.quote = { ...state.quote, ...action.payload.totals };
        }
      })
      .addCase(confirmCheckoutQuote.rejected, (state, action) => {
        state.loading.confirm = false;
        state.error.confirm = action.payload || { message: "Failed to confirm quote" };
        const latest = action.payload?.details?.latest;
        if (latest) {
          state.quote = { ...state.quote, ...latest };
          state.error.confirm = {
            ...action.payload,
            message: "Prices updated — please review and confirm again",
          };
        }
        if (action.payload?.code === "QUOTE_EXPIRED" || action.payload?.details?.reason === "quote_expired") {
          state.quote = null;
          state.quoteId = null;
          state.quoteExpiresAt = null;
        }
      })

      // ── placeOrder ───────────────────────────────────────────────────────
      .addCase(placeOrder.pending, (state) => {
        state.loading.placeOrder = true;
        state.error.placeOrder = null;
        state.placedOrder = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.loading.placeOrder = false;
        state.placedOrder = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.loading.placeOrder = false;
        state.error.placeOrder = action.payload || { message: "Failed to place order" };
      })

      // ── getRazorpayKey ───────────────────────────────────────────────────
      .addCase(getRazorpayKey.pending, (state) => {
        state.razorpayKeyLoading = true;
        state.razorpayKeyError = null;
      })
      .addCase(getRazorpayKey.fulfilled, (state, action) => {
        state.razorpayKeyLoading = false;
        state.razorpayKey = action.payload;
      })
      .addCase(getRazorpayKey.rejected, (state, action) => {
        state.razorpayKeyLoading = false;
        state.razorpayKeyError = action.payload?.message || "Failed to get Razorpay key";
      })

      // ── verifyRazorpayPayment ────────────────────────────────────────────
      .addCase(verifyRazorpayPayment.pending, (state) => {
        state.paymentVerification.loading = true;
        state.paymentVerification.error = null;
        state.paymentVerification.success = false;
      })
      .addCase(verifyRazorpayPayment.fulfilled, (state, action) => {
        state.paymentVerification.loading = false;
        state.paymentVerification.success = true;
        // Update order status in placedOrder
        if (state.placedOrder?.order) {
          state.placedOrder.order.orderStatus = action.payload.order?.orderStatus || "confirmed";
          state.placedOrder.order.paymentStatus = action.payload.order?.paymentStatus || "paid";
        }
      })
      .addCase(verifyRazorpayPayment.rejected, (state, action) => {
        state.paymentVerification.loading = false;
        state.paymentVerification.error = action.payload?.message || "Payment verification failed";
        state.paymentVerification.success = false;
      });
  },
});

export const {
  setSelectedAddress,
  setPaymentMethod,
  setPaymentPlan,
  setBalanceCollection,
  setCouponCode,
  setCheckoutPolicy,
  resetQuote,
  resetCheckout,
  clearCheckoutErrors,
  setDeliveryResult,
  resetPaymentVerification,
} = checkoutSlice.actions;

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────
export const selectDelivery = (s) => s.checkout.delivery;
export const selectQuote = (s) => s.checkout.quote;
export const selectQuoteId = (s) => s.checkout.quoteId;
export const selectConfirmed = (s) => s.checkout.confirmed;
export const selectPlacedOrder = (s) => s.checkout.placedOrder;
export const selectSelectedAddressId = (s) => s.checkout.selectedAddressId;
export const selectPaymentMethod = (s) => s.checkout.paymentMethod;
export const selectPaymentPlan = (s) => s.checkout.paymentPlan;
export const selectBalanceCollection = (s) => s.checkout.balanceCollection;
export const selectCouponCode = (s) => s.checkout.couponCode;
export const selectAvailableCoupons = (s) => s.checkout.availableCoupons;
export const selectCouponValidation = (s) => s.checkout.couponValidation;
export const selectCheckoutLoading = (s) => s.checkout.loading;
export const selectCheckoutError = (s) => s.checkout.error;
export const selectRazorpayKey = (s) => s.checkout.razorpayKey;
export const selectRazorpayKeyLoading = (s) => s.checkout.razorpayKeyLoading;
export const selectRazorpayKeyError = (s) => s.checkout.razorpayKeyError;
export const selectPaymentVerification = (s) => s.checkout.paymentVerification;
export const selectCheckoutPolicy = (s) => s.checkout.checkoutPolicy;
export const selectCheckoutPolicyLoading = (s) => s.checkout.checkoutPolicyLoading;
export const selectCheckoutPolicyError = (s) => s.checkout.checkoutPolicyError;

export default checkoutSlice.reducer;
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────────────────────
// // Thunks
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * POST /api/checkout/quote
//  * Requires: addressId, optional couponCode, paymentMethodHint
//  */
// export const fetchCheckoutQuote = createAsyncThunk(
//   "checkout/fetchQuote",
//   async ({ addressId, couponCode, paymentMethodHint = "cod", demoMockShipping = false }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/checkout/quote", {
//         addressId,
//         couponCode: couponCode || undefined,
//         paymentMethodHint,
//         demoMockShipping,
//       });
//       if (!res.data.success) throw new Error(res.data.message || "Failed to get quote");
//       return res.data;
//     } catch (err) {
//       return rejectWithValue({
//         message: err.response?.data?.message || err.message || "Failed to get quote",
//         code: err.response?.data?.code,
//         status: err.response?.status,
//       });
//     }
//   }
// );

// /**
//  * POST /api/checkout/confirm
//  * Requires: quoteId, paymentMethod ("cod" | "online")
//  */
// export const confirmCheckoutQuote = createAsyncThunk(
//   "checkout/confirmQuote",
//   async ({ quoteId, paymentMethod = "cod", paymentPlan = "full" }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/checkout/confirm", {
//         quoteId,
//         paymentMethod,
//         paymentPlan,
//       });
//       if (!res.data.success) throw new Error(res.data.message || "Failed to confirm quote");
//       return res.data;
//     } catch (err) {
//       return rejectWithValue({
//         message: err.response?.data?.message || err.message || "Failed to confirm quote",
//         code: err.response?.data?.code,
//         latest: err.response?.data?.latest,
//         status: err.response?.status,
//       });
//     }
//   }
// );

// /**
//  * POST /api/orders/items
//  * Requires: addressId, paymentMethod, quoteId, optional couponCode
//  */
// export const placeOrder = createAsyncThunk(
//   "checkout/placeOrder",
//   async ({ addressId, paymentMethod = "cod", quoteId, couponCode }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/orders/items", {
//         addressId,
//         paymentMethod,
//         quoteId,
//         couponCode: couponCode || undefined,
//         onlinePaymentMode: "full",
//       });
//       if (!res.data.success) throw new Error(res.data.message || "Failed to place order");
//       return res.data;
//     } catch (err) {
//       return rejectWithValue({
//         message: err.response?.data?.message || err.message || "Failed to place order",
//         code: err.response?.data?.code,
//         status: err.response?.status,
//       });
//     }
//   }
// );

// /**
//  * POST /api/delivery/check-delivery
//  * Checks if a pincode is serviceable (used by DeliveryChecker component)
//  */
// export const checkDelivery = createAsyncThunk(
//   "checkout/checkDelivery",
//   async ({ pincode }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/delivery/check-delivery", { pincode });
//       if (!res.data.success) throw new Error(res.data.message || "Delivery check failed");
//       return res.data; // { isDeliverable, estimatedDays, courierName, message, pincode }
//     } catch (err) {
//       return rejectWithValue({
//         message: err.response?.data?.message || err.message || "Delivery check failed",
//         status: err.response?.status,
//       });
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Initial State
// // ─────────────────────────────────────────────────────────────────────────────
// const initialState = {
//   // Delivery check (DeliveryChecker component)
//   delivery: {
//     isDeliverable: null,    // null = unchecked, true/false = result
//     estimatedDays: null,
//     courierName: null,
//     checkedPincode: null,
//     message: null,
//   },

//   // Quote
//   quote: null,              // full quote response object
//   quoteId: null,
//   quoteExpiresAt: null,

//   // Confirmed quote (after /confirm)
//   confirmed: null,

//   // Placed order result
//   placedOrder: null,        // { orderId, totalAmount, orderStatus, paymentMethod, ... }

//   // Selected address for checkout
//   selectedAddressId: null,

//   // Payment method chosen by user
//   paymentMethod: "cod",

//   // Coupon
//   couponCode: "",

//   // Loading flags
//   loading: {
//     delivery: false,
//     quote: false,
//     confirm: false,
//     placeOrder: false,
//   },

//   // Errors
//   error: {
//     delivery: null,
//     quote: null,
//     confirm: null,
//     placeOrder: null,
//   },
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Slice
// // ─────────────────────────────────────────────────────────────────────────────
// const checkoutSlice = createSlice({
//   name: "checkout",
//   initialState,
//   reducers: {
//     setSelectedAddress: (state, action) => {
//       state.selectedAddressId = action.payload;
//       // Reset quote when address changes — must re-quote
//       state.quote = null;
//       state.quoteId = null;
//       state.quoteExpiresAt = null;
//       state.confirmed = null;
//       state.error.quote = null;
//       state.error.confirm = null;
//     },
//     setPaymentMethod: (state, action) => {
//       state.paymentMethod = action.payload;
//     },
//     setCouponCode: (state, action) => {
//       state.couponCode = action.payload;
//     },
//     resetQuote: (state) => {
//       state.quote = null;
//       state.quoteId = null;
//       state.quoteExpiresAt = null;
//       state.confirmed = null;
//       state.error.quote = null;
//       state.error.confirm = null;
//     },
//     resetCheckout: () => initialState,
//     clearCheckoutErrors: (state) => {
//       state.error = initialState.error;
//     },
//     // Called when delivery check result is already known (e.g. pre-checked in cart)
//     setDeliveryResult: (state, action) => {
//       state.delivery = { ...state.delivery, ...action.payload };
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // ── checkDelivery ────────────────────────────────────────────────────
//       .addCase(checkDelivery.pending, (state) => {
//         state.loading.delivery = true;
//         state.error.delivery = null;
//         state.delivery.isDeliverable = null;
//       })
//       .addCase(checkDelivery.fulfilled, (state, action) => {
//         state.loading.delivery = false;
//         state.delivery = {
//           isDeliverable: action.payload.isDeliverable,
//           estimatedDays: action.payload.estimatedDays,
//           courierName: action.payload.courierName,
//           checkedPincode: action.payload.pincode,
//           message: action.payload.message,
//         };
//       })
//       .addCase(checkDelivery.rejected, (state, action) => {
//         state.loading.delivery = false;
//         state.error.delivery = action.payload || { message: "Delivery check failed" };
//         state.delivery.isDeliverable = false;
//       })

//       // ── fetchCheckoutQuote ───────────────────────────────────────────────
//       .addCase(fetchCheckoutQuote.pending, (state) => {
//         state.loading.quote = true;
//         state.error.quote = null;
//         state.quote = null;
//         state.quoteId = null;
//         state.confirmed = null;
//       })
//       .addCase(fetchCheckoutQuote.fulfilled, (state, action) => {
//         state.loading.quote = false;
//         state.quote = action.payload;
//         state.quoteId = action.payload.quoteId;
//         state.quoteExpiresAt = action.payload.quoteExpiresAt;
//       })
//       .addCase(fetchCheckoutQuote.rejected, (state, action) => {
//         state.loading.quote = false;
//         state.error.quote = action.payload || { message: "Failed to get quote" };
//       })

//       // ── confirmCheckoutQuote ─────────────────────────────────────────────
//       .addCase(confirmCheckoutQuote.pending, (state) => {
//         state.loading.confirm = true;
//         state.error.confirm = null;
//       })
//       .addCase(confirmCheckoutQuote.fulfilled, (state, action) => {
//         state.loading.confirm = false;
//         state.confirmed = action.payload;
//         // If backend returns updated totals on stale quote, update quote too
//         if (action.payload?.totals) {
//           state.quote = { ...state.quote, ...action.payload.totals };
//         }
//       })
//       .addCase(confirmCheckoutQuote.rejected, (state, action) => {
//         state.loading.confirm = false;
//         state.error.confirm = action.payload || { message: "Failed to confirm quote" };
//         // If quote is stale, update quote with latest from backend
//         if (action.payload?.latest) {
//           state.quote = { ...state.quote, ...action.payload.latest };
//           state.error.confirm = {
//             ...action.payload,
//             message: "Prices updated — please review and confirm again",
//           };
//         }
//         // If quote expired, reset it
//         if (action.payload?.message?.toLowerCase().includes("expired")) {
//           state.quote = null;
//           state.quoteId = null;
//           state.quoteExpiresAt = null;
//         }
//       })

//       // ── placeOrder ───────────────────────────────────────────────────────
//       .addCase(placeOrder.pending, (state) => {
//         state.loading.placeOrder = true;
//         state.error.placeOrder = null;
//       })
//       .addCase(placeOrder.fulfilled, (state, action) => {
//         state.loading.placeOrder = false;
//         state.placedOrder = action.payload;
//       })
//       .addCase(placeOrder.rejected, (state, action) => {
//         state.loading.placeOrder = false;
//         state.error.placeOrder = action.payload || { message: "Failed to place order" };
//       });
//   },
// });

// export const {
//   setSelectedAddress,
//   setPaymentMethod,
//   setCouponCode,
//   resetQuote,
//   resetCheckout,
//   clearCheckoutErrors,
//   setDeliveryResult,
// } = checkoutSlice.actions;

// // ─────────────────────────────────────────────────────────────────────────────
// // Selectors
// // ─────────────────────────────────────────────────────────────────────────────
// export const selectDelivery         = (s) => s.checkout.delivery;
// export const selectQuote            = (s) => s.checkout.quote;
// export const selectQuoteId          = (s) => s.checkout.quoteId;
// export const selectConfirmed        = (s) => s.checkout.confirmed;
// export const selectPlacedOrder      = (s) => s.checkout.placedOrder;
// export const selectSelectedAddressId = (s) => s.checkout.selectedAddressId;
// export const selectPaymentMethod    = (s) => s.checkout.paymentMethod;
// export const selectCouponCode       = (s) => s.checkout.couponCode;
// export const selectCheckoutLoading  = (s) => s.checkout.loading;
// export const selectCheckoutError    = (s) => s.checkout.error;

// export default checkoutSlice.reducer;