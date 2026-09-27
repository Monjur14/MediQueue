'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useDeleteDepartment, useRemoveDoctorFromDept, useUpdateDepartment, type DepartmentWithDoctors,
} from '@/hooks/api/admin';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { ConfirmAction } from '../ConfirmAction';
import { StatusMark } from '../StatusMark';
import { AssignDoctorDialog } from './AssignDoctorDialog';

type Props = {
  dept: DepartmentWithDoctors;
  unassignedDoctors: { id: string; full_name: string; status: string }[];
};

/** One department: status, its doctors and management actions. */
export function DepartmentPanel({ dept, unassignedDoctors }: Props) {
  const [assigning, setAssigning] = useState(false);
  const removeDoctor = useRemoveDoctorFromDept();
  const deleteDept = useDeleteDepartment();
  const updateDept = useUpdateDepartment();

  return (
    <section className="border border-mq-line bg-white" aria-label={dept.name}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-mq-line px-4 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-mq-ink">{dept.name}</h3>
          {dept.description && <p className="mt-1 text-sm text-mq-muted">{dept.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <StatusMark tone={dept.is_active ? 'accent' : 'subtle'} label={dept.is_active ? 'Active' : 'Inactive'} dot />
          <button type="button" disabled={updateDept.isPending}
            onClick={() => updateDept.mutate({ id: dept.id, is_active: !dept.is_active })}
            className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink disabled:opacity-40', EASE)}>
            {dept.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <ConfirmAction label="Delete" confirmLabel="Delete department" onConfirm={() => deleteDept.mutate(dept.id)} pending={deleteDept.isPending} />
        </div>
      </div>

      {dept.doctors.length === 0 ? (
        <p className="px-4 py-4 text-sm text-mq-muted">No doctors assigned yet.</p>
      ) : (
        <ul>
          {dept.doctors.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 border-b border-mq-line px-4 py-3 last:border-b-0">
              <span className="truncate text-sm text-mq-ink">Dr. {d.full_name}</span>
              <ConfirmAction label="Remove" confirmLabel="Remove from department"
                onConfirm={() => removeDoctor.mutate({ deptId: dept.id, doctorId: d.id })} pending={removeDoctor.isPending} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-mq-line px-4 py-3">
        <button type="button" onClick={() => setAssigning(true)} className={buttonClasses('secondary', 'sm')}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Assign doctor
        </button>
      </div>

      {assigning && <AssignDoctorDialog dept={dept} unassignedDoctors={unassignedDoctors} onClose={() => setAssigning(false)} />}
    </section>
  );
}
