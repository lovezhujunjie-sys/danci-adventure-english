# 自学英语 · 测试与体检脚本

2026-09-11 全盘体检时建的。原本放在 `/tmp`，为防重启丢失挪进 skill 目录。

## 怎么跑

全部都要在 **skill 根目录**下跑（脚本里读的是相对路径 `index.html`）：

```bash
cd ~/.claude/skills/自学英语
node tests/test_zixue_fixes.js     # 44 通过 / 0 失败  本次修的 bug 逐条回归
node tests/test_ls_sent.js         # 60 / 0            听力·短文音源
node tests/test_m30.js             # 24 / 0            今日 30 分钟计时
node tests/audit_static.js         # 无 ❌             静态审计（id 引用/落盘配对/.hidden 陷阱）
node tests/vfy3.js                 # 0 / 0             点词死区（音标 + 释义）
node tests/audit_sentences.js      # 内容完整性（句库/句型/切词正则）
```

真浏览器测试（唯一的实机验证，**改了 UI 一定要跑这个**）：

```bash
mkdir -p /tmp/pwtest && cd /tmp/pwtest && npm i playwright-core   # 只需一次
cp ~/.claude/skills/自学英语/tests/smoke2.js .
node smoke2.js                     # 53 通过 / 0 失败
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

## 已知的"报了但不是 bug"

- `audit_sentences.js` 报句型骨架 `PATTERNS` 缺释义 14 / 缺音标 11 —— **忽略**。
  那屏的句子是纯文本 + `.hl` 高亮，**根本不可点词**，等于在查用户永远点不到的词。
- 13 处短语释义点不到（`alarm clock`/`used to`/`woke up`…）—— **刻意不修**，
  理由见 `SKILL.md` 的「已知限制」。
