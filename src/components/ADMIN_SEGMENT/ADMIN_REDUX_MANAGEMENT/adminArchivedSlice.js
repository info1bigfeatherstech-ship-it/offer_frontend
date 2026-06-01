// ADMIN_REDUX_MANAGEMENT/adminArchivedSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";

// ─────────────────────────────────────────────────────────────────────────────
// THUNKS
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/products/archived - Fetch paginated archived products
export const fetchArchivedProducts = createAsyncThunk(
    "adminArchived/fetch",
    async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/admin/products/archived", {
                params: { page, limit }
            });
            return response.data; // { success, total, page, limit, count, products }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to fetch archived products");
        }
    }
);

// PATCH /admin/products/restore/:slug - Restore a single archived product
export const restoreArchivedProduct = createAsyncThunk(
    "adminArchived/restore",
    async (slug, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.patch(`/admin/products/restore/${slug}`);
            
            // Refresh the archived list after successful restore
            dispatch(fetchArchivedProducts());
            
            return response.data; // { success, message, product }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to restore product");
        }
    }
);

// DELETE /admin/products/hard/:slug - Permanently delete a single archived product
export const hardDeleteArchivedProduct = createAsyncThunk(
    "adminArchived/hardDelete",
    async (slug, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.delete(`/admin/products/hard/${slug}`);
            
            // Refresh the archived list after successful deletion
            dispatch(fetchArchivedProducts());
            
            return { slug, ...response.data }; // Include slug to identify which was deleted
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to permanently delete product");
        }
    }
);

// POST /admin/products/bulk-restore - Bulk restore multiple archived products
export const bulkRestoreArchivedProducts = createAsyncThunk(
    "adminArchived/bulkRestore",
    async (slugs, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.patch("/admin/products/bulk-restore", { slugs });
            
            // Refresh the archived list after successful bulk restore
            dispatch(fetchArchivedProducts());
            
            return response.data; // { success, message, requested, restored, skipped }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to bulk restore products");
        }
    }
);

// DELETE /admin/products/bulk-hard-delete - Bulk permanently delete multiple archived products
export const bulkHardDeleteArchivedProducts = createAsyncThunk(
    "adminArchived/bulkHardDelete",
    async (slugs, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.delete("/admin/products/bulk-hard-delete", {
                data: { slugs }
            });
            
            // Refresh the archived list after successful bulk deletion
            dispatch(fetchArchivedProducts());
            
            return response.data; // { success, message, requested, deletedCount, skipped }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to bulk permanently delete products");
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Optimistic Update Action (import from adminGetProductsSlice or define here)
// ─────────────────────────────────────────────────────────────────────────────
export const optimisticUpdateProduct = createAsyncThunk(
    "adminArchived/optimisticUpdate",
    async (updateData, { dispatch }) => {
        return updateData;
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────────────────────────────────────

const adminArchivedSlice = createSlice({
    name: "adminArchived",
    initialState: {
        // Data
        products: [], // FIXED: Always initialize as empty array
        total: 0,
        page: 1,
        limit: 20,
        count: 0,
        
        // UI States
        loading: false,
        error: null,
        
        // Action-specific loading states
        restoreLoading: false,
        hardDeleteLoading: false,
        bulkRestoreLoading: false,
        bulkHardDeleteLoading: false,
        
        // Action success flags (optional)
        restoreSuccess: false,
        hardDeleteSuccess: false,
    },
    reducers: {
        clearArchivedState(state) {
            state.products = [];
            state.total = 0;
            state.page = 1;
            state.limit = 20;
            state.count = 0;
            state.loading = false;
            state.error = null;
            state.restoreLoading = false;
            state.hardDeleteLoading = false;
            state.bulkRestoreLoading = false;
            state.bulkHardDeleteLoading = false;
            state.restoreSuccess = false;
            state.hardDeleteSuccess = false;
        },
        setArchivedPage(state, action) {
            state.page = action.payload;
        },
        clearArchivedErrors(state) {
            state.error = null;
        },
        resetActionStates(state) {
            state.restoreLoading = false;
            state.hardDeleteLoading = false;
            state.bulkRestoreLoading = false;
            state.bulkHardDeleteLoading = false;
            state.restoreSuccess = false;
            state.hardDeleteSuccess = false;
        },
        // Manual optimistic update reducer
        optimisticUpdateArchived(state, action) {
            if (action.payload._delete) {
                // Remove product from list
                state.products = state.products.filter(p => p._id !== action.payload._id);
                state.count = Math.max(0, state.count - 1);
                state.total = Math.max(0, state.total - 1);
            } else if (action.payload._add) {
                // Add product to list (for when product is archived)
                // Check if already exists
                const exists = state.products.some(p => p._id === action.payload._id);
                if (!exists) {
                    state.products = [action.payload, ...state.products];
                    state.count += 1;
                    state.total += 1;
                }
            } else {
                // Update existing product
                const index = state.products.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.products[index] = { ...state.products[index], ...action.payload };
                }
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // ── Fetch Archived Products ───────────────────────────
            .addCase(fetchArchivedProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchArchivedProducts.fulfilled, (state, action) => {
                state.loading = false;
                state.products = action.payload.products || []; // FIXED: Ensure array
                state.total = action.payload.total || 0;
                state.page = action.payload.page || 1;
                state.limit = action.payload.limit || 20;
                state.count = action.payload.count || 0;
            })
            .addCase(fetchArchivedProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch archived products";
                state.products = []; // FIXED: Reset to empty array on error
            })
            
            // ── Restore Single Product ────────────────────────────
            .addCase(restoreArchivedProduct.pending, (state) => {
                state.restoreLoading = true;
                state.restoreSuccess = false;
                state.error = null;
            })
            .addCase(restoreArchivedProduct.fulfilled, (state, action) => {
                state.restoreLoading = false;
                state.restoreSuccess = true;
                
                // Optimistically remove the restored product from archived list
                if (action.payload?.product?.slug) {
                    state.products = state.products.filter(p => p.slug !== action.payload.product.slug);
                    state.count = Math.max(0, state.count - 1);
                    state.total = Math.max(0, state.total - 1);
                }
            })
            .addCase(restoreArchivedProduct.rejected, (state, action) => {
                state.restoreLoading = false;
                state.restoreSuccess = false;
                state.error = action.payload || "Failed to restore product";
            })
            
            // ── Hard Delete Single Product ────────────────────────
            .addCase(hardDeleteArchivedProduct.pending, (state) => {
                state.hardDeleteLoading = true;
                state.hardDeleteSuccess = false;
                state.error = null;
            })
            .addCase(hardDeleteArchivedProduct.fulfilled, (state, action) => {
                state.hardDeleteLoading = false;
                state.hardDeleteSuccess = true;
                
                // Optimistically remove the deleted product from the list
                // Even though we refresh, this provides immediate UI feedback
                if (action.payload?.slug) {
                    state.products = state.products.filter(p => p.slug !== action.payload.slug);
                    state.count = Math.max(0, state.count - 1);
                    state.total = Math.max(0, state.total - 1);
                }
            })
            .addCase(hardDeleteArchivedProduct.rejected, (state, action) => {
                state.hardDeleteLoading = false;
                state.hardDeleteSuccess = false;
                state.error = action.payload || "Failed to permanently delete product";
            })
            
            // ── Bulk Restore Products ─────────────────────────────
            .addCase(bulkRestoreArchivedProducts.pending, (state) => {
                state.bulkRestoreLoading = true;
                state.error = null;
            })
            .addCase(bulkRestoreArchivedProducts.fulfilled, (state, action) => {
                state.bulkRestoreLoading = false;
                // Success - products will be refreshed via dispatch in thunk
            })
            .addCase(bulkRestoreArchivedProducts.rejected, (state, action) => {
                state.bulkRestoreLoading = false;
                state.error = action.payload || "Failed to bulk restore products";
            })
            
            // ── Bulk Hard Delete Products ─────────────────────────
            .addCase(bulkHardDeleteArchivedProducts.pending, (state) => {
                state.bulkHardDeleteLoading = true;
                state.error = null;
            })
            .addCase(bulkHardDeleteArchivedProducts.fulfilled, (state) => {
                state.bulkHardDeleteLoading = false;
                // Success - products will be refreshed via dispatch in thunk
            })
            .addCase(bulkHardDeleteArchivedProducts.rejected, (state, action) => {
                state.bulkHardDeleteLoading = false;
                state.error = action.payload || "Failed to bulk permanently delete products";
            })

            // ── Handle soft delete from adminEditProduct slice ───────────
           .addMatcher(
  (action) => action.type === "adminEditProduct/softDelete/fulfilled",
  (state, action) => {
    // When a product is soft deleted, add it to archived list
    if (action.payload?.product) {
      const archivedProduct = action.payload.product;
      // Check if already exists
      const exists = state.products.some(p => p._id === archivedProduct._id);
      if (!exists) {
        state.products = [archivedProduct, ...state.products];
        state.count += 1;
        state.total += 1;
      }
    }
  }
)
            
            // ── Handle restore from this slice itself ───────────────────
            .addMatcher(
                (action) => action.type === "adminArchived/restore/fulfilled",
                (state, action) => {
                    // Already handled above, but this ensures consistency
                }
            );
    }
});

export const { 
    clearArchivedState, 
    setArchivedPage, 
    clearArchivedErrors,
    resetActionStates,
    optimisticUpdateArchived 
} = adminArchivedSlice.actions;

export default adminArchivedSlice.reducer;

