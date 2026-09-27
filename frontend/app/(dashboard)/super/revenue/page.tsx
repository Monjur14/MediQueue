'use client';

import { useSuperRevenue, type InvoiceRow } from '@/hooks/api/super';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { StatusMark, type StatusTone } from '@/components/admin/StatusMark';
import { BarChart, Cell2, DataTable, ErrorLine, PageHeader, Panel, ShareBar, Stat, StatGrid, StatSkeleton, type Column } from '@/components/super/ui';
import { fmtDate, fmtInt, fmtMoney, fmtMonthShort, pct, PLAN_LABEL } from '@/components/super/format';

const INVOICE_STATUS: Record<InvoiceRow['status'], { tone: StatusTone; label: string; dot?: boolean }> = {
  paid: { tone: 'accent', label: 'Paid', dot: true },
  pending: { tone: 'ink', label: 'Pending' },
  failed: { tone: 'danger', label: 'Failed' },
  refunded: { tone: 'muted', label: 'Refunded' },
  void: { tone: 'struck', label: 'Void' },
};

const PROVIDER: Record<string, string> = { stripe: 'Stripe', bkash: 'bKash', sslcommerz: 'SSLCommerz', manual: 'Manual' };

const INVOICE_COLUMNS: Column<InvoiceRow>[] = [
  { key: 'tenant', header: 'Tenant', width: '28%', render: (i) => <Cell2 primary={i.tenant_name} secondary={i.plan_name ? PLAN_LABEL[i.plan_name] : undefined} /> },
  { key: 'amount', header: 'Amount', align: 'right', render: (i) => <span className={MONO}>{fmtMoney(i.amount)}</span> },
  { key: 'status', header: 'Status', render: (i) => <StatusMark {...INVOICE_STATUS[i.status]} /> },
  { key: 'provider', header: 'Paid with', render: (i) => <span className="text-sm text-mq-muted">{i.provider ? PROVIDER[i.provider] ?? i.provider : '—'}</span> },
  {
    key: 'period', header: 'Period', render: (i) =>
      <span className={cn(MONO, 'text-xs text-mq-muted')}>{i.period_start ? `${fmtDate(i.period_start)} – ${fmtDate(i.period_end)}` : '—'}</span>,
  },
  { key: 'date', header: 'Date', render: (i) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(i.paid_at ?? i.created_at)}</span> },
];

export default function SuperRevenuePage() {
  const { data, isLoading, isError, refetch } = useSuperRevenue();

  return (
    <div className="space-y-8">
      <PageHeader title="Revenue" meta="What tenants pay MediQueue. Patients never pay." />

      {isError && <ErrorLine onRetry={() => void refetch()} />}
      {isLoading && <StatSkeleton />}

      {data && (() => {
        const t = data.totals;
        const noPayments = t.paid_count === 0;
        const maxPlanMrr = Math.max(...data.by_plan.map((p) => p.mrr), 0);
        return (
          <>
            <StatGrid>
              <Stat label="Collected to date" value={fmtMoney(t.paid_total)} sub={`${fmtInt(t.paid_count)} paid invoices`} />
              <Stat label="Collected this month" value={fmtMoney(t.paid_this_month)}
                sub={t.pending_total > 0 ? `${fmtMoney(t.pending_total)} pending` : 'Nothing pending'} />
              <Stat label="Monthly recurring" value={fmtMoney(t.mrr)} sub="active plans × monthly price" />
              <Stat label="Annual run rate" value={fmtMoney(t.arr)}
                sub={t.failed_count > 0 ? <span className="text-mq-danger">{fmtInt(t.failed_count)} failed payments</span> : 'No failed payments'} />
            </StatGrid>

            {noPayments && (
              <p className="max-w-[72ch] text-sm text-pretty text-mq-muted">
                No payments are recorded yet. Collected revenue fills in automatically once Stripe or bKash marks
                invoices as paid. Monthly recurring revenue above is based on active plans today.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <Panel title="Collected per month" meta="last 12 months" className="lg:col-span-7">
                <BarChart
                  format={fmtMoney}
                  emptyText="No paid invoices in the last 12 months."
                  bars={data.monthly.map((m) => ({ key: m.month, value: m.amount, label: fmtMonthShort(m.month), hint: m.month }))}
                />
              </Panel>

              <Panel title="Recurring revenue by plan" meta={fmtMoney(t.mrr)} className="lg:col-span-5">
                <ul>
                  {data.by_plan.map((p) => (
                    <li key={p.plan} className="border-b border-mq-line px-4 py-4 last:border-b-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <div>
                          <p className="text-sm text-mq-ink">{PLAN_LABEL[p.plan]}</p>
                          <p className={cn(MONO, 'text-xs text-mq-subtle')}>{fmtInt(p.active_tenants)} × {fmtMoney(p.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>{fmtMoney(p.mrr)}</p>
                          <p className={cn(MONO, 'text-xs text-mq-subtle')}>{pct(p.mrr, t.mrr)}</p>
                        </div>
                      </div>
                      <div className="mt-3"><ShareBar value={p.mrr} max={maxPlanMrr} /></div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Recent invoices" meta={`latest ${fmtInt(data.recent_invoices.length)}`}>
              <DataTable
                columns={INVOICE_COLUMNS}
                rows={data.recent_invoices}
                rowKey={(i) => i.id}
                minWidth="min-w-[820px]"
                empty="No invoices yet."
              />
            </Panel>
          </>
        );
      })()}
    </div>
  );
}
