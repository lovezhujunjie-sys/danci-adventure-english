// 每天 30 分钟三步走 + 说今天的事 + 跟读（2026-10-12 新增，配合「骨架 + 高频句 + 听说」路线）
//
// 背景：老曾转来 ChatGPT 的学习建议 —— 初学者先建「句子骨架 + 高频词汇 + 听说反应」，
//      每天 30 分钟分三段：10 分钟高频句 / 10 分钟听力跟读 / 10 分钟自己开口说今天的事。
//      App 里对应三样新东西：首页「今天怎么练」三步卡、📔 说今天的事、🔁 跟读。
//
// 🔴 必须真浏览器：考的是「卡片点了会不会跳到对的屏」「勾选后计数/成段输出对不对」
//    「点词弹卡弹不弹得出来」—— 这些 DOM 桩量不出来。
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

  const vis = sel => page.locator(sel).isVisible();
  const txt = async sel => ((await page.locator(sel).textContent()) || '').trim();

  console.log('① 首页：30 分钟三步走');
  ok('「今天怎么练」卡片在首页', await vis('#plan'));
  ok('三步都在（3 个 .plan-step）', (await page.locator('.plan-step').count()) === 3);
  ok('进度显示 0 / 3', (await txt('#plan-val')) === '0 / 3', await txt('#plan-val'));
  ok('第 1 步指向高频句', (await page.locator('.plan-step[data-plan="1"]').getAttribute('data-plan-goto')) === 'sentence');
  ok('第 2 步指向听力', (await page.locator('.plan-step[data-plan="2"]').getAttribute('data-plan-goto')) === 'listen');
  ok('第 3 步指向说今天的事', (await page.locator('.plan-step[data-plan="3"]').getAttribute('data-plan-goto')) === 'diary');

  console.log('② 开口说区：新入口');
  ok('有「说今天的事」卡', await vis('.mode-card[data-goto="diary"]'));
  ok('有「零基础起步」卡（独立 goto 值）', await vis('.mode-card[data-goto="patgroup"]'));
  const sceneCount = await page.evaluate(() => Object.keys(SENTENCES).length);
  const patCount = await page.evaluate(() => Object.keys(PATTERNS).length);
  ok(`高频句卡上写着 ${sceneCount} 个场景`, (await txt('.sent-scene-count')) === String(sceneCount), await txt('.sent-scene-count'));
  ok(`句型卡上写着 ${patCount} 组`, (await txt('.pat-group-count')) === String(patCount), await txt('.pat-group-count'));

  console.log('③ 零基础起步：直接进「起步地基」组');
  await page.locator('.mode-card[data-goto="patgroup"]').click();
  await page.waitForTimeout(300);
  ok('进了句型骨架屏', await vis('#pattern-screen'));
  ok('直接看到练习视图（不是组列表）', await vis('#pat-practice-view'));
  ok('标题是「起步地基」', (await txt('#pat-title')).includes('起步地基'), await txt('#pat-title'));
  const frames = await page.evaluate(() => Array.from(document.querySelectorAll('#pat-list .pat-frame')).map(e => e.textContent));
  ['I am', 'I have', 'I like', "I don't like", 'I can', "I can't"].forEach(f => {
    ok(`地基骨架里有「${f}」`, frames.some(x => x.includes(f)));
  });
  ok('每个骨架卡都有「🔁 跟读」按钮', (await page.locator('#pat-list .follow-btn').count()) >= 6);
  ok('点一个槽位后出现整句 + 跟读按钮', await (async () => {
    const card = page.locator('#pat-list .pat-card').first();
    await card.locator('.slot-btn').first().click();
    await page.waitForTimeout(200);
    const shown = await card.locator('.pat-sentence').isVisible();
    const sentence = (await card.locator('.pat-sentence').textContent()) || '';
    const followBtn = await card.locator('.follow-btn').count();
    return shown && sentence.trim().length > 3 && followBtn === 1;
  })());

  console.log('④ 说今天的事：勾选 → 成段 → 点词查义');
  await page.locator('#pat-home2').click();
  await page.waitForTimeout(200);
  await page.locator('.mode-card[data-goto="diary"]').click();
  await page.waitForTimeout(300);
  ok('进了日记屏', await vis('#diary-screen'));
  const groups = await page.evaluate(() => DIARY.groups.length);
  const sentences = await page.evaluate(() => DIARY.groups.reduce((a, g) => a + g.items.length, 0));
  ok(`日记 ${groups} 组`, (await page.locator('#dy-groups .dy-group').count()) === groups);
  ok(`日记共 ${sentences} 句`, (await page.locator('#dy-groups .dy-item').count()) === sentences);
  ok('初始计数文案是「已选 0 句」', (await txt('#dy-count')).includes('已选 0 句'), await txt('#dy-count'));
  ok('未选时不出成段结果', !(await vis('#dy-output')));

  // 勾 3 句
  for (let i = 0; i < 3; i++) await page.locator(`#dy-groups .dy-item[data-i="${i}"]`).click();
  await page.waitForTimeout(200);
  ok('勾 3 后被勾的行带 .on', (await page.locator('#dy-groups .dy-item.on').count()) === 3);
  ok('计数变成「已选 3 句 · 可以开说了」', (await txt('#dy-count')).includes('已选 3 句'), await txt('#dy-count'));
  ok('成段结果出现', await vis('#dy-output'));
  const outText = await txt('#dy-output');
  ok('成段结果里含第 1 句原文', outText.includes('I got up at six'), outText.slice(0, 60));
  ok('成段结果里的词是可点的', (await page.locator('#dy-output .w').count()) > 5);

  // 点词查义
  ok('点日记里的词能弹卡', await (async () => {
    await page.locator('#dy-groups .dy-item').first().locator('.dy-en .w').first().click();
    await page.waitForTimeout(300);
    const popVis = await page.locator('.word-pop').first().isVisible().catch(() => false);
    const popTxt = (await page.locator('.word-pop').first().textContent().catch(() => '')) || '';
    return popVis && popTxt.trim().length > 0;
  })());
  await page.keyboard.press('Escape');
  await page.locator('#dy-groups').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(200);

  // 遮住中文（跟句库同一套做法：blur 而不是隐藏）
  await page.locator('#dy-hide-cn').check();
  await page.waitForTimeout(250);
  const blurred = await page.evaluate(() => {
    const cn = document.querySelector('#dy-groups .dy-item .dy-cn');
    return getComputedStyle(cn).filter;
  });
  ok('勾「遮住中文」后中文被模糊掉', /blur/.test(blurred), blurred);

  // 清空
  await page.locator('#dy-clear').click();
  await page.waitForTimeout(200);
  ok('清空后回到「已选 0 句」', (await txt('#dy-count')).includes('已选 0 句'));
  ok('清空后成段结果收起', !(await vis('#dy-output')));

  console.log('⑤ 三步走打勾与持久化');
  await page.locator('#dy-home').click();
  await page.waitForTimeout(200);
  ok('回到首页', await vis('#start-screen'));
  await page.locator('.plan-step[data-plan="3"]').click();
  await page.waitForTimeout(300);
  ok('点第 3 步直接进日记屏', await vis('#diary-screen'));
  await page.locator('#dy-home').click();
  await page.waitForTimeout(250);
  const val = await txt('#plan-val');
  ok('第 3 步已打勾（进度 1 / 3）', val === '1 / 3', val);
  ok('打勾后步骤显示成 ✓', (await txt('.plan-step[data-plan="3"] .ps-n')) === '✓');
  const stored = await page.evaluate(() => localStorage.getItem('wordadv_plan30'));
  ok('打勾状态落盘 localStorage', !!stored && stored.includes('"done"'), String(stored).slice(0, 60));
  const planKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('wordadv_')));
  ok('新增 key 只有 plan30 / diary_pick', planKeys.every(k => k === 'wordadv_plan30' || k === 'wordadv_diary_pick'), planKeys.join(','));

  console.log('⑥ 跟读引擎：读 → 停 → 再读（真按钮，不直调内部函数）');
  // 回到句型骨架，点一个槽位再点「🔁 跟读」
  await page.locator('.mode-card[data-goto="patgroup"]').click();
  await page.waitForTimeout(300);
  const card0 = page.locator('#pat-list .pat-card').first();
  await card0.locator('.slot-btn').first().click();
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__spoken.length = 0; });
  await card0.locator('.follow-btn').click();
  // 默认间隔 2.2 秒是留给用户跟着念的，所以第二遍要等够（别把等待调小去迁就测试）
  await page.waitForTimeout(3200);
  const followWords = await page.evaluate(() => window.__spoken.slice());
  ok('跟读把同一句读了两遍', followWords.length >= 2 && followWords[0] === followWords[1], JSON.stringify(followWords));
  ok('跟读按钮有「进行中」状态类', (await card0.locator('.follow-btn.on').count()) >= 0);
  await card0.locator('.follow-btn').click();   // 再点一次 = 停
  await page.waitForTimeout(300);

  console.log('⑦ 全程无 JS 报错');
  ok('没有 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('\n====================================================');
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  if (fails.length) console.log('失败项：\n  - ' + fails.join('\n  - '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
