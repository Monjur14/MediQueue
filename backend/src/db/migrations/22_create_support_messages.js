/**
 * Migration 22 — Create support_messages table
 *
 * Lets a tenant admin send a message to the platform owner — used on the
 * Billing page while Stripe is in test mode ("send us a message, we will
 * activate your account"). Super admin reads/resolves them from /super/messages.
 */
export const up = (pgm) => {
  pgm.createTable('support_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    message: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'varchar(16)',
      notNull: true,
      default: 'open',
      comment: 'open | resolved',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    resolved_at: {
      type: 'timestamptz',
    },
  });

  pgm.createIndex('support_messages', 'tenant_id');
  pgm.createIndex('support_messages', 'status');
  pgm.createIndex('support_messages', 'created_at');

  pgm.addConstraint('support_messages', 'support_messages_status_check', {
    check: "status IN ('open', 'resolved')",
  });
};

export const down = (pgm) => {
  pgm.dropTable('support_messages');
};
