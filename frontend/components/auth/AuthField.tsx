import * as React from 'react';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

type AuthLabelProps = {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
};

/** Field label used by every auth form control. */
export function AuthLabel({ htmlFor, children, optional }: AuthLabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-mq-ink">
      {children}
      {optional && <span className="ml-2 text-xs text-mq-subtle">Optional</span>}
    </label>
  );
}

type AuthFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  /** Helper text shown under the field when there is no error. */
  hint?: string;
  /** Optional control rendered inside the right edge of the input (e.g. show/hide password). */
  trailing?: React.ReactNode;
};

/** Square, hairline text field with label above and inline error below (DESIGN.md §6 Inputs). */
export function AuthField({ id, label, error, hint, trailing, className, ...props }: AuthFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <AuthLabel htmlFor={id}>{label}</AuthLabel>
      <div className="relative mt-2">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-10 w-full border px-3 text-sm placeholder:text-mq-subtle',
            props.readOnly ? 'cursor-default bg-mq-ground text-mq-muted' : 'bg-white text-mq-ink',
            'transition-colors duration-500 focus:border-mq-ink focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-40',
            EASE,
            error ? 'border-mq-danger' : props.readOnly ? 'border-mq-line' : 'border-mq-line hover:border-mq-subtle',
            trailing && 'pr-16',
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-mq-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-2 text-xs text-mq-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
