/**
 * Live demo state. Everything runs in the browser: no API calls, nothing is saved.
 * The rules mirror the real queue (backend/src/modules/queue, push.worker):
 *   - Tokens are numbered in issue order; "Seen, call next" completes the patient and calls the next.
 *   - ETA = (patients ahead + 1) x average consultation time + break time left.
 *   - A near turn push goes out once per token when 3 or fewer patients are ahead.
 */

export type DemoStatus = 'waiting' | 'called' | 'completed' | 'skipped';
export type DemoScreen = 'reception' | 'doctor' | 'patient';
export type Actor = 'Reception' | 'Doctor' | 'System';

export type DemoToken = {
  id: number;
  number: number;
  /** Queue position; re-admitted tokens move to the end. */
  order: number;
  name: string;
  phone: string;
  status: DemoStatus;
  isYou: boolean;
  issuedAt: number | null;
  completedAt: number | null;
  notes: string;
  alerted: boolean;
};

export type DemoPush = { id: number; title: string; body: string; at: number };
export type DemoLog = { id: number; at: number; actor: Actor; text: string };

export type DemoState = {
  tokens: DemoToken[];
  currentId: number | null;
  session: 'open' | 'break';
  breakMinutes: number;
  breakEndsAt: number | null;
  /** Unsaved text in the doctor's notes box (lifted so auto play can type into it). */
  draft: string;
  pushes: DemoPush[];
  log: DemoLog[];
  seq: number;
  flags: { calls: number; breakEnded: boolean; skips: number; tracked: boolean };
  /** Bumped when a screen changes, so mobile tabs can mark unseen updates. */
  touched: Record<DemoScreen, number>;
};

export const DEMO_CLINIC = 'Demo Clinic, Dhaka';
export const DEMO_DOCTOR = 'Nasrin Akter';
export const DEMO_DEPARTMENT = 'Medicine';
export const DEMO_MAX_TOKENS = 40;
export const AVG_CONSULT_MINUTES = 5;
export const NEAR_TURN_THRESHOLD = 3;
export const SAMPLE_NOTE =
  'Seasonal flu. Paracetamol 500 mg three times a day for 3 days. Drink plenty of water. Come back if the fever lasts more than 3 days.';

const WALK_INS = [
  'Karim Hossain', 'Sumaiya Islam', 'Tanvir Ahmed', 'Nusrat Jahan', 'Rafiq Mia',
  'Shirin Sultana', 'Imran Kabir', 'Farzana Haque', 'Mahmud Hasan', 'Lamia Chowdhury',
];

const seedToken = (id: number, name: string, phone: string, status: DemoStatus): DemoToken => ({
  id, number: id, order: id, name, phone, status, isYou: false,
  issuedAt: null, completedAt: null, notes: '', alerted: false,
});

export function initialDemoState(): DemoState {
  return {
    tokens: [
      seedToken(1, 'Abdul Karim', '+880 1711 204 318', 'called'),
      seedToken(2, 'Rokeya Begum', '+880 1819 552 061', 'waiting'),
      seedToken(3, 'Jamal Uddin', '+880 1552 118 740', 'waiting'),
      seedToken(4, 'Sadia Rahman', '+880 1911 675 293', 'waiting'),
      seedToken(5, 'Habib Ullah', '+880 1672 430 915', 'waiting'),
    ],
    currentId: 1,
    session: 'open',
    breakMinutes: 5,
    breakEndsAt: null,
    draft: '',
    pushes: [],
    log: [],
    seq: 100,
    flags: { calls: 0, breakEnded: false, skips: 0, tracked: false },
    touched: { reception: 0, doctor: 0, patient: 0 },
  };
}

export type DemoAction =
  | { type: 'give'; name: string; phone: string; at: number }
  | { type: 'walkIn'; at: number }
  | { type: 'callNext'; at: number }
  | { type: 'complete'; id: number; callNext: boolean; at: number }
  | { type: 'skip'; id: number; at: number }
  | { type: 'readmit'; id: number; at: number }
  | { type: 'startBreak'; minutes: number; at: number }
  | { type: 'endBreak'; at: number }
  | { type: 'setDraft'; draft: string }
  | { type: 'saveNotes'; at: number }
  | { type: 'track' }
  | { type: 'dismissPush'; id: number }
  | { type: 'reset' };

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

export const byOrder = (a: DemoToken, b: DemoToken) => a.order - b.order;
export const waitingList = (s: DemoState) => s.tokens.filter((t) => t.status === 'waiting').sort(byOrder);
export const currentToken = (s: DemoState) => s.tokens.find((t) => t.id === s.currentId && t.status === 'called');
export const youToken = (s: DemoState) => s.tokens.find((t) => t.isYou);
export const nextNumber = (s: DemoState) => Math.max(0, ...s.tokens.map((t) => t.number)) + 1;

export function patientsAhead(s: DemoState, token: DemoToken): number {
  return waitingList(s).findIndex((t) => t.id === token.id);
}

export function breakMinutesLeft(s: DemoState, now: number): number {
  if (s.session !== 'break' || !s.breakEndsAt) return 0;
  return Math.max(0, Math.ceil((s.breakEndsAt - now) / 60_000));
}

export function etaMinutes(s: DemoState, token: DemoToken, now: number): number {
  const ahead = patientsAhead(s, token);
  return (ahead + 1) * AVG_CONSULT_MINUTES + breakMinutesLeft(s, now);
}

export function formatClockTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

type Touch = Partial<Record<DemoScreen, boolean>>;

function log(s: DemoState, at: number, actor: Actor, text: string): DemoState {
  const entry = { id: s.seq + 1, at, actor, text };
  return { ...s, seq: s.seq + 1, log: [entry, ...s.log].slice(0, 40) };
}

function touch(s: DemoState, screens: Touch): DemoState {
  const touched = { ...s.touched };
  (Object.keys(screens) as DemoScreen[]).forEach((k) => { if (screens[k]) touched[k] += 1; });
  return { ...s, touched };
}

function patch(s: DemoState, id: number, changes: Partial<DemoToken>): DemoState {
  return { ...s, tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...changes } : t)) };
}

/** Anything that touches "you" also changes the patient's phone. */
const affectsYou = (s: DemoState) => Boolean(youToken(s));

/** Same rule as push.worker: once per token, when 3 or fewer are ahead. Only "you" has a phone here. */
function nearTurnCheck(s: DemoState, at: number): DemoState {
  const you = youToken(s);
  if (!you || you.status !== 'waiting' || you.alerted) return s;
  const ahead = patientsAhead(s, you);
  if (ahead < 0 || ahead > NEAR_TURN_THRESHOLD) return s;

  const title = ahead === 0 ? 'You’re next' : `${ahead} ${ahead === 1 ? 'patient' : 'patients'} ahead of you`;
  const push = {
    id: s.seq + 1,
    title,
    body: `Token #${you.number} with Dr. ${DEMO_DOCTOR} at ${DEMO_CLINIC}. Please head back to the waiting area.`,
    at,
  };
  let next = patch({ ...s, seq: s.seq + 1, pushes: [push, ...s.pushes] }, you.id, { alerted: true });
  next = log(next, at, 'System', `Push notification sent to ${you.name}: “${title}”.`);
  return touch(next, { patient: true });
}

function callNextIn(s: DemoState, at: number): DemoState {
  if (s.session !== 'open') return s;
  const next = waitingList(s)[0];
  if (!next) return s;
  let out = patch({ ...s, currentId: next.id, draft: '' }, next.id, { status: 'called' });
  out = { ...out, flags: { ...out.flags, calls: out.flags.calls + 1 } };
  out = log(out, at, 'Doctor', `Called #${next.number} ${next.name}.`);
  if (next.isYou) out = log(out, at, 'System', `${next.name}’s phone shows “It’s your turn”.`);
  return nearTurnCheck(touch(out, { doctor: true, patient: affectsYou(out) }), at);
}

export function demoReducer(s: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case 'give':
    case 'walkIn': {
      const hasYou = Boolean(youToken(s));
      const number = nextNumber(s);
      const order = Math.max(0, ...s.tokens.map((t) => t.order)) + 1;
      const walkInName = WALK_INS[(number - 1) % WALK_INS.length];
      const name = a.type === 'give' ? a.name : walkInName;
      const phone = a.type === 'give' ? a.phone : `+880 17${String(10 + (number * 37) % 89)} ${String(100 + (number * 53) % 899)} ${String(100 + (number * 71) % 899)}`;
      const token: DemoToken = {
        id: s.seq + 1, number, order, name, phone, status: 'waiting',
        isYou: a.type === 'give' && !hasYou,
        issuedAt: a.at, completedAt: null, notes: '', alerted: false,
      };
      let out: DemoState = { ...s, seq: s.seq + 1, tokens: [...s.tokens, token] };
      out = log(out, a.at, 'Reception', `Gave token #${number} to ${name}.`);
      if (token.isYou) out = log(out, a.at, 'System', `${name}’s phone now tracks token #${number} live.`);
      // Like queue.service giveToken: issuing never sends a near turn push (notifyNearTurn: false)
      return touch(out, { reception: true, doctor: true, patient: token.isYou || hasYou });
    }

    case 'callNext':
      return callNextIn(s, a.at);

    case 'complete': {
      const token = s.tokens.find((t) => t.id === a.id);
      if (!token) return s;
      // Unsaved notes are kept when the doctor marks the patient seen
      const notes = token.id === s.currentId && s.draft.trim() ? s.draft.trim() : token.notes;
      let out = patch(s, a.id, { status: 'completed', completedAt: a.at, notes });
      if (out.currentId === a.id) out = { ...out, currentId: null, draft: '' };
      out = log(out, a.at, 'Doctor', `Marked #${token.number} ${token.name} as seen.`);
      if (token.isYou) out = log(out, a.at, 'System', `Visit saved to ${token.name}’s history${notes ? ' with the doctor’s notes' : ''}.`);
      out = touch(out, { doctor: true, reception: true, patient: affectsYou(out) });
      out = nearTurnCheck(out, a.at);
      return a.callNext ? callNextIn(out, a.at) : out;
    }

    case 'skip': {
      const token = s.tokens.find((t) => t.id === a.id);
      if (!token) return s;
      let out = patch(s, a.id, { status: 'skipped' });
      if (out.currentId === a.id) out = { ...out, currentId: null, draft: '' };
      out = { ...out, flags: { ...out.flags, skips: out.flags.skips + 1 } };
      out = log(out, a.at, 'Doctor', `Skipped #${token.number} ${token.name}. They can be re-admitted later.`);
      out = touch(out, { doctor: true, reception: true, patient: affectsYou(out) });
      return nearTurnCheck(out, a.at);
    }

    case 'readmit': {
      const token = s.tokens.find((t) => t.id === a.id);
      if (!token) return s;
      const order = Math.max(0, ...s.tokens.map((t) => t.order)) + 1;
      let out = patch(s, a.id, { status: 'waiting', order });
      out = log(out, a.at, 'Doctor', `Re-admitted #${token.number} ${token.name} to the end of the queue.`);
      return nearTurnCheck(touch(out, { doctor: true, patient: affectsYou(out) }), a.at);
    }

    case 'startBreak': {
      if (s.session !== 'open') return s;
      let out: DemoState = { ...s, session: 'break', breakMinutes: a.minutes, breakEndsAt: a.at + a.minutes * 60_000 };
      out = log(out, a.at, 'Doctor', `Started a ${a.minutes} min break. Patients see when the queue resumes.`);
      return touch(out, { doctor: true, reception: true, patient: affectsYou(out) });
    }

    case 'endBreak': {
      if (s.session !== 'break') return s;
      let out: DemoState = { ...s, session: 'open', breakEndsAt: null, flags: { ...s.flags, breakEnded: true } };
      out = log(out, a.at, 'Doctor', 'Ended the break. The queue is moving again.');
      return touch(out, { doctor: true, reception: true, patient: affectsYou(out) });
    }

    case 'setDraft':
      return { ...s, draft: a.draft };

    case 'saveNotes': {
      const token = currentToken(s);
      if (!token) return s;
      const notes = s.draft.trim();
      let out = patch(s, token.id, { notes });
      out = { ...out, draft: notes };
      out = log(out, a.at, 'Doctor', `Saved consultation notes for #${token.number}.`);
      return touch(out, { doctor: true });
    }

    case 'track':
      return { ...s, flags: { ...s.flags, tracked: true } };

    case 'dismissPush':
      return { ...s, pushes: s.pushes.filter((p) => p.id !== a.id) };

    case 'reset':
      return initialDemoState();
  }
}

/* ------------------------------------------------------------------ */
/*  Guided steps                                                       */
/* ------------------------------------------------------------------ */

export type DemoStep = {
  id: string;
  screen: DemoScreen;
  title: string;
  task: (s: DemoState) => string;
  why: string;
  done: (s: DemoState) => boolean;
};

const youName = (s: DemoState) => youToken(s)?.name.split(' ')[0] ?? 'Ayesha';

/** First waiting patient who is not "you": the one we ask the doctor to skip. */
export function skipTarget(s: DemoState): DemoToken | undefined {
  return waitingList(s).find((t) => !t.isYou) ?? (currentToken(s)?.isYou ? undefined : currentToken(s));
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'give', screen: 'reception', title: 'Give a token',
    task: () => 'At the reception desk, press Give token. Ayesha’s phone number is already filled in.',
    why: 'Patients sign up once with their phone number. Reception types that number and MediQueue finds the account. The next token number is issued at once and appears on the doctor’s console and on the patient’s phone at the same moment.',
    done: (s) => Boolean(youToken(s)),
  },
  {
    id: 'track', screen: 'patient', title: 'Track your place',
    task: (s) => `Look at ${youName(s)}’s phone: her token number, how many people are ahead of her and the estimated wait.`,
    why: `The estimate is the number of patients ahead, plus the one in the room, times the doctor’s average consultation time (${AVG_CONSULT_MINUTES} min in this demo). It updates every time the queue moves.`,
    done: (s) => s.flags.tracked,
  },
  {
    id: 'call', screen: 'doctor', title: 'Call the next patient',
    task: () => 'On the doctor console, press Seen, call next.',
    why: 'One click finishes the patient in the room and calls the next one. When three or fewer people are ahead, the patient gets a push notification, once.',
    done: (s) => s.flags.calls >= 1,
  },
  {
    id: 'break', screen: 'doctor', title: 'Take a break',
    task: () => 'Start a 5 min break and look at the phone. Then press End break and resume.',
    why: 'Patients see that the doctor is on a break and when the queue resumes. Their estimated wait includes the time left on the break. Reception can keep giving tokens.',
    done: (s) => s.flags.breakEnded,
  },
  {
    id: 'skip', screen: 'doctor', title: 'Skip a no show',
    task: (s) => {
      const t = skipTarget(s);
      return t ? `#${t.number} ${t.name} is not in the waiting room. Press Skip on their row.` : 'Press Skip on any patient who is not in the waiting room.';
    },
    why: 'Skipped patients stay on the list and can be re-admitted to the end of the queue. If a called patient never arrives, MediQueue skips them automatically.',
    done: (s) => s.flags.skips >= 1,
  },
  {
    id: 'turn', screen: 'doctor', title: 'Call the patient in',
    task: (s) => `Keep pressing Seen, call next until ${youName(s)} is called.`,
    why: 'The moment the doctor calls her, her phone switches to “It’s your turn” with the doctor’s name.',
    done: (s) => { const y = youToken(s); return Boolean(y && (y.status === 'called' || y.status === 'completed')); },
  },
  {
    id: 'notes', screen: 'doctor', title: 'Write notes',
    task: (s) => `Type a consultation note for ${youName(s)}, press Save notes, then Seen. Then open History on her phone.`,
    why: 'Notes are saved with the visit. The patient can read them later in her visit history, so nothing is lost on a paper slip.',
    done: (s) => youToken(s)?.status === 'completed',
  },
];

export function activeStepIndex(s: DemoState): number {
  const i = DEMO_STEPS.findIndex((step) => !step.done(s));
  return i === -1 ? DEMO_STEPS.length : i;
}

/* ------------------------------------------------------------------ */
/*  Auto play: the next scripted action for the current step           */
/* ------------------------------------------------------------------ */

export type AutoMove = { action: DemoAction; delay: number } | null;

export function nextAutoMove(s: DemoState, step: number, now: number): AutoMove {
  const at = now;
  const beat = 1600;
  switch (DEMO_STEPS[step]?.id) {
    case 'give':
      return { action: { type: 'give', name: 'Ayesha Rahman', phone: '+880 1712 345 678', at }, delay: beat };
    case 'track':
      return { action: { type: 'track' }, delay: 3200 };
    case 'call':
      return currentToken(s)
        ? { action: { type: 'complete', id: s.currentId as number, callNext: true, at }, delay: beat }
        : { action: { type: 'callNext', at }, delay: beat };
    case 'break':
      return s.session === 'open'
        ? { action: { type: 'startBreak', minutes: 5, at }, delay: beat }
        : { action: { type: 'endBreak', at }, delay: 3600 };
    case 'skip': {
      const t = skipTarget(s);
      return t ? { action: { type: 'skip', id: t.id, at }, delay: beat } : null;
    }
    case 'turn': {
      const cur = currentToken(s);
      if (cur) return { action: { type: 'complete', id: cur.id, callNext: true, at }, delay: beat };
      return { action: { type: 'callNext', at }, delay: beat };
    }
    case 'notes': {
      const cur = currentToken(s);
      if (!cur) return null;
      if (!cur.notes && s.draft.length < SAMPLE_NOTE.length) {
        return { action: { type: 'setDraft', draft: SAMPLE_NOTE.slice(0, s.draft.length + 4) }, delay: s.draft.length === 0 ? 900 : 40 };
      }
      if (!cur.notes) return { action: { type: 'saveNotes', at }, delay: 700 };
      return { action: { type: 'complete', id: cur.id, callNext: false, at }, delay: beat };
    }
    default:
      return null;
  }
}
