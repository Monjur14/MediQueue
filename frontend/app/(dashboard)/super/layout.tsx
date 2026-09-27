'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

const SUPER_ONLY: UserRole[] = ['super_admin'];

/** Platform owner console: one guard and one page frame for every /super page. */
export default function SuperLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth(SUPER_ONLY);
  if (loading || !user || user.role !== 'super_admin') return null;

  return (
    <main id="main" className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      {children}
    </main>
  );
}
