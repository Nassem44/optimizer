import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LESSONS, lessonById } from '../../engine/content';
import { ERROR_LABELS } from '../../engine/errors';
import { isUnlocked, masteryPct, resetProgress, topErrors } from '../../engine/progress';
import type { Kind } from '../../engine/types';
import { ar } from '../../engine/digits';
import { exportJson, importJson } from '../../storage/store';
import { h } from '../dom';
import { Slots, numpad } from '../numpad';
import type { App } from '../app';

const KIND_LABELS: Record<Kind, string> = {
  vgrid: 'شبكة الجمع الرأسي', placeValue: 'جدول القيمة المكانية', freeVertical: 'تحويل لرأسي بالسحب', spotError: 'اكتشف الخطأ',
  matchEqual: 'صِل المتساوي', wordProblem: 'مسألة لفظية', fillBlank: 'أكمل الفراغ', countScene: 'مشهد العدّ',
  completeGraph: 'إكمال الرسم', graphToTable: 'من الرسم للجدول', missingName: 'الصنف الناقص', graphRead: 'قراءة الرسم',
  conceptual: 'الرسم أم الجدول', compareGraphs: 'مقارنة رسمين',
};

/** قفل ولي الأمر: سؤال ضرب لا يعرفه طفل الصف الثاني */
export function parentGate(app: App): HTMLElement {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const slots = new Slots();
  const s = slots.make({ max: 2, cls: 'wide', label: 'الناتج' });
  slots.activate(s);
  const msg = h('p', { class: 'muted' }, 'لولي الأمر فقط');
  const overlay = h('div', { class: 'overlay' },
    h('div', { class: 'modal' },
      h('h2', null, 'شاشة ولي الأمر'),
      msg,
      h('div', { class: 'expr big', dir: 'rtl' }, h('span', { class: 'n' }, ar(a)), h('span', { class: 'op' }, '×'), h('span', { class: 'n' }, ar(b)), h('span', { class: 'op' }, '='), s.el),
      numpad(() => slots),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => {
          if (Number(s.value) === a * b) {
            overlay.remove();
            app.go('parent');
          } else {
            msg.textContent = 'إجابة غير صحيحة';
            slots.set(s, '');
          }
        } }, 'دخول'),
        h('button', { class: 'btn', type: 'button', onclick: () => overlay.remove() }, 'إلغاء'))));
  return overlay;
}

const fmtDate = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return ar(`${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`);
};

async function exportBackup(app: App, out: HTMLElement) {
  const text = exportJson(app.state);
  const name = `kids-math-backup-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Documents, encoding: Encoding.UTF8 });
      out.textContent = '✅ حُفظت في مجلد المستندات (Documents): ' + name + '\n' + r.uri;
    } else {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      h('a', { href: url, download: name }).click();
      URL.revokeObjectURL(url);
      out.textContent = '✅ نُزّل الملف: ' + name;
    }
  } catch (e) {
    out.textContent = '⚠️ تعذّر حفظ الملف (' + String(e) + '). انسخ النص من المربع بالأسفل واحفظه يدوياً.';
  }
}

export function parentScreen(app: App): HTMLElement {
  const s = app.state;
  const rerender = () => app.go('parent');
  const save = () => void app.persist();

  const lessonRows = LESSONS.map((l) => {
    const p = s.lessons[l.id];
    const seg = (['auto', 'unlocked', 'locked'] as const).map((mode) => {
      const active = (p.manual ?? 'auto') === mode;
      return h('button', { class: 'seg' + (active ? ' on' : ''), type: 'button', onclick: () => {
        p.manual = mode === 'auto' ? null : mode;
        save();
        rerender();
      } }, { auto: 'تلقائي', unlocked: 'مفتوح', locked: 'مقفول' }[mode]);
    });
    return h('tr', null,
      h('td', null, l.title, h('div', { class: 'muted' }, l.subtitle ?? '')),
      h('td', null, `${ar(masteryPct(p))}٪`, h('div', { class: 'muted' }, `آخر ${ar(p.recent.length)}`)),
      h('td', null, ar(p.seen)),
      h('td', null, p.mastered ? '⭐ متقن' : isUnlocked(s, l.id) ? 'مفتوح' : '🔒 مقفول'),
      h('td', { class: 'segs' }, seg));
  });

  const errs = topErrors(s, 8);
  const maxErr = errs[0]?.[1] ?? 1;
  const sessions = s.sessions.slice(-10).reverse();
  const review = s.review.slice().sort((a, b) => a.due - b.due);

  const stepper = (label: string, get: () => number, set: (v: number) => void, min: number, max: number, step: number) =>
    h('div', { class: 'stepper' }, h('span', null, label),
      h('button', { class: 'btn small', type: 'button', onclick: () => { set(Math.max(min, get() - step)); save(); rerender(); } }, '−'),
      h('b', null, ar(get())),
      h('button', { class: 'btn small', type: 'button', onclick: () => { set(Math.min(max, get() + step)); save(); rerender(); } }, '+'));

  const out = h('pre', { class: 'out' });
  const area = h('textarea', { class: 'backup', rows: '4', placeholder: 'الصق هنا نص النسخة الاحتياطية للاستيراد' }) as HTMLTextAreaElement;
  const file = h('input', { type: 'file', accept: 'application/json,.json' }) as HTMLInputElement;
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (f) area.value = await f.text();
  });
  const doImport = () => {
    try {
      const st = importJson(area.value);
      if (!confirm('سيُستبدل التقدّم الحالي بالنسخة الاحتياطية. متابعة؟')) return;
      app.state = st;
      save();
      alert('تم الاستيراد ✅');
      rerender();
    } catch (e) {
      out.textContent = '⚠️ ' + (e as Error).message;
    }
  };

  return h('div', { class: 'screen parent' },
    h('header', { class: 'bar' },
      h('button', { class: 'icon-btn', type: 'button', onclick: () => app.go('map') }, '→'),
      h('h1', null, 'لوحة ولي الأمر'), h('span')),

    h('section', { class: 'card-sec' }, h('h2', null, 'ملخص'),
      h('p', null, `النجوم: ${ar(s.stars)} — الجلسات: ${ar(s.sessions.length)} — أسئلة في المراجعة: ${ar(s.review.length)}`)),

    h('section', { class: 'card-sec' }, h('h2', null, 'الإتقان لكل درس'),
      h('p', { class: 'muted' }, 'الإتقان = ٨ صح من أول محاولة في آخر ١٠ أسئلة من الدرس، فيُفتح الدرس التالي.'),
      h('table', { class: 'ptable' }, h('tr', null, h('th', null, 'الدرس'), h('th', null, 'الإتقان'), h('th', null, 'أسئلة'), h('th', null, 'الحالة'), h('th', null, 'فتح/قفل')), lessonRows)),

    h('section', { class: 'card-sec' }, h('h2', null, 'أكثر الأخطاء تكراراً'),
      errs.length
        ? h('ul', { class: 'bars' }, errs.map(([e, n]) => h('li', null, h('span', null, ERROR_LABELS[e]), h('span', { class: 'barw' }, h('span', { style: `width:${(100 * n) / maxErr}%` })), h('b', null, ar(n)))))
        : h('p', { class: 'muted' }, 'لا أخطاء مسجّلة بعد.')),

    h('section', { class: 'card-sec' }, h('h2', null, 'آخر الجلسات'),
      sessions.length
        ? h('table', { class: 'ptable' },
          h('tr', null, h('th', null, 'التاريخ'), h('th', null, 'الدرس'), h('th', null, 'المدة'), h('th', null, 'صح أول مرة'), h('th', null, 'بتلميح'), h('th', null, 'خطأ'), h('th', null, 'نجوم')),
          sessions.map((x) => h('tr', null,
            h('td', null, fmtDate(x.start)), h('td', null, lessonById(x.lessonId).title),
            h('td', null, `${ar(Math.max(1, Math.round((x.end - x.start) / 60000)))} د`),
            h('td', null, ar(x.firstTry)), h('td', null, ar(x.withHint)), h('td', null, ar(x.failed)), h('td', null, ar(x.stars)))))
        : h('p', { class: 'muted' }, 'لا جلسات بعد.')),

    h('section', { class: 'card-sec' }, h('h2', null, 'قائمة المراجعة (Leitner)'),
      h('p', { class: 'muted' }, `الجلسة الحالية رقم ${ar(s.sessionNo)}. الصندوق ١ يعود في الجلسة التالية، ٢ بعد جلستين، ٣ بعد ٥ جلسات.`),
      review.length
        ? h('table', { class: 'ptable' }, h('tr', null, h('th', null, 'الدرس'), h('th', null, 'النوع'), h('th', null, 'الصندوق'), h('th', null, 'يعود في الجلسة')),
          review.map((r) => h('tr', null, h('td', null, lessonById(r.ref.lessonId).title), h('td', null, KIND_LABELS[r.ref.kind]), h('td', null, ar(r.box)), h('td', null, ar(r.due)))))
        : h('p', { class: 'muted' }, 'القائمة فارغة.')),

    h('section', { class: 'card-sec' }, h('h2', null, 'الإعدادات'),
      stepper('مدة الجلسة (دقيقة):', () => s.settings.minutes, (v) => (s.settings.minutes = v), 3, 30, 1),
      stepper('عدد الأسئلة:', () => s.settings.questions, (v) => (s.settings.questions = v), 4, 30, 1),
      h('p', { class: 'muted' }, 'تنتهي الجلسة عند أيهما أقرب.')),

    h('section', { class: 'card-sec' }, h('h2', null, 'النسخة الاحتياطية'),
      h('p', { class: 'muted' }, 'صدّر نسخة قبل تثبيت أي تحديث للتطبيق.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { void exportBackup(app, out); area.value = exportJson(s); } }, '⬇️ تصدير'),
        h('button', { class: 'btn', type: 'button', onclick: doImport }, '⬆️ استيراد')),
      file, area, out),

    h('section', { class: 'card-sec danger' }, h('h2', null, 'تصفير التقدّم'),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        if (!confirm('سيُحذف كل التقدّم والنجوم والسجل. هل أنت متأكد؟')) return;
        if (!confirm('تأكيد أخير: لا يمكن التراجع إلا من نسخة احتياطية.')) return;
        app.state = resetProgress(s);
        save();
        rerender();
      } }, '🗑️ تصفير')),
  );
}
