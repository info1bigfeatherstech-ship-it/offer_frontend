// ADMIN_REDUX_MANAGEMENT/couponApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import axiosInstance, { AUTH_CONTEXT_ADMIN } from '../../../../SERVICES/axiosInstance';
 
const axiosBaseQuery = () => async ({ url, method = 'GET', body, params }) => {
    try {
        const result = await axiosInstance({
            url,
            method,
            data: body,
            params,
            authContext: AUTH_CONTEXT_ADMIN,
        });
        return { data: result.data };
    } catch (axiosError) {
        return {
            error: {
                status: axiosError.response?.status,
                data: axiosError.response?.data || axiosError.message,
            },
        };
    }
};
 
export const couponApi = createApi({
    reducerPath: 'couponApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['Coupon'],
    endpoints: (builder) => ({
        getCoupons: builder.query({
            query: ({ page = 1, limit = 10, status = 'all', search = '' }) => {
                const params = new URLSearchParams();
                params.append('page', page);
                params.append('limit', limit);
                if (status !== 'all') params.append('status', status);
                if (search) params.append('search', search);
                return { url: `/admin/coupons?${params.toString()}` };
            },
            providesTags: (result) =>
                result?.coupons
                    ? [
                        ...result.coupons.map(({ _id }) => ({ type: 'Coupon', id: _id })),
                        { type: 'Coupon', id: 'LIST' },
                    ]
                    : [{ type: 'Coupon', id: 'LIST' }],
        }),
       
        createCoupon: builder.mutation({
            query: (couponData) => ({
                url: '/admin/coupons',
                method: 'POST',
                body: couponData,
            }),
            invalidatesTags: [{ type: 'Coupon', id: 'LIST' }],
        }),
       
        updateCoupon: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/admin/coupons/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Coupon', id },
                { type: 'Coupon', id: 'LIST' },
            ],
        }),
       
        deleteCoupon: builder.mutation({
            query: (id) => ({
                url: `/admin/coupons/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Coupon', id: 'LIST' }],
        }),
       
        toggleCouponStatus: builder.mutation({
            query: (id) => ({
                url: `/admin/coupons/${id}/toggle`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'Coupon', id },
                { type: 'Coupon', id: 'LIST' },
            ],
        }),
    }),
});
 
export const {
    useGetCouponsQuery,
    useCreateCouponMutation,
    useUpdateCouponMutation,
    useDeleteCouponMutation,
    useToggleCouponStatusMutation,
} = couponApi;
 