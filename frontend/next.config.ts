import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',          // service worker output — sw.js lands in /public
  register: true,          // auto-register SW on page load
  skipWaiting: true,       // new SW activates immediately, no waiting
  disable: process.env.NODE_ENV === 'development', // no SW in dev (avoids cache confusion)
  buildExcludes: [/middleware-manifest\.json$/],   // known next-pwa + Next 13+ fix
  runtimeCaching: [
    // ── Google Fonts — cache-first (rarely changes) ───────────────────────
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // ── Next.js static assets — cache-first ───────────────────────────────
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // ── Next.js image optimization ─────────────────────────────────────────
    {
      urlPattern: /\/_next\/image\?.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // ── API calls — network-first (always try fresh, fall back to cache) ──
    // Cached API responses let the queue page render offline with last-known data
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // ── HTML pages — network-first ─────────────────────────────────────────
    {
      urlPattern: /^https?:\/\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // Empty turbopack config silences the "webpack config but no turbopack config" warning.
  // next-pwa uses webpack at build time; Turbopack is used in dev only (PWA is disabled in dev).
  turbopack: {},
};

export default withPWA(nextConfig);
