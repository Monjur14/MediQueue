'use client';

import { useState } from 'react';
import { BellRing, CircleAlert, Coffee, DoorClosed, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MyActiveToken } from '@/hooks/api/queue';
import { useCancelMyToken } from '@/hooks/api/queue';
import { cn, formatTime, formatWait } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { AheadSquares } from './AheadSquares';

type Props = { token: MyActiveToken };

const SESSION_LABEL: Record<MyActiveToken['session_status'], string> = {
  open: 'Queue open',
  break: 'On break',
  closed: 'Closed',
};

function resumeTime(token: MyActiveToken): string | null {
  if (!token.break_started_at || !token.break_expected_duration) return null;
  const at = new Date(token.break_started_at).getTime() + token.break_expected_duration * 60_000;
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Top banner for moments that need the patient to act or wait. */
function Banner({ token }: Props) {
  if (token.status === 'called') {
    return (
      <div role="alert" className="flex items-start gap-3 bg-mq-accent px-4 py-4 text-white">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <p className="text-base font-medium">It&apos;s your turn. Please go to Dr. {token.doctor_name} now.</p>
      </div>
    );
  }
  if (token.status === 'skipped') {
    return (
      <div role="alert" className="flex items-start gap-3 border-b border-mq-line px-4 py-4 text-mq-danger">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <p className="text-sm">You missed your turn and were skipped. Please speak to the reception.</p>
      </div>
    );
  }
  if (token.session_status === 'break') {
    const resume = resumeTime(token);
    return (
      <div role="status" className="flex items-start gap-3 border-b border-mq-line bg-mq-tint px-4 py-4 text-mq-ink">
        <Coffee className="mt-0.5 h-5 w-5 shrink-0 text-mq-accent" strokeWidth={1.75} />
        <p className="text-sm">
          Dr. {token.doctor_name} is on a short break.{resume ? ` The queue resumes at ${resume}.` : ''}
        </p>
      </div>
    );
  }
  if (token.session_status === 'closed') {
    return (
      <div role="status" className="flex items-start gap-3 border-b border-mq-line px-4 py-4 text-mq-muted">
        <DoorClosed className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <p className="text-sm">The clinic has closed today&apos;s queue.</p>
      </div>
    );
  }
  return null;
}

/** The right-hand figure: how close the patient is to being seen. */
function Position({ token }: Props) {
  if (token.status === 'called') return <Figure label="Status" value="Your turn" />;
  if (token.status === 'in_consultation') return <Figure label="Status" value="With the doctor" />;
  if (token.status === 'completed') return <Figure label="Status" value="Visit complete" muted />;
  if (token.status === 'skipped') return <Figure label="Status" value="Skipped" muted />;
  if (token.status === 'cancelled') return <Figure label="Status" value="Cancelled" muted />;

  const next = token.patients_ahead === 0;
  return (
    <div>
      <Figure label="Your place" value={next ? 'You\u2019re next' : String(token.patients_ahead)} suffix={next ? undefined : 'ahead of you'} />
      <AheadSquares ahead={token.patients_ahead} />
    </div>
  );
}

type FigureProps = { label: string; value: string; suffix?: string; muted?: boolean };

function Figure({ label, value, suffix, muted }: FigureProps) {
  return (
    <div>
      <p className="text-xs text-mq-subtle">{label}</p>
      <p className={cn('mt-2 text-4xl font-medium tracking-tight md:text-5xl', muted ? 'text-mq-muted' : 'text-mq-ink')}>
        {value}
      </p>
      {suffix && <p className="mt-1 text-sm text-mq-muted">{suffix}</p>}
    </div>
  );
}

/** Inline cancel button with a two-step confirm so patients don't cancel by accident. */
function CancelButton({ tokenId }: { tokenId: string }) {
  const [confirming, setConfirming] = useState(false);
  const cancelMutation = useCancelMyToken();
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(tokenId);
      toast.success('Your token has been cancelled.');
      // Clear the active token from cache so the page shows "no token today"
      queryClient.setQueryData(['queue', 'my-active-token'], null);
    } catch {
      // error toast handled in the hook
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-mq-ink">Cancel your spot?</p>
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className="text-sm font-medium text-mq-danger underline-offset-2 hover:underline disabled:opacity-50"
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-mq-muted underline-offset-2 hover:underline"
        >
          Keep my spot
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-sm text-mq-muted underline-offset-2 hover:text-mq-danger hover:underline"
    >
      <X className="h-3.5 w-3.5" strokeWidth={2} />
      Cancel my token
    </button>
  );
}

export function ActiveTokenPanel({ token }: Props) {
  const waiting = token.status === 'waiting';

  return (
    <section
      aria-label="Your token"
      className={cn('border bg-white', token.status === 'called' ? 'border-mq-accent' : 'border-mq-ink')}
    >
      <Banner token={token} />

      <div className="flex h-12 items-center justify-between gap-4 border-b border-mq-line px-4">
        <p className="truncate text-sm font-medium text-mq-ink">
          {token.department_name} — Dr. {token.doctor_name}
        </p>
        <p className={cn(MONO, 'flex shrink-0 items-center gap-2 text-xs text-mq-muted')}>
          <span className={cn('h-2 w-2', token.session_status === 'open' ? 'bg-mq-accent' : 'bg-mq-subtle')} />
          {SESSION_LABEL[token.session_status]}
        </p>
      </div>

      <div className="grid gap-8 p-6 sm:grid-cols-2 md:p-8">
        <div>
          <p className="text-xs text-mq-subtle">Your token</p>
          <p className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight text-mq-ink md:text-6xl')}>
            #{token.my_token}
          </p>
          <p className={cn(MONO, 'mt-2 text-sm text-mq-muted')}>Now serving #{token.current_token}</p>
        </div>
        <Position token={token} />
      </div>

      {waiting && token.eta_minutes !== undefined && (
        <div className="flex items-baseline justify-between border-t border-mq-line px-6 py-4 text-sm md:px-8">
          <span className="text-mq-muted">Estimated wait</span>
          <span className="font-medium tabular-nums text-mq-ink">≈ {formatWait(token.eta_minutes)}</span>
        </div>
      )}

      <dl className="grid border-t border-mq-line text-sm sm:grid-cols-2">
        <div className="border-b border-mq-line px-6 py-4 sm:border-b-0 sm:border-r md:px-8">
          <dt className="text-xs text-mq-subtle">Clinic</dt>
          <dd className="mt-1 text-mq-ink">{token.clinic_name}</dd>
        </div>
        <div className="px-6 py-4 md:px-8">
          <dt className="text-xs text-mq-subtle">Token issued</dt>
          <dd className={cn(MONO, 'mt-1 text-mq-ink')}>{formatTime(token.created_at)}</dd>
        </div>
      </dl>

      {waiting && (
        <div className="border-t border-mq-line px-6 py-4 md:px-8">
          <CancelButton tokenId={token.id} />
        </div>
      )}
    </section>
  );
}
