// اختبار الـ١٠٠٠ سؤال لكل درس: كل سؤال داخل حدود curriculum.md، وإجابته الصحيحة تُقبل.
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/engine/content';
import { generate, pickKind } from '../src/engine/generate';
import { check } from '../src/engine/check';
import { correctResponse } from '../src/engine/answer';
import { Rng } from '../src/engine/rng';
import { validOp } from '../src/engine/generators/arith';
import { tens } from '../src/engine/digits';
import type { AddLimits, GraphLimits, OpData, Question, SubLimits } from '../src/engine/types';

function arithOperations(q: Question): OpData[] {
  switch (q.kind) {
    case 'vgrid': case 'placeValue': case 'freeVertical': case 'spotError': case 'wordProblem':
      return [q.d];
    case 'matchEqual':
      return [...q.d.top, ...q.d.bottom];
    case 'fillBlank':
      return [{ a: q.d.a, b: q.d.b, op: '+', result: q.d.a + q.d.b, regroup: false }];
    case 'subCheck':
      return [{ a: q.d.a, b: q.d.b, op: '-', result: q.d.a - q.d.b, regroup: false }];
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
          const ops = arithOperations(q);
          expect(ops.length).toBeGreaterThan(0);
          // في "صِل الطرح بالجمع الذي يتحقق منه" الصف الثاني جمع مشتق من الطرح
          const own = q.kind === 'matchEqual' && !q.d.commutative && q.d.bottom[0].op !== q.d.top[0].op ? q.d.top : ops;
          for (const d of own) {
            expect(validOp(d.a, d.b, lim), `${d.a} + ${d.b}`).toBe(true);
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
        } else if (L.op === 'sub') {
          const lim = L as SubLimits;
          const ops = arithOperations(q);
          expect(ops.length).toBeGreaterThan(0);
          const subs = ops.filter((d) => d.op === '-');
          expect(subs.length).toBeGreaterThan(0);
          for (const d of subs) {
            expect(validOp(d.a, d.b, lim), `${d.a} − ${d.b}`).toBe(true);
            expect(d.a).toBeLessThanOrEqual(99);
            expect(d.a - d.b).toBeGreaterThanOrEqual(1);
            if (lim.borrow === 'none') expect(d.a % 10).toBeGreaterThanOrEqual(d.b % 10);
            if (lim.borrow === 'borrow') expect(d.a % 10).toBeLessThan(d.b % 10);
          }
          // صِل الطرح بالتحقق: كل جمع في الصف الثاني يعطي المطروح منه
          if (q.kind === 'matchEqual' && q.d.bottom[0].op === '+')
            q.d.top.forEach((t, i) => expect(q.d.bottom[q.d.pairs[i]]).toMatchObject({ a: t.result, b: t.b, result: t.a }));
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
      if (os === 10) { ten++; expect(q.d.result % 10).toBe(0); }
      if (os > 10) over++;
    }
    expect(ten).toBeGreaterThan(200);
    expect(over).toBeGreaterThan(400);
  });
});

describe('حالات الاستلاف المطلوبة في ch3-lesson2', () => {
  it('يغطي رقمين − رقمين، ورقمين − رقم، وآحاد المطروح منه صفر، وناتج العشرات صفر', () => {
    const r = new Rng(9);
    const seen = { twoTwo: 0, twoOne: 0, onesZero: 0, tensZero: 0 };
    for (let i = 0; i < 1000; i++) {
      const q = generate({ lessonId: 'ch3-lesson2', kind: 'vgrid', seed: r.int(1, 2 ** 31 - 1) });
      if (q.kind !== 'vgrid') continue;
      const { a, b } = q.d;
      if (b >= 10) seen.twoTwo++;
      else seen.twoOne++;
      if (a % 10 === 0) seen.onesZero++;
      if (a - b < 10) seen.tensZero++;
    }
    for (const [k, n] of Object.entries(seen)) expect(n, k).toBeGreaterThan(80);
  });
});
