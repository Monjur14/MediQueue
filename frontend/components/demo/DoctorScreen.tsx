'use client';

import { useState } from 'react';
import { buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import { StatusMark, TOKEN_STATUS } from '@/components/admin/StatusMark';
import { formatClock } from '@/components/doctor/queueUtils';
import { cn } from '@/lib/utils';
import {
  DEMO_MAX_TOKENS, byOrder, currentToken, formatClockTime, waitingList,
  type DemoAction, type DemoState, type DemoToken,
} from './demoStore';

type Props = { state: DemoState; now: number; onAction: (a: DemoAction) => void };

const TEXT_BTN = cn('px-1 py-1 text-sm transition-colors duration-500 disabled:opacity-40', EASE);
const BREAK_OPTIONS = [5, 10, 15];

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-3">
      <dt className="text-xs text-mq-subtle">{label}</dt>
      <dd className={cn(MONO, 'mt-1 text-xl font-medium tabular-nums text-mq-ink')}>{value}</dd>
    </div>
  );
}

function YouTag() {
  return <span className="ml-2 text-xs text-mq-accent">Phone shown</span>;
}

/* Consultation notes: same behaviour as the real NotesPanel, drawn to DESIGN.md. */
function NotesPanel({ token, draft, onAction }: { token: DemoToken; draft: string; onAction: Props['onAction'] }) {
  const changed = draft.trim() !== token.notes;
  const save = () => changed && draft.trim() && onAction({ type: 'saveNotes', at: Date.now() });

  return (
    <div className="mt-8 border-t border-mq-line pt-6">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="demo-notes" className="text-xs font-medium text-mq-subtle uppercase tracking-wide">Consultation notes</label>
        {!changed && token.notes && <span className="text-xs text-mq-muted">Saved</span>}
      </div>
      <textarea
        id="demo-notes"
        rows={4}
        value={draft}
        onChange={(e) => onAction({ type: 'setDraft', draft: e.target.value })}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
        }}
        placeholder="Symptoms, medicine, advice. The patient can read this later."
        className={cn(
          'mt-2 w-full resize-y rounded-lg border border-mq-line bg-white px-3 py-2',
          'text-sm text-mq-ink placeholder:text-mq-subtle',
          'focus:outline-none focus:ring-2 focus:ring-mq-line focus:border-mq-subtle',
          'transition-colors duration-200',
          EASE,
        )}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-mq-subtle select-none">
          Press <kbd className="rounded border border-mq-line px-1 font-mono text-[10px]">Ctrl+S</kbd> to save quickly
        </p>
        <button type="button" onClick={save} disabled={!changed || !draft.trim()} className={buttonClasses('secondary', 'sm')}>
          Save notes
        </button>
      </div>
    </div>
  );
}

function NowServing({ state, onAction }: Omit<Props, 'now'>) {
  const current = currentToken(state);
  const next = waitingList(state)[0];
  const canCall = state.session === 'open' && Boolean(next);
  const at = () => Date.now();

  if (!current) {
    return (
      <div>
        <p className="text-xs text-mq-subtle">Now serving</p>
        <p className="mt-2 text-xl font-medium tracking-tight text-mq-ink">
          {next ? 'Ready for the next patient' : 'No one waiting'}
        </p>
        <p className="mt-1 text-sm text-pretty text-mq-muted">
          {next ? <>Next is <span className={MONO}>#{next.number}</span> {next.name}.</> : 'Tokens given at reception appear here as soon as they are issued.'}
        </p>
        <button type="button" onClick={() => onAction({ type: 'callNext', at: at() })} disabled={!canCall}
          className={buttonClasses('primary', 'md', 'mt-8 w-full sm:w-auto')}>
          Call next patient
        </button>
      </div>
    );
  }

  const status = TOKEN_STATUS[current.status] ?? { tone: 'muted' as const, label: current.status };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-mq-subtle">Now serving</p>
        <StatusMark {...status} />
      </div>
      <p className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight tabular-nums text-mq-ink')}>#{current.number}</p>
      <p className="mt-4 text-xl font-medium tracking-tight text-mq-ink">
        {current.name}{current.isYou && <YouTag />}
      </p>
      <p className={cn(MONO, 'mt-1 text-sm text-mq-muted')}>{current.phone}</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onAction({ type: 'complete', id: current.id, callNext: canCall, at: at() })}
          className={buttonClasses('primary', 'md', 'flex-1 sm:flex-none')}>
          {canCall ? 'Seen, call next' : 'Mark seen'}
        </button>
        <button type="button" onClick={() => onAction({ type: 'skip', id: current.id, at: at() })}
          className={buttonClasses('secondary', 'md')}>
          Skip
        </button>
        {canCall && (
          <button type="button" onClick={() => onAction({ type: 'complete', id: current.id, callNext: false, at: at() })}
            className={cn(TEXT_BTN, 'px-2 text-mq-muted hover:text-mq-ink')}>
            Seen only
          </button>
        )}
      </div>

      <p className="mt-6 text-sm text-mq-muted">
        {next ? <>Up next: <span className={cn(MONO, 'text-mq-ink')}>#{next.number}</span> {next.name}</> : 'No one else is waiting.'}
      </p>

      <NotesPanel key={current.id} token={current} draft={state.draft} onAction={onAction} />
    </div>
  );
}

function BreakCountdown({ state, now, onAction }: Props) {
  const total = state.breakMinutes * 60;
  const left = state.breakEndsAt ? (state.breakEndsAt - now) / 1000 : total;
  const overdue = left <= 0;
  // Time left as a share of the break: the bar drains to empty, then shows full red once overdue
  const remaining = overdue ? 1 : Math.min(1, Math.max(0, left / total));

  return (
    <div>
      <p className="text-xs text-mq-subtle">{overdue ? 'Break over by' : 'On break'}</p>
      <p role="timer" aria-live="off"
        className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight tabular-nums', overdue ? 'text-mq-danger' : 'text-mq-ink')}>
        {formatClock(Math.abs(left))}
      </p>
      <p className={cn('mt-2 text-sm', overdue ? 'text-mq-danger' : 'text-mq-muted')}>
        {overdue
          ? 'Patients are waiting. Resume when you are back.'
          : `Patients see the queue resuming at ${state.breakEndsAt ? formatClockTime(state.breakEndsAt) : ''}.`}
      </p>
      <div className="mt-6 h-1 w-full bg-mq-line" aria-hidden>
        <div className={cn('h-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none', overdue ? 'bg-mq-danger' : 'bg-mq-ink')}
          style={{ width: `${remaining * 100}%` }} />
      </div>
      <button type="button" onClick={() => onAction({ type: 'endBreak', at: Date.now() })}
        className={buttonClasses('primary', 'md', 'mt-8 w-full sm:w-auto')}>
        End break and resume
      </button>
    </div>
  );
}

function BreakPicker({ state, onAction }: Omit<Props, 'now'>) {
  const [minutes, setMinutes] = useState(5);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-mq-ink">Take a break</legend>
      <p className="mt-1 text-xs text-mq-subtle">Patients see when the queue resumes.</p>
      <div className="mt-4 grid grid-cols-3 gap-px border border-mq-line bg-mq-line">
        {BREAK_OPTIONS.map((m) => (
          <label key={m} className="relative">
            <input type="radio" name="demo-break" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="peer sr-only" />
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
      <button type="button" onClick={() => onAction({ type: 'startBreak', minutes, at: Date.now() })}
        disabled={state.session !== 'open'} className={buttonClasses('secondary', 'sm', 'mt-4 w-full')}>
        Start {minutes} min break
      </button>
    </fieldset>
  );
}

const COLS = 'grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 sm:grid-cols-[56px_1fr_88px_120px]';

function QueueRows({ state, onAction }: Omit<Props, 'now'>) {
  const rows = state.tokens.filter((t) => t.status === 'waiting' || t.status === 'skipped').sort(byOrder);
  const waiting = rows.filter((t) => t.status === 'waiting').length;

  return (
    <div className="border-t border-mq-line">
      <div className="flex h-12 items-center justify-between border-b border-mq-line px-4">
        <h3 className="text-sm font-medium text-mq-ink">Up next</h3>
        <span className={cn(MONO, 'text-xs text-mq-subtle')}>{waiting} waiting</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">No one else is in the queue.</p>
      ) : (
        <>
          <div className={cn(COLS, MONO, 'h-10 border-b border-mq-line text-xs uppercase tracking-wider text-mq-subtle')}>
            <span>Token</span><span>Patient</span>
            <span className="hidden sm:block">Status</span>
            <span className="text-right">Action</span>
          </div>
          <ul>
            {rows.map((t) => {
              const skipped = t.status === 'skipped';
              const status = TOKEN_STATUS[t.status];
              return (
                <li key={t.id} className={cn(COLS, 'min-h-12 border-b border-mq-line py-2 last:border-b-0', t.isYou && 'bg-mq-tint', skipped && 'opacity-60')}>
                  <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>#{t.number}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-mq-ink">{t.name}{t.isYou && <YouTag />}</p>
                    <div className="sm:hidden"><StatusMark {...status} /></div>
                  </div>
                  <span className="hidden sm:block"><StatusMark {...status} /></span>
                  <div className="flex items-center justify-end gap-3">
                    {skipped ? (
                      <button type="button" onClick={() => onAction({ type: 'readmit', id: t.id, at: Date.now() })}
                        aria-label={`Re-admit #${t.number} to the end of the queue`} className={cn(TEXT_BTN, 'text-mq-accent hover:text-mq-ink')}>
                        Re-admit
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => onAction({ type: 'complete', id: t.id, callNext: false, at: Date.now() })}
                          aria-label={`Mark #${t.number} seen`} className={cn(TEXT_BTN, 'text-mq-ink hover:text-mq-accent')}>
                          Seen
                        </button>
                        <button type="button" onClick={() => onAction({ type: 'skip', id: t.id, at: Date.now() })}
                          aria-label={`Skip #${t.number}`} className={cn(TEXT_BTN, 'text-mq-muted hover:text-mq-danger')}>
                          Skip
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function SeenRows({ state }: { state: DemoState }) {
  const seen = state.tokens.filter((t) => t.status === 'completed').sort((a, b) => b.number - a.number);
  if (seen.length === 0) return null;
  return (
    <details className="group border-t border-mq-line">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-sm text-mq-ink">
        <span className="font-medium">Seen today</span>
        <span className={cn(MONO, 'text-xs text-mq-subtle')}>{seen.length} <span className="group-open:hidden">show</span><span className="hidden group-open:inline">hide</span></span>
      </summary>
      <ul className="border-t border-mq-line">
        {seen.map((t) => (
          <li key={t.id} className="flex min-h-12 items-center gap-4 border-b border-mq-line px-4 py-2 last:border-b-0">
            <span className={cn(MONO, 'text-sm tabular-nums text-mq-muted')}>#{t.number}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-mq-muted">{t.name}</span>
            {t.notes && <span className="text-xs text-mq-subtle">Notes saved</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Doctor console: now serving, figures, break control, queue. Mirrors DoctorQueueView. */
export function DoctorScreen({ state, now, onAction }: Props) {
  const onBreak = state.session === 'break';
  const count = (s: DemoToken['status']) => state.tokens.filter((t) => t.status === s).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-mq-line px-4 py-3">
        <p className="truncate text-xs text-mq-muted">Today&rsquo;s queue</p>
        <StatusMark tone={onBreak ? 'muted' : 'accent'} label={onBreak ? 'On break' : 'Open'} dot />
      </div>

      <div className="grid sm:grid-cols-12">
        <div className="p-6 sm:col-span-7 lg:col-span-8" aria-live="polite">
          {onBreak ? <BreakCountdown state={state} now={now} onAction={onAction} /> : <NowServing state={state} onAction={onAction} />}
        </div>
        <div className="border-t border-mq-line sm:col-span-5 sm:border-l sm:border-t-0 lg:col-span-4">
          <dl className="grid grid-cols-2 gap-px border-b border-mq-line bg-mq-line">
            <Figure label="Waiting" value={count('waiting')} />
            <Figure label="Seen" value={count('completed')} />
            <Figure label="Skipped" value={count('skipped')} />
            <Figure label="Issued" value={`${state.tokens.length}/${DEMO_MAX_TOKENS}`} />
          </dl>
          <div className="p-4">
            {onBreak ? (
              <p className="text-sm text-pretty text-mq-muted">Reception can still give tokens while you are on break.</p>
            ) : (
              <BreakPicker state={state} onAction={onAction} />
            )}
          </div>
        </div>
      </div>

      <QueueRows state={state} onAction={onAction} />
      <SeenRows state={state} />
    </div>
  );
}
