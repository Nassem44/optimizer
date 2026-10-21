import type { CompareData, GraphData, GraphReadData, OpData, Pick, Question, Response, Verdict } from './types';
import { ones, tens } from './digits';

/* ---------------- الجمع ---------------- */

const reverse2 = (n: number) => (n % 10) * 10 + Math.floor(n / 10);

/** يشخّص إجابة خاطئة لعملية جمع a + b */
export function diagnoseAdd(a: number, b: number, ans: number | null): Verdict {
  const sum = a + b;
  const os = ones(a) + ones(b);
  const ts = tens(a) + tens(b);
  const single = a < 10 ? a : b < 10 ? b : null;
  const vars = { a, b, answer: ans ?? '', correct: sum, onesSum: os, onesDigit: os % 10, digit: single ?? '' };
  if (ans === sum) return { correct: true };
  if (ans == null) return { correct: false, error: 'calc', vars };
  const v = (error: Verdict['error']): Verdict => ({ correct: false, error, vars });
  if (single !== null && ans === (single === a ? b : a) + single * 10) return v('ones-under-tens');
  if (os >= 10 && ans === sum - 10) return v('forgot-carry');
  if (os >= 10 && ans === Number(`${ts}${os}`)) return v('full-ones-sum');
  if (sum >= 10 && sum < 100 && ones(sum) !== 0 && ones(sum) !== tens(sum) && ans === reverse2(sum)) return v('reversed-digits');
  if (ans === os % 10 || ans === os) return v('forgot-tens');
  if (sum >= 10 && ans % 10 === sum % 10 && (Math.floor(ans / 10) === tens(a) || Math.floor(ans / 10) === tens(b))) return v('forgot-tens');
  if (ans === ts * 10) return v('forgot-ones');
  if (ans === Math.abs(a - b)) return v('wrong-operation');
  return v('calc');
}

/** يشخّص إجابة خاطئة لعملية طرح a − b */
export function diagnoseSub(a: number, b: number, ans: number | null): Verdict {
  const diff = a - b;
  const single = b < 10 ? b : null;
  const vars = { a, b, answer: ans ?? '', correct: diff, digit: single ?? '', onesA: ones(a), onesB: ones(b), tensA: tens(a), newTens: tens(a) - 1, newOnes: ones(a) + 10 };
  if (ans === diff) return { correct: true };
  if (ans == null) return { correct: false, error: 'calc', vars };
  const v = (error: Verdict['error']): Verdict => ({ correct: false, error, vars });
  if (single !== null && ans === a - single * 10) return v('ones-under-tens');
  if (ones(a) < ones(b)) {
    if (ans === (tens(a) - tens(b)) * 10 + (ones(b) - ones(a))) return v('smaller-from-larger');
    if (ans === (tens(a) - tens(b)) * 10 + (ones(a) + 10 - ones(b))) return v('borrow-no-decrease');
  }
  if (diff >= 10 && diff < 100 && ones(diff) !== 0 && ones(diff) !== tens(diff) && ans === reverse2(diff)) return v('reversed-digits');
  if (diff >= 10 && ans === ones(diff)) return v('forgot-tens');
  if (ans === a + b) return v('wrong-operation');
  return v('calc');
}

export const diagnose = (d: Omit<OpData, 'result' | 'regroup'>, ans: number | null) => (d.op === '+' ? diagnoseAdd(d.a, d.b, ans) : diagnoseSub(d.a, d.b, ans));

const gridValue = (h: number | null | undefined, t: number | null, o: number | null) =>
  o == null ? null : (h ?? 0) * 100 + (t ?? 0) * 10 + o;

/* ---------------- الرسوم البيانية ---------------- */

const isNum = (p: Pick): p is { num: number } => 'num' in p;
const nameOf = (p: Pick) => (isNum(p) ? null : p.name);

function argExt(counts: number[], max: boolean) {
  const ext = max ? Math.max(...counts) : Math.min(...counts);
  return counts.indexOf(ext);
}

function sortedNames(g: { cats: { name: string }[] }, counts: number[], asc: boolean): string[] {
  return counts
    .map((c, i) => ({ c, n: g.cats[i].name }))
    .sort((p, q) => (asc ? p.c - q.c : q.c - p.c))
    .map((x) => x.n);
}

/** فحص "اختيار اسم واحد" مع اكتشاف الرقم بدل الاسم وخلط الأكبر/الأقل */
function checkName(picks: Pick[], correct: string, opposite?: string): Verdict {
  if (picks.length !== 1) return { correct: false, error: 'calc' };
  if (isNum(picks[0])) return { correct: false, error: 'number-instead-of-name' };
  if (picks[0].name === correct) return { correct: true };
  if (opposite && picks[0].name === opposite) return { correct: false, error: 'more-less-confusion' };
  return { correct: false, error: 'calc' };
}

function checkOrder(picks: Pick[], expected: string[]): Verdict {
  if (picks.some(isNum)) return { correct: false, error: 'number-instead-of-name' };
  const got = picks.map(nameOf);
  if (got.length === expected.length && got.every((n, i) => n === expected[i])) return { correct: true };
  if (got.length === expected.length && got.every((n, i) => n === expected[expected.length - 1 - i]))
    return { correct: false, error: 'more-less-confusion' };
  return { correct: false, error: 'wrong-order', vars: { start: expected[0] } };
}

function checkNumber(value: number | null | undefined, expected: number, opposite?: number): Verdict {
  if (value === expected) return { correct: true };
  if (value == null) return { correct: false, error: 'calc' };
  if (opposite != null && value === opposite && opposite !== expected) return { correct: false, error: 'wrong-operation' };
  if (Math.abs(value - expected) === 1) return { correct: false, error: 'count-off-by-one' };
  return { correct: false, error: 'calc' };
}

function checkCounts(g: GraphData, values: (number | null)[]): Verdict {
  const wrong = g.counts.map((c, i) => (values[i] === c ? -1 : i)).filter((i) => i >= 0);
  if (!wrong.length) return { correct: true };
  const vars = { name: g.cats[wrong[0]].name };
  const offByOne = wrong.every((i) => values[i] != null && Math.abs(values[i]! - g.counts[i]) === 1);
  return { correct: false, error: offByOne ? 'count-off-by-one' : 'calc', vars };
}

export function readAnswer(d: GraphReadData): { names?: string[]; value?: number; yes?: boolean; opposite?: string; oppositeValue?: number } {
  const c = d.counts;
  const N = (i: number) => d.cats[i].name;
  switch (d.variant) {
    case 'most': return { names: [N(argExt(c, true))], opposite: N(argExt(c, false)) };
    case 'least': return { names: [N(argExt(c, false))], opposite: N(argExt(c, true)) };
    case 'howMany': return { value: c[d.x!] };
    case 'sum': return { value: c[d.x!] + c[d.y!], oppositeValue: Math.abs(c[d.x!] - c[d.y!]) };
    case 'diff': return { value: Math.abs(c[d.x!] - c[d.y!]), oppositeValue: c[d.x!] + c[d.y!] };
    case 'moreOf': {
      const [big, small] = c[d.x!] > c[d.y!] ? [d.x!, d.y!] : [d.y!, d.x!];
      return { names: [N(big)], opposite: N(small) };
    }
    case 'equalPair': {
      const i = c.findIndex((x, k) => c.indexOf(x) !== k);
      return { names: [N(c.indexOf(c[i])), N(i)] };
    }
    case 'orderAsc': return { names: sortedNames(d, c, true) };
    case 'orderDesc': return { names: sortedNames(d, c, false) };
    case 'join': return { value: c[d.x!] + d.k!, yes: c[d.x!] + d.k! === c[d.y!] };
  }
}

export function compareAnswer(d: CompareData): { names?: string[]; value?: number; opposite?: string; oppositeValue?: number } {
  const [c0, c1] = d.counts;
  const N = (i: number) => d.cats[i].name;
  switch (d.variant) {
    case 'maxIn': return { names: [N(argExt(d.counts[d.g!], true))], opposite: N(argExt(d.counts[d.g!], false)) };
    case 'sameInBoth': return { names: [N(c0.findIndex((x, i) => x === c1[i]))] };
    case 'sumAcross': return { value: c0[d.x!] + c1[d.x!], oppositeValue: Math.abs(c0[d.x!] - c1[d.x!]) };
    case 'howMuchMore': return { value: Math.abs(c0[d.x!] - c1[d.x!]), oppositeValue: c0[d.x!] + c1[d.x!] };
    case 'biggestDiff': {
      const diffs = c0.map((x, i) => Math.abs(x - c1[i]));
      return { names: [N(argExt(diffs, true))] };
    }
    case 'orderOne': return { names: sortedNames(d, d.counts[d.g!], !!d.asc) };
  }
}

export const CONCEPT_CHOICES = ['الرسم البياني', 'الجدول'];

/* ---------------- نقطة الدخول ---------------- */

export function check(q: Question, r: Response): Verdict {
  switch (q.kind) {
    case 'vgrid':
    case 'placeValue': {
      if (r.kind !== 'grid') break;
      return diagnose(q.d, gridValue(r.hundreds, r.tens, r.ones));
    }
    case 'freeVertical': {
      if (r.kind !== 'placement') break;
      const { a, b } = q.d;
      const vals = r.rows.map(([t, o]) => (t == null && o == null ? null : (t ?? 0) * 10 + (o ?? 0)));
      const sorted = (xs: (number | null)[]) => xs.slice().sort((x, y) => (x ?? -1) - (y ?? -1)).join();
      if (sorted(vals) !== sorted([a, b])) {
        const single = a < 10 ? a : b < 10 ? b : null;
        if (single != null && r.rows.some(([t, o]) => t === single && o == null))
          return { correct: false, error: 'ones-under-tens', vars: { digit: single } };
        if (vals.some((v) => v != null && (v === reverse2(a) || v === reverse2(b))))
          return { correct: false, error: 'reversed-digits', vars: { answer: '' } };
        return { correct: false, error: 'calc' };
      }
      // في الطرح: المطروح منه في الأعلى
      if (q.d.op === '-' && vals[0] !== a) return { correct: false, error: 'bigger-on-top', vars: { a, b } };
      return diagnose(q.d, gridValue(null, r.tens, r.ones));
    }
    case 'spotError': {
      if (r.kind !== 'spot') break;
      if (!q.d.wrongCells.includes(r.cell)) {
        const shown = diagnose(q.d, q.d.shownSum);
        return { correct: false, error: shown.error, vars: shown.vars };
      }
      return diagnose(q.d, r.fixed);
    }
    case 'matchEqual': {
      if (r.kind !== 'match') break;
      const bad = q.d.pairs.findIndex((p, i) => r.pairs[i] !== p);
      if (bad < 0) return { correct: true };
      const t = q.d.top[bad];
      return { correct: false, error: q.d.commutative ? 'swapped-not-equal' : 'calc', vars: { a: t.a, b: t.b } };
    }
    case 'wordProblem': {
      if (r.kind !== 'word') break;
      const { a, b } = q.d;
      if (r.op && r.op !== q.d.op) return { correct: false, error: 'wrong-operation' };
      if (q.d.op === '-' && r.x === b && r.y === a) return { correct: false, error: 'bigger-on-top', vars: { a, b } };
      const operandsOk = (x: number | null | undefined, y: number | null | undefined) => (x === a && y === b) || (q.d.op === '+' && x === b && y === a);
      if (r.op !== q.d.op || !operandsOk(r.x, r.y)) return { correct: false, error: 'calc', vars: { a, b } };
      const v = diagnose(q.d, r.result);
      if (!v.correct) return v;
      if (r.unit !== q.d.unit) return { correct: false, error: 'wrong-unit' };
      if (q.d.twoWays && !(r.x2 === r.y && r.y2 === r.x)) return { correct: false, error: 'swapped-not-equal', vars: { a: r.x!, b: r.y! } };
      return { correct: true };
    }
    case 'fillBlank': {
      if (r.kind !== 'number') break;
      if (r.value === q.d.a) return { correct: true };
      return { correct: false, error: r.value === q.d.b || r.value === q.d.a + q.d.b ? 'swapped-not-equal' : 'calc', vars: { a: q.d.a, b: q.d.b } };
    }
    case 'subCheck': {
      if (r.kind !== 'subCheck') break;
      const { a, b } = q.d;
      const v = diagnoseSub(a, b, r.diff);
      if (!v.correct) return v;
      // التحقق: الفرق + المطروح = المطروح منه (بأي ترتيب)
      if ((r.x === a - b && r.y === b) || (r.x === b && r.y === a - b)) return { correct: true };
      return { correct: false, error: 'check-wrong', vars: { a, b, correct: a - b } };
    }
    case 'countScene':
    case 'graphToTable':
    case 'completeGraph': {
      if (r.kind !== 'counts') break;
      return checkCounts(q.d, r.values);
    }
    case 'missingName': {
      if (r.kind !== 'pick') break;
      return checkName(r.picks, q.d.cats[q.d.missing].name);
    }
    case 'conceptual': {
      if (r.kind !== 'pick') break;
      return checkName(r.picks, CONCEPT_CHOICES[0]);
    }
    case 'graphRead': {
      if (r.kind !== 'pick') break;
      const ans = readAnswer(q.d);
      if (q.d.variant === 'join') {
        const v = checkNumber(r.value, ans.value!);
        if (!v.correct) return v;
        return r.yes === ans.yes ? { correct: true } : { correct: false, error: 'calc' };
      }
      if (ans.value != null) return checkNumber(r.value, ans.value, ans.oppositeValue);
      if (q.d.variant === 'orderAsc' || q.d.variant === 'orderDesc') return checkOrder(r.picks, ans.names!);
      if (q.d.variant === 'equalPair') {
        if (r.picks.some(isNum)) return { correct: false, error: 'number-instead-of-name' };
        const got = r.picks.map(nameOf).sort().join();
        return got === ans.names!.slice().sort().join() ? { correct: true } : { correct: false, error: 'calc' };
      }
      return checkName(r.picks, ans.names![0], ans.opposite);
    }
    case 'compareGraphs': {
      if (r.kind !== 'pick') break;
      const ans = compareAnswer(q.d);
      if (ans.value != null) return checkNumber(r.value, ans.value, ans.oppositeValue);
      if (q.d.variant === 'orderOne') return checkOrder(r.picks, ans.names!);
      return checkName(r.picks, ans.names![0], ans.opposite);
    }
  }
  throw new Error(`إجابة من نوع ${r.kind} لا تناسب سؤال ${q.kind}`);
}
