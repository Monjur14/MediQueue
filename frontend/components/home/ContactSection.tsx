'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useSendContactInquiry } from '@/hooks/api/support';
import { cn } from '@/lib/utils';
import { buttonClasses, EASE, Section } from '@/components/shared/primitives';

type Field = 'name' | 'email' | 'message';
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = 'Enter your name.';
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email.';
  if (values.message.trim().length < 5) errors.message = 'Write a few words about how we can help.';
  return errors;
}

/** Square, hairline field matching AuthField (DESIGN.md §6 Inputs) — local copy so the marketing
 *  page has no dependency on the auth bundle. */
function Field({
  id, label, error, ...props
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-mq-ink">{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'mt-2 h-10 w-full border bg-white px-3 text-sm text-mq-ink placeholder:text-mq-subtle',
          'transition-colors duration-500 focus:border-mq-ink focus:outline-none',
          EASE,
          error ? 'border-mq-danger' : 'border-mq-line hover:border-mq-subtle',
        )}
        {...props}
      />
      {error && <p id={`${id}-error`} className="mt-2 text-sm text-mq-danger">{error}</p>}
    </div>
  );
}

export function ContactSection() {
  const formId = useId();
  const send = useSendContactInquiry();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setSent(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    send.mutate(
      { name: values.name.trim(), email: values.email.trim(), message: values.message.trim() },
      {
        onSuccess: () => {
          setSent(true);
          setValues({ name: '', email: '', message: '' });
          toast.success('Message sent. We will get back to you soon.');
        },
        onError: () => toast.error('Could not send your message. Please try again.'),
      },
    );
  };

  return (
    <Section
      id="contact"
      index="05"
      label="Contact"
      title="Still deciding? Ask us anything."
      lead="Questions about plans, setup, or moving your clinic over — send a message and we'll get back to you."
      tone="white"
    >
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-3">
          <p className="max-w-[30ch] text-sm text-pretty text-mq-muted">
            We read every message ourselves. No forms disappearing into a queue.
          </p>
        </div>

        <div className="md:col-span-9">
          <form onSubmit={onSubmit} noValidate className="max-w-[560px]">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                id={`${formId}-name`}
                label="Name"
                autoComplete="name"
                value={values.name}
                onChange={set('name')}
                error={errors.name}
                placeholder="Karim Hossain"
              />
              <Field
                id={`${formId}-email`}
                label="Email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={set('email')}
                error={errors.email}
                placeholder="you@clinic.com"
              />
            </div>

            <div className="mt-6">
              <label htmlFor={`${formId}-message`} className="block text-sm text-mq-ink">Message</label>
              <textarea
                id={`${formId}-message`}
                rows={5}
                value={values.message}
                onChange={set('message')}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? `${formId}-message-error` : undefined}
                placeholder="Tell us about your clinic and what you need."
                className={cn(
                  'mt-2 w-full border bg-white px-3 py-2 text-sm text-mq-ink placeholder:text-mq-subtle',
                  'transition-colors duration-500 focus:border-mq-ink focus:outline-none',
                  EASE,
                  errors.message ? 'border-mq-danger' : 'border-mq-line hover:border-mq-subtle',
                )}
              />
              {errors.message && (
                <p id={`${formId}-message-error`} className="mt-2 text-sm text-mq-danger">{errors.message}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={send.isPending} className={buttonClasses('primary', 'md')}>
                {send.isPending ? 'Sending…' : 'Send message'}
              </button>
              {sent && <p className="text-sm text-mq-muted">Message sent — thank you.</p>}
            </div>
          </form>
        </div>
      </div>
    </Section>
  );
}
