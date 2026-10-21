import type { Question, Response } from './types';
import { hundreds, ones, tens } from './digits';
import { compareAnswer, readAnswer, CONCEPT_CHOICES } from './check';

/** الإجابة الصحيحة بصيغة Response — للاختبارات ولعرض الحل في المكوّن */
export function correctResponse(q: Question): Response {
  const grid = (n: number, carry: boolean): Response => ({
    kind: 'grid', hundreds: n >= 100 ? hundreds(n) : null, tens: n >= 10 ? tens(n) : null, ones: ones(n), carry: carry ? 1 : null,
  });
  switch (q.kind) {
    case 'vgrid':
    case 'placeValue':
      return grid(q.d.sum, q.d.carry);
    case 'freeVertical': {
      const row = (n: number): [number | null, number | null] => [n >= 10 ? tens(n) : null, ones(n)];
      return { kind: 'placement', rows: [row(q.d.a), row(q.d.b)], tens: q.d.sum >= 10 ? tens(q.d.sum) : null, ones: ones(q.d.sum) };
    }
    case 'spotError':
      return { kind: 'spot', cell: q.d.wrongCell, fixed: q.d.sum };
    case 'matchEqual':
      return { kind: 'match', pairs: q.d.pairs.slice() };
    case 'wordProblem':
      return { kind: 'word', op: '+', x: q.d.a, y: q.d.b, result: q.d.sum, unit: q.d.unit, x2: q.d.b, y2: q.d.a };
    case 'fillBlank':
      return { kind: 'number', value: q.d.a };
    case 'countScene':
    case 'completeGraph':
    case 'graphToTable':
      return { kind: 'counts', values: q.d.counts.slice() };
    case 'missingName':
      return { kind: 'pick', picks: [{ name: q.d.cats[q.d.missing].name }] };
    case 'conceptual':
      return { kind: 'pick', picks: [{ name: CONCEPT_CHOICES[0] }] };
    case 'graphRead': {
      const a = readAnswer(q.d);
      return { kind: 'pick', picks: (a.names ?? []).map((name) => ({ name })), value: a.value ?? null, yes: a.yes ?? null };
    }
    case 'compareGraphs': {
      const a = compareAnswer(q.d);
      return { kind: 'pick', picks: (a.names ?? []).map((name) => ({ name })), value: a.value ?? null };
    }
  }
}
