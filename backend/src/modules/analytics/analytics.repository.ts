import { pool } from '../../config/database.js';

export const analyticsRepository = {
  async getSummary(tenantId: string, days: number) {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                                      FILTER (WHERE qt.status = 'completed')        AS total_completed,
         COUNT(*)                                                      FILTER (WHERE qt.status IN ('skipped','no_show')) AS total_no_show,
         COUNT(*)                                                      FILTER (WHERE qt.status != 'cancelled')        AS total_issued,
         ROUND(AVG(EXTRACT(EPOCH FROM (qt.called_at - qt.created_at)) / 60)
               FILTER (WHERE qt.called_at IS NOT NULL))               AS avg_wait_minutes,
         ROUND(AVG(EXTRACT(EPOCH FROM (qt.completed_at - qt.called_at)) / 60)
               FILTER (WHERE qt.completed_at IS NOT NULL
                         AND qt.called_at    IS NOT NULL))            AS avg_consultation_minutes
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qs.id = qt.session_id
       WHERE qs.tenant_id   = $1
         AND qs.session_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [tenantId, days]
    );
    return result.rows[0];
  },

  async getDailyVolumes(tenantId: string, days: number) {
    const result = await pool.query(
      `SELECT
         qs.session_date::date                                         AS date,
         COUNT(*) FILTER (WHERE qt.status = 'completed')              AS completed,
         COUNT(*) FILTER (WHERE qt.status IN ('skipped','no_show'))   AS no_show
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qs.id = qt.session_id
       WHERE qs.tenant_id   = $1
         AND qs.session_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND qt.status       != 'cancelled'
       GROUP BY qs.session_date::date
       ORDER BY date ASC`,
      [tenantId, days]
    );
    return result.rows;
  },

  async getPeakHours(tenantId: string, days: number) {
    const result = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM qt.called_at AT TIME ZONE 'Asia/Dhaka')::int AS hour,
         COUNT(*)                                                         AS count
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qs.id = qt.session_id
       WHERE qs.tenant_id   = $1
         AND qt.called_at   IS NOT NULL
         AND qs.session_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       GROUP BY hour
       ORDER BY hour ASC`,
      [tenantId, days]
    );
    return result.rows;
  },

  async getDoctorBreakdown(tenantId: string, days: number) {
    const result = await pool.query(
      `SELECT
         u.full_name                                                              AS doctor_name,
         COUNT(DISTINCT qs.session_date::date)                                   AS session_days,
         COUNT(*) FILTER (WHERE qt.status = 'completed')                         AS patients_seen,
         COUNT(*) FILTER (WHERE qt.status IN ('skipped','no_show'))              AS no_shows,
         ROUND(AVG(EXTRACT(EPOCH FROM (qt.completed_at - qt.called_at)) / 60)
               FILTER (WHERE qt.completed_at IS NOT NULL
                         AND qt.called_at    IS NOT NULL))                       AS avg_consultation_minutes
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qs.id  = qt.session_id
       JOIN users            u  ON u.id = qs.doctor_id
       WHERE qs.tenant_id   = $1
         AND qs.session_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND qt.status       != 'cancelled'
       GROUP BY u.id, u.full_name
       ORDER BY patients_seen DESC`,
      [tenantId, days]
    );
    return result.rows;
  },
};
