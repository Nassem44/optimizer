import type { ErrorType } from './types';

/** اسم الخطأ كما يظهر لولي الأمر */
export const ERROR_LABELS: Record<ErrorType, string> = {
  'ones-under-tens': 'وضع رقم الآحاد تحت العشرات',
  'reversed-digits': 'عكس الرقمين',
  'forgot-tens': 'جمع الآحاد فقط / نسي العشرات',
  'forgot-ones': 'نسي الآحاد',
  'forgot-carry': 'نسي الحمل',
  'full-ones-sum': 'كتب مجموع الآحاد كاملاً',
  'wrong-operation': 'استخدم عملية خاطئة (طرح بدل جمع أو العكس)',
  'wrong-unit': 'وحدة خاطئة',
  'count-off-by-one': 'خطأ عدّ بفارق ١',
  'number-instead-of-name': 'أجاب برقم بدل الاسم',
  'more-less-confusion': 'خلط الأكبر والأقل',
  'wrong-order': 'ترتيب خاطئ',
  'swapped-not-equal': 'لم يدرك أن تبديل الترتيب لا يغيّر الناتج',
  'smaller-from-larger': 'طرح الصغير من الكبير في الآحاد بدل الاستلاف',
  'borrow-no-decrease': 'استلف دون أن يُنقص العشرات',
  'bigger-on-top': 'وضع المطروح في الأعلى / عكس ترتيب الطرح',
  'check-wrong': 'خطأ في التحقق بالجمع',
  calc: 'خطأ حسابي آخر',
};

/** تلميح افتراضي إن لم يحدد الدرس تلميحاً خاصاً */
export const DEFAULT_HINTS: Partial<Record<ErrorType, string>> = {
  'ones-under-tens': 'الرقم {digit} آحاد، مكانه تحت الآحاد.',
  'reversed-digits': 'انتبه لمكان كل رقم: الآحاد يميناً، والعشرات يساراً.',
  'forgot-tens': 'لا تنسَ أن تجمع العشرات أيضاً.',
  'forgot-ones': 'ابدأ بجمع الآحاد.',
  'forgot-carry': 'لا تنسَ الـ١ الذي نقلته إلى العشرات.',
  'full-ones-sum': 'اكتب رقم الآحاد فقط، وانقل ١ إلى العشرات.',
  'wrong-operation': 'اقرأ السؤال مرة أخرى: هل نجمع أم نطرح؟',
  'wrong-unit': 'اختر الوحدة الصحيحة.',
  'count-off-by-one': 'عُدّ مرة أخرى بهدوء.',
  'number-instead-of-name': 'السؤال يطلب الاسم، لا العدد.',
  'more-less-confusion': 'الأكثر هو الأطول، والأقل هو الأقصر.',
  'wrong-order': 'ابدأ بـ{start}.',
  'swapped-not-equal': 'تغيير ترتيب العددين في الجمع لا يغيّر الناتج.',
  'smaller-from-larger': 'لا نطرح الآحاد بالعكس! {onesA} أصغر من {onesB}: خذ ١ من العشرات أولاً.',
  'borrow-no-decrease': 'أخذت ١ من العشرات؟ إذن تصبح العشرات {newTens} وليس {tensA}. اشطبها واكتب الجديد في الدائرة.',
  'bigger-on-top': 'المطروح منه ({a}) يكتب في الأعلى، والمطروح ({b}) تحته.',
  'check-wrong': 'للتحقق: الفرق + المطروح = المطروح منه.',
};
