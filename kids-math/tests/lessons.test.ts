// اختبار الـ١٠٠٠ سؤال لكل درس: كل سؤال داخل حدود curriculum.md، وإجابته الصحيحة تُقبل.
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/engine/content';
import { generate, pickKind } from '../src/engine/generate';
import { check } from '../src/engine/check';
import { correctResponse } from '../src/engine/answer';
import { Rng } from '../src/engine/rng';
import { validAdd } from '../src/engine/generators/addition';
import { tens } from '../src/engine/digits';
import type { AddData, AddLimits, GraphLimits, Question } from '../src/engine/types';

function addOperations(q: Question): AddData[] {
  switch (q.kind) {
    case 'vgrid': case 'placeValue': case 'freeVertical': case 'spotError': case 'wordProblem':
      return [q.d];
    case 'matchEqual':
      return [...q.d.top, ...q.d.bottom];
    case 'fillBlank':
      return [{ a: q.d.a, b: q.d.b, sum: q.d.a + q.d.b, carry: false }];
    default:
      return [];
  }
}

function graphCounts(q: Question): number[][] {
  switch (q.kind) {
    case 'countScene': case 'completeGraph': case 'graphToTable': case 'missingName': case 'graphRead': case 'conceptual':
      return [q.d.counts];
    case 'compareGraphs':
      return q.d.counts;
    default:
      return [];
  }
}

for (const lesson of LESSONS) {
  describe(`${lesson.id} — ${lesson.title}`, () => {
    it('يولّد ١٠٠٠ سؤال كلها داخل الحدود وإجاباتها الصحيحة مقبولة', () => {
      const r = new Rng(12345);
      const kinds = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const q = generate({ lessonId: lesson.id, kind: pickKind(lesson, r), seed: r.int(1, 2 ** 31 - 1) });
        kinds.add(q.kind);
        expect(lesson.questionTypes.map((t) => t.kind)).toContain(q.kind);
        const L = lesson.limits;
        if (L.op === 'add') {
          const lim = L as AddLimits;
          const ops = addOperations(q);
          expect(ops.length).toBeGreaterThan(0);
          for (const d of ops) {
            expect(validAdd(d.a, d.b, lim), `${d.a} + ${d.b}`).toBe(true);
            expect(d.a + d.b).toBeLessThan(100);
            const os = (d.a % 10) + (d.b % 10);
            if (lim.carry === 'none') {
              expect(os).toBeLessThanOrEqual(9);
              expect(tens(d.a) + tens(d.b)).toBeLessThanOrEqual(9);
            }
            if (lim.carry === 'carry') {
              expect(os).toBeGreaterThanOrEqual(10);
              expect(tens(d.a) + tens(d.b) + 1).toBeLessThanOrEqual(9);
            }
          }
        } else {
          const lim = L as GraphLimits;
          for (const c of graphCounts(q)) {
            expect(c.length).toBeGreaterThanOrEqual(lim.minCategories);
            expect(c.length).toBeLessThanOrEqual(lim.maxCategories);
            for (const x of c) {
              expect(x).toBeGreaterThanOrEqual(lim.minCount);
              expect(x).toBeLessThanOrEqual(Math.min(lim.maxCount, lim.maxRows));
            }
          }
          if (q.kind === 'graphRead') {
            const c = q.d.counts;
            if (q.d.variant === 'sum') expect(c[q.d.x!] + c[q.d.y!]).toBeLessThanOrEqual(lim.maxSum);
            if (q.d.variant === 'join') expect(c[q.d.x!] + q.d.k!).toBeLessThanOrEqual(lim.maxSum);
          }
          if (q.kind === 'compareGraphs' && q.d.variant === 'sumAcross')
            expect(q.d.counts[0][q.d.x!] + q.d.counts[1][q.d.x!]).toBeLessThanOrEqual(lim.maxSum);
          if (q.kind === 'countScene') expect(q.d.items.length).toBe(q.d.counts.reduce((s, x) => s + x, 0));
        }
        expect(check(q, correctResponse(q)).correct, JSON.stringify(q)).toBe(true);
        // نفس البذرة = نفس السؤال (أساس أسئلة المراجعة)
        expect(generate(q)).toEqual(q);
      }
      // كل أنواع الدرس ظهرت
      expect([...kinds].sort()).toEqual([...new Set(lesson.questionTypes.map((t) => t.kind))].sort());
    });
  });
}

describe('حالات الحمل المطلوبة في ch2-lesson2', () => {
  it('يغطي مجموع آحاد = ١٠ بالضبط ومجموع آحاد > ١٠', () => {
    const r = new Rng(7);
    let ten = 0, over = 0;
    for (let i = 0; i < 1000; i++) {
      const q = generate({ lessonId: 'ch2-lesson2', kind: 'vgrid', seed: r.int(1, 2 ** 31 - 1) });
      if (q.kind !== 'vgrid') continue;
      const os = (q.d.a % 10) + (q.d.b % 10);
      if (os === 10) { ten++; expect(q.d.sum % 10).toBe(0); }
      if (os > 10) over++;
    }
    expect(ten).toBeGreaterThan(200);
    expect(over).toBeGreaterThan(400);
  });
});
