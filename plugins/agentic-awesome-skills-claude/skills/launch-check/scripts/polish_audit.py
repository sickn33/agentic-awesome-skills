#!/usr/bin/env python3
# Adapted from agent-forge site-polish-audit v1.0 for launch-check.
# AAS: active rendering opt-in, scoped browser/static reads, output sanitation and bounded screenshots.
"""polish_audit.py: render a web page, measure what makes it look unprofessional, rank the fixes.

Renders the page in headless Chromium (Playwright) at 375, 768 and 1440 px and measures, per viewport:
horizontal overflow, text overlapping other text, text clipped by its container, WCAG contrast per element
(gradients included), tap targets under 44 px, type sprawl (families and sizes), palette sprawl and
near-duplicate colours, spacing off the 4/8 px grid, images without alt / size / with distortion, layout
shift (CLS), line length over 80 characters, missing viewport meta, and heading structure.
It prints a ranked fix list with CSS selectors and concrete values, a 0-100 score with a transparent
formula, and writes one annotated screenshot per viewport (red numbered boxes = fix list numbers).

Without Playwright it falls back to a static HTML/CSS parse (no layout checks) and says so.

Usage:
  python polish_audit.py <url-or-html-file> [options]
  python polish_audit.py page.html                       # audit, ranked fixes, screenshots in %TEMP%
  python polish_audit.py https://example.com --json      # machine output
  python polish_audit.py page.html --score               # one-line score + breakdown (for the fix loop)
  python polish_audit.py page.html --static              # force the no-browser parse

Options:
  --viewports 375,768,1440   widths to render          --top N          fixes to print (default 12)
  --shots DIR                screenshot folder         --no-shots       skip screenshots
  --fail-under N             gate score (default 90)   --offline        block every non-file request
  --timeout S                page load timeout (default 30)

Exit codes: 0 = score >= gate and no HIGH finding, 1 = below the gate or a HIGH finding, 2 = usage error.
Install for the full audit: python -m pip install playwright && python -m playwright install chromium
"""

from __future__ import annotations

import argparse
import colorsys
import hashlib
import html.parser
import json
import math
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from launch_check import Fetcher, guard_browser_context, sanitize_report, origin
from pathlib import Path

VERSION = "1.0"
DEFAULT_VIEWPORTS = (375, 768, 1440)
INSTALL_HINT = "python -m pip install playwright && python -m playwright install chromium"

# check -> (label, max penalty). The score is 100 minus the sum of capped penalties: see score().
CHECKS = {
    "viewport-meta": ("missing viewport meta", 10),
    "overflow": ("horizontal overflow", 25),
    "overlap": ("text overlaps text", 15),
    "clipped": ("text clipped", 12),
    "contrast": ("contrast below WCAG AA", 20),
    "tap-target": ("tap target < 44 px", 10),
    "layout-shift": ("layout shift (CLS)", 10),
    "images": ("image hygiene", 8),
    "line-length": ("line length > 80 ch", 6),
    "headings": ("heading structure", 6),
    "type-scale": ("type sprawl", 8),
    "palette": ("colour sprawl", 6),
    "spacing": ("spacing off the 4/8 px grid", 6),
    "fixed-width": ("fixed width wider than a phone", 10),
}
SEVERITY_ORDER = {"HIGH": 0, "MED": 1, "LOW": 2}
LAYOUT_ONLY = {"overflow", "overlap", "clipped", "tap-target", "layout-shift", "line-length"}

# --------------------------------------------------------------------------------------------- colour


def luminance(rgb):
    def chan(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast_ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def to_hex(rgb):
    return "#%02x%02x%02x" % tuple(int(round(max(0, min(255, c)))) for c in rgb[:3])


def blend(fg, bg):
    """fg rgba over opaque bg rgb."""
    a = fg[3] if len(fg) > 3 else 1.0
    return [fg[i] * a + bg[i] * (1 - a) for i in range(3)]


def suggest_color(fg, bg, target):
    """Closest colour to fg (mixed toward black or white) that reaches the target ratio against bg."""
    darker = luminance(bg) > 0.18
    goal = (0, 0, 0) if darker else (255, 255, 255)
    for direction in (goal, (255, 255, 255) if darker else (0, 0, 0)):
        for step in range(1, 101):
            t = step / 100.0
            cand = [fg[i] * (1 - t) + direction[i] * t for i in range(3)]
            if contrast_ratio(cand, bg) >= target + 0.05:
                return to_hex(cand)
    return to_hex(goal)


NAMED = {
    "black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0), "green": (0, 128, 0),
    "blue": (0, 0, 255), "gray": (128, 128, 128), "grey": (128, 128, 128), "silver": (192, 192, 192),
    "yellow": (255, 255, 0), "orange": (255, 165, 0), "purple": (128, 0, 128), "navy": (0, 0, 128),
    "teal": (0, 128, 128), "maroon": (128, 0, 0), "olive": (128, 128, 0), "lime": (0, 255, 0),
    "aqua": (0, 255, 255), "cyan": (0, 255, 255), "fuchsia": (255, 0, 255), "magenta": (255, 0, 255),
    "whitesmoke": (245, 245, 245), "lightgray": (211, 211, 211), "lightgrey": (211, 211, 211),
    "darkgray": (169, 169, 169), "darkgrey": (169, 169, 169), "dimgray": (105, 105, 105),
    "gainsboro": (220, 220, 220), "slategray": (112, 128, 144), "tomato": (255, 99, 71),
    "gold": (255, 215, 0), "indigo": (75, 0, 130), "violet": (238, 130, 238), "pink": (255, 192, 203),
}
COLOR_TOKEN = re.compile(
    r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:%s)\b" % "|".join(sorted(NAMED, key=len, reverse=True)),
    re.I)


def parse_css_color(text):
    """CSS colour literal -> [r, g, b, a] or None (hex, rgb(a), hsl(a), common names)."""
    t = text.strip().lower()
    if t in NAMED:
        return list(NAMED[t]) + [1.0]
    if t.startswith("#"):
        h = t[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) not in (6, 8) or not re.fullmatch(r"[0-9a-f]+", h):
            return None
        a = int(h[6:8], 16) / 255.0 if len(h) == 8 else 1.0
        return [int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a]
    m = re.match(r"(rgba?|hsla?)\(([^)]*)\)", t)
    if not m:
        return None
    parts = [p for p in re.split(r"[\s,/]+", m.group(2).strip()) if p]
    if len(parts) < 3:
        return None
    try:
        alpha = 1.0
        if len(parts) > 3:
            alpha = float(parts[3].rstrip("%")) / (100.0 if parts[3].endswith("%") else 1.0)
        if m.group(1).startswith("rgb"):
            vals = [float(p.rstrip("%")) * (2.55 if p.endswith("%") else 1) for p in parts[:3]]
            return vals + [alpha]
        hue = float(re.sub(r"deg$", "", parts[0])) / 360.0
        sat = float(parts[1].rstrip("%")) / 100.0
        lig = float(parts[2].rstrip("%")) / 100.0
        r, g, b = colorsys.hls_to_rgb(hue % 1.0, lig, sat)
        return [r * 255, g * 255, b * 255, alpha]
    except ValueError:
        return None


def color_distance(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def palette_clusters(counts, near=10.0):
    """counts {hex: n} -> (clusters [[hex, n, members]], near-duplicate pairs [(minor, major, n_minor)])."""
    items = sorted(counts.items(), key=lambda kv: -kv[1])
    clusters = []
    pairs = []
    for hx, n in items:
        rgb = parse_css_color(hx)
        if rgb is None:
            continue
        for cl in clusters:
            dist = color_distance(rgb, cl[3])
            if dist < near:
                cl[1] += n
                cl[2].append(hx)
                if dist > 0 and not {hx, cl[0]} & {"#ffffff", "#000000"}:  # off-white surfaces are a choice
                    pairs.append((hx, cl[0], n))
                break
        else:
            clusters.append([hx, n, [hx], rgb])
    return [c[:3] for c in clusters], pairs


# ---------------------------------------------------------------------------------- browser measuring

INIT_JS = r"""
(() => { try {
  window.__paCls = 0; window.__paShift = [];
  new PerformanceObserver(list => { for (const e of list.getEntries()) { if (e.hadRecentInput) continue;
    window.__paCls += e.value; for (const s of (e.sources || [])) if (s.node && s.node.nodeType === 1)
      window.__paShift.push({node: s.node, value: e.value}); } }).observe({type: 'layout-shift', buffered: true});
} catch (_) {} })();
"""

MEASURE_JS = r"""
(opts) => {
const de = document.documentElement, body = document.body || de;
const R = {vw: de.clientWidth, innerWidth: window.innerWidth, docWidth: Math.max(de.scrollWidth, body.scrollWidth),
  docHeight: Math.max(de.scrollHeight, body.scrollHeight), hasViewportMeta: !!document.querySelector('meta[name="viewport" i]'),
  overflow: [], clipped: [], overlap: [], contrast: [], contrastUnknown: 0, taps: [], fonts: {}, sizes: {}, tiny: [],
  colors: {}, spacing: {}, lines: [], images: [], headings: [], cls: window.__paCls || 0, shifts: [], textCount: 0, truncated: false};
const okId = /^[A-Za-z][\w-]*$/, okCls = /^[A-Za-z_][\w-]*$/;
function sel(el) {
  if (!el || el.nodeType !== 1) return '?';
  if (el === body) return 'body'; if (el === de) return 'html';
  const parts = []; let e = el, depth = 0;
  while (e && e.nodeType === 1 && e !== body && e !== de && depth < 4) {
    if (e.id && okId.test(e.id) && !/\d{3,}/.test(e.id) && e.id.length <= 24) { parts.unshift('#' + e.id); break; }
    let s = e.tagName.toLowerCase();
    const cls = Array.from(e.classList).filter(c => okCls.test(c) && c.length < 32 && !/^(is-|has-|js-)/.test(c)).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    parts.unshift(s);
    try { if (document.querySelectorAll(parts.join(' > ')).length === 1 && (cls.length || depth > 0)) break; } catch (_) {}
    e = e.parentElement; depth++;
  }
  return parts.join(' > ');
}
const SX = window.scrollX, SY = window.scrollY;
const box = r => [Math.round(r.left + SX), Math.round(r.top + SY), Math.round(r.width), Math.round(r.height)];
const csMap = new Map();
const cs = el => { let c = csMap.get(el); if (!c) { c = getComputedStyle(el); csMap.set(el, c); } return c; };
const opMap = new Map();
function opacity(el) { if (!el || el.nodeType !== 1) return 1; if (opMap.has(el)) return opMap.get(el);
  const o = parseFloat(cs(el).opacity || '1') * opacity(el.parentElement); opMap.set(el, o); return o; }
function visible(el) { const c = cs(el); if (c.display === 'none' || c.visibility === 'hidden' || c.visibility === 'collapse') return false;
  const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1 && opacity(el) > 0.05; }
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const cx = cv.getContext('2d', {willReadFrequently: true}); const colCache = new Map();
function rgba(s) { if (colCache.has(s)) return colCache.get(s); let v = [0, 0, 0, 0];
  if (s && s !== 'transparent') { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255]; }
  colCache.set(s, v); return v; }
const hex = c => '#' + c.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
const blend = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
const COLRE = /(rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}\b)/g;
function addColor(c, kind) { if (c[3] <= 0.02) return; const h = hex(c[3] < 1 ? blend(c, [255, 255, 255]) : c);
  const k = R.colors[h] || (R.colors[h] = {n: 0, kinds: {}}); k.n++; k.kinds[kind] = 1; }
const MEDIA = /^(IMG|VIDEO|CANVAS|IFRAME|PICTURE|OBJECT|EMBED)$/;
function splitTop(str) { const out = []; let depth = 0, cur = '';
  for (const ch of str) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
// linear-gradient -> {dir, stops} (null when not a single plain linear gradient: then every stop is checked)
function parseLinear(bi, w, h) {
  const m = String(bi.trim()).match(/^linear-gradient\((.*)\)$/); if (!m || bi.split('gradient(').length > 2) return null;
  const args = splitTop(m[1]); let dx = 0, dy = 1; const first = args[0];
  const ang = String(first).match(/^(-?[\d.]+)(deg|turn|rad|grad)$/);
  if (ang) { let a = parseFloat(ang[1]); a = ang[2] === 'turn' ? a * 360 : ang[2] === 'rad' ? a * 180 / Math.PI : ang[2] === 'grad' ? a * 0.9 : a;
    const rad = a * Math.PI / 180; dx = Math.sin(rad); dy = -Math.cos(rad); args.shift(); }
  else if (/^to /.test(first)) { const sx = /right/.test(first) ? 1 : /left/.test(first) ? -1 : 0, sy = /bottom/.test(first) ? 1 : /top/.test(first) ? -1 : 0;
    if (sx && sy) { dx = sx * h; dy = sy * w; } else { dx = sx; dy = sy; } const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; args.shift(); }
  const L = Math.abs(w * dx) + Math.abs(h * dy) || 1; const stops = [];
  for (const a of args) { const mm = String(a).match(/^(.*\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*(.*)$/); if (!mm) return null;
    const col = rgba(mm[1]); const pos = mm[2].split(/\s+/).filter(Boolean).map(x => x.endsWith('%') ? parseFloat(x) / 100 : x.endsWith('px') ? parseFloat(x) / L : NaN);
    if (!pos.length) stops.push({c: col, p: NaN}); else for (const q of pos) stops.push({c: col, p: q}); }
  if (stops.length < 2) return null;
  if (isNaN(stops[0].p)) stops[0].p = 0; if (isNaN(stops[stops.length - 1].p)) stops[stops.length - 1].p = 1;
  for (let i = 1; i < stops.length; i++) { if (isNaN(stops[i].p)) { let j = i; while (isNaN(stops[j].p)) j++;
      for (let k = i; k < j; k++) stops[k].p = stops[i - 1].p + (stops[j].p - stops[i - 1].p) * (k - i + 1) / (j - i + 1); }
    if (stops[i].p < stops[i - 1].p) stops[i].p = stops[i - 1].p; }
  return {dx, dy, L, stops};
}
function gradAt(g, rect, x, y) {
  const t = ((x - (rect.l + rect.r) / 2) * g.dx + (y - (rect.t + rect.b) / 2) * g.dy) / g.L + 0.5; const s = g.stops;
  if (t <= s[0].p) return s[0].c; if (t >= s[s.length - 1].p) return s[s.length - 1].c;
  for (let i = 1; i < s.length; i++) if (t <= s[i].p) { const f = (t - s[i - 1].p) / ((s[i].p - s[i - 1].p) || 1);
    return [0, 1, 2, 3].map(k => s[i - 1].c[k] + (s[i].c[k] - s[i - 1].c[k]) * f); }
  return s[s.length - 1].c;
}
// Background colours behind text: walks the painted stack (elementsFromPoint) or the ancestors.
// Returns one colour per sample point, or null when an image/video is underneath (contrast unknown).
function backgrounds(el, list, pts) {
  const layers = []; let grad = null, gradEl = null, base = [255, 255, 255];
  for (const e of list) {
    if (e.nodeType !== 1) continue; const op = opacity(e); if (op < 0.05) continue;
    if (MEDIA.test(e.tagName) && e !== el) return null;
    const c = cs(e); const bi = c.backgroundImage;
    if (bi && bi !== 'none') { if (/url\(/.test(bi)) return null; grad = bi; gradEl = e;
      const under = rgba(c.backgroundColor); if (under[3] >= 0.99) base = under; break; }
    const b = rgba(c.backgroundColor);
    if (b[3] > 0) { const bb = [b[0], b[1], b[2], b[3] * op]; if (bb[3] >= 0.99) { base = bb; break; } layers.push(bb); }
  }
  let bases;
  if (grad) {
    const r = gradEl.getBoundingClientRect(); const rect = {l: r.left + window.scrollX, t: r.top + window.scrollY, r: r.right + window.scrollX, b: r.bottom + window.scrollY};
    const g = parseLinear(grad, r.width, r.height);
    if (g) bases = pts.map(p => blend(gradAt(g, rect, p[0], p[1]), base));
    else bases = (grad.match(COLRE) || []).map(rgba).filter(x => x[3] > 0).map(x => blend(x, base));
    if (!bases.length) bases = [base.slice(0, 3)];
  } else bases = [base.slice(0, 3)];
  for (let i = layers.length - 1; i >= 0; i--) bases = bases.map(b => blend(layers[i], b));
  return bases;
}
function srOnly(el) { for (let e = el, d = 0; e && e.nodeType === 1 && d < 4; e = e.parentElement, d++) { const c = cs(e);
  if ((c.position === 'absolute' || c.position === 'fixed') && ((c.clip && c.clip !== 'auto') || /inset\(50%|circle\(0/.test(c.clipPath))) return true;
  const r = e.getBoundingClientRect(); if (r.width <= 2 && r.height <= 2 && c.overflow !== 'visible') return true; } return false; }
function clipRects(el, rects) { let out = rects.map(t => Object.assign({}, t));
  for (let e = el.parentElement; e && e !== de && out.length; e = e.parentElement) { const c = cs(e);
    if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
    const r = e.getBoundingClientRect(); const L = r.left + SX + e.clientLeft, T = r.top + SY + e.clientTop, Rr = L + e.clientWidth, B = T + e.clientHeight;
    out = out.map(t => ({l: c.overflowX === 'visible' ? t.l : Math.max(t.l, L), r: c.overflowX === 'visible' ? t.r : Math.min(t.r, Rr),
      t: c.overflowY === 'visible' ? t.t : Math.max(t.t, T), b: c.overflowY === 'visible' ? t.b : Math.min(t.b, B)})).filter(t => t.r - t.l > 1 && t.b - t.t > 1); }
  return out; }
function ancestors(el) { const out = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) out.push(e); return out; }
function fixedChain(el) { for (let e = el; e && e.nodeType === 1; e = e.parentElement) if (cs(e).position === 'fixed') return true; return false; }
function lum(c) { const f = x => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function textRects(el) { const out = []; for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
  const rg = document.createRange(); rg.selectNodeContents(n);
  for (const r of rg.getClientRects()) { if (r.width >= 1 && r.height >= 1) out.push({l: r.left + SX, t: r.top + SY, r: r.right + SX, b: r.bottom + SY}); if (out.length > 24) return out; } }
  return out; }
function directText(el) { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue; return t.replace(/\s+/g, ' ').trim(); }
function clipBox(el) { for (let e = el; e && e !== de; e = e.parentElement) { const c = cs(e);
  if (/^(hidden|clip)$/.test(c.overflowX) || /^(hidden|clip)$/.test(c.overflowY)) {
    if (c.textOverflow === 'ellipsis' || (c.webkitLineClamp && c.webkitLineClamp !== 'none')) return null;
    const r = e.getBoundingClientRect(); return {el: e, l: r.left + SX + e.clientLeft, t: r.top + SY + e.clientTop,
      r: r.left + SX + e.clientLeft + e.clientWidth, b: r.top + SY + e.clientTop + e.clientHeight, x: c.overflowX, y: c.overflowY}; }
  if (/^(auto|scroll)$/.test(c.overflowX) || /^(auto|scroll)$/.test(c.overflowY)) return null; }
  return null; }
const all = Array.from(body.querySelectorAll('*'));
if (all.length > opts.maxElements) { R.truncated = true; all.length = opts.maxElements; }
const texts = []; const cq = []; const vw = R.vw;
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'path', 'OPTION', 'TITLE', 'HEAD', 'META', 'LINK', 'BR']);
const clippedSeen = new Set();
for (const el of all) {
  if (SKIP.has(el.tagName)) continue;
  if (!visible(el)) continue;
  const c = cs(el); const r = el.getBoundingClientRect();
  // overflow culprits
  if (R.docWidth > vw + 1 && c.position !== 'fixed' && r.right + SX > vw + 1) {
    const p = el.parentElement; const pr = p ? p.getBoundingClientRect() : null;
    let contained = false;
    for (let e = p; e && e !== body && e !== de; e = e.parentElement) { const pc = cs(e); if (pc.overflowX !== 'visible') { contained = true; break; } }
    if (!contained && (!pr || p === body || p === de || pr.right + SX <= vw + 1))
      R.overflow.push({sel: sel(el), box: box(r), over: Math.round(r.right + SX - vw), width: Math.round(r.width)});
  }
  // colours
  addColor(rgba(c.backgroundColor), 'bg');
  if (c.backgroundImage && c.backgroundImage !== 'none' && !/url\(/.test(c.backgroundImage)) (c.backgroundImage.match(COLRE) || []).forEach(s => addColor(rgba(s), 'gradient'));
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(c['border' + side + 'Width']) > 0 && c['border' + side + 'Style'] !== 'none') addColor(rgba(c['border' + side + 'Color']), 'border');
  // spacing
  const sp = (v, kind) => { const n = parseFloat(v); if (!(n > 0)) return; const k = (Math.round(n * 2) / 2).toString();
    const s = R.spacing[k] || (R.spacing[k] = {n: 0, ex: []}); s.n++; if (s.ex.length < 2) { const q = sel(el) + ' ' + kind; if (s.ex.indexOf(q) < 0) s.ex.push(q); } };
  sp(c.paddingTop, 'padding-top'); sp(c.paddingRight, 'padding-right'); sp(c.paddingBottom, 'padding-bottom'); sp(c.paddingLeft, 'padding-left');
  sp(c.marginTop, 'margin-top'); sp(c.marginBottom, 'margin-bottom');
  if (/flex|grid/.test(c.display)) { if (c.rowGap !== 'normal') sp(c.rowGap, 'row-gap'); if (c.columnGap !== 'normal') sp(c.columnGap, 'column-gap'); }
  // images
  if (el.tagName === 'IMG') {
    const hasAlt = el.hasAttribute('alt') || el.getAttribute('role') === 'presentation' || el.getAttribute('aria-hidden') === 'true';
    const hasDims = (el.hasAttribute('width') && el.hasAttribute('height')) || (c.aspectRatio && c.aspectRatio !== 'auto' && !/^auto\s*$/.test(c.aspectRatio));
    let distorted = 0, upscale = 0;
    if (el.naturalWidth > 0 && el.naturalHeight > 0 && c.objectFit === 'fill') {
      const nr = el.naturalWidth / el.naturalHeight, rr = r.width / r.height; distorted = Math.abs(rr / nr - 1); }
    if (el.naturalWidth > 0 && !/\.svg(\?|$)|^data:image\/svg/i.test(el.currentSrc || el.src)) upscale = r.width / el.naturalWidth;
    R.images.push({sel: sel(el), box: box(r), alt: hasAlt, dims: !!hasDims, distorted: Math.round(distorted * 100) / 100,
      upscale: Math.round(upscale * 100) / 100, src: (el.currentSrc || el.src || '').slice(0, 80)});
  }
  // tap targets (touch viewports only)
  if (opts.taps && el.matches('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=menuitem],[onclick]')) {
    let tr = r; const parent = el.parentElement;
    const inline = el.tagName === 'A' && c.display === 'inline' && parent && directText(parent).length > 20;
    if ((el.type === 'checkbox' || el.type === 'radio') && el.labels && el.labels.length) {
      const lr = el.labels[0].getBoundingClientRect(); tr = {width: Math.max(lr.width, r.width), height: Math.max(lr.height, r.height)}; }
    if (!inline && !el.closest('[aria-hidden=true]') && (tr.width < 44 || tr.height < 44) && !srOnly(el))
      R.taps.push({sel: sel(el), box: box(r), w: Math.round(tr.width), h: Math.round(tr.height)});
  }
  // text
  const dt = directText(el); if (!dt) continue;
  const rawRects = textRects(el); if (!rawRects.length || srOnly(el)) continue;
  const rects = clipRects(el, rawRects); if (!rects.length) continue;  // scrolled or clipped out of view

  R.textCount++;
  const fs = parseFloat(c.fontSize); const fw = parseInt(c.fontWeight, 10) || 400;
  const fam = (c.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase();
  R.fonts[fam] = (R.fonts[fam] || 0) + 1; const fk = (Math.round(fs * 2) / 2).toString(); R.sizes[fk] = (R.sizes[fk] || 0) + 1;
  if (fs < 12 && R.tiny.length < 50) R.tiny.push({sel: sel(el), box: box(r), size: fs});
  const fg = rgba(c.color); addColor(fg, 'text');
  if (!el.closest(':disabled,[aria-disabled=true],.disabled')) cq.push({el: el, fg: fg, fs: fs, fw: fw, rects: rects, r: r, dt: dt});
  texts.push({el: el, rects: rects, sel: null, r: r});
  // clipped
  const cb = clipBox(el);
  if (cb && !clippedSeen.has(cb.el)) {
    for (const t of rawRects) {
      const inside = t.l >= cb.l - 2 && t.r <= cb.r + 2 && t.t >= cb.t - 2 && t.b <= cb.b + 2;
      const touches = t.r > cb.l && t.l < cb.r && t.b > cb.t && t.t < cb.b;
      if (!inside && touches) { clippedSeen.add(cb.el); R.clipped.push({sel: sel(el), box: box(r), container: sel(cb.el), text: dt.slice(0, 40),
        lost: Math.round(Math.max(t.r - cb.r, cb.l - t.l, t.b - cb.b, cb.t - t.t))}); break; }
    }
  }
  // line length: capacity (content width / avg char width) and actual text length
  if (/^(P|LI|DD|BLOCKQUOTE|TD|FIGCAPTION|DIV|SPAN|ARTICLE|SECTION)$/.test(el.tagName) && c.display !== 'inline') {
    const full = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (full.length > 80) {
      cx.font = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
      const chW = cx.measureText('0').width;  // the CSS ch unit, so a max-width:65ch fix measures as 65
      const inner = r.width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
      const cap = chW > 0 ? Math.round(inner / chW) : 0;
      if (cap > 80) R.lines.push({sel: sel(el), box: box(r), chars: cap, width: Math.round(inner), size: fs});
    }
  }
}
// contrast: hit-test the painted stack under each text (scrolling band by band), sample gradients at the text
{ const vh = window.innerHeight; cq.sort((a, b) => a.rects[0].t - b.rects[0].t);
  for (const q of cq) {
    const t0 = q.rects[0]; const px = (t0.l + t0.r) / 2, py = (t0.t + t0.b) / 2;
    if (fixedChain(q.el)) { if (window.scrollY !== 0) window.scrollTo(0, 0); }
    else if (py < window.scrollY + 4 || py > window.scrollY + vh - 4) window.scrollTo(0, Math.max(0, py - vh / 2));
    const vx = px - window.scrollX, vy = py - window.scrollY; let list = null;
    if (vx >= 0 && vx < window.innerWidth && vy >= 0 && vy < vh) { const st = document.elementsFromPoint(vx, vy);
      let idx = -1; for (let e = q.el; e && idx < 0; e = e.parentElement) idx = st.indexOf(e);
      if (idx >= 0) list = st.slice(idx); }
    if (!list) list = ancestors(q.el);
    const pts = []; for (const t of q.rects.slice(0, 4)) { const my = (t.t + t.b) / 2; pts.push([t.l + 1, my], [(t.l + t.r) / 2, my], [t.r - 1, my]); }
    const bgs = backgrounds(q.el, list, pts);
    if (bgs === null) { R.contrastUnknown++; continue; }
    const fa = [q.fg[0], q.fg[1], q.fg[2], q.fg[3] * opacity(q.el)];
    let worst = 99, worstBg = null;
    for (const b of bgs) { const f = blend(fa, b); const v = ratio(f, b); if (v < worst) { worst = v; worstBg = b; } }
    const large = q.fs >= 24 || (q.fs >= 18.66 && q.fw >= 700); const need = large ? 3 : 4.5;
    if (worst < need - 0.005) R.contrast.push({sel: sel(q.el), box: box(q.r), ratio: Math.round(worst * 100) / 100, need: need,
      fg: hex(blend(fa, worstBg)), fgRaw: hex(q.fg), bg: hex(worstBg), gradient: bgs.length > 1, size: q.fs, text: q.dt.slice(0, 40)});
  }
  window.scrollTo(0, 0); }
// overlap: per-line text rects of different, non-nested elements
texts.sort((a, b) => a.rects[0].t - b.rects[0].t);
const seenPair = new Set();
for (let i = 0; i < texts.length && R.overlap.length < 40; i++) {
  const A = texts[i]; const aBottom = Math.max.apply(null, A.rects.map(x => x.b));
  for (let j = i + 1; j < texts.length; j++) {
    const B = texts[j]; if (B.rects[0].t > aBottom) break;
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    let hit = null;
    for (const a of A.rects) { for (const b of B.rects) {
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 3 && h > 3 && w > 0.2 * Math.min(a.r - a.l, b.r - b.l) && h > 0.4 * Math.min(a.b - a.t, b.b - b.t)) { hit = [a, b, w, h]; break; } }
      if (hit) break; }
    if (hit) { const sa = sel(A.el), sb = sel(B.el); const key = sa + '|' + sb; if (seenPair.has(key)) continue; seenPair.add(key);
      const [a, b] = hit; const l = Math.min(a.l, b.l), t = Math.min(a.t, b.t);
      R.overlap.push({sel: sa, other: sb, box: [Math.round(l), Math.round(t), Math.round(Math.max(a.r, b.r) - l), Math.round(Math.max(a.b, b.b) - t)],
        area: Math.round(hit[2] * hit[3])}); }
  }
}
// headings + orphan detection (document order)
const events = [];
for (const el of all) {
  const m = String(el.tagName).match(/^H([1-6])$/); const roleLevel = el.getAttribute('role') === 'heading' ? parseInt(el.getAttribute('aria-level') || '2', 10) : 0;
  if (m || roleLevel) { if (!visible(el)) continue; const r = el.getBoundingClientRect();
    const txt = (el.innerText || '').replace(/\s+/g, ' ').trim() || Array.from(el.querySelectorAll('img[alt]')).map(i => i.alt).join(' ').trim();
    events.push({h: m ? +m[1] : roleLevel, sel: sel(el), box: box(r), text: txt.slice(0, 50), parent: (el.parentElement && (el.parentElement.tagName === 'HGROUP' || Array.from(el.parentElement.children).every(k => /^H[1-6]$/.test(k.tagName)))) ? el.parentElement : null}); continue; }
  if (el.closest('h1,h2,h3,h4,h5,h6,[role=heading]')) continue;
  if (/^(IMG|VIDEO|TABLE|FORM|IFRAME|CANVAS|INPUT|BUTTON|SELECT|TEXTAREA)$/.test(el.tagName) || (el.tagName === 'svg' && el.getBoundingClientRect().width > 24)) { if (visible(el)) events.push({c: 1}); continue; }
  if (directText(el) && visible(el)) events.push({c: 1});
}
for (let i = 0; i < events.length; i++) { const ev = events[i]; if (!ev.h) continue;
  let orphan = true; for (let j = i + 1; j < events.length; j++) { const n = events[j]; if (n.c) { orphan = false; break; } if (n.h <= ev.h && !(ev.parent && n.parent === ev.parent)) break; }  // headings-only wrapper = one heading group
  R.headings.push({level: ev.h, sel: ev.sel, box: ev.box, text: ev.text, orphan: orphan}); }
// layout shift sources
const shiftMap = new Map(); for (const s of (window.__paShift || [])) { if (!s.node.isConnected) continue; const k = sel(s.node);
  shiftMap.set(k, (shiftMap.get(k) || 0) + s.value); if (!shiftMap.has(k + '#box')) shiftMap.set(k + '#box', box(s.node.getBoundingClientRect())); }
for (const [k, v] of shiftMap) if (!k.endsWith('#box')) R.shifts.push({sel: k, value: Math.round(v * 1000) / 1000, box: shiftMap.get(k + '#box')});
R.overflow.sort((a, b) => b.over - a.over); R.overflow = R.overflow.slice(0, 12);
return R;
}
"""

ANNOTATE_JS = r"""
(marks) => {
  const old = document.getElementById('__pa_layer'); if (old) old.remove();
  const layer = document.createElement('div'); layer.id = '__pa_layer';
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none';
  for (const m of marks) {
    const b = document.createElement('div'); const [x, y, w, h] = m.box;
    b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${Math.max(w, 6)}px;height:${Math.max(h, 6)}px;` +
      `outline:3px solid ${m.color};outline-offset:1px;background:${m.color}14;box-sizing:border-box`;
    const t = document.createElement('div'); t.textContent = m.label;
    t.style.cssText = `position:absolute;left:-3px;top:-24px;background:${m.color};color:#fff;font:700 14px/20px system-ui,Arial,sans-serif;` +
      'padding:0 6px;border-radius:4px;white-space:nowrap';
    if (y < 24) t.style.top = '2px';
    b.appendChild(t); layer.appendChild(b);
  }
  document.body.appendChild(layer);
}
"""


def load_playwright():
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
        return sync_playwright
    except Exception:  # ImportError or a broken install
        return None


def launch(pw):
    errors = []
    for kwargs in ({}, {"channel": "chrome"}, {"channel": "msedge"}):
        try:
            return pw.chromium.launch(**kwargs)
        except Exception as exc:  # browser binary missing for this channel
            errors.append(str(exc).splitlines()[0][:120])
    raise RuntimeError("no Chromium found (" + "; ".join(errors) + "). Run: " + INSTALL_HINT)


def to_url(target):
    if re.match(r"^(https?|file):", target, re.I):
        return target, "url" if not target.lower().startswith("file:") else "file"
    path = Path(target).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(target)
    return path.as_uri(), "file"


def measure_browser(target, viewports, timeout, offline, shots_dir, max_elements=8000):
    """Render target at each viewport; returns (per-viewport measurements, live pages for annotation)."""
    sync_playwright = load_playwright()
    url, _kind = to_url(target)
    results = {}
    pw = sync_playwright().start()
    browser = launch(pw)
    pages = {}
    try:
        for width in viewports:
            mobile = width < 1024
            ctx = browser.new_context(viewport={"width": width, "height": 900 if width >= 1024 else 800},
                                      is_mobile=mobile, has_touch=mobile, device_scale_factor=1, service_workers="block")
            if _kind == "file":
                base = Path(urllib.request.url2pathname(urllib.parse.urlsplit(url).path)).resolve().parent
                if not hasattr(ctx, "route_web_socket"):
                    raise RuntimeError("Browser audit requires WebSocket routing support")
                ctx.route_web_socket("**/*", lambda socket: socket.close())
                def local_request(route):
                    parts = urllib.parse.urlsplit(route.request.url)
                    allowed = parts.scheme in ("data", "blob")
                    if parts.scheme == "file":
                        candidate = Path(urllib.request.url2pathname(parts.path)).resolve()
                        allowed = candidate == base or base in candidate.parents
                    route.continue_() if allowed else route.abort()
                ctx.route("**/*", local_request)
            elif offline:
                raise RuntimeError("--offline requires a local HTML file")
            else:
                guard_browser_context(ctx, url)
            ctx.add_init_script(INIT_JS)
            page = ctx.new_page()
            page.goto(url, wait_until="load", timeout=int(timeout * 1000))
            try:
                page.wait_for_load_state("networkidle", timeout=min(5000, int(timeout * 1000)))
            except Exception:  # long-polling pages never go idle: measure anyway
                pass
            page.wait_for_timeout(600)
            data = page.evaluate(MEASURE_JS, {"maxElements": max_elements, "taps": mobile})
            data["viewport"] = width
            results[width] = data
            pages[width] = page
        return results, pages, (pw, browser)
    except Exception:
        browser.close()
        pw.stop()
        raise


def annotate(pages, findings, shots_dir, slug):
    out = {}
    shots_dir.mkdir(parents=True, exist_ok=True)
    for width, page in pages.items():
        marks = []
        for f in findings:
            color = {"HIGH": "#dc2626", "MED": "#ea580c", "LOW": "#ca8a04"}[f["severity"]]
            for bx in f.get("boxes", {}).get(width, [])[:4]:
                marks.append({"box": bx, "label": "#%d" % f["rank"], "color": color})
        page.evaluate(ANNOTATE_JS, marks)
        dims = page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
        path = shots_dir / ("%s-%d.png" % (slug, width))
        clip = {"x": 0, "y": 0, "width": max(width, dims[0]), "height": min(dims[1], 5000)}
        page.screenshot(path=str(path), clip=clip)
        out[width] = str(path)
    return out


# ------------------------------------------------------------------------------------- static fallback


class _Parser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta_viewport = False
        self.images = []
        self.headings = []
        self.styles = []
        self.inline_styles = []
        self.links = []
        self._in_style = False
        self._heading = None
        self._content_after = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and (a.get("name") or "").lower() == "viewport":
            self.meta_viewport = True
        elif tag == "img":
            src = a.get("src") or ""
            label = ("img.%s" % a["class"].split()[0]) if a.get("class") else (
                "img (inline data #%d)" % (len(self.images) + 1) if src.startswith("data:") else "img[src$='%s']" % src.rsplit("/", 1)[-1][:40])
            self.images.append({"sel": label, "alt": "alt" in a or a.get("role") == "presentation"
                                or a.get("aria-hidden") == "true", "dims": "width" in a and "height" in a})
            self._content()
        elif tag == "style":
            self._in_style = True
        elif tag == "link" and "stylesheet" in (a.get("rel") or "").lower() and a.get("href"):
            self.links.append(a["href"])
        elif re.fullmatch(r"h[1-6]", tag):
            sel = tag + ("#" + a["id"] if a.get("id") else ("." + a["class"].split()[0] if a.get("class") else ""))
            self._heading = {"level": int(tag[1]), "sel": sel, "text": "", "orphan": True, "box": None}
            self.headings.append(self._heading)
        elif tag in ("video", "table", "form", "iframe", "canvas", "input", "button", "select", "textarea"):
            self._content()
        if a.get("style"):
            self.inline_styles.append((tag, a["style"]))

    def handle_endtag(self, tag):
        if tag == "style":
            self._in_style = False
        elif re.fullmatch(r"h[1-6]", tag):
            self._heading = None

    def handle_data(self, data):
        if self._in_style:
            self.styles.append(data)
        elif data.strip():
            if self._heading is not None:
                self._heading["text"] += data.strip()[:50]
            else:
                self._content()

    def _content(self):
        if self._heading is None:
            self.headings.append({"c": 1})


def _resolve_orphans(seq):
    heads = []
    for i, ev in enumerate(seq):
        if "c" in ev:
            continue
        orphan = True
        for nxt in seq[i + 1:]:
            if "c" in nxt:
                orphan = False
                break
            if nxt["level"] <= ev["level"]:
                break
        ev["orphan"] = orphan
        heads.append(ev)
    return heads


CSS_RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")


def css_rules(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for m in CSS_RULE.finditer(css):
        sel = " ".join(m.group(1).split())
        if sel.startswith("@"):
            continue
        decls = {}
        for d in m.group(2).split(";"):
            k, sep, v = d.partition(":")
            if sep:
                decls[k.strip().lower()] = v.strip().replace("!important", "").strip()
        yield sel, decls


def to_px(value, base=16.0):
    m = re.fullmatch(r"(-?[\d.]+)(px|rem|em)?", value.strip())
    if not m:
        return None
    n = float(m.group(1))
    return n * base if m.group(2) in ("rem", "em") else n if (m.group(2) == "px" or n == 0) else None


def _static_background(sel, decls, bg_by_sel, page_bg):
    """Background behind a rule's text: its own, an ancestor compound's (".hero p" -> ".hero"), else the page's."""
    own = decls.get("background-color") or decls.get("background")
    if own:
        return own, False
    for one in sel.split(","):
        parts = re.split(r"\s*>\s*|\s+", one.strip())
        for i in range(len(parts) - 1, 0, -1):
            hit = bg_by_sel.get(" ".join(parts[:i])) or bg_by_sel.get(parts[i - 1])
            if hit:
                return hit, False
    return page_bg, True


def measure_static(target, timeout, offline):
    """No-browser analysis: what can be known from HTML + CSS text alone."""
    url, kind = to_url(target)
    if kind == "file":
        path = Path(urllib.request.url2pathname(urllib.parse.urlparse(url).path))
        source = path.read_text(encoding="utf-8", errors="replace")
        base_dir = path.parent
    else:
        if offline:
            raise RuntimeError("--offline: refusing to fetch " + url)
        req = urllib.request.Request(url, headers={"User-Agent": "site-polish-audit/" + VERSION})
        resp, _ = Fetcher(timeout).get(url, 3_000_000)
        if resp.status != 200 or resp.error: raise RuntimeError("Cannot fetch scoped HTML")
        url = resp.url
        source = resp.body.decode("utf-8", errors="replace")
        base_dir = None
    parser = _Parser()
    parser.feed(source)
    css = "\n".join(parser.styles)
    for href in parser.links[:8]:
        try:
            if base_dir is not None and not re.match(r"^[a-z]+:", href, re.I):
                p = (base_dir / href.split("?")[0]).resolve()
                if base_dir not in p.parents:
                    continue
                if p.is_file() and p.stat().st_size <= 2_000_000:
                    css += "\n" + p.read_text(encoding="utf-8", errors="replace")
            elif base_dir is None and not offline:
                full = urllib.parse.urljoin(url, href)
                if origin(full) != origin(url):
                    continue
                resp, _ = Fetcher(timeout).get(full, 2_000_000, start=url)
                if resp.status == 200 and not resp.error:
                    css += "\n" + resp.body.decode("utf-8", errors="replace")
        except Exception:  # unreachable stylesheet: audit what we have
            continue
    rules = list(css_rules(css)) + [("[style] " + tag, dict(
        (k.strip().lower(), v.strip()) for k, s, v in (d.partition(":") for d in st.split(";")) if s))
        for tag, st in parser.inline_styles]
    R = {"viewport": 0, "static": True, "hasViewportMeta": parser.meta_viewport, "images": [], "headings": [],
         "fonts": {}, "sizes": {}, "colors": {}, "spacing": {}, "contrast": [], "fixedWidth": [], "tiny": []}
    bg_by_sel, page_bg = {}, "#ffffff"
    for sel, d in rules:
        b = d.get("background-color") or d.get("background")
        if b:
            for one in sel.split(","):
                bg_by_sel[one.strip()] = b
            if any(x.strip() in ("body", "html", ":root") for x in sel.split(",")) and COLOR_TOKEN.search(b) and "gradient" not in b:
                page_bg = b
    for im in parser.images:
        R["images"].append({"sel": im["sel"], "box": None, "alt": im["alt"], "dims": im["dims"], "distorted": 0, "upscale": 0})
    R["headings"] = _resolve_orphans(parser.headings)
    for sel, d in rules:
        fam = d.get("font-family")
        if fam:
            first = fam.split(",")[0].strip().strip("'\"").lower()
            if first not in ("inherit", "initial", "unset"):
                R["fonts"][first] = R["fonts"].get(first, 0) + 1
        fs = d.get("font-size")
        if fs:
            px = to_px(fs)
            if px:
                key = str(round(px * 2) / 2).rstrip("0").rstrip(".")
                R["sizes"][key] = R["sizes"].get(key, 0) + 1
                if px < 12:
                    R["tiny"].append({"sel": sel, "box": None, "size": px})
        for prop, val in d.items():
            for tok in COLOR_TOKEN.findall(val) if ("color" in prop or prop.startswith(("background", "border", "fill", "stroke", "outline", "box-shadow"))) else []:
                rgb = parse_css_color(tok)
                if rgb and rgb[3] > 0.02:
                    hx = to_hex(blend(rgb, [255, 255, 255]))
                    R["colors"].setdefault(hx, {"n": 0, "kinds": {}})["n"] += 1
            if prop.startswith(("margin", "padding")) or prop in ("gap", "row-gap", "column-gap"):
                for part in val.split():
                    px = to_px(part)
                    if px and px > 0:
                        key = str(round(px * 2) / 2).rstrip("0").rstrip(".")
                        sp = R["spacing"].setdefault(key, {"n": 0, "ex": []})
                        sp["n"] += 1
                        if len(sp["ex"]) < 2:
                            sp["ex"].append(sel + " " + prop)
        fg = d.get("color")
        f = parse_css_color(fg) if fg else None
        if f:
            bg_text, assumed = _static_background(sel, d, bg_by_sel, page_bg)
            b = None
            if bg_text is not None and "gradient" not in bg_text and "url(" not in bg_text:
                toks = COLOR_TOKEN.findall(bg_text)
                b = parse_css_color(toks[0]) if toks else None
            if b and b[3] >= 0.99:
                fb = blend(f, b)
                ratio = contrast_ratio(fb, b)
                # with an assumed background only flag clear failures (< 3:1) to keep false positives down
                if ratio < (3.0 if assumed else 4.5) - 0.005:
                    R["contrast"].append({"sel": sel, "box": None, "ratio": round(ratio, 2), "need": 4.5, "fg": to_hex(fb),
                                          "fgRaw": to_hex(f), "bg": to_hex(b), "gradient": False, "size": 16, "text": "",
                                          "assumed": assumed})
        w = d.get("width") or d.get("min-width")
        px = to_px(w) if w else None
        cols = d.get("grid-template-columns", "")
        rep = re.match(r"repeat\(\s*(\d+)\s*,\s*([\d.]+)px\s*\)", cols)
        if rep:
            px = int(rep.group(1)) * float(rep.group(2))
        elif cols and re.fullmatch(r"(?:\s*[\d.]+px)+\s*", cols):
            px = sum(float(x) for x in re.findall(r"[\d.]+", cols))
        if px and px > 400 and "max-width" not in d:
            R["fixedWidth"].append({"sel": sel, "width": px})
    return R


# --------------------------------------------------------------------------------------------- findings


def _finding(check, severity, sel, detail, fix, weight, boxes=None, vps=None, count=1):
    return {"check": check, "severity": severity, "selector": sel, "detail": detail, "fix": fix, "weight": weight,
            "boxes": boxes or {}, "viewports": sorted(vps or []), "count": count}


def _merge(groups, key, check, severity, sel, detail, fix, weight, width, bx, worse=None):
    """Group the same problem on the same selector across viewports."""
    g = groups.get(key)
    if g is None:
        g = groups[key] = _finding(check, severity, sel, detail, fix, weight, {}, [], 0)
    elif worse is not None and worse:
        g.update(severity=severity, detail=detail, fix=fix, weight=max(weight, g["weight"]))
    if width not in g["viewports"]:
        g["viewports"].append(width)
        g["viewports"].sort()
    if bx:
        g["boxes"].setdefault(width, []).append(bx)
    g["count"] = max(g["count"], len(g["boxes"].get(width, [])) or 1)
    return g


def build_findings(measures):
    """measures: {viewport: data}. Returns ranked findings (dicts)."""
    findings = []
    vps = sorted(measures)
    widest = measures[vps[-1]]
    narrow = [w for w in vps if w < 1024] or vps[:1]
    static = any(m.get("static") for m in measures.values())

    # viewport meta: static source or a phone viewport that lays out wider than the device
    no_meta = not widest.get("hasViewportMeta", True)
    if no_meta:
        zoom = [w for w in narrow if measures[w].get("innerWidth", w) > w + 1]
        findings.append(_finding("viewport-meta", "HIGH", "head", "no <meta name=viewport>: phones render the page at %s px "
                                 "and shrink it" % (measures[zoom[0]]["innerWidth"] if zoom else 980),
                                 '<meta name="viewport" content="width=device-width, initial-scale=1">', 10))

    # overflow: one finding per culprit selector, listing every viewport where the page scrolls sideways
    over = {}
    for w in vps:
        m = measures[w]
        if m.get("static") or m.get("docWidth", 0) <= m.get("vw", w) + 1:
            continue
        culprits = m.get("overflow") or [{"sel": "html", "box": None, "over": m["docWidth"] - m["vw"], "width": m["docWidth"]}]
        top = culprits[0]["sel"]
        f = over.get(top)
        if f is None:
            f = over[top] = _finding("overflow", "HIGH", top, "", "max-width:100%; min-width:0 on flex items; flex-wrap:wrap; or "
                                     "grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))", 0, {}, [], 0)
            f["_parts"], f["_others"] = [], []
        f["viewports"].append(w)
        f["weight"] += 12
        f["count"] = max(f["count"], sum(1 for c in culprits if c["sel"] == top))
        f["boxes"][w] = [c["box"] for c in culprits[:4] if c["box"]]
        f["_parts"].append("%d px wide at %d (+%d)" % (m["docWidth"], w, m["docWidth"] - m["vw"]))
        f["_others"] += [c["sel"] for c in culprits if c["sel"] != top and c["sel"] not in f["_others"]]
    for f in over.values():
        f["detail"] = "page scrolls sideways: " + ", ".join(f.pop("_parts"))
        others = f.pop("_others")
        if others:
            f["detail"] += "; also " + ", ".join(others[:2])
        findings.append(f)

    groups = {}
    for w in vps:
        m = measures[w]
        for o in m.get("overlap", []):
            _merge(groups, ("overlap", o["sel"], o["other"]), "overlap", "HIGH", o["sel"],
                   "text overlaps %s (%d px2)" % (o["other"], o["area"]),
                   "remove the negative margin / absolute offset, or reserve space (padding, gap); check line-height >= 1.1", 5, w, o["box"])
        for c in m.get("clipped", []):
            _merge(groups, ("clipped", c["sel"]), "clipped", "HIGH", c["sel"],
                   "text cut off by %s (%d px hidden): \"%s\"" % (c["container"], c["lost"], c["text"]),
                   "let it grow: replace height with min-height, drop overflow:hidden, or wrap (overflow-wrap:anywhere)", 4, w, c["box"])
        for c in m.get("contrast", []):
            sev = "HIGH" if c["ratio"] < 3 else "MED"
            key = ("contrast", c["fgRaw"], "gradient" if c["gradient"] else c["bg"], c["need"])
            prev = groups.get(key)
            worse = prev is not None and c["ratio"] < prev["_ratio"]
            fix_color = suggest_color(parse_css_color(c["fgRaw"]), parse_css_color(c["bg"]), c["need"])
            g = _merge(groups, key, "contrast", sev, c["sel"],
                       "contrast %.2f:1 (needs %.1f) %s on %s%s" % (c["ratio"], c["need"], c["fg"], c["bg"], " (gradient, at the text)"
                                                                   if c["gradient"] else (" (page background assumed)" if c.get("assumed") else "")),
                       "color: %s -> %s%s" % (c["fgRaw"], fix_color, " (or darken the background)" if c["gradient"] else ""),
                       4 if sev == "HIGH" else 3, w, c["box"], worse)
            g["_ratio"] = min(g.get("_ratio", 99), c["ratio"])
            g.setdefault("_sels", [])
            if c["sel"] not in g["_sels"]:
                g["_sels"].append(c["sel"])
        for t in m.get("taps", []):
            small = min(t["w"], t["h"])
            sev = "MED" if small < 24 else "LOW"
            _merge(groups, ("tap", t["sel"]), "tap-target", sev, t["sel"], "tap target %dx%d px at %d px (min 44x44)" % (t["w"], t["h"], w),
                   "min-height:44px; min-width:44px; padding:12px 16px (or display:inline-flex;align-items:center)",
                   3 if sev == "MED" else 1.5, w, t["box"])
        for ln in m.get("lines", []):
            if w != vps[-1]:
                continue
            _merge(groups, ("line", ln["sel"]), "line-length", "LOW", ln["sel"], "text column %dch wide at %d px (over 80ch is hard to read; keep 45-75ch)" % (ln["chars"], w),
                   "max-width:65ch (and margin-inline:auto)", 2, w, ln["box"])
        for t in m.get("tiny", []):
            g = _merge(groups, ("tiny",), "type-scale", "LOW", t["sel"], "", "font-size: at least 0.75rem (12px); body copy 1rem", 0, w, t["box"])
            g.setdefault("_sels", [])
            g["_min"] = min(g.get("_min", 99), t["size"])
            if t["sel"] not in g["_sels"]:
                g["_sels"].append(t["sel"])
    tiny = groups.get(("tiny",))
    if tiny:
        tiny["detail"] = "text under 12 px (smallest %.1f px) in %d places" % (tiny["_min"], len(tiny["_sels"]))
        tiny["weight"] = min(4, len(tiny["_sels"]))
    for g in groups.values():
        sels = g.pop("_sels", None)
        g.pop("_ratio", None)
        g.pop("_min", None)
        if sels:
            g["count"] = max(g["count"], len(sels))
            if g["check"] == "contrast" and len(sels) > 1:
                g["detail"] += "; %d selectors: %s" % (len(sels), ", ".join(x[:40] for x in sels[:3]))
            elif g["check"] == "type-scale":
                g["detail"] += ": " + ", ".join(x[:40] for x in sels[:3])
    findings.extend(groups.values())

    # layout shift
    cls = max([m.get("cls", 0) for m in measures.values()] + [0])
    if cls > 0.1:
        src = max((s for m in measures.values() for s in m.get("shifts", [])), key=lambda s: s["value"], default=None)
        boxes = {}
        for w, m in measures.items():
            boxes[w] = [s["box"] for s in sorted(m.get("shifts", []), key=lambda s: -s["value"])[:1] if s.get("box")]
        findings.append(_finding("layout-shift", "HIGH" if cls > 0.25 else "MED", src["sel"] if src else "page",
                                 "cumulative layout shift %.3f (good <= 0.1)" % cls,
                                 "give images/embeds width+height or aspect-ratio; reserve space for late content; font-display:optional",
                                 10 if cls > 0.25 else 5, boxes, vps))

    # images (DOM at widest viewport, or static parse)
    img_groups = {}
    for im in widest.get("images", []):
        bx = {vps[-1]: [im["box"]]} if im.get("box") else {}
        if not im["alt"]:
            g = img_groups.setdefault("alt", [])
            g.append((im, bx))
        if not im["dims"]:
            img_groups.setdefault("dims", []).append((im, bx))
        if im.get("distorted", 0) > 0.04:
            findings.append(_finding("images", "MED", im["sel"], "image stretched %d%% out of its aspect ratio" % round(im["distorted"] * 100),
                                     "object-fit:cover (or set height:auto)", 2, bx, vps[-1:]))
        if im.get("upscale", 0) > 1.6:
            findings.append(_finding("images", "LOW", im["sel"], "image shown at %.1fx its pixel size (blurry)" % im["upscale"],
                                     "serve a larger source or srcset with 2x", 1, bx, vps[-1:]))
    for kind, items in img_groups.items():
        sels = sorted({i[0]["sel"] for i in items})
        boxes = {}
        for _, bx in items:
            for w, b in bx.items():
                boxes.setdefault(w, []).extend(b)
        if kind == "alt":
            findings.append(_finding("images", "MED", sels[0], "%d image(s) without alt: %s" % (len(items), ", ".join(sels[:3])),
                                     'alt="what it shows" (alt="" if decorative)', 2 * len(items), boxes, vps[-1:], len(items)))
        else:
            findings.append(_finding("images", "MED", sels[0], "%d image(s) without width/height (layout jumps as they load): %s"
                                     % (len(items), ", ".join(sels[:3])), "width/height attributes or aspect-ratio in CSS",
                                     2 * len(items), boxes, vps[-1:], len(items)))

    # headings
    heads = widest.get("headings", [])
    levels = [h["level"] for h in heads]
    if heads and 1 not in levels:
        findings.append(_finding("headings", "LOW", heads[0]["sel"], "no <h1> on the page", "make the main title an <h1>", 2))
    if levels.count(1) > 1:
        extra = [h for h in heads if h["level"] == 1][1:]
        findings.append(_finding("headings", "LOW", extra[0]["sel"], "%d <h1> elements" % levels.count(1), "keep one <h1>; demote the rest to <h2>", 1,
                                 {vps[-1]: [h["box"] for h in extra if h.get("box")]}, vps[-1:]))
    prev = 0
    for h in heads:
        bx = {vps[-1]: [h["box"]]} if h.get("box") else {}
        if prev and h["level"] > prev + 1:
            findings.append(_finding("headings", "LOW", h["sel"], "heading jumps h%d -> h%d (\"%s\")" % (prev, h["level"], h["text"][:30]),
                                     "use <h%d> (style it with a class, not the level)" % (prev + 1), 2, bx, vps[-1:]))
        if not h["text"].strip():
            findings.append(_finding("headings", "LOW", h["sel"], "empty heading", "remove it or give it text", 2, bx, vps[-1:]))
        elif h.get("orphan"):
            findings.append(_finding("headings", "LOW", h["sel"], "orphaned heading \"%s\": no content follows it" % h["text"][:30],
                                     "add the section content or remove the heading", 2, bx, vps[-1:]))
        prev = h["level"]

    # type sprawl (widest viewport)
    fonts = {k: v for k, v in widest.get("fonts", {}).items() if k}
    if len(fonts) > 3:
        ranked = sorted(fonts.items(), key=lambda kv: -kv[1])
        findings.append(_finding("type-scale", "LOW", "body", "%d font families: %s" % (len(fonts), ", ".join("%s (%d)" % kv for kv in ranked[:6])),
                                 "keep 2: %s for text, %s for headings; map the rest to them" % (ranked[0][0], ranked[1][0]),
                                 2 * (len(fonts) - 3)))
    sizes = widest.get("sizes", {})
    if len(sizes) > 8:
        ranked = sorted(sizes.items(), key=lambda kv: -kv[1])
        common = float(ranked[0][0])
        base = min((14, 16, 18), key=lambda b: abs(b - common))
        scale = {14: (12, 14, 16, 18, 22, 28, 36, 44), 16: (12, 14, 16, 20, 24, 32, 40, 48),
                 18: (14, 16, 18, 22, 28, 36, 44, 56)}[base]
        rare = [k for k, v in sorted(sizes.items(), key=lambda kv: float(kv[0])) if v <= 2]
        findings.append(_finding("type-scale", "LOW", "body", "%d font sizes in use (aim <= 8); used once or twice: %s"
                                 % (len(sizes), ", ".join(r + "px" for r in rare[:8]) or "-"),
                                 "snap to one scale: " + "/".join(str(s) for s in scale) + " px", len(sizes) - 8))

    # palette
    colors = {k: v["n"] for k, v in widest.get("colors", {}).items()}
    clusters, pairs = palette_clusters(colors)
    over = max(0, len(clusters) - 14)
    if over or pairs:
        msg = "%d distinct colours (%d after merging near-duplicates; aim <= 14)" % (len(colors), len(clusters))
        fix = "define tokens (--bg, --text, --muted, --accent, --border ...)"
        if pairs:
            msg += "; near-duplicates: " + ", ".join("%s~%s" % (a, b) for a, b, _ in pairs[:4])
            fix = "merge " + ", ".join("%s into %s" % (a, b) for a, b, _ in pairs[:3]) + "; " + fix
        findings.append(_finding("palette", "LOW", "page", msg, fix, 0.5 * over + min(len(pairs), 6)))

    # spacing rhythm
    spacing = widest.get("spacing", {})
    total = sum(v["n"] for v in spacing.values())
    off = {k: v for k, v in spacing.items() if float(k) >= 4 and 0.5 < float(k) % 4 < 3.5}
    off_n = sum(v["n"] for v in off.values())
    pct = 100.0 * off_n / total if total else 0.0
    if total >= 10 and pct > 15:
        ranked = sorted(off.items(), key=lambda kv: -kv[1]["n"])
        ex = "; ".join("%spx x%d (%s) -> %dpx" % (k, v["n"], v["ex"][0] if v["ex"] else "?", int(round(float(k) / 4) * 4))
                       for k, v in ranked[:3])
        findings.append(_finding("spacing", "LOW", ranked[0][1]["ex"][0].rsplit(" ", 1)[0] if ranked[0][1]["ex"] else "page",
                                 "%.0f%% of margins/paddings/gaps are off the 4 px grid (%d distinct values): %s" % (pct, len(spacing), ex),
                                 "use a spacing scale: 4/8/12/16/24/32/48/64 px (CSS variables)", (pct - 15) / 5.0))

    # static-only: fixed widths that will overflow a phone
    for fw in widest.get("fixedWidth", [])[:6]:
        findings.append(_finding("fixed-width", "MED", fw["sel"], "fixed width %dpx with no max-width: overflows a 375 px phone" % fw["width"],
                                 "max-width:100%% (or width:min(100%%, %dpx))" % fw["width"], 4))
    if static:
        for f in findings:
            f["boxes"] = {}
            f["viewports"] = []

    findings.sort(key=lambda f: (SEVERITY_ORDER[f["severity"]], -f["weight"] * max(1, len(f["viewports"]) ** 0.5), f["selector"]))
    for i, f in enumerate(findings, 1):
        f["rank"] = i
    return findings


def score(findings, static=False):
    """Score = 100 - sum over checks of min(cap, sum of finding weights). Static mode skips layout-only checks."""
    per = {}
    for f in findings:
        per[f["check"]] = per.get(f["check"], 0.0) + f["weight"]
    breakdown = {}
    for check, total in per.items():
        cap = CHECKS[check][1]
        breakdown[check] = round(min(cap, total), 1)
    value = max(0, int(round(100 - sum(breakdown.values()))))
    return value, breakdown


# ------------------------------------------------------------------------------------------------ CLI


def slug_for(target):
    u = urllib.parse.urlparse(target)
    name = (u.netloc + "-" + Path(u.path).stem) if u.scheme in ("http", "https") else Path(u.path or target).stem
    base = re.sub(r"[^a-zA-Z0-9]+", "-", name or "page").strip("-")[:30] or "page"
    return "%s-%s" % (base, hashlib.sha1(target.encode("utf-8")).hexdigest()[:6])


def run(args):
    t0 = time.time()
    viewports = sorted({int(v) for v in args.viewports.split(",") if v.strip()})
    if not viewports or any(v < 200 or v > 4000 for v in viewports):
        raise ValueError("--viewports must be widths between 200 and 4000")
    engine = "static"
    shots = {}
    note = ""
    if args.browser_check and not args.static and load_playwright() is not None:
        try:
            measures, pages, (pw, browser) = measure_browser(args.target, viewports, args.timeout, args.offline, None)
            engine = "playwright"
        except FileNotFoundError:
            raise
        except Exception as exc:
            if "no Chromium found" not in str(exc):
                raise
            note = str(exc)
            measures = None
    else:
        measures = None
        if not args.static:
            note = "Active browser rendering not enabled or unavailable: layout checks skipped."
    if engine == "playwright":
        try:
            findings = build_findings(measures)
            if not args.no_shots:
                shots_dir = Path(args.shots) if args.shots else Path(tempfile.gettempdir()) / "polish-audit"
                shots = annotate(pages, findings, shots_dir, slug_for(args.target))
        finally:
            browser.close()
            pw.stop()
    else:
        data = measure_static(args.target, args.timeout, args.offline)
        measures = {viewports[-1]: data}
        findings = build_findings(measures)
    value, breakdown = score(findings, engine == "static")
    highs = sum(1 for f in findings if f["severity"] == "HIGH")
    passed = engine == "playwright" and value >= args.fail_under and highs == 0
    m0 = measures[max(measures)]
    report = {
        "tool": "site-polish-audit", "version": VERSION, "target": args.target, "engine": engine,
        "viewports": viewports if engine == "playwright" else [], "seconds": round(time.time() - t0, 2),
        "score": value, "gate": args.fail_under, "pass": passed, "breakdown": breakdown,
        "counts": {"findings": len(findings), "high": highs, "text_elements": m0.get("textCount"),
                   "contrast_unknown_over_images": sum(m.get("contrastUnknown", 0) for m in measures.values())},
        "findings": [{k: v for k, v in f.items() if k != "boxes"} for f in findings],
        "screenshots": {str(k): v for k, v in shots.items()}, "note": note,
        "skipped": sorted(LAYOUT_ONLY) if engine == "static" else [],
    }
    return sanitize_report(report)


def human(report, top):
    lines = []
    eng = report["engine"]
    vps = ",".join(str(v) for v in report["viewports"]) or "-"
    lines.append("site-polish-audit %s  [%s @ %s px, %.1f s]" % (report["target"], eng, vps, report["seconds"]))
    if report["note"]:
        lines.append("NOTE " + report["note"])
    verdict = "PASS" if report["pass"] else "FAIL"
    lines.append("%s  score %d/100 (gate %d, HIGH findings %d)%s" % (verdict, report["score"], report["gate"], report["counts"]["high"],
                                                                    "  [static: partial score]" if eng == "static" else ""))
    if report["breakdown"]:
        lines.append("  " + "  ".join("%s -%g" % kv for kv in sorted(report["breakdown"].items(), key=lambda kv: -kv[1])))
    shown = report["findings"][:top]
    for f in shown:
        where = ("@" + ",".join(str(v) for v in f["viewports"])) if f["viewports"] else ""
        cnt = " x%d" % f["count"] if f["count"] > 1 else ""
        lines.append("%2d %-4s %-12s %s %s%s" % (f["rank"], f["severity"], f["check"], f["selector"][:48], where, cnt))
        lines.append("   %s" % f["detail"][:150])
        lines.append("   fix: %s" % f["fix"][:150])
    if len(report["findings"]) > top:
        lines.append("   ... %d more (--top %d or --json)" % (len(report["findings"]) - top, len(report["findings"])))
    if report["screenshots"]:
        lines.append("screenshots (red boxes = fix numbers): " + "  ".join(report["screenshots"].values()))
    if report["skipped"]:
        lines.append("skipped without a browser: " + ", ".join(report["skipped"]))
    lines.append("next: " + ("done; keep the design rules in SKILL.md" if report["pass"] else
                             "fix #1-#%d, then re-run until PASS (score >= %d, no HIGH)" % (min(5, len(shown)) or 1, report["gate"])))
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="polish_audit.py", description="Render a page, measure polish problems, rank the fixes.",
                                 epilog="Install for the full audit: " + INSTALL_HINT)
    ap.add_argument("target", help="URL (http/https/file) or path to an HTML file")
    ap.add_argument("--viewports", default=",".join(str(v) for v in DEFAULT_VIEWPORTS))
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--score", action="store_true", help="print only the score line and its breakdown")
    ap.add_argument("--top", type=int, default=12, help="fixes to print (default 12)")
    ap.add_argument("--shots", help="folder for annotated screenshots (default: %%TEMP%%/polish-audit)")
    ap.add_argument("--no-shots", action="store_true", help="do not write screenshots")
    ap.add_argument("--browser-check", action="store_true", help="opt into executing page JavaScript with scoped read-only network routing")
    ap.add_argument("--static", action="store_true", help="skip the browser: HTML/CSS parse only")
    ap.add_argument("--fail-under", type=int, default=90, help="gate score (default 90)")
    ap.add_argument("--offline", action="store_true", help="block every network request (local files only)")
    ap.add_argument("--timeout", type=float, default=30.0, help="page load timeout in seconds (default 30)")
    ap.add_argument("--version", action="version", version=VERSION)
    try:
        args = ap.parse_args(argv)
    except SystemExit as exc:
        return int(exc.code or 0) if exc.code in (0, None) else 2
    try:
        report = run(args)
    except FileNotFoundError as exc:
        print("error: no such file: %s" % exc, file=sys.stderr)
        return 2
    except ValueError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 2
    except Exception as exc:  # page failed to load, network error...
        print("error: could not audit %s: %s" % (args.target, str(exc).splitlines()[0][:300] if str(exc) else type(exc).__name__),
              file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2))
    elif args.score:
        print("%s score %d/100 high=%d  %s" % ("PASS" if report["pass"] else "FAIL", report["score"], report["counts"]["high"],
                                               " ".join("%s=-%g" % kv for kv in sorted(report["breakdown"].items(), key=lambda kv: -kv[1]))))
    else:
        print(human(report, max(1, args.top)))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(errors="replace")
        except Exception:  # non-reconfigurable stream
            pass
    sys.exit(main())
