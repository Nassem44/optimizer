import { h, shake } from './dom';
import { ar } from '../engine/digits';

/** خانة إدخال رقمية تُكتب فيها الأرقام من لوحة الأرقام الداخلية فقط */
export interface Slot {
  el: HTMLElement;
  max: number;
  value: string; // أرقام لاتينية داخلياً
  /** يُسأل قبل التفعيل؛ يعيد رسالة رفض أو null */
  guard?: () => string | null;
  /** الخانة التالية تلقائياً بعد امتلاء هذه */
  next?: () => Slot | null;
  onChange?: () => void;
  locked?: boolean;
}

export class Slots {
  list: Slot[] = [];
  active: Slot | null = null;
  /** يُستدعى عند رفض التفعيل (مثلاً: ابدأ بالآحاد) */
  onRefuse: (msg: string) => void = () => {};

  /** ينشئ خانة؛ el اختياري لاستخدام عنصر موجود */
  make(opts: { max?: number; cls?: string; el?: HTMLElement; guard?: Slot['guard']; next?: Slot['next']; onChange?: () => void; label?: string }): Slot {
    const el = opts.el ?? h('button', { class: 'slot ' + (opts.cls ?? ''), type: 'button', 'aria-label': opts.label ?? 'خانة' });
    el.classList.add('slot');
    const s: Slot = { el, max: opts.max ?? 1, value: '', guard: opts.guard, next: opts.next, onChange: opts.onChange };
    el.addEventListener('click', () => this.activate(s));
    this.list.push(s);
    return s;
  }

  activate(s: Slot | null) {
    if (s?.locked) return;
    if (s?.guard) {
      const msg = s.guard();
      if (msg) {
        shake(s.el);
        this.onRefuse(msg);
        return;
      }
    }
    this.active?.el.classList.remove('active');
    this.active = s;
    s?.el.classList.add('active');
  }

  set(s: Slot, value: string) {
    s.value = value;
    s.el.textContent = ar(value);
    s.el.classList.toggle('filled', value !== '');
    s.onChange?.();
  }

  input(d: string) {
    const s = this.active;
    if (!s || s.locked) return;
    // الخانة ذات الرقم الواحد: الكتابة تستبدل
    const v = s.max === 1 ? d : (s.value + d).slice(0, s.max);
    this.set(s, v);
    if (v.length >= s.max && s.next) {
      const n = s.next();
      if (n) this.activate(n);
    }
  }

  del() {
    const s = this.active;
    if (!s || s.locked) return;
    this.set(s, s.value.slice(0, -1));
  }

  num(s: Slot): number | null {
    return s.value === '' ? null : Number(s.value);
  }

  lockAll() {
    for (const s of this.list) s.locked = true;
    this.activate(null);
  }
}

/** لوحة أرقام كبيرة بالأرقام الهندية */
export function numpad(getSlots: () => Slots | null, onKey?: () => void): HTMLElement {
  const key = (label: string, fn: () => void, cls = '') =>
    h('button', { class: 'key ' + cls, type: 'button', onclick: () => { fn(); onKey?.(); } }, label);
  const digit = (d: number) => key(ar(d), () => getSlots()?.input(String(d)), 'k' + d);
  return h(
    'div',
    { class: 'numpad', dir: 'ltr' },
    digit(7), digit(8), digit(9),
    digit(4), digit(5), digit(6),
    digit(1), digit(2), digit(3),
    key('⌫', () => getSlots()?.del(), 'del'), digit(0), h('span', { class: 'gap' }),
  );
}
