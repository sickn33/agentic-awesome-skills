"""How close a logo is to each reference (references/distance.md). Used to keep every variant far from every reference.

    python3 -I distance.py <candidate.png|svg-render.png> <reference image or folder> [...] [--json out.json]

Three measures on the marks' silhouettes, each normalised so that size, position and the ground's colour don't count:
- `overlap`: the best intersection over union after fitting both into the same box, trying the candidate as is,
  mirrored, and turned a few degrees either way. 1 is the same silhouette.
- `edges`: how far the outlines sit from each other, as the mean nearest distance both ways, in thousandths of the
  box. 0 is the same outline.
- `hash`: matching bits of a 63-bit perceptual hash, as a share. 1 is the same picture at low frequency.

`score` folds them into one number, 0 to 1, with weights `calibrate.py` fits on edited copies against pairs of
different references, and it sets where "too close" starts. This is a
guardrail against copying, not a legal clearance.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from scipy import ndimage as ndi
from scipy.fft import dctn
from skimage import transform

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logolib as L  # noqa: E402

SIDE = 128
TURNS = (-6, -3, 0, 3, 6)


def _features(c: np.ndarray) -> dict:
    """Silhouette, outline, distance to the outline, and hash for one pose of a mark (floats 0-1, SIDE square)."""
    b = c > 0.5
    edge = b ^ ndi.binary_erosion(b)
    small = transform.resize(c, (32, 32), anti_aliasing=True)
    d = dctn(small, norm="ortho")[:8, :8].ravel()[1:]
    return {"mask": b, "edge": edge, "edt": ndi.distance_transform_edt(~edge), "hash": d > np.median(d)}


def prepare(mask: np.ndarray, poses: bool = True) -> dict:
    """Everything a comparison needs, computed once per mark. A candidate gets poses: as is, mirrored, and turned a
    few degrees, each re-fitted to its box. A reference needs only itself."""
    c = L.canonical(mask, SIDE)
    out = {"self": _features(c), "poses": []}
    if not poses:
        return out
    for flip in (False, True):
        base = c[:, ::-1] if flip else c
        for deg in TURNS:
            r = transform.rotate(base, deg, order=1, mode="constant") if deg else base
            rb = r > 0.5
            if not rb.any():
                continue
            rows, cols = np.nonzero(rb)
            out["poses"].append(_features(L.canonical(r[rows.min():rows.max() + 1, cols.min():cols.max() + 1], SIDE)))
    return out


def _measure(a: dict, b: dict) -> dict:
    u = np.logical_or(a["mask"], b["mask"]).sum()
    overlap = float(np.logical_and(a["mask"], b["mask"]).sum() / u) if u else 0.0
    ea, eb = a["edge"], b["edge"]
    near = (b["edt"][ea].mean() + a["edt"][eb].mean()) / 2 if ea.any() and eb.any() else SIDE
    edges = 1000 * near / SIDE
    hash_match = float(np.mean(a["hash"] == b["hash"]))
    # Each measure mapped to 0..1 where 1 is identical; the strongest wins, since a copy only has to show in one.
    similarity = max(overlap, max(0.0, 1 - edges / 60), max(0.0, (hash_match - 0.5) / 0.5) * 0.9)
    return {"overlap": round(overlap, 3), "edges": round(float(edges), 1), "hash": round(hash_match, 3), "similarity": round(float(similarity), 3)}


def compare(a: dict, b: dict) -> dict:
    """a is the candidate, b the reference. Every measure is taken at the candidate's closest pose, so a mirrored or
    turned copy is judged as the copy it is."""
    poses = a["poses"] or [a["self"]]
    return max((_measure(p, b["self"]) for p in poses), key=lambda d: d["similarity"])


HERE = os.path.dirname(os.path.abspath(__file__))


def load_calibration(path: str | None = None) -> dict:
    """The fused score's weights and limit: from calibrate.py on the person's references when there are enough of them
    (30 or more), otherwise the defaults shipped here, fitted on 98 references."""
    cal = json.load(open(path or os.path.join(HERE, "calibration.json")))
    return {"weights": cal["fused"]["weights"], "limit": cal["fused"]["limit"]}


def fused(d: dict, cal: dict) -> float:
    """0 to 1: how likely this pair is a copy rather than two different logos, by the fitted model."""
    w = cal["weights"]
    z = w[0] * d["overlap"] + w[1] * d["edges"] / 100 + w[2] * d["hash"] + w[3]
    return round(float(1 / (1 + np.exp(-z))), 4)


def from_file(path: str, candidate: bool = False) -> dict | None:
    seg = L.segment(L.load(path))
    return prepare(seg["mask"], poses=candidate) if seg["ok"] else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("candidate")
    ap.add_argument("refs", nargs="+")
    ap.add_argument("--limit", type=float, default=None, help="score at which a variant fails; default from the calibration")
    ap.add_argument("--calibration", help="calibration.json from calibrate.py; default the one shipped beside this script")
    ap.add_argument("--json")
    a = ap.parse_args()
    cand = from_file(a.candidate, candidate=True)
    if cand is None:
        sys.exit("No mark found in the candidate")
    rows = []
    for f in L.images(a.refs):
        ref = from_file(f)
        if ref is not None:
            rows.append({"ref": f, **compare(cand, ref)})
    cal = load_calibration(a.calibration)
    for r in rows:
        r["score"] = fused(r, cal)
    rows.sort(key=lambda r: -r["score"])
    limit = a.limit if a.limit is not None else cal["limit"]
    for r in rows[:5]:
        print(f"{r['score']:.3f}  overlap {r['overlap']:.3f}  edges {r['edges']:5.1f}  hash {r['hash']:.3f}  {r['ref']}")
    verdict = "too close" if rows and rows[0]["score"] >= limit else "clear"
    print(f"nearest {rows[0]['score'] if rows else 0:.3f} against a limit of {limit:.3f}: {verdict}")
    if a.json:
        json.dump({"limit": limit, "verdict": verdict, "nearest": rows[:10]}, open(a.json, "w"), indent=1)
    sys.exit(1 if verdict == "too close" else 0)


if __name__ == "__main__":
    main()
