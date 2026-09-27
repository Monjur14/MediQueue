/**
 * Queue API hooks — patient-facing
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AxiosError } from 'axios';

function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string }>;
  return e.response?.data?.message ?? 'Something went wrong';
}

/* ------------------------------------------------------------------ */
/*  #8  Update patient profile                                          */
/* ------------------------------------------------------------------ */
export interface PatientProfile {
  full_name: string;
  phone: string | null;
  preferred_channel: 'whatsapp' | 'sms' | 'both';
}

export function useUpdatePatientProfile() {
  return useMutation({
    mutationFn: (body: Partial<PatientProfile>) =>
      api.put<{ patient: PatientProfile }>('/patients/me', body).then((r) => r.data.patient),
    onSuccess: () => toast.success('Profile updated'),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface MyToken {
  id: string;
  my_token: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'cancelled';
  fee_paid: boolean;
  fee_amount: number;
  patients_ahead: number;
  created_at: string;
}

export interface MyActiveToken {
  id: string;
  session_id: string;
  my_token: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'cancelled';
  session_status: 'open' | 'break' | 'closed';
  break_started_at: string | null;
  break_expected_duration: number | null;
  fee_paid: boolean;
  fee_amount: number;
  patients_ahead: number;
  current_token: number;
  doctor_name: string;
  department_name: string;
  clinic_name: string;
  created_at: string;
  /** Estimated wait in minutes. Arrives with the first live `queue:eta_update`; absent until then. */
  eta_minutes?: number;
}

/* ------------------------------------------------------------------ */
/*  useMyToken — patient's own token in a session (legacy)             */
/* ------------------------------------------------------------------ */
export function useMyToken(sessionId: string | null) {
  return useQuery({
    queryKey: ['queue', 'session', sessionId, 'my-token'],
    queryFn: () =>
      api.get<{ token: MyToken }>(
        `/queue/sessions/${sessionId}/my-token`
      ).then((r) => r.data.token),
    enabled: !!sessionId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/* ------------------------------------------------------------------ */
/*  useMyActiveToken — auto-detects today's active token (no session ID) */
/* ------------------------------------------------------------------ */
export function useMyActiveToken() {
  return useQuery({
    queryKey: ['queue', 'my-active-token'],
    queryFn: () =>
      api.get<{ token: MyActiveToken }>('/queue/my-active-token')
        .then((r) => r.data.token),
    staleTime: 60_000,       // WebSocket keeps it fresh; REST is the fallback
    refetchOnWindowFocus: false,
    retry: false,            // 404 = no token today — that's normal
  });
}

/* ------------------------------------------------------------------ */
/*  useCancelMyToken — patient cancels their own waiting token         */
/* ------------------------------------------------------------------ */
export function useCancelMyToken() {
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.put(`/queue/tokens/${tokenId}/cancel`).then((r) => r.data.token),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}


/* ------------------------------------------------------------------ */
/*  useReadmitToken — doctor/admin re-admits a skipped patient         */
/* ------------------------------------------------------------------ */
export function useReadmitToken(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.put(`/queue/tokens/${tokenId}/readmit`, { session_id: sessionId }).then((r) => r.data.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      toast.success('Patient re-admitted to end of queue');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
/* ------------------------------------------------------------------ */
/*  Visit history                                                       */
/* ------------------------------------------------------------------ */
export interface Visit {
  id: string;
  token_number: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'no_show' | 'cancelled';
  fee_paid: boolean;
  fee_amount: number;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  session_date: string;
  doctor_name: string;
  clinic_name: string;
  notes: string | null;
}

export function useMyVisits() {
  return useQuery({
    queryKey: ['patient', 'visits'],
    queryFn: () =>
      api.get<{ visits: Visit[] }>('/patients/my-visits').then((r) => r.data.visits),
    staleTime: 60_000,
  });
}
