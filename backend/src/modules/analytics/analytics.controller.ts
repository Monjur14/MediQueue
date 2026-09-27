import type { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  async getSummary(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const raw  = parseInt(String(req.query['days'] ?? '30'), 10);
      const days = [7, 30].includes(raw) ? raw : 30;

      const data = await analyticsService.getSummary(tenantId, days);
      return res.json(data);
    } catch (err) {
      console.error('Analytics error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
