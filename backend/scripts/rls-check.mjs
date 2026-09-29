// READ-ONLY RLS check. Connects exactly like the app (DATABASE_URL) and answers:
//   1) Is this DB login able to bypass RLS?   2) Is RLS on?   3) Does tenant A see tenant B's rows?
// Run from /backend:  node scripts/rls-check.mjs
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const ZERO = '00000000-0000-0000-0000-000000000000';
const TABLES = ['tenants', 'users', 'departments', 'queue_sessions', 'queue_tokens', 'doctor_breaks'];

const line = (s = '') => console.log(s);
let leak = false;

try {
  // 1) Who am I?
  const me = (await pool.query(
    `SELECT current_user AS who, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)).rows[0];
  line(`1) App connects as: ${me.who}   superuser=${me.rolsuper}   bypassrls=${me.rolbypassrls}`);
  const bypass = me.rolsuper || me.rolbypassrls;
  line(bypass
    ? '   -> This login IGNORES row-level security. Policies are never applied to the app.'
    : '   -> This login is subject to RLS. Good.');

  // 2) Is RLS switched on per table?
  line('\n2) RLS flags (enabled / forced):');
  const flags = await pool.query(
    `SELECT relname, relrowsecurity AS enabled, relforcerowsecurity AS forced
       FROM pg_class WHERE relname = ANY($1) AND relkind = 'r' ORDER BY relname`, [TABLES]);
  for (const r of flags.rows) line(`   ${r.relname.padEnd(16)} enabled=${r.enabled}  forced=${r.forced}`);

  // 3) Two tenants
  const t = (await pool.query(`SELECT id, name FROM tenants ORDER BY created_at LIMIT 2`)).rows;
  if (t.length < 2) {
    line('\n3) Need at least 2 tenants to test (login can see: ' + t.length + '). If you expected 2+, RLS is hiding them without context.');
  } else {
    const [A, B] = t;
    line(`\n3) Tenant A = ${A.name}   Tenant B = ${B.name}`);

    // What the app does today: plain pool.query, NO tenant context set
    const noCtx = (await pool.query(
      `SELECT qs.tenant_id, COUNT(*)::int AS tokens FROM queue_tokens qt
         JOIN queue_sessions qs ON qs.id = qt.session_id GROUP BY qs.tenant_id`)).rows;
    line(`   A) Plain pool.query, no tenant set (how the repositories run today): sees ${noCtx.length} tenant(s) of token data`);

    // Simulate a Tenant A admin request with the context set correctly
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(
        `SELECT set_config('app.current_tenant_id', $1, true),
                set_config('app.current_user_id',   $2, true),
                set_config('app.current_user_role', 'tenant_admin', true)`, [A.id, ZERO]);
      const asA = (await c.query(
        `SELECT qs.tenant_id, COUNT(*)::int AS tokens FROM queue_tokens qt
           JOIN queue_sessions qs ON qs.id = qt.session_id GROUP BY qs.tenant_id`)).rows;
      const otherTenantRows = asA.filter(r => r.tenant_id !== A.id);
      line(`   B) Same query with context = Tenant A admin: sees ${asA.length} tenant(s); rows belonging to OTHER tenants: ${otherTenantRows.length}`);
      if (otherTenantRows.length > 0) leak = true;
      await c.query('ROLLBACK');
    } finally { c.release(); }
  }
} catch (e) {
  line('\nError: ' + e.message);
} finally {
  await pool.end();
}

line('\n================ VERDICT ================');
line(leak
  ? 'FAIL - a Tenant A context can read other tenants\' rows. RLS is NOT isolating tenants.'
  : 'No cross-tenant rows seen in test B. Read section 1: if the login is a superuser / bypassrls, this "pass" is meaningless for the app.');
