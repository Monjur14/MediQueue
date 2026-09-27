'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useClinicInfo, useListDoctors, useRemoveDoctor, type Doctor } from '@/hooks/api/admin';
import { cn } from '@/lib/utils';
import { buttonClasses, MONO } from '@/components/shared/primitives';
import { ConfirmAction } from '../ConfirmAction';
import { StatusMark, type StatusTone } from '../StatusMark';
import { EmptyPanel, ListSkeleton, TabHeader } from '../TabHeader';
import { InviteDoctorDialog } from './InviteDoctorDialog';

const STATUS: Record<string, { tone: StatusTone; label: string; dot?: boolean }> = {
  active: { tone: 'accent', label: 'Active', dot: true },
  pending_payment: { tone: 'muted', label: 'Pending' },
  inactive: { tone: 'subtle', label: 'Inactive' },
};
const COLS = 'md:grid md:grid-cols-[1fr_1fr_112px_120px] md:items-center md:gap-4';

function DoctorRow({ doctor }: { doctor: Doctor }) {
  const remove = useRemoveDoctor();
  const status = STATUS[doctor.status] ?? { tone: 'muted' as const, label: doctor.status.replace(/_/g, ' ') };

  return (
    <li className={cn(COLS, 'space-y-2 border-b border-mq-line px-4 py-4 last:border-b-0 md:space-y-0')}>
      <p className="truncate text-sm font-medium text-mq-ink">Dr. {doctor.full_name}</p>
      <div className="min-w-0">
        <p className="truncate text-sm text-mq-muted">{doctor.email}</p>
        {doctor.phone && <p className={cn(MONO, 'mt-1 truncate text-xs text-mq-subtle')}>{doctor.phone}</p>}
      </div>
      <StatusMark {...status} />
      <div className="md:text-right">
        <ConfirmAction label="Remove" confirmLabel="Remove doctor" onConfirm={() => remove.mutate(doctor.id)} pending={remove.isPending} />
      </div>
    </li>
  );
}

/** Every doctor in the clinic, with invite and remove. */
export function DoctorsTab() {
  const { data: doctors = [], isLoading } = useListDoctors();
  const { data: clinic } = useClinicInfo();
  const [inviting, setInviting] = useState(false);

  const limit = clinic?.max_doctors;
  const meta = limit ? `${doctors.length} of ${limit} doctors on your plan` : `${doctors.length} ${doctors.length === 1 ? 'doctor' : 'doctors'}`;
  const inviteButton = (
    <button type="button" onClick={() => setInviting(true)} className={buttonClasses('primary', 'sm')}>
      <Plus className="h-4 w-4" strokeWidth={1.75} />
      Invite doctor
    </button>
  );

  return (
    <div className="space-y-6">
      <TabHeader title="Doctors" meta={isLoading ? undefined : meta} actions={inviteButton} />
      {isLoading ? (
        <ListSkeleton />
      ) : doctors.length === 0 ? (
        <EmptyPanel title="No doctors yet" body="Invite your first doctor. They get an email to set their password." action={inviteButton} />
      ) : (
        <div className="border border-mq-line bg-white">
          <div className={cn(COLS, MONO, 'hidden h-10 border-b border-mq-line px-4 text-xs uppercase tracking-wider text-mq-subtle md:grid')}>
            <span>Doctor</span><span>Contact</span><span>Status</span><span />
          </div>
          <ul>{doctors.map((d) => <DoctorRow key={d.id} doctor={d} />)}</ul>
        </div>
      )}
      {inviting && <InviteDoctorDialog onClose={() => setInviting(false)} />}
    </div>
  );
}
