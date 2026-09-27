import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthNoticeProps = {
  tone: 'success' | 'error';
  children: React.ReactNode;
};

/** Inline status message for auth forms. Errors are announced immediately to screen readers. */
export function AuthNotice({ tone, children }: AuthNoticeProps) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 border bg-white p-4 text-sm',
        tone === 'error' ? 'border-mq-danger/40 text-mq-danger' : 'border-mq-line text-mq-ink',
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'success' && 'text-mq-accent')}
        strokeWidth={1.75}
      />
      <p className="text-pretty">{children}</p>
    </div>
  );
}
