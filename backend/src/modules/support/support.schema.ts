import { z } from 'zod';

export const createSupportMessageSchema = z.object({
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

export const listSupportMessagesQuerySchema = z.object({
  status:    z.enum(['open', 'resolved', 'all']).default('open'),
  page:      z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export const createContactInquirySchema = z.object({
  name:    z.string().trim().min(2, 'Name is too short').max(120),
  email:   z.string().trim().email('Enter a valid email'),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

export const listContactInquiriesQuerySchema = z.object({
  status:    z.enum(['open', 'resolved', 'all']).default('open'),
  page:      z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateSupportMessageInput   = z.infer<typeof createSupportMessageSchema>;
export type ListSupportMessagesQuery    = z.infer<typeof listSupportMessagesQuerySchema>;
export type CreateContactInquiryInput   = z.infer<typeof createContactInquirySchema>;
export type ListContactInquiriesQuery   = z.infer<typeof listContactInquiriesQuerySchema>;
