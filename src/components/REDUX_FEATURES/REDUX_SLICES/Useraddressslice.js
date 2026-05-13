import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

// ── Error Logger ──────────────────────────────────────────────────────────────
const logError = (context, error, info = {}) => {
  console.group(`🔴 [userAddressSlice] ERROR in ${context}`);
  console.error("Error:", error);
  console.log("Message:", error.response?.data?.message || error.message);
  console.log("Status:", error.response?.status);
  console.log("Info:", info);
  console.groupEnd();
};

// ── Thunks ────────────────────────────────────────────────────────────────────

// GET /api/addresses
// Response: { success, count, defaultAddress, addresses: [...otherAddresses] }
export const fetchAddresses = createAsyncThunk(
  "userAddress/fetchAddresses",
  async (_, { rejectWithValue }) => {
    try {
      console.log("📍 [fetchAddresses] fetching...");
      const response = await axiosInstance.get("/addresses");
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch addresses");
      console.log(`✅ [fetchAddresses] got ${response.data.count} addresses`);
      return response.data;
    } catch (error) {
      logError("fetchAddresses", error);
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load addresses",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/addresses
export const addAddress = createAsyncThunk(
  "userAddress/addAddress",
  async (addressData, { rejectWithValue }) => {
    try {
      console.log("📍 [addAddress] adding...", addressData);
      const response = await axiosInstance.post("/addresses", addressData);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to add address");
      console.log(`✅ [addAddress] added: ${response.data.address?._id}`);
      return response.data.address;
    } catch (error) {
      logError("addAddress", error, { addressData });
      const data = error.response?.data;
      return rejectWithValue({
        message: data?.message || error.message || "Failed to add address",
        code: data?.code,
        errors: data?.errors,
        status: error.response?.status,
      });
    }
  }
);

// PUT /api/addresses/:id
export const updateAddress = createAsyncThunk(
  "userAddress/updateAddress",
  async ({ id, ...addressData }, { rejectWithValue }) => {
    try {
      console.log(`📍 [updateAddress] id="${id}"`);
      const response = await axiosInstance.put(`/addresses/${id}`, addressData);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to update address");
      console.log(`✅ [updateAddress] updated: ${id}`);
      return response.data.address;
    } catch (error) {
      logError("updateAddress", error, { id });
      const data = error.response?.data;
      return rejectWithValue({
        message: data?.message || error.message || "Failed to update address",
        code: data?.code,
        errors: data?.errors,
        status: error.response?.status,
      });
    }
  }
);

// DELETE /api/addresses/:id
export const deleteAddress = createAsyncThunk(
  "userAddress/deleteAddress",
  async (id, { rejectWithValue }) => {
    try {
      console.log(`📍 [deleteAddress] id="${id}"`);
      const response = await axiosInstance.delete(`/addresses/${id}`);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to delete address");
      console.log(`✅ [deleteAddress] deleted: ${id}`);
      return { id };
    } catch (error) {
      logError("deleteAddress", error, { id });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to delete address",
        status: error.response?.status,
      });
    }
  }
);

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  defaultAddress: null,   // single default address object
  addresses: [],          // all other (non-default) addresses
  loading: {
    fetch:  false,
    add:    false,
    update: false,
    delete: false,
  },
  error: {
    fetch:  null,
    add:    null,
    update: null,
    delete: null,
  },
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const userAddressSlice = createSlice({
  name: "userAddress",
  initialState,
  reducers: {
    clearAddressErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder

      // ── fetchAddresses ─────────────────────────────────────────────────────
      .addCase(fetchAddresses.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.defaultAddress = action.payload.defaultAddress || null;
        state.addresses = action.payload.addresses || [];
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload || { message: "Failed to fetch addresses" };
        console.error("❌ [fetchAddresses] rejected:", action.payload?.message);
      })

      // ── addAddress ────────────────────────────────────────────────────────
      .addCase(addAddress.pending, (state) => {
        state.loading.add = true;
        state.error.add = null;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.loading.add = false;
        const newAddr = action.payload;
        if (newAddr.isDefault) {
          // Demote current default to regular
          if (state.defaultAddress) {
            state.addresses.unshift({ ...state.defaultAddress, isDefault: false });
          }
          state.defaultAddress = newAddr;
        } else {
          state.addresses.push(newAddr);
        }
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.loading.add = false;
        state.error.add = action.payload || { message: "Failed to add address" };
        console.error("❌ [addAddress] rejected:", action.payload?.message);
      })

      // ── updateAddress ─────────────────────────────────────────────────────
      .addCase(updateAddress.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.loading.update = false;
        const updated = action.payload;

        if (updated.isDefault) {
          // This address became the new default
          // Demote old default to addresses list
          if (state.defaultAddress && state.defaultAddress._id !== updated._id) {
            state.addresses.unshift({ ...state.defaultAddress, isDefault: false });
          }
          // Remove updated address from addresses list if it was there
          state.addresses = state.addresses.filter((a) => a._id !== updated._id);
          state.defaultAddress = updated;
        } else {
          // Updated a non-default address
          if (state.defaultAddress?._id === updated._id) {
            state.defaultAddress = updated;
          } else {
            state.addresses = state.addresses.map((a) =>
              a._id === updated._id ? updated : a
            );
          }
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload || { message: "Failed to update address" };
        console.error("❌ [updateAddress] rejected:", action.payload?.message);
      })

      // ── deleteAddress ─────────────────────────────────────────────────────
      .addCase(deleteAddress.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.loading.delete = false;
        const { id } = action.payload;
        if (state.defaultAddress?._id === id) {
          // Deleted the default — promote first from list if any
          if (state.addresses.length > 0) {
            state.defaultAddress = { ...state.addresses[0], isDefault: true };
            state.addresses = state.addresses.slice(1);
          } else {
            state.defaultAddress = null;
          }
        } else {
          state.addresses = state.addresses.filter((a) => a._id !== id);
        }
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload || { message: "Failed to delete address" };
        console.error("❌ [deleteAddress] rejected:", action.payload?.message);
      });
  },
});

export const { clearAddressErrors } = userAddressSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectDefaultAddress  = (state) => state.userAddress.defaultAddress;
export const selectOtherAddresses  = (state) => state.userAddress.addresses;
export const selectAllAddresses    = (state) => [
  ...(state.userAddress.defaultAddress ? [state.userAddress.defaultAddress] : []),
  ...state.userAddress.addresses,
];
export const selectAddressLoading  = (state) => state.userAddress.loading;
export const selectAddressError    = (state) => state.userAddress.error;

export default userAddressSlice.reducer;