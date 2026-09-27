'use client';

import { forwardRef, useState } from 'react';
import ReactPhoneInput, { type Country, getCountries, isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Auto-detect country from browser locale, fall back to BD           */
/* ------------------------------------------------------------------ */
function detectCountry(): Country {
  try {
    const locales =
      typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
    for (const locale of locales) {
      const region = locale.split(/[-_]/)[1]?.toUpperCase();
      if (region && getCountries().includes(region as Country)) {
        return region as Country;
      }
    }
  } catch {
    /* ignore */
  }
  return 'BD';
}

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  /** Country to start with. Defaults to one detected from the browser locale (fallback BD). */
  defaultCountry?: Country;
  /** Called when the user picks a different country, e.g. to remember it for next time. */
  onCountryChange?: (country: Country) => void;
  autoFocus?: boolean;
};

/** Phone field styled to DESIGN.md §6 Inputs: square, hairline, inline error below. */
export function PhoneInput({
  value, onChange, error, disabled, id, placeholder, defaultCountry, onCountryChange, autoFocus,
}: PhoneInputProps) {
  // The app renders client-side only (see providers.tsx), so navigator is available here.
  const [country, setCountry] = useState<Country>(() => defaultCountry ?? detectCountry());
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>();

  const handleChange = (phone: string | undefined) => {
    onChange(phone ?? '');
    if (touched) setInternalError(undefined);
  };

  const handleBlur = () => {
    setTouched(true);
    if (value && !isValidPhoneNumber(value)) {
      setInternalError('Enter a valid phone number for the selected country.');
    } else {
      setInternalError(undefined);
    }
  };

  const displayError = error ?? internalError;
  const messageId = id ? `${id}-message` : undefined;

  return (
    <div>
      <div
        className={cn(
          'flex h-10 items-center border bg-white pl-3 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          displayError
            ? 'border-mq-danger'
            : 'border-mq-line hover:border-mq-subtle focus-within:border-mq-ink',
          disabled && 'pointer-events-none opacity-40',
        )}
      >
        <ReactPhoneInput
          id={id}
          international
          countryCallingCodeEditable={false}
          defaultCountry={country}
          country={country}
          onCountryChange={(c) => {
            if (!c) return;
            setCountry(c);
            onCountryChange?.(c);
          }}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          inputComponent={PhoneNumberInput}
          // Extra props are forwarded to the inner <input> by react-phone-number-input
          placeholder={placeholder ?? 'Phone number'}
          autoFocus={autoFocus}
          aria-invalid={Boolean(displayError)}
          aria-describedby={messageId}
          className="phone-input-wrapper w-full"
        />
      </div>

      {displayError ? (
        <p id={messageId} className="mt-2 text-sm text-mq-danger">
          {displayError}
        </p>
      ) : (
        value && (
          <p id={messageId} className="mt-2 text-xs text-mq-subtle">
            {isValidPhoneNumber(value) ? (
              <span className="text-mq-accent">Valid number</span>
            ) : (
              'Enter your full number, including the area code.'
            )}
          </p>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom input — forwards ref, strips non-digit chars on change      */
/* ------------------------------------------------------------------ */
const PhoneNumberInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PhoneNumberInput({ className, onChange, ...props }, ref) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow digits, spaces, hyphens, parentheses — block letters and symbols
      const cleaned = e.target.value.replace(/[^0-9\s\-().+]/g, '');
      if (cleaned !== e.target.value) e.target.value = cleaned;
      onChange?.(e);
    };

    return (
      <input
        {...props}
        ref={ref}
        onChange={handleChange}
        inputMode="tel"
        className={cn(
          'h-full flex-1 bg-transparent px-3 text-sm text-mq-ink outline-none placeholder:text-mq-subtle',
          'disabled:cursor-not-allowed',
          className,
        )}
      />
    );
  },
);
