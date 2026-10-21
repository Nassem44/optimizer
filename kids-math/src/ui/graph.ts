// الرسم البياني بالدوائر والجدول. الأصناف تُقرأ من اليمين لليسار، والدوائر تُبنى من أسفل لأعلى.
import type { Category, Pick } from '../engine/types';
import { ar } from '../engine/digits';
import { h } from './dom';
import type { Slot, Slots } from './numpad';

export interface GraphOpts {
  /** لمس الخانة k (٠ = الأسفل) في العمود i */
  onCell?: (i: number, k: number) => void;
  hideLabel?: number;
  title?: string;
  small?: boolean;
}

export function graph(cats: Category[], counts: number[], rows: number, o: GraphOpts = {}) {
  const cols = cats.map((c, i) => {
    const cells = Array.from({ length: rows }, (_, k) =>
      h('div', { class: 'gcell', onclick: o.onCell ? () => o.onCell!(i, k) : null }),
    );
    const label = o.hideLabel === i ? h('div', { class: 'glabel missing' }, h('span', { class: 'emo' }, '❓'), h('span', null, '؟')) : h('div', { class: 'glabel' }, h('span', { class: 'emo' }, c.emoji), h('span', null, c.name));
    return { cells, el: h('div', { class: 'gcol' }, h('div', { class: 'gcells' }, cells), label) };
  });
  const el = h(
    'div', { class: 'graph-box' + (o.small ? ' small' : '') },
    o.title ? h('div', { class: 'gtitle' }, o.title) : null,
    h('div', { class: 'graph' + (o.onCell ? ' editable' : ''), dir: 'rtl', style: `--rows:${rows}` }, cols.map((c) => c.el)),
  );
  const set = (cs: number[]) => cols.forEach((c, i) => c.cells.forEach((cell, k) => cell.classList.toggle('on', k < cs[i])));
  set(counts);
  return { el, set };
}

/** جدول أفقي: صف للأصناف وصف للأعداد (أو خانات إدخال) */
export function table(cats: Category[], values: (number | Slot | null)[], hideName?: number) {
  return h(
    'table', { class: 'gtable', dir: 'rtl' },
    h('tr', null, h('th', null, 'الصنف'), cats.map((c, i) => h('td', null, i === hideName ? '؟' : h('span', null, h('span', { class: 'emo' }, c.emoji), h('br'), c.name)))),
    h('tr', null, h('th', null, 'العدد'), values.map((v) => h('td', null, v == null ? '' : typeof v === 'number' ? ar(v) : v.el))),
  );
}

/** خانات أعداد في جدول، تنتقل تلقائياً للخانة التالية */
export function countSlots(slots: Slots, n: number): Slot[] {
  const list: Slot[] = [];
  for (let i = 0; i < n; i++) list.push(slots.make({ max: 2, cls: 'wide', label: 'العدد', next: () => list[i + 1] ?? null }));
  return list;
}

export type PoolMode = 'single' | 'pair' | 'sequence';

/** بطاقات اختيار: أسماء الأصناف، وقد تضاف أعداد لاكتشاف "رقم بدل الاسم" */
export function pickPool(cats: Category[] | string[], nums: number[], mode: PoolMode, onChange?: () => void) {
  const chosen: { pick: Pick; el: HTMLElement }[] = [];
  const answerRow = h('div', { class: 'answer-row', dir: 'rtl' });
  const mk = (pick: Pick, label: Node | string) => {
    const el = h('button', { class: 'chip' + ('num' in pick ? ' num' : ''), type: 'button' }, label);
    el.addEventListener('click', () => toggle(pick, el));
    return el;
  };
  const picks: Pick[] = [
    ...cats.map((c) => ({ name: typeof c === 'string' ? c : c.name })),
    ...[...new Set(nums)].sort((a, b) => a - b).map((num) => ({ num })),
  ];
  const items = picks.map((p, i) => {
    const c = cats[i];
    if ('num' in p) return mk(p, ar(p.num));
    return mk(p, typeof c === 'string' ? c : h('span', null, h('span', { class: 'emo' }, c.emoji), ' ', c.name));
  });
  const pool = h('div', { class: 'chips' }, items);
  const same = (a: Pick, b: Pick) => ('num' in a && 'num' in b && a.num === b.num) || ('name' in a && 'name' in b && a.name === b.name);

  function toggle(pick: Pick, el: HTMLElement) {
    const idx = chosen.findIndex((c) => same(c.pick, pick));
    if (idx >= 0) {
      chosen.splice(idx, 1);
      el.classList.remove('selected');
      if (mode === 'sequence') pool.append(el);
    } else {
      if (mode === 'single') chosen.splice(0).forEach((c) => c.el.classList.remove('selected'));
      if (mode === 'pair' && chosen.length === 2) chosen.shift()!.el.classList.remove('selected');
      chosen.push({ pick, el });
      el.classList.add('selected');
      if (mode === 'sequence') answerRow.append(el);
    }
    onChange?.();
  }
  const reset = () => [...chosen].forEach((c) => toggle(c.pick, c.el));
  const el = h('div', { class: 'pick' }, mode === 'sequence' ? h('div', { class: 'seq' }, h('span', { class: 'label' }, 'ترتيبك:'), answerRow) : null, pool);
  return {
    el,
    picks: () => chosen.map((c) => c.pick),
    set: (picks: Pick[]) => {
      reset();
      for (const p of picks) {
        const i = picks.findIndex((q) => same(q, p));
        if (i >= 0) toggle(p, items[i]);
      }
    },
  };
}
