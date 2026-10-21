#!/usr/bin/env python3
"""Subset every font to the characters a style project actually uses.

Usage: python3 explainer/tools/fonts.py <project-dir>     (run from anywhere)

Reads <project-dir>/fonts.json ({"index.html": ["font-key", ...]}), scans the
project's HTML for characters, downloads Google Fonts subsets (`text=`
parameter) and the matching Smiley Sans chunks, writes them under
<project-dir>/assets/fonts/, and rewrites the marked @font-face block:

    /* fonts:begin */ ... /* fonts:end */

Rerun after any text change (including text set from JavaScript).
"""

from __future__ import annotations

import re
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import json
import os

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
OUT = ROOT / "assets" / "fonts"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
# Smiley Sans (得意黑, OFL-1.1) ships as cn-font-split chunks in the npm package @chinese-fonts/dyh. By default the
# chunks a project needs are fetched from jsDelivr (pinned version); set SMILEY_SANS_DIR to an extracted copy of the
# package to work offline.
DYH_VERSION = "3.0.0"
DYH_CDN = f"https://cdn.jsdelivr.net/npm/@chinese-fonts/dyh@{DYH_VERSION}/dist/SmileySans-Oblique/"
DYH_DIR = Path(os.environ["SMILEY_SANS_DIR"]).expanduser() if os.environ.get("SMILEY_SANS_DIR") else None

FONTS = {
    "noto-serif-sc-900": {"family": "Noto Serif SC", "css": "Noto+Serif+SC:wght@900", "weight": 900},
    "noto-serif-sc-500": {"family": "Noto Serif SC", "css": "Noto+Serif+SC:wght@500", "weight": 500},
    "instrument-serif-400": {"family": "Instrument Serif", "css": "Instrument+Serif", "weight": 400},
    "instrument-serif-400i": {"family": "Instrument Serif", "css": "Instrument+Serif:ital@1", "weight": 400, "style": "italic"},
    "zcool-xiaowei": {"family": "ZCOOL XiaoWei", "css": "ZCOOL+XiaoWei", "weight": 400},
    "long-cang": {"family": "Long Cang", "css": "Long+Cang", "weight": 400},
    "zcool-kuaile": {"family": "ZCOOL KuaiLe", "css": "ZCOOL+KuaiLe", "weight": 400},
    "zcool-qingke": {"family": "ZCOOL QingKe HuangYou", "css": "ZCOOL+QingKe+HuangYou", "weight": 400},
    "bangers": {"family": "Bangers", "css": "Bangers", "weight": 400},
    "smiley-sans": {"family": "Smiley Sans", "dyh": True, "weight": 400},
    "jetbrains-mono-400": {"family": "JetBrains Mono", "css": "JetBrains+Mono:wght@400", "weight": 400},
    "jetbrains-mono-700": {"family": "JetBrains Mono", "css": "JetBrains+Mono:wght@700", "weight": 700},
    "caveat-700": {"family": "Caveat", "css": "Caveat:wght@700", "weight": 700},
    "archivo-black": {"family": "Archivo Black", "css": "Archivo+Black", "weight": 400},
    "ibm-plex-mono-400": {"family": "IBM Plex Mono", "css": "IBM+Plex+Mono:wght@400", "weight": 400},
}

CONFIG = json.loads((ROOT / "fonts.json").read_text(encoding="utf-8"))
# Optional per-project Google Fonts: "extra": {"key": {"family": ..., "css": "Family+Name:wght@700", "weight": 700}}
FONTS.update(CONFIG.pop("extra", {}))
USES = CONFIG

MARKER = re.compile(r"/\* fonts:begin \*/.*?/\* fonts:end \*/", re.S)


def used_chars() -> str:
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for path in [p for p in list((ROOT / "compositions").rglob("*.html")) + [ROOT / "index.html"] + list(ROOT.glob("*.js")) + list((ROOT / "lib").rglob("*.js")) if p.exists()]:
        text = path.read_text(encoding="utf-8")
        chars.update(ch for ch in text if ord(ch) > 0x7F and not ch.isspace())
    return "".join(sorted(chars))


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def google_face(key: str, spec: dict, chars: str) -> str:
    query = urllib.parse.quote(chars, safe="")
    css = fetch(f"https://fonts.googleapis.com/css2?family={spec['css']}&text={query}&display=block").decode()
    urls = re.findall(r"url\((https://[^)]+)\)", css)
    if len(urls) != 1:
        raise SystemExit(f"{key}: expected one subset url, got {len(urls)}")
    target = OUT / f"{key}.woff2"
    target.write_bytes(fetch(urls[0]))
    return face(spec, f"assets/fonts/{key}.woff2")


def face(spec: dict, url: str, unicode_range: str = "") -> str:
    rule = (
        f'@font-face {{ font-family: "{spec["family"]}"; src: url("{url}") format("woff2"); '
        f'font-weight: {spec["weight"]}; font-style: {spec.get("style", "normal")}; font-display: block;'
    )
    if unicode_range:
        rule += f" unicode-range: {unicode_range};"
    return rule + " }"


def in_range(codepoint: int, ranges: str) -> bool:
    for part in ranges.split(","):
        part = part.strip().upper().replace("U+", "")
        low, _, high = part.partition("-")
        if int(low, 16) <= codepoint <= int(high or low, 16):
            return True
    return False


def dyh_faces(spec: dict, chars: str) -> list[str]:
    base = DYH_DIR / "dist" / "SmileySans-Oblique" if DYH_DIR else None
    css = (base / "result.css").read_text(encoding="utf-8") if base else fetch(DYH_CDN + "result.css").decode()
    target_dir = OUT / "smiley-sans"
    shutil.rmtree(target_dir, ignore_errors=True)
    target_dir.mkdir(parents=True)
    rules = []
    for block in re.findall(r"@font-face\s*{(.*?)}", css, re.S):
        src = re.search(r'url\("?\.?/?([^")]+\.woff2)"?\)', block)
        ranges = re.search(r"unicode-range:\s*([^;]+);", block)
        if not src or not ranges:
            continue
        if any(in_range(ord(ch), ranges.group(1)) for ch in chars):
            name = Path(src.group(1)).name
            if base:
                shutil.copy2(base / src.group(1), target_dir / name)
            else:
                (target_dir / name).write_bytes(fetch(DYH_CDN + src.group(1)))
            rules.append(face(spec, f"assets/fonts/smiley-sans/{Path(src.group(1)).name}", ranges.group(1).strip()))
    return rules


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    chars = used_chars()
    print(f"{len(chars)} characters in use")
    cache: dict[str, list[str]] = {}
    for key, spec in FONTS.items():
        if not any(key in keys for keys in USES.values()):
            continue
        cache[key] = dyh_faces(spec, chars) if spec.get("dyh") else [google_face(key, spec, chars)]
        print(f"  {key}: {len(cache[key])} face rule(s)")
    for relative, keys in USES.items():
        path = ROOT / relative
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if not MARKER.search(text):
            raise SystemExit(f"{relative}: missing /* fonts:begin */ ... /* fonts:end */ marker")
        block = "/* fonts:begin */\n" + "\n".join(rule for key in keys for rule in cache[key]) + "\n/* fonts:end */"
        path.write_text(MARKER.sub(lambda _: block, text, count=1), encoding="utf-8")
        print(f"  wrote faces into {relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
