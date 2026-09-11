# 从 Wiktionary 抓英式音标（RP）
# 🔴 为什么必须英式：词库现有 2623 条音标 100% 是英式 RP（0 条卷舌 r、257 条用 ɒ、
#    /ˈstjuːdnt/ 还是英式的 stj-）。混进美式会跟老词直接打架。
# 🔴 两条纪律（2026-09-11 踩过）：
#   ① 串行 + 间隔，别并发轰 —— 6 并发 50 条一批直接被 429 限流
#   ② 请求失败绝不许写进缓存当成「这个词没有音标」，否则失败会伪装成结果
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error

HOME = os.path.expanduser('~')
CACHE = os.environ.get('CACHE', HOME + '/.claude/skills/自学英语/tools/.ipa_cache.json')
WORDS = json.load(open(os.environ.get('WORDS', '/tmp/to_add.json')))
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
    # 🔴 切到下一个「二级」标题为止。不能用 txt.find('\n==')：三级标题 ===Pronunciation===
    # 也以 \n== 开头，那样会正好把发音小节切掉，结果每个词都「没有音标」（2026-09-11 踩过）
    i = txt.find('==English==')
    if i < 0: return ''
    m = re.search(r'\n==[^=]', txt[i + 10:])
    seg = txt[i:i + 10 + m.start()] if m else txt[i:]

    # 🔴 再切到「第一个音标模板之后的第一个三级标题」为止（2026-09-11 踩坑，ton 栽在这）：
    #   维基一个词条按**词源**分节，各词源是**不同的词**，读音当然不同：
    #       ton  ===Etymology 1=== → /tʌn/          ← 我们要的「吨」
    #            ===Etymology 2=== → /tɔ̃/, /tɒn/    ← 旧体的另一个词（时髦），还带 a=UK
    #   整段扫的话，Etymology 2 那条带 a=UK 反而**排到了前面**，把 /tʌn/ 挤掉。
    #   锚点必须挂在「第一个音标模板」上、而不是「第一个三级标题」上：
    #   有些词条开头是 ===Alternative forms=== / ===Etymology=== 排在发音之前，
    #   按标题切会把发音小节整段切没（那就退回「每个词都没音标」的老毛病）。
    #   注意方括号：\n====Noun==== 这类四级标题不算数（[^=] 挡住），
    #   同一个词源里的 ====Pronunciation 1/2====（如 record 名/动）照旧全都保留。
    p = re.search(r'\{\{IPA\|en\|', seg)
    if p:
        n = re.search(r'\n===[^=]', seg[p.end():])
        if n: seg = seg[:p.end() + n.start()]
    return seg

# 口音标注的两种写法，往回看时要都认（2026-09-11 踩坑）：
#   具名参数：{{enPR|stärk|a=RP}}          / {{IPA|en|/x/|a=GA}}
#   位置参数：{{a|en|RP}} (BE): {{IPA|en|/ɹɪˈɡɑːd.lɪs/}}   ← regardless 就是这种
# 只认 a= 的话，regardless 的英式音标明明在页面上却被判成「没有英式」，取了美式。
ACC_ANNOT = re.compile(r'\ba=([^|}]+)|\{\{a\|(?:en\|)?([^|}]+)\}\}')


def pick_ipa(txt):
    """从英语段的 {{IPA|en|...}} 模板里取音标，优先英式 RP。

    🔴 参数顺序不固定，绝不能假定 args[0] 就是音标（2026-09-11 实测踩坑）：
         {{IPA|en|/kəˈlæps/|a=US}}        ← a= 在后面
         {{IPA|en|a=RP,GA,CA|/kəˈlæps/}} ← a= 在前面（collapse 就是这种）
       原来的写法把 args[0] 当音标，第二种会取到字符串 "a=RP,GA,CA"，
       找不到 /.../ 就 continue，结果整批词被误判成「没有音标」。
       正确做法：在模板体里任意位置找第一个 /.../，并在任意位置找 a= 标注。
    """
    seg = english_section(txt)
    if not seg: return None
    best = None                       # (优先级, 音标)，数字越小越优先
    for m in re.finditer(r'\{\{IPA\|en\|([^}]*)\}\}', seg):
        body = m.group(1)
        # 🔴 两种括号都要认（2026-09-11 踩坑）：
        #   /.../ = 宽式音标（phonemic），[ ... ] = 窄式（phonetic）。
        #   有些词条**只给方括号**，例如 barn = {{IPA|en|[ˈbɒːn]|a=RP,ZA}}、
        #   suitable = {{IPA|en|[ˈsjuː.tə.bɫ̩]|a=RP}}。只认斜杠的话这些词全部取不到音标，
        #   会被误当成「这个词没有音标」。斜杠式永远优先（+0），方括号垫底（+10）。
        slash = re.search(r'/([^/]+)/', body)
        brack = re.search(r'\[([^\[\]]+)\]', body)
        if slash:   val, style = '/' + slash.group(1).replace('.', '') + '/', 0
        elif brack: val, style = '/' + brack.group(1).replace('.', '') + '/', 1
        else:       continue
        # 🔴 口音标注不一定在 IPA 模板里，常常挂在**紧邻前面**的 {{enPR|…|a=RP}} 上
        #    （2026-09-11 实测踩坑，nuclear / stark 就栽在这）：
        #        nuclear: {{enPR|nyo͞oklî(r)|a=RP}}, {{IPA|en|/ˈnjuː.klɪə(ɹ)/}}
        #        stark  : {{enPR|stärk|a=RP}},      {{IPA|en|/stɑːk/}}
        #    两个 IPA 模板自己都没有 a=，光看内部就把英式当成「未标注」，
        #    结果排在带 a=GA 的美式后面 —— 明明页面上有英式，却取了美式。
        #    所以模板内没有 a= 时，往回看**同一行**里最后一个口音标注。
        # 🔴 只能看同一行，不能跨行（2026-09-11 踩坑，sector / Irish 栽在这）：
        #      sector: * {{enPR|sĕk'tər|a=US}}, {{IPA|en|/ˈsɛk.təɹ/}}
        #              * {{IPA|en|/ˈsɛk.tɚ/|a=IE}}          ← 上一行的 a=US 被下一行继承了
        #      Irish : * {{audio|en|En-us-Irish.ogg|a=US}}
        #              * {{enPR|ī'rĭsh}}, {{IPA|en|/ˈaɪɹɪʃ/}}  ← audio 的 a=US 被音标继承了，
        #                                                        结果标准音输给弱读变体
        #    维基一条读音占一行（enPR 与它配对的 IPA 用逗号连在同一行），
        #    跨行回看就会把**上一条读音**的口音标签安到这一条头上。
        #    行内回看对 nuclear / stark / regardless 三种正确写法照样有效。
        am = re.search(r'\ba=([^|}]+)', body)
        if am:
            acc = am.group(1)
        else:
            ls = seg.rfind('\n', 0, m.start()) + 1
            prior = ACC_ANNOT.findall(seg[ls:m.start()])
            acc = (prior[-1][0] or prior[-1][1]) if prior else ''
        # 🔴 口音优先于括号样式（2026-09-11 修正）：
        #   本词库是**英式 RP 专用**（现有 2623 条：0 条美音 oʊ、247 条英式 əʊ）。
        #   一开始把"斜杠式"排在"方括号式"前面是错的——american 那页的斜杠式是美音、
        #   英音反而是方括号，结果取回 /əˈmɛɹɪkən/ 这种美音。现在：先按口音排（英式 0 分），
        #   同口音再比括号样式（斜杠式略优）。
        if re.search(r'\b(RP|UK|GB)\b', acc):         acc_r = 0   # 明确标英式，最可信
        elif re.search(r'\b(GA|US|CA|AU|NZ)\b', acc): acc_r = 3   # 明确标非英式，最后考虑
        elif acc.strip():                             acc_r = 2   # 标了别的口音
        else:                                         acc_r = 1   # 未标口音，默认
        rank = acc_r * 10 + style
        if best is None or rank < best[0]: best = (rank, val)
    return best[1] if best else None

def pick_ipa_strict(txt):
    """只认「维基页面上明确标了英式」的那条音标，返回 (音标, 口音标注)；没有就 (None, None)。

    🔴 为什么要另开一个严格版（2026-09-11）：
       pick_ipa 是「尽量取一个，优先英式」，遇到没标口音的模板照样返回——
       结果是 12 个词里混进 5 个漏网美音（shortly /ˈʃɔrtli/、regardless /rɪˈɡɑrdlɪs/ 带卷舌 r，
       positive /ˈpɑzɪtɪv/ 用美式 ɑ，ton /tɔ̃/ 鼻化）。靠正则事后认美音**根本认不全**。
       所以纯英式词库的正确做法不是「事后挑美音」，而是**事前只收有英式出处的**：
       页面上没有 a=RP/UK/GB 标注的，这个词就宁可不收。
    """
    seg = english_section(txt)
    if not seg:
        return None, None
    best = None
    for m in re.finditer(r'\{\{IPA\|en\|([^}]*)\}\}', seg):
        body = m.group(1)
        am = re.search(r'\ba=([^|}]+)', body)
        if am:
            acc = am.group(1)
        else:
            ls = seg.rfind('\n', 0, m.start()) + 1
            prior = ACC_ANNOT.findall(seg[ls:m.start()])
            acc = (prior[-1][0] or prior[-1][1]) if prior else ''
        if not re.search(r'\b(RP|UK|GB)\b', acc):
            continue                      # 没明确标英式 → 不收
        slash = re.search(r'/([^/]+)/', body)
        brack = re.search(r'\[([^\[\]]+)\]', body)
        if slash:
            val, style = '/' + slash.group(1).replace('.', '') + '/', 0
        elif brack:
            val, style = '/' + brack.group(1).replace('.', '') + '/', 1
        else:
            continue
        rank = style
        if best is None or rank < best[0]:
            best = (rank, val, acc)
    return (best[1], best[2]) if best else (None, None)


def spelling_target(txt):
    """顺着「某某的另一种拼法」跳到真正的词条去取音标。

    🔴 colour / theatre / favour / realise / good-bye 这类词，自己的页面上**没有音标**——
        条目正文只有一句 {{standard spelling of|en|from=Commonwealth|from2=Ireland|color}}，
        发音小节只剩一个 {{audio|...}}。音标在 color 那边。
        不顺着跳，这些最常用的词就会永远显示空白音标。

    🔴 两个坑（2026-09-11 实测，favour / theatre 就是栽在这两处）：
      ① 目标词后面可能还跟着别的参数：{{standard spelling of|en|favor|from=British form}}
         老写法要求目标词紧跟 }} ，一见到尾随参数就整条匹配失败。现在改成按 | 拆参数、
         取「语言码之后第一个不含 = 的纯单词」。
      ② 模板名有缩写：theatre 用的是 {{altsp|en|...}}，老写法只认全称 altspellof。
         现在把 altsp / altform 也收进来。
    返回目标词（小写），没有就返回 None。
    """
    for m in re.finditer(r'\{\{\s*(standard spelling of|alternative spelling of|altspellof|altsp|'
                         r'alternative form of|altform)\s*\|([^}]*)\}\}', txt, re.I):
        params = [p.strip() for p in m.group(2).split('|')]
        for p in params[1:]:                       # params[0] 是语言码 en
            if not p or '=' in p:                  # 空参数、from=xx 这类具名参数都跳过
                continue
            if re.fullmatch(r"[A-Za-z][A-Za-z'’-]*", p):
                return p.lower()
    return None

def fetch_batch(batch):
    """返回 (结果dict, 失败原因)。失败原因非空表示这一批要重试、绝不可入缓存。"""
    delay = 3
    for attempt in range(6):
        try:
            d = fetch(batch)
            got = {}
            for p in d['query']['pages']:
                t = p.get('title', '').lower()
                if p.get('missing'):
                    got[t] = {'ipa': None, 'how': '页面不存在'}
                    continue
                try: txt = p['revisions'][0]['slots']['main']['content']
                except Exception: txt = ''
                got[t] = {'ipa': pick_ipa(txt), 'how': 'ok'}
            return got, None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get('Retry-After') or delay)
                print('    429 限流，等 %ds 重试（第 %d 次）' % (wait, attempt + 1), flush=True)
                time.sleep(wait); delay = min(delay * 2, 120); continue
            return None, 'HTTP %s' % e.code
        except Exception as e:
            time.sleep(delay); delay = min(delay * 2, 60)
            last = str(e)
    return None, '重试 6 次仍失败: %s' % last

todo = [w for w in WORDS if w not in cache]
print('待抓 %d 个（已缓存 %d）' % (len(todo), len(cache)), flush=True)
batches = [todo[i:i+BATCH] for i in range(0, len(todo), BATCH)]
failed = []
for n, batch in enumerate(batches, 1):
    got, err = fetch_batch(batch)
    if err:
        failed.append((n, err))
        print('  批次 %d 失败：%s（不入缓存，下次重跑会补）' % (n, err), flush=True)
    else:
        for w in batch:
            cache[w] = got.get(w) or {'ipa': None, 'how': '未返回'}
        json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)   # 每批落盘
    print('  批次 %d/%d  已抓 %d' % (n, len(batches), len(cache)), flush=True)
    time.sleep(1.2)      # 主动限速，别再把人家惹毛

json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
ok = [w for w in WORDS if cache.get(w, {}).get('ipa')]
noipa = [w for w in WORDS if w in cache and not cache[w].get('ipa')]
notyet = [w for w in WORDS if w not in cache]
print('\n拿到音标 %d / %d' % (len(ok), len(WORDS)))
print('  页面不存在或没音标模板: %d' % len(noipa))
print('  还没抓（批次失败）: %d %s' % (len(notyet), notyet[:20]))
if failed: print('  失败批次:', failed)
