import { PhoneInput } from '@/components/ui/phone-input';
import { AuthLabel } from './AuthField';

type PhoneFieldProps = React.ComponentProps<typeof PhoneInput> & {
  id: string;
  label: string;
  optional?: boolean;
};

/** Labelled phone input matching AuthField spacing. */
export function PhoneField({ id, label, optional, ...props }: PhoneFieldProps) {
  return (
    <div>
      <AuthLabel htmlFor={id} optional={optional}>
        {label}
      </AuthLabel>
      <div className="mt-2">
        <PhoneInput id={id} {...props} />
      </div>
    </div>
  );
}
