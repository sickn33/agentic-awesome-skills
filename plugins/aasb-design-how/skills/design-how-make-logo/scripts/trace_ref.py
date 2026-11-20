"""Trace one logo out of a reference image into a path the recipe can use (references/building.md, "Tracing").

    python3 -I trace_ref.py <image> --crop x,y,w,h --out trace/<name>.svg [--threshold 0.5] [--invert]

--crop is in fractions of the image (0 to 1), around the one mark to take. Dark ink on a light ground is traced as is;
pass --invert for a light mark on a dark ground. potrace draws the curves; the path is fitted to a 48 x 48 box,
centred, so the recipe places it with {"shape": "trace", "file": ..., "x", "y", "size"} and then changes it with the
usual add, cut and xor shapes. Needs potrace on the PATH (brew install potrace, apt install potrace).
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile

import numpy as np
import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from PIL import Image


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--crop", default="0,0,1,1")
    ap.add_argument("--out", required=True)
    ap.add_argument("--threshold", type=float, default=0.5)
    ap.add_argument("--invert", action="store_true")
    a = ap.parse_args()
    if not shutil.which("potrace"):
        raise SystemExit("potrace is not installed: brew install potrace (or apt install potrace)")

    im = Image.open(a.image).convert("L")
    x, y, w, h = (float(v) for v in a.crop.split(","))
    W, H = im.size
    im = im.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    # Trace at about 1200 px on the long side so potrace has edges to fit.
    k = 1200 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    g = np.asarray(im, dtype=np.float32) / 255
    ink = g > a.threshold if a.invert else g < a.threshold
    with tempfile.TemporaryDirectory() as t:
        pbm, svg = os.path.join(t, "in.pbm"), os.path.join(t, "out.svg")
        Image.fromarray(np.where(ink, 0, 255).astype(np.uint8)).convert("1").save(pbm)
        subprocess.run(["potrace", pbm, "-s", "--flat", "-o", svg, "--turdsize", "60", "--opttolerance", "0.4"], check=True)
        src = open(svg).read()
    # potrace writes paths in its own units under translate(0,H) scale(sx,-sy); undo that, then fit to 48.
    tr = re.search(r'translate\(([-\d.]+),([-\d.]+)\)\s*scale\(([-\d.]+),([-\d.]+)\)', src)
    tx, ty, sx, sy = (float(v) for v in tr.groups())
    path = pathops.Path()
    path.fillType = pathops.FillType.EVEN_ODD
    for dd in re.findall(r'<path[^>]* d="([^"]+)"', src):
        parse_path(dd, TransformPen(path.getPen(), (sx, 0, 0, sy, tx, ty)))
    path = pathops.simplify(path)
    x0, y0, x1, y1 = path.bounds
    sc = 44 / max(x1 - x0, y1 - y0)
    ox, oy = 24 - (x0 + x1) / 2 * sc, 24 - (y0 + y1) / 2 * sc
    out = pathops.Path()
    path.draw(TransformPen(out.getPen(), (sc, 0, 0, sc, ox, oy)))
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    out.draw(pen)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="{pen.getCommands()}"/></svg>\n')
    print(f"traced {os.path.basename(a.image)} into {a.out}: {len(out)} contours in a 48 box")


if __name__ == "__main__":
    main()
