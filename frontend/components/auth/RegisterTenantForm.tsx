'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isValidPhoneNumber } from 'react-phone-number-input';
import type { PlanName } from '@/types';
import { useRegisterTenant, getApiErrorMessage } from '@/hooks/api/auth';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { PasswordField } from '@/components/auth/PasswordField';
import { PhoneField } from '@/components/auth/PhoneField';
import { PlanPicker } from '@/components/auth/PlanPicker';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { parsePlan } from '@/lib/plans';
import { cn } from '@/lib/utils';

type FieldErrors = Partial<Record<'clinicName' | 'clinicPhone' | 'adminName' | 'email' | 'password' | 'phone', string>>;

const LINK = cn(
  'font-medium text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink',
  EASE,
);
const GROUP_TITLE = 'border-b border-mq-line pb-3 text-xs text-mq-subtle';

export function RegisterTenantForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerTenant = useRegisterTenant();

  // ?plan=solo|clinic|hospital preselects a plan; anything else falls back to Clinic
  const [plan, setPlan] = useState<PlanName>(() => parsePlan(searchParams.get('plan')));
  const [form, setForm] = useState({
    clinic_name: '', clinic_phone: '', full_name: '', email: '', password: '', phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const pending = registerTenant.isPending;

  const choosePlan = (next: PlanName) => {
    setPlan(next);
    // Keep the URL in sync so a refresh or shared link keeps the same plan
    router.replace(`/register/tenant?plan=${next}`, { scroll: false });
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setPhone = (field: 'clinic_phone' | 'phone') => (v: string) =>
    setForm((prev) => ({ ...prev, [field]: v }));

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.clinic_name.trim()) next.clinicName = 'Enter your clinic or practice name.';
    if (!form.clinic_phone) next.clinicPhone = 'Enter the clinic phone number.';
    else if (!isValidPhoneNumber(form.clinic_phone))
      next.clinicPhone = 'Enter a valid phone number for the selected country.';
    if (!form.full_name.trim()) next.adminName = 'Enter your name.';
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
    registerTenant.mutate({
      clinic_name:  form.clinic_name,
      clinic_phone: form.clinic_phone,
      full_name:    form.full_name,
      email:        form.email,
      password:     form.password,
      phone:        form.phone || undefined,
      plan_name:    plan,
    });
  };

  const apiError = registerTenant.error
    ? getApiErrorMessage(registerTenant.error, 'We could not register your clinic. Check your connection and try again.')
    : null;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-medium tracking-tight text-mq-ink">Register your clinic</h1>
      <p className="mt-2 text-sm text-pretty text-mq-muted">Choose a plan, then set up your clinic account.</p>

      {apiError && (
        <div className="mt-8">
          <AuthNotice tone="error">{apiError}</AuthNotice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-10" noValidate>
        <PlanPicker value={plan} onChange={choosePlan} disabled={pending} />

        <div className="space-y-6">
          <p className={GROUP_TITLE}>Clinic</p>
          <AuthField id="clinic_name" label="Clinic or practice name" autoComplete="organization"
            value={form.clinic_name} onChange={set('clinic_name')} error={fieldErrors.clinicName} disabled={pending} />
          <PhoneField id="clinic_phone" label="Clinic phone" placeholder="Reception or front desk number"
            value={form.clinic_phone} onChange={setPhone('clinic_phone')} error={fieldErrors.clinicPhone} disabled={pending} />
        </div>

        <div className="space-y-6">
          <p className={GROUP_TITLE}>Your account</p>
          <AuthField id="full_name" label="Your name" autoComplete="name"
            value={form.full_name} onChange={set('full_name')} error={fieldErrors.adminName} disabled={pending} />
          <AuthField id="email" label="Email" type="email" placeholder="you@example.com" autoComplete="email"
            value={form.email} onChange={set('email')} error={fieldErrors.email} disabled={pending} />
          <PasswordField id="password" label="Password" autoComplete="new-password" hint="At least 8 characters."
            value={form.password} onChange={set('password')} error={fieldErrors.password} disabled={pending} />
          <PhoneField id="phone" label="Your phone" optional placeholder="Your personal mobile number"
            value={form.phone} onChange={setPhone('phone')} error={fieldErrors.phone} disabled={pending} />
        </div>

        <div>
          <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses('primary', 'md', 'w-full')}>
            {pending ? 'Creating account…' : 'Create clinic account'}
          </button>
          <p className="mt-4 text-xs text-pretty text-mq-subtle">
            By registering you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </form>

      <div className="mt-10 space-y-3 border-t border-mq-line pt-6 text-sm text-mq-muted">
        <p>
          Already have an account?{' '}
          <Link href="/login" className={LINK}>Log in</Link>
        </p>
        <p>
          Patient?{' '}
          <Link href="/register" className={LINK}>Create a free account</Link>
        </p>
      </div>
    </div>
  );
}
