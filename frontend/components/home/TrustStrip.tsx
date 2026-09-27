import { Container } from '@/components/shared/primitives';
import { Reveal } from '@/components/shared/Reveal';

const SPECS = [
  { term: 'Payments', detail: 'bKash, SSLCommerz and Stripe' },
  { term: 'Alerts', detail: 'Push notifications on the patient’s phone' },
  { term: 'Data', detail: 'Each clinic isolated at the database level' },
  { term: 'Access', detail: 'Installs on Android like an app' },
];

export function TrustStrip() {
  return (
    <section className="border-t border-mq-line bg-mq-ground py-16 md:py-20">
      <Container>
        <Reveal className="grid gap-8 md:grid-cols-12">
          <p className="text-base font-medium text-balance text-mq-ink md:col-span-3">
            Built for how clinics in Bangladesh work
          </p>
          <dl className="grid gap-x-8 sm:grid-cols-2 md:col-span-9">
            {SPECS.map((spec) => (
              <div key={spec.term} className="flex flex-col gap-1 border-t border-mq-line py-4">
                <dt className="text-xs text-mq-subtle">{spec.term}</dt>
                <dd className="text-base text-mq-ink">{spec.detail}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
