# 选 520 个补进词库的新词
#
# 🔴 为什么用 CEFR-J 而不是继续深扫 OpenSubtitles 词频表（2026-09-12 实测）：
#    拿字幕词频表扫到 8000 名补 520 个，选出来的是 alice/rachel/lucy/washington/
#    texas/uh-huh/gosh/pussy 这类人名地名语气词脏话 —— 字幕是影视对白，
#    人名和口头语天然高频。它适合定「词频顺序」，不适合定「该不该教」。
#    CEFR-J（东京外国语大学 Tono 教授编，A1~B2 教学分级词表）本身就是
#    「该教哪些词」的答案，且带主题分类，天生没有 pop culture 垃圾。
#    词频表保留一个用途：同一等级内按真实使用频率排先后。
import csv, json, os, re

D = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(D)
SKILL = os.path.dirname(TOOLS)
N = int(os.environ.get('N', 520))

# 已有词（含 BASE_CN 功能词，避免补进来却早已在库里）
d = json.load(open(D + '/vocab_old82.json', encoding='utf-8'))
have = set()
for k in d:
    for w in d[k]['words']:
        for t in re.split(r'[\s/]+', str(w['en']).lower()):
            t = re.sub(r"[^a-z']", '', t)
            if t:
                have.add(t)

# 🔴 BASE_CN 是「基础词表层」，专管代词/虚词/过去式这些不放进 VOCAB 的词。
#    不把它算进 have，选词就会把 he/they/her/will/who/why 当"新词"补进来 ——
#    2026-09-12 实测第一版就踩了这个坑（前 60 个里 14 个是代词）。
def lit(name):
    """从 index.html 里抠出 `const NAME = {...}` 字面量（带字符串感知的大括号配对）"""
    H = open(SKILL + '/index.html', encoding='utf-8').read()
    i = H.index('const ' + name + ' = ')
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
                if dep == 0: return eval(H[st:j + 1])
        j += 1

base = {re.sub(r"[^a-z']", '', str(k).lower()) for k in lit('BASE_CN')}
have |= base
print('词库已有 %d 个词 + BASE_CN 基础词 %d 个' % (len(have) - len(base), len(base)))

# 语气词/缩写/称呼/脏话 —— 与 pick_words.py 的 JUNK 口径一致
JUNK = set('''ah aha ahh aargh argh aw aww bah eh er hm hmm hmmm huh mm mmm
oh ooh uh um umm uh-oh uh-uh yo ow ouch oops whew whoa wow yeah yep yup nope nah
ha haha hehe hi hey hello ok okay yo sup
gonna wanna gotta dunno gimme outta kinda sorta
damn hell crap piss bitch bastard ass shit fuck fucking
mr mrs ms dr st sr jr prof
tv pc dvd cd usb gps cpu api app apps url http www com org net inc ltd corp
id ids vs etc ie eg
mama papa mommy daddy mom dad mum mummy
dj dude bro dude-bro
god jesus christ lord'''.split())
have |= JUNK
# 变形也算已有：things/going 不该当成新词补
try:
    from lemminflect import getAllLemmas
    def is_infl(w):
        flat = {l for v in getAllLemmas(w).values() for l in v}
        return any(l != w for l in flat)
except Exception:
    def is_infl(w):
        return False

blocked = set()
for l in open(TOOLS + '/blocklist.txt', encoding='utf-8'):
    blocked |= set(l.split('#')[0].split())

# 真实词频（字幕表）→ 同级内排序用
freq = {}
for i, l in enumerate(open('/tmp/en50k.txt', encoding='utf-8')):
    p = l.split()
    if p:
        freq[p[0]] = i

# CEFR-J 候选
LV = {'A1': 0, 'A2': 1, 'B1': 2, 'B2': 3}
rows = list(csv.DictReader(open('/tmp/cefrj.csv', encoding='utf-8-sig')))
cand, seen = [], set()
for r in rows:
    hw = r['headword'].lower().strip()
    if not re.fullmatch(r"[a-z][a-z'-]*", hw):     # 只要纯单词，多词短语/带标点的跳过
        continue
    if hw in have or hw in blocked or hw in seen:
        continue
    if is_infl(hw):
        continue
    seen.add(hw)
    cand.append({'en': hw, 'cefr': r['CEFR'], 'pos': r['pos'],
                 'rank': freq.get(hw, 10 ** 9)})

# 等级优先，同级按真实词频
cand.sort(key=lambda x: (LV.get(x['cefr'], 9), x['rank']))
sel = cand[:N]
print('候选 %d 个 → 取前 %d 个' % (len(cand), len(sel)))
from collections import Counter
print('选中等级分布:', dict(Counter(x['cefr'] for x in sel)))
print('前 60:', ' '.join(x['en'] for x in sel[:60]))
print('后 40:', ' '.join(x['en'] for x in sel[-40:]))
json.dump(sel, open(D + '/new_words_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
