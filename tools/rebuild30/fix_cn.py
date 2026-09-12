# 人工修正 ECDICT 释义里的错误
#
# 🔴 为什么要人工过一遍（2026-09-12）：ECDICT 是机器从多本词典拼的，520 条里
#    挑出约 90 条不对，典型三类：
#    ① 义项顺序反了（bulb 给「球茎；电灯泡」，日常先说电灯泡）
#    ② 冷僻义/错误义当第二义项（ape「无应用程式评价」、beaver「轻型及中型飞机加油」、
#       teen 直接给「愤怒；悲哀」—— teen 是 teenager 的口语缩写，这是彻底错）
#    ③ 繁简/错字（想像、剩于）
#    这不是可以自动判的，只能人看。改完的这份是本轮词库释义的真源。
import json, os

D = os.path.dirname(os.path.abspath(__file__))
cn = json.load(open(D + '/ecdict_cn.json', encoding='utf-8'))

CORRECTIONS = {
    'ache': '疼痛', 'adjective': '形容词', 'ape': '猿猴', 'arise': '出现；发生',
    'batch': '一批；批量', 'beaver': '海狸', 'bulb': '电灯泡；球茎',
    'businesswoman': '女商人', 'caller': '来电者；访客', 'cassette': '盒式磁带',
    'christian': '基督徒', 'clone': '克隆；复制品', 'consist': '由……组成',
    'cooker': '炉灶；炊具', 'crow': '乌鸦', 'definition': '定义', 'diaper': '尿布',
    'dusty': '布满灰尘的', 'elderly': '年长的', 'embarrassment': '尴尬；难堪',
    'establishment': '建立；机构', 'excess': '过度；过量', 'extinct': '灭绝的',
    'fare': '车费；票价', 'firmly': '坚定地', 'freshman': '大一新生', 'gender': '性别',
    'glance': '一瞥', 'globe': '地球；球体', 'gown': '长袍；礼服', 'gravy': '肉汁',
    'guy': '家伙；人', 'harness': '马具', 'haunt': '常去的地方；萦绕', 'hazard': '危险',
    'hunter': '猎人', 'insect': '昆虫', 'insight': '洞察力',
    'interviewer': '面试官；采访者', 'invade': '入侵', 'jumper': '跳跃者；毛衣',
    'kettle': '水壶', 'kitten': '小猫', 'layer': '层', 'laziness': '懒惰',
    'major': '主要的；专业', 'make-up': '化妆；构成', 'maker': '制造者',
    'melon': '甜瓜', 'mend': '修补', 'motivation': '动机', 'mug': '马克杯',
    'mule': '骡子', 'nationality': '国籍', 'neutral': '中立的', 'newly': '新近；最近',
    "o'clock": '点钟', 'olympic': '奥林匹克的', 'organic': '有机的',
    'overweight': '超重的', 'permanently': '永久地', 'phantom': '幻影',
    'playful': '好玩的；爱玩的', 'plural': '复数', 'primitive': '原始的',
    'progressive': '进步的', 'publicly': '公开地', 'punctuation': '标点符号',
    'rail': '铁轨；栏杆', 'reef': '暗礁', 'refer': '提到；参考',
    'regularly': '定期地；经常', 'reject': '拒绝', 'relate': '关联；讲述',
    'resident': '居民', 'robin': '知更鸟', 'roundabout': '环岛；迂回的',
    'runaway': '逃跑的', 'scold': '责骂', 'severely': '严重地；严厉地',
    'shallow': '浅的', 'singular': '单数的', 'slavery': '奴隶制', 'slot': '狭槽；时段',
    'sock': '短袜', 'stressful': '压力大的', 'substantial': '大量的；实质的',
    'substitute': '代替；替代品', 'successfully': '成功地', 'summit': '顶峰；峰会',
    'superlative': '最高的', 'supportive': '支持的', 'supposedly': '据说',
    'survey': '调查；测量', 'teen': '青少年', 'teller': '出纳员；讲述者',
    'thorough': '彻底的', 'tram': '有轨电车', 'transformation': '转变',
    'underline': '在……下面划线', 'wax': '蜡', 'weekday': '工作日',
    'whichever': '无论哪个', 'imaginary': '想象的；虚构的', 'calf': '小牛；小腿',
    'chart': '图表', 'craft': '技艺；手艺', 'declaration': '宣告；申报',
    'define': '定义；界定', 'definite': '明确的', 'delight': '高兴；愉快',
    'essence': '实质；本质', 'fade': '褪色；消失', 'flock': '兽群；鸟群',
    'fright': '惊骇；惊吓', 'gap': '缝隙；缺口', 'grant': '授予；补助金',
    'heel': '脚后跟', 'herd': '兽群；人群', 'horizon': '地平线；眼界',
    'kilo': '公斤；千米', 'kit': '装备；工具箱', 'limp': '跛行；柔软的',
    'loaf': '一条面包', 'mild': '温和的', 'mineral': '矿物', 'moss': '苔藓',
    'motto': '箴言；座右铭', 'mule_': None, 'mustard': '芥末', 'noun': '名词',
    'penny': '便士', 'petrol': '汽油', 'phenomenon': '现象',
    'philosopher': '哲学家', 'pilgrim': '朝圣者', 'plastic': '塑料',
    'poisonous': '有毒的', 'politician': '政治家；政客', 'pollute': '污染',
    'possess': '拥有；持有', 'poster': '海报', 'prediction': '预言；预测',
    'preparation': '准备', 'preserve': '保护；保存', 'promote': '促进；晋升',
    'pronounce': '发音；宣称', 'prosperity': '繁荣', 'publisher': '出版商',
    'quiz': '测验；问答比赛', 'railroad': '铁路', 'railway': '铁路',
    'raincoat': '雨衣', 'rational': '理性的', 'ray': '光线；射线',
    'realistic': '现实的；逼真的', 'receptionist': '接待员',
    'reflection': '反映；倒影', 'refrigerator': '冰箱', 'regain': '恢复；取回',
    'regional': '地区的', 'registration': '登记；注册', 'relation': '关系',
    'repeatedly': '反复地', 'respectable': '体面的；值得尊敬的',
    'rob': '抢劫', 'roughly': '大约；粗略地', 'runner': '跑步者',
    'salesman': '推销员', 'salmon': '鲑鱼', 'sandy': '沙质的',
    'satisfaction': '满足；满意', 'satisfy': '使满意', 'schoolwork': '功课；作业',
    'scope': '范围；余地', 'seafood': '海鲜', 'selection': '选择；精选',
    'sensation': '感觉；轰动', 'separation': '分离；分居', 'sew': '缝纫',
    'shade': '阴凉处；色度', 'shameful': '可耻的', 'sheer': '纯粹的；陡峭的',
    'shelf': '架子；搁板', 'shortly': '不久；简短地', 'significance': '重要性；意义',
    'skeleton': '骨骼；骨架', 'slavery_x': None, 'sleeve': '袖子',
    'smoothly': '平稳地；流畅地', 'someday': '有一天', 'spaceship': '宇宙飞船',
    'spaghetti': '意大利面', 'spice': '香料', 'sponge': '海绵',
    'sponsor': '赞助商；发起人', 'spy': '间谍', 'stair': '楼梯；梯级',
    'strain': '压力；拉紧', 'strategic': '战略的', 'submarine': '潜水艇',
    'sufficient': '充足的', 'summary': '摘要；总结', 'sunlight': '阳光',
    'superstar': '超级明星', 'surf': '海浪；冲浪', 'surround': '包围；环绕',
    'swimsuit': '泳衣', 'symphony': '交响乐', 'syndrome': '综合征',
    'tablespoon': '大汤匙', 'tease': '取笑；戏弄', 'terrify': '使恐惧',
    'thankful': '感激的', 'thunderstorm': '雷暴', 'tick': '滴答声；打勾',
    'tights': '紧身裤袜', 'timetable': '时间表', 'tobacco': '烟草',
    'translate': '翻译', 'transportation': '运输', 'treasure': '宝藏；珍宝',
    'triumph': '胜利；凯旋', 'tropical': '热带的', 'trumpet': '小号；喇叭',
    'tuna': '金枪鱼', 'uncertain': '不确定的', 'underwater': '水下的',
    'uneasy': '不安的', 'unemployment': '失业', 'unforgettable': '难忘的',
    'unhealthy': '不健康的', 'unimportant': '不重要的', 'unite': '联合；团结',
    'unnecessary': '不必要的', 'unpredictable': '不可预测的', 'urge': '冲动；催促',
    'vague': '模糊的；含糊的', 'vase': '花瓶', 'vein': '血管；静脉', 'verb': '动词',
    'vet': '兽医', 'vice': '恶习；副的', 'visible': '看得见的；明显的',
    'vocabulary': '词汇；词汇量', 'voyage': '航行；航海', 'wander': '漫步；闲逛',
    'warmth': '温暖', 'washing-up': '洗碗；待洗餐具', 'weekly': '每周的；周刊',
    'weep': '哭泣', 'well-known': '著名的', 'wheelchair': '轮椅',
    'whisper': '耳语；低语', 'widely': '广泛地', 'wildlife': '野生动植物',
    'wool': '羊毛', 'worthwhile': '值得的', 'transform': '转变；变换',
    # 候选池扩到 545 后新进的（占有括号不平衡：ECDICT 原文「占(时间、空间等)」被截断）
    'occupy': '占领；占用', 'hasty': '匆忙的；草率的', 'critic': '批评家；评论家',
    'paddle': '桨；划桨', 'mischief': '恶作剧；淘气', 'canteen': '食堂；水壶',
    'spiral': '螺旋；螺旋形', 'typically': '通常；典型地', 'dedicate': '奉献；致力于',
    'prejudice': '偏见；成见', 'composition': '作文；构成', 'correction': '订正；改正',
    'enthusiastic': '热心的；热情的', 'controversial': '有争议的',
    'prominent': '卓越的；显著的', 'awareness': '意识；认识', 'slope': '斜坡；坡度',
}
CORRECTIONS = {k: v for k, v in CORRECTIONS.items() if v is not None}

n = 0
for k, v in CORRECTIONS.items():
    if k in cn and cn[k] != v:
        cn[k] = v
        n += 1
print('应用修正 %d 条' % n)

# 剩余自检：释义必须是纯中文+「；」和「……」
import re
bad = [(k, v) for k, v in cn.items() if not re.fullmatch(r'[一-鿿；…]+', v)]
print('格式仍不规范的:', len(bad), bad[:10])
short = [(k, v) for k, v in cn.items() if len(v) > 16]
print('过长释义:', len(short), short[:5])

json.dump(cn, open(D + '/cn_final.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('写出 cn_final.json:', len(cn), '条')
