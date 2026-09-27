import type { Request, Response } from 'express';
import { pushService } from './push.service.js';
import { subscribeSchema, unsubscribeSchema } from './push.schema.js';

function handleError(res: Response, err: unknown) {
  if (err instanceof Error && err.message === 'PUSH_DISABLED') {
    return res.status(503).json({ message: 'Notifications are not available right now' });
  }
  console.error('[push]', err);
  return res.status(500).json({ message: 'Internal server error' });
}

export const pushController = {
  getPublicKey(_req: Request, res: Response) {
    try {
      return res.status(200).json({ publicKey: pushService.getPublicKey() });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async subscribe(req: Request, res: Response) {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid push subscription' });
    try {
      await pushService.subscribe(req.user!.id, parsed.data, req.get('user-agent') ?? null);
      return res.status(201).json({ subscribed: true });
    } catch (err) {
      return handleError(res, err);
    }
  },

  async unsubscribe(req: Request, res: Response) {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'endpoint is required' });
    try {
      await pushService.unsubscribe(req.user!.id, parsed.data.endpoint);
      return res.status(200).json({ subscribed: false });
    } catch (err) {
      return handleError(res, err);
    }
  },
};
