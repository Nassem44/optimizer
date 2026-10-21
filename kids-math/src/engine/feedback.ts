import type { AddData, Lesson, Question, Verdict } from './types';
import { ar, fill, ones, tens } from './digits';
import { DEFAULT_HINTS } from './errors';
import { compareAnswer, readAnswer, CONCEPT_CHOICES } from './check';

/** التلميح المخصص لنوع الخطأ: من صناديق "خطأ شائع" في الدرس أولاً */
export function hintFor(lesson: Lesson, q: Question, v: Verdict): string {
  if (v.error && v.error !== 'calc') {
    const m = lesson.commonMistakes.find((x) => x.id === v.error);
    const tpl = m?.hint ?? DEFAULT_HINTS[v.error];
    if (tpl) return fill(tpl, v.vars);
  }
  return lesson.hints[q.kind] ?? 'حاول مرة أخرى بهدوء.';
}

function addSteps(d: AddData): string[] {
  const os = ones(d.a) + ones(d.b);
  const steps = [`اجمع الآحاد: ${ar(ones(d.a))} + ${ar(ones(d.b))} = ${ar(os)}`];
  if (os >= 10) steps.push(`اكتب ${ar(os % 10)} تحت الآحاد، وانقل ١ فوق العشرات.`);
  else steps.push(`اكتب ${ar(os)} تحت الآحاد.`);
  const carry = os >= 10 ? ' + ١' : '';
  const ts = tens(d.a) + tens(d.b) + (os >= 10 ? 1 : 0);
  steps.push(`اجمع العشرات: ${ar(tens(d.a))} + ${ar(tens(d.b))}${carry} = ${ar(ts)}`);
  steps.push(`الناتج: ${ar(d.a)} + ${ar(d.b)} = ${ar(d.sum)}`);
  return steps;
}

const countLines = (g: { cats: { name: string }[]; counts: number[] }) => g.cats.map((c, i) => `${c.name}: ${ar(g.counts[i])}`).join('، ');

/** خطوات الحل التي تُعرض بعد المحاولة الثالثة */
export function solutionSteps(q: Question): string[] {
  switch (q.kind) {
    case 'vgrid':
    case 'placeValue':
      return addSteps(q.d);
    case 'freeVertical': {
      const single = q.d.a < 10 ? q.d.a : q.d.b < 10 ? q.d.b : null;
      const first = single != null ? `الرقم ${ar(single)} آحاد، فمكانه تحت الآحاد (العمود الأزرق).` : 'ضع آحاد كل عدد تحت الآحاد، وعشراته تحت العشرات.';
      return [first, ...addSteps(q.d)];
    }
    case 'spotError':
      return [
        q.d.flavor === 'misplaced'
          ? `الخطأ: وضع ${ar(q.d.b)} تحت العشرات، والصحيح تحت الآحاد.`
          : 'الخطأ: نسي أن ينقل ١ إلى العشرات.',
        ...addSteps(q.d),
      ];
    case 'matchEqual':
      return q.d.top.map((t, i) => {
        const b = q.d.bottom[q.d.pairs[i]];
        return `${ar(t.a)} + ${ar(t.b)} = ${ar(b.a)} + ${ar(b.b)} = ${ar(t.sum)}`;
      });
    case 'wordProblem': {
      const s = [`نجمع: ${ar(q.d.a)} + ${ar(q.d.b)} = ${ar(q.d.sum)}`, `الإجابة: ${ar(q.d.sum)} ${q.d.unit}`];
      if (q.d.twoWays) s.splice(1, 0, `أو: ${ar(q.d.b)} + ${ar(q.d.a)} = ${ar(q.d.sum)}`);
      return s;
    }
    case 'fillBlank':
      return [`${ar(q.d.a)} + ${ar(q.d.b)} = ${ar(q.d.b)} + ${ar(q.d.a)}`, 'تغيير ترتيب العددين لا يغيّر الناتج.'];
    case 'countScene':
    case 'completeGraph':
    case 'graphToTable':
      return [countLines(q.d)];
    case 'missingName':
      return [`الصنف الناقص هو ${q.d.cats[q.d.missing].name}: عدده ${ar(q.d.counts[q.d.missing])}.`];
    case 'conceptual':
      return [`${CONCEPT_CHOICES[0]}: نرى العمود الأطول والأقصر بأعيننا مباشرة.`];
    case 'graphRead': {
      const a = readAnswer(q.d);
      const res = a.names ? a.names.join('، ') : ar(a.value!) + (a.yes != null ? (a.yes ? '، ونعم يساوي' : '، ولا يساوي') : '');
      return [countLines(q.d), `الإجابة: ${res}`];
    }
    case 'compareGraphs': {
      const a = compareAnswer(q.d);
      const lines = q.d.groups.map((g, k) => `${g} — ${countLines({ cats: q.d.cats, counts: q.d.counts[k] })}`);
      return [...lines, `الإجابة: ${a.names ? a.names.join('، ') : ar(a.value!)}`];
    }
  }
}
