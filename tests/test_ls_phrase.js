// 听力磨耳朵「💬 高频句音源 + 🀄 中英交替三档」真浏览器验证（2026-09-17 新增）
//
// 为什么必须是真浏览器：这次改动的命门是「英文→中文→英文」到底有没有真的这么念出来。
// 切片静态测试只能看到源码长什么样，看不到 speechSynthesis 实际被调用了几次、什么顺序、
// 中文走的是不是普通话嗓子。所以这里 hook 掉 speechSynthesis.speak，把每次调用连同
// text + lang 记下来，再按序列断言。
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

  let errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    window.__spoken = [];
    const RealUtter = function (t) {
      this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = '';
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: RealUtter, configurable: true, writable: true });
    const fake = {
      speak: u => {
        window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null });
        setTimeout(() => u.onend && u.onend(), 0);
      },
      cancel: () => {}, pause: () => {}, resume: () => {},
      // 必须给中文嗓子，否则 zhVoice() 返回 null，中英交替整段被跳过，测试就白测了
      getVoices: () => [{ name: 'Tingting', lang: 'zh-CN' }, { name: 'Samantha', lang: 'en-US' }],
      speaking: false, pending: false, paused: false,
      addEventListener: () => {}, removeEventListener: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
  });

  const vis = sel => page.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) return null;
    const cs = getComputedStyle(e);
    return (cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null);
  }, sel);
  const fresh = async () => { errors = []; await page.goto(FILE, { waitUntil: 'load' }); await page.waitForTimeout(500); };
  const click = async (sel, t = 5000) => { await page.locator(sel).first().click({ timeout: t, force: true }); await page.waitForTimeout(200); };
  const spoken = () => page.evaluate(() => window.__spoken.slice());
  const clearSpoken = () => page.evaluate(() => { window.__spoken.length = 0; });
  const waitSpoken = async n => {
    try { await page.waitForFunction(k => window.__spoken.length >= k, n, { timeout: 20000 }); }
    catch (e) { /* 超时就让断言去报，别在这里抛 */ }
    return spoken();
  };

  // ══════════ ① 设置屏：三个音源 ══════════
  await fresh();
  console.log('\n① 设置屏「听什么」三音源');
  await click('.mode-card[data-pagemode="listen"]');
  ok('「听什么」区可见', await vis('#ls-source-opts'));
  const srcBtns = await page.locator('#ls-source-opts .mode-btn-mini').count();
  ok('音源按钮 = 3 个（单词/短文/高频句）', srcBtns === 3, srcBtns + ' 个');
  ok('💬 高频句按钮存在', await vis('#ls-source-opts .mode-btn-mini[data-lssrc="phrase"]'));
  ok('高频句区默认隐藏', !(await vis('#ls-cat-grid')));

  // ══════════ ② 切到高频句：场景网格 ══════════
  console.log('\n② 💬 高频句 · 场景网格');
  await click('#ls-source-opts .mode-btn-mini[data-lssrc="phrase"]');
  ok('🔴 场景网格真的显示出来（.hidden!important 陷阱实机验证）', await vis('#ls-cat-grid'));
  ok('🔴「听哪几个场景」标题显示', await vis('#ls-cat-label'));
  ok('主题区已隐藏', !(await vis('#topic-grid')));
  ok('数量选择器已隐藏', !(await vis('.count-grid')));
  ok('篇目区已隐藏', !(await vis('#ls-book-grid')));
  ok('场景网格 9 个按钮（全部 + 8 场景）', (await page.locator('#ls-cat-grid .topic-btn').count()) === 9);
  // —— nth-child(n+10) 陷阱：全局规则会藏掉第 10 个及以后。8 个场景刚好卡在边界上，
  //    将来加第 9 个场景就会踩到，所以这里连「最后一个可见」一起验
  ok('🔴「全部」按钮可见', await vis('#ls-cat-grid .topic-btn[data-cat="all"]'));
  const catKeys = await page.evaluate(() => Object.keys(SENTENCES));
  ok('🔴 最后一个场景按钮可见 —— nth-child 陷阱', await vis('#ls-cat-grid .topic-btn[data-cat="' + catKeys[catKeys.length - 1] + '"]'));
  const startTxt = ((await page.locator('#start-btn').textContent()) || '').trim();
  ok('🔴 开始按钮文案跟着变「高频句」', startTxt.includes('高频句'), '实际「' + startTxt + '」');
  ok('手机宽度无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));

  // ══════════ ③ 选中一个场景 → 播放 ══════════
  console.log('\n③ 选「🏥 看病求助」→ 开始听');
  await click('#ls-cat-grid .topic-btn[data-cat="health"]');
  await click('#start-btn');
  ok('进入听力屏', await vis('#listen-screen'));
  const cardTopic = ((await page.locator('#ls-topic').textContent()) || '').trim();
  ok('卡片标注的是「看病求助」场景', cardTopic.includes('看病求助'), '实际「' + cardTopic + '」');
  const firstEn = ((await page.locator('#ls-en').textContent()) || '').trim();
  const healthFirst = await page.evaluate(() => SENTENCES.health.items[0].en);
  ok('句序保持场景原顺序（第一句 = 场景第一句）', firstEn === healthFirst, '卡片「' + firstEn + '」 vs 数据「' + healthFirst + '」');
  const firstCn = ((await page.locator('#ls-cn').textContent()) || '').trim();
  ok('卡片有中文', firstCn.length > 0);
  ok('HUD 单位是「句」不是「个」', ((await page.locator('#ls-unit').textContent()) || '').trim() === '句');

  // ══════════ ④ 三档 chips ══════════
  console.log('\n④ 朗读方式三档');
  ok('三档 chips 可见', await vis('#ls-mode-chips'));
  ok('三档都在（纯英文/中英交替/中英加读）',
     (await page.locator('#ls-mode-chips .ls-chip').count()) === 3);
  const activeMode = await page.evaluate(() =>
    (document.querySelector('#ls-mode-chips .ls-chip.active') || {}).dataset?.mode);
  ok('🔴 默认档 = 中英交替（mix）', activeMode === 'mix', '实际 ' + activeMode);
  ok('🔴 旧的「朗读中文意思」勾选框已消失', (await page.locator('#ls-saycn').count()) === 0);

  // ══════════ ⑤ 命门：中英交替真的按「英→中→英」念 ══════════
  console.log('\n⑤ 🔴 命门：TTS 调用序列');
  const seq = await waitSpoken(4);
  ok('至少念了 4 次（连播真的在推进）', seq.length >= 4, '只念了 ' + seq.length + ' 次');
  if (seq.length >= 4) {
    ok('第 1 次 = 英文', seq[0].lang !== 'zh-CN' && seq[0].text === healthFirst,
       JSON.stringify(seq[0]));
    ok('🔴 第 2 次 = 中文（中文当桥）', seq[1].lang === 'zh-CN', JSON.stringify(seq[1]));
    ok('🔴 第 3 次 = 同一句英文（回扣，把意思和声音重新绑一次）',
       seq[2].lang !== 'zh-CN' && seq[2].text === healthFirst, JSON.stringify(seq[2]));
    ok('第 4 次已进入下一句英文', seq[3].lang !== 'zh-CN' && seq[3].text !== healthFirst,
       JSON.stringify(seq[3]));
    ok('🔴 中文念的确实是这句的中文，不是别的',
       seq[1].text === (await page.evaluate(() => SENTENCES.health.items[0].cn)) ||
       seq[1].text === firstCn, '实际「' + seq[1].text + '」');
  }
  ok('播放中无未捕获异常', errors.length === 0, errors[0]);

  // ══════════ ⑥ 切「纯英文」：中文必须停 ══════════
  console.log('\n⑥ 🎧 切纯英文档');
  await click('#ls-mode-chips .ls-chip[data-mode="en"]');
  const enActive = await page.evaluate(() =>
    (document.querySelector('#ls-mode-chips .ls-chip.active') || {}).dataset?.mode);
  ok('「纯英文」chip 变 active', enActive === 'en');
  ok('「中英交替」chip 灭', await page.evaluate(() =>
    !document.querySelector('#ls-mode-chips .ls-chip[data-mode="mix"]').classList.contains('active')));
  await clearSpoken();
  const seqEn = await waitSpoken(4);
  ok('纯英文档仍在下句继续念（没卡死）', seqEn.length >= 4, '只念了 ' + seqEn.length + ' 次');
  ok('🔴 纯英文档一次中文都没有', seqEn.every(s => s.lang !== 'zh-CN'),
     JSON.stringify(seqEn.filter(s => s.lang === 'zh-CN')));
  ok('纯英文档全是整句英文（没被拆驼峰/转小写）',
     seqEn.every(s => s.text === s.text.trim() && /^[A-Z]/.test(s.text)),
     JSON.stringify(seqEn.map(s => s.text).slice(0, 3)));

  // ══════════ ⑦ 加读档 × 2 遍：回扣要回满 N 遍 ══════════
  console.log('\n⑦ 🔁 中英加读档（每句 2 遍）');
  // 🔴 先暂停再改设置：如果边播边改，正在念的那一句会「半路换档」，
  //    清空记录后头一条就是它的残余，中文位置就数不准了。暂停→改→播，
  //    当前句会从头发完整序列，这才是干净的样本。
  await click('#ls-play');                       // 暂停
  await click('#ls-rep-chips .ls-chip[data-rep="2"]');
  await click('#ls-mode-chips .ls-chip[data-mode="mix2"]');
  await clearSpoken();
  await click('#ls-play');                       // 当前句从头重念
  const seqMix2 = await waitSpoken(5);
  ok('加读档念够了次数', seqMix2.length >= 5, '只念了 ' + seqMix2.length + ' 次');
  if (seqMix2.length >= 5) {
    const zhAt = seqMix2.findIndex(s => s.lang === 'zh-CN');
    ok('加读档：中文之前先念 2 遍英文', zhAt === 2, '中文出现在第 ' + (zhAt + 1) + ' 次：' + JSON.stringify(seqMix2.map(s => s.lang)));
    ok('🔴 加读档：中文之后回扣满 2 遍英文（这是它和交替档的唯一区别）',
       seqMix2.slice(zhAt + 1, zhAt + 3).every(s => s.lang !== 'zh-CN'), JSON.stringify(seqMix2.slice(zhAt + 1, zhAt + 3)));
    ok('加读档中文只念 1 次（中文不是复读机）',
       seqMix2.filter(s => s.lang === 'zh-CN').length === 1);
  }

  // ══════════ ⑧ 参数持久化：切走再回来 ══════════
  console.log('\n⑧ 高频句自己的设置不被别人污染');
  await fresh();
  await click('.mode-card[data-pagemode="listen"]');
  await click('#ls-source-opts .mode-btn-mini[data-lssrc="phrase"]');
  await click('#ls-cat-grid .topic-btn[data-cat="dining"]');
  await click('#start-btn');
  await page.waitForTimeout(400);
  const keptMode = await page.evaluate(() =>
    (document.querySelector('#ls-mode-chips .ls-chip.active') || {}).dataset?.mode);
  const keptRep = await page.evaluate(() =>
    (document.querySelector('#ls-rep-chips .ls-chip.active') || {}).dataset?.rep);
  ok('🔴 重进后仍记住「中英加读」', keptMode === 'mix2', '实际 ' + keptMode);
  ok('🔴 重进后仍记住「2 遍」', keptRep === '2', '实际 ' + keptRep);
  const diningFirst = await page.evaluate(() => SENTENCES.dining.items[0].en);
  ok('换场景听的是新场景的第一句',
     ((await page.locator('#ls-en').textContent()) || '').trim() === diningFirst);

  // 切到单词音源，不该被高频句的设置带跑
  await page.locator('#ls-back').click({ force: true });
  await page.waitForTimeout(300);
  await click('#ls-source-opts .mode-btn-mini[data-lssrc="word"]');
  const wordRep = await page.evaluate(() =>
    (document.querySelector('#ls-rep-chips .ls-chip.active') || {}).dataset?.rep);
  const wordMode = await page.evaluate(() =>
    (document.querySelector('#ls-mode-chips .ls-chip.active') || {}).dataset?.mode);
  ok('🔴 切到单词音源：遍数回到单词自己的默认 2 遍', wordRep === '2', '实际 ' + wordRep);
  ok('单词音源也默认中英交替', wordMode === 'mix', '实际 ' + wordMode);

  // ══════════ ⑨ 短文音源的中文默认值（这次一并改的） ══════════
  console.log('\n⑨ 📖 短文音源默认中英交替（原来是死写纯英文）');
  await click('#ls-source-opts .mode-btn-mini[data-lssrc="sent"]');
  const sentMode = await page.evaluate(() =>
    (document.querySelector('#ls-mode-chips .ls-chip.active') || {}).dataset?.mode);
  ok('🔴 短文默认档 = 中英交替', sentMode === 'mix', '实际 ' + sentMode);
  await click('#ls-book-grid .topic-btn[data-book="r03"]');
  await click('#start-btn');
  await page.waitForTimeout(300);
  await clearSpoken();
  const seqSent = await waitSpoken(4);
  ok('短文也在念中文了', seqSent.some(s => s.lang === 'zh-CN'), JSON.stringify(seqSent.map(s => s.lang)));

  console.log('\n' + '='.repeat(50));
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  if (fails.length) console.log('失败项：\n  - ' + fails.join('\n  - '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
