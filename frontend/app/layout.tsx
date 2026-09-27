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

export const metadata: Metadata = {
  title: 'MediQueue — Smart Hospital Queue',
  description: 'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',
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
      <body className="min-h-full bg-mq-ground font-sans text-mq-ink selection:bg-mq-tint">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
