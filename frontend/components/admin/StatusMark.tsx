import { cn } from '@/lib/utils';

export type StatusTone = 'accent' | 'ink' | 'muted' | 'subtle' | 'danger' | 'struck';

const TEXT: Record<StatusTone, string> = {
  accent: 'font-medium text-mq-accent',
  ink: 'font-medium text-mq-ink',
  muted: 'text-mq-muted',
  subtle: 'text-mq-subtle',
  danger: 'text-mq-danger',
  struck: 'text-mq-muted line-through',
};

/** Status as text plus an optional 6px square (DESIGN.md §6 Queue status). No coloured pills. */
export function StatusMark({ tone, label, dot }: { tone: StatusTone; label: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', TEXT[tone])}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0', tone === 'accent' ? 'bg-mq-accent' : 'bg-mq-subtle')} />}
      {label}
    </span>
  );
}

/** Token statuses from DESIGN.md. */
export const TOKEN_STATUS: Record<string, { tone: StatusTone; label: string; dot?: boolean }> = {
  waiting: { tone: 'subtle', label: 'Waiting' },
  called: { tone: 'ink', label: 'Called' },
  in_consultation: { tone: 'accent', label: 'In room', dot: true },
  completed: { tone: 'muted', label: 'Seen' },
  skipped: { tone: 'struck', label: 'Skipped' },
};
