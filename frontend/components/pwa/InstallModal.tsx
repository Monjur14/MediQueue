'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Maximize2, Share, ShieldCheck, Smartphone, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, buttonClasses } from '@/components/shared/primitives';

export type InstallPlatform = 'ios' | 'android' | 'desktop';

type InstallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
  canPrompt: boolean;
  onInstall: () => void;
};

const BENEFITS = [
  { icon: Zap, title: 'One tap', text: 'Opens from your home screen' },
  { icon: Maximize2, title: 'Full screen', text: 'No browser bars in the way' },
  { icon: Smartphone, title: 'No app store', text: 'Nothing extra to download' },
];

const ICON = { className: 'h-4 w-4 shrink-0 text-mq-accent', strokeWidth: 1.5 };

function Benefits() {
  return (
    <ul className="grid gap-px border border-mq-line bg-mq-line sm:grid-cols-3">
      {BENEFITS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-3 bg-white p-4 sm:flex-col sm:gap-2">
          <Icon {...ICON} className={cn(ICON.className, 'mt-0.5 sm:mt-0')} />
          <div>
            <p className="text-sm font-medium text-mq-ink">{title}</p>
            <p className="mt-0.5 text-xs text-mq-subtle">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function IosSteps() {
  const steps: React.ReactNode[] = [
    'Open this page in Safari',
    <>Tap <Share className="mx-0.5 inline h-4 w-4 align-text-bottom text-mq-ink" strokeWidth={1.5} /> Share in the toolbar</>,
    <>Choose <span className="text-mq-ink">Add to Home Screen</span></>,
    <>Tap <span className="text-mq-ink">Add</span></>,
  ];
  return (
    <div>
      <p className="text-xs text-mq-subtle">On iPhone or iPad</p>
      <ol className="mt-2 border-t border-mq-line">
        {steps.map((step, i) => (
          <li key={i} className="flex items-baseline gap-4 border-b border-mq-line py-3 text-sm text-mq-muted">
            <span className="font-mono text-xs tabular-nums text-mq-accent">{String(i + 1).padStart(2, '0')}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SafetyNote() {
  return (
    <div className="flex gap-3">
      <ShieldCheck {...ICON} className={cn(ICON.className, 'mt-0.5')} />
      <div>
        <p className="text-sm font-medium text-mq-ink">Safe to install</p>
        <p className="mt-1 text-sm text-mq-muted">
          No extra permissions — no camera, contacts or location. It uses the same secure connection as this
          site, and you can remove it any time.
        </p>
      </div>
    </div>
  );
}

/** Centered install dialog. Portalled to <body> so sticky headers with backdrop-blur can't trap it. */
export function InstallModal({ open, onOpenChange, platform, canPrompt, onInstall }: InstallModalProps) {
  const isIos = platform === 'ios';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn('fixed inset-0 z-50 bg-mq-ink/40 transition-opacity duration-500 starting:opacity-0', EASE)}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'overflow-y-auto border border-mq-ink bg-white font-sans focus:outline-none',
            'transition-all duration-500 starting:scale-95 starting:opacity-0',
            EASE,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-mq-line px-6 py-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="h-10 w-10" />
              <div>
                <Dialog.Title className="text-base font-medium text-mq-ink">Install MediQueue</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-mq-muted">
                  Add it to your home screen. Free, no app store.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close" className="p-1 text-mq-subtle transition-colors hover:text-mq-ink">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            <Benefits />
            {isIos && <IosSteps />}
            {!isIos && !canPrompt && (
              <p className="text-sm text-mq-muted">
                Open your browser menu and choose <span className="text-mq-ink">Install app</span> or{' '}
                <span className="text-mq-ink">Add to Home screen</span>.
              </p>
            )}
            <SafetyNote />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-mq-line px-6 py-4 sm:flex-row sm:justify-end">
            <Dialog.Close className={buttonClasses('secondary', 'sm')}>{isIos || !canPrompt ? 'Close' : 'Not now'}</Dialog.Close>
            {!isIos && canPrompt && (
              <button type="button" onClick={onInstall} className={buttonClasses('primary', 'sm')}>
                Install app
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
