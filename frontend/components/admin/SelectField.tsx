import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { AuthLabel } from '@/components/auth/AuthField';

export const SELECT_CLASS = cn(
  'h-10 w-full border border-mq-line bg-white px-3 text-sm text-mq-ink',
  'transition-colors duration-500 hover:border-mq-subtle focus:border-mq-ink focus:outline-none disabled:opacity-40',
  EASE,
);

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  children: React.ReactNode;
};

/** Labelled native select styled to match AuthField. */
export function SelectField({ id, label, children, className, ...props }: SelectFieldProps) {
  return (
    <div>
      <AuthLabel htmlFor={id}>{label}</AuthLabel>
      <select id={id} className={cn(SELECT_CLASS, 'mt-2', className)} {...props}>
        {children}
      </select>
    </div>
  );
}
