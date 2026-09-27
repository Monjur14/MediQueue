'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { BellRing, Footprints, Lock, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, buttonClasses } from '@/components/shared/primitives';

type PushPermissionDialogProps = {
  open: boolean;
  busy: boolean;
  onAllow: () => void;
  onDismiss: () => void;
};

const BENEFITS = [
  { icon: BellRing, title: 'Alert at 3 ahead', text: 'A heads-up when 3 patients are left before you' },
  { icon: Footprints, title: 'Wait anywhere', text: 'Step outside or grab a tea without losing your turn' },
  { icon: Lock, title: 'Works when closed', text: 'Arrives even if MediQueue is closed or your screen is locked' },
];

const ICON = { className: 'h-4 w-4 shrink-0 text-mq-accent', strokeWidth: 1.5 };

/** Explains the benefit before the browser's own permission prompt, which can only be answered once. */
export function PushPermissionDialog({ open, busy, onAllow, onDismiss }: PushPermissionDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !busy && onDismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn('fixed inset-0 z-50 bg-mq-ink/40 transition-opacity duration-500 starting:opacity-0', EASE)} />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'overflow-y-auto border border-mq-ink bg-white font-sans focus:outline-none',
            'transition-all duration-500 starting:scale-95 starting:opacity-0',
            EASE,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-mq-line px-6 py-4">
            <div className="flex gap-3">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-mq-accent" strokeWidth={1.5} />
              <div>
                <Dialog.Title className="text-base font-medium text-mq-ink">Get notified when your token is near</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-pretty text-mq-muted">
                  No need to watch the screen. We will tell you when it is time to head back.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close" disabled={busy} className="p-1 text-mq-subtle transition-colors hover:text-mq-ink">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            <ul className="grid gap-px border border-mq-line bg-mq-line sm:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 bg-white p-4 sm:flex-col sm:gap-2">
                  <Icon {...ICON} className={cn(ICON.className, 'mt-0.5 sm:mt-0')} />
                  <div>
                    <p className="text-sm font-medium text-mq-ink">{title}</p>
                    <p className="mt-0.5 text-xs text-pretty text-mq-subtle">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-3">
              <ShieldCheck {...ICON} className={cn(ICON.className, 'mt-0.5')} />
              <p className="text-sm text-pretty text-mq-muted">
                <span className="font-medium text-mq-ink">Only about your queue.</span> No ads or marketing, and you can
                turn alerts off any time from the My queue page.
              </p>
            </div>

            <p className="border-t border-mq-line pt-4 text-xs text-mq-subtle">
              Next, your browser asks to show notifications. Choose <span className="text-mq-ink">Allow</span>.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-mq-line px-6 py-4 sm:flex-row sm:justify-end">
            <Dialog.Close disabled={busy} className={buttonClasses('secondary', 'sm')}>
              Not now
            </Dialog.Close>
            <button type="button" onClick={onAllow} disabled={busy} aria-busy={busy} className={buttonClasses('primary', 'sm')}>
              {busy ? 'Waiting for your answer…' : 'Allow notifications'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
