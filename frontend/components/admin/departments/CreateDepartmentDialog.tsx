'use client';

import { useState } from 'react';
import { useCreateDepartment } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { AuthField } from '@/components/auth/AuthField';
import { AdminDialog, DialogActions } from '../AdminDialog';

export function CreateDepartmentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateDepartment();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter a department name.');
    try {
      await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      onClose();
    } catch {
      // Error toast is shown by the hook
    }
  };

  return (
    <AdminDialog title="Create a department" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <AuthField id="dept-name" label="Name" placeholder="Cardiology" value={name}
          onChange={(e) => { setName(e.target.value); setError(undefined); }} error={error} />
        <AuthField id="dept-description" label="Description" hint="Optional. Shown to your staff only."
          value={description} onChange={(e) => setDescription(e.target.value)} />
        <DialogActions>
          <button type="button" onClick={onClose} className={buttonClasses('secondary', 'sm')}>Cancel</button>
          <button type="submit" disabled={create.isPending} aria-busy={create.isPending} className={buttonClasses('primary', 'sm')}>
            {create.isPending ? 'Creating…' : 'Create department'}
          </button>
        </DialogActions>
      </form>
    </AdminDialog>
  );
}
