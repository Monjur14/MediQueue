import { Activity, BellRing, ChartColumn, Layers, Timer, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Section } from '@/components/shared/primitives';

type Feature = { icon: LucideIcon; title: string; body: string };

const FEATURES: Feature[] = [
  { icon: Activity, title: 'Live queue tracking', body: 'Every position change is pushed instantly. No refreshing, no asking the front desk.' },
  { icon: BellRing, title: 'Alerts before your turn', body: 'Patients get a push notification when three or fewer people are ahead of them. Once, not a stream of pings.' },
  { icon: Timer, title: 'Wait times that stay honest', body: 'Estimates recalculate when a doctor takes a break or a patient doesn’t show up.' },
  { icon: Layers, title: 'Departments and doctors', body: 'Run every department from one admin panel, each with its own queue rules.' },
  { icon: ChartColumn, title: 'Clinic analytics', body: 'Peak hours, average wait and patient volume per doctor. The numbers you plan with.' },
  { icon: Wallet, title: 'Local payments', body: 'Subscribe with bKash, SSLCommerz or card via Stripe. Invoices are always on hand.' },
];

export function Features() {
  return (
    <Section id="features" index="03" label="Features" title="Everything a busy clinic needs. Nothing it doesn’t." tone="white">
      <div className="grid gap-px border border-mq-line bg-mq-line sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white p-6 md:p-8">
            <Icon className="h-5 w-5 text-mq-accent" strokeWidth={1.5} />
            <h3 className="mt-10 text-lg font-medium text-mq-ink">{title}</h3>
            <p className="mt-2 text-base text-pretty text-mq-muted">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
