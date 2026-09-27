'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin, getApiErrorMessage } from '@/hooks/api/auth';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { PasswordField } from '@/components/auth/PasswordField';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';

type FormErrors = {
  email?: string;
  password?: string;
};

const LINK = cn(
  'font-medium text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink',
  EASE,
);

export default function LoginPage() {
  const searchParams = useSearchParams();
  const registered   = searchParams.get('registered') === '1';
  const tenantJoined = searchParams.get('registered') === 'tenant';
  const setupDone    = searchParams.get('setup') === 'done';

  const login = useLogin();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [fieldErrors, setFieldErrors]   = useState<FormErrors>({});

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!email) next.email = 'Enter your email address.';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    login.mutate({ email, password });
  };

  const apiError = login.error
    ? getApiErrorMessage(login.error, 'We could not log you in. Check your connection and try again.')
    : null;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-medium tracking-tight text-mq-ink">Log in</h1>
      <p className="mt-2 text-sm text-pretty text-mq-muted">
        Doctors, clinic admins and patients all log in here.
      </p>

      <div className="mt-8 space-y-3 empty:hidden">
        {registered && <AuthNotice tone="success">Account created. Log in to continue.</AuthNotice>}
        {tenantJoined && (
          <AuthNotice tone="success">Clinic registered. Log in below — you&apos;ll be taken straight to payment.</AuthNotice>
        )}
        {setupDone && <AuthNotice tone="success">Password set. You can now log in.</AuthNotice>}
        {apiError && <AuthNotice tone="error">{apiError}</AuthNotice>}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={login.isPending}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={login.isPending}
        />

        <button
          type="submit"
          disabled={login.isPending}
          aria-busy={login.isPending}
          className={buttonClasses('primary', 'md', 'w-full')}
        >
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="mt-10 space-y-3 border-t border-mq-line pt-6 text-sm text-mq-muted">
        <p>
          New patient?{' '}
          <Link href="/register" className={LINK}>
            Create a free account
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
