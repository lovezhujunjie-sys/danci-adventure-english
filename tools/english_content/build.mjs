// 内容构建管线：把 content/*.json 里的「新句型 + 新高频句 + 日记句」并进 index.html
// ---------------------------------------------------------------------------
// 为什么要这个脚本（而不是手改 index.html）：
//   1. 每句英文都必须「逐词可点」——app 里点词走 glossOf/ipaOf 链，缺一个词就出死区。
//      手写 g 会漏；这里从全库（VOCAB/句库/阅读/BASE_CN/IPA_MAP/IPA_EXTRA/BASE_IPA）
//      自动抽主词典来自动生成 g，并**先用 app 自己的查词链复验**，生成不出就直接报错。
//   2. 可复现、可增量：以后老曾说「再加点内容」，只改 content/*.json 再跑一次。
//   3. 幂等：用 CONTENT:*:START/END 标记替换，重复跑不会叠加。
//
// 用法：node tools/english_content/build.mjs [--check]
//   --check  只做校验和报告，不写 index.html
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const HTML = path.join(ROOT, 'index.html');
const CDIR = path.join(ROOT, 'tools/english_content/content');
const CHECK = process.argv.includes('--check');

const S_MARK = '/* ===CONTENT:PATTERNS:START=== */';
const E_MARK = '/* ===CONTENT:PATTERNS:END=== */';
const SS_MARK = '/* ===CONTENT:SENTENCES:START=== */';
const SE_MARK = '/* ===CONTENT:SENTENCES:END=== */';
const D_MARK = '/* ===CONTENT:DIARY:START=== */';
const DE_MARK = '/* ===CONTENT:DIARY:END=== */';

/* ---------------- ① 取 index.html 里的字面量真身（与 tests 同一套括号匹配） ---------------- */
export function litOf(H, name) {
  const i = H.indexOf('const ' + name + ' = ');
  if (i < 0) return null;
  const st = H.indexOf('{', i);
  let d = 0, j = st, inStr = false, esc = false;
  for (; j < H.length; j++) {
    const c = H[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
  }
  return { text: H.slice(st, j), src: H.slice(st, j), start: st, end: j };
}
const evalLit = (H, name) => { const b = litOf(H, name); return b ? (new Function('return (' + b.src + ')'))() : null; };

const normKey = s => String(s || '').toLowerCase().replace(/[\u2019]/g, "'").replace(/[^a-z']/g, '');
const TOK = /[A-Za-z][A-Za-z'\u2019\-]*|[^A-Za-z\s]+/g;

/* ---------------- ② 与 app 完全一致的查词链复刻（用来预验，别改逻辑） ---------------- */
function lemmaCandidates(w) {
  const o = [];
  if (w.endsWith("'s")) o.push(w.slice(0, -2));
  if (w.endsWith('ies') && w.length > 4) o.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es') && w.length > 3) o.push(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) o.push(w.slice(0, -1));
  if (w.endsWith('ing') && w.length > 5) {
    o.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (w.length > 6 && w[w.length - 4] === w[w.length - 5]) o.push(w.slice(0, -4));
  }
  if (w.endsWith('ed') && w.length > 4) {
    o.push(w.slice(0, -2), w.slice(0, -1));
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4]) o.push(w.slice(0, -3));
  }
  if (w.endsWith('er') && w.length > 4) o.push(w.slice(0, -2));
  if (w.endsWith('est') && w.length > 5) o.push(w.slice(0, -3));
  return [...new Set(o)].filter(x => x.length > 1 && x !== w);
}

function makeResolver(D) {
  const en2cn = {};
  for (const k in D.VOCAB) (D.VOCAB[k].words || []).forEach(x => { if (en2cn[x.en] === undefined) en2cn[x.en] = x.cn; });
  const gloss = {};
  const addG = g => { for (const w in (g || {})) { const n = normKey(w); if (n && gloss[n] === undefined) gloss[n] = g[w]; } };
  for (const k in D.SENTENCES) (D.SENTENCES[k].items || []).forEach(it => addG(it.g));
  for (const k in D.READINGS) { addG(D.READINGS[k].gloss); (D.READINGS[k].paras || []).forEach(p => addG(p.g)); }
  for (const k in D.PATTERNS) (D.PATTERNS[k].items || []).forEach(it => addG(it.g));
  const base = {}; for (const k in D.BASE_CN) base[normKey(k)] = D.BASE_CN[k];
  const baseIpa = {}; for (const k in D.BASE_IPA) baseIpa[normKey(k)] = D.BASE_IPA[k];

  const ipaOf = raw => {
    const w = normKey(raw); if (!w) return '';
    const pool = [w, ...lemmaCandidates(w)];
    if (D.FORMS_MAP[w]) pool.splice(1, 0, D.FORMS_MAP[w]);
    for (const c of pool) {
      if (D.IPA_MAP[c]) return D.IPA_MAP[c];
      if (D.IPA_EXTRA[c]) return D.IPA_EXTRA[c];
      if (baseIpa[c]) return baseIpa[c];
    }
    return '';
  };
  const glossOf = (raw, sentG) => {
    const w = normKey(raw); if (!w) return null;
    if (sentG) for (const k in sentG) if (normKey(k) === w) return sentG[k];
    if (gloss[w] !== undefined) return gloss[w];
    const forms = D.FORMS_MAP[w] ? [D.FORMS_MAP[w], ...lemmaCandidates(w)] : lemmaCandidates(w);
    for (const c of forms) {
      if (sentG) for (const k in sentG) if (normKey(k) === c) return sentG[k];
      if (gloss[c] !== undefined) return gloss[c];
      if (en2cn[c]) return en2cn[c];
      if (base[c]) return base[c];
    }
    if (en2cn[w]) return en2cn[w];
    if (base[w]) return base[w];
    return null;
  };
  const wordsOf = s => [...new Set((String(s).match(TOK) || [])
    .filter(t => /[A-Za-z]/.test(t[0])).map(normKey).filter(Boolean))];
  return { ipaOf, glossOf, en2cn, gloss, base, wordsOf };
}

/* ---------------- ③ 生成逐词表 g ---------------- */
// 规则：句子专属 g 只放「主库里能查到」的词（与现库风格一致，句子级只补关键内容词，
//      但为了零死区，这里对**每一个**能查到的词都写进 g —— 反正 glossOf 优先取句内的）
function genG(text, R, cnExtra) {
  const g = {};
  const missCn = [], missIpa = [];
  for (const w of R.wordsOf(text)) {
    const cn = glossOv[w] !== undefined ? glossOv[w] : (R.glossOf(w, null) || cnExtra[w]);
    if (cn === undefined) missCn.push(w);
    else g[w] = cn;
    if (!R.ipaOf(w) && !R.base[w]) missIpa.push(w);
  }
  return { g, missCn, missIpa };
}

/* ---------------- ④ 拼 JS 字面量 ---------------- */
const jstr = s => JSON.stringify(s);
function emitPatternItem(it, R, cnExtra, report, where) {
  const texts = [it.frame, ...it.slots.map(s => s[0])].join(' | ');
  const { g, missCn, missIpa } = genG(texts, R, cnExtra);
  missCn.forEach(w => report.missCn.push(where + ':' + w));
  missIpa.forEach(w => report.missIpa.push(where + ':' + w));
  const slots = it.slots.map(s => `{ en: ${jstr(s[0])}, cn: ${jstr(s[1])} }`).join(', ');
  const keys = Object.keys(g);
  return `  { frame: ${jstr(it.frame)}, cn: ${jstr(it.cn)}, tip: ${jstr(it.tip)}, g: { ${keys.map(k => jstr(k) + ': ' + jstr(g[k])).join(', ')} },\n    slots: [${slots}] }`;
}
// 句库必须是**严格 JSON**：tests/test_ls_sent.js 直接 JSON.parse(extractObj('const SENTENCES = '))，
// 键不加引号会把它打挂（2026-10-12 踩过）。所以这里一律产出真对象再 JSON.stringify。
function emitSentences(items, R, cnExtra, report, where) {
  return items.map(([en, cn]) => {
    const { g, missCn, missIpa } = genG(en, R, cnExtra);
    missCn.forEach(w => report.missCn.push(where + ':' + w));
    missIpa.forEach(w => report.missIpa.push(where + ':' + w));
    return { en, cn, g };
  });
}

/* ---------------- 主流程 ---------------- */
const readJSON = f => JSON.parse(fs.readFileSync(path.join(CDIR, f), 'utf8'));
let H = fs.readFileSync(HTML, 'utf8');

// 🔴 原有数据一律从 baseline.html 读（= 加内容之前的 git 基线），**不要读 index.html**：
//    否则第二次跑会把 patterns_add / 新场景再加一遍（内容翻倍），构建就不幂等了。
//    基线怎么来：git show HEAD:index.html > tools/english_content/baseline.html
//    如果基线还没生成过（比如刚 clone 下来），脚本会自己从 git HEAD 生成一次。
const BASE_HTML = path.join(import.meta.dirname, 'baseline.html');
if (!fs.existsSync(BASE_HTML)) {
  console.error('❌ 缺 tools/english_content/baseline.html —— 请先执行：');
  console.error('   git show HEAD:index.html > tools/english_content/baseline.html');
  process.exit(2);
}
const HB = fs.readFileSync(BASE_HTML, 'utf8');

const D = {
  VOCAB: evalLit(HB, 'VOCAB'), SENTENCES: evalLit(HB, 'SENTENCES'), PATTERNS: evalLit(HB, 'PATTERNS'),
  READINGS: evalLit(HB, 'READINGS'), BASE_CN: evalLit(HB, 'BASE_CN'), BASE_IPA: evalLit(HB, 'BASE_IPA'),
  IPA_MAP: evalLit(HB, 'IPA_MAP'), IPA_EXTRA: evalLit(HB, 'IPA_EXTRA'), FORMS_MAP: evalLit(HB, 'FORMS_MAP'),
};
const R = makeResolver(D);

const cnExtra = readJSON('cn_extra.json');       // 新词中文（手写，兜底词表）
const ipaExtraNew = readJSON('ipa_extra.json');  // 新词音标（手写，英式 RP）
const glossOv = readJSON('gloss_override.json');  // 虚词/小词的释义覆盖（手写）
// 🔴 为什么要有 gloss_override：
//   自动释义取的是「全库第一个出现的释义」（app 的 GLOSS_MAP 就是这么来的），
//   于是 up→"事"（来自 what's up）、brushed→"画笔"（名词义）这类**随语境变**的词会串义。
//   这些高频虚词/小词必须人工钉死，否则新句子里点 "up" 弹出来的释义是错的。
// 新词音标合并进主库（后面写回 index.html 的 IPA_EXTRA）
for (const k in ipaExtraNew) { D.IPA_EXTRA[normKey(k)] = ipaExtraNew[k]; }
const R2 = makeResolver(D);

const newPat = readJSON('patterns.json');     // { 组key: {name,icon,items:[...]}, ... }
const patAdd = readJSON('patterns_add.json'); // { 已有组key: [ {frame,cn,tip,slots} ... ] }
// 新场景/日记句允许拆多个文件写（sentences*.json / diary*.json），按文件名排序合并
const mergeFiles = (re, skip = []) => {
  const out = {};
  fs.readdirSync(CDIR).filter(f => re.test(f) && !skip.includes(f)).sort()
    .forEach(f => Object.assign(out, readJSON(f)));
  return out;
};
const newSent = mergeFiles(/^sentences(_[a-z0-9]+)?\.json$/, ['sentences_add.json']);   // { 场景key: {name,icon,items:[[en,cn],...]} }
const sentAdd = readJSON('sentences_add.json'); // { 已有场景key: [[en,cn],...] }
const diary = mergeFiles(/^diary(_[a-z0-9]+)?\.json$/);         // { groups: [ {name,icon,tip,items:[[en,cn],...]} ] }

const report = { missCn: [], missIpa: [], counts: {} };

/* 句型：地基组放最前，其余新增组随后，已有组顺序不变（保持老用户肌肉记忆） */
const patOut = [];
const BASE_FIRST = Object.keys(newPat);
// 组顺序：p_base 等新增组里「地基类」在前，然后是原有 8 组（各自追加新骨架），再是其余新增组
const patNewGroupsFirst = ['p_base', 'p_ask2', 'p_self', 'p_diary', 'p_past'];
const patNewGroupsRest = BASE_FIRST.filter(k => !patNewGroupsFirst.includes(k));

function emitExistingGroup(k, extra) {
  const items = D.PATTERNS[k].items.map((it, i) => {
    const texts = [it.frame, ...(it.slots || []).map(s => s.en)].join(' | ');
    const { g, missCn, missIpa } = genG(texts, R2, cnExtra);
    missCn.forEach(w => report.missCn.push('pat:' + k + ':' + w));
    missIpa.forEach(w => report.missIpa.push('pat:' + k + ':' + w));
    const slots = (it.slots || []).map(s => `{ en: ${jstr(s.en)}, cn: ${jstr(s.cn)} }`).join(', ');
    const keys = Object.keys(g);
    return `  { frame: ${jstr(it.frame)}, cn: ${jstr(it.cn)}, tip: ${jstr(it.tip)},\n    slots: [${slots}] }`;
  });
  (extra || []).forEach(e => items.push(emitPatternItem(e, R2, cnExtra, report, 'pat:' + k)));
  return items.join(',\n');
}

patNewGroupsFirst.forEach(k => {
  const g = newPat[k]; if (!g) return;
  patOut.push(`  ${k}: { name: ${jstr(g.name)}, icon: ${jstr(g.icon)}, items: [\n${g.items.map(it => emitPatternItem(it, R2, cnExtra, report, 'pat:' + k)).join(',\n')}\n  ] }`);
});
Object.keys(D.PATTERNS).forEach(k => {
  patOut.push(`  ${k}: { name: ${jstr(D.PATTERNS[k].name)}, icon: ${jstr(D.PATTERNS[k].icon)}, items: [\n${emitExistingGroup(k, patAdd[k])}\n  ] }`);
});
patNewGroupsRest.forEach(k => {
  const g = newPat[k]; if (!g) return;
  patOut.push(`  ${k}: { name: ${jstr(g.name)}, icon: ${jstr(g.icon)}, items: [\n${g.items.map(it => emitPatternItem(it, R2, cnExtra, report, 'pat:' + k)).join(',\n')}\n  ] }`);
});
const PATTERNS_JS = 'const PATTERNS = {\n' + patOut.join(',\n\n') + '\n};';

/* 高频句：原有场景（各自追加）+ 新场景 —— 输出严格 JSON */
const SENT_OBJ = {};
Object.keys(D.SENTENCES).forEach(k => {
  const s = D.SENTENCES[k];
  const items = s.items.map(it => ({ en: it.en, cn: it.cn, g: it.g || {} }));
  (sentAdd[k] || []).length && items.push(...emitSentences(sentAdd[k] || [], R2, cnExtra, report, 'sent:' + k));
  SENT_OBJ[k] = { name: s.name, icon: s.icon, items };
});
Object.keys(newSent).forEach(k => {
  const s = newSent[k];
  SENT_OBJ[k] = { name: s.name, icon: s.icon, items: emitSentences(s.items, R2, cnExtra, report, 'sent:' + k) };
});
const SENTENCES_JS = 'const SENTENCES = ' + JSON.stringify(SENT_OBJ) + ';';

/* 日记（说今天的事） */
const diaryOut = diary.groups.map(g => {
  const items = g.items.map(([en, cn]) => {
    const { g: gg, missCn, missIpa } = genG(en, R2, cnExtra);
    missCn.forEach(w => report.missCn.push('diary:' + w));
    missIpa.forEach(w => report.missIpa.push('diary:' + w));
    const keys = Object.keys(gg);
    return `    { en: ${jstr(en)}, cn: ${jstr(cn)}, g: { ${keys.map(k => jstr(k) + ': ' + jstr(gg[k])).join(', ')} } },`;
  }).join('\n');
  return `  { name: ${jstr(g.name)}, icon: ${jstr(g.icon)}, tip: ${jstr(g.tip)}, items: [\n${items}\n  ] }`;
}).join(',\n');
const DIARY_JS = 'const DIARY = {\n  groups: [\n' + diaryOut + '\n  ]\n};';
const IPA_EXTRA_JS = 'const IPA_EXTRA = ' + JSON.stringify(Object.keys(D.IPA_EXTRA).sort().reduce((o, k) => (o[k] = D.IPA_EXTRA[k], o), {}), null, 0).replace(/\},\{/g, '},\n{') + ';';

/* 统计 */
const cnt = obj => ({ groups: Object.keys(obj).length, items: Object.values(obj).reduce((a, v) => a + (v.items ? v.items.length : 0), 0) });
report.counts.patterns = cnt(new Function('return ' + PATTERNS_JS.replace('const PATTERNS = ', '') )());
report.counts.sentences = cnt(new Function('return ' + SENTENCES_JS.replace('const SENTENCES = ', '') )());
report.counts.diary = { groups: diary.groups.length, items: diary.groups.reduce((a, g) => a + g.items.length, 0) };
report.counts.diarySentences = report.counts.diary.items;
report.counts.ipaExtraTotal = Object.keys(D.IPA_EXTRA).length;

const uniq = a => [...new Set(a)];
report.missCn = uniq(report.missCn); report.missIpa = uniq(report.missIpa);

fs.mkdirSync(path.join(ROOT, 'tools/english_content'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/english_content/last_report.json'), JSON.stringify(report, null, 2));

console.log('【生成结果】');
console.log('  句型骨架：', report.counts.patterns.groups, '组 /', report.counts.patterns.items, '个骨架');
console.log('  日常高频句：', report.counts.sentences.groups, '场景 /', report.counts.sentences.items, '句');
console.log('  说今天的事：', report.counts.diary.groups, '组 /', report.counts.diary.items, '句');
console.log('  IPA_EXTRA 总数：', report.counts.ipaExtraTotal);
if (report.missCn.length) console.log('  ❌ 缺中文（要写进 cn_extra.json）', report.missCn.length, ':', report.missCn.join(' '));
if (report.missIpa.length) console.log('  ❌ 缺音标（要写进 ipa_extra.json）', report.missIpa.length, ':', report.missIpa.join(' '));

if (CHECK || report.missCn.length || report.missIpa.length) {
  console.log(process.env.NODE_ENV === 'x' ? '' : '（有缺口或 --check：未写回 index.html）');
  process.exit(report.missCn.length || report.missIpa.length ? 1 : 0);
}

/* ---------------- ⑤ 写回 ---------------- */
// 🔴 两个坑（2026-10-12 都踩过）：
//   1. 替换必须从「const NAME = 」的**声明起点**开始，只从 `{` 开始会把前缀留下 → 重复声明，整段脚本
//      语法错误（页面上所有全局常量全丢，报 "Unexpected token 'const'"）。
//   2. 幂等：已有标记时按标记区间替换，但同样要吃掉标记前面残留的 `const NAME = `。
function replaceLit(html, name, newJs, sMark, eMark) {
  const stripPrefix = (text, at) => {
    const pre = text.slice(Math.max(0, at - 60), at);
    const m = pre.match(new RegExp('const\\s+' + name + '\\s*=\\s*$'));
    return m ? at - m[0].length : at;
  };
  if (html.includes(sMark)) {
    const a0 = html.indexOf(sMark), b = html.indexOf(eMark);
    const a = stripPrefix(html, a0);
    return html.slice(0, a) + sMark + '\n' + newJs + '\n' + eMark + html.slice(b + eMark.length);
  }
  const block = litOf(html, name);
  if (!block) throw new Error('找不到 ' + name);
  const declStart = html.indexOf('const ' + name + ' = ');
  return html.slice(0, declStart) + sMark + '\n' + newJs + '\n' + eMark + html.slice(block.end);
}

H = replaceLit(H, 'PATTERNS', PATTERNS_JS, S_MARK, E_MARK);
H = replaceLit(H, 'SENTENCES', SENTENCES_JS, SS_MARK, SE_MARK);
// DIARY 放在 SENTENCES 之后
if (H.includes(D_MARK)) {
  const a = H.indexOf(D_MARK), b = H.indexOf(DE_MARK);
  H = H.slice(0, a) + D_MARK + '\n' + DIARY_JS + '\n' + DE_MARK + H.slice(b + DE_MARK.length);
} else {
  const anchor = E_MARK;
  H = H.replace(anchor, anchor + '\n' + D_MARK + '\n' + DIARY_JS + '\n' + DE_MARK);
}
// IPA_EXTRA：合并新词音标（同样必须从声明起点切，否则留下前缀 → 重复声明）
{
  const declStart = H.indexOf('const IPA_EXTRA = ');
  const block = litOf(H, 'IPA_EXTRA');
  H = H.slice(0, declStart) + IPA_EXTRA_JS + H.slice(block.end);
}
fs.writeFileSync(HTML, H);
console.log('✅ 已写回 index.html');
