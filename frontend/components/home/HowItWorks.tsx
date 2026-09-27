'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EASE, Section } from '@/components/shared/primitives';

type Audience = 'patients' | 'clinics';
type Step = { title: string; body: string };

const STEPS: Record<Audience, Step[]> = {
  patients: [
    { title: 'Get your token', body: 'The clinic registers your visit and you receive a digital queue token. No paper slip to lose.' },
    { title: 'Track your place live', body: 'See how many people are ahead of you, with an estimated wait that updates in real time.' },
    { title: 'Hear before your turn', body: 'A push notification reaches your phone when your turn is close. Wait wherever you like.' },
  ],
  clinics: [
    { title: 'Set up your clinic', body: 'Add doctors, departments and schedules from one admin panel.' },
    { title: 'Run the queue', body: 'Doctors call the next patient in one click, take breaks without chaos, and write notes digitally.' },
    { title: 'Improve with data', body: 'Peak hours, average wait times and patient volume per doctor show you where the day slows down.' },
  ],
};

const TABS: { id: Audience; label: string }[] = [
  { id: 'patients', label: 'For patients' },
  { id: 'clinics', label: 'For clinics' },
];

export function HowItWorks() {
  const [audience, setAudience] = useState<Audience>('patients');

  return (
    <Section id="how-it-works" index="02" label="How it works" title="Simple for patients. Precise for clinics.">
      <div role="tablist" aria-label="Audience" className="flex gap-8 border-b border-mq-line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={audience === tab.id}
            aria-controls="how-it-works-panel"
            onClick={() => setAudience(tab.id)}
            className={cn(
              'translate-y-px border-b-2 pb-3 text-base transition-colors duration-500', EASE,
              audience === tab.id
                ? 'border-mq-ink text-mq-ink'
                : 'border-transparent text-mq-subtle hover:text-mq-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ol
        id="how-it-works-panel"
        role="tabpanel"
        aria-labelledby={`tab-${audience}`}
        className="grid md:grid-cols-3"
      >
        {STEPS[audience].map((step, i) => (
          <li
            key={step.title}
            className="border-b border-mq-line py-8 md:border-b-0 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0"
          >
            <p className="text-sm tabular-nums text-mq-accent">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="mt-6 text-xl font-medium tracking-tight text-mq-ink">{step.title}</h3>
            <p className="mt-3 max-w-[36ch] text-base text-pretty text-mq-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
