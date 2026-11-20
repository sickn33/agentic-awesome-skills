"""Write the logo book: every direction presented the way a studio presents logo directions (references/logo-book.md).

    python3 -I logo_book.py <build dir> [...] --out <book dir> --name "Fieldnote" --line "Inspections and permits from
        the job site" [--tagline "From site to sign-off"] [--note "a notification the app would send"]
        [--fonts <cache>]

Then print it: `node render_book.mjs <book dir>` writes pages/*.png and logobook.pdf.

Pages: a cover; the directions side by side; for each direction a spread of the mark in use (a dark lockup, a browser
tab, a poster), a spread of its construction (a light lockup, the grid, a phone), its colour, and its small sizes; then
one page comparing them with their checks. No photographs and no reference logos: where a studio would use a photo,
the book uses the direction's own colour as a field.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fonts as F  # noqa: E402

W, H = 1600, 900
BOOK_FONT = "Inter Tight"


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def read_svg(path: str) -> tuple[str, str]:
    """(viewBox, path d) of a single-path SVG written by build_logo.py."""
    s = open(path).read()
    return re.search(r'viewBox="([^"]+)"', s).group(1), re.search(r' d="([^"]+)"', s).group(1)


def logo(path: str, fill: str, height: float | None = None, width: float | None = None, cls: str = "") -> str:
    vb, d = read_svg(path)
    _, _, w, h = (float(v) for v in vb.split())
    if height is not None:
        width = height * w / h
    elif width is not None:
        height = width * h / w
    return (f'<svg class="logo {cls}" viewBox="{vb}" width="{width:.1f}" height="{height:.1f}" aria-hidden="true">'
            f'<path fill="{fill}" d="{d}"/></svg>')


def rgb(h: str) -> list[int]:
    h = h.lstrip("#")
    if len(h) == 3:  # #999 is #999999
        h = "".join(c * 2 for c in h)
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def mix(a: str, b: str, t: float) -> str:
    pa, pb = rgb(a), rgb(b)
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(pa, pb))


def field(p: dict, angle: int = 135) -> str:
    """A soft colour field in the direction's palette, standing in for a photograph."""
    return (f"background: radial-gradient(120% 90% at 0% 100%, {p['accent']} 0%, {mix(p['accent'], p['tint'], .55)} 38%, transparent 70%),"
            f" radial-gradient(80% 70% at 70% 10%, {mix(p['tint'], '#ffffff', .5)} 0%, transparent 60%), {p['tint']};")


def thin(vals, lo, hi, g, gap_share=0.12, most=5):
    """A few clean guides, as a studio would draw them: the mark's two edges, then the recipe's own lines that sit
    well apart from those already kept (at least `gap_share` of the grid), at most `most` per axis."""
    keep = [lo, hi]
    for v in sorted(vals, key=lambda v: -min(abs(v - k) for k in keep)):
        if len(keep) >= most:
            break
        if all(abs(v - k) >= gap_share * g for k in keep):
            keep.append(v)
    return sorted(keep)


def construction(build: dict, bdir: str, p: dict, w: int, h: int) -> str:
    """The mark on its grid with dashed guides run edge to edge, as the construction tile."""
    g = build["grid"]
    _, d = read_svg(os.path.join(bdir, "mark-grid.svg"))
    s = h * 0.34 / g
    ox, oy = (w - g * s) / 2, (h - g * s) / 2
    lines = []
    for x in thin(build["guides"]["x"], build["mark_box"][0], build["mark_box"][2], g):
        X = ox + x * s
        lines.append(f'<line x1="{X:.1f}" y1="0" x2="{X:.1f}" y2="{h}"/>')
    for y in thin(build["guides"]["y"], build["mark_box"][1], build["mark_box"][3], g):
        Y = oy + y * s
        lines.append(f'<line x1="0" y1="{Y:.1f}" x2="{w}" y2="{Y:.1f}"/>')
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" class="grid">'
            f'<g stroke="{mix(p["paper"], p["ink"], .35)}" stroke-width="1.2" stroke-dasharray="7 6">{"".join(lines)}</g>'
            f'<path transform="translate({ox:.1f} {oy:.1f}) scale({s:.4f})" fill="{mix(p["paper"], p["neutral"], .25)}" d="{d}"/></svg>')


def browser(name: str, bdir: str, p: dict) -> str:
    domain = re.sub(r"[^a-z0-9]", "", name.lower()) + ".com"
    icon = f'<span class="fav" style="background:{p["accent"]}">{logo(os.path.join(bdir, "mark.svg"), p["ink"] if lum(p["accent"]) > .45 else "#ffffff", height=26)}</span>'
    return f"""<div class="browser">
      <div class="tabs"><i></i><i></i><i></i><div class="tab">{icon}<b>{esc(name)}</b><span class="x">×</span></div></div>
      <div class="bar"><span class="nav">←</span><span class="nav">→</span><span class="nav">↻</span>
        <span class="url" style="background:{p['tint']}"><svg width="14" height="16" viewBox="0 0 14 16"><rect x="1" y="7" width="12" height="9" rx="2" fill="{p['ink']}"/><path d="M4 7V5a3 3 0 0 1 6 0v2" stroke="{p['ink']}" stroke-width="2" fill="none"/></svg>{domain}</span></div>
    </div>"""


def phone(name: str, bdir: str, p: dict, note: str) -> str:
    on = p["ink"] if lum(p["accent"]) > .45 else "#ffffff"
    apps = []
    for i in range(16):
        if i == 5:
            apps.append(f'<div class="app"><span class="ic" style="background:{p["accent"]}">{logo(os.path.join(bdir, "mark.svg"), on, height=40)}</span><em>{esc(name)}</em></div>')
        else:
            apps.append(f'<div class="app"><span class="ic" style="background:{mix(p["tint"], p["neutral"], (i % 5) / 8)}"></span><em></em></div>')
    return f"""<div class="phone" style="background:{mix(p['tint'], '#ffffff', .4)}">
      <div class="notch"></div><div class="time">9:41</div>
      <div class="note"><span class="ic sm" style="background:{p['accent']}">{logo(os.path.join(bdir, 'mark.svg'), on, height=20)}</span>
        <div><b>{esc(name)}</b><span>{esc(note)}</span></div></div>
      <div class="apps">{''.join(apps)}</div>
    </div>"""


def lum(hex_: str) -> float:
    h = hex_.lstrip("#")
    h = "".join(ch * 2 for ch in h) if len(h) == 3 else h  # #999 is #999999
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


CSS = """
@font-face { font-family: "Book"; src: url("fonts/book.ttf"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: 1600px 900px; margin: 0; }
body { background: #e9e9e9; font-family: "Book"; color: #161616; -webkit-font-smoothing: antialiased; }
section.page { position: relative; width: 1600px; height: 900px; overflow: hidden; background: #fff; break-after: page; margin: 0 auto 24px; }
@media print { body { background: none; } section.page { margin: 0; } }
.tile { position: absolute; border-radius: 22px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.foot { position: absolute; left: 64px; bottom: 40px; font-size: 13px; letter-spacing: -0.01em; opacity: .55; }
.num { position: absolute; right: 64px; bottom: 40px; font-size: 13px; opacity: .55; }
h1 { font-weight: 400; letter-spacing: -0.035em; line-height: .98; }
h2 { font-weight: 400; font-size: 64px; letter-spacing: -0.03em; line-height: 1; }
p.lede { font-size: 22px; line-height: 1.4; letter-spacing: -0.01em; }
section.page.cover { background: #161616; color: #fff; }
.cover .left { position: absolute; left: 0; top: 0; width: 50%; height: 100%; padding: 96px 104px; }
.cover .right { position: absolute; right: 0; top: 0; width: 50%; height: 100%; }
.cover h1 { position: absolute; left: 104px; bottom: 310px; font-size: 104px; }
.cover .sub { position: absolute; left: 104px; bottom: 250px; font-size: 52px; letter-spacing: -0.03em; color: #6f6f6f; }
.cover .kicker { font-size: 16px; color: #8a8a8a; letter-spacing: 0.02em; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; position: absolute; left: 64px; right: 64px; top: 210px; }
.three .t { height: 360px; border-radius: 22px; display: flex; align-items: center; justify-content: center; }
.three h3 { font-weight: 500; font-size: 22px; letter-spacing: -0.02em; margin-top: 24px; }
.three p { font-size: 16px; line-height: 1.45; opacity: .7; margin-top: 8px; max-width: 420px; }
.label { position: absolute; left: 64px; top: 64px; }
.label .k { font-size: 15px; opacity: .55; margin-bottom: 10px; }
.browser { width: 560px; background: transparent; }
.browser .tabs { display: flex; align-items: flex-end; gap: 10px; padding-left: 26px; }
.browser .tabs i { width: 15px; height: 15px; border-radius: 50%; background: #fff; margin-bottom: 22px; }
.browser .tab { margin-left: 18px; display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px 16px 0 0; padding: 12px 22px 12px 14px; font-size: 22px; letter-spacing: -0.01em; }
.browser .tab b { font-weight: 400; width: 190px; }
.browser .x { opacity: .55; font-size: 22px; }
.fav { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
.browser .bar { background: #fff; border-radius: 16px; padding: 16px 22px; display: flex; align-items: center; gap: 26px; }
.browser .nav { font-size: 22px; opacity: .6; }
.browser .url { flex: 1; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 6px; font-size: 19px; }
.poster { position: absolute; inset: 0; padding: 72px 68px; display: flex; flex-direction: column; justify-content: space-between; }
.poster h4 { font-weight: 500; font-size: 58px; letter-spacing: -0.03em; line-height: 1.04; }
.poster .lk { align-self: flex-end; }
.phone { width: 330px; height: 660px; border-radius: 48px; border: 10px solid #121212; position: relative; padding: 76px 24px 0; }
.phone .notch { position: absolute; left: 50%; top: 12px; width: 96px; height: 28px; border-radius: 14px; background: #121212; transform: translateX(-50%); }
.phone .time { position: absolute; left: 30px; top: 16px; font-size: 15px; font-weight: 600; }
.phone .note { display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,.85); border-radius: 18px; padding: 12px 14px; margin-bottom: 28px; }
.phone .note b { display: block; font-size: 13px; font-weight: 600; }
.phone .note span { font-size: 12px; opacity: .75; line-height: 1.3; }
.phone .apps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px 12px; }
.phone .app { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.phone .ic { width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; }
.phone .ic.sm { width: 38px; height: 38px; border-radius: 10px; flex: none; }
.phone em { font-style: normal; font-size: 11px; height: 13px; }
.swatches { position: absolute; left: 450px; top: 76px; width: 1086px; height: 748px; background: #f1f1f1; border-radius: 22px; }
.sw { position: absolute; display: flex; align-items: flex-end; padding: 22px 26px; font-size: 20px; letter-spacing: -0.01em; box-shadow: 0 1px 0 rgba(0,0,0,.06); }
.sizes { position: absolute; left: 64px; right: 64px; top: 220px; display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 28px; }
.sizes .t { position: relative; height: 300px; border-radius: 22px; display: flex; align-items: flex-end; justify-content: center; gap: 44px; padding-bottom: 70px; }
.sizes .t small { position: absolute; left: 26px; top: 22px; font-size: 14px; opacity: .6; }
.sizes .t .cap { position: absolute; bottom: 26px; font-size: 13px; opacity: .55; }
.cmp { position: absolute; left: 64px; right: 64px; top: 200px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.cmp .t { height: 250px; border-radius: 22px; display: flex; align-items: center; justify-content: center; gap: 40px; }
.cmp table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 15px; }
.cmp td { padding: 9px 0; border-bottom: 1px solid #e5e5e5; }
.cmp td:last-child { text-align: right; }
.grid { position: absolute; inset: 0; }
.credits { position: absolute; left: 64px; right: 64px; top: 200px; border-collapse: collapse; font-size: 15px; }
.credits td { padding: 12px 16px 12px 0; border-bottom: 1px solid #e5e5e5; word-break: break-all; }
"""


def poster(p: dict, bdir: str, tagline: str, img: str | None) -> str:
    """The tall poster tile: a photo with the tagline and lockup in paper over a dark foot, or, with no photos, the
    direction's colour field with ink type."""
    box = "left:1014px;top:30px;width:556px;height:840px;"
    if img:
        return (f'<div class="tile" style="{box}background:#000 url({img}) center/cover">'
                f'<div class="poster" style="background:linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,0) 70%);justify-content:flex-end;gap:36px">'
                f'<h4 style="color:{p["paper"]}">{esc(tagline)}</h4><div class="lk">{logo(os.path.join(bdir, "lockup.svg"), p["paper"], height=40)}</div></div></div>')
    return (f'<div class="tile" style="{box}{field(p)}"><div class="poster"><h4 style="color:{p["ink"]}">{esc(tagline)}</h4>'
            f'<div class="lk">{logo(os.path.join(bdir, "lockup.svg"), p["ink"], height=40)}</div></div></div>')


def page(pid: str, body: str, cls: str = "", style: str = "") -> str:
    return f'<section class="page {cls}" id="{pid}" style="{style}">{body}</section>'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("builds", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--line", required=True, help="what the product does, one line")
    ap.add_argument("--tagline", default=None)
    ap.add_argument("--note", default=None, help="the phone mockup's notification text; default: the tagline")
    ap.add_argument("--photos", default=None, help="a folder from fetch_photos.mjs: photos for the cover and posters, credited at the end")
    ap.add_argument("--fonts", default=os.path.expanduser("~/.cache/make-logo/fonts"))
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "fonts"), exist_ok=True)
    info = F.fetch(BOOK_FONT, a.fonts)
    shutil.copy(info["files"][0], os.path.join(a.out, "fonts", "book.ttf"))
    shutil.copy(info["licence"], os.path.join(a.out, "fonts", "OFL.txt"))
    dirs = []
    for b in a.builds:
        build = json.load(open(os.path.join(b, "build.json")))
        chk = json.load(open(os.path.join(b, "check.json"))) if os.path.exists(os.path.join(b, "check.json")) else None
        dirs.append((b, build, chk))
    tagline = a.tagline or a.line
    # Photos, copied in beside the book, used in turn: the cover, then each direction's poster.
    photos = []
    if a.photos:
        man = json.load(open(os.path.join(a.photos, "manifest.json")))
        os.makedirs(os.path.join(a.out, "photos"), exist_ok=True)
        for it in man["items"]:
            if not os.path.exists(os.path.join(a.photos, it["file"])):
                continue  # deleted as not fitting the brand (SKILL.md step 8): drop it, credit and all
            shutil.copy(os.path.join(a.photos, it["file"]), os.path.join(a.out, "photos", it["file"]))
            photos.append(it)
    photo = lambda k: f"photos/{photos[k % len(photos)]['file']}" if photos else None
    pages, order = [], []

    def add(slug, html_):
        n = len(order) + 1
        order.append([n, slug])
        pages.append(html_.replace("{N}", f"{n:02d}"))

    first = dirs[0]
    p0 = first[1]["palette"]
    add("cover", page("p{N}", f"""
      <div class="left"><div class="kicker">{esc(a.line)}</div></div>
      <h1>{esc(a.name)}</h1><div class="sub">Logo directions</div>
      {f'<div class="right" style="background:#000 url({photo(0)}) center/cover"></div>' if photos else
       f'<div class="right" style="{field(p0)}display:flex;align-items:center;justify-content:center">{logo(os.path.join(first[0], "mark.svg"), p0["ink"], height=300)}</div>'}
    """, "cover"))

    cards = []
    for i, (b, build, _) in enumerate(dirs, 1):
        p = build["palette"]
        cards.append(f"""<div><div class="t" style="background:{p['paper']}">{logo(os.path.join(b, 'mark.svg'), p['ink'], height=150)}</div>
          <h3>{esc(build.get('title', ''))}</h3><p>{esc(build.get('idea', ''))}</p></div>""")
    # Three to a page, like side by side: six cards on one page leave no room around the marks.
    for k in range(0, len(cards), 3):
        add(f"directions-{k // 3 + 1}", page("p{N}", f"""<div class="label"><h2>{len(dirs)} directions</h2></div>
      <div class="three">{''.join(cards[k:k + 3])}</div><div class="foot">{esc(a.line)}</div><div class="num">{{N}}</div>"""))

    for i, (b, build, chk) in enumerate(dirs, 1):
        p = build["palette"]
        dark = p["ink"]
        # Spread A: in use. A dark lockup, a browser tab, a poster.
        add(f"d{i}-use", page("p{N}", f"""
          <div class="tile" style="left:30px;top:30px;width:954px;height:400px;background:{dark}">{logo(os.path.join(b, 'lockup.svg'), p['paper'], height=64)}</div>
          <div class="tile" style="left:30px;top:460px;width:954px;height:410px;background:{p['tint']}">{browser(a.name, b, p)}</div>
          {poster(p, b, tagline, photo(i))}"""))
        # Spread B: construction. A light lockup, the grid, a phone.
        add(f"d{i}-build", page("p{N}", f"""
          <div class="tile" style="left:30px;top:30px;width:954px;height:400px;background:{p['paper']}">{logo(os.path.join(b, 'lockup.svg'), dark, height=64)}</div>
          <div class="tile" style="left:30px;top:460px;width:954px;height:410px;background:{dark}">{construction(build, b, p, 954, 410)}</div>
          <div class="tile" style="left:1014px;top:30px;width:556px;height:840px;background:{p['neutral']}">{phone(a.name, b, p, a.note or tagline)}</div>"""))
        # Colour.
        sw = [("paper", 36, 32, 336, 684), ("accent", 400, 32, 336, 296), ("tint", 764, 32, 286, 136), ("neutral", 764, 196, 286, 132), ("ink", 400, 356, 650, 360)]
        cells = "".join(
            f'<div class="sw" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{p[k]};color:{"#161616" if lum(p[k]) > .3 else "#ffffff"}">{p[k].upper()}</div>'
            for k, x, y, w, h in sw)
        add(f"d{i}-colour", page("p{N}", f"""<div class="label"><h2>Colour</h2></div>
          <div class="swatches">{cells}</div><div class="num">{{N}}</div>"""))
        # Small sizes and versions.
        m = os.path.join(b, "mark.svg")
        sizes = "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:10px">{logo(m, dark, height=s)}<span style="font-size:12px;opacity:.55">{s}px</span></div>' for s in (16, 24, 32, 64))
        stroke = next((c["value"] for c in (chk or {}).get("checks", []) if c["check"] == "stroke at 16 px"), "not checked")
        add(f"d{i}-sizes", page("p{N}", f"""<div class="label"><h2>Sizes and versions</h2></div>
          <div class="sizes">
            <div class="t" style="background:{p['paper']}"><small>Small sizes</small>{sizes}<span class="cap">Stroke at 16 px: {esc(stroke)}</span></div>
            <div class="t" style="background:{dark};align-items:center;padding:0">{logo(m, p['paper'], height=120)}<small style="color:{p['paper']}">Reversed</small></div>
            <div class="t" style="background:{p['accent']};align-items:center;padding:0">{logo(m, dark if lum(p['accent']) > .45 else '#ffffff', height=120)}<small>On colour</small></div>
          </div>
          <div class="tile" style="left:64px;right:64px;top:550px;height:290px;background:{p['tint']}">{logo(os.path.join(b, 'lockup-stacked.svg'), dark, height=170)}</div>
          <div class="num">{{N}}</div>"""))

    rows = []
    for i, (b, build, chk) in enumerate(dirs, 1):
        p = build["palette"]
        checks = (chk or {}).get("checks", [])
        trs = "".join(f"<tr><td>{esc(c['check'])}</td><td>{esc(c['value'])} {'✓' if c['ok'] else '✗'}</td></tr>" for c in checks) or "<tr><td>Checks</td><td>not run</td></tr>"
        rows.append(f"""<div><div class="t" style="background:{p['paper']}">{logo(os.path.join(b, 'mark.svg'), p['ink'], height=110)}{logo(os.path.join(b, 'mark.svg'), p['ink'], height=16)}</div>
          <h3 style="font-weight:500;font-size:20px;margin-top:22px">{esc(build.get('title', ''))}</h3><table>{trs}</table></div>""")
    # Three to a page: six on one page left the tiles cramped and the checks cut down.
    for k in range(0, len(rows), 3):
        add(f"compare-{k // 3 + 1}", page("p{N}", f"""<div class="label"><h2>Side by side</h2></div>
      <div class="cmp">{''.join(rows[k:k + 3])}</div><div class="num">{{N}}</div>"""))
    if photos:
        lines = "".join(f'<tr><td>{esc(it["title"] or "Photo")}</td><td>{esc(it["creator"])}</td><td>{esc(it["license"])}</td><td>{esc(it["source"])}</td></tr>' for it in photos)
        add("credits", page("p{N}", f"""<div class="label"><h2>Photos</h2></div>
      <table class="credits">{lines}</table>"""))

    open(os.path.join(a.out, "index.html"), "w").write(
        f'<!doctype html><html><head><meta charset="utf-8"><title>{esc(a.name)} logo directions</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
    json.dump({"family": "Book", "name": a.name, "pages": order}, open(os.path.join(a.out, "pages.json"), "w"), indent=1)
    print(f"wrote {len(order)} pages to {a.out}")


if __name__ == "__main__":
    main()
