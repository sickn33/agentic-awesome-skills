#!/usr/bin/env node
// render_book.mjs: print the font book that font_book.py wrote, as page PNGs and one PDF. Node 18+ and Playwright.
//
//   node render_book.mjs <book-dir> [--pages 1,3] [--no-pdf] [--root <dir with node_modules/playwright>]
//
// Writes <book-dir>/pages/NN-slug.png (2x) and <book-dir>/fontbook.pdf (1600 x 1000 px pages).
// Before printing it checks two things and exits 1 if either fails:
//   - fallback: every element set in the book face renders only with the book's own fonts, never a system font
//     standing in for a missing glyph (read through the DevTools protocol, per element);
//   - overflow: nothing runs past a page's margins.
// Playwright comes from build-design-system/scripts/find-chromium.mjs when that skill is installed beside this one,
// else from --root, the current folder or the global install. PW_CHROMIUM may point at any Chrome or Chromium.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log("usage: node render_book.mjs <book-dir> [--pages 1,3] [--no-pdf] [--root <dir>]");
  process.exit(args.length ? 0 : 2);
}
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const dir = resolve(args[0]);
const only = opt("--pages");
const book = JSON.parse(readFileSync(join(dir, "pages.json"), "utf8"));
const here = dirname(fileURLToPath(import.meta.url));

async function launch() {
  const sibling = join(here, "..", "..", "build-design-system", "scripts", "find-chromium.mjs");
  if (existsSync(sibling)) {
    const { launchChromium } = await import(pathToFileURL(sibling).href);
    const r = await launchChromium({}, { root: opt("--root") || process.cwd() });
    if (r.browser) return r.browser;
    console.error(r.error);
  }
  const places = [opt("--root"), process.cwd()].filter(Boolean);
  try { places.push(dirname(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim())); } catch {}
  for (const p of places) {
    for (const name of ["playwright", "playwright-core"]) {
      try {
        const pw = createRequire(join(p, "noop.js"))(name);
        const exe = process.env.PW_CHROMIUM;
        return await pw.chromium.launch(exe ? { executablePath: exe } : {});
      } catch {}
    }
  }
  console.error("no Playwright found. Run `npm i -D playwright && npx playwright install chromium`, or pass --root.");
  process.exit(2);
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const failed = [];
page.on("requestfailed", (r) => failed.push(r.url()));
await page.goto(pathToFileURL(join(dir, "index.html")).href);
await page.evaluate(async () => {
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
  await document.fonts.ready;
});
const faces = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`));
console.log("fonts:", faces.join(", "));
let bad = 0;
if (failed.length) { console.log("failed requests:", failed); bad++; }

// fallback check
const cdp = await ctx.newCDPSession(page);
await cdp.send("DOM.enable");
await cdp.send("CSS.enable");
const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "section *:not(.g):not(.g *)" });
const fallbacks = [];
for (const id of nodeIds) {
  const { computedStyle } = await cdp.send("CSS.getComputedStyleForNode", { nodeId: id });
  const fam = computedStyle.find((p) => p.name === "font-family")?.value || "";
  if (!fam.includes(`${book.family} Book`)) continue;
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: id });
  for (const f of fonts) {
    if (!f.isCustomFont) {
      const { outerHTML } = await cdp.send("DOM.getOuterHTML", { nodeId: id });
      fallbacks.push(`${f.familyName} x${f.glyphCount}: ${outerHTML.slice(0, 120)}`);
    }
  }
}
console.log(`fallback glyphs: ${fallbacks.length}`);
fallbacks.slice(0, 20).forEach((f) => console.log("  ", f));
if (fallbacks.length) bad++;

// overflow check
const over = await page.evaluate(() => {
  const out = [];
  for (const sec of document.querySelectorAll("section.page")) {
    const r = sec.getBoundingClientRect();
    for (const el of sec.querySelectorAll("*")) {
      if (el.closest(".g")) continue;
      const b = el.getBoundingClientRect();
      if (!b.width) continue;
      if (b.right > r.right - 40 || b.bottom > r.bottom - 24 || b.left < r.left + 40)
        out.push(`${sec.id} ${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} right ${Math.round(b.right - r.left)} bottom ${Math.round(b.bottom - r.top)}`);
    }
  }
  return out;
});
console.log(`overflow: ${over.length}`);
over.slice(0, 30).forEach((o) => console.log("  ", o));
if (over.length) bad++;

mkdirSync(join(dir, "pages"), { recursive: true });
for (const [n, slug] of book.pages) {
  if (only && !only.split(",").includes(String(n))) continue;
  const el = await page.$(`#p${String(n).padStart(2, "0")}`);
  await el.screenshot({ path: join(dir, "pages", `${String(n).padStart(2, "0")}-${slug}.png`) });
}
if (!only && !args.includes("--no-pdf")) {
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: join(dir, "fontbook.pdf"), width: "1600px", height: "1000px", printBackground: true, preferCSSPageSize: true });
  console.log("wrote", join(dir, "fontbook.pdf"));
}
console.log(`wrote ${book.pages.length} page images to ${join(dir, "pages")}`);
await browser.close();
process.exit(bad ? 1 : 0);
