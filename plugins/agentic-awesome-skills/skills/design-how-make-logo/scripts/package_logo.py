"""Package a chosen direction (references/building.md, "Package").

    python3 -I package_logo.py <build dir> --out <dir> [--classes "9, 42"]

svg/ (mark, wordmark, lockup, stacked; ink, reversed, accent, black), png/ (the mark at 16 to 1024 and the lockup),
favicon.ico, LICENSES/ (each font's OFL.txt), trademark-search.md. The build must have passed check_logo.py.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import shutil
import sys

import resvg_py
from PIL import Image

PARTS = ("mark", "wordmark", "lockup", "lockup-stacked")
PNG = (16, 32, 48, 180, 512, 1024)


def recolour(svg: str, fill: str) -> str:
    return re.sub(r'fill="#[0-9a-fA-F]{6}"', f'fill="{fill}"', svg)


def png(svg: str, width: int) -> Image.Image:
    return Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=svg, width=width)))).convert("RGBA")


def square(im: Image.Image, side: int, pad: float = 0.1) -> Image.Image:
    """The mark centred on a transparent square with `pad` of clear space each side."""
    inner = round(side * (1 - 2 * pad))
    im = im.copy()
    im.thumbnail((inner, inner), Image.LANCZOS)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("build")
    ap.add_argument("--out", required=True)
    ap.add_argument("--classes", default="", help="Nice classes for the trademark search sheet, e.g. \"9, 42\"")
    a = ap.parse_args()
    info = json.load(open(os.path.join(a.build, "build.json")))
    chk = os.path.join(a.build, "check.json")
    if not os.path.exists(chk) or not json.load(open(chk))["ok"]:
        sys.exit("Run check_logo.py first; this build hasn't passed it")
    pal = info.get("palette", {})
    colours = {"ink": pal.get("ink", "#151515"), "reversed": pal.get("paper", "#ffffff"), "accent": pal.get("accent", pal.get("ink", "#151515")), "black": "#000000"}
    os.makedirs(os.path.join(a.out, "svg"), exist_ok=True)
    os.makedirs(os.path.join(a.out, "png"), exist_ok=True)
    for part in PARTS:
        p = os.path.join(a.build, f"{part}.svg")
        if not os.path.exists(p):
            continue
        s = open(p).read()
        for name, fill in colours.items():
            open(os.path.join(a.out, "svg", f"{part}-{name}.svg"), "w").write(recolour(s, fill))
    mark = recolour(open(os.path.join(a.build, "mark.svg")).read(), colours["ink"])
    big = png(mark, 2048)
    for side in PNG:
        square(big, side).save(os.path.join(a.out, "png", f"mark-{side}.png"))
    if os.path.exists(os.path.join(a.build, "lockup.svg")):
        png(recolour(open(os.path.join(a.build, "lockup.svg")).read(), colours["ink"]), 1600).save(os.path.join(a.out, "png", "lockup-1600.png"))
    square(big, 256).save(os.path.join(a.out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    lic = os.path.join(a.out, "LICENSES")
    os.makedirs(lic, exist_ok=True)
    for family, path in info.get("fonts", {}).items():
        shutil.copy(path, os.path.join(lic, f"{re.sub(r'[^A-Za-z0-9]+', '-', family)}-OFL.txt"))
    name = info["name"]
    traced = (f"""
**This mark was traced from another logo ({info['traced_from']}) and changed slightly.** It sits close to that logo
on purpose, and the owner of the original may have rights in it. Find who made the original and whether it is still
in use before you ship this mark; a lawyer's view matters more here than for a mark drawn from scratch.
""" if info.get("traced_from") else "")
    open(os.path.join(a.out, "trademark-search.md"), "w").write(f"""# Trademark search sheet: {name}

This is not a clearance. It lists where to look before you use the name and mark in commerce. Get a clearance search
from a trademark lawyer before you file or spend money on the brand.
{traced}
## The name

- USPTO trademark search: https://tmsearch.uspto.gov/ (search "{name}" and close spellings)
- WIPO Global Brand Database: https://branddb.wipo.int/ (all countries you sell in)
- EUIPO eSearch: https://euipo.europa.eu/eSearch/
- Classes to search: {a.classes or "the Nice classes for what you sell (software is usually 9 and 42)"}

## The mark

Search the design codes (the Vienna Classification in WIPO's database, the USPTO's design search codes) for the shapes
the mark is built from: {", ".join(sorted({s for s in ("circles" if '"circle"' in json.dumps(info) else "", "squares and rectangles") if s}))}.
Look for marks in the same classes that would read as the same at a glance.

## What make-logo checked

The mark was compared with every reference used to make it and was not a near copy of any (`check.json`). That
covers those references only, not every mark in use.
""")
    json.dump({"name": name, "direction": info.get("title"), "palette": pal, "fonts": list(info.get("fonts", {}))},
              open(os.path.join(a.out, "brand.json"), "w"), indent=1)
    print(f"packaged {name} ({info.get('title')}) into {a.out}")


if __name__ == "__main__":
    main()
