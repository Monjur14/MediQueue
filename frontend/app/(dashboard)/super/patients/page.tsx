'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSuperPatients, type PatientRow } from '@/hooks/api/super';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { MONO } from '@/components/shared/primitives';
import { Cell2, DataTable, ErrorLine, PageHeader, Pager, Panel, SearchField, type Column } from '@/components/super/ui';
import { fmtDate, fmtInt } from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';

const CHANNEL: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', both: 'WhatsApp + SMS' };

const COLUMNS: Column<PatientRow>[] = [
  { key: 'patient', header: 'Patient', width: '26%', render: (p) => <Cell2 primary={p.full_name} secondary={p.email} /> },
  { key: 'phone', header: 'Phone', render: (p) => <span className={cn(MONO, 'text-xs text-mq-ink')}>{p.phone ?? '—'}</span> },
  { key: 'channel', header: 'Alerts', render: (p) => <span className="text-sm text-mq-muted">{p.preferred_channel ? CHANNEL[p.preferred_channel] : '—'}</span> },
  { key: 'visits', header: 'Visits', align: 'right', render: (p) => <span className={MONO}>{fmtInt(p.visits)}</span> },
  {
    key: 'seen', header: 'Seen', align: 'right',
    render: (p) => <span className={cn(MONO, p.visits > 0 && p.seen < p.visits ? 'text-mq-muted' : 'text-mq-ink')}>{fmtInt(p.seen)}</span>,
  },
  { key: 'last', header: 'Last visit', render: (p) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(p.last_visit)}</span> },
  { key: 'joined', header: 'Joined', render: (p) => <span className={cn(MONO, 'text-xs text-mq-muted')}>{fmtDate(p.created_at)}</span> },
];

function PatientsView() {
  const url = useUrlState();
  const page = Math.max(1, Number(url.get('page')) || 1);
  const urlQ = url.get('q');
  const [search, setSearch] = useState(urlQ);
  const q = useDebouncedValue(search.trim(), 350);
  useEffect(() => {
    if (q !== urlQ) url.set({ q, page: 1 });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching, isError, refetch } = useSuperPatients({ ...(urlQ ? { q: urlQ } : {}), page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        meta="Everyone with a free patient account, across all clinics."
        actions={<SearchField value={search} onChange={setSearch} placeholder="Search name, email or phone" />}
      />
      {isError ? <ErrorLine onRetry={() => void refetch()} /> : (
        <Panel title="Patient list" meta={data ? `${fmtInt(data.total)} found` : undefined}>
          <DataTable
            columns={COLUMNS}
            rows={data?.items}
            rowKey={(p) => p.id}
            loading={isLoading}
            fetching={isFetching && !isLoading}
            minWidth="min-w-[880px]"
            empty={urlQ ? 'No patients match this search.' : 'No patients have signed up yet.'}
          />
          {data && <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={(p) => url.set({ page: p })} />}
        </Panel>
      )}
    </div>
  );
}

export default function SuperPatientsPage() {
  return <Suspense><PatientsView /></Suspense>;
}
