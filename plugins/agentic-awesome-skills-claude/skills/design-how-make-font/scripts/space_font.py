"""Space a fitted font: class sidebearings, a global track, kerning carried over, and a collision guard.

  python3 -I space_font.py <in.fit.ttf> targets.json --out <out.ttf> [--track -4] [--kern-scale 1.0]
      [--min-gap 6] [--guard-f] [--no-sides]

1. Sides. Every side of a basic letter is straight, round or other (fontlib.SIDES). Straight and round sides
   move so their class means meet the targets' sidebearings. Other sides (diagonals, open terminals) take
   the mean of their case's two moves. With no sidebearing targets (a screenshot without the sample lines),
   the straight side comes from the measured rhythm: twice the side over the n counter. Accented letters and
   alternates move with their base letter, composites and mark anchors follow, figures and punctuation stay.
2. Track. --track adds the same units to both sides of every glyph with ink. The word space keeps its width.
3. Kerning. The base's pair kerning came through the fit, scaled with the em. --kern-scale multiplies every
   pair value, for a font tracked much tighter or looser than its base.
4. Collision guard. Every pair of letters, figures and common punctuation, plus a list of known traps
   (q j, f ), g y, r . and others) is shaped with kerning. Any pair whose ink comes closer than --min-gap units
   is opened by a new kerning lookup. The guard only opens pairs, never closes them. f on the left is skipped
   unless --guard-f: its hood is meant to overhang, and the f ligatures cover most of those pairs.

Writes the font and <out>.space-log.json with the moves and every pair the guard opened.
"""
import argparse
import os
import sys
import unicodedata

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont  # noqa: E402
from fontTools.ttLib.tables import otBase  # noqa: E402

import fontlib as L  # noqa: E402

GUARD_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?\"'()[]{}-&/"
TRAPS = ["qj", "gj", "yj", "jj", "f)", "f]", "f}", "f?", "f!", "f'", "f\"", "gy", "gg", "yy", "gp", "r.", "r,",
         "y.", "y,", "Tj", "Fj", "Pj", "(j", "[j", "Lj", "\"A", "'A", "7/", "/7"]


def base_letter(name, rev):
    stem, _, suf = name.partition(".")
    cp = rev.get(name) or rev.get(stem)
    if cp is None:
        return None
    if suf and any(t in suf for t in ("sc", "sups", "subs", "sinf", "numr", "dnom", "tf", "osf", "case")):
        return None
    b = unicodedata.normalize("NFD", chr(cp))[0]
    return b if b in L.SIDES else None


def respace(f, tg, log):
    face = L.Face(f)
    k = face.bounds("H")[3] / L.CAP  # cap-normalised -> font units
    m = L.measure_face(face)
    have = m["sides"]
    want = dict(tg.get("sides") or {})
    if not want and tg.get("rhythm") and m.get("n_counter"):
        want["lc_straight"] = tg["rhythm"] * m["n_counter"] / 2
        log["sides_from"] = "rhythm"
    delta = {c: (want[c] - have[c]) * k for c in want if c in have}
    d = {}
    for case in ("lc", "uc"):
        S, R = delta.get(f"{case}_straight"), delta.get(f"{case}_round")
        if S is None and R is None:
            continue
        S = R if S is None else S
        R = S if R is None else R
        d[case] = {"S": S, "R": R, "O": (S + R) / 2}
    log["side_moves"] = {c: {s: round(v, 1) for s, v in x.items()} for c, x in d.items()}
    cmap = f.getBestCmap()
    rev = {}
    for cp, n in sorted(cmap.items(), reverse=True):
        rev[n] = cp
    shift = {}
    for name in f.getGlyphOrder():
        b = base_letter(name, rev)
        if b is None:
            continue
        case = "lc" if b.islower() else "uc"
        if case not in d:
            continue
        shift[name] = (round(d[case][L.SIDES[b][0]]), round(d[case][L.SIDES[b][1]]))
    move(f, shift, log)
    log["respaced_glyphs"] = len(shift)


def move(f, shift, log, adv_only=False):
    """Move each glyph's ink right by its left delta and grow its advance by both deltas."""
    glyf, hm = f["glyf"], f["hmtx"].metrics
    for name, (dl, dr) in shift.items():
        g = glyf[name]
        if not g.isComposite() and g.numberOfContours > 0:
            g.coordinates.translate((dl, 0))
    for name in f.getGlyphOrder():
        g = glyf[name]
        if g.isComposite():
            own = shift.get(name, (0, 0))[0]
            for c in g.components:
                c.x += own - shift.get(c.glyphName, (0, 0))[0]
    for name, (dl, dr) in shift.items():
        adv, lsb = hm[name]
        hm[name] = (adv + dl + dr, lsb)
    n = 0
    if "GPOS" in f:
        for lk in f["GPOS"].table.LookupList.Lookup:
            for sub in lk.SubTable:
                s = sub.ExtSubTable if lk.LookupType == 9 else sub
                kind = type(s).__name__
                if kind == "MarkBasePos":
                    for gname, rec in zip(s.BaseCoverage.glyphs, s.BaseArray.BaseRecord):
                        if gname in shift:
                            for a in rec.BaseAnchor:
                                if a is not None:
                                    a.XCoordinate += shift[gname][0]
                                    n += 1
                elif kind == "MarkLigPos":
                    for gname, lig in zip(s.LigatureCoverage.glyphs, s.LigatureArray.LigatureAttach):
                        if gname in shift:
                            for comp in lig.ComponentRecord:
                                for a in comp.LigatureAnchor:
                                    if a is not None:
                                        a.XCoordinate += shift[gname][0]
                                        n += 1
                elif kind == "MarkMarkPos":
                    for gname, rec in zip(s.Mark2Coverage.glyphs, s.Mark2Array.Mark2Record):
                        if gname in shift:
                            for a in rec.Mark2Anchor:
                                if a is not None:
                                    a.XCoordinate += shift[gname][0]
                                    n += 1
    log["anchors_moved"] = log.get("anchors_moved", 0) + n
    glyf_ = f["glyf"]
    for name in f.getGlyphOrder():
        g = glyf_[name]
        g.recalcBounds(glyf_)
        hm[name] = (hm[name][0], g.xMin if g.numberOfContours != 0 else 0)


def track(f, units, log):
    if not units:
        return
    glyf, hm = f["glyf"], f["hmtx"].metrics
    gdef = f["GDEF"].table.GlyphClassDef.classDefs if "GDEF" in f and f["GDEF"].table.GlyphClassDef else {}
    shift = {}
    for name in f.getGlyphOrder():
        g = glyf[name]
        if g.numberOfContours == 0 or hm[name][0] == 0 or gdef.get(name) == 3:
            continue
        shift[name] = (units, units)
    move(f, shift, log)
    log["track"] = units


def scale_kerning(f, k, log):
    if k == 1 or "GPOS" not in f:
        return
    n = [0]

    def walk(x):
        if isinstance(x, list):
            for y in x:
                walk(y)
            return
        if type(x).__name__ == "ValueRecord":
            if getattr(x, "XAdvance", None):
                x.XAdvance = round(x.XAdvance * k)
                n[0] += 1
            return
        if isinstance(x, otBase.BaseTable):
            for v in vars(x).values():
                if isinstance(v, (list, otBase.BaseTable)) or type(v).__name__ == "ValueRecord":
                    walk(v)
    for lk in f["GPOS"].table.LookupList.Lookup:
        for sub in lk.SubTable:
            s = sub.ExtSubTable if lk.LookupType == 9 else sub
            if type(s).__name__ == "PairPos":
                walk(s)
    log["kern_scale"] = {"factor": k, "values": n[0]}


def guard(f, min_gap, guard_f, log):
    face = L.Face(f)
    cm = face.cmap
    chars = [c for c in GUARD_CHARS if ord(c) in cm]
    pairs = {(a, b) for a in chars for b in chars} | {(p[0], p[1]) for p in TRAPS if all(ord(c) in cm for c in p)}
    prof = {c: face.profile(c, step=4) for c in set(chars) | {c for p in TRAPS for c in p if ord(c) in cm}}
    fixes = {}
    for a, b in sorted(pairs):
        if a == "f" and not guard_f:
            continue
        k = face.kern(a + b)
        if k is None:
            continue
        ra, rb = prof[a], prof[b]
        off = face.adv(a) + k
        gaps = [rb[y][0] + off - ra[y][1] for y in ra if y in rb]
        if gaps and min(gaps) < min_gap:
            fixes[(cm[ord(a)], cm[ord(b)])] = (a + b, round(min_gap - min(gaps)), round(min(gaps), 1))
    log["guard"] = [{"pair": v[0], "open": v[1], "gap_before": v[2]} for v in sorted(fixes.values(), key=lambda x: -x[1])]
    if not fixes:
        return
    from fontTools.otlLib.builder import buildLookup, buildPairPosGlyphs, buildValue
    if "GPOS" not in f or not any(fr.FeatureTag == "kern" for fr in f["GPOS"].table.FeatureList.FeatureRecord):
        from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
        fea = "feature kern {\n" + "".join(f"  pos {a} {b} {v[1]};\n" for (a, b), v in fixes.items()) + "} kern;\n"
        if "GPOS" in f:
            log["guard_note"] = "the font had GPOS but no kern feature; the guard pairs were added as one"
        addOpenTypeFeaturesFromString(f, fea, tables=["GPOS"])
        return
    vals = {(a, b): (buildValue({"XAdvance": v[1]}), None) for (a, b), v in fixes.items()}
    lookup = buildLookup(buildPairPosGlyphs(vals, f.getReverseGlyphMap()))
    gpos = f["GPOS"].table
    gpos.LookupList.Lookup.append(lookup)
    gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
    idx = len(gpos.LookupList.Lookup) - 1
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            fr.Feature.LookupListIndex.append(idx)
            fr.Feature.LookupCount = len(fr.Feature.LookupListIndex)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("font")
    ap.add_argument("targets")
    ap.add_argument("--out", required=True)
    ap.add_argument("--track", type=int, default=0)
    ap.add_argument("--kern-scale", type=float, default=1.0)
    ap.add_argument("--min-gap", type=float)
    ap.add_argument("--guard-f", action="store_true")
    ap.add_argument("--no-sides", action="store_true")
    a = ap.parse_args()
    T = L.load_json(a.targets)
    f = TTFont(a.font)
    log = {"input": os.path.basename(a.font)}
    before = L.measure_face(L.Face(f))["sides"]
    if not a.no_sides:
        respace(f, T["targets"], log)
    track(f, a.track, log)
    scale_kerning(f, a.kern_scale, log)
    min_gap = a.min_gap if a.min_gap is not None else T.get("tolerances", {}).get("min_gap", 6)
    guard(f, min_gap, a.guard_f, log)
    f["OS/2"].recalcAvgCharWidth(f)
    f.save(a.out)
    after = L.measure_face(L.Face(TTFont(a.out)))
    log["sides_before"], log["sides_after"] = before, after["sides"]
    log["min_gap"] = min_gap
    L.save_json(log, a.out + ".space-log.json")
    print(f"wrote {a.out}")
    print(f"  side means before {before}")
    print(f"  side means after  {after['sides']}  (targets {T['targets'].get('sides')})")
    print(f"  moves {log.get('side_moves')}, track {a.track}, kern scale {a.kern_scale}")
    g = log["guard"]
    print(f"  collision guard opened {len(g)} pairs under {min_gap} units: " +
          ", ".join(f"{x['pair']} +{x['open']}" for x in g[:20]) + (" ..." if len(g) > 20 else ""))
    if len(g) > 150:
        print("  more than 150 pairs needed opening: the spacing is too tight. Loosen --track and run again.")


if __name__ == "__main__":
    main()
