'use client';

import { useState } from 'react';
import { buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import { StatusMark } from '@/components/admin/StatusMark';
import { cn } from '@/lib/utils';
import {
  DEMO_DOCTOR, DEMO_MAX_TOKENS, currentToken, nextNumber, waitingList,
  type DemoAction, type DemoState,
} from './demoStore';

type Props = { state: DemoState; onAction: (a: DemoAction) => void };

const INPUT = cn(
  'h-10 w-full min-w-0 border bg-white px-3 text-sm text-mq-ink placeholder:text-mq-subtle',
  'transition-colors duration-500 focus:border-mq-ink focus:outline-none',
  EASE,
);

/** Bangladesh mobile without the leading 0: 10 digits starting with 1. */
function phoneError(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 'Enter the patient’s phone number.';
  if (digits.length !== 10 || !digits.startsWith('1')) return 'Use a Bangladesh mobile number, like 1712 345 678.';
  return undefined;
}

export const DEMO_PATIENT_PHONE = '1712 345 678';
const OTHER_PATIENTS = ['Karim Hossain', 'Sumaiya Islam', 'Tanvir Ahmed', 'Nusrat Jahan', 'Rafiq Mia', 'Shirin Sultana'];

/** Demo stand in for findPatientByPhone: Ayesha's number, else a sample account per number. */
function lookupPatient(raw: string, state: DemoState): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (phoneError(raw)) return undefined;
  if (digits === DEMO_PATIENT_PHONE.replace(/\D/g, '')) return 'Ayesha Rahman';
  return OTHER_PATIENTS[(Number(digits.slice(-3)) + state.tokens.length) % OTHER_PATIENTS.length];
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return `+880 ${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-3">
      <dt className="text-xs text-mq-subtle">{label}</dt>
      <dd className={cn(MONO, 'mt-1 text-lg font-medium tabular-nums text-mq-ink')}>{value}</dd>
    </div>
  );
}

/** Reception desk: phone number in, next token out. Mirrors GiveTokenForm. */
export function ReceptionScreen({ state, onAction }: Props) {
  const [phone, setPhone] = useState(DEMO_PATIENT_PHONE);
  const [error, setError] = useState<string>();
  const match = lookupPatient(phone, state);

  const issued = state.tokens.filter((t) => t.issuedAt !== null).sort((a, b) => b.number - a.number);
  const latest = issued[0];
  const current = currentToken(state);
  const onBreak = state.session === 'break';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = phoneError(phone) ?? (match ? undefined : 'No patient account uses this number.');
    setError(problem);
    if (problem || !match) return;
    onAction({ type: 'give', name: match, phone: formatPhone(phone), at: Date.now() });
    setPhone('');
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-mq-line px-4 py-3">
        <p className="truncate text-xs text-mq-muted">Dr. {DEMO_DOCTOR}</p>
        <StatusMark tone={onBreak ? 'muted' : 'accent'} label={onBreak ? 'On break' : 'Open'} dot />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4 p-4">
        <div>
          <label htmlFor="demo-phone" className="text-sm text-mq-ink">Patient phone</label>
          <div className="mt-2 flex">
            <span className={cn(MONO, 'flex h-10 shrink-0 items-center border border-r-0 border-mq-line bg-mq-ground px-3 text-sm text-mq-muted')}>
              +880
            </span>
            <input id="demo-phone" inputMode="tel" value={phone} autoComplete="off"
              onChange={(e) => { setPhone(e.target.value); setError(undefined); }}
              placeholder="1712 345 678"
              aria-invalid={Boolean(error)} aria-describedby={error ? 'demo-phone-error' : 'demo-phone-hint'}
              className={cn(INPUT, MONO, error ? 'border-mq-danger' : 'border-mq-line')} />
          </div>
          {error ? (
            <p id="demo-phone-error" className="mt-2 text-sm text-mq-danger">{error}</p>
          ) : (
            <p id="demo-phone-hint" className="mt-2 text-xs text-mq-subtle">
              {match ? <>Patient account: <span className="text-mq-ink">{match}</span></> : 'Type the number the patient signed up with.'}
            </p>
          )}
        </div>

        <button type="submit" className={buttonClasses('primary', 'md', 'h-10 w-full')}>
          Give token <span className={cn(MONO, 'font-medium text-white/60')}>#{nextNumber(state)}</span>
        </button>

        <div aria-live="polite">
          {latest && (
            <div className="flex items-baseline gap-3 border border-mq-accent bg-mq-tint px-3 py-3">
              <span className={cn(MONO, 'text-2xl font-medium text-mq-ink')}>#{latest.number}</span>
              <span className="min-w-0 text-sm text-pretty text-mq-ink">Token given to {latest.name}.</span>
            </div>
          )}
        </div>

        {onBreak && (
          <p className="text-sm text-pretty text-mq-muted">The doctor is on a break. You can keep giving tokens.</p>
        )}
      </form>

      <dl className="grid grid-cols-2 gap-px border-y border-mq-line bg-mq-line">
        <Stat label="Now serving" value={current ? `#${current.number}` : '—'} />
        <Stat label="Waiting" value={waitingList(state).length} />
        <Stat label="Issued today" value={`${state.tokens.length}/${DEMO_MAX_TOKENS}`} />
        <Stat label="Next token" value={`#${nextNumber(state)}`} />
      </dl>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-mq-subtle">Want a longer queue?</p>
        <button type="button" onClick={() => onAction({ type: 'walkIn', at: Date.now() })}
          className={buttonClasses('secondary', 'sm', 'mt-2 w-full')}>
          Add another patient
        </button>
        <p className="mt-4 text-xs text-pretty text-mq-subtle">
          Patients sign up once with their phone number. After that, reception only types the number.
        </p>
      </div>
    </div>
  );
}
