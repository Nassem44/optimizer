// حالة التقدّم والجلسات و Leitner — دوال نقية تعدّل كائن الحالة، والحفظ في storage/.
import type { ErrorType, QRef } from './types';
import { LESSONS, lessonById } from './content';
import { Rng } from './rng';
import { pickKind } from './generate';

export const STATE_VERSION = 1;
const MAX_ATTEMPTS_LOG = 1500;
export const MASTERY_WINDOW = 10;
export const MASTERY_NEEDED = 8; // ٨٠٪ من آخر ١٠
/** بعد كم جلسة يعود سؤال المراجعة حسب صندوقه: الجلسة التالية، ثم بعد جلستين، ثم بعد ٥ جلسات */
export const LEITNER_GAPS = { 1: 1, 2: 2, 3: 5 } as const;
export const REVIEW_SHARE = 0.3;

export interface Settings {
  minutes: number;
  questions: number;
  muted: boolean;
}

export interface LessonProgress {
  unlocked: boolean;
  /** قرار ولي الأمر يتقدّم على الفتح التلقائي */
  manual: 'locked' | 'unlocked' | null;
  /** صح/خطأ من المحاولة الأولى لآخر الأسئلة */
  recent: boolean[];
  mastered: boolean;
  seen: number;
}

export interface AttemptLog {
  t: number;
  lessonId: string;
  kind: string;
  seed: number;
  correct: boolean;
  tries: number;
  errors: ErrorType[];
  review: boolean;
}

export interface ReviewItem {
  ref: QRef;
  skill: string;
  box: 1 | 2 | 3;
  due: number; // رقم الجلسة
}

export interface PlanItem extends QRef {
  review: boolean;
}

export interface ActiveSession {
  lessonId: string;
  number: number;
  plan: PlanItem[];
  index: number;
  start: number;
  stars: number;
  firstTry: number;
  withHint: number;
  failed: number;
}

export interface SessionLog {
  number: number;
  lessonId: string;
  start: number;
  end: number;
  total: number;
  firstTry: number;
  withHint: number;
  failed: number;
  stars: number;
}

export interface AppState {
  version: number;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  attempts: AttemptLog[];
  errorCounts: Partial<Record<ErrorType, number>>;
  review: ReviewItem[];
  sessions: SessionLog[];
  /** رقم الجلسة الحالية/التالية — ساعة نظام Leitner */
  sessionNo: number;
  stars: number;
  active: ActiveSession | null;
}

export function initialState(): AppState {
  const s: AppState = {
    version: STATE_VERSION,
    settings: { minutes: 10, questions: 12, muted: false },
    lessons: {},
    attempts: [],
    errorCounts: {},
    review: [],
    sessions: [],
    sessionNo: 1,
    stars: 0,
    active: null,
  };
  return syncLessons(s);
}

/** يضيف الدروس الجديدة (بعد تحديث التطبيق) دون المساس بتقدّم الدروس القديمة */
export function syncLessons(s: AppState): AppState {
  for (const l of LESSONS) {
    if (!s.lessons[l.id]) s.lessons[l.id] = { unlocked: !!l.defaultUnlocked, manual: null, recent: [], mastered: false, seen: 0 };
  }
  // إن أُتقن الدرس السابق فالتالي مفتوح (يغطي دروساً أُضيفت بعد الإتقان)
  LESSONS.forEach((l, i) => {
    if (i > 0 && s.lessons[LESSONS[i - 1].id].mastered) s.lessons[l.id].unlocked = true;
  });
  return s;
}

export function isUnlocked(s: AppState, id: string): boolean {
  const p = s.lessons[id];
  if (!p) return false;
  if (p.manual) return p.manual === 'unlocked';
  return p.unlocked;
}

export function masteryPct(p: LessonProgress): number {
  if (!p.recent.length) return 0;
  return Math.round((100 * p.recent.filter(Boolean).length) / p.recent.length);
}

const refKey = (r: QRef) => `${r.lessonId}|${r.kind}|${r.seed}`;

/** خطة الجلسة: ~٧٠٪ من الدرس الحالي و~٣٠٪ مراجعة (أسئلة Leitner المستحقة أولاً، ثم دروس سابقة مفتوحة) */
export function planSession(s: AppState, lessonId: string, rng: Rng): PlanItem[] {
  const n = Math.max(1, s.settings.questions);
  const reviewSlots = Math.round(n * REVIEW_SHARE);
  const due = s.review.filter((it) => it.due <= s.sessionNo && isUnlocked(s, it.ref.lessonId)).sort((a, b) => a.due - b.due);
  const review: PlanItem[] = due.slice(0, reviewSlots).map((it) => ({ ...it.ref, review: true }));
  const others = LESSONS.filter((l) => l.id !== lessonId && isUnlocked(s, l.id) && s.lessons[l.id].seen > 0);
  while (review.length < reviewSlots && others.length) {
    const l = rng.pick(others);
    review.push({ lessonId: l.id, kind: pickKind(l, rng), seed: rng.int(1, 2 ** 31 - 1), review: true });
  }
  const lesson = lessonById(lessonId);
  const main: PlanItem[] = [];
  let lastKind = '';
  while (main.length + review.length < n) {
    let kind = pickKind(lesson, rng);
    if (kind === lastKind && lesson.questionTypes.length > 1) kind = pickKind(lesson, rng);
    lastKind = kind;
    main.push({ lessonId, kind, seed: rng.int(1, 2 ** 31 - 1), review: false });
  }
  // توزيع المراجعة بين أسئلة الدرس، ولا تبدأ الجلسة بمراجعة
  const plan = main.slice();
  review.forEach((r, i) => {
    const pos = Math.min(plan.length, Math.round(((i + 1) * (plan.length + 1)) / (review.length + 1)));
    plan.splice(Math.max(1, pos), 0, r);
  });
  return plan;
}

export function startSession(s: AppState, lessonId: string, rng: Rng, now = Date.now()): ActiveSession {
  s.active = { lessonId, number: s.sessionNo, plan: planSession(s, lessonId, rng), index: 0, start: now, stars: 0, firstTry: 0, withHint: 0, failed: 0 };
  return s.active;
}

export interface Outcome {
  /** رقم المحاولة التي نجح فيها (١ أو ٢)، أو ٣ إذا عُرض الحل */
  tries: 1 | 2 | 3;
  errors: ErrorType[];
}

export const starsFor = (tries: number) => (tries === 1 ? 1 : tries === 2 ? 0.5 : 0);

export function recordResult(s: AppState, item: PlanItem, o: Outcome, now = Date.now()): { mastered?: string; unlocked?: string } {
  const firstTry = o.tries === 1;
  const sessionNo = s.active?.number ?? s.sessionNo;
  s.attempts.push({ t: now, lessonId: item.lessonId, kind: item.kind, seed: item.seed, correct: o.tries < 3, tries: o.tries, errors: o.errors, review: item.review });
  if (s.attempts.length > MAX_ATTEMPTS_LOG) s.attempts.splice(0, s.attempts.length - MAX_ATTEMPTS_LOG);
  for (const e of o.errors) s.errorCounts[e] = (s.errorCounts[e] ?? 0) + 1;

  const stars = starsFor(o.tries);
  s.stars += stars;
  if (s.active) {
    s.active.stars += stars;
    if (o.tries === 1) s.active.firstTry++;
    else if (o.tries === 2) s.active.withHint++;
    else s.active.failed++;
  }

  // Leitner
  const key = refKey(item);
  const idx = s.review.findIndex((r) => refKey(r.ref) === key);
  const skill = lessonById(item.lessonId).skill;
  if (!firstTry) {
    const it: ReviewItem = { ref: { lessonId: item.lessonId, kind: item.kind, seed: item.seed }, skill, box: 1, due: sessionNo + LEITNER_GAPS[1] };
    if (idx >= 0) s.review[idx] = it;
    else s.review.push(it);
  } else if (idx >= 0) {
    const it = s.review[idx];
    if (it.box === 3) s.review.splice(idx, 1);
    else {
      it.box = (it.box + 1) as 2 | 3;
      it.due = sessionNo + LEITNER_GAPS[it.box];
    }
  }

  // الإتقان
  const p = s.lessons[item.lessonId];
  p.seen++;
  p.recent.push(firstTry);
  if (p.recent.length > MASTERY_WINDOW) p.recent.splice(0, p.recent.length - MASTERY_WINDOW);
  const out: { mastered?: string; unlocked?: string } = {};
  if (!p.mastered && p.recent.length >= MASTERY_WINDOW && p.recent.filter(Boolean).length >= MASTERY_NEEDED) {
    p.mastered = true;
    out.mastered = item.lessonId;
    const i = LESSONS.findIndex((l) => l.id === item.lessonId);
    const next = LESSONS[i + 1];
    if (next && !s.lessons[next.id].unlocked) {
      s.lessons[next.id].unlocked = true;
      if (isUnlocked(s, next.id)) out.unlocked = next.id;
    }
  }
  return out;
}

/** هل انتهت الجلسة؟ (عدد الأسئلة أو المدة، أيهما أقرب) */
export function sessionOver(s: AppState, now = Date.now()): boolean {
  const a = s.active;
  if (!a) return true;
  return a.index >= a.plan.length || now - a.start >= s.settings.minutes * 60_000;
}

export function finishSession(s: AppState, now = Date.now()): SessionLog | null {
  const a = s.active;
  if (!a) return null;
  const log: SessionLog = {
    number: a.number, lessonId: a.lessonId, start: a.start, end: now,
    total: a.firstTry + a.withHint + a.failed, firstTry: a.firstTry, withHint: a.withHint, failed: a.failed, stars: a.stars,
  };
  if (log.total > 0) {
    s.sessions.push(log);
    if (s.sessions.length > 200) s.sessions.shift();
    s.sessionNo = a.number + 1;
  }
  s.active = null;
  return log;
}

export function resetProgress(s: AppState): AppState {
  const fresh = initialState();
  fresh.settings = s.settings;
  return fresh;
}

export function topErrors(s: AppState, n = 5): [ErrorType, number][] {
  return (Object.entries(s.errorCounts) as [ErrorType, number][]).sort((a, b) => b[1] - a[1]).slice(0, n);
}
