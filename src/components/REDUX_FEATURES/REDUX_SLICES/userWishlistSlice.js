import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

// ── Error Logger ──────────────────────────────────────────────────────────────
const logError = (context, error, info = {}) => {
  console.group(`🔴 [userWishlistSlice] ERROR in ${context}`);
  console.error("Error:", error);
  console.log("Message:", error.response?.data?.message || error.message);
  console.log("Status:", error.response?.status);
  console.log("Info:", info);
  console.groupEnd();
};

// ── localStorage helpers (guest wishlist) ─────────────────────────────────────
const GUEST_KEY = "guestWishlist"; // array of slugs

export const getGuestWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveGuestWishlist = (slugs) => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(slugs));
  } catch (e) {
    console.error("🔴 [userWishlistSlice] Failed to save guest wishlist", e);
  }
};

export const clearGuestWishlist = () => {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch (e) {
    console.error("🔴 [userWishlistSlice] Failed to clear guest wishlist", e);
  }
};

// ── Thunks ────────────────────────────────────────────────────────────────────

// GET /api/wishlist
export const fetchWishlist = createAsyncThunk(
  "userWishlist/fetchWishlist",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("💛 [fetchWishlist] Fetching wishlist from server...");
      const response = await axiosInstance.get("/wishlist");
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch wishlist");
      // console.log(`✅ [fetchWishlist] Got ${response.data.wishlist?.products?.length || 0} items`);
      return response.data.wishlist;
    } catch (error) {
      logError("fetchWishlist", error);
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load wishlist",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/wishlist/add
export const addToWishlist = createAsyncThunk(
  "userWishlist/addToWishlist",
  async ({ productSlug, variantId }, { rejectWithValue }) => {
    try {
      // console.log(`💛 [addToWishlist] Adding slug="${productSlug}"...`);
      const response = await axiosInstance.post("/wishlist/add", {
        productSlug,
        variantId,
      });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to add to wishlist");
      // console.log(`✅ [addToWishlist] slug="${productSlug}" added`);
      return response.data.wishlist;
    } catch (error) {
      logError("addToWishlist", error, { productSlug });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to add to wishlist",
        status: error.response?.status,
      });
    }
  }
);

// DELETE /api/wishlist/remove/:productSlug
export const removeFromWishlist = createAsyncThunk(
  "userWishlist/removeFromWishlist",
  async ({ productSlug }, { rejectWithValue }) => {
    try {
      // console.log(`💛 [removeFromWishlist] Removing slug="${productSlug}"...`);
      const response = await axiosInstance.delete(
        `/wishlist/remove/${productSlug}`
      );
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to remove from wishlist");
      // console.log(`✅ [removeFromWishlist] slug="${productSlug}" removed`);
      return response.data.wishlist;
    } catch (error) {
      logError("removeFromWishlist", error, { productSlug });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to remove from wishlist",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/wishlist/merge  (guest → logged in sync)
export const mergeWishlist = createAsyncThunk(
  "userWishlist/mergeWishlist",
  async ({ slugs }, { rejectWithValue }) => {
    try {
      // console.log(`💛 [mergeWishlist] Merging ${slugs.length} guest items...`);
      const response = await axiosInstance.post("/wishlist/merge", { slugs });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to merge wishlist");
      // console.log("✅ [mergeWishlist] Guest wishlist merged successfully");
      return response.data;
    } catch (error) {
      logError("mergeWishlist", error, { slugs });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to merge wishlist",
        status: error.response?.status,
      });
    }
  }
);

// DELETE /api/wishlist/clear
export const clearWishlist = createAsyncThunk(
  "userWishlist/clearWishlist",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("💛 [clearWishlist] Clearing wishlist...");
      const response = await axiosInstance.delete("/wishlist/clear");
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to clear wishlist");
      // console.log("✅ [clearWishlist] Wishlist cleared");
      return response.data.wishlist;
    } catch (error) {
      logError("clearWishlist", error);
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to clear wishlist",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/wishlist/move-to-cart
export const moveToCart = createAsyncThunk(
  "userWishlist/moveToCart",
  async ({ productIds, moveAll = false }, { rejectWithValue }) => {
    try {
      // console.log(`💛 [moveToCart] Moving ${moveAll ? "all" : productIds?.length} items to cart...`);
      const response = await axiosInstance.post("/wishlist/move-to-cart", {
        productIds,
        moveAll,
      });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to move to cart");
      // console.log("✅ [moveToCart] Items moved to cart successfully");
      return response.data;
    } catch (error) {
      logError("moveToCart", error, { productIds, moveAll });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to move to cart",
        status: error.response?.status,
      });
    }
  }
);

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  items: [],          // wishlist products array from DB
  guestItems: [],     // slugs array for non-logged-in users
  totalItems: 0,
  loading: {
    fetch: false,
    add: false,
    remove: false,
    merge: false,
    clear: false,
    moveToCart: false,
  },
  error: {
    fetch: null,
    add: null,
    remove: null,
    merge: null,
    clear: null,
    moveToCart: null,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// normalize wishlist response → always a flat products array
const normalizeItems = (wishlist) =>
  Array.isArray(wishlist?.products) ? wishlist.products : [];

// ── Slice ─────────────────────────────────────────────────────────────────────
const userWishlistSlice = createSlice({
  name: "userWishlist",
  initialState,
  reducers: {
    // Guest: add slug to local state + localStorage
    addGuestItem: (state, action) => {
      const slug = action.payload;
      if (!state.guestItems.includes(slug)) {
        state.guestItems.push(slug);
        saveGuestWishlist(state.guestItems);
        // console.log(`💛 [addGuestItem] slug="${slug}" added to guest wishlist`);
      }
    },
    // Guest: remove slug from local state + localStorage
    removeGuestItem: (state, action) => {
      const slug = action.payload;
      state.guestItems = state.guestItems.filter((s) => s !== slug);
      saveGuestWishlist(state.guestItems);
      // console.log(`💛 [removeGuestItem] slug="${slug}" removed from guest wishlist`);
    },
    // Load guest wishlist from localStorage into state on app init
    loadGuestWishlist: (state) => {
      state.guestItems = getGuestWishlist();
      // console.log(`💛 [loadGuestWishlist] Loaded ${state.guestItems.length} guest items`);
    },
    // After merge — clear guest items from state + localStorage
    clearGuestItems: (state) => {
      state.guestItems = [];
      clearGuestWishlist();
      // console.log("💛 [clearGuestItems] Guest wishlist cleared after merge");
    },
    // Clear all errors
    clearWishlistErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder

      // ── fetchWishlist ────────────────────────────────────────────────────
      .addCase(fetchWishlist.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.items = normalizeItems(action.payload);
        state.totalItems = state.items.length;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload || { message: "Failed to fetch wishlist" };
        console.error("❌ [fetchWishlist] rejected:", action.payload?.message);
      })

      // ── addToWishlist ────────────────────────────────────────────────────
      .addCase(addToWishlist.pending, (state) => {
        state.loading.add = true;
        state.error.add = null;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.loading.add = false;
        state.items = normalizeItems(action.payload);
        state.totalItems = state.items.length;
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.loading.add = false;
        state.error.add = action.payload || { message: "Failed to add to wishlist" };
        console.error("❌ [addToWishlist] rejected:", action.payload?.message);
      })

      // ── removeFromWishlist ───────────────────────────────────────────────
      .addCase(removeFromWishlist.pending, (state) => {
        state.loading.remove = true;
        state.error.remove = null;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.loading.remove = false;
        state.items = normalizeItems(action.payload);
        state.totalItems = state.items.length;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.loading.remove = false;
        state.error.remove = action.payload || { message: "Failed to remove from wishlist" };
        console.error("❌ [removeFromWishlist] rejected:", action.payload?.message);
      })

      // ── mergeWishlist ────────────────────────────────────────────────────
      .addCase(mergeWishlist.pending, (state) => {
        state.loading.merge = true;
        state.error.merge = null;
      })
      .addCase(mergeWishlist.fulfilled, (state, action) => {
        state.loading.merge = false;
        // after merge, re-fetch will update items — or clear guest
        // console.log("✅ [mergeWishlist] fulfilled");
      })
      .addCase(mergeWishlist.rejected, (state, action) => {
        state.loading.merge = false;
        state.error.merge = action.payload || { message: "Failed to merge wishlist" };
        console.error("❌ [mergeWishlist] rejected:", action.payload?.message);
      })

      // ── clearWishlist ────────────────────────────────────────────────────
      .addCase(clearWishlist.pending, (state) => {
        state.loading.clear = true;
        state.error.clear = null;
      })
      .addCase(clearWishlist.fulfilled, (state) => {
        state.loading.clear = false;
        state.items = [];
        state.totalItems = 0;
      })
      .addCase(clearWishlist.rejected, (state, action) => {
        state.loading.clear = false;
        state.error.clear = action.payload || { message: "Failed to clear wishlist" };
        console.error("❌ [clearWishlist] rejected:", action.payload?.message);
      })

      // ── moveToCart ───────────────────────────────────────────────────────
      .addCase(moveToCart.pending, (state) => {
        state.loading.moveToCart = true;
        state.error.moveToCart = null;
      })
      .addCase(moveToCart.fulfilled, (state, action) => {
        state.loading.moveToCart = false;
        // backend returns updated wishlist after move
        if (action.payload?.cart) {
          // console.log("✅ [moveToCart] Cart updated");
        }
      })
      .addCase(moveToCart.rejected, (state, action) => {
        state.loading.moveToCart = false;
        state.error.moveToCart = action.payload || { message: "Failed to move to cart" };
        console.error("❌ [moveToCart] rejected:", action.payload?.message);
      });
  },
});

export const {
  addGuestItem,
  removeGuestItem,
  loadGuestWishlist,
  clearGuestItems,
  clearWishlistErrors,
} = userWishlistSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectWishlistItems      = (state) => state.userWishlist.items;
export const selectWishlistGuestItems = (state) => state.userWishlist.guestItems;
export const selectWishlistCount      = (state) => state.userWishlist.totalItems;
export const selectWishlistLoading    = (state) => state.userWishlist.loading;
export const selectWishlistError      = (state) => state.userWishlist.error;

// ✅ Check if a specific product slug is wishlisted (works for both logged in + guest)
export const selectIsWishlisted = (slug) => (state) => {
  const { isLoggedIn } = state.auth;
  if (isLoggedIn) {
    return state.userWishlist.items.some(
      (item) => item.product?.slug === slug
    );
  }
  return state.userWishlist.guestItems.includes(slug);
};

export default userWishlistSlice.reducer;