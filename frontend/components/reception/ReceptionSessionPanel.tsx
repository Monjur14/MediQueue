'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useQueueSocket } from '@/hooks/useQueueSocket';
import { useSessionTokens, useRemoveToken, type SessionToken, type QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { StatusMark, TOKEN_STATUS } from '@/components/admin/StatusMark';
import { GiveTokenForm } from './GiveTokenForm';

const ACTIVE = ['waiting', 'called', 'in_consultation'];
const COLS = 'grid grid-cols-[56px_1fr_auto_auto] items-center gap-3 px-4 sm:grid-cols-[64px_1fr_160px_100px_auto]';

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-mq-subtle">{label}</dt>
      <dd className={cn(MONO, 'mt-1 text-2xl font-medium tabular-nums text-mq-ink')}>{value}</dd>
    </div>
  );
}

/** Inline remove button — two-step confirm so staff don't mis-click. */
function RemoveButton({ token, sessionId }: { token: SessionToken; sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const removeMutation = useRemoveToken();

  // Only removable while patient hasn't been seen
  const removable = token.status === 'waiting' || token.status === 'called';
  if (!removable) return <span className="w-8" />;

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => {
            removeMutation.mutate({ tokenId: token.id, sessionId });
            setConfirming(false);
          }}
          disabled={removeMutation.isPending}
          className="flex h-7 w-7 items-center justify-center rounded text-mq-danger hover:bg-red-50 disabled:opacity-40"
          title="Yes, remove"
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex h-7 w-7 items-center justify-center rounded text-mq-muted hover:bg-mq-tint"
          title="Keep in queue"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex h-7 w-7 items-center justify-center text-mq-subtle transition-colors hover:text-mq-danger"
      title="Remove from queue"
      aria-label={`Remove ${token.patient_name} from queue`}
    >
      <X className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

/** One open queue at the front desk: live numbers, the give token form and who is waiting. */
export function ReceptionSessionPanel({ session, accessToken }: { session: QueueSession; accessToken: string | null }) {
  const { data: tokens } = useSessionTokens(session.id);
  useQueueSocket(session.id, accessToken);

  const onBreak = session.status === 'break';
  const active = tokens?.filter((t) => ACTIVE.includes(t.status)) ?? [];

  return (
    <section className="border border-mq-ink bg-white" aria-label={`Queue for Dr. ${session.doctor_name}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mq-line px-4 py-3">
        <p className="truncate text-sm font-medium text-mq-ink">
          {session.department_name || 'General'} — Dr. {session.doctor_name}
        </p>
        <StatusMark tone={onBreak ? 'muted' : 'accent'} label={onBreak ? 'On break' : 'Open'} dot />
      </div>

      <div className="grid gap-8 border-b border-mq-line p-4 md:grid-cols-[1fr_auto] md:p-6">
        <GiveTokenForm sessionId={session.id} />
        <dl className="grid grid-cols-3 gap-6 md:w-72">
          <Figure label="Serving" value={`#${session.current_token}`} />
          <Figure label="Waiting" value={session.waiting_count} />
          <Figure label="Issued" value={`${session.active_issued ?? session.total_issued}/${session.max_tokens}`} />
        </dl>
      </div>

      {active.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">No one is waiting yet. Tokens you give appear here.</p>
      ) : (
        <div>
          <div className={cn(COLS, MONO, 'h-10 border-b border-mq-line text-xs uppercase tracking-wider text-mq-subtle')}>
            <span>Token</span>
            <span>Patient</span>
            <span className="hidden sm:block">Phone</span>
            <span>Status</span>
            <span />
          </div>
          <ul>
            {active.map((t) => {
              const status = TOKEN_STATUS[t.status] ?? { tone: 'muted' as const, label: t.status };
              return (
                <li
                  key={t.id}
                  className={cn(
                    COLS,
                    'min-h-12 border-b border-mq-line py-2 last:border-b-0',
                    t.status === 'called' && 'bg-mq-tint'
                  )}
                >
                  <span className={cn(MONO, 'text-sm text-mq-ink')}>#{t.token_number}</span>
                  <span className="truncate text-sm text-mq-ink">{t.patient_name}</span>
                  <span className={cn(MONO, 'hidden truncate text-xs text-mq-muted sm:block')}>{t.patient_phone}</span>
                  <StatusMark {...status} />
                  <RemoveButton token={t} sessionId={session.id} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
