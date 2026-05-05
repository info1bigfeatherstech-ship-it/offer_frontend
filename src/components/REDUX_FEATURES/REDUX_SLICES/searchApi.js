import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: fetchBaseQuery({
    // baseUrl: import.meta.env.VITE_API_URL || 'https://offerwalebaba.onrender.com/api',
    baseUrl: import.meta.env.VITE_API_URL || "https://offerwalebaba.onrender.com/api",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Search'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    // Regular query hook
    searchProducts: builder.query({
      query: ({ q, page = 1, limit = 20 }) => ({
        url: '/products/search',
        params: { q, page, limit },
        method: 'GET',
      }),
      transformResponse: (response) => {
        if (!response.success) throw new Error(response.message);
        return {
          products: response.products || [],
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || 20,
          hasMore: (response.page * response.limit) < response.total,
        };
      },
    }),
  }),
});

// Export hooks correctly
export const { useSearchProductsQuery, useLazySearchProductsQuery } = searchApi;