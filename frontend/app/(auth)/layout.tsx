import Link from 'next/link';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { AuthAside } from '@/components/auth/AuthAside';
import { Logo } from '@/components/shared/Logo';
import { Container, EASE } from '@/components/shared/primitives';

export const metadata: Metadata = {
  title: 'MediQueue — Account',
};

/** Shared shell for login, register and setup password: form left, role panel right (lg+). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-mq-ground">
      <header className="border-b border-mq-line">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className={cn('text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE)}>
            Back to home
          </Link>
        </Container>
      </header>

      <main id="main" className="flex flex-1">
        <Container className="grid lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col justify-center py-12 md:py-16 lg:col-span-5">{children}</div>
          <aside className="hidden items-center py-16 lg:col-span-6 lg:col-start-7 lg:flex">
            <AuthAside />
          </aside>
        </Container>
      </main>

      <footer className="border-t border-mq-line">
        <Container className="flex h-12 items-center text-xs text-mq-subtle">
          © {new Date().getFullYear()} MediQueue. Free for patients, always.
        </Container>
      </footer>
    </div>
  );
}
