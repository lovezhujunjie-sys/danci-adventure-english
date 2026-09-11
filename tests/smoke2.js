// 真浏览器冒烟测试 v2：每个板块独立（板块之间重新加载页面），导航不再互相传染
// 关键：SpeechSynthesisUtterance 是浏览器原生类，voice 的 setter 会校验真实对象，
//       桩里必须「整个替换掉这个类」，只在不存在时才赋值是无效的（v1 就栽在这儿）
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

  let errors = [], consoleErrs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

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

  const vis = sel => page.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) return null;
    const cs = getComputedStyle(e);
    return (cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null);
  }, sel);
  const fresh = async () => { errors = []; consoleErrs = []; await page.goto(FILE, { waitUntil: 'load' }); await page.waitForTimeout(500); };
  // force:true —— 应用里有浮层（单词卡/朗读条），会挡住指针，这属于布局不是 bug
  const click = async (sel, t = 5000) => { await page.locator(sel).first().click({ timeout: t, force: true }); await page.waitForTimeout(250); };

  // ══════════ ① 加载 ══════════
  await fresh();
  console.log('\n① 加载与首页');
  ok('加载无未捕获异常', errors.length === 0, errors[0]);
  ok('首页可见', await vis('#start-screen'));
  ok('⏱️30分钟卡片渲染', (await page.locator('#m30-val').textContent()).includes('分钟'));
  ok('仪表盘已填', (await page.locator('#total-count').textContent()).length > 0);

  // ══════════ ② 听力：短文音源 ══════════
  await fresh();
  console.log('\n② 🎧 听力磨耳朵 · 短文音源');
  await click('.mode-card[data-pagemode="listen"]');
  ok('「听什么」选择器出现', await vis('#ls-source-opts'));
  ok('默认单词源：主题区可见', await vis('#topic-grid'));
  // ══════════ 单词主题网格的折叠（2026-09-11 补：原先把 nth-child 陷阱只测了篇目网格，
  //            而主题网格 41→51 个才是这个陷阱最容易爆的地方，属于测试盲区）
  //   注意：下面全部按「与主题数量无关」的写法，41 个时能过，51 个时也要能过
  const nTopic = await page.evaluate(() => Object.keys(VOCAB).length);
  const nTopicBtn = await page.locator('#topic-grid > .topic-btn').count();
  ok('主题网格按钮数 = 主题数 + 1（多一个「全部混合」）', nTopicBtn === nTopic + 1, nTopicBtn + ' 个按钮 vs ' + nTopic + ' 个主题');
  ok('副标题「N 个主题」与真实数据一致', ((await page.locator('#topic-count').textContent()) || '').trim() === String(nTopic));
  const sumCnt = await page.evaluate(() => Array.from(document.querySelectorAll('#topic-grid .cnt'))
    .filter(e => e.id !== 'cnt-all').reduce((s, e) => s + Number(e.textContent || 0), 0));
  ok('副标题「N 个词」= 各主题词数之和', Number(((await page.locator('#total-count').textContent()) || '').trim()) === sumCnt, sumCnt);
  const shownTop = await page.evaluate(() => Array.from(document.querySelectorAll('#topic-grid > .topic-btn'))
    .slice(0, 10).map(b => getComputedStyle(b).display !== 'none'));
  ok('收起态：前 9 个主题可见', shownTop.slice(0, 9).every(Boolean));
  ok('🔴 收起态：第 10 个主题被藏 —— nth-child 陷阱（单词网格）', shownTop[9] === false);
  ok('「展开全部」按钮存在', await vis('#topic-more'));
  const moreTxt = ((await page.locator('#topic-more').textContent()) || '').trim();
  ok('🔴 展开按钮的数字与副标题一致（同屏不许自相矛盾）', moreTxt.includes(String(nTopic)), '按钮写「' + moreTxt + '」而副标题是 ' + nTopic);
  await click('#topic-more');
  const lastShown = await page.evaluate(() => {
    const a = document.querySelectorAll('#topic-grid > .topic-btn');
    return { tenth: getComputedStyle(a[9]).display !== 'none', last: getComputedStyle(a[a.length - 1]).display !== 'none' };
  });
  ok('🔴 展开后第 10 个主题可见 —— nth-child 陷阱（单词网格）', lastShown.tenth);
  ok('🔴 展开后最后一个主题可见', lastShown.last);
  ok('展开后按钮文案变「收起」', (((await page.locator('#topic-more').textContent()) || '').includes('收起')));
  await click('#topic-more');
  ok('🔴 再点收起：第 10 个又藏起来', await page.evaluate(() => getComputedStyle(document.querySelectorAll('#topic-grid > .topic-btn')[9]).display === 'none'));
  ok('默认单词源：篇目区隐藏', !(await vis('#ls-book-grid')));
  const btnWord = await page.locator('#start-btn').textContent();

  await click('#ls-source-opts .mode-btn-mini[data-lssrc="sent"]');
  ok('🔴 篇目区真的显示出来（.hidden!important 陷阱实机验证）', await vis('#ls-book-grid'));
  ok('🔴「听哪几篇」标题显示', await vis('#ls-book-label'));
  ok('主题区已隐藏', !(await vis('#topic-grid')));
  ok('数量选择器已隐藏', !(await vis('.count-grid')));
  ok('篇目网格 21 个按钮', (await page.locator('#ls-book-grid .topic-btn').count()) === 21);
  // —— nth-child(n+10) 陷阱：全局规则会藏掉第 10 个及以后
  ok('🔴「全部」按钮可见', await vis('#ls-book-grid .topic-btn[data-book="all"]'));
  ok('🔴 r08（第 9 个）可见', await vis('#ls-book-grid .topic-btn[data-book="r08"]'));
  ok('🔴 r09（第 10 个）可见 —— nth-child 陷阱', await vis('#ls-book-grid .topic-btn[data-book="r09"]'));
  ok('🔴 r20（最后一个）可见 —— nth-child 陷阱', await vis('#ls-book-grid .topic-btn[data-book="r20"]'));
  const btnSent = await page.locator('#start-btn').textContent();
  ok('🔴 切短文后开始按钮文案跟着变', btnSent !== btnWord && btnSent.includes('短文'), '还是「' + btnWord + '」');
  ok('手机宽度无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));

  // —— 回归验证：从短文源切到别的模式，主题区必须能回来
  await click('.mode-card[data-pagemode="study"]');
  ok('🔴 短文→学习卡：主题标题回来了', await vis('#topic-section'));
  ok('🔴 短文→学习卡：主题网格回来了', await vis('#topic-grid'));
  ok('🔴 短文→学习卡：数量选择器回来了', await vis('.count-grid'));
  ok('短文→学习卡：篇目区已收走', !(await vis('#ls-book-grid')));

  // —— 回听力看播放
  await fresh();
  await click('.mode-card[data-pagemode="listen"]');
  await click('#ls-source-opts .mode-btn-mini[data-lssrc="sent"]');
  await click('#ls-book-grid .topic-btn[data-book="r03"]');
  await click('#start-btn');
  ok('进入听力屏', await vis('#listen-screen'));
  ok('渲染的是句子不是单词', ((await page.locator('#ls-en').textContent()) || '').includes(' '));
  ok('HUD 单位=句', (await page.locator('#ls-unit').textContent()) === '句');
  ok('计数单位=句', (await page.locator('#ls-unit2').textContent()) === '句');
  ok('卡片带 sent 类', ((await page.locator('.ls-card').getAttribute('class')) || '').includes('sent'));
  ok('总句数 = r03 段数(15)', (await page.locator('#ls-total').textContent()) === '15');
  await page.waitForTimeout(2000);
  const spokeN = await page.evaluate(() => window.__spoken.length);
  ok('🔴 真的开始朗读了（自动连播没卡死）', spokeN >= 1, '只念了 ' + spokeN + ' 句');
  ok('朗读期间无未捕获异常', errors.length === 0, errors[0]);
  await page.waitForTimeout(2500);
  const spokeN2 = await page.evaluate(() => window.__spoken.length);
  ok('🔴 连播在推进（不是卡在第一句）', spokeN2 > spokeN, spokeN + ' → ' + spokeN2);

  // ══════════ ③ 阅读 + 点词 ══════════
  await fresh();
  console.log('\n③ 📖 分级阅读 + 点词查义');
  await click('.mode-card[data-goto="reading"]');
  ok('书架 20 篇', (await page.locator('.rd-book').count()) === 20);
  await page.locator('.rd-book').first().click();
  await page.waitForTimeout(400);
  ok('正文渲染出句子', (await page.locator('#rd-body .rd-sent').count()) > 5);
  await page.locator('#rd-body .rd-sent .sent-en .w').first().click();
  await page.waitForTimeout(300);
  ok('点词弹卡出现', (await page.locator('.word-pop').count()) > 0);
  const popTxt = (await page.locator('.word-pop').first().textContent()) || '';
  ok('卡片有中文', /[一-龥]/.test(popTxt));
  ok('卡片有音标', popTxt.includes('/'));
  // 点第二个词：卡片浮在上面会挡住指针，用 force 直接派发（用户实际操作是先点空白关卡片）
  await page.locator('#rd-body .rd-sent').nth(1).locator('.sent-en .w').first().click({ force: true });
  await page.waitForTimeout(300);
  ok('切到第二个词不报错', errors.length === 0, errors[0]);
  await page.locator('#rd-listen').click();
  await page.waitForTimeout(700);
  ok('🎧「听这篇」能进听力屏', await vis('#listen-screen'));
  ok('听的是刚打开的那篇', ((await page.locator('#ls-topic').textContent()) || '').includes('My Day'));

  // ══════════ ④ 每个界面走一遍（每屏独立重载，互不传染）══════════
  console.log('\n④ 每个界面单独走一遍');
  const walk = async (name, fn, expectSel) => {
    await fresh();
    try {
      await fn();
      await page.waitForTimeout(400);
      const v = expectSel ? await vis(expectSel) : true;
      ok('「' + name + '」打得开' + (expectSel ? ' 且界面可见' : ''), v && errors.length === 0, errors[0] || ('界面不可见: ' + expectSel));
    } catch (e) { ok('「' + name + '」打得开', false, String(e.message).slice(0, 120)); }
  };
  await walk('单词学习(翻卡)', async () => { await click('.mode-card[data-pagemode="study"]'); await click('#start-btn'); }, '#study-screen');
  // 🔴 30 分钟计时的真契约：在闪卡模式待着，今日时长必须真的往上涨。
  // （考的是 window.getTodaySec 这个对外口子，不是 __curScreen 那种内部状态——
  //   计时判据已经从「谁设了 __curScreen」改成「DOM 上谁露着」，再考 __curScreen 就是考陈旧契约）
  await page.evaluate(() => window.scrollTo(0, 0));
  const sec0 = await page.evaluate(() => window.getTodaySec());
  await page.waitForTimeout(12000);   // 计时器 5 秒一跳，等两个多周期
  const sec1 = await page.evaluate(() => window.getTodaySec());
  ok('🔴 闪卡模式计时真的在走（这是最常用的模式，以前恒为 0）', sec1 > sec0, sec0 + ' → ' + sec1);
  ok('🔴 计时增量是真实秒数（不是凭空灌的）', sec1 - sec0 >= 5 && sec1 - sec0 <= 20, '涨了 ' + (sec1 - sec0) + ' 秒');
  // 反向：回首页待着，时长必须停表
  await click('#study-back');
  await page.waitForTimeout(500);
  const secH0 = await page.evaluate(() => window.getTodaySec());
  await page.waitForTimeout(11000);
  const secH1 = await page.evaluate(() => window.getTodaySec());
  ok('🔴 回首页后停表（首页不算学习时长）', secH1 === secH0, secH0 + ' → ' + secH1);
  await walk('闯关地图', async () => { await click('.mode-card[data-goto="map"]'); }, '#map-screen');
  await walk('字母拼读', async () => { await click('.mode-card[data-pagemode="phonics"]'); await click('#start-btn'); }, '#phonics-screen');
  await walk('游戏乐园', async () => { await click('.mode-card[data-pagemode="games"]'); await click('#start-btn'); }, '#games-screen');
  await walk('拼写默写', async () => { await click('.mode-card[data-pagemode="type"]'); await click('#start-btn'); }, '#type-screen');
  await walk('日常高频句', async () => { await click('.mode-card[data-goto="sentence"]'); }, '#sentence-screen');
  await walk('句型骨架', async () => { await click('.mode-card[data-goto="pattern"]'); }, '#pattern-screen');
  // 真身的 id 是 entry-achv（#achv-entry 是我上一版写错的选择器，不是 App 的锅）
  await walk('我的成就', async () => { await click('#entry-achv'); }, '#achv-screen');

  // ══════════ ⑤ 通用体检 ══════════
  await fresh();
  console.log('\n⑤ 通用体检');
  ok('全程无 console.error（首页）', consoleErrs.length === 0, consoleErrs[0]);
  await page.setViewportSize({ width: 400, height: 844 });
  await page.waitForTimeout(300);
  ok('400px 宽无横向滚动条', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
  ok('localStorage 有内容', (await page.evaluate(() => Object.keys(localStorage).length)) > 0);

  console.log('\n' + '='.repeat(52));
  if (fails.length) { console.log('失败项:'); fails.forEach(f => console.log('  • ' + f)); }
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
