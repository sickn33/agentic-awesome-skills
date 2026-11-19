"""Measure a typeface from a screenshot: proportions, stems, contrast, serifs and, with the right text, widths.

  python3 -I measure_image.py <shot.png> --text "line one|line two" [--crop x0,y0,x1,y1] [--out m.json]
  python3 -I measure_image.py --selftest <open-font.ttf> [--px 120] [--out-dir dir]

The image holds one or more lines of dark text on a light ground (or the reverse), all at one size. --text gives
each line's characters, lines split by "|", in order from the top. Spaces do not matter. The script splits the
image into lines at blank rows, and each line into letters by connected ink (a dot joins the stem under it).
When the letter count and the text disagree it stops and says so: crop tighter, set the text larger, or fix
--text.

Best input: the four lines of fontlib.SAMPLE_LINES typed in the font, cap height 80 px or more. From those it
reads advances (n-X-n and H-X-H contexts) and sidebearings (nn, no, HH, HO). From any other text it reads
vertical proportions, stems and contrast only. Each number gets a confidence: high, medium or low. Pixel edges
are read at sub-pixel precision from the anti-aliasing, so the error is about half a pixel per edge.

--selftest renders the sample lines from an open font, measures the pixels and the file, and prints the
error per number. Run it once at the screenshot's cap height to see what a screenshot can be trusted for.
"""
import argparse
import os
import statistics as st
import sys

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import fontlib as L  # noqa: E402

FLAT_BOTTOM = set("nhmxirklHNIEFLTBDKMPRXZ")


# ------------------------------------------------------------------ pixels
def load_coverage(path, crop=None):
    from PIL import Image
    im = np.asarray(Image.open(path).convert("L"), dtype=np.float64) / 255.0
    if crop:
        x0, y0, x1, y1 = crop
        im = im[y0:y1, x0:x1]
    # Ink is whatever is rarer: dark on light or light on dark.
    cov = 1 - im if np.median(im) > 0.5 else im
    lo, hi = np.percentile(cov, 1), cov.max()
    return np.clip((cov - lo) / max(hi - lo, 1e-6), 0, 1)


def components(mask):
    """Label 8-connected ink using row runs and union-find. Returns a list of (rows, cols) index arrays."""
    runs = []
    for y in range(mask.shape[0]):
        row = mask[y]
        if not row.any():
            continue
        d = np.diff(np.concatenate(([0], row.astype(np.int8), [0])))
        for a, b in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            runs.append((y, a, b))
    parent = list(range(len(runs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    by_row = {}
    for i, (y, a, b) in enumerate(runs):
        by_row.setdefault(y, []).append(i)
    for i, (y, a, b) in enumerate(runs):
        for j in by_row.get(y - 1, []):
            _, c, d = runs[j]
            if c <= b and d >= a:  # 8-connected: touching diagonally counts
                parent[find(i)] = find(j)
    groups = {}
    for i, r in enumerate(runs):
        groups.setdefault(find(i), []).append(r)
    out = []
    for rs in groups.values():
        ys = np.concatenate([np.full(b - a, y) for y, a, b in rs])
        xs = np.concatenate([np.arange(a, b) for y, a, b in rs])
        out.append((ys, xs))
    return out


class Letter:
    def __init__(self, comps, cov):
        ys = np.concatenate([c[0] for c in comps])
        xs = np.concatenate([c[1] for c in comps])
        self.y0, self.y1, self.x0, self.x1 = ys.min(), ys.max(), xs.min(), xs.max()
        m = np.zeros(cov.shape, dtype=bool)
        m[ys, xs] = True
        # Grow the mask by one pixel so the anti-aliased edge belongs to the letter.
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        self.cov = np.where(g, cov, 0.0)
        self.comps, self.full, self.ch = comps, cov, None

    def merge(self, other):
        return Letter(self.comps + other.comps, self.full)

    # edges, in pixels, with the partial coverage of the edge pixel as the fraction
    def top(self):
        p = self.cov.max(axis=1)
        r = int(np.argmax(p > 0.02))
        return r + 1 - p[r]

    def bottom(self):
        p = self.cov.max(axis=1)
        r = len(p) - 1 - int(np.argmax(p[::-1] > 0.02))
        return r + p[r]

    def left(self):
        p = self.cov.max(axis=0)
        c = int(np.argmax(p > 0.02))
        return c + 1 - p[c]

    def right(self):
        p = self.cov.max(axis=0)
        c = len(p) - 1 - int(np.argmax(p[::-1] > 0.02))
        return c + p[c]

    def hruns(self, y):
        return _runs(self.cov[int(round(y))], )

    def vruns(self, x):
        return _runs(self.cov[:, int(round(x))])


def _runs(line):
    """Ink runs along one pixel line: (start, end, width), width summed from coverage."""
    on = line > 0.02
    d = np.diff(np.concatenate(([0], on.astype(np.int8), [0])))
    out = []
    for a, b in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
        seg = line[a:b]
        if seg.max() < 0.5:
            continue
        w = seg.sum()
        start = a + 1 - seg[0]
        out.append((start, start + w, w))
    return out


def split_lines(cov):
    rows = (cov > 0.5).any(axis=1)
    d = np.diff(np.concatenate(([0], rows.astype(np.int8), [0])))
    bands = list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
    # A band thinner than a fifth of the tallest is a stray accent row or noise: join it to its neighbour.
    if not bands:
        return []
    tall = max(b - a for a, b in bands)
    merged = []
    for a, b in bands:
        if merged and (b - a < tall * 0.2 or a - merged[-1][1] < 2):
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    return merged


def letters_of(cov):
    # A low threshold keeps hairline joins (the arm of k, the ear of g) joined to their letter.
    comps = components(cov > 0.15)
    comps.sort(key=lambda c: -len(c[0]))
    boxes = [(c[0].min(), c[0].max(), c[1].min(), c[1].max()) for c in comps]
    owner = list(range(len(comps)))
    for i in range(len(comps)):
        y0, y1, x0, x1 = boxes[i]
        cx = (x0 + x1) / 2
        for j in range(i):  # bigger components first
            if owner[j] != j:
                continue
            Y0, Y1, X0, X1 = boxes[j]
            vertical_gap = y1 < Y0 or y0 > Y1
            if vertical_gap and X0 - 1 <= cx <= X1 + 1:
                owner[i] = j  # a dot or an accent over or under a bigger shape
                break
    groups = {}
    for i, o in enumerate(owner):
        groups.setdefault(o, []).append(comps[i])
    out = [Letter(g, cov) for g in groups.values()]
    out.sort(key=lambda t: t.x0)
    # Specks under 1 % of the median letter area are noise.
    if out:
        med = st.median(float((t.cov > 0.5).sum()) for t in out)
        out = [t for t in out if (t.cov > 0.5).sum() > med * 0.01]
    return out


def _spread(ls, chars):
    """How unevenly the same character is drawn across a line when ls is labelled with chars. A wrong join
    shifts every label after it, so repeated letters stop matching in width."""
    if len(ls) < len(chars):
        return 0.0
    w = {}
    for t, c in zip(ls, chars):
        w.setdefault(c, []).append(float(t.x1 - t.x0))
    return sum(st.pstdev(v) for v in w.values() if len(v) > 1)


# ------------------------------------------------------------------ measuring
def conf_px(px):
    return "high" if px >= 6 else "medium" if px >= 3 else "low"


def measure_lines(cov, texts):
    bands = split_lines(cov)
    if len(bands) != len(texts):
        raise SystemExit(f"found {len(bands)} lines of ink, --text has {len(texts)}. Crop or fix --text.")
    lines, joined = [], []
    for (a, b), text in zip(bands, texts):
        pad = 2
        sub = cov[max(a - pad, 0):b + pad]
        ls = letters_of(sub)
        chars = [c for c in text if not c.isspace()]
        # A letter drawn in detached parts (some k, some fractions) reads as two. Join the closest neighbours,
        # the pair with the most overlap, until the count fits, and say so.
        while len(ls) > len(chars) > 0:
            near = [j for j in range(len(ls) - 1) if ls[j + 1].x0 - ls[j].x1 <= 2]
            if not near:
                break
            i = min(near, key=lambda j: (_spread(ls[:j] + [ls[j].merge(ls[j + 1])] + ls[j + 2:], chars),
                                         ls[j + 1].x0 - ls[j].x1))
            ls[i:i + 2] = [ls[i].merge(ls[i + 1])]
            joined.append(text)
        if len(ls) != len(chars):
            raise SystemExit(f"line {text!r}: found {len(ls)} letters, the text has {len(chars)}. Letters that touch "
                             "merge into one. Set the text larger, or crop to a part that does not touch.")
        for t, c in zip(ls, chars):
            t.ch = c
        flat = [t.bottom() for t in ls if t.ch in FLAT_BOTTOM]
        base = st.median(flat) if flat else st.median(t.bottom() for t in ls)
        lines.append((ls, base))
    every = [t for ls, _ in lines for t in ls]

    def first(ch):
        for ls, base in lines:
            for t in ls:
                if t.ch == ch:
                    return t, base
        return None, None

    H, bH = first("H")
    if H is None:
        raise SystemExit("an H is needed to set the scale (cap height 700). Add one to the text.")
    cap_px = bH - H.top()
    k = L.CAP / cap_px
    m = {"source": "image", "cap": L.CAP, "cap_em": None, "px_cap": round(cap_px, 1), "confidence": {}}
    C = m["confidence"]
    vconf = "high" if cap_px >= 60 else "medium" if cap_px >= 30 else "low"

    def put(key, val, conf):
        if val is not None:
            m[key] = round(val, 3) if isinstance(val, float) and abs(val) < 5 else round(val, 1)
            C[key] = conf

    def mean_tops(chs):
        v = [(base - t.top()) for ls, base in lines for t in ls if t.ch in chs]
        return st.mean(v) if v else None

    def mean_bottoms(chs):
        v = [(base - t.bottom()) for ls, base in lines for t in ls if t.ch in chs]
        return st.mean(v) if v else None

    xh = mean_tops("xz")
    if xh:
        put("xh", xh * k, vconf)
        put("xh_cap", xh / cap_px, vconf)
    asc = mean_tops("bdhkl")
    if asc:
        put("asc", asc * k, vconf)
    desc = mean_bottoms("pq")
    if desc:
        put("desc", desc * k, vconf)
    o, bo = first("o")
    if o and xh:
        put("overshoot_lc", ((bo - o.top()) - xh) * k, "low" if cap_px < 120 else "medium")
    n, bn = first("n")
    if n and xh:
        runs = n.hruns(bn - xh * 0.5)
        if runs:
            put("n_stem", runs[0][2] * k, conf_px(runs[0][2]))
        if len(runs) > 1:
            put("n_counter", (runs[1][0] - runs[0][1]) * k, vconf)
    Hr = H.hruns(bH - cap_px * 0.3)
    if Hr:
        put("H_stem", Hr[0][2] * k, conf_px(Hr[0][2]))
        if len(Hr) > 1:
            bar = H.vruns((Hr[0][1] + Hr[-1][0]) / 2)
            if bar:
                put("H_bar", bar[0][2] * k, conf_px(bar[0][2]))
    if o:
        mid_y = (o.top() + o.bottom()) / 2
        side = o.hruns(mid_y)
        thin = o.vruns((o.left() + o.right()) / 2)
        if side:
            put("o_side", side[0][2] * k, conf_px(side[0][2]))
        if thin:
            tmin = min(r[2] for r in thin)
            put("o_thin", tmin * k, conf_px(tmin))
    if m.get("o_side") and m.get("o_thin"):
        put("contrast", m["o_thin"] / m["o_side"], min(C["o_thin"], C["o_side"], key=["low", "medium", "high"].index))
    if m.get("H_bar") and m.get("H_stem"):
        put("bar_stem", m["H_bar"] / m["H_stem"], C["H_bar"])
    if Hr:
        foot = H.hruns(bH - max(1.5, cap_px * 0.012))
        ext_l = Hr[0][0] - foot[0][0] if foot else 0
        ext_r = foot[0][1] - Hr[0][1] if foot else 0
        ext = (ext_l + ext_r) / 2
        is_serif = ext > 0.12 * Hr[0][2] and ext > 1
        m["serif"] = bool(is_serif)
        C["serif"] = "high" if ext > 3 or ext < 0.5 else "medium"
        put("serif_ext", ext * k if is_serif else 0.0, conf_px(ext) if is_serif else C["serif"])
        if is_serif:
            tip = H.vruns(foot[0][0] + max(ext_l, 1) * 0.3)
            if tip:
                put("serif_tip", tip[-1][2] * k, "low" if tip[-1][2] < 6 else "medium")
    # Advances and sidebearings from the sample contexts. Kerning inside a context would bias them, so medium.

    def pitches(a, b):
        out = []
        for ls, _ in lines:
            for i in range(len(ls) - 1):
                if ls[i].ch == a and ls[i + 1].ch == b:
                    out.append((ls[i], ls[i + 1]))
        return out

    adv, ctx = {}, {}
    for ref in "nH":
        p = pitches(ref, ref)
        if p:
            adv[ref] = float(st.mean(b.left() - a.left() for a, b in p))
    for ls, _ in lines:
        for i in range(1, len(ls) - 1):
            ref = ls[i - 1].ch
            if ref in adv and ls[i + 1].ch == ref and ls[i].ch != ref:
                ctx.setdefault(ls[i].ch, []).append(float(ls[i + 1].left() - ls[i - 1].left() - adv[ref]))
    for c, v in ctx.items():
        adv.setdefault(c, st.mean(v))
    widths = {}
    for cls, chars in L.CLASSES.items():
        have = [adv[c] for c in chars if c in adv]
        if have:
            widths[cls] = round(st.mean(have) * k, 1)
            C["w_" + cls] = "medium" if len(have) * 2 >= len(chars) else "low"
    if widths:
        m["widths"] = widths
    lc = [adv[c] for c in L.LETTERS[:26] if c in adv]
    uc = [adv[c] for c in L.LETTERS[26:] if c in adv]
    if len(lc) == 26:
        put("lc_avg", st.mean(lc) * k, "medium")
    if len(uc) == 26:
        put("uc_avg", st.mean(uc) * k, "medium")
    # Sidebearings: half the n-n gap is the n side (n is close to symmetric). Every other side in a class comes
    # from its gap to the n (or H) beside it, minus that side. Same class membership as a font file.
    sides = {}
    half = {}
    for ref in "nH":
        same = pitches(ref, ref)
        if same:
            half[ref] = st.mean(b.left() - a.right() for a, b in same) / 2
    for cls, members in L.SIDE_CLASSES.items():
        ref = "n" if cls.startswith("lc") else "H"
        if ref not in half:
            continue
        vals = []
        for c, side in members:
            if c == ref:
                vals.append(half[ref])
                continue
            pairs = pitches(ref, c) if side == 0 else pitches(c, ref)
            vals += [b.left() - a.right() - half[ref] for a, b in pairs]
        if vals:
            sides[cls] = round(float(st.mean(vals)) * k, 1)
    if sides:
        m["sides"] = sides
        for key in sides:
            C["side_" + key] = "medium"
    if m.get("n_counter") and sides.get("lc_straight") is not None:
        put("rhythm", 2 * sides["lc_straight"] / m["n_counter"], "medium")
    m["letters_read"] = len(every)
    m["joined_parts"] = len(joined)
    return m


def selftest(font, px, out_dir):
    import fontlib
    face = L.Face(font, subset_text=L.MEASURE_TEXT)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    gap = int(px * 0.6)
    for line in L.SAMPLE_LINES:
        cov, base, s = fontlib.rasterize(face, line, px, pad=gap // 2)
        rows.append(cov)
    w = max(r.shape[1] for r in rows)
    sheet = np.vstack([np.pad(r, ((0, 0), (0, w - r.shape[1]))) for r in rows])
    path = os.path.join(out_dir, "selftest-sheet.png")
    L.save_png(sheet, path)
    got = measure_lines(load_coverage(path), L.SAMPLE_LINES)
    want = L.measure_face(face)
    print(f"selftest: {os.path.basename(font)} at {px}px per em, cap {got['px_cap']} px, sheet {path}")
    print(f"  {'key':14s} {'file':>8s} {'image':>8s} {'error':>8s}  confidence")
    worst = 0.0
    for key in ("xh", "asc", "desc", "n_stem", "H_stem", "H_bar", "o_side", "o_thin", "contrast", "serif_ext",
                "serif_tip", "n_counter", "lc_avg", "uc_avg"):
        a, b = want.get(key), got.get(key)
        if a is None or b is None:
            continue
        e = b - a
        print(f"  {key:14s} {a:8.3f} {b:8.3f} {e:+8.3f}  {got['confidence'].get(key)}")
    for cls in want["widths"]:
        a, b = want["widths"][cls], got.get("widths", {}).get(cls)
        if b is not None:
            e = b / a - 1
            worst = max(worst, abs(e))
            print(f"  w_{cls:12s} {a:8.1f} {b:8.1f} {e*100:+7.2f}%  {got['confidence'].get('w_' + cls)}")
    for cls in want["sides"]:
        a, b = want["sides"][cls], got.get("sides", {}).get(cls)
        if b is not None:
            print(f"  s_{cls:12s} {a:8.1f} {b:8.1f} {b - a:+8.1f}  medium")
    print(f"  largest class-width error {worst*100:.2f}%")
    return got


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", nargs="?")
    ap.add_argument("--text", help='each line\'s characters, lines split by "|"')
    ap.add_argument("--crop")
    ap.add_argument("--out")
    ap.add_argument("--selftest", metavar="FONT")
    ap.add_argument("--px", type=float, default=120, help="selftest size in px per em")
    ap.add_argument("--out-dir", default=".")
    a = ap.parse_args()
    if a.selftest:
        m = selftest(a.selftest, a.px, a.out_dir)
    else:
        if not a.image or not a.text:
            ap.error("give an image and --text, or --selftest FONT")
        crop = [int(v) for v in a.crop.split(",")] if a.crop else None
        m = measure_lines(load_coverage(a.image, crop), a.text.split("|"))
        m["file"] = os.path.basename(a.image)
        for key in ("px_cap", "xh", "xh_cap", "asc", "desc", "n_stem", "H_stem", "H_bar", "o_side", "o_thin",
                    "contrast", "bar_stem", "serif", "serif_ext", "serif_tip", "n_counter", "rhythm", "lc_avg", "uc_avg"):
            if key in m:
                print(f"  {key:12s} {m[key]!s:>9}  {m['confidence'].get(key, '')}")
        if "widths" in m:
            print("  widths", m["widths"])
        if "sides" in m:
            print("  sides ", m["sides"])
    if a.out:
        L.save_json(m, a.out)


if __name__ == "__main__":
    main()
