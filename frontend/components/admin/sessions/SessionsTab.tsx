'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTodaySessions } from '@/hooks/api/doctor';
import { ButtonLink, buttonClasses } from '@/components/shared/primitives';
import { EmptyPanel, ListSkeleton, TabHeader } from '../TabHeader';
import { ActiveSessionPanel } from './ActiveSessionPanel';
import { ClosedSessions } from './ClosedSessions';
import { OpenSessionDialog } from './OpenSessionDialog';
import { TodayStats } from './TodayStats';

/** Today: headline numbers, every open queue with its tokens, then closed queues. */
export function SessionsTab() {
  const { data: sessions = [], isLoading } = useTodaySessions();
  const [opening, setOpening] = useState(false);

  const open = sessions.filter((s) => s.status !== 'closed');
  const closed = sessions.filter((s) => s.status === 'closed');

  const openButton = (
    <button type="button" onClick={() => setOpening(true)} className={buttonClasses('primary', 'sm')}>
      <Plus className="h-4 w-4" strokeWidth={1.75} />
      Open a queue
    </button>
  );

  return (
    <div className="space-y-10">
      <TabHeader
        title="Queues"
        meta={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            <ButtonLink href="/admin/queue" variant="secondary" size="sm">Receptionist desk</ButtonLink>
            {openButton}
          </>
        }
      />

      {isLoading ? (
        <ListSkeleton />
      ) : sessions.length === 0 ? (
        <EmptyPanel title="No queues today" body="Open a queue for a doctor to start giving tokens to patients." action={openButton} />
      ) : (
        <>
          <TodayStats sessions={sessions} />
          {open.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-base font-medium text-mq-ink">Open queues</h3>
              {open.map((s) => <ActiveSessionPanel key={s.id} session={s} />)}
            </section>
          )}
          {closed.length > 0 && <ClosedSessions sessions={closed} />}
        </>
      )}

      {opening && <OpenSessionDialog onClose={() => setOpening(false)} />}
    </div>
  );
}
