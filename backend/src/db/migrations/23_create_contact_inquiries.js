/**
 * Migration 23 — Create contact_inquiries table
 *
 * Public "Contact us" form on the marketing homepage (name, email, message).
 * No tenant — visitors filling this out don't have an account yet.
 */
export const up = (pgm) => {
  pgm.createTable('contact_inquiries', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(120)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
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

  pgm.createIndex('contact_inquiries', 'status');
  pgm.createIndex('contact_inquiries', 'created_at');

  pgm.addConstraint('contact_inquiries', 'contact_inquiries_status_check', {
    check: "status IN ('open', 'resolved')",
  });
};

export const down = (pgm) => {
  pgm.dropTable('contact_inquiries');
};
