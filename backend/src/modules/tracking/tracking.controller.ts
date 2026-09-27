import type { Request, Response } from 'express';
import { jwtUtil } from '../../utils/jwt.js';
import { trackEventSchema } from './tracking.schema.js';
import { trackingRepository } from './tracking.repository.js';

/** Reads the user id from a bearer token when one is sent. Never rejects: tracking is public. */
function optionalUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwtUtil.verifyAccessToken(header.slice(7)).userId;
  } catch {
    return null;
  }
}

export const trackingController = {
  async track(req: Request, res: Response) {
    const parsed = trackEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid event' });
    }

    try {
      await trackingRepository.insert(parsed.data, {
        userId:    optionalUserId(req),
        ip:        req.ip ?? null,
        userAgent: req.headers['user-agent']?.slice(0, 512) ?? null,
      });
      return res.status(204).end();
    } catch (err) {
      console.error('track error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
