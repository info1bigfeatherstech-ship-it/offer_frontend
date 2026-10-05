/**
 * Dropshipper order + Razorpay API handoffs.
 * Staff JWT for now (same gate as /api/dropshipper catalog).
 * Does not wire UI — dashboard can import these later.
 */
import axiosInstance from './axiosInstance';

const BASE = '/dropshipper';

export async function quoteDropshipOrder(body) {
  const res = await axiosInstance.post(`${BASE}/orders/quote`, body);
  return res.data;
}

export async function createDropshipOrder(body) {
  const res = await axiosInstance.post(`${BASE}/orders`, body);
  return res.data;
}

/**
 * After Razorpay Checkout success handler.
 * Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export async function verifyDropshipPayment(body) {
  const res = await axiosInstance.post(`${BASE}/orders/verify-payment`, body);
  return res.data;
}

export async function listMyDropshipOrders(params = {}) {
  const res = await axiosInstance.get(`${BASE}/orders`, { params });
  return res.data;
}

export async function getMyDropshipOrder(orderId) {
  const res = await axiosInstance.get(`${BASE}/orders/${encodeURIComponent(orderId)}`);
  return res.data;
}
