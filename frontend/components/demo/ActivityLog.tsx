import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { formatClockTime, type DemoState } from './demoStore';

/** What just happened, newest first: the events that the real app sends over its live socket. */
export function ActivityLog({ state }: { state: DemoState }) {
  const rows = state.log.slice(0, 10);

  return (
    <section aria-labelledby="demo-activity" className="border border-mq-line bg-white">
      <div className="flex h-12 items-center justify-between gap-4 border-b border-mq-line px-4">
        <h2 id="demo-activity" className="text-sm font-medium text-mq-ink">What just happened</h2>
        <span className={cn(MONO, 'text-xs text-mq-subtle')}>{state.log.length} events</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">Nothing yet. Give a token at the reception desk to start.</p>
      ) : (
        <ol aria-live="polite">
          {rows.map((r, i) => (
            <li key={r.id}
              className={cn(
                'grid grid-cols-[56px_1fr] gap-x-4 border-b border-mq-line px-4 py-3 last:border-b-0 sm:grid-cols-[64px_96px_1fr] sm:items-baseline',
                i === 0 && 'bg-mq-tint',
              )}>
              <span className={cn(MONO, 'text-xs tabular-nums text-mq-subtle')}>{formatClockTime(r.at)}</span>
              <span className={cn('text-xs', r.actor === 'System' ? 'text-mq-accent' : 'text-mq-muted')}>{r.actor}</span>
              <span className="col-span-2 mt-1 text-sm text-pretty text-mq-ink sm:col-span-1 sm:mt-0">{r.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
