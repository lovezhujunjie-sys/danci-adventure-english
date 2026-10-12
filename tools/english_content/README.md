# 内容扩充流水线（2026-10-12 建）

老曾要「给句型骨架和日常高频句加内容」时用这套，**别手写进 index.html**。

## 一句话

把新句子/新骨架写进 `content/*.json` → 跑 `build.mjs` → 它自动补逐词释义和音标、自检零死区、写回 `index.html`。

```bash
cd ~/.agents/skills/自学英语
node tools/english_content/build.mjs --check   # 只校验（报缺词，不写文件）
node tools/english_content/build.mjs           # 生成并写回
```

## 输入文件（都在 `content/`）

| 文件 | 写什么 | 格式 |
|---|---|---|
| `patterns.json` | **新的句型组** | `{ "组key": { "name", "icon", "items":[ {frame, cn, tip, slots:[[en, cn], …]} ] } }` |
| `patterns_add.json` | 给**已有组**追加骨架 | `{ "已有组key": [ {frame, cn, tip, slots:[[…]]} ] }` |
| `sentences.json` `sentences_a.json` `sentences_b.json` | **新的高频句场景**（可拆多文件，按文件名顺序合并） | `{ "场景key": { "name", "icon", "items":[[en, cn], …] } }` |
| `sentences_add.json` | 给**已有场景**追加句子 | `{ "已有场景key": [[en, cn], …] }` |
| `diary.json` | 说今天的事 | `{ "groups":[ {name, icon, tip, items:[[en, cn], …]} ] }` |
| `cn_extra.json` | 新词中文（自动查不到时补这里） | `{ "word": "中文" }` |
| `ipa_extra.json` | 新词音标（**英式 RP，手写，别用程序硬转**） | `{ "word": "/…/" }` |
| `gloss_override.json` | 虚词/小词释义钉死 | `{ "up": "向上；起来" }` |
| `baseline.html` | 生成物：`git show HEAD:index.html > tools/english_content/baseline.html` | — |

## 输出与标记

写回 `index.html` 的四个字面量，被标记夹住（可反复跑）：

```
/* ===CONTENT:PATTERNS:START=== */  … const PATTERNS = {…};   /* ===CONTENT:PATTERNS:END=== */
/* ===CONTENT:SENTENCES:START=== */ … const SENTENCES = {…};  /* ===CONTENT:SENTENCES:END=== */
/* ===CONTENT:DIARY:START=== */     … const DIARY = {…};      /* ===CONTENT:DIARY:END=== */
const IPA_EXTRA = {…};   ← 新词音标已合并进去（无标记，按声明起点整段替换）
```

`last_report.json` 是上次生成的统计与缺口报告，先看它。

## 🔴 四个必守规矩（都是踩出来的）

1. **原有数据从 `baseline.html` 读，不从 `index.html` 读**
   否则第二次跑会把新增内容再加一遍（内容翻倍、不幂等）。
   基线没了就重建：`git show HEAD:index.html > tools/english_content/baseline.html`
   ⚠️ 基线必须是「加内容之前」的版本。如果你已经改过内容并提交了，取那个提交的上一版。
2. **替换从 `const NAME = ` 的声明起点切**
   只从 `{` 切会留下前缀 → `const SENTENCES = const SENTENCES = …` → 整段脚本语法错误，
   页面症状是 `Unexpected token 'const'` + 所有全局常量 `is not defined`（全白）。
3. **`SENTENCES` 必须是严格 JSON**（键带引号）
   `tests/test_ls_sent.js` 直接 `JSON.parse(extractObj('const SENTENCES = '))`。
   `PATTERNS` / `DIARY` 可以不加引号（测试用 eval），但别把 SENTENCES 改成前者。
4. **虚词释义用 `gloss_override.json` 钉死**
   自动释义取「全库首见」：`up` 会变成「事」（来自 what's up）、`brushed` 会变成「画笔」（名词义）。
   这类随语境变的词必须人工覆盖，否则新句子点词弹出的是错的。

## 🔴 新词只出现在句型骨架里 → 还要补 `BASE_CN`

句库点词是 `glossOf(word, it.g)`（句内释义优先），但**骨架槽位弹卡传的是 `null`**：
`showWordPop(wEl, wEl.dataset.w, null, …)`。所以**只在骨架里出现的新词必须落进全局兜底层 `BASE_CN`**，
否则 `vfy3.js` 会报「点词缺释义」。

## 改完必跑

```bash
node tests/audit_sentences.js   # 场景/句数/骨架/阅读篇 + 零死区
node tests/vfy3.js              # 点词死区（含句型骨架）
node tests/test_plan_diary.js   # 三步走/日记/跟读（真浏览器）
node tests/smoke2.js            # 走遍所有界面
```

⚠️ 真浏览器测试读的是 `~/.claude/skills/自学英语/index.html`，
所以要先把改好的文件同步过去（或直接在两处都跑一遍确认）：

```bash
cp index.html sw.js ~/.claude/skills/自学英语/
```
