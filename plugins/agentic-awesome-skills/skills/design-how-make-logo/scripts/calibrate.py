"""Set the distance limit from the references themselves (references/distance.md).

    python3 -I calibrate.py measurements.json --out calibration.json [--false-alarm 0.10]

Two sets of pairs:
- different: every pair of distinct references. Real, clearly different logos; the limit must pass almost all of them.
- near copies: each reference against edited copies of itself, the edits a "trace and change" would make: turned,
  thickened, thinned, stretched, a part cut away, a part added, mirrored, and three of those at once.

Each single measure's limit is the value only `--false-alarm` of different pairs reach. The fused score's limit is
stricter and the one that counts: the value only `--false-alarm` of references reach against their NEAREST other
reference, because a variant is checked against all of them at once. The report says how many near copies each
catches. Pairs of references that are the same logo uploaded twice show up as
the most similar "different" pairs; they're listed and left out.
"""
from __future__ import annotations

import argparse
import itertools
import json
import os
import sys

import numpy as np
from scipy import ndimage as ndi
from skimage import draw, transform

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import distance as D  # noqa: E402
import logolib as L  # noqa: E402


def edits(mask: np.ndarray, rng: np.random.Generator) -> dict[str, np.ndarray]:
    h, w = mask.shape
    k = max(1, round(0.012 * max(h, w)))
    out = {
        "turned 4°": transform.rotate(mask.astype(float), 4, resize=True, order=0) > 0.5,
        "thicker": ndi.binary_dilation(mask, iterations=k),
        "thinner": ndi.binary_erosion(mask, iterations=max(1, k // 2)) if ndi.binary_erosion(mask, iterations=max(1, k // 2)).sum() > 0.4 * mask.sum() else mask,
        "stretched 10%": transform.resize(mask.astype(float), (h, round(w * 1.1)), order=0) > 0.5,
        "mirrored": mask[:, ::-1],
    }
    cut = mask.copy()
    rows, cols = np.nonzero(mask)
    i = rng.integers(len(rows))
    r0, c0 = rows[i], cols[i]
    cut[max(0, r0 - h // 6):r0 + h // 6, max(0, c0 - w // 6):c0 + w // 6] = False
    out["part cut away"] = cut if cut.sum() > 0.3 * mask.sum() else mask
    add = mask.copy()
    rr, cc = draw.disk((rng.integers(h // 4, 3 * h // 4 + 1), rng.integers(w // 4, 3 * w // 4 + 1)), max(h, w) / 12, shape=mask.shape)
    add[rr, cc] = ~add[rr, cc]
    out["part added"] = add
    combo = ndi.binary_dilation(cut, iterations=k)
    combo = transform.resize(combo.astype(float), (h, round(w * 1.1)), order=0) > 0.5
    out["three at once"] = transform.rotate(combo.astype(float), -3, resize=True, order=0) > 0.5
    return out


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def fit(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Logistic regression with the two classes weighted equally and a little L2, by Newton's method."""
    Xb = np.hstack([X, np.ones((len(X), 1))])
    cw = np.where(y == 1, 0.5 / max(1, y.sum()), 0.5 / max(1, (1 - y).sum()))
    w = np.zeros(Xb.shape[1])
    for _ in range(50):
        p = sigmoid(Xb @ w)
        g = Xb.T @ (cw * (p - y)) + 1e-4 * w
        H = (Xb * (cw * p * (1 - p))[:, None]).T @ Xb + 1e-4 * np.eye(len(w))
        w -= np.linalg.solve(H, g)
    return w


def crop(m: np.ndarray) -> np.ndarray:
    rows, cols = np.nonzero(m)
    return m[rows.min():rows.max() + 1, cols.min():cols.max() + 1]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("measurements")
    ap.add_argument("--out", required=True)
    ap.add_argument("--false-alarm", type=float, default=0.10,
                    help="share of original marks the check may wrongly flag against their NEAREST reference (default 0.10)")
    a = ap.parse_args()
    refs = [r for r in json.load(open(a.measurements))["references"] if r["usable"]]
    rng = np.random.default_rng(7)
    masks, prepared = [], []
    for r in refs:
        m = L.segment(L.load(r["file"]))["mask"]
        masks.append(m)
        prepared.append(D.prepare(m))
    measures = ("overlap", "edges", "hash", "similarity")
    score = {"overlap": lambda d: d["overlap"], "edges": lambda d: -d["edges"], "hash": lambda d: d["hash"], "similarity": lambda d: d["similarity"]}

    different, dupes = [], []
    for i, j in itertools.combinations(range(len(refs)), 2):
        d = D.compare(prepared[i], prepared[j])
        (dupes if d["overlap"] > 0.9 else different).append((i, j, d))
    # The same pairs the other way round: compare() tries the candidate's poses only.
    rev = [(i, j, D.compare(prepared[j], prepared[i])) for i, j, _ in different]
    copies, copies_by_ref = {}, {}
    for i, m in enumerate(masks):
        for name, e in edits(m, rng).items():
            if e.sum() < 16:
                continue
            d = D.compare(D.prepare(crop(e)), prepared[i])
            copies.setdefault(name, []).append(d)
            copies_by_ref.setdefault(name, []).append((i, d))

    report = {"references": len(refs), "different_pairs": len(different), "same_logo_twice": [[refs[i]["file"], refs[j]["file"]] for i, j, _ in dupes], "measures": {}}
    print(f"{len(refs)} references, {len(different)} different pairs, {len(dupes)} pairs set aside as the same logo twice")
    for mname in measures:
        vals = np.array([score[mname](d) for _, _, d in different])
        limit = float(np.quantile(vals, 1 - a.false_alarm))
        caught = {name: float(np.mean([score[mname](d) >= limit for d in ds])) for name, ds in copies.items()}
        report["measures"][mname] = {"limit": round(abs(limit), 3), "caught": {k: round(v, 3) for k, v in caught.items()}}
        print(f"\n{mname}: limit {abs(limit):.3f} flags {a.false_alarm:.0%} of different pairs")
        for name, v in caught.items():
            print(f"  {v:6.1%}  {name}")
    # A fused score: logistic regression on the three measures, fitted on half the references and tested on the other
    # half, then refitted on all of them for use. Its limit is set the same way, on held-out different pairs.
    def feats(d):
        return [d["overlap"], d["edges"] / 100, d["hash"]]
    half = set(rng.permutation(len(refs))[: len(refs) // 2].tolist())
    def rows(keep):
        X, y = [], []
        for i, j, d in different:
            if keep(i) and keep(j):
                X.append(feats(d)); y.append(0)
        for name, ds in copies_by_ref.items():
            for i, d in ds:
                if keep(i):
                    X.append(feats(d)); y.append(1)
        return np.array(X), np.array(y)
    def nearest(wt, keep):
        """For each kept reference, its highest score against any other kept reference, both directions: what a new,
        original mark meets when it's checked against the whole set."""
        best = {}
        for i, j, d in different + [(j, i, d2) for i, j, d2 in rev]:
            if keep(i) and keep(j):
                sc = float(sigmoid(np.array(feats(d)) @ wt[:-1] + wt[-1]))
                best[i] = max(best.get(i, 0.0), sc)
        return list(best.values())
    Xa, ya = rows(lambda i: i in half)
    w = fit(Xa, ya)
    held = lambda i: i not in half
    lim = float(np.quantile(nearest(w, held), 1 - a.false_alarm))
    caught = {name: float(np.mean([sigmoid(np.array(feats(d)) @ w[:-1] + w[-1]) >= lim for i, d in ds if held(i)])) for name, ds in copies_by_ref.items()}
    print(f"\nfused (held-out half): limit {lim:.3f} flags {a.false_alarm:.0%} of references against their nearest other")
    for name, v in caught.items():
        print(f"  {v:6.1%}  {name}")
    Xall, yall = rows(lambda i: True)
    w_all = fit(Xall, yall)
    near_all = nearest(w_all, lambda i: True)
    lim_all = float(np.quantile(near_all, 1 - a.false_alarm))
    caught_all = {name: float(np.mean([sigmoid(np.array(feats(d)) @ w_all[:-1] + w_all[-1]) >= lim_all for _, d in ds])) for name, ds in copies_by_ref.items()}
    print(f"\nfused (all {len(refs)}, in sample): limit {lim_all:.3f}")
    for name, v in caught_all.items():
        print(f"  {v:6.1%}  {name}")
    report["fused"] = {"weights": [round(float(v), 4) for v in w_all], "features": ["overlap", "edges/100", "hash"],
                       "limit": round(float(np.quantile(near_all, 1 - a.false_alarm)), 4), "held_out_caught": {k: round(v, 3) for k, v in caught.items()},
                       "false_alarm": "share of references whose nearest other reference reaches the limit",
                       "nearest_median": round(float(np.median(near_all)), 4), "in_sample_caught": {k: round(v, 3) for k, v in caught_all.items()}}
    sim = {"limit": report["fused"]["limit"], "caught": report["fused"]["held_out_caught"]}
    singles = [v for k, v in sim["caught"].items() if k != "three at once"]
    report["limit"] = sim["limit"]
    report["score"] = "fused"
    report["verdict"] = {"single edits caught": round(min(singles), 3), "three at once caught": sim["caught"].get("three at once")}
    worst = sorted(different, key=lambda t: -t[2]["similarity"])[:8]
    report["closest_different"] = [{"a": refs[i]["file"], "b": refs[j]["file"], **d} for i, j, d in worst]
    json.dump(report, open(a.out, "w"), indent=1)
    print(f"\nlimit {report['limit']:.3f}; weakest single edit caught {min(singles):.1%}; three at once {sim['caught'].get('three at once', 0):.1%}")


if __name__ == "__main__":
    main()
