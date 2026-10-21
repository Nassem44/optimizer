import type { ErrorType } from '../../engine/types';
import { generate } from '../../engine/generate';
import { check } from '../../engine/check';
import { correctResponse } from '../../engine/answer';
import { hintFor, solutionSteps } from '../../engine/feedback';
import { lessonById } from '../../engine/content';
import { finishSession, recordResult, sessionOver } from '../../engine/progress';
import { ar } from '../../engine/digits';
import { h, shake } from '../dom';
import { Slots, numpad } from '../numpad';
import { viewFor } from '../kinds';
import { ENCOURAGE, PRAISE, RETRY, mascot, pick } from '../mascot';
import { play } from '../sound';
import type { App } from '../app';
import { muteButton } from './map';

const starText = (n: number) => '⭐ ' + ar(String(n).replace('.5', '½').replace(/^0½$/, '½'));

export function sessionScreen(app: App): HTMLElement {
  const s = app.state;
  const a = s.active;
  if (!a || sessionOver(s)) {
    finishSession(s);
    void app.persist();
    return endOrMap(app);
  }
  const item = a.plan[a.index];
  const q = generate(item);
  const lesson = lessonById(item.lessonId);
  const slots = new Slots();
  const m = mascot();
  slots.onRefuse = (msg) => m.say(msg, 'think');
  const view = viewFor(q, { lesson, slots, say: (t) => m.say(t) });

  let attempt = 1;
  const errors: ErrorType[] = [];
  const hint = h('div', { class: 'hint', hidden: true });
  const steps = h('ol', { class: 'steps', hidden: true });
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, 'تحقّق ✓');
  const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true }, 'التالي ◀');
  const actions = h('div', { class: 'actions' }, checkBtn, nextBtn);
  const starsEl = h('span', { class: 'stars' }, starText(a.stars));

  const progress = h('div', { class: 'progress' }, a.plan.map((_, i) => h('span', { class: i < a.index ? 'done' : i === a.index ? 'cur' : '' })));
  const header = h(
    'header', { class: 'bar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'رجوع', onclick: () => app.go('map') }, '✕'),
    progress, starsEl, muteButton(app),
  );

  const promptEl = q.kind === 'wordProblem' ? null : h('p', { class: 'prompt' }, q.prompt);
  const tag = item.review ? h('span', { class: 'tag' }, '🔁 مراجعة: ' + lesson.title) : null;
  const main = h('main', { class: 'qmain' }, tag, promptEl, view.el, hint, steps, actions);
  const pad = view.usesNumpad ? numpad(() => slots, () => play('tap')) : null;
  const stage = h('div', { class: 'stage' + (pad ? ' with-pad' : '') }, h('div', { class: 'qcol' }, m.el, main), pad ? h('aside', { class: 'padcol' }, pad) : null);

  m.say(a.index === 0 && attempt === 1 ? pick(ENCOURAGE) : lesson.hints[q.kind] ?? pick(ENCOURAGE));

  function done(tries: 1 | 2 | 3) {
    const out = recordResult(s, item, { tries, errors });
    a!.index++;
    void app.persist();
    starsEl.textContent = starText(a!.stars);
    checkBtn.hidden = true;
    nextBtn.hidden = false;
    if (out.mastered) {
      const next = out.unlocked ? ` وفُتح درس جديد: ${lessonById(out.unlocked).title}` : '';
      main.append(h('div', { class: 'banner' }, `🎉 أتقنت درس "${lessonById(out.mastered).title}"${next}`));
    }
    nextBtn.focus();
  }

  checkBtn.addEventListener('click', () => {
    const r = view.read();
    if (!r) {
      m.say('أكمل الإجابة أولاً ✍️', 'think');
      shake(view.el);
      return;
    }
    const v = check(q, r);
    if (v.correct) {
      play('right');
      m.say(pick(PRAISE));
      hint.hidden = true;
      view.el.classList.add('solved');
      done(attempt as 1 | 2);
      return;
    }
    play('wrong');
    errors.push(v.error ?? 'calc');
    if (attempt === 1) {
      attempt = 2;
      m.say(pick(RETRY), 'think');
      hint.textContent = '💡 ' + hintFor(lesson, q, v);
      hint.hidden = false;
      shake(view.el);
      return;
    }
    // المحاولة الثالثة: الحل خطوة بخطوة
    attempt = 3;
    hint.hidden = true;
    m.say('تعال نحلها معاً خطوة خطوة', 'think');
    view.reveal(correctResponse(q));
    slots.lockAll();
    view.el.classList.add('revealed');
    const all = solutionSteps(q);
    steps.hidden = false;
    checkBtn.hidden = true;
    const stepBtn = h('button', { class: 'btn', type: 'button' }, 'الخطوة التالية ◀');
    const showStep = () => {
      steps.append(h('li', null, all[steps.children.length]));
      if (steps.children.length >= all.length) {
        stepBtn.remove();
        done(3);
      }
    };
    stepBtn.addEventListener('click', showStep);
    actions.prepend(stepBtn);
    showStep();
  });

  nextBtn.addEventListener('click', () => app.go('session'));
  return h('div', { class: 'screen session' }, header, stage);
}

function endOrMap(app: App): HTMLElement {
  const last = app.state.sessions[app.state.sessions.length - 1];
  if (!last) {
    app.state.active = null;
    queueMicrotask(() => app.go('map'));
    return h('div');
  }
  queueMicrotask(() => app.go('end'));
  return h('div');
}

export function endScreen(app: App): HTMLElement {
  const last = app.state.sessions[app.state.sessions.length - 1];
  play('end');
  const m = mascot();
  const full = Math.floor(last.stars);
  const half = last.stars - full >= 0.5;
  m.say(last.firstTry >= last.total * 0.8 ? 'أداء رائع اليوم! 🏆' : 'أحسنت! كل جلسة تجعلك أقوى 💪');
  return h(
    'div', { class: 'screen end' },
    m.el,
    h('h1', null, 'انتهت الجلسة!'),
    h('div', { class: 'big-stars' }, '⭐'.repeat(Math.min(full, 15)), half ? '✨' : ''),
    h('p', null, `جمعت ${ar(String(last.stars).replace('.5', '½'))} نجمة`),
    h('ul', { class: 'summary' },
      h('li', null, `✅ صح من أول مرة: ${ar(last.firstTry)}`),
      h('li', null, `💡 صح بعد التلميح: ${ar(last.withHint)}`),
      h('li', null, `📘 تعلّمناها معاً: ${ar(last.failed)}`)),
    h('button', { class: 'btn primary', type: 'button', onclick: () => app.go('map') }, 'رجوع للخريطة 🗺️'),
  );
}
