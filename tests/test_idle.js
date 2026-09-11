// 30 分钟计时器的「挂机」规则实测（两个场景必须同时成立）
//   场景A：免提听朗读中 → 不受 2 分钟限制，持续走表（2026-09-11 新规则）
//   场景B：闪卡界面干挂着不碰 → 仍在第 2 分钟停表（防挂机的本意不能丢）
// 判据一律走对外口子 window.getTodaySec()，不碰内部状态。
const { chromium } = require('playwright-core');
const path = require('path'), os = require('os');

const CHROME = path.join(os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const FILE = 'file://' + path.join(os.homedir(), '.claude/skills/自学英语/index.html');

let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + n + (extra ? '  → ' + extra : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// TTS 桩：必须整个替换原生类（只在不存在时赋值是无效的，见 tests/README.md）
const STUB = () => {
  window.__spoken = [];
  const U = function (t) { this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; };
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true, writable: true });
  Object.defineProperty(window, 'speechSynthesis', { value: {
    speak: u => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
    cancel: () => {}, pause: () => {}, resume: () => {},
    getVoices: () => [{ name: 'Samantha', lang: 'en-US' }],
    speaking: false, pending: false, paused: false, addEventListener: () => {}, removeEventListener: () => {},
  }, configurable: true, writable: true });
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript(STUB);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const sec = () => page.evaluate(() => window.getTodaySec());

  // ═══════════ 场景A：免提听朗读中 ═══════════
  console.log('\n═══ 场景A：免提听朗读，全程零操作 ═══');
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.locator('.mode-card[data-pagemode="listen"]').first().click({ force: true });
  await page.waitForTimeout(250);
  const hasBookGrid = await page.locator('#ls-book-grid .topic-btn[data-book="all"]').count();
  if (hasBookGrid) {
    await page.locator('#ls-source-opts .mode-btn-mini[data-lssrc="sent"]').first().click({ force: true });
    await page.waitForTimeout(250);
    await page.locator('#ls-book-grid .topic-btn[data-book="all"]').first().click({ force: true });
    await page.waitForTimeout(250);
  }
  await page.locator('#start-btn').first().click({ force: true });
  await page.waitForTimeout(800);
  ok('确实进了听力屏', await page.evaluate(() => !document.getElementById('listen-screen').classList.contains('hidden')));

  const t0 = Date.now();
  const s0 = await sec();
  await sleep(20000);
  const s1 = await sec();
  ok('A① 前 20 秒计时在走', s1 > s0, s0 + ' → ' + s1);

  // 越过旧的 120 秒停表点
  const w1 = 150000 - (Date.now() - t0);
  if (w1 > 0) await sleep(w1);
  const s2 = await sec();
  // 再等 30 秒，看是不是还在涨（旧规则这时早已停表）
  await sleep(30000);
  const s3 = await sec();
  const el = Math.round((Date.now() - t0) / 1000);

  console.log('    时间线：t=0 →' + s0 + 's | t=20 →' + s1 + 's | t=' + (el - 30) + ' →' + s2 + 's | t=' + el + ' →' + s3 + 's');
  console.log('    零操作 ' + el + ' 秒，记进去 ' + (s3 - s0) + ' 秒');
  ok('A② 🔴 越过 2 分钟还在走表（新规则生效）', s3 > s2, s2 + ' → ' + s3);
  ok('A③ 🔴 免提听的时长基本被全额记下（旧规则只能记 120 秒）',
     (s3 - s0) >= el * 0.85, el + ' 秒真实 → ' + (s3 - s0) + ' 秒入账');
  const spoken = await page.evaluate(() => window.__spoken.length);
  ok('A④ 期间确实一直在念（不是页面卡住）', spoken > 20, '念了 ' + spoken + ' 句');
  ok('A⑤ 无未捕获异常', errors.length === 0, errors[0]);

  // ═══════════ 场景B：非朗读界面干挂机，必须仍停表 ═══════════
  console.log('\n═══ 场景B：闪卡界面干挂着不碰，防挂机规则必须还在 ═══');
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.locator('.mode-card[data-pagemode="study"]').first().click({ force: true });
  await page.waitForTimeout(250);
  await page.locator('#start-btn').first().click({ force: true });
  await page.waitForTimeout(800);
  ok('确实进了闪卡界面', await page.evaluate(() => !document.getElementById('study-screen').classList.contains('hidden')));
  ok('闪卡界面此时没有朗读在播', (await page.evaluate(() => !!window.__audioPlaying)) === false);

  const u0 = Date.now();
  const b0 = await sec();
  await sleep(20000);
  const b1 = await sec();
  ok('B① 前 20 秒在走表', b1 > b0, b0 + ' → ' + b1);

  const w2 = 145000 - (Date.now() - u0);
  if (w2 > 0) await sleep(w2);
  const b2 = await sec();
  await sleep(25000);
  const b3 = await sec();
  const bl = Math.round((Date.now() - u0) / 1000);

  console.log('    时间线：t=0 →' + b0 + 's | t=20 →' + b1 + 's | t=' + (bl - 25) + ' →' + b2 + 's | t=' + bl + ' →' + b3 + 's');
  console.log('    零操作 ' + bl + ' 秒，记进去 ' + (b3 - b0) + ' 秒');
  ok('B② 🔴 第 2 分钟之后停表了（防挂机规则没被弄坏）', b3 === b2, b2 + ' → ' + b3);
  ok('B③ 停表前记下的约 2 分钟', (b3 - b0) >= 100 && (b3 - b0) <= 135, '记了 ' + (b3 - b0) + ' 秒');
  ok('B④ 无未捕获异常', errors.length === 0, errors[0]);

  console.log('\n' + '='.repeat(52));
  console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
