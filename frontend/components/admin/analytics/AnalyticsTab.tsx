'use client';

import { useState } from 'react';
import { useAnalytics, type DailyVolume, type PeakHour, type DoctorStat } from '@/hooks/api/admin';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

/* ── helpers ──────────────────────────────────────────────────────── */
function fmt(n: number | null, unit: string) {
  if (n === null || n === undefined) return '—';
  return `${n} ${unit}`;
}

function hourLabel(h: number) {
  if (h === 0)  return '12am';
  if (h < 12)  return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Stat tile ────────────────────────────────────────────────────── */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-mq-line bg-white p-5 md:p-6">
      <p className="text-xs text-mq-subtle">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums text-mq-ink md:text-4xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-mq-muted">{sub}</p>}
    </div>
  );
}

/* ── Bar chart ────────────────────────────────────────────────────── */
function BarChart({
  bars,
  label,
  color = '#0B0F0E',
}: {
  bars: { key: string; value: number; label: string }[];
  label: string;
  color?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="border border-mq-line bg-white p-5 md:p-6">
      <p className="mb-4 text-sm font-medium text-mq-ink">{label}</p>
      {bars.length === 0 ? (
        <p className="py-8 text-center text-sm text-mq-subtle">No data yet</p>
      ) : (
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {bars.map((b) => (
            <div key={b.key} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-mq-ink px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {b.value}
              </div>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 2 : 0, backgroundColor: color, opacity: 0.85 }}
              />
            </div>
          ))}
        </div>
      )}
      {bars.length > 0 && (
        <div className="mt-2 flex gap-1">
          {bars.map((b, i) => {
            const step = Math.max(1, Math.floor(bars.length / 8));
            const show = i % step === 0 || i === bars.length - 1;
            return (
              <div key={b.key} className="flex-1 text-center">
                {show && <span className="text-[10px] text-mq-subtle">{b.label}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Solo doctor performance ──────────────────────────────────────── */
function SoloDoctorStats({ doctor, days }: { doctor: DoctorStat; days: number }) {
  return (
    <div className="border border-mq-line bg-white">
      <div className="border-b border-mq-line px-5 py-4 md:px-6">
        <p className="text-sm font-medium text-mq-ink">Your performance</p>
        <p className="mt-0.5 text-xs text-mq-muted">Last {days} days · Dr. {doctor.doctor_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-mq-line md:grid-cols-4">
        <div className="bg-white p-5 md:p-6">
          <p className="text-xs text-mq-subtle">Patients seen</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-mq-ink">{doctor.patients_seen}</p>
          <p className="mt-1 text-xs text-mq-muted">in {doctor.session_days} working {doctor.session_days === 1 ? 'day' : 'days'}</p>
        </div>
        <div className="bg-white p-5 md:p-6">
          <p className="text-xs text-mq-subtle">Daily average</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-mq-ink">{doctor.avg_per_day}</p>
          <p className="mt-1 text-xs text-mq-muted">patients / working day</p>
        </div>
        <div className="bg-white p-5 md:p-6">
          <p className="text-xs text-mq-subtle">Avg consultation</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-mq-ink">
            {doctor.avg_consultation_minutes !== null ? `${doctor.avg_consultation_minutes} min` : '—'}
          </p>
          <p className="mt-1 text-xs text-mq-muted">per patient</p>
        </div>
        <div className="bg-white p-5 md:p-6">
          <p className="text-xs text-mq-subtle">No-shows</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-mq-ink">{doctor.no_shows}</p>
          <p className="mt-1 text-xs text-mq-muted">skipped or no-show</p>
        </div>
      </div>
    </div>
  );
}

/* ── Multi-doctor table ───────────────────────────────────────────── */
function DoctorTable({ doctors, days }: { doctors: DoctorStat[]; days: number }) {
  return (
    <div className="border border-mq-line bg-white">
      <div className="border-b border-mq-line px-5 py-4 md:px-6">
        <p className="text-sm font-medium text-mq-ink">Doctor performance</p>
        <p className="mt-0.5 text-xs text-mq-muted">Last {days} days · ranked by patients seen</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mq-line text-left text-xs text-mq-subtle">
              <th className="px-5 py-3 font-normal md:px-6">Doctor</th>
              <th className="px-5 py-3 font-normal tabular-nums md:px-6">Patients seen</th>
              <th className="px-5 py-3 font-normal tabular-nums md:px-6">Avg / day</th>
              <th className="px-5 py-3 font-normal tabular-nums md:px-6">Avg consultation</th>
              <th className="px-5 py-3 font-normal tabular-nums md:px-6">No-shows</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d, i) => (
              <tr key={d.doctor_name} className={cn('border-b border-mq-line last:border-0', i % 2 === 1 && 'bg-mq-ground')}>
                <td className="px-5 py-3 font-medium text-mq-ink md:px-6">
                  Dr. {d.doctor_name}
                  <span className="ml-2 text-xs font-normal text-mq-subtle">
                    {d.session_days} {d.session_days === 1 ? 'day' : 'days'} active
                  </span>
                </td>
                <td className="px-5 py-3 tabular-nums text-mq-ink md:px-6">{d.patients_seen}</td>
                <td className="px-5 py-3 tabular-nums text-mq-muted md:px-6">{d.avg_per_day}</td>
                <td className="px-5 py-3 tabular-nums text-mq-muted md:px-6">
                  {d.avg_consultation_minutes !== null ? `${d.avg_consultation_minutes} min` : '—'}
                </td>
                <td className="px-5 py-3 tabular-nums text-mq-muted md:px-6">{d.no_shows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded bg-mq-line" />)}
      </div>
      <div className="h-48 rounded bg-mq-line" />
      <div className="h-48 rounded bg-mq-line" />
      <div className="h-40 rounded bg-mq-line" />
    </div>
  );
}

/* ── Period toggle ────────────────────────────────────────────────── */
function PeriodToggle({ value, onChange }: { value: 7 | 30; onChange: (v: 7 | 30) => void }) {
  return (
    <div className="flex overflow-hidden rounded border border-mq-line text-sm">
      {([7, 30] as const).map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={cn('px-4 py-1.5 transition-colors duration-300', EASE,
            value === d ? 'bg-mq-ink text-white' : 'bg-white text-mq-muted hover:text-mq-ink')}>
          {d === 7 ? 'Last 7 days' : 'Last 30 days'}
        </button>
      ))}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function AnalyticsTab() {
  const [days, setDays] = useState<7 | 30>(30);
  const { data, isLoading } = useAnalytics(days);

  if (isLoading) return <Skeleton />;
  if (!data) return <p className="text-sm text-mq-muted">Could not load analytics.</p>;

  const { summary, daily_volumes, peak_hours, doctors } = data;
  const isSolo = doctors.length <= 1;

  const dailyBars = daily_volumes.map((d: DailyVolume) => ({
    key: d.date, value: d.completed, label: shortDate(d.date),
  }));

  const peakBars = Array.from({ length: 17 }, (_, i) => i + 6).map((h) => ({
    key:   String(h),
    value: (peak_hours as PeakHour[]).find((p) => p.hour === h)?.count ?? 0,
    label: hourLabel(h),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-mq-muted">Activity overview</p>
        <PeriodToggle value={days} onChange={setDays} />
      </div>

      {/* Summary tiles — overall clinic/doctor totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Patients seen"     value={String(summary.total_patients)}  sub={`last ${days} days`} />
        <StatTile label="Avg wait time"     value={fmt(summary.avg_wait_minutes, 'min')}         sub="token issued → called" />
        <StatTile label="Avg consultation"  value={fmt(summary.avg_consultation_minutes, 'min')} sub="called → completed" />
        <StatTile label="No-show rate"      value={summary.no_show_rate > 0 ? `${summary.no_show_rate}%` : '—'} sub="skipped or no-show" />
      </div>

      {/* Charts */}
      <BarChart bars={dailyBars} label="Patients seen per day" />
      <BarChart bars={peakBars}  label="Busiest hours (calls by hour)" color="#5B6361" />

      {/* Doctor section — always shown */}
      {doctors.length > 0 && (
        isSolo
          ? <SoloDoctorStats doctor={doctors[0]!} days={days} />
          : <DoctorTable doctors={doctors} days={days} />
      )}
    </div>
  );
}
