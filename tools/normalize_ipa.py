# 音标规范化 + 美音检测：把新抓的音标对齐成「跟应用现有 2623 条一样的写法」。
#
# 🔴 分两件事，别混为一谈：
#   ① **记号统一**：同一个音、不同写法。ɛ↔e、t͡ʃ↔tʃ、l̩↔l、ɫ↔l、ʍ↔w……
#      这些只是码位不同，不涉及发音对错，统一成应用已有的写法即可。
#   ② **美音检测**：真的发音不同，只能剔词、不能替换字符。
#      ɚ/ɝ/oʊ/短 ɑ/卷舌 r —— 靠字符替换糊过去就是伪造音标。
#
# 🔴 判据怎么来的（2026-09-11）：不凭感觉定规则，拿应用**现有的 2623 条英式音标当标尺**——
#    它们是已知正确的 RP。任何一条规则如果在现有数据上误报，就是规则有问题。
#    （实测：卷舌 r 规则在现有 2623 条上误报 0 条；而短 ɑ 规则误报 0 条——
#      因为自有表里 ɑ 一律带长音号 ɑː，这个规律本身也是校对过的。）
import json, os, re, sys

TOOLS = os.path.expanduser('~') + '/.claude/skills/自学英语/tools'
ROOT = os.path.expanduser('~') + '/.claude/skills/自学英语'
CACHE = os.environ.get('CACHE', '/tmp/ipa_cache_merged.json')

# ── ① 记号统一表：左 = 新抓的写法，右 = 应用已有的写法 ──
#    每一条都注明依据（应用自有表里出现了多少次右边的写法）
SUBST = {
    'ɛ': 'e',      # 自有表 e 出现 863 次、ɛ 出现 0 次
    '͡': '',       # 连音弧 U+0361：自有表 tʃ 118 次、t͡ʃ 0 次
    '̯': '',       # 非成音节符 U+032F：自有表 0 次（eɪ̯ → eɪ）
    '̩': '',       # 成音节符 U+0329：自有表 people=/ˈpiːpl/ 就是裸 l
    '̞': '',       # 偏低符 U+031E：自有表 0 次
    'ʰ': '',       # 送气符 U+02B0：送气是羡余特征，自有表从不标
    'ʍ': 'w',      # 清 w：自有表只有 w
    'ɫ': 'l',      # 暗 l：自有表只有 l
    'ä': 'a',      # 央 a：PRICE 双元音，自有表写 aɪ
    'ɐ': 'ʌ',      # 次开央：STRUT，自有表写 ʌ
    'ᵿ': 'ə',      # 次闭央圆：弱读，自有表写 ə
    'ᵻ': 'ɪ',      # 次闭央不圆：弱读，自有表写 ɪ
    '.': '',       # 音节点（维基 /ˈhɛɹoʊ.ɪn/）：自有 3082 条里出现 0 次，
                   # 是维基给的分音节提示，不是音素。留着会跟自有写法不一致。
    'ɹ': 'r',      # 🔴 记号，不是口音（2026-09-11 定）：维基现在的英式音标也写 ɹ
                   #    （/ˈkʌlə(ɹ)/），自有 3082 条里 ɹ 出现 0 次、r 大量。
                   #    这条原来在 merge_ipa 里做，挪到 SUBST 是因为**顺序**：
                   #    检测函数找的是「元音 + r」，而原值是「元音 + ɹ」，
                   #    treasure=/ˈtreʒəɹ/ 于是从 final_r_hits 底下整条溜过去。
                   #    记号统一必须先做完，美音检测才看得到真身。
}

# ── ② 美音检测规则（逐条给理由，报出来好核对） ──
VOWELS = 'ɑɒɔɜəɪeæʌʊuiuːɐa'      # 🔴 必须含普通 a：aɪ/aʊ 里的 a 也是元音核心
STRESS = 'ˈˌ'                     # 重音号夹在中间不算「r 后面是辅音」
NON_RHOTIC_AFTER = VOWELS + STRESS + '. ('   # 音节点、空格（连读 r）、左括号

# ── 重读音节核里的裸 i → iː（FLEECE）：记号统一，不是口音 ──
# 🔴 判据来自自有表（2026-09-11 校准）：「重音号 → 若干辅音 → 裸 i（i 后不是元音）」
#    在自有 2985 条里出现 **0 次**，而重读的 iː 有 16 条 —— 本词库重读 FLEECE 一律带长音号。
#    维基相反，重读 FLEECE 常写裸 i：marina=/məˈrinə/、upbeat=/ʌpˈbit/。
#    ⚠️ 不能笼统地把裸 i 都改长：自有表里 jellyfish=/ˈdʒelifɪʃ/、anyone=/ˈeniwʌn/、
#    healthy=/ˈhelθi/ 这些**非重读**的裸 i 是既有写法。泛化的裸 i 规则在自有表上
#    误报 41 条，只有「重读音节核」这一刀切下去是零误报的。
# 🔴 但「零误报」不等于「规则对」——2026-09-11 又发现两个语义漏洞：
#    ① **词尾必须排除**：cemetery=/ˈsemɪˌtri/ 的裸 i 在词尾，是 happy 元音
#       （跟自有表 healthy=/ˈhelθi/ 同类），只是前面挂了个次重音号 ˌ。
#       自有表恰好没有「ˌ+辅音+i 结尾」这种形态，所以标定显示零误报——
#       **那是数据没覆盖，不是规则正确**。加 (?!$) 把词尾排除掉。
#    ② **可选长音号要吃掉**：deeply=/ˈdi(ː)pli/ 的 i(ː) 是「可长可短」，
#       直接插 ː 会得到 iː(ː) 这种畸形写法，正确结果是 iː。
#    ⚠️ 排除词尾用的是 (?=[^/]) 而不是 (?!$)：normalize 拿到的是**带斜杠**的
#       /ˈsemɪˌtri/，末尾的 i 后面还有个 /，用 (?!$) 判「结尾」根本判不到，
#       cemetery 照样被误改。`(?=[^/])` 同时管住两种情况——后面必须是**非斜杠的实字符**，
#       既排掉字符串结尾、也排掉右斜杠。
_STRESSED_BARE_I = re.compile(
    r'[%s][^%s]*i(?!ː|ɪ)(?![%s])(?:\(ː\))?(?=[^/])' % (STRESS, VOWELS, VOWELS))


def _fix_stressed_bare_i(m):
    s = m.group(0)
    # i(ː) 要整个换成 iː —— 砍 4 个字符（i + ( + ː + )），只砍 3 个会剩个 i 变成 iiː
    return (s[:-4] if s.endswith('(ː)') else s[:-1]) + 'iː'


def rhotic_hits(v):
    """找出「元音后不发出来的 r」= 儿化，英式 RP 没有。

    🔴 判据不能只看「r 后面不是元音」（2026-09-11 在自有表上误报 9 条）：
       memorize /ˈmeməraɪz/  —— r 后面是普通 a，我漏了 a
       forever  /fərˈevə/    —— r 后面是重音号 ˈ
       wear a hat /weər ə hæt/ —— r 后面是空格，这是连读 r，英式里本来就该发
       三种都不是儿化，却全被当成美音。所以「后面」的排除集必须把这三种都算上。
    """
    out = []
    for m in re.finditer(r'[%s]r' % VOWELS, v):
        nxt = v[m.end():m.end() + 1]
        if nxt and nxt not in NON_RHOTIC_AFTER:
            out.append(m.group(0) + nxt)
    return out


def final_r_hits(v):
    """词尾的裸 r = 美式儿化（RP 的音节末 r 一律不发音）。

    🔴 判据同样是拿自有表校准出来的（2026-09-11）：
       应用现有 2980 条音标里，词尾 r **一律写成 (r)** —— another /əˈnʌðə(r)/、
       care /keə(r)/ 等 25 条，**裸 r 出现 0 次**。
       所以「音标以 元音+r 结尾」在本词库里就是美式信号，直接可用、零误报。
       （rhotic_hits 抓不到这一类：它要求 r 后面**有**字符，词尾 r 后面什么都没有，
         nxt 为空串就被跳过了——treasure /ˈtreʒər/、prosecutor /ˈprɑsəˌkjuːˌtər/
         就是这么漏过去的。）
    注意不能先去括号：/ˈkʌlə(r)/ 结尾是右括号，天然不匹配。
    """
    return re.findall(r'[%s]r$' % VOWELS, v.strip('/'))


GA_RULES = [
    (re.compile(r'[ɚɝ]'),   '卷舌元音 ɚ/ɝ（RP 没有）'),
    (re.compile(r'oʊ'),     '美式 GOAT 元音 oʊ（RP 是 əʊ）'),
    (re.compile(r'ɑ(?!ː)'), '短 ɑ（RP 的 ɑ 一律 ɑː，短的是美式 LOT）'),
    (re.compile(r'[̃́̀]'),    '鼻化/声调附加符（RP 不用）'),
]


def strip_parens(v):
    """去掉 (ə) 这类可选音，避免把「可选 r (ə)r」误判成儿化"""
    return re.sub(r'\([^)]*\)', '', v)


def check_ga(v):
    """返回命中的美音理由列表（空列表 = 干净）。

    🔴 儿化判定**不能先去括号**（2026-09-11 踩过）：
       barrel = /ˈbær(ə)l/，括号里的 (ə) 是「可选的 ə」，
       去掉括号变成 bærl 就凭空造出一个「r 后面是辅音 l」的假儿化。
       正确做法是保留括号，让「r 后面是左括号」自然落进 NON_RHOTIC_AFTER。
    """
    hits = [why for rx, why in GA_RULES if rx.search(strip_parens(v))]
    rh = rhotic_hits(v)
    if rh:
        hits.append('儿化 r（RP 元音后的 r 不发音）：%s' % ' '.join(rh))
    fr = final_r_hits(v)
    if fr:
        hits.append('词尾裸 r（自有表一律写 (r)）：%s' % ' '.join(fr))
    return hits


def normalize(v, word=''):
    """记号统一。word 用来判断要不要保留空格（连字符复合词的空格是词与词的分界）"""
    for a, b in SUBST.items():
        v = v.replace(a, b)
    # 裸 a → æ（TRAP 元音）。判据同样来自自有表：3082 条里**裸 a 出现 0 次**，
    #   TRAP 一律写 æ；而维基有些条目写成 a（magic=/ˈmadʒɪk/、ladder=/ˈladə/）。
    #   这是**记号**不是口音——`a` 和 `æ` 在这里指同一个音位，跟 ɛ→e 同类。
    #   条件不能少：后面接 ɪ/ʊ 时那是 PRICE/MOUTH 双元音的核心 a（aɪ/aʊ），动了就毁音。
    v = re.sub(r'a(?!ɪ|ʊ)', 'æ', v)
    # 重读音节核里的裸 i → iː（判据见上方 _STRESSED_BARE_I 的注释）：
    #   marina=/məˈrinə/ → /məˈriːnə/、upbeat=/ʌpˈbit/ → /ʌpˈbiːt/。
    #   这两条原来会**带着错音标进词库**（它们不是美音，美音检测兜不住）。
    v = _STRESSED_BARE_I.sub(_fix_stressed_bare_i, v)
    # 一次发音里的「或读」用逗号分隔：hatred=/ˈheɪtrɪd, ˈheɪtrəd/ → 只留第一种
    if ',' in v:
        v = v.split(',')[0].strip()
        # 🔴 2026-09-11 修：截断时**尾部斜杠会跟着后半截一起丢**，
        #    /ˈheɪtrɪd, ˈheɪtrəd/ 变成 /ˈheɪtrɪd（有头无尾）。
        #    卡片上就会显示成「/ˈheɪtrɪd」这种半截音标，verify_final 的
        #    「音标都用斜杠包裹」就是这么抓出来的。截完必须补回来。
        if v.startswith('/') and not v.endswith('/'):
            v += '/'
    # 🔴 「删掉音标里的空格」这条规则**已删除**（2026-09-11）——它在自有表上误报 8 条：
    #       url=/ˌjuː ɑː ˈel/  usa=/ˌjuː es ˈeɪ/  uk=/ˌjuː ˈkeɪ/  atm=/ˌeɪ tiː ˈem/
    #       vip=/ˌviː aɪ ˈpiː/  pip=/ˌpiː aɪ ˈpiː/  bts=/ˌbiː tiː ˈes/  loadmore=/ˈləʊd mɔː/
    #    这些是**逐字母拼读**的条目，音标里的空格是字母之间的分界，删了就毁。
    #    「词本身含空格」的补充判断也挡不住——上面这些词本身都没空格。
    #    而它在 1904 个新词上**一次都没用上**（唯一带空格的 brother-in-law 是连字符
    #    复合词，原本就被 '-' 判断放行）。出一个误报、零个收益 → 规则不成立，删掉。
    #    改成**报告制**：verify_final.py 会列出最终词表里音标带空格的词，由人过目。
    return v


def grab(name):
    src = open(ROOT + '/index.html', encoding='utf-8').read()
    i = src.index('\nconst %s = {' % name); j = src.index('{', i)
    d = 0; k = j; ins = False; esc = False
    while k < len(src):
        c = src[k]
        if ins:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': ins = False
        else:
            if c == '"': ins = True
            elif c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: break
        k += 1
    return json.loads(src[j:k + 1])


# ══════════ 自检：拿现有 2623 条当标尺 ══════════
print('═══ 规则自检（在应用现有英式音标上跑，误报必须为 0）═══')
old = {}
for n in ('IPA_MAP', 'IPA_EXTRA', 'BASE_IPA'):
    old.update(grab(n))
false_pos = {}
for w, v in old.items():
    if not isinstance(v, str):
        continue
    for why in check_ga('/' + v.strip('/') + '/'):
        false_pos.setdefault(why, []).append(w)
for why in [x[1] for x in GA_RULES] + ['儿化 r', '词尾裸 r']:
    hits = [w for k, v in false_pos.items() if k.startswith(why) for w in v]
    print('  %s %-38s 误报 %d %s' % ('✅' if not hits else '❌', why, len(hits), hits[:6]))
if false_pos:
    print('\n🔴 有规则在已知正确的英式音标上误报，必须先修规则再往下走。')
    sys.exit(1)
print('  → 全部规则在现有数据上零误报，可以用来判新词\n')

# ══════════ 自检二：normalize 在自有音标上必须是「恒等变换」══════════
# 自有表的音标**本来就是规范化后的形态**，所以 normalize 跑上去应当逐条不变。
# 变一条就说明这条规则会破坏正确数据。（2026-09-11 就是靠这一刀砍掉了
# 「删音标内空格」那条规则——它在 url / atm / vip 这些逐字母拼读的条目上误伤 8 条。）
print('═══ normalize 自检（在自有音标上跑，必须一条都不变）═══')
n_chg = []
for w, v in old.items():
    if not isinstance(v, str):
        continue
    raw = '/' + v.strip('/') + '/'
    got = normalize(raw, w)
    if got != raw:
        n_chg.append((w, raw, got))
print('  %s %d 条被改动 %s' % ('✅' if not n_chg else '❌', len(n_chg),
                               '' if not n_chg else [x[0] for x in n_chg[:8]]))
if n_chg:
    for w, a, b in n_chg[:10]:
        print('     %-18s %-24s → %s' % (w, a, b))
    print('\n🔴 normalize 会破坏已知正确的音标，必须先修规则再往下走。')
    sys.exit(1)
print('  → normalize 对自有数据是恒等变换，可安全用于新词\n')

# ══════════ 正式跑 ══════════
cache = json.load(open(CACHE))
FINAL = json.load(open('/tmp/final_words.json'))
n_norm, n_ga = 0, []
for w, e in cache.items():
    if not e.get('ipa'):
        continue
    before = e['ipa']
    after = normalize(before, w)
    if after != before:
        e['ipa'] = after
        e['how'] = (e.get('how') or '') + ' +记号统一'
        n_norm += 1
    if w in set(FINAL):
        why = check_ga(e['ipa'])
        if why:
            n_ga.append((w, e['ipa'], why))

print('记号统一：改了 %d 条' % n_norm)
print('\n仍在最终词表里、且判定为美音的 %d 个：' % len(n_ga))
for w, v, why in n_ga:
    print('  %-16s %-22s %s' % (w, v, '；'.join(why)))

# 🔴 默认**只读**，要写回必须显式 WRITE=1（2026-09-11 改）：
#    原来二话不说就原地改写 CACHE。而 CACHE 往往同时是 merge_ipa.py 的输入，
#    于是「规则有 bug」会直接**污染一个共享的中间文件**——本会话就中过一次：
#    旧的「重读裸 i」规则把 deeply 改成 /ˈdiː(ː)pli/、cemetery 改成 /ˈsemɪˌtriː/，
#    写回 /tmp/ipa_cache_merged.json 后，下游再读就分不清哪条是脏的。
#    现在规范化的职责挪到 build_final.py（写 ipa_final.json 时自己规范化），
#    这里保持只读，链路少一个可变状态。
if os.environ.get('WRITE') == '1':
    json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
    print('\n已写回 %s（WRITE=1）' % CACHE)
else:
    print('\n（只读，未改写 %s；要写回请加 WRITE=1）' % CACHE)
