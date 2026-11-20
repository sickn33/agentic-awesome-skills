"""Measure reference logos as whole-mark numbers (references/measuring.md). Never writes an outline.

    python3 -I measure_logo.py <image or folder> [...] --out measurements.json [--sheet rejects.png]

Lengths are per 1000 units of the mark's height, like make-font's cap at 700. Every reference gets a row; one we
can't measure (a photo, a scene, a mark running off the edge) gets `usable: false` and the reason.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

import numpy as np
from scipy import ndimage as ndi
from skimage import measure, morphology

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logolib as L  # noqa: E402



def iou(a: np.ndarray, b: np.ndarray) -> float:
    u = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / u) if u else 0.0


def corners(c: np.ndarray, turn: float = 50) -> int:
    """Sharp corners on the outline: vertices of a simplified contour that turn more than `turn` degrees."""
    n = 0
    for contour in measure.find_contours(c, 0.5):
        poly = measure.approximate_polygon(contour, tolerance=1.5)
        if len(poly) < 4:
            continue
        p = poly[:-1]
        a = np.roll(p, 1, axis=0) - p
        b = np.roll(p, -1, axis=0) - p
        cos = np.sum(a * b, axis=1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1) + 1e-9)
        n += int(np.sum(np.degrees(np.arccos(np.clip(cos, -1, 1))) < 180 - turn))
    return n


def measure_mask(mask: np.ndarray) -> dict:
    h, w = mask.shape
    unit = 1000 / h
    ink = mask.sum()
    edt = ndi.distance_transform_edt(mask)
    skel = morphology.skeletonize(mask)
    widths = 2 * edt[skel]
    widths = widths[widths > 1]
    c = L.canonical(mask) > 0.5
    hull = morphology.convex_hull_image(c)
    area = c.sum()
    perim = measure.perimeter(c)
    rows, cols = np.nonzero(mask)
    hs = L.holes(mask)
    n_comp = L.components(mask)
    out = {
        "aspect": round(w / h, 3),
        "coverage": round(float(ink / (h * w)), 4),
        "solidity": round(float(area / max(1, hull.sum())), 4),
        "stroke": round(float(np.median(widths) * unit), 1) if widths.size else None,
        "stroke_contrast": round(float(np.percentile(widths, 90) / max(1e-6, np.percentile(widths, 10))), 2) if widths.size > 10 else None,
        "components": n_comp,
        "counters": len(hs),
        "counter_shares": hs[:6],
        "symmetry": {"mirror": round(iou(c, c[:, ::-1]), 3), "flip": round(iou(c, c[::-1]), 3), "turn": round(iou(c, c[::-1, ::-1]), 3)},
        "compactness": round(float(perim**2 / (4 * math.pi * max(1, area))), 2),
        "corners": corners(c.astype(float)),
        "centre_offset": [round(float(rows.mean() / h - 0.5), 3), round(float(cols.mean() / w - 0.5), 3)],
    }
    out["kind"] = "wordmark" if out["aspect"] > 2.2 and n_comp >= 3 else "mark"
    return out


def contact(tiles, path, t=96, cols=12):
    """Source and mask side by side for each reference; a rejected one shows its source on grey."""
    from PIL import Image, ImageOps
    sheet = Image.new("RGB", (cols * 2 * t, ((len(tiles) + cols - 1) // cols) * t), "white")
    for i, (f, mask, ok) in enumerate(tiles):
        x, y = (i % cols) * 2 * t, (i // cols) * t
        src = Image.fromarray((L.load(f) * 255).astype("uint8"))
        src.thumbnail((t - 6, t - 6))
        cell = Image.new("RGB", (t, t), "white" if ok else (200, 200, 200))
        cell.paste(src, ((t - src.width) // 2, (t - src.height) // 2))
        sheet.paste(cell, (x, y))
        if mask is not None:
            m = Image.fromarray((255 - mask * 255).astype("uint8")).convert("RGB")
            sheet.paste(ImageOps.expand(m.resize((t - 2, t - 2)), 1, (220, 220, 220)), (x + t, y))
    sheet.save(path)


def files(args: list[str]) -> list[str]:
    return L.images(args)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("refs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--sheet", help="PNG of every measured mask beside its source, to check the ink was found right")
    a = ap.parse_args()
    tiles = []
    rows, rejects = [], {}
    for f in files(a.refs):
        try:
            seg = L.segment(L.load(f))
        except Exception as e:  # an unreadable file is a reject, not a crash
            seg = {"ok": False, "why": f"unreadable: {e}"}
        ok, why = L.usable(seg)
        row = {"file": f, "usable": ok}
        if not ok:
            row["why"] = why
            rejects[why.split(" (")[0]] = rejects.get(why.split(" (")[0], 0) + 1
        else:
            row.update({k: seg[k] for k in ("separation", "ink_colours", "reversed")})
            row.update(measure_mask(seg["mask"]))
        if a.sheet:
            tiles.append((f, L.canonical(seg["mask"], 96) if ok else None, ok))
        rows.append(row)
    good = [r for r in rows if r["usable"]]
    if a.sheet:
        contact(tiles, a.sheet)
    with open(a.out, "w") as fh:
        json.dump({"unit": "per 1000 of the mark's height", "references": rows}, fh, indent=1)
    print(f"{len(good)} of {len(rows)} measured")
    for why, n in sorted(rejects.items(), key=lambda kv: -kv[1]):
        print(f"  {n:3d} skipped: {why}")
    if good:
        for k in ("aspect", "coverage", "solidity", "stroke", "counters", "compactness", "corners"):
            v = np.array([r[k] for r in good if r.get(k) is not None], dtype=float)
            print(f"  {k:12s} median {np.median(v):8.3f}   p10 {np.percentile(v, 10):8.3f}   p90 {np.percentile(v, 90):8.3f}")


if __name__ == "__main__":
    main()
