export const up = (pgm) => {
  pgm.sql(`
    -- Add unique constraint so ON CONFLICT (tenant_id) works in billing upserts
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_tenant_id_unique UNIQUE (tenant_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_unique;
  `);
};
