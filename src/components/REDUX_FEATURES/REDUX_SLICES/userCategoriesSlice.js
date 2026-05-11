import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

const logError = (context, error, info = {}) => {
  console.group(`🔴 ERROR in ${context}`);
  console.error("Error:", error);
  console.log("Message:", error.response?.data?.message || error.message);
  console.log("Status:", error.response?.status);
  console.log("Info:", info);
  console.groupEnd();
};

// ✅ Get all active categories (hierarchical)
export const fetchAllCategories = createAsyncThunk(
  "userCategories/fetchAllCategories",
  async (_, { rejectWithValue }) => {
    let retries = 2;
    while (retries > 0) {
      try {
        const response = await axiosInstance.get("/categories/categories");
        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to fetch categories");
        }
        return response.data;
      } catch (error) {
        retries--;
        if (retries === 0) {
          logError("fetchAllCategories", error);
          return rejectWithValue({
            message: error.response?.data?.message || "Failed to load categories",
            status: error.response?.status,
          });
        }
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }
);

// ✅ Get single active category by ID
export const fetchCategoryById = createAsyncThunk(
  "userCategories/fetchCategoryById",
  async (id, { rejectWithValue }) => {
    try {
      // console.log(`🔍 Fetching category with ID: ${id}`);
      const response = await axiosInstance.get(`/categories/categories/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Category not found");
      }

      return response.data;
    } catch (error) {
      logError("fetchCategoryById", error, { id });
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to load category",
        status: error.response?.status,
      });
    }
  }
);

// ✅ Get category by slug — uses /products/category/:slug to resolve category info
//    (since your backend doesn't have /categories/slug/:slug yet, we derive it
//     from the products endpoint which already resolves by slug and returns `category`)
export const fetchCategoryBySlug = createAsyncThunk(
  "userCategories/fetchBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      // console.log(`📁 Fetching category by slug: ${slug}`);
      // /products/category/:slug returns { success, category, products, ... }
      const response = await axiosInstance.get(
        `/products/category/${slug}?page=1&limit=1`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Category not found");
      }

      // We only need the category object here; products are fetched separately
      return { success: true, category: response.data.category };
    } catch (error) {
      logError("fetchCategoryBySlug", error, { slug });
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to load category",
        status: error.response?.status,
      });
    }
  }
);

const initialState = {
  categories: [],
  hierarchicalCategories: [],
  currentCategory: null,
  loading: {
    categories: false,
    category: false,
  },
  error: {
    categories: null,
    category: null,
  },
  totalCategories: 0,
};

const userCategoriesSlice = createSlice({
  name: "userCategories",
  initialState,
  reducers: {
    setCurrentCategory: (state, action) => {
      state.currentCategory = action.payload;
    },
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
    },
    clearCategories: (state) => {
      state.categories = [];
      state.hierarchicalCategories = [];
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder
      // ─── Fetch All Categories ──────────────────────────────────────────────
      .addCase(fetchAllCategories.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchAllCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload.categories || [];
        state.hierarchicalCategories = action.payload.categories || [];
        state.totalCategories =
          action.payload.count ||
          action.payload.categories?.length ||
          0;
      })
      .addCase(fetchAllCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories =
          action.payload || { message: "Failed to fetch categories" };
      })

      // ─── Fetch Category By ID ──────────────────────────────────────────────
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading.category = true;
        state.error.category = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading.category = false;
        state.currentCategory = action.payload.category || null;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading.category = false;
        state.error.category =
          action.payload || { message: "Failed to fetch category" };
      })

      // ─── Fetch Category By Slug ────────────────────────────────────────────
      // ⚠️  BUG FIX: Previous code wrote `state.loading = true` (primitive),
      //     which destroyed the { categories, category } object shape.
      //     Fixed: always target state.loading.category / state.error.category
      .addCase(fetchCategoryBySlug.pending, (state) => {
        state.loading.category = true;     // ✅ correct nested key
        state.error.category = null;        // ✅ correct nested key
      })
      .addCase(fetchCategoryBySlug.fulfilled, (state, action) => {
        state.loading.category = false;    // ✅ correct nested key
        state.currentCategory = action.payload.category || null;
      })
      .addCase(fetchCategoryBySlug.rejected, (state, action) => {
        state.loading.category = false;    // ✅ correct nested key
        state.error.category =             // ✅ correct nested key
          action.payload || { message: "Failed to fetch category" };
        state.currentCategory = null;
      });
  },
});

export const {
  setCurrentCategory,
  clearCurrentCategory,
  clearCategories,
  clearErrors,
} = userCategoriesSlice.actions;

// Selectors
export const selectAllCategories = (state) =>
  state.userCategories.categories;
export const selectHierarchicalCategories = (state) =>
  state.userCategories.hierarchicalCategories;
export const selectCurrentCategory = (state) =>
  state.userCategories.currentCategory;
export const selectCategoriesLoading = (state) =>
  state.userCategories.loading;
export const selectCategoriesError = (state) =>
  state.userCategories.error;

export default userCategoriesSlice.reducer;