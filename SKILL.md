---
name: 自学英语
description: 开发与迭代「单词大冒险」英语学习 web 应用——🔴**主要给老曾本人用**（成年初学者，自述水平"和大宝差不多"；大宝曾麟轩只是偶尔陪玩）。老曾 2026-09-11 亲口修正，旧"亲子共学玩具/决策先问大宝"的锚点已作废。单文件 index.html，纯前端 + localStorage，含六大单词模式(翻卡学习/🗺️闯关地图29岛拿星/字母拼读/游戏乐园/拼写默写/听力磨耳朵免提自动连播,音源可为**单词**或**短文逐句**) + 📖分级阅读(2026-09-11 已扩充到 20 篇分级短文:入门4/进阶8/挑战8,在App里直接读·点词即查即收·全文连播·一键转听力磨耳朵) + ⏱️今日30分钟打卡(只算真在学的时长:学习界面+页面可见+2分钟内有操作) + 🔤基础词表层 BASE_CN/BASE_IPA(根修词库对虚词/代词/不规则过去式/数词/人名的盲区) + 开口说双模块(日常高频句 392 句·点词查义·整句朗读 + 句型骨架 24 个可替换框架)+ 生词本间隔复习(SRS,可移除/全部提前复习) + 进度仪表盘(每日目标可调) + 成就系统 + 优选发音朗读 + 深色模式 + 设置持久化(发音/语速/主题/打字偏好) + 亲子向可爱皮肤(糖果色/果冻卡/撒花动效) + 双人对战(爸爸 vs 大宝)。词库 5000 个日常高频词、29 个主题（主题按词义命名，🔴**不许再出现「高频补充①~⑩」这类无语义桶、也不许按词性分桶**）。触发场景：用户想新增/优化单词大冒险的功能、加单词/主题词库、加新游戏或学习模式、改 SRS/生词本逻辑、做学习数据可视化与激励、调发音/音标、改视觉文案、或部署分享。每次改完都要：①更新本地 skill 文件 ②commit 并 push 到 GitHub。
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
- 词库内置 **5000 个互不重复的日常高频词、29 个主题**（演进：3143/41 → 2026-09-11 扩到 5000/51 → 当天把 10 个无语义桶重构成 41 个语义主题 → 5000/82 → **2026-09-12 收成 5000/29**）。全部 `{cn, en}` 形式 + IPA 音标表 `IPA_MAP` + emoji 映射 `EMOJI_MAP`。
- 🔴 **2026-09-12 起「5000 个词」指的是 5000 个归一后互不重复的词**，不是 5000 张卡。老库 5000 条里有 6 组同一个词写了两遍的（check in/checkin、sign out/signout、goodbye/good-bye、email/e-mail、also/alsо 西里尔字母同形字），去重后老词 4475 个，补进 525 个新词才凑满 5000。**主题名一律按词义起，不许按词性分桶**（形容词/动词必须散进语义场景）。

## 数据常量（`<script>` 顶部，两个 IIFE 之外，全局可见）

- `VOCAB` — 主词库 `{ 主题key: {name, icon, words:[{cn,en}...]} }`，**29 个主题 `T01`~`T29`**（2026-09-12 重构后）。**key 是稳定标识**，改名不改 key；`wordadv_map_stars` 按 key 存星星，82→29 的老存档靠 `STAR_MIGRATE` 摊到新 key（见下）。
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
2. **🗺️ 闯关地图**（选择题，2026-09-11 起替代原「✅ 闯关」入口）— `openMap/renderMap/startMapLevel/showMapEnd`。**29 座小岛 = 29 个主题词库**（2026-09-12 主题重构后），点岛直接开练，不再需要"先选主题、再选题数"两步（那两步是大人刷题思维，对小孩是门槛）。每关固定 **5 题**，按正确率给星：**全对 3 星 / ≥80% 2 星 / ≥60% 1 星**，不足 60% 得 0 星不计进度。顶部 HUD 实时显示「已通关 X / 29 关」+ 星星总数 ⭐。出题方向在地图顶部切（`#map-dir`：看中文→选英文 / 看英文→选中文），与全局 `selectedQuizMode` 共用。**不设关卡锁**——`mapUnlocked()` 恒 `true`，老曾 2026-09-11 定调："提前让大宝碰天书，锁关卡等于把天书藏起来，与目的相反"，**进度感交给星星总数而非锁**。当前进度岛飘「👦 你在这里」并自动 `scrollIntoView` 居中（`mapFrontier()` = 第一座还没拿到星的岛）。作答与结算沿用原闯关引擎：`renderQuestion/handleAnswer` 完全不变，`showEnd()` 开头 `if (mapKey) { showMapEnd(); return; }` 分流；`#restart-btn`「🔁 再挑战一次」、`#home-btn`/`#back-to-home`「🗺️ 回到地图」也都按 `mapKey` 是否非空分流。星星存 `localStorage['wordadv_map_stars']`（键为主题 key、值为该主题历史最高星数，只增不减），`['wordadv_map_open']` 存开图状态。**答对答错都不自动跳**：作答后停在当题显示反馈(✓/✗ + 音标 + 中文 + 🔊朗读)，由用户点 `#next-question-btn`「下一题 →」才前进——蒙对的词也能多看几眼加强记忆。（原有"⚡自动模式/📝练习模式"节奏切换器已移除，`selectedQuizPace` 变量保留但不再生效。）**遗留**：原闯关设置页里的「出题方向」`#quiz-options`（`data-quizmode` 按钮）因入口取消已成**孤儿 UI**（带 `hidden` 恒不显示），`syncQuizModeBtns()` 对它的操作已无实际作用；地图方向切换改用 `#map-dir`，勿误改。
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
- 🔴 **故意不并入 `VOCAB`**：并进去会变成第 30 个主题岛，得改「29 座岛」全套文案、单词卡计数、闯关地图。这层只做查词兜底。**若哪天真要并入 VOCAB，记得同步改 29 岛文案。**
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
**主题折叠**:29 个主题默认只露 9 个(3×3),`.topic-grid.topic-open` 展开,按钮 `#topic-more` 由 `renderTopics()` 动态创建。

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
| `tools/fetch_ipa.py` | 抓维基英式音标（业务函数真身，别的脚本都从这里切） |
| `tools/refetch_v3.py` | 全量重抓 + 与现有最佳值**逐词对比**（改了提取器就必须整跑一遍） |
| `tools/normalize_ipa.py` | ①记号统一（ɛ→e、ɹ→r、裸 a→æ、重读裸 i→iː…）②美音检测 |
| `tools/merge_ipa.py` | 新旧两份缓存**逐词择优**（B 优先，脏的退回 A，带人工 OVERRIDE 表） |
| `tools/build_final.py` | 候选池 − 人工黑名单 → 取前 1857 → 查释义/音标覆盖 |
| `tools/verify_final.py` | **注入前的质量闸门**，任何一条不过就退 1，绝不写"基本没问题" |
| `tools/apply_words.py` | 注入 `index.html` 的 `VOCAB` + `IPA_MAP`，带前后置断言 |
| `tools/test_normalize_ipa.py` | 音标规则的回归测试（23 条用例，**含反例**） |

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

### 🔴 铁律五：区分「记号」和「口音」——记号可替换，口音只能剔词

这一条是整条音标链路的**组织原则**，判错了就是伪造音标。

| | 例子 | 怎么办 |
|---|---|---|
| **记号**（同一个音的不同写法） | `ɛ→e`、`t͡ʃ→tʃ`、`l̩→l`、`ɫ→l`、`ʍ→w`、`ɐ→ʌ`、`ɹ→r`、音节点 `.`、裸 `a→æ`、重读裸 `i→iː` | **可以替换**（叫"记号统一"） |
| **口音**（真的发音不同） | `ɚ`/`ɝ`、`oʊ`、短 `ɑ`、卷舌 `r`、鼻化 | **只能剔词**，绝不靠字符替换糊过去 |

🔴 **判据不许凭感觉定，必须拿应用**自有**的音标当标尺**——它们是已知正确的英式 RP。
任何一条规则只要在自有数据上误报，就是规则错。**误报必须为 0**（`normalize_ipa.py`
开头就自检这件事，不过就 `sys.exit(1)`）。

⚠️ **但"零误报"不等于"规则对"**（血的教训）：
`cemetery = /ˈsemɪˌtri/` 的裸 `i` 在**词尾**，是 happy 元音（跟自有表 `healthy=/ˈhelθi/` 同类），
只是前面挂了个次重音号 `ˌ`。自有表恰好没有「`ˌ`+辅音+`i` 结尾」这种形态，所以自检显示
零误报——**那是数据没覆盖，不是规则正确**。同类翻车还有 `deeply = /ˈdi(ː)pli/`：
`i(ː)` 是"可长可短"，直接插 `ː` 会得到 `iː(ː)` 这种畸形写法。
**所以每条规则都必须另配一组人工写明期望值的用例、尤其是反例**，
见 `tools/test_normalize_ipa.py`。零误报 + 反例用例，两个都要。

### 🔴 铁律六：维基的「行」是口音标注的作用域

维基一条读音占一行，`{{enPR|…|a=RP}}, {{IPA|en|/x/}}` 用逗号连在同一行——
**行内回看口音标注是对的，跨行回看是错的**：

```
sector: * {{enPR|sĕk'tər|a=US}}, {{IPA|en|/ˈsɛk.təɹ/}}   ← 同行，那条 IPA 就该算美音
        * {{IPA|en|/ˈsɛktɚ/|a=IE}}
Irish : * {{audio|en|En-us-Irish.ogg|a=US}}
        * {{enPR|ī'rĭsh}}, {{IPA|en|/ˈaɪɹɪʃ/}}              ← 跨行回看会把 audio 的 a=US
                                                              安到这条头上，标准音输给弱读变体
```
⚠️ **`a=` 不一定是口音**：`upbeat = {{IPA|en|/ʌpˈbit/|a=adjective}}`，这里 `a=` 是**词性**。
词性/语域限定词（noun/verb/archaic/informal…）不含口音信息，遇到要当"未标注"。

### 🔴 铁律七：页面上的「未标口音斜杠式」是词典默认引用形，优先级最高

`leap` 栽在这：`{{IPA|en|/ˈliːp/}}`（宽式，正确）和 `{{IPA|en|[ˈlɪi̯p]|a=RP}}`（**方括号 = 窄式，
某口音的实际实现**）。原来的排序把"带 a=RP"排最前，于是选中窄式的 `[ˈlɪi̯p]`，落到库里
成了 `/ˈlɪip/` 这种半截音标。**正确排序：未标注 + 斜杠式 = 最高**（rank -1）。
不影响 `american`——那页的斜杠式**明确标了 a=GA**，仍排在英式方括号之后。

### 🔴 铁律八：`missing` 只说明「这个拼法没页面」，不等于「这个词没有音标」

维基**首字母区分大小写**：`irish` 不存在但 `Irish` 存在；反过来 `anytime` 存在而 `Anytime` 不存在。
`refetch_v3.py` 原来写成 `if p.get('missing'): got[t] = None; continue`，于是四个词
（irish/japanese/jewish/russian）被判 missing 后**直接 continue**，下面那段"首字母大写兜底"
刚好对它唯一要救的情况成了**死代码**——四个词静默变成"没音标"。
**先试大写页，再决定放弃。**

### 🔴 铁律九：多值变体要显式选，别让"第一个"替你决定

`noise = {{IPA|en|/ˈnoɪ̯z/|/ˈnɔɪ̯z/}}` 同模板两个变体。自有 3082 条里 `ɔɪ` 出现 27 次、
`oɪ` 出现 **0** 次——本词库一律写 `ɔɪ`。`merge_ipa.py` 里有张人工 `OVERRIDE` 表专门记这类
"规则判不了、人来定"的取值，**每条都要写清为什么**。

### 🔴 铁律十：切真身要用 AST 切全，白名单迟早漏；而"编程错误"必须当场炸，不能重试

**这条是 2026-09-11 那次 1300 条音标全变 `null` 的根因，代价最大，单独记。**

`refetch_v3.py` 从 `fetch_ipa.py` 切业务函数真身，原来写死一张白名单：

```python
for fn in ('fetch', 'english_section', 'pick_ipa', 'spelling_target'):   # ← 漏了第五个
```

而 `pick_ipa` 内部调用 `parse_ipa_templates`。于是**每一个词**都抛
`NameError: name 'parse_ipa_templates' is not defined` —— 然后连环踩中两个放大器：

| 放大器 | 后果 |
|---|---|
| 外层 `except Exception` 把 NameError 当成**网络抖动**，重试 6 次 | 6 次全死在同一个 bug 上，白等 6 倍时间 |
| `got = {}` 在填词**之前**赋值，`if got is None` 就成了死代码 | 空字典被当成"成功但没音标"，**失败伪装成了结论**——正是最该避免的假完成 |

结果 1400 个词静默写成 `{"ipa": null}`，脚本**一声不吭**，看着像"维基查不到"。

**三条修法（缺一不可）：**
1. **用 AST 切全**，不维护白名单：函数/类/import 全切；纯常量赋值要切
   （`ACC_ANNOT` 那类正则是 `pick_ipa` 的依赖，漏了照样 NameError）；
   **读文件的赋值和主程序体不要**——靠"主程序体一定排在所有 `def` 之后"这条界来切
   （光判"含不含 `open(`"不够：`todo = [w for w in WORDS ...]` 就不含 `open(`）。
2. **编程错误立刻抛**：`except (NameError, SyntaxError, AttributeError, TypeError)` → 直接
   `raise RuntimeError`，绝不进重试。这几类是**代码 bug**，重试只会把 bug 埋更深。
3. **空的"结果"要当失败**：攒到局部 `acc`，整批走完才 `got = acc`。空字典是失败，不是结果。

⚠️ **我自己的第一版修法也是错的**（想当然用"找下一个 `^def`"切片，最后一个函数后面没有
`^def`，切片一路吃到文件尾把主程序体全带进来，一 exec 就开抓）。**修 bug 的代码同样要测**——
最后是用"执行 `refetch_v3.py` 自己那段切片代码、再拿切出的 `pick_ipa` 抓真词"验的
（`abandon → /əˈbændən/`），保证测试不可能与真身漂移。

### 🔴 铁律十一：用户看得见的数字，永远不许写死在 HTML 里

扩容到 5000/51 之后，界面上还有 **4 处硬编码的旧数字**，其中两处 JS **从来不更新**：

> ⚠️ 主题重构（51→82→**82→29**）时这几处又得手动跟着改一遍。2026-09-12 那次把 5 处写死的 "82" 改成 "29"：
> `index.html` 的 `#topic-count` / `.isle-count`×2 / `#total-count` 一线 + 注释里的两处。
> **这就是"写死"的代价：数据变一次，就得人肉找一遍。** 每次改主题数/词数，先 `grep -n "82" index.html`
> 确认都跟上了，别只改数据层。（`#topic-count` 和 `.isle-count` 现在是**运行期从 `Object.keys(VOCAB).length` 填的**，只剩 HTML 里的初值要手改。）

| 位置 | 原值 | 会不会被 JS 覆盖 |
|---|---|---|
| 首页副标题 `#total-count` / `#topic-count` | `3143` / `41` | 会（`renderTopics`），但**首屏会闪一下旧数** |
| 闯关地图 HUD `#map-progress-text` | `已通关 0 / 41 关` | 会（`renderMap`），首屏闪 |
| 闯关地图提示 `.map-tip` | `41 座小岛随便点` | 🔴 **不会，永远是 41** |

老曾原话就是**「单词怎么还是3143啊」**——闪一下旧数字，就足够让人以为整件事没生效。
**"能被 JS 覆盖"不等于没事**，首屏那一帧就是用户的第一印象。

修法：`.map-tip` 里的岛数改成 `<span id="map-isle-count">`，由 `renderMap` 填 `ks.length`，
跟着 `VOCAB` 走。**凡是"数量"文案，一律从数据算，不许写字面量。**

### 🔴 铁律十二：测试没真跑起来过 = 没有测试；别让兜底把失败吞成"✅ 完成"

`test_sw_offline.js`（离线缓存回归）开头只 require 了 `path`/`os`，**漏了 `playwright-core`**，
正文却直接用 `chromium` —— 它**从提交那一刻起就没跑成功过**，
一执行就 `ReferenceError`。而 `run_expansion.sh` 第 ⑧ 段末尾有个 `true` 兜底
（本意是让 `[ -n "$SRV" ] && kill` 别在 SRV 为空时触发 `set -e`），
**把崩溃一起吞了**：脚本继续走到结尾、退出码 0、看着像"全链 ✅ 完成"。
于是"离线缓存有回归保护"这句话一直**没有依据**。

两处都已修（补 require；把兜底改成先存测试退出码、再用 `|| true` 单独吃清理动作的返回值）。

**判据：**
- 看每个测试**自己的**输出行，**别只看汇总退出码** —— 退出码会被人为兜平。
- **加新测试后先故意让它失败一次**（临时 `ok('假的', false)`），确认它真能报错、
  真能让全链退出码变 1。**能"通过"但不会"失败"的测试是装饰品。**
- ⚠️ 后台任务报的 `exit code 0` 也可能是假的：命令末尾的 `echo` 会把整条的退出码盖成 0。
  要判断真结果，得看命令**自己**打印的状态（这次的 `EXIT=1`）。

### 拆分自检的实战价值（这次靠它抓住了解析器 bug）

第一版 `fetch_pos.py` 只认三级标题，结果 `with`/`kill`/`really`/`last`/`sit`/`mine` 这些
最常见的词全被判成"没有词性"，647 个集体沦为"其它"。**一词多源的词条，词性会嵌在
`===Etymology 1===` 底下降一级（`====Preposition====`）**，必须同时收三级和四级标题。
—— 之所以能发现，是因为脚本**把"其它"分类的样例打出来看了**。只打印计数不打印样例，
这个 bug 会一路带进词库。

## 🔄 主题重构 82 → 29（2026-09-12，工具在 `tools/rebuild30/`）

老曾原话：「82 个主题，我感觉太多太杂乱了，能不能在不改变单词词汇量的情况下缩到 30 个以内」。
他选的口径是**乙案**：形容词/动词**不按词性分桶**，散进语义场景；去重后补新词凑满 5000 个**真正不同**的词；
同主题重复卡**去重保留**（不删词）；全部弄完自检一遍再同步三处。

### 结果

| 项 | 老库（82 主题） | 新库（29 主题） |
|---|---|---|
| 词条数 | 5000 | 5000 |
| **归一后唯一词** | 4475 | **5000** |
| 主题数 | 82 | 29 |
| 有音标的词 | 4468 | 4983 |
| 补进的新词 | — | 525 |

29 个主题：人物与家庭 / 社会与国家 / 身体与外貌 / 健康医疗 / 情绪与性格 / 心智与判断 / 说话与沟通 /
饮食吃喝 / 家居生活 / 服装打扮 / 动物与自然 / 科学与宇宙 / 交通出行 / 城市与场所 / 生活事务 /
学校学习 / 工作与职场 / 购物与金钱 / 手机与电脑 / 上网与影音 / 娱乐与运动 / 时间与日期 /
数字与度量 / 冲突与法律 / 信仰与节日 / 评价与态度 / 程度与方式 / 状态与变化 / 功能词（`T01`~`T29`）。

### 流程（`tools/rebuild30/`，按顺序跑）

1. `dump_old.py` → `vocab_old82.json`（把老 VOCAB 抠出来）
2. 子代理分批把老词分进 29 个主题（`out/assigned_*.json`）**＋另起一批给新词分类**（`out/new_a*.json`）
3. `select_new.py` → 从 CEFR-J 词表选候选，`fetch_cn.py`/`fix_cn.py`（ECDICT + 人工修 217 条）出中文
4. `fetch_ipa.py` → 维基词典抓英式 RP 音标（缓存 `tools/.ipa_cache.json`）
5. `build_final.py` → 合成 `vocab_final.json` / `ipa_final.json`
6. `verify_final.py` → **独立**12 项校验（不引用 build 的中间产物）
7. `apply_to_index.py` → 只替换 `const VOCAB` / `const IPA_MAP` 两个字面量，别的字节不动

### 🔴 这一步踩到的坑（血泪，别再踩）

- **差点毁库：去重时用小写当输出**。`IPA_MAP` 的键是 `en` 的**原文**（含大小写和空格：`Face ID` / `World Cup` / `living room`），
  应用里是 `IPA_MAP[w.en]` 直接取。当时的去重键是 `en.strip().lower()`，输出也用了它 —— 319 个词会被静默降成 `face id`，
  音标全查不到，**且不报错**。正解：`dedup_key()` 只管分组，输出一律用 `v['en']` 原文。
  现在 `tests/test_topics29.js` 第③段专门守这条（遍历全部 308 个含大写/空格的词，逐个用原文查 `IPA_MAP`）。
- **`alsо` 是西里尔字母 о（U+043E）**，跟 `also` 是两个不同字符串，会同时留下「坏字符条目」和「没音标的 also」。
  归一里加了 `HOMO` 同形字翻译表修掉。**去重键必须吃掉非 ASCII 同形字**。
- **老库 6 组「同一个词写两遍」**：check in/checkin、sign out/signout、goodbye/good-bye、email/e-mail、also/alsо。
  所以老库唯一词是 **4475** 不是 4480，新词要补 **525** 不是 520。差点按 520 补，结果差 5 个词凑不满。
- **`STAR_MIGRATE` 摊星星不能用 `Math.round`**（2026-09-12 回归测试实测抓到）：
  老主题被拆得很散，每块占比都不到 0.5，四舍五入会**每块都归零**。`daily` 打满 3 星只摊出 1 星，
  `adj_basic`/`verb_show` 同样只剩 1 星。全库满星算：四舍五入只剩 **235** 星，最大余额法 **246** 星，
  理论满额本来就是 246 —— 少掉的 11 颗是纯漏的。改成**最大余额法**（先取整数部分，差额按小数部分从大到小补给前几名）后严丝合缝。
- **子代理产出格式不统一**：批 1/2 是扁平 `{"词":"Txx"}`，批 3 是嵌套 `{"词":{"word":"Txx"}}`，合成脚本两种都得认。
- **17 个词抓不到英式音标**，是老词（`granddad`/`businesswoman`/`part-time`/`brand-new`…）。
  原因分三类：维基页面没有 `{{IPA}}` 模板、页面只有美音 `a=US`（本库是纯英式 RP，正确地拒绝了）、
  重定向别名（`guidebook`→`guide book`）。**决定留着这 17 个词（音标栏留空）**，而不是为了凑 100% 换成更冷僻的词。

### 硬核验（`verify_final.py`，独立重解析两库原文对比）

```
✅ 老库 5000 条的词全部保留   ✅ 总词数 = 5000     ✅ 5000 个词互不重复
✅ 补进的新词 = 5000 - 老库唯一词数（4475 + 525）  ✅ 新词全部来自 CEFR-J 选词池
✅ 每条都有中文释义          ✅ 中文释义没有英文字母残留   ✅ 主题数 = 29
✅ 没有空主题                ✅ 每个主题都有名字和图标     ✅ 主题编号是 T01~T29
✅ 词条字段顺序是 cn,en      ✅ 英文词里没有非 ASCII 字符   ✅ 音标覆盖率 ≥ 老库
全部通过 ✅
```

### 诚实边界

- **`T28 状态与变化` 有 279 个词**，是最大的主题之一（最大的是情绪与性格 291、动物与自然 287）。
  再拆会回到「主题太多」，所以**没拆，如实上报**。老曾若觉得这一个岛太重，可以再拆成两岛。
- 17 个词音标栏为空（见上）。
- 老库有音标的词**一个没丢**（这条是 assert 硬卡的，`build_final.py` 末尾 `assert not lost`）。

### 星星迁移（`STAR_MIGRATE` + `mapMigrateStars()`）

老存档 `wordadv_map_stars` 是按**老主题 key**（`people`/`tech`/`adj_basic`…）存的，不迁移老曾打过的星星全丢。
规则：按「老主题的词有多少落进这个新主题」把星星**按占比摊过去**（最大余额法取整、单主题封顶 3 星），
只保留占比 ≥5% 的块，碎渣丢掉。跑在 `openMap() → mapLoadState()` 里，一次性开关 `wordadv_map_migrated_v29`。
认不出的键（既不是老键也不是新键）原样留着，不删。矩阵 82 个老键**全覆盖**（校验过，一个不漏）。

### 📦 历史存档：主题重构 51 → 82（2026-09-11，已被上面那节取代，工具在 `tools/reclass/`）

### 🔴 老曾的原话与真需求

> "11 个主题全部叫做高频补充，我觉得不好啊！能不能把你新扩的词汇放到之前的 41 个主题里面去，
> 或者新扩的你根据单词意思重新命名主题名……**因为我感觉我在记单词的时候单独学习一个主题的时候
> 对记忆有帮助，有时候会融会贯通**，你明白我的意思吗？"

**他要的不是"改名"，是"主题要有语义"。** 10 个按词频梯队切的桶对记忆毫无帮助——
「高频补充③」这个标题对大脑不产生任何联想，学完了也串不起来。
这是**产品缺陷**，不是命名洁癖：词频梯队是给编译器看的分组，不是给人看的分组。

### 做法：两种建议各用一半

老曾给了两条路（并入旧主题 / 按词义重命名），**最终用的是混合方案**：

1. **语义吻合的并进旧主题**（19 个旧主题吸纳了新词，老曾建议①）：

   | 主题 | 变化 | 主题 | 变化 |
   |---|---|---|---|
   | abstract 抽象概念 | +141 → 237 | job 工作职业 | +23 → 97 |
   | house 家居物品 | +53 → 129 | animal 动物世界 | +20 → 93 |
   | people 人物身份 | +42 → 87 | transport 交通出行 | +19 → 80 |
   | nature 自然环境 | +39 → 98 | food 食物饮料 | +19 → 75 |
   | health 健康医疗 | +38 → 101 | music_art 音乐艺术 | +16 → 58 |
   | time 时间日期 | +32 → 102 | clothing 服装配饰 | +15 → 66 |
   | color_shape 颜色形状 | +27 → 67 | sports 运动健身 | +14 → 82 |
   | number 数字数量 | +24 → 89 | city 城市地点 | +12 → 83 |
   | body 身体部位 | +24 → 68 | verb_basic / adj_basic | +3 / +2 |

2. **其余按词义切成 41 个新主题**（老曾建议②），共三类：
   - **23 个语义主题**：称呼与身边人 🫂 / 情绪与心境 😤 / 性格与为人 🎭 / 思考与判断 🤔 /
     说话与争论 🗣️ / 心智与感知 🧠 / 程度与语气 📊 / 连接与逻辑 🔀 / 代词与反身 🙋 /
     罪案与警察 🚨 / 法庭与审判 ⚖️ / 战争与军队 ⚔️ / 王室与贵族 👑 / 政治与国家 🏛️ /
     国籍与民族 🌐 / 宗教与信仰 😇 / 神话与魔法 🐉 / 死亡与葬礼 ⚰️ / 科学与宇宙 🔬 /
     买卖与交易 💵 / 公司与职场 🏢 / 建筑与场所 🏘️ / 故事与影视 📖
   - **9 个形容词主题**：赞美与出色 / 糟糕与讨厌 / 大小与程度 / 重要与难易 / 确定与异同 /
     常见与稀奇 / 时间与先后 / 安危与状态 / 方位与内外
   - **9 个动词主题**：手部拿放 / 敲打与损毁 / 移动与摇晃 / 流动与喷洒 / 看与表现 /
     相处与配合 / 阻挡与停止 / 存在与归属 / 操作与办理

   顺带留了一个 `misc` 其他口语词 🧩（真归不进去的），**是逃生舱，不是垃圾场**——
   扩容时它只有 0 词。

### 🔴 铁律：子代理会把"桶"再造一遍（这次真发生了）

第一轮派 5 个子代理按 TAXONOMY 分类，结果它们把 **215 个形容词倒进 `adj_basic`、
147 个动词倒进 `verb_basic`、45 个倒进 `misc`** —— 等于把老曾抱怨的"无语义桶"原样重建了一遍，
只是换了个名字。**根因：我给的 TAXONOMY 里留着 `adj_basic`/`verb_basic`/`misc` 三个兜底桶，
子代理一定会往里倒。**

修法：再派 3 个子代理做**自由语义聚类**——**不给候选组名，让它们自己看着词起名字**。
结果形容词自己长出了「赞美与出色 / 糟糕与讨厌 / 大小与程度…」，动词长出了
「手部拿放 / 敲打与损毁 / 移动与摇晃…」，全部是能被大脑记住的类别。

> 🔴 **教训：分类任务里只要留了兜底桶，就一定会被灌满。要么不给桶，要么给桶但卡死配额
> （TAXONOMY 里写的"每组不超过 12 个"根本没被遵守）。下次直接让子代理自由命名。**

### 流水线

| 文件 | 干什么 |
|---|---|
| `tools/reclass/TAXONOMY.md` | 给子代理的主题清单 + 判定规则（**教训见上**） |
| `tools/reclass/out_1_2.json` … `out_9_10.json` | 第一轮 5 个子代理的分类结果（1857 词） |
| `tools/reclass/redo_adj.json` / `redo_verb.json` | 第二轮自由聚类的形容词/动词细分 |
| `tools/reclass/redo_misc.json` | 45 个 misc 词的逐词重新分派 |
| `tools/reclass/build_reclass.py` | 汇总 + 校验 + 写回 `index.html`（`--write` 才真写） |

### 这次踩到的坑

1. **`sport` vs `sports`**：TAXONOMY.md 里我自己把 key 写成了 `sport`，真实 key 是 `sports`，
   3 个子代理照着抄了错 key → 加 `ALIAS` 字典兜住。**写文档给子代理时，key 必须从
   VOCAB 里直接抄，不能凭记忆写。**
2. **`traits` 打印两次**：`all_new_order = NEW_KEYS + list(redo_topics)` 里 `traits`
   既在新建清单又在二级聚类清单 → 主题列表重复。改成 `if k not in NEW_META` 过滤。
3. **图标撞车**：🔗(连接与逻辑 vs 功能词)、🧭(方位)、🏃(动词)、🧩(杂项) 与旧主题撞 →
   `ICON_OVERRIDE` 换成 🔀/📐/🚶/🌱。
4. **build 脚本自报数不准**：`print` 的是**已被追加污染的** `vocab`，打出 5900。
   → 改在追加前抓 `ORIG_TOTAL`。**脚本自报的数字不算数，要另写一段独立代码重新解析产物。**

### 🔴 进度安全性（改主题前必须想清楚的事）

`wordAdventure_progress` 的 `learned` 是**按英文单词**存的，不是按"主题+下标"——
所以**主题怎么重组，老曾已学的进度一个都不会丢**。
唯一会丢的是 `wordadv_map_stars`（按主题 key 存星星），`freq1~freq10` 的星星会清零，
其余主题的星星原样保留。**这是可以接受的代价，但必须主动告诉用户，不能瞒着。**

### 硬核验（独立重解析 `index.html`，不信 build 脚本的自报）

```
✅ 主题数 = 82        ✅ 总词数 = 5000      ✅ 原 41 个主题 key 全保留
✅ freq1~freq10 全消失  ✅ 没有主题还叫「高频补充」  ✅ 1857 个新词一个不丢
✅ 主题名无重复        ✅ 主题图标无重复    ✅ 所有主题名 2~6 字
✅ 所有词条都是 {cn,en} 结构
```

## 🧪 测试与验证（2026-09-11 全盘体检时建的）

测试脚本已从 `/tmp` 挪进 `tests/`（2026-09-11）：

| 脚本 | 内容 | 期望 |
|---|---|---|
| `tests/test_zixue_fixes.js` | 全盘体检修的 bug 逐条回归 | 44 通过 / 0 失败 |
| `tests/test_ls_sent.js` | 听力·短文音源 | 60 / 0 |
| `tests/test_m30.js` | 今日 30 分钟计时 | 24 / 0 |
| `tests/test_idle.js` | 免提朗读时的挂机豁免 | 12 / 0 |
| `tests/smoke2.js` | **真 Chromium** 走遍每个界面 | 64 / 0 |
| `tests/test_topics29.js` | **主题重构回归**（29 主题/5000 词不重复/大写词音标/地图 29 岛/星星迁移不漏星） | 30 / 0 |
| `tests/audit_static.js` | 静态审计（id 引用/落盘配对/.hidden 陷阱） | 无 ❌ |
| `tests/audit_sentences.js` | 句库静态审计 | 无 ❌ |
| `tests/perf.js` | 加载/渲染性能 | 见脚本 |
| `tests/vfy3.js` | 🔴 点词死区（音标 + 释义，含句型骨架） | 无 ❌ |
| `tests/test_sw_offline.js` | sw.js 离线缓存真机（**要先起 127.0.0.1:8899**） | 10 / 0 |

🔴 **跑之前必须先装 playwright-core，否则 6 个真浏览器测试一个都跑不起来**：

```bash
mkdir -p /tmp/pwtest && cd /tmp/pwtest && npm i playwright-core   # 只需一次
cd ~/.claude/skills/自学英语
NODE_PATH=/tmp/pwtest/node_modules node tests/smoke2.js
```

⚠️ **2026-09-12 实测踩到的坑**：`/tmp/pwtest` 会被系统清掉，清掉之后所有浏览器测试
都以 `Cannot find module 'playwright-core'` 秒退 —— 而 `tools/run_expansion.sh` 第⑧段末尾有个
`true` 兜底，会把这种失败吞成"全链 ✅ 完成"。**判据看每个测试自己的输出行，别只看汇总退出码。**
**方案一：** 至少得 `vfy3.js` / `test_topics29.js` 有输出才算数。
| `tests/vfy3.js` | 点词死区（音标/释义，**含句型骨架**） | 见下方 🔴 |
| `tests/perf.js` | 加载/渲染性能 | 见脚本 |
| `tests/test_pat_words.js` | 句型骨架点词查义（**真 Chromium**） | 20 / 0 |
| `tests/test_sw_offline.js` | sw.js 离线缓存（**断网**验证；需先起 HTTP 服务） | 10 / 0 |

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
2. **跨主题重复 423 个词 / 多出 520 张卡**（2026-09-11 实测，3143 版与 5000 版**数字完全一致**）：
   其中 **213 个是词义冲突**（`fan` 人物身份=粉丝 / 家居=风扇、`back` 身体=背部 /
   方向=后 / 直播=返回）—— 这是主题词库的**正常设计**，同一个词本就属于多个主题；
   另 **210 个连释义都完全相同**（`water`/`bank`/`piano`… 两张一模一样的卡）。
   ⚠️ 这条原来写的是"215 处"，是**没量准的旧数**（且漏了纯重复那 210 个），已按实测改正。
   之所以**不修**：520 张里绝大多数是跨主题的正常归属，一刀去重会把词从主题里摘掉；
   真要治得先定"同一个词该不该出现在两个主题"，那是**产品决策，不是 bug 修复**。
3. **2 张同一主题内的重复卡**（`daily` 主题：`make the bed`＝叠被子/铺床、
   `hang up`＝挂衣服/挂电话）：这两条**不在扩容管线里**，是 index.html 手工写死的老词条。
   `apply_words.py` **只加新主题、从不改老主题**，所以手工删掉不会被重新生成。
   **同样不修**：删 2 张卡词库就变 **4998**，而 5000 是老曾点名要的数字 ——
   为 2 张卡悄悄改掉他选定的数，不如把选择权交回去。
4. ~~句型骨架那屏的句子不可点词（纯文本 + `.hl` 高亮）~~ —— **2026-09-11 已改**：
   骨架和整句现在都切词、都能点（老曾提的需求）。这一改**顺手开了个新的死区口子**——
   原来不可点，缺释义不算死区；现在能点了，缺就是**真的弹一张空白卡**。
   `tests/vfy3.js` 已把 PATTERNS 的 `frame` + `slots` 一并纳入扫描。
   🔴 **教训**：给一片区域加「可点」，就等于给那片区域开「死区检查」，两件事必须同一次做完。
   （首轮扫描抓出 9 个：worth/matters/whether/sounds/great/risky/perfect/directly/includes。）

## ⚡ 加载为什么装 sw.js（2026-09-11）

老曾反馈「点链接进去加载好卡」。**先量后改**，量出来的结论是「卡在网络、不在代码」：

| 量什么 | 结果 |
|---|---|
| App 自己启动 | **76 ms** —— 代码一点不慢 |
| GitHub Pages 缓存策略 | `cache-control: max-age=600`，**只让缓存 10 分钟** |
| 国内连它首字节 | 0.9~2.5 s；166KB 传完再加 0.5~1 s；缓存刚过期又重下时实测 **6.0 s** |
| 模拟国内手机中等网速 | 0.9 s「看得见首页」→ 4.2 s 才「点得动」，**中间 3.3 s 看着像打开了、点它没反应** |

压缩代码不是出路：数据表占全文 **49.5%**、JS 注释只占 1.5%。
换 CDN（jsDelivr / raw.githack）三条线实测相近，**无明确赢家**。

**做法**：`sw.js`，stale-while-revalidate（缓存先给、后台静默更新）。

| | 首屏 | 整页 |
|---|---|---|
| 无离线缓存 | 1476 ms | 4162 ms |
| **有离线缓存** | **172 ms** | **253 ms** |

- 🔴 **验证判据是断网**：`ctx.setOffline(true)` 后仍能完整打开、各模块都有真内容。
  「SW 注册成功」**不算证据**——注册成功太容易，证明不了它真能离线兜住。
- ⚠️ **副作用**：改版后第一次打开可能还是旧版，再打开一次才是新版（SWR 的固有代价）。
  老曾说「没看到新东西」时，让他刷新一次。
- 整个 App 只有一个文件、零外部引用（实测无 `<link>`、无 CDN），所以缓存清单只有一条，
  不存在「缓存了 HTML 却没缓存 CSS」那种半吊子状态。
- 🔴 改 `sw.js` 只要动一个字节，就会触发浏览器更新 SW；但**页面要再打开一次**才用得上新缓存。

## 注意

- **保持单文件、零依赖、离线可用**，除非用户同意引入后端/框架。
  唯一的例外是 `sw.js`（上一节，老曾同意的）——它**只在 HTTP(S) 下注册**，
  本地双击打开仍然只需要 `index.html` 一个文件。
- 新增任何"值得鼓励的行为"，记得走 `recordWord()` 或 `recordStudied()` 让它计入进度/连续天数。
- 新增持久化字段务必加进 `defaults()`，否则老用户存档读不到。
- 词库是 `{cn,en}`；展示音标从 `IPA_MAP` 取，没有就留空（不要瞎编音标）。
- 朗读始终是发音的权威来源，音标只是辅助。
- **数据常量里不要写 `//` 行内注释**：评估脚本用 `JSON.parse` 读它们会炸
  （`BASE_IPA` 里曾有个 `//` 注释，害得校验脚本报错）。要写说明就写进本文件。
