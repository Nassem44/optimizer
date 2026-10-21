import type { FillBlankData, MatchData, OpData, Question, SubCheckData, WordData } from '../../engine/types';
import { ar } from '../../engine/digits';
import { h } from '../dom';
import type { Slot } from '../numpad';
import type { Ctx, KindView } from './types';

const opText = (o: OpData) => h('span', { class: 'expr-inline', dir: 'rtl' }, h('span', { dir: 'ltr' }, ar(o.a)), o.op === '+' ? ' + ' : ' − ', h('span', { dir: 'ltr' }, ar(o.b)));

/* ---------- صِل العمليات المتساوية ---------- */

const PAIR_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

export function matchView(q: Question & { d: MatchData }, _ctx: Ctx): KindView {
  const d = q.d;
  const pairs: (number | null)[] = d.top.map(() => null);
  let pendingTop: number | null = null;
  const topEls = d.top.map((t, i) => h('button', { class: 'card match', type: 'button', onclick: () => tapTop(i) }, opText(t)));
  const botEls = d.bottom.map((t, j) => h('button', { class: 'card match', type: 'button', onclick: () => tapBottom(j) }, opText(t)));

  const paint = () => {
    topEls.forEach((el, i) => {
      el.style.borderColor = pairs[i] != null ? PAIR_COLORS[i] : '';
      el.classList.toggle('selected', pendingTop === i);
    });
    botEls.forEach((el, j) => {
      const i = pairs.indexOf(j);
      el.style.borderColor = i >= 0 ? PAIR_COLORS[i] : '';
    });
    [...topEls, ...botEls].forEach((el) => el.classList.toggle('paired', el.style.borderColor !== ''));
  };
  const tapTop = (i: number) => {
    if (pairs[i] != null) pairs[i] = null;
    pendingTop = pendingTop === i ? null : i;
    paint();
  };
  const tapBottom = (j: number) => {
    const owner = pairs.indexOf(j);
    if (owner >= 0) pairs[owner] = null;
    if (pendingTop != null) {
      pairs[pendingTop] = j;
      pendingTop = null;
    }
    paint();
  };
  return {
    el: h('div', { class: 'kind-match' }, h('div', { class: 'match-row' }, topEls), h('div', { class: 'match-hint' }, 'المس عملية من الصف الأول، ثم المساوية لها من الصف الثاني'), h('div', { class: 'match-row' }, botEls)),
    usesNumpad: false,
    read: () => (pairs.every((p) => p != null) ? { kind: 'match', pairs: pairs as number[] } : null),
    reveal: (r) => {
      if (r.kind !== 'match') return;
      r.pairs.forEach((j, i) => (pairs[i] = j));
      pendingTop = null;
      paint();
    },
  };
}

/* ---------- المسألة اللفظية ---------- */

export function wordView(q: Question & { d: WordData }, ctx: Ctx): KindView {
  const d = q.d;
  const { slots } = ctx;
  let op: '+' | '-' | null = null;
  let unit: string | null = null;
  const x: Slot = slots.make({ max: 2, cls: 'wide', label: 'العدد الأول', next: () => y });
  const y: Slot = slots.make({ max: 2, cls: 'wide', label: 'العدد الثاني', next: () => res });
  const res: Slot = slots.make({ max: 3, cls: 'wide', label: 'الناتج', next: () => (d.twoWays ? x2 : null) });
  const x2: Slot | null = d.twoWays ? slots.make({ max: 2, cls: 'wide', label: 'العدد الأول', next: () => y2 }) : null;
  const y2: Slot | null = d.twoWays ? slots.make({ max: 2, cls: 'wide', label: 'العدد الثاني' }) : null;

  const opBtns = (['+', '-'] as const).map((o) =>
    h('button', { class: 'op-btn', type: 'button', onclick: () => { op = o; paintOps(); } }, o === '+' ? '+' : '−'),
  );
  const paintOps = () => opBtns.forEach((b, i) => b.classList.toggle('selected', (i === 0 ? '+' : '-') === op));
  const unitBtns = d.unitChoices.map((u) => h('button', { class: 'chip', type: 'button', onclick: () => { unit = u; paintUnits(); } }, u));
  const paintUnits = () => unitBtns.forEach((b, i) => b.classList.toggle('selected', d.unitChoices[i] === unit));
  const resOut = h('span', { class: 'n' });
  if (res) res.onChange = () => (resOut.textContent = ar(res.value));

  const row1 = h('div', { class: 'expr', dir: 'rtl' }, x.el, h('span', { class: 'ops' }, opBtns), y.el, h('span', { class: 'op' }, '='), res.el);
  const row2 = d.twoWays && x2 && y2 ? h('div', { class: 'expr', dir: 'rtl' }, h('span', { class: 'label' }, 'بطريقة أخرى:'), x2.el, h('span', { class: 'op' }, '+'), y2.el, h('span', { class: 'op' }, '='), resOut) : null;
  slots.activate(x);
  return {
    el: h(
      'div', { class: 'kind-word' },
      h('p', { class: 'story' }, q.prompt),
      h('div', { class: 'step-label' }, 'اكتب العملية:'), row1, row2,
      h('div', { class: 'step-label' }, 'اختر الوحدة:'), h('div', { class: 'chips' }, unitBtns),
    ),
    usesNumpad: true,
    read: () => {
      if (!op || x.value === '' || y.value === '' || res.value === '' || !unit) return null;
      if (d.twoWays && (x2!.value === '' || y2!.value === '')) return null;
      return { kind: 'word', op, x: slots.num(x), y: slots.num(y), result: slots.num(res), unit, x2: x2 ? slots.num(x2) : null, y2: y2 ? slots.num(y2) : null };
    },
    reveal: (r) => {
      if (r.kind !== 'word') return;
      op = r.op;
      unit = r.unit;
      paintOps();
      paintUnits();
      slots.set(x, String(r.x));
      slots.set(y, String(r.y));
      slots.set(res, String(r.result));
      if (x2 && y2) {
        slots.set(x2, String(r.x2));
        slots.set(y2, String(r.y2));
      }
    },
  };
}

/* ---------- أكمل الفراغ (الإبدال) ---------- */

export function fillBlankView(q: Question & { d: FillBlankData }, ctx: Ctx): KindView {
  const { a, b } = q.d;
  const s = ctx.slots.make({ max: 2, cls: 'wide', label: 'الفراغ' });
  ctx.slots.activate(s);
  const n = (v: number) => h('span', { class: 'n', dir: 'ltr' }, ar(v));
  return {
    el: h('div', { class: 'kind-fill' }, h('div', { class: 'expr big', dir: 'rtl' }, n(a), h('span', { class: 'op' }, '+'), n(b), h('span', { class: 'op' }, '='), n(b), h('span', { class: 'op' }, '+'), s.el)),
    usesNumpad: true,
    read: () => (s.value === '' ? null : { kind: 'number', value: Number(s.value) }),
    reveal: (r) => r.kind === 'number' && ctx.slots.set(s, String(r.value)),
  };
}

/* ---------- اطرح ثم تحقق بالجمع ---------- */

export function subCheckView(q: Question & { d: SubCheckData }, ctx: Ctx): KindView {
  const { a, b } = q.d;
  const { slots } = ctx;
  const diff: Slot = slots.make({ max: 2, cls: 'wide', label: 'الفرق', next: () => x });
  const x: Slot = slots.make({ max: 2, cls: 'wide', label: 'التحقق: العدد الأول', next: () => y });
  const y: Slot = slots.make({ max: 2, cls: 'wide', label: 'التحقق: العدد الثاني' });
  const term = (n: Node, label: string) => h('span', { class: 'term' }, n, h('small', null, label));
  const n = (v: number) => h('span', { class: 'n', dir: 'ltr' }, ar(v));
  slots.activate(diff);
  return {
    el: h('div', { class: 'kind-fill' },
      h('div', { class: 'expr big', dir: 'rtl' }, term(n(a), 'المطروح منه'), h('span', { class: 'op' }, '−'), term(n(b), 'المطروح'), h('span', { class: 'op' }, '='), term(diff.el, 'الفرق')),
      h('div', { class: 'step-label' }, 'التحقق: الفرق + المطروح = المطروح منه'),
      h('div', { class: 'expr', dir: 'rtl' }, x.el, h('span', { class: 'op' }, '+'), y.el, h('span', { class: 'op' }, '='), n(a))),
    usesNumpad: true,
    read: () => (diff.value === '' || x.value === '' || y.value === '' ? null : { kind: 'subCheck', diff: slots.num(diff), x: slots.num(x), y: slots.num(y) }),
    reveal: (r) => {
      if (r.kind !== 'subCheck') return;
      slots.set(diff, String(r.diff));
      slots.set(x, String(r.x));
      slots.set(y, String(r.y));
    },
  };
}
