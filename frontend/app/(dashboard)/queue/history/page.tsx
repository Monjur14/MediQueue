'use client';

import { useState } from 'react';

import { useRequireAuth } from '@/hooks/useAuth';
import { useMyVisits, type Visit } from '@/hooks/api/queue';
import { cn } from '@/lib/utils';

/* ── Status badge ─────────────────────────────────────────────────── */
const STATUS_MAP: Record<Visit['status'], { label: string; classes: string }> = {
  completed:       { label: 'Seen',           classes: 'bg-emerald-50 text-emerald-700' },
  cancelled:       { label: 'Cancelled',       classes: 'bg-mq-ground text-mq-subtle border border-mq-line' },
  no_show:         { label: 'No-show',         classes: 'bg-amber-50 text-amber-700' },
  skipped:         { label: 'Skipped',         classes: 'bg-amber-50 text-amber-700' },
  waiting:         { label: 'Waiting',         classes: 'bg-blue-50 text-blue-700' },
  called:          { label: 'Called',          classes: 'bg-blue-50 text-blue-700' },
  in_consultation: { label: 'In consultation', classes: 'bg-blue-50 text-blue-700' },
};

function StatusBadge({ status }: { status: Visit['status'] }) {
  const s = STATUS_MAP[status] ?? { label: status, classes: 'bg-mq-ground text-mq-muted' };
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', s.classes)}>
      {s.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VisitRow({ v }: { v: Visit }) {
  const hasNotes = v.status === 'completed' && Boolean(v.notes?.trim());
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-mq-line px-5 py-4 last:border-0 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-mq-ink">Dr. {v.doctor_name}</span>
            <StatusBadge status={v.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-mq-muted">{v.clinic_name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm tabular-nums text-mq-ink">#{v.token_number}</p>
          <p className="mt-0.5 text-xs text-mq-subtle">{fmtDate(v.session_date)}</p>
        </div>
      </div>
      {hasNotes && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 flex items-center gap-1 text-xs text-mq-muted hover:text-mq-ink transition-colors"
            aria-expanded={open}
          >
            <svg
              className={cn('h-3 w-3 shrink-0 transition-transform duration-200', open && 'rotate-90')}
              viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"
            >
              <path d="M4.5 2.5l4 3.5-4 3.5V2.5z" />
            </svg>
            {open ? 'Hide notes' : "Doctor's notes"}
          </button>
          {open && (
            <div className="mt-2 rounded-md border border-mq-line bg-mq-ground px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm text-mq-ink">{v.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="border border-mq-line bg-white">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-mq-line px-5 py-4 last:border-0 md:px-6">
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-mq-line" />
            <div className="h-3 w-24 animate-pulse rounded bg-mq-line" />
          </div>
          <div className="space-y-2 text-right">
            <div className="ml-auto h-3 w-8 animate-pulse rounded bg-mq-line" />
            <div className="ml-auto h-3 w-20 animate-pulse rounded bg-mq-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { loading, user } = useRequireAuth(['patient']);
  const { data: visits, isLoading } = useMyVisits();

  if (loading || !user) return null;

  const seen  = visits?.filter((v) => v.status === 'completed').length ?? 0;
  const total = visits?.length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Visit history</h1>
      <p className="mt-1 text-sm text-mq-muted">
        {total > 0
          ? `${total} visit${total === 1 ? '' : 's'} · ${seen} seen by a doctor`
          : 'Your past visits will appear here'}
      </p>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton />
        ) : !visits || visits.length === 0 ? (
          <div className="border border-mq-line bg-white px-5 py-16 text-center md:px-6">
            <p className="text-sm text-mq-muted">No visits yet.</p>
            <p className="mt-1 text-xs text-mq-subtle">Once you get a queue token, it will show up here.</p>
          </div>
        ) : (
          <div className="border border-mq-line bg-white">
            {visits.map((v) => <VisitRow key={v.id} v={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
