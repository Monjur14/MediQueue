import { supportRepository } from './support.repository.js';
import type { ListContactInquiriesQuery, ListSupportMessagesQuery } from './support.schema.js';

export const supportService = {
  async create(tenantId: string, userId: string, message: string) {
    return supportRepository.create(tenantId, userId, message);
  },

  async list(query: ListSupportMessagesQuery) {
    const { items, total } = await supportRepository.findAll(query);
    return {
      items,
      page: query.page,
      page_size: query.page_size,
      total,
      pages: Math.max(1, Math.ceil(total / query.page_size)),
    };
  },

  async resolve(id: string) {
    const message = await supportRepository.markResolved(id);
    if (!message) throw new Error('MESSAGE_NOT_FOUND');
    return message;
  },

  // ─── PUBLIC CONTACT INQUIRIES ────────────────────────────────

  async createInquiry(name: string, email: string, message: string) {
    return supportRepository.createInquiry(name, email, message);
  },

  async listInquiries(query: ListContactInquiriesQuery) {
    const { items, total } = await supportRepository.findAllInquiries(query);
    return {
      items,
      page: query.page,
      page_size: query.page_size,
      total,
      pages: Math.max(1, Math.ceil(total / query.page_size)),
    };
  },

  async resolveInquiry(id: string) {
    const inquiry = await supportRepository.markInquiryResolved(id);
    if (!inquiry) throw new Error('INQUIRY_NOT_FOUND');
    return inquiry;
  },
};
