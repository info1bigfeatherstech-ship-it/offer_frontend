import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

// ── Error Logger ─────────────────────────────────────────────────────────────
const logError = (context, error, info = {}) => {
  console.group(`🔴 ERROR in ${context}`);
  console.error("Error:", error);
  console.log("Message:", error.response?.data?.message || error.message);
  console.log("Status:", error.response?.status);
  console.log("Info:", info);
  console.groupEnd();
};

// ── TTL constant (5 minutes in ms) ───────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchProducts = createAsyncThunk(
  "userProducts/fetchProducts",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "")
          queryParams.append(key, value);
      });
      const url = `/products/all${queryParams.toString() ? `?${queryParams}` : ""}`;
      const response = await axiosInstance.get(url);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch products");
      return response.data;
    } catch (error) {
      logError("fetchProducts", error, { filters });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load products",
        status: error.response?.status,
      });
    }
  }
);

// ── fetchProductsByCategory ───────────────────────────────────────────────────
// KEY CHANGES vs original:
//   1. Guard in the thunk itself using `condition` — if status is already
//      'loading' or 'success' (and not stale), Redux will skip the dispatch
//      entirely. This is the official RTK pattern for preventing duplicate
//      requests. No race condition possible.
//   2. AbortController wired through `signal` so if the component unmounts
//      mid-flight, the actual HTTP request is cancelled.
//   3. Returns `fetchedAt` timestamp so the slice can store it for TTL checks.
// userProductsSlice.js mein sirf yeh thunk update karo

export const fetchProductsByCategory = createAsyncThunk(
  "userProducts/fetchProductsByCategory",
  async ({ slug, page = 1, limit = 12, tags = "" }, { rejectWithValue, signal }) => {
    try {
      // ✅ tags param add kiya
      const tagsQuery = tags ? `&tags=${tags}` : "";
      const response = await axiosInstance.get(
        `/products/category/${slug}?page=${page}&limit=${limit}${tagsQuery}`,
        { signal }
      );
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch products");
      return { ...response.data, slug, fetchedAt: Date.now() };
    } catch (error) {
      if (error.name === "AbortError" || error.name === "CanceledError")
        return rejectWithValue({ aborted: true, slug });
      logError("fetchProductsByCategory", error, { slug, page, limit, tags });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load products",
        status: error.response?.status,
        slug,
      });
    }
  },
  // REMOVE this entire condition block, or replace it:
// {
//   condition: ({ slug, tags = "" }, { getState }) => {
//     const status = getState().userProducts.categoryStatus[slug];
//     // Allow re-fetch if tags changed — compare against last fetched tags
//     // Simplest fix: just allow all fetches, AbortController handles races
//     return status !== "loading";  // ← this blocks re-fetches, drop it
//   },
// }
);
// ── fetchProductsByTag ────────────────────────────────────────────────────────
export const fetchProductsByTag = createAsyncThunk(
  "userProducts/fetchProductsByTag",
  async ({ tag, page = 1, limit = 12 }, { rejectWithValue, signal }) => {
    try {
      const response = await axiosInstance.get(
        `/products/all?tags=${tag}&page=${page}&limit=${limit}`,
        { signal }
      );
      console.log("res",response.data);
      
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch products");
      return { ...response.data, tag, fetchedAt: Date.now() };
    } catch (error) {
      if (error.name === "AbortError" || error.name === "CanceledError")
        return rejectWithValue({ aborted: true, tag });
      logError("fetchProductsByTag", error, { tag, page, limit });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load products",
        status: error.response?.status,
        tag,
      });
    }
  },
  {
    condition: ({ tag }, { getState }) => {
      const status = getState().userProducts.tagStatus?.[tag];
      return status !== "loading";
    },
  }
);

export const fetchProductBySlug = createAsyncThunk(
  "userProducts/fetchProductBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/products/${slug}`);
      if (!response.data.success)
        throw new Error(response.data.message || "Product not found");
      return response.data;
    } catch (error) {
      logError("fetchProductBySlug", error, { slug });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load product",
        status: error.response?.status,
      });
    }
  }
);

export const searchProducts = createAsyncThunk(
  "userProducts/searchProducts",
  async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
      );
      if (!response.data.success)
        throw new Error(response.data.message || "Search failed");
      return response.data;
    } catch (error) {
      logError("searchProducts", error, { query, page });
      return rejectWithValue({
        message: error.response?.data?.message || "Search failed",
        status: error.response?.status,
      });
    }
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  "userProducts/fetchFeaturedProducts",
  async ({ limit = 10, page = 1 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/products/featured?limit=${limit}&page=${page}`);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch featured products");
      return response.data;
    } catch (error) {
      logError("fetchFeaturedProducts", error, { limit });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load featured products",
        status: error.response?.status,
      });
    }
  }
);

export const fetchRelatedProducts = createAsyncThunk(
  "userProducts/fetchRelatedProducts",
  async ({ slug, limit = 8 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/products/${slug}/related?limit=${limit}`);
      if (!response.data.success)
        throw new Error(response.data.message || "Failed to fetch related products");
      return response.data;
    } catch (error) {
      logError("fetchRelatedProducts", error, { slug, limit });
      return rejectWithValue({
        message: error.response?.data?.message || "Failed to load related products",
        status: error.response?.status,
      });
    }
  }
);

// ── Stable fallback references ────────────────────────────────────────────────
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_PAGINATION = Object.freeze({
  total: 0, page: 1, limit: 12,
  totalPages: 0, hasNextPage: false, hasPrevPage: false,
});

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  categoryProducts: {},
  categoryPagination: {},
  categoryLoading: {},   // kept for backward compat with existing selectors
  categoryError: {},
  // ── NEW: per-slug status and fetchedAt for dedup + TTL ────────────────────
  categoryStatus: {},    // 'idle' | 'loading' | 'success' | 'error'
  categoryFetchedAt: {}, // timestamp (ms) of last successful fetch,
   tagProducts:   {},   // { on_sale: [...], today_arrival: [...] }
  tagPagination: {},   // { on_sale: { total, page, ... } }
  tagLoading:    {},   // { on_sale: true/false }
  tagError:      {},   // { on_sale: null | { message } }
  tagStatus:     {},   // { on_sale: 'idle' | 'loading' | 'success' | 'error' }
  tagFetchedAt:  {},   // { on_sale: timestamp }

  products: [],
  featuredProducts: [],
  relatedProducts: [],
  currentProduct: null,
  pagination: {
    total: 0, page: 1, limit: 12,
    totalPages: 0, hasNextPage: false, hasPrevPage: false,
  },
  loading: {
    products: false, product: false,
    search: false, featured: false, related: false,
  },
  error: {
    products: null, product: null,
    search: null, featured: null, related: null,
  },
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const userProductsSlice = createSlice({
  name: "userProducts",
  initialState,
  reducers: {
    clearProducts: (state) => {
      state.products = [];
      state.pagination = initialState.pagination;
    },
    clearCategoryProducts: (state, action) => {
      const slug = action.payload;
      if (slug) {
        delete state.categoryProducts[slug];
        delete state.categoryPagination[slug];
        delete state.categoryLoading[slug];
        delete state.categoryError[slug];
        // ── also clear new status fields ──────────────────────────────────
        delete state.categoryStatus[slug];
        delete state.categoryFetchedAt[slug];
      }
    },
    clearCurrentProduct: (state) => { state.currentProduct = null; },
    clearRelatedProducts: (state) => { state.relatedProducts = []; },
    clearErrors: (state) => { state.error = initialState.error; },
    // reducers mein add karo:
clearTagProducts: (state, action) => {
  const tag = action.payload;
  if (tag) {
    delete state.tagProducts[tag];
    delete state.tagPagination[tag];
    delete state.tagLoading[tag];
    delete state.tagError[tag];
    delete state.tagStatus[tag];
    delete state.tagFetchedAt[tag];
  }
},

// exports mein bhi add karo:
    // ── NEW: lets a category be force-refetched (e.g. pull-to-refresh) ──────
    invalidateCategoryCache: (state, action) => {
      const slug = action.payload;
      if (slug && state.categoryStatus[slug]) {
        state.categoryStatus[slug] = "idle";
        delete state.categoryFetchedAt[slug];
      }
    },
  },
  extraReducers: (builder) => {
    builder
    // ── fetchProductsByTag ──────────────────────────────────────────────────
.addCase(fetchProductsByTag.pending, (state, action) => {
  const tag = action.meta.arg.tag;
  state.tagLoading[tag]  = true;
  state.tagError[tag]    = null;
  state.tagStatus[tag]   = "loading";
})
.addCase(fetchProductsByTag.fulfilled, (state, action) => {
  const { tag }  = action.payload;
  const page     = action.payload.page ?? action.meta.arg.page ?? 1;
  const incoming = action.payload.products || [];
  const total    = action.payload.pagination?.total ?? action.payload.total ?? 0;
  const limit    = action.payload.pagination?.limit ?? action.payload.limit ?? 12;

  state.tagLoading[tag]   = false;
  state.tagStatus[tag]    = "success";
  state.tagFetchedAt[tag] = action.payload.fetchedAt ?? Date.now();
  state.tagError[tag]     = null;

  if (page === 1) {
    state.tagProducts[tag] = incoming;
  } else {
    const existing    = state.tagProducts[tag] || [];
    const existingIds = new Set(existing.map((p) => p._id));
    const fresh       = incoming.filter((p) => !existingIds.has(p._id));
    state.tagProducts[tag] = [...existing, ...fresh];
  }

  state.tagPagination[tag] = {
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: action.payload.pagination?.hasNextPage ?? (page * limit < total),
    hasPrevPage: page > 1,
  };
})
.addCase(fetchProductsByTag.rejected, (state, action) => {
  const tag = action.meta.arg.tag;
  if (action.payload?.aborted) {
    state.tagLoading[tag] = false;
    state.tagStatus[tag]  = "idle";
    return;
  }
  state.tagLoading[tag] = false;
  state.tagError[tag]   = action.payload || { message: "Failed to fetch products" };
  state.tagStatus[tag]  = "error";
})

      // ── fetchProducts ───────────────────────────────────────────────────────
      .addCase(fetchProducts.pending, (state) => {
        state.loading.products = true;
        state.error.products = null;
      })
     .addCase(fetchProducts.fulfilled, (state, action) => {
  state.loading.products = false;
  const incoming = action.payload.products || [];
  const page = action.payload.page ?? action.payload.pagination?.page ?? 1;
  
  if (page === 1) {
    state.products = incoming;           // fresh load → replace
  } else {
    const existingIds = new Set(state.products.map(p => p._id));
    const fresh = incoming.filter(p => !existingIds.has(p._id));
    state.products = [...state.products, ...fresh]; // load more → append
  }
        const p = action.payload.pagination || {};
        state.pagination = {
          total: p.total ?? action.payload.total ?? 0,
          page: p.page ?? action.payload.page ?? 1,
          limit: p.limit ?? action.payload.limit ?? 12,
          totalPages: p.totalPages ?? Math.ceil((p.total ?? 0) / (p.limit ?? 12)),
          hasNextPage: p.hasNextPage ?? false,
          hasPrevPage: p.hasPrevPage ?? false,
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading.products = false;
        state.error.products = action.payload || { message: "Failed to fetch products" };
      })

      // ── fetchProductsByCategory — per-slug buckets ──────────────────────────
      .addCase(fetchProductsByCategory.pending, (state, action) => {
        const slug = action.meta.arg.slug;
        state.categoryLoading[slug] = true;
        state.categoryError[slug] = null;
        state.categoryStatus[slug] = "loading"; // NEW
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
  const { slug }   = action.payload;
  const page       = action.payload.page ?? action.meta.arg.page ?? 1;
  const incoming   = action.payload.products || [];
  const total      = action.payload.total ?? 0;
  const limit      = action.payload.limit ?? 12;

  state.categoryLoading[slug]   = false;
  state.categoryStatus[slug]    = "success";
  state.categoryFetchedAt[slug] = action.payload.fetchedAt ?? Date.now();
  state.categoryError[slug]     = null;

  if (page === 1) {
    state.categoryProducts[slug] = incoming;
  } else {
    const existing    = state.categoryProducts[slug] || [];
    const existingIds = new Set(existing.map((p) => p._id));
    const fresh       = incoming.filter((p) => !existingIds.has(p._id));
    state.categoryProducts[slug] = [...existing, ...fresh];
  }

  state.categoryPagination[slug] = {
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: action.payload.hasNextPage ?? (page * limit < total),
    hasPrevPage: page > 1,
  };
})
      // .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
      //   const slug = action.payload.slug;
      //   const total = action.payload.total ?? 0;
      //   const page = action.payload.page ?? 1;
      //   const limit = action.payload.limit ?? 12;
      //   state.categoryLoading[slug] = false;
      //   state.categoryProducts[slug] = action.payload.products || [];
      //   state.categoryPagination[slug] = {
      //     total, page, limit,
      //     totalPages: Math.ceil(total / limit),
      //     hasNextPage: page * limit < total,
      //     hasPrevPage: page > 1,
      //   };
      //   // NEW ─────────────────────────────────────────────────────────────────
      //   state.categoryStatus[slug] = "success";
      //   state.categoryFetchedAt[slug] = action.payload.fetchedAt ?? Date.now();
      // })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        const slug = action.meta.arg.slug;
        // Silently ignore aborted requests — do NOT mark as error
        if (action.payload?.aborted) {
          state.categoryLoading[slug] = false;
          state.categoryStatus[slug] = "idle"; // reset so next mount retries
          return;
        }
        console.error(`❌ [${slug}] failed:`, action.payload?.message);
        state.categoryLoading[slug] = false;
        state.categoryError[slug] = action.payload || { message: "Failed to fetch category products" };
        state.categoryStatus[slug] = "error"; // NEW
      })

      // ── fetchProductBySlug ──────────────────────────────────────────────────
      .addCase(fetchProductBySlug.pending, (state) => {
        state.loading.product = true;
        state.error.product = null;
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.loading.product = false;
        state.currentProduct = action.payload.product || null;
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.loading.product = false;
        state.error.product = action.payload || { message: "Failed to fetch product" };
      })

      // ── searchProducts ──────────────────────────────────────────────────────
      .addCase(searchProducts.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading.search = false;
        state.products = action.payload.products || [];
        const total = action.payload.total ?? 0;
        const page = action.payload.page ?? 1;
        const limit = action.payload.limit ?? 12;
        state.pagination = {
          total, page, limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        };
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload || { message: "Search failed" };
      })

      // ── fetchFeaturedProducts ───────────────────────────────────────────────
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading.featured = true;
        state.error.featured = null;
      })
   .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
  state.loading.featured = false;
  const incoming = action.payload.products || [];
  const page = action.payload.pagination?.page ?? 1;

  console.log(`✅ Featured fulfilled — page: ${page}, incoming: ${incoming.length}, appending: ${page > 1}`);

  if (page === 1) {
    state.featuredProducts = incoming;
  } else {
    const existingIds = new Set(state.featuredProducts.map(p => p._id));
    const fresh = incoming.filter(p => !existingIds.has(p._id));
    state.featuredProducts = [...state.featuredProducts, ...fresh];
  }

  state.pagination = {
    total:       action.payload.pagination.total,
    page:        action.payload.pagination.page,
    limit:       action.payload.pagination.limit,
    totalPages:  action.payload.pagination.totalPages,
    hasNextPage: action.payload.pagination.hasNextPage,
    hasPrevPage: action.payload.pagination.hasPrevPage,
  };
})
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.loading.featured = false;
        state.error.featured = action.payload || { message: "Failed to fetch featured products" };
      })

      // ── fetchRelatedProducts ────────────────────────────────────────────────
      .addCase(fetchRelatedProducts.pending, (state) => {
        state.loading.related = true;
        state.error.related = null;
      })
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        state.loading.related = false;
        state.relatedProducts = action.payload.related || [];
      })
      .addCase(fetchRelatedProducts.rejected, (state, action) => {
        state.loading.related = false;
        state.error.related = action.payload || { message: "Failed to load related products" };
      });
  },
});

export const {
  clearProducts,
  clearCategoryProducts,
  clearCurrentProduct,
  clearRelatedProducts,
  clearErrors,
  clearTagProducts,
  invalidateCategoryCache, // NEW export
} = userProductsSlice.actions;

// ── Simple (non-factory) selectors ───────────────────────────────────────────
export const selectAllProducts       = (state) => state.userProducts.products;
export const selectCurrentProduct    = (state) => state.userProducts.currentProduct;
export const selectFeaturedProducts  = (state) => state.userProducts.featuredProducts;
export const selectRelatedProducts   = (state) => state.userProducts.relatedProducts;
export const selectProductPagination = (state) => state.userProducts.pagination;
export const selectProductsLoading   = (state) => state.userProducts.loading;
export const selectProductsError     = (state) => state.userProducts.error;

// ── Per-slug selectors ────────────────────────────────────────────────────────
export const selectProductsBySlug   = (slug) => (state) =>
  state.userProducts.categoryProducts[slug] ?? EMPTY_ARRAY;

export const selectLoadingBySlug    = (slug) => (state) =>
  state.userProducts.categoryLoading[slug] ?? false;

export const selectErrorBySlug      = (slug) => (state) =>
  state.userProducts.categoryError[slug] ?? null;

export const selectPaginationBySlug = (slug) => (state) =>
  state.userProducts.categoryPagination[slug] ?? null;

// ── NEW: status selector — used by CategorySection to know fetch state ───────
export const selectStatusBySlug     = (slug) => (state) =>
  state.userProducts.categoryStatus[slug] ?? "idle";
// slice ke end mein add karo:
export const selectProductsByTag    = (tag) => (state) =>
  state.userProducts.tagProducts[tag]   ?? EMPTY_ARRAY;

export const selectLoadingByTag     = (tag) => (state) =>
  state.userProducts.tagLoading[tag]    ?? false;

export const selectErrorByTag       = (tag) => (state) =>
  state.userProducts.tagError[tag]      ?? null;

export const selectPaginationByTag  = (tag) => (state) =>
  state.userProducts.tagPagination[tag] ?? null;

export default userProductsSlice.reducer;

// DOWN CODE IS WORKING BUT UPPER CODE HAVE PERFORMANCE OPTIMIZATION 
// import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ── Error Logger ─────────────────────────────────────────────────────────────
// const logError = (context, error, info = {}) => {
//   console.group(`🔴 ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Message:", error.response?.data?.message || error.message);
//   console.log("Status:", error.response?.status);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ── Thunks ────────────────────────────────────────────────────────────────────

// export const fetchProducts = createAsyncThunk(
//   "userProducts/fetchProducts",
//   async (filters = {}, { rejectWithValue }) => {
//     try {
//       const queryParams = new URLSearchParams();
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value !== undefined && value !== null && value !== "")
//           queryParams.append(key, value);
//       });
//       const url = `/products/all${queryParams.toString() ? `?${queryParams}` : ""}`;
//       const response = await axiosInstance.get(url);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       return response.data;
//     } catch (error) {
//       logError("fetchProducts", error, { filters });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchProductsByCategory = createAsyncThunk(
//   "userProducts/fetchProductsByCategory",
//   async ({ slug, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(
//         `/products/category/${slug}?page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       return { ...response.data, slug };
//     } catch (error) {
//       logError("fetchProductsByCategory", error, { slug, page, limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//         slug,
//       });
//     }
//   }
// );

// export const fetchProductBySlug = createAsyncThunk(
//   "userProducts/fetchProductBySlug",
//   async (slug, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(`/products/${slug}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Product not found");
//       return response.data;
//     } catch (error) {
//       logError("fetchProductBySlug", error, { slug });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load product",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const searchProducts = createAsyncThunk(
//   "userProducts/searchProducts",
//   async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(
//         `/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Search failed");
//       return response.data;
//     } catch (error) {
//       logError("searchProducts", error, { query, page });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Search failed",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchFeaturedProducts = createAsyncThunk(
//   "userProducts/fetchFeaturedProducts",
//   async (limit = 12, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(`/products/featured?limit=${limit}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch featured products");
//       return response.data;
//     } catch (error) {
//       logError("fetchFeaturedProducts", error, { limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load featured products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchRelatedProducts = createAsyncThunk(
//   "userProducts/fetchRelatedProducts",
//   async ({ slug, limit = 8 }, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(`/products/${slug}/related?limit=${limit}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch related products");
//       return response.data;
//     } catch (error) {
//       logError("fetchRelatedProducts", error, { slug, limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load related products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // ── Initial State ─────────────────────────────────────────────────────────────

// // ── Stable fallback references ────────────────────────────────────────────────
// // These are defined ONCE at module level so every selector that needs to return
// // "nothing yet" always returns the exact same object identity.
// // Without this, `|| []` / `?? null` inside a selector creates a brand-new
// // reference on every call → react-redux sees selected !== selected2 → warns.
// const EMPTY_ARRAY = Object.freeze([]);
// const EMPTY_PAGINATION = Object.freeze({
//   total: 0, page: 1, limit: 12,
//   totalPages: 0, hasNextPage: false, hasPrevPage: false,
// });

// const initialState = {
//   categoryProducts: {},
//   categoryPagination: {},
//   categoryLoading: {},
//   categoryError: {},

//   products: [],
//   featuredProducts: [],
//   relatedProducts: [],
//   currentProduct: null,
//   pagination: {
//     total: 0, page: 1, limit: 12,
//     totalPages: 0, hasNextPage: false, hasPrevPage: false,
//   },
//   loading: {
//     products: false, product: false,
//     search: false, featured: false, related: false,
//   },
//   error: {
//     products: null, product: null,
//     search: null, featured: null, related: null,
//   },
// };

// // ── Slice ─────────────────────────────────────────────────────────────────────
// const userProductsSlice = createSlice({
//   name: "userProducts",
//   initialState,
//   reducers: {
//     clearProducts: (state) => {
//       state.products = [];
//       state.pagination = initialState.pagination;
//     },
//     clearCategoryProducts: (state, action) => {
//       const slug = action.payload;
//       if (slug) {
//         delete state.categoryProducts[slug];
//         delete state.categoryPagination[slug];
//         delete state.categoryLoading[slug];
//         delete state.categoryError[slug];
//       }
//     },
//     clearCurrentProduct: (state) => { state.currentProduct = null; },
//     clearRelatedProducts: (state) => { state.relatedProducts = []; },
//     clearErrors: (state) => { state.error = initialState.error; },
//   },
//   extraReducers: (builder) => {
//     builder

//       // ── fetchProducts ───────────────────────────────────────────────────────
//       .addCase(fetchProducts.pending, (state) => {
//         state.loading.products = true;
//         state.error.products = null;
//       })
//       .addCase(fetchProducts.fulfilled, (state, action) => {
//         state.loading.products = false;
//         state.products = action.payload.products || [];
//         const p = action.payload.pagination || {};
//         state.pagination = {
//           total: p.total ?? action.payload.total ?? 0,
//           page: p.page ?? action.payload.page ?? 1,
//           limit: p.limit ?? action.payload.limit ?? 12,
//           totalPages: p.totalPages ?? Math.ceil((p.total ?? 0) / (p.limit ?? 12)),
//           hasNextPage: p.hasNextPage ?? false,
//           hasPrevPage: p.hasPrevPage ?? false,
//         };
//       })
//       .addCase(fetchProducts.rejected, (state, action) => {
//         state.loading.products = false;
//         state.error.products = action.payload || { message: "Failed to fetch products" };
//       })

//       // ── fetchProductsByCategory — per-slug buckets ──────────────────────────
//       .addCase(fetchProductsByCategory.pending, (state, action) => {
//         const slug = action.meta.arg.slug;
//         state.categoryLoading[slug] = true;
//         state.categoryError[slug] = null;
//       })
//       .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
//         const slug = action.payload.slug;
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         state.categoryLoading[slug] = false;
//         state.categoryProducts[slug] = action.payload.products || [];
//         state.categoryPagination[slug] = {
//           total, page, limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(fetchProductsByCategory.rejected, (state, action) => {
//         const slug = action.meta.arg.slug;
//         console.error(`❌ [${slug}] failed:`, action.payload?.message);
//         state.categoryLoading[slug] = false;
//         state.categoryError[slug] = action.payload || { message: "Failed to fetch category products" };
//       })

//       // ── fetchProductBySlug ──────────────────────────────────────────────────
//       .addCase(fetchProductBySlug.pending, (state) => {
//         state.loading.product = true;
//         state.error.product = null;
//       })
//       .addCase(fetchProductBySlug.fulfilled, (state, action) => {
//         state.loading.product = false;
//         state.currentProduct = action.payload.product || null;
//       })
//       .addCase(fetchProductBySlug.rejected, (state, action) => {
//         state.loading.product = false;
//         state.error.product = action.payload || { message: "Failed to fetch product" };
//       })

//       // ── searchProducts ──────────────────────────────────────────────────────
//       .addCase(searchProducts.pending, (state) => {
//         state.loading.search = true;
//         state.error.search = null;
//       })
//       .addCase(searchProducts.fulfilled, (state, action) => {
//         state.loading.search = false;
//         state.products = action.payload.products || [];
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         state.pagination = {
//           total, page, limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(searchProducts.rejected, (state, action) => {
//         state.loading.search = false;
//         state.error.search = action.payload || { message: "Search failed" };
//       })

//       // ── fetchFeaturedProducts ───────────────────────────────────────────────
//       .addCase(fetchFeaturedProducts.pending, (state) => {
//         state.loading.featured = true;
//         state.error.featured = null;
//       })
//       .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
//         state.loading.featured = false;
//         state.featuredProducts = action.payload.products || [];
//       })
//       .addCase(fetchFeaturedProducts.rejected, (state, action) => {
//         state.loading.featured = false;
//         state.error.featured = action.payload || { message: "Failed to fetch featured products" };
//       })

//       // ── fetchRelatedProducts ────────────────────────────────────────────────
//       .addCase(fetchRelatedProducts.pending, (state) => {
//         state.loading.related = true;
//         state.error.related = null;
//       })
//       .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
//         state.loading.related = false;
//         state.relatedProducts = action.payload.related || [];
//       })
//       .addCase(fetchRelatedProducts.rejected, (state, action) => {
//         state.loading.related = false;
//         state.error.related = action.payload || { message: "Failed to fetch related products" };
//       });
//   },
// });

// export const {
//   clearProducts,
//   clearCategoryProducts,
//   clearCurrentProduct,
//   clearRelatedProducts,
//   clearErrors,
// } = userProductsSlice.actions;

// // ── Simple (non-factory) selectors — these are fine as-is ────────────────────
// export const selectAllProducts       = (state) => state.userProducts.products;
// export const selectCurrentProduct    = (state) => state.userProducts.currentProduct;
// export const selectFeaturedProducts  = (state) => state.userProducts.featuredProducts;
// export const selectRelatedProducts   = (state) => state.userProducts.relatedProducts;
// export const selectProductPagination = (state) => state.userProducts.pagination;
// export const selectProductsLoading   = (state) => state.userProducts.loading;
// export const selectProductsError     = (state) => state.userProducts.error;

// // ── Per-slug selectors — FIXED with createSelector ───────────────────────────
// //
// // WHY THIS FIXES THE WARNING:
// // The old pattern `(slug) => (state) => state.categoryProducts[slug] || []`
// // creates a brand-new array reference on every call when the slug key is
// // missing (because `|| []` allocates a new [] each time).
// // react-redux calls the selector twice in dev mode to check stability —
// // it sees two different [] references and warns.
// //
// // createSelector memoizes the OUTPUT: if the input slice
// // (state.userProducts.categoryProducts[slug]) hasn't changed by reference,
// // the exact same output reference is returned — no new allocation, no warning.
// //
// // The EMPTY_ARRAY / EMPTY_PAGINATION constants handle the "not yet loaded"
// // case: they are module-level frozen objects so they always have the same
// // identity, even before the first fetch completes.
// export const selectProductsBySlug   = (slug) => (state) =>
//   state.userProducts.categoryProducts[slug] ?? EMPTY_ARRAY;

// export const selectLoadingBySlug    = (slug) => (state) =>
//   state.userProducts.categoryLoading[slug] ?? false;

// export const selectErrorBySlug      = (slug) => (state) =>
//   state.userProducts.categoryError[slug] ?? null;

// export const selectPaginationBySlug = (slug) => (state) =>
//   state.userProducts.categoryPagination[slug] ?? null;

// export default userProductsSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ── Error Logger ──────────────────────────────────────────────────────────────
// const logError = (context, error, info = {}) => {
//   console.group(`🔴 ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Message:", error.response?.data?.message || error.message);
//   console.log("Status:", error.response?.status);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ── Thunks ────────────────────────────────────────────────────────────────────

// export const fetchProducts = createAsyncThunk(
//   "userProducts/fetchProducts",
//   async (filters = {}, { rejectWithValue }) => {
//     try {
//       const queryParams = new URLSearchParams();
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value !== undefined && value !== null && value !== "")
//           queryParams.append(key, value);
//       });
//       const url = `/products/all${queryParams.toString() ? `?${queryParams}` : ""}`;
//       // console.log(`📦 fetchProducts → ${url}`);
//       const response = await axiosInstance.get(url);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       return response.data;
//     } catch (error) {
//       logError("fetchProducts", error, { filters });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchProductsByCategory = createAsyncThunk(
//   "userProducts/fetchProductsByCategory",
//   async ({ slug, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       // console.log(`📂 fetchProductsByCategory → slug=${slug} page=${page} limit=${limit}`);
//       const response = await axiosInstance.get(
//         `/products/category/${slug}?page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       // ✅ attach slug to payload so reducer knows which bucket to update
//       return { ...response.data, slug };
//     } catch (error) {
//       logError("fetchProductsByCategory", error, { slug, page, limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//         slug,
//       });
//     }
//   }
// );

// export const fetchProductBySlug = createAsyncThunk(
//   "userProducts/fetchProductBySlug",
//   async (slug, { rejectWithValue }) => {
//     try {
//       // console.log(`🔍 fetchProductBySlug → ${slug}`);
//       const response = await axiosInstance.get(`/products/${slug}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Product not found");
//       return response.data;
//     } catch (error) {
//       logError("fetchProductBySlug", error, { slug });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load product",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const searchProducts = createAsyncThunk(
//   "userProducts/searchProducts",
//   async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       // console.log(`🔎 searchProducts → q=${query} page=${page}`);
//       const response = await axiosInstance.get(
//         `/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Search failed");
//       return response.data;
//     } catch (error) {
//       logError("searchProducts", error, { query, page });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Search failed",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchFeaturedProducts = createAsyncThunk(
//   "userProducts/fetchFeaturedProducts",
//   async (limit = 12, { rejectWithValue }) => {
//     try {
//       // console.log(`⭐ fetchFeaturedProducts → limit=${limit}`);
//       const response = await axiosInstance.get(`/products/featured?limit=${limit}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch featured products");
//       return response.data;
//     } catch (error) {
//       logError("fetchFeaturedProducts", error, { limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load featured products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// export const fetchRelatedProducts = createAsyncThunk(
//   "userProducts/fetchRelatedProducts",
//   async ({ slug, limit = 8 }, { rejectWithValue }) => {
//     try {
//       // console.log(`🔗 fetchRelatedProducts → slug=${slug} limit=${limit}`);
//       const response = await axiosInstance.get(`/products/${slug}/related?limit=${limit}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch related products");
//       return response.data;
//     } catch (error) {
//       logError("fetchRelatedProducts", error, { slug, limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load related products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // ── Initial State ─────────────────────────────────────────────────────────────
// const initialState = {
//   // ✅ per-slug buckets — no more race conditions
//   categoryProducts: {},   // { 'smart-life-gadgets': [...], 'home-and-kitchen': [...] }
//   categoryPagination: {}, // { 'smart-life-gadgets': { page, total, ... } }
//   categoryLoading: {},    // { 'smart-life-gadgets': true/false }
//   categoryError: {},      // { 'smart-life-gadgets': null | { message } }

//   // other state untouched
//   products: [],
//   featuredProducts: [],
//   relatedProducts: [],
//   currentProduct: null,
//   pagination: {
//     total: 0, page: 1, limit: 12,
//     totalPages: 0, hasNextPage: false, hasPrevPage: false,
//   },
//   loading: {
//     products: false, product: false,
//     search: false, featured: false, related: false,
//   },
//   error: {
//     products: null, product: null,
//     search: null, featured: null, related: null,
//   },
// };

// // ── Slice ─────────────────────────────────────────────────────────────────────
// const userProductsSlice = createSlice({
//   name: "userProducts",
//   initialState,
//   reducers: {
//     clearProducts: (state) => {
//       state.products = [];
//       state.pagination = initialState.pagination;
//     },
//     clearCategoryProducts: (state, action) => {
//       const slug = action.payload;
//       if (slug) {
//         delete state.categoryProducts[slug];
//         delete state.categoryPagination[slug];
//         delete state.categoryLoading[slug];
//         delete state.categoryError[slug];
//       }
//     },
//     clearCurrentProduct: (state) => { state.currentProduct = null; },
//     clearRelatedProducts: (state) => { state.relatedProducts = []; },
//     clearErrors: (state) => { state.error = initialState.error; },
//   },
//   extraReducers: (builder) => {
//     builder

//       // ── fetchProducts ──────────────────────────────────────────────────────
//       .addCase(fetchProducts.pending, (state) => {
//         state.loading.products = true;
//         state.error.products = null;
//       })
//       .addCase(fetchProducts.fulfilled, (state, action) => {
//         state.loading.products = false;
//         state.products = action.payload.products || [];
//         const p = action.payload.pagination || {};
//         state.pagination = {
//           total: p.total ?? action.payload.total ?? 0,
//           page: p.page ?? action.payload.page ?? 1,
//           limit: p.limit ?? action.payload.limit ?? 12,
//           totalPages: p.totalPages ?? Math.ceil((p.total ?? 0) / (p.limit ?? 12)),
//           hasNextPage: p.hasNextPage ?? false,
//           hasPrevPage: p.hasPrevPage ?? false,
//         };
//       })
//       .addCase(fetchProducts.rejected, (state, action) => {
//         state.loading.products = false;
//         state.error.products = action.payload || { message: "Failed to fetch products" };
//       })

//       // ── fetchProductsByCategory ✅ now per-slug ───────────────────────────
//       .addCase(fetchProductsByCategory.pending, (state, action) => {
//         const slug = action.meta.arg.slug;
//         // console.log(`⏳ [${slug}] loading...`);
//         state.categoryLoading[slug] = true;
//         state.categoryError[slug] = null;
//       })
//       .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
//         const slug = action.payload.slug;
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         // console.log(`✅ [${slug}] loaded ${action.payload.products?.length} products`);
//         state.categoryLoading[slug] = false;
//         state.categoryProducts[slug] = action.payload.products || [];
//         state.categoryPagination[slug] = {
//           total, page, limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(fetchProductsByCategory.rejected, (state, action) => {
//         const slug = action.meta.arg.slug;
//         console.error(`❌ [${slug}] failed:`, action.payload?.message);
//         state.categoryLoading[slug] = false;
//         state.categoryError[slug] = action.payload || { message: "Failed to fetch category products" };
//       })

//       // ── fetchProductBySlug ────────────────────────────────────────────────
//       .addCase(fetchProductBySlug.pending, (state) => {
//         state.loading.product = true;
//         state.error.product = null;
//       })
//       .addCase(fetchProductBySlug.fulfilled, (state, action) => {
//         state.loading.product = false;
//         state.currentProduct = action.payload.product || null;
//       })
//       .addCase(fetchProductBySlug.rejected, (state, action) => {
//         state.loading.product = false;
//         state.error.product = action.payload || { message: "Failed to fetch product" };
//       })

//       // ── searchProducts ────────────────────────────────────────────────────
//       .addCase(searchProducts.pending, (state) => {
//         state.loading.search = true;
//         state.error.search = null;
//       })
//       .addCase(searchProducts.fulfilled, (state, action) => {
//         state.loading.search = false;
//         state.products = action.payload.products || [];
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         state.pagination = {
//           total, page, limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(searchProducts.rejected, (state, action) => {
//         state.loading.search = false;
//         state.error.search = action.payload || { message: "Search failed" };
//       })

//       // ── fetchFeaturedProducts ─────────────────────────────────────────────
//       .addCase(fetchFeaturedProducts.pending, (state) => {
//         state.loading.featured = true;
//         state.error.featured = null;
//       })
//       .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
//         state.loading.featured = false;
//         state.featuredProducts = action.payload.products || [];
//       })
//       .addCase(fetchFeaturedProducts.rejected, (state, action) => {
//         state.loading.featured = false;
//         state.error.featured = action.payload || { message: "Failed to fetch featured products" };
//       })

//       // ── fetchRelatedProducts ──────────────────────────────────────────────
//       .addCase(fetchRelatedProducts.pending, (state) => {
//         state.loading.related = true;
//         state.error.related = null;
//       })
//       .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
//         state.loading.related = false;
//         state.relatedProducts = action.payload.related || [];
//       })
//       .addCase(fetchRelatedProducts.rejected, (state, action) => {
//         state.loading.related = false;
//         state.error.related = action.payload || { message: "Failed to fetch related products" };
//       });
//   },
// });

// export const {
//   clearProducts,
//   clearCategoryProducts,
//   clearCurrentProduct,
//   clearRelatedProducts,
//   clearErrors,
// } = userProductsSlice.actions;

// // ── Selectors ─────────────────────────────────────────────────────────────────
// export const selectAllProducts       = (state) => state.userProducts.products;
// export const selectCurrentProduct    = (state) => state.userProducts.currentProduct;
// export const selectFeaturedProducts  = (state) => state.userProducts.featuredProducts;
// export const selectRelatedProducts   = (state) => state.userProducts.relatedProducts;
// export const selectProductPagination = (state) => state.userProducts.pagination;
// export const selectProductsLoading   = (state) => state.userProducts.loading;
// export const selectProductsError     = (state) => state.userProducts.error;

// // ✅ per-slug selectors
// export const selectProductsBySlug   = (slug) => (state) => state.userProducts.categoryProducts[slug]   || [];
// export const selectLoadingBySlug    = (slug) => (state) => state.userProducts.categoryLoading[slug]    ?? false;
// export const selectErrorBySlug      = (slug) => (state) => state.userProducts.categoryError[slug]      ?? null;
// export const selectPaginationBySlug = (slug) => (state) => state.userProducts.categoryPagination[slug] ?? null;

// export default userProductsSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ── Error Logger ──────────────────────────────────────────────────────────────
// const logError = (context, error, info = {}) => {
//   console.group(`🔴 ERROR in ${context}`);
//   console.error("Error:", error);
//   console.log("Message:", error.response?.data?.message || error.message);
//   console.log("Status:", error.response?.status);
//   console.log("Info:", info);
//   console.groupEnd();
// };

// // ── Thunks ────────────────────────────────────────────────────────────────────

// // GET /products/all?page=&limit=&category=&minPrice=&maxPrice=&featured=&q=
// export const fetchProducts = createAsyncThunk(
//   "userProducts/fetchProducts",
//   async (filters = {}, { rejectWithValue }) => {
//     try {
//       const queryParams = new URLSearchParams();
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value !== undefined && value !== null && value !== "")
//           queryParams.append(key, value);
//       });
//       const url = `/products/all${
//         queryParams.toString() ? `?${queryParams}` : ""
//       }`;
//       console.log(`📦 fetchProducts → ${url}`);
//       const response = await axiosInstance.get(url);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       return response.data;
//     } catch (error) {
//       logError("fetchProducts", error, { filters });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // GET /products/category/:slug?page=&limit=
// export const fetchProductsByCategory = createAsyncThunk(
//   "userProducts/fetchProductsByCategory",
//   async ({ slug, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       console.log(
//         `📂 fetchProductsByCategory → slug=${slug} page=${page} limit=${limit}`
//       );
//       const response = await axiosInstance.get(
//         `/products/category/${slug}?page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Failed to fetch products");
//       return response.data;
//     } catch (error) {
//       logError("fetchProductsByCategory", error, { slug, page, limit });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // GET /products/:slug
// export const fetchProductBySlug = createAsyncThunk(
//   "userProducts/fetchProductBySlug",
//   async (slug, { rejectWithValue }) => {
//     try {
//       console.log(`🔍 fetchProductBySlug → ${slug}`);
//       const response = await axiosInstance.get(`/products/${slug}`);
//       if (!response.data.success)
//         throw new Error(response.data.message || "Product not found");
//       return response.data;
//     } catch (error) {
//       logError("fetchProductBySlug", error, { slug });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Failed to load product",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // GET /products/search?q=&page=&limit=
// export const searchProducts = createAsyncThunk(
//   "userProducts/searchProducts",
//   async ({ query, page = 1, limit = 12 }, { rejectWithValue }) => {
//     try {
//       console.log(`🔎 searchProducts → q=${query} page=${page}`);
//       const response = await axiosInstance.get(
//         `/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(response.data.message || "Search failed");
//       return response.data;
//     } catch (error) {
//       logError("searchProducts", error, { query, page });
//       return rejectWithValue({
//         message: error.response?.data?.message || "Search failed",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // GET /products/featured?limit=
// export const fetchFeaturedProducts = createAsyncThunk(
//   "userProducts/fetchFeaturedProducts",
//   async (limit = 12, { rejectWithValue }) => {
//     try {
//       console.log(`⭐ fetchFeaturedProducts → limit=${limit}`);
//       const response = await axiosInstance.get(
//         `/products/featured?limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(
//           response.data.message || "Failed to fetch featured products"
//         );
//       return response.data;
//     } catch (error) {
//       logError("fetchFeaturedProducts", error, { limit });
//       return rejectWithValue({
//         message:
//           error.response?.data?.message || "Failed to load featured products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // GET /products/:slug/related?limit=
// export const fetchRelatedProducts = createAsyncThunk(
//   "userProducts/fetchRelatedProducts",
//   async ({ slug, limit = 8 }, { rejectWithValue }) => {
//     try {
//       console.log(`🔗 fetchRelatedProducts → slug=${slug} limit=${limit}`);
//       const response = await axiosInstance.get(
//         `/products/${slug}/related?limit=${limit}`
//       );
//       if (!response.data.success)
//         throw new Error(
//           response.data.message || "Failed to fetch related products"
//         );
//       return response.data;
//     } catch (error) {
//       logError("fetchRelatedProducts", error, { slug, limit });
//       return rejectWithValue({
//         message:
//           error.response?.data?.message || "Failed to load related products",
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // ── Initial State ─────────────────────────────────────────────────────────────
// const initialState = {
//   products: [],
//   featuredProducts: [],
//   relatedProducts: [],
//   currentProduct: null,
//   pagination: {
//     total: 0,
//     page: 1,
//     limit: 12,
//     totalPages: 0,
//     hasNextPage: false,
//     hasPrevPage: false,
//   },
//   loading: {
//     products: false,
//     product: false,
//     categoryProducts: false,
//     search: false,
//     featured: false,
//     related: false,
//   },
//   error: {
//     products: null,
//     product: null,
//     categoryProducts: null,
//     search: null,
//     featured: null,
//     related: null,
//   },
// };

// // ── Slice ─────────────────────────────────────────────────────────────────────
// const userProductsSlice = createSlice({
//   name: "userProducts",
//   initialState,
//   reducers: {
//     clearProducts: (state) => {
//       state.products = [];
//       state.pagination = initialState.pagination;
//     },
//     clearCurrentProduct: (state) => {
//       state.currentProduct = null;
//     },
//     clearRelatedProducts: (state) => {
//       state.relatedProducts = [];
//     },
//     clearErrors: (state) => {
//       state.error = initialState.error;
//     },
//   },
//   extraReducers: (builder) => {
//     builder

//       // ── fetchProducts (all products with filters) ──────────────────────────
//       .addCase(fetchProducts.pending, (state) => {
//         state.loading.products = true;
//         state.error.products = null;
//       })
//       .addCase(fetchProducts.fulfilled, (state, action) => {
//         state.loading.products = false;
//         state.products = action.payload.products || [];
//         const p = action.payload.pagination || {};
//         state.pagination = {
//           total: p.total ?? action.payload.total ?? 0,
//           page: p.page ?? action.payload.page ?? 1,
//           limit: p.limit ?? action.payload.limit ?? 12,
//           totalPages:
//             p.totalPages ??
//             Math.ceil((p.total ?? 0) / (p.limit ?? 12)),
//           hasNextPage: p.hasNextPage ?? false,
//           hasPrevPage: p.hasPrevPage ?? false,
//         };
//       })
//       .addCase(fetchProducts.rejected, (state, action) => {
//         state.loading.products = false;
//         state.error.products =
//           action.payload || { message: "Failed to fetch products" };
//       })

//       // ── fetchProductsByCategory ────────────────────────────────────────────
//       .addCase(fetchProductsByCategory.pending, (state) => {
//         state.loading.categoryProducts = true;
//         state.error.categoryProducts = null;
//       })
//       .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
//         state.loading.categoryProducts = false;
//         state.products = action.payload.products || [];
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         state.pagination = {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(fetchProductsByCategory.rejected, (state, action) => {
//         state.loading.categoryProducts = false;
//         state.error.categoryProducts =
//           action.payload || { message: "Failed to fetch category products" };
//       })

//       // ── fetchProductBySlug ────────────────────────────────────────────────
//       .addCase(fetchProductBySlug.pending, (state) => {
//         state.loading.product = true;
//         state.error.product = null;
//       })
//       .addCase(fetchProductBySlug.fulfilled, (state, action) => {
//         state.loading.product = false;
//         state.currentProduct = action.payload.product || null;
//       })
//       .addCase(fetchProductBySlug.rejected, (state, action) => {
//         state.loading.product = false;
//         state.error.product =
//           action.payload || { message: "Failed to fetch product" };
//       })

//       // ── searchProducts ────────────────────────────────────────────────────
//       .addCase(searchProducts.pending, (state) => {
//         state.loading.search = true;
//         state.error.search = null;
//       })
//       .addCase(searchProducts.fulfilled, (state, action) => {
//         state.loading.search = false;
//         state.products = action.payload.products || [];
//         const total = action.payload.total ?? 0;
//         const page = action.payload.page ?? 1;
//         const limit = action.payload.limit ?? 12;
//         state.pagination = {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//           hasNextPage: page * limit < total,
//           hasPrevPage: page > 1,
//         };
//       })
//       .addCase(searchProducts.rejected, (state, action) => {
//         state.loading.search = false;
//         state.error.search = action.payload || { message: "Search failed" };
//       })

//       // ── fetchFeaturedProducts ─────────────────────────────────────────────
//       .addCase(fetchFeaturedProducts.pending, (state) => {
//         state.loading.featured = true;
//         state.error.featured = null;
//       })
//       .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
//         state.loading.featured = false;
//         state.featuredProducts = action.payload.products || [];
//       })
//       .addCase(fetchFeaturedProducts.rejected, (state, action) => {
//         state.loading.featured = false;
//         state.error.featured =
//           action.payload || { message: "Failed to fetch featured products" };
//       })

//       // ── fetchRelatedProducts ──────────────────────────────────────────────
//       .addCase(fetchRelatedProducts.pending, (state) => {
//         state.loading.related = true;
//         state.error.related = null;
//       })
//       .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
//         state.loading.related = false;
//         state.relatedProducts = action.payload.related || [];
//       })
//       .addCase(fetchRelatedProducts.rejected, (state, action) => {
//         state.loading.related = false;
//         state.error.related =
//           action.payload || { message: "Failed to fetch related products" };
//       });
//   },
// });

// export const {
//   clearProducts,
//   clearCurrentProduct,
//   clearRelatedProducts,
//   clearErrors,
// } = userProductsSlice.actions;

// // ── Selectors ─────────────────────────────────────────────────────────────────
// export const selectAllProducts      = (state) => state.userProducts.products;
// export const selectCurrentProduct   = (state) => state.userProducts.currentProduct;
// export const selectFeaturedProducts = (state) => state.userProducts.featuredProducts;
// export const selectRelatedProducts  = (state) => state.userProducts.relatedProducts;
// export const selectProductPagination = (state) => state.userProducts.pagination;
// export const selectProductsLoading  = (state) => state.userProducts.loading;
// export const selectProductsError    = (state) => state.userProducts.error;

// export default userProductsSlice.reducer;