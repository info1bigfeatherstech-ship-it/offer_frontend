import axios from "axios";

export const USER_ACCESS_TOKEN_KEY = "userAccessToken";
export const ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
export const AUTH_CONTEXT_USER = "user";
export const AUTH_CONTEXT_ADMIN = "admin";

/** Refresh access token this many ms before JWT exp (avoids visible 401 cliff). */
const REFRESH_BEFORE_EXPIRY_MS = 90 * 1000;

const proactiveRefreshTimers = {
  [AUTH_CONTEXT_USER]: null,
  [AUTH_CONTEXT_ADMIN]: null,
};

/** One in-flight refresh per context — prevents rotation races (SESSION_EXPIRED). */
const refreshInFlight = {
  [AUTH_CONTEXT_USER]: null,
  [AUTH_CONTEXT_ADMIN]: null,
};

const refreshWaitQueues = {
  [AUTH_CONTEXT_USER]: [],
  [AUTH_CONTEXT_ADMIN]: [],
};

function isAdminApiPath(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return false;
  if (u.startsWith("/admin") || u.includes("/admin/")) return true;
  if (u.startsWith("/staff") || u.includes("/staff/")) return true;
  if (u.includes("/orders/admin/")) return true;
  if (u.includes("/checkout/admin/")) return true;
  return false;
}

function isAdminAppPath(pathname) {
  const p = String(pathname || "");
  return (
    /^\/babapanel(\/|$)/.test(p) ||
    /^\/babadash(\/|$)/.test(p) ||
    /^\/admin(\/|$)/.test(p)
  );
}

const getAuthContext = (config = {}) => {
  const rawContext = config?.authContext;
  if (rawContext) {
    return String(rawContext).trim().toLowerCase() === AUTH_CONTEXT_ADMIN
      ? AUTH_CONTEXT_ADMIN
      : AUTH_CONTEXT_USER;
  }

  const requestUrl = String(config?.url || "").trim().toLowerCase();
  if (isAdminApiPath(requestUrl)) {
    return AUTH_CONTEXT_ADMIN;
  }

  const hasAdminToken = Boolean(localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY));
  const hasUserToken = Boolean(localStorage.getItem(USER_ACCESS_TOKEN_KEY));
  const adminAppActive =
    typeof window !== "undefined" && isAdminAppPath(window.location.pathname);

  if (hasAdminToken && (adminAppActive || !hasUserToken)) {
    return AUTH_CONTEXT_ADMIN;
  }

  return AUTH_CONTEXT_USER;
};

const getTokenStorageKey = (authContext) => {
  return authContext === AUTH_CONTEXT_ADMIN ? ADMIN_ACCESS_TOKEN_KEY : USER_ACCESS_TOKEN_KEY;
};

const getLogoutEventName = (authContext) => {
  return authContext === AUTH_CONTEXT_ADMIN ? "auth:logout:admin" : "auth:logout:user";
};

const getPortalForAuthContext = (authContext) => {
  return authContext === AUTH_CONTEXT_ADMIN ? "admin-ecomm" : "ecomm";
};

function getAccessTokenExpiryMs(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function clearProactiveRefreshTimer(authContext) {
  const existing = proactiveRefreshTimers[authContext];
  if (existing) {
    clearTimeout(existing);
    proactiveRefreshTimers[authContext] = null;
  }
}

function drainRefreshQueue(authContext, error, token = null) {
  const queue = refreshWaitQueues[authContext];
  refreshWaitQueues[authContext] = [];
  queue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token);
    }
  });
}

async function performRefreshRequest(authContext) {
  const tokenStorageKey = getTokenStorageKey(authContext);
  const res = await axiosInstance.post(
    "/auth/refresh",
    { portal: getPortalForAuthContext(authContext) },
    { authContext, skipAuthRefresh: true }
  );
  const newToken = res.data?.accessToken;
  if (!newToken) {
    throw new Error("Refresh response missing accessToken");
  }
  localStorage.setItem(tokenStorageKey, newToken);
  notifyAccessTokenStored(authContext);
  return newToken;
}

/**
 * Single-flight refresh per context (admin vs user never share one lock).
 */
export function enqueueTokenRefresh(authContext) {
  if (refreshInFlight[authContext]) {
    return refreshInFlight[authContext];
  }

  refreshInFlight[authContext] = (async () => {
    try {
      const token = await performRefreshRequest(authContext);
      drainRefreshQueue(authContext, null, token);
      return token;
    } catch (error) {
      drainRefreshQueue(authContext, error, null);
      throw error;
    } finally {
      refreshInFlight[authContext] = null;
    }
  })();

  return refreshInFlight[authContext];
}

/**
 * Schedule silent refresh before access JWT expires. Call after login / refresh / page load.
 */
export function notifyAccessTokenStored(authContext) {
  if (typeof window === "undefined") return;

  clearProactiveRefreshTimer(authContext);

  const storageKey = getTokenStorageKey(authContext);
  const token = localStorage.getItem(storageKey);
  const expMs = getAccessTokenExpiryMs(token);
  if (!expMs) return;

  const delay = Math.max(expMs - Date.now() - REFRESH_BEFORE_EXPIRY_MS, 5000);

  proactiveRefreshTimers[authContext] = setTimeout(() => {
    proactiveRefreshTimers[authContext] = null;
    enqueueTokenRefresh(authContext).catch(() => {
      // Reactive 401 path will retry; avoid forced logout on proactive race failure.
    });
  }, delay);
}

export function clearAccessTokenSchedule(authContext) {
  clearProactiveRefreshTimer(authContext);
}

const RAW_BACKEND_BASE_URL = String(import.meta.env.VITE_BACKEND_BASE_URL || "").trim().replace(/\/$/, "");

if (!RAW_BACKEND_BASE_URL) {
  throw new Error(
    "VITE_BACKEND_BASE_URL is not defined. Set it in your .env file (e.g. /api with Vite proxy, or http://localhost:8081/api)."
  );
}

const axiosInstance = axios.create({
  baseURL: RAW_BACKEND_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "x-storefront": "ecomm",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const authContext = getAuthContext(config);
    config.authContext = authContext;

    const storageKey = getTokenStorageKey(authContext);
    const token =
      localStorage.getItem(storageKey) || localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    if (originalRequest.skipAuthRefresh) {
      return Promise.reject(error);
    }

    const authContext = getAuthContext(originalRequest);
    const tokenStorageKey = getTokenStorageKey(authContext);
    const requestUrl = String(originalRequest?.url || "");

    const isAuthFailure =
      error.response?.status === 401 ||
      (error.response?.status === 403 &&
        ["PORTAL_ACCESS_DENIED", "INSUFFICIENT_ADMIN_ROLE"].includes(
          error.response?.data?.code
        ));

    if (
      isAuthFailure &&
      !originalRequest._retry &&
      !requestUrl.includes("/auth/refresh") &&
      !requestUrl.includes("/auth/login")
    ) {
      if (refreshInFlight[authContext]) {
        return new Promise((resolve, reject) => {
          refreshWaitQueues[authContext].push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;

      try {
        const newToken = await enqueueTokenRefresh(authContext);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem(tokenStorageKey);
        clearAccessTokenSchedule(authContext);
        window.dispatchEvent(new Event(getLogoutEventName(authContext)));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

if (typeof window !== "undefined") {
  if (localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)) {
    notifyAccessTokenStored(AUTH_CONTEXT_ADMIN);
  }
  if (localStorage.getItem(USER_ACCESS_TOKEN_KEY)) {
    notifyAccessTokenStored(AUTH_CONTEXT_USER);
  }
}

export default axiosInstance;
