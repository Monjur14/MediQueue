import type { LiveSession } from '@/hooks/api/clinics';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';

/** Column layout shared by the header row and each session row (md and up). */
export const SESSION_COLS = 'md:grid md:grid-cols-[1fr_112px_96px_80px_80px] md:items-center md:gap-4';

type StatProps = { label: string; value: string | number; strong?: boolean };

function Stat({ label, value, strong }: StatProps) {
  return (
    <div className="md:text-right">
      <span className="block text-xs text-mq-subtle md:hidden">{label}</span>
      <span className={cn(MONO, 'mt-1 block text-sm tabular-nums md:mt-0', strong ? 'font-medium text-mq-ink' : 'text-mq-muted')}>
        {value}
      </span>
    </div>
  );
}

/** One doctor's live session: who is being served and how busy it is. */
export function SessionRow({ session }: { session: LiveSession }) {
  const onBreak = session.status === 'break';

  return (
    <li className={cn(SESSION_COLS, 'space-y-3 border-b border-mq-line px-4 py-4 last:border-b-0 md:space-y-0')}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-mq-ink">Dr. {session.doctor_name}</p>
        {session.department_name && <p className="mt-1 truncate text-xs text-mq-muted">{session.department_name}</p>}
      </div>
      <p className="flex items-center gap-2 text-sm">
        <span className={cn('h-2 w-2 shrink-0', onBreak ? 'bg-mq-subtle' : 'bg-mq-accent')} />
        <span className={onBreak ? 'text-mq-muted' : 'font-medium text-mq-accent'}>{onBreak ? 'On break' : 'Open'}</span>
      </p>
      <div className="grid grid-cols-3 gap-4 md:contents">
        <Stat label="Now serving" value={`#${session.current_token}`} strong />
        <Stat label="Waiting" value={session.waiting_count} strong />
        <Stat label="Issued" value={session.active_issued ?? session.total_issued} />
      </div>
    </li>
  );
}
