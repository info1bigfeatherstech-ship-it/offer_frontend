/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();

const wbManifest = self.__WB_MANIFEST;
precacheAndRoute(wbManifest);
cleanupOutdatedCaches();

// VitePWA may precache `index.html` (no leading slash). createHandlerBoundToURL
// requires an exact precache match — resolve from the injected manifest safely.
const spaShellUrl = (Array.isArray(wbManifest) ? wbManifest : [])
  .map((entry) => (typeof entry === 'string' ? entry : entry && entry.url))
  .find(
    (url) =>
      typeof url === 'string' &&
      (url === '/index.html' || url === 'index.html' || url.endsWith('/index.html'))
  );

if (spaShellUrl) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(spaShellUrl), {
      denylist: [/^\/api/],
    })
  );
}

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'product-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/products'),
  new NetworkFirst({
    cacheName: 'products-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  })
);

function toAbsoluteAssetUrl(url) {
  const fallback = `${self.location.origin}/pwa-192x192.png`;
  if (!url) return fallback;
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      // Brand PWA / favicon assets: always load from this SW origin so local
      // Vite public/ and production each serve their own file. Avoids broken
      // cross-origin hosts causing Chrome to reuse the large product `image`.
      if (
        /\/pwa-\d+x\d+\.(png|webp|jpe?g)$/i.test(parsed.pathname) ||
        /\/favicon\.(ico|png)$/i.test(parsed.pathname)
      ) {
        return `${self.location.origin}${parsed.pathname}`;
      }
      return parsed.href;
    }
    return new URL(url, self.location.origin).href;
  } catch {
    return fallback;
  }
}

function parsePushPayload(event) {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data = { body: event.data?.text?.() || '' };
  }
  const imageRaw = typeof data.image === 'string' ? data.image.trim() : '';
  let image = undefined;
  if (imageRaw && /^https:\/\//i.test(imageRaw)) {
    try {
      image = new URL(imageRaw).href;
    } catch {
      image = undefined;
    }
  }

  let icon = toAbsoluteAssetUrl(data.icon || '/pwa-192x192.png');
  let badge = toAbsoluteAssetUrl(data.badge || '/pwa-192x192.png');
  const brandFallback = `${self.location.origin}/pwa-192x192.png`;

  // Restock (and any payload with a large product image): never let the small
  // icon/badge collapse to the same URL as the hero image.
  if (image && (icon === image || badge === image)) {
    if (icon === image) icon = brandFallback;
    if (badge === image) badge = brandFallback;
  }

  return {
    title: data.title || 'OfferWaaleBaba',
    body: data.body || '',
    icon,
    badge,
    image,
    tag: data.tag || 'offerwalebaba',
    actions: Array.isArray(data.actions) ? data.actions : undefined,
    data: data.data || { url: data.url || '/' },
  };
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag || `owb-${Date.now()}`,
    data: payload.data,
    renotify: true,
    requireInteraction: true,
  };
  if (payload.image) {
    options.image = payload.image;
  }
  if (payload.actions?.length) {
    options.actions = payload.actions;
  }
  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(payload.title, options);
      } catch (err) {
        // Fallback without image/actions if the browser rejects the payload shape.
        await self.registration.showNotification(payload.title || 'OfferWaaleBaba', {
          body: payload.body || 'New update',
          icon: payload.icon,
          badge: payload.badge,
          tag: `owb-fallback-${Date.now()}`,
          data: payload.data,
          requireInteraction: true,
        });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const resolveTargetUrl = () => {
    const d = event.notification?.data || {};
    // Restock: prefer same-origin PDP from productSlug so click always lands on this site's detail page.
    const slug = typeof d.productSlug === 'string' ? d.productSlug.trim() : '';
    if (
      (d.type === 'back_in_stock' || d.type === 'oos-restock') &&
      slug &&
      !slug.includes('/') &&
      !slug.includes('\\') &&
      !slug.includes('..')
    ) {
      try {
        const storefront = d.storefront === 'wholesale' ? 'wholesale' : 'ecomm';
        // Prefer path from payload when present (already storefront-aware from backend).
        if (typeof d.url === 'string' && d.url.startsWith('/product')) {
          return new URL(d.url, self.location.origin).href;
        }
        const prefix = storefront === 'wholesale' ? '/product' : '/products';
        return new URL(`${prefix}/${encodeURIComponent(slug)}`, self.location.origin).href;
      } catch {
        // fall through
      }
    }

    const raw = d.url || d.ctaUrl || '/';
    try {
      if (/^https?:\/\//i.test(raw)) {
        const absolute = new URL(raw);
        // If absolute points at another origin, keep same-origin PDP when we have a product path.
        if (
          absolute.origin !== self.location.origin &&
          /^\/products?\//i.test(absolute.pathname)
        ) {
          return new URL(absolute.pathname + absolute.search + absolute.hash, self.location.origin)
            .href;
        }
        return absolute.href;
      }
      return new URL(raw, self.location.origin).href;
    } catch {
      return `${self.location.origin}/`;
    }
  };

  const targetUrl = resolveTargetUrl();

  event.waitUntil(
    (async () => {
      let targetOrigin = self.location.origin;
      try {
        targetOrigin = new URL(targetUrl).origin;
      } catch {
        // keep SW origin
      }

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        let clientOrigin = '';
        try {
          clientOrigin = new URL(client.url).origin;
        } catch {
          continue;
        }
        if (clientOrigin !== targetOrigin) continue;

        try {
          if (typeof client.navigate === 'function') {
            await client.navigate(targetUrl);
          }
        } catch {
          // navigate can fail for some URL shapes; still try focus
        }
        if (typeof client.focus === 'function') {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })()
  );
});
