import { LESSONS, SHARED } from '../../engine/content';
import { finishSession, isUnlocked, masteryPct, startSession } from '../../engine/progress';
import { ar } from '../../engine/digits';
import { Rng, newSeed } from '../../engine/rng';
import { h } from '../dom';
import type { App } from '../app';
import { parentGate } from './parent';
import { setMuted } from '../sound';

export function muteButton(app: App): HTMLElement {
  const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'الصوت' }, app.state.settings.muted ? '🔇' : '🔊');
  b.addEventListener('click', () => {
    app.state.settings.muted = !app.state.settings.muted;
    b.textContent = app.state.settings.muted ? '🔇' : '🔊';
    setMuted(app.state.settings.muted);
    void app.persist();
  });
  return b;
}

/** زر ولي الأمر: ضغط مطوّل ٣ ثوانٍ */
function parentButton(app: App): HTMLElement {
  const b = h('button', { class: 'icon-btn gear', type: 'button', 'aria-label': 'ولي الأمر' }, '⚙️');
  let timer: number | undefined;
  const cancel = () => {
    clearTimeout(timer);
    b.classList.remove('holding');
  };
  b.addEventListener('pointerdown', () => {
    b.classList.add('holding');
    timer = window.setTimeout(() => {
      cancel();
      app.root.append(parentGate(app));
    }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, cancel));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}

export function mapScreen(app: App): HTMLElement {
  const s = app.state;
  const start = (lessonId: string) => {
    if (s.active) finishSession(s);
    startSession(s, lessonId, new Rng(newSeed()));
    void app.persist();
    app.go('session');
  };
  const resume = s.active
    ? h('button', { class: 'btn primary resume', type: 'button', onclick: () => app.go('session') }, `▶ أكمل الجلسة (${ar(s.active.index)} من ${ar(s.active.plan.length)})`)
    : null;

  const chapters = [...new Set(LESSONS.map((l) => l.chapter))];
  const path = chapters.map((ch) =>
    h('section', { class: 'chapter' },
      h('h2', null, `الفصل ${ar(ch)}: ${SHARED.chapters[ch] ?? ''}`),
      h('div', { class: 'levels' },
        LESSONS.filter((l) => l.chapter === ch).map((l) => {
          const p = s.lessons[l.id];
          const open = isUnlocked(s, l.id);
          const pct = masteryPct(p);
          return h('button', {
            class: 'level' + (open ? '' : ' locked') + (p.mastered ? ' mastered' : ''),
            type: 'button',
            disabled: !open,
            onclick: open ? () => start(l.id) : null,
          },
            h('span', { class: 'badge' }, open ? (p.mastered ? '⭐' : ar(l.order)) : '🔒'),
            h('span', { class: 'ltitle' }, l.title),
            h('span', { class: 'lsub' }, l.subtitle ?? ''),
            open ? h('span', { class: 'meter' }, h('span', { style: `width:${pct}%` })) : null,
          );
        })),
    ),
  );

  return h('div', { class: 'screen map' },
    h('header', { class: 'bar' },
      parentButton(app),
      h('h1', null, 'رياضيات تانية ✏️'),
      h('span', { class: 'stars' }, '⭐ ' + ar(String(s.stars).replace('.5', '½'))),
      muteButton(app)),
    resume,
    path,
  );
}
