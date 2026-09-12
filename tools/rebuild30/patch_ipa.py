# 补抓 fetch_ipa.py 漏掉的 20 个新词音标
#
# 🔴 为什么这 20 个漏了（2026-09-12 逐个上维基查证，不是猜的）：
#   ① 词条是「另一种拼法」的空壳，音标在真正的词条那边：
#        guidebook → {{alternative spelling of|en|guide book}}
#        brand-new → {{alternative form of|en|brand new}}
#      fetch_ipa.py 里写好了顺着跳的 spelling_target()，但**从来没被调用过**（死代码），
#      而且它的正则不收带空格的词（guide book 有空格），两处都得修。
#   ② 词条页面上压根没有 {{IPA}} 模板，只有 audio/rhymes/rfp：
#        granddad（只有 rhymes）、someday（只有 {{rfp}}）
#      → 维基就是没收录音标，只能留空。
#   ③ 小写页不存在，正主是大写专有名词页：olympic→Olympic、mediterranean→Mediterranean。
#   ④ 只有美音、没有英音：shortly 页面上只有 {{IPA|en|/ˈʃɔɹtli/|a=US}}。
#      库里 4480 条音标是纯英式，混进美音比留空更糟（卷舌 r 一眼就看出不是英音）→ 留空。
import json, os, re, time, urllib.parse, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(D))
CACHE = os.path.join(os.path.dirname(D), '.ipa_cache.json')
API = 'https://en.wiktionary.org/w/api.php'
UA = 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'

MISS = ['someday', 'spaceship', 'granddad', 'olympic', 'right-hand', 'left-hand',
        'policewoman', 'businesswoman', 'bookshop', 'guidebook', 'half-price',
        'christian', 'shortly', 'salesman', 'brand-new', 'part-time',
        'unpredictable', 'severely', 'increasingly', 'mediterranean']

SRC = open(os.path.dirname(D) + '/fetch_ipa.py', encoding='utf-8').read()
ns = {'__name__': 'notmain'}
exec(SRC.split('todo = [w for w in WORDS')[0], ns)      # 只取函数区，别跑主循环
parse_ipa_templates, english_section = ns['parse_ipa_templates'], ns['english_section']
pick_ipa = ns['pick_ipa']


def strict_ipa(txt):
    """只要明确标了英式的；返回 (音标, 口音)"""
    seg = english_section(txt)
    if not seg:
        return None, None
    best = None
    for val, style, acc in parse_ipa_templates(seg):
        if not re.search(r'\b(RP|UK|GB)\b', acc):
            continue
        if best is None or style < best[0]:
            best = (style, val, acc)
    return (best[1], best[2]) if best else (None, None)


def unmarked_ipa(txt):
    """没有英式标注时退而求其次：只收**完全没标口音**的斜杠式（词典默认引用形）。
    明确标了 a=US/GA 的一律不要 —— 库里是纯英式。"""
    seg = english_section(txt)
    if not seg:
        return None
    for val, style, acc in parse_ipa_templates(seg):
        if style == 0 and not acc.strip():
            return val
    return None


def target_of(txt):
    """顺着「另一种拼法」跳转；这次允许目标词带空格（guide book / brand new）"""
    for m in re.finditer(r'\{\{\s*(standard spelling of|alternative spelling of|altspellof|altsp|'
                         r'alternative form of|altform)\s*\|([^}]*)\}\}', txt, re.I):
        for p in [x.strip() for x in m.group(2).split('|')][1:]:
            if not p or '=' in p:
                continue
            if re.fullmatch(r"[A-Za-z][A-Za-z'’-]*(?: [A-Za-z][A-Za-z'’-]*)*", p):
                return p.lower()
    return None


def get(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                                'rvslots': 'main', 'format': 'json',
                                'redirects': '1', 'titles': '|'.join(titles)})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    out = {}
    for p in d['query']['pages'].values():
        try:
            out[p['title'].lower()] = p['revisions'][0]['slots']['main']['*']
        except Exception:
            out[p['title'].lower()] = ''
    return out


cache = json.load(open(CACHE, encoding='utf-8'))

# 第一轮：本词、首字母大写、跳转目标
want = list(MISS)
for w in MISS:
    want += [w.capitalize(), w.title()]
texts = {}
for i in range(0, len(want), 20):
    texts.update(get(want[i:i + 20]))
    time.sleep(1.2)

found, second = {}, []
for w in MISS:
    txt = texts.get(w, '')
    ipa, acc = (strict_ipa(txt) if txt else (None, None))
    if not ipa and txt:
        ipa = unmarked_ipa(txt)
    if not ipa and txt:
        tgt = target_of(txt)
        if tgt:
            second.append((w, tgt)); continue
    if not ipa:                                  # 试试大写页
        for cap in (w.capitalize(), w.title()):
            t2 = texts.get(cap.lower(), '')
            if t2:
                ipa, acc = strict_ipa(t2)
                if not ipa:
                    ipa = unmarked_ipa(t2)
                if ipa:
                    break
    if ipa:
        found[w] = ipa

print('第一轮拿到:', len(found), sorted(found))

# 第二轮：抓跳转目标（guide book / brand new）
if second:
    tgts = sorted({t for _, t in second})
    t2 = {}
    for i in range(0, len(tgts), 20):
        t2.update(get(tgts[i:i + 20]))
        time.sleep(1.2)
    for w, tgt in second:
        txt = t2.get(tgt, '')
        if not txt:
            continue
        ipa = strict_ipa(txt)[0] or pick_ipa(txt)
        if ipa:
            found[w] = ipa
    print('第二轮拿到:', len(found), sorted(found))

for w, v in found.items():
    cache[w] = {'ipa': v, 'how': 'ok(补抓)'}
json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)

still = [w for w in MISS if not cache.get(w, {}).get('ipa')]
print('\n最终 %d/%d，仍缺 %d 个:' % (len(MISS) - len(still), len(MISS), len(still)))
for w in still:
    print('   %-16s %s' % (w, '只有美音，按纯英式标准不收' if w == 'shortly' else '维基页无 IPA 模板'))
