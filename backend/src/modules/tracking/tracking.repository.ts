import { pool } from '../../config/database.js';
import type { TrackEventInput } from './tracking.schema.js';

export const trackingRepository = {
  async insert(
    input: TrackEventInput,
    ctx: { userId: string | null; ip: string | null; userAgent: string | null },
  ) {
    await pool.query(
      `INSERT INTO activity_events
         (event, path, placement, visitor_id, user_id, referrer, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.event,
        input.path ?? null,
        input.placement ?? null,
        input.visitor_id,
        ctx.userId,
        input.referrer ?? null,
        ctx.ip,
        ctx.userAgent,
      ],
    );
  },
};
