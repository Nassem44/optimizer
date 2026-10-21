const AR = '٠١٢٣٤٥٦٧٨٩';

/** كل رقم معروض يمر من هنا: 72 → "٧٢" */
export const ar = (v: number | string): string => String(v).replace(/[0-9]/g, (d) => AR[+d]).replace(/-/g, '−');

export const fromAr = (s: string): string => s.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

export const tens = (n: number) => Math.floor(n / 10) % 10;
export const ones = (n: number) => n % 10;
export const hundreds = (n: number) => Math.floor(n / 100) % 10;

/** يملأ {key} في قالب نصي، والأرقام تتحول للهندية */
export function fill(tpl: string, vars: Record<string, string | number> = {}): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? ar(vars[k]) : `{${k}}`));
}
