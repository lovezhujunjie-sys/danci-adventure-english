# 把 vocab_final.json / ipa_final.json 写进 index.html
#
# 🔴 铁律：只替换 `const VOCAB = {...}` 和 `const IPA_MAP = {...}` 两个字面量，
#    别的一个字节都不动。这两个字面量各自占一整行（第 2023、2025 行），
#    用「字符串感知的大括号配对」定位结尾，不用正则 —— VOCAB 是一行 13 万字符，
#    正则的回溯能把内存吃满，而且 `{"cn":"人"}` 这种嵌套引号正则也数不清。
#
# 🔴 为什么不能用 json.dumps 直接生成整行：老库的写法是 `{"cn": "人", "en": "person"}`
#    （冒号后有空格），json.dumps 默认不带空格。全库 5000 条会变成一次无意义的
#    全文件 diff，review 时看不出真正改了什么。所以照老写法手工拼。
import json, os, re, shutil, sys

D = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(D))
IDX = SKILL + '/index.html'

vocab = json.load(open(D + '/vocab_final.json', encoding='utf-8'))
ipa = json.load(open(D + '/ipa_final.json', encoding='utf-8'))
share = json.load(open(D + '/star_share.json', encoding='utf-8'))

H = open(IDX, encoding='utf-8').read()
orig = H


def lit_span(src, name):
    """定位 `const NAME = {...};` 里那个 {...} 的起止下标"""
    m = re.search(r'const ' + name + r'\s*=\s*', src)
    if not m:
        raise SystemExit('找不到 const %s' % name)
    st = src.index('{', m.end())
    dep, j, inS, esc = 0, st, False, False
    while j < len(src):
        c = src[j]
        if inS:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': inS = False
        else:
            if c == '"': inS = True
            elif c == '{': dep += 1
            elif c == '}':
                dep -= 1
                if dep == 0:
                    return st, j
        j += 1
    raise SystemExit('const %s 的大括号没配对' % name)


def dump_vocab(v):
    parts = []
    for t, d in v.items():
        ws = ','.join('{"cn": "%s", "en": "%s"}' % (w['cn'], w['en']) for w in d['words'])
        parts.append('"%s":{"name":"%s","icon":"%s","words":[%s]}' % (t, d['name'], d['icon'], ws))
    return '{' + ','.join(parts) + '}'


def dump_map(m):
    return '{' + ','.join('"%s":"%s"' % (k, v) for k, v in m.items()) + '}'


new_vocab = 'const VOCAB = ' + dump_vocab(vocab) + ';'
new_ipa = 'const IPA_MAP = ' + dump_map(ipa) + ';'

# 从后往前替换，避免前一次替换改变后面字面量的下标
for name, newtext in (('IPA_MAP', new_ipa), ('VOCAB', new_vocab)):
    st, en = lit_span(H, name)
    line_st = H.rfind('\n', 0, st) + 1
    line_end = H.find('\n', en)
    assert H[line_st:st].endswith('= '), 'VOCAB/IPA_MAP 不再是独占一行，别硬替'
    H = H[:line_st] + newtext + H[line_end:]

print('VOCAB 替换: %d 字符 → %d 字符' % (orig.count('\n'), H.count('\n')))
open(IDX, 'w', encoding='utf-8').write(H)

# 硬校验：重读一遍，确认能被 JS 解析出正确的结构
H2 = open(IDX, encoding='utf-8').read()
assert H2 == H, '写回后内容不一致'
for name in ('VOCAB', 'IPA_MAP'):
    st, en = lit_span(H2, name)
    obj = json.loads(H2[st:en + 1])          # 是严格 JSON，能直接 json.loads
    print('%s: %d 个键' % (name, len(obj)))
st, en = lit_span(H2, 'VOCAB')
V = json.loads(H2[st:en + 1])
n = sum(len(d['words']) for d in V.values())
print('VOCAB 词数:', n, '| 主题数:', len(V))
assert n == 5000 and len(V) == 29
st, en = lit_span(H2, 'IPA_MAP')
assert len(json.loads(H2[st:en + 1])) == len(ipa)
print('✅ index.html 已写入')
