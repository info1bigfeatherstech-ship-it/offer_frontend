// ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";
import {
  toggleFeaturedProduct,
  changeProductStatus,
  softDeleteProduct,
} from "./adminEditProductSlice";

// Existing thunk for fetching all products - NOW RETURNS FULL RESPONSE
export const fetchProducts = createAsyncThunk(
  "adminGetProducts/fetchProducts",
  async ({ page = 1, limit = 15, search = "" } = {}, { rejectWithValue }) => {
    try {
      const trimmedSearch = typeof search === "string" ? search.trim() : "";
      const response = await axiosInstance.get("/admin/products/all", {
        params: {
          page,
          limit,
          ...(trimmedSearch ? { search: trimmedSearch } : {}),
        },
      });      
      if (response.data.success) return response.data; // ✅ FIXED: return full response, not just products
      return rejectWithValue(response.data.message || "Failed to fetch products");
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Thunk for fetching low stock products
export const fetchLowStockProducts = createAsyncThunk(
  "adminGetProducts/fetchLowStockProducts",
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/admin/products/low-stock", {
        params: { page, limit },
      });
      return response.data; // { success, total, page, limit, count, products }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Add this new thunk - Get real active products count
export const fetchActiveProductsCount = createAsyncThunk(
  "adminGetProducts/fetchActiveProductsCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/admin/products/active", {
        params: { page: 1, limit: 10000 } // Get all active products
      });
      if (response.data.success) {
        return {
          activeCount: response.data.products?.length || 0,
          totalActive: response.data.total || response.data.products?.length || 0
        };
      }
      return rejectWithValue(response.data.message || "Failed to fetch active products count");
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Global featured count across the catalog (not just the current page)
export const fetchFeaturedProductsCount = createAsyncThunk(
  "adminGetProducts/fetchFeaturedProductsCount",
  async (_, { rejectWithValue }) => {
    try {
      let page = 1;
      let featuredCount = 0;
      let totalPages = 1;
      const limit = 100;

      do {
        const response = await axiosInstance.get("/admin/products/all", {
          params: { page, limit },
        });
        if (!response.data?.success) {
          return rejectWithValue(
            response.data?.message || "Failed to fetch featured products count"
          );
        }
        featuredCount += (response.data.products || []).filter(
          (p) => p.isFeatured && p.status !== "archived"
        ).length;
        totalPages = response.data.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      return { featuredCount };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const adminGetProductsSlice = createSlice({
  name: "adminGetProducts",
  initialState: {
    // Regular products with pagination
    products: [],
    totalProducts: 0,      // ✅ ADDED: real total count from backend
    currentPage: 1,        // ✅ ADDED: current page
    totalPages: 1,         // ✅ ADDED: total pages available
    loading: false,
    isFetching: false,
    hasLoadedOnce: false,
    error: null,
    productsFetchRequestId: null,

    realActiveCount: 0,     // Real active products count from backend
    realFeaturedCount: 0,   // Real featured products count from backend
    realLowStockCount: 0,   // Real low stock count from backend
    
    // Low stock products state
    lowStockProducts: {
      products: [],
      total: 0,
      page: 1,
      limit: 20,
      count: 0,
      loading: false,
      error: null,
    },
  },
  reducers: {
    optimisticBulkTagUpdate: (state, action) => {
      const { slugs, flagType, value } = action.payload;

      state.products = state.products.map(p => {
        if (!slugs.includes(p.slug)) return p;

        let tags = p.tags || [];

        if (value) {
          if (!tags.includes(flagType)) tags.push(flagType);
        } else {
          tags = tags.filter(t => t !== flagType);
        }

        return { ...p, tags };
      });
    },
    // Optimistic in-place update — called BEFORE API for zero-latency UI
    optimisticUpdateProduct: (state, { payload }) => {
      const idx = state.products.findIndex((p) => p._id === payload._id);
      if (idx !== -1) {
        if (
          payload.isFeatured !== undefined &&
          state.products[idx].isFeatured !== payload.isFeatured
        ) {
          state.realFeaturedCount = Math.max(
            0,
            state.realFeaturedCount + (payload.isFeatured ? 1 : -1)
          );
        }
        state.products[idx] = { ...state.products[idx], ...payload };
      }
      
      // Also update in low stock products if present
      const lowStockIdx = state.lowStockProducts.products.findIndex((p) => p._id === payload._id);
      if (lowStockIdx !== -1) {
        state.lowStockProducts.products[lowStockIdx] = { 
          ...state.lowStockProducts.products[lowStockIdx], 
          ...payload 
        };
      }
    },
    
    // Clear low stock products
    clearLowStockProducts: (state) => {
      state.lowStockProducts = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        count: 0,
        loading: false,
        error: null,
      };
    },
    
    // Set low stock page
    setLowStockPage: (state, action) => {
      state.lowStockProducts.page = action.payload;
    },
    
    // ✅ ADDED: Set current page (for manual control if needed)
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch all products ────────────────────────────────────
      .addCase(fetchProducts.pending, (state, action) => {
        state.error = null;
        state.productsFetchRequestId = action.meta.requestId;
        if (!state.hasLoadedOnce) {
          state.loading = true;
        } else {
          state.isFetching = true;
        }
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.productsFetchRequestId) return;
        state.loading = false;
        state.isFetching = false;
        state.hasLoadedOnce = true;
        const { payload } = action;
        // Filter out archived products from the products tab
        state.products = payload.products.filter((p) => p.status !== "archived");
        state.totalProducts = payload.totalProducts || payload.products.length;
        state.currentPage = payload.currentPage || 1;
        state.totalPages = payload.totalPages || 1;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (action.meta.requestId !== state.productsFetchRequestId) return;
        state.loading = false;
        state.isFetching = false;
        state.error = action.payload;
      })
      
      // ── Fetch low stock products ─────────────────────────────
      .addCase(fetchLowStockProducts.pending, (state) => {
        state.lowStockProducts.loading = true;
        state.lowStockProducts.error = null;
      })
      .addCase(fetchLowStockProducts.fulfilled, (state, { payload }) => {
        state.lowStockProducts.loading = false;
        state.lowStockProducts.products = payload.products || [];
        state.lowStockProducts.total = payload.total || 0;
        state.lowStockProducts.page = payload.page || 1;
        state.lowStockProducts.limit = payload.limit || 20;
        state.lowStockProducts.count = payload.count || 0;
        state.realLowStockCount = payload.total || 0; // ✅ ADDED: Store real low stock count from backend
      })
      .addCase(fetchLowStockProducts.rejected, (state, { payload }) => {
        state.lowStockProducts.loading = false;
        state.lowStockProducts.error = payload || "Failed to fetch low stock products";
        state.lowStockProducts.products = [];
      })

      .addCase(fetchActiveProductsCount.fulfilled, (state, { payload }) => {
        state.realActiveCount = payload.totalActive || payload.activeCount;
      })
      .addCase(fetchActiveProductsCount.rejected, (state) => {
        state.realActiveCount = 0;
      })

      .addCase(fetchFeaturedProductsCount.fulfilled, (state, { payload }) => {
        state.realFeaturedCount = payload.featuredCount || 0;
      })
      .addCase(fetchFeaturedProductsCount.rejected, (state) => {
        state.realFeaturedCount = 0;
      })

      // Cross-slice: when toggle/status API succeeds, update product in list immediately
      .addCase(toggleFeaturedProduct.fulfilled, (state, { payload }) => {
        if (!payload?.product) return;
        const idx = state.products.findIndex((p) => p._id === payload.product._id);
        if (idx !== -1) state.products[idx] = { ...state.products[idx], ...payload.product };
        
        // Also update in low stock products if present
        const lowStockIdx = state.lowStockProducts.products.findIndex((p) => p._id === payload.product._id);
        if (lowStockIdx !== -1) {
          state.lowStockProducts.products[lowStockIdx] = { 
            ...state.lowStockProducts.products[lowStockIdx], 
            ...payload.product 
          };
        }
      })
      
      .addCase(changeProductStatus.fulfilled, (state, { payload }) => {
        if (!payload?.product) return;
        const idx = state.products.findIndex((p) => p._id === payload.product._id);
        if (idx !== -1) state.products[idx] = { ...state.products[idx], ...payload.product };
        
        // Also update in low stock products if present
        const lowStockIdx = state.lowStockProducts.products.findIndex((p) => p._id === payload.product._id);
        if (lowStockIdx !== -1) {
          state.lowStockProducts.products[lowStockIdx] = { 
            ...state.lowStockProducts.products[lowStockIdx], 
            ...payload.product 
          };
        }
        
        // If status changed from active, remove from low stock list
        if (payload.product.status !== "active") {
          state.lowStockProducts.products = state.lowStockProducts.products.filter(
            (p) => p._id !== payload.product._id
          );
        }
      })
      
      .addCase(softDeleteProduct.fulfilled, (state, { payload }) => {
        if (!payload?.slug) return;
        state.products = state.products.filter((p) => p.slug !== payload.slug);
        
        // Also update total products count
        state.totalProducts = Math.max(0, state.totalProducts - 1);
        
        // Also remove from low stock products
        state.lowStockProducts.products = state.lowStockProducts.products.filter(
          (p) => p.slug !== payload.slug
        );
      })
      
      // Optimistic: remove instantly when archive is triggered (before API responds)
      .addCase(softDeleteProduct.pending, (state, { meta }) => {
        const slug = meta.arg;
        if (slug) {
          state.products = state.products.filter((p) => p.slug !== slug);
          state.totalProducts = Math.max(0, state.totalProducts - 1);
          state.lowStockProducts.products = state.lowStockProducts.products.filter(
            (p) => p.slug !== slug
          );
        }
      })
      
      .addCase(softDeleteProduct.rejected, (_state, _action) => {
        // On failure, AdminDashboard shows a toast error
        // A full re-fetch is needed to restore state — handled in AdminDashboard
      });
  },
});

export const { 
  optimisticUpdateProduct,
  optimisticBulkTagUpdate,
  clearLowStockProducts,
  setLowStockPage,
  setCurrentPage,  // ✅ EXPORTED
} = adminGetProductsSlice.actions;

export default adminGetProductsSlice.reducer;
