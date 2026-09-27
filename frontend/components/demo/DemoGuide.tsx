'use client';

import { Check, Pause, Play, RotateCcw } from 'lucide-react';
import { ButtonLink, buttonClasses, EASE, MONO } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';
import { DEMO_STEPS, type DemoScreen, type DemoState } from './demoStore';

export const SCREEN_LABEL: Record<DemoScreen, string> = {
  reception: 'Reception desk',
  doctor: 'Doctor console',
  patient: 'Patient’s phone',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The numbered rail of seven steps. Done steps show a check, the current one is outlined. */
export function StepRail({ step }: { step: number }) {
  return (
    <ol className="no-scrollbar -mx-4 flex overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-7 md:gap-px md:border md:border-mq-line md:bg-mq-line md:px-0">
      {DEMO_STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li
            key={s.id}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'w-40 shrink-0 border-y border-r border-mq-line bg-white p-4 first:border-l md:w-auto md:border-0',
              current && 'ring-1 ring-inset ring-mq-ink',
            )}
          >
            <p className={cn(MONO, 'flex items-center gap-2 text-xs tabular-nums', done ? 'text-mq-accent' : current ? 'text-mq-ink' : 'text-mq-subtle')}>
              {pad(i + 1)}
              {done && <Check className="h-3.5 w-3.5" strokeWidth={2} aria-label="Done" />}
            </p>
            <p className={cn('mt-3 text-sm font-medium tracking-tight', done || current ? 'text-mq-ink' : 'text-mq-muted')}>{s.title}</p>
            <p className="mt-1 text-xs text-mq-subtle">{SCREEN_LABEL[s.screen]}</p>
          </li>
        );
      })}
    </ol>
  );
}

type TaskBarProps = {
  state: DemoState;
  step: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onDoStep: () => void;
  onAck: () => void;
  onReset: () => void;
};

const TEXT_BTN = cn('inline-flex items-center gap-2 px-1 py-2 text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink', EASE);

/** Sticky bar with the one thing to do next, why it matters, and the auto play controls. */
export function TaskBar({ state, step, playing, onPlay, onPause, onDoStep, onAck, onReset }: TaskBarProps) {
  const finished = step >= DEMO_STEPS.length;
  const current = DEMO_STEPS[step];

  return (
    <div className="sticky top-16 z-30 border-y border-mq-line bg-mq-ground/95 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-4 md:px-8 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="min-w-0 lg:col-span-8" aria-live="polite">
          {finished ? (
            <>
              <p className={cn(MONO, 'text-xs text-mq-accent')}>Demo complete</p>
              <p className="mt-1 text-lg font-medium tracking-tight text-balance text-mq-ink">
                That is a full visit: token, live queue, break, no show, your turn and notes in history.
              </p>
            </>
          ) : (
            <>
              <p className={cn(MONO, 'text-xs text-mq-subtle')}>
                <span className="text-mq-ink">{pad(step + 1)}</span> / {pad(DEMO_STEPS.length)} · {SCREEN_LABEL[current.screen]}
              </p>
              <p className="mt-1 text-lg font-medium tracking-tight text-balance text-mq-ink">{current.task(state)}</p>
              <p className="mt-1 max-w-[80ch] text-sm text-pretty text-mq-muted">{current.why}</p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
          {finished ? (
            <>
              <button type="button" onClick={onReset} className={buttonClasses('secondary', 'sm')}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} /> Run it again
              </button>
              <ButtonLink href="/register/tenant" size="sm">Register your clinic</ButtonLink>
            </>
          ) : (
            <>
              {current.id === 'track' ? (
                <button type="button" onClick={onAck} disabled={playing} className={buttonClasses('primary', 'sm')}>Got it, continue</button>
              ) : (
                <button type="button" onClick={onDoStep} disabled={playing} className={buttonClasses('secondary', 'sm')}>Do this step for me</button>
              )}
              <button type="button" onClick={playing ? onPause : onPlay}
                className={buttonClasses(current.id === 'track' ? 'secondary' : 'primary', 'sm')} aria-pressed={playing}>
                {playing ? <Pause className="h-4 w-4" strokeWidth={1.5} /> : <Play className="h-4 w-4" strokeWidth={1.5} />}
                {playing ? 'Pause' : 'Play the rest'}
              </button>
              <button type="button" onClick={onReset} className={TEXT_BTN}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} /> Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
