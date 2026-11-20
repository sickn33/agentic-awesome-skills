"""Bend an open variable font to targets.json: one static TTF per style.

  python3 -I fit_font.py <base-vf.ttf> targets.json --out-dir DIR [--loc opsz=14] [--style Regular]
      [--max-stretch 0.03] [--tol 0.3] [--no-contrast]

This script opens the base font and targets.json. It never opens a reference font: the references reach it
only as the numbers in targets.json.

For each style:
1. The y instance. The weight axis is solved so the n stem meets the target. If the base has an optical-size
   axis and --loc does not fix it, opsz is scanned too, for the o contrast and the H bar closest to the
   targets. Every y coordinate comes from this instance, so x-height, bars and thin strokes come from it.
2. One x instance per width class. On a width axis, wdth is solved so the class's mean advance meets its
   target, and wght is solved again at that width so the class's stem stays on target. Where the axis runs
   out, the class is scaled horizontally by at most --max-stretch (3 % by default), with the weight solved for
   the stem the stretch will produce. Accented letters and alternates follow their base letter's class.
   Glyphs in no class take the y instance's own x.
3. Assembly. Every location of one variable font has the same points, so each glyph takes x from its class
   instance and y from the y instance. Advances, components and mark anchors follow.
4. Iteration. The class sidebearings are set (space_font.respace), because an advance is ink plus sides.
   Then the assembled font is measured and each class's factor corrected, until every class mean is
   within --tol percent of its target (or the stretch limit is reached, which the log reports).
5. Overlaps are removed (needs skia-pathops), the font is scaled so its cap height per em matches the target
   (or the base's), and the variation tables are dropped.

Output: <DIR>/<Family>-<Style>.fit.ttf and fit-log.json. The fonts still carry the base's names: package.py
renames them. Run space_font.py next.
"""
import argparse
import copy
import os
import statistics as st
import sys
import unicodedata

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont  # noqa: E402
from fontTools.ttLib.scaleUpem import scale_upem  # noqa: E402
from fontTools.varLib import instancer  # noqa: E402

import fontlib as L  # noqa: E402
import space_font  # noqa: E402

STEM_CHAR = {"lc": "n", "uc": "H", "figures": "H"}


def parse_loc(s):
    return {k.strip(): float(v) for k, v in (p.split("=") for p in s.split(",") if p.strip())} if s else {}


class Base:
    """The variable font, a small subset of it for fast solving, and a cache of full instances."""

    def __init__(self, path):
        self.path = path
        self.vf = TTFont(path)
        if "glyf" not in self.vf:
            raise SystemExit("the base must be a TrueType-flavoured variable font (glyf/gvar). CFF2 is not handled.")
        if "fvar" not in self.vf:
            raise SystemExit("the base is not a variable font. Use a static only with --max-stretch, through a VF "
                             "made from it, or pick a variable candidate from the shortlist.")
        self.axes = L.axes_of(self.vf)
        self.small = L.subset_font(self.vf, L.SOLVE_TEXT, layout=False)
        self.cache, self.subsets = {}, {}

    def clamp(self, loc):
        """Every axis pinned: the ones not given sit at their default, so no variation data survives."""
        return {k: min(max(loc.get(k, de), lo), hi) for k, (lo, de, hi) in self.axes.items()}

    def tiny(self, loc, text=None):
        """A fast instance: only the glyphs `text` needs (all letters and figures by default), no layout."""
        if text is None:
            return L.Face(self.small, self.clamp(loc))
        if text not in self.subsets:
            self.subsets[text] = L.subset_font(self.small, text, layout=False)
        return L.Face(self.subsets[text], self.clamp(loc))

    def full(self, loc):
        key = tuple(sorted((k, round(v, 2)) for k, v in self.clamp(loc).items()))
        if key not in self.cache:
            self.cache[key] = instancer.instantiateVariableFont(copy.deepcopy(self.vf), dict(key), updateFontNames=False)
        return self.cache[key]


def raw_stem(face, ch):
    xh = face.bounds("x")[3]
    cap = face.bounds("H")[3]
    y = xh * 0.5 if ch == "n" else cap * 0.3
    r = face.hspans(ch, y)[0]
    return r[1] - r[0]


def solve_wght(B, loc, ch, target_raw):
    if "wght" not in B.axes:
        return loc
    lo, _, hi = B.axes["wght"]
    w, _ = L.solve_axis(lambda v: B.tiny({**loc, "wght": v}, "nHx"), lambda f: raw_stem(f, ch), target_raw, lo, hi, iters=10)
    return {**loc, "wght": round(w, 2)}


def class_mean(face, chars):
    have = [c for c in chars if face.has(c)]
    return st.mean(face.adv(c) for c in have) if have else None


def case_of(cls):
    return "figures" if cls == "figures" else cls[:2]


# ------------------------------------------------------------------ glyph membership
def class_map(f):
    """glyph name -> width class, for basic letters, their accented forms and suffixed alternates."""
    letter_class = {c: cls for cls, chars in L.CLASSES.items() for c in chars}
    cmap = f.getBestCmap()
    rev = {}
    for cp, n in sorted(cmap.items(), reverse=True):
        rev[n] = cp
    out = {}
    for name in f.getGlyphOrder():
        stem, _, suf = name.partition(".")
        cp = rev.get(name) or rev.get(stem)
        if cp is None:
            continue
        if suf and any(t in suf for t in ("sc", "c2sc", "sups", "subs", "sinf", "numr", "dnom", "tf", "osf", "case")):
            continue
        ch = chr(cp)
        base = unicodedata.normalize("NFD", ch)[0]
        if base in letter_class:
            out[name] = letter_class[base]
    # Composites built only from members of one class join it.
    glyf = f["glyf"]
    for _ in range(3):
        for name in f.getGlyphOrder():
            g = glyf[name]
            if name not in out and g.isComposite():
                cls = {out.get(c.glyphName) for c in g.components} - {None}
                if len(cls) == 1 and all(out.get(c.glyphName) in cls or _is_mark(f, c.glyphName) for c in g.components):
                    out[name] = cls.pop()
    return out


def _is_mark(f, name):
    gdef = f["GDEF"].table if "GDEF" in f else None
    cd = gdef.GlyphClassDef.classDefs if gdef and gdef.GlyphClassDef else {}
    return cd.get(name) == 3


# ------------------------------------------------------------------ assembly
def glyph_bounds(f, name):
    from fontTools.pens.boundsPen import BoundsPen
    gs = f.getGlyphSet()
    p = BoundsPen(gs)
    gs[name].draw(p)
    return p.bounds


def mix(fy, src, cmap_cls, factor, log):
    """x from each glyph's class instance times the class factor, y from fy. fy's copy is the result."""
    f = copy.deepcopy(fy)
    glyf, hm = f["glyf"], f["hmtx"].metrics
    gy = fy["glyf"]
    from fontTools.pens.boundsPen import BoundsPen
    gs = fy.getGlyphSet()
    centers = {}
    for name in f.getGlyphOrder():
        p = BoundsPen(gs)
        gs[name].draw(p)
        centers[name] = (p.bounds[0] + p.bounds[2]) / 2 if p.bounds else 0
    for name in f.getGlyphOrder():
        cls = cmap_cls.get(name)
        if cls is None:
            continue
        k = factor[cls]
        xs = src[cls]
        gx, g, b = xs["glyf"][name], glyf[name], gy[name]
        if g.isComposite():
            for c, cx, cb in zip(g.components, gx.components, b.components):
                kc = factor.get(cmap_cls.get(c.glyphName), 1.0) if cmap_cls.get(c.glyphName) else 1.0
                c.x = round(cx.x * k + centers[c.glyphName] * (k - kc))
                c.y = cb.y
        elif g.numberOfContours > 0:
            if len(gx.coordinates) != len(b.coordinates):
                raise SystemExit(f"{name}: instances are not point-compatible")
            g.coordinates = type(g.coordinates)([(round(px[0] * k), py[1]) for px, py in zip(gx.coordinates, b.coordinates)])
        hm[name] = (round(xs["hmtx"].metrics[name][0] * k), hm[name][1])
    # Mark-to-base and mark-to-ligature anchors on moved glyphs: x from their class instance, times the factor.
    n = 0
    if "GPOS" in f:
        for cls, xs in src.items():
            k = factor[cls]
            for lk, lks in zip(f["GPOS"].table.LookupList.Lookup, xs["GPOS"].table.LookupList.Lookup):
                for s1, s2 in zip(lk.SubTable, lks.SubTable):
                    a = s1.ExtSubTable if lk.LookupType == 9 else s1
                    b = s2.ExtSubTable if lk.LookupType == 9 else s2
                    kind = type(a).__name__
                    if kind == "MarkBasePos":
                        for gname, rec, recs in zip(a.BaseCoverage.glyphs, a.BaseArray.BaseRecord, b.BaseArray.BaseRecord):
                            if cmap_cls.get(gname) == cls:
                                for an, ans in zip(rec.BaseAnchor, recs.BaseAnchor):
                                    if an is not None and ans is not None:
                                        an.XCoordinate = round(ans.XCoordinate * k)
                                        n += 1
                    elif kind == "MarkLigPos":
                        for gname, lig, ligs in zip(a.LigatureCoverage.glyphs, a.LigatureArray.LigatureAttach,
                                                    b.LigatureArray.LigatureAttach):
                            if cmap_cls.get(gname) == cls:
                                for comp, comps in zip(lig.ComponentRecord, ligs.ComponentRecord):
                                    for an, ans in zip(comp.LigatureAnchor, comps.LigatureAnchor):
                                        if an is not None and ans is not None:
                                            an.XCoordinate = round(ans.XCoordinate * k)
                                            n += 1
    log.append(f"assembled: {len(cmap_cls)} glyphs in width classes, {n} base anchors moved with them")
    return f


def fix_lsb(f):
    glyf, hm = f["glyf"], f["hmtx"].metrics
    for name in f.getGlyphOrder():
        g = glyf[name]
        g.recalcBounds(glyf)
        hm[name] = (hm[name][0], g.xMin if g.numberOfContours != 0 else 0)


def finish(f, cap_em, vm_target):
    """Remove overlaps, scale to the target cap height per em, set vertical metrics, drop variation tables."""
    notes = []
    try:
        from fontTools.ttLib.removeOverlaps import removeOverlaps
        removeOverlaps(f)
        notes.append("overlaps removed")
    except ImportError:
        notes.append("skia-pathops missing: overlaps kept (the OVERLAP_SIMPLE flag still makes them render)")
    cap = glyph_bounds(f, f.getBestCmap()[ord("H")])[3]
    if cap_em:
        f["head"].unitsPerEm = round(1000 * cap / cap_em)
    scale_upem(f, 1000)
    notes.append(f"scaled to 1000 upm, cap height {round(glyph_bounds(f, f.getBestCmap()[ord('H')])[3], 1)}")
    for t in ("STAT", "MVAR", "HVAR", "VVAR", "avar", "fvar", "gvar", "cvar", "DSIG"):
        if t in f:
            del f[t]
    fix_lsb(f)
    os2, hh = f["OS/2"], f["hhea"]
    glyf = f["glyf"]
    ymax = max((glyf[n].yMax for n in f.getGlyphOrder() if glyf[n].numberOfContours != 0), default=0)
    ymin = min((glyf[n].yMin for n in f.getGlyphOrder() if glyf[n].numberOfContours != 0), default=0)
    if vm_target:
        k = 1000 / vm_target["upm"]
        a, d, g = (round(v * k) for v in vm_target["typo"])
        hh.ascent, hh.descent, hh.lineGap = a, d, g
        os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = a, d, g
        os2.fsSelection |= 1 << 7
        notes.append(f"line box from the reference: {a} / {d} / {g}")
    os2.usWinAscent = max(os2.usWinAscent, ymax, hh.ascent)
    os2.usWinDescent = max(os2.usWinDescent, -ymin, -hh.descent)
    hh.numberOfHMetrics = len(f["hmtx"].metrics)
    os2.recalcAvgCharWidth(f)
    cm = f.getBestCmap()
    os2.sxHeight = round(glyph_bounds(f, cm[ord("x")])[3])
    os2.sCapHeight = round(glyph_bounds(f, cm[ord("H")])[3])
    return notes


def fit_style(B, T, style, args, log):
    tg = T["targets"]
    fixed = parse_loc(args.loc)
    first = T["styles"][0]
    # Stem target: the style's own. Else find the base weight that draws the first style's stem, step it by the
    # difference in weight class (500 - 400 = +100), and take the stem the base draws there.
    stem_t = style.get("n_stem")
    if stem_t is None and "wght" in B.axes:
        cap = B.tiny(fixed, "nHx").bounds("H")[3]
        w1 = solve_wght(B, fixed, "n", first["n_stem"] * cap / L.CAP)["wght"]
        w2 = min(max(w1 + style["weight"] - first["weight"], B.axes["wght"][0]), B.axes["wght"][2])
        stem_t = L.stem_cap700(B.tiny({**fixed, "wght": w2}, "nHx"))
        log.append(f"{style['name']}: n stem target {stem_t:.1f}: the first style sits at wght {w1:.0f} on the base, "
                   f"this one {style['weight'] - first['weight']:+d} from it at wght {w2:.0f}")
    elif stem_t is None:
        stem_t = first["n_stem"]
        log.append(f"{style['name']}: the base has no weight axis, so it keeps the first style's stem")
    else:
        log.append(f"{style['name']}: n stem target {stem_t:.1f}")
    # 1. y instance
    tries = [dict(fixed)]
    if "opsz" in B.axes and "opsz" not in fixed and not args.no_contrast and tg.get("contrast"):
        lo, de, hi = B.axes["opsz"]
        tries = [{**fixed, "opsz": round(lo + (hi - lo) * i / 8, 2)} for i in range(9)]
    best = None
    for loc in tries:
        cap = B.tiny(loc, "nHx").bounds("H")[3]
        loc = solve_wght(B, loc, "n", stem_t * cap / L.CAP)
        m = L.measure_face(B.tiny(loc))
        err = sum(((m.get(k) or 0) - tg[k]) ** 2 / s ** 2 for k, s in (("contrast", 0.04), ("bar_stem", 0.06), ("xh_cap", 0.01))
                  if tg.get(k) is not None)
        if best is None or err < best[0]:
            best = (err, loc, m)
    _, yloc, ym = best
    log.append(f"{style['name']}: y instance {yloc}: contrast {ym['contrast']} (target {tg.get('contrast')}), "
               f"bar/stem {ym['bar_stem']} (target {tg.get('bar_stem')}), x-height/cap {ym['xh_cap']} (target {tg.get('xh_cap')})")
    cap_y = B.tiny(yloc, "nHx").bounds("H")[3]
    to_cap = L.CAP / cap_y  # raw units of the y instance -> cap-normalised
    # 2. x instance per class
    xloc, factor, aim = {}, {}, {}
    widths = tg.get("widths", {})
    H_t = (tg.get("H_stem") or stem_t * 1.05) * stem_t / (tg.get("n_stem") or stem_t)
    base_loc = {k: v for k, v in yloc.items() if k != "wght"}

    def solve_class(cls, target):
        """Location and factor that give this class `target` mean advance (raw units of the y instance)."""
        chars = L.CLASSES[cls]
        ch = STEM_CHAR[case_of(cls)]
        stem_raw = (stem_t if ch == "n" else H_t) / to_cap

        def mean_at(wd, s=1.0):
            l2 = solve_wght(B, {**base_loc, "wdth": wd} if "wdth" in B.axes else base_loc, ch, stem_raw / s)
            return class_mean(B.tiny(l2, chars + "nHx"), chars) * s, l2
        if "wdth" in B.axes:
            lo, de, hi = B.axes["wdth"]
            wd, _ = L.solve_axis(lambda v: v, lambda v: mean_at(v)[0], target, lo, hi, iters=9)
            got, l2 = mean_at(wd)
        else:
            got, l2 = mean_at(None)
        s = min(max(target / got, 1 - args.max_stretch), 1 + args.max_stretch)
        if abs(s - 1) > 1e-4:
            _, l2 = mean_at(l2.get("wdth"), s)
        return l2, round(s, 4)

    for cls in L.CLASSES:
        if cls not in widths:
            xloc[cls], factor[cls] = dict(yloc), 1.0
            continue
        aim[cls] = widths[cls] / to_cap
        xloc[cls], factor[cls] = solve_class(cls, aim[cls])
    # 3 and 4. assemble, measure, correct the factors
    fy = B.full(yloc)
    cls_of = class_map(fy)
    src = {cls: B.full(xloc[cls]) for cls in L.CLASSES}
    hist = []
    for it in range(args.iters):
        f = mix(fy, src, cls_of, factor, [])
        if tg.get("sides") or tg.get("rhythm"):
            space_font.respace(f, tg, {})  # widths include the sides, so set the sides before measuring widths
        face = L.Face(f)
        k = L.CAP / face.bounds("H")[3]
        errs = {}
        for cls, chars in L.CLASSES.items():
            if cls in widths:
                errs[cls] = class_mean(face, chars) * k / widths[cls] - 1
        hist.append({"iteration": it + 1, "factor": dict(factor),
                     "error_pct": {c: round(e * 100, 3) for c, e in errs.items()}})
        if all(abs(e) * 100 <= args.tol for e in errs.values()):
            break
        for cls, e in errs.items():
            new = factor[cls] / (1 + e)
            if abs(new - 1) > args.max_stretch and "wdth" in B.axes and abs(e) * 100 > args.tol:
                # The sidebearing moves pushed this class past the stretch limit: aim the width axis further
                # and take a new instance, instead of stretching.
                aim[cls] /= (1 + e)
                xloc[cls], factor[cls] = solve_class(cls, aim[cls])
                src[cls] = B.full(xloc[cls])
                continue
            factor[cls] = round(min(max(new, 1 - args.max_stretch), 1 + args.max_stretch), 4)
    alog = []
    f = mix(fy, src, cls_of, factor, alog)
    if tg.get("sides") or tg.get("rhythm"):
        slog = {}
        space_font.respace(f, tg, slog)
        alog.append(f"class sidebearings set inside the fit: moves {slog.get('side_moves')}")
    log.extend(alog)
    notes = finish(f, T.get("cap_em"), T.get("vmetrics"))
    log.extend(notes)
    stuck = [c for c, e in hist[-1]["error_pct"].items() if abs(e) > args.tol]
    return f, {"style": style, "n_stem_target": round(stem_t, 1), "y_location": yloc, "x_locations": xloc,
               "factors": factor, "iterations": hist, "stretch_limit_hit": stuck,
               "classes_measured": {c: L.CLASSES[c] for c in widths}}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("base")
    ap.add_argument("targets")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--loc", default="", help="axes to hold fixed, e.g. opsz=14,GRAD=0")
    ap.add_argument("--style", action="append", help="build only these styles (names from targets.json)")
    ap.add_argument("--max-stretch", type=float, default=0.03)
    ap.add_argument("--tol", type=float, default=0.3, help="class mean advance error allowed, percent")
    ap.add_argument("--iters", type=int, default=6)
    ap.add_argument("--no-contrast", action="store_true", help="do not scan opsz for contrast")
    a = ap.parse_args()
    T = L.load_json(a.targets)
    B = Base(a.base)
    os.makedirs(a.out_dir, exist_ok=True)
    fam = T["family"].replace(" ", "")
    out = {"base": os.path.basename(a.base), "base_axes": B.axes, "targets": os.path.basename(a.targets), "styles": []}
    for style in T["styles"]:
        if a.style and style["name"] not in a.style:
            continue
        log = []
        f, info = fit_style(B, T, style, a, log)
        p = os.path.join(a.out_dir, f"{fam}-{style['name']}.fit.ttf")
        f.save(p)
        info["file"] = os.path.basename(p)
        info["log"] = log
        out["styles"].append(info)
        print(f"{style['name']}: wrote {p}")
        for line in log:
            print("  " + line)
        last = info["iterations"][-1]
        print(f"  width fit after {last['iteration']} pass(es), error % by class: {last['error_pct']}")
        print(f"  factors: {info['factors']}")
        if info["stretch_limit_hit"]:
            print(f"  stretch limit reached for {info['stretch_limit_hit']}: the base cannot reach these widths "
                  f"within {a.max_stretch * 100:.0f} %. Say so, or pick a base with a width axis.")
    L.save_json(out, os.path.join(a.out_dir, "fit-log.json"))


if __name__ == "__main__":
    main()
