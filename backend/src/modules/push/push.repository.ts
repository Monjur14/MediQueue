import { pool } from '../../config/database.js';

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NearTurnToken = {
  id: string;
  patient_id: string;
  token_number: number;
  ahead: number;
  clinic_name: string;
  doctor_name: string;
};

export const pushRepository = {
  async upsertSubscription(userId: string, endpoint: string, p256dh: string, auth: string, userAgent: string | null) {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent`,
      [userId, endpoint, p256dh, auth, userAgent],
    );
  },

  async deleteSubscription(userId: string, endpoint: string) {
    await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);
  },

  async deleteByEndpoint(endpoint: string) {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  },

  async markUsed(endpoint: string) {
    await pool.query(`UPDATE push_subscriptions SET last_used_at = NOW() WHERE endpoint = $1`, [endpoint]);
  },

  async getByUser(userId: string): Promise<PushSubscriptionRow[]> {
    const result = await pool.query(
      `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );
    return result.rows;
  },

  /**
   * Atomically claims every waiting token in an open session with `threshold` or fewer
   * patients ahead that has not been alerted yet. Concurrent callers can't claim the
   * same token: the second UPDATE re-checks `push_notified_at IS NULL` after the row lock.
   */
  async claimNearTurnTokens(sessionId: string, threshold: number): Promise<NearTurnToken[]> {
    const result = await pool.query(
      `WITH ranked AS (
         SELECT tk.id, (ROW_NUMBER() OVER (ORDER BY tk.token_number) - 1)::int AS ahead
         FROM queue_tokens tk
         JOIN queue_sessions s ON s.id = tk.session_id AND s.status = 'open'
         WHERE tk.session_id = $1 AND tk.status = 'waiting'
       ),
       claimed AS (
         UPDATE queue_tokens qt
         SET push_notified_at = NOW()
         FROM ranked r
         WHERE qt.id = r.id AND r.ahead <= $2 AND qt.push_notified_at IS NULL
         RETURNING qt.id, qt.patient_id, qt.token_number, qt.session_id, r.ahead
       )
       SELECT c.id, c.patient_id, c.token_number, c.ahead,
              t.name AS clinic_name, u.full_name AS doctor_name
       FROM claimed c
       JOIN queue_sessions qs ON qs.id = c.session_id
       JOIN tenants t ON t.id = qs.tenant_id
       JOIN users u   ON u.id = qs.doctor_id`,
      [sessionId, threshold],
    );
    return result.rows;
  },
};
