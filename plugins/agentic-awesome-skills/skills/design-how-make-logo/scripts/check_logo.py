"""Check a built direction before anyone sees it (references/building.md, "Checks").

    python3 -I check_logo.py <build dir> [...] --refs <ref folder> [...] [--calibration calibration.json]

For each direction: the mark rendered at 16, 32, 64 and 512 px; its stroke at 16 px; its counters at 16 px against
512 px; its palette's contrast; and its distance to every reference. Writes check.json into each build dir and exits 1
if any direction fails. A failure goes back to the recipe.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys

import numpy as np
import resvg_py
from PIL import Image
from scipy import ndimage as ndi
from skimage import morphology

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import distance as D  # noqa: E402
import logolib as L  # noqa: E402

SIZES = (16, 32, 64, 512)


def render(svg_path: str, px: int, pad: float = 0.0) -> np.ndarray:
    """The mark's ink at `px` on its long side, as floats 0-1 (1 is ink)."""
    s = open(svg_path).read()
    png = bytes(resvg_py.svg_to_bytes(svg_string=s, width=px, background="#ffffff"))
    im = np.asarray(Image.open(io.BytesIO(png)).convert("L"), dtype=float) / 255
    if im.shape[0] > px:  # a tall mark: refit on height
        png = bytes(resvg_py.svg_to_bytes(svg_string=s, height=px, background="#ffffff"))
        im = np.asarray(Image.open(io.BytesIO(png)).convert("L"), dtype=float) / 255
    return 1 - im


def luminance(hex_: str) -> float:
    h = hex_.lstrip("#")
    h = "".join(ch * 2 for ch in h) if len(h) == 3 else h  # #999 is #999999
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a: str, b: str) -> float:
    x, y = sorted([luminance(a), luminance(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def check(build: str, refs: list[tuple[str, dict]], cal: dict) -> dict:
    info = json.load(open(os.path.join(build, "build.json")))
    mark = os.path.join(build, "mark.svg")
    big = render(mark, 512) > 0.5
    small = render(mark, 16)
    rows = []

    # Stroke at 16 px: the median stroke at 512, scaled. Under 1.5 px a stroke breaks up on a favicon.
    edt = ndi.distance_transform_edt(big)
    skel = morphology.skeletonize(big)
    w512 = float(np.median(2 * edt[skel])) if skel.any() else 0.0
    stroke16 = w512 * 16 / max(big.shape)
    rows.append(("stroke at 16 px", f"{stroke16:.2f} px", ">= 1.5 px", stroke16 >= 1.5))

    # Counters: holes that exist at 512 px must still be open at 16 px, and no new ones may appear. A new hole means
    # a gap pinched shut at 16 px and closed into a ring.
    h512 = len(L.holes(big, min_share=0.004))
    h16 = len(L.holes(small > 0.5, min_share=0.004))
    rows.append(("counters at 16 px", f"{h16} of {h512}", "same as at 512 px", h16 == h512))

    pal = info.get("palette", {})
    if {"ink", "paper"} <= pal.keys():
        c = contrast(pal["ink"], pal["paper"])
        rows.append(("ink on paper", f"{c:.2f}:1", ">= 4.5:1", c >= 4.5))
    if {"accent", "paper"} <= pal.keys():
        c = max(contrast(pal["accent"], pal["paper"]), contrast(pal["accent"], pal.get("ink", "#000000")))
        rows.append(("accent against paper or ink", f"{c:.2f}:1", ">= 3:1", c >= 3))

    # Distance: the mark against every reference, scored with the calibrated model.
    cand = D.prepare(big, poses=True)
    near = sorted(((D.fused(D.compare(cand, r), cal), f) for f, r in refs), reverse=True)[:3]
    top = near[0][0] if near else 0.0
    # A direction traced from a reference is meant to sit close to it: the score is reported, not held to the limit.
    if info.get("traced_from"):
        rows.append(("nearest reference", f"{top:.3f}", f"traced from {info['traced_from']}", True))
    else:
        rows.append(("nearest reference", f"{top:.3f}", f"< {cal['limit']:.3f}", top < cal["limit"]))

    sizes = {}
    for px in SIZES:
        a = render(mark, px)
        sizes[px] = round(float(a.mean()), 4)
    report = {"direction": info.get("title", os.path.basename(build)), "checks": [
        {"check": n, "value": v, "pass_at": p, "ok": bool(ok)} for n, v, p, ok in rows],
        "nearest": [{"score": s, "ref": f} for s, f in near], "ink_share_by_size": sizes,
        # A detailed trace may close up at 16 px (SKILL.md step 7): those rows are reported, and the build still passes.
        "ok": all(r[3] for r in rows if not (info.get("traced_from") and r[0].endswith("at 16 px")))}
    json.dump(report, open(os.path.join(build, "check.json"), "w"), indent=1)
    return report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("builds", nargs="+")
    ap.add_argument("--refs", nargs="+", required=True)
    ap.add_argument("--calibration")
    a = ap.parse_args()
    cal = D.load_calibration(a.calibration)
    refs = []
    for p in L.images(a.refs):
        seg = L.segment(L.load(p))
        if L.usable(seg)[0]:
            refs.append((p, D.prepare(seg["mask"], poses=False)))
    print(f"{len(refs)} references to check against, limit {cal['limit']:.3f}")
    ok = True
    for b in a.builds:
        rep = check(b, refs, cal)
        ok &= rep["ok"]
        print(f"\n{rep['direction']}: {'pass' if rep['ok'] else 'FAIL'}")
        for c in rep["checks"]:
            print(f"  {'ok  ' if c['ok'] else 'FAIL'} {c['check']:28s} {c['value']:>12s}   {c['pass_at']}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
