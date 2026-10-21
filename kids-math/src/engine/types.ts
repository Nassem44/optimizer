// أنواع المحرك. لا شيء هنا يعتمد على DOM.

export type Kind =
  | 'vgrid' //          جمع رأسي في شبكة آحاد/عشرات
  | 'placeValue' //     جدول قيمة مكانية بأعواد ومكعبات ثم الشبكة
  | 'freeVertical' //   عملية أفقية يحوّلها الطفل لرأسية بسحب الأرقام
  | 'spotError' //      اكتشف خطأ طفل آخر وصحّحه
  | 'matchEqual' //     صِل العمليات المتساوية
  | 'wordProblem' //    مسألة لفظية: العملية ثم الإجابة مع الوحدة
  | 'fillBlank' //      أكمل: ٢٤ + ٦٣ = ٦٣ + ...
  | 'countScene' //     مشهد عدّ بالشطب
  | 'completeGraph' //  إكمال الرسم البياني بالدوائر
  | 'graphToTable' //   من الرسم إلى الجدول
  | 'missingName' //    اسم الصنف الناقص
  | 'graphRead' //      أسئلة قراءة الرسم
  | 'conceptual' //     الرسم أم الجدول؟
  | 'compareGraphs'; // رسمان متجاوران

export type ErrorType =
  | 'ones-under-tens'
  | 'reversed-digits'
  | 'forgot-tens'
  | 'forgot-ones'
  | 'forgot-carry'
  | 'full-ones-sum'
  | 'wrong-operation'
  | 'wrong-unit'
  | 'count-off-by-one'
  | 'number-instead-of-name'
  | 'more-less-confusion'
  | 'wrong-order'
  | 'swapped-not-equal'
  | 'calc';

export type AddForm = '2d+1d' | '1d+2d' | '2d+2d' | 'tens+tens' | 'tens+2d' | '2d+tens';

export interface AddLimits {
  op: 'add';
  /** none: مجموع الآحاد ≤ ٩ والعشرات ≤ ٩ — carry: مجموع الآحاد ≥ ١٠ والعشرات مع الحمل ≤ ٩ — any: أيهما */
  carry: 'none' | 'carry' | 'any';
  maxResult: number;
  forms: AddForm[];
  /** للحمل: نسبة الأسئلة التي مجموع آحادها = ١٠ بالضبط (الناتج من مضاعفات العشرة) */
  ones10Share?: number;
}

export interface GraphLimits {
  op: 'graph';
  minCategories: number;
  maxCategories: number;
  minCount: number;
  maxCount: number;
  maxRows: number;
  maxSum: number;
  joinAmounts?: number[];
}

export type Limits = AddLimits | GraphLimits;

export interface WordTemplate {
  text: string; // {name} {a} {b}
  gender: 'm' | 'f';
  unit: string;
  op: '+';
}

export interface CommonMistake {
  id: ErrorType;
  hint: string; // قد يحتوي {digit} {a} {b} {answer} {correct}
  page?: string;
  example?: string;
}

export interface Lesson {
  id: string;
  chapter: number;
  lesson: number;
  order: number;
  title: string;
  subtitle?: string;
  pages?: string;
  skill: string;
  questionTypes: { kind: Kind; weight: number; variants?: string[] }[];
  limits: Limits;
  wordTemplates?: WordTemplate[];
  units?: string[];
  hints: Partial<Record<Kind, string>>;
  commonMistakes: CommonMistake[];
  defaultUnlocked?: boolean;
  /** أسماء المجموعتين في درس مقارنة رسمين */
  groups?: [string, string][];
}

export interface Category {
  name: string;
  emoji: string;
}

export interface Shared {
  names: { m: string[]; f: string[] };
  themes: { title: string; items: Category[] }[];
}

/* ---------- بيانات الأسئلة ---------- */

export interface AddData {
  a: number;
  b: number;
  sum: number;
  carry: boolean;
}

export interface SpotErrorData extends AddData {
  flavor: 'misplaced' | 'forgot-carry';
  shownSum: number;
  /** اسم الطفل الآخر الذي أخطأ */
  who: string;
  /** الخلية التي فيها الخطأ: 'b-t' رقم العدد الثاني الموضوع تحت العشرات، 's-t' عشرات الناتج */
  wrongCell: 'b-t' | 's-t';
}

export interface MatchData {
  top: AddData[];
  bottom: AddData[];
  /** pairs[i] = index في bottom المساوي لـ top[i] */
  pairs: number[];
  commutative: boolean;
}

export interface WordData extends AddData {
  text: string;
  unit: string;
  unitChoices: string[];
  twoWays: boolean;
}

export interface FillBlankData {
  a: number;
  b: number;
}

export interface GraphData {
  theme: string;
  cats: Category[];
  counts: number[];
  rows: number;
}

export type ReadVariant =
  | 'most'
  | 'least'
  | 'howMany'
  | 'sum'
  | 'diff'
  | 'moreOf'
  | 'equalPair'
  | 'orderAsc'
  | 'orderDesc'
  | 'join';

export interface GraphReadData extends GraphData {
  variant: ReadVariant;
  x?: number; // index صنف
  y?: number;
  k?: number; // قيمة الانضمام
  display: 'graph' | 'table';
}

export interface MissingNameData extends GraphData {
  missing: number;
  showTable: boolean;
}

export interface CountSceneData extends GraphData {
  /** مواقع الأشياء: [صنف، خانة، إزاحة x٪، إزاحة y٪، دوران] */
  items: [number, number, number, number, number][];
  cols: number;
  gridRows: number;
}

export type CompareVariant = 'maxIn' | 'sameInBoth' | 'sumAcross' | 'howMuchMore' | 'biggestDiff' | 'orderOne';

export interface CompareData {
  theme: string;
  cats: Category[];
  groups: [string, string];
  counts: [number[], number[]];
  rows: number;
  variant: CompareVariant;
  g?: 0 | 1;
  x?: number;
  asc?: boolean;
}

export type QData =
  | { kind: 'vgrid'; d: AddData }
  | { kind: 'placeValue'; d: AddData }
  | { kind: 'freeVertical'; d: AddData }
  | { kind: 'spotError'; d: SpotErrorData }
  | { kind: 'matchEqual'; d: MatchData }
  | { kind: 'wordProblem'; d: WordData }
  | { kind: 'fillBlank'; d: FillBlankData }
  | { kind: 'countScene'; d: CountSceneData }
  | { kind: 'completeGraph'; d: GraphData }
  | { kind: 'graphToTable'; d: GraphData }
  | { kind: 'missingName'; d: MissingNameData }
  | { kind: 'graphRead'; d: GraphReadData }
  | { kind: 'conceptual'; d: GraphData }
  | { kind: 'compareGraphs'; d: CompareData };

export interface QRef {
  lessonId: string;
  kind: Kind;
  seed: number;
}

export type Question = QRef & QData & { prompt: string };

/* ---------- الإجابات ---------- */

/** اختيار من بطاقات: اسم صنف أو رقم (الرقم يُستخدم لاكتشاف "رقم بدل اسم") */
export type Pick = { name: string } | { num: number };

export type Response =
  | { kind: 'number'; value: number }
  | { kind: 'grid'; tens: number | null; ones: number | null; hundreds?: number | null; carry?: number | null }
  /** rows[r] = [رقم خانة العشرات، رقم خانة الآحاد] في الصف r بعد السحب، ثم الناتج */
  | { kind: 'placement'; rows: [number | null, number | null][]; tens: number | null; ones: number | null }
  | { kind: 'spot'; cell: string; fixed: number | null }
  | { kind: 'match'; pairs: number[] }
  | { kind: 'word'; op: '+' | '-' | null; x: number | null; y: number | null; result: number | null; unit: string | null; x2?: number | null; y2?: number | null }
  | { kind: 'counts'; values: (number | null)[] }
  | { kind: 'pick'; picks: Pick[]; yes?: boolean | null; value?: number | null };

export interface Verdict {
  correct: boolean;
  error?: ErrorType;
  /** قيم لملء قالب التلميح */
  vars?: Record<string, string | number>;
}
