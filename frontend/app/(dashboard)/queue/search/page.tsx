'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchClinics, useSearchDoctors, type Clinic, type DoctorResult } from '@/hooks/api/clinics';
import { SearchBox } from '@/components/patient/search/SearchBox';
import { SearchResults } from '@/components/patient/search/SearchResults';
import { ClinicQueue } from '@/components/patient/search/ClinicQueue';

type Selected = { slug: string; clinicName: string; prefillDoctor: string };

function Hint({ title, body }: { title: string; body?: string }) {
  return (
    <div className="border border-mq-line bg-white p-6">
      <p className="text-sm font-medium text-mq-ink">{title}</p>
      {body && <p className="mt-1 max-w-[52ch] text-sm text-pretty text-mq-muted">{body}</p>}
    </div>
  );
}

function LiveQueueLookup() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Selected | null>(null);
  const debounced = useDebouncedValue(query.trim(), 400);

  const { data: clinics = [], isFetching: fetchingClinics } = useSearchClinics(debounced);
  const { data: doctors = [], isFetching: fetchingDoctors } = useSearchDoctors(debounced);

  const searching = fetchingClinics || fetchingDoctors;
  const ready = debounced.length >= 2;
  const hasResults = clinics.length > 0 || doctors.length > 0;

  const open = (next: Selected) => {
    setSelected(next);
    setQuery('');
  };
  const selectClinic = (c: Clinic) => open({ slug: c.slug, clinicName: c.name, prefillDoctor: '' });
  const selectDoctor = (d: DoctorResult) => open({ slug: d.clinic_slug, clinicName: d.clinic_name, prefillDoctor: d.doctor_name });

  if (selected) return <ClinicQueue {...selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      <SearchBox value={query} onChange={setQuery} searching={searching} />

      {query.trim().length === 0 && (
        <Hint
          title="Search by clinic, hospital or doctor"
          body="See which doctors are seeing patients today, who is being served now and how many people are waiting."
        />
      )}
      {query.trim().length === 1 && <p className="text-xs text-mq-subtle">Type at least 2 letters to search.</p>}
      {ready && !searching && !hasResults && (
        <Hint title={`No results for “${debounced}”`} body="Check the spelling, or try the clinic’s name instead of a doctor’s." />
      )}
      {ready && hasResults && (
        <SearchResults clinics={clinics} doctors={doctors} onSelectClinic={selectClinic} onSelectDoctor={selectDoctor} />
      )}
    </div>
  );
}

export default function SearchPage() {
  const { loading, user } = useRequireAuth(['patient']);

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Find a queue</h1>
      <p className="mt-1 text-sm text-mq-muted">Check how busy a clinic is before you go.</p>
      <div className="mt-8">
        {loading || !user ? <div aria-busy="true" className="h-12 animate-pulse bg-mq-line" /> : <LiveQueueLookup />}
      </div>
    </div>
  );
}
