'use client';

import { useCompleteToken, useSkipToken, type SessionToken } from '@/hooks/api/doctor';
import { useReadmitToken } from '@/hooks/api/queue';
import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';
import { StatusMark, TOKEN_STATUS } from '@/components/admin/StatusMark';

const COLS = 'grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 sm:grid-cols-[64px_1fr_160px_104px_140px]';
const TEXT_BTN = cn('px-1 py-1 text-sm transition-colors duration-500 disabled:opacity-40', EASE);

function TokenRow({ token, sessionId }: { token: SessionToken; sessionId: string }) {
  const complete  = useCompleteToken(sessionId);
  const skip      = useSkipToken(sessionId);
  const readmit   = useReadmitToken(sessionId);
  const busy      = complete.isPending || skip.isPending || readmit.isPending;
  const status    = TOKEN_STATUS[token.status] ?? { tone: 'muted' as const, label: token.status };
  const isSkipped = token.status === 'skipped';

  return (
    <li className={cn(
      COLS,
      'min-h-12 border-b border-mq-line py-2 last:border-b-0',
      token.status === 'called'  && 'bg-mq-tint',
      isSkipped                  && 'opacity-60',
    )}>
      <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>#{token.token_number}</span>

      <div className="min-w-0">
        <p className="truncate text-sm text-mq-ink">{token.patient_name}</p>
        <div className="sm:hidden"><StatusMark {...status} /></div>
      </div>

      <span className={cn(MONO, 'hidden truncate text-xs text-mq-muted sm:block')}>{token.patient_phone}</span>
      <span className="hidden sm:block"><StatusMark {...status} /></span>

      <div className="flex items-center justify-end gap-3">
        {isSkipped ? (
          /* ── Skipped row — show Re-admit instead of Seen / Skip ── */
          <button
            type="button"
            onClick={() => readmit.mutate(token.id)}
            disabled={busy}
            aria-label={`Re-admit #${token.token_number} to end of queue`}
            className={cn(TEXT_BTN, 'text-mq-accent hover:text-mq-ink')}
          >
            Re-admit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => complete.mutate(token.id)}
              disabled={busy}
              aria-label={`Mark #${token.token_number} seen`}
              className={cn(TEXT_BTN, 'text-mq-ink hover:text-mq-accent')}
            >
              Seen
            </button>
            <button
              type="button"
              onClick={() => skip.mutate(token.id)}
              disabled={busy}
              aria-label={`Skip #${token.token_number}`}
              className={cn(TEXT_BTN, 'text-mq-muted hover:text-mq-danger')}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </li>
  );
}

type QueueTableProps = { tokens: SessionToken[]; sessionId: string; loading?: boolean };

/** Everyone still in the queue — waiting + skipped (skipped shown dimmed with Re-admit). */
export function QueueTable({ tokens, sessionId, loading }: QueueTableProps) {
  const waiting = tokens.filter((t) => t.status === 'waiting').length;
  // Show waiting + skipped — skipped patients can still be re-admitted
  const visible = tokens.filter((t) => t.status === 'waiting' || t.status === 'skipped');

  return (
    <section className="border border-mq-line bg-white" aria-labelledby="up-next-title">
      <div className="flex h-12 items-center justify-between border-b border-mq-line px-4">
        <h2 id="up-next-title" className="text-sm font-medium text-mq-ink">Up next</h2>
        <span className={cn(MONO, 'text-xs text-mq-subtle')}>{waiting} waiting</span>
      </div>

      {loading ? (
        <div aria-busy="true" className="space-y-3 p-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse bg-mq-line" />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">No one else is in the queue.</p>
      ) : (
        <>
          <div className={cn(COLS, MONO, 'h-10 border-b border-mq-line text-xs uppercase tracking-wider text-mq-subtle')}>
            <span>Token</span><span>Patient</span>
            <span className="hidden sm:block">Phone</span>
            <span className="hidden sm:block">Status</span>
            <span className="text-right">Action</span>
          </div>
          <ul>
            {visible.map((t) => <TokenRow key={t.id} token={t} sessionId={sessionId} />)}
          </ul>
        </>
      )}
    </section>
  );
}
