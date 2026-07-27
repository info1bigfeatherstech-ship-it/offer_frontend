// store/slices/products/productTagsSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

// ─────────────────────────────────────────────
// THUNKS
// ─────────────────────────────────────────────

// 1. Fetch products by tag (no category filter)
// GET /products?tags=on_sale
export const fetchProductsByTag = createAsyncThunk(
  "productTags/fetchByTag",
  async ({ tag, page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/products/all?tags=${tag}&page=${page}&limit=${limit}&_cb=1`
      );
      // console.log("res", response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch products");
      }
      return { ...response.data, tag };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch products",
        status: error.response?.status,
      });
    }
  }
);

// 2. Fetch products by tag within a category
// GET /products/category/:slug?tags=on_sale
export const fetchProductsByTagAndCategory = createAsyncThunk(
  "productTags/fetchByTagAndCategory",
  async ({ tag, categorySlug, page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/products/category/${categorySlug}?tags=${tag}&page=${page}&limit=${limit}&_cb=1`
      );
      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch products");
      }
      return { ...response.data, tag, categorySlug };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch products",
        status: error.response?.status,
      });
    }
  }
);

// 3. Fetch both on_sale and today_arrival together (for homepage sections)
// Two parallel calls
export const fetchTaggedProductSections = createAsyncThunk(
  "productTags/fetchSections",
  async ({ page = 1, limit = 12 } = {}, { rejectWithValue }) => {
    try {
      const [onSaleRes, todayArrivalRes] = await Promise.all([
        axiosInstance.get(`/products?tags=on-sale&page=${page}&limit=${limit}&_cb=1`),
        axiosInstance.get(`/products?tags=today-arrival&page=${page}&limit=${limit}&_cb=1`)
      ]);

      return {
        onSale: {
          products: onSaleRes.data.products || [],
          pagination: onSaleRes.data.pagination || {},
          total: onSaleRes.data.pagination?.total || 0
        },
        todayArrival: {
          products: todayArrivalRes.data.products || [],
          pagination: todayArrivalRes.data.pagination || {},
          total: todayArrivalRes.data.pagination?.total || 0
        }
      };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to fetch tagged products",
        status: error.response?.status,
      });
    }
  }
);

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────

const initialState = {
  // For tag-only pages (no category)
  onSale: {
    products: [],
    pagination: {},
    total: 0
  },
  todayArrival: {
    products: [],
    pagination: {},
    total: 0
  },

  // For tag + category combined page
  categoryTagProducts: {
    products: [],
    pagination: {},
    total: 0,
    category: null,
    appliedTag: null,
    appliedCategorySlug: null
  },

  loading: {
    onSale: false,
    todayArrival: false,
    sections: false,
    categoryTag: false
  },
  error: {
    onSale: null,
    todayArrival: null,
    sections: null,
    categoryTag: null
  }
};

// ─────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────

const productTagsSlice = createSlice({
  name: "productTags",
  initialState,
  reducers: {
   // reducers mein replace karo
clearTagProducts: (state, action) => {
  const tag = action.payload;
  if (tag === 'on-sale') {
    state.onSale = initialState.onSale;
  } else if (tag === 'today-arrival') {
    state.todayArrival = initialState.todayArrival;
  } else {
    state.onSale = initialState.onSale;
    state.todayArrival = initialState.todayArrival;
  }
},
    clearCategoryTagProducts: (state) => {
      state.categoryTagProducts = initialState.categoryTagProducts;
    },
    clearTagErrors: (state) => {
      state.error = initialState.error;
    }
  },
  extraReducers: (builder) => {
    builder

      // ── fetchProductsByTag ──────────────────────────────────
      .addCase(fetchProductsByTag.pending, (state, action) => {
        const tag = action.meta.arg.tag;
        if (tag === 'on-sale') state.loading.onSale = true;
        if (tag === 'today-arrival') state.loading.todayArrival = true;
      })
    .addCase(fetchProductsByTag.fulfilled, (state, action) => {
  const { tag, products, pagination, page } = action.payload;
  const loadingKey = tag === 'on-sale' ? 'onSale' : 'todayArrival';
  
  state.loading[loadingKey] = false;

  if (tag === 'on-sale') {
    if (page === 1) {
      state.onSale.products = products || [];
    } else {
      const existingIds = new Set(state.onSale.products.map(p => p._id));
      const fresh = (products || []).filter(p => !existingIds.has(p._id));
      state.onSale.products = [...state.onSale.products, ...fresh];
    }
    state.onSale.pagination = pagination || {};
    state.onSale.total = pagination?.total || 0;
    state.error.onSale = null;

  } else if (tag === 'today-arrival') {
    if (page === 1) {
      state.todayArrival.products = products || [];
    } else {
      const existingIds = new Set(state.todayArrival.products.map(p => p._id));
      const fresh = (products || []).filter(p => !existingIds.has(p._id));
      state.todayArrival.products = [...state.todayArrival.products, ...fresh];
    }
    state.todayArrival.pagination = pagination || {};
    state.todayArrival.total = pagination?.total || 0;
    state.error.todayArrival = null;
  }
})
      .addCase(fetchProductsByTag.rejected, (state, action) => {
        const tag = action.meta.arg.tag;
        if (tag === 'on-sale') {
          state.loading.onSale = false;
          state.error.onSale = action.payload;
        }
        if (tag === 'today-arrival') {
          state.loading.todayArrival = false;
          state.error.todayArrival = action.payload;
        }
      })

      // ── fetchProductsByTagAndCategory ───────────────────────
      .addCase(fetchProductsByTagAndCategory.pending, (state) => {
        state.loading.categoryTag = true;
        state.error.categoryTag = null;
      })
      .addCase(fetchProductsByTagAndCategory.fulfilled, (state, action) => {
        state.loading.categoryTag = false;
        state.categoryTagProducts = {
          products: action.payload.products || [],
          pagination: action.payload.pagination || {
            total: action.payload.total || 0,
            page: action.payload.page || 1,
            limit: action.payload.limit || 12
          },
          total: action.payload.total || 0,
          category: action.payload.category || null,
          appliedTag: action.payload.tag || null,
          appliedCategorySlug: action.payload.categorySlug || null
        };
        state.error.categoryTag = null;
      })
      .addCase(fetchProductsByTagAndCategory.rejected, (state, action) => {
        state.loading.categoryTag = false;
        state.error.categoryTag = action.payload;
      })

      // ── fetchTaggedProductSections ──────────────────────────
      .addCase(fetchTaggedProductSections.pending, (state) => {
        state.loading.sections = true;
        state.error.sections = null;
      })
      .addCase(fetchTaggedProductSections.fulfilled, (state, action) => {
        state.loading.sections = false;
        state.onSale = action.payload.onSale;
        state.todayArrival = action.payload.todayArrival;
        state.error.sections = null;
      })
      .addCase(fetchTaggedProductSections.rejected, (state, action) => {
        state.loading.sections = false;
        state.error.sections = action.payload;
      });
  }
});

export const {
  clearTagProducts,
  clearCategoryTagProducts,
  clearTagErrors
} = productTagsSlice.actions;

// ─────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────

export const selectOnSaleProducts = (state) => state.productTags.onSale.products;
export const selectOnSalePagination = (state) => state.productTags.onSale.pagination;
export const selectOnSaleTotal = (state) => state.productTags.onSale.total;

export const selectTodayArrivalProducts = (state) => state.productTags.todayArrival.products;
export const selectTodayArrivalPagination = (state) => state.productTags.todayArrival.pagination;
export const selectTodayArrivalTotal = (state) => state.productTags.todayArrival.total;

export const selectCategoryTagProducts = (state) => state.productTags.categoryTagProducts.products;
export const selectCategoryTagPagination = (state) => state.productTags.categoryTagProducts.pagination;
export const selectCategoryTagInfo = (state) => state.productTags.categoryTagProducts;
// productTagsSlice.js ke end mein add karo

export const selectProductsByTag = (tag) => (state) => {
  if (tag === 'on-sale') return state.productTags.onSale.products;
  if (tag === 'today-arrival') return state.productTags.todayArrival.products;
  return [];
};

export const selectLoadingByTag = (tag) => (state) => {
  if (tag === 'on-sale') return state.productTags.loading.onSale;
  if (tag === 'today-arrival') return state.productTags.loading.todayArrival;
  return false;
};

export const selectErrorByTag = (tag) => (state) => {
  if (tag === 'on-sale') return state.productTags.error.onSale;
  if (tag === 'today-arrival') return state.productTags.error.todayArrival;
  return null;
};

export const selectPaginationByTag = (tag) => (state) => {
  if (tag === 'on-sale') return state.productTags.onSale.pagination;
  if (tag === 'today-arrival') return state.productTags.todayArrival.pagination;
  return {};
};

export const selectTagsLoading = (state) => state.productTags.loading;
export const selectTagsError = (state) => state.productTags.error;

export default productTagsSlice.reducer;