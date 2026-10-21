// الجمع الرأسي. الإطار دائماً dir="ltr": العشرات يساراً (وردي) والآحاد يميناً (أزرق)، و+ على يمين العدد الثاني.
import type { AddData, Question, Response, SpotErrorData } from '../../engine/types';
import { ar, ones, tens } from '../../engine/digits';
import { h } from '../dom';
import { draggable } from '../drag';
import type { Slot } from '../numpad';
import type { Ctx, KindView } from './types';

export type Col = 'h' | 't' | 'o';
const LABEL: Record<Col, string> = { h: 'مئات', t: 'عشرات', o: 'آحاد' };

export const digitCell = (col: Col, digit: number | null, extra = '') =>
  h('div', { class: `vc c-${col} ${extra}`, dataset: { col } }, digit == null ? '' : ar(digit));

/** خانتا العدد: رقم العشرات فارغ إن كان العدد من رقم واحد */
export const numberCells = (n: number): HTMLElement[] => [digitCell('t', n >= 10 ? tens(n) : null), digitCell('o', ones(n))];

/**
 * إطار العملية الرأسية.
 * rows: صفوف الأعداد (خلية لكل عمود من اليسار لليمين). العلامة تُوضع يمين الصف الأخير.
 */
export function vframe(opts: { cols: Col[]; rows: HTMLElement[][]; result: HTMLElement[]; carry?: (HTMLElement | null)[]; sign?: string }): HTMLElement {
  const { cols } = opts;
  const g = h('div', { class: 'vframe', dir: 'ltr', style: `--n:${cols.length}` });
  cols.forEach((c) => g.append(h('div', { class: `vh c-${c}` }, LABEL[c])));
  g.append(h('div'));
  if (opts.carry) {
    opts.carry.forEach((x) => g.append(x ?? h('div', { class: 'carry-space' })));
    g.append(h('div'));
  }
  opts.rows.forEach((r, i) => {
    r.forEach((x) => g.append(x));
    g.append(h('div', { class: 'vsign' }, i === opts.rows.length - 1 ? opts.sign ?? '+' : ''));
  });
  g.append(h('div', { class: 'vline' }));
  opts.result.forEach((x) => g.append(x));
  g.append(h('div'));
  return g;
}

/** خانات الناتج: الآحاد أولاً إلزامياً، ثم العشرات. والحمل في دائرة اختيارية فوق العشرات. */
function resultSlots(ctx: Ctx, withCarry: boolean, before?: () => string | null) {
  const { slots } = ctx;
  const onesS: Slot = slots.make({ cls: 'vc c-o', label: 'آحاد الناتج', guard: before, next: () => tensS });
  const tensS: Slot = slots.make({
    cls: 'vc c-t',
    label: 'عشرات الناتج',
    guard: () => before?.() ?? (onesS.value === '' ? 'ابدأ بالآحاد أولاً 👉' : null),
  });
  const carryS: Slot | null = withCarry
    ? slots.make({ cls: 'carry', label: 'الحمل', guard: () => before?.() ?? (onesS.value === '' ? 'اجمع الآحاد أولاً' : null), next: () => tensS })
    : null;
  return {
    onesS, tensS, carryS,
    read: (): Response | null => {
      if (onesS.value === '') return null;
      return { kind: 'grid', tens: slots.num(tensS), ones: slots.num(onesS), carry: carryS ? slots.num(carryS) : null };
    },
    fill: (r: Response) => {
      if (r.kind !== 'grid' && r.kind !== 'placement') return;
      slots.set(onesS, r.ones == null ? '' : String(r.ones));
      slots.set(tensS, r.tens == null ? '' : String(r.tens));
      if (carryS && r.kind === 'grid' && r.carry != null) slots.set(carryS, String(r.carry));
    },
  };
}

const lessonHasCarry = (ctx: Ctx) => ctx.lesson.limits.op === 'add' && ctx.lesson.limits.carry !== 'none';

export function vgridView(q: Question & { d: AddData }, ctx: Ctx, extraTop?: HTMLElement): KindView {
  const rs = resultSlots(ctx, lessonHasCarry(ctx));
  const frame = vframe({
    cols: ['t', 'o'],
    carry: rs.carryS ? [rs.carryS.el, null] : undefined,
    rows: [numberCells(q.d.a), numberCells(q.d.b)],
    result: [rs.tensS.el, rs.onesS.el],
  });
  ctx.slots.activate(rs.onesS);
  return { el: h('div', { class: 'kind-vertical' }, extraTop, frame), read: rs.read, reveal: rs.fill, usesNumpad: true };
}

/* ---------- جدول القيمة المكانية: أعواد العشرات ومكعبات الآحاد ---------- */

const rods = (n: number) => h('div', { class: 'rods' }, Array.from({ length: n }, () => h('div', { class: 'rod' })));
const cubes = (n: number) => h('div', { class: 'cubes' }, Array.from({ length: n }, () => h('div', { class: 'cube' })));

export function placeValueView(q: Question & { d: AddData }, ctx: Ctx): KindView {
  const { a, b, carry } = q.d;
  const table = h(
    'div',
    { class: 'pv', dir: 'ltr' },
    h('div', { class: 'pvh c-t' }, 'عشرات'), h('div', { class: 'pvh c-o' }, 'آحاد'), h('div'),
    h('div', { class: 'pvc c-t' }, rods(tens(a))), h('div', { class: 'pvc c-o' }, cubes(ones(a))), h('div', { class: 'pvn' }, ar(a)),
    h('div', { class: 'pvc c-t' }, rods(tens(b))), h('div', { class: 'pvc c-o' }, cubes(ones(b))), h('div', { class: 'pvn' }, '+ ' + ar(b)),
  );
  const note = carry ? h('div', { class: 'note' }, 'كل ١٠ مكعبات = عود عشرات واحد ', h('span', { class: 'rod inline' })) : null;
  return vgridView(q, ctx, h('div', { class: 'pv-wrap' }, table, note));
}

/* ---------- عملية أفقية يحوّلها الطفل لرأسية بالسحب ---------- */

export function expr(...parts: (number | string)[]): HTMLElement {
  return h('div', { class: 'expr', dir: 'rtl' }, parts.map((p) => h('span', { class: typeof p === 'number' ? 'n' : 'op', dir: 'ltr' }, typeof p === 'number' ? ar(p) : p)));
}

export function freeVerticalView(q: Question & { d: AddData }, ctx: Ctx): KindView {
  const { a, b } = q.d;
  const pool = h('div', { class: 'pool' });
  let selected: HTMLElement | null = null;
  const cells: HTMLElement[][] = [0, 1].map(() => (['t', 'o'] as const).map((c) => h('div', { class: `vc c-${c} drop` })));
  const tiles: HTMLElement[] = [];

  const placeTile = (tile: HTMLElement, cell: HTMLElement | null) => {
    if (!cell) return;
    const existing = cell.querySelector('.tile') as HTMLElement | null;
    if (existing && existing !== tile) homeOf(existing).append(existing);
    cell.append(tile);
    select(null);
  };
  const homeOf = (tile: HTMLElement) => pool.querySelector(`[data-group="${tile.dataset.group}"]`) as HTMLElement;
  const select = (t: HTMLElement | null) => {
    selected?.classList.remove('selected');
    selected = t;
    t?.classList.add('selected');
  };

  // كل عدد مجموعة أرقام بترتيبها الطبيعي (LTR)، وكل رقم يُسحب وحده
  [a, b].forEach((n, gi) => {
    const group = h('div', { class: 'tile-group', dir: 'ltr', dataset: { group: String(gi) } });
    String(n).split('').forEach((d) => {
      const t = h('div', { class: 'tile', dataset: { digit: d, group: String(gi) } }, ar(d));
      tiles.push(t);
      draggable(t, (target) => placeTile(t, target), () => {
        if (t.parentElement?.classList.contains('drop')) homeOf(t).append(t);
        else select(selected === t ? null : t);
      });
      group.append(t);
    });
    pool.append(group);
  });
  cells.flat().forEach((c) => c.addEventListener('click', (e) => {
    if (selected && e.target === c) placeTile(selected, c);
  }));

  const allPlaced = () => tiles.every((t) => t.parentElement?.classList.contains('drop'));
  const rs = resultSlots(ctx, false, () => (allPlaced() ? null : 'اسحب كل الأرقام إلى خاناتها أولاً'));
  const frame = vframe({ cols: ['t', 'o'], rows: cells, result: [rs.tensS.el, rs.onesS.el] });
  const cellDigit = (c: HTMLElement) => {
    const t = c.querySelector('.tile') as HTMLElement | null;
    return t ? Number(t.dataset.digit) : null;
  };
  return {
    el: h('div', { class: 'kind-vertical' }, expr(a, '+', b), pool, frame),
    usesNumpad: true,
    read: () => {
      if (!allPlaced()) return null;
      const base = rs.read();
      return {
        kind: 'placement',
        rows: cells.map((r) => [cellDigit(r[0]), cellDigit(r[1])] as [number | null, number | null]),
        tens: base?.kind === 'grid' ? base.tens : null,
        ones: base?.kind === 'grid' ? base.ones : null,
      };
    },
    reveal: (r) => {
      if (r.kind !== 'placement') return;
      tiles.forEach((t) => homeOf(t).append(t));
      [a, b].forEach((n, ri) => {
        const group = tiles.filter((t) => t.dataset.group === String(ri));
        if (n >= 10) {
          cells[ri][0].append(group[0]);
          cells[ri][1].append(group[1]);
        } else cells[ri][1].append(group[0]);
      });
      rs.fill(r);
    },
  };
}

/* ---------- اكتشف الخطأ ---------- */

export function spotErrorView(q: Question & { d: SpotErrorData }, ctx: Ctx): KindView {
  const d = q.d;
  let picked: HTMLElement | null = null;
  const pickable = (col: Col, digit: number | null, id: string) => {
    const c = digitCell(col, digit, digit == null ? '' : 'pickable');
    if (digit != null)
      c.addEventListener('click', () => {
        picked?.classList.remove('picked');
        picked = c;
        c.classList.add('picked');
        c.dataset.id = id;
        ctx.slots.activate(fix);
      });
    return c;
  };
  const rowA = [pickable('t', d.a >= 10 ? tens(d.a) : null, 'a-t'), pickable('o', ones(d.a), 'a-o')];
  // الحل الخاطئ: العدد ذو الرقم الواحد مكتوب تحت العشرات
  const rowB = d.flavor === 'misplaced' ? [pickable('t', d.b, 'b-t'), pickable('o', null, 'b-o')] : [pickable('t', d.b >= 10 ? tens(d.b) : null, 'b-t'), pickable('o', ones(d.b), 'b-o')];
  const res = [pickable('t', tens(d.shownSum), 's-t'), pickable('o', ones(d.shownSum), 's-o')];
  const frame = vframe({ cols: ['t', 'o'], rows: [rowA, rowB], result: res });
  const fix = ctx.slots.make({ max: 3, cls: 'wide', label: 'الناتج الصحيح', guard: () => (picked ? null : 'المس الرقم الخطأ أولاً') });
  return {
    el: h('div', { class: 'kind-vertical' }, h('div', { class: 'who' }, `حل ${d.who}:`), frame, h('div', { class: 'fix-row' }, 'الناتج الصحيح: ', fix.el)),
    usesNumpad: true,
    read: () => (picked && fix.value !== '' ? { kind: 'spot', cell: picked.dataset.id!, fixed: Number(fix.value) } : null),
    reveal: (r) => {
      if (r.kind !== 'spot') return;
      frame.querySelectorAll('.pickable').forEach((c) => c.classList.remove('picked'));
      const target = { 'a-t': rowA[0], 'a-o': rowA[1], 'b-t': rowB[0], 'b-o': rowB[1], 's-t': res[0], 's-o': res[1] }[r.cell];
      target?.classList.add('picked', 'wrong-cell');
      ctx.slots.set(fix, String(r.fixed));
    },
  };
}
