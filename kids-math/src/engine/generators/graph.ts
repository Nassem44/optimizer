import type {
  Category, CompareData, CompareVariant, CountSceneData, GraphData, GraphLimits, GraphReadData, MissingNameData, ReadVariant, Shared,
} from '../types';
import { Rng } from '../rng';

function theme(shared: Shared, r: Rng, n: number): { theme: string; cats: Category[] } {
  const t = r.pick(shared.themes.filter((x) => x.items.length >= n));
  return { theme: t.title, cats: r.shuffle(t.items).slice(0, n) };
}

const distinct = (xs: number[]) => new Set(xs).size === xs.length;
const uniqueMax = (xs: number[]) => xs.filter((x) => x === Math.max(...xs)).length === 1;
const uniqueMin = (xs: number[]) => xs.filter((x) => x === Math.min(...xs)).length === 1;
/** صنفان فقط لهما نفس العدد، والباقي مختلف */
const exactlyOnePair = (xs: number[]) => xs.length - new Set(xs).size === 1 && !xs.some((x) => xs.filter((y) => y === x).length > 2);

function counts(lim: GraphLimits, r: Rng, n: number, ok: (c: number[]) => boolean): number[] {
  for (let i = 0; i < 5000; i++) {
    const c = Array.from({ length: n }, () => r.int(lim.minCount, lim.maxCount));
    if (ok(c)) return c;
  }
  throw new Error('graph counts: لا يوجد توزيع مناسب');
}

const nCats = (lim: GraphLimits, r: Rng) => r.int(lim.minCategories, lim.maxCategories);

export function genGraph(lim: GraphLimits, r: Rng, shared: Shared, ok: (c: number[]) => boolean = () => true): GraphData {
  const n = nCats(lim, r);
  const t = theme(shared, r, n);
  return { ...t, counts: counts(lim, r, n, ok), rows: lim.maxRows };
}

export function genCountScene(lim: GraphLimits, r: Rng, shared: Shared): CountSceneData {
  const g = genGraph(lim, r, shared);
  const total = g.counts.reduce((s, x) => s + x, 0);
  const cols = 10;
  const gridRows = Math.ceil((total * 1.25) / cols);
  const slots = r.shuffle(Array.from({ length: cols * gridRows }, (_, i) => i));
  const items: CountSceneData['items'] = [];
  let k = 0;
  g.counts.forEach((c, cat) => {
    for (let i = 0; i < c; i++) items.push([cat, slots[k++], r.int(-15, 15), r.int(-15, 15), r.int(-20, 20)]);
  });
  return { ...g, items, cols, gridRows };
}

export function genMissingName(lim: GraphLimits, r: Rng, shared: Shared): MissingNameData {
  const g = genGraph(lim, r, shared, distinct);
  return { ...g, missing: r.int(0, g.counts.length - 1), showTable: true };
}

export function genGraphRead(lim: GraphLimits, r: Rng, shared: Shared, variants: ReadVariant[]): GraphReadData {
  const variant = r.pick(variants);
  const display: 'graph' | 'table' = r.next() < 0.25 ? 'table' : 'graph';
  const ok: Record<ReadVariant, (c: number[]) => boolean> = {
    most: uniqueMax,
    least: uniqueMin,
    howMany: () => true,
    sum: () => true,
    diff: (c) => new Set(c).size > 1,
    moreOf: (c) => new Set(c).size > 1,
    equalPair: exactlyOnePair,
    orderAsc: distinct,
    orderDesc: distinct,
    join: () => true,
  };
  const g = genGraph(lim, r, shared, ok[variant]);
  const n = g.counts.length;
  const d: GraphReadData = { ...g, variant, display };
  const two = (): [number, number] => {
    for (;;) {
      const x = r.int(0, n - 1);
      const y = r.int(0, n - 1);
      if (x !== y && (variant === 'sum' || g.counts[x] !== g.counts[y])) return [x, y];
    }
  };
  if (variant === 'howMany') d.x = r.int(0, n - 1);
  if (variant === 'sum' || variant === 'moreOf') [d.x, d.y] = two();
  if (variant === 'diff') {
    const [x, y] = two();
    [d.x, d.y] = g.counts[x] > g.counts[y] ? [x, y] : [y, x];
  }
  if (variant === 'join') {
    const amounts = lim.joinAmounts ?? [1, 2, 3];
    d.x = r.int(0, n - 1);
    // نصف الأسئلة إجابتها "نعم" (يصبح مساوياً لصنف آخر)
    const yesTargets = g.counts.map((c, i) => i).filter((i) => i !== d.x && amounts.includes(g.counts[i] - g.counts[d.x!]));
    if (yesTargets.length && r.next() < 0.5) {
      d.y = r.pick(yesTargets);
      d.k = g.counts[d.y] - g.counts[d.x];
    } else {
      d.k = r.pick(amounts);
      d.y = r.pick(g.counts.map((_, i) => i).filter((i) => i !== d.x));
    }
  }
  return d;
}

export function genCompare(lim: GraphLimits, r: Rng, shared: Shared, variants: CompareVariant[], groupsList: [string, string][]): CompareData {
  const variant = r.pick(variants);
  const n = nCats(lim, r);
  const t = theme(shared, r, n);
  const groups = r.pick(groupsList);
  for (let i = 0; i < 5000; i++) {
    const c0 = Array.from({ length: n }, () => r.int(lim.minCount, lim.maxCount));
    const c1 = Array.from({ length: n }, () => r.int(lim.minCount, lim.maxCount));
    const d: CompareData = { ...t, groups, counts: [c0, c1], rows: lim.maxRows, variant };
    const diffs = c0.map((x, k) => Math.abs(x - c1[k]));
    switch (variant) {
      case 'maxIn':
        d.g = r.pick([0, 1] as const);
        if (!uniqueMax(d.counts[d.g])) continue;
        return d;
      case 'sameInBoth':
        if (diffs.filter((x) => x === 0).length !== 1) continue;
        return d;
      case 'sumAcross':
        d.x = r.int(0, n - 1);
        if (c0[d.x] + c1[d.x] > lim.maxSum) continue;
        return d;
      case 'howMuchMore':
        d.x = r.int(0, n - 1);
        if (c0[d.x] === c1[d.x]) continue;
        d.g = c0[d.x] > c1[d.x] ? 0 : 1;
        return d;
      case 'biggestDiff':
        if (!uniqueMax(diffs)) continue;
        return d;
      case 'orderOne':
        d.g = r.pick([0, 1] as const);
        if (!distinct(d.counts[d.g])) continue;
        d.asc = r.next() < 0.5;
        return d;
    }
  }
  throw new Error('genCompare');
}
