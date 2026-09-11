#!/bin/bash
# 词库扩容全链：音标合并 → 组装 → 闸门 → 注入 → 回归。任一步失败立刻停。
#
# 🔴 为什么要有这个脚本（2026-09-11）：
#    扩容这条链路有 6 步、每步都能"看起来成功"。分散敲命令时，很容易在某一步看到
#    一句正常的输出就往下走，而真正的信号（缺音标几个、跳过谁了）在输出中间被忽略。
#    这里把每一步的退出码当闸门：不过就停，绝不"带着问题往下走"。
#
# 用法：bash tools/run_expansion.sh          # 只跑到闸门，不注入
#       INJECT=1 bash tools/run_expansion.sh # 闸门过了就注入 index.html
#
# 🔴 A 用 ipa_cache_best.json 而不是 ipa_cache_merged.json：
#    merged.json 是被旧的（有 bug 的）normalize 规则**原地改写过的**，
#    里面 deeply=/ˈdiː(ː)pli/、cemetery=/ˈsemɪˌtriː/ 是污染值。
#    best.json 是上一轮 merge 的产物，写在污染之前，是干净的。
#    （normalize_ipa.py 现已改成默认只读，不会再制造这种污染。）
set -e
cd "$(dirname "$0")/.."
T=${TARGET:-1857}
echo "═══ 词库扩容全链（TARGET=$T）═══"

echo; echo "── ① 音标规则自检 + 回归测试 ──"
python3 tools/test_normalize_ipa.py

echo; echo "── ② 逐词择优合并（A=上一轮最佳 B=v4 全量重抓）──"
# 🔴 2026-09-11：v4 是**坏的** —— refetch_v3.py 切真身时只 exec 了 4 个函数，
#    漏了 pick_ipa 内部依赖的 parse_ipa_templates，于是每个词都抛 NameError，
#    再被外层 except 当网络抖动重试 6 次、最后以空字典「成功」写盘，1300 条全 null。
#    （根因已修，见 refetch_v3.py 顶部。）
#    这里拿它当 B **无害**：merge 的取舍是 `if vb and ...` / `elif va and ...`，
#    空值永远赢不了好值，等价于「把 A 规范化一遍」。
#    之所以不重抓：A（best.json）对目标 1857 词**覆盖 1857/1857**，一个不缺，
#    没必要为边际收益再轰维基 1900 次请求。下次真要 v4 的值时直接重跑 refetch_v3.py。
python3 -c "
import json
b = json.load(open('/tmp/ipa_cache_v4.json'))
n = sum(1 for v in b.values() if (v or {}).get('ipa'))
print('  B（v4）%d 条，有音标 %d 条%s' % (len(b), n, '   ← 已知全空，不参与择优' if n == 0 else ''))
"
A=/tmp/ipa_cache_best.json B=/tmp/ipa_cache_v4.json OUT=/tmp/ipa_cache_best_new.json \
  python3 tools/merge_ipa.py

echo; echo "── ③ 规范化自检（只读，不改缓存）──"
CACHE=/tmp/ipa_cache_best_new.json python3 tools/normalize_ipa.py

echo; echo "── ④ 组装最终词表 ──"
TARGET=$T IPACACHE=/tmp/ipa_cache_best_new.json python3 tools/build_final.py

echo; echo "── ⑤ 注入前质量闸门 ──"
TARGET=$T python3 tools/verify_final.py

if [ "$INJECT" != "1" ]; then
  echo; echo "✅ 闸门全过。要真正注入请跑：INJECT=1 bash tools/run_expansion.sh"
  exit 0
fi

echo; echo "── ⑥ 注入 index.html ──"
# TOPICS=10 显式写出来（别依赖 apply_words.py 的默认值）：
# 41 个老主题 + 10 个新主题 = 51 个，跟 index.html 里那段 UI 注释一致。
TOPICS=10 python3 tools/apply_words.py

echo; echo "── ⑦ 注入后回归（跑真实的 index.html）──"
NODE_PATH=/tmp/pwtest/node_modules node tests/test_zixue_fixes.js
NODE_PATH=/tmp/pwtest/node_modules node tests/test_ls_sent.js
NODE_PATH=/tmp/pwtest/node_modules node tests/test_m30.js
# test_idle 要真等 2 分钟挂机窗口，是全链最慢的一步 —— 但它管的是老曾亲口定下的
# 那条规矩（朗读中就不算挂机），漏跑就等于这条规矩没人守，慢也得跑。
NODE_PATH=/tmp/pwtest/node_modules node tests/test_idle.js
NODE_PATH=/tmp/pwtest/node_modules node tests/test_pat_words.js
NODE_PATH=/tmp/pwtest/node_modules node tests/audit_static.js
NODE_PATH=/tmp/pwtest/node_modules node tests/audit_sentences.js
NODE_PATH=/tmp/pwtest/node_modules node tests/vfy3.js
NODE_PATH=/tmp/pwtest/node_modules node tests/smoke2.js
NODE_PATH=/tmp/pwtest/node_modules node tests/perf.js

echo; echo "── ⑧ 离线缓存（sw.js）回归 ──"
# 🔴 这个测试必须走 HTTP：file:// 下 Service Worker 根本不工作，
#    测试自己的判据又是「断网后还能不能打开」，所以非起服务不可。
#    没起就自己起一个、测完关掉，别让这一步变成「要人记得先敲命令」的坑。
SRV=""
if ! curl -s -o /dev/null --max-time 2 http://127.0.0.1:8899/index.html; then
  python3 -m http.server 8899 --bind 127.0.0.1 > /tmp/http8899.log 2>&1 &
  SRV=$!
  sleep 2
fi
# 🔴 这里原来是 `node ... ; [ -n "$SRV" ] && kill $SRV ; true` ——
#    末尾那个 `true` 是为了不让 `[ -n "$SRV" ] && kill` 在 SRV 为空时（返回 1）
#    触发 `set -e` 中断。但它把**测试本身的失败也一起吞了**：
#    2026-09-11 实测 test_sw_offline.js 抛 ReferenceError 崩溃，
#    脚本继续走到结尾、退出码变 0，看着像"全链 ✅ 完成"。
#    正确做法：先存测试的退出码，再用 `|| true` 把清理动作的返回值单独吃掉。
set +e
NODE_PATH=/tmp/pwtest/node_modules node tests/test_sw_offline.js
SW_RC=$?
set -e
[ -n "$SRV" ] && kill $SRV 2>/dev/null || true
if [ "$SW_RC" -ne 0 ]; then
  echo; echo "🔴 离线缓存测试失败（退出码 $SW_RC）—— 全链不通过"
  exit 1
fi

echo; echo "✅ 全链完成，注入 + 回归都过了"
