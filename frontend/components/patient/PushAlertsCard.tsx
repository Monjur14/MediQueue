'use client';

import { Bell, BellOff, BellRing } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { buttonClasses } from '@/components/shared/primitives';
import type { PushStatus } from '@/hooks/usePushNotifications';

type Copy = { icon: LucideIcon; title: string; text: string };

const COPY: Partial<Record<PushStatus, Copy>> = {
  off: {
    icon: Bell,
    title: 'Get notified when your token is near',
    text: 'We notify this device when 3 patients are ahead of you, even if MediQueue is closed.',
  },
  on: {
    icon: BellRing,
    title: 'Alerts are on',
    text: 'We will notify this device when 3 patients are ahead of you.',
  },
  denied: {
    icon: BellOff,
    title: 'Notifications are blocked',
    text: 'Allow notifications for MediQueue in your browser settings to get alerts.',
  },
  'needs-install': {
    icon: Bell,
    title: 'Get an alert when you are close',
    text: 'On iPhone, tap Install app at the top to add MediQueue to your Home Screen, then turn on alerts here.',
  },
};

type PushAlertsCardProps = {
  status: PushStatus;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

/** Opt-in for the "3 patients ahead" push alert. Hidden where the browser can't show notifications. */
export function PushAlertsCard({ status, busy, enable, disable }: PushAlertsCardProps) {
  const copy = COPY[status];
  if (!copy) return null;
  const Icon = copy.icon;

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-4 border border-mq-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mq-accent" strokeWidth={1.5} />
        <div>
          <h2 className="text-sm font-medium text-mq-ink">{copy.title}</h2>
          <p className="mt-1 max-w-[52ch] text-sm text-pretty text-mq-muted">{copy.text}</p>
        </div>
      </div>

      {status === 'off' && (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy}
          aria-busy={busy}
          className={buttonClasses('primary', 'sm', 'shrink-0')}
        >
          {busy ? 'Turning on…' : 'Turn on alerts'}
        </button>
      )}
      {status === 'on' && (
        <button
          type="button"
          onClick={() => void disable()}
          disabled={busy}
          aria-busy={busy}
          className={buttonClasses('secondary', 'sm', 'shrink-0')}
        >
          {busy ? 'Turning off…' : 'Turn off'}
        </button>
      )}
    </section>
  );
}
