/**
 * Migration 21 — web push
 *
 * push_subscriptions: one row per browser/device a user has allowed notifications on.
 * The endpoint is unique per browser, so re-subscribing on a shared device simply
 * moves the row to the newly signed-in user.
 *
 * queue_tokens.push_notified_at: set once when the "3 patients ahead" alert is sent.
 * Claimed with an atomic UPDATE ... WHERE push_notified_at IS NULL, so a token is
 * never alerted twice even if several queue events are processed at the same time.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE push_subscriptions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint     TEXT NOT NULL UNIQUE,
      p256dh       TEXT NOT NULL,
      auth         TEXT NOT NULL,
      user_agent   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );

    CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);

    ALTER TABLE queue_tokens ADD COLUMN push_notified_at TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_tokens DROP COLUMN IF EXISTS push_notified_at;
    DROP TABLE IF EXISTS push_subscriptions;
  `);
};
