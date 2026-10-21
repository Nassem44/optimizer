import type { AddLimits, CompareVariant, GraphLimits, Kind, Lesson, QData, QRef, Question, ReadVariant } from './types';
import { Rng } from './rng';
import { fill } from './digits';
import { SHARED, lessonById } from './content';
import { genAdd, genFillBlank, genMatch, genSpotError, genWord } from './generators/addition';
import { genCompare, genCountScene, genGraph, genGraphRead, genMissingName } from './generators/graph';

export function pickKind(lesson: Lesson, r: Rng): Kind {
  return r.weighted(lesson.questionTypes).kind;
}

const variantsOf = (lesson: Lesson, kind: Kind) => lesson.questionTypes.find((t) => t.kind === kind)?.variants ?? [];

/** يبني السؤال من (الدرس، النوع، البذرة) — نفس المدخلات تعطي نفس السؤال دائماً */
export function generate(ref: QRef): Question {
  const lesson = lessonById(ref.lessonId);
  const r = new Rng(ref.seed);
  const data = build(lesson, ref.kind, r);
  return { ...ref, ...data, prompt: promptFor(data) } as Question;
}

function build(lesson: Lesson, kind: Kind, r: Rng): QData {
  const L = lesson.limits;
  const variants = variantsOf(lesson, kind);
  if (L.op === 'add') {
    const lim = L as AddLimits;
    switch (kind) {
      case 'vgrid':
      case 'placeValue':
      case 'freeVertical':
        return { kind, d: genAdd(lim, r) };
      case 'spotError':
        return { kind, d: genSpotError(lim, r, r.pick([...SHARED.names.m, ...SHARED.names.f])) };
      case 'matchEqual':
        return { kind, d: genMatch(lim, r, variants.includes('commutative')) };
      case 'wordProblem':
        return { kind, d: genWord(lim, r, lesson.wordTemplates ?? [], lesson.units ?? [], SHARED, variants.includes('twoWays')) };
      case 'fillBlank':
        return { kind, d: genFillBlank(lim, r) };
    }
  } else {
    const lim = L as GraphLimits;
    switch (kind) {
      case 'countScene':
        return { kind, d: genCountScene(lim, r, SHARED) };
      case 'completeGraph':
      case 'graphToTable':
      case 'conceptual':
        return { kind, d: genGraph(lim, r, SHARED) };
      case 'missingName':
        return { kind, d: genMissingName(lim, r, SHARED) };
      case 'graphRead':
        return { kind, d: genGraphRead(lim, r, SHARED, variants as ReadVariant[]) };
      case 'compareGraphs':
        return { kind, d: genCompare(lim, r, SHARED, variants as CompareVariant[], lesson.groups ?? [['المجموعة الأولى', 'المجموعة الثانية']]) };
    }
  }
  throw new Error(`النوع ${kind} لا يناسب حدود الدرس ${lesson.id}`);
}

function promptFor(q: QData): string {
  switch (q.kind) {
    case 'vgrid': return 'اجمع بالطريقة الرأسية:';
    case 'placeValue': return 'اجمع باستخدام جدول القيمة المكانية:';
    case 'freeVertical': return 'اسحب كل رقم إلى خانته الصحيحة، ثم اجمع:';
    case 'spotError': return `حلّ ${q.d.who} هذه المسألة وأخطأ. المس الرقم الخطأ، ثم اكتب الناتج الصحيح.`;
    case 'matchEqual':
      return q.d.commutative ? 'صِل كل عملية بالعملية المساوية لها بدون حساب.' : 'صِل كل عملية بالعملية التي لها نفس الناتج.';
    case 'wordProblem': return fill(q.d.text, { a: q.d.a, b: q.d.b });
    case 'fillBlank': return 'أكمل:';
    case 'countScene': return 'عُدّ كل صنف (المس الشيء لتشطب عليه)، ثم اكتب العدد في الجدول.';
    case 'completeGraph': return 'أكمل الرسم البياني: المس الخانات لتلوين الدوائر من أسفل لأعلى.';
    case 'graphToTable': return 'اكتب في الجدول عدد كل صنف من الرسم البياني.';
    case 'missingName': return 'ما اسم الصنف الناقص في الرسم البياني؟';
    case 'conceptual': return 'أيهما أسهل لمعرفة الأكثر والأقل: الرسم البياني أم الجدول؟';
    case 'graphRead': {
      const d = q.d;
      const X = d.x != null ? d.cats[d.x].name : '';
      const Y = d.y != null ? d.cats[d.y].name : '';
      const p: Record<ReadVariant, string> = {
        most: 'أيّ صنف هو الأكثر؟',
        least: 'أيّ صنف هو الأقل؟',
        howMany: `كم عدد ${X}؟`,
        sum: `ما مجموع ${X} و${Y}؟`,
        diff: `ما الفرق بين عدد ${X} وعدد ${Y}؟`,
        moreOf: `أيهما أكثر: ${X} أم ${Y}؟`,
        equalPair: 'أيّ صنفين لهما نفس العدد؟',
        orderAsc: 'رتّب الأصناف من الأقل إلى الأكثر.',
        orderDesc: 'رتّب الأصناف من الأكثر إلى الأقل.',
        join: fill(`إذا انضم {k} إلى ${X}، كم يصبح عددها؟ وهل يساوي عدد ${Y}؟`, { k: d.k ?? 0 }),
      };
      return p[d.variant];
    }
    case 'compareGraphs': {
      const d = q.d;
      const G = d.g != null ? d.groups[d.g] : '';
      const O = d.g != null ? d.groups[1 - d.g] : '';
      const X = d.x != null ? d.cats[d.x].name : '';
      const p: Record<CompareVariant, string> = {
        maxIn: `ما الصنف الأكبر في رسم ${G}؟`,
        sameInBoth: 'أيّ صنف له نفس العدد في الرسمين؟',
        sumAcross: `ما مجموع ${X} في الرسمين معاً؟`,
        howMuchMore: `بكم يزيد عدد ${X} في ${G} عن ${O}؟`,
        biggestDiff: 'أيّ صنف الفرق بين عدديه في الرسمين هو الأكبر؟',
        orderOne: d.asc ? `رتّب أصناف ${G} من الأقل إلى الأكثر.` : `رتّب أصناف ${G} من الأكثر إلى الأقل.`,
      };
      return p[d.variant];
    }
  }
}
