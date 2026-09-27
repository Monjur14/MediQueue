import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, getRoleDashboard } from '@/store/auth.store';
import type { UserRole } from '@/types';

/**
 * Redirect to login if user is not authenticated.
 * Optionally restrict to specific roles (redirects to their dashboard if wrong role).
 */
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to their own dashboard, not an error page
      router.replace(getRoleDashboard(user.role));
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading };
}
