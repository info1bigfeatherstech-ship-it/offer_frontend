import axiosInstance from '../SERVICES/axiosInstance';

const PROMPT_DISMISS_KEY = 'owb_push_prompt_dismissed_at';
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SW_READY_TIMEOUT_MS = 12000;

function waitForServiceWorkerReady(timeoutMs = SW_READY_TIMEOUT_MS) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Service worker is not ready. Refresh the page and try again.')),
        timeoutMs
      );
    }),
  ]);
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function fetchVapidPublicKey() {
  const res = await axiosInstance.get('/push/vapid-public-key');
  if (!res.data?.configured || !res.data?.publicKey) {
    return null;
  }
  return res.data.publicKey;
}

export async function getPushStatus() {
  const res = await axiosInstance.get('/push/status');
  return res.data;
}

export function shouldShowPushPrompt() {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'default') return false;
  const dismissedAt = Number(localStorage.getItem(PROMPT_DISMISS_KEY) || 0);
  if (!dismissedAt) return true;
  return Date.now() - dismissedAt > PROMPT_COOLDOWN_MS;
}

export function dismissPushPrompt() {
  localStorage.setItem(PROMPT_DISMISS_KEY, String(Date.now()));
}

export async function subscribeToWebPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this device');
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    throw new Error('Push notifications are not configured on the server');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await waitForServiceWorkerReady(12000);
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  await axiosInstance.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: json.keys,
  });

  return subscription;
}

export async function syncPushSubscriptionIfGranted() {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return { synced: false, reason: 'not_granted' };
  }

  try {
    const status = await getPushStatus();
    const registration = await waitForServiceWorkerReady(12000);
    const existing = await registration.pushManager.getSubscription();

    if (status?.subscribed && existing) {
      return { synced: true, reason: 'already_subscribed' };
    }

    await subscribeToWebPush();
    return { synced: true, reason: 'subscribed' };
  } catch {
    return { synced: false, reason: 'sync_failed' };
  }
}

export async function unsubscribeFromWebPush() {
  if (!isPushSupported()) return { unsubscribed: false };
  const registration = await waitForServiceWorkerReady(12000);
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { unsubscribed: false };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await axiosInstance.delete('/push/unsubscribe', { data: { endpoint } });
  return { unsubscribed: true };
}
