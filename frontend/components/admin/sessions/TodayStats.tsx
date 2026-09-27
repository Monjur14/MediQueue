import type { QueueSession } from '@/hooks/api/doctor';

/** Three headline numbers for today across every session. */
export function TodayStats({ sessions }: { sessions: QueueSession[] }) {
  const open = sessions.filter((s) => s.status !== 'closed');
  const stats = [
    { label: 'Open queues', value: open.length },
    { label: 'Waiting now', value: open.reduce((sum, s) => sum + Number(s.waiting_count), 0) },
    { label: 'Seen today', value: sessions.reduce((sum, s) => sum + Number(s.completed_count), 0) },
  ];

  return (
    <dl className="grid grid-cols-3 gap-px border border-mq-line bg-mq-line">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-white p-4 md:p-6">
          <dt className="text-xs text-mq-subtle">{label}</dt>
          <dd className="mt-2 text-3xl font-medium tracking-tight tabular-nums text-mq-ink md:text-4xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
