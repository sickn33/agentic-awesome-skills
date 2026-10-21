// Read a notebook film's sound-cue log (window.__kitEvents) out of the composition itself.
//
//   node lib/kit/events.mjs <project-dir>        -> <project-dir>/tools/events.json
//
// Every pen job (write / stroke / highlighter), slap, eraser run, camera move and page turn the kit schedules is
// logged at build time, so the sound bed is timed to the picture without copying any times by hand.
// Uses the puppeteer-core + chrome-headless-shell that `npx hyperframes` already installed on this machine.
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

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
      for (const rel of ["lib/puppeteer/puppeteer-core.js", "lib/esm/puppeteer/puppeteer-core.js"]) {
        const p = join(base, d, "node_modules/puppeteer-core", rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("puppeteer-core not found in the npm npx cache (run any `npx hyperframes@0.8.81` command once)");
}
function findChrome() {
  const base = join(home, ".cache/hyperframes/chrome/chrome-headless-shell");
  for (const d of (existsSync(base) ? readdirSync(base) : []).sort().reverse()) {
    for (const sub of readdirSync(join(base, d))) {
      const p = join(base, d, sub, CHROME_BIN);
      if (existsSync(p)) return p;
    }
  }
  throw new Error("chrome-headless-shell not found in ~/.cache/hyperframes");
}

const { default: puppeteer } = await import(pathToFileURL(findPuppeteer()).href);
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--allow-file-access-from-files"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("console:", m.text()); });
  await page.goto(pathToFileURL(join(project, "index.html")).href, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(() => window.__timelines && Object.keys(window.__timelines).length > 0, { timeout: 30000 });
  const events = await page.evaluate(() => (window.__kitEvents || []).slice().sort((a, b) => a.t - b.t));
  mkdirSync(join(project, "tools"), { recursive: true });
  const out = join(project, "tools", "events.json");
  writeFileSync(out, JSON.stringify(events, null, 0).replace(/},{/g, "},\n{") + "\n");
  console.log(`${events.length} cues -> ${out}`);
} finally {
  await browser.close();
}
