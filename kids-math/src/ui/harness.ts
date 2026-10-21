// صفحة تعرض مكوّناً واحداً بمدخلات ثابتة لاختبار العرض في متصفح حقيقي (tests/ui).
import { lessonById } from '../engine/content';
import { generate } from '../engine/generate';
import { mkOp } from '../engine/generators/arith';
import type { Kind, Question } from '../engine/types';
import { h } from './dom';
import { Slots, numpad } from './numpad';
import { viewFor } from './kinds';

export function harness(hash: string): HTMLElement {
  const p = new URLSearchParams(hash.split('?')[1] ?? '');
  const lessonId = p.get('lesson') ?? 'ch2-lesson1';
  const kind = (p.get('kind') ?? 'vgrid') as Kind;
  let q: Question = generate({ lessonId, kind, seed: Number(p.get('seed') ?? 1) });
  if (p.has('a') && (q.kind === 'vgrid' || q.kind === 'placeValue' || q.kind === 'freeVertical')) {
    q = { ...q, d: mkOp(Number(p.get('a')), Number(p.get('b')), q.d.op) } as Question;
  }
  const slots = new Slots();
  const view = viewFor(q, { lesson: lessonById(lessonId), slots, say: () => {} });
  return h('div', { class: 'screen session harness' },
    h('div', { class: 'stage with-pad' }, h('div', { class: 'qcol' }, h('main', { class: 'qmain' }, q.kind === 'wordProblem' ? null : h('p', { class: 'prompt' }, q.prompt), view.el)), h('aside', { class: 'padcol' }, numpad(() => slots))));
}
