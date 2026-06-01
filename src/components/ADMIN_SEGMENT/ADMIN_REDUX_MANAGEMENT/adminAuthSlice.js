import { createSlice } from "@reduxjs/toolkit";
import { adminAuthApi } from "./adminAuthApi";
import { ROLES } from "../roles";
import {
  ADMIN_ACCESS_TOKEN_KEY,
  AUTH_CONTEXT_ADMIN,
  clearAccessTokenSchedule,
} from "../../../SERVICES/axiosInstance";

const VALID_ROLES = Object.values(ROLES);

const decodeJWT = (token) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

// ── THE FIX: three distinct starting states ───────────────────────────────
// "authenticated"   → valid admin token in localStorage, server will confirm
// "idle"            → token exists but can't decode yet, need /auth/me
// "unauthenticated" → NO token at all, show login form immediately, no spinner
const deriveInitialState = () => {
  const token = localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);

  // No token at all → unauthenticated immediately, never idle
  if (!token) {
    return { user: null, status: "unauthenticated" };
  }

  const payload = decodeJWT(token);

  // Token exists and is valid admin role → start authenticated, server confirms
  if (payload && VALID_ROLES.includes(payload.role)) {
    return { user: { role: payload.role, ...payload }, status: "authenticated" };
  }

  // Customer / wrong-role token in admin storage — clear immediately (do not call /auth/me).
  if (payload && !VALID_ROLES.includes(payload.role)) {
    localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    return { user: null, status: "unauthenticated" };
  }

  // Expired/malformed → idle; axios refresh may recover a valid admin session
  return { user: null, status: "idle" };
};

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState: deriveInitialState(),

  reducers: {
    adminForceLogout: (state) => {
      state.user = null;
      state.status = "unauthenticated";
      localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
      clearAccessTokenSchedule(AUTH_CONTEXT_ADMIN);
    },
  },

  extraReducers: (builder) => {
    // ── adminLogin ────────────────────────────────────────────────────────
    builder
      .addMatcher(
        adminAuthApi.endpoints.adminLogin.matchPending,
        (state) => { state.status = "loading"; }
      )
      .addMatcher(
        adminAuthApi.endpoints.adminLogin.matchFulfilled,
        (state, { payload }) => {
          if (payload && VALID_ROLES.includes(payload.role)) {
            state.user = payload;
            state.status = "authenticated";
          } else {
            state.user = null;
            state.status = "unauthenticated";
          }
        }
      )
      .addMatcher(
        adminAuthApi.endpoints.adminLogin.matchRejected,
        (state) => {
          state.user = null;
          state.status = "unauthenticated";
        }
      );

    // ── getAdminMe ────────────────────────────────────────────────────────
    builder
      .addMatcher(
        adminAuthApi.endpoints.getAdminMe.matchPending,
        (state) => {
          // Only move to loading from idle — never interrupt authenticated
          if (state.status === "idle") state.status = "loading";
        }
      )
      .addMatcher(
        adminAuthApi.endpoints.getAdminMe.matchFulfilled,
        (state, { payload }) => {
          if (payload && VALID_ROLES.includes(payload.role)) {
            state.user = payload;
            state.status = "authenticated";
          } else {
            state.user = null;
            state.status = "unauthenticated";
            localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
          }
        }
      )
      .addMatcher(
        adminAuthApi.endpoints.getAdminMe.matchRejected,
        (state, action) => {
          const status = action.payload?.status;
          const message = String(action.error?.message || action.payload?.data?.message || '');
          const isRoleMismatch =
            message.includes('insufficient_role') ||
            action.payload?.data?.code === 'PORTAL_ACCESS_DENIED';
          // Keep session on transient/network errors only.
          if (status && status !== 401 && status !== 403 && !isRoleMismatch) {
            return;
          }
          state.user = null;
          state.status = "unauthenticated";
          localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
          clearAccessTokenSchedule(AUTH_CONTEXT_ADMIN);
        }
      );

    // ── adminLogout ───────────────────────────────────────────────────────
    builder
      .addMatcher(
        adminAuthApi.endpoints.adminLogout.matchFulfilled,
        (state) => {
          state.user = null;
          state.status = "unauthenticated";
        }
      )
      .addMatcher(
        adminAuthApi.endpoints.adminLogout.matchRejected,
        (state) => {
          state.user = null;
          state.status = "unauthenticated";
          localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
        }
      );
  },
});

export const { adminForceLogout } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;

export const selectAdminUser   = (state) => state.adminAuth.user;
export const selectAdminStatus = (state) => state.adminAuth.status;
export const selectIsAdminAuth = (state) => state.adminAuth.status === "authenticated";


