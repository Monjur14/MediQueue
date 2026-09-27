'use client';

/**
 * WebSocket hook for real-time queue updates.
 *
 * Strategy:
 *  - Always connect when `accessToken` is present, even if the patient has no token yet.
 *    Without a sessionId → emits join:personal → server subscribes them to their personal room.
 *    With a sessionId    → emits join:session  → server subscribes them to session + personal rooms.
 *
 *  - PERSONAL events (you_are_called, you_were_skipped, eta_update, token_issued_to_you)
 *      → setQueryData/invalidateQueries instantly, no REST
 *  - SESSION events (break_started, break_ended, closed, reopened)
 *      → setQueryData on BOTH patient cache AND doctor cache for zero-latency UI
 *  - DOCTOR list events → invalidateQueries (needs full ordered list re-fetch)
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { MyActiveToken } from '@/hooks/api/queue';

const WS_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5001';

/* ------------------------------------------------------------------ */
/*  Payload shapes (must match backend queue.gateway.ts emissions)     */
/* ------------------------------------------------------------------ */
interface YouAreCalledPayload   { session_id: string; token_number: number }
interface YouWereSkippedPayload { session_id: string; token_number: number }
interface TokenIssuedToYouPayload { session_id: string }

interface EtaUpdatePayload {
  session_id: string;
  eta_minutes: number;
  patients_ahead: number;
  avg_consultation_time: number;
  waiting_count: number;
}

interface TokenCalledPayload {
  session_id: string;
  token_number: number;
  patient_id: string;
}

interface BreakStartedPayload {
  session_id: string;
  break_started_at: string;
  expected_duration: number;
}

interface BreakEndedPayload      { session_id: string }
interface SessionClosedPayload   { session_id: string }
interface SessionReopenedPayload { session_id: string }
interface TokenCancelledPayload  { session_id: string; patient_id: string }
interface YouWereCompletedPayload { session_id: string; token_id: string }

/* ------------------------------------------------------------------ */
/*  Minimal shape we need to patch in ['queue','sessions','today']     */
/* ------------------------------------------------------------------ */
type SessionPatch = {
  id: string;
  status: string;
  break_started_at: string | null;
  break_expected_duration: number | null;
  active_break_id: string | null;
};

function patchTodaySessions(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
  patch: Partial<SessionPatch>,
) {
  queryClient.setQueryData(
    ['queue', 'sessions', 'today'],
    (prev: SessionPatch[] | undefined) => {
      if (!prev) return prev;
      return prev.map((s) => (s.id === sessionId ? { ...s, ...patch } : s));
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */
export function useQueueSocket(
  sessionId: string | null,
  accessToken?: string | null,
  _userId?: string | null,
) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect whenever we have an auth token — even with no session yet.
    // Without connection the patient won't receive queue:token_issued_to_you
    // when a receptionist registers them for the first time.
    if (!accessToken) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (sessionId) {
        // Patient already has a token: join session room + personal room via JWT
        socket.emit('join:session', {
          sessionId,
          token: accessToken,
        });
      } else {
        // Patient has no token yet: only join personal room so they get notified
        // when a receptionist gives them a token
        socket.emit('join:personal', { token: accessToken });
      }
    });

    /* ---------------------------------------------------------------
     *  PERSONAL — token issued TO THIS patient (no session room needed)
     * ------------------------------------------------------------- */
    socket.on('queue:token_issued_to_you', (_p: TokenIssuedToYouPayload) => {
      // Invalidate so the "No token today" screen re-fetches and shows the panel
      queryClient.invalidateQueries({ queryKey: ['queue', 'my-active-token'] });
    });

    /* ---------------------------------------------------------------
     *  PERSONAL — direct setQueryData, zero REST round-trips
     * ------------------------------------------------------------- */
    socket.on('queue:you_are_called', (_p: YouAreCalledPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, status: 'called' as const, patients_ahead: 0 } : prev,
      );
    });

    socket.on('queue:you_were_skipped', (_p: YouWereSkippedPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, status: 'skipped' as const } : prev,
      );
    });

    socket.on('queue:eta_update', (payload: EtaUpdatePayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev
            ? { ...prev, patients_ahead: payload.patients_ahead, eta_minutes: payload.eta_minutes }
            : prev,
      );
      queryClient.setQueryData(
        ['queue', 'session', payload.session_id, 'my-token'],
        (prev: { patients_ahead?: number } | undefined) =>
          prev ? { ...prev, patients_ahead: payload.patients_ahead } : prev,
      );
    });

    /* ---------------------------------------------------------------
     *  SESSION events — patch BOTH patient cache AND doctor cache
     * ------------------------------------------------------------- */
    socket.on('queue:token_called', (payload: TokenCalledPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, current_token: payload.token_number } : prev,
      );
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: ['queue', 'session', sessionId, 'tokens'],
        });
      }
    });

    socket.on('queue:token_issued', () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
      // Also refresh patient's own token in case this is a re-subscription after reconnect
      queryClient.invalidateQueries({ queryKey: ['queue', 'my-active-token'] });
    });

    socket.on('queue:token_skipped', () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    socket.on('queue:token_checkin', () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      }
    });

    socket.on('queue:token_completed', () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    // Personal: fired only to the patient whose token was just completed
    socket.on('queue:you_were_completed', (_p: YouWereCompletedPayload) => {
      // Immediately flip the patient's own panel to "completed"
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, status: 'completed' as const } : prev,
      );
      // Refresh visit history so notes are visible right away
      queryClient.invalidateQueries({ queryKey: ['patient', 'visits'] });
    });

    socket.on('queue:token_cancelled', (payload: TokenCancelledPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, status: 'cancelled' as const } : prev,
      );
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['queue', 'session', sessionId, 'tokens'] });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    // ── BREAK STARTED ────────────────────────────────────────────────
    socket.on('queue:break_started', (payload: BreakStartedPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev
            ? {
                ...prev,
                session_status: 'break' as const,
                break_started_at: payload.break_started_at,
                break_expected_duration: payload.expected_duration,
              }
            : prev,
      );
      if (sessionId) {
        patchTodaySessions(queryClient, sessionId, {
          status: 'break',
          break_started_at: payload.break_started_at,
          break_expected_duration: payload.expected_duration,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    // ── BREAK ENDED ──────────────────────────────────────────────────
    socket.on('queue:break_ended', (_p: BreakEndedPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev
            ? {
                ...prev,
                session_status: 'open' as const,
                break_started_at: null,
                break_expected_duration: null,
              }
            : prev,
      );
      if (sessionId) {
        patchTodaySessions(queryClient, sessionId, {
          status: 'open',
          break_started_at: null,
          break_expected_duration: null,
          active_break_id: null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    // ── SESSION CLOSED ───────────────────────────────────────────────
    socket.on('queue:session_closed', (_p: SessionClosedPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev ? { ...prev, session_status: 'closed' as const } : prev,
      );
      if (sessionId) patchTodaySessions(queryClient, sessionId, { status: 'closed' });
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    // ── SESSION REOPENED ─────────────────────────────────────────────
    socket.on('queue:session_reopened', (_p: SessionReopenedPayload) => {
      queryClient.setQueryData(
        ['queue', 'my-active-token'],
        (prev: MyActiveToken | undefined) =>
          prev
            ? {
                ...prev,
                session_status: 'open' as const,
                break_started_at: null,
                break_expected_duration: null,
              }
            : prev,
      );
      if (sessionId) {
        patchTodaySessions(queryClient, sessionId, {
          status: 'open',
          break_started_at: null,
          break_expected_duration: null,
          active_break_id: null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['queue', 'sessions', 'today'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, accessToken, queryClient]);
}
