'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useRegister, getApiErrorMessage } from '@/hooks/api/auth';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { PasswordField } from '@/components/auth/PasswordField';
import { PhoneField } from '@/components/auth/PhoneField';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
};

const LINK = cn(
  'font-medium text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink',
  EASE,
);

export function RegisterForm() {
  const register = useRegister();

  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.full_name.trim()) next.name = 'Enter your full name.';
    if (!form.email) next.email = 'Enter your email address.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Choose a password.';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.phone && !isValidPhoneNumber(form.phone))
      next.phone = 'Enter a valid phone number for the selected country.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    register.mutate({
      full_name: form.full_name,
      email:     form.email,
      password:  form.password,
      phone:     form.phone || undefined,
    });
  };

  const apiError = register.error
    ? getApiErrorMessage(register.error, 'We could not create your account. Check your connection and try again.')
    : null;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-medium tracking-tight text-mq-ink">Create your account</h1>
      <p className="mt-2 text-sm text-pretty text-mq-muted">
        Free for patients, always. No payment needed.
      </p>

      {apiError && (
        <div className="mt-8">
          <AuthNotice tone="error">{apiError}</AuthNotice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <AuthField
          id="name"
          label="Full name"
          autoComplete="name"
          value={form.full_name}
          onChange={set('full_name')}
          error={fieldErrors.name}
          disabled={register.isPending}
        />

        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email}
          disabled={register.isPending}
        />

        <PhoneField
          id="phone"
          label="Phone"
          optional
          value={form.phone}
          onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
          error={fieldErrors.phone}
          disabled={register.isPending}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={form.password}
          onChange={set('password')}
          error={fieldErrors.password}
          disabled={register.isPending}
        />

        <button
          type="submit"
          disabled={register.isPending}
          aria-busy={register.isPending}
          className={buttonClasses('primary', 'md', 'w-full')}
        >
          {register.isPending ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <div className="mt-10 space-y-3 border-t border-mq-line pt-6 text-sm text-mq-muted">
        <p>
          Already have an account?{' '}
          <Link href="/login" className={LINK}>
            Log in
          </Link>
        </p>
        <p>
          Clinic or doctor?{' '}
          <Link href="/register/tenant" className={LINK}>
            Register your clinic
          </Link>
        </p>
      </div>
    </div>
  );
}
