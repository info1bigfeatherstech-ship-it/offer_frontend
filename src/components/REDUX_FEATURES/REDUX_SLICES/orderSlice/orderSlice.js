import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../../SERVICES/axiosInstance";

// ─────────────────────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/orders/items */
export const fetchUserOrders = createAsyncThunk(
  "orders/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/orders/items");
      if (!res.data.success) throw new Error(res.data.message || "Failed to fetch orders");
      return res.data; // { success, count, orders: [...] }
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to fetch orders",
        status: err.response?.status,
      });
    }
  }
);

/** GET /api/orders/items/:orderId */
export const fetchOrderById = createAsyncThunk(
  "orders/fetchById",
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/orders/items/${orderId}`);
      if (!res.data.success) throw new Error(res.data.message || "Order not found");
      return res.data.order;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Order not found",
        status: err.response?.status,
      });
    }
  }
);

/** GET /api/orders/items/:orderId/track */
export const trackOrder = createAsyncThunk(
  "orders/track",
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/orders/items/${orderId}/track`);
      if (!res.data.success) throw new Error(res.data.message || "Tracking not available");
      return { orderId, tracking: res.data.tracking };
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to track order",
        status: err.response?.status,
      });
    }
  }
);

/** PUT /api/orders/items/:orderId/cancel */
export const cancelOrder = createAsyncThunk(
  "orders/cancel",
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/orders/items/${orderId}/cancel`);
      if (!res.data.success) throw new Error(res.data.message || "Failed to cancel order");
      return res.data.order; // { orderId, orderStatus, paymentStatus }
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Failed to cancel order",
        status: err.response?.status,
      });
    }
  }
);

/**
 * POST /api/orders/items/:orderId/initiate-payment
 * Retry Razorpay checkout for an unpaid online order (same user as order owner).
 */
export const initiatePendingOrderPayment = createAsyncThunk(
  "orders/initiatePendingPayment",
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        `/orders/items/${encodeURIComponent(String(orderId))}/initiate-payment`
      );
      if (!res.data.success) throw new Error(res.data.message || "Could not start payment");
      return res.data;
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Could not start payment";
      return rejectWithValue({
        message: msg,
        code: err.response?.data?.code,
        status: err.response?.status,
      });
    }
  }
);

/** POST /api/orders/items/:orderId/return-request (multipart) */
export const createReturnRequest = createAsyncThunk(
  "orders/createReturnRequest",
  async ({ orderId, reasonType, reasonMessage, proofVideo, proofImages }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append("reasonType", reasonType);
      form.append("reasonMessage", reasonMessage);
      if (proofVideo) form.append("proofVideo", proofVideo);
      (proofImages || []).forEach((img) => {
        form.append("proofImages", img);
      });

      const res = await axiosInstance.post(
        `/orders/items/${encodeURIComponent(String(orderId))}/return-request`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (!res.data.success) throw new Error(res.data.message || "Could not submit return request");
      return { orderId, payload: res.data };
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message || "Could not submit return request",
        code: err.response?.data?.code,
        status: err.response?.status,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────
const initialState = {
  orders: [],           // list from GET /orders/items
  activeOrder: null,    // single order from GET /orders/items/:id
  tracking: {},         // { [orderId]: trackingData }

  loading: {
    fetch: false,
    fetchOne: false,
    track: false,
    cancel: false,
    initiatePayment: false,
    returnRequest: false,
  },
  error: {
    fetch: null,
    fetchOne: null,
    track: null,
    cancel: null,
    initiatePayment: null,
    returnRequest: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────
const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearOrderErrors: (state) => {
      state.error = { ...initialState.error };
    },
    clearActiveOrder: (state) => {
      state.activeOrder = null;
      state.error.fetchOne = null;
    },
    // Optimistically update order status in list (e.g. after cancel)
    updateOrderInList: (state, action) => {
      const updated = action.payload;
      state.orders = state.orders.map((o) =>
        o.orderId === updated.orderId ? { ...o, ...updated } : o
      );
      if (state.activeOrder?.orderId === updated.orderId) {
        state.activeOrder = { ...state.activeOrder, ...updated };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchUserOrders ──────────────────────────────────────────────────
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.orders = action.payload.orders || [];
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload || { message: "Failed to fetch orders" };
      })

      // ── fetchOrderById ───────────────────────────────────────────────────
      .addCase(fetchOrderById.pending, (state) => {
        state.loading.fetchOne = true;
        state.error.fetchOne = null;
        state.activeOrder = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading.fetchOne = false;
        state.activeOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading.fetchOne = false;
        state.error.fetchOne = action.payload || { message: "Order not found" };
      })

      // ── trackOrder ───────────────────────────────────────────────────────
      .addCase(trackOrder.pending, (state) => {
        state.loading.track = true;
        state.error.track = null;
      })
      .addCase(trackOrder.fulfilled, (state, action) => {
        state.loading.track = false;
        state.tracking[action.payload.orderId] = action.payload.tracking;
      })
      .addCase(trackOrder.rejected, (state, action) => {
        state.loading.track = false;
        state.error.track = action.payload || { message: "Failed to track order" };
      })

      // ── cancelOrder ──────────────────────────────────────────────────────
      .addCase(cancelOrder.pending, (state) => {
        state.loading.cancel = true;
        state.error.cancel = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading.cancel = false;
        const updated = action.payload;
        // Update in list
        state.orders = state.orders.map((o) =>
          o.orderId === updated.orderId ? { ...o, ...updated } : o
        );
        // Update active order if open
        if (state.activeOrder?.orderId === updated.orderId) {
          state.activeOrder = { ...state.activeOrder, ...updated };
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading.cancel = false;
        state.error.cancel = action.payload || { message: "Failed to cancel order" };
      })

      // ── initiatePendingOrderPayment ─────────────────────────────────────
      .addCase(initiatePendingOrderPayment.pending, (state) => {
        state.loading.initiatePayment = true;
        state.error.initiatePayment = null;
      })
      .addCase(initiatePendingOrderPayment.fulfilled, (state) => {
        state.loading.initiatePayment = false;
        state.error.initiatePayment = null;
      })
      .addCase(initiatePendingOrderPayment.rejected, (state, action) => {
        state.loading.initiatePayment = false;
        state.error.initiatePayment = action.payload || { message: "Could not start payment" };
      })

      // ── createReturnRequest ──────────────────────────────────────────────
      .addCase(createReturnRequest.pending, (state) => {
        state.loading.returnRequest = true;
        state.error.returnRequest = null;
      })
      .addCase(createReturnRequest.fulfilled, (state) => {
        state.loading.returnRequest = false;
        state.error.returnRequest = null;
      })
      .addCase(createReturnRequest.rejected, (state, action) => {
        state.loading.returnRequest = false;
        state.error.returnRequest = action.payload || { message: "Could not submit return request" };
      });
  },
});

export const { clearOrderErrors, clearActiveOrder, updateOrderInList } = orderSlice.actions;

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────
export const selectOrders        = (s) => s.orders.orders;
export const selectActiveOrder   = (s) => s.orders.activeOrder;
export const selectTracking      = (orderId) => (s) => s.orders.tracking[orderId] || null;
export const selectOrderLoading  = (s) => s.orders.loading;
export const selectOrderError    = (s) => s.orders.error;

export default orderSlice.reducer;