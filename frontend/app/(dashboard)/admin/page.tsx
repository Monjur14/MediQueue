'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useClinicInfo } from '@/hooks/api/admin';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { SessionsTab } from '@/components/admin/sessions/SessionsTab';
import { DoctorsTab } from '@/components/admin/doctors/DoctorsTab';
import { DepartmentsTab } from '@/components/admin/departments/DepartmentsTab';
import { AnalyticsTab } from '@/components/admin/analytics/AnalyticsTab';

type Tab = 'sessions' | 'doctors' | 'departments' | 'analytics';

const PLAN_LABEL: Record<string, string> = { solo: 'Solo Doctor plan', clinic: 'Clinic plan', hospital: 'Hospital plan' };

export default function AdminDashboardPage() {
  const { user, loading } = useRequireAuth(['tenant_admin']);
  const { data: clinic } = useClinicInfo();
  const [tab, setTab] = useState<Tab>('sessions');

  if (loading || !user) return null;

  // Solo plan: one doctor, one department, so the management tabs are hidden
  const isSolo = user.plan_name === 'solo' || !user.plan_name;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'sessions', label: 'Today' },
    ...(isSolo ? [] : [{ id: 'doctors' as Tab, label: 'Doctors' }, { id: 'departments' as Tab, label: 'Departments' }]),
    { id: 'analytics' as Tab, label: 'Analytics' },
  ];
  const clinicName = clinic?.name ?? user.clinic_name;
  const plan = PLAN_LABEL[clinic?.plan_name ?? user.plan_name ?? ''];

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">{clinicName ?? 'Dashboard'}</h1>
      <p className="mt-1 text-sm text-mq-muted">{[plan, user.name].filter(Boolean).join(' · ')}</p>

      {tabs.length > 1 && (
        <div role="tablist" aria-label="Dashboard sections" className="mt-8 flex gap-6 border-b border-mq-line">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={cn(
                'translate-y-px border-b-2 pb-3 text-sm transition-colors duration-500',
                EASE,
                tab === t.id ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
              )}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8" role="tabpanel">
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'doctors' && !isSolo && <DoctorsTab />}
        {tab === 'departments' && !isSolo && <DepartmentsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </main>
  );
}
