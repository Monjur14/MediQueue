/**
 * Migration 20 — payment_events
 *
 * Idempotency store for Stripe (and future bKash/SSLCommerz) webhook events.
 * Before processing any webhook, the worker checks whether the event_id already
 * exists here. If it does, the event is a duplicate and is silently skipped.
 * If not, the event is processed and then inserted — guaranteeing exactly-once
 * side-effects regardless of how many times Stripe retries delivery.
 *
 * Why a separate table instead of relying on the invoices UNIQUE constraint?
 * The constraint only protects the invoice insert. Business logic that runs
 * before the insert — activating subscriptions, updating statuses — would still
 * execute twice on a duplicate. This table provides a single check-point that
 * guards all downstream effects.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE payment_events (
      event_id      VARCHAR(255) PRIMARY KEY,  -- Stripe event ID (evt_...)
      event_type    VARCHAR(128) NOT NULL,      -- e.g. checkout.session.completed
      processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE payment_events IS
      'Idempotency store — one row per processed webhook event. Insert before commit; duplicate event_id = already processed.';
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS payment_events;`);
};
