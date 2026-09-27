import { pool } from '../../config/database.js';

export interface SubscriptionPlan {
  id: number;
  name: 'solo' | 'clinic' | 'hospital';
  max_doctors: number | null;
  max_departments: number | null;
  max_daily_patients: number | null;
  monthly_price: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: number;
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  plan_name?: string;
  monthly_price?: string;
}

export const billingRepository = {
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const result = await pool.query(
      `SELECT id, name, max_doctors, max_departments, max_daily_patients, monthly_price, created_at
       FROM subscription_plans
       ORDER BY monthly_price ASC`,
    );
    return result.rows;
  },

  async getSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT s.*, sp.name AS plan_name, sp.monthly_price
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.tenant_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [tenantId],
    );
    return result.rows[0] ?? null;
  },

  async upsertStripeCustomerId(tenantId: string, customerId: string): Promise<void> {
    await pool.query(
      `UPDATE subscriptions
       SET stripe_customer_id = $1, updated_at = NOW()
       WHERE tenant_id = $2`,
      [customerId, tenantId],
    );
  },

  async upsertSubscription(data: {
    tenant_id: string;
    plan_id: number;
    status: Subscription['status'];
    stripe_customer_id: string;
    stripe_subscription_id: string;
    current_period_start: Date;
    current_period_end: Date;
    cancel_at_period_end: boolean;
    cancelled_at?: Date | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO subscriptions (
         tenant_id, plan_id, status,
         stripe_customer_id, stripe_subscription_id,
         current_period_start, current_period_end,
         cancel_at_period_end, cancelled_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         plan_id                = EXCLUDED.plan_id,
         status                 = EXCLUDED.status,
         stripe_customer_id     = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         current_period_start   = EXCLUDED.current_period_start,
         current_period_end     = EXCLUDED.current_period_end,
         cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
         cancelled_at           = EXCLUDED.cancelled_at,
         updated_at             = NOW()`,
      [
        data.tenant_id,
        data.plan_id,
        data.status,
        data.stripe_customer_id,
        data.stripe_subscription_id,
        data.current_period_start,
        data.current_period_end,
        data.cancel_at_period_end,
        data.cancelled_at ?? null,
      ],
    );
  },

  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: Subscription['status'],
    extra?: {
      current_period_start?: Date;
      current_period_end?: Date;
      cancel_at_period_end?: boolean;
      cancelled_at?: Date | null;
    },
  ): Promise<void> {
    const fields = ['status = $1', 'updated_at = NOW()'];
    const values: unknown[] = [status];
    let idx = 2;

    if (extra?.current_period_start) {
      fields.push(`current_period_start = $${idx++}`);
      values.push(extra.current_period_start);
    }
    if (extra?.current_period_end) {
      fields.push(`current_period_end = $${idx++}`);
      values.push(extra.current_period_end);
    }
    if (extra?.cancel_at_period_end !== undefined) {
      fields.push(`cancel_at_period_end = $${idx++}`);
      values.push(extra.cancel_at_period_end);
    }
    if (extra?.cancelled_at !== undefined) {
      fields.push(`cancelled_at = $${idx++}`);
      values.push(extra.cancelled_at);
    }

    values.push(stripeSubscriptionId);
    await pool.query(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = $${idx}`,
      values,
    );
  },

  async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const result = await pool.query(
      `SELECT * FROM subscription_plans WHERE name = $1`,
      [name],
    );
    return result.rows[0] ?? null;
  },

  async getPlanById(id: number): Promise<SubscriptionPlan | null> {
    const result = await pool.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async getTenantEmail(tenantId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT email FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    return result.rows[0]?.email ?? null;
  },

  /** Move tenant admin from pending_payment → active after successful payment */
  async activateTenantAdmin(tenantId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET status = 'active', updated_at = NOW()
       WHERE tenant_id = $1
         AND role = 'tenant_admin'
         AND status = 'pending_payment'`,
      [tenantId],
    );
  },


  /** Look up a subscription by its Stripe subscription ID. */
  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
      [stripeSubscriptionId],
    );
    return result.rows[0] ?? null;
  },

  // ─── WEBHOOK IDEMPOTENCY ────────────────────────────────────────────────────

  /** Returns true if this Stripe event ID has already been processed. */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM payment_events WHERE event_id = $1`,
      [eventId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  /**
   * Record a processed event so future duplicates are skipped.
   * Uses INSERT ... ON CONFLICT DO NOTHING — safe to call concurrently.
   */
  async markEventProcessed(eventId: string, eventType: string): Promise<void> {
    await pool.query(
      `INSERT INTO payment_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType],
    );
  },
};
