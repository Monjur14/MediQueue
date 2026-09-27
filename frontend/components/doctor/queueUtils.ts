import type { SessionToken } from '@/hooks/api/doctor';

export const ACTIVE_STATUSES: SessionToken['status'][] = ['waiting', 'called', 'in_consultation'];
export const DONE_STATUSES: SessionToken['status'][] = ['completed', 'skipped'];

export const byNumber = (a: SessionToken, b: SessionToken) => a.token_number - b.token_number;

/** The patient in front of the doctor: the called token matching current_token, else the latest called one. */
export function pickCurrent(active: SessionToken[], currentToken: number): SessionToken | undefined {
  const called = active.filter((t) => t.status === 'called' || t.status === 'in_consultation');
  return called.find((t) => t.token_number === currentToken) ?? called[called.length - 1];
}

/** 125 → "02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
