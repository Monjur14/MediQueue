'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const DELAY: Record<number, string> = { 0: '', 100: 'delay-100', 200: 'delay-200', 300: 'delay-300' };

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 100 | 200 | 300;
};

/** Heavy fade-up as the element enters the viewport. Uses IntersectionObserver, never scroll listeners. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none',
        DELAY[delay],
        shown ? 'translate-y-0 opacity-100 blur-none' : 'translate-y-16 opacity-0 blur-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
