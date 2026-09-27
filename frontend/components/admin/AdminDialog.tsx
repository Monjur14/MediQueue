'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

type AdminDialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Square, hairline modal on Radix Dialog: focus trap, Esc to close, labelled for screen readers. */
export function AdminDialog({ title, description, onClose, children }: AdminDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-mq-ink/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-mq-ink bg-white font-sans focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-mq-line px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-medium text-mq-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-mq-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close aria-label="Close" className="p-1 text-mq-subtle transition-colors hover:text-mq-ink">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="space-y-6 p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Cancel + primary action row used at the bottom of every admin dialog. */
export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col-reverse gap-3 border-t border-mq-line pt-6 sm:flex-row sm:justify-end">{children}</div>;
}
