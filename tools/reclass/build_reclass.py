#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「高频补充①~⑩」10 个无语义主题，重构成按词义命名的主题（2026-09-11 老曾要求）。

做法：
  1. 读 index.html 里的 VOCAB（第 2023 行那一整行）
  2. 读 5 个子代理产出的 out_*.json（{英文: 主题key}）
  3. 逐词搬进新主题；命中现有主题 key 的，追加进那个现有主题
  4. 校验：1857 个词一个不丢、总数仍是 5000、JSON 合法、无同主题内重复
  5. 写回 index.html（只替换 VOCAB 那一行）+ 打印统计

用法：
  python3 tools/reclass/build_reclass.py          # 演练，只打印
  python3 tools/reclass/build_reclass.py --write  # 真写
"""
import json, re, sys, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
INDEX = os.path.join(ROOT, 'index.html')

# ── 新主题定义：key -> (中文名, icon, 顺序) ───────────────────────────
# 顺序 = 追加到 41 个现有主题之后的显示顺序（语义相近的挨着放）
NEW_TOPICS = [
    ('address',  '称呼与身边人', '🫂'),
    ('mood',     '情绪与心境',   '😤'),
    ('traits',   '性格与为人',   '🎭'),
    ('think',    '思考与判断',   '🤔'),
    ('talk',     '说话与争论',   '🗣️'),
    ('mind',     '心智与感知',   '🧠'),
    ('degree',   '程度与语气',   '📊'),
    ('link',     '连接与逻辑',   '🔀'),
    ('pronoun',  '代词与反身',   '🙋'),
    ('crime',    '罪案与警察',   '🚨'),
    ('court',    '法庭与审判',   '⚖️'),
    ('war',      '战争与军队',   '⚔️'),
    ('royal',    '王室与贵族',   '👑'),
    ('politics', '政治与国家',   '🏛️'),
    ('nation',   '国籍与民族',   '🌐'),
    ('belief',   '宗教与信仰',   '😇'),
    ('myth',     '神话与魔法',   '🐉'),
    ('death',    '死亡与葬礼',   '⚰️'),
    ('science',  '科学与宇宙',   '🔬'),
    ('trade',    '买卖与交易',   '💵'),
    ('biz',      '公司与职场',   '🏢'),
    ('place',    '建筑与场所',   '🏘️'),
    ('story',    '故事与影视',   '📖'),
    ('misc',     '其他口语词',   '🧩'),
]
NEW_KEYS = [k for k, _, _ in NEW_TOPICS]
NEW_META = {k: (n, ic) for k, n, ic in NEW_TOPICS}

# 子代理可能写出的近似 key → 真实 key（TAXONOMY 里我自己把 sports 写成了 sport）
ALIAS = {
    'sport': 'sports',
    'clothes': 'clothing',
    'cloth': 'clothing',
    'food_drink': 'food',
    'body_parts': 'body',
    'nature_env': 'nature',
    'animal_world': 'animal',
    'music': 'music_art',
    'art': 'music_art',
    'house_items': 'house',
    'transportation': 'transport',
    'jobs': 'job',
    'city_place': 'city',
    'abstract_concept': 'abstract',
    'emotion_mood': 'mood',
    'family2': 'family',
    'money_trade': 'trade',
    'business': 'biz',
    'company': 'biz',
    'disease': 'health',
    'illness': 'health',
    'medicine': 'health',
}

# 二级聚类（子代理自由命名）→ 主题 key
REDO_ADJ_KEY = {
    '赞美与出色': 'adj_praise',
    '糟糕与讨厌': 'adj_bad',
    '大小与程度': 'adj_size',
    '重要与难易': 'adj_key',
    '确定与异同': 'adj_certain',
    '常见与稀奇': 'adj_common',
    '时间与先后': 'adj_time',
    '安危与状态': 'adj_state',
    '方位与内外': 'adj_direction',
    '性格与身份': 'traits',        # 与新建的「性格与品性」同义，合并
}
REDO_VERB_KEY = {
    '手部拿放': 'verb_hand',
    '敲打与损毁': 'verb_break',
    '移动与摇晃': 'verb_move',
    '流动与喷洒': 'verb_flow',
    '看与表现': 'verb_show',
    '相处与配合': 'verb_together',
    '阻挡与停止': 'verb_stop',
    '存在与归属': 'verb_exist',
    '操作与办理': 'verb_operate',
}

# 与现有主题撞车的 emoji 换掉（🧭 已被「方位空间」占、🏃 已被「基础动词」占）
ICON_OVERRIDE = {
    'adj_direction': '📐',
    'verb_move': '🚶',
    'verb_exist': '🌱',
}


def load_vocab(src):
    m = re.search(r'^const VOCAB = (.*);$', src, re.M)
    if not m:
        sys.exit('❌ 没找到 VOCAB 行')
    return json.loads(m.group(1)), m


def main():
    src = open(INDEX, encoding='utf-8').read()
    vocab, m = load_vocab(src)
    ORIG_TOTAL = sum(len(v['words']) for v in vocab.values())

    existing_keys = [k for k in vocab if not k.startswith('freq')]
    print(f'现有非 freq 主题：{len(existing_keys)} 个，原总词数 {ORIG_TOTAL}')

    # ── 收分类结果 ──
    assign = {}
    for fn in ['out_1_2.json', 'out_3_4.json', 'out_5_6.json', 'out_7_8.json', 'out_9_10.json']:
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            sys.exit(f'❌ 缺文件 {fn}')
        d = json.load(open(p, encoding='utf-8'))
        dup = set(d) & set(assign)
        if dup:
            print(f'⚠️ {fn} 与前面重复 {len(dup)} 个词，以先到为准')
        for k, v in d.items():
            assign.setdefault(k, ALIAS.get(v, v))
    print(f'分类结果：{len(assign)} 个词')

    # ── 二级聚类：形容词 / 动词再细分（redo_*.json，组名 → 新主题）──
    redo_topics = collections.OrderedDict()      # key -> (名字, icon, [词…])
    for fn, keymap in (('redo_adj.json', REDO_ADJ_KEY), ('redo_verb.json', REDO_VERB_KEY)):
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            continue
        for gname, g in json.load(open(p, encoding='utf-8')).items():
            k = keymap.get(gname)
            if not k:
                sys.exit(f'❌ 组名「{gname}」还没配 key，去 REDO_ADJ_KEY / REDO_VERB_KEY 里补')
            redo_topics[k] = (gname, ICON_OVERRIDE.get(k, g['icon']), g['words'])
    redo_of = {}
    for k, (_, _, ws) in redo_topics.items():
        for w in ws:
            if w in redo_of:
                print(f'⚠️ {w} 在二级聚类里出现两次（{redo_of[w]} / {k}），以先到为准')
            redo_of.setdefault(w, k)

    # 杂项桶的逐词重新分派（覆盖一级结果）
    p = os.path.join(HERE, 'redo_misc.json')
    if os.path.exists(p):
        for w, k in json.load(open(p, encoding='utf-8')).items():
            assign[w] = ALIAS.get(k, k)
        print(f'杂项重分派：{len(json.load(open(p, encoding="utf-8")))} 个词')

    # ── 逐词搬 ──
    freq_words = []           # [(词dict, 原组号)]
    for i in range(1, 11):
        for w in vocab[f'freq{i}']['words']:
            freq_words.append((w, i))

    missing = [w['en'] for w, _ in freq_words if w['en'] not in assign]
    if missing:
        sys.exit(f'❌ 有 {len(missing)} 个词没被分类：{missing[:20]}')
    extra = set(assign) - {w['en'] for w, _ in freq_words}
    if extra:
        print(f'⚠️ 分类结果里有 {len(extra)} 个不属于 freq 的词，已忽略：{list(extra)[:10]}')

    all_new_order = NEW_KEYS + [k for k in redo_topics if k not in NEW_META]
    buckets = collections.OrderedDict((k, []) for k in all_new_order)
    merged_into_existing = collections.Counter()
    bad_keys = collections.Counter()

    for w, grp in freq_words:
        key = redo_of.get(w['en'], assign[w['en']])
        if key in NEW_META or key in redo_topics:
            buckets[key].append(w)
        elif key in vocab and not key.startswith('freq'):
            vocab[key]['words'].append(w)          # 并入现有主题
            merged_into_existing[key] += 1
        else:
            bad_keys[key] += 1
            buckets['misc'].append(w)

    if bad_keys:
        print(f'⚠️ 无法识别的主题 key（已兜进 misc）：{dict(bad_keys)}')

    # ── 组装新 VOCAB：41 个现有主题原样 + 新主题（去掉空的）──
    new_vocab = collections.OrderedDict()
    for k in existing_keys:
        new_vocab[k] = vocab[k]
    for k in all_new_order:
        if not buckets[k]:
            continue
        name, icon = NEW_META[k] if k in NEW_META else redo_topics[k][:2]
        new_vocab[k] = {'name': name, 'icon': icon, 'words': buckets[k]}

    # ── 校验 ──
    total = sum(len(v['words']) for v in new_vocab.values())
    print('\n===== 新主题分布 =====')
    for k in all_new_order:
        if buckets[k]:
            nm, ic = NEW_META[k] if k in NEW_META else redo_topics[k][:2]
            print(f"  {ic} {nm:<10s} {len(buckets[k]):>4d} 词  [{k}]")
    if merged_into_existing:
        print('\n===== 并入现有主题 =====')
        for k, n in merged_into_existing.most_common():
            print(f"  {vocab[k]['icon']} {vocab[k]['name']:<8s} +{n} 词 → 共 {len(vocab[k]['words'])} 词")

    print(f'\n主题数：51 → {len(new_vocab)}')
    print(f'总词数：{ORIG_TOTAL} → {total}')

    # 同主题内重复检查
    for k, v in new_vocab.items():
        seen, dup = set(), []
        for w in v['words']:
            if w['en'] in seen:
                dup.append(w['en'])
            seen.add(w['en'])
        if dup:
            print(f'  ⚠️ {k} 同主题内重复 {len(dup)} 个：{dup[:8]}')

    if total != 5000:
        print(f'  🔴 总词数不是 5000（{total}）—— 检查是否漏词')

    if '--write' not in sys.argv:
        print('\n（演练模式，未写文件；加 --write 才真写）')
        return

    line = 'const VOCAB = ' + json.dumps(new_vocab, ensure_ascii=False, separators=(',', ':')) + ';'
    src2 = src[:m.start()] + line + src[m.end():]
    open(INDEX, 'w', encoding='utf-8').write(src2)
    print(f'\n✅ 已写回 {INDEX}')
    print(f'   行长度 {len(m.group(0))} → {len(line)}')


if __name__ == '__main__':
    main()
