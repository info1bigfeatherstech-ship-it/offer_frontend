/**
 * Public dropshipper auth reads for the storefront Become page.
 * No admin JWT — user context is enough for subscription settings.
 */
import axiosInstance, { AUTH_CONTEXT_USER } from './axiosInstance';

export async function getSubscriptionSettings() {
  const res = await axiosInstance.get('/dropshipper/auth/subscription-settings', {
    authContext: AUTH_CONTEXT_USER,
  });
  return res.data;
}
