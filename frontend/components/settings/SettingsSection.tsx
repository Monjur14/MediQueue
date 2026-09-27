type SettingsSectionProps = { title: string; description: string; children: React.ReactNode };

/** Settings row: label and description in a left column, content on the right, hairline between rows. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="grid gap-6 border-t border-mq-line p-6 first:border-t-0 md:grid-cols-[240px_1fr] md:gap-8 md:p-8">
      <div>
        <h2 className="text-base font-medium text-mq-ink">{title}</h2>
        <p className="mt-1 text-sm text-pretty text-mq-muted">{description}</p>
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}
