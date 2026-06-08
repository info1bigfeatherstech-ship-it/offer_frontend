import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  preview: {
    allowedHosts: true,
  },
  plugins: [react(),
     VitePWA({
  registerType: "autoUpdate",

  devOptions: {
    enabled: true,
  },

  includeAssets: [
    "favicon.ico",
    "apple-touch-icon.png",
    "pwa-192x192.png",
    "pwa-512x512.png",
  ],

  manifest: {
    name: "OfferWaleBaba",
    short_name: "OWB",

    description: "Wholesale",

    theme_color: "#000000",

    background_color: "#ffffff",

    display: "standalone",

    orientation: "portrait",

    scope: "/",

    start_url: "/",

    icons: [
      {
        src: "pwa-192x192.png",

        sizes: "192x192",

        type: "image/png",
      },

      {
        src: "pwa-512x512.png",

        sizes: "512x512",

        type: "image/png",
      },

      {
        src: "pwa-512x512.png",

        sizes: "512x512",

        type: "image/png",

        purpose: "maskable",
      },
    ],
  },

      workbox: {
        cleanupOutdatedCaches: true,

        clientsClaim: true,

        skipWaiting: true,

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "image",

            handler: "CacheFirst",

            options: {
              cacheName: "product-images",

              expiration: {
                maxEntries: 200,

                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },

          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/products"),

            handler: "NetworkFirst",

            options: {
              cacheName: "products-api",

              networkTimeoutSeconds: 5,

              expiration: {
                maxEntries: 50,

                maxAgeSeconds: 60 * 5,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
      // Same-origin /api in dev → refresh cookies work with SameSite=Lax (no cross-port 5173↔8081).
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
