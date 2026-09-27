'use client';

import { AxiosError } from 'axios';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useMyActiveToken } from '@/hooks/api/queue';
import { useQueueSocket } from '@/hooks/useQueueSocket';
import { ActiveTokenPanel } from '@/components/patient/ActiveTokenPanel';
import { PushAlerts } from '@/components/patient/PushAlerts';
import { QueueEmpty, QueueError, QueueSkeleton } from '@/components/patient/QueueStates';

/** 404 from /queue/my-active-token means "no token today", which is a normal state, not an error. */
function isNoTokenError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

function TodayQueue() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const { data: token, isLoading, isError, error, refetch, isFetching } = useMyActiveToken();

  // Live updates: position, now serving, breaks, your turn
  useQueueSocket(token?.session_id ?? null, accessToken, userId);

  const retry = { onRetry: () => void refetch(), retrying: isFetching };

  if (isLoading) return <QueueSkeleton />;
  if (isError && !isNoTokenError(error)) return <QueueError {...retry} />;
  const waiting = token?.status === 'waiting';

  return (
    <div className="space-y-4">
      {token ? <ActiveTokenPanel token={token} /> : <QueueEmpty {...retry} />}
      {waiting && (
        <p className="text-xs text-pretty text-mq-subtle">
          Your place in line updates live on this page.
        </p>
      )}
      {/* Alerts card + explanation popup on every visit until the patient decides */}
      <PushAlerts />
    </div>
  );
}

export default function PatientQueuePage() {
  const { user, loading } = useRequireAuth(['patient']);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">My queue</h1>
      <p className="mt-1 text-sm text-mq-muted">{today}</p>
      <div className="mt-8">{loading || !user ? <QueueSkeleton /> : <TodayQueue />}</div>

    </div>
  );
}
