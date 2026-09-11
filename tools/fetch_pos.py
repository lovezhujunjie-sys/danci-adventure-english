# 从 Wiktionary 抓每个词的「英语词性小节」，用来分辨人名和真词
# 🔴 为什么必须联网抓：离线信号全都试过、全都不合格（2026-09-11 实测）
#   ① /usr/share/dict/web2 —— 人名全收（maggie/lena/rachel 60/60 命中），零区分度
#   ② /usr/share/dict/propernames —— 只有 1308 个英美常见名，漏掉 maggie/lena/alice/rachel
#   ③ Google 网页词频表 × 字幕表 交叉 —— 只挡掉 37% 人名，却误杀 6/54 真常用词
#   唯一干净的判据是维基词典：maggie 只有 ===Proper noun===，而 ivy/amber/ruby 有 ===Noun===
#   （常春藤/琥珀/红宝石是真词，该教；人名不该教）
# 🔴 两条纪律同 fetch_ipa.py：串行限速；失败绝不许写进缓存冒充结果
import json, os, re, time, urllib.parse, urllib.request, urllib.error

HOME = os.path.expanduser('~')
CACHE = HOME + '/.claude/skills/自学英语/tools/.pos_cache.json'
POOL = json.load(open(os.environ.get('POOL', '/tmp/pool_full.json')))
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
API = 'https://en.wiktionary.org/w/api.php'
BATCH = 50
UA = 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'

def fetch(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                                'rvslots': 'main', 'format': 'json', 'formatversion': '2',
                                'titles': '|'.join(titles)})
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.loads(r.read().decode('utf-8'))
    if 'error' in d: raise RuntimeError('API error: %s' % d['error'])
    if 'query' not in d: raise RuntimeError('没有 query 字段: %s' % str(d)[:200])
    return d

def english_section(txt):
    # 🔴 切到下一个「二级」标题为止。不能用 txt.find('\n==')：三级标题 ===Noun===
    # 也以 \n== 开头，那样会把整个词性段切掉，结果每个词都「没有词性」（同 fetch_ipa.py 踩过的坑）
    i = txt.find('==English==')
    if i < 0: return ''
    m = re.search(r'\n==[^=]', txt[i + 10:])
    return txt[i:i + 10 + m.start()] if m else txt[i:]

def pick_pos(txt):
    """返回英语段里所有三级、四级标题（词性/其他小节的标题名）

    🔴 必须同时收四级标题（2026-09-11 实测踩坑）：
       一词多源的词条，词性会嵌在 ===Etymology 1=== 底下降一级：
           with  → ===Etymology 1=== / ====Preposition==== / ====Adverb====
           kill  → ===Etymology 1=== / ====Verb==== / ====Noun====
       只认三级的话，with/kill/really/last/sit/mine 这些最常见词会被判成
       「没有词性」，647 个词集体沦为「其它」——纯属解析器自己造的假象。
    """
    seg = english_section(txt)
    if not seg: return None
    return sorted(set(m.group(2).strip() for m in re.finditer(r'\n(={3,4})\s*([^=\n]+?)\s*\1\n', seg)))

def fetch_batch(batch):
    """返回 (结果dict, 失败原因)。失败原因非空表示这一批要重试、绝不可入缓存。"""
    delay = 3
    last = ''
    for attempt in range(6):
        try:
            d = fetch(batch)
            got = {}
            for p in d['query']['pages']:
                t = p.get('title', '').lower()
                if p.get('missing'):
                    got[t] = {'pos': None, 'how': '页面不存在'}
                    continue
                try: txt = p['revisions'][0]['slots']['main']['content']
                except Exception: txt = ''
                got[t] = {'pos': pick_pos(txt), 'how': 'ok'}
            return got, None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get('Retry-After') or delay)
                print('    429 限流，等 %ds 重试（第 %d 次）' % (wait, attempt + 1), flush=True)
                time.sleep(wait); delay = min(delay * 2, 120); continue
            return None, 'HTTP %s' % e.code
        except Exception as e:
            last = str(e); time.sleep(delay); delay = min(delay * 2, 60)
    return None, '重试 6 次仍失败: %s' % last

# 真词判据：英语段里存在这些「实词/虚词」小节之一
COMMON = {'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition',
          'Conjunction', 'Determiner', 'Numeral', 'Article', 'Particle', 'Contraction'}
INTERJ = {'Interjection'}
PROPER = {'Proper noun'}

# RECHECK=1：把缓存里「没查出任何实词/虚词小节」的词重抓一遍。
#   旧版解析器漏了四级标题，只有漏判、没有误判——所以已经查出真词的条目可以放心留用，
#   只需重查那批可疑的，省掉 3/4 的请求量。
RECHECK = os.environ.get('RECHECK') == '1'
if RECHECK:
    suspect = [w for w in POOL
               if w not in cache or not (set(cache[w].get('pos') or []) & COMMON)]
    todo = suspect
    print('重查模式：候选 %d 个，缓存里可疑（无实词小节）%d 个，重抓这批' % (len(POOL), len(todo)), flush=True)
else:
    todo = [w for w in POOL if w not in cache]
    print('候选池 %d 个，待抓 %d 个（已缓存 %d）' % (len(POOL), len(todo), len(cache)), flush=True)
batches = [todo[i:i+BATCH] for i in range(0, len(todo), BATCH)]
failed = []
for n, batch in enumerate(batches, 1):
    got, err = fetch_batch(batch)
    if err:
        failed.append((n, err))
        print('  批次 %d 失败：%s（不入缓存，下次重跑会补）' % (n, err), flush=True)
    else:
        for w in batch:
            cache[w] = got.get(w) or {'pos': None, 'how': '未返回'}
        json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)   # 每批落盘
    print('  批次 %d/%d  已抓 %d' % (n, len(batches), len(cache)), flush=True)
    time.sleep(1.2)

json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)

# ── 分类 ──
buckets = {'common': [], 'interj_only': [], 'proper_only': [], 'unknown': [], 'missing': []}
for w in POOL:
    e = cache.get(w)
    if not e: continue
    pos = e.get('pos')
    if pos is None:
        buckets['missing'].append(w); continue
    s = set(pos)
    if s & COMMON: buckets['common'].append(w)
    elif s & INTERJ: buckets['interj_only'].append(w)
    elif s & PROPER: buckets['proper_only'].append(w)
    else: buckets['unknown'].append((w, pos))

print('\n分类结果：')
print('  ✅ 真词（有实词/虚词小节）  %4d' % len(buckets['common']))
print('  🔴 纯人名（只有Proper noun）%4d' % len(buckets['proper_only']))
print('  ⚠️ 只有Interjection        %4d' % len(buckets['interj_only']))
print('  ❓ 其它/无词性小节          %4d' % len(buckets['unknown']))
print('  ⬜ 页面不存在              %4d' % len(buckets['missing']))
print('\n纯人名举例:', ' '.join(buckets['proper_only'][:40]))
print('语气词举例:', ' '.join(buckets['interj_only'][:40]))
print('其它举例:', ' '.join('%s%s' % (w, p) for w, p in buckets['unknown'][:15]))
json.dump(buckets, open('/tmp/pos_buckets.json', 'w'), ensure_ascii=False)
