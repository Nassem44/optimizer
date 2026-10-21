/** مولّد عشوائي بذرة (mulberry32) — نفس البذرة تعطي نفس السؤال، فتعود أسئلة المراجعة كما هي */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** عدد صحيح بين min و max شاملاً */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  weighted<T extends { weight: number }>(arr: readonly T[]): T {
    const total = arr.reduce((s, x) => s + x.weight, 0);
    let r = this.next() * total;
    for (const x of arr) if ((r -= x.weight) < 0) return x;
    return arr[arr.length - 1];
  }
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;
