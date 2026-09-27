import { buttonClasses, ButtonLink } from '@/components/shared/primitives';

/** Console shaped skeleton while today's sessions load. */
export function ConsoleSkeleton() {
  return (
    <div aria-busy="true" className="border border-mq-line bg-white">
      <div className="h-12 border-b border-mq-line" />
      <div className="grid md:grid-cols-12">
        <div className="space-y-4 p-6 md:col-span-8 md:p-8">
          <div className="h-4 w-24 animate-pulse bg-mq-line" />
          <div className="h-12 w-32 animate-pulse bg-mq-line" />
          <div className="h-6 w-48 animate-pulse bg-mq-line" />
          <div className="h-10 w-48 animate-pulse bg-mq-line" />
        </div>
        <div className="space-y-3 border-t border-mq-line p-4 md:col-span-4 md:border-l md:border-t-0">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse bg-mq-line" />)}
        </div>
      </div>
    </div>
  );
}

type NoSessionProps = { isAdmin: boolean; onRefresh: () => void; refreshing: boolean };

/** No queue open today. Admins can open one; doctors wait for the clinic to open it. */
export function NoSession({ isAdmin, onRefresh, refreshing }: NoSessionProps) {
  return (
    <div className="border border-mq-line bg-white p-6 md:p-8">
      <p className="text-base font-medium text-mq-ink">No queue open today</p>
      <p className="mt-2 max-w-[52ch] text-sm text-pretty text-mq-muted">
        {isAdmin
          ? 'Open today’s queue from the dashboard. It appears here as soon as it is open.'
          : 'Your clinic opens today’s queue from its dashboard. It appears here as soon as it is open.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isAdmin && <ButtonLink href="/admin" variant="secondary" size="sm">Open a queue</ButtonLink>}
        <button type="button" onClick={onRefresh} disabled={refreshing} className={buttonClasses('secondary', 'sm')}>
          {refreshing ? 'Checking…' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
