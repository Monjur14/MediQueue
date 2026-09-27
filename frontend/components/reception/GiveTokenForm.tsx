'use client';

import { useState } from 'react';
import { isValidPhoneNumber, type Country } from 'react-phone-number-input';
import { useGiveToken } from '@/hooks/api/doctor';
import { getApiErrorMessage } from '@/hooks/api/auth';
import { PhoneInput } from '@/components/ui/phone-input';
import { AuthLabel } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { buttonClasses, MONO } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';

const COUNTRY_KEY = 'mq:reception-country';

/** Last country the receptionist used on this device (per-viewer convenience only). */
function readCountry(): Country {
  try {
    return (localStorage.getItem(COUNTRY_KEY) as Country | null) ?? 'BD';
  } catch {
    return 'BD';
  }
}
function saveCountry(country: Country) {
  try {
    localStorage.setItem(COUNTRY_KEY, country);
  } catch {
    // Storage unavailable (private mode); the choice simply isn't remembered
  }
}

type Result = { tone: 'success'; token: number; name?: string } | { tone: 'error'; message: string };

/** Phone lookup that issues the next token. The country stays selected between patients. */
export function GiveTokenForm({ sessionId }: { sessionId: string }) {
  const giveToken = useGiveToken();
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const valid = phone !== '' && isValidPhoneNumber(phone);
  const fieldId = `give-${sessionId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || giveToken.isPending) return;
    try {
      const token = await giveToken.mutateAsync({ session_id: sessionId, patient_phone: phone });
      setResult({ tone: 'success', token: token.token_number, name: token.patient_name });
      setPhone('');
    } catch (err) {
      setResult({ tone: 'error', message: getApiErrorMessage(err, 'Could not give a token. Check the number and try again.') });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <AuthLabel htmlFor={fieldId}>Patient phone</AuthLabel>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <PhoneInput id={fieldId} value={phone} defaultCountry={readCountry()} onCountryChange={saveCountry}
            onChange={(v) => { setPhone(v); setResult(null); }} disabled={giveToken.isPending}
            placeholder="Number without the country code" />
        </div>
        <button type="submit" disabled={!valid || giveToken.isPending} aria-busy={giveToken.isPending}
          className={buttonClasses('primary', 'md', 'h-10 shrink-0')}>
          {giveToken.isPending ? 'Giving token…' : 'Give token'}
        </button>
      </div>
      <p className="mt-2 text-xs text-mq-subtle">Pick the country once. It stays selected for the next patient.</p>

      <div className="mt-4" aria-live="polite">
        {result?.tone === 'success' && (
          <div className="flex items-baseline gap-4 border border-mq-accent bg-mq-tint px-4 py-3">
            <span className={cn(MONO, 'text-2xl font-medium text-mq-ink')}>#{result.token}</span>
            <span className="text-sm text-mq-ink">Token given{result.name ? ` to ${result.name}` : ''}.</span>
          </div>
        )}
        {result?.tone === 'error' && <AuthNotice tone="error">{result.message}</AuthNotice>}
      </div>
    </form>
  );
}
