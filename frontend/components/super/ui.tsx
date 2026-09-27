'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';
import { fmtInt } from './format';

/* ── Page header ─────────────────────────────────────────────────── */
export function PageHeader({ title, meta, actions }: { title: string; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-balance text-mq-ink md:text-3xl">{title}</h1>
        {meta && <p className="mt-1 text-sm text-pretty text-mq-muted">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────── */
export function Panel({
  title, meta, actions, children, className,
}: { title: string; meta?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('border border-mq-line bg-white', className)}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mq-line px-4 py-2">
        <h2 className="text-sm font-medium text-mq-ink">{title}</h2>
        <div className="flex items-center gap-4">
          {meta && <span className={cn(MONO, 'text-xs text-mq-subtle')}>{meta}</span>}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ── Stats: grid of hairline cells ───────────────────────────────── */
export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const grid = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 lg:grid-cols-5' }[cols];
  return <div className={cn('grid grid-cols-2 gap-px border border-mq-line bg-mq-line', grid)}>{children}</div>;
}

type StatProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
};

/** One figure. Becomes a toggle when `onSelect` is passed (used to pick a chart series). */
export function Stat({ label, value, sub, selected, onSelect }: StatProps) {
  const body = (
    <>
      <span className="block text-xs text-mq-subtle">{label}</span>
      <span className="mt-2 block text-3xl font-medium tracking-tight tabular-nums text-mq-ink">{value}</span>
      {sub && <span className="mt-1 block text-xs text-pretty text-mq-muted">{sub}</span>}
    </>
  );
  if (!onSelect) return <div className="bg-white p-4 md:p-6">{body}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'bg-white p-4 text-left transition-colors duration-500 md:p-6',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mq-accent',
        EASE,
        selected ? 'ring-1 ring-inset ring-mq-ink' : 'hover:bg-mq-ground',
      )}
    >
      {body}
    </button>
  );
}

export function StatSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div aria-busy="true" className="grid grid-cols-2 gap-px border border-mq-line bg-mq-line md:grid-cols-4">
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="bg-white p-4 md:p-6">
          <div className="h-3 w-20 animate-pulse bg-mq-line" />
          <div className="mt-3 h-8 w-24 animate-pulse bg-mq-line" />
        </div>
      ))}
    </div>
  );
}

/* ── Segmented filter ────────────────────────────────────────────── */
export type SegmentOption<T extends string> = { value: T; label: string; count?: number | undefined };

export function Segmented<T extends string>({
  options, value, onChange, label,
}: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="inline-flex border border-mq-line bg-white">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-r border-mq-line px-3 text-sm transition-colors duration-500 last:border-r-0',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mq-accent',
                EASE,
                active ? 'bg-mq-ink text-white' : 'text-mq-muted hover:text-mq-ink',
              )}
            >
              {o.label}
              {o.count !== undefined && (
                <span className={cn(MONO, 'text-xs tabular-nums', active ? 'text-white/60' : 'text-mq-subtle')}>{fmtInt(o.count)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Search ──────────────────────────────────────────────────────── */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mq-subtle" strokeWidth={1.5} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full border border-mq-line bg-white pl-10 pr-3 text-sm text-mq-ink placeholder:text-mq-subtle',
          'transition-colors duration-500 hover:border-mq-subtle focus:border-mq-ink focus:outline-none',
          EASE,
        )}
      />
    </label>
  );
}

/* ── Data table ──────────────────────────────────────────────────── */
export type Column<T> = {
  key: string;
  header: string;
  align?: 'right';
  width?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  fetching?: boolean;
  empty: React.ReactNode;
  minWidth?: string;
};

export function DataTable<T>({ columns, rows, rowKey, loading, fetching, empty, minWidth = 'min-w-[720px]' }: DataTableProps<T>) {
  if (loading) {
    return (
      <div aria-busy="true" className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-8 animate-pulse bg-mq-line" />)}
      </div>
    );
  }
  if (!rows || rows.length === 0) return <div className="px-4 py-8 text-sm text-mq-muted">{empty}</div>;

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left', minWidth)}>
        <thead>
          <tr className="border-b border-mq-line">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(MONO, 'h-10 whitespace-nowrap px-4 text-xs font-normal uppercase tracking-wider text-mq-subtle', c.align === 'right' && 'text-right')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={fetching} className={cn('transition-opacity duration-500', EASE, fetching && 'opacity-60')}>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={cn('h-12 border-b border-mq-line transition-colors duration-500 last:border-b-0 hover:bg-mq-ground', EASE)}>
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-2 align-middle text-sm text-mq-ink', c.align === 'right' && 'text-right tabular-nums')}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Two-line cell: primary text over a quiet secondary line. */
export function Cell2({ primary, secondary, mono }: { primary: React.ReactNode; secondary?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-mq-ink">{primary}</p>
      {secondary && <p className={cn('truncate text-xs text-mq-subtle', mono && MONO)}>{secondary}</p>}
    </div>
  );
}

/* ── Pager ───────────────────────────────────────────────────────── */
export function Pager({ page, pages, total, pageSize, onPage }: { page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const btn = cn('h-10 px-3 text-sm text-mq-ink transition-colors duration-500 hover:text-mq-accent disabled:pointer-events-none disabled:opacity-40', EASE);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-mq-line px-4">
      <p className={cn(MONO, 'text-xs tabular-nums text-mq-subtle')}>
        {fmtInt(first)}–{fmtInt(last)} of {fmtInt(total)}
      </p>
      <div className="flex items-center">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className={cn(MONO, 'px-2 text-xs tabular-nums text-mq-subtle')}>{page} / {pages}</span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

/* ── Bar chart ───────────────────────────────────────────────────── */
export type Bar = { key: string; value: number; label: string; hint?: string };

/** Square bars on a hairline baseline. Hover or focus a bar to read its value. */
export function BarChart({ bars, format = fmtInt, emptyText = 'No activity in this range.' }: { bars: Bar[]; format?: (n: number) => string; emptyText?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const step = Math.max(1, Math.ceil(bars.length / 10));
  const current = bars.find((b) => b.key === active);

  return (
    <div className="p-4 md:p-6">
      <div className="flex h-6 items-baseline justify-between gap-4">
        <span className={cn(MONO, 'text-xs tabular-nums text-mq-subtle')}>{max > 0 ? `Peak ${format(max)}` : ''}</span>
        <span className={cn(MONO, 'text-xs tabular-nums text-mq-ink')} aria-live="polite">
          {current ? `${current.hint ?? current.label} · ${format(current.value)}` : ''}
        </span>
      </div>
      {max === 0 ? (
        <div className="flex h-40 items-center border-b border-mq-line text-sm text-mq-muted">{emptyText}</div>
      ) : (
        <div className="flex h-40 items-end gap-px border-b border-mq-line" onMouseLeave={() => setActive(null)}>
          {bars.map((b) => (
            <button
              key={b.key}
              type="button"
              aria-label={`${b.hint ?? b.label}: ${format(b.value)}`}
              onMouseEnter={() => setActive(b.key)}
              onFocus={() => setActive(b.key)}
              onBlur={() => setActive(null)}
              className="group flex h-full min-w-0 flex-1 items-end focus-visible:outline-none"
            >
              <span
                className={cn(
                  'block w-full transition-colors duration-500',
                  EASE,
                  active === b.key ? 'bg-mq-accent' : 'bg-mq-ink group-focus-visible:bg-mq-accent',
                )}
                style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
      )}
      {/* Labels hang off their bar so narrow bars (long ranges) still get readable dates */}
      <div className="relative mt-2 flex h-4 gap-px overflow-hidden" aria-hidden>
        {bars.map((b, i) => (
          <span key={b.key} className="relative min-w-0 flex-1">
            {i % step === 0 && (
              <span className={cn(MONO, 'absolute left-0 top-0 whitespace-nowrap text-xs text-mq-subtle')}>{b.label}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Proportion bar (hairline) ───────────────────────────────────── */
export function ShareBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <span className="block h-1 w-full bg-mq-line" aria-hidden>
      <span className="block h-full bg-mq-ink" style={{ width: `${width}%` }} />
    </span>
  );
}

export function ErrorLine({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border border-mq-line bg-white p-6">
      <p className="text-sm text-mq-muted">Could not load this data.</p>
      <button type="button" onClick={onRetry}
        className="mt-4 text-sm text-mq-ink underline decoration-mq-line underline-offset-4 hover:decoration-mq-ink">
        Try again
      </button>
    </div>
  );
}
