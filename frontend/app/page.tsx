'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, getRoleDashboard } from '@/store/auth.store';
import { HomePage } from '@/components/home/HomePage';

export default function RootPage() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.isLoading);

  // Logged-in users skip the landing page and go straight to their dashboard
  useEffect(() => {
    if (!loading && user) router.replace(getRoleDashboard(user.role));
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  return <HomePage />;
}
