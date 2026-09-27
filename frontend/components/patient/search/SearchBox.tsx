import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  searching: boolean;
};

/** Large square search field with a clear button and a quiet "Searching" indicator. */
export function SearchBox({ value, onChange, searching }: SearchBoxProps) {
  return (
    <div className="relative">
      <label htmlFor="queue-search" className="sr-only">Search clinics, hospitals or doctors</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mq-subtle" strokeWidth={1.75} />
      <input
        id="queue-search"
        type="search"
        autoFocus
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Clinic, hospital or doctor name"
        className={cn(
          'h-12 w-full border border-mq-line bg-white pl-12 pr-24 text-base text-mq-ink placeholder:text-mq-subtle',
          'transition-colors duration-500 hover:border-mq-subtle focus:border-mq-ink focus:outline-none',
          '[&::-webkit-search-cancel-button]:hidden',
          EASE,
        )}
      />
      <div className="absolute inset-y-0 right-3 flex items-center gap-3">
        {searching && <span className="text-xs text-mq-subtle" aria-live="polite">Searching…</span>}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className={cn('p-1 text-mq-subtle transition-colors duration-500 hover:text-mq-ink', EASE)}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}
