'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useOpenSession } from '@/hooks/api/doctor';
import { useClinicInfo, useDepartmentOverview } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { AuthLabel } from '@/components/auth/AuthField';
import { AdminDialog, DialogActions } from '../AdminDialog';
import { SelectField } from '../SelectField';

/** Open today's queue for a doctor, optionally in a department, with a token cap.
 *
 * Bidirectional linking:
 * - Doctor chosen first  → department auto-fills to their first assigned dept.
 * - Department chosen first → doctor list narrows to that dept's doctors only;
 *   if the current doctor isn't in that dept, selection resets to first match.
 */
export function OpenSessionDialog({ onClose }: { onClose: () => void }) {
  const user        = useAuthStore((s) => s.user);
  const { data: clinic }   = useClinicInfo();
  const { data: overview } = useDepartmentOverview();
  const openSession = useOpenSession();

  const planLimit  = clinic?.max_daily_patients ?? null;
  const sliderMax  = planLimit ?? 500;

  const [deptId,    setDeptId]    = useState('');
  const [doctorId,  setDoctorId]  = useState(user?.id ?? '');
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const effectiveMax = maxTokens ?? sliderMax;

  // ── Derived lookup maps ────────────────────────────────────────────
  const depts = overview?.departments ?? [];

  // doctorId → first departmentId it belongs to
  const doctorToDept = new Map<string, string>();
  // deptId   → that dept's doctor list
  const deptToDoctors = new Map<string, typeof depts[0]['doctors']>();

  for (const dept of depts) {
    deptToDoctors.set(dept.id, dept.doctors);
    for (const doc of dept.doctors) {
      if (!doctorToDept.has(doc.id)) doctorToDept.set(doc.id, dept.id);
    }
  }

  // All unique doctors (assigned + unassigned), deduplicated by id
  const allDoctors = [
    ...depts.flatMap((d) => d.doctors),
    ...(overview?.unassigned_doctors ?? []),
  ].filter((doc, i, arr) => arr.findIndex((d) => d.id === doc.id) === i);

  // Visible doctor list depends on whether a dept is selected
  const visibleDoctors = deptId ? (deptToDoctors.get(deptId) ?? []) : allDoctors;

  // ── Handlers ──────────────────────────────────────────────────────
  const handleDoctorChange = (newId: string) => {
    setDoctorId(newId);
    // Auto-fill department when a real doctor (not "myself") is picked
    if (newId && newId !== user?.id) {
      const autoDept = doctorToDept.get(newId);
      if (autoDept) setDeptId(autoDept);
    }
  };

  const handleDeptChange = (newDeptId: string) => {
    setDeptId(newDeptId);
    if (!newDeptId) return; // "General" chosen — keep current doctor

    // If current doctor isn't in the new dept, reset to first doctor in it
    const doctorsInDept = deptToDoctors.get(newDeptId) ?? [];
    const isMyselfRole  = doctorId === (user?.id ?? '');
    const stillValid    = isMyselfRole || doctorsInDept.some((d) => d.id === doctorId);
    if (!stillValid) {
      setDoctorId(doctorsInDept[0]?.id ?? (user?.id ?? ''));
    }
  };

  const handleOpen = async () => {
    try {
      await openSession.mutateAsync({
        doctor_id:    doctorId || (user?.id ?? ''),
        department_id: deptId || undefined,
        max_tokens:   effectiveMax,
        session_date: new Date().toLocaleDateString('en-CA'),
      });
      onClose();
    } catch {
      // Error toast is shown by the hook; keep dialog open
    }
  };

  return (
    <AdminDialog
      title="Open today's queue"
      description="Patients can get tokens as soon as the queue is open."
      onClose={onClose}
    >
      {/* Doctor ── narrows when dept is selected */}
      {allDoctors.length > 0 && (
        <SelectField
          id="open-doctor"
          label="Doctor"
          value={doctorId}
          onChange={(e) => handleDoctorChange(e.target.value)}
        >
          <option value={user?.id ?? ''}>Myself ({user?.name})</option>
          {visibleDoctors
            .filter((d) => d.id !== user?.id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name}
              </option>
            ))}
        </SelectField>
      )}

      {/* Department ── auto-fills when doctor is selected */}
      {depts.length > 0 && (
        <SelectField
          id="open-dept"
          label="Department"
          value={deptId}
          onChange={(e) => handleDeptChange(e.target.value)}
        >
          <option value="">General (no department)</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
      )}

      {/* Token limit slider */}
      <div>
        <div className="flex items-baseline justify-between">
          <AuthLabel htmlFor="open-max">Token limit</AuthLabel>
          <span className="font-mono text-sm tabular-nums text-mq-ink">{effectiveMax}</span>
        </div>
        <input
          id="open-max"
          type="range"
          min={10}
          max={sliderMax}
          step={5}
          value={effectiveMax}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="mt-3 w-full accent-mq-accent"
        />
        <div className="mt-1 flex justify-between text-xs text-mq-subtle">
          <span>10</span>
          <span>{planLimit !== null ? `${planLimit} (plan limit)` : `${sliderMax} (unlimited plan)`}</span>
        </div>
      </div>

      <DialogActions>
        <button type="button" onClick={onClose} className={buttonClasses('secondary', 'sm')}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleOpen}
          disabled={openSession.isPending}
          aria-busy={openSession.isPending}
          className={buttonClasses('primary', 'sm')}
        >
          {openSession.isPending ? 'Opening…' : 'Open queue'}
        </button>
      </DialogActions>
    </AdminDialog>
  );
}
