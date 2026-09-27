type TabHeaderProps = {
  title: string;
  meta?: string;
  actions?: React.ReactNode;
};

/** Title, quiet meta line and right aligned actions at the top of each admin tab. */
export function TabHeader({ title, meta, actions }: TabHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-medium tracking-tight text-mq-ink">{title}</h2>
        {meta && <p className="mt-1 text-sm text-mq-muted">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Panel shown when a list is empty: one line of context plus the next action. */
export function EmptyPanel({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border border-mq-line bg-white p-6 md:p-8">
      <p className="text-base font-medium text-mq-ink">{title}</p>
      <p className="mt-2 max-w-[52ch] text-sm text-pretty text-mq-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Skeleton rows while a list loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-3 border border-mq-line bg-white p-4">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 animate-pulse bg-mq-line" />)}
    </div>
  );
}
