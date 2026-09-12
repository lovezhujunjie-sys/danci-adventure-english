# 把「必须逐词重新判断归属」的混杂桶切成批次，供子代理分类
#
# 为什么要逐词分而不是整桶搬：tech/abstract/daily/adj_*/verb_* 这些桶本身就是
# 老曾说的「乱」的来源 —— tech 一个桶里塞着硬件、软件、上网、电商、AI、黑客；
# adj_basic 一个桶里塞着温度、性格、尺寸、评价。整桶搬到新主题 = 把乱搬个地方。
import json, os

D = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(D + '/vocab_old82.json', encoding='utf-8'))

# 需要逐词重分的桶
SPLIT = ['daily', 'tech', 'abstract', 'adj_basic',
         'verb_basic', 'common_verb_advanced', 'verb_hand', 'verb_break',
         'verb_move', 'verb_flow', 'verb_show', 'verb_together',
         'verb_stop', 'verb_exist', 'verb_operate']

words = []
for k in SPLIT:
    for w in d[k]['words']:
        words.append({'en': w['en'], 'cn': w['cn'], 'from': k})
print('待重分词数:', len(words))

os.makedirs(D + '/batches', exist_ok=True)
BATCH = 176
n = 0
for i in range(0, len(words), BATCH):
    n += 1
    chunk = words[i:i + BATCH]
    json.dump(chunk, open(D + '/batches/batch_%02d.json' % n, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
print('生成批次数:', n)

# 整桶映射：不在 SPLIT 里的桶 → 新主题。用于校验「5000 词一个不少」
FIXED = {
    'people': 'T01', 'family': 'T01', 'address': 'T01',
    'social': 'T02', 'politics': 'T02', 'nation': 'T02',
    'body': 'T03', 'appearance': 'T03', 'health': 'T04',
    'emotion': 'T05', 'mood': 'T05', 'traits': 'T05',
    'think': 'T06', 'mind': 'T06', 'talk': 'T07', 'phrases': 'T07',
    'food': 'T08', 'fruit_veg': 'T08', 'dining': 'T08', 'cooking': 'T08',
    'house': 'T09', 'clothing': 'T10',
    'animal': 'T11', 'nature': 'T11', 'weather': 'T11',
    'science': 'T12', 'transport': 'T13', 'travel': 'T13',
    'city': 'T14', 'place': 'T14', 'direction': 'T14', 'adj_direction': 'T14',
    'school': 'T17', 'job': 'T18', 'biz': 'T18',
    'shopping': 'T19', 'trade': 'T19', 'money': 'T19',
    'appops': 'T20', 'streaming': 'T21',
    'entertainment': 'T22', 'music_art': 'T22', 'sports': 'T22', 'story': 'T22',
    'time': 'T23', 'adj_time': 'T23',
    'number': 'T24', 'color_shape': 'T24', 'adj_size': 'T24',
    'crime': 'T25', 'court': 'T25', 'war': 'T25',
    'belief': 'T26', 'myth': 'T26', 'death': 'T26', 'royal': 'T26', 'festival': 'T26',
    'adj_praise': 'T27', 'adj_bad': 'T27',
    'adj_key': 'T28', 'adj_certain': 'T28', 'adj_common': 'T28', 'adj_state': 'T28',
    'degree': 'T28',
    'function_words': 'T29', 'pronoun': 'T29', 'link': 'T29',
}
missing = [k for k in d if k not in FIXED and k not in SPLIT]
assert not missing, '有桶既没整搬也没进重分名单: %s' % missing
fixed_n = sum(len(d[k]['words']) for k in FIXED)
print('整桶搬走词数:', fixed_n, '| 整桶主题数:', len(FIXED))
print('校验:', fixed_n + len(words), '（应等于 5000）')
json.dump(FIXED, open(D + '/fixed_map.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
