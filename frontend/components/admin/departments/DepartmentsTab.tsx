'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useClinicInfo, useDepartmentOverview } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { EmptyPanel, ListSkeleton, TabHeader } from '../TabHeader';
import { CreateDepartmentDialog } from './CreateDepartmentDialog';
import { DepartmentPanel } from './DepartmentPanel';

export function DepartmentsTab() {
  const { data: overview, isLoading } = useDepartmentOverview();
  const { data: clinic } = useClinicInfo();
  const [creating, setCreating] = useState(false);

  const departments = overview?.departments ?? [];
  const unassigned = overview?.unassigned_doctors ?? [];
  const limit = clinic?.max_departments;
  const count = `${departments.length}${limit ? ` of ${limit}` : ''} ${departments.length === 1 && !limit ? 'department' : 'departments'}`;
  const unassignedText = `${unassigned.length} ${unassigned.length === 1 ? 'doctor' : 'doctors'} not assigned`;
  const meta = unassigned.length ? `${count} · ${unassignedText}` : count;

  const createButton = (
    <button type="button" onClick={() => setCreating(true)} className={buttonClasses('primary', 'sm')}>
      <Plus className="h-4 w-4" strokeWidth={1.75} />
      Create department
    </button>
  );

  return (
    <div className="space-y-6">
      <TabHeader title="Departments" meta={isLoading ? undefined : meta} actions={createButton} />
      {isLoading ? (
        <ListSkeleton />
      ) : departments.length === 0 ? (
        <EmptyPanel title="No departments yet" body="Create departments to group doctors and run a separate queue for each." action={createButton} />
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => <DepartmentPanel key={dept.id} dept={dept} unassignedDoctors={unassigned} />)}
        </div>
      )}
      {creating && <CreateDepartmentDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
