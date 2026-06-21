---
name: 自学英语
description: 开发与迭代「单词大冒险」自学英语 web 应用（帮中文母语者轻松自学英语单词、发音与拼读）。单文件 index.html，纯前端 + localStorage，含六大学习模式(翻卡学习/闯关选择题/字母拼读/游戏乐园/拼写默写/听力磨耳朵免提自动连播)+ 生词本间隔复习(SRS,可移除/全部提前复习) + 进度仪表盘(每日目标可调) + 成就系统 + 优选发音朗读 + 深色模式 + 设置持久化(发音/语速/主题/打字偏好)。词库约 3143 个日常高频词、41 个主题。触发场景：用户想新增/优化单词大冒险的功能、加单词/主题词库、加新游戏或学习模式、改 SRS/生词本逻辑、做学习数据可视化与激励、调发音/音标、改视觉文案、或部署分享。每次改完都要：①更新本地 skill 文件 ②commit 并 push 到 GitHub。
---

# 自学英语 · 单词大冒险 App

「单词大冒险」是一个面向中文母语者的英语单词自学应用，愿景是**让任何人都能轻松、有趣、有效地自学英语单词、发音和拼读**。本 skill 既是产品代码，也是迭代手册。

## 当前形态

- **单文件** `index.html`，纯前端，无构建步骤、无后端，用浏览器 `localStorage` 存进度。
- 这个文件就是这个 skill 仓库的根，也是 GitHub Pages 的入口（在线体验即下载链接）。
- **在线学习网址（GitHub Pages，公开）**：https://lovezhujunjie-sys.github.io/danci-adventure-english/ （仓库 https://github.com/lovezhujunjie-sys/danci-adventure-english 已设为 public 以启用免费 Pages；push 后 1~2 分钟自动部署最新版）。
- 词库内置约 **3143 个日常高频词、41 个主题**，全部 `{cn, en}` 形式 + IPA 音标表 `IPA_MAP` + emoji 映射 `EMOJI_MAP`。

## 数据常量（`<script>` 顶部，两个 IIFE 之外，全局可见）

- `VOCAB` — 主词库 `{ 主题key: {name, icon, words:[{cn,en}...]} }`，41 个主题。
- `PHONICS` — 字母拼读数据（字母 / 辅音组合 / 元音组合 / 词尾词缀 / 其他组合）。
- `IPA_MAP` — `{en: 音标}`，学习卡/选项/复习/反馈都从这里取音标显示（**音标仅供参考，准确发音以 🔊 TTS 为准**，UI 里有此说明）。
- `EMOJI_MAP` — `{en: emoji}`，看图猜词游戏用。
- `PREMIUM_VOICES` / `LOW_QUALITY_KEYWORDS` — TTS 声音优选评分用（自动挑选系统里最像真人的英语声音）。

## 架构：两个 IIFE

1. **主 IIFE**（`(function(){ ... renderTopics(); })()`）：所有界面逻辑与状态——首页/主题/语音设置、学习翻卡、闯关选择题、字母拼读、游戏乐园、生词本复习模式、成就界面、屏幕切换 `showScreen()`。
2. **学习记录系统 IIFE**（文件末尾 `(function(){ ... })()`）：进度持久化与数据层，`localStorage` key = `wordAdventure_progress`。通过 `window.*` 暴露 API 给主 IIFE 调用。

> 关键约定：数据/状态归第 2 个 IIFE，界面/交互归第 1 个 IIFE，两者只通过 `window.*` 通信。

## 六大学习模式（首页 mode-card 选择）

1. **📖 学习**（翻卡）— `startStudy/renderFlashcard`。看英文+音标→点卡显示中文→标「✅认识 / 🤔不熟」。自动朗读。结束页列出陌生词。
2. **✅ 闯关**（选择题）— `buildQuestions/renderQuestion/handleAnswer`。看中文选英文 或 看英文选中文；连击 combo 加分。答错入生词本、列错题复习。满分计成就。**答对答错都不自动跳**：作答后停在当题显示反馈(✓/✗ + 音标 + 中文 + 🔊朗读)，由用户点 `#next-question-btn`「下一题 →」才前进——蒙对的词也能多看几眼加强记忆。（原有"⚡自动模式/📝练习模式"节奏切换器已移除，`selectedQuizPace` 变量保留但不再生效。）
3. **🔤 字母拼读** — `renderPhonics`，5 个 tab（字母/辅音组合/元音组合/词尾词缀/其他组合），点卡或 🔊 听「字母名」与「拼读音」。
4. **🎮 游戏乐园** — 5 个小游戏：看图猜词 `startEmojiGame`、字母拼图 `startSpellGame`、限时挑战 `startTimedGame`、连连看 `startMatchGame`、**听音选词** `startListenGame`（听 TTS 选中文）。`launchGame(g)` 统一入口，会调 `recordGamePlayed()`。**看图猜词为「手动翻页」**：答完不自动跳，停在当题显示反馈，由用户点 `#emoji-next`「下一题 →」（末题变「看结果 →」）才前进——给自学者看清答案/听完发音的节奏自主权（`renderEmojiQ` 每题开头先 `hidden` 掉该按钮，答完 `emojiIdx++` 后 `nextBtn.onclick = renderEmojiQ` 显示之）。
5. **⌨️ 拼写默写**（顶级模式，用主题+数量）— `startTyping/renderTypeWord/onTypeInput`。看中文+音标、自动朗读，用键盘把英文逐字母敲出来；敲错即拦截(砍回正确前缀)+震动红闪+错误音，敲对前进+清脆音；**键盘音效全是 Web Audio 实时合成**(`typeBlip`，零文件离线)。一次拼对→`recordWord`(掌握)；中途出错/用提示/跳过→`recordStudied`+`addToNotebook`(进 SRS 生词本)。隐藏 `#type-input` 捕获输入(兼容手机软键盘，点卡片唤起)，`#type-slots` 渲染字母槽(空格词如 "plane ticket" 渲染 `.tslot.space`)。结束页 `type-end-screen` 显示一次拼对数/出错数/按键正确率 + **打字速度 WPM**(`typeStartMs`/`typeCharCount`，标准 5 字符=1 词) + 错词复习列表。首页该卡为整行「featured」样式(`.mode-card.span2`)。**思路吸收自 TypeWords/Qwerty 打字背单词，自研单文件版**。
6. **🎧 听力磨耳朵**（顶级模式，用主题+数量，整行 featured 卡）— `startListening/lsRun/lsPlay/lsPause`。**免提自动连播**：英文 ×N 遍（1/2/3 可选）→ 中文释义（用 `zhVoice()` 自动挑的中文 TTS 声音，可关；**严格按 zh-CN 普通话 > zh-TW > 其他 zh 的顺序选池**——只按 `zh` 开头筛会混进 zh-HK 粤语如 macOS 的 Sinji，已踩过坑，2026-06-11 修正）→ 词间停顿（短/中/长跟读档）→ 下一个；列表播完若开「循环播放」则 `shuffle` 洗牌再来。供开车/跑步/做家务戴耳机用。核心约定：**`lsSpeak()` 是带兜底超时的可等待朗读**（防个别机型 `onend` 不触发卡死队列）；`lsToken` 令牌使暂停/跳词后旧循环立即作废；播放中用 **Wake Lock API 防熄屏**（`lsWakeOn/lsWakeOff` + visibilitychange 回来重新申请），因为锁屏会被系统掐断 speechSynthesis；每听完一词 `recordStudied()` 计入今日/连续天数；遍数/停顿/读中文/循环四项偏好全部记进 `settings`(`lsRepeat/lsGap/lsSayCn/lsLoop`)。控件：⏮ ▶/⏸ ⏭ 大按钮 + `ls-*` 系列 id。UI 有安全提示（开车用车架、锁屏可能停）。

## 生词本 + 间隔复习 SRS（核心留存机制）

- **自动入库**：学习点「不熟」、闯关答错、听音选词答错 → `window.addToNotebook(word)`，存进 `progress.notebook`。
- **SRS 间隔**：`SRS_INTERVALS = [1,2,4,7,15]` 天。每个词有 `level` 与 `nextReview`。复习答对 `level++` 并把 `nextReview` 推后；答错 `level=0` 当天再练；`level` 达到 `SRS_INTERVALS.length`(5) 即**毕业出库**并计入已学。重复入库会降级 + 立即可复习。
- **复习界面** `review-screen`：看中文回想 → 「翻开看答案」(自动朗读) → 「✅记住了 / 🔁没记住」。SRS 进度用小圆点显示。`openReview()` 优先复习到期词(due)，没到期则可提前复习全部，空则提示。
- **首页入口** `entry-review`：显示待复习数量红点（`updateDashboard` 内刷新）。
- **管理**：复习卡左上「✕ 移除」`removeReview()`→`window.removeFromNotebook(en)` 把记牢的词移出本；复习结束页有「📚 提前复习全部生词本(N)」`reviewAll()`(无视是否到期)。
- 暴露 API：`addToNotebook / getNotebook / getDueWords / isDue / reviewResult(en,good) / removeFromNotebook(en) / SRS_MAX`。

## 进度仪表盘 + 成就系统（激励）

- **首页仪表盘**：🔥连续天数 / 📚已学单词 / ✨今日学习 / 今日目标进度条。
- **数据层**：`progress = { learned, streak, lastDay, todayCount, todayDay, goal, notebook, history, totalStudied, gamesPlayed, perfectQuiz, notebookGraduated }`。`loadProgress()` 用 `Object.assign(defaults(), 旧存档)` **向后兼容旧数据**——新增字段务必加进 `defaults()`。
- **参与度记账** `bumpEngagement()`：任何学习互动都计入 今日数/累计/`history[日期]`/连续天数。`recordWord(en)`=掌握(进 learned)+记账；`recordStudied()`=只记账(如「不熟」)。
- **🏅 我的成就** `achv-screen` / `openAchv/renderAchv`：连续天数/已学/学习天数/累计；**近 49 天学习日历热力图**(CSS grid 7×7，按当日量分 l1~l4)；**10 枚徽章** `BADGES`(连续天数、已学量、满分、玩游戏、攻克生词…)；**36 个主题掌握度**进度条。首页入口 `entry-achv`。

## 发音朗读（TTS）

- `speak(text, btnEl)` 用 `speechSynthesis`。`loadAndScoreVoices/scoreVoice` 自动给系统英语声音打分，优先选 `PREMIUM_VOICES` 里的高质量真人声，过滤 `LOW_QUALITY_KEYWORDS`。语速滑块 0.5~1.2，默认 0.85。语音设置面板可手动选声音 + 试听。**所选声音/语速会记进 `settings` 持久化**（见下）。

## 设置持久化 + 个性化（`wordAdventure_settings`）

主 IIFE 顶部有独立的设置层：`loadSettings()/saveSettings()`，存 localStorage key `wordAdventure_settings`，**和学习进度 `wordAdventure_progress` 分开**。保存：`dark`(深色)、`voiceName`(选定声音)、`speakRate`(语速)、`typeSound`/`typeAutoSpeak`(打字偏好)。各控件改动即存即用，刷新后自动恢复。
- **🌙 深色模式**：首页右上 `#theme-toggle`。全站颜色已做 **CSS 变量化重构**——`:root`(浅) / `body.dark`(深) 定义 `--bg/--card/--ink/--ink2/--ink3/--soft/--soft2/--soft-ink/--line/--line2/--track` 等；强调橙 `#d97757`、语义红绿、强调色上的白字保持字面值不变。`applyTheme()` 切 `body.dark` + 改 `<meta theme-color>`；`<body>` 顶部有内联引导脚本先读 localStorage 上 dark 类，**避免刷新闪白**。**新增 UI 一律用 `var(--xxx)` 上色，不要再硬编码背景/文字色**，否则深色下会出错。
- **每日目标可调**：首页仪表盘 `#pd-goal` 点开 `#goal-picker`(10/15/20/30/50)，`window.setGoal(n)` 写 `progress.goal`。

## 设计语言

暖米色背景 `var(--bg)` + 暖橙主色 `#d97757`。圆角卡片 `var(--card)` + 轻阴影。max-width 480px 移动优先、适配 `env(safe-area-inset-*)`。支持深/浅色两套主题（CSS 变量驱动）。文案亲切鼓励、面向自学者。新增 UI 沿用这套配色与圆角风格，**颜色必须走 CSS 变量**。

## 本地预览

```bash
python3 -m http.server --directory ~/.claude/skills/自学英语 8765
# 浏览器打开 http://localhost:8765/index.html
# 注意：含中文文件名/file:// 受限，用上面的 http server 方式预览
```

## 迭代铁律（每次修改优化都要做）

> 用户的明确要求：每次改完都执行这两个动作。

1. **更新本地 skill**：直接编辑 `~/.claude/skills/自学英语/index.html`（及本 SKILL.md），这是唯一真源。用户在 `~/Downloads` 里的副本只是导出，**不要**把它当源。
2. **推到 GitHub**：在该目录下
   ```bash
   git -C ~/.claude/skills/自学英语 add -A
   git -C ~/.claude/skills/自学英语 commit -m "描述本次优化"
   git -C ~/.claude/skills/自学英语 push
   ```
   推送后 GitHub Pages 自动更新，在线链接即最新版（也是给用户的下载/分享链接）。

## 后续路线（可继续做）

- 生词本：手动删词 / 「全部提前复习」按钮 / 生词本列表浏览页。
- 更多玩法：单词消消乐、句子填空、例句/词组扩展。
- 每日目标可在首页调节；学习提醒。
- 数据导出/导入、跨设备同步（需后端）。
- 改微信小程序便于国内传播。

## 注意

- **保持单文件、零依赖、离线可用**，除非用户同意引入后端/框架。
- 新增任何"值得鼓励的行为"，记得走 `recordWord()` 或 `recordStudied()` 让它计入进度/连续天数。
- 新增持久化字段务必加进 `defaults()`，否则老用户存档读不到。
- 词库是 `{cn,en}`；展示音标从 `IPA_MAP` 取，没有就留空（不要瞎编音标）。
- 朗读始终是发音的权威来源，音标只是辅助。
