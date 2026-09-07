/**
 * Browser console self-test for web push / OS notifications.
 *
 * HOW TO USE (other dev machine):
 * 1. Open http://localhost:5173 (same URL where site runs)
 * 2. Login as a customer
 * 3. F12 → Console → paste this WHOLE file → Enter
 * 4. Follow the printed steps
 * 5. On the machine that has backend .env, run:
 *      cd backend/offerWaleBaba
 *      node scripts/send-test-new-products-push.js ecomm
 *    Or only to this user:
 *      node scripts/send-test-new-products-push.js ecomm --email=their@email.com
 */
(async function owbPushSelfTest() {
  const log = (...a) => console.log('%c[OWB Push Test]', 'color:#F7A221;font-weight:bold', ...a);
  const fail = (...a) => console.error('%c[OWB Push Test]', 'color:red;font-weight:bold', ...a);

  log('origin =', location.origin);
  log('Notification permission =', typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    fail('This browser does not support web push.');
    return;
  }

  // 1) Prove OS can show notifications from this origin
  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
    log('requestPermission →', perm);
  }
  if (perm !== 'granted') {
    fail('Permission not granted. Site settings → Notifications → Allow, then re-run.');
    return;
  }

  try {
    new Notification('🆕 New Products Added!', {
      body: 'Explore our latest arrivals today!',
      icon: '/pwa-192x192.png',
      tag: 'owb-local-os-test-' + Date.now(),
      requireInteraction: true,
    });
    log('Local OS notification fired. If you did NOT see a toast, Windows/Chrome is blocking (not the API).');
  } catch (e) {
    fail('Local Notification failed:', e);
  }

  // 2) Service worker
  let reg;
  try {
    reg = await navigator.serviceWorker.ready;
    log('Service worker ready:', reg.active?.scriptURL || reg.scope);
  } catch (e) {
    fail('Service worker not ready. Hard refresh (Ctrl+Shift+R) and retry.', e);
    return;
  }

  // 3) Ensure push subscription exists + saved on server
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  let vapidRes;
  try {
    vapidRes = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
  } catch (e) {
    fail('Cannot reach /api/push/vapid-public-key', e);
    return;
  }
  const vapidJson = await vapidRes.json().catch(() => ({}));
  if (!vapidJson?.publicKey) {
    fail('VAPID not configured on server:', vapidJson);
    return;
  }
  log('VAPID OK');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    log('No push subscription yet — creating…');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidJson.publicKey),
    });
  }
  const json = sub.toJSON();
  log('endpoint host =', (() => {
    try {
      return new URL(json.endpoint).host;
    } catch {
      return '(bad endpoint)';
    }
  })());

  const saveRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  const saveJson = await saveRes.json().catch(() => ({}));
  if (!saveRes.ok || saveJson?.success === false) {
    fail('Subscribe API failed (must be logged in as customer):', saveRes.status, saveJson);
    log('Login on this origin, then re-run this script.');
    return;
  }
  log('Subscription saved on server:', saveJson);

  // 4) SW-driven notification (closest to real push UI)
  try {
    await reg.showNotification('🆕 New Products Added!', {
      body: 'Explore our latest arrivals today!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'owb-sw-local-test-' + Date.now(),
      requireInteraction: true,
      actions: [{ action: 'shop-new-arrivals', title: 'Shop New Arrivals' }],
      data: { url: location.origin + '/#best-sellers', type: 'new-products-digest', test: true },
    });
    log('Service-worker showNotification fired (same UI path as real push).');
  } catch (e) {
    fail('SW showNotification failed:', e);
  }

  log('DONE. Next: from backend machine run send-test-new-products-push.js to test REAL FCM push.');
  return { permission: perm, subscribed: true, endpoint: json.endpoint };
})();
