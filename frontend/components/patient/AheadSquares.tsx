const MAX_SQUARES = 12;

/** One ink square per patient ahead, then a teal square for "you". Caps long queues at 12. */
export function AheadSquares({ ahead }: { ahead: number }) {
  const shown = Math.min(ahead, MAX_SQUARES);
  const hidden = ahead - shown;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1" aria-hidden>
      {hidden > 0 && <span className="mr-1 text-xs tabular-nums text-mq-subtle">+{hidden}</span>}
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="h-3 w-3 bg-mq-ink" />
      ))}
      <span className="h-3 w-3 bg-mq-accent" />
      <span className="ml-2 text-xs text-mq-muted">You</span>
    </div>
  );
}
