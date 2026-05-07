import { createApi } from '@reduxjs/toolkit/query/react';
import axiosInstance from '../../../../SERVICES/axiosInstance';

/**
 * Axios adapter for RTK Query — matches userAnalyticsApi pattern; never use raw axios in components.
 */
const axiosBaseQuery =
  ({ baseUrl } = { baseUrl: '' }) =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await axiosInstance({
        url: baseUrl + url,
        method,
        data,
        params,
        headers: { ...headers },
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError;
      const status = err.response?.status;
      const payload = err.response?.data;
      const message =
        (typeof payload === 'object' && payload?.message) ||
        (typeof payload === 'string' ? payload : null) ||
        err.message;
      return {
        error: {
          status,
          data: payload ?? { message },
          message,
        },
      };
    }
  };

/**
 * @typedef {Object} AdminOrdersSummaryResponse
 * @property {boolean} success
 * @property {Object} data
 */

export const adminOrdersApi = createApi({
  reducerPath: 'adminOrdersApi',
  baseQuery: axiosBaseQuery({ baseUrl: '' }),
  tagTypes: ['AdminOrdersSummary', 'AdminOrdersList', 'AdminOrderTracking'],
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    /**
     * Dashboard cards + tab counts (date range).
     * GET /api/admin/orders/summary
     */
    getAdminOrdersSummary: builder.query({
      query: (arg = {}) => {
        const params = {};
        if (arg.from) params.from = arg.from;
        if (arg.to) params.to = arg.to;
        if (arg.rangePreset) params.rangePreset = arg.rangePreset;
        if (arg.presetDays != null && arg.presetDays !== '' && !arg.from && !arg.to && !arg.rangePreset) {
          params.presetDays = arg.presetDays;
        }
        if (arg.preset === '30d') params.preset = '30d';
        return {
          url: '/admin/orders/summary',
          method: 'GET',
          params,
        };
      },
      providesTags: [{ type: 'AdminOrdersSummary', id: 'SUMMARY' }],
    }),

    /**
     * Paginated list with filters.
     * GET /api/admin/orders
     */
    getAdminOrdersList: builder.query({
      query: (arg = {}) => {
        const params = {
          page: arg.page ?? 1,
          limit: arg.limit ?? 20,
          sortBy: arg.sortBy ?? 'createdAt',
          sortOrder: arg.sortOrder ?? 'desc',
        };
        if (arg.from) params.from = arg.from;
        if (arg.to) params.to = arg.to;
        if (arg.rangePreset) params.rangePreset = arg.rangePreset;
        if (arg.presetDays != null && arg.presetDays !== '' && !arg.from && !arg.to && !arg.rangePreset) {
          params.presetDays = arg.presetDays;
        }
        if (arg.preset === '30d') params.preset = '30d';
        if (arg.bucket && arg.bucket !== 'all') params.bucket = arg.bucket;
        if (arg.search && String(arg.search).trim()) params.search = String(arg.search).trim();
        return {
          url: '/admin/orders',
          method: 'GET',
          params,
        };
      },
      providesTags: (result) =>
        result?.data?.orders?.length
          ? [
              ...result.data.orders.map((o) => ({
                type: 'AdminOrdersList',
                id: o.orderId,
              })),
              { type: 'AdminOrdersList', id: 'PARTIAL' },
            ]
          : [{ type: 'AdminOrdersList', id: 'PARTIAL' }],
    }),

    /**
     * Single order (existing user-facing route; admin / order_manager allowed server-side).
     * GET /api/orders/items/:orderId
     */
    getAdminOrderDetail: builder.query({
      query: (orderId) => ({
        url: `/orders/items/${encodeURIComponent(String(orderId))}`,
        method: 'GET',
      }),
      providesTags: (result, error, orderId) => [{ type: 'AdminOrdersList', id: orderId }],
    }),

    /**
     * Live tracking + timeline sync from provider.
     * GET /api/orders/items/:orderId/track
     */
    getAdminOrderTracking: builder.query({
      query: (orderId) => ({
        url: `/orders/items/${encodeURIComponent(String(orderId))}/track`,
        method: 'GET',
      }),
      providesTags: (result, error, orderId) => [{ type: 'AdminOrderTracking', id: orderId }],
    }),

    getAdminReturnRequests: builder.query({
      query: (arg = {}) => ({
        url: '/orders/admin/returns/requests',
        method: 'GET',
        params: {
          page: arg.page ?? 1,
          limit: arg.limit ?? 20,
          ...(arg.status ? { status: arg.status } : {}),
        },
      }),
      providesTags: [{ type: 'AdminOrderTracking', id: 'RETURNS_LIST' }],
    }),

    getAdminReturnRequestDetail: builder.query({
      query: (orderId) => ({
        url: `/orders/admin/returns/requests/${encodeURIComponent(String(orderId))}`,
        method: 'GET',
      }),
      providesTags: (result, error, orderId) => [{ type: 'AdminOrderTracking', id: `RETURN_${orderId}` }],
    }),

    decideAdminReturnRequest: builder.mutation({
      query: ({ orderId, decision, decisionReason }) => ({
        url: `/orders/admin/returns/requests/${encodeURIComponent(String(orderId))}/decision`,
        method: 'POST',
        data: { decision, decisionReason },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminOrderTracking', id: 'RETURNS_LIST' },
        { type: 'AdminOrderTracking', id: `RETURN_${arg.orderId}` },
        { type: 'AdminOrdersList', id: arg.orderId },
      ],
    }),

    initiateAdminReturnRefund: builder.mutation({
      query: ({ orderId }) => ({
        url: `/orders/admin/returns/requests/${encodeURIComponent(String(orderId))}/refund`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminOrderTracking', id: 'RETURNS_LIST' },
        { type: 'AdminOrderTracking', id: `RETURN_${arg.orderId}` },
        { type: 'AdminOrdersList', id: arg.orderId },
      ],
    }),
  }),
});

export const {
  useGetAdminOrdersSummaryQuery,
  useGetAdminOrdersListQuery,
  useGetAdminOrderDetailQuery,
  useLazyGetAdminOrderDetailQuery,
  useGetAdminOrderTrackingQuery,
  useGetAdminReturnRequestsQuery,
  useGetAdminReturnRequestDetailQuery,
  useDecideAdminReturnRequestMutation,
  useInitiateAdminReturnRefundMutation,
} = adminOrdersApi;
