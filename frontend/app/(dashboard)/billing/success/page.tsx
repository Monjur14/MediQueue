'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/hooks/useAuth';

export default function BillingSuccessPage() {
  const { user, loading } = useRequireAuth(['tenant_admin']);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    // Invalidate subscription cache so the billing page reflects the new plan
    queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    queryClient.invalidateQueries({ queryKey: ['billing', 'plans'] });
    // Redirect after a brief moment so the user sees the success message
    const t = setTimeout(() => router.replace('/billing'), 3000);
    return () => clearTimeout(t);
  }, [queryClient, router]);

  if (loading || !user) return null;

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-mq-ink">Payment successful!</h1>
      <p className="mt-2 text-sm text-mq-muted">
        Your subscription is now active. You&apos;ll be redirected in a moment…
      </p>
    </main>
  );
}
