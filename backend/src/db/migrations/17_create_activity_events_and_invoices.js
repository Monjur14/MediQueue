/**
 * Migration 17 — activity_events + invoices
 *
 * activity_events: anonymous product analytics (homepage visits, CTA clicks).
 *   placement records which button was used (navbar, hero, final_cta, mobile_menu).
 *   Append only. visitor_id is a random id stored in the visitor's browser,
 *   user_id is set when the visitor is logged in. Unique users are counted as
 *   DISTINCT COALESCE(user_id::text, visitor_id).
 *
 * invoices: one row per billing period charged to a tenant. Platform revenue
 *   is the sum of paid invoices. Empty until Stripe / bKash write to it.
 *
 * Neither table is tenant scoped for reading — only super_admin reads them,
 * so RLS is not enabled (same approach as audit_logs).
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE activity_events (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event       VARCHAR(64)  NOT NULL,
      path        VARCHAR(255),
      placement   VARCHAR(32),
      visitor_id  VARCHAR(64)  NOT NULL,
      user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      referrer    VARCHAR(512),
      ip_address  INET,
      user_agent  TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_activity_events_created_at ON activity_events (created_at);
    CREATE INDEX idx_activity_events_event_time ON activity_events (event, created_at);

    CREATE TABLE invoices (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID NOT NULL REFERENCES tenants(id),
      subscription_id UUID REFERENCES subscriptions(id),
      plan_id         INTEGER REFERENCES subscription_plans(id),
      amount          NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
      currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
      status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'void')),
      provider        VARCHAR(20) CHECK (provider IN ('stripe', 'bkash', 'sslcommerz', 'manual')),
      provider_ref    VARCHAR(128),
      period_start    TIMESTAMPTZ,
      period_end      TIMESTAMPTZ,
      paid_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT check_invoice_paid_at CHECK (status <> 'paid' OR paid_at IS NOT NULL),
      CONSTRAINT unique_invoice_provider_ref UNIQUE (provider, provider_ref)
    );

    CREATE INDEX idx_invoices_tenant ON invoices (tenant_id);
    CREATE INDEX idx_invoices_paid_at ON invoices (paid_at) WHERE status = 'paid';
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS activity_events;
  `);
};
