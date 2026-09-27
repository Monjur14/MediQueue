import { pool } from '../../config/database.js';
import type { UpdatePatientInput } from './patients.schema.js';

export const patientsRepository = {

  async getMyVisits(patientId: string) {
    const result = await pool.query(
      `SELECT
         qt.id,
         qt.token_number,
         qt.status,
         qt.fee_paid,
         qt.fee_amount,
         qt.created_at,
         qt.called_at,
         qt.completed_at,
         qt.notes,
         qs.session_date,
         u.full_name   AS doctor_name,
         t.name        AS clinic_name
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qs.id  = qt.session_id
       JOIN users            u  ON u.id = qs.doctor_id
       JOIN tenants          t  ON t.id = qs.tenant_id
       WHERE qt.patient_id = $1
       ORDER BY qs.session_date DESC, qt.created_at DESC
       LIMIT 100`,
      [patientId]
    );
    return result.rows;
  },

  async updatePatient(userId: string, data: UpdatePatientInput) {
    // build dynamic query — only update fields that were sent
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.full_name !== undefined) {
      fields.push(`full_name = $${index++}`);
      values.push(data.full_name);
    }

    if (data.phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(data.phone);
    }

    if (data.preferred_channel !== undefined) {
      fields.push(`preferred_channel = $${index++}`);
      values.push(data.preferred_channel);
    }

    // always update updated_at
    fields.push(`updated_at = NOW()`);

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING id, full_name, email, phone, preferred_channel, updated_at`,
      values
    );

    return result.rows[0] ?? null;
  },
};