// 听力磨耳朵「短文音源」行为测试
// 铁律：必须切 index.html 里的真实代码来跑，不许重写副本（重写副本 = 没测）
const fs = require('fs');
const HTML = fs.readFileSync(process.env.HOME + '/.claude/skills/自学英语/index.html', 'utf8');

function slice(from, to, label) {
  const i = HTML.indexOf(from);
  if (i < 0) throw new Error('找不到起点锚: ' + label);
  const j = HTML.indexOf(to, i);
  if (j < 0) throw new Error('找不到终点锚: ' + label);
  return HTML.slice(i, j);
}

// ---- 切出真实代码段 ----

// setShown 是 2026-09-11 抽出来的公共显隐函数,不在被切片的听力段里,单独切真身注入
const SETSHOWN_CODE = slice(
  "  function setShown(id, show) {",
  "  function showScreen(id) {"
);

const LS_CODE = slice(
  '  let lsWords = [], lsIdx = 0, lsListened = 0;',
  '  // 控件',
  '听力引擎'
);
// 从 HTML 里按大括号配平切出一个对象字面量（READINGS / SENTENCES 共用）
function extractObj(marker) {
  const i = HTML.indexOf(marker);
  if (i < 0) throw new Error('找不到 ' + marker);
  let st = HTML.indexOf('{', i), d = 0, j = st, inStr = false, esc = false;
  for (; j < HTML.length; j++) {
    const c = HTML[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
  }
  return HTML.slice(st, j);
}
const READINGS = JSON.parse(extractObj('const READINGS = '));
const SENTENCES = JSON.parse(extractObj('const SENTENCES = '));
const IPA_MAP = {};   // 短文整句必然查不到，正好验证兜底

// ---- DOM 桩 ----
function mkEl(id) {
  const cls = new Set();
  return {
    id, textContent: '', innerHTML: '', checked: false, dataset: {}, style: {},
    classList: {
      add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c),
      toggle: (c, on) => { if (on === undefined) { cls.has(c) ? cls.delete(c) : cls.add(c); } else if (on) cls.add(c); else cls.delete(c); return cls.has(c); },
    },
    _cls: cls,
    querySelectorAll: () => [],
  };
}
const els = {};
const getEl = id => (els[id] = els[id] || mkEl(id));

const repChips = [1, 2, 3].map(n => { const e = mkEl('rep' + n); e.dataset.rep = String(n); return e; });
const gapChips = [600, 900, 1200, 2500].map(n => { const e = mkEl('gap' + n); e.dataset.gap = String(n); return e; });
const srcChips = ['word', 'sent', 'phrase'].map(s => { const e = mkEl('src' + s); e.dataset.lssrc = s; return e; });
const modeChips = ['en', 'mix', 'mix2'].map(m => { const e = mkEl('mode' + m); e.dataset.mode = m; return e; });

const document = {
  getElementById: getEl,
  querySelector: sel => getEl('sel' + sel),
  querySelectorAll: sel => {
    if (sel.includes('ls-rep-chips')) return repChips;
    if (sel.includes('ls-gap-chips')) return gapChips;
    if (sel.includes('ls-mode-chips')) return modeChips;
    if (sel.includes('ls-source-opts')) return srcChips;
    return [];
  },
  addEventListener: () => {},
};
const window = { speechSynthesis: null, recordStudied: null };

// ---- 跑真实代码 ----
const settings = {};
const saveSettings = () => {};
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } return b; };
const getVocabPool = () => Array.from({ length: 50 }, (_, i) => ({ en: 'w' + i, cn: '词' + i, _topic: 'T', _icon: '🔤' }));
let selectedCount = 20;
let speakRate = 1, selectedVoice = null;
let pageMode = 'listen';   // syncStartBtn 要读它
const showScreen = () => {};

const EXPOSE = `
  return { get lsSource(){return lsSource}, set lsSource(v){lsSource=v},
           get lsWords(){return lsWords}, get lsIdx(){return lsIdx},
           get lsRepeat(){return lsRepeat}, get lsGapMs(){return lsGapMs},
           get lsMode(){return lsMode}, set lsMode(v){lsMode=v},
           get selectedBook(){return selectedBook}, set selectedBook(v){selectedBook=v},
           get selectedCat(){return selectedCat}, set selectedCat(v){selectedCat=v},
           lsKeys, lsDefaults, lsLoadSource, lsSyncChips, renderBookGrid, renderCatGrid, applyLsSource, startListening, syncStartBtn };
`;
const API = new Function(
  'settings', 'saveSettings', 'shuffle', 'getVocabPool', 'selectedCount', 'speakRate', 'pageMode',
  'selectedVoice', 'showScreen', 'READINGS', 'SENTENCES', 'IPA_MAP', 'document', 'window',
  SETSHOWN_CODE + LS_CODE + EXPOSE
)(settings, saveSettings, shuffle, getVocabPool, selectedCount, speakRate, pageMode, selectedVoice,
  showScreen, READINGS, SENTENCES, IPA_MAP, document, window);

// ================= 断言 =================
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), '实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(b)); }

console.log('\n① 篇目网格');
API.renderBookGrid();
const grid = getEl('ls-book-grid');
const btnCount = (grid.innerHTML.match(/data-book=/g) || []).length;
eq('21 个按钮(全部 + 20 篇)', btnCount, 21);
ok('「全部」计数 = 总句数 361', /全部 20 篇<span class="cnt">361<\/span>/.test(grid.innerHTML), grid.innerHTML.slice(0, 220));
ok('含 r01 与 r20', grid.innerHTML.includes('data-book="r01"') && grid.innerHTML.includes('data-book="r20"'));

console.log('\n② 单篇：句子数与顺序');
API.lsSource = 'sent';
API.selectedBook = 'r03';
API.startListening();
const r03 = READINGS.r03;
eq('句子数 = r03 段数', API.lsWords.length, r03.paras.length);
eq('第一句 = 原文第一句', API.lsWords[0].en, r03.paras[0].en);
eq('最后一句 = 原文最后一句', API.lsWords[API.lsWords.length - 1].en, r03.paras[r03.paras.length - 1].en);
ok('顺序完全一致(未洗牌)', API.lsWords.every((w, i) => w.en === r03.paras[i].en));
ok('每句都带中文', API.lsWords.every(w => w.cn && w.cn.length > 0));
eq('标注来源 = 篇名', API.lsWords[0]._topic, r03.title);
eq('标注图标 = 篇图标', API.lsWords[0]._icon, r03.icon);
eq('带 _book 回指键', API.lsWords[0]._book, 'r03');

console.log('\n③ 全部：361 句，且每篇内部不被打乱');
API.selectedBook = 'all';
API.startListening();
eq('总句数 361', API.lsWords.length, 361);
// 把连续同 _book 的切成块，每块必须是该篇原文顺序
const blocks = [];
API.lsWords.forEach(w => {
  const last = blocks[blocks.length - 1];
  if (last && last.k === w._book) last.a.push(w); else blocks.push({ k: w._book, a: [w] });
});
eq('切成 20 个连续块', blocks.length, 20);
ok('每块内部都是该篇原文原序', blocks.every(b => b.a.every((w, i) => w.en === READINGS[b.k].paras[i].en) && b.a.length === READINGS[b.k].paras.length));
ok('篇目前后顺序确实被打乱了(否则不算洗牌)', blocks.map(b => b.k).join() !== Object.keys(READINGS).join());

console.log('\n④ 单词音源没被改坏');
API.lsSource = 'word';
API.startListening();
eq('单词数 = selectedCount(20)', API.lsWords.length, 20);
ok('单词项没有 _book 字段', API.lsWords.every(w => w._book === undefined));
ok('单词项带主题', API.lsWords.every(w => w._topic === 'T'));

console.log('\n⑤ 三套参数互不污染');
// 短文默认：1 遍 / 900ms / 中英交替
API.lsSource = 'sent'; API.lsLoadSource();
eq('短文默认读几遍 = 1', API.lsRepeat, 1);
eq('短文默认句间停顿 = 900', API.lsGapMs, 900);
eq('🔴 短文默认中英交替(2026-09-17 改，原来是死写纯英文)', API.lsMode, 'mix');
// 单词默认：2 遍 / 1200ms / 中英交替
API.lsSource = 'word'; API.lsLoadSource();
eq('单词默认读几遍 = 2', API.lsRepeat, 2);
eq('单词默认词间停顿 = 1200', API.lsGapMs, 1200);
eq('单词默认中英交替', API.lsMode, 'mix');
// 高频句默认：1 遍 / 900ms / 中英交替
API.lsSource = 'phrase'; API.lsLoadSource();
eq('高频句默认读几遍 = 1', API.lsRepeat, 1);
eq('高频句默认句间停顿 = 900', API.lsGapMs, 900);
eq('高频句默认中英交替', API.lsMode, 'mix');
eq('高频句走自己一套键', JSON.stringify(API.lsKeys()),
   JSON.stringify({ rep: 'lsRepeatPhrase', gap: 'lsGapPhrase', mode: 'lsModePhrase' }));
// 逐套改，验证互不串味
API.lsSource = 'sent'; settings.lsRepeatSent = 3; settings.lsModeSent = 'en'; API.lsLoadSource();
eq('短文改成 3 遍生效', API.lsRepeat, 3);
eq('短文改成纯英文生效', API.lsMode, 'en');
API.lsSource = 'word'; API.lsLoadSource();
eq('切回单词仍是 2 遍(未被短文 3 遍污染)', API.lsRepeat, 2);
eq('切回单词仍是中英交替(未被短文纯英文污染)', API.lsMode, 'mix');
API.lsSource = 'phrase'; API.lsLoadSource();
eq('高频句没被污染：仍是 1 遍', API.lsRepeat, 1);
eq('高频句没被污染：仍是中英交替', API.lsMode, 'mix');
settings.lsRepeat = 1; settings.lsMode = 'mix2';
API.lsSource = 'sent'; API.lsLoadSource();
eq('短文仍是 3 遍', API.lsRepeat, 3);
eq('短文仍是纯英文', API.lsMode, 'en');

console.log('\n⑤b 老存档迁移（2026-09-11 的布尔 lsSayCn 必须翻译成三档，不能凭空回默认）');
delete settings.lsModeSent; settings.lsSayCnSent = false;   // 老存档：短文关着中文
API.lsSource = 'sent'; API.lsLoadSource();
eq('短文老存档 false → 纯英文', API.lsMode, 'en');
settings.lsSayCnSent = true;                                 // 老存档：短文开着中文
API.lsLoadSource();
eq('短文老存档 true → 中英交替', API.lsMode, 'mix');
delete settings.lsMode; settings.lsSayCn = false;            // 老存档：单词关着中文
API.lsSource = 'word'; API.lsLoadSource();
eq('单词老存档 false → 纯英文', API.lsMode, 'en');
delete settings.lsSayCn;                                     // 连老键都没有(全新用户)
API.lsLoadSource();
eq('无老键时落默认中英交替', API.lsMode, 'mix');
settings.lsModePhrase = 'zzz';                               // 脏值
API.lsSource = 'phrase'; API.lsLoadSource();
eq('脏值回落到默认中英交替', API.lsMode, 'mix');

console.log('\n⑥ 单位文案随音源切换');
API.lsSource = 'sent'; API.lsSyncChips();
eq('短文 HUD 单位 = 句', getEl('ls-unit').textContent, '句');
eq('短文 计数单位 = 句', getEl('ls-unit2').textContent, '句');
eq('短文 标签 = 每句读几遍', getEl('ls-rep-label').textContent, '每句读几遍');
eq('短文 标签 = 句间停顿', getEl('ls-gap-label').textContent, '句间停顿');
API.lsSource = 'word'; API.lsSyncChips();
eq('单词 HUD 单位 = 个', getEl('ls-unit').textContent, '个');
eq('单词 计数单位 = 词', getEl('ls-unit2').textContent, '词');
eq('单词 标签 = 英文读几遍', getEl('ls-rep-label').textContent, '英文读几遍');
eq('单词 标签 = 词间停顿', getEl('ls-gap-label').textContent, '词间停顿');

console.log('\n⑦ 选中的 chip 与参数一致');
API.lsSource = 'sent'; settings.lsRepeatSent = 2; settings.lsGapSent = 2500; settings.lsModeSent = 'mix2'; API.lsLoadSource();
ok('2 遍的 chip 亮', repChips.find(c => c.dataset.rep === '2')._cls.has('active'));
ok('1 遍的 chip 灭', !repChips.find(c => c.dataset.rep === '1')._cls.has('active'));
ok('2500 停顿的 chip 亮', gapChips.find(c => c.dataset.gap === '2500')._cls.has('active'));
ok('「中英加读」chip 亮', modeChips.find(c => c.dataset.mode === 'mix2')._cls.has('active'));
ok('「纯英文」chip 灭', !modeChips.find(c => c.dataset.mode === 'en')._cls.has('active'));
ok('🔴 旧的 ls-saycn 勾选框已从 HTML 里删干净', !/id="ls-saycn"/.test(HTML));
ok('HTML 里三档 chips 齐全(en/mix/mix2)',
   ['en', 'mix', 'mix2'].every(m => new RegExp('data-mode="' + m + '"').test(HTML)));

console.log('\n⑧ 循环重播：短文必须原文顺序，不许洗牌');
// 直接验证 lsRun 里的分支：把 lsWords 设成 3 句，lsIdx 顶到末尾，看是否回到 0 且顺序不变
const sentCode = LS_CODE.slice(LS_CODE.indexOf('async function lsRun'), LS_CODE.indexOf('function lsPlay'));
ok('lsRun 里有短文专属的不洗牌分支', /if \(lsSource === 'sent'\) lsIdx = 0;/.test(sentCode));
ok('lsRun 里整句不改大小写', /isSent \? w\.en : w\.en\.replace/.test(sentCode));

console.log('\n⑧b 三档朗读逻辑(2026-09-17 新增)');
ok('纯英文档整段跳过中文', /if \(lsMode !== 'en' && zhVoice\(\)\)/.test(sentCode));
ok('交替档回扣 1 遍、加读档回满 N 遍', /const back = \(lsMode === 'mix2'\) \? lsRepeat : 1;/.test(sentCode));
ok('中文走 zhVoice() 普通话嗓子', /lsSpeak\(w\.cn, zhVoice\(\), 1\.0\)/.test(sentCode));
ok('🔴 回扣那段有自己的 token 检查(否则暂停后会多念一遍)',
   (sentCode.match(/if \(dead\(\)\) return;/g) || []).length >= 4);
ok('中文读完先清 wave 再念回扣英文', /wave\.textContent = '🀄';[\s\S]*?wave\.textContent = '🔊 '/.test(sentCode));

console.log('\n⑨ 单词音源的驼峰/大小写处理没被动');
ok('单词仍走驼峰拆分+转小写', /w\.en\.replace\(\/\(\[a-z\]\)\(\[A-Z\]\)\/g, '\$1 \$2'\)\.toLowerCase\(\)/.test(sentCode));

console.log('\n⑩ 卡片样式类切换');
API.lsSource = 'sent'; API.startListening();
ok('短文时 .ls-card 加 sent 类', getEl('sel.ls-card')._cls.has('sent'));
API.lsSource = 'phrase'; API.startListening();
ok('高频句时 .ls-card 也带 sent 类（整句卡片样式共用）', getEl('sel.ls-card')._cls.has('sent'));
API.lsSource = 'word'; API.startListening();
ok('单词时 .ls-card 去掉 sent 类', !getEl('sel.ls-card')._cls.has('sent'));

console.log('\n⑪ CSS 层叠陷阱：.hidden 是 !important，必须连类一起切');
ok('.hidden 规则确实是 display:none !important（陷阱成立，此测试才有意义）',
   /\.hidden\s*\{\s*display\s*:\s*none\s*!important/.test(HTML));
ok('HTML 里 #ls-book-grid 初始带 hidden 类', /class="[^"]*\bhidden\b[^"]*" id="ls-book-grid"/.test(HTML));
ok('🔴 #ls-book-grid 带 topic-open（不带的话 r09~r20 会被 nth-child(n+10) 藏掉）', /class="[^"]*\btopic-open\b[^"]*" id="ls-book-grid"/.test(HTML));
ok('HTML 里 #ls-book-label 初始带 hidden 类', /<div class="section-label hidden" id="ls-book-label">/.test(HTML));
API.lsSource = 'sent'; API.applyLsSource();
ok('选短文后 #ls-book-grid 的 hidden 类被摘掉（否则 !important 会把它永远藏住）',
   !getEl('ls-book-grid')._cls.has('hidden'));
ok('选短文后 #ls-book-label 的 hidden 类被摘掉', !getEl('ls-book-label')._cls.has('hidden'));
ok('同时 inner style 也放开了', getEl('ls-book-grid').style.display === '');
ok('选短文后 主题区被藏起来', getEl('topic-grid').style.display === 'none');
ok('选短文后 主题区也加上了 hidden 类', getEl('topic-grid')._cls.has('hidden'));
API.lsSource = 'word'; API.applyLsSource();
ok('切回单词 #ls-book-grid 重新藏好（hidden 类回来）', getEl('ls-book-grid')._cls.has('hidden'));
ok('切回单词 主题区恢复显示', getEl('topic-grid').style.display === '');
ok('切回单词 主题区的 hidden 类被摘掉', !getEl('topic-grid')._cls.has('hidden'));

console.log('\n⑫ 高频句音源（2026-09-17 新增）');
const catGrid = getEl('ls-cat-grid');
delete catGrid.dataset.done;   // ⑪ 里 applyLsSource 已经建过网格了，不清掉重建标志这里只会拿到空串
API.renderCatGrid();
const catBtnCount = (catGrid.innerHTML.match(/data-cat=/g) || []).length;
const catKeys = Object.keys(SENTENCES);
const catTotal = catKeys.reduce((n, k) => n + SENTENCES[k].items.length, 0);
eq('9 个按钮(全部 + 8 场景)', catBtnCount, catKeys.length + 1);
ok('「全部」计数 = 总句数 ' + catTotal,
   new RegExp('全部 ' + catKeys.length + ' 个场景<span class="cnt">' + catTotal + '<\\/span>').test(catGrid.innerHTML));
ok('含首尾两个场景键', catGrid.innerHTML.includes('data-cat="' + catKeys[0] + '"') &&
                        catGrid.innerHTML.includes('data-cat="' + catKeys[catKeys.length - 1] + '"'));
eq('场景总数 = 8 个', catKeys.length, 8);
eq('句库总数 = 392 句', catTotal, 392);

API.lsSource = 'phrase'; API.selectedCat = 'health';
API.startListening();
const health = SENTENCES.health;
eq('单场景：句数 = 该场景句数', API.lsWords.length, health.items.length);
ok('单场景：保持原顺序(场景内有递进，不打乱)',
   API.lsWords.every((w, i) => w.en === health.items[i].en));
eq('单场景：标注 = 场景名', API.lsWords[0]._topic, health.name);
eq('单场景：图标 = 场景图标', API.lsWords[0]._icon, health.icon);
eq('单场景：带 _cat 回指键', API.lsWords[0]._cat, 'health');
ok('每句都带中文', API.lsWords.every(w => w.cn && w.cn.length > 0));
ok('每句都有英文本体', API.lsWords.every(w => w.en && w.en.length > 0));

API.selectedCat = 'all';
API.startListening();
eq('全部场景：总句数 = 392', API.lsWords.length, 392);
ok('全部场景：确实被打乱了(否则每次都从问候寒暄听起)',
   API.lsWords.map(w => w.en).join() !== catKeys.flatMap(k => SENTENCES[k].items.map(i => i.en)).join());
ok('全部场景：每句仍带 _cat，可回指场景', API.lsWords.every(w => catKeys.includes(w._cat)));
ok('句库每条都没有空 en/cn', catKeys.every(k => SENTENCES[k].items.every(i => i.en && i.cn)));

API.selectedCat = 'no-such-cat';    // 存档里留了个失效场景键
API.startListening();
eq('🔴 失效场景键回落到全部 392 句(不能让「开始」点了没反应)', API.lsWords.length, 392);
API.selectedCat = 'all';

console.log('\n⑬ 高频句设置屏的显隐');
ok('HTML 里 #ls-cat-grid 初始带 hidden 类', /class="[^"]*\bhidden\b[^"]*" id="ls-cat-grid"/.test(HTML));
ok('🔴 #ls-cat-grid 带 topic-open（不带的话第 10 个起的场景按钮会被 nth-child(n+10) 藏掉）',
   /class="[^"]*\btopic-open\b[^"]*" id="ls-cat-grid"/.test(HTML));
ok('HTML 里 #ls-cat-label 初始带 hidden 类', /<div class="section-label hidden" id="ls-cat-label">/.test(HTML));
API.lsSource = 'phrase'; API.applyLsSource();
ok('选高频句后 #ls-cat-grid 的 hidden 类被摘掉', !getEl('ls-cat-grid')._cls.has('hidden'));
ok('选高频句后 #ls-cat-label 的 hidden 类被摘掉', !getEl('ls-cat-label')._cls.has('hidden'));
ok('选高频句后 主题区被藏起来', getEl('topic-grid').style.display === 'none');
ok('选高频句后 数量区被藏起来', getEl('sel.count-grid').style.display === 'none');
ok('选高频句后 篇目区也藏好', getEl('ls-book-grid')._cls.has('hidden'));
API.lsSource = 'sent'; API.applyLsSource();
ok('切回短文 场景区藏好', getEl('ls-cat-grid')._cls.has('hidden'));
API.lsSource = 'word'; API.applyLsSource();
ok('切回单词 场景区仍藏好', getEl('ls-cat-grid')._cls.has('hidden'));
ok('切回单词 篇目区也藏好', getEl('ls-book-grid')._cls.has('hidden'));
ok('切回单词 数量区恢复', getEl('sel.count-grid').style.display !== 'none');

console.log('\n⑭ 开始按钮文案跟音源走');
API.lsSource = 'word'; API.syncStartBtn();
eq('单词 → 开始磨耳朵', getEl('start-btn').textContent, '🎧 开始磨耳朵');
API.lsSource = 'sent'; API.syncStartBtn();
eq('短文 → 开始听短文', getEl('start-btn').textContent, '🎧 开始听短文');
API.lsSource = 'phrase'; API.syncStartBtn();
eq('高频句 → 开始听高频句', getEl('start-btn').textContent, '🎧 开始听高频句');

console.log('\n' + '='.repeat(46));
console.log(`结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
