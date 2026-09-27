'use client';

import { useState } from 'react';
import { useStartBreak, type QueueSession } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE } from '@/components/shared/primitives';

const OPTIONS = [5, 10, 15, 20, 30, 60];

/** Pick a break length and start it. Patients see the resume time on their queue page. */
export function BreakPicker({ session }: { session: QueueSession }) {
  const [minutes, setMinutes] = useState(10);
  const startBreak = useStartBreak(session.id);

  return (
    <fieldset>
      <legend className="text-sm font-medium text-mq-ink">Take a break</legend>
      <p className="mt-1 text-xs text-mq-subtle">Patients see when the queue resumes.</p>
      <div className="mt-4 grid grid-cols-3 gap-px border border-mq-line bg-mq-line">
        {OPTIONS.map((m) => (
          <label key={m} className="relative">
            <input type="radio" name={`break-${session.id}`} value={m} checked={minutes === m}
              onChange={() => setMinutes(m)} className="peer sr-only" />
            <span className={cn(
              'flex h-10 cursor-pointer items-center justify-center bg-white font-mono text-sm tabular-nums text-mq-ink',
              'transition-colors duration-500 hover:bg-mq-tint peer-checked:bg-mq-ink peer-checked:text-white',
              'peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-mq-accent',
              EASE,
            )}>
              {m} min
            </span>
          </label>
        ))}
      </div>
      <button type="button" onClick={() => startBreak.mutate(minutes)}
        disabled={startBreak.isPending || session.status !== 'open'} aria-busy={startBreak.isPending}
        className={buttonClasses('secondary', 'sm', 'mt-4 w-full')}>
        {startBreak.isPending ? 'Starting…' : `Start ${minutes} min break`}
      </button>
    </fieldset>
  );
}
