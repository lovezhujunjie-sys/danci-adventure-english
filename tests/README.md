# 自学英语 · 测试与体检脚本

2026-09-11 全盘体检时建的。原本放在 `/tmp`，为防重启丢失挪进 skill 目录。

## 怎么跑

全部都要在 **skill 根目录**下跑（脚本里读的是相对路径 `index.html`）：

```bash
cd ~/.claude/skills/自学英语
NODE_PATH=/tmp/pwtest/node_modules node tests/test_zixue_fixes.js  # 44 / 0  本次修的 bug 逐条回归
NODE_PATH=/tmp/pwtest/node_modules node tests/test_ls_sent.js      # 60 / 0  听力·短文音源
NODE_PATH=/tmp/pwtest/node_modules node tests/test_m30.js          # 24 / 0  今日 30 分钟计时
NODE_PATH=/tmp/pwtest/node_modules node tests/test_idle.js         # 12 / 0  免提朗读时的挂机豁免（要真等 2 分钟）
NODE_PATH=/tmp/pwtest/node_modules node tests/test_pat_words.js    # 20 / 0  句型骨架点词查义（真浏览器）
NODE_PATH=/tmp/pwtest/node_modules node tests/audit_static.js      # 无 ❌   静态审计（id 引用/落盘配对/.hidden 陷阱）
NODE_PATH=/tmp/pwtest/node_modules node tests/vfy3.js              # 见下 🔴 点词死区（音标 + 释义，**含句型骨架**）
NODE_PATH=/tmp/pwtest/node_modules node tests/audit_sentences.js   # 内容完整性（句库/句型/切词正则）
NODE_PATH=/tmp/pwtest/node_modules node tests/perf.js              # 见脚本  加载/渲染性能
```

真浏览器测试（唯一的实机验证，**改了 UI 一定要跑这个**）。
`playwright-core` 只需装一次，之后所有真浏览器测试都在 skill 根目录下跑：

```bash
mkdir -p /tmp/pwtest && cd /tmp/pwtest && npm i playwright-core   # 只需一次
cd ~/.claude/skills/自学英语
NODE_PATH=/tmp/pwtest/node_modules node tests/smoke2.js            # 64 / 0
```

🔴 **离线缓存测试（`test_sw_offline.js`）必须走 HTTP** —— `file://` 下 Service Worker
根本不工作，而它的判据正是「断网后还能不能打开」：

```bash
cd ~/.claude/skills/自学英语 && python3 -m http.server 8899 --bind 127.0.0.1 &
NODE_PATH=/tmp/pwtest/node_modules node tests/test_sw_offline.js   # 10 / 0
```

`smoke2.js` 用的是本机已缓存的 Chromium，路径写在文件头的 `CHROME` 常量里
（`~/Library/Caches/ms-playwright/chromium-1228/...`）。若浏览器版本变了要跟着改。

## 🔴 改测试前必读

1. **不许在测试里重写业务函数**，一律从 `index.html` 切真身代码（用 `cut(注释行, 注释行)`）。
   这错犯过两次，第二次谎报了「缺 92 条释义 / 207 条音标」，全是假的。
2. **断言别考内部状态**（如 `window.__curScreen`），内部判据一改测试就在考陈旧契约。
   考对外的口子（`window.getTodaySec()`）或用户看得见的结果。
3. **桩要整个替换 `SpeechSynthesisUtterance` 类**
   （`Object.defineProperty`），写成 `if (!window.X)` 无效，
   会撞上 Chrome 真实校验器抛异常并级联出一堆假超时。
4. 报错先怀疑测试自己：这轮 3 个"失败"里有 3 个都是测试选错了选择器/用错了按钮
   （`#achv-entry`→`entry-achv`、`#study-home` 在学习页是隐身的、`addToNotebook` 正则少写了 `[^()]`）。
5. 🔴 **测试没真跑起来过，就等于没有测试** —— 2026-09-11 抓到的最难堪的一条。
   `test_sw_offline.js` 开头只 `require` 了 `path` 和 `os`，**漏了 `playwright-core`**，
   而正文直接用 `chromium` → 一执行就 `ReferenceError: chromium is not defined`。
   它从提交那一刻起就没跑成功过，**"离线缓存有回归保护"这句话一直没有依据**。
   而 `run_expansion.sh` 第 ⑧ 段末尾又有个 `true` 兜底，把崩溃吞成了"全链 ✅ 完成"、
   退出码变 0 —— 于是连续几轮都没人发现。两处都已修。
   **判据**：看每个测试**自己的**输出行，别只看汇总的退出码；退出码会被人为兜平。
6. 🔴 **加新测试后，一定要先故意让它失败一次**（比如临时写个 `ok('假的', false)`），
   确认它真能报错、真能让全链退出码变 1。能"通过"但不会"失败"的测试是装饰品。

## 已知的"报了但不是 bug"

- ~~`audit_sentences.js` 报句型骨架 `PATTERNS` 缺释义 14 / 缺音标 11 —— **忽略**。
  那屏的句子是纯文本 + `.hl` 高亮，**根本不可点词**，等于在查用户永远点不到的词。~~
  🔴 **2026-09-11 这条作废**：句型骨架那屏**现在能点词了**（老曾提的需求），
  那些缺失就从「用户永远点不到的词」变成了「点开一张空白卡」—— **是真死区，不能再忽略**。
  `vfy3.js` 已把 `PATTERNS` 的 `frame` + `slots` 一并纳入扫描（首轮结果：缺释义 9 / 缺音标 6）。
  ⚠️ **教训**：**「忽略即可」这种批注会过期**。给一片区域加「可点」的时候，
  必须回头把所有写着「那屏点不到，忽略」的地方翻一遍 —— 这次一口气在 SKILL.md
  和本文件里各找到一条，两条都写着"忽略"，两条都已经是错的。
- 13 处短语释义点不到（`alarm clock`/`used to`/`woke up`…）—— **刻意不修**，
  理由见 `SKILL.md` 的「已知限制」。
