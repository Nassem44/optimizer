import type { Lesson, Shared } from './types';
import sharedJson from '../../content/shared.json';

// كل ملف content/ch*-lesson*.json يصبح درساً تلقائياً — إضافة درس = إضافة ملف.
const mods = import.meta.glob('../../content/ch*-lesson*.json', { eager: true, import: 'default' }) as Record<string, Lesson>;

export const LESSONS: Lesson[] = Object.values(mods).sort((a, b) => a.order - b.order);
export const SHARED = sharedJson as Shared;

const byId = new Map(LESSONS.map((l) => [l.id, l]));
export function lessonById(id: string): Lesson {
  const l = byId.get(id);
  if (!l) throw new Error('درس غير موجود: ' + id);
  return l;
}
export const hasLesson = (id: string) => byId.has(id);
