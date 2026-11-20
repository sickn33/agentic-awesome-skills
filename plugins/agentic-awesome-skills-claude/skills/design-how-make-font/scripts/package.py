"""Name, license and package the spaced fonts: TTF, WOFF2, OFL.txt, FONTLOG.txt, a CSS file and a README.

  python3 -I package.py <Family-Regular.ttf> [<Family-Medium.ttf> ...] --targets targets.json
      --base <base-vf.ttf> --base-licence <base OFL.txt> --holder "Name for the copyright line"
      --out-dir DIR [--vendor ABCD] [--version 1.000] [--designer "..."] [--url https://...]
      [--fit-log fit-log.json] [--space-log a.space-log.json ...] [--web-unicodes "U+0000-00FF,..."]

The new family name comes from targets.json. The script refuses a name that contains the base family's name or
any Reserved Font Name in the base's licence, because the OFL forbids a modified version to use them.

Name table: the base's copyright line stays (the OFL requires it), ours is added under it. The trademark
record (ID 7) and every other base name record go, except the names of stylistic sets. IDs 13 and 14 carry
the OFL notice and URL. OS/2 gets the vendor ID, the weight class and the style bits.

OFL.txt is the base's licence file, byte for byte, with our copyright line added at the top. FONTLOG.txt lists
the base, what changed and why, from the fit and space logs.
"""
import argparse
import datetime
import os
import re
import sys

sys.dont_write_bytecode = True  # keep the skill folder free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fontTools import subset  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402

import fontlib as L  # noqa: E402

OFL_NOTICE = ("This Font Software is licensed under the SIL Open Font License, Version 1.1. "
              "This license is available with a FAQ at: https://openfontlicense.org")
OFL_URL = "https://openfontlicense.org"
WEIGHT_NAMES = {100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold",
                700: "Bold", 800: "ExtraBold", 900: "Black"}


LEGACY_ACCENTS = "`\u00a8\u00af\u00b4\u00b8\u02c6\u02c7\u02d8\u02d9\u02da\u02db\u02dc\u02dd"


def fix_legacy_accents(f):
    """Spacing accents (U+00B4 and friends) are base glyphs, not marks. Some bases class them as marks in GDEF,
    which makes shapers zero their width. Returns the glyphs changed."""
    if "GDEF" not in f or not f["GDEF"].table.GlyphClassDef:
        return []
    cd = f["GDEF"].table.GlyphClassDef.classDefs
    cm = f.getBestCmap()
    out = []
    for ch in LEGACY_ACCENTS:
        n = cm.get(ord(ch))
        if n and cd.get(n) == 3:
            cd[n] = 1
            out.append(n)
    return out


def ps_name(family, style):
    return re.sub(r"[^A-Za-z0-9]", "", family) + "-" + re.sub(r"[^A-Za-z0-9]", "", style)


def check_name(family, base_family, licence_text):
    rfn = []
    for clause in re.findall(r"Reserved Font Names?[^.\n]*", licence_text):
        quoted = re.findall(r"\"([^\"]+)\"", clause)
        rfn += [q.strip() for q in quoted] or [clause.split("Name", 1)[1].lstrip("s ").strip()]
    bad = [w for w in [base_family] + rfn if w and w.lower() in family.lower()]
    bits = [w for w in re.findall(r"[A-Za-z]{4,}", base_family)
            if w.lower() not in ("serif", "sans", "mono", "display", "text", "grotesk", "slab")]
    bad += [w for w in bits if w.lower() in family.lower()]
    if bad:
        raise SystemExit(f"refused: {family!r} uses {sorted(set(bad))}, the base's name or a Reserved Font Name. "
                         "Pick a new family name and set it in targets.json.")
    return rfn


def set_names(f, base, family, style, weight, a, version):
    bnames = {r.nameID: r.toUnicode() for r in base["name"].names if r.platformID == 3}
    ps = ps_name(family, style)
    ribbi = style in ("Regular", "Bold", "Italic", "Bold Italic")
    year = datetime.date.today().year
    recs = {
        0: f"{bnames.get(0, '').strip()}\nCopyright {year} {a.holder} (modifications)".strip(),
        1: family if ribbi else f"{family} {style}",
        2: style if ribbi else "Regular",
        3: f"{version:.3f};{a.vendor};{ps}",
        4: f"{family} {style}",
        5: f"Version {version:.3f}",
        6: ps,
        8: a.holder,
        9: f"{bnames.get(9, 'the original authors')} (original design); {a.designer or a.holder} (modifications)",
        13: OFL_NOTICE,
        14: OFL_URL,
        16: family,
        17: style,
    }
    if a.url:
        recs[11] = a.url
    keep = set()
    for tag in ("GSUB", "GPOS"):
        if tag in f:
            for fr in f[tag].table.FeatureList.FeatureRecord:
                p = fr.Feature.FeatureParams
                if p is not None and hasattr(p, "UINameID"):
                    keep.add(p.UINameID)
    name = f["name"]
    name.names = [r for r in name.names if r.nameID in keep and r.platformID == 3]
    for nid, s in recs.items():
        name.setName(s, nid, 3, 1, 0x409)
    os2 = f["OS/2"]
    os2.achVendID = a.vendor.ljust(4)[:4]
    os2.usWeightClass = weight
    sel = os2.fsSelection & (1 << 7)  # keep USE_TYPO_METRICS
    if "Bold" not in style and "Italic" not in style:
        sel |= 1 << 6  # REGULAR: name ID 2 is Regular for every upright style that is not Bold
    if style == "Bold":
        sel |= 1 << 5
    os2.fsSelection = sel
    f["head"].macStyle = 1 if style == "Bold" else 0
    f["head"].fontRevision = version
    f["post"].italicAngle = 0
    return ps


def fontlog(T, base, base_path, fit, spaces, version, a, files):
    bn = {r.nameID: r.toUnicode() for r in base["name"].names if r.platformID == 3}
    today = datetime.date.today().isoformat()
    lines = [f"FONTLOG for {T['family']}", "", "Basic font information", "-" * 22,
             f"{T['family']} is a modified version of {bn.get(16) or bn.get(1)}, released under the SIL Open Font "
             "License 1.1. Its proportions, widths and spacing were fitted to measurements of typefaces the "
             "requester chose. Every outline comes from the open base. No outline, point or kerning pair was taken "
             "from any other font.", "",
             f"Use: {T.get('use')}. Scripts: {', '.join(T.get('scripts', []))}.", "",
             "Files: " + ", ".join(files), "", "ChangeLog", "-" * 9, f"{today} (version {version:.3f})"]
    n = 1
    lines.append(f"  {n}. Base: {os.path.basename(base_path)}, axes {L.axes_of(base)}.")
    if fit:
        for s in fit["styles"]:
            n += 1
            lines.append(f"  {n}. {s['style']['name']}: y coordinates from {s['y_location']}; x per width class from "
                         f"its own location, factors {s['factors']}.")
            last = s["iterations"][-1]
            lines.append(f"     Width fit: {last['iteration']} pass(es), error % by class {last['error_pct']}.")
            if s.get("stretch_limit_hit"):
                lines.append(f"     Stretch limit reached for {s['stretch_limit_hit']}.")
    for sp in spaces:
        n += 1
        lines.append(f"  {n}. Spacing ({sp.get('input')}): side moves {sp.get('side_moves')}, track {sp.get('track', 0)}, "
                     f"{len(sp.get('guard', []))} pairs opened by the collision guard.")
    n += 1
    lines.append(f"  {n}. Renamed to {T['family']}, trademark record removed, OFL notice set, overlaps removed, "
                 "variation tables removed, spacing accents classed as base glyphs in GDEF.")
    lines += ["", "Acknowledgements", "-" * 16, f"Original design: {bn.get(9, 'see the copyright line')}.",
              f"Original copyright: {bn.get(0, '')}", f"Modifications: {a.designer or a.holder}.", ""]
    return "\n".join(lines)


def css(family, faces):
    out = []
    for ps, weight in faces:
        out.append(f"""@font-face {{
  font-family: "{family}";
  src: url("webfonts/{ps}.woff2") format("woff2");
  font-weight: {weight};
  font-style: normal;
  font-display: swap;
}}""")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fonts", nargs="+")
    ap.add_argument("--targets", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--base-licence", required=True)
    ap.add_argument("--holder", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--vendor", default="NONE")
    ap.add_argument("--version", type=float, default=1.0)
    ap.add_argument("--designer")
    ap.add_argument("--url")
    ap.add_argument("--fit-log")
    ap.add_argument("--space-log", action="append", default=[])
    ap.add_argument("--web-unicodes", help="subset the WOFF2 files to these ranges; default keeps every glyph")
    a = ap.parse_args()
    T = L.load_json(a.targets)
    base = TTFont(a.base)
    bfam = base["name"].getDebugName(16) or base["name"].getDebugName(1)
    licence = open(a.base_licence, encoding="utf-8").read()
    if "Open Font License" not in licence and "OPEN FONT LICENSE" not in licence:
        raise SystemExit("the base licence file is not the SIL Open Font License; this skill only ships OFL fonts")
    rfn = check_name(T["family"], bfam, licence + "\n" + (base["name"].getDebugName(0) or ""))
    os.makedirs(os.path.join(a.out_dir, "ttf"), exist_ok=True)
    os.makedirs(os.path.join(a.out_dir, "webfonts"), exist_ok=True)
    faces, files = [], []
    fonts = [p for p in a.fonts if not p.endswith(".fit.ttf")]
    for p in [p for p in a.fonts if p.endswith(".fit.ttf")]:
        print(f"skip {p}: an unspaced fit; package the spaced file step 6 wrote")
    for p in fonts:
        # Match a font to its style by the -<Style> its filename ends in, never by the order a glob gives.
        stem = os.path.splitext(os.path.basename(p))[0]
        style = next((s for s in T["styles"] if stem.lower().endswith("-" + re.sub(r"[^A-Za-z0-9]", "", s["name"]).lower())), None)
        if style is None:
            raise SystemExit(f"{p}: its name does not end in -<Style> for any style in targets.json ({[s['name'] for s in T['styles']]})")
        f = TTFont(p)
        ps = set_names(f, base, T["family"], style["name"], style["weight"], a, a.version)
        fixed = fix_legacy_accents(f)
        if fixed:
            print(f"{style['name']}: {len(fixed)} spacing accents reclassed from mark to base in GDEF")
        ttf = os.path.join(a.out_dir, "ttf", ps + ".ttf")
        f.save(ttf)
        w = TTFont(ttf)
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        opts.glyph_names = False
        opts.flavor = "woff2"
        sub = subset.Subsetter(opts)
        if a.web_unicodes:
            sub.populate(unicodes=subset.parse_unicodes(a.web_unicodes))
        else:
            sub.populate(glyphs=w.getGlyphOrder())
        sub.subset(w)
        w.flavor = "woff2"
        woff = os.path.join(a.out_dir, "webfonts", ps + ".woff2")
        w.save(woff)
        faces.append((ps, style["weight"]))
        files += [f"ttf/{ps}.ttf", f"webfonts/{ps}.woff2"]
        print(f"{style['name']}: {ttf} ({len(f.getGlyphOrder())} glyphs), {woff} ({len(w.getGlyphOrder())} glyphs)")
    year = datetime.date.today().year
    with open(os.path.join(a.out_dir, "OFL.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"Copyright {year} {a.holder} (modifications)\n" + licence)
    fit = L.load_json(a.fit_log) if a.fit_log else None
    spaces = [L.load_json(p) for p in a.space_log]
    files += ["OFL.txt", "FONTLOG.txt", "fonts.css", "README.md"]
    with open(os.path.join(a.out_dir, "FONTLOG.txt"), "w", encoding="utf-8") as fh:
        fh.write(fontlog(T, base, a.base, fit, spaces, a.version, a, files))
    with open(os.path.join(a.out_dir, "fonts.css"), "w") as fh:
        fh.write(css(T["family"], faces))
    weights = ", ".join(f"{s['name']} {s['weight']}" for s in T["styles"][:len(a.fonts)])
    readme = f"""# {T['family']}

A {T.get('use', 'text')} typeface in {len(a.fonts)} weight{'s' if len(a.fonts) > 1 else ''} ({weights}), for {', '.join(T.get('scripts', []))}.

{T['family']} is a modified version of an open font, fitted to measured proportions, widths and spacing. Every
outline comes from that base. FONTLOG.txt lists what changed.

## Files

- `ttf/`: desktop fonts. Install by opening the file.
- `webfonts/`: WOFF2 files for the web, with `fonts.css` beside them.
- `OFL.txt`: the licence. `FONTLOG.txt`: the base and every change.

## Use on the web

Copy `webfonts/` and `fonts.css` next to your stylesheet, then:

```css
@import url("fonts.css");
body {{ font-family: "{T['family']}", serif; }}
```

## Licence

SIL Open Font License 1.1. You may use, embed, modify and redistribute the fonts, and sell them only as part of
a larger work. A modified version keeps this licence and the copyright lines, and needs a new name.
{('Reserved Font Names of the base: ' + ', '.join(rfn) + '.') if rfn else 'The base declares no Reserved Font Name.'}
"""
    with open(os.path.join(a.out_dir, "README.md"), "w") as fh:
        fh.write(readme)
    print(f"wrote {a.out_dir}: " + ", ".join(files))


if __name__ == "__main__":
    main()
