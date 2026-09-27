import { BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONO } from './primitives';

type Status = 'In room' | 'Next' | 'Waiting';
type Row = { token: string; name: string; status: Status; eta: string; isViewer?: boolean };

// Illustrative data for the product preview — not real patients
const ROWS: Row[] = [
  { token: 'A-11', name: 'Rahim Uddin', status: 'In room', eta: '—' },
  { token: 'A-12', name: 'Nusrat Jahan', status: 'Next', eta: '4 min' },
  { token: 'A-13', name: 'Tanvir Ahmed', status: 'Waiting', eta: '8 min' },
  { token: 'A-14', name: 'Farzana Akter', status: 'Waiting', eta: '12 min', isViewer: true },
  { token: 'A-15', name: 'Mahmud Hasan', status: 'Waiting', eta: '17 min' },
];

const STATUS_STYLE: Record<Status, string> = {
  'In room': 'text-mq-accent font-medium',
  Next: 'text-mq-ink font-medium',
  Waiting: 'text-mq-subtle',
};

const COLS = 'grid grid-cols-[52px_1fr_auto] items-center gap-4 px-4 sm:grid-cols-[56px_1fr_88px_64px]';

function QueueTable() {
  return (
    <div>
      <div className={cn(COLS, MONO, 'h-10 border-b border-mq-line text-xs uppercase tracking-wider text-mq-subtle')}>
        <span>Token</span>
        <span>Patient</span>
        <span>Status</span>
        <span className="hidden text-right sm:block">ETA</span>
      </div>
      {ROWS.map((row) => (
        <div
          key={row.token}
          className={cn(COLS, 'h-12 border-b border-mq-line last:border-b-0', row.isViewer && 'bg-mq-tint')}
        >
          <span className={cn(MONO, 'text-xs text-mq-ink')}>{row.token}</span>
          <span className="truncate text-sm text-mq-ink">{row.name}</span>
          <span className={cn('flex items-center gap-2 text-sm', STATUS_STYLE[row.status])}>
            {row.status === 'In room' && <span className="h-1.5 w-1.5 bg-mq-accent" />}
            {row.status}
          </span>
          <span className={cn(MONO, 'hidden text-right text-xs tabular-nums text-mq-muted sm:block')}>
            {row.eta}
          </span>
        </div>
      ))}
    </div>
  );
}

function PatientView() {
  return (
    <div className="border-t border-mq-line bg-mq-ground p-6 md:border-l md:border-t-0">
      <p className={cn(MONO, 'text-xs uppercase tracking-wider text-mq-subtle')}>Patient view</p>
      <p className={cn(MONO, 'mt-4 text-xs text-mq-ink')}>A-14 · Cardiology</p>
      <p className="mt-2 text-5xl font-medium tracking-tight text-mq-ink">4th</p>
      <p className="mt-1 text-sm text-mq-muted">in line</p>

      <div className="mt-6 flex items-center gap-2" aria-hidden>
        <span className="h-3 w-3 bg-mq-ink" />
        <span className="h-3 w-3 bg-mq-ink" />
        <span className="h-3 w-3 bg-mq-ink" />
        <span className="h-3 w-3 bg-mq-accent" />
        <span className="ml-2 text-xs text-mq-muted">3 ahead of you</span>
      </div>

      <div className="mt-6 flex items-baseline justify-between border-t border-mq-line pt-3 text-sm">
        <span className="text-mq-muted">Estimated wait</span>
        <span className="font-medium tabular-nums text-mq-ink">≈ 12 min</span>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-mq-muted">
        <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mq-accent" strokeWidth={1.75} />
        Push alert when 3 or fewer patients are ahead.
      </p>
    </div>
  );
}

type QueuePreviewProps = {
  /** Show the patient's view beside the doctor's queue. Needs roughly 680px of width. */
  showPatientView?: boolean;
  /** Background the preview sits on. On dark, the primary bar switches to the accent so it stays visible. */
  surface?: 'light' | 'dark';
};

/** Illustrative doctor dashboard used on the homepage hero and the auth screens. */
export function QueuePreview({ showPatientView = true, surface = 'light' }: QueuePreviewProps) {
  return (
    <div
      role="img"
      aria-label={
        showPatientView
          ? 'Preview of the MediQueue doctor dashboard with a live patient queue and the matching patient view'
          : 'Preview of the MediQueue doctor dashboard with a live patient queue'
      }
      className="border border-mq-ink bg-white"
    >
      <div className="flex h-12 items-center justify-between border-b border-mq-line px-4">
        <p className="text-sm font-medium text-mq-ink">Cardiology — Dr. Karim</p>
        <p className={cn(MONO, 'flex items-center gap-2 text-xs text-mq-muted')}>
          <span className="h-2 w-2 bg-mq-accent" />
          Live · 10:42
        </p>
      </div>

      <div className={cn('grid', showPatientView && 'md:grid-cols-[1fr_224px]')}>
        <QueueTable />
        {showPatientView && <PatientView />}
      </div>

      <div className="flex border-t border-mq-line">
        <div
          className={cn(
            'flex h-11 flex-1 items-center justify-center text-sm font-medium text-white',
            surface === 'dark' ? 'bg-mq-accent' : 'bg-mq-ink',
          )}
        >
          Call next patient
        </div>
        <div className="flex h-11 items-center px-6 text-sm text-mq-ink">Start break</div>
      </div>
    </div>
  );
}
