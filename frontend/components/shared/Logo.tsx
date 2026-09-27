import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="MediQueue home">
      <span aria-hidden className="relative h-5 w-5 bg-mq-accent">
        <span className="absolute inset-y-1 left-1/2 w-0.75 -translate-x-1/2 bg-white" />
        <span className="absolute inset-x-1 top-1/2 h-0.75 -translate-y-1/2 bg-white" />
      </span>
      <span className="text-base font-semibold tracking-tight text-mq-ink">MediQueue</span>
    </Link>
  );
}
