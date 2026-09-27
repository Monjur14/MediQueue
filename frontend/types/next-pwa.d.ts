declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  interface RuntimeCachingEntry {
    urlPattern: RegExp | string;
    handler: 'CacheFirst' | 'CacheOnly' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
    options?: {
      cacheName?: string;
      networkTimeoutSeconds?: number;
      expiration?: { maxEntries?: number; maxAgeSeconds?: number };
      cacheableResponse?: { statuses?: number[]; headers?: Record<string, string> };
    };
  }

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    buildExcludes?: (string | RegExp)[];
    runtimeCaching?: RuntimeCachingEntry[];
    turbopack?: Record<string, unknown>;
  }

  function withPWAInit(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWAInit;
}
