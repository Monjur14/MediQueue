'use client';

import { useQueueSocket } from '@/hooks/useQueueSocket';
import { useCloseSession, useSessionTokens, type QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { StatusMark } from '@/components/admin/StatusMark';
import { NowServingPanel } from './NowServingPanel';
import { BreakPanel } from './BreakPanel';
import { BreakPicker } from './BreakPicker';
import { QueueTable } from './QueueTable';
import { SeenList } from './SeenList';
import { ACTIVE_STATUSES, DONE_STATUSES, byNumber, pickCurrent } from './queueUtils';

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-mq-subtle">{label}</dt>
      <dd className={cn(MONO, 'mt-1 text-2xl font-medium tabular-nums text-mq-ink')}>{value}</dd>
    </div>
  );
}

type DoctorQueueViewProps = { session: QueueSession; accessToken: string | null };

/** The doctor's console for one open queue: now serving, figures, break control, then the queue itself. */
export function DoctorQueueView({ session, accessToken }: DoctorQueueViewProps) {
  const { data: tokens, isLoading } = useSessionTokens(session.id);
  const closeSession = useCloseSession();
  useQueueSocket(session.id, accessToken);

  const list = tokens ?? [];
  const active = list.filter((t) => ACTIVE_STATUSES.includes(t.status)).sort(byNumber);
  const done = list.filter((t) => DONE_STATUSES.includes(t.status)).sort((a, b) => byNumber(b, a));
  const onBreak = session.status === 'break';
  const current = pickCurrent(active, session.current_token);
  // On break the console shows the timer, so the called patient stays visible in the table
  const upNext = onBreak ? active : active.filter((t) => t.id !== current?.id);
  const next = upNext.find((t) => t.status === 'waiting');

  // Counts from the live token list when loaded; the session summary until then
  const count = (s: string) => list.filter((t) => t.status === s).length;
  const waiting = tokens ? count('waiting') : session.waiting_count;
  const seen = tokens ? count('completed') : session.completed_count;
  const skipped = tokens ? count('skipped') : session.skipped_count;

  return (
    <div className="space-y-6">
      <section className="border border-mq-ink bg-white" aria-label={`Queue for Dr. ${session.doctor_name}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mq-line px-4 py-3">
          <p className="truncate text-sm font-medium text-mq-ink">
            {session.department_name || 'General'} — Dr. {session.doctor_name}
          </p>
          <div className="flex items-center gap-6">
            <StatusMark tone={onBreak ? 'muted' : 'accent'} label={onBreak ? 'On break' : 'Open'} dot />
            <ConfirmAction label="Close queue" confirmLabel="Close for today"
              onConfirm={() => closeSession.mutate(session.id)} pending={closeSession.isPending} />
          </div>
        </div>

        <div className="grid md:grid-cols-12">
          <div className="p-6 md:col-span-8 md:p-8" aria-live="polite">
            {onBreak ? <BreakPanel session={session} /> : <NowServingPanel session={session} current={current} next={next} />}
          </div>
          <div className="border-t border-mq-line md:col-span-4 md:border-l md:border-t-0">
            <dl className="grid grid-cols-2 gap-px border-b border-mq-line bg-mq-line">
              <Figure label="Waiting" value={waiting} />
              <Figure label="Seen" value={seen} />
              <Figure label="Skipped" value={skipped} />
              <Figure label="Issued" value={`${session.active_issued ?? session.total_issued}/${session.max_tokens}`} />
            </dl>
            <div className="p-4 md:p-6">
              {onBreak ? (
                <p className="text-sm text-pretty text-mq-muted">Reception can still give tokens while you are on break.</p>
              ) : (
                <BreakPicker session={session} />
              )}
            </div>
          </div>
        </div>
      </section>

      <QueueTable tokens={upNext} sessionId={session.id} loading={isLoading} />
      {done.length > 0 && <SeenList tokens={done} />}
    </div>
  );
}
