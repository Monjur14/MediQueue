'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import { EASE } from '@/components/shared/primitives';
import { AccountBar } from '@/components/layout/AccountBar';

const NAV = [
  { href: '/queue', label: 'My queue' },
  { href: '/queue/search', label: 'Search' },
  { href: '/queue/history', label: 'History' },
  { href: '/queue/profile', label: 'Profile' },
];

const WIDTH = 'mx-auto w-full max-w-3xl px-4 md:px-8';

/** Patient app header: logo and account on top, underline tabs below (DESIGN.md §6 Tabs). */
export function PatientHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => (href === '/queue' ? pathname === '/queue' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-mq-line bg-mq-ground/95 backdrop-blur-md">
      <div className={cn(WIDTH, 'flex h-14 items-center justify-between')}>
        <Logo />
        <AccountBar />
      </div>

      <nav aria-label="Patient" className={cn(WIDTH, 'flex gap-6')}>
        {NAV.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'translate-y-px border-b-2 pb-3 pt-1 text-sm transition-colors duration-500',
                EASE,
                active ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
