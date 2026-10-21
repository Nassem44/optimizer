import type { Lesson, Question, Response } from '../../engine/types';
import type { Slots } from '../numpad';

export interface Ctx {
  lesson: Lesson;
  slots: Slots;
  /** رسالة قصيرة من الشخصية */
  say(msg: string): void;
}

export interface KindView {
  el: HTMLElement;
  /** الإجابة الحالية، أو null إن لم تكتمل */
  read(): Response | null;
  /** يعرض الإجابة الصحيحة داخل المكوّن (بعد المحاولة الثالثة) */
  reveal(r: Response): void;
  usesNumpad: boolean;
}

export type Factory<Q extends Question = Question> = (q: Q, ctx: Ctx) => KindView;
