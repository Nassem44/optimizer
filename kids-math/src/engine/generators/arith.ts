// مولّدات الجمع والطرح الرأسي. كل عملية تمر بـ validOp قبل أن تصل للطفل.
import type {
  AddForm, AddLimits, ArithLimits, FillBlankData, MatchData, OpData, Shared, SpotErrorData, SubCheckData, SubForm, SubLimits, WordData, WordTemplate,
} from '../types';
import { Rng } from '../rng';
import { ones, tens } from '../digits';

const twoDigit = (r: Rng) => r.int(1, 9) * 10 + r.int(1, 9); // ليس من مضاعفات العشرة
const oneDigit = (r: Rng) => r.int(1, 9);
const wholeTens = (r: Rng) => r.int(1, 9) * 10;

function addOperands(form: AddForm, r: Rng): [number, number] {
  switch (form) {
    case '2d+1d': return [twoDigit(r), oneDigit(r)];
    case '1d+2d': return [oneDigit(r), twoDigit(r)];
    case '2d+2d': return [twoDigit(r), twoDigit(r)];
    case 'tens+tens': return [wholeTens(r), wholeTens(r)];
    case 'tens+2d': return [wholeTens(r), twoDigit(r)];
    case '2d+tens': return [twoDigit(r), wholeTens(r)];
  }
}

function subOperands(form: SubForm, r: Rng): [number, number] {
  switch (form) {
    case '2d-2d': return [twoDigit(r), twoDigit(r)];
    case '2d-1d': return [twoDigit(r), oneDigit(r)];
    case 'tens-2d': return [wholeTens(r), twoDigit(r)]; // آحاد المطروح منه صفر (٣٠ − ١٧)
  }
}

export const hasCarry = (a: number, b: number) => ones(a) + ones(b) >= 10;
export const needsBorrow = (a: number, b: number) => ones(a) < ones(b);

/** هل العملية داخل حدود الدرس؟ (يستخدمها المولّد والاختبارات) */
export function validOp(a: number, b: number, lim: ArithLimits): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return false;
  if (lim.op === 'add') {
    if (a + b > lim.maxResult) return false;
    const os = ones(a) + ones(b);
    const ts = tens(a) + tens(b);
    const noCarry = os <= 9 && ts <= 9;
    const carry = os >= 10 && ts + 1 <= 9;
    if (lim.carry === 'none') return noCarry;
    if (lim.carry === 'carry') return carry;
    return noCarry || carry;
  }
  if (a > lim.maxMinuend || a - b < lim.minResult) return false;
  if (lim.borrow === 'any') return true;
  return lim.borrow === 'borrow' ? needsBorrow(a, b) : !needsBorrow(a, b);
}

export const mkOp = (a: number, b: number, op: '+' | '-' = '+'): OpData =>
  op === '+' ? { a, b, op, result: a + b, regroup: hasCarry(a, b) } : { a, b, op, result: a - b, regroup: needsBorrow(a, b) };

export function genOp(lim: ArithLimits, r: Rng, forms?: (AddForm | SubForm)[]): OpData {
  const pool = (forms ?? lim.forms) as (AddForm | SubForm)[];
  if (lim.op === 'add') {
    const wantOnes10 = lim.carry === 'carry' && r.next() < (lim.ones10Share ?? 0);
    for (let i = 0; i < 2000; i++) {
      const [a, b] = addOperands(r.pick(pool) as AddForm, r);
      if (!validOp(a, b, lim)) continue;
      if (wantOnes10 && ones(a) + ones(b) !== 10) continue;
      return mkOp(a, b, '+');
    }
  } else {
    const wantTensZero = lim.borrow === 'borrow' && r.next() < (lim.tensZeroShare ?? 0);
    for (let i = 0; i < 4000; i++) {
      const [a, b] = subOperands(r.pick(pool) as SubForm, r);
      if (!validOp(a, b, lim)) continue;
      if (wantTensZero && a - b >= 10) continue;
      return mkOp(a, b, '-');
    }
  }
  throw new Error('genOp: لا توجد عملية تحقق الحدود ' + JSON.stringify(lim));
}

export function genSpotError(lim: ArithLimits, r: Rng, who: string): SpotErrorData {
  if (lim.op === 'add' && lim.carry === 'carry') {
    const d = genOp(lim, r);
    return { ...d, who, flavor: 'forgot-carry', shownSum: d.result - 10, wrongCells: ['s-t'] };
  }
  if (lim.op === 'sub' && lim.borrow === 'borrow') {
    // خطأ متوقع: طرح الصغير من الكبير في الآحاد (٤٢ − ١٨ = ٣٦)
    for (let i = 0; i < 2000; i++) {
      const d = genOp(lim, r);
      const shown = (tens(d.a) - tens(d.b)) * 10 + Math.abs(ones(d.a) - ones(d.b));
      if (tens(d.a) > tens(d.b)) return { ...d, who, flavor: 'smaller-from-larger', shownSum: shown, wrongCells: ['s-o', 's-t'] };
    }
  }
  // الخطأ الشائع في الكتاب: العدد ذو الرقم الواحد تحت العشرات (٢١ + ٤ = ٦١، ٧٥ − ٥ = ٢٥)
  const form = lim.op === 'add' ? '2d+1d' : '2d-1d';
  for (let i = 0; i < 2000; i++) {
    const d = genOp(lim, r, [form]);
    const shown = d.op === '+' ? d.a + d.b * 10 : d.a - d.b * 10;
    if (shown < 100 && shown >= 0) return { ...d, who, flavor: 'misplaced', shownSum: shown, wrongCells: ['b-t'] };
  }
  throw new Error('genSpotError');
}

export function genMatch(lim: ArithLimits, r: Rng, mode: 'equal' | 'commutative' | 'check'): MatchData {
  const top: OpData[] = [];
  const bottom: OpData[] = [];
  const results = new Set<number>();
  let guard = 0;
  while (top.length < 4) {
    if (++guard > 5000) throw new Error('genMatch');
    const t = genOp(lim, r);
    if (results.has(t.result) || t.a === t.b) continue;
    let partner: OpData | null = null;
    if (mode === 'commutative') partner = mkOp(t.b, t.a, '+');
    // عملية الجمع التي تتحقق من الطرح: الفرق + المطروح = المطروح منه
    else if (mode === 'check') partner = mkOp(t.result, t.b, '+');
    else {
      for (let j = 0; j < 300 && !partner; j++) {
        const c = genOp(lim, r);
        const same = (c.a === t.a && c.b === t.b) || (t.op === '+' && c.a === t.b && c.b === t.a);
        if (c.result === t.result && !same) partner = c;
      }
    }
    if (!partner) continue;
    results.add(t.result);
    top.push(t);
    bottom.push(partner);
  }
  const order = r.shuffle([0, 1, 2, 3]);
  const shuffled = order.map((i) => bottom[i]);
  const pairs = top.map((_, i) => order.indexOf(i));
  return { top, bottom: shuffled, pairs, commutative: mode === 'commutative' };
}

export function genWord(lim: ArithLimits, r: Rng, templates: WordTemplate[], units: string[], shared: Shared, twoWays: boolean): WordData {
  const op = lim.op === 'add' ? '+' : '-';
  const d = genOp(lim, r);
  const t = r.pick(templates.filter((x) => x.op === op));
  const name = r.pick(shared.names[t.gender]);
  const text = t.text.split('{name}').join(name); // {a} و{b} تُملأ بالأرقام الهندية
  const others = r.shuffle(units.filter((u) => u !== t.unit)).slice(0, 2);
  return { ...d, text, unit: t.unit, unitChoices: r.shuffle([t.unit, ...others]), twoWays };
}

export function genFillBlank(lim: AddLimits, r: Rng): FillBlankData {
  for (;;) {
    const d = genOp(lim, r);
    if (d.a !== d.b) return { a: d.a, b: d.b };
  }
}

export function genSubCheck(lim: SubLimits, r: Rng): SubCheckData {
  const d = genOp(lim, r);
  return { a: d.a, b: d.b };
}
