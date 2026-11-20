"""Measure a font file: proportions, stems, contrast, serifs, class-mean widths and sidebearings.

  python3 -I measure_font.py <font.ttf|otf|woff2> [--loc wght=400,opsz=14] [--stem 76] [--out m.json]

--loc     a location in a variable font (defaults to its default instance).
--stem    solve the weight axis so the n stem, at cap 700, equals this value first. Use it to compare a
          variable font with a reference at the same colour.
Lengths are in cap-normalised units (cap height 700). The JSON also keeps cap_em, the real cap height per
1000 em, and the font's vertical metrics. Every number is a font-wide value or a class mean.
"""
import argparse
import json
import os
import sys

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont  # noqa: E402

import fontlib as L  # noqa: E402


def parse_loc(s):
    if not s:
        return {}
    return {k.strip(): float(v) for k, v in (p.split("=") for p in s.split(",") if p.strip())}


def measure_path(path, loc=None, stem=None):
    f = TTFont(path)
    axes = L.axes_of(f)
    loc = dict(loc or {})
    small = L.subset_font(f, L.MEASURE_TEXT)
    if stem and "wght" in axes:
        lo, hi = axes["wght"][0], axes["wght"][2]
        quick = L.subset_font(f, "nHx", layout=False)
        w, got = L.solve_axis(lambda v: L.Face(quick, {**loc, "wght": v}), L.stem_cap700, stem, lo, hi)
        loc["wght"] = round(w, 1)
    face = L.Face(small, loc if axes else None)
    m = L.measure_face(face)
    m["file"] = os.path.basename(path)
    m["loc"] = loc
    m["axes"] = axes
    m["family"] = f["name"].getDebugName(16) or f["name"].getDebugName(1)
    m["glyphs"] = len(f.getGlyphOrder())
    return m


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("font")
    ap.add_argument("--loc", default="")
    ap.add_argument("--stem", type=float)
    ap.add_argument("--out")
    a = ap.parse_args()
    m = measure_path(a.font, parse_loc(a.loc), a.stem)
    if a.out:
        L.save_json(m, a.out)
    keys = ["cap_em", "xh", "xh_cap", "asc", "desc", "overshoot_lc", "n_stem", "H_stem", "H_bar", "o_side", "o_thin",
            "contrast", "bar_stem", "serif", "serif_ext", "serif_tip", "n_counter", "rhythm", "lc_avg", "uc_avg", "space", "para"]
    print(f"{m['file']}  loc {m['loc'] or 'default'}")
    for k in keys:
        print(f"  {k:13s} {m.get(k)}")
    print("  widths       ", json.dumps(m["widths"]))
    print("  sides        ", json.dumps(m["sides"]))


if __name__ == "__main__":
    main()
