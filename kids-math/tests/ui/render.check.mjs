// اختبار العرض في Chromium حقيقي: npm run build && npm run test:ui
// يتحقق من: الأرقام هندية، و٧٢ لا تنعكس، والآحاد يمين العشرات، و+ يمين العدد الثاني، والرسم البياني من اليمين ومن الأسفل.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const shotDir = process.env.SHOTS;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(dist, decodeURIComponent(req.url.split('?')[0].split('#')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dist) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

let failed = 0;
let navs = 0;
// تغيير الـ hash وحده لا يعيد تحميل الصفحة، فنضيف query فريداً
const url = (hash) => `${base}?n=${navs++}${hash}`;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
  const tag = viewport.width > viewport.height ? 'أفقي' : 'عمودي';
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- الجمع الرأسي: ٧٢ + ٥
  await page.goto(url('#harness?lesson=ch2-lesson1&kind=vgrid&a=72&b=5'));
  await page.waitForSelector('.vframe');
  const frame = await page.evaluate(() => {
    const box = (el) => el.getBoundingClientRect();
    const cells = [...document.querySelectorAll('.vframe .vc')];
    const rowA = cells.slice(0, 2);
    const rowB = cells.slice(2, 4);
    const header = [...document.querySelectorAll('.vframe .vh')];
    const sign = [...document.querySelectorAll('.vframe .vsign')].find((s) => s.textContent === '+');
    const readRow = (row) => row.slice().sort((x, y) => box(x).left - box(y).left).map((c) => c.textContent).join('');
    return {
      rowA: readRow(rowA),
      rowB: readRow(rowB),
      onesRight: box(header.find((x) => x.textContent === 'آحاد')).left > box(header.find((x) => x.textContent === 'عشرات')).left,
      onesBlue: getComputedStyle(rowA[1]).color,
      tensPink: getComputedStyle(rowA[0]).color,
      signRight: box(sign).left > Math.max(...rowB.map((c) => box(c).right)) - 1,
      signRowB: Math.abs(box(sign).top - box(rowB[1]).top) < 10,
      text: document.body.innerText,
    };
  });
  ok(frame.rowA === '٧٢', `[${tag}] ٧٢ تظهر "٧٢" (ظهرت "${frame.rowA}")`);
  ok(frame.rowB === '٥', `[${tag}] ٥ تحت الآحاد (ظهرت "${frame.rowB}")`);
  ok(frame.onesRight, `[${tag}] عمود الآحاد يمين عمود العشرات`);
  ok(frame.onesBlue === 'rgb(47, 127, 224)', `[${tag}] الآحاد باللون الأزرق`);
  ok(frame.tensPink === 'rgb(192, 63, 150)', `[${tag}] العشرات باللون الوردي`);
  ok(frame.signRight && frame.signRowB, `[${tag}] علامة + على يمين العدد الثاني`);
  ok(!/[0-9]/.test(frame.text), `[${tag}] لا أرقام لاتينية في الصفحة`);
  if (shotDir) await page.screenshot({ path: `${shotDir}/vgrid-${viewport.width}.png` });

  // ---- إدخال الآحاد أولاً
  const tensSlot = page.locator('.vframe .slot.c-t');
  await tensSlot.click();
  ok(!(await tensSlot.evaluate((e) => e.classList.contains('active'))), `[${tag}] لا يمكن البدء بالعشرات قبل الآحاد`);
  await page.locator('.numpad .key', { hasText: '٧' }).click();
  ok((await page.locator('.vframe .slot.c-o').textContent()) === '٧', `[${tag}] لوحة الأرقام تكتب في الآحاد أولاً`);
  ok(await tensSlot.evaluate((e) => e.classList.contains('active')), `[${tag}] ثم تنتقل للعشرات`);

  // ---- الرسم البياني
  await page.goto(url('#harness?lesson=ch1-lesson2&kind=graphToTable&seed=3'));
  await page.waitForSelector('.graph');
  const g = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('.graph .gcol')];
    const first = cols[0].getBoundingClientRect(), last = cols[cols.length - 1].getBoundingClientRect();
    const cells = [...cols[0].querySelectorAll('.gcell')];
    const on = cells.filter((c) => c.classList.contains('on'));
    return {
      rtl: first.left > last.left,
      rows: cells.length,
      bottomUp: on.length === 0 || on.every((c) => c.getBoundingClientRect().top >= Math.max(...cells.filter((x) => !x.classList.contains('on')).map((x) => x.getBoundingClientRect().top), -1)),
      text: document.body.innerText,
    };
  });
  ok(g.rtl, `[${tag}] الصنف الأول في الرسم على اليمين`);
  ok(g.rows === 10, `[${tag}] الرسم ١٠ صفوف`);
  ok(g.bottomUp, `[${tag}] الدوائر من أسفل لأعلى`);
  ok(!/[0-9]/.test(g.text), `[${tag}] لا أرقام لاتينية في الرسم`);

  if (shotDir) {
    const shots = [
      ['ch2-lesson1', 'placeValue'], ['ch2-lesson1', 'freeVertical'], ['ch2-lesson1', 'spotError'], ['ch2-lesson1', 'matchEqual'],
      ['ch2-lesson1', 'wordProblem'], ['ch2-lesson2', 'vgrid'], ['ch2-lesson3', 'fillBlank'], ['ch1-lesson1', 'countScene'],
      ['ch1-lesson1', 'completeGraph'], ['ch1-lesson2', 'graphRead'], ['ch1-lesson2', 'missingName'], ['ch1-lesson3', 'compareGraphs'],
    ];
    for (const [l, k] of shots) {
      await page.goto(url(`#harness?lesson=${l}&kind=${k}&seed=11`));
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${shotDir}/${l}-${k}-${viewport.width}.png`, fullPage: true });
    }
    await page.goto(url(''));
    await page.waitForSelector('.level');
    await page.screenshot({ path: `${shotDir}/map-${viewport.width}.png`, fullPage: true });
  }
  // ---- الجلسة تُحفظ وتُستأنف بعد إغلاق التطبيق
  await page.goto(url(''));
  await page.evaluate(() => localStorage.clear());
  await page.goto(url(''));
  await page.locator('.level', { hasText: 'الجمع الرأسي بدون حمل' }).click();
  await page.waitForSelector('.qmain');
  ok((await page.locator('.qmain').count()) === 1, `[${tag}] الجلسة تبدأ وتعرض سؤالاً`);
  ok(!/[0-9]/.test(await page.locator('.screen').innerText()), `[${tag}] لا أرقام لاتينية في شاشة السؤال`);
  await page.goto(url(''));
  await page.waitForSelector('.level');
  ok((await page.locator('.resume').count()) === 1, `[${tag}] بعد إعادة فتح التطبيق يظهر زر "أكمل الجلسة"`);

  // ---- نهاية الجلسة: آخر سؤال تمت الإجابة عليه ← شاشة النهاية وتسجيل الجلسة
  await page.evaluate(() => {
    const k = 'CapacitorStorage.kids-math-state';
    const st = JSON.parse(localStorage.getItem(k));
    Object.assign(st.active, { index: st.active.plan.length, firstTry: 9, withHint: 2, failed: 1, stars: 10 });
    localStorage.setItem(k, JSON.stringify(st));
  });
  await page.goto(url(''));
  await page.locator('.resume').click();
  await page.waitForSelector('.end');
  ok((await page.locator('.end').innerText()).includes('١٠'), `[${tag}] شاشة النهاية تعرض النجوم`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.kids-math-state')));
  ok(saved.sessions.length === 1 && saved.active === null && saved.sessionNo === 2, `[${tag}] الجلسة سُجّلت ورقم الجلسة تقدّم`);

  ok(errors.length === 0, `[${tag}] لا أخطاء JavaScript ${errors.join(' | ')}`);
  await page.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} فشل` : '\nكل اختبارات العرض ناجحة');
process.exit(failed ? 1 : 0);
