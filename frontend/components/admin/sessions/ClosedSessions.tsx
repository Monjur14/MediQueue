import type { QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';

const COLS = 'md:grid md:grid-cols-[1fr_72px_72px_72px_96px] md:items-center md:gap-4';

function Num({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="md:text-right">
      <span className="block text-xs text-mq-subtle md:hidden">{label}</span>
      <span className={cn(MONO, 'mt-1 block text-sm tabular-nums text-mq-ink md:mt-0')}>{value}</span>
    </div>
  );
}

/** Summary of queues already closed today. */
export function ClosedSessions({ sessions }: { sessions: QueueSession[] }) {
  return (
    <section>
      <h3 className="text-base font-medium text-mq-ink">Closed today</h3>
      <div className="mt-4 border border-mq-line bg-white">
        <div className={cn(COLS, MONO, 'hidden h-10 border-b border-mq-line px-4 text-xs uppercase tracking-wider text-mq-subtle md:grid')}>
          <span>Queue</span><span className="text-right">Issued</span><span className="text-right">Seen</span>
          <span className="text-right">Skipped</span><span className="text-right">Completed</span>
        </div>
        <ul>
          {sessions.map((s) => (
            <li key={s.id} className={cn(COLS, 'space-y-3 border-b border-mq-line px-4 py-4 last:border-b-0 md:space-y-0')}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mq-ink">Dr. {s.doctor_name}</p>
                <p className="mt-1 truncate text-xs text-mq-muted">{s.department_name || 'General'} · capacity {s.max_tokens}</p>
              </div>
              <div className="grid grid-cols-4 gap-4 md:contents">
                <Num label="Issued" value={s.total_issued} />
                <Num label="Seen" value={s.completed_count} />
                <Num label="Skipped" value={s.skipped_count} />
                <Num label="Completed" value={s.total_issued > 0 ? `${Math.round((s.completed_count / s.total_issued) * 100)}%` : '—'} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
