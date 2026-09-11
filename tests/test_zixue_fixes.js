// 2026-09-11 全盘体检修掉的那批 bug 的回归测试
// 🔴 纪律：所有被测逻辑一律从 index.html 切「真身」代码，一个业务函数都不许重写
const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8');
function cut(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j < i) throw new Error('提取失败: ' + a);
  return src.slice(i, j);
}

let pass = 0, fail = 0;
const chk = (name, got, exp) => {
  const ok = got === exp; ok ? pass++ : fail++;
  console.log((ok ? '✅' : '❌') + ' ' + name + '  期望 ' + JSON.stringify(exp) + ' 实得 ' + JSON.stringify(got));
};

// ───────── 1. 日期比较：dayNum ─────────
// 真身：todayStr / dayNum / checkDay / bumpEngagement / 生词本 + SRS 整段
const CODE =
  cut('  function todayStr() {', '  function defaults()') +
  cut('  // 检查日期，更新连续天数', '  // 记录"掌握/认识"一个词') +
  cut('  // ===== 生词本 + 间隔复习 (SRS) =====', '  window.recordGamePlayed =');

const RealDate = Date;
let NOW = new RealDate(2026, 8, 11, 10, 0, 0).getTime();   // 2026-09-11
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(NOW); else super(...a); }
  static now() { return NOW; }
}
const setNow = (y, m, d) => { NOW = new RealDate(y, m - 1, d, 10, 0, 0).getTime(); };

let progress = { learned: {}, streak: 0, lastDay: '', todayCount: 0, todayDay: '',
                 notebook: {}, history: {}, totalStudied: 0, notebookGraduated: 0, todaySec: 0, _unsavedSec: 0 };
const win = { getElementById: () => null, addEventListener: () => {} };
const doc = { addEventListener: () => {}, getElementById: () => null };
const upd = { calls: 0 };

new Function('window', 'document', 'progress', 'saveProgress', 'updateDashboard', 'Math', 'Date', CODE)
  (win, doc, progress, () => {}, () => { upd.calls++; }, Math, FakeDate);

console.log('\n① 🔴 日期比较必须按数值，不能按字符串（原 bug：跨月/跨位数时 SRS 排期全乱）');
progress.notebook = {};
const add = (en, nextReview) => { progress.notebook[en] = { en, cn: 'x', level: 1, nextReview, addedDay: '2026-9-1' }; };
setNow(2026, 9, 30); add('a', '2026-10-1');       // 明天到期
add('b', '2026-9-30');                             // 今天到期
chk('9/30 看 10/1：不该到期（字符串比会误判成到期）',
    win.getDueWords().map(w => w.en).join(','), 'b');

setNow(2026, 9, 11); progress.notebook = {}; add('c', '2026-9-2');
chk('9/11 看 9/2：逾期 9 天必须到期（字符串比会漏掉）',
    win.getDueWords().map(w => w.en).join(','), 'c');

setNow(2026, 10, 5); progress.notebook = {}; add('d', '2026-9-28');
chk('10/5 看 9/28：逾期 7 天必须到期',
    win.getDueWords().map(w => w.en).join(','), 'd');

setNow(2026, 10, 1); progress.notebook = {}; add('e', '2026-9-30'); add('f', '2026-10-1'); add('g', '2026-10-2');
chk('10/1：只有 9/30 和 10/1 到期，10/2 不到期',
    win.getDueWords().map(w => w.en).sort().join(','), 'e,f');

setNow(2027, 1, 5); progress.notebook = {}; add('h', '2026-12-31');
chk('跨年 2027-1-5 看 2026-12-31：必须到期',
    win.getDueWords().map(w => w.en).join(','), 'h');

setNow(2026, 9, 11);   // 把时钟拨回来：上面测跨年时已经走到 2027 了
chk('isDue 已逾期 → 到期', win.isDue({ nextReview: '2026-9-10' }), true);
chk('isDue 未到期 → 不到期', win.isDue({ nextReview: '2026-9-20' }), false);

console.log('\n② 🔴 加生词本：只有「答错」才降级，点词收藏不该降');
setNow(2026, 9, 11);
progress.notebook = { hello: { en: 'hello', cn: '你好', level: 3, nextReview: '2026-9-20', addedDay: '2026-9-1' } };
win.addToNotebook({ en: 'hello', cn: '你好' });                       // 收藏，非答错
chk('②a 收藏已存在的词：档位不动', progress.notebook.hello.level, 3);
chk('②b 收藏已存在的词：复习日期不动', progress.notebook.hello.nextReview, '2026-9-20');
win.addToNotebook({ en: 'hello', cn: '你好' }, true);                  // 答错
chk('②c 答错：降一级', progress.notebook.hello.level, 2);
chk('②d 答错：立刻回到今天待复习', progress.notebook.hello.nextReview, '2026-9-11');

console.log('\n③ 🔴 大小写：句首词入库要统一小写（否则同一个词两套卡 + 查不到音标）');
progress.notebook = {};
win.addToNotebook({ en: 'Hello', cn: '你好' });
chk('③a 入库键是小写', Object.keys(progress.notebook).join(','), 'hello');
chk('③b 存的 en 也是小写', progress.notebook.hello.en, 'hello');
win.addToNotebook({ en: 'hello', cn: '你好' });
chk('③c 再存小写不会变成第二条记录', Object.keys(progress.notebook).length, 1);

console.log('\n④ 🔴 SRS 阶梯：5 档间隔都要走到，第 5 颗进度点要能点亮');
progress.notebook = { w: { en: 'w', cn: '词', level: 0, nextReview: '2026-9-11', addedDay: '2026-9-11' } };
const intervalOf = () => {
  win.reviewResult('w', true);
  return progress.notebook.w ? progress.notebook.w.nextReview : '出库';
};
setNow(2026, 9, 11); chk('④ 第1次认识 → 1 天后', intervalOf(), '2026-9-12');
setNow(2026, 9, 12); chk('④ 第2次认识 → 2 天后', intervalOf(), '2026-9-14');
setNow(2026, 9, 14); chk('④ 第3次认识 → 4 天后', intervalOf(), '2026-9-18');
setNow(2026, 9, 18); chk('④ 第4次认识 → 7 天后', intervalOf(), '2026-9-25');
setNow(2026, 9, 25); chk('④ 第5次认识 → 15 天后（这档以前永远走不到）', intervalOf(), '2026-10-10');
chk('④b 第5次后 level=5，复习卡第 5 颗点能亮', progress.notebook.w.level, 5);
setNow(2026, 10, 10); chk('④c 第6次认识 → 出库', intervalOf(), '出库');
chk('④d 出库计数 +1', progress.notebookGraduated, 1);

console.log('\n⑤ 🔴 断签后连续天数要归零（以前一直显示假的旧天数）');
setNow(2026, 9, 11);
progress.streak = 5; progress.lastDay = '2026-9-8';   // 断了 3 天
progress.todayDay = '2026-9-11';
// 直接调真身 checkDay（从 index.html 切出来的那份，不是重写的）
const checkDayReal = new Function('window', 'document', 'progress', 'saveProgress', 'updateDashboard', 'Math', 'Date',
  cut('  function todayStr() {', '  function defaults()') +
  cut('  // 检查日期，更新连续天数', '  // 任意一次学习互动') + '\n return checkDay;')(win, doc, progress, () => {}, () => {}, Math, FakeDate);
checkDayReal();
chk('⑤a 断签 3 天 → streak 归零', progress.streak, 0);

progress.streak = 5; progress.lastDay = '2026-9-10';   // 昨天学过 = 没断
checkDayReal();
chk('⑤b 昨天学过（没断）→ streak 保持', progress.streak, 5);

progress.streak = 5; progress.lastDay = '2026-9-11';   // 今天已学过
checkDayReal();
chk('⑤c 今天已学过 → streak 保持', progress.streak, 5);

console.log('\n⑥ 🔴 听音选词/默写答错也降级、点词收藏不降级 —— 调用点核对（源码层）');
const callSites = [...src.matchAll(/addToNotebook\(([^()]*)\)/g)].map(m => m[0]);
const withTrue = callSites.filter(x => /,\s*true\s*\)/.test(x)).length;
const without = callSites.filter(x => !/,\s*true\s*\)/.test(x)).length;
chk('⑥a 有 5 处答错路径带 isMistake=true', withTrue, 5);
chk('⑥b 只有 1 处（点词弹卡）不带', without, 1);
chk('⑥c 不带的那处就是点词弹卡', /popEl\._ctx\.raw/.test(callSites.find(x => !/,\s*true\s*\)/.test(x))), true);

console.log('\n⑦ 🔴 完美闯关：地图通关满分要记徽章');
chk('⑦a showMapEnd 里有 recordPerfectQuiz', /showMapEnd[\s\S]{0,900}recordPerfectQuiz/.test(src), true);

console.log('\n⑧ 🔴 离开屏幕时连播链必须作废（否则回到首页还在念整篇）');
const showScreenCode = cut('  function showScreen(id) {', '  function backHome()');
chk('⑧a showScreen 作废 rdToken', /rdToken\+\+/.test(showScreenCode), true);
chk('⑧b showScreen 作废 sentToken', /sentToken\+\+/.test(showScreenCode), true);
chk('⑧c showScreen 停掉听力连播', /lsPlaying\s*=\s*false/.test(showScreenCode), true);

console.log('\n⑨ 🔴 lsSpeak 兜底 lang + 异常不许带崩循环');
const lsSpeakCode = cut('  function lsSpeak(text, voice, rate) {', '  function lsDelay(ms)');
chk('⑨a 兜底 lang = en-US', /lang\s*=\s*'en-US'/.test(lsSpeakCode), true);
chk('⑨b voice 赋值包在 try 里', /try\s*\{[^}]*u\.voice/.test(lsSpeakCode), true);
chk('⑨c speak() 调用也包在 try 里', /try\s*\{[^}]*\.speak\(u\)/.test(lsSpeakCode), true);

console.log('\n⑩ 🔴 Wake Lock 不许重复申请 / 申请了必须能释放');
const wakeCode = cut('  async function lsWakeOn()', "  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && lsPlaying)");
chk('⑩a 已有锁时直接返回（挡住重入）', /if\s*\(lsWake\)\s*return/.test(wakeCode), true);
chk('⑩b 用 pending 占位', /lsWake\s*=\s*'pending'/.test(wakeCode), true);
chk('⑩c 关掉后等 await 回来会自己释放', /lsWakeWanted/.test(wakeCode) && /s\.release\(\)/.test(wakeCode), true);

console.log('\n⑪ 🔴 .hidden 陷阱：全文件不许再有「只设 style.display 去显示」的写法');
chk('⑪a setShown 是唯一收口', /function setShown\(id, show\)/.test(src), true);
const hiddenIds = new Set([...src.matchAll(/<[^>]*\sid="([\w-]+)"[^>]*>/g)]
  .filter(m => /class="[^"]*\bhidden\b/.test(m[0])).map(m => m[1]));
const badShow = [...src.matchAll(/getElementById\("([\w-]+)"\)\.style\.display\s*=\s*""/g)]
  .filter(m => hiddenIds.has(m[1]));
chk('⑪b 带 hidden 类的元素不许只靠 style.display="" 显示', badShow.map(m => m[1]).join(','), '');
chk('⑪b2 确实扫到了带 hidden 类的元素（否则这条测试是空转）', hiddenIds.size > 0, true);
chk('⑪c 篇目网格带 topic-open（否则 r09~r20 被 nth-child 藏掉）',
    /class="[^"]*topic-open[^"]*" id="ls-book-grid"/.test(src), true);
chk('⑪d syncStartBtn 会被 applyLsSource 调用（切音源按钮文案跟着变）',
    /applyLsSource\(\)\s*\{[\s\S]{0,700}syncStartBtn\(\)/.test(src), true);

console.log('\n⑫ 复习结算数字不再自相矛盾');
chk('⑫a 用 reviewSession.length 而不是 reviewWords.length',
    /本次复习了 "\s*\+\s*reviewSession\.length/.test(src), true);

console.log('\n' + '='.repeat(52));
console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
