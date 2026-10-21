import { Preferences } from '@capacitor/preferences';
import { STATE_VERSION, initialState, syncLessons, type AppState } from '../engine/progress';

const KEY = 'kids-math-state';

/** يرقّي حالة محفوظة من إصدار أقدم. أضف هنا خطوة لكل رفع لـ STATE_VERSION. */
export function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') throw new Error('ملف غير صالح');
  const s = raw as AppState;
  if (typeof s.version !== 'number' || !s.lessons || !Array.isArray(s.attempts)) throw new Error('ملف غير صالح');
  if (s.version > STATE_VERSION) throw new Error('النسخة الاحتياطية من إصدار أحدث من التطبيق');
  // (لا ترحيلات بعد — الإصدار ١)
  const base = initialState();
  const merged: AppState = { ...base, ...s, settings: { ...base.settings, ...s.settings }, version: STATE_VERSION };
  return syncLessons(merged);
}

export async function load(): Promise<AppState> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value) return migrate(JSON.parse(value));
  } catch (e) {
    console.error('تعذّر تحميل الحالة', e);
  }
  return initialState();
}

let pending: Promise<void> = Promise.resolve();
/** الحفظ متسلسل حتى لا تتداخل كتابتان */
export function save(s: AppState): Promise<void> {
  const value = JSON.stringify(s);
  pending = pending.then(() => Preferences.set({ key: KEY, value })).catch((e) => console.error('تعذّر الحفظ', e));
  return pending;
}

export const exportJson = (s: AppState) => JSON.stringify({ app: 'kids-math', exported: new Date().toISOString(), state: s }, null, 1);

export function importJson(text: string): AppState {
  const parsed = JSON.parse(text);
  if (parsed?.app !== 'kids-math') throw new Error('هذا ليس ملف نسخة احتياطية للتطبيق');
  return migrate(parsed.state);
}
