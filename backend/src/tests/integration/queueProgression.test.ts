import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../config/database.js';
import { queueRepository } from '../../modules/queue/queue.repository.js';

let sessionId: string;
let tenantId: string;
let doctorId: string;
let deptId: string;
let patientIds: string[] = [];

beforeAll(async () => {
  const timestamp = Date.now();

  const tenantResult = await pool.query(
    `INSERT INTO tenants (name, slug, email, phone)
     VALUES ('Queue Test Clinic', $1, $2, $3)
     RETURNING id`,
    [
      `queue-test-${timestamp}`,
      `queue${timestamp}@test.com`,
      `+880170${String(timestamp).slice(-7)}`,
    ]
  );
  tenantId = tenantResult.rows[0].id;

  const doctorResult = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Dr. Queue Test', $1, $2, 'hash', 'doctor', $3, 'active')
     RETURNING id`,
    [
      `doctor${timestamp}@test.com`,
      `+8801711${String(timestamp).slice(-6)}`,
      tenantId,
    ]
  );
  doctorId = doctorResult.rows[0].id;

  const deptResult = await pool.query(
    `INSERT INTO departments (tenant_id, name)
     VALUES ($1, 'General')
     RETURNING id`,
    [tenantId]
  );
  deptId = deptResult.rows[0].id;

  const sessionResult = await pool.query(
    `INSERT INTO queue_sessions
      (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
     VALUES ($1, $2, $3, CURRENT_DATE, 20, 0)
     RETURNING id`,
    [tenantId, doctorId, deptId]
  );
  sessionId = sessionResult.rows[0].id;

  for (let i = 0; i < 5; i++) {
    const p = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, 'hash', 'patient', 'active')
       RETURNING id`,
      [
        `Patient ${i + 1}`,
        `qpatient${i}${timestamp}@test.com`,
        `+8801900${String(timestamp).slice(-4)}${i}`,
      ]
    );
    patientIds.push(p.rows[0].id);
  }
});

afterAll(async () => {
  await pool.query(`DELETE FROM queue_tokens   WHERE session_id = $1`, [sessionId]);
  await pool.query(`DELETE FROM queue_sessions WHERE id = $1`, [sessionId]);
  await pool.query(`DELETE FROM departments    WHERE id = $1`, [deptId]);
  await pool.query(`DELETE FROM users          WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM users          WHERE id = ANY($1)`, [patientIds]);
  await pool.query(`DELETE FROM tenants        WHERE id = $1`, [tenantId]);
  await pool.end();
});

// helper — fetch a single token row from DB by session + token number
async function getTokenRow(tokenNumber: number) {
  const r = await pool.query(
    `SELECT * FROM queue_tokens WHERE session_id = $1 AND token_number = $2`,
    [sessionId, tokenNumber]
  );
  return r.rows[0];
}

describe('Queue Progression', () => {

  it('should issue tokens 1–5 in order to 5 patients', async () => {
    for (let i = 0; i < 5; i++) {
      await queueRepository.giveToken({
        session_id: sessionId,
        patient_id: patientIds[i]!,
        fee_amount: 300,
      });
    }

    const tokens = await pool.query(
      `SELECT token_number, status FROM queue_tokens
       WHERE session_id = $1
       ORDER BY token_number ASC`,
      [sessionId]
    );

    expect(tokens.rows).toHaveLength(5);
    tokens.rows.forEach((row: { token_number: number; status: string }, i: number) => {
      expect(row.token_number).toBe(i + 1);
      expect(row.status).toBe('waiting');
    });
  });

  it('should call token #1 first and mark it called in the DB', async () => {
    const returned = await queueRepository.callNextToken(sessionId);

    // callNextToken returns the pre-update row — check token number from return
    expect(returned.token_number).toBe(1);

    // verify the DB was actually updated (not the stale return value)
    const inDb = await getTokenRow(1);
    expect(inDb.status).toBe('called');

    // tokens 2–5 remain waiting
    const waiting = await pool.query(
      `SELECT COUNT(*) FROM queue_tokens
       WHERE session_id = $1 AND status = 'waiting'`,
      [sessionId]
    );
    expect(parseInt(waiting.rows[0].count)).toBe(4);
  });

  it('should call tokens 2, 3, 4 in order after completing each', async () => {
    // complete token #1 first
    const token1 = await getTokenRow(1);
    await queueRepository.completeToken(token1.id);

    for (let expected = 2; expected <= 4; expected++) {
      const returned = await queueRepository.callNextToken(sessionId);
      expect(returned.token_number).toBe(expected);

      // verify DB status — not the stale return value
      const inDb = await getTokenRow(expected);
      expect(inDb.status).toBe('called');

      await queueRepository.completeToken(returned.id);
    }
  });

  it('should have only token #5 waiting after 4 calls', async () => {
    const result = await pool.query(
      `SELECT token_number, status FROM queue_tokens
       WHERE session_id = $1
       ORDER BY token_number ASC`,
      [sessionId]
    );

    const completed = result.rows.filter((r: { status: string }) => r.status === 'completed');
    const waiting   = result.rows.filter((r: { status: string }) => r.status === 'waiting');

    expect(completed).toHaveLength(4);
    expect(waiting).toHaveLength(1);
    expect(waiting[0].token_number).toBe(5);
  });

  it('should show 0 patients ahead when token #5 is next', async () => {
    const position = await queueRepository.getPatientToken(sessionId, patientIds[4]!);

    // patients_ahead is a PostgreSQL COUNT — comes back as string, parse it
    expect(parseInt(String(position?.patients_ahead))).toBe(0);
    expect(position?.my_token).toBe(5);
  });

});
