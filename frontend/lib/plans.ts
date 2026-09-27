import type { PlanName } from '@/types';

/**
 * Single source of truth for subscription plans shown in the UI.
 * Prices and limits mirror the backend seed: backend/src/db/seeds/01_subscription_plans.js
 * If you change a price there, change it here too (the paywall charges from the database).
 */
export type Plan = {
  key: PlanName;
  name: string;
  /** Monthly price in USD. */
  price: number;
  blurb: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    key: 'solo',
    name: 'Solo Doctor',
    price: 20,
    blurb: 'For an individual doctor running their own chamber.',
    features: ['1 doctor', '1 department', 'Up to 50 patients a day', 'Live queue and WhatsApp alerts', 'Digital notes and prescriptions'],
  },
  {
    key: 'clinic',
    name: 'Clinic',
    price: 150,
    blurb: 'For growing clinics with several doctors.',
    features: ['Up to 20 doctors', 'Up to 5 departments', 'Up to 300 patients a day', 'Everything in Solo Doctor', 'Analytics dashboard', 'Queue simulation mode'],
  },
  {
    key: 'hospital',
    name: 'Hospital',
    price: 500,
    blurb: 'For hospitals running multiple branches.',
    features: ['Unlimited doctors', 'Unlimited departments', 'Unlimited patients', 'Multiple branches', 'Everything in Clinic'],
  },
];

export const DEFAULT_PLAN: PlanName = 'clinic';

/** Read a plan from a URL value like `?plan=solo`; anything unknown falls back to the default. */
export function parsePlan(value: string | null | undefined): PlanName {
  const match = PLANS.find((p) => p.key === value?.toLowerCase());
  return match ? match.key : DEFAULT_PLAN;
}

/** Registration link that preselects a plan. */
export function planRegisterHref(plan: PlanName): string {
  return `/register/tenant?plan=${plan}`;
}

export function formatPlanPrice(price: number): string {
  return `$${price}`;
}
