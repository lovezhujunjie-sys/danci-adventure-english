# 合并「整桶映射」+「9 个子代理逐词分类」→ 每个英文词一条最终归属
#
# 🔴 关键：一个词只留一个家（老曾 2026-09-12 定：去重，凑满 5000 个真正不同的单词）。
#    但同一个词在老库里挂过多个主题、常带不同义项（answer=回答/接听、cold=冷/感冒），
#    所以去重时**不能丢义项**：中文合并成「回答；接听」一条，主题取主场景。
import json, os, glob
from collections import defaultdict, Counter

D = os.path.dirname(os.path.abspath(__file__))
old = json.load(open(D + '/vocab_old82.json', encoding='utf-8'))
fixed = json.load(open(D + '/fixed_map.json', encoding='utf-8'))
topics = json.load(open(D + '/topics29.json', encoding='utf-8'))

rec = []          # (en, cn, topic, 来源)
for k, t in fixed.items():
    for w in old[k]['words']:
        rec.append((w['en'], w['cn'], t, 'fixed:' + k))

# 子代理结果：按 en 取，批内可能已去重（同词只留一条）
sp = set()
for k in old:
    if k not in fixed:
        sp.add(k)
assigned = {}
for f in sorted(glob.glob(D + '/out/assigned_*.json')):
    assigned.update(json.load(open(f, encoding='utf-8')))
print('子代理分类条数:', len(assigned))

for k in sp:
    for w in old[k]['words']:
        t = assigned.get(w['en'])
        if t is None:
            rec.append((w['en'], w['cn'], '?MISSING?', 'unassigned:' + k))
        else:
            rec.append((w['en'], w['cn'], t, 'agent:' + k))

print('总条目:', len(rec))

# 按 en 聚合
agg = defaultdict(lambda: {'cn': [], 'topics': [], 'froms': []})
for en, cn, t, src in rec:
    a = agg[en]
    if cn not in a['cn']:
        a['cn'].append(cn)
    a['topics'].append(t)
    a['froms'].append(src)

print('唯一英文词:', len(agg))

# 归属冲突：一个词被判到多个主题
conflict = {en: v for en, v in agg.items() if len(set(v['topics'])) > 1}
print('归属有冲突的词:', len(conflict))

# 主题分布（先按「多数票 + 优先非?」定一个初步 host）
def host(v):
    ts = [t for t in v['topics'] if t in topics]
    if not ts:
        return '?'
    c = Counter(ts)
    return c.most_common(1)[0][0]

dist = Counter(host(v) for v in agg.values())
print('\n=== 29 主题词数分布（合并去重后）===')
for t in sorted(topics):
    print('%-4s %-12s %4d  %s' % (t, topics[t]['name'], dist.get(t, 0),
                                  '█' * min(60, dist.get(t, 0) // 4)))
print('未定(?):', dist.get('?', 0), ' 合计:', sum(dist.values()))

json.dump({en: {'cn': v['cn'], 'topics': v['topics'], 'froms': v['froms']}
           for en, v in agg.items()},
          open(D + '/agg.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
