'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

type ConfirmActionProps = {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
};

const TEXT_BTN = cn('text-sm transition-colors duration-500 disabled:opacity-40', EASE);

/** Destructive text action that asks for a second click before running. */
export function ConfirmAction({ label, confirmLabel, onConfirm, pending }: ConfirmActionProps) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={cn(TEXT_BTN, 'text-mq-muted hover:text-mq-danger')}>
        {label}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3" role="group" aria-label={confirmLabel}>
      <button type="button" disabled={pending}
        onClick={() => { onConfirm(); setAsking(false); }}
        className={cn(TEXT_BTN, 'font-medium text-mq-danger')}>
        {pending ? 'Working…' : confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={cn(TEXT_BTN, 'text-mq-muted hover:text-mq-ink')}>
        Cancel
      </button>
    </span>
  );
}
