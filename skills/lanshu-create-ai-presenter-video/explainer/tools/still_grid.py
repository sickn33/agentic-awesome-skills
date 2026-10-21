#!/usr/bin/env python3
"""Still grid of the styles of one story at the same moments (snapshots, no render) — for choosing a style.

    python3 tools/still_grid.py <films-root> <t1,t2,...> [out-dir]
      <films-root>/<style>/ are the projects (tools/new_topic.sh builds them). The nine visual styles make a 3x3
      nine-still-<t>s.png per time; any other set present (e.g. the three narrative styles) is laid out three across
      as styles-still-<t>s.png
Frames stay local (--describe false: never sent to a vision API). HYPERFRAMES=npx spec (default hyperframes@0.8.81).
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

NAMES = [("v1-editorial", "V1 留白"), ("v2-signal", "V2 信号"), ("v3-notebook", "V3 手帐"), ("v4-paper", "V4 立体书"),
         ("v5-comic", "V5 波普漫画"), ("v6-cinematic", "V6 一镜到底"), ("v7-drafting", "V7 图纸与注脚"),
         ("v8-chalkboard", "V8 黑板报"), ("v9-clay", "V9 黏土小城")]
# the three narrative styles: a grid of just these is three across (the narrative trio's gallery)
TRIO = [("v10-reasoning", "V10 推演"), ("v11-casefile", "V11 案卷"), ("v12-sitcom", "V12 小剧场")]
CJK_FONTS = ["/System/Library/Fonts/Hiragino Sans GB.ttc", "/System/Library/Fonts/PingFang.ttc",
             "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
             "C:/Windows/Fonts/msyh.ttc"]


def label_font(size):
    """(font, ascii_only): a CJK system font when one exists, else PIL's default (labels then drop the Chinese name)"""
    for path in [os.environ.get("LABEL_FONT", "")] + CJK_FONTS:
        if path and Path(path).exists():
            return ImageFont.truetype(path, size), False
    return ImageFont.load_default(), True


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    films, times = Path(sys.argv[1]).resolve(), sys.argv[2]
    out_dir = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else films
    out_dir.mkdir(parents=True, exist_ok=True)
    hf = os.environ.get("HYPERFRAMES", "hyperframes@0.8.81")
    ts = [t.strip() for t in times.split(",")]
    font, ascii_only = label_font(22)
    shots = {}
    with tempfile.TemporaryDirectory() as tmp:
        present = [(k, label) for k, label in NAMES + TRIO if (films / k / "index.html").exists()]
        for key, _ in present:
            out = Path(tmp) / key
            subprocess.run(["npx", "--yes", hf, "snapshot", str(films / key), "--at", times, "--no-end",
                            "--describe", "false", "-o", str(out)], check=True, capture_output=True)
            shots[key] = sorted(out.glob("frame-*.png"))
        rows = max(1, -(-len(present) // 3))
        for n, t in enumerate(ts):
            grid = Image.new("RGB", (3 * 640 + 4 * 8, rows * 360 + (rows + 1) * 8), (20, 20, 22))
            for i, (key, label) in enumerate(present):
                text = label.split(" ")[0] if ascii_only else label
                im = Image.open(shots[key][n]).convert("RGB").resize((640, 360), Image.LANCZOS)
                d = ImageDraw.Draw(im)
                d.rounded_rectangle((8, 8, 8 + d.textlength(text, font=font) + 24, 42), radius=10, fill=(0, 0, 0))
                d.text((20, 11), text, fill=(255, 255, 255), font=font)
                grid.paste(im, (8 + (i % 3) * 648, 8 + (i // 3) * 368))
            dest = out_dir / (f"nine-still-{t}s.png" if len(present) == 9 else f"styles-still-{t}s.png")
            grid.save(dest)
            print(dest)


if __name__ == "__main__":
    main()
