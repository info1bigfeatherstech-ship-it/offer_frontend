/**
 * adminSelfPasswordSlice.js
 * Admin Profile → self password reset via email OTP (storefront-scoped by axios x-storefront).
 * Decoupled from staffPasswordSlice (staff reset stays unchanged).
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance, { AUTH_CONTEXT_ADMIN } from "../../../SERVICES/axiosInstance";

const BASE = "/admin/staff/profile/me";

export const initiateAdminSelfPasswordReset = createAsyncThunk(
  "adminSelfPassword/initiate",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        `${BASE}/initiate-password-reset`,
        {},
        { authContext: AUTH_CONTEXT_ADMIN, timeout: 45000 }
      );
      return {
        message: data.message,
        maskedEmail: data?.data?.maskedEmail || null,
        expiresInSeconds: data?.data?.expiresInSeconds || 600,
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED"
            ? "Request timed out. Please try again."
            : "Failed to send OTP")
      );
    }
  }
);

export const verifyAdminSelfPasswordReset = createAsyncThunk(
  "adminSelfPassword/verify",
  async ({ otp, newPassword, confirmPassword }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        `${BASE}/verify-password-reset`,
        {
          otp,
          newPassword,
          confirmPassword,
        },
        { authContext: AUTH_CONTEXT_ADMIN, timeout: 20000 }
      );
      return data.message || "Password updated successfully";
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          (err.code === "ECONNABORTED"
            ? "Request timed out. If you changed the password, try logging in with the new one."
            : "Failed to reset password")
      );
    }
  }
);

const adminSelfPasswordSlice = createSlice({
  name: "adminSelfPassword",
  initialState: {
    otpSent: false,
    resetSuccess: false,
    maskedEmail: null,
    loading: {
      initiate: false,
      verify: false,
    },
    error: null,
    successMessage: null,
  },
  reducers: {
    clearAdminSelfPasswordState(state) {
      state.otpSent = false;
      state.resetSuccess = false;
      state.maskedEmail = null;
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiateAdminSelfPasswordReset.pending, (state) => {
        state.loading.initiate = true;
        state.error = null;
        state.otpSent = false;
        state.resetSuccess = false;
      })
      .addCase(initiateAdminSelfPasswordReset.fulfilled, (state, { payload }) => {
        state.loading.initiate = false;
        state.otpSent = true;
        state.maskedEmail = payload.maskedEmail;
        state.successMessage = payload.message;
      })
      .addCase(initiateAdminSelfPasswordReset.rejected, (state, { payload }) => {
        state.loading.initiate = false;
        state.error = payload;
      });

    builder
      .addCase(verifyAdminSelfPasswordReset.pending, (state) => {
        state.loading.verify = true;
        state.error = null;
        state.resetSuccess = false;
      })
      .addCase(verifyAdminSelfPasswordReset.fulfilled, (state, { payload }) => {
        state.loading.verify = false;
        state.resetSuccess = true;
        state.otpSent = false;
        state.successMessage = payload;
      })
      .addCase(verifyAdminSelfPasswordReset.rejected, (state, { payload }) => {
        state.loading.verify = false;
        state.error = payload;
      });
  },
});

export const { clearAdminSelfPasswordState } = adminSelfPasswordSlice.actions;
export default adminSelfPasswordSlice.reducer;
