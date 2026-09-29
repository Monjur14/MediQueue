'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, getRoleDashboard } from '@/store/auth.store';

/**
 * AuthRedirect — invisible client component mounted on the homepage.
 *
 * Renders nothing. After hydration it checks if the user is already logged in
 * and redirects them to their role dashboard. The homepage itself is server-
 * rendered (SSR) so Googlebot always sees the full landing page content without
 * waiting for this component to run.
 */
export function AuthRedirect() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleDashboard(user.role));
    }
  }, [user, loading, router]);

  return null;
}
