import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Design system fonts (see DESIGN.md §3) — loaded once for every page
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mq-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mq-mono',
  display: 'swap',
});

// ── Base URL ───────────────────────────────────────────────────────────────
// metadataBase resolves all relative URLs in metadata (OG images, canonical, etc.)
const BASE_URL = new URL('https://mediqueue.monjurhossen.online');

export const metadata: Metadata = {
  // Resolves relative URLs in OG images and canonical links
  metadataBase: BASE_URL,

  title: {
    default: 'MediQueue — Smart Hospital Queue',
    template: '%s · MediQueue',
  },
  description:
    'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',

  // ── Canonical URL ────────────────────────────────────────────────────────
  alternates: {
    canonical: '/',
  },

  // ── Open Graph — controls link previews on LinkedIn, WhatsApp, Slack … ──
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'MediQueue',
    title: 'MediQueue — Smart Hospital Queue',
    description:
      'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',
    images: [
      {
        url: '/og-image.png', // place a 1200×630 image at /public/og-image.png
        width: 1200,
        height: 630,
        alt: 'MediQueue — Smart Hospital Queue dashboard',
      },
    ],
    locale: 'en_US',
  },

  // ── Twitter / X card ─────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'MediQueue — Smart Hospital Queue',
    description:
      'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',
    images: ['/og-image.png'],
  },

  // ── PWA / mobile ─────────────────────────────────────────────────────────
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MediQueue',
  },
  formatDetection: { telephone: false },
};

// Required in Next.js 13+ App Router — cannot live inside metadata
export const viewport: Viewport = {
  themeColor: '#0F5257',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// ── JSON-LD structured data ──────────────────────────────────────────────────
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MediQueue',
  url: 'https://mediqueue.monjurhossen.online',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, Android, iOS',
  description:
    'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',
  inLanguage: 'en',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BDT',
    description: 'Free for patients',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-mq-ground font-sans text-mq-ink selection:bg-mq-tint">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
