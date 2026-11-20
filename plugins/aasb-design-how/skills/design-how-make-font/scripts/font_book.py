"""Write the font book: one HTML page per sheet, 1600 x 1000 px, ready for render_book.mjs to print as PDF.

  python3 -I font_book.py <Family-Regular.ttf> [<Family-Medium.ttf> ...] --out-dir DIR
      [--webfonts DIR] [--targets targets.json] [--fit-log fit-log.json] [--space-log x.space-log.json]
      [--check-report check-report.json] [--licence OFL.txt] [--tagline "..."] [--version 1.000]

Pages: cover, how it was made (with --targets), vertical metrics, weights, waterfall, text settings, character
set (as many pages as it needs), figures, kerning and the collision guard, OpenType features, languages, and
licence and install. Every number on a page is read from the font files or the logs when the book is written.
The book's own text names no reference and no base family: the licence page quotes the copyright lines from
the font's name table, which is what the OFL requires.

Fonts are linked by relative path. The TTFs are used for the character set and languages so nothing is
subset away; the WOFF2 files (from --webfonts, else the TTFs) set everything else.
"""
import argparse
import datetime
import html
import os
import shutil
import sys
import unicodedata

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont  # noqa: E402

import fontlib as L  # noqa: E402

esc = html.escape
ACCENT = "#0a84ff"
HERE = os.path.dirname(os.path.abspath(__file__))


def num(x, nd=1):
    if x is None:
        return ""
    s = f"{x:.{nd}f}" if isinstance(x, float) else str(x)
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s.replace("-", "−")


def signed(x):
    s = num(x)
    return s if s.startswith("−") or s == "0" else "+" + s


class Book:
    def __init__(self, family):
        self.family = family
        self.pages = []

    def page(self, slug, title, body, cls=""):
        n = len(self.pages) + 1
        self.pages.append((n, slug, f"""
<section class="page {cls}" id="p{n:02d}" data-slug="{slug}">
  <header class="run"><span>{esc(self.family)}</span><span>{esc(title)}</span><span>{n:02d}</span></header>
  {body}
</section>"""))


def feats(f):
    out = []
    for tag in ("GSUB", "GPOS"):
        if tag in f:
            for fr in f[tag].table.FeatureList.FeatureRecord:
                if fr.FeatureTag not in out:
                    out.append(fr.FeatureTag)
    return out


def feature_chars(f, tag, limit=8):
    """Characters a GSUB feature changes, read from its lookups, for a demo of that feature."""
    if "GSUB" not in f:
        return ""
    rev = {}
    for cp, n in sorted(f.getBestCmap().items(), reverse=True):
        if 0x20 < cp < 0x3000:
            rev[n] = chr(cp)
    gsub = f["GSUB"].table
    out = []
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != tag:
            continue
        for i in fr.Feature.LookupListIndex:
            lk = gsub.LookupList.Lookup[i]
            for sub in lk.SubTable:
                s = sub.ExtSubTable if lk.LookupType == 7 else sub
                keys = []
                if hasattr(s, "mapping"):
                    keys = list(s.mapping)
                elif hasattr(s, "alternates"):
                    keys = list(s.alternates)
                elif hasattr(s, "ligatures"):
                    keys = list(s.ligatures)
                for g in keys:
                    ch = rev.get(g)
                    if ch and ch not in out:
                        out.append(ch)
    return " ".join(out[:limit])


def char_group(c):
    ch = chr(c)
    cat = unicodedata.category(ch)
    nm = unicodedata.name(ch, "")
    for script in ("CYRILLIC", "GREEK"):
        if script in nm and cat.startswith("L"):
            return f"{script.title()} {'capitals' if cat == 'Lu' else 'lowercase'}"
    if cat == "Lu" and c < 0x80:
        return "Basic capitals"
    if cat == "Ll" and c < 0x80:
        return "Basic lowercase"
    if cat in ("Lu", "Lt") and "LATIN" in nm:
        return "Extended capitals"
    if cat.startswith("L") and "LATIN" in nm:
        return "Extended lowercase"
    if cat == "Nd":
        return "Figures"
    if cat == "No":
        return "Fractions, superiors and inferiors"
    if cat.startswith("P"):
        return "Punctuation"
    if cat == "Sc":
        return "Currency"
    if cat == "Sm":
        return "Mathematics"
    if cat == "Mn":
        return "Combining marks"
    if cat in ("Lm", "Sk"):
        return "Modifiers"
    if cat.startswith("L"):
        return "Other letters"
    return "Symbols and arrows"


GROUP_ORDER = ["Basic capitals", "Basic lowercase", "Extended capitals", "Extended lowercase", "Cyrillic capitals",
               "Cyrillic lowercase", "Greek capitals", "Greek lowercase", "Other letters", "Figures",
               "Fractions, superiors and inferiors", "Punctuation", "Currency", "Mathematics", "Symbols and arrows",
               "Modifiers", "Combining marks"]

FEATURE_DEMO = {
    "liga": ("Standard ligatures", "fi fl ffi"), "dlig": ("Discretionary ligatures", "ct st"),
    "kern": ("Kerning", "AVATAR Type"), "calt": ("Contextual alternates", "Hamburg"),
    "frac": ("Fractions", "1/2 3/4 7/16"), "numr": ("Numerators", "0123456789"), "dnom": ("Denominators", "0123456789"),
    "sups": ("Superiors", "x0123"), "subs": ("Inferiors", "x0123"), "sinf": ("Scientific inferiors", "H2O"),
    "ordn": ("Ordinals", "1a 2o No"), "lnum": ("Lining figures", "0123456789"), "onum": ("Old style figures", "0123456789"),
    "pnum": ("Proportional figures", "0123456789"), "tnum": ("Tabular figures", "11.11 88.88"),
    "zero": ("Slashed zero", "0 10 2026"), "case": ("Case-sensitive forms", "(H-I) [H]"), "smcp": ("Small capitals", "Small Caps"),
    "c2sc": ("Capitals to small capitals", "ABC Small"), "salt": ("Stylistic alternates", "aga"),
    "ccmp": ("Glyph composition", None), "locl": ("Localised forms", None), "mark": ("Mark positioning", None),
    "mkmk": ("Mark to mark", None), "aalt": ("Access all alternates", None), "rvrn": ("Variation alternates", None),
}

LANGS = {
    "Latin": [("Afrikaans", "êëîïôû"), ("Albanian", "çë"), ("Azerbaijani", "çəğıİöşü"), ("Basque", "ñü"),
              ("Catalan", "àçèéíïòóúü"), ("Croatian", "čćđšž"), ("Czech", "áčďéěíňóřšťúůýž"), ("Danish", "æøå"),
              ("Dutch", "éëïóöü"), ("English", ""), ("Estonian", "äõöüšž"), ("Faroese", "áðíóúýæø"),
              ("Finnish", "äöå"), ("French", "àâæçéèêëîïôœùûüÿ"), ("German", "äöüß"), ("Hungarian", "áéíóöőúüű"),
              ("Icelandic", "áðéíóúýþæö"), ("Indonesian", ""), ("Irish", "áéíóú"), ("Italian", "àèéìíîòóùú"),
              ("Latvian", "āčēģīķļņšūž"), ("Lithuanian", "ąčęėįšųūž"), ("Maltese", "ċġħż"), ("Norwegian", "æøå"),
              ("Polish", "ąćęłńóśźż"), ("Portuguese", "ãõáàâçéêíóôú"), ("Romanian", "ăâîșț"),
              ("Slovak", "áäčďéíĺľňóôŕšťúýž"), ("Slovenian", "čšž"), ("Spanish", "áéíñóúü¿¡"), ("Swahili", ""),
              ("Swedish", "åäö"), ("Turkish", "çğıİöşü"), ("Vietnamese", "ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"),
              ("Welsh", "âêîôûŵŷ"), ("Zulu", "")],
    "Cyrillic": [("Russian", "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"), ("Ukrainian", "ґєії"), ("Belarusian", "ёіў"),
                 ("Bulgarian", "абвгдежзийклмнопрстуфхцчшщъьюя"), ("Serbian", "ђјљњћџ"), ("Macedonian", "ѓѕјљњќџ"),
                 ("Kazakh", "әғқңөұүһі"), ("Kyrgyz", "ңөү"), ("Tajik", "ғӣқӯҳҷ"), ("Mongolian", "өү")],
    "Greek": [("Greek", "αβγδεζηθικλμνξοπρστυφχψωάέήίόύώ")],
}

TEXT = {
    "a": ["A text face is judged by the paragraph, not the letter. When a reader stops noticing the type, the type "
          "is working. That depends on the shapes of the letters, the space inside them and the space between them.",
          "This column is set at 20 pixels on a 30 pixel line, which suits long articles on a laptop. The measure is "
          "about sixty characters, near the middle of the comfortable range.",
          "Round letters overshoot the lines above and below, so o and e look as tall as x and n."],
    "b": ["At 16 pixels on 24, the x-height decides how large the lowercase reads. Counters of a, e and s have to "
          "stay open, and the serifs or terminals have to read as part of the letter rather than as noise.",
          "The spacing was set by class: straight sides, round sides, and the rest between them. A guard then "
          "opened every pair whose ink came too close.",
          "Quotes and apostrophes are curly, and ranges take an en dash: “yes,” it’s 9–17 in the week."],
    "c": ["At 13 pixels on 19, this setting is for notes, captions and dense interfaces.",
          "Each figure, letter and mark here comes from the same file, with no synthetic bold or slant. A browser "
          "slants the upright if asked for an italic the family does not have, which is worth avoiding.",
          "Fractions such as 3/4 and 7/16 come from the frac feature where the font has one."],
}
WATERFALL = [
    (120, "Handgloves at rest"), (96, "Measured, fitted, then spaced"), (72, "A face cut for paragraphs and labels"),
    (56, "Letters sit evenly on the line when the sides are fair"),
    (44, "Round letters carry a little more weight than straight ones"),
    (34, "The width of each class was fitted to a target, then the sides were set by class"),
    (26, "Small sizes need open counters and joins that do not fill in at fourteen pixels or below"),
    (20, "This line is twenty pixels. Read it at arm’s length and the stems still hold, the dots stay round."),
    (16, "Sixteen pixels is the default body size on the web. A large x-height makes lowercase read large for the size, and a generous line box leaves room for accents."),
    (13, "Thirteen pixels suits captions, footnotes and table cells. Check figures in a column: tabular figures line up without a feature switch when the font defaults to them."),
    (11, "Eleven pixels is near the floor for running text on screen. Use it for footnotes and fine print, not for paragraphs, and check it on a low density display before you ship it."),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fonts", nargs="+")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--webfonts")
    ap.add_argument("--targets")
    ap.add_argument("--fit-log")
    ap.add_argument("--space-log", action="append", default=[])
    ap.add_argument("--check-report")
    ap.add_argument("--licence")
    ap.add_argument("--tagline")
    ap.add_argument("--version")
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    fdir = os.path.join(a.out_dir, "fonts")
    os.makedirs(fdir, exist_ok=True)

    fonts = [TTFont(p) for p in a.fonts]
    reg = fonts[0]
    nm = {r.nameID: r.toUnicode() for r in reg["name"].names if r.platformID == 3}
    family = nm.get(16) or nm.get(1)
    styles = [({r.nameID: r.toUnicode() for r in f["name"].names if r.platformID == 3}.get(17) or "Regular",
               f["OS/2"].usWeightClass) for f in fonts]
    version = a.version or f"{reg['head'].fontRevision:.3f}"
    T = L.load_json(a.targets) if a.targets else None
    fit = L.load_json(a.fit_log) if a.fit_log else None
    space = [L.load_json(p) for p in a.space_log]
    check = L.load_json(a.check_report) if a.check_report else None
    face = L.Face(reg)
    cm = face.cmap
    upm = face.upm
    FEATS = feats(reg)

    # Copy the fonts beside the book so the HTML works wherever the folder goes.
    font_css = ""
    web = []
    for p, (sty, w) in zip(a.fonts, styles):
        shutil.copy(p, os.path.join(fdir, os.path.basename(p)))
        wp = None
        if a.webfonts:
            cand = os.path.join(a.webfonts, os.path.splitext(os.path.basename(p))[0] + ".woff2")
            if os.path.exists(cand):
                shutil.copy(cand, os.path.join(fdir, os.path.basename(cand)))
                wp = os.path.basename(cand)
        src = f'url("fonts/{wp}") format("woff2")' if wp else f'url("fonts/{os.path.basename(p)}") format("truetype")'
        font_css += f'@font-face {{ font-family: "{family} Book"; src: {src}; font-weight: {w}; font-style: normal; }}\n'
        web.append(wp)
    font_css += (f'@font-face {{ font-family: "{family} Book Full"; src: url("fonts/{os.path.basename(a.fonts[0])}") '
                 f'format("truetype"); font-weight: {styles[0][1]}; font-style: normal; }}\n')

    # metrics of the Regular, in font units
    def top(c):
        return face.bounds(c)[3] if face.has(c) else None
    xh, cap = top("x"), top("H")
    asc = max(top(c) for c in "bdhkl" if face.has(c))
    desc = min(face.bounds(c)[1] for c in "pq" if face.has(c))
    hh = reg["hhea"]
    os2 = reg["OS/2"]
    use_typo = bool(os2.fsSelection & 128)
    A = (os2.sTypoAscender if use_typo else hh.ascent) / upm
    D = -(os2.sTypoDescender if use_typo else hh.descent) / upm
    base_em = (1 + A - D) / 2
    m_all = [L.measure_face(L.Face(f)) for f in fonts]
    k = cap / L.CAP  # cap-normalised -> font units

    def u(v):
        return None if v is None else round(v * k, 1)
    B = Book(family)
    date = datetime.date.today().strftime("%B %Y")
    scripts = sorted({char_group(c).split()[0] for c in cm if char_group(c).split()[0] in ("Cyrillic", "Greek")})
    script_line = ", ".join(["Latin"] + scripts)

    # 01 cover -------------------------------------------------------------
    words = family.split()
    guided = "".join(
        f'<div class="guided"><span class="f">{esc(w)}</span>' +
        ("".join(f'<i class="g {c}"><b>{lab} {num(float(v))}</b></i>' for c, lab, v in
                 (("asc", "Ascender", asc), ("cap", "Cap height", cap), ("xh", "x-height", xh), ("base", "Baseline", 0.0),
                  ("desc", "Descender", desc))) if i == 0 else "") + "</div>"
        for i, w in enumerate(words[:2]))
    if len(words) > 2:
        guided = guided.replace(f">{esc(words[1])}<", f">{esc(' '.join(words[1:]))}<")
    weights_txt = ", ".join(f"{s} {w}" for s, w in styles)
    count = ["no", "one", "two", "three", "four", "five", "six"][len(fonts)] if len(fonts) < 7 else str(len(fonts))
    tagline = a.tagline or (f"A {T.get('use', 'text')} typeface in {count} weight{'s' if len(fonts) > 1 else ''}, "
                            "fitted to measured proportions and spaced by class." if T else "A typeface, fitted and spaced by class.")
    B.page("cover", "Type specimen", f"""
<div class="cover">
  <div class="cover-name">{guided}</div>
  <div class="cover-foot">
    <p class="f cover-line">{esc(tagline)}</p>
    <dl class="facts">
      <div><dt>Version</dt><dd>{esc(version)}</dd></div>
      <div><dt>Weights</dt><dd>{esc(weights_txt)}</dd></div>
      <div><dt>Glyphs</dt><dd>{len(reg.getGlyphOrder())}</dd></div>
      <div><dt>Scripts</dt><dd>{esc(script_line)}</dd></div>
      <div><dt>Licence</dt><dd>SIL Open Font License 1.1</dd></div>
      <div><dt>Date</dt><dd>{date}</dd></div>
    </dl>
  </div>
</div>""", "cover-page")

    # 02 how it was made ---------------------------------------------------
    if T:
        tg = T["targets"]
        rows = [("x-height", "Flat top of x", "xh"), ("Ascender", "Mean top of b d h k l", "asc"),
                ("Descender", "Mean bottom of p q", "desc"), ("n stem", "Left stem of n, half x-height", "n_stem"),
                ("H stem", "Left stem of H, 30 % up", "H_stem"), ("H bar", "Bar at its centre", "H_bar"),
                ("o side", "Round side at mid height", "o_side"), ("o thin", "Thinnest point of o", "o_thin"),
                ("Serif reach", "Foot past the stem", "serif_ext")]
        trs = "".join(
            f"<tr><td>{lab}</td><td class='muted'>{where}</td><td class='n'>{num(tg.get(key))}</td>" +
            "".join(f"<td class='n'>{num(m.get(key))}</td>" for m in m_all) + "</tr>"
            for lab, where, key in rows if tg.get(key) is not None)
        wrows = "".join(
            f"<tr><td>{c.replace('_', ' ')}</td><td class='f cls'>{esc(L.CLASSES[c])}</td><td class='n'>{num(v)}</td>" +
            "".join(f"<td class='n'>{num(m['widths'].get(c))}</td>" for m in m_all) + "</tr>"
            for c, v in (tg.get("widths") or {}).items())
        heads = "".join(f"<th class='n'>{esc(s)}</th>" for s, _ in styles)
        src = T.get("sources", [])
        n_files = sum(1 for s in src if s.get("source") == "file")
        n_imgs = len(src) - n_files
        parts = [f"{n_files} font file{'s' if n_files != 1 else ''}" if n_files else "",
                 f"{n_imgs} screenshot{'s' if n_imgs != 1 else ''}" if n_imgs else ""]
        refs_txt = " and ".join(p for p in parts if p) + (" were" if len(src) > 1 else " was")
        fit_txt = ""
        if fit:
            s0 = fit["styles"][0]
            last = s0["iterations"][-1]
            worst = max((abs(v) for v in last["error_pct"].values()), default=0)
            fit_txt = (f"Each width class takes its own location on the base's axes, so its mean advance meets the "
                       f"target. {last['iteration']} pass{'es' if last['iteration'] > 1 else ''} brought every class "
                       f"within {worst:.2f} percent. y coordinates come from one location chosen for contrast.")
        guard_n = len(space[0].get("guard", [])) if space else 0
        B.page("made", "How it was made", f"""
<div class="cols-made">
  <div class="made-text">
    <h2 class="f h2">How it was made</h2>
    <div class="steps">
      <div class="step"><span class="k">1</span><div><h3>References measured</h3><p>{refs_txt} measured, scaled to a cap height of 700. Only font-wide numbers and class means were taken. No outline, point or kerning pair was copied.</p></div></div>
      <div class="step"><span class="k">2</span><div><h3>An open foundation</h3><p>Every outline comes from one open variable font under the SIL Open Font License, chosen from a ranked shortlist of open families measured the same way.</p></div></div>
      <div class="step"><span class="k">3</span><div><h3>Fitted</h3><p>{esc(fit_txt) or 'Widths were fitted class by class on the base font&#39;s axes.'}</p></div></div>
      <div class="step"><span class="k">4</span><div><h3>Spaced and checked</h3><p>Straight and round sides were set to the measured means. A collision guard opened {guard_n} kerning pair{'s' if guard_n != 1 else ''}. Metrics, widths, kerning, coverage, provenance and licence were gated before release.</p></div></div>
    </div>
  </div>
  <div class="made-table">
    <table class="t"><thead><tr><th>Measure, cap 700</th><th>Where</th><th class="n">Target</th>{heads}</tr></thead><tbody>{trs}</tbody></table>
    <table class="t small-t"><thead><tr><th>Width class</th><th>Letters</th><th class="n">Target</th>{heads}</tr></thead><tbody>{wrows}</tbody></table>
  </div>
</div>""")

    # 03 metrics -------------------------------------------------------------
    S = 0.36
    W = 1472
    ox = 250
    oy = 70 + asc * S + 20
    word = "Hxdop"
    svg = f'<svg class="metrics" viewBox="0 0 {W} 460" width="{W}" height="460">'
    for lab, v in (("Ascender", asc), ("Cap height", cap), ("x-height", xh), ("Baseline", 0), ("Descender", desc)):
        y = oy - v * S
        svg += f'<line x1="0" x2="{W}" y1="{y:.2f}" y2="{y:.2f}" stroke="{ACCENT}" stroke-width="1"/>'
        dy = 14 if lab == "Cap height" and abs(asc - cap) < 40 else -6
        svg += f'<text class="ml" x="0" y="{y + dy:.2f}">{lab}</text><text class="mv" x="{ox - 24}" y="{y + dy:.2f}" text-anchor="end">{num(float(v))}</text>'
    x = 0
    glyphs = ""
    ticks = ""
    for (g, dx, adv) in face.shape(word):
        glyphs += f'<path transform="translate({x + dx} 0)" d="{face.svg_path(g)}"/>'
        xx = ox + x * S
        ticks += f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="{oy - desc * S + 12:.1f}" y2="{oy - desc * S + 24:.1f}" stroke="{ACCENT}"/>'
        ticks += f'<text class="mv" x="{ox + (x + adv / 2) * S:.1f}" y="{oy - desc * S + 24:.1f}" text-anchor="middle">{adv}</text>'
        x += adv
    svg += f'<g transform="translate({ox} {oy}) scale({S} {-S})">{glyphs}</g>{ticks}</svg>'
    vm = f"""<table class="t small-t"><thead><tr><th>Table</th><th class="n">Ascent</th><th class="n">Descent</th><th class="n">Line gap</th></tr></thead><tbody>
      <tr><td>OS/2 typo{', used' if use_typo else ''}</td><td class="n">{os2.sTypoAscender}</td><td class="n">{num(os2.sTypoDescender)}</td><td class="n">{os2.sTypoLineGap}</td></tr>
      <tr><td>hhea</td><td class="n">{hh.ascent}</td><td class="n">{num(hh.descent)}</td><td class="n">{hh.lineGap}</td></tr>
      <tr><td>OS/2 win</td><td class="n">{os2.usWinAscent}</td><td class="n">{os2.usWinDescent}</td><td></td></tr></tbody></table>"""
    lb = (A + D) * upm + (os2.sTypoLineGap if use_typo else hh.lineGap)
    B.page("metrics", "Vertical metrics", f"""
<div class="metrics-page">
  <div class="mhead"><h2 class="f h2">Vertical metrics</h2><p class="lede">Drawn from the {esc(styles[0][0])} outlines, {upm} units per em. Advances under each glyph are in font units after kerning.</p></div>
  {svg}
  <div class="mfoot">{vm}<p class="note">The line box is {round(lb)} units tall, so a browser's default line height is {lb / upm:.2f}. The x-height is {xh / upm * 100:.0f} percent of the em and the cap height {cap / upm * 100:.0f} percent.</p></div>
</div>""")

    # 04 weights -----------------------------------------------------------
    alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp;@$%()!?"
    cols = "".join(f"""<div class="wcol"><div class="wlabel"><span>{esc(s)}</span><span>{w} &middot; n stem {num(u(m['n_stem']))}</span></div>
    <div class="f wbig" style="font-weight:{w}">Rag</div><div class="f walpha" style="font-weight:{w}">{alpha}</div>
    <p class="f wpara" style="font-weight:{w}">Each weight shares the vertical lines of the others, so two weights can sit in one line of text.</p></div>"""
                   for (s, w), m in zip(styles[:4], m_all))
    B.page("weights", "Weights", f'<div class="weights" style="grid-template-columns:repeat({min(len(styles), 4)},minmax(0,1fr))">{cols}</div>')

    # 05 waterfall -----------------------------------------------------------
    def fit_line(text, size, width=1400):
        ws = text.split(" ")
        while ws:
            t = " ".join(ws)
            if face.text_width(t) * size / upm <= width:
                return t
            ws.pop()
        return text
    wf = "".join(f'<div class="wf"><span class="wfs">{s}</span><span class="f wft" style="font-size:{s}px">{esc(fit_line(t, s))}</span></div>'
                 for s, t in WATERFALL)
    B.page("waterfall", "Waterfall", f'<div class="waterfall">{wf}<p class="note wf-note">{esc(styles[0][0])}. Sizes in CSS pixels.</p></div>')

    # 06 text ---------------------------------------------------------------
    w2 = styles[1][1] if len(styles) > 1 else styles[0][1]

    def paras(lst):
        return "".join(f'<p class="f">{esc(p)}</p>' for p in lst)
    B.page("text", "Text settings", f"""
<div class="text-page">
  <div class="tcol t20"><div class="tlabel">20 / 30 px</div><h3 class="f th" style="font-weight:{w2}">Reading at length</h3>{paras(TEXT['a'])}</div>
  <div class="tcol t16"><div class="tlabel">16 / 24 px</div><h3 class="f th16" style="font-weight:{w2}">Body copy on the web</h3>{paras(TEXT['b'])}</div>
  <div class="tcol t13"><div class="tlabel">13 / 19 px</div><h3 class="f th13" style="font-weight:{w2}">Notes and captions</h3>{paras(TEXT['c'])}</div>
</div>""")

    # 07+ character set ------------------------------------------------------
    shown = [c for c in sorted(cm) if not (0xE000 <= c <= 0xF8FF) and unicodedata.category(chr(c)) not in ("Zs", "Cc", "Cf")]
    groups = {}
    for c in shown:
        groups.setdefault(char_group(c), []).append(c)
    order = [g for g in GROUP_ORDER if g in groups]
    budget, cur, cur_n, chunks = 41 * 17, [], 0, []
    for g in order:
        rows_needed = -(-len(groups[g]) // 41) * 41 + 41
        if cur and cur_n + rows_needed > budget:
            chunks.append(cur)
            cur, cur_n = [], 0
        cur.append(g)
        cur_n += rows_needed
    if cur:
        chunks.append(cur)

    def cells(cs):
        return "".join(f'<span class="cell" title="U+{c:04X}">{esc((" " if unicodedata.category(chr(c)) == "Mn" else "") + chr(c))}</span>' for c in cs)
    for i, ch in enumerate(chunks):
        blocks = "".join(f'<div class="cs-group"><div class="cs-label"><span>{g}</span><span>{len(groups[g])}</span></div><div class="cs-grid">{cells(groups[g])}</div></div>' for g in ch)
        B.page(f"charset-{i + 1}", "Character set", f"""
<div class="cs-page dense">
  <div class="cs-head"><h2 class="f h2">Character set{f', {i + 1} of {len(chunks)}' if len(chunks) > 1 else ''}</h2><p class="lede">{len(shown)} characters in the character map of the {esc(styles[0][0])} TTF, grouped by kind.</p></div>
  {blocks}
</div>""")

    # figures -------------------------------------------------------------
    fig_rows = [("Default", "", "0123456789")]
    for tags, lab in ((("lnum", "tnum"), "Lining tabular"), (("onum", "tnum"), "Old style tabular"), (("pnum",), "Proportional"),
                      (("lnum", "pnum"), "Lining proportional"), (("onum", "pnum"), "Old style proportional")):
        if all(t in FEATS for t in tags):
            fig_rows.append((" ".join(tags), lab, "0123456789"))
    fig_html = "".join(
        f'<div class="figrow"><span class="lab">{esc(t)}</span><span class="lab2">{esc(lab)}</span><span class="f figs" '
        f'style="font-feature-settings:{", ".join(chr(39) + x + chr(39) + " 1" for x in t.split()) if t != "Default" else "normal"}">{s}</span></div>'
        for t, lab, s in fig_rows)
    if "frac" in FEATS:
        fig_html += '<div class="figrow"><span class="lab">frac</span><span class="lab2">Fractions</span><span class="f figs" style="font-feature-settings:\'frac\' 1">1/2 3/4 7/16</span></div>'
    punct = " ".join(esc(c) for c in ".,:;…!?¡¿·•–—-()[]{}/\\|\"'“”‘’‚„«»‹›*†‡§¶#&@©®™°′″" if ord(c) in cm)
    curr = " ".join(esc(chr(c)) for c in sorted(cm) if unicodedata.category(chr(c)) == "Sc")
    B.page("figures", "Figures and punctuation", f"""
<div class="fig-page">
  <div class="figs-block"><h3 class="sec">Figures</h3>{fig_html}</div>
  <div class="punct-block"><h3 class="sec">Punctuation and signs</h3><div class="f punct">{punct}</div>
    <h3 class="sec">Currency</h3><div class="f punct curr">{curr}</div>
    <div class="f sample-figs">Invoice 2026&ndash;0417 &nbsp; 1,840.00 &nbsp; 08:45&ndash;17:30</div></div>
</div>""")

    # kerning ---------------------------------------------------------------
    kp = [p for p in ["AV", "To", "Ya", "P.", "F.", "y.", "LT", "Wa", "T,", "L’", "“A", "Kv", "Te", "Va", "r.", "AT", "Yo", "f)"]
          if all(face.has(c) for c in p)][:18]
    kc = "".join(f'<div class="kcell"><div class="f kp">{esc(p)}</div><div class="kv">{signed(face.kern(p) or 0)}</div></div>' for p in kp)
    guard_html = '<p class="note">No space log was given, so the guard is not shown.</p>'
    if space and space[0].get("guard"):
        g0 = space[0]["guard"][0]
        l, r = g0["pair"][0], g0["pair"][1]
        if face.has(l) and face.has(r):
            total = face.kern(l + r) or 0

            def pair_svg(extra, title):
                gap = face.ink_gap(l, r)
                gv = (gap[0] + extra) if gap else 0
                s2 = 0.3
                off = face.adv(l) + total + extra
                sv = f'<svg viewBox="0 0 420 380" width="100%" height="auto"><g transform="translate(60 280) scale({s2} {-s2})"><path d="{face.svg_path(l)}"/><path transform="translate({off} 0)" d="{face.svg_path(r)}"/></g>'
                for v in (xh, 0, desc):
                    sv += f'<line x1="0" x2="420" y1="{280 - v * s2:.1f}" y2="{280 - v * s2:.1f}" stroke="{ACCENT}" opacity=".35"/>'
                sv += "</svg>"
                return f'<div class="qj"><div class="qjt">{esc(title)}</div>{sv}<div class="kv">Smallest ink gap {num(round(gv, 1))} units</div></div>'
            guard_html = f"""<p>The guard read every pair of letters, figures and punctuation in rows 4 units apart and opened {len(space[0]['guard'])} pair{'s' if len(space[0]['guard']) != 1 else ''} whose ink came closer than {num(space[0].get('min_gap', 6))} units. The largest was {esc(l + r)}, opened by {g0['open']}.</p>
    <div class="qjrow">{pair_svg(-g0['open'], f'Without the guard, {signed(total - g0["open"])}')}{pair_svg(0, f'With the guard, {signed(total)}')}</div>"""
    elif space:
        guard_html = f"<p>The guard read every pair of letters, figures and punctuation and found none closer than {num(space[0].get('min_gap', 6))} units.</p>"
    B.page("kerning", "Kerning and spacing", f"""
<div class="kern-page">
  <div class="kleft"><h3 class="sec">Kerning pairs, {esc(styles[0][0])}, units</h3><div class="kgrid">{kc}</div>
    <h3 class="sec">Spacing strings</h3>
    <div class="f sp">nnnonnnoonnoonnn &nbsp; HHHOHHHOOHHOOHHH</div>
    <div class="f sp">nanbncndnenfngnhninjnknlnmnn</div><div class="f sp">HAHBHCHDHEHFHGHHHIHJHKHLHM</div>
    <div class="kon"><span class="lab">Kerning off</span><span class="f" style="font-kerning:none">AVATAR, Type, &ldquo;Wave.&rdquo;</span></div>
    <div class="kon"><span class="lab">Kerning on</span><span class="f">AVATAR, Type, &ldquo;Wave.&rdquo;</span></div></div>
  <div class="kright"><h3 class="sec">Collision guard</h3>{guard_html}<div class="f qjtext">Iraq jumps. Tariq juggles.</div></div>
</div>""")

    # features ----------------------------------------------------------------
    names = {r.nameID: r.toUnicode() for r in reg["name"].names if r.platformID == 3}
    ssname = {}
    if "GSUB" in reg:
        for fr in reg["GSUB"].table.FeatureList.FeatureRecord:
            p = fr.Feature.FeatureParams
            if p is not None and hasattr(p, "UINameID"):
                ssname[fr.FeatureTag] = names.get(p.UINameID)
    fcells = ""
    for tag in FEATS:
        label, sample = FEATURE_DEMO.get(tag, (ssname.get(tag) or ("Stylistic set " + tag[2:] if tag.startswith("ss") else tag), None))
        if tag not in FEATURE_DEMO or tag == "salt":
            sample = feature_chars(reg, tag) or sample
        if sample is None:
            fcells += f'<div class="fcell"><div class="ftag"><span>{tag}</span><span>{esc(label)}</span></div><div class="fdemo"><div class="fnote">Always on, applied by the shaper</div></div></div>'
            continue
        if tag == "kern":
            off, on = "font-kerning:none", ""
        elif tag == "liga":
            off, on = "font-variant-ligatures:none", ""
        else:
            off, on = f"font-feature-settings:'{tag}' 0", f"font-feature-settings:'{tag}' 1"
        fcells += f'<div class="fcell"><div class="ftag"><span>{tag}</span><span>{esc(label)}</span></div><div class="fdemo"><div class="f off" style="{off}">{esc(sample)}</div><div class="f on" style="{on}">{esc(sample)}</div></div></div>'
    B.page("features", "OpenType features", f"""
<div class="feat-page"><div class="cs-head"><h2 class="f h2">OpenType features</h2><p class="lede">{len(FEATS)} features, read from the GSUB and GPOS tables. Each pair shows the feature off in grey and on in black.</p></div>
  <div class="fgrid">{fcells}</div></div>""")

    # languages -------------------------------------------------------------
    def missing(chars):
        need = set(chars) | {c.upper() for c in chars if len(c.upper()) == 1}
        return sorted(c for c in need if ord(c) not in cm)
    lang_cols = ""
    total_ok = 0
    for script, lst in LANGS.items():
        ok = [(n, s) for n, s in lst if not missing(s)]
        if not ok:
            continue
        total_ok += len(ok)
        items = "".join(f'<div class="lang"><span class="f lname">{esc(n)}</span><span class="lchars">{esc(s[:22]) if s else "a to z"}</span></div>' for n, s in ok)
        lang_cols += f'<div><h3 class="sec">{script}, {len(ok)}</h3><div class="lgrid{" one" if script != "Latin" else ""}">{items}</div></div>'
    B.page("languages", "Language coverage", f"""
<div class="lang-page"><div class="cs-head"><h2 class="f h2">Languages</h2><p class="lede">Each language is checked against the character map for the letters it needs beyond a to z, in both cases. {total_ok} pass. The list is a sample, not the limit.</p></div>
  <div class="lang-cols">{lang_cols}</div></div>""")

    # licence ----------------------------------------------------------------
    copyright_lines = esc(names.get(0, "")).replace("\n", "<br>")
    rows = ""
    for p, (s, w), wp in zip(a.fonts, styles, web):
        rows += f"<tr><td class='mono'>{esc(os.path.basename(p))}</td><td>{esc(s)}, desktop</td><td class='n'>{os.path.getsize(p) / 1024:.0f} KB</td></tr>"
        if wp:
            rows += f"<tr><td class='mono'>{esc(wp)}</td><td>{esc(s)}, web</td><td class='n'>{os.path.getsize(os.path.join(fdir, wp)) / 1024:.0f} KB</td></tr>"
    css_snip = "\n".join(f'@font-face {{\n  font-family: "{family}";\n  src: url("webfonts/{(wp or os.path.basename(p))}");\n  font-weight: {w};\n  font-display: swap;\n}}'
                         for p, (s, w), wp in zip(a.fonts, styles, web))
    checks = ""
    if check:
        passed = sum(1 for r in check if r["state"] == "PASS")
        failed = [r for r in check if r["state"] == "FAIL"]
        failed_names = list(dict.fromkeys(r["gate"] for r in failed))  # gate names only: details may name a reference
        checks = f"<h3 class='sec' style='margin-top:26px'>Checks</h3><p>{passed} gates passed, {len(failed)} failed{': ' + esc(', '.join(failed_names[:6])) if failed else ''}.</p>"
    B.page("licence", "Licence and install", f"""
<div class="lic-page">
  <div class="lic-left"><h2 class="f h2">Licence</h2>
    <p class="f lic-lead">{esc(family)} is released under the SIL Open Font License, Version 1.1.</p>
    <div class="ofl"><p>{copyright_lines}</p><p>{esc(names.get(13, ''))}</p></div>
    <p>You may use the fonts in any project, commercial or not, embed them in documents, apps and websites, and modify them. You may sell them only as part of a larger work. A modified version keeps the OFL and the copyright lines above, and takes a new name. OFL.txt travels with the fonts.</p>
    <h3 class="sec">Files</h3><table class="t small-t"><thead><tr><th>File</th><th>Use</th><th class="n">Size</th></tr></thead><tbody>{rows}</tbody></table>{checks}
  </div>
  <div class="lic-right"><h3 class="sec">Install on the web</h3><p>Copy the WOFF2 files next to your stylesheet and add:</p><pre class="code">{esc(css_snip)}</pre>
    <h3 class="sec">Install on a computer</h3><p>Open each TTF and choose Install.</p></div>
</div>""")

    css = open(os.path.join(HERE, "book.css")).read().replace("ACCENT", ACCENT).replace('"BOOKFACE', f'"{family} Book')
    lines = f":root {{ --base: {base_em:.4f}em; --asc: {asc / upm:.4f}em; --cap: {cap / upm:.4f}em; --xh: {xh / upm:.4f}em; --desc: {-desc / upm:.4f}em; }}\n"
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1600">
<title>{esc(family)} font book</title>
<style>{font_css}{lines}{css}</style></head>
<body>
{''.join(p for _, _, p in B.pages)}
</body></html>"""
    with open(os.path.join(a.out_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(doc)
    L.save_json({"family": family, "pages": [[n, s] for n, s, _ in B.pages]}, os.path.join(a.out_dir, "pages.json"))
    print(f"{len(B.pages)} pages: {os.path.join(a.out_dir, 'index.html')}")
    print("next: node render_book.mjs " + a.out_dir)


if __name__ == "__main__":
    main()
