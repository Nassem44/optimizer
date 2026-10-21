import type { CompareData, CountSceneData, GraphData, GraphReadData, MissingNameData, Question, Response } from '../../engine/types';
import { CONCEPT_CHOICES } from '../../engine/check';
import { h } from '../dom';
import { countSlots, graph, pickPool, table, type PoolMode } from '../graph';
import type { Slot } from '../numpad';
import type { Ctx, KindView } from './types';

function countsResponse(ctx: Ctx, list: Slot[]): Response | null {
  if (list.some((s) => s.value === '')) return null;
  return { kind: 'counts', values: list.map((s) => ctx.slots.num(s)) };
}
function fillCounts(ctx: Ctx, list: Slot[], r: Response) {
  if (r.kind === 'counts') list.forEach((s, i) => ctx.slots.set(s, String(r.values[i] ?? '')));
}

/* ---------- مشهد العدّ: المس الشيء ليُشطب ---------- */

export function countSceneView(q: Question & { d: CountSceneData }, ctx: Ctx): KindView {
  const d = q.d;
  const scene = h('div', { class: 'scene', style: `aspect-ratio:${d.cols}/${d.gridRows}` });
  for (const [cat, slot, jx, jy, rot] of d.items) {
    const col = slot % d.cols, row = Math.floor(slot / d.cols);
    const left = ((col + 0.5 + jx / 100) / d.cols) * 100;
    const top = ((row + 0.5 + jy / 100) / d.gridRows) * 100;
    const it = h('button', { class: 'thing', type: 'button', style: `left:${left}%;top:${top}%;--r:${rot}deg`, 'aria-label': d.cats[cat].name }, d.cats[cat].emoji);
    it.addEventListener('click', () => it.classList.toggle('crossed'));
    scene.append(it);
  }
  const list = countSlots(ctx.slots, d.cats.length);
  ctx.slots.activate(list[0]);
  return {
    el: h('div', { class: 'kind-graph' }, scene, table(d.cats, list)),
    usesNumpad: true,
    read: () => countsResponse(ctx, list),
    reveal: (r) => fillCounts(ctx, list, r),
  };
}

/* ---------- إكمال الرسم البياني ---------- */

export function completeGraphView(q: Question & { d: GraphData }, _ctx: Ctx): KindView {
  const d = q.d;
  const cur = d.cats.map(() => 0);
  const g = graph(d.cats, cur, d.rows, {
    onCell: (i, k) => {
      // لمس الدائرة العليا الملوّنة يلغيها، وأي خانة أخرى تلوّن حتى مستواها (من أسفل لأعلى)
      cur[i] = cur[i] === k + 1 ? k : k + 1;
      g.set(cur);
    },
  });
  return {
    el: h('div', { class: 'kind-graph' }, table(d.cats, d.counts), g.el),
    usesNumpad: false,
    read: () => (cur.every((c) => c === 0) ? null : { kind: 'counts', values: cur.slice() }),
    reveal: (r) => {
      if (r.kind !== 'counts') return;
      r.values.forEach((v, i) => (cur[i] = v ?? 0));
      g.set(cur);
    },
  };
}

/* ---------- من الرسم إلى الجدول ---------- */

export function graphToTableView(q: Question & { d: GraphData }, ctx: Ctx): KindView {
  const d = q.d;
  const list = countSlots(ctx.slots, d.cats.length);
  ctx.slots.activate(list[0]);
  return {
    el: h('div', { class: 'kind-graph' }, graph(d.cats, d.counts, d.rows).el, table(d.cats, list)),
    usesNumpad: true,
    read: () => countsResponse(ctx, list),
    reveal: (r) => fillCounts(ctx, list, r),
  };
}

/* ---------- اسم الصنف الناقص ---------- */

export function missingNameView(q: Question & { d: MissingNameData }, _ctx: Ctx): KindView {
  const d = q.d;
  const pool = pickPool(d.cats, [], 'single');
  return {
    el: h('div', { class: 'kind-graph' }, h('div', { class: 'side' }, graph(d.cats, d.counts, d.rows, { hideLabel: d.missing }).el, table(d.cats, d.counts)), pool.el),
    usesNumpad: false,
    read: () => (pool.picks().length ? { kind: 'pick', picks: pool.picks() } : null),
    reveal: (r) => r.kind === 'pick' && pool.set(r.picks),
  };
}

/* ---------- أسئلة القراءة (رسم واحد أو رسمان) ---------- */

type AnswerShape = { type: 'names'; mode: PoolMode; names: GraphData['cats']; nums: number[] } | { type: 'number' } | { type: 'join' };

function answerArea(ctx: Ctx, shape: AnswerShape) {
  if (shape.type === 'names') {
    const pool = pickPool(shape.names, shape.nums, shape.mode);
    const need = shape.mode === 'pair' ? 2 : shape.mode === 'sequence' ? shape.names.length : 1;
    return {
      el: pool.el, usesNumpad: false,
      read: (): Response | null => (pool.picks().length >= need ? { kind: 'pick', picks: pool.picks() } : null),
      reveal: (r: Response) => r.kind === 'pick' && pool.set(r.picks),
    };
  }
  const s = ctx.slots.make({ max: 2, cls: 'wide', label: 'الإجابة' });
  ctx.slots.activate(s);
  if (shape.type === 'number') {
    return {
      el: h('div', { class: 'answer-num' }, 'الإجابة: ', s.el), usesNumpad: true,
      read: (): Response | null => (s.value === '' ? null : { kind: 'pick', picks: [], value: Number(s.value) }),
      reveal: (r: Response) => r.kind === 'pick' && ctx.slots.set(s, String(r.value)),
    };
  }
  let yes: boolean | null = null;
  const btns = [true, false].map((v) => h('button', { class: 'chip', type: 'button', onclick: () => { yes = v; paint(); } }, v ? 'نعم' : 'لا'));
  const paint = () => btns.forEach((b, i) => b.classList.toggle('selected', yes === (i === 0)));
  return {
    el: h('div', { class: 'answer-num' }, h('div', null, 'يصبح: ', s.el), h('div', { class: 'chips' }, 'هل يساوي؟ ', btns)), usesNumpad: true,
    read: (): Response | null => (s.value === '' || yes == null ? null : { kind: 'pick', picks: [], value: Number(s.value), yes }),
    reveal: (r: Response) => {
      if (r.kind !== 'pick') return;
      ctx.slots.set(s, String(r.value));
      yes = r.yes ?? null;
      paint();
    },
  };
}

export function graphReadView(q: Question & { d: GraphReadData }, ctx: Ctx): KindView {
  const d = q.d;
  const v = d.variant;
  let shape: AnswerShape;
  if (v === 'howMany' || v === 'sum' || v === 'diff') shape = { type: 'number' };
  else if (v === 'join') shape = { type: 'join' };
  else if (v === 'moreOf') shape = { type: 'names', mode: 'single', names: [d.cats[d.x!], d.cats[d.y!]], nums: [d.counts[d.x!], d.counts[d.y!]] };
  else if (v === 'equalPair') shape = { type: 'names', mode: 'pair', names: d.cats, nums: [] };
  else shape = { type: 'names', mode: v === 'orderAsc' || v === 'orderDesc' ? 'sequence' : 'single', names: d.cats, nums: d.counts };
  const ans = answerArea(ctx, shape);
  const visual = d.display === 'table' ? table(d.cats, d.counts) : graph(d.cats, d.counts, d.rows).el;
  return { el: h('div', { class: 'kind-graph' }, visual, ans.el), usesNumpad: ans.usesNumpad, read: ans.read, reveal: ans.reveal };
}

export function conceptualView(q: Question & { d: GraphData }, _ctx: Ctx): KindView {
  const d = q.d;
  const pool = pickPool(CONCEPT_CHOICES, [], 'single');
  return {
    el: h('div', { class: 'kind-graph' }, h('div', { class: 'side' }, graph(d.cats, d.counts, d.rows, { small: true }).el, table(d.cats, d.counts)), pool.el),
    usesNumpad: false,
    read: () => (pool.picks().length ? { kind: 'pick', picks: pool.picks() } : null),
    reveal: (r) => r.kind === 'pick' && pool.set(r.picks),
  };
}

export function compareView(q: Question & { d: CompareData }, ctx: Ctx): KindView {
  const d = q.d;
  const v = d.variant;
  const shape: AnswerShape =
    v === 'sumAcross' || v === 'howMuchMore'
      ? { type: 'number' }
      : { type: 'names', mode: v === 'orderOne' ? 'sequence' : 'single', names: d.cats, nums: v === 'orderOne' || v === 'maxIn' ? d.counts[d.g!] : [] };
  const ans = answerArea(ctx, shape);
  const graphs = h('div', { class: 'side two' }, d.groups.map((g, k) => graph(d.cats, d.counts[k], d.rows, { title: g, small: true }).el));
  return { el: h('div', { class: 'kind-graph' }, graphs, ans.el), usesNumpad: ans.usesNumpad, read: ans.read, reveal: ans.reveal };
}
