#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""列出指定主题里「还没有配图」的词,给人工配图用(每行 `en|cn`)。

用法:
  python3 tools/pics/list_missing.py T11 T08 T09
  python3 tools/pics/list_missing.py --all
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = ROOT / "index.html"


def grab(src, name):
    m = re.search(r"^const %s = (.*);$" % name, src, re.M)
    if not m:
        raise SystemExit("找不到 " + name)
    return json.loads(m.group(1))


src = HTML.read_text(encoding="utf-8")
VOCAB = grab(src, "VOCAB")
PIC = grab(src, "PIC_MAP")

keys = [a for a in sys.argv[1:] if not a.startswith("-")]
if not keys or "--all" in sys.argv:
    keys = list(VOCAB.keys())

for key in keys:
    t = VOCAB[key]
    miss = [w for w in t["words"] if w["en"] not in PIC]
    print("\n### %s %s  %d/%d 有图，缺 %d" % (key, t["name"], len(t["words"]) - len(miss), len(t["words"]), len(miss)))
    for w in miss:
        print("%s|%s" % (w["en"], w["cn"]))
