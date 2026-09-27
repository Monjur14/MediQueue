import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonLink, Section } from '@/components/shared/primitives';
import { DEFAULT_PLAN, formatPlanPrice, planRegisterHref, PLANS } from '@/lib/plans';

// Plans (names, prices, features) come from lib/plans.ts, shared with the registration page.
const RECOMMENDED = DEFAULT_PLAN;

export function Pricing() {
  return (
    <Section
      id="pricing"
      index="04"
      label="Pricing"
      title="Monthly plans for clinics. Free for patients, always."
      lead="Billed monthly, cancel anytime. Pay with bKash, SSLCommerz or card."
    >
      <div className="grid border border-mq-line bg-white lg:grid-cols-3">
        {PLANS.map((plan) => {
          const recommended = plan.key === RECOMMENDED;
          return (
            <div
              key={plan.key}
              className={cn(
                'flex flex-col border-t border-mq-line p-6 first:border-t-0 md:p-8 lg:border-l lg:border-t-0 lg:first:border-l-0',
                recommended && 'ring-1 ring-inset ring-mq-ink',
              )}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-medium text-mq-ink">{plan.name}</h3>
                {recommended && <span className="text-xs font-medium text-mq-accent">Recommended</span>}
              </div>
              <p className="mt-2 text-sm text-pretty text-mq-muted lg:min-h-[40px]">{plan.blurb}</p>

              <p className="mt-10 flex items-baseline gap-2">
                <span className="text-5xl font-medium tracking-tight tabular-nums text-mq-ink">{formatPlanPrice(plan.price)}</span>
                <span className="text-sm text-mq-muted">/ month</span>
              </p>

              <ul className="mt-10 flex-1 border-t border-mq-line">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 border-b border-mq-line py-3 text-sm text-mq-ink">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-mq-accent" strokeWidth={2} />
                    {feature}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={planRegisterHref(plan.key)}
                variant={recommended ? 'primary' : 'secondary'}
                className="mt-10 w-full"
              >
                Register your clinic
              </ButtonLink>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
