import { pool } from '../../config/database.js';

const TZ = 'Asia/Dhaka';

/** Latest subscription per tenant, joined with its plan. Reused by several queries. */
const LATEST_SUB = `
  SELECT DISTINCT ON (s.tenant_id)
         s.id, s.tenant_id, s.status, s.current_period_start, s.current_period_end,
         s.cancel_at_period_end, s.cancelled_at, s.created_at,
         p.name AS plan_name, p.monthly_price::float8 AS monthly_price
  FROM subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
  ORDER BY s.tenant_id, s.created_at DESC
`;

/** Whole days until the period ends (negative once it has passed). */
const DAYS_LEFT = (col: string) =>
  `CEIL(EXTRACT(EPOCH FROM (${col} - NOW())) / 86400)::int`;

/** Local-date window on a timestamptz column, index friendly. $from / $to are YYYY-MM-DD. */
const DAY_WINDOW = (col: string, from: string, to: string) => `
  ${col} >= (${from}::date)::timestamp AT TIME ZONE '${TZ}'
  AND ${col} < ((${to}::date + 1)::timestamp AT TIME ZONE '${TZ}')`;

const WHO = `COALESCE(e.user_id::text, e.visitor_id)`;

function like(q?: string) {
  return q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}

export const superRepository = {
  // ─── OVERVIEW ──────────────────────────────────────────────

  async getOverviewCounts() {
    const { rows } = await pool.query(`
      WITH latest AS (${LATEST_SUB})
      SELECT
        (SELECT COUNT(*)::int FROM tenants WHERE deleted_at IS NULL)                                 AS tenants_total,
        (SELECT COUNT(*)::int FROM tenants WHERE deleted_at IS NULL AND is_active)                   AS tenants_active,
        (SELECT COUNT(*)::int FROM latest WHERE plan_name = 'solo')                                  AS plan_solo,
        (SELECT COUNT(*)::int FROM latest WHERE plan_name = 'clinic')                                AS plan_clinic,
        (SELECT COUNT(*)::int FROM latest WHERE plan_name = 'hospital')                              AS plan_hospital,
        (SELECT COUNT(*)::int FROM latest WHERE status = 'active')                                   AS sub_active,
        (SELECT COUNT(*)::int FROM latest WHERE status = 'pending')                                  AS sub_pending,
        (SELECT COUNT(*)::int FROM latest WHERE status = 'past_due')                                 AS sub_past_due,
        (SELECT COUNT(*)::int FROM latest WHERE status = 'cancelled')                                AS sub_cancelled,
        (SELECT COUNT(*)::int FROM latest WHERE status = 'expired')                                  AS sub_expired,
        (SELECT COALESCE(SUM(monthly_price), 0)::float8 FROM latest
           WHERE status = 'active' AND current_period_end > NOW())                                   AS mrr,
        (SELECT COUNT(*)::int FROM users WHERE role = 'doctor' AND deleted_at IS NULL)               AS doctors_staff,
        (SELECT COUNT(*)::int FROM users u JOIN latest l ON l.tenant_id = u.tenant_id
           WHERE u.role = 'tenant_admin' AND l.plan_name = 'solo' AND u.deleted_at IS NULL)          AS doctors_solo,
        (SELECT COUNT(*)::int FROM users WHERE role = 'patient' AND deleted_at IS NULL)              AS patients_total,
        (SELECT COUNT(*)::int FROM users WHERE role = 'patient' AND deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '7 days')                                              AS patients_new_7d,
        (SELECT COUNT(*)::int FROM queue_tokens
           WHERE (created_at AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date)       AS tokens_today,
        (SELECT COUNT(*)::int FROM queue_sessions WHERE status IN ('open', 'break'))                 AS sessions_open,
        (SELECT COALESCE(SUM(amount), 0)::float8 FROM invoices WHERE status = 'paid')                AS revenue_total
    `);
    return rows[0];
  },

  async getExpiringSoon(days: number, limit: number) {
    const { rows } = await pool.query(
      `WITH latest AS (${LATEST_SUB})
       SELECT t.id AS tenant_id, t.name AS tenant_name, l.plan_name, l.status,
              l.current_period_end, ${DAYS_LEFT('l.current_period_end')} AS days_left
       FROM latest l
       JOIN tenants t ON t.id = l.tenant_id AND t.deleted_at IS NULL
       WHERE l.status IN ('active', 'past_due')
         AND l.current_period_end < NOW() + ($1 || ' days')::interval
       ORDER BY l.current_period_end ASC
       LIMIT $2`,
      [String(days), limit],
    );
    return rows;
  },

  async getActivityToday() {
    const { rows } = await pool.query(`
      SELECT e.event, COUNT(*)::int AS total, COUNT(DISTINCT ${WHO})::int AS unique_users
      FROM activity_events e
      WHERE (e.created_at AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date
      GROUP BY e.event
    `);
    return rows as { event: string; total: number; unique_users: number }[];
  },

  // ─── TENANTS ───────────────────────────────────────────────

  async listTenants(f: { q: string | null; plan?: string; status?: string; limit: number; offset: number }) {
    const params: unknown[] = [];
    const where: string[] = ['t.deleted_at IS NULL'];

    if (f.q) {
      params.push(like(f.q));
      where.push(`(t.name ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.slug ILIKE $${params.length})`);
    }
    if (f.plan) {
      params.push(f.plan);
      where.push(`l.plan_name = $${params.length}`);
    }
    if (f.status === 'none') where.push('l.tenant_id IS NULL');
    else if (f.status) {
      params.push(f.status);
      where.push(`l.status = $${params.length}`);
    }

    params.push(f.limit, f.offset);
    const { rows } = await pool.query(
      `WITH latest AS (${LATEST_SUB})
       SELECT t.id, t.name, t.slug, t.email, t.phone, t.is_active, t.created_at,
              l.plan_name, l.status AS subscription_status, l.current_period_end,
              CASE WHEN l.current_period_end IS NULL THEN NULL ELSE ${DAYS_LEFT('l.current_period_end')} END AS days_left,
              -- a solo tenant's owner is its doctor
              (SELECT COUNT(*)::int FROM users u
                 WHERE u.tenant_id = t.id AND u.role = 'doctor' AND u.deleted_at IS NULL)
                + CASE WHEN l.plan_name = 'solo' THEN 1 ELSE 0 END                               AS doctors,
              (SELECT COUNT(*)::int FROM queue_tokens qt JOIN queue_sessions qs ON qs.id = qt.session_id
                 WHERE qs.tenant_id = t.id AND qt.status = 'completed')                           AS patients_seen,
              (SELECT to_char(MAX(qs.session_date), 'YYYY-MM-DD') FROM queue_sessions qs WHERE qs.tenant_id = t.id) AS last_session,
              COUNT(*) OVER()::int AS total_count
       FROM tenants t
       LEFT JOIN latest l ON l.tenant_id = t.id
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  },

  async countTenantsByPlan() {
    const { rows } = await pool.query(`
      WITH latest AS (${LATEST_SUB})
      SELECT COALESCE(l.plan_name, 'none') AS plan, COUNT(*)::int AS count
      FROM tenants t LEFT JOIN latest l ON l.tenant_id = t.id
      WHERE t.deleted_at IS NULL
      GROUP BY 1
    `);
    return rows as { plan: string; count: number }[];
  },

  // ─── SUBSCRIPTIONS ─────────────────────────────────────────

  async listSubscriptions(group: string) {
    const filter: Record<string, string> = {
      all:      'TRUE',
      active:   `l.status = 'active'`,
      pending:  `l.status = 'pending'`,
      ended:    `l.status IN ('past_due', 'cancelled', 'expired')`,
      expiring: `l.status IN ('active', 'past_due') AND l.current_period_end < NOW() + INTERVAL '30 days'`,
    };
    const { rows } = await pool.query(`
      WITH latest AS (${LATEST_SUB})
      SELECT l.id, t.id AS tenant_id, t.name AS tenant_name, t.email AS tenant_email,
             l.plan_name, l.monthly_price, l.status, l.current_period_start, l.current_period_end,
             l.cancel_at_period_end, l.cancelled_at,
             ${DAYS_LEFT('l.current_period_end')} AS days_left
      FROM latest l
      JOIN tenants t ON t.id = l.tenant_id AND t.deleted_at IS NULL
      WHERE ${filter[group] ?? 'TRUE'}
      ORDER BY l.current_period_end ASC
      LIMIT 500
    `);
    return rows;
  },

  // ─── DOCTORS ───────────────────────────────────────────────

  async listDoctors(f: { q: string | null; limit: number; offset: number }) {
    const params: unknown[] = [];
    let search = '';
    if (f.q) {
      params.push(like(f.q));
      search = `AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR t.name ILIKE $1)`;
    }
    params.push(f.limit, f.offset);
    const { rows } = await pool.query(
      `WITH latest AS (${LATEST_SUB})
       SELECT u.id, u.full_name, u.email, u.phone, u.status, u.is_active, u.created_at,
              CASE WHEN u.role = 'tenant_admin' THEN 'solo' ELSE 'staff' END AS kind,
              t.id AS tenant_id, t.name AS tenant_name, l.plan_name,
              (SELECT string_agg(d.name, ', ' ORDER BY d.name)
                 FROM department_doctors dd JOIN departments d ON d.id = dd.department_id
                 WHERE dd.doctor_id = u.id AND d.deleted_at IS NULL)                        AS departments,
              (SELECT COUNT(*)::int FROM queue_tokens qt JOIN queue_sessions qs ON qs.id = qt.session_id
                 WHERE qs.doctor_id = u.id AND qt.status = 'completed')                     AS patients_seen,
              (SELECT to_char(MAX(qs.session_date), 'YYYY-MM-DD') FROM queue_sessions qs WHERE qs.doctor_id = u.id) AS last_session,
              COUNT(*) OVER()::int AS total_count
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN latest l ON l.tenant_id = u.tenant_id
       WHERE u.deleted_at IS NULL
         AND (u.role = 'doctor' OR (u.role = 'tenant_admin' AND l.plan_name = 'solo'))
         ${search}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  },

  // ─── PATIENTS ──────────────────────────────────────────────

  async listPatients(f: { q: string | null; limit: number; offset: number }) {
    const params: unknown[] = [];
    let search = '';
    if (f.q) {
      params.push(like(f.q));
      search = `AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)`;
    }
    params.push(f.limit, f.offset);
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.preferred_channel, u.is_active, u.created_at,
              COALESCE(v.visits, 0)::int AS visits,
              COALESCE(v.seen, 0)::int   AS seen,
              to_char(v.last_visit, 'YYYY-MM-DD') AS last_visit,
              COUNT(*) OVER()::int       AS total_count
       FROM users u
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS visits,
                COUNT(*) FILTER (WHERE qt.status = 'completed') AS seen,
                MAX(qs.session_date) AS last_visit
         FROM queue_tokens qt JOIN queue_sessions qs ON qs.id = qt.session_id
         WHERE qt.patient_id = u.id
       ) v ON TRUE
       WHERE u.role = 'patient' AND u.deleted_at IS NULL ${search}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  },

  // ─── REVENUE ───────────────────────────────────────────────

  async getRevenueTotals() {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8                           AS paid_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'
          AND date_trunc('month', paid_at AT TIME ZONE '${TZ}') = date_trunc('month', NOW() AT TIME ZONE '${TZ}')), 0)::float8
                                                                                                   AS paid_this_month,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::float8                        AS pending_total,
        COUNT(*) FILTER (WHERE status = 'failed')::int                                            AS failed_count,
        COUNT(*) FILTER (WHERE status = 'paid')::int                                              AS paid_count
      FROM invoices
    `);
    return rows[0];
  },

  async getMrrByPlan() {
    const { rows } = await pool.query(`
      WITH latest AS (${LATEST_SUB})
      SELECT p.name AS plan, p.monthly_price::float8 AS price,
             COUNT(l.tenant_id)::int AS active_tenants,
             (COUNT(l.tenant_id) * p.monthly_price)::float8 AS mrr
      FROM subscription_plans p
      LEFT JOIN latest l ON l.plan_name = p.name AND l.status = 'active' AND l.current_period_end > NOW()
      GROUP BY p.id, p.name, p.monthly_price
      ORDER BY p.monthly_price
    `);
    return rows as { plan: string; price: number; active_tenants: number; mrr: number }[];
  },

  async getMonthlyRevenue(months: number) {
    const { rows } = await pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', NOW() AT TIME ZONE '${TZ}') - (($1::int - 1) || ' months')::interval,
           date_trunc('month', NOW() AT TIME ZONE '${TZ}'),
           INTERVAL '1 month') AS m
       )
       SELECT to_char(m, 'YYYY-MM') AS month, COALESCE(SUM(i.amount), 0)::float8 AS amount
       FROM months
       LEFT JOIN invoices i ON i.status = 'paid'
         AND date_trunc('month', i.paid_at AT TIME ZONE '${TZ}') = m
       GROUP BY m ORDER BY m`,
      [months],
    );
    return rows as { month: string; amount: number }[];
  },

  async getRecentInvoices(limit: number) {
    const { rows } = await pool.query(
      `SELECT i.id, i.amount::float8 AS amount, i.currency, i.status, i.provider,
              i.period_start, i.period_end, i.paid_at, i.created_at,
              t.name AS tenant_name, p.name AS plan_name
       FROM invoices i
       JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN subscription_plans p ON p.id = i.plan_id
       ORDER BY i.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows;
  },

  // ─── ACTIVITY LOGS ─────────────────────────────────────────

  async getLogSummary(from: string, to: string) {
    const { rows } = await pool.query(
      `SELECT e.event, COUNT(*)::int AS total, COUNT(DISTINCT ${WHO})::int AS unique_users
       FROM activity_events e
       WHERE ${DAY_WINDOW('e.created_at', '$1', '$2')}
       GROUP BY e.event`,
      [from, to],
    );
    const { rows: all } = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(DISTINCT ${WHO})::int AS unique_users
       FROM activity_events e
       WHERE ${DAY_WINDOW('e.created_at', '$1', '$2')}`,
      [from, to],
    );
    return {
      byEvent: rows as { event: string; total: number; unique_users: number }[],
      overall: all[0] as { total: number; unique_users: number },
    };
  },

  async getLogDaily(from: string, to: string) {
    const { rows } = await pool.query(
      `WITH days AS (
         SELECT d::date AS day FROM generate_series($1::date, $2::date, INTERVAL '1 day') d
       ),
       ev AS (
         SELECT (e.created_at AT TIME ZONE '${TZ}')::date AS day, e.event, ${WHO} AS who
         FROM activity_events e
         WHERE ${DAY_WINDOW('e.created_at', '$1', '$2')}
       )
       SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
              COUNT(ev.event) FILTER (WHERE ev.event = 'home_visit')::int                          AS home_visit,
              COUNT(DISTINCT ev.who) FILTER (WHERE ev.event = 'home_visit')::int                   AS home_visit_unique,
              COUNT(ev.event) FILTER (WHERE ev.event = 'login_click')::int                         AS login_click,
              COUNT(DISTINCT ev.who) FILTER (WHERE ev.event = 'login_click')::int                  AS login_click_unique,
              COUNT(ev.event) FILTER (WHERE ev.event = 'register_clinic_click')::int               AS register_clinic_click,
              COUNT(DISTINCT ev.who) FILTER (WHERE ev.event = 'register_clinic_click')::int        AS register_clinic_click_unique,
              COUNT(ev.event) FILTER (WHERE ev.event = 'register_patient_click')::int              AS register_patient_click,
              COUNT(DISTINCT ev.who) FILTER (WHERE ev.event = 'register_patient_click')::int       AS register_patient_click_unique,
              COUNT(DISTINCT ev.who)::int                                                          AS unique_users
       FROM days LEFT JOIN ev ON ev.day = days.day
       GROUP BY days.day
       ORDER BY days.day`,
      [from, to],
    );
    return rows;
  },

  async getLogPlacements(from: string, to: string) {
    const { rows } = await pool.query(
      `SELECT e.event, COALESCE(e.placement, 'unknown') AS placement, COUNT(*)::int AS total
       FROM activity_events e
       WHERE ${DAY_WINDOW('e.created_at', '$1', '$2')}
       GROUP BY 1, 2
       ORDER BY total DESC`,
      [from, to],
    );
    return rows as { event: string; placement: string; total: number }[];
  },

  async listLogEvents(f: { from: string; to: string; event?: string; limit: number; offset: number }) {
    const params: unknown[] = [f.from, f.to];
    let eventFilter = '';
    if (f.event) {
      params.push(f.event);
      eventFilter = `AND e.event = $${params.length}`;
    }
    params.push(f.limit, f.offset);
    const { rows } = await pool.query(
      `SELECT e.id::text AS id, e.event, e.placement, e.path, e.visitor_id, e.referrer,
              host(e.ip_address) AS ip_address, e.user_agent, e.created_at,
              u.full_name AS user_name, u.role AS user_role,
              COUNT(*) OVER()::int AS total_count
       FROM activity_events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ${DAY_WINDOW('e.created_at', '$1', '$2')} ${eventFilter}
       ORDER BY e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  },
};
