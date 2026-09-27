import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import {
  listQuerySchema,
  logsQuerySchema,
  subscriptionsQuerySchema,
  tenantsQuerySchema,
} from './super.schema.js';
import { superService } from './super.service.js';

/** Parse the query string, run the handler, and map errors to HTTP responses. */
function handler<T>(schema: ZodType<T> | null, run: (q: T) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    let query = undefined as T;
    if (schema) {
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid filters', errors: parsed.error.flatten().fieldErrors });
      }
      query = parsed.data;
    }
    try {
      return res.json(await run(query));
    } catch (err) {
      if (err instanceof Error && err.message === 'RANGE_TOO_LARGE') {
        return res.status(400).json({ message: 'Pick a range of one year or less' });
      }
      console.error('super admin error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export const superController = {
  overview:      handler(null, () => superService.getOverview()),
  tenants:       handler(tenantsQuerySchema, (q) => superService.listTenants(q)),
  subscriptions: handler(subscriptionsQuerySchema, (q) => superService.listSubscriptions(q)),
  doctors:       handler(listQuerySchema, (q) => superService.listDoctors(q)),
  patients:      handler(listQuerySchema, (q) => superService.listPatients(q)),
  revenue:       handler(null, () => superService.getRevenue()),
  logs:          handler(logsQuerySchema, (q) => superService.getLogs(q)),
};
