'use client';

import { useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useAuthStore } from '@/store/auth.store';
import { useUpdatePatientProfile, type PatientProfile } from '@/hooks/api/queue';
import { AuthField } from '@/components/auth/AuthField';
import { PhoneField } from '@/components/auth/PhoneField';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';
import { ChannelPicker } from './ChannelPicker';

type Channel = PatientProfile['preferred_channel'];
type Errors = { name?: string; phone?: string };

type SectionProps = { title: string; description: string; children: React.ReactNode };

/** Settings row: label and description on the left, fields on the right. */
function Section({ title, description, children }: SectionProps) {
  return (
    <section className="grid gap-6 border-t border-mq-line p-6 first:border-t-0 md:grid-cols-[200px_1fr] md:gap-8 md:p-8">
      <div>
        <h2 className="text-base font-medium text-mq-ink">{title}</h2>
        <p className="mt-1 text-sm text-pretty text-mq-muted">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdatePatientProfile();

  const saved = {
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    channel: (user?.preferred_channel ?? 'whatsapp') as Channel,
  };
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [channel, setChannel] = useState<Channel>(saved.channel);
  const [errors, setErrors] = useState<Errors>({});

  const dirty = name.trim() !== saved.name || phone !== saved.phone || channel !== saved.channel;
  const pending = update.isPending;

  const reset = () => {
    setName(saved.name);
    setPhone(saved.phone);
    setChannel(saved.channel);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter your full name.';
    if (phone && !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number for the selected country.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: Partial<PatientProfile> = { full_name: name.trim(), preferred_channel: channel };
    if (phone) body.phone = phone;
    try {
      await update.mutateAsync(body);
      if (user) setUser({ ...user, name: name.trim(), phone: phone || user.phone, preferred_channel: channel });
    } catch {
      // Error toast is shown by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="border border-mq-line bg-white">
      <Section title="Personal details" description="How clinics see you when they call your token.">
        <AuthField id="full_name" label="Full name" autoComplete="name" value={name}
          onChange={(e) => setName(e.target.value)} error={errors.name} disabled={pending} />
        <AuthField id="email" label="Email" type="email" value={user?.email ?? ''} readOnly
          hint="Your email is your login and can't be changed." />
      </Section>

      <Section title="Phone and alerts" description="Where we tell you your turn is close.">
        <PhoneField id="phone" label="Phone number" value={phone} onChange={setPhone}
          error={errors.phone} disabled={pending} />
        <ChannelPicker value={channel} onChange={setChannel} disabled={pending} />
        {!phone && (
          <p className="text-xs text-mq-subtle">Add a phone number to receive WhatsApp or SMS alerts.</p>
        )}
      </Section>

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
