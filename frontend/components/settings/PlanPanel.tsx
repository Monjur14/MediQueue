import type { TenantInfo } from '@/hooks/api/admin';
import { PLANS, formatPlanPrice } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { SettingsSection } from './SettingsSection';

function Limit({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-mq-subtle">{label}</dt>
      <dd className={cn(MONO, 'mt-1 font-medium tabular-nums text-mq-ink', value === null ? 'text-base' : 'text-2xl')}>
        {value ?? 'No limit'}
      </dd>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-mq-line py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-sm text-mq-muted">{label}</dt>
      <dd className={cn('min-w-0 truncate text-sm text-mq-ink', mono && MONO)}>{value}</dd>
    </div>
  );
}

/** Read only: login details, current plan and what it allows. */
export function PlanPanel({ clinic }: { clinic: TenantInfo }) {
  const plan = PLANS.find((p) => p.key === clinic.plan_name);

  return (
    <div className="border border-mq-line bg-white">
      <SettingsSection title="Account" description="Used to sign in. Contact support to change these.">
        <dl>
          <Row label="Login email" value={clinic.email} />
          <Row label="Clinic ID" value={clinic.slug} mono />
        </dl>
      </SettingsSection>

      <SettingsSection title="Plan" description="What your subscription includes each day.">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-xl font-medium tracking-tight text-mq-ink">{plan ? `${plan.name} plan` : 'No plan'}</p>
          {plan && (
            <p className="text-sm text-mq-muted">
              <span className={cn(MONO, 'text-mq-ink')}>{formatPlanPrice(plan.price)}</span> a month
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-px border border-mq-line bg-mq-line">
          <Limit label="Doctors" value={clinic.max_doctors} />
          <Limit label="Departments" value={clinic.max_departments} />
          <Limit label="Patients a day" value={clinic.max_daily_patients} />
        </dl>
      </SettingsSection>
    </div>
  );
}
