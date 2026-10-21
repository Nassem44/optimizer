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
      if (q.d.op === '-' && q.d.regroup)
        return { ...grid(q.d.result, false), borrowTens: tens(q.d.a) - 1, borrowOnes: ones(q.d.a) + 10 } as Response;
      return grid(q.d.result, q.d.regroup);
    case 'freeVertical': {
      const row = (n: number): [number | null, number | null] => [n >= 10 ? tens(n) : null, ones(n)];
      return { kind: 'placement', rows: [row(q.d.a), row(q.d.b)], tens: q.d.result >= 10 ? tens(q.d.result) : null, ones: ones(q.d.result) };
    }
    case 'spotError':
      return { kind: 'spot', cell: q.d.wrongCells[0], fixed: q.d.result };
    case 'matchEqual':
      return { kind: 'match', pairs: q.d.pairs.slice() };
    case 'wordProblem':
      return { kind: 'word', op: q.d.op, x: q.d.a, y: q.d.b, result: q.d.result, unit: q.d.unit, x2: q.d.b, y2: q.d.a };
    case 'subCheck':
      return { kind: 'subCheck', diff: q.d.a - q.d.b, x: q.d.a - q.d.b, y: q.d.b };
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
