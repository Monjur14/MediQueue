'use client';

import { useEffect, useRef, useState } from 'react';
import { BellRing, CircleAlert, CircleCheck, Coffee, X } from 'lucide-react';
import { AheadSquares } from '@/components/patient/AheadSquares';
import { EASE, MONO } from '@/components/shared/primitives';
import { cn, formatWait } from '@/lib/utils';
import {
  DEMO_CLINIC, DEMO_DEPARTMENT, DEMO_DOCTOR, currentToken, etaMinutes, formatClockTime, patientsAhead, youToken,
  type DemoAction, type DemoPush, type DemoState, type DemoToken,
} from './demoStore';

export type PatientTab = 'queue' | 'history';

type Props = {
  state: DemoState;
  now: number;
  tab: PatientTab;
  onTab: (tab: PatientTab) => void;
  onAction: (a: DemoAction) => void;
};

const PUSH_VISIBLE_MS = 7000;

/** A push notification as it lands on the lock screen, drawn in the product's own language. */
function PushBanner({ push, onDismiss }: { push: DemoPush; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);
  // The page re-renders every second; keep the latest callback without restarting the timer
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const timer = setTimeout(() => dismissRef.current(), PUSH_VISIBLE_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);

  return (
    <div
      role="status"
      className={cn(
        'absolute inset-x-2 top-14 z-10 bg-mq-ink p-3 text-white transition-all duration-500 motion-reduce:transition-none',
        EASE,
        shown ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      )}
    >
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-white" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className={cn(MONO, 'text-xs text-white/60')}>MediQueue · {formatClockTime(push.at)}</p>
          <p className="mt-1 text-sm font-medium">{push.title}</p>
          <p className="mt-1 text-xs text-pretty text-white/80">{push.body}</p>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="-m-1 p-1 text-white/60 hover:text-white">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function Banner({ state, you, now }: { state: DemoState; you: DemoToken; now: number }) {
  if (you.status === 'called') {
    return (
      <div role="alert" className="flex items-start gap-3 bg-mq-accent px-4 py-4 text-white">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <p className="text-base font-medium text-pretty">It&rsquo;s your turn. Please go to Dr. {DEMO_DOCTOR} now.</p>
      </div>
    );
  }
  if (you.status === 'completed') {
    return (
      <div role="status" className="flex items-start gap-3 border-b border-mq-line px-4 py-4 text-mq-ink">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-mq-accent" strokeWidth={1.75} />
        <p className="text-sm text-pretty">Visit complete. The doctor&rsquo;s notes are in History.</p>
      </div>
    );
  }
  if (you.status === 'skipped') {
    return (
      <div role="alert" className="flex items-start gap-3 border-b border-mq-line px-4 py-4 text-mq-danger">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
        <p className="text-sm text-pretty">You missed your turn and were skipped. Please speak to the reception.</p>
      </div>
    );
  }
  if (state.session === 'break' && state.breakEndsAt) {
    const late = state.breakEndsAt <= now;
    return (
      <div role="status" className="flex items-start gap-3 border-b border-mq-line bg-mq-tint px-4 py-4 text-mq-ink">
        <Coffee className="mt-0.5 h-5 w-5 shrink-0 text-mq-accent" strokeWidth={1.75} />
        <p className="text-sm text-pretty">
          Dr. {DEMO_DOCTOR} is on a short break.{late ? ' The queue resumes shortly.' : ` The queue resumes at ${formatClockTime(state.breakEndsAt)}.`}
        </p>
      </div>
    );
  }
  return null;
}

function Figure({ label, value, suffix, muted }: { label: string; value: string; suffix?: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-mq-subtle">{label}</p>
      <p className={cn('mt-2 text-3xl font-medium tracking-tight', muted ? 'text-mq-muted' : 'text-mq-ink')}>{value}</p>
      {suffix && <p className="mt-1 text-sm text-mq-muted">{suffix}</p>}
    </div>
  );
}

function Position({ state, you }: { state: DemoState; you: DemoToken }) {
  if (you.status === 'called') return <Figure label="Status" value="Your turn" />;
  if (you.status === 'completed') return <Figure label="Status" value="Visit complete" muted />;
  if (you.status === 'skipped') return <Figure label="Status" value="Skipped" muted />;
  const ahead = patientsAhead(state, you);
  const next = ahead === 0;
  return (
    <div>
      <Figure label="Your place" value={next ? 'You’re next' : String(ahead)} suffix={next ? undefined : 'ahead of you'} />
      <AheadSquares ahead={ahead} />
    </div>
  );
}

function QueueView({ state, you, now }: { state: DemoState; you: DemoToken | undefined; now: number }) {
  if (!you) {
    return (
      <div className="p-6">
        <p className="text-xs text-mq-subtle">My queue</p>
        <p className="mt-2 text-xl font-medium tracking-tight text-mq-ink">No token today</p>
        <p className="mt-2 text-sm text-pretty text-mq-muted">Your token appears here as soon as reception gives it. No paper slip, no app to find.</p>
      </div>
    );
  }

  const current = currentToken(state);
  const waiting = you.status === 'waiting';

  return (
    <div className={cn('m-4 border bg-white', you.status === 'called' ? 'border-mq-accent' : 'border-mq-ink')}>
      <Banner state={state} you={you} now={now} />
      <div className="flex h-12 items-center justify-between gap-2 border-b border-mq-line px-4">
        <p className="truncate text-sm font-medium text-mq-ink">{DEMO_DEPARTMENT} — Dr. {DEMO_DOCTOR}</p>
        <p className={cn(MONO, 'flex shrink-0 items-center gap-2 text-xs text-mq-muted')}>
          <span className={cn('h-2 w-2', state.session === 'open' ? 'bg-mq-accent' : 'bg-mq-subtle')} />
          {state.session === 'open' ? 'Open' : 'Break'}
        </p>
      </div>

      <div className="space-y-6 p-4">
        <div>
          <p className="text-xs text-mq-subtle">Your token</p>
          <p className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight text-mq-ink')}>#{you.number}</p>
          <p className={cn(MONO, 'mt-2 text-sm text-mq-muted')}>Now serving {current ? `#${current.number}` : '—'}</p>
        </div>
        <Position state={state} you={you} />
      </div>

      {waiting && (
        <div className="flex items-baseline justify-between border-t border-mq-line px-4 py-3 text-sm">
          <span className="text-mq-muted">Estimated wait</span>
          <span className="font-medium tabular-nums text-mq-ink">&asymp; {formatWait(etaMinutes(state, you, now))}</span>
        </div>
      )}

      <dl className="grid grid-cols-2 border-t border-mq-line text-sm">
        <div className="border-r border-mq-line px-4 py-3">
          <dt className="text-xs text-mq-subtle">Clinic</dt>
          <dd className="mt-1 truncate text-mq-ink">{DEMO_CLINIC}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-mq-subtle">Token issued</dt>
          <dd className={cn(MONO, 'mt-1 text-mq-ink')}>{you.issuedAt ? formatClockTime(you.issuedAt) : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function HistoryView({ you }: { you: DemoToken | undefined }) {
  if (!you || you.status !== 'completed' || !you.completedAt) {
    return (
      <div className="p-6">
        <p className="text-xs text-mq-subtle">History</p>
        <p className="mt-2 text-sm text-pretty text-mq-muted">Your past visits appear here after the doctor marks them seen, with any notes the doctor wrote.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="px-2 text-xs text-mq-subtle">Past visits</p>
      <article className="mt-2 border border-mq-ink bg-white">
        <div className="flex h-12 items-center justify-between gap-2 border-b border-mq-line px-4">
          <p className="truncate text-sm font-medium text-mq-ink">Dr. {DEMO_DOCTOR}</p>
          <p className={cn(MONO, 'shrink-0 text-xs text-mq-muted')}>Today {formatClockTime(you.completedAt)}</p>
        </div>
        <dl className="grid grid-cols-2 border-b border-mq-line text-sm">
          <div className="border-r border-mq-line px-4 py-3">
            <dt className="text-xs text-mq-subtle">Token</dt>
            <dd className={cn(MONO, 'mt-1 text-mq-ink')}>#{you.number}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-xs text-mq-subtle">Department</dt>
            <dd className="mt-1 text-mq-ink">{DEMO_DEPARTMENT}</dd>
          </div>
        </dl>
        <div className="px-4 py-4">
          <p className="text-xs text-mq-subtle">Doctor&rsquo;s notes</p>
          {you.notes ? (
            <p className="mt-2 whitespace-pre-line text-sm text-pretty text-mq-ink">{you.notes}</p>
          ) : (
            <p className="mt-2 text-sm text-mq-muted">No notes for this visit.</p>
          )}
        </div>
        <p className="border-t border-mq-line px-4 py-3 text-xs text-mq-subtle">{DEMO_CLINIC}</p>
      </article>
    </div>
  );
}

const TABS: { id: PatientTab; label: string }[] = [
  { id: 'queue', label: 'My queue' },
  { id: 'history', label: 'History' },
];

/** The patient's phone. Mirrors ActiveTokenPanel and the History tab. */
export function PatientScreen({ state, now, tab, onTab, onAction }: Props) {
  const you = youToken(state);
  const push = state.pushes[0];
  const hasHistory = you?.status === 'completed';

  return (
    <div className="flex flex-1 flex-col bg-mq-ground">
      <nav aria-label="Patient app" className="flex gap-6 border-b border-mq-line bg-white px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              'flex items-center gap-2 border-b-2 pb-3 pt-3 text-sm transition-colors duration-500',
              EASE,
              tab === t.id ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
            )}
          >
            {t.label}
            {t.id === 'history' && hasHistory && tab !== 'history' && <span className="h-1.5 w-1.5 bg-mq-accent" aria-label="New visit" />}
          </button>
        ))}
      </nav>

      {push && <PushBanner key={push.id} push={push} onDismiss={() => onAction({ type: 'dismissPush', id: push.id })} />}

      <div className="flex-1">
        {tab === 'queue' ? <QueueView state={state} you={you} now={now} /> : <HistoryView you={you} />}
      </div>

      <p className="border-t border-mq-line bg-white px-4 py-3 text-xs text-pretty text-mq-subtle">
        {you ? `Signed in as ${you.name}` : 'Signed in as Ayesha Rahman'} · Free for patients
      </p>
    </div>
  );
}
