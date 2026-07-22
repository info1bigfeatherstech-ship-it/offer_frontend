import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";
import {
  AUTH_CONTEXT_USER,
  USER_ACCESS_TOKEN_KEY,
  clearAccessTokenSchedule,
  notifyAccessTokenStored,
} from "../../../SERVICES/axiosInstance";

/*
Legacy register-OTP helper intentionally preserved for rollback reference.
The new register flow logs the user in immediately, so no pending OTP identifier
is stored in Redux anymore.

export const pickRegisterOtpIdentifier = (payload = {}, metaArg = {}) => {
  const mode = String(payload.deliveryMode || "").toLowerCase();
  const via = Array.isArray(payload.deliveredVia) ? payload.deliveredVia : [];
  if (mode === "email" || (via.length === 1 && via[0] === "email")) {
    return String(payload.email || metaArg.email || "").trim();
  }
  if (mode === "sms" || (via.length === 1 && via[0] === "sms")) {
    return String(payload.phone || metaArg.phone || "").trim();
  }
  if (via.includes("email")) return String(payload.email || metaArg.email || "").trim();
  return String(payload.phone || metaArg.phone || "").trim();
};
*/

// ─────────────────────────────────────────────────────────────
// THUNKS
// ─────────────────────────────────────────────────────────────

// ✅ REGISTER
// Backend: name, email(optional), phone (10-digit), password
// Response: { success, message, accessToken, user }
export const registerUser = createAsyncThunk(
  "auth/register",
  async ({ name, email, password, phone }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/register", {
        name,
        email,
        password,
        phone,
      });
      if (res.data.accessToken) {
        localStorage.setItem(USER_ACCESS_TOKEN_KEY, res.data.accessToken);
        notifyAccessTokenStored(AUTH_CONTEXT_USER);
      }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Registration failed" }
      );
    }
  }
);

/*
Legacy OTP verification thunk preserved for rollback reference after
registration-OTP removal.

export const verifyOTP = createAsyncThunk(
  "auth/verifyOTP",
  async ({ identifier, otp }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/otp-verify-login", {
        identifier,
        otp,
      });
      if (res.data.accessToken) {
        localStorage.setItem(USER_ACCESS_TOKEN_KEY, res.data.accessToken);
        notifyAccessTokenStored(AUTH_CONTEXT_USER);
      }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "OTP verification failed" }
      );
    }
  }
);
*/

// ✅ LOGIN
// Backend now expects field named "identifier" (not "email")
// Accepts email OR phone number as identifier
// Endpoint: POST /auth/login
export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ identifier, password }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/login", {
        identifier,
        password,
        portal: "ecomm",
      });
      if (res.data.accessToken) {
        localStorage.setItem(USER_ACCESS_TOKEN_KEY, res.data.accessToken);
        notifyAccessTokenStored(AUTH_CONTEXT_USER);
      }
      return res.data; // { success, accessToken, user }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Login failed" }
      );
    }
  }
);

// ✅ GOOGLE LOGIN — unchanged
export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async ({ idToken }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/google", { idToken });
      if (res.data.accessToken) {
        localStorage.setItem(USER_ACCESS_TOKEN_KEY, res.data.accessToken);
        notifyAccessTokenStored(AUTH_CONTEXT_USER);
      }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Google login failed" }
      );
    }
  }
);

// ✅ LOGOUT — unchanged
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post("/auth/logout", { portal: "ecomm" });
      localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
      clearAccessTokenSchedule(AUTH_CONTEXT_USER);
      return true;
    } catch (err) {
      localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
      clearAccessTokenSchedule(AUTH_CONTEXT_USER);
      return rejectWithValue(
        err.response?.data || { message: "Logout failed" }
      );
    }
  }
);

/*
Legacy OTP forgot-password thunks preserved for rollback reference.
Ecomm now uses Option D: find-user + reset-direct.

export const forgotPasswordRequestOTP = createAsyncThunk(
  "auth/forgotPasswordRequestOTP",
  async ({ identifier }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/request-otp", {
        identifier,
      });
      return { ...res.data, identifier };
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to send OTP" }
      );
    }
  }
);

export const forgotPasswordVerifyOTP = createAsyncThunk(
  "auth/forgotPasswordVerifyOTP",
  async ({ identifier, otp }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/verify-otp", {
        identifier,
        otp,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "OTP verification failed" }
      );
    }
  }
);

export const forgotPasswordReset = createAsyncThunk(
  "auth/forgotPasswordReset",
  async ({ identifier, otp, newPassword }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/reset", {
        identifier,
        otp,
        newPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Password reset failed" }
      );
    }
  }
);
*/

// ✅ FORGOT PASSWORD — STEP 1: Find user by phone (Option D)
// Endpoint: POST /auth/forgot-password/find-user
// Response: { success, message, resetToken?, phone? }
export const forgotPasswordFindUser = createAsyncThunk(
  "auth/forgotPasswordFindUser",
  async ({ phone }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/find-user", {
        phone,
      });
      return { ...res.data, phone };
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to start password reset" }
      );
    }
  }
);

// ✅ FORGOT PASSWORD — STEP 2: Reset password with short-lived token
// Endpoint: POST /auth/forgot-password/reset-direct
export const forgotPasswordResetDirect = createAsyncThunk(
  "auth/forgotPasswordResetDirect",
  async ({ resetToken, newPassword, confirmPassword }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/reset-direct", {
        resetToken,
        newPassword,
        confirmPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Password reset failed" }
      );
    }
  }
);

// ✅ FETCH ME — unchanged
export const fetchMe = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/auth/me");
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch profile" }
      );
    }
  }
);

// ✅ REFRESH TOKEN — unchanged
export const refreshToken = createAsyncThunk(
  "auth/refresh",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/refresh", { portal: "ecomm" });
      if (res.data.accessToken) {
        localStorage.setItem(USER_ACCESS_TOKEN_KEY, res.data.accessToken);
        notifyAccessTokenStored(AUTH_CONTEXT_USER);
      }
      return res.data;
    } catch (err) {
      localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
      clearAccessTokenSchedule(AUTH_CONTEXT_USER);
      return rejectWithValue(
        err.response?.data || { message: "Session expired. Please login again." }
      );
    }
  }
);

// ✅ CHANGE PASSWORD — unchanged
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put("/auth/change-password", {
        oldPassword,
        newPassword,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Password change failed" }
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  accessToken: localStorage.getItem(USER_ACCESS_TOKEN_KEY) || null,
  isLoggedIn: !!localStorage.getItem(USER_ACCESS_TOKEN_KEY),
  loading: false,
  error: null,
  successMessage: null,
  // Option D forgot-password: short-lived reset token + phone for auto-login
  resetToken: null,
  forgotPasswordPhone: null,
};

// ─────────────────────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.successMessage = null;
    },
    clearForgotPasswordState: (state) => {
      state.resetToken = null;
      state.forgotPasswordPhone = null;
      state.error = null;
      state.successMessage = null;
    },
    // Force logout — called by axiosInstance on refresh failure
    forceLogout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isLoggedIn = false;
      state.error = null;
      state.successMessage = null;
      state.resetToken = null;
      state.forgotPasswordPhone = null;
      localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
    },
  },
  extraReducers: (builder) => {
    // ── Reusable helpers ──────────────────────────────────────
    const setPending = (state) => {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    };
    const setRejected = (state, action) => {
      state.loading = false;
      const code = action.payload?.code;
      if (code === "PORTAL_ACCESS_DENIED") {
        state.error = "This account is not allowed on this app. Please use the correct login portal.";
        return;
      }
      if (code === "PORTAL_REQUIRED_FOR_PRIVILEGED_ACCOUNT") {
        state.error = "Admin or staff accounts must login from the admin portal.";
        return;
      }
      if (code === "INVALID_PORTAL") {
        state.error = "Login configuration is invalid. Please refresh and try again.";
        return;
      }
      state.error = action.payload?.message || "Something went wrong";
    };

    builder
      // ── REGISTER ──────────────────────────────────────────
      .addCase(registerUser.pending, setPending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.successMessage = action.payload.message || "Registration successful!";
      })
      .addCase(registerUser.rejected, setRejected)

      // ── LOGIN ─────────────────────────────────────────────
      .addCase(loginUser.pending, setPending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.successMessage = "Login successful!";
      })
      .addCase(loginUser.rejected, setRejected)

      // ── GOOGLE LOGIN ──────────────────────────────────────
      .addCase(googleLogin.pending, setPending)
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.successMessage = "Google login successful!";
      })
      .addCase(googleLogin.rejected, setRejected)

      // ── LOGOUT ────────────────────────────────────────────
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isLoggedIn = false;
        state.loading = false;
        state.error = null;
        state.successMessage = null;
        state.resetToken = null;
        state.forgotPasswordPhone = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Still clear state even if API call fails
        state.user = null;
        state.accessToken = null;
        state.isLoggedIn = false;
        state.loading = false;
      })

      // ── FORGOT PASSWORD: FIND USER (Option D) ──────────────
      .addCase(forgotPasswordFindUser.pending, setPending)
      .addCase(forgotPasswordFindUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.resetToken = action.payload.resetToken || null;
        state.forgotPasswordPhone =
          action.payload.phone || action.meta?.arg?.phone || null;
      })
      .addCase(forgotPasswordFindUser.rejected, setRejected)

      // ── FORGOT PASSWORD: RESET DIRECT (Option D) ───────────
      .addCase(forgotPasswordResetDirect.pending, setPending)
      .addCase(forgotPasswordResetDirect.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.resetToken = null;
      })
      .addCase(forgotPasswordResetDirect.rejected, setRejected)

      // ── FETCH ME ──────────────────────────────────────────
      .addCase(fetchMe.pending, setPending)
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isLoggedIn = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
      })

      // ── CHANGE PASSWORD ───────────────────────────────────
      .addCase(changePassword.pending, setPending)
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
      })
      .addCase(changePassword.rejected, setRejected)

      // ── REFRESH TOKEN ─────────────────────────────────────
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isLoggedIn = true;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isLoggedIn = false;
      });
  },
});

export const {
  clearError,
  clearSuccess,
  clearForgotPasswordState,
  forceLogout,
} = authSlice.actions;



// ─────────────────────────────────────────────────────────────
// SELECTORS (ADD THIS)
// ─────────────────────────────────────────────────────────────

export const selectUser = (state) => state.auth.user;
export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectSuccessMessage = (state) => state.auth.successMessage;
export const selectResetToken = (state) => state.auth.resetToken;
export const selectForgotPasswordPhone = (state) => state.auth.forgotPasswordPhone;
export default authSlice.reducer;
