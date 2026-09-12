# 合成最终 VOCAB：82 主题 5000 条 → 29 主题 5000 个不重复词
#
# 三步：① 每条老词算出「新主题」② 按英文词去重（义项合并、主题取多数票）
#      ③ 补进 520 个新词（带中文释义和英式音标），凑满 5000 个真正不同的词
#
# 🔴 去重不是删卡：make the bed / hang up 在老库里挂过两个主题，
#    去重后各留 1 张卡（不是删掉）——这样 5000 个词一个不少。
import json, os, re, glob
from collections import defaultdict, Counter, OrderedDict

D = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(D)
SKILL = os.path.dirname(TOOLS)

old = json.load(open(D + '/vocab_old82.json', encoding='utf-8'))
fixed = json.load(open(D + '/fixed_map.json', encoding='utf-8'))
topics = json.load(open(D + '/topics_final.json', encoding='utf-8'))

# ---- 老编号 → 最终编号 ----
# T15 日常起居 并进 T16 生活事务；原 T17~T27 各前移一位；
# 原 T28 程度与状态 拆成 T27 程度与方式（副词）+ T28 状态与变化；
# 原 T29 功能词 不动；原 T30（拆分时新起的号）落回 T28。
SHIFT = {'T15': 'T15', 'T16': 'T15',
         'T17': 'T16', 'T18': 'T17', 'T19': 'T18', 'T20': 'T19', 'T21': 'T20',
         'T22': 'T21', 'T23': 'T22', 'T24': 'T23', 'T25': 'T24', 'T26': 'T25',
         'T27': 'T26', 'T29': 'T29', 'T30': 'T28'}


def to_final(t):
    """把子代理给的旧编号翻成最终编号"""
    if t in ('T28', 'T30'):
        return 'T27' if t == 'T28' else 'T28'
    return SHIFT.get(t, t)


# ---- ① 逐条定归属 ----
assigned = {}
for f in sorted(glob.glob(D + '/out/assigned_*.json')):
    assigned.update(json.load(open(f, encoding='utf-8')))

# 🔴 老库里 9 个词没归成类（verb_basic / abstract 两个混杂桶，子代理给了 '?'）。
#    原文与释义见 vocab_old82.json，逐个按义项定的，理由写在右边。
assigned.update({
    'cause': 'T06',        # 引起/原因 —— 因果属于判断
    'avoid': 'T06',        # 避免 —— 意愿/决定类动词
    'woo': 'T01',          # 追求/求爱 —— 人物关系
    'affair': 'T02',       # 事件/时事 —— 社会事件
    'incident': 'T02',     # 事件/事故 —— 社会事件
    'coincidence': 'T30',  # 巧合 —— 抽象状态
    'symbol': 'T06',       # 符号/象征 —— 表意，属心智
    'combination': 'T30',  # 组合/结合 —— 抽象状态
    'grid': 'T14',         # 网格/街区 —— 城市布局
})

split28 = json.load(open(D + '/out/split_t28.json', encoding='utf-8'))
for w in ('alright', 'well'):          # 拆分时剩下的 2 个：都是副词 → 程度与方式
    split28[w] = 'T28'

seq = 0
recs = []          # (en, cn, final_topic, seq, 来源)
unresolved = []
for k in old:
    for w in old[k]['words']:
        seq += 1
        if k in fixed:
            t = fixed[k]
        else:
            t = assigned.get(w['en'], '?')
        # 🔴 拆分要在翻译之前做：翻译表把 T28/T30 都映射到最终号，
        #    翻完就分不清「待拆的混桶」和「子代理已经分好的状态词」了
        if t == 'T28':
            t = split28.get(w['en'], t)
        t = to_final(t)
        if t not in topics:
            unresolved.append((w['en'], k, t))
            t = None
        recs.append({'en': w['en'], 'cn': w['cn'], 't': t, 'seq': seq, 'src': k})

print('老词条数:', len(recs), '| 归属定不下来:', len(unresolved))
if unresolved:
    print('  前 20:', unresolved[:20])

# ---- ② 按英文词去重 ----
# 🔴 去重键必须归一，但**输出必须保留 en 原文**（2026-09-12 差点毁库）：
#    IPA_MAP 的键是 `w.en` 的**原文**（含大小写和空格，如 "Face ID"/"World Cup"/
#    "living room"），应用里是 `IPA_MAP[w.en]` 直接取，不走归一。
#    一开始拿小写当键又用小写当输出，319 个含空格/大写的词会被降成 "face id"，
#    音标全查不到 —— 且不报错，静默变哑。
#    另外 `alsо` 是西里尔字母 о，和老库里的 `also` 是两个不同字符串，
#    会在词库里同时留下「坏字符条目」和「没有音标的 also」。归一里一并修掉。
HOMO = str.maketrans({'о': 'o', 'а': 'a', 'е': 'e', 'с': 'c', 'р': 'p', 'х': 'x',
                      'у': 'y', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'А': 'A', 'В': 'B',
                      'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
                      'С': 'C', 'Т': 'T', 'Х': 'X'})


def dedup_key(s):
    k = str(s).strip().translate(HOMO).lower()
    return re.sub(r'[^a-z0-9]', '', k)


# 老库把同一个词写成了两种样子（都在库里、各有音标），去重后要留哪个写法：
# 一律留标准现代拼法 —— signout/good-bye/e-mail 都是过时或非标准写法。
SPELL = {'checkin': 'check in', 'signout': 'sign out',
         'good-bye': 'goodbye', 'e-mail': 'email'}

RENAME = {}
groups = defaultdict(list)
for r in recs:
    groups[dedup_key(r['en'])].append(r)

words = OrderedDict()
merged_cn = 0
for key, rs in groups.items():
    # 中文义项合并（保序去重）
    cns = []
    for r in rs:
        for p in re.split(r'[；;]', r['cn']):
            p = p.strip()
            if p and p not in cns:
                cns.append(p)
    if len(cns) > 1:
        merged_cn += 1
    # 主题取多数票，平票取靠前的（≈更常见的义项）
    c = Counter(r['t'] for r in rs if r['t'])
    host = c.most_common(1)[0][0] if c else None
    # 输出用**原文**（保大小写/空格），只把同形异码字符纠正过来
    en_out = min(rs, key=lambda r: r['seq'])['en'].translate(HOMO)
    en_out = SPELL.get(en_out, en_out)
    for r in rs:                    # 记下「老写法 → 新写法」，供下面校验音标没丢
        RENAME[r['en']] = en_out
    words[key] = {'en': en_out, 'cn': '；'.join(cns), 't': host,
                  'seq': min(r['seq'] for r in rs), 'n_old': len(rs)}

print('去重后唯一词:', len(words), '| 其中合并过义项的:', merged_cn)
print('老库里重复挂过多个主题的词:', sum(1 for v in words.values() if v['n_old'] > 1))

# ---- ③ 补新词 ----
newraw = json.load(open(D + '/new_words_raw.json', encoding='utf-8'))
cnfin = json.load(open(D + '/cn_final.json', encoding='utf-8'))
cache = json.load(open(TOOLS + '/.ipa_cache.json', encoding='utf-8'))
new_asg = {}
for f in sorted(glob.glob(D + '/out/new_a*.json')):
    for k, v in json.load(open(f, encoding='utf-8')).items():
        # 🔴 三份子代理产出格式不统一：批 1/2 是扁平「词→Txx」，
        #    批 3 是嵌套 {"word": "Txx", "another": "Tyy"}。两种都得认。
        new_asg[k] = v['word'] if isinstance(v, dict) else v
# 批 3 剩的 3 个 '?'（中文给了两个不相干的义项），按主义项定：
new_asg.update({'haunt': 'T26',   # 鬼魂出没 → 信仰与节日（鬼怪）
                'limp': 'T04',    # 跛行 → 健康医疗（症状）
                'jumper': 'T10'}) # 毛衣（英式）→ 服装打扮
print('\n新词分类结果:', len(new_asg), '条')

TARGET = 5000
added, dup, noipa, nocn, skipped = 0, [], [], [], []
for w in newraw:
    if len(words) >= TARGET:
        break
    en = w['en']
    if dedup_key(en) in words:
        dup.append(en)          # 老库里已经有 → 不算新词，往下顺延补（否则凑不满 5000）
        continue
    t = to_final(new_asg.get(en, '?'))
    if t not in topics:
        skipped.append((en, t))
        continue
    cn = cnfin.get(en)
    if not cn:
        nocn.append(en)
        continue
    ipa = (cache.get(en) or {}).get('ipa')
    if not ipa:
        noipa.append(en)
    seq += 1
    words[dedup_key(en)] = {'en': en, 'cn': cn, 't': t, 'seq': seq, 'n_old': 0, 'ipa': ipa}
    added += 1

print('补进新词:', added, '| 与老库撞车跳过:', len(dup), dup)
print('归属定不下来跳过:', len(skipped), skipped)
print('缺中文:', len(nocn), nocn[:10])
print('缺音标:', len(noipa), noipa)

missing_t = [(v['en'], k) for k, v in words.items() if not v['t']]
print('\n最终词数:', len(words), '| 没有主题的:', len(missing_t), missing_t[:10])
# 音标覆盖：老词查 index.html 里的 IPA_MAP，新词查刚抓的 cache
H = open(SKILL + '/index.html', encoding='utf-8').read()
i = H.index('const IPA_MAP = ')
st = H.index('{', i); dep = 0; j = st; inS = False; esc = False
while j < len(H):
    c = H[j]
    if inS:
        if esc: esc = False
        elif c == '\\': esc = True
        elif c == '"': inS = False
    else:
        if c == '"': inS = True
        elif c == '{': dep += 1
        elif c == '}':
            dep -= 1
            if dep == 0: break
    j += 1
IPA_OLD = eval(H[st:j + 1])

# ---- ④ 边界修正 + 老词释义修正 ----
# 子代理各判各的，跨主题边界必然有出入（频率副词一会儿进时间一会儿进程度、
# 程度副词一会儿进功能词一会儿进程度）。这里统一口径，理由见 fix_topics.json 的注释。
FIX_T = json.load(open(D + '/fix_topics.json', encoding='utf-8'))
CN_FIX = json.load(open(D + '/fix_cn_old.json', encoding='utf-8'))
moved, recn = 0, 0
for v in words.values():
    if v['en'] in FIX_T and v['t'] != FIX_T[v['en']]:
        v['t'] = FIX_T[v['en']]
        moved += 1
    if v['en'] in CN_FIX and v['cn'] != CN_FIX[v['en']]:
        v['cn'] = CN_FIX[v['en']]
        recn += 1
print('边界修正搬动:', moved, '| 老词释义修正:', recn)
has = [v['en'] for v in words.values() if IPA_OLD.get(v['en']) or v.get('ipa')]
non = sorted(v['en'] for v in words.values() if not (IPA_OLD.get(v['en']) or v.get('ipa')))
print('有音标:', len(has), '/', len(words), '| 没有的:', len(non), non)

# ---- 输出 VOCAB ----
# 字段照老 VOCAB 的样子：只有 name/icon/words（desc 是给人看的，不进 index.html，
# 它在应用里没有任何读取点，塞进去只是给 683KB 的文件白加 3KB）
out = OrderedDict()
for t in sorted(topics):
    ws = sorted((v for v in words.values() if v['t'] == t), key=lambda v: v['seq'])
    out[t] = {'name': topics[t]['name'], 'icon': topics[t]['icon'],
              'words': [OrderedDict([('cn', v['cn']), ('en', v['en'])]) for v in ws]}

print('\n=== 29 主题最终分布 ===')
tot = 0
for t in out:
    n = len(out[t]['words'])
    tot += n
    print('%-4s %-7s %4d  %s' % (t, out[t]['name'], n, '█' * min(50, n // 4)))
print('合计:', tot)

json.dump(out, open(D + '/vocab_final.json', 'w', encoding='utf-8'), ensure_ascii=False)

# 新 IPA_MAP：老词沿用原文键（大小写/空格原样保留），新词补上抓到的
ipa_all = OrderedDict()
for v in sorted(words.values(), key=lambda v: v['seq']):
    ip = IPA_OLD.get(v['en']) or v.get('ipa')
    if ip:
        ipa_all[v['en']] = ip
json.dump(ipa_all, open(D + '/ipa_final.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('写出 vocab_final.json / ipa_final.json（音标 %d 条）' % len(ipa_all))

# 硬校验：新 IPA_MAP 必须完全继承老 IPA_MAP 的 4480 条，一条不少、值不变
# 校验口径（2026-09-12 两次误报后定下）：
#   去重会给词**改名**（signout→sign out、alsо→also），所以不能拿老键名直接比对新表。
#   而且改名后的词在新表里有它自己的音标（checkin /ˈtʃekɪn/ 与 check in /tʃek ɪn/
#   本就是两个不同的词形），值不同也正常。
#   真正要守的不变量只有一条：**老库里有音标的词，新库必须还有音标**。
norename = {k: ipa_all.get(k) for k in IPA_OLD if k not in RENAME}
lost = {k: v for k, v in IPA_OLD.items() if not ipa_all.get(RENAME.get(k, k))}
renamed = {k: n for k, n in RENAME.items() if k != n}
print('老音标丢失（老写法改名后新写法没音标）:', len(lost), list(lost.items())[:5])
print('去重改名（音标随词一起搬过去）:', len(renamed), renamed)
assert not lost, '老音标被动过，必须停下来查'
