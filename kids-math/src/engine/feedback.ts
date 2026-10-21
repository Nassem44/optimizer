import type { Lesson, OpData, Question, Verdict } from './types';
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

function subSteps(d: OpData): string[] {
  const [ta, oa, tb, ob] = [tens(d.a), ones(d.a), tens(d.b), ones(d.b)];
  const steps: string[] = [];
  let t = ta, o = oa;
  if (oa < ob) {
    t = ta - 1;
    o = oa + 10;
    steps.push(`لا نستطيع طرح ${ar(ob)} من ${ar(oa)}: نأخذ ١ من العشرات.`);
    steps.push(`اشطب ${ar(ta)} واكتب ${ar(t)} في الدائرة، فتصبح الآحاد ${ar(o)}.`);
  }
  steps.push(`اطرح الآحاد: ${ar(o)} − ${ar(ob)} = ${ar(o - ob)}`);
  steps.push(`اطرح العشرات: ${ar(t)} − ${ar(tb)} = ${ar(t - tb)}` + (t - tb === 0 ? ' (لا نكتب الصفر)' : ''));
  steps.push(`الناتج: ${ar(d.a)} − ${ar(d.b)} = ${ar(d.result)}`);
  return steps;
}

const opSteps = (d: OpData) => (d.op === '+' ? addSteps(d) : subSteps(d));
const sign = (op: '+' | '-') => (op === '+' ? '+' : '−');

function addSteps(d: OpData): string[] {
  const os = ones(d.a) + ones(d.b);
  const steps = [`اجمع الآحاد: ${ar(ones(d.a))} + ${ar(ones(d.b))} = ${ar(os)}`];
  if (os >= 10) steps.push(`اكتب ${ar(os % 10)} تحت الآحاد، وانقل ١ فوق العشرات.`);
  else steps.push(`اكتب ${ar(os)} تحت الآحاد.`);
  const carry = os >= 10 ? ' + ١' : '';
  const ts = tens(d.a) + tens(d.b) + (os >= 10 ? 1 : 0);
  steps.push(`اجمع العشرات: ${ar(tens(d.a))} + ${ar(tens(d.b))}${carry} = ${ar(ts)}`);
  steps.push(`الناتج: ${ar(d.a)} + ${ar(d.b)} = ${ar(d.result)}`);
  return steps;
}

const countLines = (g: { cats: { name: string }[]; counts: number[] }) => g.cats.map((c, i) => `${c.name}: ${ar(g.counts[i])}`).join('، ');

/** خطوات الحل التي تُعرض بعد المحاولة الثالثة */
export function solutionSteps(q: Question): string[] {
  switch (q.kind) {
    case 'vgrid':
    case 'placeValue':
      return opSteps(q.d);
    case 'freeVertical': {
      const single = q.d.a < 10 ? q.d.a : q.d.b < 10 ? q.d.b : null;
      const first = single != null ? `الرقم ${ar(single)} آحاد، فمكانه تحت الآحاد (العمود الأزرق).` : 'ضع آحاد كل عدد تحت الآحاد، وعشراته تحت العشرات.';
      const top = q.d.op === '-' ? [`المطروح منه ${ar(q.d.a)} في الأعلى، والمطروح ${ar(q.d.b)} تحته.`] : [];
      return [...top, first, ...opSteps(q.d)];
    }
    case 'spotError': {
      const what = {
        misplaced: `الخطأ: وضع ${ar(q.d.b)} تحت العشرات، والصحيح تحت الآحاد.`,
        'forgot-carry': 'الخطأ: نسي أن ينقل ١ إلى العشرات.',
        'smaller-from-larger': `الخطأ: طرح ${ar(ones(q.d.a))} من ${ar(ones(q.d.b))} بالعكس، والصحيح أن يأخذ ١ من العشرات.`,
      }[q.d.flavor];
      return [what, ...opSteps(q.d)];
    }
    case 'matchEqual':
      return q.d.top.map((t, i) => {
        const b = q.d.bottom[q.d.pairs[i]];
        return `${ar(t.a)} ${sign(t.op)} ${ar(t.b)} = ${ar(t.result)}  ←  ${ar(b.a)} ${sign(b.op)} ${ar(b.b)} = ${ar(b.result)}`;
      });
    case 'wordProblem': {
      const verb = q.d.op === '+' ? 'نجمع' : 'نطرح';
      const s = [`${verb}: ${ar(q.d.a)} ${sign(q.d.op)} ${ar(q.d.b)} = ${ar(q.d.result)}`, `الإجابة: ${ar(q.d.result)} ${q.d.unit}`];
      if (q.d.twoWays) s.splice(1, 0, `أو: ${ar(q.d.b)} + ${ar(q.d.a)} = ${ar(q.d.result)}`);
      return s;
    }
    case 'subCheck': {
      const diff = q.d.a - q.d.b;
      return [...subSteps({ ...q.d, op: '-', result: diff, regroup: ones(q.d.a) < ones(q.d.b) }), `التحقق: ${ar(diff)} + ${ar(q.d.b)} = ${ar(q.d.a)} ✓ (الفرق + المطروح = المطروح منه)`];
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
