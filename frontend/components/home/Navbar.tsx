'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ButtonLink, Container, EASE } from '@/components/shared/primitives';
import { Logo } from '@/components/shared/Logo';
import { PATIENT_OPTION, PLAN_OPTIONS, RegisterMenu } from './RegisterMenu';
import { InstallButton } from '@/components/pwa/InstallButton';

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Live demo', href: '/demo' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Contact', href: '/#contact' },
];

const STAGGER = ['delay-100', 'delay-150', 'delay-200', 'delay-250', 'delay-300', 'delay-350'];

export function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const line = cn('absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-mq-ink transition-transform duration-500', EASE);

  return (
    <>
      <header data-track-placement="navbar" className="sticky top-0 z-50 border-b border-mq-line bg-mq-ground/90 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo />
            <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <InstallButton />
            <Link href="/login" className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
              Log in
            </Link>
            <RegisterMenu />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative -mr-2 h-11 w-11 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span className={cn(line, open ? 'rotate-45' : '-translate-y-1')} />
            <span className={cn(line, open ? '-rotate-45' : 'translate-y-1')} />
          </button>
        </Container>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise trap position:fixed */}
      <div
        id="mobile-menu"
        data-track-placement="mobile_menu"
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto pb-8 bg-mq-ground/95 backdrop-blur-3xl transition-opacity duration-500 md:hidden',
          EASE,
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <Container className="flex flex-col pt-8">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={cn(
                'border-b border-mq-line py-4 text-3xl font-medium tracking-tight text-mq-ink transition-all duration-700',
                EASE,
                STAGGER[i],
                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
              )}
            >
              {link.label}
            </Link>
          ))}
          <div
            className={cn(
              'pt-8 transition-all duration-700',
              EASE,
              STAGGER[NAV_LINKS.length],
              open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
            )}
          >
            <p className="text-xs text-mq-subtle">Register now</p>
            <ul className="mt-2 border-t border-mq-line">
              {[PATIENT_OPTION, ...PLAN_OPTIONS].map((option) => (
                <li key={option.href}>
                  <Link
                    href={option.href}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline justify-between border-b border-mq-line py-3 text-base text-mq-ink"
                  >
                    <span>{option.label}</span>
                    <span className="text-xs tabular-nums text-mq-subtle">{option.meta}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <InstallButton className="mt-4 mb-2" />
            <ButtonLink href="/login" variant="secondary" className="mt-2 w-full">Log in</ButtonLink>
          </div>
        </Container>
      </div>
    </>
  );
}
