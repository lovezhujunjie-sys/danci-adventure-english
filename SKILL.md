---
name: 自学英语
description: 开发与迭代「单词大冒险」自学英语 web 应用——老曾和大宝曾麟轩的亲子共学玩具（也适合中文母语者自学单词、发音与拼读）。单文件 index.html，纯前端 + localStorage，含六大单词模式(翻卡学习/🗺️闯关地图41岛拿星/字母拼读/游戏乐园/拼写默写/听力磨耳朵免提自动连播) + 📖分级阅读(在App里直接读短文·点词即查即收) + 开口说双模块(日常高频句 392 句·点词查义·整句朗读 + 句型骨架 24 个可替换框架)+ 生词本间隔复习(SRS,可移除/全部提前复习) + 进度仪表盘(每日目标可调) + 成就系统 + 优选发音朗读 + 深色模式 + 设置持久化(发音/语速/主题/打字偏好) + 亲子向可爱皮肤(糖果色/果冻卡/撒花动效) + 双人对战(爸爸 vs 大宝)。词库约 3143 个日常高频词、41 个主题。触发场景：用户想新增/优化单词大冒险的功能、加单词/主题词库、加新游戏或学习模式、改 SRS/生词本逻辑、做学习数据可视化与激励、调发音/音标、改视觉文案、或部署分享。每次改完都要：①更新本地 skill 文件 ②commit 并 push 到 GitHub。
---

# 自学英语 · 单词大冒险 App

「单词大冒险」是一个面向中文母语者的英语单词自学应用，愿景是**让任何人都能轻松、有趣、有效地自学英语单词、发音和拼读**。本 skill 既是产品代码，也是迭代手册。

## 当前形态

> **身份:老曾和大宝曾麟轩的亲子共学玩具**(2026-09-11 老曾钦定)。老曾原话:"这个目前是我和我家大宝曾麟轩一起学习英语的一个玩具"。
> 两个用户:老曾自己(自学,已有 3143 词基础盘)+ 大宝(孩子,要可爱、要好玩、要有爸爸的陪伴感)。
> **做任何 UI/玩法决策,先问:大宝会不会想再玩一次?**


- **单文件** `index.html`，纯前端，无构建步骤、无后端，用浏览器 `localStorage` 存进度。
- 这个文件就是这个 skill 仓库的根，也是 GitHub Pages 的入口（在线体验即下载链接）。
- **在线学习网址（GitHub Pages，公开）**：https://lovezhujunjie-sys.github.io/danci-adventure-english/ （仓库 https://github.com/lovezhujunjie-sys/danci-adventure-english 已设为 public 以启用免费 Pages；push 后 1~2 分钟自动部署最新版）。
- 词库内置约 **3143 个日常高频词、41 个主题**，全部 `{cn, en}` 形式 + IPA 音标表 `IPA_MAP` + emoji 映射 `EMOJI_MAP`。

## 数据常量（`<script>` 顶部，两个 IIFE 之外，全局可见）

- `VOCAB` — 主词库 `{ 主题key: {name, icon, words:[{cn,en}...]} }`，41 个主题。
- `PHONICS` — 字母拼读数据（字母 / 辅音组合 / 元音组合 / 词尾词缀 / 其他组合）。
- `IPA_MAP` — `{en: 音标}`，学习卡/选项/复习/反馈都从这里取音标显示（**音标仅供参考，准确发音以 🔊 TTS 为准**，UI 里有此说明）。**全量重写过(2026-06-21)**：旧数据是某个粗糙程序自动生成的垃圾(字母 c 一律误读成 /k/ → `slice /slaɪk/`、`niece /niːk/`；`temperature /tempəætɜː/`；多词词组黏成一坨乱码)，已用「对抗式发音 Agent 小队」(33 块 × 生成+独立核验)按**英式 RP** 标准全部重判，2627 词 100% 覆盖、带主重音 ˈ、词组保留空格(`cross the road /krɒs ðə rəʊd/`)。key 与 VOCAB 的 `en` 逐字一致(查表 `IPA_MAP[en]`)。**今后若新增单词，音标也要按英式 RP 手工核对，别再用程序硬转**。
- `EMOJI_MAP` — `{en: emoji}`，看图猜词游戏用。
- `PREMIUM_VOICES` / `LOW_QUALITY_KEYWORDS` — TTS 声音优选评分用（自动挑选系统里最像真人的英语声音）。

## 架构：两个 IIFE

1. **主 IIFE**（`(function(){ ... renderTopics(); })()`）：所有界面逻辑与状态——首页/主题/语音设置、学习翻卡、闯关选择题、字母拼读、游戏乐园、生词本复习模式、成就界面、屏幕切换 `showScreen()`。
2. **学习记录系统 IIFE**（文件末尾 `(function(){ ... })()`）：进度持久化与数据层，`localStorage` key = `wordAdventure_progress`。通过 `window.*` 暴露 API 给主 IIFE 调用。

> 关键约定：数据/状态归第 2 个 IIFE，界面/交互归第 1 个 IIFE，两者只通过 `window.*` 通信。

## 六大学习模式（首页 mode-card 选择）

1. **📖 学习**（翻卡）— `startStudy/renderFlashcard`。看英文+音标→点卡显示中文→标「✅认识 / 🤔不熟」。自动朗读。结束页列出陌生词。
2. **🗺️ 闯关地图**（选择题，2026-09-11 起替代原「✅ 闯关」入口）— `openMap/renderMap/startMapLevel/showMapEnd`。**41 座小岛 = 41 个主题词库**，点岛直接开练，不再需要"先选主题、再选题数"两步（那两步是大人刷题思维，对小孩是门槛）。每关固定 **5 题**，按正确率给星：**全对 3 星 / ≥80% 2 星 / ≥60% 1 星**，不足 60% 得 0 星不计进度。顶部 HUD 实时显示「已通关 X / 41 关」+ 星星总数 ⭐。出题方向在地图顶部切（`#map-dir`：看中文→选英文 / 看英文→选中文），与全局 `selectedQuizMode` 共用。**不设关卡锁**——`mapUnlocked()` 恒 `true`，老曾 2026-09-11 定调："提前让大宝碰天书，锁关卡等于把天书藏起来，与目的相反"，**进度感交给星星总数而非锁**。当前进度岛飘「👦 你在这里」并自动 `scrollIntoView` 居中（`mapFrontier()` = 第一座还没拿到星的岛）。作答与结算沿用原闯关引擎：`renderQuestion/handleAnswer` 完全不变，`showEnd()` 开头 `if (mapKey) { showMapEnd(); return; }` 分流；`#restart-btn`「🔁 再挑战一次」、`#home-btn`/`#back-to-home`「🗺️ 回到地图」也都按 `mapKey` 是否非空分流。星星存 `localStorage['wordadv_map_stars']`（键为主题 key、值为该主题历史最高星数，只增不减），`['wordadv_map_open']` 存开图状态。**答对答错都不自动跳**：作答后停在当题显示反馈(✓/✗ + 音标 + 中文 + 🔊朗读)，由用户点 `#next-question-btn`「下一题 →」才前进——蒙对的词也能多看几眼加强记忆。（原有"⚡自动模式/📝练习模式"节奏切换器已移除，`selectedQuizPace` 变量保留但不再生效。）**遗留**：原闯关设置页里的「出题方向」`#quiz-options`（`data-quizmode` 按钮）因入口取消已成**孤儿 UI**（带 `hidden` 恒不显示），`syncQuizModeBtns()` 对它的操作已无实际作用；地图方向切换改用 `#map-dir`，勿误改。
3. **🔤 字母拼读** — `renderPhonics`，5 个 tab（字母/辅音组合/元音组合/词尾词缀/其他组合），点卡或 🔊 听「字母名」与「拼读音」。
4. **🎮 游戏乐园** — 5 个小游戏：看图猜词 `startEmojiGame`、字母拼图 `startSpellGame`、限时挑战 `startTimedGame`、连连看 `startMatchGame`、**听音选词** `startListenGame`（听 TTS 选中文）。`launchGame(g)` 统一入口，会调 `recordGamePlayed()`。**看图猜词为「手动翻页」**：答完不自动跳，停在当题显示反馈，由用户点 `#emoji-next`「下一题 →」（末题变「看结果 →」）才前进——给自学者看清答案/听完发音的节奏自主权（`renderEmojiQ` 每题开头先 `hidden` 掉该按钮，答完 `emojiIdx++` 后 `nextBtn.onclick = renderEmojiQ` 显示之）。
5. **⌨️ 拼写默写**（顶级模式，用主题+数量）— `startTyping/renderTypeWord/onTypeInput`。看中文+音标、自动朗读，用键盘把英文逐字母敲出来；敲错即拦截(砍回正确前缀)+震动红闪+错误音，敲对前进+清脆音；**键盘音效全是 Web Audio 实时合成**(`typeBlip`，零文件离线)。一次拼对→`recordWord`(掌握)；中途出错/用提示/跳过→`recordStudied`+`addToNotebook`(进 SRS 生词本)。隐藏 `#type-input` 捕获输入(兼容手机软键盘，点卡片唤起)，`#type-slots` 渲染字母槽(空格词如 "plane ticket" 渲染 `.tslot.space`)。结束页 `type-end-screen` 显示一次拼对数/出错数/按键正确率 + **打字速度 WPM**(`typeStartMs`/`typeCharCount`，标准 5 字符=1 词) + 错词复习列表。首页该卡为整行「featured」样式(`.mode-card.span2`)。**思路吸收自 TypeWords/Qwerty 打字背单词，自研单文件版**。
6. **🎧 听力磨耳朵**（顶级模式，用主题+数量，整行 featured 卡）— `startListening/lsRun/lsPlay/lsPause`。**免提自动连播**：英文 ×N 遍（1/2/3 可选）→ 中文释义（用 `zhVoice()` 自动挑的中文 TTS 声音，可关；**严格按 zh-CN 普通话 > zh-TW > 其他 zh 的顺序选池**——只按 `zh` 开头筛会混进 zh-HK 粤语如 macOS 的 Sinji，已踩过坑，2026-06-11 修正）→ 词间停顿（短/中/长跟读档）→ 下一个；列表播完若开「循环播放」则 `shuffle` 洗牌再来。供开车/跑步/做家务戴耳机用。核心约定：**`lsSpeak()` 是带兜底超时的可等待朗读**（防个别机型 `onend` 不触发卡死队列）；`lsToken` 令牌使暂停/跳词后旧循环立即作废；播放中用 **Wake Lock API 防熄屏**（`lsWakeOn/lsWakeOff` + visibilitychange 回来重新申请），因为锁屏会被系统掐断 speechSynthesis；每听完一词 `recordStudied()` 计入今日/连续天数；遍数/停顿/读中文/循环四项偏好全部记进 `settings`(`lsRepeat/lsGap/lsSayCn/lsLoop`)。控件：⏮ ▶/⏸ ⏭ 大按钮 + `ls-*` 系列 id。UI 有安全提示（开车用车架、锁屏可能停）。

## 📖 分级阅读（2026-09-11 新增）

🔴 **定位背景**：老曾 2026-09-11 明确**这个 App 主要给他本人用**（成年初学者，水平自述"和大宝差不多"），目标是"正常阅读英文书 + 正常对话、母语级"。按词汇习得原则，**阅读是输入主线、背词只是辅助**——所以做的是"在 App 里直接读书 + 点词即收"的闭环，而不是扩通用词表。

- **数据** `READINGS`（**顶层常量，IIFE 之外**，2026-09-11 起）：`{ id: {title, titleCn, level, icon, gloss:{词:中文}, paras:[{en, cn, g?}]} }`
  - `paras` **逐句**存英文+中文 → 为了直接复用句库那套渲染（`sentHTML` + `showWordPop`）。
  - `gloss` 是**本篇通用补充词表**。代词/复数等基础词（`he/his/him/us/we/am/boxes/children/shake…`）**不在 `VOCAB` 里**，不补就会点出"暂未收录释义"。
  - 渲染时合并 `Object.assign({}, a.gloss, p.g||{})` 再传给弹卡 → **保证点词零死区**（r01/r02 实测 35 句 / 189 词，缺失 0）。
- **界面** `reading-screen`：书架视图 `rd-shelf-view` + 阅读视图 `rd-read-view`。`renderShelf()` 列书单，`openReading(k)` 渲染正文（每句一个 `.rd-sent`，内含 `.sent-en` 可点词 + `.sent-cn` 中文）。
- **首页入口**：`data-goto="reading"` 的 mode-card，在「阅读」分组，**排在开口说之前**（阅读是主线）。路由分支在首页 mode-card 点击处理里（`else if (g === "reading") openReadingHome();`）。
- 🔴 **`showWordPop(el, raw, sentG, src)` 第 4 参 `src` 是 2026-09-11 新加的**：用来标记生词来源。阅读传 `{topic:'分级阅读', icon:'📖'}`；**不传时默认 `{topic:'日常高频句', icon:'💬'}`——这个默认值是给句库用的，改动会影响句库的收词标记**。
- **全文连播** `#rd-read-all`：用 `rdToken` 令牌防串台（与句库 `sentToken` 同套路），按句长估算停顿（`max(2000, len*62)` ms，因为 `speak()` 不返回 Promise）。
- **加新文章**：往 `READINGS` 加一项即可，注意 ①每句都要中文 ②基础代词/复数记得进 `gloss` ③**改完必须跑覆盖率检查确认零死区**（见下）。
- **验收脚本（加文章后必跑）**：解析 `VOCAB` / `GLOSS_MAP` / `EN2CN` / `FORMS_MAP`，对每篇逐词走一遍 `gloss()` 的优先级链（本句 g → 全局 GLOSS → 词形还原 → EN2CN），确认缺失为 0。纯手写容易漏代词，别凭感觉。
- **当前书单**：r01《My Day / 我的一天》、r02《The New Neighbor / 新邻居》（均为入门级，约 90~100 词）。**计划扩到 10 篇并逐级升难度**。

## 开口说：日常高频句 + 句型骨架（2026-09-11 新增）

> **使用背景（做任何决策前先读这句）**：这个 app 是**亲子共学玩具**——老曾和儿子**曾麟轩（大宝）**一起学英语用的。任何 UI／玩法改动都要同时照顾两件事：**大人看得进去**、**孩子愿意玩**。

### 💬 日常高频句 `SENTENCES`

- **392 句 / 8 个场景**：问候寒暄 greeting(50)、闲聊家常 smalltalk(50)、点餐吃饭 dining(46)、购物买东西 shopping(50)、出行问路 travel(48)、看病求助 health(50)、礼貌请求 requests(48)、日常生活 daily(50)。
- **数据格式**：`{ 场景key: { name, icon, items:[{ en, cn, g }] } }`。`g` 是**逐词释义表** `{句中原始拼写: 中文}`，覆盖句中每一个词（含 the/a/to/of 等虚词），缩写（`I'm`/`don't`/`it's`）整体作一个 key。
- **点词查义（核心功能）**：句子渲染时每个词包成 `<span class="w" data-w="原词">`，点击弹 `.word-pop`：词 + 音标 + **当句释义** + 🔊读这个词 + ＋生词本（直通 SRS）。
- **释义优先级** `glossOf(raw, sentG)`：① 本句 `g`（最准，含多义词的当句义）② `GLOSS_MAP`（全句库合并词表，首见优先）③ 词形还原后再查 ④ `EN2CN`（主词库反查）。**实测 1880 词命中 1880（100%）**。
- **音标** `ipaOf(raw)`：`IPA_MAP`（主词库 2627）→ `IPA_EXTRA`（2026-09-11 为句库补的 187 条，英式 RP）→ 词形还原后查。**实测 1879/1880 有音标**（唯一缺 `separate`，因名/动词读音不同、无法判定词性，**主动留空不瞎编**）。
- **词形还原** `FORMS_MAP`（56 条）+ `lemmaCandidates()` 规则推导（-s/-es/-ed/-ing/-er/-est、ies→y、双写辅音回退等）。
- **整句朗读** `speak(it.en)`；「▶ 从头连播」`playAllSentences()` 用 `sentToken` 令牌防串台，逐句朗读 + `scrollIntoView` 跟随当前句。
- 「遮住中文（自我测试）」勾选后给所有卡加 `.hide-cn`，中文模糊化。

### 🏗️ 句型骨架 `PATTERNS`

- **8 组 × 3 骨架 = 24 个可替换框架、约 110 个词槽**：礼貌请求／表达想要／表达看法／问路问事／约定时间／表达感受／给建议／确认理解。
- **数据格式**：`{ 组key: { name, icon, items:[{ frame, cn, tip, slots:[{en,cn}] }] } }`，`frame` 里用 `___` 作占位符。
- **交互**：点词槽按钮 → 骨架里 `___` 替换成该词 → 下方展开整句（替换部分橙色高亮）+ 中文 + 🔊读整句 → 自动朗读并 `recordStudied()` 记账。
- **设计意图**：句型 = **可替换框架**，不是语法讲解。给骨架 + 词槽，换词造出真实句子，直接能说出口。

### 改这块别踩的坑

**① 词库里的"连体复合词"**(2026-09-11 全量修掉 48 个)

VOCAB 里一度有 `gasstation` / `trafficlight` / `highschool` / `makebed` 这种**丢空格的写法**,孩子会学错拼写。发现手法:**
`IPA_MAP` 的音标里带空格、但英文单词里没有 → 就是漏了空格**(如 `"gasstation":"/ˈɡæs steəʃn/"`)。一条正则扫全库即得。

修正要**三处同步改名**,少一处就出问题:
1. `VOCAB` 的 `"en":"gasstation"` → `"en":"gas station"`
2. `EMOJI_MAP` 的键 `"gasstation":` → `"gas station":`(不改则看图猜词取不到 emoji)
3. `IPA_MAP` 的键同上(不改则点词没音标)

附带好处:改完 `getSpellPool()` 的 `/^[a-z]+$/` 自动排除多词短语,拼写游戏不会再让人拼 "gasstation"。
⚠️ 别用 `json.loads` 校验 `PATTERNS`——它的键**不带引号**(是 JS 对象字面量不是 JSON),会误报"坏了"。


- 两个 screen 的 id `sentence-screen` / `pattern-screen` **必须留在 `TOP_SCREENS` 数组里**，否则 `showScreen()` 切不过去。
- 首页入口卡用 `data-goto="sentence|pattern"`（**不是** `data-pagemode`），在 `.mode-card` 的 onclick 里**早期 return 直接进模块**，不走"选主题+数量+点开始"那套四步流程。
- 新增句子/单词后若带出新词，顺手核对 `IPA_EXTRA` 有没有音标；音标一律**英式 RP**，拿不准就留空。

## 游戏乐园(6 个玩法)

`#games-screen` 下用 `showGameArea(id)` 切换 `.game-area` 区块,菜单项靠 `.game-item[data-game]` → `launchGame(g)` 派发。

| data-game | 玩法 | 说明 |
|---|---|---|
| `emoji` | 看图猜单词 | emoji → 选英文 |
| `spell` | 字母拼图 | 中文 → 拼字母 |
| `timed` | 限时挑战 | 60 秒,答错扣 3 秒 |
| `match` | 连连看 | 中英配对,6 对 |
| `listen` | 听音选词 | 听发音 → 选中文 |
| **`vs`** | **双人对战** | **亲子:爸爸 vs 大宝 轮流答,各 5 题** |

### 👨🆚👦 双人对战(2026-09-11 新增,把工具变玩具的关键)

- 入口是菜单顶部的 `.vs-card#vs-entry`(橙色大卡,`launchGame("vs")`)。
- 10 题从 `getEmojiPool()` 抽,`vsIdx % 2` 决定轮到谁 → **每人 5 题**。
- 顶部双计分板 `.vs-player.on` 高亮当前回合,`vsFinish()` 出冠军/平局。
- **名字可点改**(默认 爸爸 / 大宝,存 `localStorage['wordadv_vs_names']`)——老曾家二宝出生后改名字不用改代码。
- ⚠️ 加游戏要动 **4 处**:① `#game-vs` 区块 HTML(必须静态写在页面里,`.game-quit` 是**初始化时一次性绑定**的,动态插入的按钮没有退出事件)② `launchGame` 的 if/else 链 ③ 菜单入口 ④ `showGameArea` 不需改(它按 `.game-area` 类全量隐藏)。



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

## 设计语言(2026-09-11 可爱化改版)

**底色**:暖奶油底 + 四角漂浮糖斑(`body` 上的 4 个 `radial-gradient`,深色模式另配一套低透明度版)。
**糖果色板**:`--c-pink/yellow/green/blue/purple/orange` + 各自 `-d` 深色版(做厚底边);轮换色 `--tint-0..5`。
**果冻卡**:圆角 20-22px + `border: 2.5px solid` + `box-shadow: 0 4px 0 <同色深版>`,`:active` 时 `translateY(3px)` 且阴影压到 `0 1px 0` —— 按下去有"沉一下"的手感。
**六色轮换**:`.topic-btn` / `.game-item` 靠 `nth-child(6n+k)` 分到 `--tint-*`,同类卡片自动彩虹化,不用手写颜色。
**动效**:`cuteFloat`(吉祥物飘)、`cutePop`(答对弹跳)、`cuteShake`(答错抖动)、`confettiFall`(撒花)。
**撒花**:`window.cuteConfetti(n)` 撒 `n` 片,元素 2.8s 后自删。已挂在 5 个游戏的答对分支 + `showResult()` 结算。
**主题折叠**:41 个主题默认只露 9 个(3×3),`.topic-grid.topic-open` 展开,按钮 `#topic-more` 由 `renderTopics()` 动态创建。

⚠️ **颜色必须走 CSS 变量**,深色模式靠 `body.dark` 覆盖变量,硬编码颜色会在深色下瞎掉。
⚠️ **`.topic-btn` 是 3 列网格`,卡片内容宽度只有约 95px**。给 `.ic` 设 `display:inline-flex` 会让图标和文字挤在同一行(图标 48px + 文字 64px > 95px)→ 主题名换行。`.ic` 必须是**块级**(`display:flex` + 左右 `auto` 居中)。这个坑踩过一次。

 `var(--bg)` + 暖橙主色 `#d97757`。圆角卡片 `var(--card)` + 轻阴影。max-width 480px 移动优先、适配 `env(safe-area-inset-*)`。支持深/浅色两套主题（CSS 变量驱动）。文案亲切鼓励、面向自学者。新增 UI 沿用这套配色与圆角风格，**颜色必须走 CSS 变量**。

## 本地预览

```bash
# SKILL_DIR = 本 skill 所在目录（~/.claude/skills/自学英语 或 ~/.agents/skills/自学英语，两处同源）
SKILL_DIR=~/.claude/skills/自学英语
python3 -m http.server --directory "$SKILL_DIR" 8765
# 浏览器打开 http://localhost:8765/index.html
# 注意：含中文文件名/file:// 受限，用上面的 http server 方式预览
```

## 迭代铁律（每次修改优化都要做）

> 用户的明确要求：每次改完都执行这两个动作。

1. **更新本地 skill**：直接编辑本 skill 目录下的 `index.html`（及本 SKILL.md）。**真源是 GitHub 仓库 `lovezhujunjie-sys/danci-adventure-english`**；本机有两个同源工作副本（`~/.claude/skills/自学英语` 与 `~/.agents/skills/自学英语`，指向同一 remote），改完记得**两边同步**，否则会分叉。用户在 `~/Downloads` 里的副本只是导出，**不要**当成源。
2. **推到 GitHub**：在 skill 目录下（`git -C "$SKILL_DIR"`）
   ```bash
   git -C "$SKILL_DIR" add -A
   git -C "$SKILL_DIR" commit -m "描述本次优化"
   git -C "$SKILL_DIR" push
   ```
   ⚠️ **推之前先清代理环境变量**：本机 shell 里常驻 `ALL_PROXY/http_proxy=127.0.0.1:7897`，代理软件没开时会 `HTTP 408 / RPC failed` 推送失败。先 `unset ALL_PROXY all_proxy HTTP_PROXY http_proxy HTTPS_PROXY https_proxy` 再推（GitHub 国内直连可通）。
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
