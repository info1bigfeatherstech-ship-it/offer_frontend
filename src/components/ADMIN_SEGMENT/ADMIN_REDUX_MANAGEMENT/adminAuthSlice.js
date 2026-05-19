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
// // components/ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthSlice.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Single source of truth for admin authentication state.
// //
// // STATUS LIFECYCLE:
// //   "idle"            → app just loaded, haven't checked token yet
// //   "loading"         → async check in progress (getAdminMe / adminLogin)
// //   "authenticated"   → valid admin role confirmed
// //   "unauthenticated" → no token, bad token, or insufficient role
// //
// // WHY A SLICE IN ADDITION TO adminAuthApi (RTK Query)?
// //   RTK Query cache is empty on hard refresh — the guard component would have
// //   no state to read and would flash a redirect before the async call resolves.
// //   This slice gives the guard a deterministic status it can always read
// //   synchronously, and a clear "loading" state so it shows a spinner instead
// //   of a premature redirect.
// // ─────────────────────────────────────────────────────────────────────────────

// import { createSlice }          from "@reduxjs/toolkit";
// import { adminAuthApi }         from "./adminAuthApi";
// import { ROLES }                from "../roles";

// const VALID_ROLES = Object.values(ROLES);

// // ── Decode JWT payload (no verification — server already verified it) ────────
// // Returns null if token is missing / malformed / expired
// const decodeJWT = (token) => {
//   try {
//     if (!token) return null;
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     // Reject if expired (exp is in seconds)
//     if (payload.exp && payload.exp * 1000 < Date.now()) return null;
//     return payload;
//   } catch {
//     return null;
//   }
// };

// // ── Derive initial state from localStorage so hard-refresh is instant ────────
// // If a valid admin token exists we start "authenticated" — getAdminMe will
// // run in the background and either confirm or flip us to "unauthenticated".
// const deriveInitialState = () => {
//   const token   = localStorage.getItem("accessToken");
//   const payload = decodeJWT(token);

//   if (payload && VALID_ROLES.includes(payload.role)) {
//     return {
//       user:   { role: payload.role, ...payload }, // full payload as seed
//       status: "authenticated",                    // confirmed by /auth/me shortly
//     };
//   }
//   return { user: null, status: "idle" };
// };

// // ─────────────────────────────────────────────────────────────────────────────

// const adminAuthSlice = createSlice({
//   name: "adminAuth",
//   initialState: deriveInitialState(),

//   reducers: {
//     // Call this from the forced-logout event listener in App.jsx
//     adminForceLogout: (state) => {
//       state.user   = null;
//       state.status = "unauthenticated";
//       localStorage.removeItem("accessToken");
//     },
//   },

//   extraReducers: (builder) => {
//     // ── adminLogin (mutation) ─────────────────────────────────────────────
//     builder
//       .addMatcher(
//         adminAuthApi.endpoints.adminLogin.matchPending,
//         (state) => { state.status = "loading"; }
//       )
//       .addMatcher(
//         adminAuthApi.endpoints.adminLogin.matchFulfilled,
//         (state, { payload }) => {
//           // adminAuthApi.transformResponse already validated the role
//           // and stored the token — we just mirror the user here
//           if (payload && VALID_ROLES.includes(payload.role)) {
//             state.user   = payload;
//             state.status = "authenticated";
//           } else {
//             // Shouldn't happen (transform throws first), but defensive:
//             state.user   = null;
//             state.status = "unauthenticated";
//           }
//         }
//       )
//       .addMatcher(
//         adminAuthApi.endpoints.adminLogin.matchRejected,
//         (state) => {
//           state.user   = null;
//           state.status = "unauthenticated";
//         }
//       );

//     // ── getAdminMe (query) — background session rehydration ──────────────
//     builder
//       .addMatcher(
//         adminAuthApi.endpoints.getAdminMe.matchPending,
//         (state) => {
//           // Only set "loading" if we weren't already authenticated
//           // (avoids a spinner flash when the token looked valid at startup)
//           if (state.status === "idle") state.status = "loading";
//         }
//       )
//       .addMatcher(
//         adminAuthApi.endpoints.getAdminMe.matchFulfilled,
//         (state, { payload }) => {
//           if (payload && VALID_ROLES.includes(payload.role)) {
//             state.user   = payload;
//             state.status = "authenticated";
//           } else {
//             state.user   = null;
//             state.status = "unauthenticated";
//             localStorage.removeItem("accessToken");
//           }
//         }
//       )
//       .addMatcher(
//         adminAuthApi.endpoints.getAdminMe.matchRejected,
//         (state) => {
//           state.user   = null;
//           state.status = "unauthenticated";
//           localStorage.removeItem("accessToken");
//         }
//       );

//     // ── adminLogout (mutation) ────────────────────────────────────────────
//     builder
//       .addMatcher(
//         adminAuthApi.endpoints.adminLogout.matchFulfilled,
//         (state) => {
//           state.user   = null;
//           state.status = "unauthenticated";
//           // Token already cleared inside adminAuthApi.transformResponse
//         }
//       )
//       .addMatcher(
//         adminAuthApi.endpoints.adminLogout.matchRejected,
//         (state) => {
//           // Even if API call fails, clear local state
//           state.user   = null;
//           state.status = "unauthenticated";
//           localStorage.removeItem("accessToken");
//         }
//       );
//   },
// });

// export const { adminForceLogout } = adminAuthSlice.actions;
// export default adminAuthSlice.reducer;

// // ── Selectors ────────────────────────────────────────────────────────────────
// export const selectAdminUser   = (state) => state.adminAuth.user;
// export const selectAdminStatus = (state) => state.adminAuth.status;
// export const selectIsAdminAuth = (state) => state.adminAuth.status === "authenticated";