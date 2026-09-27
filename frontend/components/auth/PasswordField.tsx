'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { AuthField } from './AuthField';

type PasswordFieldProps = Omit<React.ComponentProps<typeof AuthField>, 'type' | 'trailing'>;

/** AuthField for passwords with a Show / Hide toggle inside the right edge. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className={cn('text-xs font-medium text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
