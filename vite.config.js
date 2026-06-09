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
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
  registerType: "autoUpdate",

  devOptions: {
    enabled: true,
    type: 'module',
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

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
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
