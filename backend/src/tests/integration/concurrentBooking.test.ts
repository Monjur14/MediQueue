import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../config/database.js';
import { queueRepository } from '../../modules/queue/queue.repository.js';

// ─── Shared state ─────────────────────────────────────────────────────────────

let tenantId:  string;
let doctorId:  string;
let deptId:    string;
let sessionId: string;
let patientIds:    string[] = [];
let extraSessionId: string | null = null; // test 2 creates this; cleaned in afterAll

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const ts = String(Date.now()).slice(-8); // 8-digit suffix, unique per run

  const tenant = await pool.query(
    `INSERT INTO tenants (name, slug, email, phone)
     VALUES ('Concurrent Clinic', $1, $2, $3) RETURNING id`,
    [`concurrent-${ts}`, `clinic-${ts}@concurrent.test`, `+88017${ts}0`],
  );
  tenantId = tenant.rows[0].id;

  const doctor = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Dr. Concurrent', $1, $2, 'hash', 'doctor', $3, 'active') RETURNING id`,
    [`doctor-${ts}@concurrent.test`, `+88017${ts}1`, tenantId],
  );
  doctorId = doctor.rows[0].id;

  const dept = await pool.query(
    `INSERT INTO departments (tenant_id, name) VALUES ($1, 'General') RETURNING id`,
    [tenantId],
  );
  deptId = dept.rows[0].id;

  // 3 patients — one token slot — race condition setup
  for (let i = 0; i < 3; i++) {
    const p = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, 'hash', 'patient', 'active') RETURNING id`,
      [`Patient ${i}`, `patient${i}-${ts}@concurrent.test`, `+88018${ts}${i}`],
    );
    patientIds.push(p.rows[0].id);
  }

  // max_tokens = 1 → only one booking can succeed in a race
  const session = await pool.query(
    `INSERT INTO queue_sessions
       (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
     VALUES ($1, $2, $3, CURRENT_DATE, 1, 0) RETURNING id`,
    [tenantId, doctorId, deptId],
  );
  sessionId = session.rows[0].id;
});

// ─── Teardown ─────────────────────────────────────────────────────────────────

afterAll(async () => {
  if (extraSessionId) {
    await pool.query(`DELETE FROM queue_tokens   WHERE session_id = $1`, [extraSessionId]);
    await pool.query(`DELETE FROM queue_sessions WHERE id = $1`, [extraSessionId]);
    extraSessionId = null;
  }
  await pool.query(`DELETE FROM queue_tokens    WHERE session_id = $1`, [sessionId]);
  await pool.query(`DELETE FROM queue_sessions  WHERE id = $1`, [sessionId]);
  await pool.query(`DELETE FROM departments     WHERE id = $1`, [deptId]);
  for (const id of [...patientIds, doctorId].filter(Boolean))
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
  await pool.end();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Concurrent Token Assignment', () => {
  it('should assign exactly 1 token when 3 requests fire simultaneously', async () => {
    const results = await Promise.allSettled([
      queueRepository.giveToken({ session_id: sessionId, patient_id: patientIds[0]!, fee_amount: 500 }),
      queueRepository.giveToken({ session_id: sessionId, patient_id: patientIds[1]!, fee_amount: 500 }),
      queueRepository.giveToken({ session_id: sessionId, patient_id: patientIds[2]!, fee_amount: 500 }),
    ]);

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed     = results.filter(r => r.status === 'rejected');

    // exactly 1 wins the race
    expect(successful.length).toBe(1);

    // the other 2 get QUEUE_FULL
    expect(failed.length).toBe(2);
    for (const r of failed) {
      expect((r as PromiseRejectedResult).reason.message).toBe('QUEUE_FULL');
    }

    // DB confirms exactly 1 token was written
    const { rows } = await pool.query(
      `SELECT token_number FROM queue_tokens WHERE session_id = $1`,
      [sessionId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_number).toBe(1);
  });

  it('should prevent the same patient from booking twice simultaneously', async () => {
    // fresh session with plenty of capacity
    const s = await pool.query(
      `INSERT INTO queue_sessions
         (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
       VALUES ($1, $2, $3, CURRENT_DATE + 1, 30, 0) RETURNING id`,
      [tenantId, doctorId, deptId],
    );
    extraSessionId = s.rows[0].id; // tracked globally so afterAll can clean up on failure

    // patientIds[1] has no active token (only got QUEUE_FULL in test 1, never booked)
    const results = await Promise.allSettled([
      queueRepository.giveToken({ session_id: extraSessionId!, patient_id: patientIds[1]!, fee_amount: 500 }),
      queueRepository.giveToken({ session_id: extraSessionId!, patient_id: patientIds[1]!, fee_amount: 500 }),
    ]);

    // only 1 of the 2 identical requests should win
    expect(results.filter(r => r.status === 'fulfilled').length).toBe(1);

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM queue_tokens WHERE session_id = $1 AND patient_id = $2`,
      [extraSessionId, patientIds[1]],
    );
    expect(parseInt(rows[0].count)).toBe(1);
  });
});
