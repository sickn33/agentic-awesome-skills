#!/usr/bin/env node
/* Read the chalk event log back from a V8 film so its sound bed lands on the picture.
 *
 *   node lib/kit/chalklog.mjs <project-dir>      → <project-dir>/assets/audio/chalk-log.json
 *
 * Opens the film's index.html in the headless Chrome that HyperFrames installed, waits for the scene to build,
 * and saves Kit.log(): every written character, long stroke, tally tick, tap, erasure, camera move and named mark.
 * tools/sfx.py then places chalk scrapes, felt rubs and whooshes at exactly those times.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const project = resolve(process.argv[2] || ".");
const home = homedir();
// chrome-headless-shell carries a .exe suffix on Windows.
const CHROME_BIN = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";

function findPuppeteer() {
  // npm puts its npx cache under ~/.npm on POSIX and under %LocalAppData%\npm-cache on Windows.
  const bases = [join(home, ".npm/_npx")];
  if (process.env.LOCALAPPDATA) bases.push(join(process.env.LOCALAPPDATA, "npm-cache/_npx"));
  for (const base of bases) {
    for (const d of existsSync(base) ? readdirSync(base) : []) {
      const p = join(base, d, "node_modules/puppeteer-core");
      if (existsSync(join(p, "package.json"))) return p;
    }
  }
  throw new Error("puppeteer-core not found in the npm npx cache (run `npx hyperframes@0.8.81 check` once)");
}
function findChrome() {
  const base = join(home, ".cache/hyperframes/chrome/chrome-headless-shell");
  for (const v of existsSync(base) ? readdirSync(base).sort().reverse() : []) {
    for (const sub of readdirSync(join(base, v))) {
      const exe = join(base, v, sub, CHROME_BIN);
      if (existsSync(exe)) return exe;
    }
  }
  throw new Error("chrome-headless-shell not found in ~/.cache/hyperframes");
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".wav": "audio/wav" };
const server = createServer((req, res) => {
  const path = join(project, decodeURIComponent(req.url.split("?")[0]));
  if (!path.startsWith(project) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const require = createRequire(import.meta.url);
const puppeteer = require(findPuppeteer());
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  // the scene is built synchronously by the inline script, so DOMContentLoaded is enough (GSAP may still be loading)
  await page.setRequestInterception(true);
  page.on("request", (r) => (/\.(wav|mp3|mp4)$/.test(r.url()) ? r.abort() : r.continue()));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.Kit && window.Kit.log().chars.length > 0, { timeout: 30000 });
  const log = await page.evaluate(() => window.Kit.log());
  const out = join(project, "assets/audio/chalk-log.json");
  mkdirSync(join(project, "assets/audio"), { recursive: true });
  writeFileSync(out, JSON.stringify(log));
  console.log(`${out}: ${log.chars.length} chars, ${log.lines.length} strokes, ${log.erases.length} erasures, ${log.moves.length} camera moves`);
} finally {
  await browser.close();
  server.close();
}
