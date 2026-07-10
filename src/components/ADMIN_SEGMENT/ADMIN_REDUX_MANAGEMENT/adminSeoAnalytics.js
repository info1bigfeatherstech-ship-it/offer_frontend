// adminSeoAnalytics.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { createSlice } from '@reduxjs/toolkit';
import axiosInstance, { AUTH_CONTEXT_ADMIN } from '../../../SERVICES/axiosInstance';

// ==================== RTK QUERY SETUP ====================

const axiosBaseQuery = ({ baseUrl } = { baseUrl: '' }) => 
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await axiosInstance({
        url: baseUrl + url,
        method,
        data,
        params,
        headers: { ...headers },
        authContext: AUTH_CONTEXT_ADMIN,
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError;
      console.error('[RTK Query Error]', {
        url,
        method,
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
        timestamp: new Date().toISOString(),
      });
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
        },
      };
    }
  };

// Create SEO Analytics API
export const seoAnalyticsApi = createApi({
  reducerPath: 'seoAnalyticsApi',
  baseQuery: axiosBaseQuery({ baseUrl: '' }),
  tagTypes: ['SeoOverview', 'SeoTraffic', 'SeoDevices', 'SeoSources', 'SeoLocations'],
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({

    // Get overview metrics
    getSeoOverview: builder.query({
      query: () => ({
        url: '/admin/seo-analytics/overview',
        method: 'GET',
      }),
      providesTags: ['SeoOverview'],
    }),

    // Get traffic data (date-wise)
    getSeoTraffic: builder.query({
      query: (range = '7d') => ({
        url: '/admin/seo-analytics/traffic',
        method: 'GET',
        params: { range },
      }),
      providesTags: ['SeoTraffic'],
    }),

    // Get device distribution
    getSeoDevices: builder.query({
      query: () => ({
        url: '/admin/seo-analytics/devices',
        method: 'GET',
      }),
      providesTags: ['SeoDevices'],
    }),

    // Get traffic sources
    getSeoSources: builder.query({
      query: () => ({
        url: '/admin/seo-analytics/sources',
        method: 'GET',
      }),
      providesTags: ['SeoSources'],
    }),

    // Get location data (top cities)
    getSeoLocations: builder.query({
      query: () => ({
        url: '/admin/seo-analytics/locations',
        method: 'GET',
      }),
      providesTags: ['SeoLocations'],
    }),
  }),
});

// ==================== UI SLICE FOR LOCAL STATE ====================

const initialState = {
  dateRange: '7d', // '7d', '30d', '90d'
  isLocationsDrawerOpen: false,
  chartMetric: 'activeUsers', // 'activeUsers', 'sessions', 'newUsers'
};

const seoUiSlice = createSlice({
  name: 'seoUi',
  initialState,
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    toggleLocationsDrawer: (state, action) => {
      state.isLocationsDrawerOpen = action.payload !== undefined ? action.payload : !state.isLocationsDrawerOpen;
    },
    setChartMetric: (state, action) => {
      state.chartMetric = action.payload;
    },
    resetSeoUi: () => initialState,
  },
});

// ==================== EXPORTS ====================

// Export API hooks
export const {
  useGetSeoOverviewQuery,
  useGetSeoTrafficQuery,
  useGetSeoDevicesQuery,
  useGetSeoSourcesQuery,
  useGetSeoLocationsQuery,
} = seoAnalyticsApi;

// Export UI actions & reducer
export const { setDateRange, toggleLocationsDrawer, setChartMetric, resetSeoUi } = seoUiSlice.actions;
export const seoUiReducer = seoUiSlice.reducer;

// Helper: Convert range display name to API param
export const getRangeParam = (displayRange) => {
  const rangeMap = {
    'Days': '7d',
    'Weeks': '30d', 
    'Months': '90d',
  };
  return rangeMap[displayRange] || '7d';
};

// Helper: Convert API param to display name
export const getDisplayRange = (rangeParam) => {
  const displayMap = {
    '7d': 'Days',
    '30d': 'Weeks',
    '90d': 'Months',
  };
  return displayMap[rangeParam] || 'Days';
};

// Helper: Format date for display (YYYYMMDD -> DD MMM)
export const formatChartDate = (dateStr) => {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`;
};

// Helper: Format number with commas
export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
};

// Helper: Format session duration (seconds to mm:ss)
export const formatDuration = (seconds) => {
  if (!seconds) return '0m 0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

// Helper: Format bounce rate (decimal to percentage)
export const formatBounceRate = (rate) => {
  if (!rate) return '0%';
  return `${rate.toFixed(1)}%`;
};