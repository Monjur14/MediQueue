'use client';

import { useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useUpdateClinic, type TenantInfo } from '@/hooks/api/admin';
import { AuthField } from '@/components/auth/AuthField';
import { PhoneField } from '@/components/auth/PhoneField';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';
import { SettingsSection } from './SettingsSection';
import { LogoPreview } from './LogoPreview';

type Errors = { name?: string; phone?: string; logo?: string };

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Editable clinic profile. Mount with key={clinic.updated_at} so a saved change resets the form. */
export function ClinicDetailsForm({ clinic }: { clinic: TenantInfo }) {
  const update = useUpdateClinic();
  const saved = { name: clinic.name, phone: clinic.phone ?? '', logo: clinic.logo_url ?? '' };
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [logo, setLogo] = useState(saved.logo);
  const [errors, setErrors] = useState<Errors>({});

  const dirty = name.trim() !== saved.name || phone !== saved.phone || logo.trim() !== saved.logo;
  const pending = update.isPending;

  const reset = () => {
    setName(saved.name);
    setPhone(saved.phone);
    setLogo(saved.logo);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Enter the clinic name (at least 2 characters).';
    if (phone && !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number for the selected country.';
    if (logo.trim() && !isHttpUrl(logo.trim())) next.logo = 'Enter a full link starting with https://';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await update.mutateAsync({
        name: name.trim(),
        phone: phone || undefined,
        logo_url: logo.trim() || undefined,
      });
    } catch {
      // Error toast is shown by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="border border-mq-line bg-white">
      <SettingsSection title="Clinic details" description="Patients see these when they search for your clinic and on their token.">
        <AuthField id="clinic_name" label="Clinic name" autoComplete="organization" value={name}
          onChange={(e) => setName(e.target.value)} error={errors.name} disabled={pending} />
        <PhoneField id="clinic_phone" label="Front desk phone" value={phone} onChange={setPhone}
          defaultCountry="BD" error={errors.phone} disabled={pending} />
      </SettingsSection>

      <SettingsSection title="Logo" description="A square image works best. Paste a public link to it.">
        <div className="flex items-start gap-4">
          <LogoPreview url={logo.trim() && isHttpUrl(logo.trim()) ? logo.trim() : ''} name={name} />
          <div className="min-w-0 flex-1">
            <AuthField id="clinic_logo" label="Logo link" type="url" inputMode="url" placeholder="https://"
              value={logo} onChange={(e) => setLogo(e.target.value)} error={errors.logo} disabled={pending}
              hint="Optional. Leave empty to show your clinic’s initial." />
          </div>
        </div>
      </SettingsSection>

      <div className="flex flex-col-reverse gap-4 border-t border-mq-line p-6 sm:flex-row sm:items-center sm:justify-end md:px-8">
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
  );
}
