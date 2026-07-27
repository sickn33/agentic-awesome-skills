#!/usr/bin/env python3
"""Print the raw markup around search-result links, so title selectors are
written against what Naver actually serves instead of being guessed."""

import re
import sys
import urllib.parse

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from naver_probe import fetch  # noqa: E402


def dump(label, url, pattern, count=2, span=1100):
    print("=" * 78)
    print(label)
    print("=" * 78)
    status, text, err = fetch(url, referer="https://m.search.naver.com/")
    print(f"status={status} err={err} bytes={len(text)}\n")
    seen = set()
    shown = 0
    for m in re.finditer(pattern, text):
        key = m.group(0)
        if key in seen:
            continue
        seen.add(key)
        lo = max(0, m.start() - span)
        hi = min(len(text), m.end() + span // 2)
        print(f"--- match #{shown + 1}: {key} (offset {m.start()}) ---")
        print(text[lo:hi].replace("><", ">\n<"))
        print()
        shown += 1
        if shown >= count:
            break
    if not shown:
        print("!! no matches\n")


q = urllib.parse.quote("제주도 맛집")
dump(
    "BLOG TAB",
    f"https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&sm=mtb_jum&query={q}&start=1",
    r"https?://(?:m\.)?blog\.naver\.com/[A-Za-z0-9_-]+/\d{6,}",
)

q2 = urllib.parse.quote("캠핑 후기")
dump(
    "CAFE TAB",
    f"https://m.search.naver.com/search.naver?ssc=tab.m_cafe.all&where=m_cafe&query={q2}&start=1",
    r"https?://cafe\.naver\.com/[A-Za-z0-9_-]+/\d{2,}",
)
