/**
 * Create (or reset the password of) the platform owner account.
 *
 *   SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD='long-secret' npm run seed-super-admin
 *
 * Values can also live in .env. Optional: SUPER_ADMIN_NAME (defaults to "Platform owner").
 * Safe to run again: an existing super admin with that email gets the new password;
 * an email that belongs to a patient, doctor or clinic admin is refused.
 */
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
//SUPER_ADMIN_EMAIL=14monjurhossen@gmail.com SUPER_ADMIN_PASSWORD='Monjur@247' npm run seed-super-admin

dotenv.config();

const email = '14monjurhossen@gmail.com';
const password = 'Monjur@247';
const name = 'Platform Owner';

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('❌ Set SUPER_ADMIN_EMAIL to a valid email address.');
  process.exit(1);
}
if (!password || password.length < 10) {
  console.error('❌ Set SUPER_ADMIN_PASSWORD (at least 10 characters).');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const passwordHash = await bcrypt.hash(password, 12); // same cost as utils/password.ts
  const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);

  if (existing.rows[0] && existing.rows[0].role !== 'super_admin') {
    console.error(`❌ ${email} already belongs to a ${existing.rows[0].role} account. Use another email.`);
    process.exitCode = 1;
  } else if (existing.rows[0]) {
    await pool.query(
      `UPDATE users SET password_hash = $1, full_name = $2, is_active = TRUE, deleted_at = NULL,
              status = 'active', updated_at = NOW()
       WHERE id = $3`,
      [passwordHash, name, existing.rows[0].id],
    );
    console.log(`✅ Super admin ${email} updated. Log in with the new password.`);
  } else {
    await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, email, password_hash, status)
       VALUES (NULL, 'super_admin', $1, $2, $3, 'active')`,
      [name, email, passwordHash],
    );
    console.log(`✅ Super admin ${email} created. Log in at /login.`);
  }
} catch (err) {
  if (err.constraint === 'check_user_tenant') {
    console.error('❌ Run `npm run migrate:up` first (migration 18 allows super admins without a tenant).');
  } else {
    console.error('❌ Failed:', err.message);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
