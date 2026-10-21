// مؤثرات صوتية قصيرة تُولَّد داخل التطبيق (WebAudio) — بلا ملفات ولا إنترنت.
let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => (muted = m);

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function play(kind: 'right' | 'wrong' | 'end' | 'tap') {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (kind === 'right') { tone(660, 0, 0.15); tone(880, 0.12, 0.25); }
    else if (kind === 'wrong') { tone(330, 0, 0.18, 'triangle', 0.12); tone(262, 0.15, 0.25, 'triangle', 0.12); }
    else if (kind === 'end') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3));
    else tone(500, 0, 0.05, 'sine', 0.05);
  } catch {
    /* الصوت اختياري */
  }
}
