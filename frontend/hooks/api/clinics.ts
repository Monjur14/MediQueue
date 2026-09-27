/**
 * Clinics API hooks — all public endpoints, no auth required
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string;
  logo_url: string | null;
  plan_name: string;
  total_departments: number;
  total_doctors: number;
}

export interface DoctorResult {
  doctor_id: string;
  doctor_name: string;
  tenant_id: string;
  clinic_name: string;
  clinic_slug: string;
  department_name: string | null;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export interface DoctorPublic {
  id: string;
  full_name: string;
  phone: string;
}

export interface SessionStatus {
  id: string;
  status: 'open' | 'closed' | 'paused';
  max_tokens: number;
  current_token: number;
  total_issued: number;
  doctor_name: string;
  department_name: string;
  waiting_count: number;
  completed_count: number;
  skipped_count: number;
}

export interface LiveSession {
  id: string;
  status: 'open' | 'break';
  max_tokens: number;
  current_token: number;
  total_issued: number;
  active_issued: number;
  remaining_tokens: number;
  break_started_at: string | null;
  doctor_name: string;
  department_name: string | null;
  waiting_count: number;
  completed_count: number;
  skipped_count: number;
  cancelled_count: number;
}

/* ------------------------------------------------------------------ */
/*  useSearchClinics                                                    */
/* ------------------------------------------------------------------ */
export function useSearchClinics(search: string) {
  return useQuery({
    queryKey: ['clinics', 'search', search],
    queryFn: () =>
      api.get<{ clinics: Clinic[] }>('/clinics', { params: { search } })
        .then((r) => r.data.clinics),
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  useSearchDoctors                                                    */
/* ------------------------------------------------------------------ */
export function useSearchDoctors(search: string) {
  return useQuery({
    queryKey: ['clinics', 'doctors', 'search', search],
    queryFn: () =>
      api.get<{ doctors: DoctorResult[] }>('/clinics/doctors/search', { params: { search } })
        .then((r) => r.data.doctors),
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  useClinicDepartments                                                */
/* ------------------------------------------------------------------ */
export function useClinicDepartments(slug: string | null) {
  return useQuery({
    queryKey: ['clinics', slug, 'departments'],
    queryFn: () =>
      api.get<{ clinic: Clinic; departments: Department[] }>(
        `/clinics/${slug}/departments`
      ).then((r) => r.data),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  useSessionStatus  (public — no auth)                               */
/* ------------------------------------------------------------------ */
export function useSessionStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ['queue', 'session', sessionId, 'status'],
    queryFn: () =>
      api.get<{ status: SessionStatus }>(
        `/queue/sessions/${sessionId}/status`
      ).then((r) => r.data.status),
    enabled: !!sessionId,
    staleTime: 5_000,
  });
}

/* ------------------------------------------------------------------ */
/*  useClinicQueue — current snapshot only (no real-time polling)      */
/* ------------------------------------------------------------------ */
export function useClinicQueue(slug: string | null) {
  return useQuery({
    queryKey: ['clinics', slug, 'queue'],
    queryFn: () =>
      api.get<{ sessions: LiveSession[] }>(`/clinics/${slug}/queue`)
        .then((r) => r.data.sessions),
    enabled: !!slug,
    staleTime: 0,      // always re-fetch on mount (snapshot on demand)
    gcTime: 0,
  });
}
