'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import { EASE } from '@/components/shared/primitives';
import { AccountBar } from '@/components/layout/AccountBar';

export type AppNavLink = { href: string; label: string };

const ROOTS = new Set(['/admin', '/super']);

/** Staff app header: logo and account on top, underline tabs below (only with 2+ links). Width matches admin pages. */
export function AppHeader({ links, wide = false }: { links: AppNavLink[]; wide?: boolean }) {
  const pathname = usePathname();

  // Section roots ('/admin', '/super') only match exactly so their sub pages can have their own tab
  const isActive = (href: string) =>
    ROOTS.has(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const width = wide ? 'max-w-[1200px]' : 'max-w-5xl';

  return (
    <header className="sticky top-0 z-40 border-b border-mq-line bg-mq-ground/95 backdrop-blur-md">
      <div className={cn('mx-auto flex h-14 w-full items-center justify-between px-4 md:px-8', width)}>
        <Logo />
        <AccountBar />
      </div>
      {/* -mb-px lets the active underline sit on the header rule without overflowing (no stray scrollbar) */}
      {links.length > 1 && (
        <nav aria-label="Main" className={cn('no-scrollbar mx-auto -mb-px flex w-full gap-6 overflow-x-auto overflow-y-hidden px-4 md:px-8', width)}>
          {links.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 border-b-2 pb-3 pt-1 text-sm transition-colors duration-500',
                  EASE,
                  active ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
                )}>
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
