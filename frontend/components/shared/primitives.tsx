import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

export const MONO = 'font-mono';
export const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

type ContainerProps = { children: React.ReactNode; className?: string };

export function Container({ children, className }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 md:px-8', className)}>{children}</div>;
}

type SectionProps = {
  id?: string;
  index: string;
  label: string;
  title: React.ReactNode;
  lead?: string;
  tone?: 'ground' | 'white';
  children: React.ReactNode;
};

/** Indexed section: "01 — Label" sits in the left 3 columns, headline in the right 9. */
export function Section({ id, index, label, title, lead, tone = 'ground', children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-16 border-t border-mq-line py-20 md:py-24', tone === 'white' ? 'bg-white' : 'bg-mq-ground')}
    >
      <Container>
        <Reveal className="grid gap-4 md:grid-cols-12 md:gap-8">
          <p className="text-xs tabular-nums text-mq-subtle md:col-span-3 md:pt-3">
            <span className="text-mq-accent">{index}</span> — {label}
          </p>
          <div className="md:col-span-9">
            <h2 className="max-w-[680px] text-3xl font-medium tracking-tight text-balance text-mq-ink md:text-5xl">
              {title}
            </h2>
            {lead && <p className="mt-4 max-w-[60ch] text-base text-pretty text-mq-muted">{lead}</p>}
          </div>
        </Reveal>
        <Reveal delay={100} className="mt-12 md:mt-20">
          {children}
        </Reveal>
      </Container>
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'inverseGhost';
type ButtonSize = 'md' | 'sm';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-mq-ink text-white hover:bg-mq-accent',
  secondary: 'border border-mq-ink text-mq-ink hover:bg-mq-ink hover:text-white',
  inverse: 'bg-white text-mq-ink hover:bg-mq-tint',
  inverseGhost: 'border border-white/30 text-white hover:border-white',
};

/** Shared button classes (DESIGN.md §6) — use for both <button> and links. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 px-3 py-2 font-semibold transition-all duration-500 active:translate-y-px',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mq-accent',
    'disabled:pointer-events-none disabled:opacity-40',
    EASE,
    size === 'md' ? 'text-base' : 'text-sm',
    BUTTON_VARIANTS[variant],
    className,
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

export function ButtonLink({ href, variant = 'primary', size = 'md', className, children }: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);
  const isPlainAnchor = href.startsWith('#') || href.startsWith('mailto:');
  return isPlainAnchor ? (
    <a href={href} className={classes}>{children}</a>
  ) : (
    <Link href={href} className={classes}>{children}</Link>
  );
}
