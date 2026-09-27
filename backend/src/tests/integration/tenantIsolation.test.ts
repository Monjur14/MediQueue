import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../config/database.js';

// ─── Shared state ─────────────────────────────────────────────────────────────

let tenantAId: string;
let tenantBId: string;
let adminAId:  string;
let adminBId:  string;
let doctorAId: string;
let doctorBId: string;
let patientAId: string;
let patientBId: string;
let deptAId:   string;
let deptBId:   string;
let sessionAId: string;
let sessionBId: string;
let tokenAId:  string;
let tokenBId:  string;

// ─── RLS context helper ───────────────────────────────────────────────────────

/**
 * Run `fn` inside a transaction that:
 *  1. Sets the three PostgreSQL RLS session variables (tenant_id, user_id, role)
 *  2. Switches to the `mediqueue_app` role so RLS policies are enforced
 *     (the DB connects as postgres/superuser which bypasses RLS by default)
 *
 * Always rolls back so no side-effects escape.
 */
async function withTenantContext(
  tenantId: string,
  userId: string,
  userRole: string,
  fn: (client: any) => Promise<any>,
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, TRUE),
              set_config('app.current_user_id',   $2, TRUE),
              set_config('app.current_user_role',  $3, TRUE)`,
      [tenantId, userId, userRole],
    );
    // Must impersonate a non-superuser so RLS policies actually fire.
    // postgres is a superuser and bypasses RLS without this step.
    await client.query('SET LOCAL ROLE mediqueue_app');
    const result = await fn(client);
    await client.query('ROLLBACK');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const ts = Date.now();
  const slug = String(ts).slice(-7); // 7-digit slug: 6-char prefix + 7 + 1 differentiator = 14 chars, no truncation

  // Ensure mediqueue_app role exists with minimum SELECT grants for these tests.
  // GRANT is idempotent in PostgreSQL, so re-running is safe.
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mediqueue_app') THEN
        CREATE ROLE mediqueue_app;
      END IF;
    END $$;
  `);
  await pool.query(`
    GRANT SELECT ON
      tenants, users, departments, queue_sessions, queue_tokens
    TO mediqueue_app;
  `);

  // ── Tenant A ──────────────────────────────────────────────────────────────
  const tA = await pool.query(
    `INSERT INTO tenants (name, slug, email, phone)
     VALUES ('Clinic Alpha', $1, $2, $3) RETURNING id`,
    [`alpha-${slug}`, `alpha-${ts}@rls.test`, `+88017${slug}0`],
  );
  tenantAId = tA.rows[0].id;

  const uA = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Admin Alpha', $1, $2, 'hash', 'tenant_admin', $3, 'active') RETURNING id`,
    [`admin-a-${ts}@rls.test`, `+88017${slug}1`, tenantAId],
  );
  adminAId = uA.rows[0].id;

  const dA = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Doctor Alpha', $1, $2, 'hash', 'doctor', $3, 'active') RETURNING id`,
    [`doctor-a-${ts}@rls.test`, `+88017${slug}2`, tenantAId],
  );
  doctorAId = dA.rows[0].id;

  const pA = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, status)
     VALUES ('Patient Alpha', $1, $2, 'hash', 'patient', 'active') RETURNING id`,
    [`patient-a-${ts}@rls.test`, `+88017${slug}3`],
  );
  patientAId = pA.rows[0].id;

  const depA = await pool.query(
    `INSERT INTO departments (tenant_id, name) VALUES ($1, 'Alpha Dept') RETURNING id`,
    [tenantAId],
  );
  deptAId = depA.rows[0].id;

  const sA = await pool.query(
    `INSERT INTO queue_sessions
       (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
     VALUES ($1, $2, $3, CURRENT_DATE, 20, 1) RETURNING id`,
    [tenantAId, doctorAId, deptAId],
  );
  sessionAId = sA.rows[0].id;

  const tkA = await pool.query(
    `INSERT INTO queue_tokens (session_id, patient_id, token_number, status)
     VALUES ($1, $2, 1, 'waiting') RETURNING id`,
    [sessionAId, patientAId],
  );
  tokenAId = tkA.rows[0].id;

  // ── Tenant B ──────────────────────────────────────────────────────────────
  const tB = await pool.query(
    `INSERT INTO tenants (name, slug, email, phone)
     VALUES ('Clinic Beta', $1, $2, $3) RETURNING id`,
    [`beta-${slug}`, `beta-${ts}@rls.test`, `+88018${slug}0`],
  );
  tenantBId = tB.rows[0].id;

  const uB = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Admin Beta', $1, $2, 'hash', 'tenant_admin', $3, 'active') RETURNING id`,
    [`admin-b-${ts}@rls.test`, `+88018${slug}1`, tenantBId],
  );
  adminBId = uB.rows[0].id;

  const dB = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Doctor Beta', $1, $2, 'hash', 'doctor', $3, 'active') RETURNING id`,
    [`doctor-b-${ts}@rls.test`, `+88018${slug}2`, tenantBId],
  );
  doctorBId = dB.rows[0].id;

  const pB = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, status)
     VALUES ('Patient Beta', $1, $2, 'hash', 'patient', 'active') RETURNING id`,
    [`patient-b-${ts}@rls.test`, `+88018${slug}3`],
  );
  patientBId = pB.rows[0].id;

  const depB = await pool.query(
    `INSERT INTO departments (tenant_id, name) VALUES ($1, 'Beta Dept') RETURNING id`,
    [tenantBId],
  );
  deptBId = depB.rows[0].id;

  const sB = await pool.query(
    `INSERT INTO queue_sessions
       (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
     VALUES ($1, $2, $3, CURRENT_DATE, 20, 1) RETURNING id`,
    [tenantBId, doctorBId, deptBId],
  );
  sessionBId = sB.rows[0].id;

  const tkB = await pool.query(
    `INSERT INTO queue_tokens (session_id, patient_id, token_number, status)
     VALUES ($1, $2, 1, 'waiting') RETURNING id`,
    [sessionBId, patientBId],
  );
  tokenBId = tkB.rows[0].id;
});

// ─── Teardown ─────────────────────────────────────────────────────────────────

afterAll(async () => {
  // Delete in reverse dependency order
  for (const id of [tokenAId, tokenBId].filter(Boolean))
    await pool.query(`DELETE FROM queue_tokens WHERE id = $1`, [id]);
  for (const id of [sessionAId, sessionBId].filter(Boolean))
    await pool.query(`DELETE FROM queue_sessions WHERE id = $1`, [id]);
  for (const id of [deptAId, deptBId].filter(Boolean))
    await pool.query(`DELETE FROM departments WHERE id = $1`, [id]);
  for (const id of [adminAId, adminBId, doctorAId, doctorBId, patientAId, patientBId].filter(Boolean))
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  for (const id of [tenantAId, tenantBId].filter(Boolean))
    await pool.query(`DELETE FROM tenants WHERE id = $1`, [id]);
  await pool.end();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Tenant Isolation via PostgreSQL RLS', () => {
  // ── Positive: each tenant sees its own data ──────────────────────────────

  it('tenant A sees its own department', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM departments WHERE id = $1`, [deptAId]);
      return r.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(deptAId);
  });

  it('tenant A sees its own queue session', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM queue_sessions WHERE id = $1`, [sessionAId]);
      return r.rows;
    });
    expect(rows).toHaveLength(1);
  });

  it('tenant A sees its own queue token', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM queue_tokens WHERE id = $1`, [tokenAId]);
      return r.rows;
    });
    expect(rows).toHaveLength(1);
  });

  // ── Negative: tenant A cannot access tenant B's data ─────────────────────

  it('tenant A cannot see tenant B department', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM departments WHERE id = $1`, [deptBId]);
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it('tenant A cannot see tenant B queue session', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM queue_sessions WHERE id = $1`, [sessionBId]);
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it('tenant A cannot see tenant B queue token', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM queue_tokens WHERE id = $1`, [tokenBId]);
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it('tenant A cannot see tenant B staff users', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'tenant_admin', async (c) => {
      const r = await c.query(
        `SELECT id FROM users WHERE id IN ($1, $2)`,
        [adminBId, doctorBId],
      );
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  // ── Negative: tenant B cannot access tenant A's data ─────────────────────

  it('tenant B cannot see tenant A department', async () => {
    const rows = await withTenantContext(tenantBId, adminBId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM departments WHERE id = $1`, [deptAId]);
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it('tenant B cannot see tenant A queue token', async () => {
    const rows = await withTenantContext(tenantBId, adminBId, 'tenant_admin', async (c) => {
      const r = await c.query(`SELECT id FROM queue_tokens WHERE id = $1`, [tokenAId]);
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  // ── super_admin bypass: sees all tenants' data ────────────────────────────

  it('super_admin can see departments from both tenants', async () => {
    // tenant_id value is irrelevant for super_admin — the role check bypasses the tenant filter
    const rows = await withTenantContext(tenantAId, adminAId, 'super_admin', async (c) => {
      const r = await c.query(
        `SELECT id FROM departments WHERE id IN ($1, $2) ORDER BY id`,
        [deptAId, deptBId],
      );
      return r.rows;
    });
    expect(rows).toHaveLength(2);
  });

  it('super_admin can see queue sessions from both tenants', async () => {
    const rows = await withTenantContext(tenantAId, adminAId, 'super_admin', async (c) => {
      const r = await c.query(
        `SELECT id FROM queue_sessions WHERE id IN ($1, $2)`,
        [sessionAId, sessionBId],
      );
      return r.rows;
    });
    expect(rows).toHaveLength(2);
  });
});
