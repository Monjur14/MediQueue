import type { MetadataRoute } from 'next';

/**
 * sitemap.ts — auto-generates /sitemap.xml via Next.js App Router
 *
 * Lists every public URL Google should index.
 * Priority scale: 1.0 (most important) → 0.1 (least important)
 * changeFrequency: hint to crawlers (Google ignores it, other engines may use it)
 *
 * ⚠️  lastModified must reflect the LAST SIGNIFICANT CONTENT CHANGE, not build
 *     time. Update the date manually when you meaningfully change a page's copy,
 *     structure, or structured data — not for CSS tweaks or dependency bumps.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

const BASE_URL = 'https://mediqueue.monjurhossen.online';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Core marketing pages ──────────────────────────────────────────────
    {
      url: BASE_URL,
      lastModified: new Date('2026-09-29'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: new Date('2026-09-29'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },

    // ── Authentication / onboarding funnel ────────────────────────────────
    // Helps Google understand the product even if these pages won't rank highly
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date('2026-09-20'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date('2026-09-20'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/register/tenant`,
      lastModified: new Date('2026-09-20'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // ── Add new public pages below as you create them ─────────────────────
    // Example — uncomment and update once you build these pages:
    //
    // {
    //   url: `${BASE_URL}/pricing`,
    //   lastModified: new Date('2026-XX-XX'),
    //   changeFrequency: 'monthly',
    //   priority: 0.9,
    // },
    // {
    //   url: `${BASE_URL}/features`,
    //   lastModified: new Date('2026-XX-XX'),
    //   changeFrequency: 'monthly',
    //   priority: 0.8,
    // },
    // {
    //   url: `${BASE_URL}/blog`,
    //   lastModified: new Date('2026-XX-XX'),
    //   changeFrequency: 'daily',
    //   priority: 0.7,
    // },
  ];
}
