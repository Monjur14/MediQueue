import { cn } from '@/lib/utils';
import { buttonClasses } from '@/components/shared/primitives';
import { AuthNotice } from '@/components/auth/AuthNotice';

/** Skeleton shaped like the active token panel. */
export function QueueSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your queue" className="border border-mq-line bg-white">
      <div className="h-12 border-b border-mq-line px-4 py-4">
        <div className="h-4 w-48 animate-pulse bg-mq-line" />
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="h-3 w-20 animate-pulse bg-mq-line" />
          <div className="h-16 w-32 animate-pulse bg-mq-line" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse bg-mq-line" />
          <div className="h-16 w-24 animate-pulse bg-mq-line" />
        </div>
      </div>
    </div>
  );
}

type RetryProps = { onRetry: () => void; retrying: boolean };

function RetryButton({ onRetry, retrying }: RetryProps) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      aria-busy={retrying}
      className={buttonClasses('secondary', 'sm', 'mt-6')}
    >
      {retrying ? 'Checking…' : 'Check again'}
    </button>
  );
}

/** No token issued for today yet. */
export function QueueEmpty(props: RetryProps) {
  return (
    <div className="border border-mq-line bg-white p-6 md:p-8">
      <p className="text-base font-medium text-mq-ink">No token today</p>
      <p className="mt-2 max-w-[48ch] text-sm text-pretty text-mq-muted">
        When the clinic reception gives you a token, it will appear here with your live place in line.
      </p>
      <RetryButton {...props} />
    </div>
  );
}

/** The request failed for a reason other than "no token". */
export function QueueError(props: RetryProps) {
  return (
    <div className={cn('space-y-2')}>
      <AuthNotice tone="error">We could not load your queue. Check your connection and try again.</AuthNotice>
      <RetryButton {...props} />
    </div>
  );
}
