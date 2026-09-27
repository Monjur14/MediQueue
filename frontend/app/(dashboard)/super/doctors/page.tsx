'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSuperDoctors, type DoctorRow } from '@/hooks/api/super';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { StatusMark } from '@/components/admin/StatusMark';
import { Cell2, DataTable, ErrorLine, PageHeader, Pager, Panel, SearchField, type Column } from '@/components/super/ui';
import { fmtDate, fmtInt, PLAN_LABEL } from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';

const ACCOUNT: Record<string, { tone: 'accent' | 'ink' | 'subtle' | 'danger'; label: string; dot?: boolean }> = {
  active: { tone: 'accent', label: 'Active', dot: true },
  pending_payment: { tone: 'ink', label: 'Awaiting payment' },
  suspended: { tone: 'danger', label: 'Suspended' },
};

const COLUMNS: Column<DoctorRow>[] = [
  { key: 'doctor', header: 'Doctor', width: '24%', render: (d) => <Cell2 primary={d.full_name} secondary={d.email} /> },
  { key: 'kind', header: 'Type', render: (d) => <span className="text-sm text-mq-muted">{d.kind === 'solo' ? 'Solo owner' : 'Staff'}</span> },
  {
    key: 'clinic', header: 'Clinic', width: '20%',
    render: (d) => <Cell2 primary={d.tenant_name} secondary={d.plan_name ? PLAN_LABEL[d.plan_name] : undefined} />,
  },
  { key: 'dept', header: 'Departments', render: (d) => <span className="line-clamp-2 text-sm text-mq-muted">{d.departments ?? '—'}</span> },
  { key: 'seen', header: 'Patients seen', align: 'right', render: (d) => <span className={MONO}>{fmtInt(d.patients_seen)}</span> },
  { key: 'last', header: 'Last queue', render: (d) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(d.last_session)}</span> },
  {
    key: 'status', header: 'Account', render: (d) =>
      !d.is_active ? <StatusMark tone="struck" label="Disabled" /> : <StatusMark {...(ACCOUNT[d.status] ?? { tone: 'subtle', label: d.status })} />,
  },
];

function DoctorsView() {
  const url = useUrlState();
  const page = Math.max(1, Number(url.get('page')) || 1);
  const urlQ = url.get('q');
  const [search, setSearch] = useState(urlQ);
  const q = useDebouncedValue(search.trim(), 350);
  useEffect(() => {
    if (q !== urlQ) url.set({ q, page: 1 });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching, isError, refetch } = useSuperDoctors({ ...(urlQ ? { q: urlQ } : {}), page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        meta="Staff doctors invited by clinics, and solo doctors who run their own account."
        actions={<SearchField value={search} onChange={setSearch} placeholder="Search doctor, email or clinic" />}
      />
      {isError ? <ErrorLine onRetry={() => void refetch()} /> : (
        <Panel title="Doctor list" meta={data ? `${fmtInt(data.total)} found` : undefined}>
          <DataTable
            columns={COLUMNS}
            rows={data?.items}
            rowKey={(d) => d.id}
            loading={isLoading}
            fetching={isFetching && !isLoading}
            minWidth="min-w-[960px]"
            empty={urlQ ? 'No doctors match this search.' : 'No doctors on the platform yet.'}
          />
          {data && <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={(p) => url.set({ page: p })} />}
        </Panel>
      )}
    </div>
  );
}

export default function SuperDoctorsPage() {
  return <Suspense><DoctorsView /></Suspense>;
}
