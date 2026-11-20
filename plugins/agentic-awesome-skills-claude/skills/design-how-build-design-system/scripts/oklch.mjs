#!/usr/bin/env node
// oklch.mjs: read a CSS color, print it as OKLCH, and measure the OK distance (deltaE OK, x100 scale) between two.
// Node 18+, no dependencies. Run `node scripts/oklch.mjs --help`.

const HELP = `oklch.mjs: a CSS color to OKLCH, and deltaE OK between two colors

Usage:
  node scripts/oklch.mjs <color>...          one line per color: input, oklch(L C H / alpha), L in 0 to 1
  node scripts/oklch.mjs --delta <a> <b>     the deltaE OK between two colors, 0 to about 100, and their alphas
  node scripts/oklch.mjs --self-test         known values

A color is hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb() or rgba(), hsl() or hsla(), hwb(), oklch(), oklab(),
a named color (the CSS list, transparent included). Commas or spaces both work, alpha after a slash or a fourth
comma, as a number or a percent. Angles take deg, grad, rad or turn. Quote functions in the shell.
Alpha is part of the color: it prints after the slash, and --delta prints both alphas and says "alpha differs"
when they are more than 0.02 apart (the opacity tolerance), which makes the pair two colors whatever the
distance. Hue prints as "none" when chroma is under 0.0001, as it is for grays. deltaE OK is the straight-line
distance in OKLab times 100, the scale token-mapping's rules use: under 0.5 counts as identical, the color
tolerance is 2, and a near pair is under 5. Not read: color(), lab(), lch(), color-mix(), var(), currentColor,
relative colors and system colors.

Exit 0 on success, 1 when a self-test value is off, 2 on bad input.`;

// The CSS named colors, as name and hex.
const NAMED = Object.fromEntries(("aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32")
  .split(" ").reduce((pairs, word, i, all) => (i % 2 ? pairs : [...pairs, [word, all[i + 1]]]), []));
export const NAMED_COLORS = NAMED;

const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

// sRGB channels 0 to 255 to OKLab.
export function toOklab(rgb) {
  const [r, g, b] = rgb.map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// "none" is 0, a percent is a share of `full`, a bare number stays as it is.
const num = (p, full) => {
  if (p === "none") return 0;
  if (p.endsWith("%")) { const v = parseFloat(p); return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?%$/.test(p) ? (v / 100) * full : NaN; }
  return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(p) ? parseFloat(p) : NaN;
};
const angle = (p) => {
  if (p === "none") return 0;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/.exec(p);
  if (!m) return NaN;
  const v = parseFloat(m[1]);
  return { deg: v, grad: v * 0.9, rad: (v * 180) / Math.PI, turn: v * 360 }[m[2] || "deg"];
};
const alphaOf = (p) => (p === undefined ? 1 : Math.min(1, Math.max(0, num(p, 1))));

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
}

function hwbToRgb(h, w, b) {
  if (w + b >= 1) { const g = (255 * w) / (w + b); return [g, g, g]; }
  return hslToRgb(h, 1, 0.5).map((v) => v * (1 - w - b) + 255 * w);
}

// A CSS color to {lab: [L, a, b], alpha}, or null when it cannot be read.
export function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  if (s === "transparent") return { lab: toOklab([0, 0, 0]), alpha: 0 };
  if (NAMED[s]) return parseColor(`#${NAMED[s]}`);
  let m = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return { lab: toOklab(rgb), alpha: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^(rgba?|hsla?|hwb|oklch|oklab)\(\s*([^)]*)\)$/);
  if (!m) return null;
  const [fn, body] = [m[1], m[2]];
  const slash = body.split("/");
  if (slash.length > 2) return null;
  let parts = slash[0].split(/[\s,]+/).filter(Boolean);
  let a = slash[1]?.trim();
  if (a === "") return null;
  if (a === undefined && parts.length === 4) a = parts.pop();
  if (parts.length !== 3) return null;
  const alpha = alphaOf(a);
  let lab;
  if (fn.startsWith("rgb")) {
    const rgb = parts.map((p) => num(p, 255));
    if (rgb.some((v) => !Number.isFinite(v))) return null;
    lab = toOklab(rgb.map((v) => Math.min(255, Math.max(0, v))));
  } else if (fn.startsWith("hsl") || fn === "hwb") {
    const [h, x, y] = [angle(parts[0]), num(parts[1], 100) / 100, num(parts[2], 100) / 100];
    if (![h, x, y].every(Number.isFinite)) return null;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    lab = toOklab(fn === "hwb" ? hwbToRgb(h, clamp(x), clamp(y)) : hslToRgb(h, clamp(x), clamp(y)));
  } else if (fn === "oklch") {
    const [L, C, H] = [num(parts[0], 1), num(parts[1], 0.4), angle(parts[2])];
    if (![L, C, H].every(Number.isFinite)) return null;
    const c = Math.max(0, C);
    lab = [Math.min(1, Math.max(0, L)), c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)];
  } else {
    const [L, A, B] = [num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)];
    if (![L, A, B].every(Number.isFinite)) return null;
    lab = [Math.min(1, Math.max(0, L)), A, B];
  }
  if (a !== undefined && !Number.isFinite(alpha)) return null;
  return { lab, alpha };
}

// Kept for callers of the old API: sRGB channels for hex and rgb() only.
export function parse(input) {
  const s = String(input).trim().toLowerCase();
  if (!/^#|^rgba?\(/.test(s)) return null;
  const c = parseColor(s);
  if (!c) return null;
  const m = s.match(/^#([0-9a-f]+)$/);
  if (m) { let h = m[1]; if (h.length <= 4) h = [...h].map((x) => x + x).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  const parts = s.replace(/^rgba?\(|\)$/g, "").split("/")[0].split(/[\s,]+/).filter(Boolean).slice(0, 3);
  return parts.map((p) => num(p, 255));
}

export const labToLch = ([L, a, b]) => {
  const C = Math.hypot(a, b);
  return [L, C, C < 0.0001 ? null : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
};
export const toOklch = (rgb) => labToLch(toOklab(rgb));

// deltaE OK between two colors: parsed colors, or sRGB channel arrays.
export function deltaEOK(x, y) {
  const [p, q] = [x, y].map((c) => (Array.isArray(c) ? toOklab(c) : c.lab));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export const format = ([L, C, H], alpha = 1) => `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H === null ? "none" : H.toFixed(2)}${alpha < 1 ? ` / ${+alpha.toFixed(4)}` : ""})`;

if (process.argv[1] && (await import("node:path")).resolve(process.argv[1]) === (await import("node:url")).fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const bad = (msg) => { console.error(`oklch: ${msg}\n\n${HELP}`); process.exit(2); };
  if (!argv.length) bad("give a color, --delta <a> <b>, or --self-test");
  if (argv.includes("--help") || argv.includes("-h")) { console.log(HELP); process.exit(0); }
  if (argv.includes("--self-test")) {
    // [color, L, C, H, alpha] with H null for grays, then [a, b, deltaE OK on the x100 scale], then unreadable input.
    const known = [
      ["#ffffff", 1, 0, null, 1],
      ["#000000", 0, 0, null, 1],
      ["#808080", 0.5999, 0, null, 1],
      ["#ff0000", 0.628, 0.2577, 29.23, 1],
      ["#00ff00", 0.8664, 0.2948, 142.5, 1],
      ["#0000ff", 0.452, 0.3132, 264.05, 1],
      ["rgb(255, 0, 0)", 0.628, 0.2577, 29.23, 1],
      // The doc once promised these and the script read hex and rgb() only, with alpha dropped.
      ["rgb(255 0 0 / 50%)", 0.628, 0.2577, 29.23, 0.5],
      ["rgba(255, 0, 0, .25)", 0.628, 0.2577, 29.23, 0.25],
      ["#ff000080", 0.628, 0.2577, 29.23, 128 / 255],
      ["#f008", 0.628, 0.2577, 29.23, 136 / 255],
      ["hsl(0 100% 50%)", 0.628, 0.2577, 29.23, 1],
      ["hsla(120, 100%, 25%, 0.5)", 0.5183, 0.1764, 142.5, 0.5],
      ["hsl(0.5turn 100% 50%)", 0.9054, 0.1546, 194.77, 1],
      ["hwb(0 0% 0%)", 0.628, 0.2577, 29.23, 1],
      ["hwb(0 60% 60%)", 0.5982, 0, null, 1],
      ["oklch(0.628 0.2577 29.23)", 0.628, 0.2577, 29.23, 1],
      ["oklch(62.8% 64.425% 29.23deg / 0.8)", 0.628, 0.2577, 29.23, 0.8],
      ["oklab(0.628 0.2249 0.1258)", 0.628, 0.2577, 29.22, 1],
      ["red", 0.628, 0.2577, 29.23, 1],
      ["green", 0.5197, 0.1765, 142.5, 1],
      ["rebeccapurple", 0.4403, 0.1603, 303.37, 1],
      ["transparent", 0, 0, null, 0],
    ];
    const deltas = [["#ffffff", "#000000", 100], ["#6b7280", "#6b7280", 0], ["#6b7280", "#737373", 2.38], ["hsl(0 100% 50%)", "red", 0], ["oklch(0.628 0.2577 29.23)", "#ff0000", 0]];
    const unreadable = ["#12", "rgb(1 2)", "hsl(x 1% 1%)", "oklch(0.5 0.1 10 / )", "notacolor", "lab(50 10 10)"];
    let ok = true;
    for (const [c, L, C, H, A] of known) {
      const p = parseColor(c);
      const [l, ch, h] = p ? labToLch(p.lab) : [NaN, NaN, NaN];
      const good = !!p && Math.abs(l - L) < 0.001 && Math.abs(ch - C) < 0.001 && (H === null ? h === null : Math.abs(h - H) < 0.05) && Math.abs(p.alpha - A) < 0.001;
      if (!good) ok = false;
      console.log(`self-test ${good ? "ok  " : "FAIL"} ${c}: ${p ? format([l, ch, h], p.alpha) : "unread"}, want L ${L} C ${C} H ${H ?? "none"} alpha ${+A.toFixed(4)}`);
    }
    for (const [a, b, want] of deltas) {
      const d = deltaEOK(parseColor(a), parseColor(b));
      const good = Math.abs(d - want) < 0.02;
      if (!good) ok = false;
      console.log(`self-test ${good ? "ok  " : "FAIL"} deltaE OK x100 ${a} ${b}: ${d.toFixed(2)}, want ${want}`);
    }
    for (const c of unreadable) {
      const good = parseColor(c) === null;
      if (!good) ok = false;
      console.log(`self-test ${good ? "ok  " : "FAIL"} ${c} is refused`);
    }
    const named = Object.keys(NAMED).length;
    const goodNamed = named === 148;
    if (!goodNamed) ok = false;
    console.log(`self-test ${goodNamed ? "ok  " : "FAIL"} ${named} named colors, want 148`);
    console.log(`self-test: ${known.length + deltas.length + unreadable.length + 1} checks, ${ok ? "all as expected" : "FAILED"}`);
    process.exit(ok ? 0 : 1);
  }
  if (argv[0] === "--delta") {
    if (argv.length !== 3) bad("--delta takes exactly two colors");
    const [a, b] = argv.slice(1).map((c) => parseColor(c) || bad(`cannot read the color ${c}`));
    const differs = Math.abs(a.alpha - b.alpha) > 0.02;
    console.log(`${argv[1]}\t${argv[2]}\tdeltaE OK x100 ${deltaEOK(a, b).toFixed(2)}\talpha ${+a.alpha.toFixed(4)} and ${+b.alpha.toFixed(4)}${differs ? "\talpha differs" : ""}`);
    console.log("Coverage: 2 colors, alpha compared on its own. Not read: color spaces beyond sRGB, OKLab and OKLCH");
    process.exit(0);
  }
  const unknown = argv.find((a) => a.startsWith("--"));
  if (unknown) bad(`unknown ${unknown}`);
  for (const c of argv) {
    const p = parseColor(c);
    if (!p) bad(`cannot read the color ${c}`);
    console.log(`${c}\t${format(labToLch(p.lab), p.alpha)}`);
  }
  console.log(`Coverage: ${argv.length} color(s) with alpha. Not read: color spaces beyond sRGB, OKLab and OKLCH`);
}
