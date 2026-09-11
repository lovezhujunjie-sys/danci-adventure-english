# normalize_ipa.py 的回归测试：每条规则都要有「该改的改了 / 不该改的没动」两侧用例。
#
# 🔴 为什么光有自检还不够（2026-09-11）：
#    normalize_ipa.py 里的自检只证明「不破坏自有数据」，证明不了「新词上的行为正确」。
#    「重读音节核裸 i」这条规则就吃过这个亏——自检零误报，看起来没问题，
#    实际在 deeply（i(ː) 被改成 iiː）和 cemetery（词尾 happy 元音被误改）上都是错的。
#    零误报只说明自有数据没覆盖到那种形态，**不等于规则对**。
#    所以每个规则都必须配一组**人工写明期望值**的用例，尤其是反例。
#
# 用法：python3 tools/test_normalize_ipa.py     （退出码 0 = 全过）
import json, os, re, sys

ROOT = os.path.expanduser('~') + '/.claude/skills/自学英语'
_src = open(ROOT + '/index.html', encoding='utf-8').read()


def grab(name):
    i = _src.index('\nconst %s = {' % name)
    j = _src.index('{', i)
    d = 0; k = j; ins = False; esc = False
    while k < len(_src):
        c = _src[k]
        if ins:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': ins = False
        else:
            if c == '"': ins = True
            elif c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: break
        k += 1
    return json.loads(_src[j:k + 1])


# 🔴 业务函数一律从真身切，绝不在这里重写一遍
ns = {'re': re, 'json': json, 'os': os, 'sys': sys}
_s = open(ROOT + '/tools/normalize_ipa.py', encoding='utf-8').read()
exec(_s[_s.index('SUBST = {'):_s.index('# ══════════ 自检')], ns)
normalize = ns['normalize']


def check_identity_on_own_tables():
    """自有音标本来就是规范化后的形态，normalize 跑上去必须一条都不变。

    🔴 「删音标内空格」那条规则就是被这一刀砍掉的：它在 url=/ˌjuː ɑː ˈel/、
       atm、vip 这些**逐字母拼读**的条目上误伤 8 条。
    """
    old = {}
    for n in ('IPA_MAP', 'IPA_EXTRA', 'BASE_IPA'):
        old.update(grab(n))
    bad = []
    for w, v in old.items():
        if not isinstance(v, str):
            continue
        raw = '/' + v.strip('/') + '/'
        got = normalize(raw, w)
        if got != raw:
            bad.append((w, raw, got))
    print('① normalize 对自有 %d 条音标是恒等变换' % len(old))
    for w, a, b in bad[:10]:
        print('   ❌ %-18s %-24s → %s' % (w, a, b))
    print('   %s' % ('✅' if not bad else '❌ %d 条被改动' % len(bad)))
    return not bad


# ── 逐条规则的用例：(词, 输入, 期望)。『期望 = 输入』就是反例（不许动）──
CASES = [
    # 记号统一：该改的
    ('colour',   '/ˈkʌlə/',        '/ˈkʌlə/'),      # 无变化（对照组）
    ('magic',    '/ˈmadʒɪk/',      '/ˈmædʒɪk/'),    # 裸 a → æ（TRAP）
    ('price',    '/praɪs/',        '/praɪs/'),      # aɪ 里的 a 不许动
    ('mouth',    '/maʊθ/',         '/maʊθ/'),       # aʊ 里的 a 不许动
    ('treasure', '/ˈtreʒəɹ/',      '/ˈtreʒər/'),    # ɹ → r（记号）
    ('heroin',   '/ˈhɛɹoʊ.ɪn/',    '/ˈheroʊɪn/'),   # ɛ→e、ɹ→r、音节点删掉
    ('hatred',   '/ˈheɪtrɪd, ˈheɪtrəd/', '/ˈheɪtrɪd/'),  # 或读只留第一种，尾部斜杠补回
    # 重读音节核裸 i → iː（维基写裸 i）
    ('marina',   '/məˈrinə/',      '/məˈriːnə/'),
    ('upbeat',   '/ʌpˈbit/',       '/ʌpˈbiːt/'),
    ('deeply',   '/ˈdi(ː)pli/',    '/ˈdiːpli/'),    # i(ː) 整个换成 iː，不许变成 iiː
    # 反例：非重读的裸 i 是本词库既有写法，一律不许动
    ('healthy',     '/ˈhelθi/',       '/ˈhelθi/'),      # 词尾 happy 元音
    ('cemetery',    '/ˈsemɪˌtri/',    '/ˈsemɪˌtri/'),   # 词尾 happy 元音（前面挂次重音号）
    ('taxi',        '/ˈtæksi/',       '/ˈtæksi/'),
    ('jellyfish',   '/ˈdʒelifɪʃ/',    '/ˈdʒelifɪʃ/'),   # 复合词里的弱读 i
    ('anyone',      '/ˈeniwʌn/',      '/ˈeniwʌn/'),
    ('ecology',     '/iˈkɒlədʒi/',    '/iˈkɒlədʒi/'),   # 元音前的 i 是零声母，不是音节核
    ('emoji',       '/ɪˈməʊdʒi/',     '/ɪˈməʊdʒi/'),
    ('police',      '/pəˈliːs/',      '/pəˈliːs/'),     # 本来就是 iː，不许再动
    # 反例：空格是合法的（逐字母拼读 / 多词条目 / 连字符复合词）
    ('url',             '/ˌjuː ɑː ˈel/',      '/ˌjuː ɑː ˈel/'),
    ('atm',             '/ˌeɪ tiː ˈem/',      '/ˌeɪ tiː ˈem/'),
    ('sticky note',     '/ˈstɪki nəʊt/',      '/ˈstɪki nəʊt/'),
    ('police officer',  '/pəˈliːs ˌɒfɪsə/',   '/pəˈliːs ˌɒfɪsə/'),
    ('brother-in-law',  '/ˈbrʌðər ɪn ˌlɔː/',  '/ˈbrʌðər ɪn ˌlɔː/'),
]


def check_cases():
    print('\n② 逐条规则用例（%d 条，含反例）' % len(CASES))
    bad = []
    for w, src, want in CASES:
        got = normalize(src, w)
        if got != want:
            bad.append((w, src, want, got))
    for w, src, want, got in bad:
        print('   ❌ %-16s %-22s 期望 %-22s 实得 %s' % (w, src, want, got))
    print('   %s' % ('✅ 全部符合预期' if not bad else '❌ %d 条不符' % len(bad)))
    return not bad


print('═══ normalize_ipa 回归测试 ═══')
ok = check_identity_on_own_tables()
ok = check_cases() and ok
print('\n' + '=' * 46)
if not ok:
    print('❌ 未通过')
    sys.exit(1)
print('✅ 全部通过')
