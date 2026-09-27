'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE } from '@/components/shared/primitives';
import { formatPlanPrice, planRegisterHref, PLANS } from '@/lib/plans';

export type RegisterOption = { label: string; href: string; meta: string };

/** Everywhere a visitor can sign up. Patient first, then one entry per clinic plan. */
export const PATIENT_OPTION: RegisterOption = { label: 'Join as patient', href: '/register', meta: 'Free' };
export const PLAN_OPTIONS: RegisterOption[] = PLANS.map((plan) => ({
  label: plan.name,
  href: planRegisterHref(plan.key),
  meta: `${formatPlanPrice(plan.price)} / mo`,
}));

const ITEM = cn(
  'flex cursor-pointer items-baseline justify-between gap-6 px-4 py-3 text-sm text-mq-ink outline-none',
  'transition-colors duration-500 data-[highlighted]:bg-mq-ground',
  EASE,
);

function MenuItem({ option }: { option: RegisterOption }) {
  return (
    <DropdownMenu.Item asChild className={ITEM}>
      <Link href={option.href}>
        <span>{option.label}</span>
        <span className="text-xs tabular-nums text-mq-subtle">{option.meta}</span>
      </Link>
    </DropdownMenu.Item>
  );
}

/** Header "Register now" button that opens the list of sign-up paths. */
export function RegisterMenu() {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={cn(buttonClasses('primary', 'sm'), 'group')}>
        Register now
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-500 group-data-[state=open]:rotate-180', EASE)}
          strokeWidth={1.75}
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-64 border border-mq-line bg-white py-2 font-sans"
        >
          <MenuItem option={PATIENT_OPTION} />
          <DropdownMenu.Separator className="my-2 h-px bg-mq-line" />
          <DropdownMenu.Label className="px-4 pb-1 pt-2 text-xs text-mq-subtle">Register a practice</DropdownMenu.Label>
          {PLAN_OPTIONS.map((option) => (
            <MenuItem key={option.href} option={option} />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
