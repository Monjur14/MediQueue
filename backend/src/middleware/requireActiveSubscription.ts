import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

/**
 * Blocks requests from tenants whose subscription is not active.
 * Returns 402 Payment Required with a redirect hint for the client.
 *
 * Apply AFTER authenticate so req.user is available.
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const tenantId = req.user?.tenantId;
  // Super-admin bypass (no tenantId)
  if (!tenantId) return next();

  try {
    // Check if the user is in pending_payment state (just registered, no sub yet)
    const userResult = await pool.query(
      `SELECT status FROM users WHERE id = $1 LIMIT 1`,
      [req.user!.id],
    );
    if (userResult.rows[0]?.status === 'pending_payment') {
      // Let them through to /api/billing/checkout so they can pay
      return next();
    }

    const result = await pool.query(
      `SELECT status FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    );

    const sub = result.rows[0] as { status: string } | undefined;

    if (!sub) {
      return res.status(402).json({
        message: 'No subscription found. Please subscribe to continue.',
        redirect: '/billing',
      });
    }

    if (sub.status === 'active') return next();

    if (sub.status === 'past_due') {
      return res.status(402).json({
        message: 'Your payment is overdue. Please update your payment method.',
        redirect: '/billing',
      });
    }

    return res.status(402).json({
      message: `Your subscription is ${sub.status}. Please reactivate to continue.`,
      redirect: '/billing',
    });
  } catch (err) {
    console.error('[requireActiveSubscription]', err);
    // Fail open — don't block users if DB check fails
    return next();
  }
};
