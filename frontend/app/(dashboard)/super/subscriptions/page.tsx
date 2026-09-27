'use client';

import { Suspense } from 'react';
import { useSuperSubscriptions, type SubscriptionGroup, type SubscriptionRow } from '@/hooks/api/super';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { StatusMark } from '@/components/admin/StatusMark';
import { Cell2, DataTable, ErrorLine, PageHeader, Panel, Segmented, type Column } from '@/components/super/ui';
import { daysLeftLabel, fmtDate, fmtInt, fmtMoney, PLAN_LABEL, SUB_STATUS } from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';

const GROUPS: SubscriptionGroup[] = ['all', 'active', 'expiring', 'pending', 'ended'];

const GROUP_LABEL: Record<SubscriptionGroup, string> = {
  all: 'All',
  active: 'Active',
  expiring: 'Ending in 30 days',
  pending: 'Pending',
  ended: 'Ended',
};

const GROUP_EMPTY: Record<SubscriptionGroup, string> = {
  all: 'No subscriptions yet.',
  active: 'No active subscriptions.',
  expiring: 'No plans end in the next 30 days.',
  pending: 'No tenants are waiting on a first payment.',
  ended: 'No past due, cancelled or expired subscriptions.',
};

const COLUMNS: Column<SubscriptionRow>[] = [
  { key: 'tenant', header: 'Tenant', width: '26%', render: (s) => <Cell2 primary={s.tenant_name} secondary={s.tenant_email} /> },
  { key: 'plan', header: 'Plan', render: (s) => <Cell2 primary={PLAN_LABEL[s.plan_name]} secondary={`${fmtMoney(s.monthly_price)} / mo`} mono /> },
  { key: 'status', header: 'Status', render: (s) => <StatusMark {...SUB_STATUS[s.status]} /> },
  { key: 'start', header: 'Started', render: (s) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(s.current_period_start)}</span> },
  { key: 'end', header: 'Ends', render: (s) => <span className={cn(MONO, 'text-xs text-mq-ink')}>{fmtDate(s.current_period_end)}</span> },
  {
    key: 'left', header: 'Time left', align: 'right', render: (s) => {
      const left = daysLeftLabel(s.days_left, s.status);
      return <span className={cn(MONO, 'text-xs', left.tone)}>{left.text}</span>;
    },
  },
  {
    key: 'renew', header: 'Renewal', render: (s) =>
      s.cancelled_at ? <span className="text-sm text-mq-muted">Cancelled {fmtDate(s.cancelled_at)}</span>
        : s.cancel_at_period_end ? <span className="text-sm text-mq-danger">Cancels at period end</span>
        : <span className="text-sm text-mq-muted">Renews</span>,
  },
];

function SubscriptionsView() {
  const url = useUrlState();
  const group = GROUPS.find((g) => g === url.get('group')) ?? 'all';
  const { data, isLoading, isFetching, isError, refetch } = useSuperSubscriptions(group);

  const mrrInView = data?.items.filter((s) => s.status === 'active' && s.days_left >= 0).reduce((sum, s) => sum + s.monthly_price, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        meta="The current plan for each tenant, sorted by the date it ends."
      />

      <Segmented<SubscriptionGroup>
        label="Filter subscriptions"
        value={group}
        onChange={(v) => url.set({ group: v === 'all' ? null : v })}
        options={GROUPS.map((g) => ({ value: g, label: GROUP_LABEL[g], count: data?.counts[g] }))}
      />

      {isError ? <ErrorLine onRetry={() => void refetch()} /> : (
        <Panel
          title={GROUP_LABEL[group]}
          meta={data ? `${fmtInt(data.items.length)} tenants · ${fmtMoney(mrrInView)} / mo active` : undefined}
        >
          <DataTable
            columns={COLUMNS}
            rows={data?.items}
            rowKey={(s) => s.id}
            loading={isLoading}
            fetching={isFetching && !isLoading}
            minWidth="min-w-[960px]"
            empty={GROUP_EMPTY[group]}
          />
        </Panel>
      )}
    </div>
  );
}

export default function SuperSubscriptionsPage() {
  return <Suspense><SubscriptionsView /></Suspense>;
}
