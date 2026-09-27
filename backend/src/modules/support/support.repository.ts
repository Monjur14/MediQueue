import { pool } from '../../config/database.js';
import type { ListContactInquiriesQuery, ListSupportMessagesQuery } from './support.schema.js';

export const supportRepository = {

  async create(tenantId: string, userId: string, message: string) {
    const result = await pool.query(
      `INSERT INTO support_messages (tenant_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, tenant_id, user_id, message, status, created_at, resolved_at`,
      [tenantId, userId, message]
    );
    return result.rows[0];
  },

  async findAll(query: ListSupportMessagesQuery) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status !== 'all') {
      params.push(query.status);
      conditions.push(`sm.status = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM support_messages sm ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (query.page - 1) * query.page_size;
    params.push(query.page_size, offset);

    const result = await pool.query(
      `SELECT
         sm.id, sm.tenant_id, sm.user_id, sm.message, sm.status,
         sm.created_at, sm.resolved_at,
         t.name  AS tenant_name,
         t.email AS tenant_email,
         u.full_name AS user_name,
         u.email     AS user_email
       FROM support_messages sm
       JOIN tenants t ON t.id = sm.tenant_id
       LEFT JOIN users u ON u.id = sm.user_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { items: result.rows, total };
  },

  async markResolved(id: string) {
    const result = await pool.query(
      `UPDATE support_messages
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1
       RETURNING id, tenant_id, user_id, message, status, created_at, resolved_at`,
      [id]
    );
    return result.rows[0];
  },

  async countOpen() {
    const result = await pool.query(
      `SELECT COUNT(*) FROM support_messages WHERE status = 'open'`
    );
    return parseInt(result.rows[0].count, 10);
  },

  // ─── PUBLIC CONTACT INQUIRIES (homepage "Contact us" form) ───

  async createInquiry(name: string, email: string, message: string) {
    const result = await pool.query(
      `INSERT INTO contact_inquiries (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, message, status, created_at, resolved_at`,
      [name, email, message]
    );
    return result.rows[0];
  },

  async findAllInquiries(query: ListContactInquiriesQuery) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status !== 'all') {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contact_inquiries ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (query.page - 1) * query.page_size;
    params.push(query.page_size, offset);

    const result = await pool.query(
      `SELECT id, name, email, message, status, created_at, resolved_at
       FROM contact_inquiries
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { items: result.rows, total };
  },

  async markInquiryResolved(id: string) {
    const result = await pool.query(
      `UPDATE contact_inquiries
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, message, status, created_at, resolved_at`,
      [id]
    );
    return result.rows[0];
  },
};
