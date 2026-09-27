import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TOTAL = 50;
const PASSWORD_HASH = await bcrypt.hash('secret123', 10);

const seed = async () => {
  const client = await pool.connect();
  try {
    // Resolve the solo plan's ID
    const { rows: planRows } = await client.query(
      `SELECT id FROM subscription_plans WHERE name = 'solo' LIMIT 1`
    );
    if (planRows.length === 0) {
      throw new Error("Solo subscription plan not found. Run seed-subscription-plans first.");
    }
    const soloPlanId = planRows[0].id;
    console.log(`✅ Solo plan found (id=${soloPlanId}). Seeding ${TOTAL} tenants...`);

    for (let n = 1; n <= TOTAL; n++) {
      const name  = `Solo Doctor ${n}`;
      const slug  = `solo-doctor-${n}`;
      const email = `solodoctor${n}@gmail.com`;

      await client.query('BEGIN');

      // 1. Create tenant
      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (name, slug, email, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, slug, email]
      );
      const tenantId = tenantRows[0].id;

      // 2. Create active solo subscription (1-year period)
      await client.query(
        `INSERT INTO subscriptions
           (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 year')
         ON CONFLICT DO NOTHING`,
        [tenantId, soloPlanId]
      );

      // 3. Create tenant_admin user
      await client.query(
        `INSERT INTO users (tenant_id, role, full_name, email, password_hash, status)
         VALUES ($1, 'tenant_admin', $2, $3, $4, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [tenantId, name, email, PASSWORD_HASH]
      );

      await client.query('COMMIT');
      process.stdout.write(`\r✅ Seeded ${n}/${TOTAL} solo doctor tenants...`);
    }

    console.log('\n🎉 All 50 solo doctor tenants seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
