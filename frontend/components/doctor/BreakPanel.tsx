'use client';

import { useEffect, useState } from 'react';
import { useEndBreak, type QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { buttonClasses, MONO } from '@/components/shared/primitives';
import { formatClock } from './queueUtils';

/** Replaces the now serving side while the doctor is on break: countdown, resume time, resume action. */
export function BreakPanel({ session }: { session: QueueSession }) {
  const endBreak = useEndBreak(session.id);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = session.break_expected_duration;
  const startedAt = session.break_started_at ? new Date(session.break_started_at).getTime() : null;
  const endsAt = startedAt && minutes ? startedAt + minutes * 60_000 : null;
  const secondsLeft = endsAt ? (endsAt - now) / 1000 : null;
  const overdue = secondsLeft !== null && secondsLeft <= 0;
  // Time left as a share of the break: the bar drains to empty, then shows full red once overdue
  const remaining = overdue ? 1 : endsAt && minutes ? Math.min(1, Math.max(0, (secondsLeft ?? 0) / (minutes * 60))) : 0;
  const resumeAt = endsAt ? new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div>
      <p className="text-xs text-mq-subtle">{overdue ? 'Break over by' : 'On break'}</p>
      {secondsLeft !== null ? (
        <p role="timer" aria-live="off"
          className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight tabular-nums', overdue ? 'text-mq-danger' : 'text-mq-ink')}>
          {formatClock(Math.abs(secondsLeft))}
        </p>
      ) : (
        <p className="mt-2 text-xl font-medium tracking-tight text-mq-ink">Queue paused</p>
      )}
      <p className={cn('mt-2 text-sm', overdue ? 'text-mq-danger' : 'text-mq-muted')}>
        {overdue
          ? 'Patients are waiting. Resume when you are back.'
          : resumeAt
            ? `Patients see the queue resuming at ${resumeAt}.`
            : 'Patients see that the queue is paused.'}
      </p>

      {endsAt && (
        <div className="mt-6 h-1 w-full bg-mq-line" aria-hidden>
          <div
            className={cn('h-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none', overdue ? 'bg-mq-danger' : 'bg-mq-ink')}
            style={{ width: `${remaining * 100}%` }}
          />
        </div>
      )}

      <button type="button" onClick={() => session.active_break_id && endBreak.mutate(session.active_break_id)}
        disabled={endBreak.isPending || !session.active_break_id} aria-busy={endBreak.isPending}
        className={buttonClasses('primary', 'md', 'mt-8 w-full sm:w-auto sm:min-w-[200px]')}>
        {endBreak.isPending ? 'Resuming…' : 'End break and resume'}
      </button>
    </div>
  );
}
