import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonLink, Container, EASE } from '@/components/shared/primitives';
import { QueuePreview } from '@/components/shared/QueuePreview';
import { Reveal } from '@/components/shared/Reveal';

export function Hero() {
  return (
    <section data-track-placement="hero" className="bg-mq-ground pb-20 pt-12 md:pb-24 md:pt-24">
      <Container>
        <Reveal>
          <p className="text-sm text-mq-muted">Queue management for clinics and hospitals in Bangladesh</p>
          <h1 className="mt-6 max-w-[680px] bg-linear-to-r from-[#000000] to-[#666666] bg-clip-text text-4xl font-medium tracking-tight text-balance text-transparent sm:text-5xl lg:text-6xl">
            Patients shouldn’t <br className="hidden sm:block" />
            wait in the dark.
          </h1>
        </Reveal>

        <div className="mt-12 grid gap-12 border-t border-mq-ink pt-8 md:mt-16 lg:grid-cols-12 lg:gap-8">
          <Reveal delay={100} className="lg:col-span-4">
            <p className="max-w-[680px] text-base text-pretty text-mq-muted">
              Patients see their live place in line. Doctors call the next patient in one click. Clinic
              admins see the whole day at a glance.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <ButtonLink href="/register/tenant">
                Register your clinic
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </ButtonLink>
              <Link
                href="/demo"
                className={cn('text-sm font-semibold text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink', EASE)}
              >
                Try the live demo
              </Link>
            </div>
            <p className="mt-8 text-sm text-mq-subtle">
              Patient?{' '}
              <Link
                href="/register"
                className={cn('text-mq-ink underline decoration-mq-line underline-offset-4 transition-colors duration-500 hover:decoration-mq-ink', EASE)}
              >
                Create a free account
              </Link>
              . Free for patients, always.
            </p>
          </Reveal>

          <Reveal delay={200} className="lg:col-span-8">
            <QueuePreview />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
