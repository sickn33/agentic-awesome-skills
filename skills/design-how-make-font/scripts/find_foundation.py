"""Find the open-licence font closest to targets.json, to build on.

  python3 -I find_foundation.py targets.json --cache DIR --out shortlist.json
      [--category serif] [--shortlist 8] [--families "Family A,Family B"] [--local DIR ...] [--offline]

Two passes.
1. Coarse: the Fontsource catalogue (api.fontsource.org) lists every Google Fonts family with its category,
   licence and scripts. Families that are OFL or Apache, in the category, and cover every script in targets.json
   are kept. One small Latin WOFF2 per family, near weight 400, is measured and ranked.
2. Fine: the best --shortlist families are downloaded whole from the google/fonts GitHub repository, with their
   licence file. A variable font is solved on its weight axis so the n stem meets the target, and sampled across
   its optical-size axis. A width axis makes width gaps cheap, since the fit can close them, so they count less.

--local adds font files you already have (each is checked for an open licence in its name table).
--families skips the coarse pass and measures only those families.
--offline uses only --local and the cache.
Downloads go to --cache and are only read, never run. The ranking is a distance: each number's gap to the
target, divided by what counts as a small gap, squared, weighted, summed, square-rooted. The score adds a
penalty for missing axes: 0 with wdth and wght, 0.5 to 0.75 with wght alone, 1.5 for a static font. Lower is
closer. Math, symbol and icon families are skipped, and so are families whose main script is not one asked for.
"""
import argparse
import glob
import json
import os
import re
import sys
import subprocess
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont  # noqa: E402

import fontlib as L  # noqa: E402

UA = {"User-Agent": "make-font-skill/1.0"}
CATALOG = "https://api.fontsource.org/v1/fonts"
TREE = "https://api.github.com/repos/google/fonts/git/trees/main?recursive=1"
RAW = "https://raw.githubusercontent.com/google/fonts/main/"
COARSE = "https://cdn.jsdelivr.net/fontsource/fonts/{id}@latest/latin-{w}-normal.woff2"
OPEN = ("OFL-1.1", "Apache-2.0", "OFL", "Apache License, Version 2.0")
USEFUL_AXES = ("wdth", "wght", "opsz", "GRAD")
SKIP_WORDS = ("Math", "Symbols", "Icons", "Emoji", "Barcode")



def safe(name):
    """A catalogue id or family as a cache file name: letters, digits, _ and - only, so no entry can leave --cache."""
    return re.sub(r"[^A-Za-z0-9_-]", "_", str(name))

def axis_penalty(axes):
    """A static font can only be scaled, so it ranks behind a close variable one. wdth matters most."""
    useful = [a for a in USEFUL_AXES if a in axes]
    if "wdth" in useful and "wght" in useful:
        return 0.0
    if "wght" in useful:
        return 0.5 if len(useful) > 1 else 0.75
    return 1.5


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        ctx = None
        try:
            import certifi
            import ssl
            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            pass
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=ctx) as r:
            data = r.read()
        with open(path, "wb") as fh:
            fh.write(data)
    except urllib.error.URLError:
        # Some Python installs ship without CA certificates. curl uses the system's.
        subprocess.run(["curl", "-fsSL", "-A", UA["User-Agent"], "-o", path, url], check=True)
    return path


def licence_of(font, ofl_text=None):
    n = font["name"]
    txt = " ".join(filter(None, [n.getDebugName(13), n.getDebugName(14), ofl_text or ""]))
    kind = "OFL-1.1" if re.search(r"Open Font License|openfontlicense|scripts\.sil\.org/OFL", txt, re.I) else \
        "Apache-2.0" if re.search(r"Apache License", txt, re.I) else None
    rfn = re.findall(r"Reserved Font Names? \"?([^\".\n]+)", ofl_text or "")
    return {"licence": kind, "reserved_font_names": [r.strip() for r in rfn],
            "copyright": n.getDebugName(0), "trademark": n.getDebugName(7)}


def evaluate(path, tg, styles, use, quick=False):
    """Measure one candidate the way the targets were measured. Returns the best location and its distance."""
    f = TTFont(path)
    axes = L.axes_of(f)
    small = L.subset_font(f, L.SOLVE_TEXT, layout=False)
    stem = styles[0].get("n_stem") or tg.get("n_stem")
    opsz_try = [None]
    if "opsz" in axes and not quick:
        lo, de, hi = axes["opsz"]
        pref = {"text": [lo + (de - lo) * 0.5, de, de + (hi - de) * 0.15],
                "ui": [de, lo + (de - lo) * 0.5],
                "display": [de, de + (hi - de) * 0.35, hi]}[use]
        opsz_try = sorted({round(min(max(v, lo), hi), 1) for v in pref})
    width_weight = 0.25 if "wdth" in axes else 1.0
    best = None
    for opsz in opsz_try:
        loc = {} if opsz is None else {"opsz": opsz}
        try:
            if "wght" in axes and stem and not quick:
                w, _ = L.solve_axis(lambda v: L.Face(small, {**loc, "wght": v}), L.stem_cap700, stem,
                                    axes["wght"][0], axes["wght"][2], iters=10)
                loc["wght"] = round(w, 1)
            m = L.measure_face(L.Face(small, loc or None))
        except Exception as e:  # a font without the letters the measurement needs
            return {"error": f"{type(e).__name__}: {e}"}
        skip = ("n_stem",) if quick or "wght" not in axes else ()
        d, deltas = L.distance(tg, m, width_weight, skip)
        if best is None or d < best["distance"]:
            best = {"distance": d, "deltas": deltas, "loc": loc, "measured": m}
    best["axes"] = axes
    best["useful_axes"] = [a for a in USEFUL_AXES if a in axes]
    best["glyphs"] = len(f.getGlyphOrder())
    return best


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("targets")
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--category")
    ap.add_argument("--shortlist", type=int, default=8)
    ap.add_argument("--families", default="")
    ap.add_argument("--local", action="append", default=[])
    ap.add_argument("--offline", action="store_true")
    a = ap.parse_args()
    T = L.load_json(a.targets)
    tg, styles, use = T["targets"], T["styles"], T.get("use", "text")
    scripts = set(T.get("scripts", ["latin"]))
    category = a.category or ("serif" if tg.get("serif") else "sans-serif")
    rows = []

    for d in a.local:
        for p in sorted(glob.glob(os.path.join(d, "*.[ot]tf")) + glob.glob(os.path.join(d, "*.woff2"))):
            f = TTFont(p)
            lic = licence_of(f)
            name = f["name"].getDebugName(16) or f["name"].getDebugName(1)
            if not lic["licence"]:
                print(f"skip {os.path.basename(p)}: no open licence in its name table, so it cannot be a base")
                continue
            r = evaluate(p, tg, styles, use)
            rows.append({"family": name, "file": p, "origin": "local", **lic, **r})
            print(f"local  {name:28s} distance {r.get('distance')}", flush=True)

    if not a.offline:
        tree_path = fetch(TREE, os.path.join(a.cache, "google-fonts-tree.json"))
        tree = [t["path"] for t in json.load(open(tree_path))["tree"]]
        catalog = json.load(open(fetch(CATALOG, os.path.join(a.cache, "fontsource-catalog.json"))))
        wanted = [s.strip().lower() for s in a.families.split(",") if s.strip()]
        fams = [c for c in catalog if c.get("type") == "google" and c.get("license") in OPEN
                and c.get("category") == category and scripts <= set(c.get("subsets", []))
                and "normal" in c.get("styles", []) and c.get("defSubset") in scripts
                and not any(w in c["family"] for w in SKIP_WORDS)]
        if wanted:
            fams = [c for c in catalog if c["family"].lower() in wanted]
        print(f"catalogue: {len(fams)} {category} families, open licence, covering {sorted(scripts)}", flush=True)
        coarse = []
        if not wanted:
            for c in fams:
                w = min(c.get("weights") or [400], key=lambda x: abs(x - styles[0].get("weight", 400)))
                p = os.path.join(a.cache, "coarse", f"{safe(c['id'])}-{w}.woff2")
                try:
                    fetch(COARSE.format(id=c["id"], w=w), p)
                    r = evaluate(p, tg, styles, use, quick=True)
                except Exception as e:
                    r = {"error": str(e)}
                if "distance" in r:
                    folder = c["family"].lower().replace(" ", "").replace("-", "")
                    vf = [p for p in tree if p.split("/")[1:2] == [folder] and "[" in p and "Italic" not in p]
                    axes = dict.fromkeys(vf[0].split("[")[1].split("]")[0].split(",")) if vf else {}
                    coarse.append((r["distance"] + axis_penalty(axes), c))
            coarse.sort(key=lambda x: x[0])
            print("coarse ranking, top 15:", ", ".join(f"{c['family']} {d:.1f}" for d, c in coarse[:15]), flush=True)
            fams = [c for _, c in coarse[:a.shortlist]]
        for c in fams:
            folder = c["family"].lower().replace(" ", "").replace("-", "")
            files = [p for lic in ("ofl", "apache") for p in tree
                     if p.startswith(f"{lic}/{folder}/") and p.endswith(".ttf") and "Italic" not in p]
            if not files:
                print(f"skip {c['family']}: no files found in google/fonts/{folder}")
                continue
            vf = [p for p in files if "[" in p]
            path = vf[0] if vf else next((p for p in files if p.endswith("-Regular.ttf")), files[0])
            local = fetch(RAW + urllib.parse.quote(path), os.path.join(a.cache, "full", safe(folder), os.path.basename(path)))
            lic_file = next((p for p in tree if p.startswith(os.path.dirname(path) + "/") and
                             os.path.basename(p) in ("OFL.txt", "LICENSE.txt")), None)
            ofl_text = open(fetch(RAW + urllib.parse.quote(lic_file), os.path.join(a.cache, "full", safe(folder), os.path.basename(lic_file))),
                            encoding="utf-8", errors="replace").read() if lic_file else None
            r = evaluate(local, tg, styles, use)
            lic = licence_of(TTFont(local), ofl_text)
            rows.append({"family": c["family"], "file": local, "origin": "google/fonts/" + path,
                         "licence_file": lic_file, **lic, **r})
            print(f"fine   {c['family']:28s} distance {r.get('distance')} at {r.get('loc')}", flush=True)

    rows = [r for r in rows if "distance" in r]
    for r in rows:
        r["score"] = round(r["distance"] + axis_penalty(r["axes"]), 3)
    rows.sort(key=lambda r: r["score"])
    L.save_json({"targets": a.targets, "category": category, "rows": rows}, a.out)
    print(f"\nshortlist ({len(rows)}), closest first. Deltas are candidate minus target, widths in percent:")
    keys = ["xh_cap", "contrast", "bar_stem", "serif_ext", "rhythm"]
    print(f"  {'family':26s} {'score':>6s} {'axes':16s} " + " ".join(f"{k:>9s}" for k in keys) + "  widths (lc / uc)")
    for r in rows:
        dl = r["deltas"]
        wl = [v for k, v in dl.items() if k.startswith("w_lc")]
        wu = [v for k, v in dl.items() if k.startswith("w_uc")]
        ws = f"{sum(wl) / len(wl) * 100:+.1f}% / {sum(wu) / len(wu) * 100:+.1f}%" if wl and wu else ""
        print(f"  {r['family'][:26]:26s} {r['score']:6.2f} {','.join(r['useful_axes']):16s} " +
              " ".join(f"{dl.get(k, ''):>9}" for k in keys) + f"  {ws}  {r.get('licence')}"
              + (f" RFN {r['reserved_font_names']}" if r.get("reserved_font_names") else ""))
    print(f"\nwrote {a.out}")


if __name__ == "__main__":
    main()
