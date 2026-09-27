import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/shared/primitives';

const ROWS = [
  { today: 'Arrive at 8am, still waiting at noon', after: 'Arrive close to your turn, not hours before' },
  { today: 'No idea when the doctor will call you', after: 'Your live place in line, on your phone' },
  { today: 'Paper slips and names shouted across the room', after: 'One screen and one click to call the next patient' },
  { today: 'No record of where the day slows down', after: 'Peak hours and wait times, measured daily' },
];

export function ProblemSection() {
  return (
    <Section index="01" label="Problem" title="Hospital waiting rooms run on guesswork." tone="white">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-3">
          <p className="text-6xl font-medium tracking-tight text-mq-ink md:text-7xl">
            3–5<span className="text-3xl text-mq-subtle md:text-4xl">h</span>
          </p>
          <p className="mt-4 max-w-[30ch] text-sm text-pretty text-mq-muted">
            Typical hospital wait for patients in Bangladesh, with no visibility of where they stand.
          </p>
        </div>

        <div className="md:col-span-9">
          <div className="hidden grid-cols-2 gap-8 border-b border-mq-ink pb-3 text-xs text-mq-subtle sm:grid">
            <span>Today</span>
            <span>With MediQueue</span>
          </div>
          {ROWS.map((row) => (
            <div key={row.today} className="grid gap-2 border-b border-mq-line py-4 sm:grid-cols-2 sm:gap-8 sm:py-6">
              <p className="text-sm text-mq-subtle sm:text-base">{row.today}</p>
              <p className="flex items-start gap-3 text-sm text-mq-ink sm:text-base">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-mq-accent" strokeWidth={1.75} />
                {row.after}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
