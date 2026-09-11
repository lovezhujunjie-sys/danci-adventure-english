# 诊断：为什么某些词 pick_ipa 取不到音标
# 不重写业务逻辑——直接 import fetch_ipa 里的 english_section / pick_ipa 来用
# 🔴 只在没有别的抓取任务在跑的时候执行（别并发轰维基）
import importlib.util, json, os, re, sys, urllib.parse, urllib.request

HOME = os.path.expanduser('~')
spec = importlib.util.spec_from_file_location('fi', HOME + '/.claude/skills/自学英语/tools/fetch_ipa.py')
# fetch_ipa.py 顶层会跑抓取逻辑，这里只想借它的两个函数，所以手工把函数抠出来
src = open(HOME + '/.claude/skills/自学英语/tools/fetch_ipa.py', encoding='utf-8').read()
ns = {'re': re}
for fn in ('english_section', 'pick_ipa'):
    i = src.index('def %s(' % fn)
    j = src.index('\ndef ', i + 1)
    exec(src[i:j], ns)
english_section, pick_ipa = ns['english_section'], ns['pick_ipa']

WORDS = sys.argv[1:] or ['prefer', 'colour', 'american', 'theatre', 'italian', 'british', 'good-bye']
API = 'https://en.wiktionary.org/w/api.php'
UA = 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'

q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                            'rvslots': 'main', 'format': 'json', 'formatversion': '2',
                            'titles': '|'.join(WORDS)})
req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
d = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())

for p in d['query']['pages']:
    t = p.get('title', '').lower()
    if p.get('missing'):
        print('%-12s 页面不存在' % t); continue
    txt = p['revisions'][0]['slots']['main']['content']
    seg = english_section(txt)
    print('=' * 70)
    print('%-12s 全文 %d 字符 | 英语段 %d 字符 | pick_ipa → %s'
          % (t, len(txt), len(seg), pick_ipa(txt)))
    if txt.lstrip().upper().startswith('#REDIRECT'):
        print('   🔴 这是个重定向页:', txt.strip()[:80])
    if not seg:
        print('   开头 200 字:', repr(txt[:200]))
        continue
    # 英语段里所有像音标模板的东西
    tmpl = re.findall(r'\{\{[^{}]*\}\}', seg)
    ipaish = [x for x in tmpl if 'IPA' in x.upper() or 'pron' in x.lower() or 'enPR' in x]
    print('   含 IPA/pron 的模板 %d 个:' % len(ipaish))
    for x in ipaish[:6]:
        print('     ', x[:150])
    if not ipaish:
        print('   ⚠️ 英语段里一个音标模板都没有，发音小节长这样:')
        i = seg.find('===Pronunciation===')
        print('     ', repr(seg[i:i + 300]) if i >= 0 else '(没有 Pronunciation 小节)')
