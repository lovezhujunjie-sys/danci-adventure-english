# 组装最终要注入的词表：词频顺序 → 扣掉人工黑名单 → 取够目标数 → 查释义/音标覆盖
#
# 🔴 为什么用「人工黑名单」而不是词性过滤（2026-09-11 实测）：
#    原本打算用维基词典词性小节自动剔人名，实测行不通——rachel/maggie/lucy 在维基里
#    就是挂 ===Noun===，词性根本分不出人名和普通名词。四种自动信号全部失败，
#    详见 blocklist.txt 顶部注释。所以改成：机器管词频，人管「这词该不该教」。
#
# 🔴 三个来源都必须齐：入选（在人手名单里）、释义（手写）、音标（维基）。
#    缺任何一个都只打印缺口，绝不静默跳过——静默跳过就等于「假完成」。
import json, os, glob, re

HOME = os.path.expanduser('~')
TOOLS = HOME + '/.claude/skills/自学英语/tools'
TARGET = int(os.environ.get('TARGET', 1857))

def load_wordlist(path):
    """读一行行/空格分隔的词表，支持 # 注释"""
    ws = []
    for l in open(path, encoding='utf-8'):
        l = l.split('#')[0]
        ws += l.split()
    return ws

pool = json.load(open('/tmp/pool_full.json'))            # 词频顺序，扫到 7000 名
blocked = set(load_wordlist(TOOLS + '/blocklist.txt'))
# 音标缓存：默认读 .ipa_cache.json；换新缓存用 IPACACHE= 指定
# 🔴 2026-09-11 教训：旧的 .ipa_cache.json 是**坏提取器**产出的（漏 118 个词），
#    换个提取器就必须换缓存文件，绝不能新旧混用——缓存里分不清哪条是谁写的。
IPACACHE = os.environ.get('IPACACHE', TOOLS + '/.ipa_cache.json')
ipa_cache = json.load(open(IPACACHE))

# 手写释义：所有 gloss*.txt 合并（按词名取，与位置无关）
# 🔴 2026-09-11 修：原来只判 `if l.strip()`，遇到以 # 开头的注释行就
#    `w, cn = l.split(None, 1)` 解包失败，抛一句看不懂的 ValueError 整跑中断
#    （gloss13.txt 开头有 8 行说明性注释）。两个毛病一起修：
#    ① 支持 # 注释（与 load_wordlist 一致）；② 真格式错就**明说哪一行**，不抛裸异常。
gloss, bad_gloss = {}, []
for f in sorted(glob.glob(TOOLS + '/gloss*.txt')):
    for ln, l in enumerate(open(f, encoding='utf-8'), 1):
        if not l.strip() or l.lstrip().startswith('#'):
            continue
        parts = l.split(None, 1)
        if len(parts) < 2:
            bad_gloss.append('%s:%d 只有词、没有释义：%r' % (os.path.basename(f), ln, l.strip()))
            continue
        gloss[parts[0]] = parts[1].strip()
if bad_gloss:
    print('🔴 释义文件格式错 %d 处：' % len(bad_gloss))
    for b in bad_gloss:
        print('   %s' % b)
    raise SystemExit(1)

print('候选池 %d 个 | 人工黑名单 %d 个 | 手写释义 %d 条 | 缓存音标 %d 条'
      % (len(pool), len(blocked), len(gloss),
         sum(1 for v in ipa_cache.values() if v.get('ipa'))))

kept_all = [w for w in pool if w not in blocked]
print('\n扣掉黑名单：剩 %d 个' % len(kept_all))

# 🔴 英美拼写统一成英式（2026-09-11 定）：
#    本词库音标 100% 英式 RP，拼写却混美式就自相矛盾。而且词频表里
#    honor/honour、favor/favour、defense/defence **英美两种拼写都在**——
#    不合并就是同一个词占两张卡，白瞎一个名额。
#    做法：先**原位替换**（占同一个词频位次，不额外占名额），再按替换后的形式去重。
#    替换只针对「词频表里只有美式、没有英式对应条目」的 7 个；那 3 组英美都在的，
#    靠下面的 seen 去重自然合并成一条。
US2UK = {
    'humor': 'humour', 'rumor': 'rumour', 'harbor': 'harbour', 'armor': 'armour',
    'honorable': 'honourable', 'offense': 'offence', 'judgment': 'judgement',
    'honor': 'honour', 'favor': 'favour', 'defense': 'defence',
}
_n_swap = [w for w in kept_all if w in US2UK]
seen, dedup = set(), []
for w in kept_all:
    v = US2UK.get(w, w)
    if v in blocked:          # 英式形式本身被人工封了的话，美式形式也一并不收
        continue
    if v in seen:
        continue
    seen.add(v)
    dedup.append(v)
print('英美拼写：原位换成英式 %d 个（%s），去重后剩 %d 个'
      % (len(_n_swap), ' '.join(sorted(set(_n_swap))), len(dedup)))
kept_all = dedup

# 🔴 音标是硬门槛（2026-09-11 定）：
#    应用现有 3143 个词**一个不漏全有音标**（实测三张音标表合并覆盖 3143/3143）。
#    所以「没音标的候选」绝不能静默放进最终词库——原来只打印 no_ipa 不拦截，
#    等于让几个空白音标混进 5000，卡片上就是一块空白。现在直接跳过、由后面的词顶上。
#    但**必须打印被顶替的是谁**：不打印就成了「悄悄换人」，跟静默跳过一样坏。
would_be = kept_all[:TARGET]
no_ipa_hit = [w for w in would_be if not (ipa_cache.get(w) or {}).get('ipa')]
# 🔴 美音音标也是硬门槛（2026-09-11 定）：
#    本词库是**英式 RP 专用**（现有 2623 条：0 个卷舌 ɹ、0 个美式 oʊ、279 个英式 əʊ）。
#    有 7 个词维基页面**只给了美式**，没有英式可换（motel/homeless/heroin/labor/
#    paperwork/perspective/beware）。这些一律不进——不靠「ɚ→ə、oʊ→əʊ」这种字符替换糊过去，
#    那是推导出来的音标、不是有出处的音标；教发音的东西写错一个音，比少收一个词坏得多。
# 🔴 检测规则只许有一份，且必须是**校准过**的那份（2026-09-11 再修）：
#    原来这里写的是 GA_MARK = [ɚɝ]|oʊ —— 只能抓这三个字面量。
#    treasure=/ˈtreʒər/、shortly=/ˈʃɔrtli/、prosecutor=/ˈprɑsəˌkjuːˌtər/
#    一个 ɚ/ɝ/oʊ 都没有，却是不折不扣的儿化 / 短 ɑ，**整条溜进最终词库**。
#    这跟 verify_final.py 里修过的是同一个漏，所以这里不再自己写正则，
#    直接切 normalize_ipa.py 的真身——那套规则已在应用自有 3082 条
#    已知正确的英式音标上校准到零误报（normalize_ipa.py 的自检就是干这个的）。
_ns = {'re': re, 'json': json, 'os': os}
_src = open(TOOLS + '/normalize_ipa.py', encoding='utf-8').read()
exec(_src[_src.index('SUBST = {'):_src.index('# ══════════ 自检')], _ns)
check_ga, normalize = _ns['check_ga'], _ns['normalize']
# 这两条同样在自有 3082 条上校准过零误报：
#   ɑ/ɜ 一律带长音号（自有表 ɑ(?!ː)=0、ɜ(?!ː)=0）；词尾不许裸 u（自有表 0 次）
BARE_U = re.compile(r'(?<!j)u(?!ː)(?=$|/)')

def is_ga(v, w=''):
    """True = 这条音标不能收。先在**规范化之后**的形态上判——记号统一没做完就检测，
       treasure=/ˈtreʒəɹ/ 会因为「元音后是 ɹ 不是 r」而漏网。
       🔴 空值也算「不能收」（is_ga('') = True），但**报账时要分开**：
          空值是「维基没有音标」，有值才叫「只有美式」。
          混在一起报的话，同一批词会在两张榜上各出现一次，看着像两倍的问题。"""
    if not v:
        return True
    s = normalize(v, w)
    if check_ga(s):
        return True
    if re.search(r'[ɑɜ](?!ː)', s):
        return True
    return bool(BARE_U.search(s))

ga_hit = [w for w in would_be
          if (ipa_cache.get(w) or {}).get('ipa') and is_ga(ipa_cache[w]['ipa'], w)]
if no_ipa_hit:
    print('\n⚠️ 前 %d 名里有 %d 个词维基查不到音标，已跳过、由后面的词顶上：' % (TARGET, len(no_ipa_hit)))
    print('   %s' % ' '.join(no_ipa_hit))
if ga_hit:
    print('\n⚠️ 前 %d 名里有 %d 个词维基只有美式音标（本词库是英式 RP），已跳过：' % (TARGET, len(ga_hit)))
    print('   %s' % ' '.join('%s=%s' % (w, ipa_cache[w]['ipa']) for w in ga_hit))
kept = [w for w in kept_all if not is_ga((ipa_cache.get(w) or {}).get('ipa'), w)]

final = kept[:TARGET]
print('按词频取前 %d 个 → 拿到 %d 个' % (TARGET, len(final)))

# ── 覆盖检查：缺什么就明说，不静默跳过 ──
no_gloss = [w for w in final if w not in gloss]
no_ipa   = [w for w in final if not (ipa_cache.get(w) or {}).get('ipa')]
print('\n覆盖缺口：')
print('  缺中文释义 %d 个 %s' % (len(no_gloss), no_gloss[:40]))
print('  缺音标     %d 个 %s' % (len(no_ipa), no_ipa[:40]))

if no_gloss:
    print('\n🔴 还有 %d 个词缺释义，补齐之前不许注入。' % len(no_gloss))
    raise SystemExit(1)

if no_ipa:
    print('\n🔴 还有 %d 个词缺音标，补齐之前不许注入。' % len(no_ipa))
    raise SystemExit(1)

json.dump(final, open('/tmp/final_words.json', 'w'), ensure_ascii=False)
json.dump({w: gloss[w] for w in final}, open('/tmp/gloss.json', 'w'), ensure_ascii=False)
# 🔴 写出去的必须是**规范化之后**的形态（2026-09-11 修结构问题）：
#    原来直接写 ipa_cache[w]['ipa'] 的**原值**，于是「音标规范化」这一步只能靠
#    normalize_ipa.py **原地改写缓存文件**来完成。而那个缓存同时又是 merge_ipa.py 的输入，
#    结果就是：规则一旦有 bug（当时的「重读裸 i」规则把 deeply 改成 /ˈdiː(ː)pli/、
#    cemetery 改成 /ˈsemɪˌtriː/），**污染会被写回缓存、再喂给下游**，事后分不清哪条是脏的。
#    改成在这里规范化之后，缓存文件不再需要被就地改写，链路少一个可变状态。
json.dump({w: normalize(ipa_cache[w]['ipa'], w) for w in final if (ipa_cache.get(w) or {}).get('ipa')},
          open('/tmp/ipa_final.json', 'w'), ensure_ascii=False)

print('\n→ 可注入 %d 个（释义齐全），其中带音标 %d 个'
      % (len(final), sum(1 for w in final if (ipa_cache.get(w) or {}).get('ipa'))))
# 🔴 3143 是**本次扩容的基数**（扩容前词库容量），不是实时读出来的。
#    这一轮跑完词库已经是 5000 了，再跑这个脚本这句就会误导人 —— 它描述的是
#    "从 3143 出发的这次扩容"，不是"当前词库"。要实时值请看 index.html 里 VOCAB 的实际计数。
print('  最终词库将达 %d 条（按扩容基数 3143 计算）' % (3143 + len(final)))

# ── 溢出词：写了释义但没挤进前 TARGET 名，留着备用不浪费 ──
spare = [w for w in kept[TARGET:] if w in gloss]
print('  备用（已写释义、排在目标之外）: %d 个' % len(spare))
