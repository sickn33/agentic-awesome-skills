"""Build a logo from a recipe of grid shapes and an OFL wordmark (references/building.md). Reads the recipe and any
`trace` file it names (an SVG written by trace_ref.py); it never opens a reference image itself.

    python3 -I build_logo.py <direction.json> --out <dir> [--fonts <cache dir>]

The recipe (units are grid squares, y down, on a `grid` x `grid` canvas):

    {"name": "Northlight", "title": "Two lights", "idea": "one sentence",
     "grid": 48,
     "mark": [
       {"shape": "circle", "cx": 24, "cy": 24, "r": 20},
       {"op": "cut", "shape": "rect", "x": 22, "y": 0, "w": 4, "h": 48},
       {"shape": "ring", "cx": 24, "cy": 24, "r": 10, "width": 4, "rotate": 30},
       {"shape": "arc", "cx": 24, "cy": 24, "r": 18, "width": 5, "start": 200, "end": 340},
       {"shape": "polygon", "points": [[4, 44], [24, 4], [44, 44]]},
       {"shape": "rect", "x": 4, "y": 4, "w": 12, "h": 12, "r": 3, "repeat": {"count": 4, "rotate": 90, "about": [24, 24]}},
       {"shape": "glyph", "text": "N", "font": "Inter Tight", "weight": 700, "x": 10, "y": 40, "cap": 30},
       {"shape": "trace", "file": "trace/bell.svg", "x": 2, "y": 2, "size": 44}
     ],
     "wordmark": {"text": "Northlight", "font": "Inter Tight", "weight": 500, "tracking": -10},
     "lockup": {"mark_scale": 1.6, "gap": 0.7},
     "palette": {"ink": "#151515", "paper": "#f7f5f1", "accent": "#e8562a", "neutral": "#9b9187", "tint": "#e7e2da"}}

`op` is add (default), cut, keep (intersect) or xor, applied in order. Any shape takes `rotate` (degrees about its
own centre or `about`), `mirror` ("x" or "y" across the grid's centre) and `repeat`.

Writes mark.svg (tight), mark-grid.svg (on its grid, for the construction page), wordmark.svg, lockup.svg,
lockup-stacked.svg and build.json (boxes, guides, the font and its licence).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.svgLib.path import parse_path
from fontTools.pens.transformPen import TransformPen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fonts as F  # noqa: E402

RECIPE_DIR = "."  # set in main(); a trace file is found next to its recipe

K = 0.5522847498  # cubic handle length for a quarter circle


def affine(m, p):
    a, b, c, d, e, f = m
    x, y = p
    return (a * x + c * y + e, b * x + d * y + f)


def mul(m, n):
    """m then n."""
    a, b, c, d, e, f = n
    return (a * m[0] + c * m[1], b * m[0] + d * m[1], a * m[2] + c * m[3], b * m[2] + d * m[3], a * m[4] + c * m[5] + e, b * m[4] + d * m[5] + f)


def rot(deg, cx, cy):
    t = math.radians(deg)
    c, s = math.cos(t), math.sin(t)
    return (c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy)


class Draw:
    """Draws into a pathops Path through an affine transform."""

    def __init__(self, m):
        self.path = pathops.Path()
        self.pen = self.path.getPen()
        self.m = m

    def move(self, p):
        self.pen.moveTo(affine(self.m, p))

    def line(self, p):
        self.pen.lineTo(affine(self.m, p))

    def curve(self, a, b, p):
        self.pen.curveTo(affine(self.m, a), affine(self.m, b), affine(self.m, p))

    def close(self):
        self.pen.closePath()


def arc_points(d: Draw, cx, cy, r, a0, a1, first=True):
    """An arc from a0 to a1 degrees (clockwise on screen, 0 at 3 o'clock), as cubics of at most 90 degrees."""
    n = max(1, math.ceil(abs(a1 - a0) / 90))
    step = (a1 - a0) / n
    pt = lambda a: (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
    if first:
        d.move(pt(a0))
    for i in range(n):
        s, e = a0 + i * step, a0 + (i + 1) * step
        h = 4 / 3 * math.tan(math.radians(e - s) / 4) * r
        ps, pe = pt(s), pt(e)
        ts = (-math.sin(math.radians(s)), math.cos(math.radians(s)))
        te = (-math.sin(math.radians(e)), math.cos(math.radians(e)))
        d.curve((ps[0] + h * ts[0], ps[1] + h * ts[1]), (pe[0] - h * te[0], pe[1] - h * te[1]), pe)


def circle(d, cx, cy, r, reverse=False):
    if reverse:
        arc_points(d, cx, cy, r, 360, 0)
    else:
        arc_points(d, cx, cy, r, 0, 360)
    d.close()


def rect(d, x, y, w, h, r=0):
    r = max(0, min(r, w / 2, h / 2))
    if r == 0:
        d.move((x, y)); d.line((x + w, y)); d.line((x + w, y + h)); d.line((x, y + h)); d.close()
        return
    k = r * K
    d.move((x + r, y)); d.line((x + w - r, y))
    d.curve((x + w - r + k, y), (x + w, y + r - k), (x + w, y + r)); d.line((x + w, y + h - r))
    d.curve((x + w, y + h - r + k), (x + w - r + k, y + h), (x + w - r, y + h)); d.line((x + r, y + h))
    d.curve((x + r - k, y + h), (x, y + h - r + k), (x, y + h - r)); d.line((x, y + r))
    d.curve((x, y + r - k), (x + r - k, y), (x + r, y)); d.close()


def centre_of(s) -> tuple[float, float]:
    k = s["shape"]
    if k == "trace":
        h = s.get("size", 48) / 2
        return s.get("x", 0) + h, s.get("y", 0) + h
    if k in ("circle", "ring", "arc"):
        return s["cx"], s["cy"]
    if k == "rect":
        return s["x"] + s["w"] / 2, s["y"] + s["h"] / 2
    if k == "polygon":
        xs, ys = zip(*s["points"])
        return sum(xs) / len(xs), sum(ys) / len(ys)
    return s.get("x", 0), s.get("y", 0)


def shape_path(s: dict, grid: float, fonts_dir: str, m=(1, 0, 0, 1, 0, 0)) -> pathops.Path:
    if "rotate" in s:
        cx, cy = s.get("about") or centre_of(s)
        m = mul(rot(s["rotate"], cx, cy), m)
    if s.get("mirror") == "x":
        m = mul((-1, 0, 0, 1, grid, 0), m)
    elif s.get("mirror") == "y":
        m = mul((1, 0, 0, -1, 0, grid), m)
    d = Draw(m)
    k = s["shape"]
    if k == "rect":
        rect(d, s["x"], s["y"], s["w"], s["h"], s.get("r", 0))
    elif k == "circle":
        circle(d, s["cx"], s["cy"], s["r"])
    elif k == "ring":
        circle(d, s["cx"], s["cy"], s["r"])
        inner = Draw(m)
        circle(inner, s["cx"], s["cy"], s["r"] - s["width"])
        return pathops.op(d.path, inner.path, pathops.PathOp.DIFFERENCE)
    elif k == "arc":
        r0, r1 = s["r"] - s["width"], s["r"]
        arc_points(d, s["cx"], s["cy"], r1, s["start"], s["end"])
        a = math.radians(s["end"])
        d.line((s["cx"] + r0 * math.cos(a), s["cy"] + r0 * math.sin(a)))
        arc_points(d, s["cx"], s["cy"], r0, s["end"], s["start"], first=False)
        d.close()
    elif k == "polygon":
        pts = s["points"]
        d.move(tuple(pts[0]))
        for p in pts[1:]:
            d.line(tuple(p))
        d.close()
    elif k == "glyph":
        info = F.fetch(s["font"], fonts_dir)
        t = F.set_text(F.load(info, s.get("weight", 400)), s["text"], s.get("tracking", 0))
        sc = s["cap"] / t["cap"]
        # Font units are y up from the baseline; the grid is y down. Place the baseline at (x, y).
        gm = mul((sc, 0, 0, -sc, s["x"], s["y"]), m)
        t["pen"].replay(TransformPen(d.pen, gm))
    elif k == "trace":
        # A traced reference from trace_ref.py: one path in a 48 x 48 box, placed at (x, y) and scaled to `size`.
        src = s["file"] if os.path.isabs(s["file"]) else os.path.join(RECIPE_DIR, s["file"])
        dd = re.search(r'<path[^>]* d="([^"]+)"', open(src).read()).group(1)
        sc = s.get("size", 48) / 48
        parse_path(dd, TransformPen(d.pen, mul((sc, 0, 0, sc, s.get("x", 0), s.get("y", 0)), m)))
    else:
        raise SystemExit(f"unknown shape {k!r}")
    return d.path


OPS = {"add": pathops.PathOp.UNION, "cut": pathops.PathOp.DIFFERENCE, "keep": pathops.PathOp.INTERSECTION, "xor": pathops.PathOp.XOR}


def build_mark(spec: dict, fonts_dir: str) -> pathops.Path:
    grid = spec.get("grid", 48)
    acc = pathops.Path()
    for s in spec["mark"]:
        rep = s.get("repeat")
        copies = [(1, 0, 0, 1, 0, 0)]
        if rep:
            cx, cy = rep.get("about", (grid / 2, grid / 2))
            copies = [rot(rep.get("rotate", 360 / rep["count"]) * i, cx, cy) for i in range(rep["count"])]
            if "step" in rep:
                copies = [(1, 0, 0, 1, rep["step"][0] * i, rep["step"][1] * i) for i in range(rep["count"])]
        piece = pathops.Path()
        for m in copies:
            piece = pathops.op(piece, shape_path(s, grid, fonts_dir, m), pathops.PathOp.UNION)
        acc = pathops.op(acc, piece, OPS[s.get("op", "add")])
    return pathops.simplify(acc)


def guides(spec: dict) -> dict:
    """The construction lines for the book: every edge and centre the recipe names, on the grid."""
    xs, ys = set(), set()
    for s in spec["mark"]:
        if s["shape"] == "rect":
            xs |= {s["x"], s["x"] + s["w"]}; ys |= {s["y"], s["y"] + s["h"]}
        elif s["shape"] in ("circle", "ring", "arc"):
            xs |= {s["cx"] - s["r"], s["cx"], s["cx"] + s["r"]}; ys |= {s["cy"] - s["r"], s["cy"], s["cy"] + s["r"]}
        elif s["shape"] == "polygon":
            for x, y in s["points"]:
                xs.add(x); ys.add(y)
    g = spec.get("grid", 48)
    keep = lambda v: sorted(round(float(x), 3) for x in v if 0 <= x <= g)
    return {"x": keep(xs), "y": keep(ys)}


def d_of(path: pathops.Path) -> str:
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    path.draw(pen)
    return pen.getCommands()


def bounds(path: pathops.Path):
    return path.bounds  # (xMin, yMin, xMax, yMax)


def svg(d: str, box, fill="#151515", pad=0.0) -> str:
    x0, y0, x1, y1 = box
    w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - pad:.2f} {y0 - pad:.2f} {w:.2f} {h:.2f}" '
            f'width="{w:.2f}" height="{h:.2f}"><path fill="{fill}" fill-rule="nonzero" d="{d}"/></svg>\n')


def build(spec: dict, out: str, fonts_dir: str) -> dict:
    os.makedirs(out, exist_ok=True)
    mark = build_mark(spec, fonts_dir)
    if mark.bounds == (0, 0, 0, 0):
        raise SystemExit("The mark is empty")
    g = spec.get("grid", 48)
    md = d_of(mark)
    open(os.path.join(out, "mark.svg"), "w").write(svg(md, bounds(mark)))
    open(os.path.join(out, "mark-grid.svg"), "w").write(svg(md, (0, 0, g, g)))
    result = {"name": spec["name"], "grid": g, "mark_box": [round(v, 3) for v in bounds(mark)], "guides": guides(spec)}

    wm = spec.get("wordmark")
    if wm:
        info = F.fetch(wm["font"], fonts_dir)
        t = F.set_text(F.load(info, wm.get("weight", 500)), wm["text"], wm.get("tracking", 0))
        wpath = pathops.Path()
        t["pen"].replay(TransformPen(wpath.getPen(), (1, 0, 0, -1, 0, 0)))  # y down, baseline at 0
        wpath = pathops.simplify(wpath)
        open(os.path.join(out, "wordmark.svg"), "w").write(svg(d_of(wpath), bounds(wpath)))
        cap = t["cap"]
        lk = spec.get("lockup", {})
        mx0, my0, mx1, my1 = bounds(mark)
        mh = lk.get("mark_scale", 1.6) * cap
        sc = mh / (my1 - my0)
        gap = lk.get("gap", 0.7) * cap
        # Horizontal: the mark's middle on the cap height's middle.
        mid = -cap / 2
        hm = (sc, 0, 0, sc, -mx0 * sc - (mx1 - mx0) * sc - gap, mid - (my0 + (my1 - my0) / 2) * sc)
        lock = pathops.Path()
        mark.draw(TransformPen(lock.getPen(), hm))
        lock = pathops.op(lock, wpath, pathops.PathOp.UNION)
        open(os.path.join(out, "lockup.svg"), "w").write(svg(d_of(lock), bounds(lock)))
        # Stacked: the mark centred above the wordmark.
        wx0, wy0, wx1, wy1 = bounds(wpath)
        sm_h = 2.2 * cap
        ss = sm_h / (my1 - my0)
        sm = (ss, 0, 0, ss, (wx0 + wx1) / 2 - (mx0 + mx1) / 2 * ss, -cap - 1.0 * cap - my1 * ss)
        stack = pathops.Path()
        mark.draw(TransformPen(stack.getPen(), sm))
        stack = pathops.op(stack, wpath, pathops.PathOp.UNION)
        open(os.path.join(out, "lockup-stacked.svg"), "w").write(svg(d_of(stack), bounds(stack)))
        result["wordmark"] = {"text": wm["text"], "font": wm["font"], "weight": wm.get("weight", 500), "cap": cap,
                              "licence": info["licence"], "reserved_names": info["reserved_names"]}
        if any(n.lower() in wm["text"].lower() for n in info["reserved_names"]):
            print(f"warning: the wordmark uses the font's Reserved Font Name {info['reserved_names']}")
    for part in spec["mark"]:
        if part["shape"] == "glyph":
            i = F.fetch(part["font"], fonts_dir)
            result.setdefault("fonts", {})[part["font"]] = i["licence"]
    if wm:
        result.setdefault("fonts", {})[wm["font"]] = result["wordmark"]["licence"]
    result.update({k: spec[k] for k in ("title", "idea", "palette", "traced_from") if k in spec})
    json.dump(result, open(os.path.join(out, "build.json"), "w"), indent=1)
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("recipe")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fonts", default=os.path.expanduser("~/.cache/make-logo/fonts"))
    a = ap.parse_args()
    global RECIPE_DIR
    RECIPE_DIR = os.path.dirname(os.path.abspath(a.recipe))
    a.fonts = os.path.abspath(a.fonts)  # build.json keeps font paths; absolute so the package step works from anywhere
    r = build(json.load(open(a.recipe)), a.out, a.fonts)
    print(f"built {r['name']}: mark box {r['mark_box']}, {len(r['guides']['x'])} x and {len(r['guides']['y'])} y guides")


if __name__ == "__main__":
    main()
