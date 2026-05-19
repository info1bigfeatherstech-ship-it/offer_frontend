import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../SERVICES/axiosInstance";
import {
  AUTH_CONTEXT_USER,
  USER_ACCESS_TOKEN_KEY,
  clearAccessTokenSchedule,
  notifyAccessTokenStored,
} from "../../../SERVICES/axiosInstance";

/**
 * Choose phone or email for POST /auth/otp-verify-login `identifier`
 * so the correct verification flag is set (matches OTP_DELIVERY_MODE / deliveredVia).
 */
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

// ─────────────────────────────────────────────────────────────
// THUNKS
// ─────────────────────────────────────────────────────────────

// ✅ REGISTER
// Backend: name, email, phone (10-digit), password — OTP channel from OTP_DELIVERY_MODE
// Response: { success, message, phone, email, deliveryMode, deliveredVia, requiresOTPVerification }
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
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Registration failed" }
      );
    }
  }
);

// ✅ VERIFY OTP & AUTO-LOGIN
// Backend: POST /auth/otp-verify-login — prefers { identifier, otp } (phone or email)
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
      return res.data; // { success, accessToken, user }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "OTP verification failed" }
      );
    }
  }
);

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

// ✅ FORGOT PASSWORD — STEP 1: Request OTP
// New endpoint: POST /auth/forgot-password/request-otp
// Sends: { identifier } — accepts email OR phone
// Response: { success, message, identifierType: 'email'|'phone' }
export const forgotPasswordRequestOTP = createAsyncThunk(
  "auth/forgotPasswordRequestOTP",
  async ({ identifier }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password/request-otp", {
        identifier,
      });
      return { ...res.data, identifier }; // pass identifier forward for next steps
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to send OTP" }
      );
    }
  }
);

// ✅ FORGOT PASSWORD — STEP 2: Verify OTP
// New endpoint: POST /auth/forgot-password/verify-otp
// Sends: { identifier, otp }
// Response: { success, message }
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

// ✅ FORGOT PASSWORD — STEP 3: Reset Password
// New endpoint: POST /auth/forgot-password/reset
// Sends: { identifier, otp, newPassword }
// Response: { success, message }
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
  /** Phone or email string used for registration OTP verify step */
  pendingOtpIdentifier: null,
  // Keep identifier for forgot password flow across 3 steps
  forgotPasswordIdentifier: null,
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
    clearPendingOtpIdentifier: (state) => {
      state.pendingOtpIdentifier = null;
    },
    clearForgotPasswordState: (state) => {
      state.forgotPasswordIdentifier = null;
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
      state.pendingOtpIdentifier = null;
      state.forgotPasswordIdentifier = null;
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
        state.successMessage = action.payload.message;
        state.pendingOtpIdentifier = pickRegisterOtpIdentifier(
          action.payload,
          action.meta.arg
        );
      })
      .addCase(registerUser.rejected, setRejected)

      // ── VERIFY OTP ──────────────────────────────────────────
      .addCase(verifyOTP.pending, setPending)
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.pendingOtpIdentifier = null;
        state.successMessage = "Account verified! Welcome!";
      })
      .addCase(verifyOTP.rejected, setRejected)

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
        state.pendingOtpIdentifier = null;
        state.forgotPasswordIdentifier = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Still clear state even if API call fails
        state.user = null;
        state.accessToken = null;
        state.isLoggedIn = false;
        state.loading = false;
      })

      // ── FORGOT PASSWORD: REQUEST OTP ──────────────────────
      .addCase(forgotPasswordRequestOTP.pending, setPending)
      .addCase(forgotPasswordRequestOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        // Store identifier for use in steps 2 and 3
        state.forgotPasswordIdentifier = action.payload.identifier;
      })
      .addCase(forgotPasswordRequestOTP.rejected, setRejected)

      // ── FORGOT PASSWORD: VERIFY OTP ───────────────────────
      .addCase(forgotPasswordVerifyOTP.pending, setPending)
      .addCase(forgotPasswordVerifyOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
      })
      .addCase(forgotPasswordVerifyOTP.rejected, setRejected)

      // ── FORGOT PASSWORD: RESET PASSWORD ───────────────────
      .addCase(forgotPasswordReset.pending, setPending)
      .addCase(forgotPasswordReset.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.forgotPasswordIdentifier = null;
      })
      .addCase(forgotPasswordReset.rejected, setRejected)

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
  clearPendingOtpIdentifier,
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
export const selectPendingOtpIdentifier = (state) => state.auth.pendingOtpIdentifier;
/** @deprecated use selectPendingOtpIdentifier */
export const selectPendingPhone = selectPendingOtpIdentifier;
export const selectForgotPasswordIdentifier = (state) => state.auth.forgotPasswordIdentifier;
export default authSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axiosInstance from "../../../SERVICES/axiosInstance";

// // ─────────────────────────────────────────────────────────────
// // THUNKS
// // ─────────────────────────────────────────────────────────────

// // ✅ REGISTER — sends OTP to email
// export const registerUser = createAsyncThunk(
//   "auth/register",
//   async ({ name, email, password, phone }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/register", {
//         name,
//         email,
//         password,
//         phone,
//       });
//       return res.data; // { success, message: "Verification OTP sent to email" }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Registration failed" }
//       );
//     }
//   }
// );

// // ✅ VERIFY OTP — after register, logs user in
// export const verifyOTP = createAsyncThunk(
//   "auth/verifyOTP",
//   async ({ email, otp }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/otp-verify-login", {
//         email,
//         otp,
//       });
//       // Save access token to localStorage for persistence
//       if (res.data.accessToken) {
//         localStorage.setItem("accessToken", res.data.accessToken);
//       }
//       return res.data; // { success, accessToken, user }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "OTP verification failed" }
//       );
//     }
//   }
// );

// // ✅ LOGIN
// export const loginUser = createAsyncThunk(
//   "auth/login",
//   async ({ email, password }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/login", { email, password });
//       if (res.data.accessToken) {
//         localStorage.setItem("accessToken", res.data.accessToken);
//       }
//       return res.data; // { success, accessToken, user }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Login failed" }
//       );
//     }
//   }
// );

// // ✅ GOOGLE LOGIN
// export const googleLogin = createAsyncThunk(
//   "auth/googleLogin",
//   async ({ idToken }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/google", { idToken });
//       if (res.data.accessToken) {
//         localStorage.setItem("accessToken", res.data.accessToken);
//       }
//       return res.data; // { success, accessToken, user }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Google login failed" }
//       );
//     }
//   }
// );

// // ✅ LOGOUT
// export const logoutUser = createAsyncThunk(
//   "auth/logout",
//   async (_, { rejectWithValue }) => {
//     try {
//       await axiosInstance.post("/auth/logout");
//       localStorage.removeItem("accessToken");
//       return true;
//     } catch (err) {
//       // Even if API fails, clear local state
//       localStorage.removeItem("accessToken");
//       return rejectWithValue(
//         err.response?.data || { message: "Logout failed" }
//       );
//     }
//   }
// );

// // ✅ FORGOT PASSWORD — sends OTP
// export const forgotPassword = createAsyncThunk(
//   "auth/forgotPassword",
//   async ({ email }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/forgot-password", { email });
//       return res.data; // { success, message }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Failed to send OTP" }
//       );
//     }
//   }
// );

// // ✅ RESET PASSWORD — with OTP
// export const resetPassword = createAsyncThunk(
//   "auth/reset-password",
//   async ({ email, otp, newPassword }, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/reset-password", {
//         email,
//         otp,
//         newPassword,
//       });
//       return res.data; // { success, message }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Password reset failed" }
//       );
//     }
//   }
// );

// // ✅ FETCH ME — get current user profile (protected)
// export const fetchMe = createAsyncThunk(
//   "auth/me",
//   async (_, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.get("/auth/me");
//       return res.data; // { success, user }
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data || { message: "Failed to fetch profile" }
//       );
//     }
//   }
// );

// // ✅ REFRESH TOKEN — get new access token using httpOnly cookie
// export const refreshToken = createAsyncThunk(
//   "auth/refresh",
//   async (_, { rejectWithValue }) => {
//     try {
//       const res = await axiosInstance.post("/auth/refresh");
//       if (res.data.accessToken) {
//         localStorage.setItem("accessToken", res.data.accessToken);
//       }
//       return res.data; // { success, accessToken }
//     } catch (err) {
//       localStorage.removeItem("accessToken");
//       return rejectWithValue(
//         err.response?.data || { message: "Session expired. Please login again." }
//       );
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // INITIAL STATE
// // ─────────────────────────────────────────────────────────────

// const initialState = {
//   user: null,
//   accessToken: localStorage.getItem("accessToken") || null,
//   isLoggedIn: !!localStorage.getItem("accessToken"),
//   loading: false,
//   error: null,
//   successMessage: null,
//   pendingEmail: null, // holds email during register → OTP step
// };

// // ─────────────────────────────────────────────────────────────
// // SLICE
// // ─────────────────────────────────────────────────────────────

// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: {
//     clearError: (state) => {
//       state.error = null;
//     },
//     clearSuccess: (state) => {
//       state.successMessage = null;
//     },
//     clearPendingEmail: (state) => {
//       state.pendingEmail = null;
//     },
//     // Force logout (called by axiosInstance on refresh failure)
//     forceLogout: (state) => {
//       state.user = null;
//       state.accessToken = null;
//       state.isLoggedIn = false;
//       state.error = null;
//       state.successMessage = null;
//       state.pendingEmail = null;
//       localStorage.removeItem("accessToken");
//     },
//   },
//   extraReducers: (builder) => {
//     // ── Reusable helpers ──────────────────────────────────────
//     const setPending = (state) => {
//       state.loading = true;
//       state.error = null;
//       state.successMessage = null;
//     };
//     const setRejected = (state, action) => {
//       state.loading = false;
//       state.error = action.payload?.message || "Something went wrong";
//     };

//     builder
//       // ── REGISTER ──────────────────────────────────────────
//       .addCase(registerUser.pending, setPending)
//       .addCase(registerUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.successMessage = action.payload.message;
//         state.pendingEmail = action.meta.arg.email; // save for OTP step
//       })
//       .addCase(registerUser.rejected, setRejected)

//       // ── VERIFY OTP ────────────────────────────────────────
//       .addCase(verifyOTP.pending, setPending)
//       .addCase(verifyOTP.fulfilled, (state, action) => {
//         state.loading = false;
//         state.isLoggedIn = true;
//         state.accessToken = action.payload.accessToken;
//         state.user = action.payload.user;
//         state.pendingEmail = null;
//         state.successMessage = "Email verified! Welcome!";
//       })
//       .addCase(verifyOTP.rejected, setRejected)

//       // ── LOGIN ─────────────────────────────────────────────
//       .addCase(loginUser.pending, setPending)
//       .addCase(loginUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.isLoggedIn = true;
//         state.accessToken = action.payload.accessToken;
//         state.user = action.payload.user;
//         state.successMessage = "Login successful!";
//       })
//       .addCase(loginUser.rejected, setRejected)

//       // ── GOOGLE LOGIN ──────────────────────────────────────
//       .addCase(googleLogin.pending, setPending)
//       .addCase(googleLogin.fulfilled, (state, action) => {
//         state.loading = false;
//         state.isLoggedIn = true;
//         state.accessToken = action.payload.accessToken;
//         state.user = action.payload.user;
//         state.successMessage = "Google login successful!";
//       })
//       .addCase(googleLogin.rejected, setRejected)

//       // ── LOGOUT ────────────────────────────────────────────
//       .addCase(logoutUser.pending, (state) => {
//         state.loading = true;
//       })
//       .addCase(logoutUser.fulfilled, (state) => {
//         state.user = null;
//         state.accessToken = null;
//         state.isLoggedIn = false;
//         state.loading = false;
//         state.error = null;
//         state.successMessage = null;
//         state.pendingEmail = null;
//       })
//       .addCase(logoutUser.rejected, (state) => {
//         // Still clear state even if API call fails
//         state.user = null;
//         state.accessToken = null;
//         state.isLoggedIn = false;
//         state.loading = false;
//       })

//       // ── FORGOT PASSWORD ───────────────────────────────────
//       .addCase(forgotPassword.pending, setPending)
//       .addCase(forgotPassword.fulfilled, (state, action) => {
//         state.loading = false;
//         state.successMessage = action.payload.message;
//         state.pendingEmail = action.meta.arg.email;
//       })
//       .addCase(forgotPassword.rejected, setRejected)

//       // ── RESET PASSWORD ────────────────────────────────────
//       .addCase(resetPassword.pending, setPending)
//       .addCase(resetPassword.fulfilled, (state, action) => {
//         state.loading = false;
//         state.successMessage = action.payload.message;
//         state.pendingEmail = null;
//       })
//       .addCase(resetPassword.rejected, setRejected)

//       // ── FETCH ME ──────────────────────────────────────────
//       .addCase(fetchMe.pending, setPending)
//       .addCase(fetchMe.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.isLoggedIn = true;
//       })
//       .addCase(fetchMe.rejected, (state) => {
//         // Don't show error for silent me fetch
//         state.loading = false;
//       })

//       // ── REFRESH TOKEN ─────────────────────────────────────
//       .addCase(refreshToken.fulfilled, (state, action) => {
//         state.accessToken = action.payload.accessToken;
//         state.isLoggedIn = true;
//       })
//       .addCase(refreshToken.rejected, (state) => {
//         state.user = null;
//         state.accessToken = null;
//         state.isLoggedIn = false;
//       });
//   },
// });

// export const { clearError, clearSuccess, clearPendingEmail, forceLogout } =
//   authSlice.actions;

// export default authSlice.reducer;