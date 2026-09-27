'use client';

import { useCloseSession, useSessionTokens, type QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { ButtonLink, MONO } from '@/components/shared/primitives';
import { ConfirmAction } from '../ConfirmAction';
import { StatusMark, TOKEN_STATUS } from '../StatusMark';

const ACTIVE = ['waiting', 'called', 'in_consultation'];
const COLS = 'grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 sm:grid-cols-[64px_1fr_160px_112px]';

/** One open queue: who's being served, the live token list and the queue actions. */
export function ActiveSessionPanel({ session }: { session: QueueSession }) {
  const { data: tokens } = useSessionTokens(session.id);
  const closeSession = useCloseSession();
  const onBreak = session.status === 'break';
  const active = tokens?.filter((t) => ACTIVE.includes(t.status)) ?? [];

  return (
    <section className="border border-mq-ink bg-white" aria-label={`Queue for Dr. ${session.doctor_name}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mq-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-mq-ink">
            {session.department_name || 'General'} — Dr. {session.doctor_name}
          </p>
          <p className={cn(MONO, 'mt-1 text-xs text-mq-muted')}>
            Serving #{session.current_token} · {session.waiting_count} waiting · {session.completed_count} seen
          </p>
        </div>
        <div className="flex items-center gap-6">
          <StatusMark tone={onBreak ? 'muted' : 'accent'} label={onBreak ? 'On break' : 'Open'} dot />
          <ConfirmAction label="Close queue" confirmLabel="Close for today"
            onConfirm={() => closeSession.mutate(session.id)} pending={closeSession.isPending} />
          <ButtonLink href={`/doctor?session=${session.id}`} variant="secondary" size="sm">Manage queue</ButtonLink>
        </div>
      </div>

      {active.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">No one waiting in this queue.</p>
      ) : (
        <div>
          <div className={cn(COLS, MONO, 'h-10 border-b border-mq-line text-xs uppercase tracking-wider text-mq-subtle')}>
            <span>Token</span><span>Patient</span><span className="hidden sm:block">Phone</span><span>Status</span>
          </div>
          <ul>
            {active.map((t) => {
              const status = TOKEN_STATUS[t.status] ?? { tone: 'muted' as const, label: t.status };
              return (
                <li key={t.id} className={cn(COLS, 'h-12 border-b border-mq-line last:border-b-0', t.status === 'called' && 'bg-mq-tint')}>
                  <span className={cn(MONO, 'text-sm text-mq-ink')}>#{t.token_number}</span>
                  <span className="truncate text-sm text-mq-ink">{t.patient_name}</span>
                  <span className={cn(MONO, 'hidden truncate text-xs text-mq-muted sm:block')}>{t.patient_phone}</span>
                  <StatusMark {...status} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
