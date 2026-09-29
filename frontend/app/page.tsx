import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { AuthRedirect } from '@/components/home/AuthRedirect';

export const metadata: Metadata = {
  title: { absolute: 'MediQueue — Smart Hospital Queue' },
  description:
    'Live hospital queue management for clinics in Bangladesh. Patients track their place in line for free.',
  alternates: { canonical: '/' },
};

/**
 * Root page — server component.
 *
 * <HomePage /> is server-rendered so Googlebot receives the full landing page
 * in the initial HTML response, with no JavaScript required.
 *
 * <AuthRedirect /> is an invisible client component that runs after hydration
 * and quietly sends logged-in users to their role dashboard.
 */
export default function RootPage() {
  return (
    <>
      <AuthRedirect />
      <HomePage />
    </>
  );
}
