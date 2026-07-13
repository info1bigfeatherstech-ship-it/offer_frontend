import { createApi } from '@reduxjs/toolkit/query/react';
import axiosInstance, { AUTH_CONTEXT_ADMIN } from '../../../SERVICES/axiosInstance';

const axiosBaseQuery =
  ({ baseUrl } = { baseUrl: '' }) =>
  async ({ url, method, data, params }) => {
    try {
      const result = await axiosInstance({
        url: baseUrl + url,
        method,
        data,
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

export const outOfStockInquiryApi = createApi({
  reducerPath: 'outOfStockInquiryApi',
  baseQuery: axiosBaseQuery({ baseUrl: '' }),
  tagTypes: ['OosInquiries'],
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    getOutOfStockInquiries: builder.query({
      query: ({ page = 1, limit = 20, search = '', status = 'all', days = 30 } = {}) => ({
        url: '/admin/oos-inquiries',
        method: 'GET',
        params: {
          page,
          limit,
          search: search || undefined,
          status: status && status !== 'all' ? status : undefined,
          days,
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((row) => ({ type: 'OosInquiries', id: row.id })),
              { type: 'OosInquiries', id: 'LIST' },
            ]
          : [{ type: 'OosInquiries', id: 'LIST' }],
    }),

    updateOutOfStockInquiryStatus: builder.mutation({
      query: ({ id, status, adminNote }) => ({
        url: `/admin/oos-inquiries/${id}/status`,
        method: 'PATCH',
        data: { status, adminNote },
      }),
      invalidatesTags: (result, error, arg) =>
        error
          ? []
          : [
              { type: 'OosInquiries', id: 'LIST' },
              ...(arg?.id ? [{ type: 'OosInquiries', id: arg.id }] : []),
            ],
    }),
  }),
});

export const {
  useGetOutOfStockInquiriesQuery,
  useUpdateOutOfStockInquiryStatusMutation,
} = outOfStockInquiryApi;
