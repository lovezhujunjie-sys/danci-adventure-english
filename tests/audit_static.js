// 全盘静态体检：找"加载即崩"级别的硬 bug
const fs = require('fs');
const H = fs.readFileSync(process.env.HOME + '/.claude/skills/自学英语/index.html', 'utf8');

// ---------- 切出 HTML 区(最后一个 </script> 之后不再有 HTML) ----------
const scripts = [];
const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(H))) scripts.push({ code: m[1], start: m.index, end: m.index + m[0].length });
const HTML_PART = H.slice(0, scripts[0].start) + H.slice(scripts[scripts.length - 1].end);
const JS_ALL = scripts.map(s => s.code).join('\n');

// ---------- 1. HTML 里真实存在的 id ----------
const htmlIds = new Set();
for (const mm of H.matchAll(/\sid="([^"]+)"/g)) htmlIds.add(mm[1]);

// 重复 id
const idCount = {};
for (const mm of H.matchAll(/\sid="([^"]+)"/g)) idCount[mm[1]] = (idCount[mm[1]] || 0) + 1;
const dupIds = Object.entries(idCount).filter(([, n]) => n > 1);

// ---------- 2. JS 里引用的 id ----------
const refs = [];   // {id, line, kind}
const lines = JS_ALL.split('\n');
lines.forEach((ln, i) => {
  for (const mm of ln.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.push({ id: mm[1], line: i + 1, kind: 'getElementById', src: ln.trim() });
  for (const mm of ln.matchAll(/querySelector(?:All)?\(\s*['"]#([A-Za-z0-9_\-]+)/g)) refs.push({ id: mm[1], line: i + 1, kind: 'querySelector#', src: ln.trim() });
});

// JS 里动态创建的 id(innerHTML 里写了 id="x")
const dynamicIds = new Set();
for (const mm of JS_ALL.matchAll(/id="([A-Za-z0-9_\-]+)"/g)) dynamicIds.add(mm[1]);
for (const mm of JS_ALL.matchAll(/\.id\s*=\s*['"]([A-Za-z0-9_\-]+)['"]/g)) dynamicIds.add(mm[1]);

const missing = [];
const seen = new Set();
for (const r of refs) {
  if (htmlIds.has(r.id) || dynamicIds.has(r.id)) continue;
  const key = r.id + '|' + r.src;
  if (seen.has(key)) continue;
  seen.add(key);
  missing.push(r);
}

console.log('=== ① 引用了不存在的 id（会导致加载即抛错）===');
if (!missing.length) console.log('  ✅ 无');
else missing.forEach(r => console.log(`  ❌ #${r.id}  (${r.kind})  →  ${r.src.slice(0, 110)}`));

console.log('\n=== ② 重复 id ===');
if (!dupIds.length) console.log('  ✅ 无');
else dupIds.forEach(([id, n]) => console.log(`  ❌ #${id} 出现 ${n} 次`));

// ---------- 3. 顶层重名声明 ----------
console.log('\n=== ③ 同名顶层声明（const/let/function/var）===');
const decl = {};
scripts.forEach((s, si) => {
  s.code.split('\n').forEach((ln, i) => {
    const mm = ln.match(/^\s{0,4}(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (!mm) return;
    const k = mm[1];
    (decl[k] = decl[k] || []).push(`script${si + 1}:${i + 1}`);
  });
});
const dupDecl = Object.entries(decl).filter(([, a]) => a.length > 1);
if (!dupDecl.length) console.log('  ✅ 无');
else dupDecl.forEach(([k, a]) => console.log(`  ⚠️  ${k}  ×${a.length}  @ ${a.join(', ')}`));

// ---------- 4. localStorage key 读写是否配对 ----------
console.log('\n=== ④ localStorage key 读写配对 ===');
const lsKeys = new Set();
for (const mm of JS_ALL.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")/g)) lsKeys.add(mm[1]);
lsKeys.forEach(k => {
  const reads = (JS_ALL.match(new RegExp('getItem\\(\\s*' + k.replace(/[$]/g, '\\$') + '\\s*\\)', 'g')) || []).length;
  const writes = (JS_ALL.match(new RegExp('setItem\\(\\s*' + k.replace(/[$]/g, '\\$') + '\\s*,', 'g')) || []).length;
  console.log(`  ${k}: 读 ${reads} / 写 ${writes}`);
});

// ---------- 5. 可疑模式 ----------
console.log('\n=== ⑤ 可疑模式扫描 ===');
const pats = [
  [/JSON\.parse\((?!.*try)/, 'JSON.parse 可能在非 try 块（脏存档会崩）', 0],
  [/\.innerHTML\s*=\s*[^;]*\$\{/, 'innerHTML 里插 ${}（模板串需确认已转义）', 0],
  [/addEventListener\(\s*['"]\w+['"]\s*,\s*async/, 'async 事件处理器（异常会变 unhandled rejection）', 0],
  [/new Audio\(/, 'new Audio 实例', 0],
  [/setInterval\(/, 'setInterval', 0],
  [/setTimeout\([^,]+,\s*(\d+)\)/g, null, 0],
];
const codeLines = JS_ALL.split('\n');
// JSON.parse 是否被 try 包住——只做粗略定位统计
const jp = [];
codeLines.forEach((ln, i) => { if (ln.includes('JSON.parse(')) jp.push(i + 1); });
console.log('  JSON.parse 出现行:', jp.join(', ') || '无');
const si = [];
codeLines.forEach((ln, i) => { if (ln.includes('setInterval(')) si.push(i + 1); });
console.log('  setInterval 出现行:', si.join(', ') || '无');
const tts = [];
codeLines.forEach((ln, i) => { if (ln.includes('speechSynthesis')) tts.push(i + 1); });
console.log('  speechSynthesis 出现行数:', tts.length);

// ---------- 6. 事件绑定完整性：onclick 绑定的对象会不会是 null ----------
console.log('\n=== ⑥ 危险绑定（.onclick = 直接跟在不存在的 id 上）===');
const badBind = [];
lines.forEach((ln, i) => {
  const mm = ln.match(/getElementById\(\s*['"]([^'"]+)['"]\s*\)\.(onclick|onchange|oninput)\s*=/);
  if (mm && !htmlIds.has(mm[1]) && !dynamicIds.has(mm[1])) badBind.push(`  行${i + 1}: #${mm[1]} (${mm[2]})`);
});
if (!badBind.length) console.log('  ✅ 无');
else badBind.forEach(x => console.log('  ❌' + x));

console.log('\n统计: HTML id 共 ' + htmlIds.size + ' 个 | JS 引用 ' + refs.length + ' 处 | 动态生成 id ' + dynamicIds.size + ' 个');

// ---------- 7. 隐藏元素的 !important 陷阱 ----------
// CSS 是 .hidden{display:none!important}，所以 el.style.display='' 顶不过它。
// 任何"初始带 hidden 类"的元素，JS 里都只能用 classList 操作，不能用 style.display。
console.log('\n=== ⑦ .hidden 是 !important 吗 + 有没有元素踩坑 ===');
const imp = /\.hidden\s*\{\s*display\s*:\s*none\s*!important/.test(H);
console.log('  .hidden{display:none!important} → ' + (imp ? '是（陷阱成立）' : '否'));
const hiddenIds = new Set();
for (const mm of H.matchAll(/<[^>]*\sid="([^"]+)"[^>]*>/g)) {
  if (/class="[^"]*\bhidden\b/.test(mm[0])) hiddenIds.add(mm[1]);
}
const trap = [];
lines.forEach((ln, i) => {
  if (!/\.style\.display\s*=/.test(ln)) return;
  // 只管"设为显示"的写法，设成 none 是安全的
  if (!/\.style\.display\s*=\s*['"]{2}/.test(ln) && !/\.style\.display\s*=\s*[^;]*\?\s*['"]{2}/.test(ln)) return;
  for (const id of hiddenIds) {
    if (ln.includes('"' + id + '"') || ln.includes("'" + id + "'")) trap.push(`  行${i + 1}  #${id}: ${ln.trim().slice(0, 110)}`);
  }
});
if (!trap.length) console.log('  ✅ 没有元素用 style.display 去"显示"一个带 hidden 类的元素');
else trap.forEach(x => console.log('  ❌' + x));
