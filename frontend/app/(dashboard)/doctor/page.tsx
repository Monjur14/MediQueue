'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useTodaySessions } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { DoctorQueueView } from '@/components/doctor/DoctorQueueView';
import { ConsoleSkeleton, NoSession } from '@/components/doctor/DoctorStates';

function DoctorQueueContent() {
  const { user, loading } = useRequireAuth(['doctor', 'tenant_admin']);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: sessions, isLoading, refetch, isFetching } = useTodaySessions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (loading || !user) return null;

  const isAdmin = user.role === 'tenant_admin';
  const open = (sessions ?? []).filter((s) => s.status !== 'closed');
  // Doctors see their own queue; admins see every open queue, their own first
  const queues = isAdmin
    ? [...open].sort((a, b) => Number(b.doctor_id === user.id) - Number(a.doctor_id === user.id))
    : open.filter((s) => s.doctor_id === user.id);
  const selected = queues.find((s) => s.id === searchParams.get('session')) ?? queues[0];

  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const meta = isAdmin ? `${today} · ${queues.length} open ${queues.length === 1 ? 'queue' : 'queues'}` : `Dr. ${user.name} · ${today}`;
  const select = (id: string) => router.replace(`${pathname}?session=${id}`, { scroll: false });

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">My queue</h1>
      <p className="mt-1 text-sm text-mq-muted">{meta}</p>

      {queues.length > 1 && (
        <div className="mt-8 border-b border-mq-line">
          <div role="tablist" aria-label="Open queues" className="no-scrollbar -mb-px flex gap-6 overflow-x-auto overflow-y-hidden">
            {queues.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={s.id === selected?.id} onClick={() => select(s.id)}
                className={cn(
                  'shrink-0 border-b-2 pb-3 text-sm transition-colors duration-500',
                  EASE,
                  s.id === selected?.id ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
                )}>
                Dr. {s.doctor_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {isLoading ? (
          <ConsoleSkeleton />
        ) : selected ? (
          <DoctorQueueView key={selected.id} session={selected} accessToken={accessToken} />
        ) : (
          <NoSession isAdmin={isAdmin} onRefresh={() => void refetch()} refreshing={isFetching} />
        )}
      </div>
    </main>
  );
}

export default function DoctorQueuePage() {
  // useSearchParams needs a Suspense boundary in the App Router
  return (
    <Suspense fallback={null}>
      <DoctorQueueContent />
    </Suspense>
  );
}
