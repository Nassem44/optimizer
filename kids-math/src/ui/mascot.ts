import { h } from './dom';

// "زيزو": شخصية أصلية بسيطة (نجمة صغيرة مبتسمة) — SVG مضمّن.
const SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="41" cy="48" r="5" fill="#3f3f46"/><circle cx="59" cy="48" r="5" fill="#3f3f46"/>
  <circle cx="42.5" cy="46.5" r="1.6" fill="#fff"/><circle cx="60.5" cy="46.5" r="1.6" fill="#fff"/>
  <path class="mouth" d="M41 60 Q50 68 59 60" fill="none" stroke="#3f3f46" stroke-width="3" stroke-linecap="round"/>
  <circle cx="34" cy="58" r="4" fill="#fb923c" opacity=".5"/><circle cx="66" cy="58" r="4" fill="#fb923c" opacity=".5"/>
</svg>`;

export const PRAISE = ['أحسنت! 🌟', 'رائع يا بطل!', 'ممتاز!', 'برافو عليك!', 'شاطر جداً!', 'إجابة صحيحة! 👏', 'عظيم! استمر', 'تمام كده! 💪'];
export const RETRY = ['قربت! جرّب تاني', 'ولا يهمك، نحاول مرة أخرى', 'فكّر بهدوء وجرّب'];
export const ENCOURAGE = ['هيا نبدأ!', 'أنت تقدر!', 'خطوة خطوة 👣'];

export const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function mascot() {
  const bubble = h('div', { class: 'bubble' });
  const face = h('div', { class: 'mascot-face' });
  face.innerHTML = SVG;
  const el = h('div', { class: 'mascot' }, face, bubble);
  return {
    el,
    say(text: string, mood: 'happy' | 'think' = 'happy') {
      bubble.textContent = text;
      el.classList.remove('bounce', 'think');
      void el.offsetWidth;
      el.classList.add(mood === 'happy' ? 'bounce' : 'think');
    },
  };
}
