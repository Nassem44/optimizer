import { describe, expect, it } from 'vitest';
import { finishSession, initialState, isUnlocked, planSession, recordResult, sessionOver, startSession } from '../src/engine/progress';
import { exportJson, importJson } from '../src/storage/store';
import { Rng } from '../src/engine/rng';

describe('الجلسة', () => {
  it('١٢ سؤالاً، منها ~٣٠٪ مراجعة عند وجود دروس سابقة', () => {
    const s = initialState();
    s.lessons['ch1-lesson1'].seen = 5;
    const plan = planSession(s, 'ch2-lesson1', new Rng(1));
    expect(plan).toHaveLength(12);
    expect(plan.filter((p) => p.review)).toHaveLength(4);
    expect(plan[0].review).toBe(false);
  });
  it('بدون دروس سابقة: كل الأسئلة من الدرس الحالي', () => {
    const s = initialState();
    const plan = planSession(s, 'ch2-lesson1', new Rng(1));
    expect(plan.every((p) => p.lessonId === 'ch2-lesson1')).toBe(true);
  });
  it('تنتهي بالمدة أو بعدد الأسئلة', () => {
    const s = initialState();
    startSession(s, 'ch2-lesson1', new Rng(1), 0);
    expect(sessionOver(s, 1000)).toBe(false);
    expect(sessionOver(s, 10 * 60_000)).toBe(true);
  });
});

describe('Leitner', () => {
  it('الخطأ يعود في الجلسة التالية، ثم بعد جلستين، ثم بعد ٥ جلسات، ثم يخرج', () => {
    const s = initialState();
    const rng = new Rng(3);
    startSession(s, 'ch2-lesson1', rng);
    const item = s.active!.plan[0];
    recordResult(s, item, { tries: 2, errors: ['ones-under-tens'] });
    expect(s.review[0].box).toBe(1);
    expect(s.review[0].due).toBe(2);
    finishSession(s);
    expect(s.sessionNo).toBe(2);

    startSession(s, 'ch2-lesson1', rng);
    expect(s.active!.plan.some((p) => p.review && p.seed === item.seed)).toBe(true);
    recordResult(s, { ...item, review: true }, { tries: 1, errors: [] });
    expect(s.review[0]).toMatchObject({ box: 2, due: 4 });
    finishSession(s);

    startSession(s, 'ch2-lesson1', rng); // الجلسة ٣: ليس مستحقاً
    expect(s.active!.plan.some((p) => p.seed === item.seed)).toBe(false);
    s.active!.index = 1;
    recordResult(s, s.active!.plan[0], { tries: 1, errors: [] });
    finishSession(s);

    s.sessionNo = 4;
    startSession(s, 'ch2-lesson1', rng);
    recordResult(s, { ...item, review: true }, { tries: 1, errors: [] });
    expect(s.review[0]).toMatchObject({ box: 3, due: 9 });
    recordResult(s, { ...item, review: true }, { tries: 1, errors: [] });
    expect(s.review).toHaveLength(0);
  });
  it('الخطأ في المراجعة يعيده للصندوق الأول', () => {
    const s = initialState();
    startSession(s, 'ch2-lesson1', new Rng(4));
    const item = s.active!.plan[0];
    recordResult(s, item, { tries: 3, errors: ['calc', 'calc'] });
    recordResult(s, item, { tries: 1, errors: [] });
    expect(s.review[0].box).toBe(2);
    recordResult(s, item, { tries: 2, errors: ['calc'] });
    expect(s.review[0].box).toBe(1);
  });
});

describe('الإتقان والفتح', () => {
  it('٨ من آخر ١٠ صح من أول محاولة يفتح الدرس التالي', () => {
    const s = initialState();
    expect(isUnlocked(s, 'ch2-lesson2')).toBe(false);
    startSession(s, 'ch2-lesson1', new Rng(5));
    const item = s.active!.plan[0];
    for (let i = 0; i < 2; i++) recordResult(s, item, { tries: 2, errors: ['calc'] });
    for (let i = 0; i < 7; i++) recordResult(s, item, { tries: 1, errors: [] });
    expect(isUnlocked(s, 'ch2-lesson2')).toBe(false);
    const out = recordResult(s, item, { tries: 1, errors: [] });
    expect(out.unlocked).toBe('ch2-lesson2');
    expect(isUnlocked(s, 'ch2-lesson2')).toBe(true);
  });
  it('قفل ولي الأمر يتقدّم على الفتح التلقائي', () => {
    const s = initialState();
    s.lessons['ch2-lesson1'].manual = 'locked';
    expect(isUnlocked(s, 'ch2-lesson1')).toBe(false);
  });
  it('النجوم: ١ من أول محاولة، ونصف مع التلميح، وبلا عقوبة', () => {
    const s = initialState();
    startSession(s, 'ch2-lesson1', new Rng(6));
    const p = s.active!.plan;
    recordResult(s, p[0], { tries: 1, errors: [] });
    recordResult(s, p[1], { tries: 2, errors: ['calc'] });
    recordResult(s, p[2], { tries: 3, errors: ['calc', 'calc'] });
    expect(s.stars).toBe(1.5);
  });
});

describe('النسخة الاحتياطية', () => {
  it('تصدير ثم استيراد يعيد نفس الحالة', () => {
    const s = initialState();
    s.stars = 7;
    s.errorCounts['ones-under-tens'] = 3;
    const back = importJson(exportJson(s));
    expect(back.stars).toBe(7);
    expect(back.errorCounts['ones-under-tens']).toBe(3);
  });
  it('يرفض ملفاً غريباً', () => {
    expect(() => importJson('{"x":1}')).toThrow();
  });
});
