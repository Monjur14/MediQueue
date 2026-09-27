import { z } from 'zod';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const listQuerySchema = z.object({
  q:         z.string().trim().max(100).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export const tenantsQuerySchema = listQuerySchema.extend({
  plan:   z.enum(['solo', 'clinic', 'hospital']).optional(),
  status: z.enum(['pending', 'active', 'past_due', 'cancelled', 'expired', 'none']).optional(),
});

export const subscriptionsQuerySchema = z.object({
  group: z.enum(['all', 'active', 'pending', 'ended', 'expiring']).default('all'),
});

export const logsQuerySchema = z
  .object({
    from:  z.string().regex(DATE).optional(),
    to:    z.string().regex(DATE).optional(),
    event: z.enum(['home_visit', 'login_click', 'register_clinic_click', 'register_patient_click']).optional(),
    page:  z.coerce.number().int().min(1).default(1),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'from must be on or before to' });

export type ListQuery          = z.infer<typeof listQuerySchema>;
export type TenantsQuery       = z.infer<typeof tenantsQuerySchema>;
export type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema>;
export type LogsQuery          = z.infer<typeof logsQuerySchema>;
