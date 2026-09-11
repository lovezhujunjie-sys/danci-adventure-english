# 用修好的提取器（ACC_ANNOT 位置参数口音 + 词源截断）全量重抓一遍，与现有最佳值逐词对比。
#
# 🔴 为什么必须全量重抓、不能只补几个词（2026-09-11）：
#    english_section 的截断改动会**影响每一个词**的取值区间，不只是 ton 那一个。
#    只改 ton 就是「头疼医头」，别的多词源词（lead/bow/wound/mean）错着都不知道。
#    所以拿同一份词表整跑一遍，把「改之前 vs 改之后」的差异全部摊开来看——
#    差异里如果有变坏的，说明截断切过头了，必须先修规则再谈注入。
#
# 🔴 业务函数一律从 fetch_ipa.py 切真身，绝不在本脚本里重写。
import json, os, re, time, urllib, urllib.request, urllib.error

HOME = os.path.expanduser('~')
TOOLS = HOME + '/.claude/skills/自学英语/tools'
OLD = os.environ.get('OLD', '/tmp/ipa_cache_merged.json')   # 现有最佳（逐词择优过的）
OUT = os.environ.get('OUT', '/tmp/ipa_cache_v3.json')

src = open(TOOLS + '/fetch_ipa.py', encoding='utf-8').read()
ns = {'re': re, 'json': json, 'time': time, 'urllib': urllib, 'os': os, 'HOME': HOME,
      'API': 'https://en.wiktionary.org/w/api.php',
      'UA': 'zixue-english-study-app/1.0 (personal offline study tool; python-urllib)'}
for fn in ('fetch', 'english_section', 'pick_ipa', 'spelling_target'):
    i = src.index('def %s(' % fn)
    j = src.index('\ndef ', i + 1) if '\ndef ' in src[i + 1:] else len(src)
    exec(src[i:j], ns)
fetch, pick_ipa, spelling_target = ns['fetch'], ns['pick_ipa'], ns['spelling_target']
new = {}


class FetchFailed(Exception):
    """取不到正文（限流/网络），**绝不能**当成「这个词没有音标」"""


def get_text(title):
    """取一个词条正文。取不到就抛 FetchFailed，绝不返回 None 冒充结果。

    🔴 2026-09-11 踩过：兜底路径原来写的是 `except Exception: pass`，
       429 一限流就被静静吞掉，结果 12 个明明有音标的大写页词被记成
       「维基没有音标」——失败伪装成了结论，正是最该避免的假完成。
    """
    delay = 4
    last = None                     # 🔴 必须先置位：5 次全撞 429 时 last 从没赋过值，
    for _ in range(5):              #    原来那句 raise FetchFailed(str(last)) 会抛 NameError
        try:
            d = fetch([title])
            p = d['query']['pages'][0]
            if p.get('missing'):
                return None                 # 页面确实不存在，这是**真结论**
            return p['revisions'][0]['slots']['main']['content']
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = int(e.headers.get('Retry-After') or delay)
                print('    429 限流，等 %ds' % w, flush=True); time.sleep(w)
                delay = min(delay * 2, 120); continue
            raise FetchFailed('HTTP %s' % e.code)
        except Exception as e:
            time.sleep(delay); delay = min(delay * 2, 60); last = e
    raise FetchFailed(str(last))

old = json.load(open(OLD))
# 🔴 增量：已经抓到音标的词直接跳过，只补「上次没抓到的」（2026-09-11）。
#    全量重跑一遍要 39 批、三分钟；补 18 个大写页只要 1 批。允许重跑是刚需——
#    每次修完提取器都要重验，不能每验一次就轰人家 1900 个请求。
done = json.load(open(OUT)) if os.path.exists(OUT) else {}
WORDS = [w for w in sorted(old) if not (done.get(w) or {}).get('ipa')]
print('重抓 %d 个词（串行 + 限速，约 %d 批）' % (len(WORDS), (len(WORDS) + 49) // 50), flush=True)

new = dict(done)      # 已抓到的原样带着走，最后一起写回
failed = []
BATCH = 50
for n in range(0, len(WORDS), BATCH):
    batch = WORDS[n:n + BATCH]
    got, err = None, None
    for attempt in range(6):
        try:
            d = fetch(batch)
            got = {}
            for p in d['query']['pages']:
                t = p.get('title', '').lower()
                # 🔴 2026-09-11 修的坑：这里原来是
                #       if p.get('missing'): got[t] = None; continue
                #   而 en.wiktionary **首字母区分大小写**（irish 不存在、Irish 存在；
                #   反过来 anytime 存在、Anytime 不存在）。于是 irish/japanese/
                #   jewish/russian 四个词条被判 missing 后**直接 continue**，
                #   下面那段「首字母大写兜底」刚好对它唯一要救的情况是死代码，
                #   四个词就这么静默变成「没音标」。missing 只说明「这个拼法的页面没有」，
                #   不等于「这个词没有音标」——先试大写页，再决定放弃。
                try:
                    txt = p['revisions'][0]['slots']['main']['content']
                except Exception:
                    txt = ''
                if p.get('missing'):
                    txt = ''
                v = pick_ipa(txt)
                if not v:
                    # 自己页面上没音标 → 顺着「另一种拼法」跳到真词条（colour→color）
                    tgt = spelling_target(txt)
                    if tgt and tgt != t:
                        time.sleep(1.2)
                        txt2 = get_text(tgt)
                        if txt2:
                            v = pick_ipa(txt2)
                if not v:
                    # 🔴 首字母大写页（2026-09-11）：维基首字母自动大写，但有些词条的
                    #    专有名词义项只在首字母大写时才成条，补这一层多一道保险。
                    cap = t[:1].upper() + t[1:]
                    if cap != t:
                        time.sleep(1.2)
                        txt3 = get_text(cap)
                        if txt3 and txt3 != txt:
                            v = pick_ipa(txt3)
                got[t] = v
            break
        except FetchFailed as e:
            err = str(e); break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = int(e.headers.get('Retry-After') or 5)
                print('  429 限流，等 %ds' % w, flush=True); time.sleep(w); continue
            err = 'HTTP %s' % e.code; break
        except Exception as e:
            err = str(e); time.sleep(3)
    if got is None:
        # 整批没成 → 整批留空、下次重跑补，绝不当成「这些词没有音标」
        failed.append((n // BATCH + 1, err))
        print('  批次 %d 失败：%s（不写入，下次重跑会补）' % (n // BATCH + 1, err), flush=True)
        time.sleep(2)
        continue
    for w in batch:
        new[w] = {'ipa': got.get(w), 'how': 'v3（口音位置参数 + 词源截断 + 行内回看）'}
    json.dump(new, open(OUT, 'w'), ensure_ascii=False)
    print('  批次 %d/%d  已抓 %d' % (n // BATCH + 1, (len(WORDS) + 49) // 50, len(new)), flush=True)
    time.sleep(1.2)

json.dump(new, open(OUT, 'w'), ensure_ascii=False)

# ══════════ 逐词对比 ══════════
def nz(v):
    return (v or '').replace('ɹ', 'r')

same, diff, lost, gained = 0, [], [], []
for w in WORDS:
    a = nz((old.get(w) or {}).get('ipa'))
    b = nz((new.get(w) or {}).get('ipa'))
    if a == b:
        same += 1
    elif a and not b:
        lost.append((w, a, b))
    elif b and not a:
        gained.append((w, a, b))
    else:
        diff.append((w, a, b))

print('\n' + '═' * 66)
print('相同 %d | 取值变了 %d | 原来有现在没了 %d | 原来没有现在有了 %d'
      % (same, len(diff), len(lost), len(gained)))
for title, rows in (('🔴 原来有、现在取不到（要重点看，可能是截断切过头）', lost),
                    ('取值变了', diff),
                    ('原来没有、现在有了', gained)):
    if not rows:
        continue
    print('\n%s：%d 个' % (title, len(rows)))
    for w, a, b in rows:
        print('  %-16s %-24s → %s' % (w, a, b))
if failed:
    print('\n失败批次：%s' % failed)
