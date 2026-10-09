#!/usr/bin/env python3
"""tastegate: render a page in a real browser at phone and desktop width and
fail on the mechanics and the AI-default tells a model cannot see in its own CSS.

    python3 gate.py path/to/index.html            # or http://localhost:3000
    python3 gate.py site/ --out .tastegate --json

Exit 0: no fail findings. Exit 1: at least one fail finding. Exit 2: could not render.
Needs: pip install playwright && python3 -m playwright install chromium
MIT license.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

VIEWPORTS = {
    "mobile": {"width": 390, "height": 844, "is_mobile": True, "has_touch": True},
    "desktop": {"width": 1440, "height": 900, "is_mobile": False, "has_touch": False},
}

# One pass over the rendered DOM. Returns [{rule, severity, el, detail}].
CHECKS_JS = r"""
(vp) => {
  const W = window.innerWidth, H = window.innerHeight, mobile = vp === 'mobile';
  const out = [];
  const describe = (el) => {
    if (!el || el.nodeType !== 1) return null;
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.');
    const t = (el.innerText || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 48);
    return t ? `${s} "${t}"` : s;
  };
  const add = (rule, severity, el, detail) => out.push({rule, severity, el: describe(el), detail: detail || ''});
  const cs = (el) => getComputedStyle(el);
  const opacityOf = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(cs(e).opacity || '1'); return o; };
  const visible = (el) => {
    const s = cs(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (el.checkVisibility && !el.checkVisibility({contentVisibilityAuto: true})) return false;
    // Screen-reader-only text (clip / clip-path / off-screen skip links) is not on screen.
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const t = cs(e);
      if ((t.clip && t.clip !== 'auto') || (t.clipPath && t.clipPath !== 'none' && /inset\(50%|circle\(0|polygon\(0px 0px, 0px 0px/.test(t.clipPath))) return false;
    }
    const closed = el.closest('details:not([open])');
    if (closed && !el.closest('summary')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom + window.scrollY <= 0 || r.right + window.scrollX <= 0) return false;  // parked off-screen
    return opacityOf(el) >= 0.1;
  };
  const parseColors = (str) => {
    const res = [];
    const re = /rgba?\(([^)]+)\)/g; let m;
    while ((m = re.exec(str))) {
      const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      res.push({r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1});
    }
    return res;
  };
  const hsl = ({r, g, b}) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return {h: 0, s: 0, l};
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return {h: h * 60, s, l};
  };
  const lum = ({r, g, b}) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a), a: 1,
  });
  // Effective background behind el, or null when an image/gradient makes it unknowable.
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = cs(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parseColors(s.backgroundColor)[0];
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let bg = {r: 255, g: 255, b: 255, a: 1};
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  };

  const all = [...document.body.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(e.tagName));
  const shown = all.filter(visible);
  const shownSet = new Set(shown);

  // Text runs: every visible text node with its line boxes.
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || !shownSet.has(el)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(r => r.width >= 3 && r.height >= 6);
    if (rects.length) runs.push({node: n, el, text: t, rects});
  }

  // 1. Sideways scroll.
  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (docW > W + 1) {
    const clipped = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const ox = cs(e).overflowX; if (ox !== 'visible') return true; } return false; };
    const wide = shown.filter(e => e.getBoundingClientRect().right > W + 1 && !clipped(e));
    const leaf = wide.filter(e => !wide.some(o => o !== e && e.contains(o))).slice(0, 3);
    add('sideways_scroll', 'fail', leaf[0] || document.body, `page is ${docW}px wide in a ${W}px screen` + (leaf.length > 1 ? `; also ${leaf.slice(1).map(describe).join(', ')}` : ''));
  }

  // 2. Text over text. Axis-aligned boxes of text inside one rotated element overlap by
  // geometry, not on screen, so two runs under the same rotation are not compared.
  const rotatedRoot = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const t = cs(e).transform;
      if (t && t !== 'none') {
        const m2 = t.match(/^matrix\(([^)]+)\)/), m3 = t.match(/^matrix3d\(([^)]+)\)/);
        const v = (m2 || m3) ? (m2 || m3)[1].split(',').map(parseFloat) : [];
        const off = m3 ? [1, 2, 4, 6, 8, 9] : [1, 2];  // off-diagonal terms: rotation or skew
        if (off.some(k => Math.abs(v[k] || 0) > 0.01)) return e;
      }
    }
    return null;
  };
  runs.forEach(r => { r.rot = rotatedRoot(r.el); });
  const boxes = [];
  runs.forEach((r, i) => r.rects.forEach(b => boxes.push({i, b})));
  boxes.sort((a, b) => a.b.top - b.b.top);
  const seen = new Set();
  for (let a = 0; a < boxes.length; a++) {
    for (let c = a + 1; c < boxes.length && boxes[c].b.top < boxes[a].b.bottom; c++) {
      const A = boxes[a], B = boxes[c];
      if (A.i === B.i) continue;
      if (runs[A.i].rot && runs[A.i].rot === runs[B.i].rot) continue;
      const ix = Math.min(A.b.right, B.b.right) - Math.max(A.b.left, B.b.left);
      const iy = Math.min(A.b.bottom, B.b.bottom) - Math.max(A.b.top, B.b.top);
      if (ix <= 2 || iy <= 2) continue;
      const small = Math.min(A.b.width * A.b.height, B.b.width * B.b.height);
      if (ix * iy < Math.max(24, 0.25 * small)) continue;
      const key = [A.i, B.i].sort().join('-');
      if (seen.has(key)) continue; seen.add(key);
      const ra = runs[A.i], rb = runs[B.i];
      add('text_overlap', 'fail', ra.el, `"${ra.text.slice(0, 30)}" overlaps "${rb.text.slice(0, 30)}" (${describe(rb.el)})`);
    }
  }

  // 3. Contrast and 4. tiny text.
  const doneContrast = new Set();
  for (const r of runs) {
    if (doneContrast.has(r.el)) continue; doneContrast.add(r.el);
    const s = cs(r.el);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700;
    if (mobile && size < 12 && r.text.length > 1) add('tiny_text', 'fail', r.el, `${size}px on a phone`);
    const fg = parseColors(s.color)[0];
    if (!fg) continue;
    if (s.webkitTextFillColor && s.webkitTextFillColor.includes('rgba(0, 0, 0, 0)')) continue; // gradient text, judged below
    const bg = backgroundOf(r.el);
    if (!bg) continue;
    // Ancestor opacity fades text and its background together, so only the color's own alpha counts.
    const f = over(fg, bg);
    const L1 = lum(f), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) add('low_contrast', 'fail', r.el, `${ratio.toFixed(2)}:1, needs ${need}:1 at ${size}px`);
  }

  // 5. Tap targets on phones.
  if (mobile) {
    for (const el of shown) {
      const tag = el.tagName;
      const control = ['BUTTON', 'SELECT', 'TEXTAREA'].includes(tag) || (tag === 'INPUT' && !['hidden', 'checkbox', 'radio'].includes(el.type)) || el.getAttribute('role') === 'button';
      const link = tag === 'A' && el.hasAttribute('href');
      if (!control && !link) continue;
      const r = el.getBoundingClientRect();
      if (link && !control) {
        const s = cs(el);
        const p = el.parentElement;
        const inSentence = s.display === 'inline' && p && [...p.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (inSentence) continue;
        if (r.height < 24) add('small_tap_target', 'fail', el, `${Math.round(r.width)}x${Math.round(r.height)}px link, needs 24px`);
      } else if (r.height < 40 || r.width < 40) {
        add('small_tap_target', 'fail', el, `${Math.round(r.width)}x${Math.round(r.height)}px control, needs 44px`);
      } else if (r.height < 44) {
        add('small_tap_target', 'warn', el, `${Math.round(r.height)}px tall, 44px is the phone standard`);
      }
    }
    if (!document.querySelector('meta[name="viewport"]')) add('no_viewport_meta', 'fail', document.head, 'phones will render the desktop layout zoomed out');
  }

  // 6. Hero in the first screen (desktop).
  if (!mobile) {
    const h1 = shown.find(e => e.tagName === 'H1');
    if (!h1) add('no_h1', 'warn', document.body, 'no visible H1');
    else if (h1.getBoundingClientRect().bottom > H) add('hero_below_fold', 'fail', h1, `H1 ends at ${Math.round(h1.getBoundingClientRect().bottom)}px in a ${H}px screen`);
    const inChrome = (e) => !!e.closest('nav, header');
    const cta = shown.find(e => (e.tagName === 'A' || e.tagName === 'BUTTON') && !inChrome(e) && e.getBoundingClientRect().top < H && e.getBoundingClientRect().height >= 32 &&
      ((parseColors(cs(e).backgroundColor)[0] || {a: 0}).a > 0.2 || cs(e).backgroundImage !== 'none' || parseFloat(cs(e).borderTopWidth) >= 1));
    if (!cta) add('no_cta_in_first_screen', 'warn', document.body, 'no button-like call to action inside the first desktop screen');
  }

  // 7. Images.
  for (const img of document.images) {
    if (!visible(img)) continue;
    if (img.complete && img.naturalWidth === 0) add('broken_image', 'fail', img, img.currentSrc || img.src);
    if (!img.hasAttribute('alt')) add('image_without_alt', 'fail', img, img.currentSrc || img.src);
  }

  // Tells are judged once, on desktop, so the phone pass does not double count them.
  if (!mobile) {
    // 8. AI purple gradients and 9. gradient text.
    for (const el of shown) {
      const s = cs(el);
      const clipText = (s.webkitBackgroundClip || s.backgroundClip || '').includes('text');
      if (s.backgroundImage && s.backgroundImage.includes('gradient')) {
        if (clipText) { add('gradient_text', 'fail', el, 'text filled with a gradient'); continue; }
        const purple = parseColors(s.backgroundImage).map(hsl).some(c => c.h >= 245 && c.h <= 295 && c.s >= 0.35 && c.l >= 0.2 && c.l <= 0.85);
        if (purple) add('ai_purple_gradient', 'fail', el, 'violet or indigo gradient');
      }
      const sh = s.boxShadow;
      if (sh && sh !== 'none' && /\)\s+0px\s+0px\s+([1-9]\d)px/.test(sh)) {
        const glow = parseColors(sh).map(hsl).some(c => c.s > 0.4 && c.l > 0.25 && c.l < 0.85);
        if (glow) add('colored_glow', 'warn', el, 'zero-offset colored glow shadow');
      }
    }

    // 10. Emoji or pictographs standing in for icons.
    const pict = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const iconish = new Set();
    for (const r of runs) {
      if (!pict.test(r.text)) continue;
      const stripped = r.text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]/gu, '');
      const leads = pict.test([...r.text][0]);
      if ((stripped.length === 0 || leads) && !iconish.has(r.el)) { iconish.add(r.el); add('emoji_icon', 'fail', r.el, `"${r.text.slice(0, 12)}" used as an icon`); }
    }

    // 11. Eyebrow labels above headings.
    const heads = shown.filter(e => /^H[1-3]$/.test(e.tagName));
    const isEyebrow = (e) => {
      if (!e || !shownSet.has(e) || /^H[1-6]$/.test(e.tagName)) return false;
      const s = cs(e), t = (e.innerText || '').trim();
      if (!t || t.length > 60 || t.split(/\s+/).length > 7 || parseFloat(s.fontSize) > 15) return false;
      const upper = s.textTransform === 'uppercase' || (t === t.toUpperCase() && /[A-Z]{3}/.test(t));
      const ls = parseFloat(s.letterSpacing) || 0;
      return upper && ls >= 0.05 * parseFloat(s.fontSize) - 0.01;
    };
    const brows = heads.filter(h => isEyebrow(h.previousElementSibling) || (!h.previousElementSibling && isEyebrow(h.parentElement && h.parentElement.previousElementSibling)));
    const sections = Math.max(1, shown.filter(e => e.tagName === 'H2').length + 1);
    const allowed = Math.ceil(sections / 3);
    if (brows.length > allowed) add('eyebrow_labels', 'fail', brows[0].previousElementSibling || brows[0], `${brows.length} small uppercase labels over headings, at most ${allowed} for ${sections} sections`);

    // 12. Rows of same-size icon + heading + text cards.
    const cardy = (e) => { const s = cs(e); return (parseColors(s.backgroundColor)[0] || {a: 0}).a > 0.05 || parseFloat(s.borderTopWidth) >= 1 || s.boxShadow !== 'none' || s.backgroundImage !== 'none'; };
    const hasIcon = (e) => !!e.querySelector('svg, i[class*="icon"], [class*="icon"]') || [...e.querySelectorAll('img')].some(i => i.getBoundingClientRect().width <= 96) || pict.test((e.innerText || '').slice(0, 4));
    const hasHead = (e) => !!e.querySelector('h2, h3, h4, h5, strong, b');
    const hasText = (e) => !!e.querySelector('p') || (e.innerText || '').trim().split(/\s+/).length >= 8;
    for (const box of shown) {
      const kids = [...box.children].filter(k => shownSet.has(k));
      if (kids.length < 3) continue;
      const rows = {};
      for (const k of kids) { const r = k.getBoundingClientRect(); const key = Math.round(r.top / 8); (rows[key] = rows[key] || []).push({k, r}); }
      const row = Object.values(rows).find(rw => rw.length >= 3);
      if (!row) continue;
      const w0 = row[0].r.width;
      if (w0 < 160 || !row.every(x => Math.abs(x.r.width - w0) <= 6)) continue;
      if (row.every(x => cardy(x.k) && hasIcon(x.k) && hasHead(x.k) && hasText(x.k)))
        add('equal_icon_cards', 'fail', box, `${row.length} same-size icon + heading + text cards in a row`);
    }

    // 13. Display font is a default, or the chosen font never loaded.
    const defaults = ['inter', 'roboto', 'arial', 'helvetica', 'helvetica neue', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'sans-serif', 'serif', 'open sans', 'times new roman', 'ui-sans-serif'];
    const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '').toLowerCase()));
    const reported = new Set();
    for (const h of heads.filter(e => e.tagName !== 'H3')) {
      const fam = cs(h).fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
      if (reported.has(fam)) continue; reported.add(fam);
      if (defaults.includes(fam)) add('default_display_font', 'fail', h, `headings set in ${fam}`);
      else if (![...loaded].includes(fam) && !document.fonts.check(`16px "${fam}"`)) add('display_font_not_loaded', 'warn', h, `${fam} did not load, a fallback is showing`);
    }

    // 14. Placeholder copy and 15. em dashes.
    const text = document.body.innerText || '';
    const ph = text.match(/lorem ipsum|\bacme\b|john doe|jane doe|example\.com|unlock the power|your company name/i);
    if (ph) add('placeholder_copy', 'fail', document.body, `"${ph[0]}" on the page`);
    const dashes = (text.match(/—/g) || []).length;
    if (dashes) add('em_dash', 'fail', document.body, `${dashes} em dash${dashes > 1 ? 'es' : ''} in the copy`);
  }
  return out;
}
"""


def target_url(target: str) -> str:
    if target.startswith(("http://", "https://", "file://")):
        return target
    p = Path(target).expanduser().resolve()
    if p.is_dir():
        p = p / "index.html"
    if not p.exists():
        raise FileNotFoundError(f"no page at {p}")
    return p.as_uri()


def run(target: str, out_dir: Path, wait_ms: int = 900) -> dict:
    from playwright.sync_api import sync_playwright

    url = target_url(target)
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {"target": target, "url": url, "findings": [], "screenshots": {}, "console_errors": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            for name, vp in VIEWPORTS.items():
                ctx = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]},
                                          is_mobile=vp["is_mobile"], has_touch=vp["has_touch"],
                                          device_scale_factor=1)
                page = ctx.new_page()
                errors: list[str] = []
                page.on("console", lambda m, e=errors: e.append(m.text[:200]) if m.type == "error" else None)
                page.on("pageerror", lambda exc, e=errors: e.append(str(exc)[:200]))
                page.goto(url, wait_until="load", timeout=45000)
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                page.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true")
                # Walk the page once so scroll-triggered reveals settle, then judge from the top.
                page.evaluate("""async () => { const h = document.documentElement.scrollHeight;
                    for (let y = 0; y < h; y += Math.round(innerHeight * 0.7)) { scrollTo({top: y, behavior: 'instant'}); await new Promise(r => setTimeout(r, 90)); }
                    scrollTo({top: 0, behavior: 'instant'}); }""")
                page.wait_for_timeout(wait_ms)
                for f in page.evaluate(CHECKS_JS, name):
                    f["viewport"] = name
                    report["findings"].append(f)
                shot = out_dir / f"{name}.png"
                page.screenshot(path=str(shot), full_page=True)
                report["screenshots"][name] = str(shot)
                for e in dict.fromkeys(errors):
                    report["console_errors"].append({"viewport": name, "error": e})
                ctx.close()
        finally:
            browser.close()
    fails = [f for f in report["findings"] if f["severity"] == "fail"]
    report["fail"] = len(fails)
    report["warn"] = len(report["findings"]) - len(fails)
    report["rules_failed"] = sorted({f["rule"] for f in fails})
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))
    return report


def print_report(report: dict, limit: int = 6) -> None:
    by_rule: dict[tuple[str, str, str], list[dict]] = {}
    for f in report["findings"]:
        by_rule.setdefault((f["severity"], f["rule"], f["viewport"]), []).append(f)
    for (sev, rule, vp), items in sorted(by_rule.items(), key=lambda kv: (kv[0][0] != "fail", kv[0][1], kv[0][2])):
        print(f"{sev.upper():4}  {rule}  [{vp}]  x{len(items)}")
        for f in items[:limit]:
            print(f"      {f['el']}: {f['detail']}")
        if len(items) > limit:
            print(f"      ... {len(items) - limit} more")
    for e in report["console_errors"][:5]:
        print(f"NOTE  console error [{e['viewport']}]: {e['error']}")
    shots = ", ".join(report["screenshots"].values())
    verdict = "PASS" if report["fail"] == 0 else "FAIL"
    print(f"tastegate {verdict}: {report['fail']} fail, {report['warn']} warn. Screenshots: {shots}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Render a page at phone and desktop width and fail on design mechanics and AI-default tells.")
    ap.add_argument("target", help="index.html, a folder with index.html, or a URL")
    ap.add_argument("--out", default=".tastegate", help="folder for screenshots and report.json")
    ap.add_argument("--json", action="store_true", help="print the report as JSON")
    ap.add_argument("--wait", type=int, default=900, help="ms to let motion settle before judging")
    args = ap.parse_args(argv)
    try:
        report = run(args.target, Path(args.out), args.wait)
    except ImportError:
        print("tastegate needs Playwright: pip install playwright && python3 -m playwright install chromium", file=sys.stderr)
        return 2
    except Exception as exc:  # render failures are a different answer from "the page failed"
        print(f"tastegate could not render {args.target}: {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report)
    return 0 if report["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
