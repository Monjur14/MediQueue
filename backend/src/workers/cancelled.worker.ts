import { Worker, Job } from 'bullmq';
import { pool } from '../config/database.js';
import { bullmqConnection } from '../config/bullmq.js';

export interface CancelledJob {
  tenantId: string;
  subscriptionId: string;
  periodEnd: string; // ISO timestamp — when access should stop
}

/**
 * Cancelled Worker
 *
 * Fired when a tenant cancels their subscription (customer.subscription.updated
 * with cancel_at_period_end = true, or customer.subscription.deleted).
 *
 * Stripe keeps the subscription active until the end of the current billing
 * period — the tenant paid for it. This worker fires at that exact moment
 * to lock the account.
 *
 * On execution:
 *   1. Re-check status — if tenant resubscribed (status 'active'), do nothing.
 *   2. If still 'cancelled', suspend all tenant users.
 */
export const startCancelledWorker = () => {
  const worker = new Worker(
    'subscription-cancelled',
    async (job: Job<CancelledJob>) => {
      const { tenantId, subscriptionId } = job.data;

      console.log(`[cancelled] Processing period-end lock for tenant: ${tenantId}`);

      const result = await pool.query(
        `SELECT status FROM subscriptions WHERE id = $1`,
        [subscriptionId],
      );

      const sub = result.rows[0] as { status: string } | undefined;

      if (!sub) {
        console.log(`[cancelled] Subscription ${subscriptionId} not found — skipping`);
        return;
      }

      if (sub.status === 'active') {
        console.log(`[cancelled] Tenant ${tenantId} resubscribed — status is 'active', skipping lock`);
        return;
      }

      console.log(`[cancelled] Period ended for tenant ${tenantId} — locking account`);

      await pool.query('BEGIN');
      try {
        // Ensure subscription status is cancelled (Stripe deleted event may
        // have already set this — this is a safety update)
        await pool.query(
          `UPDATE subscriptions
           SET status     = 'cancelled',
               updated_at = NOW()
           WHERE id = $1
             AND status  != 'active'`, // don't overwrite if they resubscribed
          [subscriptionId],
        );

        // Suspend all tenant staff — they can log in but all actions are blocked
        // by requireActiveSubscription middleware
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
        console.log(`[cancelled] Tenant ${tenantId} locked — subscription period ended`);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    },
    { connection: bullmqConnection },
  );

  worker.on('completed', (job) => {
    console.log(`[cancelled] Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[cancelled] Job failed: ${job?.id}`, err);
  });

  console.log('✅ Cancelled worker started');
  return worker;
};

/**
 * Schedule a period-end lock for a cancelled subscription.
 * delay = periodEnd timestamp - now (fires exactly when access should stop).
 * Called from billing.service.ts on customer.subscription.updated with
 * cancel_at_period_end = true.
 */
export const scheduleCancelledLock = async (data: CancelledJob) => {
  const { cancelledQueue } = await import('../config/bullmq.js');

  const periodEnd = new Date(data.periodEnd).getTime();
  const now = Date.now();
  const delay = Math.max(periodEnd - now, 0);

  await cancelledQueue.add('lock-cancelled', data, {
    delay,
    jobId: `cancelled:${data.subscriptionId}`, // deduplicate — one job per subscription
  });

  const hoursUntilLock = Math.round(delay / 1000 / 60 / 60);
  console.log(`[cancelled] Lock scheduled for tenant ${data.tenantId} in ~${hoursUntilLock}h`);
};

/**
 * Cancel a pending lock job — called if the tenant resubscribes before
 * their period ends (customer.subscription.updated back to active).
 */
export const cancelCancelledLock = async (subscriptionId: string) => {
  const { cancelledQueue } = await import('../config/bullmq.js');
  await cancelledQueue.remove(`cancelled:${subscriptionId}`);
  console.log(`[cancelled] Lock job cancelled for subscription ${subscriptionId} — tenant resubscribed`);
};
