import type { PlanName } from '@/types';
import { cn } from '@/lib/utils';
import { formatPlanPrice, PLANS } from '@/lib/plans';
import { EASE } from '@/components/shared/primitives';

type PlanPickerProps = {
  value: PlanName;
  onChange: (plan: PlanName) => void;
  disabled?: boolean;
};

/** Radio group of plans: name and monthly price only. Keyboard: arrow keys move between plans. */
export function PlanPicker({ value, onChange, disabled }: PlanPickerProps) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-40">
      <legend className="text-sm text-mq-ink">Plan</legend>
      <div className="mt-2 grid grid-cols-3 gap-px border border-mq-line bg-mq-line">
        {PLANS.map((plan) => {
          const checked = plan.key === value;
          return (
            <label
              key={plan.key}
              className={cn(
                'relative flex cursor-pointer flex-col gap-1 bg-white p-3 transition-colors duration-500',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-mq-accent',
                EASE,
                checked ? 'ring-2 ring-inset ring-mq-ink' : 'hover:bg-mq-ground',
              )}
            >
              <input
                type="radio"
                name="plan"
                value={plan.key}
                checked={checked}
                onChange={() => onChange(plan.key)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span className={cn('text-sm', checked ? 'font-medium text-mq-ink' : 'text-mq-muted')}>
                  {plan.name}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 transition-colors duration-500',
                    EASE,
                    checked ? 'bg-mq-accent' : 'border border-mq-line',
                  )}
                />
              </span>
              <span className="text-lg font-medium tracking-tight tabular-nums text-mq-ink">
                {formatPlanPrice(plan.price)}
                <span className="ml-1 text-xs font-normal text-mq-subtle">/ mo</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
