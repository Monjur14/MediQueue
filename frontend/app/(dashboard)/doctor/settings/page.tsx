'use client';

import { useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateDoctorProfile, type DoctorProfileUpdate } from '@/hooks/api/doctor';
import { AuthField } from '@/components/auth/AuthField';
import { PhoneField } from '@/components/auth/PhoneField';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';

type Errors = { name?: string; phone?: string };

export default function DoctorSettingsPage() {
  const { user, loading } = useRequireAuth(['doctor', 'tenant_admin']);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdateDoctorProfile();

  const saved = { name: user?.name ?? '', phone: user?.phone ?? '' };
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [errors, setErrors] = useState<Errors>({});

  if (loading || !user) return null;

  const dirty = name.trim() !== saved.name || phone !== saved.phone;
  const pending = update.isPending;

  const reset = () => {
    setName(saved.name);
    setPhone(saved.phone);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter your full name.';
    if (phone && !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number for the selected country.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: DoctorProfileUpdate = { full_name: name.trim() };
    if (phone) body.phone = phone;
    try {
      const doctor = await update.mutateAsync(body);
      if (user) setUser({ ...user, name: doctor.full_name, phone: doctor.phone ?? user.phone });
    } catch {
      // Error toast shown by the hook
    }
  };

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-mq-muted">Manage your profile details.</p>

      <section className="mt-8 border border-mq-line bg-white" aria-labelledby="doctor-details-title">
        <div className="px-6 py-5 md:px-8">
          <h2 id="doctor-details-title" className="text-base font-medium text-mq-ink">Your details</h2>
          <p className="mt-1 text-sm text-mq-muted">How patients and reception see you.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="border-t border-mq-line">
          <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
            <AuthField id="doctor_name" label="Full name" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} error={errors.name} disabled={pending} />
            <PhoneField id="doctor_phone" label="Phone number" value={phone} onChange={setPhone}
              defaultCountry="BD" error={errors.phone} disabled={pending} />
            <div className="md:col-span-2">
              <AuthField id="doctor_email" label="Email" type="email" value={user?.email ?? ''} readOnly
                hint="Your email is your login and can't be changed here." />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-4 border-t border-mq-line p-4 sm:flex-row sm:items-center sm:justify-end md:px-8">
            {dirty && !pending && (
              <button type="button" onClick={reset}
                className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
                Discard changes
              </button>
            )}
            <button type="submit" disabled={!dirty || pending} aria-busy={pending}
              className={buttonClasses('primary', 'md', 'sm:min-w-[160px]')}>
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
