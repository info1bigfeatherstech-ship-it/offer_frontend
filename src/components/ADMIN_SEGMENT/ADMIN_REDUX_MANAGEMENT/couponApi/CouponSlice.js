
// ADMIN_REDUX_MANAGEMENT/couponSlice.js
import { createSlice } from '@reduxjs/toolkit';
 
const initialState = {
    // UI State
    modalOpen: false,
    editingCoupon: null,
   
    // Filter State
    filters: {
        status: 'all',
        search: '',
    },
   
    // Pagination State
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
    },
   
    // Loading States for UI actions
    uiLoading: {
        deleteId: null,
        toggleId: null,
    },
};
 
const couponSlice = createSlice({
    name: 'coupon',
    initialState,
    reducers: {
        // Modal actions
        openModal: (state, action) => {
            state.modalOpen = true;
            state.editingCoupon = action.payload || null;
        },
        closeModal: (state) => {
            state.modalOpen = false;
            state.editingCoupon = null;
        },
       
        // Filter actions
        setFilter: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.currentPage = 1; // Reset to first page on filter change
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
            state.pagination.currentPage = 1;
        },
       
        // Pagination actions
        setPage: (state, action) => {
            state.pagination.currentPage = action.payload;
        },
        setItemsPerPage: (state, action) => {
            state.pagination.itemsPerPage = action.payload;
            state.pagination.currentPage = 1;
        },
       
        // UI Loading actions
        setDeleteLoading: (state, action) => {
            state.uiLoading.deleteId = action.payload;
        },
        setToggleLoading: (state, action) => {
            state.uiLoading.toggleId = action.payload;
        },
        clearUILoading: (state) => {
            state.uiLoading = initialState.uiLoading;
        },
    },
});
 
export const {
    openModal,
    closeModal,
    setFilter,
    resetFilters,
    setPage,
    setItemsPerPage,
    setDeleteLoading,
    setToggleLoading,
    clearUILoading,
} = couponSlice.actions;
 
// Selectors
export const selectModalState = (state) => ({
    isOpen: state.coupon.modalOpen,
    editingCoupon: state.coupon.editingCoupon,
});
 
export const selectFilters = (state) => state.coupon.filters;
export const selectPagination = (state) => state.coupon.pagination;
export const selectUILoading = (state) => state.coupon.uiLoading;
 
export default couponSlice.reducer;
 