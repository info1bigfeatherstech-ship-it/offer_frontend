import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { USER_ACCESS_TOKEN_KEY } from '../../../SERVICES/axiosInstance';

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_BACKEND_BASE_URL || 'https://api.offerwalebaba.com/api',
    prepareHeaders: (headers, { getState }) => {
      const token =
        getState()?.auth?.accessToken ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem(USER_ACCESS_TOKEN_KEY) : null);
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('Accept', 'application/json');
      return headers;
    }
  }),
  tagTypes: ['NotificationCount', 'Notifications'],
  endpoints: (builder) => ({
    getUnreadNotificationCount: builder.query({
      query: () => '/notifications/unread-count',
      transformResponse: (response) => {
        if (!response?.success) throw new Error(response?.message || 'Failed to load count');
        return Number(response.data?.count) || 0;
      },
      providesTags: ['NotificationCount']
    }),
    getNotifications: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/notifications',
        params: { page, limit }
      }),
      transformResponse: (response) => {
        if (!response?.success) throw new Error(response?.message || 'Failed to load notifications');
        return response.data;
      },
      providesTags: ['Notifications']
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['NotificationCount', 'Notifications']
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH'
      }),
      invalidatesTags: ['NotificationCount', 'Notifications']
    })
  })
});

export const {
  useGetUnreadNotificationCountQuery,
  useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation
} = notificationsApi;
