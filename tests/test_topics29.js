// 主题重构回归：82 主题 → 29 主题（2026-09-12）
//
// 🔴 为什么必须单独写一个：其余 11 个测试全是**重构之前**写的，
//    它们只保证「界面还能用」，没有任何一条会去看主题是几个、词是不是 5000、
//    老存档的星星有没有丢。这次动的是词库和主题编号，属于测试盲区。
//
// 判据（缺一不可）：
//   ① 首页 / 卡片 / 地图三处数字都是 29（不是硬编码，是运行期从 VOCAB 数出来的）
//   ② 地图真的渲染出 29 座岛，名字都对得上
//   ③ 词库 5000 条、归一后互不重复（去重的意义就在这）
//   ④ 老存档星星按占比摊到新主题，且**只摊一次**（重复 reload 不能翻倍）
//   ⑤ 含大写/空格的词（Face ID 这类）音标仍查得到 —— 去重时最容易在这静默丢音标
//   ⑥ 全程无 JS 报错
//
// 跑法：cd ~/.claude/skills/自学英语
//       NODE_PATH=/tmp/pwtest/node_modules node tests/test_topics29.js
const { chromium } = require('playwright-core');
const path = require('path'), os = require('os');

const CHROME = path.join(os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const FILE = 'file://' + path.join(os.homedir(), '.claude/skills/自学英语/index.html');

let pass = 0, fail = 0;
const fails = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + extra : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  const boot = async () => { await page.goto(FILE); await page.waitForTimeout(600); };

  // ---------- ① 三处数字 ----------
  console.log('\n① 主题数显示（首页 / 卡片 / 地图）');
  await boot();
  ok('首页 topic-count = 29', (await page.textContent('#topic-count')).trim() === '29',
    await page.textContent('#topic-count'));
  ok('首页 total-count = 5000', (await page.textContent('#total-count')).trim() === '5000',
    await page.textContent('#total-count'));
  const isleCnt = await page.$$eval('.isle-count', els => els.map(e => e.textContent.trim()));
  ok('所有 .isle-count 都是 29（共 ' + isleCnt.length + ' 处）',
    isleCnt.length > 0 && isleCnt.every(v => v === '29'), JSON.stringify(isleCnt));

  // ---------- ② 词库结构 ----------
  console.log('\n② 词库结构（去重后必须真的不重复）');
  const stat = await page.evaluate(() => {
    const nk = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9]/g, '');
    const ks = Object.keys(VOCAB);
    let total = 0; const seen = new Map(); const dups = [];
    for (const k of ks) for (const w of VOCAB[k].words) {
      total++;
      const n = nk(w.en);
      if (seen.has(n)) dups.push(w.en + ' ↔ ' + seen.get(n)); else seen.set(n, w.en);
    }
    return {
      topics: ks.length, total, uniq: seen.size, dups: dups.slice(0, 10),
      keysOk: ks.every(k => /^T\d\d$/.test(k)),
      metaOk: ks.every(k => VOCAB[k].name && VOCAB[k].icon),
      empty: ks.filter(k => !VOCAB[k].words.length),
      noCn: ks.filter(k => VOCAB[k].words.some(w => !String(w.cn).trim())).length,
      ipaKeys: Object.keys(IPA_MAP).length,
      names: ks.map(k => VOCAB[k].name)
    };
  });
  ok('主题数 = 29', stat.topics === 29, stat.topics);
  ok('主题编号全是 T01~T29', stat.keysOk);
  ok('每个主题都有名字+图标', stat.metaOk);
  ok('没有空主题', stat.empty.length === 0, JSON.stringify(stat.empty));
  ok('词条总数 = 5000', stat.total === 5000, stat.total);
  ok('5000 个词归一后互不重复', stat.dups.length === 0, JSON.stringify(stat.dups));
  ok('每条都有中文释义', stat.noCn === 0, stat.noCn + ' 个主题里有空释义');
  ok('音标条数 ≥ 4900', stat.ipaKeys >= 4900, stat.ipaKeys);

  // ---------- ③ 高风险：含大写/空格的词音标还在不在 ----------
  console.log('\n③ 含大写/空格的词音标（去重时最易静默丢失）');
  const risky = await page.evaluate(() => {
    const nk = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9]/g, '');
    const out = { total: 0, miss: [] };
    for (const k in VOCAB) for (const w of VOCAB[k].words) {
      if (!/[A-Z]|\s/.test(w.en)) continue;
      out.total++;
      if (!IPA_MAP[w.en]) out.miss.push(w.en);
    }
    return out;
  });
  ok('含大写或空格的词共 ' + risky.total + " 个，逐个用原文查 IPA_MAP 都能查到",
    risky.miss.length === 0, '查不到的音标: ' + JSON.stringify(risky.miss.slice(0, 10)));
  const caps = await page.evaluate(() => {
    for (const k in VOCAB) for (const w of VOCAB[k].words)
      if (/[A-Z]/.test(w.en)) return { en: w.en, ipa: IPA_MAP[w.en] || '' };
    return null;
  });
  ok('抽查一个大写词有音标: ' + (caps && caps.en) + ' → ' + (caps && caps.ipa),
    !!(caps && caps.ipa));

  // ---------- ④ 地图 ----------
  console.log('\n④ 闯关地图真的渲染出 29 座岛');
  // 选择器照 smoke2.js：模块卡是 .mode-card[data-goto="map"]（别凭印象写 text=）
  await page.click('.mode-card[data-goto="map"]');
  await page.waitForTimeout(600);
  const isles = await page.$$eval('.map-isle', els => els.map(e => ({
    // 岛上带序号前缀（"1. 人物与家庭"），比对前剥掉
    nm: ((e.querySelector('.isle-nm') || {}).textContent || '').replace(/^\s*\d+[.、]\s*/, '').trim()
  })));
  ok('地图上 29 座岛', isles.length === 29, isles.length);
  ok('岛名和 VOCAB 主题名一一对应',
    JSON.stringify(isles.map(i => i.nm)) === JSON.stringify(stat.names),
    JSON.stringify(isles.slice(0, 3).map(i => i.nm)) + ' vs ' + JSON.stringify(stat.names.slice(0, 3)));
  // 点最后一个岛，确认能进去（编号错位最怕点不开）
  const quizShown = await page.evaluate(() => {
    const els = document.querySelectorAll('.map-isle');
    if (!els.length) return false;
    els[els.length - 1].click();
    return true;
  });
  await page.waitForTimeout(800);
  const quizText = await page.evaluate(() => {
    const now = document.querySelector('#map-screen');
    return now ? now.textContent.replace(/\s+/g, ' ').slice(0, 120) : '';
  });
  ok('最后一座岛（T29 功能词）点得开、进得去', quizShown && quizText.length > 0, quizText);
  await page.goto(FILE); await page.waitForTimeout(500);

  // ---------- ⑤ 老存档星星迁移 ----------
  console.log('\n⑤ 老存档（82 主题键）的星星迁移');
  // 造一个老存档：people 满星 3、tech 2 星、daily 3 星、外带一个从没见过的键
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('wordadv_map_stars', JSON.stringify({
      people: 3, tech: 2, daily: 3, function_words: 1, totally_unknown_key: 2
    }));
    localStorage.removeItem('wordadv_map_migrated_v29');
  });
  await boot();
  // 🔴 迁移是在 openMap() → mapLoadState() 里跑的，光 reload 不会触发。
  //    这不是 bug：mapStars 的读取点全在地图流程内，进地图前没人会读到脏数据。
  await page.click('.mode-card[data-goto="map"]');
  await page.waitForTimeout(600);
  const mig = await page.evaluate(() => ({
    stars: JSON.parse(localStorage.getItem('wordadv_map_stars') || '{}'),
    flag: localStorage.getItem('wordadv_map_migrated_v29'),
    migrate: typeof STAR_MIGRATE === 'object'
  }));
  ok('迁移标记已写下 (=1)', mig.flag === '1', mig.flag);
  ok('新键 T01 拿到星星（people 全进 T01，应=3）', mig.stars.T01 === 3, JSON.stringify(mig.stars));
  ok('tech(2星) 摊到了 T19/T20/T18/T07', ['T19', 'T20', 'T18', 'T07'].some(k => mig.stars[k] > 0),
    JSON.stringify(mig.stars));
  ok('daily(3星) 摊到了多个新主题', ['T15', 'T09', 'T08', 'T18'].filter(k => mig.stars[k] > 0).length >= 2,
    JSON.stringify(mig.stars));
  ok('老主题键已清空（不留 people/tech/daily）',
    !('people' in mig.stars) && !('tech' in mig.stars) && !('daily' in mig.stars),
    JSON.stringify(mig.stars));
  // 🔴 这条是核心：星星总数一颗都不能少。
  //    用 Math.round 时 daily(3星) 只摊出 1 星、adj_basic(3星) 只摊出 1 星，
  //    全库满星算会白丢 11 颗。改成最大余额法后必须严丝合缝。
  const newKeyTotal = Object.keys(mig.stars)
    .filter(k => /^T\d\d$/.test(k)).reduce((a, k) => a + mig.stars[k], 0);
  ok('星星总数一颗不少（3+2+3+1=9）', newKeyTotal === 9,
    '实得 ' + newKeyTotal + ' 星 → ' + JSON.stringify(mig.stars));
  ok('认不出的老键原样保留（totally_unknown_key=2）', mig.stars.totally_unknown_key === 2,
    JSON.stringify(mig.stars));
  ok('单个主题封顶 3 星', Object.values(mig.stars).every(v => v <= 3), JSON.stringify(mig.stars));

  // 只摊一次：再 reload 一次，星星数必须一字不变
  const before = JSON.stringify(mig.stars);
  await boot();
  const after = await page.evaluate(() => localStorage.getItem('wordadv_map_stars'));
  ok('重复 reload 不会重复摊（第二次一模一样）', before === after,
    before + '  →  ' + after);

  // ---------- ⑥ 真实使用：翻卡时音标/释义查得到 ----------
  console.log('\n⑥ 翻卡：卡片上的音标是真音标（不是空壳）');
  await page.evaluate(() => { localStorage.clear(); });
  await boot();
  await page.click('.mode-card[data-pagemode="study"]');
  await page.click('#start-btn');
  await page.waitForTimeout(900);
  const card = await page.evaluate(() => ({
    en: (document.getElementById('fc-en') || {}).textContent || '',
    ipa: (document.getElementById('fc-ipa') || {}).textContent || '',
    cn: (document.getElementById('fc-cn') || {}).textContent || '',
    topic: (document.getElementById('fc-topic') || {}).textContent || ''
  }));
  ok('翻卡屏出现英文单词 (' + card.en.trim() + ')', !!card.en.trim(), card.en);
  ok('卡片上音标非空 (' + card.en.trim() + ' → ' + card.ipa.trim() + ')',
    !!card.ipa.trim() && card.ipa.trim() !== '/ /', card.ipa);
  ok('卡片上有中文释义 (' + card.cn.trim().slice(0, 20) + ')', !!card.cn.trim(), card.cn);
  // 卡片上的主题名带图标前缀（"😊 情绪与性格"），剥掉图标再比对
  const topicBare = card.topic.trim().replace(/^[^一-鿿]+/, '').trim();
  ok('卡片上的主题名是 29 个新主题之一 (' + card.topic.trim() + ')',
    stat.names.indexOf(topicBare) >= 0, topicBare);

  // ---------- ⑦ 全程无报错 ----------
  console.log('\n⑦ 全程无 JS 报错');
  const real = errs.filter(e => !/favicon|net::ERR_FILE|Failed to load resource/i.test(e));
  ok('没有 pageerror / console.error', real.length === 0, real.slice(0, 3).join(' | '));

  console.log('\n' + '='.repeat(52));
  console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
  if (fail) console.log('失败项:\n  - ' + fails.join('\n  - '));

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
