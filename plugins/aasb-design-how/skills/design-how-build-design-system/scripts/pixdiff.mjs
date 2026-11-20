#!/usr/bin/env node
// pixdiff.mjs: compare two saved screenshots, or two folders of same-named PNGs.
//
//   node pixdiff.mjs /abs/before.png /abs/after.png
//   node pixdiff.mjs /abs/baseline/ /abs/after/ [--surface <name>,...] [--max <percent>] [--tolerance <n>] [--out <dir>] [--no-image] [--root <dir>]
//
// In folder mode, when the first folder holds capture.mjs names (<surface>-before-<width>.png),
// each before file pairs with its -after- name in the second folder, which may be the same
// folder. Otherwise files pair by the same relative path. Every width and theme is compared.
// --surface keeps only the named surfaces' files (every width, theme and state) and prints
// how many other before files it skipped, so one surface's swap is proven in a shared folder.
// Prints one line per file: path, size match, changed-pixel percentage, the bounding
// box of the changed pixels, the largest per-channel delta (printed even under the
// tolerance), the tolerance, and the diff image: the after capture faded, changed
// pixels red, written beside the after file as <name>.diff.png or into --out.
// A pixel counts as changed when any channel differs by more than --tolerance
// (0 to 255, default 0). A value-identical swap is proven at tolerance 0 only.
// Exits 1 when any pair differs in size, is missing, or changes more pixels than
// --max (percent, default 0).
//
// Needs Playwright (`playwright` or `playwright-core`) and a Chromium. find-chromium.mjs
// finds both: PW_CHROMIUM, Playwright's own download, any other Playwright download in
// the cache, then the system Chrome. Playwright is looked for first in --root, which defaults to the git root of the
// first image path, else of the current folder. Relative image paths resolve against the current folder.
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { launchChromium, repoRoot } from "./find-chromium.mjs";

const USAGE = "usage: node pixdiff.mjs <before.png|dir> <after.png|dir> [--surface <name>,...] [--max <percent>] [--tolerance <n>] [--out <dir>] [--no-image] [--root <dir>]\n       node pixdiff.mjs --self-test\nTwo folders pair capture.mjs -before- files with their -after- names (the folders may be the same), else files of the same name\n--surface keeps only those surfaces' capture.mjs files and counts the rest as skipped\n--tolerance is the per-channel delta, 0 to 255, a pixel may move and still count as unchanged. Default 0. Keep 0 to prove a value-identical swap\n--root is where Playwright is looked for first. Default: the git root of the first path, else of the current folder";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { console.log(USAGE); process.exit(0); }
if (args.includes("--self-test")) process.exit(selfTest());

// A w x h RGBA PNG, every pixel from px(x, y) -> [r, g, b, a]. Enough to test the diff without an image library.
function png(w, h, px) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) Buffer.from(px(x, y)).copy(raw, y * (1 + w * 4) + 1 + x * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "pixdiff-"));
  let fails = 0;
  const t = (name, ok, detail) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: ${detail}`}`); if (!ok) fails++; };
  const run = (...a) => { const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...a], { encoding: "utf8" }); return { code: r.status, out: (r.stdout || "") + (r.stderr || "") }; };
  try {
    const grey = () => [200, 200, 200, 255];
    mkdirSync(join(dir, "shots"));
    writeFileSync(join(dir, "shots/home-before-390.png"), png(20, 10, grey));
    writeFileSync(join(dir, "shots/home-after-390.png"), png(20, 10, grey));
    writeFileSync(join(dir, "shots/card-before-390.png"), png(20, 10, grey));
    writeFileSync(join(dir, "shots/card-after-390.png"), png(20, 10, (x, y) => (x === 3 && y === 4 ? [201, 200, 200, 255] : grey())));
    writeFileSync(join(dir, "wide.png"), png(21, 10, grey));
    let r = run(join(dir, "shots/home-before-390.png"), join(dir, "shots/home-after-390.png"), "--root", dir);
    if (/no Chromium|Playwright not found/.test(r.out)) { console.log(`self-test: the comparison did not run, because no browser was found:
${r.out.trim()}`); return 2; }
    t("identical images exit 0 at tolerance 0", r.code === 0 && /\t0%\tno change/.test(r.out), r.out);
    r = run(join(dir, "shots/card-before-390.png"), join(dir, "shots/card-after-390.png"), "--no-image", "--root", dir);
    t("one pixel off by one channel step fails at tolerance 0", r.code === 1 && /bbox 3,4 1x1/.test(r.out) && /max delta 1/.test(r.out), r.out);
    r = run(join(dir, "shots/card-before-390.png"), join(dir, "shots/card-after-390.png"), "--no-image", "--tolerance", "1", "--root", dir);
    t("the same pixel passes at tolerance 1", r.code === 0, r.out);
    r = run(join(dir, "shots/card-before-390.png"), join(dir, "wide.png"), "--root", dir);
    t("a size change fails", r.code === 1 && /20x10 vs 21x10/.test(r.out), r.out);
    r = run(join(dir, "shots"), join(dir, "shots"), "--surface", "home", "--root", dir);
    t("folder mode pairs before with after and keeps one surface", r.code === 0 && /1 compared/.test(r.out) && /1 of other surfaces skipped/.test(r.out), r.out);
    r = run(join(dir, "shots"), join(dir, "shots"), "--no-image", "--root", dir);
    t("folder mode fails when any surface changed", r.code === 1 && /2 compared, 1 over 0%/.test(r.out), r.out);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  console.log(fails ? `${fails} failed` : "all as expected");
  return fails ? 1 : 0;
}
if (args.some((a) => a.startsWith("-") && !["--max", "--out", "--no-image", "--root", "--tolerance", "--surface"].includes(a))) {
  console.error(USAGE);
  process.exit(2);
}
const take = (f) => { const i = args.indexOf(f); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const maxArg = take("--max");
const max = maxArg === undefined ? 0 : Number(maxArg);
const outDir = take("--out");
const rootArg = take("--root");
const tolArg = take("--tolerance");
const surfArg = take("--surface");
const only = surfArg ? new Set(surfArg.split(",").map((x) => x.trim()).filter(Boolean)) : null;
const tolerance = tolArg === undefined ? 0 : Number(tolArg);
if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 255) { console.error(`pixdiff: --tolerance takes a whole number from 0 to 255, not ${tolArg}\n${USAGE}`); process.exit(2); }
const noImage = args.includes("--no-image");
if (noImage) args.splice(args.indexOf("--no-image"), 1);
const [A, B] = args.map((p) => resolve(p));
if (!A || !B || Number.isNaN(max)) {
  console.error(USAGE);
  process.exit(2);
}
for (const p of [A, B]) {
  if (!existsSync(p)) { console.error(`pixdiff: ${p} does not exist (relative paths resolve against ${process.cwd()})`); process.exit(2); }
}

const launched = await launchChromium({}, { root: repoRoot(rootArg, A) });
if (launched.error) { console.error(`pixdiff: ${launched.error}`); process.exit(2); }
const browser = launched.browser;
console.error(`pixdiff: using ${launched.from}, ${launched.how}`);

const walk = (d) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".png") && !p.includes(".diff.") ? [p] : [];
});
const dirMode = statSync(A).isDirectory();
// capture.mjs names files <surface>-before-<width>[-<theme>].png, so when the before
// folder holds such names, each pairs with the same name with -after- in the after folder.
const kinded = dirMode && walk(A).some((f) => basename(f).includes("-before-"));
if (only && !kinded) { console.error("pixdiff: --surface needs two folders of capture.mjs names (<surface>-before-<width>.png)"); process.exit(2); }
// A state capture is <surface>.<state>-before-..., so the surface is the name up to the first dot.
const surfaceOf = (f) => basename(f).split("-before-")[0].split(".")[0];
const befores = dirMode ? walk(A).filter((f) => !kinded || basename(f).includes("-before-")) : [];
const kept = only ? befores.filter((f) => only.has(surfaceOf(f))) : befores;
const skipped = befores.length - kept.length;
if (only && !kept.length) { console.error(`pixdiff: no before capture for ${[...only].join(", ")} in ${A}`); process.exit(2); }
const pairs = dirMode
  ? kept.sort().map((fa) => {
    const rel = relative(A, fa);
    return [rel, fa, join(B, kinded ? join(dirname(rel), basename(rel).replace("-before-", "-after-")) : rel)];
  })
  : [[relative(process.cwd(), B), A, B]];

const page = await browser.newPage();
let failed = 0;
for (const [name, fa, fb] of pairs) {
  if (!existsSync(fb)) { console.log(`${name}\tmissing in ${B}\ttolerance ${tolerance}`); failed++; continue; }
  const r = await page.evaluate(async ([a, b, wantImage, tol]) => {
    const load = (s) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`, pct: null };
    const w = ia.width, h = ia.height;
    const px = (i) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, maxDelta = 0;
    const changed = new Uint8Array(w * h);
    for (let k = 0, p = 0; k < da.length; k += 4, p++) {
      const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2]), Math.abs(da[k + 3] - db[k + 3]));
      if (d > maxDelta) maxDelta = d;
      if (d > tol) {
        n++; changed[p] = 1;
        const x = p % w, y = (p / w) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    // A changed pixel never rounds down to 0%: the percentage keeps enough digits to show it.
    const raw = 100 * n / (w * h);
    const pct = n && +raw.toFixed(3) === 0 ? +raw.toPrecision(2) : +raw.toFixed(3);
    const out = { size: "same size", pct, bbox: n ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null, maxDelta };
    if (n && wantImage) {
      // the after capture faded to 25%, changed pixels in red, the box outlined
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.globalAlpha = 0.25; x.drawImage(ib, 0, 0); x.globalAlpha = 1;
      const img = x.getImageData(0, 0, w, h);
      for (let p = 0; p < changed.length; p++) if (changed[p]) { img.data[p * 4] = 255; img.data[p * 4 + 1] = 0; img.data[p * 4 + 2] = 0; img.data[p * 4 + 3] = 255; }
      x.putImageData(img, 0, 0);
      x.strokeStyle = "#f0f"; x.lineWidth = 2; x.strokeRect(x0 - 2, y0 - 2, x1 - x0 + 5, y1 - y0 + 5);
      out.png = c.toDataURL("image/png").split(",")[1];
    }
    return out;
  }, [readFileSync(fa).toString("base64"), readFileSync(fb).toString("base64"), !noImage, tolerance]);
  if (r.pct === null || r.pct > max) failed++;
  let img = "";
  if (r.png) {
    const dest = outDir ? join(resolve(outDir), (dirMode ? name : basename(fb)).replace(/\.png$/, ".diff.png")) : fb.replace(/\.png$/, ".diff.png");
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(r.png, "base64"));
    img = dest;
  }
  const box = r.bbox ? `bbox ${r.bbox[0]},${r.bbox[1]} ${r.bbox[2]}x${r.bbox[3]}` : r.pct === null ? "-" : "no change";
  const delta = r.pct === null ? "max delta -" : `max delta ${r.maxDelta}`;
  console.log(`${name}\t${r.size}\t${r.pct === null ? "-" : r.pct + "%"}\t${box}\t${delta}\ttolerance ${tolerance}${img ? `\t${relative(process.cwd(), img) || basename(img)}` : ""}`);
}
await browser.close();
console.log(`${pairs.length} compared, ${failed} over ${max}%, tolerance ${tolerance}${only ? `, ${skipped} of other surfaces skipped` : ""}`);
console.log(`Coverage: ${pairs.length} pair(s) compared pixel by pixel on every channel including alpha${dirMode ? `, every before file in ${A}${only ? ` for ${[...only].join(", ")}` : ""}` : ""}. Not compared: after files with no before file, accessibility trees, probe files, motion, and any state or width that was not captured`);
process.exit(failed ? 1 : 0);
