/**
 * Tenant Admin API hooks
 * Covers APIs #10–23, #33, #36
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AxiosError } from 'axios';

/* ------------------------------------------------------------------ */
/*  Shared error helper                                                 */
/* ------------------------------------------------------------------ */
function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string }>;
  return e.response?.data?.message ?? 'Something went wrong';
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
  slug: string;
  updated_at: string;
  // Plan limits from subscription_plans (null = unlimited)
  plan_name: string | null;
  max_doctors: number | null;
  max_departments: number | null;
  max_daily_patients: number | null;
}

export interface Doctor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentWithDoctors extends Department {
  doctors: Pick<Doctor, 'id' | 'full_name' | 'email' | 'phone'>[];
}

export interface DepartmentOverview {
  departments: DepartmentWithDoctors[];
  unassigned_doctors: Pick<Doctor, 'id' | 'full_name' | 'status'>[];
}

/* ------------------------------------------------------------------ */
/*  #10  Update clinic info                                             */
/* ------------------------------------------------------------------ */
export function useUpdateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string; logo_url?: string }) =>
      api.put<{ tenant: TenantInfo }>('/tenants/me', body).then((r) => r.data.tenant),
    onSuccess: () => {
      toast.success('Clinic info updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'clinic'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useClinicInfo() {
  return useQuery({
    queryKey: ['admin', 'clinic'],
    queryFn: () =>
      api.get<{ tenant: TenantInfo }>('/tenants/me').then((r) => r.data.tenant),
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  #11  Invite doctor                                                  */
/* ------------------------------------------------------------------ */
export function useInviteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { full_name: string; email: string; phone?: string }) =>
      api.post<{ doctor: Doctor }>('/tenants/doctors/invite', body).then((r) => r.data.doctor),
    onSuccess: (doctor) => {
      toast.success(`Dr. ${doctor.full_name} invited — setup email sent`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #12  List doctors                                                   */
/* ------------------------------------------------------------------ */
export function useListDoctors() {
  return useQuery({
    queryKey: ['admin', 'doctors'],
    queryFn: () =>
      api.get<{ doctors: Doctor[] }>('/tenants/doctors').then((r) => r.data.doctors),
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  #13  Update doctor                                                  */
/* ------------------------------------------------------------------ */
export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; full_name?: string; phone?: string }) =>
      api.put<{ doctor: Doctor }>(`/tenants/doctors/${id}`, body).then((r) => r.data.doctor),
    onSuccess: () => {
      toast.success('Doctor updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #14  Remove doctor                                                  */
/* ------------------------------------------------------------------ */
export function useRemoveDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doctorId: string) =>
      api.delete(`/tenants/doctors/${doctorId}`),
    onSuccess: () => {
      toast.success('Doctor removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #15  Create department                                              */
/* ------------------------------------------------------------------ */
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      api.post<{ department: Department }>('/departments', body).then((r) => r.data.department),
    onSuccess: (dept) => {
      toast.success(`Department "${dept.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #16  List departments                                               */
/* ------------------------------------------------------------------ */
export function useListDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: () =>
      api.get<{ departments: Department[] }>('/departments').then((r) => r.data.departments),
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  #17  Department overview (with doctors + unassigned)               */
/* ------------------------------------------------------------------ */
export function useDepartmentOverview() {
  return useQuery({
    queryKey: ['admin', 'department-overview'],
    queryFn: () =>
      api
        .get<{ overview: DepartmentOverview }>('/departments/overview')
        .then((r) => r.data.overview),
    staleTime: 20_000,
  });
}

/* ------------------------------------------------------------------ */
/*  #19  Update department                                              */
/* ------------------------------------------------------------------ */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) =>
      api
        .put<{ department: Department }>(`/departments/${id}`, body)
        .then((r) => r.data.department),
    onSuccess: () => {
      toast.success('Department updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #20  Delete department                                              */
/* ------------------------------------------------------------------ */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success('Department deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #21  Assign doctor to department                                    */
/* ------------------------------------------------------------------ */
export function useAssignDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, doctorId }: { deptId: string; doctorId: string }) =>
      api.post(`/departments/${deptId}/doctors`, { doctorId }),
    onSuccess: () => {
      toast.success('Doctor assigned to department');
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  #23  Remove doctor from department                                  */
/* ------------------------------------------------------------------ */
export function useRemoveDoctorFromDept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, doctorId }: { deptId: string; doctorId: string }) =>
      api.delete(`/departments/${deptId}/doctors/${doctorId}`),
    onSuccess: () => {
      toast.success('Doctor removed from department');
      queryClient.invalidateQueries({ queryKey: ['admin', 'department-overview'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  Analytics                                                           */
/* ------------------------------------------------------------------ */
export interface AnalyticsSummary {
  total_patients: number;
  avg_wait_minutes: number | null;
  avg_consultation_minutes: number | null;
  no_show_rate: number;
}
export interface DailyVolume  { date: string; completed: number; no_show: number }
export interface PeakHour     { hour: number; count: number }
export interface DoctorStat   { doctor_name: string; patients_seen: number; session_days: number; avg_per_day: number; no_shows: number; avg_consultation_minutes: number | null }

export interface AnalyticsData {
  summary:       AnalyticsSummary;
  daily_volumes: DailyVolume[];
  peak_hours:    PeakHour[];
  doctors:       DoctorStat[];
}

export function useAnalytics(days: 7 | 30 = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () =>
      api.get<AnalyticsData>(`/analytics/summary?days=${days}`).then((r) => r.data),
    staleTime: 60_000,
  });
}
