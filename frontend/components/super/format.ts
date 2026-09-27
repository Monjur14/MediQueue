import type { PlanName } from '@/types';
import type { ActivityEvent, SubscriptionStatus } from '@/hooks/api/super';
import type { StatusTone } from '@/components/admin/StatusMark';

const TZ = 'Asia/Dhaka';
const INT = new Intl.NumberFormat('en-US');
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const fmtInt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : INT.format(n));
export const fmtMoney = (n: number | null | undefined) => (n === null || n === undefined ? '—' : MONEY.format(n));

/** Date-only strings (YYYY-MM-DD) are read as calendar dates, never shifted by timezone. */
export function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) opts.timeZone = TZ;
  return date.toLocaleDateString('en-GB', opts);
}

export function fmtDateTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** "Mon 21" style label for chart axes. */
export function fmtDayShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtMonthShort(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
}

export function pct(part: number, whole: number) {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export const PLAN_LABEL: Record<PlanName, string> = { solo: 'Solo Doctor', clinic: 'Clinic', hospital: 'Hospital' };

export const SUB_STATUS: Record<SubscriptionStatus | 'none', { tone: StatusTone; label: string; dot?: boolean }> = {
  active:    { tone: 'accent', label: 'Active', dot: true },
  pending:   { tone: 'ink', label: 'Pending' },
  past_due:  { tone: 'danger', label: 'Past due' },
  cancelled: { tone: 'struck', label: 'Cancelled' },
  expired:   { tone: 'subtle', label: 'Expired' },
  none:      { tone: 'subtle', label: 'No plan' },
};

export const EVENT_LABEL: Record<ActivityEvent, string> = {
  home_visit: 'Homepage visits',
  login_click: 'Log in clicks',
  register_clinic_click: 'Register clinic clicks',
  register_patient_click: 'Register patient clicks',
};

export const EVENT_SINGULAR: Record<ActivityEvent, string> = {
  home_visit: 'Homepage visit',
  login_click: 'Log in click',
  register_clinic_click: 'Register clinic',
  register_patient_click: 'Register patient',
};

export const PLACEMENT_LABEL: Record<string, string> = {
  navbar: 'Header',
  mobile_menu: 'Mobile menu',
  hero: 'Hero',
  pricing: 'Pricing',
  final_cta: 'Closing banner',
  page: 'Page',
  unknown: 'Unknown',
};

/** Short, readable device label from a user agent: "Chrome · Android". */
export function deviceLabel(ua: string | null) {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser';
  const os = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other';
  return `${browser} · ${os}`;
}

/** Days left on a subscription period, as words plus a tone. */
export function daysLeftLabel(days: number | null, status?: SubscriptionStatus | null) {
  if (days === null) return { text: '—', tone: 'text-mq-subtle' };
  const live = status === 'active' || status === 'past_due';
  if (days < 0) return { text: `Ended ${Math.abs(days)}d ago`, tone: live ? 'text-mq-danger' : 'text-mq-subtle' };
  if (days === 0) return { text: 'Ends today', tone: live ? 'text-mq-danger' : 'text-mq-muted' };
  if (days <= 7) return { text: `${days}d left`, tone: live ? 'text-mq-danger' : 'text-mq-muted' };
  return { text: `${days}d left`, tone: 'text-mq-muted' };
}
