---
name: 自学英语
description: 开发与迭代「单词大冒险」英语学习 web 应用——🔴**主要给老曾本人用**（成年初学者，自述水平"和大宝差不多"；大宝曾麟轩只是偶尔陪玩）。老曾 2026-09-11 亲口修正，旧"亲子共学玩具/决策先问大宝"的锚点已作废。单文件 index.html，纯前端 + localStorage，含六大单词模式(翻卡学习/🗺️闯关地图41岛拿星/字母拼读/游戏乐园/拼写默写/听力磨耳朵免提自动连播,音源可为**单词**或**短文逐句**) + 📖分级阅读(2026-09-11 已扩充到 20 篇分级短文:入门4/进阶8/挑战8,在App里直接读·点词即查即收·全文连播·一键转听力磨耳朵) + ⏱️今日30分钟打卡(只算真在学的时长:学习界面+页面可见+2分钟内有操作) + 🔤基础词表层 BASE_CN/BASE_IPA(根修词库对虚词/代词/不规则过去式/数词/人名的盲区) + 开口说双模块(日常高频句 392 句·点词查义·整句朗读 + 句型骨架 24 个可替换框架)+ 生词本间隔复习(SRS,可移除/全部提前复习) + 进度仪表盘(每日目标可调) + 成就系统 + 优选发音朗读 + 深色模式 + 设置持久化(发音/语速/主题/打字偏好) + 亲子向可爱皮肤(糖果色/果冻卡/撒花动效) + 双人对战(爸爸 vs 大宝)。词库约 3143 个日常高频词、41 个主题。触发场景：用户想新增/优化单词大冒险的功能、加单词/主题词库、加新游戏或学习模式、改 SRS/生词本逻辑、做学习数据可视化与激励、调发音/音标、改视觉文案、或部署分享。每次改完都要：①更新本地 skill 文件 ②commit 并 push 到 GitHub。
---

# 自学英语 · 单词大冒险 App

「单词大冒险」是一个面向中文母语者的英语单词自学应用，愿景是**让任何人都能轻松、有趣、有效地自学英语单词、发音和拼读**。本 skill 既是产品代码，也是迭代手册。

## 当前形态

> 🔴 **身份:老曾本人用的成年自学工具**(2026-09-11 老曾亲口更正)。原话:"你不用管大宝,这个主要是给我用的,大宝只是有时候和我一起玩"。
> **主用户是老曾自己**——成年初学者,自述水平"和大宝差不多",每天至少 30 分钟,目标"正常阅读英文书 + 正常对话"。
> 大宝曾麟轩(儿子)只是**偶尔陪玩**的次要用户,不作为决策依据。
> 🔴 **旧锚点「亲子共学玩具 / 做任何 UI 玩法决策先问『大宝会不会想再玩一次』」已作废**,别再拿它压成人用户的需求。
> 现有儿童向皮肤(糖果色/果冻卡/撒花)是历史遗留,**属于待改造项,不是设计目标**。双人对战(爸爸 vs 大宝)保留作陪玩功能。


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

### 🎧 音源二：短文逐句（2026-09-11 新增，`lsSource='sent'`）
听力模式现在有**两个音源**：`word`（上面的单词连播，老逻辑，一个字没动）和 `sent`（**分级阅读那 20 篇，按句连听**）。
- **为什么加**：这 20 篇是老曾**先读过**的材料，读过的内容再听 = 最有效的听力输入；而单听单词是"孤立音块"，连不成语流。
- **设置屏交互**：选听力模式后多出「听什么：🔤单词 / 📖短文」两片 chips（`#ls-source-opts`）。选短文时 `applyLsSource()` 把「选择主题 + 数量」整块换成「听哪几篇」（`#ls-book-grid`，21 个按钮 = 全部 + 20 篇，计数是**段数**），并把开始按钮文案改成「🎧 开始听短文」。
- **播放单元 = 句子**，不是单词。`lsWords` 里放的是 `{en, cn, _topic:篇名, _icon:篇图标, _book:篇键, _ipa:''}`，播放循环本来就只读 `.en`/`.cn`，所以句子对象能直接流过同一套引擎，`lsSpeak/lsWakeOn/循环/停顿/recordStudied` 全部复用。
- 🔴 **三条不能碰的规矩**：
  1. **篇内句子绝不洗牌**。选「全部」时只 `shuffle` 篇目顺序，每篇内部的句子必须保持原文顺序，否则就不是一篇文章了。`lsRun` 里循环重播时，短文走 `lsIdx = 0`（单词才走 `shuffle(lsWords)`）——这条有单测守着。
  2. **整句不能转小写/拆驼峰**。单词走 `w.en.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase()`（为的是 iPhone → i phone），整句这么干会把句首大写和专有名词毁掉。代码里按 `lsSource` 分支。
  3. **两套播放参数分开存**。短文默认「1 遍 / 900ms / 不读中文」（磨耳朵要语流，夹中文就断了），单词仍旧「2 遍 / 1200ms / 读中文」。存在 `settings.lsRepeatSent / lsGapSent / lsSayCnSent`，与 `lsRepeat/lsGap/lsSayCn` 完全隔离——共用一份会出现"在短文里关掉中文，切回单词就没释义了"。`lsKeys()`/`lsDefaults()`/`lsLoadSource()` 管这套。
- **入口**：①设置屏 🎧 听力磨耳朵 → 听什么选短文 ②**阅读页底部「🎧 听这篇（磨耳朵）」**（`#rd-listen`）——读完直接听这一篇，会把音源切到短文并选中当前篇，同时掐掉可能正在跑的「从头朗读全文」，免得两个 TTS 抢麦。
- **文案随音源变**：HUD 单位「个/词」↔「句/句」，标签「英文读几遍/词间停顿」↔「每句读几遍/句间停顿」，由 `lsSyncChips()` 统一刷。
- **样式**：短文时 `.ls-card` 加 `.sent` 类，`.ls-en` 从 38px 收到 21px 并左对齐——一句最长 115 字符，38px 会撑爆卡片。

## 📖 分级阅读（2026-09-11 新增）

🔴 **定位背景**：老曾 2026-09-11 明确**这个 App 主要给他本人用**（成年初学者，水平自述"和大宝差不多"），目标是"正常阅读英文书 + 正常对话、母语级"。按词汇习得原则，**阅读是输入主线、背词只是辅助**——所以做的是"在 App 里直接读书 + 点词即收"的闭环，而不是扩通用词表。

- **数据** `READINGS`（**顶层常量，IIFE 之外**，2026-09-11 起）：`{ id: {title, titleCn, level, icon, gloss:{词:中文}, paras:[{en, cn, g?}]} }`
  - `paras` **逐句**存英文+中文 → 为了直接复用句库那套渲染（`sentHTML` + `showWordPop`）。
  - `gloss` 是**本篇通用补充词表**。代词/复数等基础词（`he/his/him/us/we/am/boxes/children/shake…`）**不在 `VOCAB` 里**，不补就会点出"暂未收录释义"。
  - 渲染时合并 `Object.assign({}, a.gloss, p.g||{})` 再传给弹卡 → **保证点词零死区**（20 篇实测 361 句 / 3208 词位，缺失 0）。
- **界面** `reading-screen`：书架视图 `rd-shelf-view` + 阅读视图 `rd-read-view`。`renderShelf()` 列书单，`openReading(k)` 渲染正文（每句一个 `.rd-sent`，内含 `.sent-en` 可点词 + `.sent-cn` 中文）。
- **首页入口**：`data-goto="reading"` 的 mode-card，在「阅读」分组，**排在开口说之前**（阅读是主线）。路由分支在首页 mode-card 点击处理里（`else if (g === "reading") openReadingHome();`）。
- 🔴 **`showWordPop(el, raw, sentG, src)` 第 4 参 `src` 是 2026-09-11 新加的**：用来标记生词来源。阅读传 `{topic:'分级阅读', icon:'📖'}`；**不传时默认 `{topic:'日常高频句', icon:'💬'}`——这个默认值是给句库用的，改动会影响句库的收词标记**。
- **全文连播** `#rd-read-all`：用 `rdToken` 令牌防串台（与句库 `sentToken` 同套路），按句长估算停顿（`max(2000, len*62)` ms，因为 `speak()` 不返回 Promise）。
- **加新文章**：往 `READINGS` 加一项即可，注意 ①每句都要中文 ②基础代词/复数记得进 `gloss` ③**改完必须跑覆盖率检查确认零死区**（见下）。
- **验收脚本（加文章后必跑）**：解析 `VOCAB` / `GLOSS_MAP` / `EN2CN` / `FORMS_MAP` / `BASE_CN` / `BASE_IPA`，对每篇逐词走一遍 `glossOf()` 的优先级链（本句 g → 全局 GLOSS → 词形还原 → EN2CN → **BASE_CN**），并单独走一遍 `ipaOf()` 链，**释义缺失和音标缺失都必须为 0**。纯手写容易漏代词，别凭感觉。
- **当前书单：20 篇（2026-09-11 补齐），三级递进**：
  - **入门 r01–r04**（约 100~170 词，一般现在时为主）：我的一天 / 新邻居 / 咖啡店 / 难缠的客户
  - **进阶 r05–r12**（约 120~160 词，过去时 + 对话 + 从句）：老人的花园 / 又迟到了 / 深夜来电 / 第一单 / 卖掉车的人 / 夜市 / 坐错的火车 / 隔壁的狗
  - **挑战 r13–r20**（约 175~225 词，混合时态 + 情感/抽象内容）：父亲的手 / 面试 / 雨 / 旧信 / 那座山 / 十年 / 老师 / 第一页
  - 实测 **361 句 / 3208 词位，缺释义 0、缺音标 0**。
- 🔴 **写作要求（老曾 2026-09-11 定的标准）**：原话"可以再生动自然一点…最重要是能让我提高的"。所以——**不许写教科书流水账**（"我洗脸。我刷牙。"这种被否了）。每篇必须有**具体画面 + 对话 + 一个钩子**（意外／幽默／一个道理），读完要有收获。难度按上面的阶梯递进，r18《十年》和 r20《第一页》是直接对着老曾本人处境写的（成年人重启学英语、每天三十分钟、第一本英文书），**别改这两篇的立意**。

### 🔤 基础词表层 `BASE_CN` / `BASE_IPA`（2026-09-11 新增，根修词库盲区）

- **背景**：主词库 `VOCAB` 是**内容词**库，`the/a/is/you/my/in/of` 这类虚词、`he/his/him/them` 代词、`said/took/knew/saw` 不规则过去式、数词、**人名全部没有**。实测 20 篇短文一写出来就有 **90+ 个词位点不出释义、587 处没音标**——这是整个 App 的老问题（句库也一直没给虚词标音标），不是短文引入的。
- **做法**：加**顶层常量** `BASE_CN`（95 条：代词/be动词/情态动词/不规则过去式/数词/人名）和 `BASE_IPA`（266 条），在 IIFE 内 `normKey()` 之后建归一索引 `BASE_MAP` / `BASE_IPA_MAP`（键走 `normKey`，所以大小写、连字符 `forty-two` 都能命中）。
- 🔴 **`glossOf` / `ipaOf` 的最后一级兜底**：`... → EN2CN → BASE_MAP`、`... → IPA_EXTRA → BASE_IPA_MAP`。**优先级最低，绝不会覆盖已有的更准确释义**。
- 🔴 **故意不并入 `VOCAB`**：并进去会变成第 42 个主题岛，得改「41 座岛」全套文案、单词卡计数、闯关地图。这层只做查词兜底。**若哪天真要并入 VOCAB，记得同步改 41 岛文案。**
- 归一索引必须在 `normKey` **之后**定义（它依赖 `normKey`），别挪到前面。

### ✍️ 加/改短文的规矩
1. `paras` 每句都要中文；2. 生僻词进本篇 `gloss`；3. **改完必跑上面那个覆盖率脚本**；4. 新增篇目用 `r21`、`r22`… 顺延，**不要插队改编号**（书架序号按 key 顺序走）。

## ⏱️ 今日 30 分钟打卡（2026-09-11 新增）

🔴 **为什么做**：老曾的目标是"正常阅读英文书 + 正常对话"，他自己定的节奏是**每天至少 30 分钟**。已有的进度系统只数「**学习个数**」（`todayCount` / `goal:20`），跟"30 分钟"对不上——所以补一个**按时长**的维度。App 里 r18《十年》那篇短文讲的就是"每天三十分钟、不多不少"，这个打卡是它的落地闭环。

- **只在首页顶部一张卡**（`#m30`，在 `#progress-dashboard` 和 `.home-entries` 之间）：标题「⏱️ 今日 30 分钟」+ 数值 `X / 30 分钟` + 进度条 + 一句副文案；达标后整卡变绿并加 `.done`。
- 🔴 **计时原则：只算人真的在学的时间**。三个条件**同时**满足才走表（`_isStudying()`）：
  1. 当前在学习界面 —— `window.__curScreen` **不是** `start-screen` / `achv-screen`（`showScreen()` 里写这个变量）
  2. `document.visibilityState === "visible"` —— 切 tab / 锁屏不算
  3. **2 分钟内有操作** —— 挂机不算（`click/keydown/touchstart/input/scroll/pointerdown` 刷新 `_lastAct`）
- **单次最多记 30 秒**（`Math.min(dt, 30)`）：防笔记本合盖/休眠后时间跳变，凭空灌进几百分钟。
- **落盘**：每累计 30 秒存一次盘（`_unsavedSec` 节流）；`visibilitychange` 转 hidden 和 `pagehide` 时**立刻结算一次**，不丢最后几十秒。
- **跨天归零**：`checkDay()` 里除了 `todayCount` 也把 `todaySec` 清零（`defaults()` 新增 `todaySec: 0`）。**老存档没有这个字段**，所有读取都写成 `progress.todaySec || 0`，不会 NaN。
- **对外接口**：`window.getTodaySec()`（秒）、`window.renderM30()`（重绘卡片）。数据在 `progress.todaySec`。
- **与 `updateDashboard()` 的关系**：`renderM30` 是独立的、只改那 4 个 DOM 节点，**不走 `updateDashboard`**（避免每 5 秒整体重绘仪表盘）。
- 🔴 **改动后必跑回归**：计时逻辑有 21 项行为测试（首页/学习页/阅读页/隐藏/挂机/休眠跳变/成就页/跨天归零/渲染层），把 `index.html` 里的**真实代码文本**切出来在 Node 里跑（stub 掉 DOM），别用重写的副本测——测副本等于没测。历史踩坑：第一版测试自写了一个 `checkDay` 桩函数且没调用它，导致"跨天归零"假失败。
- 🔴 **同一条规矩踩过第二次（2026-09-11）**：做阅读覆盖度复核时，我凭记忆重写了一遍 `lemmaCandidates`，漏了 `'s` 规则和 `ed` 的双写辅音规则，于是报出 6 处缺释义 / 12 处缺音标——**全是假失败**。改成直接从 index.html 里 `H.slice(起点锚, 终点锚)` 切出真身 `lemmaCandidates/ipaOf/glossOf`（在 `new Function` 里注入真实的 `GLOSS_MAP/EN2CN/FORMS_MAP/BASE_MAP/...`）后，结果立刻是 **0 死区**。教训：**只要脚本里出现一个"我重新实现的"业务函数，这个脚本的结果就不可信**。锚点要挑注释行（如 `  // ---- 把句子切成可点的词 ----`）而不是函数签名，因为函数名可能在文件里出现多次。

## 开口说：日常高频句 + 句型骨架（2026-09-11 新增）

> 🔴 **使用背景（做任何决策前先读这句，2026-09-11 已更正）**：这个 app **主要给老曾本人用**（成年初学者，自述水平"和大宝差不多"，每天至少 30 分钟，目标"正常阅读英文书 + 正常对话"）；儿子**曾麟轩（大宝）只是偶尔陪玩**。**旧「亲子共学玩具／决策先问大宝会不会想再玩一次」的锚点已作废**——别拿孩子压成人用户的决策。现有儿童向皮肤（糖果色/撒花）是历史遗留，属于待改造项，不是设计目标。

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
   ⚠️ **推送走哪条路要现场试，别认死一种**（2026-09-11 实测推翻了旧结论）：
   旧文档写"清掉代理直连就能推"，当天实测**直连 push 挂**（HTTP/2 framing error、75 秒超时），
   而 `curl` 直连是通的、**显式走 7897 代理反而成功**。按这个顺序试：

   ```bash
   # ① 先 curl 探一下哪条通
   curl -sS -o /dev/null -w '%{http_code}\n' --max-time 15 https://github.com
   # ② 直连不行就显式挂代理 + 强制 HTTP/1.1（当日实测可用）
   env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
     GIT_HTTP_LOW_SPEED_LIMIT=1 GIT_HTTP_LOW_SPEED_TIME=300 \
     git -c http.version=HTTP/1.1 \
         -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 \
         push origin main
   ```

   推送后 GitHub Pages 自动更新，在线链接即最新版（也是给用户的下载/分享链接）。
   **推完必做**：抓一次线上文件的 sha256 跟本地比，确认线上真是新版，别只信 git 的回显。

## 🩺 2026-09-11 全盘体检修掉的 15 个 bug（别再重复修）

用户原话："你帮我全盘检查检查看看有没有什么BUG和可以优化的地方?"。逐条定位、逐条修、逐条回归：

| # | 问题 | 根因 |
|---|---|---|
| 1 | 短文篇目区选不出来 | `.hidden!important` 陷阱（第 2 次） |
| 2 | 从短文切回别的模式，主题区再也回不来 | 同上（第 3 次）→ 收口成 `setShown()` |
| 3 | 篇目 r09~r20 共 12 篇点不到 | 缺 `topic-open` 类，被 `nth-child(n+10)` 藏掉 |
| 4 | 切音源后"开始"按钮文案不变 | 没有 `syncStartBtn()`，只在模式卡切换时更新 |
| 5 | **最常用的闪卡模式，30 分钟计时恒为 0** | 计时判据是 `window.__curScreen`，而闪卡走裸 `classList` 切屏从不设它 → 改成 `_isStudying()` 直接看 DOM |
| 6 | **跨月/跨位数时 SRS 复习排期全乱** | 拿 `"2026-9-30"` 这种**字符串**比大小（字典序）：`'2026-10-1' < '2026-9-30'` → 加 `dayNum()` 转数字 |
| 7 | SRS 第 5 档"15 天后"永远走不到，复习卡第 5 颗点永远不亮 | 出库判据写成 `level >= SRS_INTERVALS.length`，应为 `>` |
| 8 | 在阅读/句库点"＋生词本"会把攒了几天的 SRS 档位打回原形 | 一律降级；收藏≠答错 → `addToNotebook(word, isMistake)`，只有答错才降 |
| 9 | 同一个词在生词本里变成两条互不相干的记录 | 句首词带大写入库 → 统一 `toLowerCase()` |
| 10 | 断签后一直显示旧的连续天数（假的） | `streak` 只在下次互动时才被纠正 → `checkDay()` 里当场清零 |
| 11 | 复习结算"本次复习了 N 个"数字自相矛盾 | 用了 `reviewWords.length`（含未复习的）→ 改 `reviewSession.length` |
| 12 | 💯「完美闯关」徽章永远拿不到 | `showEnd()` 一开头就 return 到 `showMapEnd()`，里面那句 `recordPerfectQuiz` 是死代码；且首页已无普通闯关入口 → 在 `showMapEnd` 里补上 |
| 13 | 苹果设备首次进页面用**中文嗓子念英文** | 没选中 voice 时没给兜底 `u.lang` → 落成文档语言 zh-CN |
| 14 | 一句 TTS 抛异常会带崩整个连播循环 | `u.voice =` 赋值和 `speak()` 都可能抛 → 各自包 `try` |
| 15 | 回到首页了还在后台念整篇 | `cancel()` 掐不掉 `onend` 链条 → 切屏时 token 自增作废 |

同期还补了：`lsWakeOn` 重入保护（`lsWake='pending'` 占位）、`markUnknown` 连点保护
（连点 5 下会虚增 5 次今日计数 + 连降 5 级 SRS）、`BASE_IPA` 补 `separate` 的音标。

## 后续路线（可继续做）

- 生词本：手动删词 / 「全部提前复习」按钮 / 生词本列表浏览页。
- 更多玩法：单词消消乐、句子填空、例句/词组扩展。
- 每日目标可在首页调节；学习提醒。
- 数据导出/导入、跨设备同步（需后端）。
- 改微信小程序便于国内传播。

## 🔴 改这个文件的三条铁律（每次动手前先读）

### ① 显示/隐藏任何区块，只能用 `setShown(id, show)`

```js
setShown('topic-grid', true);    // ✅ 唯一正确写法
document.getElementById('x').style.display = '';        // ❌ 顶不过 !important
document.getElementById('x').classList.remove('hidden'); // ❌ 会被 inline display:none 压住
```

**为什么**：CSS 里是 `.hidden{display:none!important}`（约 424 行）。要让一个带 `hidden` 类的元素重新出现，
必须**同时**清掉 `hidden` 类和 inline 的 `display:none` —— 写一个都会留下"东西点不出来"的鬼 bug。

这个坑前后踩了**三次**（短文篇目区出不来、首页主题区回不来、篇目 r09~r20 点不到）。
第三次之后把所有显示/隐藏收口进 `setShown()`，并写了两道闸门卡住它：
- 静态审计第 ⑦ 项：扫全文件有没有"只设 `style.display` 去显示一个带 `hidden` 类的元素"。
- 回归测试 ⑪b：同样规则，且带一条"确实扫到了带 hidden 的元素"防空转。

### ② 第 10 个及以后的 `.topic-btn` 会被全局规则藏掉

```css
.topic-grid:not(.topic-open) > .topic-btn:nth-child(n+10){ display:none }
```

任何**动态填充**的 `.topic-grid`（篇目网格 21 个按钮就是）必须带 `topic-open` 类，
否则第 10 个之后的按钮渲染出来了但点不到 —— 不报错、不消失，只是没反应，最难查。

### ③ 离开屏幕时要把"还在自己往下念"的连播链全部作废

`speechSynthesis.cancel()` **只掐得掉当前这一句**，掐不掉 `setTimeout`/`onend` 串起来的链条。
切屏必须让 token 自增作废：`rdToken++`（整篇朗读）、`sentToken++`（句库）、`lsToken++`/`lsPlaying=false`（听力）。
不然人都回到首页了，它还在后台念完整篇。

## 📚 词库扩容 3143 → 5000（2026-09-11，工具全在 `tools/`）

用户拍板"现在就扩到 5000"。**41 → 51 个主题**：原 41 个不动，新增 `freq1`~`freq10` 十个
「高频补充①~⑩」，按**词频梯队**切（每主题 ~186 词，①最常用）。不按词性分组——
词性分组实测不可用（同一词多词性，分不开）。

### 流水线（五步，每步都是独立可重跑的脚本）

| 脚本 | 干什么 |
|---|---|
| `tools/pick_words.py` | 按词频扫，过 6 层过滤造候选池 |
| `tools/fetch_pos.py` | 抓维基词典词性小节（**试过了，剔不了人名**，见下） |
| `tools/fetch_ipa.py` | 抓维基英式音标 |
| `tools/build_final.py` | 候选池 − 人工黑名单 → 取前 1857 → 查释义/音标覆盖 |
| `tools/apply_words.py` | 注入 `index.html` 的 `VOCAB` + `IPA_MAP`，带前后置断言 |

配套数据：`tools/gloss*.txt`（**1877 条手写中文释义**，格式 `word 中文`，按词名索引与位置无关）、
`tools/blocklist.txt`（**220 个人工剔除**：人名/地名/语气词/古语/俚语/脏话）。

### 🔴 铁律一：没有自动办法能把人名和普通名词分开（四种信号全部实测失败）

| 信号 | 结果 |
|---|---|
| `/usr/share/dict/web2` | 人名全收（maggie/lena/rachel 60/60 命中），**零区分度** |
| `/usr/share/dict/propernames` | 只有 1308 个常见名，漏掉一大片，`pick_words.py` 用它等于没过滤 |
| **维基词典词性小节** | 🔴 **`rachel`/`maggie`/`lucy` 在维基里就是挂 `===Noun===`** —— 人名和普通名词都叫 Noun，根本分不出。真正被挡下的那 83 个只是**小写页面不存在**，不是识别出来的 |
| 网页词频 × 字幕词频交叉 | 只挡 37% 人名，却误杀 6/54 个真常用词 |

**结论：机器管词频，人管"这词该不该教"。** 好在量不大——候选池前 2000 名里非真词就 200 来个，
肉眼过一遍比调启发式靠谱得多。
⚠️ 反向的坑：`smith`(铁匠)/`ivy`(常春藤)/`homer`(本垒打)/`drake`(公鸭)/`ford`(浅滩) 看着像人名，
**其实是真词，别误杀**。

### 🔴 铁律二：维基 `{{IPA|en|...}}` 的参数顺序不固定，绝不能假定 `args[0]` 是音标

```
{{IPA|en|/kəˈlæps/|a=US}}        ← a= 在后面
{{IPA|en|a=RP,GA,CA|/kəˈlæps/}} ← a= 在前面
```
按 `args[0]` 取，第二种会拿到字符串 `"a=RP,GA,CA"`，找不到 `/.../` 就跳过 →
**整批词被误判成"没有音标"（实测漏掉 118 个）**。正确做法：在模板体里**任意位置**找第一个
`/.../`，在**任意位置**找 `a=` 标注，按 `RP/UK/GB`(最优先) > 未标注 > 其它 > `GA/US/CA/AU`(最后) 排优先级。

### 🔴 铁律三：换个提取器就必须换缓存文件

`.ipa_cache.json` 是**坏提取器**产出的，修好 `pick_ipa` 后**不能往同一个缓存里续写**——
缓存里分不清哪条是谁写的，失败还会伪装成"这词没音标"。用 `CACHE=` 换个新文件重抓。
同理：**抓取失败的批次绝不写缓存**，否则"请求失败"会变成"这个词查不到"。

### 🔴 铁律四：绝不并发轰同一个 API

抓维基时一边跑任务一边手动探针 → 立刻 429。**串行 + `time.sleep(1.2)`**，
429 时读 `Retry-After` 退避重试。抓 2409 个词 ≈ 20 分钟，急不得。

### 拆分自检的实战价值（这次靠它抓住了解析器 bug）

第一版 `fetch_pos.py` 只认三级标题，结果 `with`/`kill`/`really`/`last`/`sit`/`mine` 这些
最常见的词全被判成"没有词性"，647 个集体沦为"其它"。**一词多源的词条，词性会嵌在
`===Etymology 1===` 底下降一级（`====Preposition====`）**，必须同时收三级和四级标题。
—— 之所以能发现，是因为脚本**把"其它"分类的样例打出来看了**。只打印计数不打印样例，
这个 bug 会一路带进词库。

## 🧪 测试与验证（2026-09-11 全盘体检时建的）

测试脚本已从 `/tmp` 挪进 `tests/`（2026-09-11）：

| 脚本 | 内容 | 期望 |
|---|---|---|
| `tests/test_zixue_fixes.js` | 全盘体检修的 bug 逐条回归 | 44 通过 / 0 失败 |
| `tests/test_ls_sent.js` | 听力·短文音源 | 60 / 0 |
| `tests/test_m30.js` | 今日 30 分钟计时 | 24 / 0 |
| `tests/test_idle.js` | 免提朗读时的挂机豁免 | 12 / 0 |
| `tests/smoke2.js` | **真 Chromium** 走遍每个界面 | 53 / 0 |
| `tests/audit_static.js` | 静态审计（id 引用/落盘配对/.hidden 陷阱） | 无 ❌ |
| `tests/audit_sentences.js` | 句库静态审计 | 无 ❌ |
| `tests/vfy3.js` | 点词死区（音标/释义） | 0 / 0 |
| `tests/perf.js` | 加载/渲染性能 | 见脚本 |

**跑法**（脚本里用的是相对路径 `index.html`，必须在 skill 目录下跑）：
```bash
cd ~/.claude/skills/自学英语
NODE_PATH=/tmp/pwtest/node_modules node tests/test_zixue_fixes.js
```
真浏览器测试用的是 Playwright 自带 Chromium：
`~/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

### 🔴🔴 写测试的头号纪律：不许重写业务函数

**必须从 `index.html` 里切"真身"代码来跑，一个业务函数都不许在测试里重新实现。**

这个错犯过**两次**，第二次（`/tmp/vfy2.js`）谎报了"缺 92 条释义 / 207 条音标"，
差点让我去补一堆根本不存在的问题。重写版和真身的差别就在细节里（大小写、lemma 候选、fallback 顺序），
自己实现一遍等于考自己出的题。

正确姿势：按**注释行**做切片的锚点（函数签名会改，注释行更稳），例如：

```js
function cut(a, b) { const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j < i) throw new Error('提取失败: ' + a); return src.slice(i, j); }
const CODE = cut('  function todayStr() {', '  function defaults()');
```

### 跑长任务的三个操作坑（都会让"等结果"变成"永远等不到"）

- **别用 `pgrep -f <脚本名>` 当等待条件**：等待的 shell 自己命令行里就含这个字符串，
  `pgrep` 会匹配到自己，`until ! pgrep -f fetch_ipa.py` **永远不退出**（2026-09-11 卡死两个等待进程）。
  改成**盯日志里的完成标记**：`until grep -q "拿到音标" /tmp/ipa.log; do sleep 20; done`。
- **macOS 没有 `timeout` 命令**（GNU coreutils 才有）。别写 `timeout 300 python3 xxx.py`，直接报 command not found。
- **前台 `sleep` 会被拦**：要等就先 `run_in_background: true` 跑 `until …; do sleep N; done`，
  或者用 Monitor 工具挂个 until 循环。

### 真浏览器测试的两个已知坑

- **`SpeechSynthesisUtterance` 是浏览器原生类**，桩必须**整个替换掉这个类**
  （`Object.defineProperty(window,'SpeechSynthesisUtterance',{value:MyStub})`）。
  写成 `if (!window.SpeechSynthesisUtterance)` 是无效的 —— Chrome 早就定义好了，
  于是 `u.voice = 普通对象` 会撞上真实校验器抛异常，**级联出一堆假的"导航超时"**。
- **断言别考内部状态**（如 `window.__curScreen`）。内部判据一改，测试就在考陈旧契约。
  考对外的口子（如 `window.getTodaySec()`）或直接考用户看得见的结果。

## 已知限制（刻意不修，不是漏了）

1. **13 处短语释义点不到**：短文词表里的 `alarm clock`/`red light`/`used to`/`waiting room`/
   `out of work`/`woke up`/`came in`/`sat down`/`twenty-five`/`stood up`/`hard way`/
   `look up`/`came back` —— `glossOf` 是按**单个 token** 查的，短语永远命中不了。
   **故意不改**：给初学者做短语识别是个脆弱启发式，猜错释义比给个通用义更糟；
   而且这 13 处全都能回落到正确的全局词义，用户不会看到空白。
2. **215 处主题间词义冲突**（同一个词在不同主题下释义不同）：都取了首次出现的那条，无害。
3. **句型骨架那屏的句子不可点词**（纯文本 + `.hl` 高亮），所以那里的"缺释义/缺音标"不是死区，
   静态扫描会报出来，**忽略即可**。

## 注意

- **保持单文件、零依赖、离线可用**，除非用户同意引入后端/框架。
- 新增任何"值得鼓励的行为"，记得走 `recordWord()` 或 `recordStudied()` 让它计入进度/连续天数。
- 新增持久化字段务必加进 `defaults()`，否则老用户存档读不到。
- 词库是 `{cn,en}`；展示音标从 `IPA_MAP` 取，没有就留空（不要瞎编音标）。
- 朗读始终是发音的权威来源，音标只是辅助。
- **数据常量里不要写 `//` 行内注释**：评估脚本用 `JSON.parse` 读它们会炸
  （`BASE_IPA` 里曾有个 `//` 注释，害得校验脚本报错）。要写说明就写进本文件。
