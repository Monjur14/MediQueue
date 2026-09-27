'use client';

import { useState } from 'react';
import { useAssignDoctor, type DepartmentWithDoctors } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { AdminDialog, DialogActions } from '../AdminDialog';
import { SelectField } from '../SelectField';

type Props = {
  dept: DepartmentWithDoctors;
  unassignedDoctors: { id: string; full_name: string; status: string }[];
  onClose: () => void;
};

export function AssignDoctorDialog({ dept, unassignedDoctors, onClose }: Props) {
  const assign = useAssignDoctor();
  const [doctorId, setDoctorId] = useState('');

  const handleAssign = async () => {
    if (!doctorId) return;
    try {
      await assign.mutateAsync({ deptId: dept.id, doctorId });
      onClose();
    } catch {
      // Error toast is shown by the hook
    }
  };

  return (
    <AdminDialog title={`Assign a doctor to ${dept.name}`} onClose={onClose}>
      {unassignedDoctors.length === 0 ? (
        <p className="text-sm text-mq-muted">Every doctor is already assigned to a department.</p>
      ) : (
        <SelectField id="assign-doctor" label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">Choose a doctor</option>
          {unassignedDoctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
        </SelectField>
      )}
      <DialogActions>
        <button type="button" onClick={onClose} className={buttonClasses('secondary', 'sm')}>
          {unassignedDoctors.length === 0 ? 'Close' : 'Cancel'}
        </button>
        {unassignedDoctors.length > 0 && (
          <button type="button" onClick={handleAssign} disabled={!doctorId || assign.isPending} aria-busy={assign.isPending}
            className={buttonClasses('primary', 'sm')}>
            {assign.isPending ? 'Assigning…' : 'Assign doctor'}
          </button>
        )}
      </DialogActions>
    </AdminDialog>
  );
}
