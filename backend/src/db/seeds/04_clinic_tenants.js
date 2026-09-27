import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TOTAL_CLINICS = 20;

// Clinic plan: max 5 departments, max 20 doctors → 4 doctors per department
const DEPARTMENTS = [
  { name: 'General Medicine',  description: 'Primary care and general consultations' },
  { name: 'Cardiology',        description: 'Heart and cardiovascular care' },
  { name: 'Orthopedics',       description: 'Bone, joint and musculoskeletal care' },
  { name: 'Pediatrics',        description: 'Medical care for infants, children and adolescents' },
  { name: 'Neurology',         description: 'Diagnosis and treatment of nervous system disorders' },
];
const DOCTORS_PER_DEPT = 4; // 5 depts × 4 doctors = 20 (clinic plan max)

const PASSWORD_HASH = await bcrypt.hash('secret123', 10);

const seed = async () => {
  const client = await pool.connect();
  try {
    // Resolve clinic plan ID
    const { rows: planRows } = await client.query(
      `SELECT id FROM subscription_plans WHERE name = 'clinic' LIMIT 1`
    );
    if (planRows.length === 0) {
      throw new Error("Clinic plan not found. Run seed-subscription-plans first.");
    }
    const clinicPlanId = planRows[0].id;
    console.log(`✅ Clinic plan found (id=${clinicPlanId}).`);
    console.log(`   Seeding ${TOTAL_CLINICS} clinics at max capacity:`);
    console.log(`   • ${DEPARTMENTS.length} departments each`);
    console.log(`   • ${DOCTORS_PER_DEPT} doctors per department (${DEPARTMENTS.length * DOCTORS_PER_DEPT} total)\n`);

    for (let n = 1; n <= TOTAL_CLINICS; n++) {
      await client.query('BEGIN');

      // ── 1. Tenant ────────────────────────────────────────────────────────────
      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (name, slug, email, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [`Clinic ${n}`, `clinic-${n}`, `clinic${n}@gmail.com`]
      );
      const tenantId = tenantRows[0].id;

      // ── 2. Subscription (clinic plan, active, 1 year) ────────────────────────
      await client.query(
        `INSERT INTO subscriptions
           (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 year')
         ON CONFLICT DO NOTHING`,
        [tenantId, clinicPlanId]
      );

      // ── 3. Tenant admin ──────────────────────────────────────────────────────
      await client.query(
        `INSERT INTO users (tenant_id, role, full_name, email, password_hash, status)
         VALUES ($1, 'tenant_admin', $2, $3, $4, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [tenantId, `Clinic ${n} Admin`, `clinic${n}admin@gmail.com`, PASSWORD_HASH]
      );

      // ── 4. Departments + Doctors ─────────────────────────────────────────────
      let doctorSeq = 1; // global doctor counter per clinic (1–20)

      for (const dept of DEPARTMENTS) {
        // 4a. Department
        const { rows: deptRows } = await client.query(
          `INSERT INTO departments (tenant_id, name, description, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
           RETURNING id`,
          [tenantId, dept.name, dept.description]
        );
        const deptId = deptRows[0].id;

        // 4b. Doctors for this department
        for (let d = 0; d < DOCTORS_PER_DEPT; d++) {
          const doctorEmail = `clinic${n}doctor${doctorSeq}@gmail.com`;
          const doctorName  = `Clinic ${n} Doctor ${doctorSeq}`;

          const { rows: doctorRows } = await client.query(
            `INSERT INTO users (tenant_id, role, full_name, email, password_hash, status)
             VALUES ($1, 'doctor', $2, $3, $4, 'active')
             ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
             RETURNING id`,
            [tenantId, doctorName, doctorEmail, PASSWORD_HASH]
          );
          const doctorId = doctorRows[0].id;

          // 4c. Assign doctor → department
          await client.query(
            `INSERT INTO department_doctors (department_id, doctor_id)
             VALUES ($1, $2)
             ON CONFLICT (department_id, doctor_id) DO NOTHING`,
            [deptId, doctorId]
          );

          doctorSeq++;
        }
      }

      await client.query('COMMIT');
      process.stdout.write(`\r✅ Seeded clinic ${n}/${TOTAL_CLINICS}...`);
    }

    console.log('\n\n🎉 All 20 clinics seeded at max capacity!');
    console.log(`   Accounts per clinic:`);
    console.log(`   • 1 tenant_admin  (clinic{n}admin@gmail.com)`);
    console.log(`   • 5 departments   (General Medicine, Cardiology, Orthopedics, Pediatrics, Neurology)`);
    console.log(`   • 20 doctors      (clinic{n}doctor1@gmail.com … clinic{n}doctor20@gmail.com)`);
    console.log(`\n   Password for all accounts: secret123`);
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
