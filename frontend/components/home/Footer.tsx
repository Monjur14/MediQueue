import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Container, EASE } from '@/components/shared/primitives';
import { Logo } from '@/components/shared/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Live demo', href: '/demo' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Contact', href: '/#contact' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Register your clinic', href: '/register/tenant' },
      { label: 'Patient sign up', href: '/register' },
      { label: 'Log in', href: '/login' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-mq-ground">
      <Container className="grid gap-12 py-16 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-6">
          <Logo />
          <p className="mt-4 max-w-[36ch] text-sm text-pretty text-mq-muted">
            Live hospital queues for Bangladesh. Free for patients, always.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="md:col-span-3">
            <p className="text-xs text-mq-subtle">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-mq-line">
        <Container className="flex flex-col justify-between gap-2 py-6 text-xs text-mq-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} MediQueue</p>
          <p>Payments via bKash · SSLCommerz · Stripe</p>
        </Container>
      </div>
    </footer>
  );
}
