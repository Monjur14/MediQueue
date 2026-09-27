'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSuperTenants, type SubscriptionStatus, type TenantRow } from '@/hooks/api/super';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { StatusMark } from '@/components/admin/StatusMark';
import { SELECT_CLASS } from '@/components/admin/SelectField';
import { Cell2, DataTable, ErrorLine, PageHeader, Pager, Panel, SearchField, Segmented, type Column } from '@/components/super/ui';
import { daysLeftLabel, fmtDate, fmtInt, PLAN_LABEL, SUB_STATUS } from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';
import type { PlanName } from '@/types';

type PlanFilter = 'all' | PlanName;
const PLANS: PlanName[] = ['solo', 'clinic', 'hospital'];
const STATUSES: (SubscriptionStatus | 'none')[] = ['active', 'pending', 'past_due', 'cancelled', 'expired', 'none'];

const COLUMNS: Column<TenantRow>[] = [
  { key: 'tenant', header: 'Tenant', width: '26%', render: (t) => <Cell2 primary={t.name} secondary={t.email} /> },
  { key: 'plan', header: 'Plan', render: (t) => (t.plan_name ? PLAN_LABEL[t.plan_name] : <span className="text-mq-subtle">—</span>) },
  { key: 'status', header: 'Status', render: (t) => <StatusMark {...SUB_STATUS[t.subscription_status ?? 'none']} /> },
  {
    key: 'expires', header: 'Expires', render: (t) => {
      const left = daysLeftLabel(t.days_left, t.subscription_status);
      return <Cell2 primary={fmtDate(t.current_period_end)} secondary={<span className={left.tone}>{left.text}</span>} mono />;
    },
  },
  { key: 'doctors', header: 'Doctors', align: 'right', render: (t) => <span className={MONO}>{fmtInt(t.doctors)}</span> },
  { key: 'seen', header: 'Patients seen', align: 'right', render: (t) => <span className={MONO}>{fmtInt(t.patients_seen)}</span> },
  { key: 'last', header: 'Last queue', render: (t) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(t.last_session)}</span> },
  { key: 'joined', header: 'Joined', render: (t) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(t.created_at)}</span> },
];

function TenantsView() {
  const url = useUrlState();
  const plan = (PLANS.includes(url.get('plan') as PlanName) ? url.get('plan') : 'all') as PlanFilter;
  const status = STATUSES.find((s) => s === url.get('status'));
  const page = Math.max(1, Number(url.get('page')) || 1);
  const urlQ = url.get('q');

  const [search, setSearch] = useState(urlQ);
  const q = useDebouncedValue(search.trim(), 350);
  useEffect(() => {
    if (q !== urlQ) url.set({ q, page: 1 });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching, isError, refetch } = useSuperTenants({
    ...(plan !== 'all' ? { plan } : {}),
    ...(status ? { status } : {}),
    ...(urlQ ? { q: urlQ } : {}),
    page,
  });

  const byPlan = data?.by_plan;
  const count = (n: number | undefined) => (byPlan ? (n ?? 0) : undefined);
  const allCount = byPlan ? Object.values(byPlan).reduce((a, b) => a + (b ?? 0), 0) : undefined;
  const filtered = Boolean(urlQ || status || plan !== 'all');

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" meta="Every clinic, hospital and solo doctor with an account." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented<PlanFilter>
          label="Filter by plan"
          value={plan}
          onChange={(v) => url.set({ plan: v === 'all' ? null : v, page: 1 })}
          options={[
            { value: 'all', label: 'All', count: allCount },
            { value: 'solo', label: 'Solo doctors', count: count(byPlan?.solo) },
            { value: 'clinic', label: 'Clinics', count: count(byPlan?.clinic) },
            { value: 'hospital', label: 'Hospitals', count: count(byPlan?.hospital) },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="w-full sm:w-44">
            <span className="sr-only">Subscription status</span>
            <select className={SELECT_CLASS} value={status ?? ''} onChange={(e) => url.set({ status: e.target.value || null, page: 1 })}>
              <option value="">Any status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{SUB_STATUS[s].label}</option>)}
            </select>
          </label>
          <SearchField value={search} onChange={setSearch} placeholder="Search name, email or slug" />
        </div>
      </div>

      {isError ? <ErrorLine onRetry={() => void refetch()} /> : (
        <Panel title="Tenant list" meta={data ? `${fmtInt(data.total)} found` : undefined}>
          <DataTable
            columns={COLUMNS}
            rows={data?.items}
            rowKey={(t) => t.id}
            loading={isLoading}
            fetching={isFetching && !isLoading}
            minWidth="min-w-[960px]"
            empty={filtered ? 'No tenants match these filters.' : 'No tenants have registered yet.'}
          />
          {data && <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={(p) => url.set({ page: p })} />}
        </Panel>
      )}
    </div>
  );
}

export default function SuperTenantsPage() {
  return <Suspense><TenantsView /></Suspense>;
}
