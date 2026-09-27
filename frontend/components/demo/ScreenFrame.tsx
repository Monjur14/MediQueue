import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';

type ScreenFrameProps = {
  title: string;
  meta: string;
  /** The guide wants the visitor to act on this screen now. */
  active: boolean;
  className?: string;
  children: React.ReactNode;
};

/** One of the three demo screens. The screen the current step needs is outlined in ink. */
export function ScreenFrame({ title, meta, active, className, children }: ScreenFrameProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'relative flex min-w-0 flex-col border bg-white transition-colors duration-500',
        EASE,
        active ? 'border-mq-ink' : 'border-mq-line',
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-mq-line px-4">
        <p className="truncate text-sm font-medium text-mq-ink">{title}</p>
        {active ? (
          <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-mq-accent">
            <span className="h-1.5 w-1.5 bg-mq-accent motion-safe:animate-pulse" aria-hidden />
            Your move
          </span>
        ) : (
          <span className={cn(MONO, 'truncate text-xs text-mq-subtle')}>{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}
