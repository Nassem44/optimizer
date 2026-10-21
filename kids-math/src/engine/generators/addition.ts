import type { AddData, AddForm, AddLimits, FillBlankData, MatchData, SpotErrorData, WordData, WordTemplate, Shared } from '../types';
import { Rng } from '../rng';
import { tens } from '../digits';

const twoDigit = (r: Rng) => r.int(1, 9) * 10 + r.int(1, 9); // ليس من مضاعفات العشرة
const oneDigit = (r: Rng) => r.int(1, 9);
const wholeTens = (r: Rng) => r.int(1, 9) * 10;

function operands(form: AddForm, r: Rng): [number, number] {
  switch (form) {
    case '2d+1d': return [twoDigit(r), oneDigit(r)];
    case '1d+2d': return [oneDigit(r), twoDigit(r)];
    case '2d+2d': return [twoDigit(r), twoDigit(r)];
    case 'tens+tens': return [wholeTens(r), wholeTens(r)];
    case 'tens+2d': return [wholeTens(r), twoDigit(r)];
    case '2d+tens': return [twoDigit(r), wholeTens(r)];
  }
}

export const hasCarry = (a: number, b: number) => (a % 10) + (b % 10) >= 10;

/** هل العملية داخل حدود الدرس؟ (يستخدمها المولّد والاختبارات) */
export function validAdd(a: number, b: number, lim: AddLimits): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return false;
  if (a + b > lim.maxResult) return false;
  const os = (a % 10) + (b % 10);
  const ts = tens(a) + tens(b);
  const noCarry = os <= 9 && ts <= 9;
  const carry = os >= 10 && ts + 1 <= 9;
  if (lim.carry === 'none') return noCarry;
  if (lim.carry === 'carry') return carry;
  return noCarry || carry;
}

export const mkAdd = (a: number, b: number): AddData => ({ a, b, sum: a + b, carry: hasCarry(a, b) });

export function genAdd(lim: AddLimits, r: Rng, forms: AddForm[] = lim.forms): AddData {
  const wantOnes10 = lim.carry === 'carry' && r.next() < (lim.ones10Share ?? 0);
  for (let i = 0; i < 2000; i++) {
    const [a, b] = operands(r.pick(forms), r);
    if (!validAdd(a, b, lim)) continue;
    if (wantOnes10 && (a % 10) + (b % 10) !== 10) continue;
    return mkAdd(a, b);
  }
  throw new Error('genAdd: لا توجد عملية تحقق الحدود ' + JSON.stringify(lim));
}

export function genSpotError(lim: AddLimits, r: Rng, who: string): SpotErrorData {
  if (lim.carry === 'carry') {
    const d = genAdd(lim, r);
    return { ...d, who, flavor: 'forgot-carry', shownSum: d.sum - 10, wrongCell: 's-t' };
  }
  // الخطأ الشائع في الكتاب: العدد ذو الرقم الواحد تحت العشرات (٢١ + ٤ = ٦١)
  for (let i = 0; i < 2000; i++) {
    const d = genAdd(lim, r, ['2d+1d']);
    const shown = d.a + d.b * 10;
    if (shown < 100) return { ...d, who, flavor: 'misplaced', shownSum: shown, wrongCell: 'b-t' };
  }
  throw new Error('genSpotError');
}

export function genMatch(lim: AddLimits, r: Rng, commutative: boolean): MatchData {
  const top: AddData[] = [];
  const bottom: AddData[] = [];
  const sums = new Set<number>();
  let guard = 0;
  while (top.length < 4) {
    if (++guard > 5000) throw new Error('genMatch');
    const t = genAdd(lim, r);
    if (sums.has(t.sum) || t.a === t.b) continue;
    let partner: AddData | null = null;
    if (commutative) partner = mkAdd(t.b, t.a);
    else {
      for (let j = 0; j < 300 && !partner; j++) {
        const c = genAdd(lim, r);
        const same = (c.a === t.a && c.b === t.b) || (c.a === t.b && c.b === t.a);
        if (c.sum === t.sum && !same) partner = c;
      }
    }
    if (!partner) continue;
    sums.add(t.sum);
    top.push(t);
    bottom.push(partner);
  }
  const order = r.shuffle([0, 1, 2, 3]);
  const shuffled = order.map((i) => bottom[i]);
  const pairs = top.map((_, i) => order.indexOf(i));
  return { top, bottom: shuffled, pairs, commutative };
}

export function genWord(lim: AddLimits, r: Rng, templates: WordTemplate[], units: string[], shared: Shared, twoWays: boolean): WordData {
  const d = genAdd(lim, r);
  const t = r.pick(templates);
  const name = r.pick(shared.names[t.gender]);
  const text = t.text.replace('{name}', name); // {a} و{b} تُملأ عند العرض بالأرقام الهندية
  const others = r.shuffle(units.filter((u) => u !== t.unit)).slice(0, 2);
  return { ...d, text, unit: t.unit, unitChoices: r.shuffle([t.unit, ...others]), twoWays };
}

export function genFillBlank(lim: AddLimits, r: Rng): FillBlankData {
  for (;;) {
    const d = genAdd(lim, r);
    if (d.a !== d.b) return { a: d.a, b: d.b };
  }
}
