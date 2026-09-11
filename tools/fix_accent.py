# 把音标统一成英式记号：① 真·美音词重抓 ② 卷舌记号 ɹ 统一成 r
#
# 🔴 为什么要统一（2026-09-11）：
#   词库现有 2623 条音标是**纯英式 RP**：0 条美式 oʊ（247 条英式 əʊ）、0 条卷舌记号 ɹ。
#   新抓的维基音标里，绝大多数其实也是英式，但有两类记号对不上：
#     ① ɹ (U+0279) —— 和 r 是**同一个音**，只是维基现在爱用这个符号。纯记号差异，统一成 r。
#        488 条属于这类。附带好处：ɹ 在部分安卓字体里会渲染成豆腐块。
#     ② ɚ / ɝ / oʊ —— 这些是**真·美音**（RP 里根本没有这几个音），必须重新抓英式版本，
#        不能靠替换字符糊弄过去（ɚ→ə 会改掉实际发音）。
import json, os, re, time

HOME = os.path.expanduser('~')
TOOLS = HOME + '/.claude/skills/自学英语/tools'
CACHE = os.environ.get('CACHE', '/tmp/ipa_cache_fixed.json')
FINAL = json.load(open('/tmp/final_words.json'))

GA_MARK = re.compile(r'[ɚɝ]|oʊ')
# 短 ɑ（不带长音号）在英式里几乎不出现，是美式 LOT 元音的特征。
# 自动扫只捞出 3 个，但正则判断可能误伤（如个别外来词），所以**列名单人工确认**，不放进正则。
GA_EXTRA = ['positive', 'prosecutor', 'stark']

cache = json.load(open(CACHE))
vals = {w: (cache.get(w) or {}).get('ipa') for w in FINAL}

# ── ① 真·美音 → 用新优先级（口音优先）重抓 ──
ga = [w for w, v in vals.items() if v and (GA_MARK.search(v) or w in GA_EXTRA)]
print('真·美音（ɚ/ɝ/oʊ）待重抓 %d 个: %s' % (len(ga), ' '.join(ga)))

if ga:
    src = open(TOOLS + '/fetch_ipa.py', encoding='utf-8').read()
    ns = {'re': re, 'json': json, 'time': time, 'os': os, 'HOME': HOME,
          'urllib': __import__('urllib.request', fromlist=['x']),
          'api': None}
    import urllib.request, urllib.parse, urllib.error
    ns['urllib'] = urllib
    ns['API'] = 'https://en.wiktionary.org/w/api.php'
    ns['UA'] = 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'
    for fn in ('fetch', 'english_section', 'pick_ipa', 'spelling_target'):
        i = src.index('def %s(' % fn)
        j = src.index('\ndef ', i + 1) if '\ndef ' in src[i + 1:] else len(src)
        exec(src[i:j], ns)
    pick_ipa, english_section = ns['pick_ipa'], ns['english_section']

    BATCH = 50
    fixed = 0
    for i in range(0, len(ga), BATCH):
        chunk = ga[i:i + BATCH]
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                                    'rvslots': 'main', 'format': 'json', 'formatversion': '2',
                                    'titles': '|'.join(chunk)})
        req = urllib.request.Request(ns['API'] + '?' + q, headers={'User-Agent': ns['UA']})
        delay = 3
        for attempt in range(5):
            try:
                d = json.loads(urllib.request.urlopen(req, timeout=90).read().decode('utf-8'))
                got = {}
                for p in d['query']['pages']:
                    t = p.get('title', '').lower()
                    if p.get('missing'): got[t] = None; continue
                    txt = p['revisions'][0]['slots']['main']['content']
                    got[t] = pick_ipa(txt)
                for w in chunk:
                    new = got.get(w)
                    if new and not GA_MARK.search(new):
                        print('  ✅ %-14s %s  →  %s' % (w, cache[w]['ipa'], new))
                        cache[w] = {'ipa': new, 'how': '英式重抓'}
                        fixed += 1
                    elif new:
                        print('  ⚠️ %-14s %s  →  %s（仍是美音，维基只给了这个）' % (w, cache[w]['ipa'], new))
                        cache[w] = {'ipa': new, 'how': '英式重抓(仍是美音)'}
                    else:
                        print('  ⬜ %-14s %s  → 没取到，保留原值' % (w, cache[w]['ipa']))
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = int(e.headers.get('Retry-After') or delay)
                    print('    429 限流，等 %ds' % wait, flush=True)
                    time.sleep(wait); delay = min(delay * 2, 120); continue
                print('    HTTP %s，本批跳过' % e.code); break
            except Exception as e:
                print('    出错 %s，等 %ds 重试' % (e, delay)); time.sleep(delay); delay = min(delay * 2, 60)
        time.sleep(1.2)
    print('  重抓成功 %d / %d' % (fixed, len(ga)))

# ── ② 卷舌记号 ɹ → r（纯记号统一）──
n_rhotic = 0
for w in FINAL:
    e = cache.get(w)
    if e and e.get('ipa') and 'ɹ' in e['ipa']:
        e['ipa'] = e['ipa'].replace('ɹ', 'r')
        n_rhotic += 1
print('\nɹ → r 统一了 %d 条' % n_rhotic)

json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)

# ── 复核 ──
vals = {w: (cache.get(w) or {}).get('ipa') for w in FINAL}
left = [w for w, v in vals.items() if v and re.search(r'ɹ|[ɚɝ]|oʊ', v)]
print('复核：仍带美音记号的 %d 个 %s' % (len(left), left))
print('有音标 %d / %d' % (sum(1 for v in vals.values() if v), len(FINAL)))
