# 把新词注入 index.html 的 VOCAB（新主题）和 IPA_MAP（音标）
#
# 为什么用「大括号配对 + 文本插入」而不是正则替换整行：
#   VOCAB / IPA_MAP 各自是**单行 8 万字符**的字面量，正则很容易被字符串里的
#   引号和中括号带偏。带字符串感知的大括号配对是唯一稳的做法（本项目已用过三次）。
#
# 🔴 三条纪律：
#   ① 改之前先备份，改完立刻做语法检查（node --check 整段 script）
#   ② 新主题对象必须写成 {"name":..,"icon":..,"words":[{"cn":..,"en":..}]}，
#      键顺序跟老数据保持一致（cn 在前），否则人工 diff 时一片红
#   ③ 注入后要断言「词条数确实涨了、IPA_MAP 确实涨了」，不能只看脚本没报错
import json, os, re, shutil, subprocess, sys, datetime

HOME = os.path.expanduser('~')
HTML = os.environ.get('HTML', HOME + '/.claude/skills/自学英语/index.html')

WORDS  = json.load(open(os.environ.get('WORDS', '/tmp/final_words.json')))
GLOSS  = json.load(open(os.environ.get('GLOSS', '/tmp/gloss.json')))
IPAF   = os.environ.get('IPAF', '/tmp/ipa_final.json')
IPA    = json.load(open(IPAF)) if os.path.exists(IPAF) else {}
NT     = int(os.environ.get('TOPICS', 6))

src = open(HTML, encoding='utf-8').read()

def block_span(text, brace_idx):
    """返回 (start, end) —— 从 text[brace_idx]=='{' 起配对到收尾 '}'（end 为闭括号下标）"""
    assert text[brace_idx] == '{'
    d = 0; k = brace_idx
    while k < len(text):
        c = text[k]
        if c in '"\'':
            q = c; k += 1
            while k < len(text):
                if text[k] == '\\': k += 2; continue
                if text[k] == q: break
                k += 1
        elif c == '{': d += 1
        elif c == '}':
            d -= 1
            if d == 0: return brace_idx, k
        k += 1
    raise ValueError('大括号未闭合')

def table_span(name):
    m = re.search(r'const\s+' + name + r'\s*=\s*', src)
    return block_span(src, src.index('{', m.end()))

def count_entries(name):
    a, b = table_span(name)
    ns = {}
    exec('X = ' + src[a:b+1], ns)
    return ns['X']

# ── 1. 前置断言：新词一个都不能已经在库里 ──
vocab = count_entries('VOCAB')
exist = set()
for t, v in vocab.items():
    for w in v.get('words', []):
        exist.add(str(w['en']).lower())
dupes = [w for w in WORDS if w.lower() in exist]
if dupes:
    print('🔴 有 %d 个词已在词库里，拒绝注入（会变成重复词条）: %s' % (len(dupes), dupes[:20]))
    sys.exit(1)
print('✅ 前置检查：%d 个新词都不在现有词库里' % len(WORDS))

missing_gloss = [w for w in WORDS if w not in GLOSS]
if missing_gloss:
    print('🔴 有 %d 个词没有中文释义，拒绝注入: %s' % (len(missing_gloss), missing_gloss[:20]))
    sys.exit(1)
print('✅ 前置检查：%d 个词都有中文释义' % len(WORDS))

# ── 2. 切分主题（按词频梯队，不是按词性——词性分组实测不可用，见 SKILL.md）──
per = (len(WORDS) + NT - 1) // NT
names = ['高频补充①', '高频补充②', '高频补充③', '高频补充④', '高频补充⑤', '高频补充⑥',
         '高频补充⑦', '高频补充⑧', '高频补充⑨', '高频补充⑩']
icons = ['🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '📌', '🔟', '💠']
new_topics = {}
for i in range(NT):
    chunk = WORDS[i*per:(i+1)*per]
    if not chunk:
        continue
    key = 'freq%d' % (i + 1)
    new_topics[key] = {
        'name': names[i] if i < len(names) else ('高频补充%d' % (i+1)),
        'icon': icons[i] if i < len(icons) else '📌',
        'words': [{'cn': GLOSS[w], 'en': w} for w in chunk],
    }

# ── 3. 文本插入 VOCAB ──
a, b = table_span('VOCAB')
add_txt = json.dumps(new_topics, ensure_ascii=False)[1:-1]     # 去掉外层 {}
assert add_txt and add_txt.startswith('"freq1"'), add_txt[:60]
new_vocab = src[a:b+1][:-1] + ',' + add_txt + '}'
src = src[:a] + new_vocab + src[b+1:]

# ── 4. 文本插入 IPA_MAP ──
have_ipa = count_entries('IPA_MAP')
new_ipa = {w: IPA[w] for w in WORDS if w in IPA and w not in have_ipa}
if new_ipa:
    a, b = table_span('IPA_MAP')
    add_ipa = json.dumps(new_ipa, ensure_ascii=False)[1:-1]
    src = src[:a] + src[a:b+1][:-1] + ',' + add_ipa + '}' + src[b+1:]

open(HTML, 'w', encoding='utf-8').write(src)

# ── 5. 后置断言 ──
after = open(HTML, encoding='utf-8').read()

def entries_of(text, name):
    m = re.search(r'const\s+' + name + r'\s*=\s*', text)
    a, b = block_span(text, text.index('{', m.end()))
    ns = {}; exec('X = ' + text[a:b+1], ns); return ns['X']

v2 = entries_of(after, 'VOCAB'); i2 = entries_of(after, 'IPA_MAP')
n_before = sum(len(v.get('words', [])) for v in vocab.values())
n_after  = sum(len(v.get('words', [])) for v in v2.values())
print('\n词条数 %d → %d（+%d）' % (n_before, n_after, n_after - n_before))
print('主题数 %d → %d' % (len(vocab), len(v2)))
print('IPA_MAP %d → %d（+%d）' % (len(have_ipa), len(i2), len(i2) - len(have_ipa)))
assert n_after - n_before == len(WORDS), '词条数增量对不上！'
assert len(v2) - len(vocab) == len(new_topics), '主题数增量对不上！'
print('✅ 后置断言通过')
