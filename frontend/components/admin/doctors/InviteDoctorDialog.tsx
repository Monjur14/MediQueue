'use client';

import { useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useInviteDoctor } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { AuthField } from '@/components/auth/AuthField';
import { PhoneField } from '@/components/auth/PhoneField';
import { AdminDialog, DialogActions } from '../AdminDialog';

type Errors = { name?: string; email?: string; phone?: string };

/** Invite a doctor by email. They receive a link to set their password. */
export function InviteDoctorDialog({ onClose }: { onClose: () => void }) {
  const invite = useInviteDoctor();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.full_name.trim()) next.name = 'Enter the doctor’s full name.';
    if (!form.email) next.email = 'Enter an email address.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.phone && !isValidPhoneNumber(form.phone)) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await invite.mutateAsync({ full_name: form.full_name.trim(), email: form.email, phone: form.phone || undefined });
      onClose();
    } catch {
      // Error toast is shown by the hook
    }
  };

  return (
    <AdminDialog title="Invite a doctor" description="We email them a link to set their password." onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <AuthField id="invite-name" label="Full name" autoComplete="off" value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} error={errors.name} />
        <AuthField id="invite-email" label="Email" type="email" autoComplete="off" value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} error={errors.email} />
        <PhoneField id="invite-phone" label="Phone" optional value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={errors.phone} />
        <DialogActions>
          <button type="button" onClick={onClose} className={buttonClasses('secondary', 'sm')}>Cancel</button>
          <button type="submit" disabled={invite.isPending} aria-busy={invite.isPending} className={buttonClasses('primary', 'sm')}>
            {invite.isPending ? 'Sending invite…' : 'Send invite'}
          </button>
        </DialogActions>
      </form>
    </AdminDialog>
  );
}
