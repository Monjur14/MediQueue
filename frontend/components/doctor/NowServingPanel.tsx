'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useCallNext, useCompleteToken, useSkipToken, useUpdateNotes,
  type QueueSession, type SessionToken,
} from '@/hooks/api/doctor';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import { StatusMark, TOKEN_STATUS } from '@/components/admin/StatusMark';

type NowServingPanelProps = {
  session: QueueSession;
  current?: SessionToken;
  next?: SessionToken;
};

const TEXT_BTN = cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink disabled:opacity-40', EASE);

/* ------------------------------------------------------------------ */
/*  Consultation notes sub-panel                                        */
/* ------------------------------------------------------------------ */
function NotesPanel({ token, sessionId }: { token: SessionToken; sessionId: string }) {
  const updateNotes = useUpdateNotes(sessionId);

  // Local draft so keystrokes don't hit the server on every character
  const [draft, setDraft] = useState(token.notes ?? '');
  const saved   = token.notes ?? '';
  const changed = draft !== saved;

  // Keep draft in sync when server refreshes the token (e.g. after WS event)
  // but only if the user hasn't made local edits
  const lastTokenId = useRef(token.id);
  useEffect(() => {
    if (token.id !== lastTokenId.current) {
      // New patient — reset completely
      setDraft(token.notes ?? '');
      lastTokenId.current = token.id;
    }
  }, [token.id, token.notes]);

  const handleSave = () => {
    if (!changed || updateNotes.isPending) return;
    updateNotes.mutate(
      { tokenId: token.id, notes: draft, notes_version: token.notes_version },
      {
        onSuccess: (updated) => {
          // Sync draft to whatever the server confirmed (notes may be trimmed server-side)
          setDraft(updated.notes ?? '');
        },
        onError: (error) => {
          const status = (error as import('axios').AxiosError).response?.status;
          if (status === 409) {
            // Another tab saved first — pull their version in
            setDraft(token.notes ?? '');
          }
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="mt-8 border-t border-mq-line pt-6">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="consult-notes" className="text-xs font-medium text-mq-subtle uppercase tracking-wide">
          Consultation notes
        </label>
        {updateNotes.isPending && (
          <span className="text-xs text-mq-muted animate-pulse">Saving…</span>
        )}
        {!updateNotes.isPending && !changed && saved && (
          <span className="text-xs text-mq-muted">Saved</span>
        )}
      </div>
      <textarea
        id="consult-notes"
        rows={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type notes about this consultation…"
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
        <button
          type="button"
          onClick={handleSave}
          disabled={!changed || updateNotes.isPending}
          className={buttonClasses('secondary', 'sm')}
        >
          {updateNotes.isPending ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                          */
/* ------------------------------------------------------------------ */
/** Left side of the console: the patient in front of the doctor and one click actions. */
export function NowServingPanel({ session, current, next }: NowServingPanelProps) {
  const callNext = useCallNext(session.id);
  const complete = useCompleteToken(session.id);
  const skip = useSkipToken(session.id);

  const busy = callNext.isPending || complete.isPending || skip.isPending;
  const canCall = session.status === 'open' && Boolean(next);

  // Finish the current patient and bring in the next one with a single click
  const seenAndNext = async () => {
    if (!current) return;
    try {
      await complete.mutateAsync(current.id);
      if (canCall) callNext.mutate();
    } catch {
      // Error toast is shown by the hook
    }
  };

  if (!current) {
    return (
      <div>
        <p className="text-xs text-mq-subtle">Now serving</p>
        <p className="mt-2 text-xl font-medium tracking-tight text-mq-ink">
          {next ? 'Ready for the next patient' : 'No one waiting'}
        </p>
        <p className="mt-1 max-w-[48ch] text-sm text-pretty text-mq-muted">
          {next ? (
            <>Next is <span className={MONO}>#{next.token_number}</span> {next.patient_name}.</>
          ) : (
            'Tokens given at reception appear here as soon as they are issued.'
          )}
          {session.current_token > 0 && <span className="text-mq-subtle"> Last called #{session.current_token}.</span>}
        </p>
        <button type="button" onClick={() => callNext.mutate()} disabled={!canCall || busy} aria-busy={callNext.isPending}
          className={buttonClasses('primary', 'md', 'mt-8 w-full sm:w-auto sm:min-w-[200px]')}>
          {callNext.isPending ? 'Calling…' : 'Call next patient'}
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
      <p className={cn(MONO, 'mt-2 text-5xl font-medium tracking-tight tabular-nums text-mq-ink')}>
        #{current.token_number}
      </p>
      <p className="mt-4 text-xl font-medium tracking-tight text-mq-ink">{current.patient_name}</p>
      <p className={cn(MONO, 'mt-1 text-sm text-mq-muted')}>{current.patient_phone}</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={seenAndNext} disabled={busy} aria-busy={complete.isPending || callNext.isPending}
          className={buttonClasses('primary', 'md', 'flex-1 sm:min-w-[176px] sm:flex-none')}>
          {complete.isPending || callNext.isPending ? 'Working…' : canCall ? 'Seen, call next' : 'Mark seen'}
        </button>
        <button type="button" onClick={() => skip.mutate(current.id)} disabled={busy}
          className={buttonClasses('secondary', 'md')}>
          {skip.isPending ? 'Skipping…' : 'Skip'}
        </button>
        {canCall && (
          <button type="button" onClick={() => complete.mutate(current.id)} disabled={busy} className={cn(TEXT_BTN, 'px-2')}>
            Seen only
          </button>
        )}
      </div>

      <p className="mt-6 text-sm text-mq-muted">
        {next ? (
          <>Up next: <span className={cn(MONO, 'text-mq-ink')}>#{next.token_number}</span> {next.patient_name}</>
        ) : (
          'No one else is waiting.'
        )}
      </p>

      {/* Consultation notes — only shown while a patient is being served */}
      <NotesPanel token={current} sessionId={session.id} />
    </div>
  );
}
