# 补救取不到音标的词：三层兜底
#   ① 原词（小写）
#   ② 首字母大写 —— russian/japanese/jewish/irish 的小写页面根本不存在，
#      正经词条在 Russian/Japanese/Jewish/Irish
#   ③ 顺着 {{standard spelling of|...|color}} 跳 —— colour/theatre/favour 自己页面上没有音标，
#      音标在 color/theater/favor 那边
# 🔴 业务函数（english_section / pick_ipa / spelling_target / fetch）一律从 fetch_ipa.py 切真身，
#    绝不在本脚本里重写一遍。
# 🔴 只在没有别的抓取任务在跑的时候执行；串行 + 限速。
import json, os, re, time, urllib.parse, urllib.request, urllib.error

HOME = os.path.expanduser('~')
TOOLS = HOME + '/.claude/skills/自学英语/tools'
CACHE = os.environ.get('CACHE', '/tmp/ipa_cache_fixed.json')
# 默认补救「最终词表里缺音标的词」；用 WORDS= 可以指定别的词表
# （2026-09-11 加：换美式拼写为英式形式时，那几个英式词还不在最终词表里）
FINAL = json.load(open(os.environ.get('WORDS', '/tmp/final_words.json')))

src = open(TOOLS + '/fetch_ipa.py', encoding='utf-8').read()
ns = {'re': re, 'json': json, 'time': time, 'urllib': urllib,
      'os': os, 'HOME': HOME, 'API': 'https://en.wiktionary.org/w/api.php',
      'UA': 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'}
# 只切需要的四个。别用「正则找全部 def」——最后一个函数会一直切到文件尾，
# 把底下的驱动代码一起 exec 进来（会立刻因为 WORDS 未定义而炸）
for fn in ('fetch', 'english_section', 'pick_ipa', 'spelling_target'):
    i = src.index('def %s(' % fn)
    j = src.index('\ndef ', i + 1) if '\ndef ' in src[i + 1:] else len(src)
    exec(src[i:j], ns)
fetch, pick_ipa, spelling_target = ns['fetch'], ns['pick_ipa'], ns['spelling_target']
english_section = ns['english_section']

cache = json.load(open(CACHE))
miss = [w for w in FINAL if not (cache.get(w) or {}).get('ipa')]
print('待补救 %d 个: %s\n' % (len(miss), ' '.join(miss)))

UA = ns['UA']

def get_text(title):
    """取一个词条的正文；页面不存在返回 ('missing', '')，出错返回 (None, 原因)"""
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                                'rvslots': 'main', 'format': 'json', 'formatversion': '2',
                                'titles': title})
    req = urllib.request.Request(ns['API'] + '?' + q, headers={'User-Agent': UA})
    delay = 3
    for _ in range(5):
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=90).read().decode('utf-8'))
            p = d['query']['pages'][0]
            if p.get('missing'): return 'missing', ''
            return 'ok', p['revisions'][0]['slots']['main']['content']
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = int(e.headers.get('Retry-After') or delay)
                print('    429 限流，等 %ds' % w, flush=True); time.sleep(w); delay = min(delay*2, 120); continue
            return None, 'HTTP %s' % e.code
        except Exception as e:
            time.sleep(delay); delay = min(delay*2, 60); last = str(e)
    return None, last

fixed, still = {}, []
for w in miss:
    got, how = None, []
    st, txt = get_text(w); time.sleep(1.2)
    if st == 'ok':
        got = pick_ipa(txt)
        how.append('原词')
        if not got:
            tgt = spelling_target(txt)
            if tgt and tgt != w:
                how.append('跳到 %s' % tgt)
                st2, txt2 = get_text(tgt); time.sleep(1.2)
                if st2 == 'ok': got = pick_ipa(txt2)
    if not got:
        cap = w[:1].upper() + w[1:]
        st3, txt3 = get_text(cap); time.sleep(1.2)
        if st3 == 'ok':
            got = pick_ipa(txt3)
            how.append('大写 %s' % cap)
    if got:
        fixed[w] = got
        cache[w] = {'ipa': got, 'how': '补救(%s)' % '→'.join(how)}
        print('  ✅ %-14s %-28s %s' % (w, got, '→'.join(how)))
    else:
        still.append(w)
        print('  ⬜ %-14s 三层兜底都没取到' % w)

json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
print('\n补回 %d 个，仍缺 %d 个: %s' % (len(fixed), len(still), ' '.join(still)))
