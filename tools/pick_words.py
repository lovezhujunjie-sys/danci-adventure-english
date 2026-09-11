# 从字幕词频表里挑出「要补进词库的原形词」
# 判据来源：OpenSubtitles 词频(口语贴近"正常对话") + lemminflect 词形还原 + 系统韦氏词典
# 过滤链：格式 → 已在库 → 功能词(BASE_CN) → 语气词/脏话/缩写 → 人名 → 纯变形 → 非真词
import json, re, os
from lemminflect import getAllLemmas

HOME = os.path.expanduser('~')
H = open(HOME + '/.claude/skills/自学英语/index.html', encoding='utf-8').read()

def lit(name):
    i = H.index('const ' + name + ' = '); st = H.index('{', i); d = 0; j = st; inS = False; esc = False
    while j < len(H):
        c = H[j]
        if inS:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': inS = False
        else:
            if c == '"': inS = True
            elif c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: j += 1; break
        j += 1
    return eval(H[st:j])

VOCAB, BASE_CN = lit('VOCAB'), lit('BASE_CN')
have = set()
for k in VOCAB:
    for w in VOCAB[k].get('words', []):
        for t in str(w['en']).lower().split():
            t = re.sub(r"[^a-z']", '', t)
            if t: have.add(t)
base = {re.sub(r"[^a-z']", '', str(k).lower()) for k in BASE_CN}

web2 = set()
for f in ('/usr/share/dict/web2', '/usr/share/dict/web2a', '/usr/share/dict/words'):
    try:
        for ln in open(f, encoding='utf-8', errors='ignore'): web2.add(ln.strip().lower())
    except Exception: pass
names = set()
try:
    for ln in open('/usr/share/dict/propernames', encoding='utf-8', errors='ignore'): names.add(ln.strip().lower())
except Exception: pass

# 语气词 / 脏话 / 缩写 / 称呼
JUNK = set('''ah aha ahh aargh argh aw aww bah eh er hm hmm hmmm huh mm mmm mmm-hmm mm-hm
oh ooh uh um umm uh-oh uh-uh yo ow ouch oops whew whoa wow yeah yep yup nope nah
ha haha hehe hi hey hello ok okay yo sup
gonna wanna gotta dunno gimme outta kinda sorta nothin somethin goin doin talkin gettin comin lookin
damn hell crap piss bitch bastard ass shit fuck fucking fuckin fucked fucker motherfucker asshole
bullshit shitty dick whore slut nigga psycho porn bleep beep goddamn dammit jeez erm oi heh
bro fellas fella dude guys nuts
mr mrs ms dr st sr jr prof rev gen col capt sgt lt sarge
tv pc dvd cd usb gps cpu api app apps url http www com org net inc ltd corp
usa uk eu un ussr nato fbi cia nasa dna atm pin
id ids vs etc ie eg yr yrs mo wk vol no op ed pp al cf ca dc ls lf ll le ve ii ln
jan feb mar apr jun jul aug sep sept oct nov dec
ft lbs oz mph km kg cm mm ml
god jesus christ lord
mama papa mommy daddy mom dad mum mummy
ma em miranda gwen stella ned mick joel turner collins kennedy ronnie gina ellie carson chan connor jen allison gibbs watson rosie paige cameron
'''.split())

# 非韦氏词典收录、但确实是现代真词/英式拼写 → 手工放行
KEEP_EXTRA = set('''honour favour realise centre colour theatre favourite recognise e-mail cellphone
good-bye anytime meantime paperwork'''.split())

def is_inflection(w):
    lems = getAllLemmas(w)
    flat = {l for v in lems.values() for l in v}
    if flat:
        # 🔴 关键：lemminflect 会把复数自己也算作"原形"(things→thing,things)，
        # 所以判据必须是「存在任意一个不等于它自己的还原结果」
        return any(l != w for l in flat)
    # 无数据时用后缀兜底，且必须能在词典里找到词干才算
    for suf in ('ies', 'es', 's', 'ed', 'ing', 'er', 'est'):
        if len(w) > len(suf) + 1 and w.endswith(suf):
            stem = w[:-len(suf)]
            cands = [stem, stem + 'e', stem[:-1]] if len(stem) > 2 else [stem, stem + 'e']
            if suf == 'ies': cands = [stem + 'y']
            if any(c and c != w and c in web2 for c in cands): return True
    return False

# 阈值可用环境变量覆盖：清噪音后发现词数不够时要往深了扫，改环境变量即可，
# 不要另写一份过滤逻辑（过滤链只有这一份，改一处就够）
TARGET = int(os.environ.get('TARGET', 1857))   # 词库现值 3143 + 1857 = 5000
SCAN = int(os.environ.get('SCAN', 7000))       # 按词频顺序往下扫这么多，够挑出 TARGET 个
OUT = os.environ.get('OUT', '/tmp/to_add.json')
freq = [l.split()[0] for l in open('/tmp/en50k.txt', encoding='utf-8') if l.split()]
pool = [w for w in freq[:SCAN] if re.fullmatch(r"[a-z][a-z'-]*", w) and len(w) >= 2]
seen, kept = set(), []
drop = {k: [] for k in ('have', 'base', 'junk', 'name', 'infl', 'notword')}
for w in pool:
    if w in seen: continue
    seen.add(w)
    if w in have: drop['have'].append(w); continue
    if w in base: drop['base'].append(w); continue
    if w in JUNK: drop['junk'].append(w); continue
    if w in names: drop['name'].append(w); continue
    if is_inflection(w): drop['infl'].append(w); continue
    if w not in web2 and w not in KEEP_EXTRA: drop['notword'].append(w); continue
    kept.append(w)
    if len(kept) >= TARGET: break

LABEL = {'have': '词库已有', 'base': '功能词(BASE_CN已管)', 'junk': '语气词/脏话/缩写',
         'name': '人名', 'infl': '纯变形(有原形)', 'notword': '非真词/未收录'}
print('按词频顺序扫前 %d 个，补到 %d 个为止：' % (SCAN, TARGET))
for k, v in drop.items():
    print('  剔除 %-20s %4d   例: %s' % (LABEL[k], len(v), ' '.join(v[:10])))
print()
print('→ 最终要补的原形词 = %d 个' % len(kept))
print()
print('前 80 个:', ' '.join(kept[:80]))
print()
print('后 50 个:', ' '.join(kept[-50:]))
json.dump(kept, open(OUT, 'w'), ensure_ascii=False)
json.dump({k: v for k, v in drop.items()}, open('/tmp/dropped.json', 'w'), ensure_ascii=False)
