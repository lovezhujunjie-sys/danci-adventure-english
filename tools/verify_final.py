# 注入前的质量闸门：把「最终词库」逐条查一遍，任何一条不过就直接退出码 1。
#
# 🔴 为什么要有这个（2026-09-11）：
#    扩容这条链路上每一步都可能「看起来成功」——音标抓取会静默漏词、黑名单会漏人名、
#    释义会漏写、记号会混进美式。光靠肉眼看输出「缺释义 0」不够，得逐条硬查。
#    这个脚本只读，不改任何东西；不过就报错，绝不写「基本没问题」这种话。
#
# 用法：python3 tools/verify_final.py
import json, os, re, sys

HOME = os.path.expanduser('~')
ROOT = HOME + '/.claude/skills/自学英语'
FINAL = json.load(open('/tmp/final_words.json'))
GLOSS = json.load(open('/tmp/gloss.json'))
IPA = json.load(open('/tmp/ipa_final.json'))
SRC = open(ROOT + '/index.html', encoding='utf-8').read()


def grab(name):
    """从 index.html 里抠出顶层 const 对象字面量（按大括号配平，别用非贪婪正则）"""
    i = SRC.index('\nconst %s = {' % name)
    j = SRC.index('{', i)
    depth = 0; k = j; instr = False; esc = False
    while k < len(SRC):
        c = SRC[k]
        if instr:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': instr = False
        else:
            if c == '"': instr = True
            elif c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: break
        k += 1
    return json.loads(SRC[j:k + 1])


vocab = grab('VOCAB')
base_cn = grab('BASE_CN')
old_words = [w['en'] for d in vocab.values() for w in d['words']]
old_lower = {w.lower() for w in old_words}
base_lower = {k.lower() for k in base_cn}

bad = []


def check(name, cond, detail=''):
    if cond:
        print('  ✅ %s' % name)
    else:
        print('  ❌ %s  %s' % (name, detail))
        bad.append(name)


print('═══ 注入前质量闸门 ═══')
print('\n① 数量')
check('新词 1857 个', len(FINAL) == 1857, len(FINAL))
check('释义齐全 1857 个', len(GLOSS) == 1857, len(GLOSS))
check('音标齐全 1857 个', len(IPA) == 1857, len(IPA))
check('新词无重复', len(set(FINAL)) == len(FINAL))
check('最终词库 = 3143 + 1857 = 5000', len(old_words) + len(FINAL) == 5000)

print('\n② 不与现有内容打架')
dup_vocab = sorted(set(w.lower() for w in FINAL) & old_lower)
check('与现有 VOCAB 零重复', not dup_vocab, dup_vocab[:20])
dup_base = sorted(set(w.lower() for w in FINAL) & base_lower)
check('与 BASE_CN 零重复', not dup_base, dup_base[:20])

print('\n③ 词形合法')
no_vowel = [w for w in FINAL if not re.search(r'[aeiouy]', w)]
check('没有不含元音的词', not no_vowel, no_vowel[:20])
weird = [w for w in FINAL if not re.fullmatch(r"[a-z][a-z'\-]*", w)]
check('只含小写字母/撇号/连字符', not weird, weird[:20])
check('没有单字母词', not [w for w in FINAL if len(w) < 2])
short = [w for w in FINAL if len(w) <= 2]
print('     （长度 ≤2 的：%s）' % ' '.join(short))

print('\n④ 音标纯度（本词库是英式 RP 专用）')
allipa = ' '.join(IPA.values())
# 🔴 记号 vs 口音必须分清（2026-09-11 定）：
#    ɹ (U+0279) 只是**记号**，维基写英式音标也用 ɹ（/ˈkʌlə(ɹ)/），不代表美音。
#    自有表和 merge_ipa 统一成 r，所以这里查 ɹ 是**记号一致性**，不是查口音。
check('无 ɹ（自有表统一写 r，是记号不是口音）', allipa.count('ɹ') == 0, '%d 处' % allipa.count('ɹ'))
# 🔴 真正的口音检测复用 normalize_ipa.py 那套（2026-09-11）：
#    原来这里只数字面量 ɹ/ɚ/ɝ/oʊ 四个字符，而 merge_ipa 早把 ɹ 换成了 r，
#    于是 /ˈtreʒər/（儿化）、/ˈʃɔrtli/（卷舌）这种**能整条溜过闸门**——
#    treasure、prosecutor 就是这么漏过去的。检测规则只许有一份，且必须
#    在自有 2980 条已知正确音标上校准过零误报（normalize_ipa.py 的自检干这个）。
_ns = {'re': re, 'json': json, 'os': os, 'sys': sys,
       'ROOT': ROOT}
_nsrc = open(ROOT + '/tools/normalize_ipa.py', encoding='utf-8').read()
exec(_nsrc[_nsrc.index('SUBST = {'):_nsrc.index('# ══════════ 自检')], _ns)
check_ga = _ns['check_ga']
ga_words = sorted(w for w, v in IPA.items() if check_ga(v))
check('无任何美音特征（复用自校准检测器）', not ga_words,
      ' '.join('%s=%s(%s)' % (w, IPA[w], '；'.join(check_ga(IPA[w]))) for w in ga_words[:8]))
check('音标都用斜杠包裹', all(v.startswith('/') and v.endswith('/') for v in IPA.values()),
      [w for w, v in IPA.items() if not (v.startswith('/') and v.endswith('/'))][:10])
# 英式长音号：RP 里 ɑ/ɜ 一律带 ː（这条已用自有 2980 条校准过：ɑ(?!ː) 零命中）。
# ɔ 不查——ɔɪ 里的 ɔ 本来就短（boy /bɔɪ/），拿它当错会误伤一大片。
lacks_long = [w for w, v in IPA.items() if re.search(r'[ɑɜ](?!ː)', v)]
check('ɑ/ɜ 都带长音号（RP 规律）', not lacks_long, ' '.join(lacks_long[:15]))

print('\n⑤ 释义质量')
empty_cn = [w for w, c in GLOSS.items() if not c.strip()]
check('没有空释义', not empty_cn, empty_cn[:10])
has_cjk = [w for w, c in GLOSS.items() if not re.search(r'[一-鿿]', c)]
check('释义都含中文', not has_cjk, has_cjk[:10])
halfwidth = [w for w, c in GLOSS.items() if ';' in c]
check('释义用全角分号（与现有释义体例一致）', not halfwidth, halfwidth[:10])

print('\n⑥ 主题数')
check('现有主题 41 个', len(vocab) == 41, len(vocab))
check('注入后 51 个主题', len(vocab) + 10 == 51)

print('\n' + '=' * 52)
if bad:
    print('❌ 闸门未通过：%d 项\n   %s' % (len(bad), '\n   '.join(bad)))
    sys.exit(1)
print('✅ 全部通过，可以注入')
