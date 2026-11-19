"""Gate a built font against targets.json, its open base, and the licence rules. Exit 1 on any failure.

  python3 -I check_font.py <font.ttf> [<font2.ttf> ...] --targets targets.json --base <base-vf.ttf>
      [--reference ref.ttf | --reference-image shot.png --reference-text "line|line"] [--package DIR]
      [--fit-log fit-log.json] [--out-dir DIR]

Gates, each PASS, FAIL or INFO, with the number behind it:
- metrics: x-height to cap, n stem, contrast, within the targets' tolerances (targets.json "tolerances").
- widths: every class mean advance, and the shaped paragraph when the targets came from a file.
- spacing: straight and round sidebearing means.
- kerning: every pair of letters, figures and punctuation, shaped. The smallest ink gap must clear min_gap.
- coverage: every character the targets' scripts need.
- provenance: glyph order and character map equal the base's; with --fit-log, every glyph is within 3 % of the
  height and 40 % of the width of the base glyph at the fit's y location (y comes from there, x from the
  width classes); and, given --reference files, no outline matches a reference outline in point structure and shape.
- validity: a ttx round trip, win metrics that cover every glyph, and fontbakery when it is installed.
- licence: OFL notice and URL in the name table, no trademark record, a new family name that is not the base's
  name or a Reserved Font Name, and no base family name in any table but the copyright line. With --package,
  OFL.txt and FONTLOG.txt must be there.
Renders: <out-dir>/overlay-<style>-<size>.png sets the reference and the font on the same lines at a text and
a display size, reference in red, ours in blue, overlap black. With a screenshot reference, the two are
stacked at the same cap height instead.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402

import fontlib as L  # noqa: E402

COVERAGE = {
    "latin": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
             "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿŒœŠšŽžŸ"
             ".,:;!?¡¿'\"()[]{}-–—‘’“”‚„‹›«»…•·/\\&@#*§¶©®™°%‰$€£¥¢+−×÷=<>",
    "latin-ext": "ĀāĂăĄąĆćČčĎďĐđĒēĖėĘęĚěĞğĢģĪīĮįİıĶķĹĺĻļĽľŁłŃńŅņŇňŌōŐőŔŕŘřŚśŞşȘșŤťŢţȚțŪūŮůŰűŲųŹźŻż",
    "vietnamese": "ĂăÂâĐđÊêÔôƠơƯưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ",
    "cyrillic": "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяЄєІіЇїҐґЎў",
    "greek": "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωςάέήίόύώ",
}
TEXT_SAMPLE = "Hamburgefonstiv quick brown 1234"
DISPLAY_SAMPLE = "Rag Gold"


class Gates:
    def __init__(self):
        self.rows = []

    def add(self, group, name, ok, detail):
        state = "INFO" if ok is None else "PASS" if ok else "FAIL"
        self.rows.append((group, name, state, detail))

    def failed(self):
        return [r for r in self.rows if r[2] == "FAIL"]


def gate_metrics(G, m, T, style):
    tg, tol = T["targets"], T["tolerances"]
    stem_t = style.get("n_stem") if style else tg.get("n_stem")
    if not stem_t:
        G.add("metrics", "n stem", None, f"{m['n_stem']}, no target for this style (the fit log has the one it used)")
    elif m.get("n_stem"):
        G.add("metrics", "n stem", abs(m["n_stem"] - stem_t) <= tol["stem"], f"{m['n_stem']} vs {stem_t:.1f}, ±{tol['stem']}")
    if tg.get("xh") is not None:
        G.add("metrics", "x-height", abs(m["xh"] - tg["xh"]) <= tol["xh"], f"{m['xh']} vs {tg['xh']}, ±{tol['xh']} (cap 700)")
    if tg.get("contrast") is not None and m.get("contrast") is not None:
        G.add("metrics", "contrast o thin / o side", abs(m["contrast"] - tg["contrast"]) <= tol["contrast"],
              f"{m['contrast']} vs {tg['contrast']}, ±{tol['contrast']}")
    for k in ("asc", "desc", "H_bar", "bar_stem", "serif_ext", "serif_tip", "overshoot_lc"):
        if tg.get(k) is not None and m.get(k) is not None:
            G.add("metrics", k, None, f"{m[k]} vs {tg[k]}")


def gate_widths(G, m, T, first_style):
    tg, tol = T["targets"], T["tolerances"]
    for cls, v in (tg.get("widths") or {}).items():
        got = m["widths"].get(cls)
        if got is None:
            continue
        e = got / v - 1
        G.add("widths", cls, abs(e) * 100 <= tol["width_pct"], f"{got} vs {v}, {e * 100:+.2f}%")
    if first_style and tg.get("para") and m.get("para") and T.get("cap_em"):
        e = m["para"] / tg["para"] - 1
        G.add("widths", "paragraph, shaped", abs(e) * 100 <= tol["para_pct"], f"{e * 100:+.2f}%, ±{tol['para_pct']}%")
    for cls, v in (tg.get("sides") or {}).items():
        got = m["sides"].get(cls)
        if got is not None and first_style:
            G.add("spacing", f"{cls} side mean", abs(got - v) <= tol["side"], f"{got} vs {v}, ±{tol['side']}")


def gate_kerning(G, face, min_gap):
    import space_font as S
    cm = face.cmap
    chars = [c for c in S.GUARD_CHARS if ord(c) in cm]
    prof = {c: face.profile(c) for c in chars}
    worst = []
    for a in chars:
        if a == "f":
            continue
        for b in chars:
            k = face.kern(a + b)
            if k is None:
                continue
            off = face.adv(a) + k
            ra, rb = prof[a], prof[b]
            gaps = [rb[y][0] + off - ra[y][1] for y in ra if y in rb]
            if gaps:
                worst.append((min(gaps), a + b))
    worst.sort()
    bad = [w for w in worst if w[0] < min_gap - 1]
    G.add("kerning", "collisions", not bad, f"{len(bad)} pairs under {min_gap} units; closest " +
          ", ".join(f"{p} {g:.0f}" for g, p in worst[:6]))


def gate_coverage(G, f, scripts):
    cm = f.getBestCmap()
    for s in scripts:
        need = COVERAGE.get(s)
        if need is None:
            G.add("coverage", s, None, "no character list for this script in check_font.py")
            continue
        miss = [c for c in need if ord(c) not in cm]
        G.add("coverage", s, not miss, f"{len(need) - len(miss)} of {len(need)}" + (f", missing {''.join(miss[:30])}" if miss else ""))


def gate_provenance(G, f, base, refs, yloc=None):
    G.add("provenance", "glyph order equals the base's", f.getGlyphOrder() == base.getGlyphOrder(), "")
    G.add("provenance", "character map equals the base's", f.getBestCmap() == base.getBestCmap(), "")
    # Every glyph is the base's glyph, fitted. Its y coordinates come from the base at the fit's y location, so
    # against that instance, at the same cap height, its ink is within 3 % as tall. Widths move with the width
    # classes, so they may differ up to 30 %. Without the fit log, the default instance is used and the gate
    # only informs, since a different optical size redraws marks.
    import copy
    from fontTools.varLib import instancer
    from fontTools.pens.boundsPen import BoundsPen
    bd = instancer.instantiateVariableFont(copy.deepcopy(base), yloc or {}, updateFontNames=False) if "fvar" in base else base

    def boxes(font):
        gs = font.getGlyphSet()
        out = {}
        for n in font.getGlyphOrder():
            p = BoundsPen(gs)
            gs[n].draw(p)
            out[n] = p.bounds
        cap = out[font.getBestCmap()[ord("H")]][3]
        return out, cap
    ob, oc = boxes(f)
    bb, bc = boxes(bd)
    far = []
    for n, b in ob.items():
        a = bb.get(n)
        if not a or not b:
            continue
        wa, wb = (a[2] - a[0]) / bc, (b[2] - b[0]) / oc
        ha, hb = (a[3] - a[1]) / bc, (b[3] - b[1]) / oc
        if wa > 0.05 and ha > 0.05 and (abs(wb / wa - 1) > 0.40 or abs(hb / ha - 1) > 0.03):
            far.append(f"{n} {wb / wa - 1:+.0%} wide {hb / ha - 1:+.0%} tall")
    G.add("provenance", "every glyph traceable to its base glyph", (not far) if yloc is not None else None,
          f"{len(far)} outside 3 % height, 40 % width of the base at {yloc if yloc is not None else 'its default'}"
          + (": " + ", ".join(far[:6]) if far else ""))

    def outl(font, n):
        g = font["glyf"][n]
        if g.isComposite() or g.numberOfContours <= 0:
            return None
        c, e, fl = g.getCoordinates(font["glyf"])
        return list(c), tuple(e), tuple(x & 1 for x in fl)

    def norm(pts):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        w, h = (max(xs) - min(xs)) or 1, (max(ys) - min(ys)) or 1
        return [((x - min(xs)) / w, (y - min(ys)) / h) for x, y in pts]
    for rp in refs:
        ref = TTFont(rp)
        if "glyf" not in ref:
            G.add("provenance", "no outline matches a reference", None, f"{os.path.basename(rp)} is CFF: point structures cannot match")
            continue
        idx = {}
        for n in ref.getGlyphOrder():
            o = outl(ref, n)
            if o and len(o[0]) > 8:  # a rectangle or a dot matches anything
                idx.setdefault((o[1], o[2]), []).append((n, o[0]))
        close = []
        for n in f.getGlyphOrder():
            o = outl(f, n)
            if not o:
                continue
            for rn, pts in idx.get((o[1], o[2]), []):
                A, B = norm(o[0]), norm(pts)
                if max(max(abs(p[0] - q[0]), abs(p[1] - q[1])) for p, q in zip(A, B)) < 0.02:
                    close.append(f"{n}~{rn}")
        G.add("provenance", "no outline matches a reference", not close,
              f"{os.path.basename(rp)}: {len(close)} match" + (": " + ", ".join(close[:8]) + ". If the reference is itself built on this open base, "
                                       "matches are expected; otherwise stop and find out why" if close else ""))


def gate_validity(G, path, f):
    tmp = tempfile.mkdtemp()
    try:
        x1, x2, rt = (os.path.join(tmp, n) for n in ("a.ttx", "b.ttx", "rt.ttf"))
        TTFont(path).saveXML(x1)
        g = TTFont()
        g.importXML(x1)
        g.save(rt)
        TTFont(rt).saveXML(x2)
        strip = lambda s: re.sub(r'<(checkSumAdjustment|modified|created) value="[^"]*"/>', "", re.sub(r"<ttFont[^>]*>", "", s))  # noqa: E731
        same = strip(open(x1).read()) == strip(open(x2).read())
        G.add("validity", "ttx round trip", same, "")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    glyf = f["glyf"]
    ymax = max(glyf[n].yMax for n in f.getGlyphOrder() if glyf[n].numberOfContours != 0)
    ymin = min(glyf[n].yMin for n in f.getGlyphOrder() if glyf[n].numberOfContours != 0)
    os2 = f["OS/2"]
    G.add("validity", "win metrics cover every glyph", os2.usWinAscent >= ymax and os2.usWinDescent >= -ymin,
          f"win {os2.usWinAscent}/{os2.usWinDescent}, glyphs reach {ymax}/{ymin}")
    left = [t for t in ("fvar", "gvar", "HVAR", "MVAR", "STAT") if t in f]
    left += [t + " VarStore" for t in ("GDEF",) if t in f and getattr(f[t].table, "VarStore", None)]
    G.add("validity", "no variation data left", not left, ", ".join(left))
    fb = shutil.which("fontbakery")
    if fb:
        r = subprocess.run([fb, "check-universal", "-l", "FAIL", path], capture_output=True, text=True)
        out = r.stdout + r.stderr
        fails = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("FAIL ")]
        tail = ("; ".join(fails[:4]) or "no FAIL lines")[:300]
        G.add("validity", "fontbakery check-universal", r.returncode == 0, tail)
    else:
        G.add("validity", "fontbakery", None, "not installed, not run (pip install fontbakery)")


def gate_licence(G, f, base, family, package):
    names = {r.nameID: r.toUnicode() for r in f["name"].names if r.platformID == 3}
    G.add("licence", "OFL notice in name 13", "Open Font License" in names.get(13, ""), names.get(13, "")[:60])
    G.add("licence", "OFL URL in name 14", "openfontlicense.org" in names.get(14, "") or "scripts.sil.org/OFL" in names.get(14, ""), names.get(14, ""))
    G.add("licence", "no trademark record (name 7)", 7 not in names, names.get(7, ""))
    bnames = {r.nameID: r.toUnicode() for r in base["name"].names if r.platformID == 3}
    base_fam = (bnames.get(16) or bnames.get(1) or "").strip()
    G.add("licence", "family renamed", names.get(16, names.get(1)) == family,
          f"{names.get(16, names.get(1))!r}, want {family!r}")
    words = [w for w in re.findall(r"[A-Za-z]{4,}", base_fam) if w.lower() not in ("serif", "sans", "mono", "display", "text")]
    hits = []
    for nid, v in names.items():
        if nid in (0,):
            continue
        for w in [base_fam] + words:
            if w and w.lower() in v.lower() and w.lower() not in family.lower():
                hits.append(f"name {nid}: {w}")
    for tag in f.keys():
        if tag in ("GlyphOrder", "name"):
            continue
        data = f.getTableData(tag).lower()
        if base_fam and (base_fam.lower().encode() in data or base_fam.lower().encode("utf-16-be") in data):
            hits.append(f"table {tag}")
    G.add("licence", "base's name only in the copyright line", not hits, ", ".join(hits[:8]))
    base_bits = [base_fam.lower()] + [w.lower() for w in words]
    G.add("licence", "new name avoids the base's name", not any(b and b in family.lower() for b in base_bits),
          f"{family!r} vs base {base_fam!r}")
    if package:
        for fn in ("OFL.txt", "FONTLOG.txt"):
            G.add("licence", f"{fn} in the package", os.path.exists(os.path.join(package, fn)), package)
        p = os.path.join(package, "OFL.txt")
        if os.path.exists(p):
            rfn = re.findall(r"Reserved Font Names? \"?([^\".\n]+)", open(p, encoding="utf-8").read())
            clash = [r for r in rfn if r.strip().lower() in family.lower()]
            G.add("licence", "new name avoids every Reserved Font Name", not clash, f"RFN {rfn or 'none'}")


def overlay(ref_face, ours, out_dir, tag):
    """Red reference, blue ours, black where both have ink. Both at the same cap height, baselines aligned."""
    from PIL import Image
    paths = []
    for name, text, cap_px in (("text", TEXT_SAMPLE, 28), ("display", DISPLAY_SAMPLE, 160)):
        imgs = []
        for fc in (ref_face, ours):
            px = cap_px * fc.upm / fc.bounds("H")[3]
            cov, base, _ = L.rasterize(fc, text, px)
            imgs.append((cov, int(round(base))))
        above = max(b for _, b in imgs)
        below = max(c.shape[0] - b for c, b in imgs)
        W = max(c.shape[1] for c, _ in imgs)
        layers = []
        for cov, b in imgs:
            canvas = np.zeros((above + below, W))
            canvas[above - b:above - b + cov.shape[0], :cov.shape[1]] = cov
            layers.append(canvas)
        A, B = layers
        rgb = np.clip(np.stack([1 - B, 1 - np.maximum(A, B), 1 - A], axis=-1), 0, 1)
        p = os.path.join(out_dir, f"overlay-{tag}-{name}.png")
        Image.fromarray((rgb * 255).astype(np.uint8)).save(p)
        paths.append(p)
    return paths


def stacked(img_path, text, ours, out_dir, tag):
    """The screenshot above our render of the same text at the same cap height, for a reference with no file."""
    from PIL import Image
    shot = Image.open(img_path).convert("L")
    import measure_image as MI
    cov = MI.load_coverage(img_path)
    cap_px = MI.measure_lines(cov, text.split("|"))["px_cap"]
    px = cap_px * ours.upm / ours.bounds("H")[3]
    ours_imgs = [L.rasterize(ours, t, px)[0] for t in text.split("|")]
    W = max([shot.width] + [o.shape[1] for o in ours_imgs])
    rows = [np.pad(1 - np.asarray(shot, dtype=float) / 255, ((0, 0), (0, W - shot.width)))]
    rows += [np.pad(o, ((0, 0), (0, W - o.shape[1]))) for o in ours_imgs]
    sheet = np.vstack(rows)
    p = os.path.join(out_dir, f"stacked-{tag}.png")
    L.save_png(sheet, p)
    return [p]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fonts", nargs="+")
    ap.add_argument("--targets", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--reference", action="append", default=[])
    ap.add_argument("--reference-image")
    ap.add_argument("--reference-text")
    ap.add_argument("--package")
    ap.add_argument("--fit-log", help="fit-log.json, so provenance compares each glyph with the base where it came from")
    ap.add_argument("--out-dir", default=".")
    a = ap.parse_args()
    T = L.load_json(a.targets)
    base_vf = TTFont(a.base)
    os.makedirs(a.out_dir, exist_ok=True)
    G = Gates()
    renders = []
    for i, path in enumerate(a.fonts):
        f = TTFont(path)
        sub = f["name"].getDebugName(17) or f["name"].getDebugName(2) or ""
        style = next((s for s in T["styles"] if s["name"] == sub), T["styles"][min(i, len(T["styles"]) - 1)])
        tag = style["name"]
        face = L.Face(f)
        m = L.measure_face(face)
        G.rows.append((f"--- {os.path.basename(path)} ({tag})", "", "", ""))
        gate_metrics(G, m, T, style)
        gate_widths(G, m, T, i == 0 or style is T["styles"][0])
        gate_kerning(G, face, T["tolerances"]["min_gap"])
        gate_coverage(G, f, T.get("scripts", ["latin"]))
        yloc = None
        if a.fit_log:
            fl = L.load_json(a.fit_log)
            yloc = next((s["y_location"] for s in fl["styles"] if s["style"]["name"] == tag), None)
        gate_provenance(G, f, base_vf, a.reference, yloc)
        gate_validity(G, path, f)
        gate_licence(G, f, base_vf, T["family"], a.package)
        if a.reference:
            renders += overlay(L.Face(a.reference[0]), face, a.out_dir, tag)
        elif a.reference_image and a.reference_text:
            renders += stacked(a.reference_image, a.reference_text, face, a.out_dir, tag)
    for group, name, state, detail in G.rows:
        if not name:
            print(group)
        else:
            print(f"  {state:4s}  {group:10s} {name:44s} {detail}")
    if renders:
        print("renders:", *renders, sep="\n  ")
    bad = G.failed()
    print(f"\n{len(bad)} failed, {sum(1 for r in G.rows if r[2] == 'PASS')} passed")
    L.save_json([{"group": g, "gate": n, "state": s, "detail": d} for g, n, s, d in G.rows],
                os.path.join(a.out_dir, "check-report.json"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
