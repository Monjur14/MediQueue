import { superRepository } from './super.repository.js';
import type { ListQuery, LogsQuery, SubscriptionsQuery, TenantsQuery } from './super.schema.js';

const TZ = 'Asia/Dhaka';
const LOG_PAGE_SIZE = 50;
const MAX_LOG_RANGE_DAYS = 366;

type Row = Record<string, unknown> & { total_count?: number };

/** Strip the window-function count from rows and wrap them with paging info. */
function paged<T extends Row>(rows: T[], page: number, pageSize: number) {
  const total = rows[0]?.total_count ?? 0;
  const items = rows.map(({ total_count: _omit, ...rest }) => rest);
  return { items, page, page_size: pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Today's date in Bangladesh as YYYY-MM-DD. */
function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export const superService = {
  async getOverview() {
    const [counts, expiring, activity] = await Promise.all([
      superRepository.getOverviewCounts(),
      superRepository.getExpiringSoon(14, 8),
      superRepository.getActivityToday(),
    ]);
    const today = Object.fromEntries(activity.map((a) => [a.event, { total: a.total, unique: a.unique_users }]));
    return { counts, expiring_soon: expiring, activity_today: today };
  },

  async listTenants(q: TenantsQuery) {
    const [rows, byPlan] = await Promise.all([
      superRepository.listTenants({
        q: q.q || null,
        ...(q.plan ? { plan: q.plan } : {}),
        ...(q.status ? { status: q.status } : {}),
        limit: q.page_size,
        offset: (q.page - 1) * q.page_size,
      }),
      superRepository.countTenantsByPlan(),
    ]);
    return { ...paged(rows, q.page, q.page_size), by_plan: Object.fromEntries(byPlan.map((p) => [p.plan, p.count])) };
  },

  async listSubscriptions(q: SubscriptionsQuery) {
    const [items, all] = await Promise.all([
      superRepository.listSubscriptions(q.group),
      q.group === 'all' ? Promise.resolve(null) : superRepository.listSubscriptions('all'),
    ]);
    const source = (all ?? items) as { status: string; days_left: number }[];
    const counts = {
      all:      source.length,
      active:   source.filter((s) => s.status === 'active').length,
      pending:  source.filter((s) => s.status === 'pending').length,
      ended:    source.filter((s) => ['past_due', 'cancelled', 'expired'].includes(s.status)).length,
      expiring: source.filter((s) => ['active', 'past_due'].includes(s.status) && s.days_left < 30).length,
    };
    return { items, counts };
  },

  async listDoctors(q: ListQuery) {
    const rows = await superRepository.listDoctors({ q: q.q || null, limit: q.page_size, offset: (q.page - 1) * q.page_size });
    return paged(rows, q.page, q.page_size);
  },

  async listPatients(q: ListQuery) {
    const rows = await superRepository.listPatients({ q: q.q || null, limit: q.page_size, offset: (q.page - 1) * q.page_size });
    return paged(rows, q.page, q.page_size);
  },

  async getRevenue() {
    const [totals, byPlan, monthly, recent] = await Promise.all([
      superRepository.getRevenueTotals(),
      superRepository.getMrrByPlan(),
      superRepository.getMonthlyRevenue(12),
      superRepository.getRecentInvoices(20),
    ]);
    const mrr = byPlan.reduce((sum, p) => sum + p.mrr, 0);
    return { totals: { ...totals, mrr, arr: mrr * 12 }, by_plan: byPlan, monthly, recent_invoices: recent };
  },

  async getLogs(q: LogsQuery) {
    const to = q.to ?? todayLocal();
    const from = q.from ?? shiftDays(to, -6);
    if (daysBetween(from, to) > MAX_LOG_RANGE_DAYS) throw new Error('RANGE_TOO_LARGE');

    const [summary, daily, placements, events] = await Promise.all([
      superRepository.getLogSummary(from, to),
      superRepository.getLogDaily(from, to),
      superRepository.getLogPlacements(from, to),
      superRepository.listLogEvents({
        from, to,
        ...(q.event ? { event: q.event } : {}),
        limit: LOG_PAGE_SIZE,
        offset: (q.page - 1) * LOG_PAGE_SIZE,
      }),
    ]);

    return {
      range: { from, to, days: daysBetween(from, to) },
      summary: {
        overall: { total: summary.overall.total, unique: summary.overall.unique_users },
        by_event: Object.fromEntries(summary.byEvent.map((e) => [e.event, { total: e.total, unique: e.unique_users }])),
      },
      daily,
      placements,
      events: paged(events, q.page, LOG_PAGE_SIZE),
    };
  },
};
