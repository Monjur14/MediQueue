import { ArrowRight } from 'lucide-react';
import { ButtonLink, Container } from '@/components/shared/primitives';
import { Reveal } from '@/components/shared/Reveal';

export function FinalCta() {
  return (
    <section data-track-placement="final_cta" className="bg-mq-ink py-20 text-white md:py-24">
      <Container>
        <Reveal className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2 className="max-w-[680px] text-4xl font-medium tracking-tight text-balance md:text-6xl">
              Your patients are waiting. <br className="hidden md:block" />
              Let’s fix that.
            </h2>
            <p className="mt-6 max-w-[48ch] text-base text-pretty text-white/60">
              No paper tokens, no shouted names, no packed waiting rooms. Just a queue everyone can see.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <ButtonLink href="/register/tenant" variant="inverse">
              Register your clinic
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </ButtonLink>
            <ButtonLink href="/login" variant="inverseGhost">Log in</ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
