# 从 ECDICT（简明英汉增强版 stardict）里取新词的音标和中文释义
#
# 🔴 为什么自己解析 stardict 而不找 CSV：ECDICT 的 csv 分发链接全 404/403，
#    release 里只有 stardict 二进制包（70MB）。好在 .ifo 写明 sametypesequence=m
#    （纯文本、无类型字节），2.4.2 版用 32 位 offset，解析规则很固定：
#    .idx 每项 = word\0 + offset(4B 大端) + size(4B 大端)，按序读到 .dict 里切。
import json, os, re, struct

D = os.path.dirname(os.path.abspath(__file__))
SD = '/tmp/stardict-ecdict-2.4.2/stardict-ecdict-2.4.2'
need = {w['en'] for w in json.load(open(D + '/new_words_raw.json', encoding='utf-8'))}
print('需要查的词:', len(need))

idx = open(SD + '.idx', 'rb').read()
found, i, n = {}, 0, len(idx)
while i < n:
    j = idx.index(b'\0', i)
    w = idx[i:j].decode('utf-8', 'ignore').strip().lower()
    off, size = struct.unpack('>II', idx[j + 1:j + 9])
    if w in need and w not in found:
        found[w] = (off, size)
    i = j + 9
print('ECDICT 命中:', len(found), '/', len(need))

dic = open(SD + '.dict', 'rb')
raw = {}
for w, (off, size) in found.items():
    dic.seek(off)
    raw[w] = dic.read(size).decode('utf-8', 'ignore')

POS = re.compile(r'(?:^|[\s;；])(n|v|vt|vi|a|ad|adj|adv|prep|conj|pron|num|art|int|aux|abbr|pl)\.\s*')

def clean(txt):
    """ECDICT 的 translation → 库里的风格：纯中文、无词性前缀、多义项用「；」"""
    t = txt.strip()
    t = re.sub(r'\\n', '\n', t)
    lines = [l.strip() for l in t.split('\n') if l.strip()]
    # 优先取「中文释义」段落（.dict 里 definition 是英文，translation 是中文）
    out = []
    for l in lines:
        if not re.search(r'[一-鿿]', l):      # 没有汉字 → 是英文原文，跳过
            continue
        l = re.sub(r'^\s*\[[^\]]*\]\s*', '', l)   # 行首的 [化]/[医] 等学科标签
        l = POS.sub(' ', l)                        # 词性前缀（ECDICT 形容词写 "a." 不是 "adj."）
        l = POS.sub(' ', l)                        # 行内可能多处，再扫一遍
        for piece in re.split(r'[，,;；、]', l):
            piece = piece.strip(' .．。')
            # 括号里的补充说明（「（等于hamburger）」「(高宝 8084/8011)」）一律去掉：
            # ECDICT 把考试标签和词频数也塞在括号里，不去掉会被当成第二个义项
            piece = re.sub(r'[（(][^）)]*[）)]', '', piece).strip(' .．。')
            if not piece or not re.search(r'[一-鿿]', piece):
                continue
            if re.search(r'\d', piece) or re.search(r'[A-Za-z]', piece):
                continue      # 含数字/字母 → 是词频标记或英文残留，不是释义
            out.append(piece)
    # 去重保序（含子串包含：'疼痛' 与 '痛'、'形容词' 与 '形容词的' 算同一个）
    res = []
    for p in out:
        if any(p in r or r in p for r in res):
            continue
        res.append(p)
        if len(res) >= 2:
            break
    return '；'.join(res)

res = {}
for w, txt in raw.items():
    cn = clean(txt)
    if cn:
        res[w] = cn
missing = sorted(need - set(res))
print('拿到中文释义:', len(res), ' 缺:', len(missing))
if missing:
    print('缺例:', missing[:20])
json.dump(res, open(D + '/ecdict_cn.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 存一份原始文本，缺释义时人工看
json.dump({w: raw[w][:400] for w in missing}, open(D + '/ecdict_missing_raw.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
