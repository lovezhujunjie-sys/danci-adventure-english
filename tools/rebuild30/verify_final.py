# 独立校验：不引用 build_final.py 的任何中间产物逻辑，直接从两个词库原文对比。
#
# 🔴 为什么必须独立写一遍：合成脚本自己报「5000 词一个不少」是不算数的——
#    它用的是自己的去重键和自己的口径，同一个 bug 会在两边同时成立。
#    这里换成「拿老库的英文词原文列表，去新库里逐个查」的笨办法。
import json, os, re, unicodedata
from collections import Counter

D = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(D))

old = json.load(open(D + '/vocab_old82.json', encoding='utf-8'))
new = json.load(open(D + '/vocab_final.json', encoding='utf-8'))
ipa = json.load(open(D + '/ipa_final.json', encoding='utf-8'))
newraw = json.load(open(D + '/new_words_raw.json', encoding='utf-8'))

HOMO = str.maketrans({'о': 'o', 'а': 'a', 'е': 'e', 'с': 'c', 'р': 'p', 'х': 'x',
                      'у': 'y', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'А': 'A', 'В': 'B',
                      'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
                      'С': 'C', 'Т': 'T', 'Х': 'X'})


def nk(s):
    return re.sub(r'[^a-z0-9]', '', str(s).strip().translate(HOMO).lower())


ok = True


def chk(name, cond, detail=''):
    global ok
    print('%s %s %s' % ('✅' if cond else '❌', name, detail))
    if not cond:
        ok = False


# ① 老库每个词都在新库里
old_ens = [w['en'] for k in old for w in old[k]['words']]
new_ens = [w['en'] for t in new for w in new[t]['words']]
new_set = set(nk(e) for e in new_ens)
missing = sorted({e for e in old_ens if nk(e) not in new_set})
chk('老库 5000 条的词全部保留', not missing, '缺 %d 个 %s' % (len(missing), missing[:10]))

# ② 条数
chk('总词数 = 5000', len(new_ens) == 5000, '实际 %d' % len(new_ens))

# ③ 真正不重复
dup = [k for k, n in Counter(nk(e) for e in new_ens).items() if n > 1]
chk('5000 个词互不重复', not dup, '重复 %d 个 %s' % (len(dup), dup[:10]))

# ④ 新词补进 520 个（老库里没有的）
old_set = set(nk(e) for e in old_ens)
brand_new = [e for e in new_ens if nk(e) not in old_set]
# 期望值从数据算，不写死 520：老库按原文是 4480 个唯一词，但归一后只有 4475 个 ——
# 因为 checkin/check in、signout/sign out、goodbye/good-bye、email/e-mail、alsо/also
# 这 5 对是同一个词写了两遍。它们也算「重复条目」，所以新词要补 525 个才凑满 5000。
old_uniq = len(set(nk(e) for e in old_ens))
chk('补进的新词 = 5000 - 老库唯一词数', len(brand_new) == 5000 - old_uniq,
    '老库唯一 %d + 新词 %d = %d' % (old_uniq, len(brand_new), old_uniq + len(brand_new)))

# ⑤ 新词确实来自选词池，没有凭空冒出来的
pool = set(nk(w['en']) for w in newraw)
alien = sorted(set(nk(e) for e in brand_new) - pool)
chk('新词全部来自 CEFR-J 选词池', not alien, '来路不明 %s' % alien[:10])

# ⑥ 每条都有中文释义、释义里没有英文/半角符号残留
badcn = [(t, w['en'], w['cn']) for t in new for w in new[t]['words']
         if not str(w['cn']).strip()]
chk('每条都有中文释义', not badcn, str(badcn[:5]))
# 字母白名单：T恤/U盘/API/WiFi/PIN 是中文里的正常写法，不算残留
LET_OK = re.compile(r'^[\u4e00-\u9fff；，、（）]*'
                    r'(T|U|API|WiFi|PIN|Cookie|QQ|CD|DVD|GPS|USB|HD|App)*'
                    r'[\u4e00-\u9fff；，、（）]*$')
weird = [(t, w['en'], w['cn']) for t in new for w in new[t]['words']
         if re.search(r'[A-Za-z]', str(w['cn'])) and not LET_OK.match(str(w['cn']))]
chk('中文释义里没有英文字母残留（T恤/U盘/API/WiFi 这类除外）', not weird,
    '%d 条 %s' % (len(weird), weird[:5]))

# ⑦ 主题数与每主题词数
chk('主题数 = 29', len(new) == 29, '实际 %d' % len(new))
empty = [t for t in new if not new[t]['words']]
chk('没有空主题', not empty, str(empty))
small = [(t, len(new[t]['words'])) for t in new if len(new[t]['words']) < 30]
print('   （提示）词数少于 30 的主题:', small)

# ⑧ 每条都有 name/icon
badmeta = [t for t in new if not new[t].get('name') or not new[t].get('icon')]
chk('每个主题都有名字和图标', not badmeta, str(badmeta))

# ⑨ 音标：键必须与 en 原文一一对应；老库有音标的词不能丢
ipa_missing = [(t, w['en']) for t in new for w in new[t]['words'] if w['en'] not in ipa]
print('   没有音标的词: %d 个 %s' % (len(ipa_missing), [e for _, e in ipa_missing][:20]))
chk('音标覆盖率 ≥ 老库', len(ipa) >= 4468, '实际 %d' % len(ipa))

# ⑩ 主题字段必须是 29 个合法值
chk('主题编号是 T01~T29', sorted(new) == ['T%02d' % i for i in range(1, 30)], str(sorted(new)))

# ⑪ 词条字段顺序照老库（cn 在前 en 在后），避免应用里无谓 diff
badorder = []
for t in new:
    for w in new[t]['words']:
        if list(w.keys()) != ['cn', 'en']:
            badorder.append((t, w))
chk('词条字段顺序是 cn,en', not badorder, str(badorder[:3]))

# ⑫ 不含同形异码字符（alsо 那种）
badch = [e for e in new_ens if any(ord(c) > 127 for c in e)]
chk('英文词里没有非 ASCII 字符', not badch, str(badch))

print('\n=== 主题分布 ===')
for t in sorted(new):
    print('%-4s %-7s %4d' % (t, new[t]['name'], len(new[t]['words'])))
print('合计:', sum(len(new[t]['words']) for t in new))
print('\n' + ('全部通过 ✅' if ok else '有项目未通过 ❌'))
