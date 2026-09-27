'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { Container, EASE } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';
import {
  DEMO_CLINIC, DEMO_DOCTOR, DEMO_STEPS, activeStepIndex, demoReducer, initialDemoState, nextAutoMove, youToken,
  type AutoMove, type DemoAction, type DemoScreen,
} from './demoStore';
import { ScreenFrame } from './ScreenFrame';
import { ReceptionScreen } from './ReceptionScreen';
import { DoctorScreen } from './DoctorScreen';
import { PatientScreen, type PatientTab } from './PatientScreen';
import { SCREEN_LABEL, StepRail, TaskBar } from './DemoGuide';
import { ActivityLog } from './ActivityLog';

type AutoMode = { mode: 'off' } | { mode: 'all' } | { mode: 'step'; from: number };

const SCREENS: DemoScreen[] = ['reception', 'doctor', 'patient'];

/** 1s clock for the break countdown and ETAs. 0 until mounted, so server and client render the same. */
function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(first); clearInterval(id); };
  }, []);
  return now;
}

/** Replace the scripted timestamp with the real one at the moment the action fires. */
const stamp = (a: DemoAction): DemoAction => ('at' in a ? { ...a, at: Date.now() } : a);

export function DemoPage() {
  const [state, dispatch] = useReducer(demoReducer, undefined, initialDemoState);
  const [auto, setAuto] = useState<AutoMode>({ mode: 'off' });
  const [resetKey, setResetKey] = useState(0);
  // Manual picks only hold for the step (or finish state) they were made in; then the guide takes over again
  const [screenPick, setScreenPick] = useState<{ screen: DemoScreen; step: number } | null>(null);
  const [tabPick, setTabPick] = useState<{ tab: PatientTab; finished: boolean } | null>(null);
  const [seen, setSeen] = useState(state.touched);
  const now = useNow();

  const step = activeStepIndex(state);
  const finished = step >= DEMO_STEPS.length;
  const guideScreen: DemoScreen = finished ? 'patient' : DEMO_STEPS[step].screen;
  const mobileScreen = screenPick && screenPick.step === step ? screenPick.screen : guideScreen;
  const patientTab: PatientTab = tabPick && tabPick.finished === finished ? tabPick.tab : finished ? 'history' : 'queue';

  const autoOn = auto.mode === 'all' || (auto.mode === 'step' && auto.from === step);
  const move = autoOn && !finished ? nextAutoMove(state, step, 0) : null;
  const playing = move !== null;

  // Auto play: one scripted action per tick, re-planned from the new state each time.
  // Keyed by content so the 1s clock re-render does not restart the timer.
  const moveKey = move ? JSON.stringify(move) : null;
  useEffect(() => {
    if (!moveKey) return;
    const planned = JSON.parse(moveKey) as NonNullable<AutoMove>;
    const id = setTimeout(() => dispatch(stamp(planned.action)), planned.delay);
    return () => clearTimeout(id);
  }, [moveKey]);

  const act = useCallback((a: DemoAction) => {
    setAuto({ mode: 'off' });
    dispatch(a);
  }, []);

  const reset = () => {
    setAuto({ mode: 'off' });
    setScreenPick(null);
    setTabPick(null);
    setSeen({ reception: 0, doctor: 0, patient: 0 });
    setResetKey((k) => k + 1);
    dispatch({ type: 'reset' });
  };

  const pickScreen = (screen: DemoScreen) => {
    setScreenPick({ screen, step });
    setSeen((s) => ({ ...s, [mobileScreen]: state.touched[mobileScreen], [screen]: state.touched[screen] }));
  };

  const you = youToken(state);

  const screens: Record<DemoScreen, { meta: string; body: React.ReactNode; span: string }> = {
    reception: {
      meta: DEMO_CLINIC,
      span: 'xl:col-span-3',
      body: <ReceptionScreen key={resetKey} state={state} onAction={act} />,
    },
    doctor: {
      meta: `Dr. ${DEMO_DOCTOR}`,
      span: 'xl:col-span-6',
      body: <DoctorScreen key={resetKey} state={state} now={now} onAction={act} />,
    },
    patient: {
      meta: you?.name ?? 'Ayesha Rahman',
      span: 'xl:col-span-3',
      body: (
        <PatientScreen state={state} now={now} tab={patientTab}
          onTab={(tab) => setTabPick({ tab, finished })} onAction={dispatch} />
      ),
    },
  };

  return (
    <>
      <section className="bg-mq-ground pb-12 pt-12 md:pt-20">
        <Container>
          <p className="text-sm text-mq-muted">Live demo</p>
          <h1 className="mt-6 max-w-[680px] bg-linear-to-r from-[#000000] to-[#666666] bg-clip-text text-4xl font-medium tracking-tight text-balance text-transparent sm:text-5xl lg:text-6xl">
            One queue, three screens.
          </h1>
          <div className="mt-12 grid gap-6 border-t border-mq-ink pt-8 lg:grid-cols-12 lg:gap-8">
            <p className="max-w-[60ch] text-base text-pretty text-mq-muted lg:col-span-6">
              Run a short clinic morning yourself. Give a token at reception, work the queue as the doctor and watch
              the patient&rsquo;s phone follow along. Seven steps, about two minutes.
            </p>
            <p className="text-sm text-pretty text-mq-subtle lg:col-span-5 lg:col-start-8">
              This is a sandbox with sample patients. Nothing is saved, no one is notified, and Reset starts over.
              Prefer to watch? Press Play the rest.
            </p>
          </div>
          <div className="mt-12">
            <StepRail step={step} />
          </div>
        </Container>
      </section>

      <TaskBar
        state={state}
        step={step}
        playing={playing}
        onPlay={() => setAuto({ mode: 'all' })}
        onPause={() => setAuto({ mode: 'off' })}
        onDoStep={() => setAuto({ mode: 'step', from: step })}
        onAck={() => act({ type: 'track' })}
        onReset={reset}
      />

      <section className="bg-mq-ground py-8 md:py-12" aria-label="Demo screens">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8">
          {/* Below xl the three screens share one slot; tabs switch between them */}
          <div role="tablist" aria-label="Screen" className="no-scrollbar mb-6 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-mq-line xl:hidden">
            {SCREENS.map((id) => {
              const unseen = id !== mobileScreen && state.touched[id] > seen[id];
              return (
                <button key={id} type="button" role="tab" aria-selected={mobileScreen === id} onClick={() => pickScreen(id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm transition-colors duration-500',
                    EASE,
                    mobileScreen === id ? 'border-mq-ink text-mq-ink' : 'border-transparent text-mq-subtle hover:text-mq-ink',
                  )}>
                  {SCREEN_LABEL[id]}
                  {id === guideScreen && !finished && <span className="text-xs text-mq-accent">Your move</span>}
                  {unseen && id !== guideScreen && <span className="h-1.5 w-1.5 bg-mq-accent" aria-label="Updated" />}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-12 xl:items-stretch">
            {SCREENS.map((id) => (
              <ScreenFrame key={id} title={SCREEN_LABEL[id]} meta={screens[id].meta} active={!finished && guideScreen === id}
                className={cn(screens[id].span, mobileScreen === id ? 'flex' : 'hidden xl:flex')}>
                {screens[id].body}
              </ScreenFrame>
            ))}
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-12">
            <div className="xl:col-span-9">
              <ActivityLog state={state} />
            </div>
            <aside className="text-sm text-pretty text-mq-muted xl:col-span-3">
              <p className="text-xs text-mq-subtle">How this maps to the product</p>
              <p className="mt-2">
                The three screens are the real reception, doctor and patient views, drawn with sample data. In a clinic they
                run on different devices and stay in sync over a live connection, the same way they do here.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
