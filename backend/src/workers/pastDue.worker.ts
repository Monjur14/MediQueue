import { Worker, Job } from 'bullmq';
import { pool } from '../config/database.js';
import { bullmqConnection } from '../config/bullmq.js';

export interface PastDueJob {
  tenantId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
}

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Past Due Worker
 *
 * Fired when Stripe reports a payment failure (invoice.payment_failed).
 * The job is scheduled with a 7-day delay — the grace period.
 *
 * On execution:
 *   1. Re-check subscription status — if the tenant paid in the meantime
 *      (status is back to 'active'), do nothing.
 *   2. If still 'past_due', move to 'expired' and lock all tenant users.
 *
 * Why delay, not poll?
 *   BullMQ persists the delayed job in Redis. It survives server restarts
 *   and fires exactly once after the delay — no cron needed.
 */
export const startPastDueWorker = () => {
  const worker = new Worker(
    'subscription-past-due',
    async (job: Job<PastDueJob>) => {
      const { tenantId, subscriptionId, stripeSubscriptionId } = job.data;

      console.log(`[pastDue] Checking grace period expiry for tenant: ${tenantId}`);

      // Re-read current status — tenant may have paid during the grace period
      const result = await pool.query(
        `SELECT status FROM subscriptions WHERE id = $1`,
        [subscriptionId],
      );

      const sub = result.rows[0] as { status: string } | undefined;

      if (!sub) {
        console.log(`[pastDue] Subscription ${subscriptionId} not found — skipping`);
        return;
      }

      if (sub.status !== 'past_due') {
        console.log(`[pastDue] Tenant ${tenantId} resolved — status is now '${sub.status}', skipping lock`);
        return;
      }

      // Grace period over, tenant still hasn't paid — expire and lock
      console.log(`[pastDue] Grace period expired for tenant ${tenantId} — locking account`);

      await pool.query('BEGIN');
      try {
        // Move subscription to expired
        await pool.query(
          `UPDATE subscriptions
           SET status     = 'expired',
               updated_at = NOW()
           WHERE id = $1`,
          [subscriptionId],
        );

        // Suspend all non-patient users under this tenant
        await pool.query(
          `UPDATE users
           SET status     = 'suspended',
               updated_at = NOW()
           WHERE tenant_id = $1
             AND role IN ('tenant_admin', 'doctor')
             AND status   = 'active'`,
          [tenantId],
        );

        await pool.query('COMMIT');
        console.log(`[pastDue] Tenant ${tenantId} locked — subscription expired`);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    },
    { connection: bullmqConnection },
  );

  worker.on('completed', (job) => {
    console.log(`[pastDue] Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[pastDue] Job failed: ${job?.id}`, err);
  });

  console.log('✅ Past-due worker started');
  return worker;
};

/**
 * Schedule a grace-period expiry job for a tenant whose payment just failed.
 * Called from billing.service.ts on invoice.payment_failed.
 * If a job already exists for this subscription, the duplicate is ignored
 * because BullMQ deduplicates by jobId.
 */
export const schedulePastDueExpiry = async (data: PastDueJob) => {
  const { pastDueQueue } = await import('../config/bullmq.js');
  await pastDueQueue.add('expire-past-due', data, {
    delay: GRACE_PERIOD_MS,
    jobId: `past-due:${data.subscriptionId}`, // deduplicate — one job per subscription
  });
  console.log(`[pastDue] Grace period job scheduled for tenant ${data.tenantId} (7 days)`);
};

/**
 * Cancel a pending grace-period job — called when payment succeeds after
 * a previous failure (invoice.payment_succeeded on a past_due subscription).
 */
export const cancelPastDueExpiry = async (subscriptionId: string) => {
  const { pastDueQueue } = await import('../config/bullmq.js');
  await pastDueQueue.remove(`past-due:${subscriptionId}`);
  console.log(`[pastDue] Grace period job cancelled for subscription ${subscriptionId}`);
};
