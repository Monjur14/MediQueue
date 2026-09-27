'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSuperOverview, type OverviewCounts } from '@/hooks/api/super';
import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';
import { StatusMark } from '@/components/admin/StatusMark';
import { ErrorLine, PageHeader, Panel, ShareBar, Stat, StatGrid, StatSkeleton } from '@/components/super/ui';
import { daysLeftLabel, fmtDate, fmtInt, fmtMoney, PLAN_LABEL, SUB_STATUS } from '@/components/super/format';

const LINK = cn('inline-flex items-center gap-1 text-sm text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink', EASE);

function SubscriptionMix({ c }: { c: OverviewCounts }) {
  const statuses = [
    { key: 'active', count: c.sub_active },
    { key: 'pending', count: c.sub_pending },
    { key: 'past_due', count: c.sub_past_due },
    { key: 'cancelled', count: c.sub_cancelled },
    { key: 'expired', count: c.sub_expired },
  ] as const;
  const plans = [
    { key: 'solo', count: c.plan_solo },
    { key: 'clinic', count: c.plan_clinic },
    { key: 'hospital', count: c.plan_hospital },
  ] as const;
  const maxStatus = Math.max(...statuses.map((s) => s.count));
  const maxPlan = Math.max(...plans.map((p) => p.count));

  return (
    <div className="grid md:grid-cols-2">
      <div className="border-b border-mq-line p-4 md:border-b-0 md:border-r md:p-6">
        <p className="text-xs text-mq-subtle">By status</p>
        <ul className="mt-4 space-y-4">
          {statuses.map((s) => (
            <li key={s.key}>
              <div className="flex items-baseline justify-between gap-4">
                <StatusMark {...SUB_STATUS[s.key]} />
                <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>{fmtInt(s.count)}</span>
              </div>
              <div className="mt-2"><ShareBar value={s.count} max={maxStatus} /></div>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 md:p-6">
        <p className="text-xs text-mq-subtle">By plan</p>
        <ul className="mt-4 space-y-4">
          {plans.map((p) => (
            <li key={p.key}>
              <div className="flex items-baseline justify-between gap-4">
                <Link href={`/super/tenants?plan=${p.key}`} className="text-sm text-mq-ink hover:text-mq-accent">{PLAN_LABEL[p.key]}</Link>
                <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>{fmtInt(p.count)}</span>
              </div>
              <div className="mt-2"><ShareBar value={p.count} max={maxPlan} /></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SuperOverviewPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useSuperOverview();

  const updated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
    : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Platform" meta={updated ? `Everything on MediQueue. Updated ${updated}, refreshes every minute.` : 'Everything on MediQueue.'} />

      {isError && <ErrorLine onRetry={() => void refetch()} />}
      {isLoading && <StatSkeleton />}

      {data && (() => {
        const c = data.counts;
        const a = data.activity_today;
        const registerTotal = (a.register_clinic_click?.total ?? 0) + (a.register_patient_click?.total ?? 0);
        return (
          <>
            <StatGrid>
              <Stat label="Tenants" value={fmtInt(c.tenants_total)} sub={`${fmtInt(c.tenants_active)} active accounts`} />
              <Stat label="Doctors" value={fmtInt(c.doctors_staff + c.doctors_solo)} sub={`${fmtInt(c.doctors_staff)} staff · ${fmtInt(c.doctors_solo)} solo`} />
              <Stat label="Patients" value={fmtInt(c.patients_total)} sub={`${fmtInt(c.patients_new_7d)} joined in 7 days`} />
              <Stat label="Monthly recurring revenue" value={fmtMoney(c.mrr)} sub={`${fmtMoney(c.revenue_total)} collected to date`} />
            </StatGrid>

            <div className="grid gap-6 lg:grid-cols-12">
              <Panel title="Subscriptions" meta={`${fmtInt(c.tenants_total)} tenants`} className="lg:col-span-7"
                actions={<Link href="/super/subscriptions" className={LINK}>All</Link>}>
                <SubscriptionMix c={c} />
              </Panel>

              <Panel title="Expiring in 14 days" meta={fmtInt(data.expiring_soon.length)} className="lg:col-span-5"
                actions={<Link href="/super/subscriptions?group=expiring" className={LINK}>View</Link>}>
                {data.expiring_soon.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-mq-muted">No plans end in the next two weeks.</p>
                ) : (
                  <ul>
                    {data.expiring_soon.map((s) => {
                      const left = daysLeftLabel(s.days_left, s.status);
                      return (
                        <li key={s.tenant_id} className="flex min-h-12 items-center justify-between gap-4 border-b border-mq-line px-4 py-2 last:border-b-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-mq-ink">{s.tenant_name}</p>
                            <p className="text-xs text-mq-subtle">{PLAN_LABEL[s.plan_name]} · ends {fmtDate(s.current_period_end)}</p>
                          </div>
                          <span className={cn(MONO, 'shrink-0 text-xs tabular-nums', left.tone)}>{left.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Today" meta="Asia/Dhaka"
              actions={<Link href="/super/logs" className={LINK}>Open logs <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></Link>}>
              <div className="grid grid-cols-2 gap-px bg-mq-line md:grid-cols-3 lg:grid-cols-5">
                <Stat label="Tokens issued" value={fmtInt(c.tokens_today)} sub="across all clinics" />
                <Stat label="Queues open now" value={fmtInt(c.sessions_open)} />
                <Stat label="Homepage visits" value={fmtInt(a.home_visit?.total ?? 0)} sub={`${fmtInt(a.home_visit?.unique ?? 0)} unique visitors`} />
                <Stat label="Log in clicks" value={fmtInt(a.login_click?.total ?? 0)} sub={`${fmtInt(a.login_click?.unique ?? 0)} unique`} />
                <Stat label="Register clicks" value={fmtInt(registerTotal)}
                  sub={`${fmtInt(a.register_clinic_click?.total ?? 0)} clinic · ${fmtInt(a.register_patient_click?.total ?? 0)} patient`} />
              </div>
            </Panel>
          </>
        );
      })()}
    </div>
  );
}
