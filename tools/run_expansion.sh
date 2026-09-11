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
python3 tools/apply_words.py

echo; echo "── ⑦ 注入后回归（跑真实的 index.html）──"
NODE_PATH=/tmp/pwtest/node_modules node tests/test_zixue_fixes.js
NODE_PATH=/tmp/pwtest/node_modules node tests/test_ls_sent.js
NODE_PATH=/tmp/pwtest/node_modules node tests/test_m30.js
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
NODE_PATH=/tmp/pwtest/node_modules node tests/test_sw_offline.js
[ -n "$SRV" ] && kill $SRV 2>/dev/null
true

echo; echo "✅ 全链完成，注入 + 回归都过了"
