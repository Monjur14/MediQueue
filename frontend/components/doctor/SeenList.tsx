'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SessionToken } from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';
import { StatusMark, TOKEN_STATUS } from '@/components/admin/StatusMark';

/** Collapsed list of patients already seen or skipped today, newest first. */
export function SeenList({ tokens }: { tokens: SessionToken[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border border-mq-line bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="seen-today"
        className={cn('flex h-12 w-full items-center justify-between px-4 text-left transition-colors duration-500 hover:bg-mq-ground', EASE)}>
        <span className="text-sm font-medium text-mq-ink">
          Seen today <span className={cn(MONO, 'ml-2 text-xs font-normal text-mq-subtle')}>{tokens.length}</span>
        </span>
        <ChevronDown strokeWidth={1.5}
          className={cn('h-4 w-4 text-mq-subtle transition-transform duration-500 motion-reduce:transition-none', EASE, open && 'rotate-180')} />
      </button>
      {open && (
        <ul id="seen-today" className="border-t border-mq-line">
          {tokens.map((t) => {
            const status = TOKEN_STATUS[t.status] ?? { tone: 'muted' as const, label: t.status };
            return (
              <li key={t.id} className="grid h-12 grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-mq-line px-4 last:border-b-0 sm:grid-cols-[64px_1fr_auto]">
                <span className={cn(MONO, 'text-sm tabular-nums text-mq-muted')}>#{t.token_number}</span>
                <span className="truncate text-sm text-mq-muted">{t.patient_name}</span>
                <StatusMark {...status} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
