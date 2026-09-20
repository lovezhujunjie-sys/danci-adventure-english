// 翻卡配图回归（2026-09-20 老曾需求：翻卡学单词时，单词旁边放一张对应图片）
//
// 分两层：
//   ① 静态：图库结构（孤儿键/纯度/覆盖率）+ index.html 里的 PIC_MAP 与 tools/pics/pic_map.json 是否一致
//   ② 真浏览器：卡片上到底渲不渲染得出来、图片在不在单词左边、没图的词会不会裂版
//
// 关键：不在测试里重写业务逻辑 —— 覆盖率、渲染结果都拿 index.html 里的真身常量/真身 DOM 来比。
const { chromium } = require('playwright-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
const cp = require('child_process');

const SKILL = path.join(__dirname, '..');
const CHROME = path.join(os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const FILE = 'file://' + path.join(SKILL, 'index.html');

// 覆盖率的底线（防某次改动把图库清空/编译漏掉）。涨上去后要跟着往上抬。
// 2026-09-20 首次配图后实测 69.9%（3495/5000）；剩下的是 T27 副词 / T29 功能词这类
// 根本没有对应图形的词，宁可留空也不硬凑，所以底线就卡在 68%。
const COVER_FLOOR = 0.68;

let pass = 0, fail = 0;
const fails = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
};

const src = fs.readFileSync(path.join(SKILL, 'index.html'), 'utf8');
const grab = name => {
  const m = src.match(new RegExp('^const ' + name + ' = (.*);$', 'm'));
  if (!m) throw new Error('index.html 里找不到常量 ' + name);
  return JSON.parse(m[1]);
};
const VOCAB = grab('VOCAB');
const PIC_MAP = grab('PIC_MAP');
const EMOJI_MAP = grab('EMOJI_MAP');
const AUTHORED = JSON.parse(fs.readFileSync(path.join(SKILL, 'tools/pics/pic_map.json'), 'utf8'));

const vocabWords = new Map();   // en -> cn
for (const k of Object.keys(VOCAB)) for (const w of VOCAB[k].words) if (!vocabWords.has(w.en)) vocabWords.set(w.en, w.cn);

(async () => {
  // ══════════ ① 静态：图库结构 ══════════
  console.log('\n① 图库结构（静态）');

  const orphans = Object.keys(PIC_MAP).filter(k => !vocabWords.has(k));
  ok('PIC_MAP 里没有 VOCAB 不存在的词（孤儿键 = 拼错了）', orphans.length === 0, orphans.slice(0, 8).join(', '));

  // 数字键位 emoji（0️⃣ 之类）本身就带数字字符 + U+20E3，先剥掉再查，不然会误报
  const dirty = Object.entries(PIC_MAP).filter(([, v]) => !v || /[A-Za-z0-9]/.test(v.replace(/[0-9#*]\uFE0F?\u20E3/g, '')));
  ok('每个值都是纯图形（没有英文字母/数字混进来）', dirty.length === 0,
    dirty.slice(0, 5).map(([k, v]) => k + '=' + v).join(' '));

  const cov = Object.keys(PIC_MAP).length / vocabWords.size;
  ok('图片覆盖率 ≥ ' + Math.round(COVER_FLOOR * 100) + '%（当前 ' + (cov * 100).toFixed(1) + '%）', cov >= COVER_FLOOR);

  const authoredOrphans = Object.keys(AUTHORED).filter(k => !vocabWords.has(k));
  ok('人工表 pic_map.json 没有孤儿键', authoredOrphans.length === 0, authoredOrphans.slice(0, 8).join(', '));

  const notBuilt = Object.entries(AUTHORED).filter(([k, v]) => PIC_MAP[k] !== v);
  ok('人工表每条都真进了 index.html（忘了跑 build_pic_map.py？）', notBuilt.length === 0,
    notBuilt.slice(0, 5).map(([k]) => k).join(', '));

  ok('EMOJI_MAP 没被动过（看图猜词游戏的表，不许和配图混用）',
    Object.keys(EMOJI_MAP).length >= 500 && EMOJI_MAP.cat === '🐱');

  // Unicode 16（2024）新增的那批 emoji，老设备/旧系统会渲染成方块，配图里不许用
  const U16 = [0x1FA89, 0x1FA8F, 0x1FABE, 0x1FAC6, 0x1FADC, 0x1FADF, 0x1FAE9, 0x1FAEA, 0x1FAEB, 0x1FAEC, 0x1FAED, 0x1FAEE];
  const tooNew = Object.entries(PIC_MAP).filter(([, v]) =>
    [...v].some(ch => U16.includes(ch.codePointAt(0))));
  ok('没有用 Unicode 16 的新 emoji（老设备会显示成方块）', tooNew.length === 0,
    tooNew.slice(0, 5).map(([k, v]) => k + '=' + v).join(' '));

  let checkOut = '', checkOk = true;
  try {
    checkOut = cp.execFileSync('python3', ['tools/pics/build_pic_map.py', '--check'],
      { cwd: SKILL, encoding: 'utf8' });
  } catch (e) {
    checkOk = false;
    checkOut = (e.stdout || '') + (e.stderr || '');
  }
  ok('build_pic_map.py --check 通过（产物与源文件一致）', checkOk, checkOut.split('\n').slice(-3).join(' | '));

  // ══════════ ② 真浏览器 ══════════
  console.log('\n② 真卡片渲染（Chromium）');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const RealUtter = function (t) { this.text = t; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.lang = ''; };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: RealUtter, configurable: true, writable: true });
    const fake = {
      speak: u => { setTimeout(() => u.onend && u.onend(), 0); }, cancel: () => {}, pause: () => {}, resume: () => {},
      getVoices: () => [{ name: 'Samantha', lang: 'en-US' }], speaking: false, pending: false, paused: false,
      addEventListener: () => {}, removeEventListener: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
  });
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const click = async sel => { await page.locator(sel).first().click({ timeout: 5000, force: true }); await page.waitForTimeout(160); };

  // 翻一岛 20 张卡，逐张把"用户看得见的东西"读回来
  const sweep = async topic => {
    // 回到设置屏（第一次进来时学习屏还没打开，按钮是 hidden，不能硬点）
    const inStudy = await page.evaluate(() => !document.getElementById('study-screen').classList.contains('hidden'));
    if (inStudy) { await click('#study-back'); await page.waitForTimeout(250); }
    await click('#topic-more');                 // 展开全部主题（默认只露 9 个）
    await click('.topic-btn[data-topic="' + topic + '"]');
    await click('.count-btn[data-count="20"]');
    await click('#start-btn');
    const out = [];
    for (let i = 0; i < 20; i++) {
      const r = await page.evaluate(() => {
        const pic = document.getElementById('fc-pic');
        const en = document.getElementById('fc-en');
        const main = document.getElementById('fc-main');
        const card = document.getElementById('flashcard');
        const tag = document.getElementById('fc-topic');
        const spk = document.getElementById('fc-speak');
        const pb = pic.getBoundingClientRect(), eb = en.getBoundingClientRect();
        const tb = tag.getBoundingClientRect(), sb = spk.getBoundingClientRect();
        const text = en.parentElement.getBoundingClientRect();
        const cs = getComputedStyle(pic);
        return {
          en: en.textContent.trim(),
          pic: pic.textContent.trim(),
          picVisible: cs.display !== 'none' && pic.offsetParent !== null,
          hasPicClass: main.classList.contains('has-pic'),
          picLeft: pb.left, enLeft: eb.left, picW: pb.width, picTop: pb.top, picBottom: pb.bottom, picRight: pb.right,
          tagBottom: tb.bottom, spkLeft: sb.left, spkBottom: sb.bottom,
          picMid: pb.top + pb.height / 2, textMid: text.top + text.height / 2,
          cardClip: card.scrollHeight > card.clientHeight + 2,
          enClip: en.scrollHeight > en.clientHeight + 2,
          cnHidden: document.getElementById('fc-cn').classList.contains('hidden-cn'),
          vw: window.innerWidth, bodyScrollW: document.documentElement.scrollWidth,
        };
      });
      r.expect = await page.evaluate(w => (typeof PIC_MAP !== 'undefined' ? (PIC_MAP[w] || '') : 'MISSING'), r.en);
      out.push(r);
      if (i < 19) await click('#next-btn');
    }
    return out;
  };

  let rows = await sweep('T11');   // 动物与自然：最直观的一岛
  ok('进入学习卡片模式', await page.evaluate(() => !document.getElementById('study-screen').classList.contains('hidden')));

  const t11 = rows;
  rows = rows.concat(await sweep('T02'));   // 社会与国家：专挑长单词（responsibility/international/constitution）
  ok('两岛 40 张卡全部取到了英文单词', rows.every(r => r.en.length > 0));
  ok('渲染出的图片与 PIC_MAP 逐词一致', rows.every(r => r.pic === r.expect),
    rows.filter(r => r.pic !== r.expect).slice(0, 3).map(r => r.en + ': 页面=' + r.pic + ' 表=' + r.expect).join(' | '));
  ok('长单词（14 字符级）没把卡片内部撑破/裁切', rows.every(r => !r.cardClip && !r.enClip),
    rows.filter(r => r.cardClip || r.enClip).slice(0, 3).map(r => r.en).join(' '));

  const withPic = t11.filter(r => r.expect).length;
  ok('「动物与自然」这岛 20 张里至少 14 张有图（当前 ' + withPic + '/20）', withPic >= 14);
  rows = t11;   // 后面的位置/版式断言继续用第一岛的数据

  ok('有图 → 图框真的可见（不是空的）', rows.filter(r => r.expect).every(r => r.picVisible && r.pic.length > 0));
  ok('没图 → 图框隐藏、卡片不留空框', rows.filter(r => !r.expect).every(r => !r.picVisible && !r.hasPicClass));
  ok('有图 → 图片在单词左边', rows.filter(r => r.expect).every(r => r.picLeft < r.enLeft));
  ok('有图 → 图框尺寸正常（桌面/手机自适应后仍 ≥ 70px）', rows.filter(r => r.expect).every(r => r.picW >= 70));
  const pic = rows.filter(r => r.expect);
  ok('有图 → 图框没压住左上角主题标签、也没压住右上角 🔊',
    pic.every(r => r.picTop >= r.tagBottom) &&
    pic.every(r => r.picRight <= r.spkLeft || r.picBottom <= r.spkBottom));
  ok('有图 → 图框与文字块垂直居中对齐（差 ≤ 14px）', pic.every(r => Math.abs(r.picMid - r.textMid) <= 14),
    pic.filter(r => Math.abs(r.picMid - r.textMid) > 14).slice(0, 3).map(r => r.en + ':' + Math.round(r.picMid - r.textMid)).join(' '));
  ok('卡片没被配图挤到横向溢出', rows.every(r => r.bodyScrollW <= r.vw + 1),
    rows.filter(r => r.bodyScrollW > r.vw + 1).slice(0, 2).map(r => r.en + ':' + r.bodyScrollW + '>' + r.vw).join(' '));

  // 翻开中文：配图不该把原来的翻卡流程弄坏
  await page.locator('#flashcard').click({ force: true });
  await page.waitForTimeout(200);
  ok('点卡片仍能翻出中文', !(await page.evaluate(() => document.getElementById('fc-cn').classList.contains('hidden-cn'))));
  ok('翻卡过程没有未捕获异常', errors.length === 0, errors[0]);

  await page.screenshot({ path: '/tmp/flashcard_pic.png' });
  console.log('  ℹ️ 截图: /tmp/flashcard_pic.png');
  await browser.close();

  console.log('\n结果: ' + pass + ' 通过 / ' + fail + ' 失败');
  if (fail) { console.log('失败项:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch(e => { console.error('测试崩了:', e); process.exit(2); });
