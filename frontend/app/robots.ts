import type { MetadataRoute } from 'next';

/**
 * robots.ts — auto-generates /robots.txt via Next.js App Router
 *
 * Rules:
 *  - Allow Google to crawl all public marketing & demo pages
 *  - Block all authenticated dashboard routes (patient, doctor, admin)
 *  - Block all API routes (never indexable)
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://mediqueue.monjurhossen.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',          // homepage
          '/demo',      // public interactive demo
          '/login',     // auth pages (indexable but low priority)
          '/register',  // registration funnel
        ],
        disallow: [
          '/patient/',        // patient dashboard — private
          '/doctor/',         // doctor console — private
          '/admin/',          // tenant admin — private
          '/super/',          // super-admin — private (was /superadmin/ — FIXED)
          '/billing/',        // billing & Stripe portal — private
          '/queue/',          // queue management — private
          '/setup-password/', // invite onboarding step — private
          '/api/',            // API routes — never index
          '/_next/',          // Next.js internals
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
