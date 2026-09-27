const ROLES = [
  { role: 'Doctors', detail: 'Call the next patient in one click and take breaks without losing the queue.' },
  { role: 'Clinic admins', detail: 'See wait times, peak hours and every department at a glance.' },
  { role: 'Patients', detail: 'Track your place in line and get a push notification before your turn.' },
];

/** Right-hand panel on auth screens: tells each role what they are signing in to. */
export function AuthAside() {
  return (
    <div className="w-full border border-mq-line bg-white p-8 xl:p-10">
      <p className="text-xs text-mq-subtle">One account, three views</p>
      <h2 className="mt-4 max-w-[20ch] text-3xl font-medium tracking-tight text-balance text-mq-ink">
        Everyone sees the same queue, in real time.
      </h2>
      <dl className="mt-10 border-t border-mq-line">
        {ROLES.map((item) => (
          <div key={item.role} className="grid gap-2 border-b border-mq-line py-4 sm:grid-cols-[128px_1fr] sm:gap-6">
            <dt className="text-sm font-medium text-mq-ink">{item.role}</dt>
            <dd className="text-sm text-pretty text-mq-muted">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
