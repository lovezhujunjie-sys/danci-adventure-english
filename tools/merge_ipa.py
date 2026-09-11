# 合并两版音标缓存，逐词取「口音更纯」的那个值。
#
# 🔴 为什么会有两版（2026-09-11）：
#   v1 = 老提取器逐批抓的，中间靠 fix_missing_ipa 补过大写页/跳转页的词。
#   v2 = pick_ipa 修好「口音标注挂在前面 enPR 模板上」这个 bug 之后**全量重抓**的，
#        口音判断可信，但只查小写页面（所以 22 个需要大写/跳转的词它拿不到）。
#   v3 = 再修两处之后重抓的（refetch_v3.py）：① 口音参数 a= 改成**按位置**取，
#        ② 词源截断（ton 原来取到 Etymology 2 的鼻化 /tɔ̃/）。
#   各版各有长处，所以合并不是二选一，是逐词比。
#
# 用法：A=旧缓存 B=新缓存 OUT=输出 python3 merge_ipa.py
#       默认 A=/tmp/ipa_cache_merged.json B=/tmp/ipa_cache_v3.json OUT=/tmp/ipa_cache_best.json
#       取 B（更晚、提取器更准）优先；B 不干净才回头看 A。
#
# 🔴 判「干不干净」的规则只许有一份，且必须校准过（2026-09-11 再修）：
#    这里原来自己写 GA = [ɚɝ]|oʊ，只能抓三个字面量。treasure=/ˈtreʒər/、
#    shortly=/ˈʃɔrtli/、prosecutor=/ˈprɑsəˌkjuːˌtər/ 一个都不含却是不折不扣的
#    儿化 / 短 ɑ，整条溜过闸门。跟 build_final、verify_final 是同一个漏，
#    所以在三处都改成切 normalize_ipa.py 的真身——那套规则已在应用自有 3082 条
#    已知正确的英式音标上校准到零误报。
#
# 🔴 判之前必须先把记号统一做完（2026-09-11 踩过）：
#    检测函数找的是「元音 + r」，而维基原值是「元音 + ɹ」（/ˈtreʒəɹ/）。
#    不先统一记号，词尾裸 r 这条规则就完全看不见美式儿化。
import json, os, re

TOOLS = os.path.expanduser('~') + '/.claude/skills/自学英语/tools'
A = os.environ.get('A', '/tmp/ipa_cache_merged.json')
B = os.environ.get('B', '/tmp/ipa_cache_v3.json')
OUT = os.environ.get('OUT', '/tmp/ipa_cache_best.json')
FINAL = json.load(open('/tmp/final_words.json'))

_ns = {'re': re, 'json': json, 'os': os}
_src = open(TOOLS + '/normalize_ipa.py', encoding='utf-8').read()
exec(_src[_src.index('SUBST = {'):_src.index('# ══════════ 自检')], _ns)
normalize, check_ga = _ns['normalize'], _ns['check_ga']

BARE_U = re.compile(r'(?<!j)u(?!ː)(?=$|/)')

# 🔴 极少数词，维基的模板里**列了多个都无口音标注的变体**，提取器只能取第一个，
#    而已有的写法习惯取的是另一个。这里逐条记下「为什么换」，不是凭感觉改音标——
#    换过去的那个值**同样出自维基同一个模板**，只是另一个变体。
OVERRIDE = {
    # {{IPA|en|/ˈnoɪ̯z/|/ˈnɔɪ̯z/}} —— 取第二个。
    # 自有 3082 条里 ɔɪ 出现 27 次、oɪ 出现 0 次，本词库一律写 ɔɪ。
    'noise': ('/ˈnɔɪz/', '维基同模板第二变体（本词库一律写 ɔɪ，不写 oɪ）'),
}


def is_ga(v, w=''):
    if not v:
        return True
    s = normalize(v, w)
    if check_ga(s):
        return True
    if re.search(r'[ɑɜ](?!ː)', s):
        return True
    return bool(BARE_U.search(s))


a_cache = json.load(open(A))
b_cache = json.load(open(B))

# 🔴 合并的是**并集**，不是 FINAL（2026-09-11 踩过）：
#    只遍历 FINAL 会把「回填缓冲词」的音标一起丢掉——那些词当时还没进 FINAL，
#    等 build_final 需要回填时才发现池子是空的。抓过的音标一个都不能丢。
ALL = sorted(set(FINAL) | set(a_cache) | set(b_cache))
merged, stats = {}, {'b': 0, 'a': 0, 'b_dirty': 0, 'none': 0, 'ovr': 0}
for w in ALL:
    va = normalize((a_cache.get(w) or {}).get('ipa') or '', w)
    vb = normalize((b_cache.get(w) or {}).get('ipa') or '', w)
    if w in OVERRIDE:
        v, why = OVERRIDE[w]
        merged[w] = {'ipa': v, 'how': '人工选值：' + why}; stats['ovr'] += 1
        continue
    if vb and not is_ga(vb, w):
        merged[w] = {'ipa': vb, 'how': 'B（提取器更准：口音按位置取 + 词源截断）'}; stats['b'] += 1
    elif va and not is_ga(va, w):
        merged[w] = {'ipa': va, 'how': 'A（B 取到的更脏，回退旧值）'}; stats['a'] += 1
    elif vb:
        # 两边都不干净 → 照原样留着，让 build_final 按硬门槛跳过并**打印出是谁**
        merged[w] = {'ipa': vb, 'how': '两版都带美音，留给 build_final 跳过'}; stats['b_dirty'] += 1
    elif va:
        merged[w] = {'ipa': va, 'how': '两版都带美音，留给 build_final 跳过'}; stats['b_dirty'] += 1
    else:
        merged[w] = {'ipa': None, 'how': '两版都没有'}; stats['none'] += 1

print('逐词择优：取 B %d | 回退取 A %d | 人工选值 %d | 都脏（留给 build_final 跳）%d | 都没有 %d'
      % (stats['b'], stats['a'], stats['ovr'], stats['b_dirty'], stats['none']))

json.dump(merged, open(OUT, 'w'), ensure_ascii=False)

# ── 复核 ──
have = [w for w in FINAL if merged.get(w, {}).get('ipa')]
ga = [w for w in have if is_ga(merged[w]['ipa'], w)]
print('\nFINAL 有音标 %d / %d' % (len(have), len(FINAL)))
print('FINAL 仍是脏音标 %d 个（build_final 会跳过并由后面的词顶上）:' % len(ga))
for w in ga:
    print('   %-16s %-24s %s' % (w, merged[w]['ipa'], '；'.join(check_ga(normalize(merged[w]['ipa'], w))) or '长音号/裸 u'))
print('FINAL 缺音标 %d 个: %s' % (len(FINAL) - len(have),
      ' '.join(w for w in FINAL if not merged.get(w, {}).get('ipa'))))
buf = [w for w in ALL if w not in set(FINAL)]
print('回填缓冲（并集多出来的）%d 个，其中带音标 %d 个'
      % (len(buf), sum(1 for w in buf if merged[w]['ipa'])))
print('\n已写入 %s' % OUT)
