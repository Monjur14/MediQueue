import type { Request, Response } from 'express';
import {
  createContactInquirySchema,
  createSupportMessageSchema,
  listContactInquiriesQuerySchema,
  listSupportMessagesQuerySchema,
} from './support.schema.js';
import { supportService } from './support.service.js';

export const supportController = {

  async create(req: Request, res: Response) {
    const parsed = createSupportMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const message = await supportService.create(tenantId, userId, parsed.data.message);
      return res.status(201).json({ message });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async list(req: Request, res: Response) {
    const parsed = listSupportMessagesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid filters', errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const result = await supportService.list(parsed.data);
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async resolve(req: Request, res: Response) {
    try {
      const rawId = req.params['id'];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ message: 'Invalid or missing ID parameter' });

      const message = await supportService.resolve(id);
      return res.status(200).json({ message });
    } catch (err: any) {
      if (err.message === 'MESSAGE_NOT_FOUND') {
        return res.status(404).json({ message: 'Message not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // ─── PUBLIC CONTACT INQUIRIES (homepage "Contact us" form) ───

  async createInquiry(req: Request, res: Response) {
    const parsed = createContactInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const { name, email, message } = parsed.data;
      const inquiry = await supportService.createInquiry(name, email, message);
      return res.status(201).json({ inquiry });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async listInquiries(req: Request, res: Response) {
    const parsed = listContactInquiriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid filters', errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const result = await supportService.listInquiries(parsed.data);
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async resolveInquiry(req: Request, res: Response) {
    try {
      const rawId = req.params['id'];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ message: 'Invalid or missing ID parameter' });

      const inquiry = await supportService.resolveInquiry(id);
      return res.status(200).json({ inquiry });
    } catch (err: any) {
      if (err.message === 'INQUIRY_NOT_FOUND') {
        return res.status(404).json({ message: 'Inquiry not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
