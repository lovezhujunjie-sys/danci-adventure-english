#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 tools/pics/pic_map.json(人工核对过的「单词→图片」表)编译进 index.html 的 PIC_MAP 常量。

规则:
  1. 只收录 VOCAB 里真实存在的词(孤儿键直接报错,防手写拼错后静默失效)
  2. 人工表(pic_map.json)优先,EMOJI_MAP 兜底
  3. 输出是合法 JSON —— PIC_MAP 要能被 JSON.parse 读(数据常量里不许写注释)

用法:
  python3 tools/pics/build_pic_map.py            # 编译进 index.html
  python3 tools/pics/build_pic_map.py --check    # 只校验 index.html 里的与源文件一致(测试用)
"""
import json
import pathlib
import re
import sys

PICS_DIR = pathlib.Path(__file__).resolve().parent
ROOT = PICS_DIR.parents[1]
HTML = ROOT / "index.html"
AUTHORED = PICS_DIR / "pic_map.json"
PARTS_DIR = PICS_DIR / "parts"


def grab_const(src, name):
    m = re.search(r"^const %s = (.*);$" % name, src, re.M)
    if not m:
        raise SystemExit("❌ 在 index.html 里找不到常量 " + name)
    return json.loads(m.group(1)), m


def load():
    src = HTML.read_text(encoding="utf-8")
    vocab, _ = grab_const(src, "VOCAB")
    emoji, _ = grab_const(src, "EMOJI_MAP")
    # parts/*.json 是分批人工配的图库(一岛一个文件,便于分批提交)；
    # pic_map.json 是总覆盖层(改单个词用,优先级最高)。
    authored = {}
    for f in sorted(PARTS_DIR.glob("*.json")):
        part = json.loads(f.read_text(encoding="utf-8"))
        dup = [k for k in part if k in authored]
        if dup:
            raise SystemExit("❌ %s 与前面的分片重复配图: %s" % (f.name, ", ".join(dup[:5])))
        authored.update(part)
    for k, v in json.loads(AUTHORED.read_text(encoding="utf-8")).items():
        authored[k] = v

    words = []          # VOCAB 顺序的唯一词,[(en, cn, topic_key, topic_name)]
    seen = set()
    for key, topic in vocab.items():
        for w in topic["words"]:
            if w["en"] in seen:
                continue
            seen.add(w["en"])
            words.append((w["en"], w["cn"], key, topic["name"]))

    orphans = sorted(k for k in authored if k not in seen)
    if orphans:
        raise SystemExit("❌ pic_map.json 里这些词不在 VOCAB 里(拼错了?):\n  " + "\n  ".join(orphans))

    desired = {}
    for en, cn, key, name in words:
        pic = authored.get(en) or emoji.get(en)
        if pic:
            desired[en] = pic
    return src, desired, authored, words, emoji


def literal(desired):
    return "const PIC_MAP = " + json.dumps(desired, ensure_ascii=False, separators=(",", ":")) + ";"


def main():
    check = "--check" in sys.argv
    src, desired, authored, words, emoji = load()
    new_line = literal(desired)

    m = re.search(r"^const PIC_MAP = (.*);$", src, re.M)
    if m:
        current = json.loads(m.group(1))
        new_src = src[:m.start()] + new_line + src[m.end():]
    else:
        current = None
        anchor = re.search(r"^const EMOJI_MAP = .*;$", src, re.M)
        if not anchor:
            raise SystemExit("❌ 找不到插桩位置(EMOJI_MAP 那行)")
        new_src = src[:anchor.end()] + "\n" + new_line + src[anchor.end():]

    # 覆盖率
    total = len(words)
    cov = len(desired)
    print("总词数 %d / 有图 %d (%.1f%%) / 人工表 %d 条 / EMOJI_MAP 兜底 %d 条"
          % (total, cov, cov * 100.0 / total, len(authored), cov - len([k for k in desired if k in authored])))
    by_topic = {}
    for en, cn, key, name in words:
        t = by_topic.setdefault(key, [name, 0, 0])
        t[2] += 1
        if en in desired:
            t[1] += 1
    for key in sorted(by_topic):
        name, c, n = by_topic[key]
        print("  %-5s %-8s %3d/%-3d %5.0f%%" % (key, name, c, n, c * 100.0 / n))

    if check:
        if current is None:
            print("❌ index.html 里没有 PIC_MAP")
            return 1
        if current != desired:
            only_old = [k for k in current if k not in desired]
            only_new = [k for k in desired if k not in current]
            diff = [k for k in desired if k in current and current[k] != desired[k]]
            print("❌ PIC_MAP 与源文件不一致: 多出 %d / 缺少 %d / 内容不同 %d"
                  % (len(only_old), len(only_new), len(diff)))
            for k in (only_old[:10] + only_new[:10] + diff[:10]):
                print("   %s: html=%s desired=%s" % (k, current.get(k), desired.get(k)))
            return 1
        print("✅ --check 通过:index.html 里的 PIC_MAP 与 pic_map.json 一致")
        return 0

    if current == desired:
        print("✅ 无变化,index.html 不用改")
        return 0
    HTML.write_text(new_src, encoding="utf-8")
    print("✅ 已写入 index.html 的 PIC_MAP(%d 条)" % len(desired))
    return 0


if __name__ == "__main__":
    sys.exit(main())
