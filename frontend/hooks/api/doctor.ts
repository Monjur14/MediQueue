/**
 * Doctor & Admin queue management hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Helper — extract readable message from any API error               */
/* ------------------------------------------------------------------ */
function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string })?.message ?? fallback;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface QueueSession {
  id: string;
  status: 'open' | 'closed' | 'break';
  max_tokens: number;
  current_token: number;
  total_issued: number;
  active_issued: number;     // total_issued minus cancelled — shown in UI
  cancelled_count: number;
  remaining_tokens: number; // max_tokens minus active_issued
  doctor_name: string;
  doctor_id: string;
  department_name: string;
  department_id: string;
  waiting_count: number;
  completed_count: number;
  skipped_count: number;
  session_date: string;
  active_break_id: string | null;
  break_started_at: string | null;
  break_expected_duration: number | null;
}

export interface SessionToken {
  id: string;
  token_number: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'cancelled';
  patient_name: string;
  patient_phone: string;
  fee_paid: boolean;
  fee_amount: number;
  created_at: string;
  notes: string | null;
  notes_version: number;
}

export interface MyDepartment {
  id: string;
  name: string;
  description: string | null;
}

/* ------------------------------------------------------------------ */
/*  Admin / Doctor: today's sessions                                   */
/* ------------------------------------------------------------------ */
export function useTodaySessions() {
  return useQuery({
    queryKey: ['queue', 'sessions', 'today'],
    queryFn: () =>
      api.get<{ sessions: QueueSession[] }>('/queue/sessions/today')
        .then((r) => r.data.sessions),
    staleTime: 30_000,
    retry: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  Tokens in a session                                                 */
/* ------------------------------------------------------------------ */
export function useSessionTokens(sessionId: string | null) {
  return useQuery({
    queryKey: ['queue', 'session', sessionId, 'tokens'],
    queryFn: () =>
      api.get<{ tokens: SessionToken[] }>(`/queue/sessions/${sessionId}/tokens`)
        .then((r) => r.data.tokens),
    enabled: !!sessionId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Doctor's departments                                                */
/* ------------------------------------------------------------------ */
export function useMyDepartments() {
  return useQuery({
    queryKey: ['doctor', 'my-departments'],
    queryFn: () =>
      api.get<{ departments: MyDepartment[] }>('/doctors/my-departments')
        .then((r) => r.data.departments),
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Open session                                                        */
/* ------------------------------------------------------------------ */
export function useOpenSession() {
  const queryClient = useQueryClient();
  return useMutation({
    // Mirrors backend openSessionSchema: doctor_id and session_date (YYYY-MM-DD) are required
    mutationFn: (body: { doctor_id: string; department_id?: string; max_tokens: number; session_date: string }) =>
      api.post<{ session: QueueSession }>('/queue/sessions', body)
        .then((r) => r.data.session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to open session'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Close session                                                       */
/* ------------------------------------------------------------------ */
export function useCloseSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.put(`/queue/sessions/${sessionId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to close session'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Call next patient                                                   */
/* ------------------------------------------------------------------ */
export function useCallNext(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.put(`/queue/sessions/${sessionId}/next`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId] });
    },
    onError: (error) => {
      const msg = apiErrorMessage(error, 'Failed to call next patient');
      if (msg === 'No waiting tokens') {
        toast.info('No more patients waiting in the queue.');
      } else {
        toast.error(msg);
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Skip token                                                          */
/* ------------------------------------------------------------------ */
export function useSkipToken(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.put(`/queue/tokens/${tokenId}/skip`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to skip patient'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Complete token                                                      */
/* ------------------------------------------------------------------ */
export function useCompleteToken(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.put(`/queue/tokens/${tokenId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to complete consultation'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Start break                                                         */
/* ------------------------------------------------------------------ */
export function useStartBreak(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (duration_minutes: number) =>
      api.post(`/queue/sessions/${sessionId}/break`, { expected_duration: duration_minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to start break'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  End break                                                           */
/* ------------------------------------------------------------------ */
export function useEndBreak(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (breakId: string) =>
      api.put(`/queue/sessions/${sessionId}/break/${breakId}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to end break'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Give token (receptionist assigns token to patient)                 */
/* ------------------------------------------------------------------ */
export function useGiveToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { session_id: string; patient_phone: string }) =>
      api.post<{ token: SessionToken }>('/queue/tokens/give', {
        session_id:      body.session_id,
        phone:           body.patient_phone,
        fee_amount:      0,
        idempotency_key: `${body.session_id}-${body.patient_phone}-${Date.now()}`,
      }).then((r) => r.data.token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['queue', 'session', variables.session_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['queue', 'sessions', 'today'],
      });
    },
    // No toast here: the receptionist form shows the specific error inline next to the phone field
  });
}

/* ------------------------------------------------------------------ */
/*  Reopen session                                                      */
/* ------------------------------------------------------------------ */
export function useReopenSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.put(`/queue/sessions/${sessionId}/reopen`).then((r) => r.data.session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to reopen session'));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Update doctor profile (#9)                                          */
/* ------------------------------------------------------------------ */
export interface DoctorProfileUpdate {
  full_name?: string;
  phone?: string;
}

export function useUpdateDoctorProfile() {
  return useMutation({
    mutationFn: (body: DoctorProfileUpdate) =>
      api.put<{ doctor: { id: string; full_name: string; phone: string | null } }>(
        '/doctors/me', body
      ).then((r) => r.data.doctor),
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update profile'),
  });
}

/* ------------------------------------------------------------------ */
/*  useRemoveToken — receptionist removes a patient from the queue     */
/* ------------------------------------------------------------------ */
export function useRemoveToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tokenId, sessionId }: { tokenId: string; sessionId: string }) =>
      api.put(`/queue/tokens/${tokenId}/remove`, { session_id: sessionId }).then((r) => r.data.token),
    onSuccess: (_token, { sessionId }) => {
      // Optimistic invalidation — WebSocket will also fire, but this ensures
      // the list refreshes even if the socket event is delayed.
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    },
    onError: (err: unknown) => {
      const e = err as import('axios').AxiosError<{ message?: string }>;
      const msg = e.response?.data?.message ?? 'Could not remove patient';
      import('sonner').then(({ toast }) => toast.error(msg));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Update consultation notes (optimistic locking)                     */
/* ------------------------------------------------------------------ */
export function useUpdateNotes(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tokenId, notes, notes_version }: { tokenId: string; notes: string; notes_version: number }) =>
      api.put<{ token: SessionToken }>(`/queue/tokens/${tokenId}/notes`, { notes, notes_version })
        .then((r) => r.data.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
    },
    onError: (error) => {
      const msg = (error as import('axios').AxiosError<{ message?: string }>).response?.data?.message
        ?? 'Failed to save notes';
      toast.error(msg);
    },
  });
}
