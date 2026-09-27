import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format minutes into a human-readable wait string */
export function formatWait(minutes: number): string {
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format ISO date to local display */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format ISO datetime to local time */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Token status label + color */
export const TOKEN_STATUS: Record<
  string,
  { label: string; color: string }
> = {
  waiting:    { label: 'Waiting',    color: 'text-yellow-600 bg-yellow-50' },
  called:     { label: 'Called',     color: 'text-blue-600   bg-blue-50'   },
  checked_in: { label: 'Checked In', color: 'text-indigo-600 bg-indigo-50' },
  completed:  { label: 'Completed',  color: 'text-green-600  bg-green-50'  },
  skipped:    { label: 'Skipped',    color: 'text-orange-600 bg-orange-50' },
  no_show:    { label: 'No Show',    color: 'text-red-600    bg-red-50'    },
};
