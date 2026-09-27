/**
 * Support message hooks — tenant admin "contact us" on Billing, super admin inbox.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SupportMessage {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

interface Paged<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

/* ── Tenant admin: send a message ─────────────────────────────── */
export function useSendSupportMessage() {
  return useMutation({
    mutationFn: (message: string) =>
      api.post<{ message: SupportMessage }>('/support/messages', { message }).then((r) => r.data.message),
  });
}

/* ── Super admin: list + resolve ───────────────────────────────── */
export function useSuperSupportMessages(params: { status?: 'open' | 'resolved' | 'all'; page?: number } = {}) {
  return useQuery({
    queryKey: ['super', 'support-messages', params],
    queryFn: () =>
      api.get<Paged<SupportMessage>>('/support/messages', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useResolveSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/support/messages/${id}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super', 'support-messages'] }),
  });
}

/* ── Public: homepage contact form ────────────────────────────── */
export interface ContactInquiryInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

export function useSendContactInquiry() {
  return useMutation({
    mutationFn: (input: ContactInquiryInput) =>
      api.post<{ inquiry: ContactInquiry }>('/support/contact', input).then((r) => r.data.inquiry),
  });
}

/* ── Super admin: list + resolve homepage inquiries ──────────────── */
export function useSuperContactInquiries(params: { status?: 'open' | 'resolved' | 'all'; page?: number } = {}) {
  return useQuery({
    queryKey: ['super', 'contact-inquiries', params],
    queryFn: () =>
      api.get<Paged<ContactInquiry>>('/support/contact', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useResolveContactInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/support/contact/${id}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super', 'contact-inquiries'] }),
  });
}
