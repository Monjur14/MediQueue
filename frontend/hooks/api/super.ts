/**
 * Super admin (platform owner) API hooks — /api/super/*
 * Every list keeps the previous page on screen while the next one loads.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlanName } from '@/types';

/* ── Shared ──────────────────────────────────────────────────────── */
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type ActivityEvent = 'home_visit' | 'login_click' | 'register_clinic_click' | 'register_patient_click';

export interface Paged<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface ListParams {
  q?: string;
  page?: number;
  page_size?: number;
}

/** Drop empty values so the URL stays clean and the query key stays stable. */
function clean<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));
}

/* ── Overview ────────────────────────────────────────────────────── */
export interface OverviewCounts {
  tenants_total: number;
  tenants_active: number;
  plan_solo: number;
  plan_clinic: number;
  plan_hospital: number;
  sub_active: number;
  sub_pending: number;
  sub_past_due: number;
  sub_cancelled: number;
  sub_expired: number;
  mrr: number;
  doctors_staff: number;
  doctors_solo: number;
  patients_total: number;
  patients_new_7d: number;
  tokens_today: number;
  sessions_open: number;
  revenue_total: number;
}

export interface ExpiringRow {
  tenant_id: string;
  tenant_name: string;
  plan_name: PlanName;
  status: SubscriptionStatus;
  current_period_end: string;
  days_left: number;
}

export type EventCount = { total: number; unique: number };

export interface Overview {
  counts: OverviewCounts;
  expiring_soon: ExpiringRow[];
  activity_today: Partial<Record<ActivityEvent, EventCount>>;
}

export function useSuperOverview() {
  return useQuery({
    queryKey: ['super', 'overview'],
    queryFn: () => api.get<Overview>('/super/overview').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

/* ── Tenants ─────────────────────────────────────────────────────── */
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  plan_name: PlanName | null;
  subscription_status: SubscriptionStatus | null;
  current_period_end: string | null;
  days_left: number | null;
  doctors: number;
  patients_seen: number;
  last_session: string | null;
}

export interface TenantParams extends ListParams {
  plan?: PlanName;
  status?: SubscriptionStatus | 'none';
}

export function useSuperTenants(params: TenantParams) {
  return useQuery({
    queryKey: ['super', 'tenants', clean(params)],
    queryFn: () =>
      api
        .get<Paged<TenantRow> & { by_plan: Partial<Record<PlanName | 'none', number>> }>('/super/tenants', { params: clean(params) })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ── Subscriptions ───────────────────────────────────────────────── */
export type SubscriptionGroup = 'all' | 'active' | 'expiring' | 'pending' | 'ended';

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  plan_name: PlanName;
  monthly_price: number;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  days_left: number;
}

export function useSuperSubscriptions(group: SubscriptionGroup) {
  return useQuery({
    queryKey: ['super', 'subscriptions', group],
    queryFn: () =>
      api
        .get<{ items: SubscriptionRow[]; counts: Record<SubscriptionGroup, number> }>('/super/subscriptions', { params: { group } })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ── Doctors ─────────────────────────────────────────────────────── */
export interface DoctorRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  kind: 'staff' | 'solo';
  tenant_id: string;
  tenant_name: string;
  plan_name: PlanName | null;
  departments: string | null;
  patients_seen: number;
  last_session: string | null;
}

export function useSuperDoctors(params: ListParams) {
  return useQuery({
    queryKey: ['super', 'doctors', clean(params)],
    queryFn: () => api.get<Paged<DoctorRow>>('/super/doctors', { params: clean(params) }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ── Patients ────────────────────────────────────────────────────── */
export interface PatientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_channel: 'whatsapp' | 'sms' | 'both' | null;
  is_active: boolean;
  created_at: string;
  visits: number;
  seen: number;
  last_visit: string | null;
}

export function useSuperPatients(params: ListParams) {
  return useQuery({
    queryKey: ['super', 'patients', clean(params)],
    queryFn: () => api.get<Paged<PatientRow>>('/super/patients', { params: clean(params) }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ── Revenue ─────────────────────────────────────────────────────── */
export interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'void';
  provider: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
  tenant_name: string;
  plan_name: PlanName | null;
}

export interface Revenue {
  totals: {
    paid_total: number;
    paid_this_month: number;
    pending_total: number;
    failed_count: number;
    paid_count: number;
    mrr: number;
    arr: number;
  };
  by_plan: { plan: PlanName; price: number; active_tenants: number; mrr: number }[];
  monthly: { month: string; amount: number }[];
  recent_invoices: InvoiceRow[];
}

export function useSuperRevenue() {
  return useQuery({
    queryKey: ['super', 'revenue'],
    queryFn: () => api.get<Revenue>('/super/revenue').then((r) => r.data),
  });
}

/* ── Activity logs ───────────────────────────────────────────────── */
export interface LogDay {
  date: string;
  home_visit: number;
  home_visit_unique: number;
  login_click: number;
  login_click_unique: number;
  register_clinic_click: number;
  register_clinic_click_unique: number;
  register_patient_click: number;
  register_patient_click_unique: number;
  unique_users: number;
}

export interface LogEventRow {
  id: string;
  event: ActivityEvent;
  placement: string | null;
  path: string | null;
  visitor_id: string;
  referrer: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name: string | null;
  user_role: string | null;
}

export interface Logs {
  range: { from: string; to: string; days: number };
  summary: {
    overall: EventCount;
    by_event: Partial<Record<ActivityEvent, EventCount>>;
  };
  daily: LogDay[];
  placements: { event: ActivityEvent; placement: string; total: number }[];
  events: Paged<LogEventRow>;
}

export interface LogParams {
  from?: string;
  to?: string;
  event?: ActivityEvent;
  page?: number;
}

export function useSuperLogs(params: LogParams) {
  return useQuery({
    queryKey: ['super', 'logs', clean(params)],
    queryFn: () => api.get<Logs>('/super/logs', { params: clean(params) }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}
