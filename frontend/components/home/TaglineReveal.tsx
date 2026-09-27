'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/primitives';

const LINES = ['Every patient should know when it’s their turn.', 'Every doctor should know who’s next.'];

/** A word turns from muted to full ink once it crosses a trigger line at 55% of the viewport. */
function Word({ word }: { word: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), {
      rootMargin: '1000% 0px -45% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={cn(
        'transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:text-mq-ink',
        active ? 'text-mq-ink' : 'text-mq-ink/30',
      )}
    >
      {word}
    </span>
  );
}

export function TaglineReveal() {
  return (
    <section className="border-t border-mq-line bg-white py-24">
      <Container className="grid md:grid-cols-12 md:gap-8">
        <p className="max-w-[680px] text-4xl font-medium tracking-tight text-balance md:col-span-9 md:col-start-4 md:text-5xl">
          {LINES.map((line) => (
            <span key={line} className="block">
              {line.split(' ').map((word, i) => (
                <Fragment key={`${word}-${i}`}>
                  <Word word={word} />{' '}
                </Fragment>
              ))}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}
