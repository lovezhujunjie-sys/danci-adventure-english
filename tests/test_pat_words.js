// 句型骨架「点词查义」真浏览器测试（2026-09-11 老曾提的需求）
//
// 需求原话：「句型骨架里面的单词能不能也可以做成点击就能知道意思的?」
// 原来只有槽位按钮（slot-btn）能看中文，骨架本身的 Could / you / please / mind
// 全是纯文本、点不动 —— 恰恰这些才是「句型」要教的东西。
//
// 🔴 这个功能必须用真浏览器测，不能用 DOM 桩：
//    它考的正是「渲染出来的 DOM 里有没有 .w 可点元素」和「点了之后弹卡弹不弹得出来」，
//    桩里的 innerHTML 是个字符串，量不出这个。
const { chromium } = require('playwright-core');
const path = require('path');
const os = require('os');

const CHROME = path.join(os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const FILE = 'file://' + path.join(os.homedir(), '.claude/skills/自学英语/index.html');

let pass = 0, fail = 0;
const fails = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    window.__spoken = [];
    const RealUtter = function (t) { this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: RealUtter, configurable: true, writable: true });
    const fake = {
      speak: u => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
      cancel: () => {}, pause: () => {}, resume: () => {},
      getVoices: () => [{ name: 'Tingting', lang: 'zh-CN' }, { name: 'Samantha', lang: 'en-US' }],
      speaking: false, pending: false, paused: false,
      addEventListener: () => {}, removeEventListener: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
  });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  console.log('① 进入句型骨架');
  await page.locator('.mode-card[data-goto="pattern"]').click();
  await page.waitForTimeout(400);
  ok('句型首页可见', await page.locator('#pattern-screen').isVisible());
  const groupCnt = await page.locator('#pat-group-grid .topic-btn').count();
  ok('分组列表有内容', groupCnt > 0, groupCnt + ' 组');

  await page.locator('#pat-group-grid .topic-btn').first().click();
  await page.waitForTimeout(400);
  ok('进了具体分组', await page.locator('#pat-practice-view').isVisible());

  console.log('\n② 骨架里的词是可点元素（本次需求的核心）');
  const frameW = await page.locator('.pat-frame .w').count();
  ok('骨架渲染出了 .w 可点词', frameW > 0, frameW + ' 个');
  const blankCnt = await page.locator('.pat-frame .blank').count();
  ok('空位 ___ 仍渲染成虚线空位（没被切词切坏）', blankCnt > 0, blankCnt + ' 个');
  const firstFrameTxt = await page.locator('.pat-frame').first().innerText();
  ok('骨架文字没被弄乱（还含省略号空位）', firstFrameTxt.includes('…'), JSON.stringify(firstFrameTxt));

  console.log('\n③ 点骨架里的词 → 弹卡出中文');
  const w0 = page.locator('.pat-frame .w').first();
  const w0txt = await w0.getAttribute('data-w');
  await w0.click();
  await page.waitForTimeout(350);
  ok('点词弹出了卡片', await page.locator('.word-pop').count() > 0);
  const popTxt = (await page.locator('.word-pop').first().innerText().catch(() => '')) || '';
  ok('卡片里有这个词本身', popTxt.includes(w0txt), w0txt + ' / 卡片:' + JSON.stringify(popTxt.slice(0, 40)));
  ok('卡片有中文释义或明确说明未收录', /[一-龥]/.test(popTxt), JSON.stringify(popTxt.slice(0, 60)));
  ok('点中的词有高亮 .on', await page.locator('.pat-frame .w.on').count() > 0);

  console.log('\n④ 选槽位 → 整句也能点词');
  await page.locator('.word-pop').count().then(async n => { if (n) { await page.mouse.click(5, 5); await page.waitForTimeout(200); } });
  await page.locator('.slot-btn').first().click();
  await page.waitForTimeout(400);
  ok('选完槽位出现整句', await page.locator('.pat-sentence').first().isVisible());
  const sentW = await page.locator('.pat-sentence .w').count();
  ok('整句渲染出了 .w 可点词', sentW > 0, sentW + ' 个');
  const hlTxt = (await page.locator('.pat-sentence .hl').first().innerText().catch(() => '')) || '';
  const slotTxt = (await page.locator('.slot-btn').first().innerText()) || '';
  ok('槽位内容整体高亮成一整块（没被切散）', hlTxt.trim() === slotTxt.trim(), JSON.stringify(hlTxt) + ' vs ' + JSON.stringify(slotTxt));
  ok('整句里也有可点词（不只高亮那块）', sentW >= 2, sentW + ' 个');
  ok('整句读出来了', (await page.evaluate(() => window.__spoken.length)) > 0);

  console.log('\n⑤ 整句里点词 → 弹卡');
  await page.locator('.pat-sentence .w').first().click();
  await page.waitForTimeout(350);
  ok('整句点词也弹卡', await page.locator('.word-pop').count() > 0);
  ok('点的是骨架词时不会被当成槽位点击', await page.locator('.slot-btn.on').count() === 1);

  console.log('\n⑥ 加生词本记的来源是「句型骨架」');
  // 🔴 键名/结构照真身来，别凭印象写（2026-09-11 我自己先写错过一次）：
  //    STORAGE_KEY = 'wordAdventure_progress'，progress.notebook 是**按小写词名索引的对象**，
  //    不是数组、也没有单独的 notebook 键。
  const addBtn = page.locator('.word-pop [data-pop-add]');
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(300);
    const nb = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('wordAdventure_progress') || '{}');
      return p.notebook || {};
    });
    const keys = Object.keys(nb);
    ok('生词本记下了', keys.length > 0, keys.length + ' 条');
    const fromPat = keys.filter(k => nb[k].topic === '句型骨架');
    ok('来源标成「句型骨架」而不是句库', fromPat.length > 0,
       '句型骨架 ' + fromPat.length + ' 条 / 全部来源：' + JSON.stringify([...new Set(keys.map(k => nb[k].topic))]));
  } else {
    ok('卡片有「＋ 生词本」按钮', false, '这个词没有释义所以没给加生词本按钮');
  }

  console.log('\n⑦ 全程无 JS 报错');
  ok('没有 pageerror', errors.length === 0, errors[0]);

  console.log('\n' + '='.repeat(52));
  if (fails.length) { console.log('失败项:'); fails.forEach(f => console.log('  • ' + f)); }
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
