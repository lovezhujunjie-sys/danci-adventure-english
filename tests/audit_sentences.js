// 句库 SENTENCES / 句型骨架 PATTERNS 完整性 + 点词死区
const fs = require('fs');
const H = fs.readFileSync(process.env.HOME + '/.claude/skills/自学英语/index.html', 'utf8');
function lit(name) {
  const i = H.indexOf('const ' + name + ' = ');
  if (i < 0) return null;
  let st = H.indexOf('{', i), d = 0, j = st, inStr = false, esc = false;
  for (; j < H.length; j++) {
    const c = H[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
  }
  // 用 JS 求值取真身：PATTERNS 这类对象的键没加引号，不是严格 JSON
  return (new Function('return (' + H.slice(st, j) + ')'))();
}
const SENTENCES = lit('SENTENCES'), PATTERNS = lit('PATTERNS'), VOCAB = lit('VOCAB');
const FORMS_MAP = lit('FORMS_MAP'), IPA_MAP = lit('IPA_MAP'), IPA_EXTRA = lit('IPA_EXTRA');
const BASE_CN = lit('BASE_CN'), BASE_IPA = lit('BASE_IPA');
const normKey = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '');

// 真实查词链（切真身，不重写）
const i = H.indexOf('  function lemmaCandidates(w) {');
const j = H.indexOf('  // ---- 把句子切成可点的词 ----', i);
const REAL = H.slice(i, j);
const EN2CN = (() => { const m = {}; for (const k in VOCAB) (VOCAB[k].words || []).forEach(x => { if (m[x.en] === undefined) m[x.en] = x.cn; }); return m; })();
const GLOSS_MAP = (() => {
  const m = {};
  for (const k in SENTENCES) (SENTENCES[k].items || []).forEach(it => {
    for (const w in (it.g || {})) { const n = w.toLowerCase().replace(/[’]/g, "'"); if (n && m[n] === undefined) m[n] = it.g[w]; }
  });
  return m;
})();
const BASE_MAP = (() => { const m = {}; for (const k in BASE_CN) m[normKey(k)] = BASE_CN[k]; return m; })();
const BASE_IPA_MAP = (() => { const m = {}; for (const k in BASE_IPA) m[normKey(k)] = BASE_IPA[k]; return m; })();
const CH = new Function('normKey', 'FORMS_MAP', 'IPA_MAP', 'IPA_EXTRA', 'BASE_IPA_MAP', 'GLOSS_MAP', 'EN2CN', 'BASE_MAP',
  REAL + '\n return { lemmaCandidates, ipaOf, glossOf };')(normKey, FORMS_MAP, IPA_MAP, IPA_EXTRA, BASE_IPA_MAP, GLOSS_MAP, EN2CN, BASE_MAP);

const TOK = /[A-Za-z][A-Za-z'’\-]*|[^A-Za-z\s]+/g;
const norm = s => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '');

console.log('=== ① 日常高频句 SENTENCES ===');
const sk = Object.keys(SENTENCES);
let items = 0, missG = [], missI = [], noCn = [], noG = [];
sk.forEach(k => {
  const d = SENTENCES[k];
  if (!d.name) console.log('  ❌ 场景 ' + k + ' 缺 name');
  (d.items || []).forEach((it, idx) => {
    items++;
    if (!it.en || !it.cn) noCn.push(k + '#' + idx);
    if (!it.g || !Object.keys(it.g).length) noG.push(k + '#' + idx + ':' + (it.en || '').slice(0, 40));
    (String(it.en || '').match(TOK) || []).forEach(t => {
      const c0 = t.charCodeAt(0);
      if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return;
      const c = norm(t); if (!c) return;
      if (!CH.glossOf(c, it.g)) missG.push(k + ':' + t);
      if (!CH.ipaOf(c)) missI.push(k + ':' + t);
    });
  });
});
console.log(`  场景 ${sk.length} 个 | 句子 ${items} 句`);
console.log(noCn.length ? `  ❌ 缺中/英 ${noCn.length}` : '  ✅ 中英齐全');
console.log(noG.length ? `  ❌ 没有逐词表 g 的句子 ${noG.length}: ${noG.slice(0, 5).join(' | ')}` : '  ✅ 每句都有逐词表');
console.log(`  点词缺释义 ${missG.length} ${missG.slice(0, 8).join(' ')}`);
console.log(`  点词缺音标 ${missI.length} ${missI.slice(0, 8).join(' ')}`);

console.log('\n=== ② 句型骨架 PATTERNS ===');
const pk = Object.keys(PATTERNS);
let pItems = 0, pMissG = [], pMissI = [], pBad = [];
pk.forEach(k => {
  const d = PATTERNS[k];
  if (!d.name || !Array.isArray(d.items)) { pBad.push(k + '(结构)'); return; }
  d.items.forEach((it, idx) => {
    pItems++;
    if (!it.frame || !it.cn) pBad.push(k + '#' + idx + '(缺 frame/cn)');
    if (!Array.isArray(it.slots) || !it.slots.length) pBad.push(k + '#' + idx + '(没有 slots)');
    (it.slots || []).forEach(sl => { if (!sl.en || !sl.cn) pBad.push(k + '#' + idx + '(slot 缺中英)'); });
    const texts = [it.frame, ...(it.slots || []).map(x => x.en)].filter(Boolean);
    texts.forEach(txt => (String(txt).match(TOK) || []).forEach(t => {
      const c0 = t.charCodeAt(0);
      if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return;
      const c = norm(t); if (!c) return;
      if (!CH.glossOf(c, it.g)) pMissG.push(k + ':' + t);
      if (!CH.ipaOf(c)) pMissI.push(k + ':' + t);
    }));
  });
});
console.log(`  分组 ${pk.length} 个 | 句型 ${pItems} 个 | 空位例句 ${pk.reduce((a,k)=>a+PATTERNS[k].items.reduce((b,x)=>b+(x.slots||[]).length,0),0)} 条`);
console.log(pBad.length ? `  ❌ 结构/内容问题 ${pBad.length}: ${pBad.slice(0, 6).join(', ')}` : '  ✅ 结构完好');
console.log(`  点词缺释义 ${pMissG.length} ${pMissG.slice(0, 8).join(' ')}`);
console.log(`  点词缺音标 ${pMissI.length} ${pMissI.slice(0, 8).join(' ')}`);

console.log('\n=== ③ 切词正则边界测试（sentHTML 的真实正则）===');
const cases = ["I don't want to get up.", "It's forty-two dollars.", "My son's bag is here.", "At 2:30 I left.", 'He said "hello" & left.', "A-B-C test", "well-known fact", "3.14 is pi", "Don't—stop!", "  spaces  "];
cases.forEach(c => {
  const toks = c.match(TOK) || [];
  const rebuilt = toks.join('');
  const lossless = rebuilt === c.replace(/\s/g, '');   // 正则按设计不产空白 token，忽略空白比对
  console.log(`  ${lossless ? '✅' : '⚠️ '} "${c}"`);
  console.log(`      切出 ${toks.length} 个: ${JSON.stringify(toks)}`);
  if (!lossless) console.log(`      ❗ 丢了非空白字符: 原文(去空白)=${JSON.stringify(c.replace(/\s/g,''))} 切词拼回=${JSON.stringify(rebuilt)}`);
});
