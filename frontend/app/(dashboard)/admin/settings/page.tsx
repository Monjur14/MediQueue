'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { useClinicInfo } from '@/hooks/api/admin';
import { buttonClasses } from '@/components/shared/primitives';
import { ClinicDetailsForm } from '@/components/settings/ClinicDetailsForm';
import { PlanPanel } from '@/components/settings/PlanPanel';

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-6 border border-mq-line bg-white p-6 md:grid-cols-[240px_1fr] md:gap-8 md:p-8">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse bg-mq-line" />
            <div className="h-4 w-48 animate-pulse bg-mq-line" />
          </div>
          <div className="space-y-4">
            <div className="h-10 animate-pulse bg-mq-line" />
            <div className="h-10 animate-pulse bg-mq-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading } = useRequireAuth(['tenant_admin']);
  const { data: clinic, isLoading, isError, refetch, isFetching } = useClinicInfo();

  if (loading || !user) return null;

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-mq-muted">{clinic?.name ?? user.clinic_name ?? 'Your clinic'}</p>

      <div className="mt-8">
        {isLoading ? (
          <SettingsSkeleton />
        ) : isError || !clinic ? (
          <div className="border border-mq-line bg-white p-6 md:p-8">
            <p className="text-base font-medium text-mq-ink">Couldn’t load your clinic settings</p>
            <p className="mt-2 text-sm text-mq-muted">Check your connection and try again.</p>
            <button type="button" onClick={() => void refetch()} disabled={isFetching}
              className={buttonClasses('secondary', 'sm', 'mt-6')}>
              {isFetching ? 'Loading…' : 'Try again'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <ClinicDetailsForm key={clinic.updated_at} clinic={clinic} />
            <PlanPanel clinic={clinic} />
          </div>
        )}
      </div>
    </main>
  );
}
