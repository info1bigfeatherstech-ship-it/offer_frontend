import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";
import {
  isScopeMismatchAxiosError,
  isSilentPortalScopePayload,
  thunkRejectFromAxios,
} from "../../../SERVICES/authPortalSession";

// ── Error Logger ──────────────────────────────────────────────────────────────
const logError = (context, error, info = {}) => {
  console.group(`🔴 [userCartSlice] ERROR in ${context}`);
  console.error("Error:", error);
  console.log("Message:", error.response?.data?.message || error.message);
  console.log("Status:", error.response?.status);
  console.log("Info:", info);
  console.groupEnd();
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const GUEST_CART_KEY = "guestCart";

export const getGuestCart = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  } catch (e) {
    console.error("🔴 [userCartSlice] Failed to parse guestCart", e);
    return [];
  }
};

export const saveGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("🔴 [userCartSlice] Failed to save guestCart", e);
  }
};

export const clearGuestCartStorage = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch (e) {
    console.error("🔴 [userCartSlice] Failed to clear guestCart", e);
  }
};

// ── Helper — normalize items and ALWAYS attach productSlug ───────────────────
// Backend returns productId as plain string ID (not populated with slug)
// We attach productSlug from the arg so selector can find items by slug
const normalizeItems = (items = [], slugMap = {}) => {
  return items.map((item) => {
    // if productId is populated object with slug — use it
    const populatedSlug = item.productId?.slug || null;
    // if we have it from our slugMap (passed from thunk arg) — use it
    const mappedSlug = slugMap[String(item.productId?._id || item.productId)] || null;
    return {
      ...item,
      // ✅ always attach _productSlug so selector works regardless of populate state
      _productSlug: populatedSlug || mappedSlug || item._productSlug || null,
    };
  });
};

const normalizeCart = (cart, slugMap = {}) => ({
  items: normalizeItems(Array.isArray(cart?.items) ? cart.items : [], slugMap),
  totalAmount: cart?.totalAmount ?? 0,
  totalItems: Array.isArray(cart?.items)
    ? cart.items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    : 0,
});

// ── Thunks ────────────────────────────────────────────────────────────────────

// GET /api/cart
export const fetchCart = createAsyncThunk(
  "userCart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("🛒 [fetchCart] Fetching cart...");
      const response = await axiosInstance.get("/cart");
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch cart");
      // console.log(`✅ [fetchCart] Got ${response.data.cart?.items?.length || 0} items`);
      return response.data.cart;
    } catch (error) {
      if (!isScopeMismatchAxiosError(error)) logError("fetchCart", error);
      return rejectWithValue(thunkRejectFromAxios(error, "Failed to load cart"));
    }
  }
);

// POST /api/cart
export const addToCart = createAsyncThunk(
  "userCart/addToCart",
  async ({ productSlug, productId, variantId, quantity = 1 }, { rejectWithValue }) => {
    try {
      // console.log(`🛒 [addToCart] slug="${productSlug}" qty=${quantity}`);
      const response = await axiosInstance.post("/cart", {
        productSlug,
        variantId,
        productId,
        quantity,
      });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to add to cart");
      // console.log(`✅ [addToCart] slug="${productSlug}" added`);
      // ✅ return productSlug alongside cart so reducer can attach it
      return { cart: response.data.cart, productSlug, productId, variantId, quantity };
    } catch (error) {
      logError("addToCart", error, { productSlug, quantity });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to add to cart",
        status: error.response?.status,
      });
    }
  }
);

// PUT /api/cart/item
export const updateCartItem = createAsyncThunk(
  "userCart/updateCartItem",
  async ({ productId, variantId, quantity, productSlug }, { rejectWithValue }) => {
    try {
      // console.log(`🛒 [updateCartItem] productId="${productId}" qty=${quantity}`);
      const response = await axiosInstance.put("/cart/item", {
        productId,
        variantId,
        quantity,
      });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to update cart item");
      // console.log(`✅ [updateCartItem] updated qty=${quantity}`);
      // ✅ pass existing slugMap through so we don't lose slug info
      // return { cart: response.data.cart, productSlug };
      return { cart: response.data.cart, productSlug, productId, variantId, quantity };
    } catch (error) {
      logError("updateCartItem", error, { productId, variantId, quantity });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to update cart item",
        status: error.response?.status,
      });
    }
  }
);

// DELETE /api/cart/item
export const removeCartItem = createAsyncThunk(
  "userCart/removeCartItem",
  async ({ productId, variantId, productSlug }, { rejectWithValue }) => {
    try {
      // console.log(`🛒 [removeCartItem] productId="${productId}"`);
      const response = await axiosInstance.delete("/cart/item", {
        data: { productId, variantId },
      });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to remove cart item");
      // console.log(`✅ [removeCartItem] removed`);
      // return { cart: response.data.cart, productSlug };
      return { cart: response.data.cart, productSlug, productId, variantId };
    } catch (error) {
      logError("removeCartItem", error, { productId, variantId });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to remove item",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/cart/bulk-remove
export const bulkRemoveCartItems = createAsyncThunk(
  "userCart/bulkRemoveCartItems",
  async ({ items }, { rejectWithValue }) => {
    try {
      // console.log(`🛒 [bulkRemoveCartItems] Removing ${items.length} items...`);
      const response = await axiosInstance.post("/cart/bulk-remove", { items });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to bulk remove");
      // console.log("✅ [bulkRemoveCartItems] Done");
      return { cart: response.data.cart };
    } catch (error) {
      logError("bulkRemoveCartItems", error, { items });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to remove items",
        status: error.response?.status,
      });
    }
  }
);

// DELETE /api/cart/clear
export const clearCart = createAsyncThunk(
  "userCart/clearCart",
  async (_, { rejectWithValue }) => {
    try {
      // console.log("🛒 [clearCart] Clearing...");
      const response = await axiosInstance.delete("/cart/clear");
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to clear cart");
      // console.log("✅ [clearCart] Cleared");
      return response.data.cart;
    } catch (error) {
      logError("clearCart", error);
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to clear cart",
        status: error.response?.status,
      });
    }
  }
);

// POST /api/cart/merge
export const mergeCart = createAsyncThunk(
  "userCart/mergeCart",
  async ({ items }, { rejectWithValue }) => {
    try {
      // console.log(`🛒 [mergeCart] Merging ${items.length} guest items...`);
      const response = await axiosInstance.post("/cart/merge", { items });
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to merge cart");
      // console.log("✅ [mergeCart] Merged");
      return { cart: response.data.cart };
    } catch (error) {
      if (!isScopeMismatchAxiosError(error)) logError("mergeCart", error, { items });
      return rejectWithValue(thunkRejectFromAxios(error, "Failed to merge cart"));
    }
  }
);

// POST /api/cart/checkout
export const checkout = createAsyncThunk(
  "userCart/checkout",
  async ({ paymentInfo } = {}, { rejectWithValue }) => {
    try {
      // console.log("🛒 [checkout] Starting...");
      const response = await axiosInstance.post("/cart/checkout", { paymentInfo });
      if (!response.data.success)
        throw new Error(response.data.message || "Checkout failed");
      // console.log("✅ [checkout] Order:", response.data.order?._id);
      return response.data;
    } catch (error) {
      logError("checkout", error, { paymentInfo });
      return rejectWithValue({
        message: error.response?.data?.message || "Checkout failed",
        status: error.response?.status,
      });
    }
  }
);

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  items: [],
  guestItems: [],
  totalAmount: 0,
  totalItems: 0,
  lastOrder: null,
  // ✅ slugMap — maps productId string → slug so we never lose slug info
  slugMap: {},
  loading: {
    fetch: false,
    add: false,
    update: false,
    remove: false,
    merge: false,
    clear: false,
    checkout: false,
    bulkRemove: false,
  },
  error: {
    fetch: null,
    add: null,
    update: null,
    remove: null,
    merge: null,
    clear: null,
    checkout: null,
    bulkRemove: null,
  },
};

// ── Helper — build slugMap from items when productId is populated ─────────────
const buildSlugMap = (existingMap, items) => {
  const updated = { ...existingMap };
  items.forEach((item) => {
    if (item.productId?.slug && item.productId?._id) {
      updated[String(item.productId._id)] = item.productId.slug;
    }
    // also preserve existing _productSlug if already attached
    if (item._productSlug && item.productId) {
      const id = String(item.productId?._id || item.productId);
      if (!updated[id]) updated[id] = item._productSlug;
    }
  });
  return updated;
};

// ── Helper — apply slugMap to items ──────────────────────────────────────────
const applySlugMap = (items, slugMap) =>
  items.map((item) => {
    const id = String(item.productId?._id || item.productId);
    const slug = item.productId?.slug || slugMap[id] || item._productSlug || null;
    return { ...item, _productSlug: slug };
  });

// ── Slice ─────────────────────────────────────────────────────────────────────
const userCartSlice = createSlice({
  name: "userCart",
  initialState,
  reducers: {

    loadGuestCart: (state) => {
      state.guestItems = getGuestCart();
      state.totalItems = state.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
      // console.log(`🛒 [loadGuestCart] Loaded ${state.guestItems.length} guest items`);
    },

    addGuestCartItem: (state, action) => {
      const { productId, productSlug, variantId, quantity = 1 } = action.payload;
      const existing = state.guestItems.find(
        (i) => i.productSlug === productSlug && i.variantId === variantId
      );
      if (existing) {
        existing.quantity += quantity;
        // console.log(`🛒 [addGuestCartItem] slug="${productSlug}" qty → ${existing.quantity}`);
      } else {
        state.guestItems.push({ productId, productSlug, variantId, quantity });
        // console.log(`🛒 [addGuestCartItem] slug="${productSlug}" added qty=${quantity}`);
      }
      state.totalItems = state.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
      saveGuestCart(state.guestItems);
    },
    // data store with product slug but backend expect with productid upper code have 
    // addGuestCartItem: (state, action) => {
    //   const { productSlug, variantId, quantity = 1 } = action.payload;
    //   const existing = state.guestItems.find(
    //     (i) => i.productSlug === productSlug && i.variantId === variantId
    //   );
    //   if (existing) {
    //     existing.quantity += quantity;
    //     console.log(`🛒 [addGuestCartItem] slug="${productSlug}" qty → ${existing.quantity}`);
    //   } else {
    //     state.guestItems.push({ productSlug, variantId, quantity });
    //     console.log(`🛒 [addGuestCartItem] slug="${productSlug}" added qty=${quantity}`);
    //   }
    //   state.totalItems = state.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
    //   saveGuestCart(state.guestItems);
    // },

    updateGuestCartItem: (state, action) => {
      const { productSlug, variantId, quantity } = action.payload;
      const item = state.guestItems.find(
        (i) => i.productSlug === productSlug && i.variantId === variantId
      );
      if (item) {
        if (quantity <= 0) {
          state.guestItems = state.guestItems.filter(
            (i) => !(i.productSlug === productSlug && i.variantId === variantId)
          );
          // console.log(`🛒 [updateGuestCartItem] slug="${productSlug}" removed`);
        } else {
          item.quantity = quantity;
          // console.log(`🛒 [updateGuestCartItem] slug="${productSlug}" qty=${quantity}`);
        }
        state.totalItems = state.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
        saveGuestCart(state.guestItems);
      }
    },

    removeGuestCartItem: (state, action) => {
      const { productSlug, variantId } = action.payload;
      state.guestItems = state.guestItems.filter(
        (i) => !(i.productSlug === productSlug && i.variantId === variantId)
      );
      state.totalItems = state.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
      saveGuestCart(state.guestItems);
      // console.log(`🛒 [removeGuestCartItem] slug="${productSlug}" removed`);
    },

    clearGuestCartItems: (state) => {
      state.guestItems = [];
      state.totalItems = 0;
      clearGuestCartStorage();
      // console.log("🛒 [clearGuestCartItems] Guest cart cleared");
    },

    clearCartErrors: (state) => {
      state.error = initialState.error;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── fetchCart ──────────────────────────────────────────────────────────
      .addCase(fetchCart.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading.fetch = false;
        const rawItems = action.payload?.items || [];
        // build slugMap from populated productId if available
        state.slugMap = buildSlugMap(state.slugMap, rawItems);
        const items = applySlugMap(rawItems, state.slugMap);
        state.items = items;
        state.totalAmount = action.payload?.totalAmount ?? 0;
        state.totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        // console.log(`✅ [fetchCart] Stored ${items.length} items with slugs`);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading.fetch = false;
        if (isSilentPortalScopePayload(action.payload)) {
          state.error.fetch = null;
          return;
        }
        state.error.fetch = action.payload || { message: "Failed to fetch cart" };
        console.error("❌ [fetchCart] rejected:", action.payload?.message);
      })

      // ── addToCart ──────────────────────────────────────────────────────────
      .addCase(addToCart.pending, (state) => {
        state.loading.add = true;
        state.error.add = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading.add = false;
        const { cart, productSlug } = action.payload;
        const rawItems = cart?.items || [];
        // ✅ find the item we just added and inject its slug into slugMap
        const addedItem = rawItems.find((item) => {
          const id = String(item.productId?._id || item.productId);
          return state.slugMap[id] === productSlug || item._productSlug === productSlug;
        });
        // build slug map — also inject productSlug for the newly added item
        state.slugMap = buildSlugMap(state.slugMap, rawItems);
        // find the item by matching variantId or last item and attach slug manually
        rawItems.forEach((item) => {
          const id = String(item.productId?._id || item.productId);
          if (!state.slugMap[id] && productSlug) {
            // The item we just added — attach slug
            // We identify it by it being the only new one or by variantId match
            state.slugMap[id] = productSlug;
          }
        });
        const items = applySlugMap(rawItems, state.slugMap);
        state.items = items;
        state.totalAmount = cart?.totalAmount ?? 0;
        state.totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        // console.log(`✅ [addToCart.fulfilled] slug="${productSlug}" stored in slugMap`);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading.add = false;
        state.error.add = action.payload || { message: "Failed to add to cart" };
        console.error("❌ [addToCart] rejected:", action.payload?.message);
      })

      // ── updateCartItem ─────────────────────────────────────────────────────
      .addCase(updateCartItem.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading.update = false;
        const { productId, variantId, quantity, cart } = action.payload;
        const existingItem = state.items.find(
          (item) =>
            String(item.productId?._id || item.productId) === String(productId) &&
            String(item.variantId) === String(variantId)
        );
        if (existingItem) existingItem.quantity = quantity;
        state.totalAmount = cart?.totalAmount ?? state.totalAmount;
        state.totalItems = state.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        // console.log("✅ [updateCartItem.fulfilled] cart updated");
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload || { message: "Failed to update cart" };
        console.error("❌ [updateCartItem] rejected:", action.payload?.message);
      })

      // ── removeCartItem ─────────────────────────────────────────────────────
      .addCase(removeCartItem.pending, (state) => {
        state.loading.remove = true;
        state.error.remove = null;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.loading.remove = false;
        const { productId, variantId, cart } = action.payload;
        state.items = state.items.filter(
          (item) =>
            !(String(item.productId?._id || item.productId) === String(productId) &&
              String(item.variantId) === String(variantId))
        );
        state.totalAmount = cart?.totalAmount ?? state.totalAmount;
        state.totalItems = state.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        // console.log("✅ [removeCartItem.fulfilled] item removed");
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.loading.remove = false;
        state.error.remove = action.payload || { message: "Failed to remove item" };
        console.error("❌ [removeCartItem] rejected:", action.payload?.message);
      })

      // ── bulkRemoveCartItems ────────────────────────────────────────────────
      .addCase(bulkRemoveCartItems.pending, (state) => {
        state.loading.bulkRemove = true;
        state.error.bulkRemove = null;
      })
      .addCase(bulkRemoveCartItems.fulfilled, (state, action) => {
        state.loading.bulkRemove = false;
        const rawItems = action.payload?.cart?.items || [];
        state.slugMap = buildSlugMap(state.slugMap, rawItems);
        const items = applySlugMap(rawItems, state.slugMap);
        state.items = items;
        state.totalAmount = action.payload?.cart?.totalAmount ?? 0;
        state.totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
      })
      .addCase(bulkRemoveCartItems.rejected, (state, action) => {
        state.loading.bulkRemove = false;
        state.error.bulkRemove = action.payload || { message: "Failed to remove items" };
        console.error("❌ [bulkRemoveCartItems] rejected:", action.payload?.message);
      })

      // ── clearCart ──────────────────────────────────────────────────────────
      .addCase(clearCart.pending, (state) => {
        state.loading.clear = true;
        state.error.clear = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading.clear = false;
        state.items = [];
        state.totalAmount = 0;
        state.totalItems = 0;
        state.slugMap = {};
        // console.log("✅ [clearCart.fulfilled] cart cleared");
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading.clear = false;
        state.error.clear = action.payload || { message: "Failed to clear cart" };
        console.error("❌ [clearCart] rejected:", action.payload?.message);
      })

      // ── mergeCart ──────────────────────────────────────────────────────────
      .addCase(mergeCart.pending, (state) => {
        state.loading.merge = true;
        state.error.merge = null;
      })
      .addCase(mergeCart.fulfilled, (state, action) => {
        state.loading.merge = false;
        const rawItems = action.payload?.cart?.items || [];
        state.slugMap = buildSlugMap(state.slugMap, rawItems);
        const items = applySlugMap(rawItems, state.slugMap);
        state.items = items;
        state.totalAmount = action.payload?.cart?.totalAmount ?? 0;
        state.totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        // console.log("✅ [mergeCart.fulfilled] merged");
      })
      .addCase(mergeCart.rejected, (state, action) => {
        state.loading.merge = false;
        if (isSilentPortalScopePayload(action.payload)) {
          state.error.merge = null;
          return;
        }
        state.error.merge = action.payload || { message: "Failed to merge cart" };
        console.error("❌ [mergeCart] rejected:", action.payload?.message);
      })

      // ── checkout ───────────────────────────────────────────────────────────
      .addCase(checkout.pending, (state) => {
        state.loading.checkout = true;
        state.error.checkout = null;
      })
      .addCase(checkout.fulfilled, (state, action) => {
        state.loading.checkout = false;
        state.items = [];
        state.totalAmount = 0;
        state.totalItems = 0;
        state.slugMap = {};
        state.lastOrder = action.payload?.order || null;
        // console.log("✅ [checkout.fulfilled] order:", state.lastOrder?._id);
      })
      .addCase(checkout.rejected, (state, action) => {
        state.loading.checkout = false;
        state.error.checkout = action.payload || { message: "Checkout failed" };
        console.error("❌ [checkout] rejected:", action.payload?.message);
      });
  },
});

export const {
  loadGuestCart,
  addGuestCartItem,
  updateGuestCartItem,
  removeGuestCartItem,
  clearGuestCartItems,
  clearCartErrors,
} = userCartSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCartItems = (state) => state.userCart.items;
export const selectCartGuestItems = (state) => state.userCart.guestItems;
export const selectCartTotalAmount = (state) => state.userCart.totalAmount;
export const selectCartTotalItems = (state) => state.userCart.totalItems;
export const selectCartLoading = (state) => state.userCart.loading;
export const selectCartError = (state) => state.userCart.error;
export const selectLastOrder = (state) => state.userCart.lastOrder;

// ✅ FIXED — uses _productSlug we attached, works for both fresh + refresh
export const selectCartItemBySlug = (productSlug) => (state) => {
  if (!productSlug) return null;
  const { isLoggedIn } = state.auth;
  if (isLoggedIn) {
    return state.userCart.items.find(
      (item) => item._productSlug === productSlug
    ) ?? null;
  }
  return state.userCart.guestItems.find(
    (i) => i.productSlug === productSlug
  ) ?? null;
};

// ✅ FIXED — derived from selectCartItemBySlug
export const selectIsInCart = (productSlug) => (state) => {
  if (!productSlug) return false;
  const { isLoggedIn } = state.auth;
  if (isLoggedIn) {
    return state.userCart.items.some(
      (item) => item._productSlug === productSlug
    );
  }
  return state.userCart.guestItems.some((i) => i.productSlug === productSlug);
};

// ✅ Display count
export const selectDisplayCartCount = (state) => {
  const { isLoggedIn } = state.auth;
  return isLoggedIn
    ? state.userCart.totalItems
    : state.userCart.guestItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
};

export default userCartSlice.reducer;
