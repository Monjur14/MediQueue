import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TOTAL = 1000;
const BATCH_SIZE = 50;
const PHONE_BASE = 8801700000000n; // BigInt for safe large-number arithmetic
const PASSWORD_HASH = await bcrypt.hash('secret123', 10);

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('🔐 Password hashed. Starting patient seeding...');

    let inserted = 0;

    for (let batch = 0; batch < TOTAL / BATCH_SIZE; batch++) {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (let i = 1; i <= BATCH_SIZE; i++) {
        const n = batch * BATCH_SIZE + i;
        const phone = `+${PHONE_BASE + BigInt(n)}`;

        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        params.push(`patient${n}`, `patient${n}@gmail.com`, phone, PASSWORD_HASH, 'patient');
      }

      await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role)
         VALUES ${values.join(', ')}
         ON CONFLICT (email) DO NOTHING`,
        params
      );

      inserted += BATCH_SIZE;
      process.stdout.write(`\r✅ Inserted ${inserted}/${TOTAL} patients...`);
    }

    console.log('\n🎉 All 1000 patients seeded successfully!');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
