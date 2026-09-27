import { ChevronRight } from 'lucide-react';
import type { Clinic, DoctorResult } from '@/hooks/api/clinics';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

type SearchResultsProps = {
  clinics: Clinic[];
  doctors: DoctorResult[];
  onSelectClinic: (clinic: Clinic) => void;
  onSelectDoctor: (doctor: DoctorResult) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type RowProps = { title: string; meta: string; onClick: () => void };

function ResultRow({ title, meta, onClick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group flex w-full items-center justify-between gap-4 border-b border-mq-line px-4 py-4 text-left last:border-b-0',
          'transition-colors duration-500 hover:bg-mq-ground focus-visible:bg-mq-ground focus-visible:outline-none',
          EASE,
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-mq-ink">{title}</span>
          <span className="mt-1 block truncate text-xs text-mq-muted">{meta}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-mq-subtle transition-colors duration-500 group-hover:text-mq-ink" strokeWidth={1.75} />
      </button>
    </li>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="border-b border-mq-line bg-mq-ground px-4 py-2 font-mono text-xs uppercase tracking-wider text-mq-subtle">
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

/** Grouped results: clinics first, then individual doctors. */
export function SearchResults({ clinics, doctors, onSelectClinic, onSelectDoctor }: SearchResultsProps) {
  return (
    <div className="border border-mq-line bg-white">
      {clinics.length > 0 && (
        <Group label="Clinics and hospitals">
          {clinics.map((clinic) => (
            <ResultRow
              key={clinic.id}
              title={clinic.name}
              meta={`${plural(clinic.total_doctors, 'doctor')} · ${plural(clinic.total_departments, 'department')}`}
              onClick={() => onSelectClinic(clinic)}
            />
          ))}
        </Group>
      )}
      {doctors.length > 0 && (
        <Group label="Doctors">
          {doctors.map((doc) => (
            <ResultRow
              key={`${doc.doctor_id}-${doc.clinic_slug}`}
              title={`Dr. ${doc.doctor_name}`}
              meta={[doc.clinic_name, doc.department_name].filter(Boolean).join(' · ')}
              onClick={() => onSelectDoctor(doc)}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
