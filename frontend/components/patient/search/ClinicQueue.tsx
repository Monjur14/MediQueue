import { useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useClinicQueue } from '@/hooks/api/clinics';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { SESSION_COLS, SessionRow } from './SessionRow';

type ClinicQueueProps = {
  slug: string;
  clinicName: string;
  prefillDoctor: string;
  onBack: () => void;
};

const FIELD = cn(
  'h-10 border border-mq-line bg-white px-3 text-sm text-mq-ink placeholder:text-mq-subtle',
  'transition-colors duration-500 hover:border-mq-subtle focus:border-mq-ink focus:outline-none',
  EASE,
);

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-mq-ink">{title}</p>
      {body && <p className="mt-1 text-sm text-mq-muted">{body}</p>}
    </div>
  );
}

/** Today's live sessions for one clinic, filterable by doctor and department. */
export function ClinicQueue({ slug, clinicName, prefillDoctor, onBack }: ClinicQueueProps) {
  const { data: sessions, isLoading, isError, refetch, isFetching } = useClinicQueue(slug);
  const [doctorFilter, setDoctorFilter] = useState(prefillDoctor);
  const [deptFilter, setDeptFilter] = useState('');

  const all = sessions ?? [];
  const departments = Array.from(new Set(all.map((s) => s.department_name).filter((d): d is string => !!d))).sort();
  const needle = doctorFilter.toLowerCase().trim();
  const filtered = all.filter(
    (s) => (!needle || s.doctor_name.toLowerCase().includes(needle)) && (!deptFilter || s.department_name === deptFilter),
  );

  return (
    <div>
      <button type="button" onClick={onBack}
        className={cn('flex items-center gap-2 text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to search
      </button>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-mq-ink">{clinicName}</h2>
          <p className="mt-1 text-sm text-mq-muted">Today’s live queue</p>
        </div>
        <button type="button" onClick={() => void refetch()} disabled={isFetching} aria-busy={isFetching}
          className={buttonClasses('secondary', 'sm')}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin motion-reduce:animate-none')} strokeWidth={1.75} />
          {isFetching ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="doctor-filter">Filter by doctor</label>
        <input id="doctor-filter" type="text" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
          placeholder="Filter by doctor" className={cn(FIELD, 'w-full sm:flex-1')} />
        {departments.length > 0 && (
          <>
            <label className="sr-only" htmlFor="dept-filter">Filter by department</label>
            <select id="dept-filter" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={cn(FIELD, 'sm:w-48')}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="mt-6 border border-mq-line bg-white">
        <div className={cn(SESSION_COLS, MONO, 'hidden h-10 border-b border-mq-line px-4 text-xs uppercase tracking-wider text-mq-subtle md:grid')}>
          <span>Doctor</span><span>Status</span><span className="text-right">Serving</span>
          <span className="text-right">Waiting</span><span className="text-right">Issued</span>
        </div>

        {isLoading && (
          <div aria-busy="true" className="space-y-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse bg-mq-line" />)}
          </div>
        )}
        {isError && (
          <div className="p-4"><AuthNotice tone="error">We could not load this queue. Try refreshing.</AuthNotice></div>
        )}
        {!isLoading && !isError && all.length === 0 && (
          <Message title="No queues open right now" body="The clinic may not have opened today’s queue yet." />
        )}
        {!isLoading && !isError && all.length > 0 && filtered.length === 0 && (
          <Message title="No doctors match these filters" />
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <ul>{filtered.map((s) => <SessionRow key={s.id} session={s} />)}</ul>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-mq-subtle">
          Showing {filtered.length} of {all.length} {all.length === 1 ? 'doctor' : 'doctors'}. Refresh for the latest numbers.
        </p>
      )}
    </div>
  );
}
