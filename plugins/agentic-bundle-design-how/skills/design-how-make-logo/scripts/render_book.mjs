#!/usr/bin/env node
// render_book.mjs: print the logo book that logo_book.py wrote, as page PNGs and one PDF. Node 18+ and Playwright.
//
//   node render_book.mjs <book-dir> [--pages 1,3] [--no-pdf] [--root <dir with node_modules/playwright>]
//
// Writes <book-dir>/pages/NN-slug.png (2x) and <book-dir>/logobook.pdf (1600 x 900 px pages). Exits 1 if the book's
// font didn't load (a page set in a fallback face) or anything runs off a page.
// Playwright and a Chromium come from build-design-system/scripts/find-chromium.mjs when that skill is installed beside
// this one, else from --root, the current folder or the global install. PW_CHROMIUM may point at any Chrome.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length || args.includes("--help")) {
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
        const { chromium } = createRequire(join(p, "x.js"))(name);
        return await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
      } catch {}
    }
  }
  console.error("No Playwright found. Install it (npm i -D playwright && npx playwright install chromium) or pass --root.");
  process.exit(2);
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const failed = [];
page.on("requestfailed", (r) => failed.push(r.url()));
await page.goto(pathToFileURL(join(dir, "index.html")).href);
await page.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load().catch(() => null))); await document.fonts.ready; });
let bad = 0;
// The book face must have loaded: document.fonts.check alone says yes to a face that never arrived.
const loaded = await page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/["']/g, "") === "Book" && f.status === "loaded"));
if (!loaded) { console.log("the book font did not load"); bad++; }
if (failed.length) { console.log("failed requests:", failed); bad++; }
const over = await page.evaluate(() => {
  const out = [];
  for (const sec of document.querySelectorAll("section.page")) {
    const r = sec.getBoundingClientRect();
    for (const el of sec.querySelectorAll("*")) {
      if (el.closest("svg.grid")) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || getComputedStyle(el).position === "absolute" && el.classList.contains("right")) continue;
      if (b.right > r.right + 0.5 || b.bottom > r.bottom + 0.5 || b.left < r.left - 0.5 || b.top < r.top - 0.5)
        out.push(`${sec.id} ${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className}`);
      // Text must not spill out of its tile.
      const tile = el.closest(".tile");
      if (tile && el !== tile && !el.closest("svg")) {
        const t = tile.getBoundingClientRect();
        if (b.right > t.right + 0.5 || b.bottom > t.bottom + 0.5 || b.left < t.left - 0.5) out.push(`${sec.id} ${el.tagName.toLowerCase()} spills out of its tile`);
      }
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
  await page.pdf({ path: join(dir, "logobook.pdf"), width: "1600px", height: "900px", printBackground: true });
  console.log("wrote", join(dir, "logobook.pdf"));
}
console.log(`wrote ${book.pages.length} page images to ${join(dir, "pages")}`);
await browser.close();
process.exit(bad ? 1 : 0);
