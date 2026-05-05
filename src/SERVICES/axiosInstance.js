import axios from "axios";

export const USER_ACCESS_TOKEN_KEY = "userAccessToken";
export const ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
export const AUTH_CONTEXT_USER = "user";
export const AUTH_CONTEXT_ADMIN = "admin";

const getAuthContext = (config = {}) => {
  const rawContext = config?.authContext;
  if (rawContext) {
    return String(rawContext).trim().toLowerCase() === AUTH_CONTEXT_ADMIN
      ? AUTH_CONTEXT_ADMIN
      : AUTH_CONTEXT_USER;
  }

  const requestUrl = String(config?.url || "").trim().toLowerCase();
  const isAdminApiCall =
    requestUrl.startsWith("/admin") ||
    requestUrl.includes("/admin/") ||
    requestUrl.startsWith("/staff") ||
    requestUrl.includes("/staff/");
  if (isAdminApiCall) {
    return AUTH_CONTEXT_ADMIN;
  }

  const hasAdminToken = Boolean(localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY));
  const hasUserToken = Boolean(localStorage.getItem(USER_ACCESS_TOKEN_KEY));
  const adminRouteActive =
    typeof window !== "undefined" &&
    (/^\/babapanel(\/|$)/.test(window.location.pathname) ||
      /^\/babadash(\/|$)/.test(window.location.pathname));
  if (adminRouteActive && hasAdminToken) {
    return AUTH_CONTEXT_ADMIN;
  }
  if (hasAdminToken && !hasUserToken) {
    // Single active session is admin; keep refresh portal aligned.
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

const axiosInstance = axios.create({
  // baseURL: import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8081/api",
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || "https://offerwalebaba.onrender.com/api",
  timeout: 15000,
  withCredentials: true, // ✅ IMPORTANT: sends cookies (refreshToken) with every request
  headers: {
    "Content-Type": "application/json",
    "x-storefront":"ecomm"
  },
});

// ✅ Request Interceptor — attach accessToken automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const authContext = getAuthContext(config);
    const token =
      localStorage.getItem(getTokenStorageKey(authContext)) ||
      localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response Interceptor — auto-refresh accessToken on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const authContext = getAuthContext(originalRequest);
    const tokenStorageKey = getTokenStorageKey(authContext);

    // If 401 and not already retrying and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest.url.includes("/auth/login")
    ) {
      if (isRefreshing) {
        // Queue the request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axiosInstance.post("/auth/refresh", {
          portal: getPortalForAuthContext(authContext),
        });
        const newToken = res.data.accessToken;
        localStorage.setItem(tokenStorageKey, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem(tokenStorageKey);
        window.dispatchEvent(new Event(getLogoutEventName(authContext)));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;


// import axios from "axios";

// // Create axios instance
// const axiosInstance = axios.create({
//  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5000/api",
//   timeout: 15000,
//   headers: {
//     "Content-Type": "application/json",
// },

// });
// console.log(import.meta.env.VITE_BACKEND_BASE_URL);
// export default axiosInstance;