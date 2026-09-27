'use client';

import { Suspense } from 'react';
import { toast } from 'sonner';
import {
  useResolveContactInquiry, useResolveSupportMessage,
  useSuperContactInquiries, useSuperSupportMessages,
  type ContactInquiry, type SupportMessage,
} from '@/hooks/api/support';
import { cn } from '@/lib/utils';
import { EASE, MONO } from '@/components/shared/primitives';
import { ErrorLine, PageHeader, Pager, Panel, Segmented } from '@/components/super/ui';
import { StatusMark } from '@/components/admin/StatusMark';
import { fmtDateTime } from '@/components/super/format';
import { useUrlState } from '@/components/super/useUrlState';

type StatusFilter = 'open' | 'resolved' | 'all';
type Source = 'billing' | 'website';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

function ResolveButton({ pending, onResolve }: { pending: boolean; onResolve: () => void }) {
  return (
    <button
      type="button"
      onClick={onResolve}
      disabled={pending}
      className={cn(
        'border border-mq-ink px-3 py-1.5 text-xs font-semibold text-mq-ink transition-colors duration-500',
        'hover:bg-mq-ink hover:text-white disabled:opacity-40',
        EASE,
      )}
    >
      {pending ? 'Saving…' : 'Mark resolved'}
    </button>
  );
}

function Row({
  title, subtitle, createdAt, status, message, children,
}: {
  title: string; subtitle?: string; createdAt: string; status: 'open' | 'resolved'; message: string; children?: React.ReactNode;
}) {
  return (
    <li className="border-b border-mq-line px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-mq-ink">{title}</p>
          {subtitle && <p className="text-xs text-mq-subtle">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className={cn(MONO, 'text-xs text-mq-subtle')}>{fmtDateTime(createdAt)}</span>
          {status === 'open' ? <StatusMark tone="ink" label="Open" /> : <StatusMark tone="muted" label="Resolved" />}
        </div>
      </div>
      <p className="mt-3 text-sm text-pretty text-mq-ink">{message}</p>
      {status === 'open' && children && <div className="mt-3">{children}</div>}
    </li>
  );
}

function BillingRequests({ status, page, onPage }: { status: StatusFilter; page: number; onPage: (p: number) => void }) {
  const { data, isLoading, isFetching, isError, refetch } = useSuperSupportMessages({ status, page });
  const resolve = useResolveSupportMessage();

  if (isError) return <ErrorLine onRetry={() => void refetch()} />;

  return (
    <Panel title="Billing requests" meta={data ? `${data.total} message${data.total === 1 ? '' : 's'}` : undefined}>
      {isLoading ? (
        <ListSkeleton />
      ) : !data || data.items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-mq-muted">{status === 'open' ? 'No open messages.' : 'No messages found.'}</p>
      ) : (
        <ul className={cn('transition-opacity duration-500', EASE, isFetching && 'opacity-60')}>
          {data.items.map((m: SupportMessage) => (
            <Row
              key={m.id}
              title={m.tenant_name}
              subtitle={`${m.user_name ?? 'Unknown user'}${m.user_email ? ` · ${m.user_email}` : ''}`}
              createdAt={m.created_at}
              status={m.status}
              message={m.message}
            >
              <ResolveButton
                pending={resolve.isPending}
                onResolve={() =>
                  resolve.mutate(m.id, {
                    onSuccess: () => toast.success('Marked as resolved.'),
                    onError: () => toast.error('Could not update this message. Please try again.'),
                  })
                }
              />
            </Row>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={onPage} />}
    </Panel>
  );
}

function WebsiteInquiries({ status, page, onPage }: { status: StatusFilter; page: number; onPage: (p: number) => void }) {
  const { data, isLoading, isFetching, isError, refetch } = useSuperContactInquiries({ status, page });
  const resolve = useResolveContactInquiry();

  if (isError) return <ErrorLine onRetry={() => void refetch()} />;

  return (
    <Panel title="Website inquiries" meta={data ? `${data.total} message${data.total === 1 ? '' : 's'}` : undefined}>
      {isLoading ? (
        <ListSkeleton />
      ) : !data || data.items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-mq-muted">{status === 'open' ? 'No open inquiries.' : 'No inquiries found.'}</p>
      ) : (
        <ul className={cn('transition-opacity duration-500', EASE, isFetching && 'opacity-60')}>
          {data.items.map((m: ContactInquiry) => (
            <Row key={m.id} title={m.name} subtitle={m.email} createdAt={m.created_at} status={m.status} message={m.message}>
              <ResolveButton
                pending={resolve.isPending}
                onResolve={() =>
                  resolve.mutate(m.id, {
                    onSuccess: () => toast.success('Marked as resolved.'),
                    onError: () => toast.error('Could not update this inquiry. Please try again.'),
                  })
                }
              />
            </Row>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onPage={onPage} />}
    </Panel>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3 p-4">
      {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 animate-pulse bg-mq-line" />)}
    </div>
  );
}

function MessagesView() {
  const url = useUrlState();
  const source = (['billing', 'website'] as Source[]).find((s) => s === url.get('source')) ?? 'billing';
  const status = (['open', 'resolved', 'all'] as StatusFilter[]).find((s) => s === url.get('status')) ?? 'open';
  const page = Math.max(1, Number(url.get('page')) || 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Messages"
        meta="Requests from the Billing page (test mode payments) and inquiries from the homepage contact form."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented<Source>
          label="Source"
          value={source}
          onChange={(v) => url.set({ source: v === 'billing' ? null : v, page: 1 })}
          options={[
            { value: 'billing', label: 'Billing requests' },
            { value: 'website', label: 'Website inquiries' },
          ]}
        />
        <Segmented<StatusFilter>
          label="Status"
          value={status}
          onChange={(v) => url.set({ status: v === 'open' ? null : v, page: 1 })}
          options={STATUS_OPTIONS}
        />
      </div>

      {source === 'billing' ? (
        <BillingRequests status={status} page={page} onPage={(p) => url.set({ page: p })} />
      ) : (
        <WebsiteInquiries status={status} page={page} onPage={(p) => url.set({ page: p })} />
      )}
    </div>
  );
}

export default function SuperMessagesPage() {
  return <Suspense><MessagesView /></Suspense>;
}
