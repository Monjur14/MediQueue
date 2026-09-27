import { Bell, MessageCircle, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PatientProfile } from '@/hooks/api/queue';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';

type Channel = PatientProfile['preferred_channel'];

const OPTIONS: { value: Channel; label: string; detail: string; icon: LucideIcon }[] = [
  { value: 'whatsapp', label: 'WhatsApp', detail: 'Message on WhatsApp', icon: MessageCircle },
  { value: 'sms', label: 'SMS', detail: 'Text message', icon: Smartphone },
  { value: 'both', label: 'Both', detail: 'WhatsApp and SMS', icon: Bell },
];

type ChannelPickerProps = {
  value: Channel;
  onChange: (value: Channel) => void;
  disabled?: boolean;
};

/** Radio group for how queue alerts reach the patient. Same pattern as the plan picker. */
export function ChannelPicker({ value, onChange, disabled }: ChannelPickerProps) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-40">
      <legend className="text-sm text-mq-ink">Queue alerts</legend>
      <div className="mt-2 grid gap-px border border-mq-line bg-mq-line sm:grid-cols-3">
        {OPTIONS.map(({ value: option, label, detail, icon: Icon }) => {
          const checked = option === value;
          return (
            <label
              key={option}
              className={cn(
                'relative flex cursor-pointer items-start gap-3 bg-white p-4 transition-colors duration-500',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-mq-accent',
                EASE,
                checked ? 'ring-2 ring-inset ring-mq-ink' : 'hover:bg-mq-ground',
              )}
            >
              <input
                type="radio"
                name="preferred_channel"
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', checked ? 'text-mq-accent' : 'text-mq-subtle')} strokeWidth={1.75} />
              <span>
                <span className={cn('block text-sm', checked ? 'font-medium text-mq-ink' : 'text-mq-muted')}>{label}</span>
                <span className="mt-1 block text-xs text-mq-subtle">{detail}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
