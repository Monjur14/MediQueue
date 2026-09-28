'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSuperLogs, type ActivityEvent, type LogDay, type LogEventRow, type Logs } from '@/hooks/api/super';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import {
  BarChart, DataTable, ErrorLine, PageHeader, Pager, Panel, Segmented, ShareBar, Stat, StatGrid, StatSkeleton, type Column,
} from '@/components/super/ui';
import {
  deviceLabel, EVENT_LABEL, EVENT_SINGULAR, fmtDateTime, fmtDayShort, fmtInt, pct, PLACEMENT_LABEL,
} from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';

const EVENTS: ActivityEvent[] = ['home_visit', 'login_click', 'register_clinic_click', 'register_patient_click'];
type Metric = ActivityEvent | 'unique_users';
type Measure = 'total' | 'unique';
type Preset = 'today' | '7d' | '30d' | '90d' | 'custom';

const PRESET_DAYS: Record<Exclude<Preset, 'custom'>, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const DATE_INPUT = cn(
  'h-10 border border-mq-line bg-white px-3 font-mono text-xs text-mq-ink transition-colors duration-500',
  'hover:border-mq-subtle focus:border-mq-ink focus:outline-none',
  EASE,
);

/* ── dates (Bangladesh calendar) ─────────────────────────────────── */
function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}
function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayValue(d: LogDay, metric: Metric, measure: Measure) {
  if (metric === 'unique_users') return d.unique_users;
  return measure === 'unique' ? d[`${metric}_unique`] : d[metric];
}

function referrerHost(ref: string | null) {
  if (!ref) return 'Direct';
  try { return new URL(ref).host.replace(/^www\./, ''); } catch { return ref; }
}

/* ── panels ──────────────────────────────────────────────────────── */
function ClickThrough({ data }: { data: Logs }) {
  const visitors = data.summary.by_event.home_visit?.unique ?? 0;
  const rows = (['login_click', 'register_clinic_click', 'register_patient_click'] as const).map((e) => ({
    event: e, unique: data.summary.by_event[e]?.unique ?? 0,
  }));
  return (
    <Panel title="Click through" meta={`of ${fmtInt(visitors)} unique visitors`}>
      <ul>
        {rows.map((r) => (
          <li key={r.event} className="border-b border-mq-line px-4 py-4 last:border-b-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-mq-ink">{EVENT_SINGULAR[r.event]}</span>
              <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>
                {pct(r.unique, visitors)} <span className="text-xs text-mq-subtle">· {fmtInt(r.unique)}</span>
              </span>
            </div>
            <div className="mt-3"><ShareBar value={r.unique} max={visitors} /></div>
          </li>
        ))}
      </ul>
      <p className="border-t border-mq-line px-4 py-3 text-xs text-pretty text-mq-subtle">
        Unique people who clicked, divided by unique homepage visitors in the same range.
      </p>
    </Panel>
  );
}

function ByButton({ data }: { data: Logs }) {
  const clicks = data.placements.filter((p) => p.event !== 'home_visit');
  const max = Math.max(...clicks.map((p) => p.total), 0);
  return (
    <Panel title="Clicks by button" meta={`${fmtInt(clicks.reduce((s, p) => s + p.total, 0))} clicks`}>
      {clicks.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mq-muted">No button clicks in this range.</p>
      ) : (
        <ul>
          {clicks.slice(0, 8).map((p) => (
            <li key={`${p.event}-${p.placement}`} className="border-b border-mq-line px-4 py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-mq-ink">
                  {EVENT_SINGULAR[p.event]} <span className="text-mq-subtle">· {PLACEMENT_LABEL[p.placement] ?? p.placement}</span>
                </span>
                <span className={cn(MONO, 'text-sm tabular-nums text-mq-ink')}>{fmtInt(p.total)}</span>
              </div>
              <div className="mt-2"><ShareBar value={p.total} max={max} /></div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Pair({ total, unique }: { total: number; unique: number }) {
  return (
    <span className={cn(MONO, 'tabular-nums')}>
      {fmtInt(total)} <span className="text-mq-subtle">/ {fmtInt(unique)}</span>
    </span>
  );
}

const DAY_COLUMNS: Column<LogDay>[] = [
  { key: 'date', header: 'Day', render: (d) => <span className={cn(MONO, 'text-xs text-mq-ink')}>{fmtDayShort(d.date)} {d.date.slice(0, 4)}</span> },
  { key: 'visit', header: 'Visits', align: 'right', render: (d) => <Pair total={d.home_visit} unique={d.home_visit_unique} /> },
  { key: 'login', header: 'Log in', align: 'right', render: (d) => <Pair total={d.login_click} unique={d.login_click_unique} /> },
  { key: 'clinic', header: 'Register clinic', align: 'right', render: (d) => <Pair total={d.register_clinic_click} unique={d.register_clinic_click_unique} /> },
  { key: 'patient', header: 'Register patient', align: 'right', render: (d) => <Pair total={d.register_patient_click} unique={d.register_patient_click_unique} /> },
  { key: 'people', header: 'Unique people', align: 'right', render: (d) => <span className={cn(MONO, 'tabular-nums')}>{fmtInt(d.unique_users)}</span> },
];

const EVENT_COLUMNS: Column<LogEventRow>[] = [
  { key: 'time', header: 'Time', render: (e) => <span className={cn(MONO, 'whitespace-nowrap text-xs text-mq-ink')}>{fmtDateTime(e.created_at)}</span> },
  { key: 'event', header: 'Event', render: (e) => <span className="text-sm text-mq-ink">{EVENT_SINGULAR[e.event]}</span> },
  { key: 'button', header: 'Where', render: (e) => <span className="text-sm text-mq-muted">{e.placement ? PLACEMENT_LABEL[e.placement] ?? e.placement : '—'}</span> },
  {
    key: 'who', header: 'Visitor', render: (e) => e.user_name
      ? <span className="text-sm text-mq-ink">{e.user_name}</span>
      : <span className={cn(MONO, 'text-xs text-mq-muted')} title={e.visitor_id}>{e.visitor_id.slice(0, 8)}</span>,
  },
  { key: 'device', header: 'Device', render: (e) => <span className="whitespace-nowrap text-sm text-mq-muted">{deviceLabel(e.user_agent)}</span> },
  { key: 'from', header: 'Came from', render: (e) => <span className="block max-w-[200px] truncate text-sm text-mq-muted">{referrerHost(e.referrer)}</span> },
];

/* ── custom range ────────────────────────────────────────────────── */
/**
 * Browsers change the value while you move through months in the date picker, so edits stay
 * in a local draft and only load when Apply (or Enter) is pressed.
 */
function DateRangeFields({ from, to, today, onApply }: {
  from: string;
  to: string;
  today: string;
  onApply: (from: string, to: string) => void;
}) {
  const [draft, setDraft] = useState({ from, to });
  const changed = draft.from !== from || draft.to !== to;
  const reversed = Boolean(draft.from && draft.to && draft.from > draft.to);
  const valid = Boolean(draft.from && draft.to) && !reversed && draft.to <= today;

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && changed) onApply(draft.from, draft.to);
      }}
    >
      <label className="block">
        <span className="text-xs text-mq-subtle">From</span>
        <input type="date" className={cn(DATE_INPUT, 'mt-1 block', reversed && 'border-mq-danger')} max={today}
          value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
      </label>
      <label className="block">
        <span className="text-xs text-mq-subtle">To</span>
        <input type="date" className={cn(DATE_INPUT, 'mt-1 block', reversed && 'border-mq-danger')} max={today}
          value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
      </label>
      <button type="submit" disabled={!valid || !changed} className={buttonClasses('secondary', 'sm', 'h-10')}>
        Apply
      </button>
      {reversed && <p role="alert" className="w-full text-xs text-mq-danger">The start date must be on or before the end date.</p>}
    </form>
  );
}

/* ── page ────────────────────────────────────────────────────────── */
function LogsView() {
  const url = useUrlState();
  const from = url.get('from');
  const to = url.get('to');
  const eventFilter = EVENTS.find((e) => e === url.get('event'));
  const metric = ([...EVENTS, 'unique_users'] as Metric[]).find((m) => m === url.get('metric')) ?? 'home_visit';
  const measure: Measure = metric === 'unique_users' || url.get('measure') === 'unique' ? 'unique' : 'total';
  const page = Math.max(1, Number(url.get('page')) || 1);

  const { data, isLoading, isFetching, isError, refetch } = useSuperLogs({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(eventFilter ? { event: eventFilter } : {}),
    page,
  });

  const today = todayLocal();
  const preset: Preset = useMemo(() => {
    if (!from && !to) return '7d';
    if (to !== today) return 'custom';
    const match = (Object.entries(PRESET_DAYS) as [Exclude<Preset, 'custom'>, number][]).find(([, n]) => from === shiftDays(today, -(n - 1)));
    return match ? match[0] : 'custom';
  }, [from, to, today]);

  const setPreset = (p: Preset) => {
    if (p === 'custom') return;
    if (p === '7d') url.set({ from: null, to: null, page: 1 });
    else url.set({ from: shiftDays(today, -(PRESET_DAYS[p] - 1)), to: today, page: 1 });
  };

  const setRange = (nextFrom: string, nextTo: string) => {
    if (!nextFrom || !nextTo || nextFrom > nextTo) return;
    url.set({ from: nextFrom, to: nextTo, page: 1 });
  };

  const range = data?.range;
  const metricLabel = metric === 'unique_users' ? 'Unique people' : EVENT_LABEL[metric];
  const dailyNewestFirst = useMemo(() => [...(data?.daily ?? [])].reverse(), [data?.daily]);

  return (
    <div className="space-y-8">
      <PageHeader title="Logs" meta="Homepage visits and button clicks. Days follow Bangladesh time." />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented<Preset>
          label="Date range"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'today', label: 'Today' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
            ...(preset === 'custom' ? [{ value: 'custom' as Preset, label: 'Custom' }] : []),
          ]}
        />
        {/* Re-keyed only when the applied range changes, so an open picker is never torn down */}
        <DateRangeFields
          key={`${range?.from ?? ''}|${range?.to ?? ''}`}
          from={range?.from ?? ''}
          to={range?.to ?? ''}
          today={today}
          onApply={setRange}
        />
      </div>

      {isError && <ErrorLine onRetry={() => void refetch()} />}
      {isLoading && <StatSkeleton cells={5} />}

      {data && (
        <>
          <div>
            <StatGrid cols={5}>
              <Stat
                label="Unique people"
                value={fmtInt(data.summary.overall.unique)}
                sub={`${fmtInt(data.summary.overall.total)} events in ${fmtInt(data.range.days)} ${data.range.days === 1 ? 'day' : 'days'}`}
                selected={metric === 'unique_users'}
                onSelect={() => url.set({ metric: 'unique_users' })}
              />
              {EVENTS.map((e) => (
                <Stat
                  key={e}
                  label={EVENT_LABEL[e]}
                  value={fmtInt(data.summary.by_event[e]?.total ?? 0)}
                  sub={`${fmtInt(data.summary.by_event[e]?.unique ?? 0)} unique`}
                  selected={metric === e}
                  onSelect={() => url.set({ metric: e === 'home_visit' ? null : e })}
                />
              ))}
            </StatGrid>
            <p className="mt-2 text-xs text-mq-subtle">Select a figure to chart it by day.</p>
          </div>

          <Panel
            title={`${metricLabel} per day`}
            meta={`${data.range.from} → ${data.range.to}`}
            actions={metric !== 'unique_users' && (
              <div role="radiogroup" aria-label="Count" className="inline-flex border border-mq-line">
                {(['total', 'unique'] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={measure === m}
                    onClick={() => url.set({ measure: m === 'total' ? null : m })}
                    className={cn('h-8 border-r border-mq-line px-3 text-xs transition-colors duration-500 last:border-r-0', EASE,
                      measure === m ? 'bg-mq-ink text-white' : 'text-mq-muted hover:text-mq-ink')}>
                    {m === 'total' ? 'Total' : 'Unique'}
                  </button>
                ))}
              </div>
            )}
          >
            <BarChart
              bars={data.daily.map((d) => ({
                key: d.date,
                value: dayValue(d, metric, measure),
                label: fmtDayShort(d.date),
                hint: d.date,
              }))}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <ClickThrough data={data} />
            <ByButton data={data} />
          </div>

          <Panel title="Day by day" meta="total / unique">
            <DataTable columns={DAY_COLUMNS} rows={dailyNewestFirst} rowKey={(d) => d.date} minWidth="min-w-[760px]" fetching={isFetching} empty="No days in range." />
          </Panel>

          <div className="space-y-4">
            <Segmented<ActivityEvent | 'all'>
              label="Filter events"
              value={eventFilter ?? 'all'}
              onChange={(v) => url.set({ event: v === 'all' ? null : v, page: 1 })}
              options={[
                { value: 'all', label: 'All events', count: data.summary.overall.total },
                ...EVENTS.map((e) => ({ value: e, label: EVENT_SINGULAR[e], count: data.summary.by_event[e]?.total ?? 0 })),
              ]}
            />
            <Panel title="Event log" meta={`${fmtInt(data.events.total)} events`}>
              <DataTable
                columns={EVENT_COLUMNS}
                rows={data.events.items}
                rowKey={(e) => e.id}
                fetching={isFetching}
                minWidth="min-w-[860px]"
                empty="No events in this range."
              />
              <Pager page={data.events.page} pages={data.events.pages} total={data.events.total} pageSize={data.events.page_size} onPage={(p) => url.set({ page: p })} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export default function SuperLogsPage() {
  return <Suspense><LogsView /></Suspense>;
}
