import { describe, expect, it } from 'vitest';
import { check, diagnoseAdd } from '../src/engine/check';
import { generate } from '../src/engine/generate';
import { hintFor } from '../src/engine/feedback';
import { lessonById } from '../src/engine/content';
import { ar, fill } from '../src/engine/digits';
import type { Question } from '../src/engine/types';

describe('الأرقام الهندية', () => {
  it('تحوّل كل الأرقام', () => {
    expect(ar(72)).toBe('٧٢');
    expect(ar(1234567890)).toBe('١٢٣٤٥٦٧٨٩٠');
    expect(fill('الرقم {digit} آحاد', { digit: 4 })).toBe('الرقم ٤ آحاد');
  });
});

describe('تشخيص أخطاء الجمع', () => {
  const cases: [number, number, number, string][] = [
    [21, 4, 61, 'ones-under-tens'], // من صندوق "خطأ شائع" في الكتاب
    [4, 21, 61, 'ones-under-tens'],
    [23, 4, 63, 'ones-under-tens'],
    [32, 44, 67, 'reversed-digits'], // الصحيح ٧٦
    [23, 45, 8, 'forgot-tens'],
    [23, 45, 28, 'forgot-tens'],
    [23, 45, 60, 'forgot-ones'],
    [38, 22, 50, 'forgot-carry'], // من المنهج
    [26, 18, 314, 'full-ones-sum'], // من المنهج
    [45, 23, 22, 'wrong-operation'],
    [23, 45, 69, 'calc'],
  ];
  for (const [a, b, ans, err] of cases) {
    it(`${a} + ${b} = ${ans} → ${err}`, () => {
      const v = diagnoseAdd(a, b, ans);
      expect(v.correct).toBe(false);
      expect(v.error).toBe(err);
    });
  }
  it('الإجابة الصحيحة', () => expect(diagnoseAdd(21, 4, 25).correct).toBe(true));

  it('تلميح الخطأ الشائع يذكر الرقم بالهندية', () => {
    const lesson = lessonById('ch2-lesson1');
    const q = generate({ lessonId: 'ch2-lesson1', kind: 'vgrid', seed: 1 });
    expect(hintFor(lesson, q, diagnoseAdd(21, 4, 61))).toBe('الرقم ٤ آحاد، مكانه تحت الآحاد.');
  });
});

function findQ(lessonId: string, kind: Question['kind'], pred: (q: Question) => boolean): Question {
  for (let s = 1; s < 50000; s++) {
    const q = generate({ lessonId, kind, seed: s });
    if (pred(q)) return q;
  }
  throw new Error('لم أجد سؤالاً مناسباً');
}

describe('الجمع الرأسي الحر (سحب الأرقام)', () => {
  it('يكتشف وضع العدد ذي الرقم الواحد تحت العشرات', () => {
    const q = findQ('ch2-lesson1', 'freeVertical', (q) => q.kind === 'freeVertical' && q.d.b < 10);
    if (q.kind !== 'freeVertical') throw 0;
    const { a, b } = q.d;
    const v = check(q, { kind: 'placement', rows: [[Math.floor(a / 10), a % 10], [b, null]], tens: null, ones: null });
    expect(v.error).toBe('ones-under-tens');
  });
});

describe('أسئلة الرسم البياني', () => {
  it('الإجابة برقم بدل الاسم', () => {
    const q = findQ('ch1-lesson2', 'graphRead', (q) => q.kind === 'graphRead' && q.d.variant === 'most');
    if (q.kind !== 'graphRead') throw 0;
    expect(check(q, { kind: 'pick', picks: [{ num: Math.max(...q.d.counts) }] }).error).toBe('number-instead-of-name');
  });
  it('خلط الأكثر والأقل', () => {
    const q = findQ('ch1-lesson2', 'graphRead', (q) => q.kind === 'graphRead' && q.d.variant === 'most');
    if (q.kind !== 'graphRead') throw 0;
    const min = q.d.counts.indexOf(Math.min(...q.d.counts));
    expect(check(q, { kind: 'pick', picks: [{ name: q.d.cats[min].name }] }).error).toBe('more-less-confusion');
  });
  it('الترتيب المعكوس = خلط الأكبر والأقل', () => {
    const q = findQ('ch1-lesson2', 'graphRead', (q) => q.kind === 'graphRead' && q.d.variant === 'orderAsc');
    if (q.kind !== 'graphRead') throw 0;
    const desc = q.d.counts.map((c, i) => ({ c, n: q.d.cats[i].name })).sort((x, y) => y.c - x.c).map((x) => ({ name: x.n }));
    expect(check(q, { kind: 'pick', picks: desc }).error).toBe('more-less-confusion');
  });
  it('خطأ العدّ بفارق ١ في مشهد العد', () => {
    const q = generate({ lessonId: 'ch1-lesson1', kind: 'countScene', seed: 99 });
    if (q.kind !== 'countScene') throw 0;
    const values = q.d.counts.map((c, i) => (i === 0 ? (c === 10 ? 9 : c + 1) : c));
    const v = check(q, { kind: 'counts', values });
    expect(v.error).toBe('count-off-by-one');
    expect(hintFor(lessonById('ch1-lesson1'), q, v)).toContain('اشطب');
  });
  it('الطرح بدل الجمع في سؤال المجموع', () => {
    const q = findQ('ch1-lesson2', 'graphRead', (q) => q.kind === 'graphRead' && q.d.variant === 'sum' && q.d.counts[q.d.x!] !== q.d.counts[q.d.y!]);
    if (q.kind !== 'graphRead') throw 0;
    const c = q.d.counts;
    expect(check(q, { kind: 'pick', picks: [], value: Math.abs(c[q.d.x!] - c[q.d.y!]) }).error).toBe('wrong-operation');
  });
});

describe('المسائل اللفظية', () => {
  it('الطرح بدل الجمع', () => {
    const q = generate({ lessonId: 'ch2-lesson1', kind: 'wordProblem', seed: 5 });
    if (q.kind !== 'wordProblem') throw 0;
    expect(check(q, { kind: 'word', op: '-', x: q.d.a, y: q.d.b, result: Math.abs(q.d.a - q.d.b), unit: q.d.unit }).error).toBe('wrong-operation');
  });
  it('الوحدة الخاطئة', () => {
    const q = generate({ lessonId: 'ch2-lesson1', kind: 'wordProblem', seed: 5 });
    if (q.kind !== 'wordProblem') throw 0;
    const wrong = q.d.unitChoices.find((u) => u !== q.d.unit)!;
    expect(check(q, { kind: 'word', op: '+', x: q.d.a, y: q.d.b, result: q.d.sum, unit: wrong }).error).toBe('wrong-unit');
  });
});
