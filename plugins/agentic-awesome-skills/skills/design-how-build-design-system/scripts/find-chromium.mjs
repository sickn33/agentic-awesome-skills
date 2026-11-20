// find-chromium.mjs: find Playwright and a Chromium it can launch. Used by capture.mjs and pixdiff.mjs.
// Node 18+, no dependencies of its own.
//
//   node find-chromium.mjs [--root <dir>] [--self-test]   prints where Playwright and the browser come from. Exit 0, or 2 on none
//
// The root is --root, else the git root of the script's first path argument, else of the current folder, else the
// current folder (repoRoot below). Playwright (`playwright` or `playwright-core`) is looked for in that root and its
// parents first, then the current folder and its parents, the repo root of this script, then the global install
// (`npm root -g`). So a command run from outside the app still finds the app's own Playwright.
//
// The browser is tried in this order, and the first that launches wins:
//   1. PW_CHROMIUM, when set: a path to any Chrome or Chromium executable
//   2. Playwright's own download for its version
//   3. any other Playwright download in the browser cache (PLAYWRIGHT_BROWSERS_PATH, ~/Library/Caches/ms-playwright,
//      ~/.cache/ms-playwright, %LOCALAPPDATA%\ms-playwright), newest first. playwright-core never ships a browser,
//      and a version bump leaves the old download in place, so this is the common fix
//   4. the system Chrome (Playwright's "chrome" channel, then the usual install paths)
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const sh = (cmd, cwd) => { try { return execSync(cmd, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };

// The repo root every script uses: --root, else the git root of the first path argument, else of the current
// folder, else the current folder. A path that does not exist yet (an --out folder) uses its nearest parent.
export function repoRoot(rootFlag, firstPath) {
  if (rootFlag) return resolve(rootFlag);
  if (firstPath) {
    let d = resolve(firstPath);
    while (!existsSync(d) && dirname(d) !== d) d = dirname(d);
    if (!statSync(d).isDirectory()) d = dirname(d);
    const g = sh("git rev-parse --show-toplevel", d); if (g) return g;
  }
  return sh("git rev-parse --show-toplevel", process.cwd()) || process.cwd();
}

export function findPlaywright(root = repoRoot()) {
  const here = dirname(fileURLToPath(import.meta.url));
  const scriptRoot = sh("git rev-parse --show-toplevel", here);
  const globalRoot = sh("npm root -g", process.cwd());
  // The root and the current folder walk up like any require. The script's repo root and the global folder are
  // checked exactly, so an unrelated node_modules higher up never stands in for them.
  const places = [
    ["repo root", root, true],
    ["current folder", process.cwd(), true],
    ["script's repo root", scriptRoot, false],
    ["global", globalRoot && dirname(globalRoot), false],
  ];
  for (const [label, dir, up] of places) {
    if (!dir) continue;
    for (const name of ["playwright", "playwright-core"]) {
      const exact = label === "global" ? join(globalRoot, name) : join(dir, "node_modules", name);
      if (!up && !existsSync(join(exact, "package.json"))) continue;
      try { const pw = createRequire(join(dir, "noop.js"))(up ? name : exact); if (pw.chromium) return { chromium: pw.chromium, from: `${name} (${label})` }; } catch {}
    }
  }
  const lines = [
    "Playwright not found. Looked in:",
    `  ${root} and its parents (the repo root; pass --root <app> when that is wrong)`,
    `  ${process.cwd()} and its parents`,
    `  ${scriptRoot ? join(scriptRoot, "node_modules") : "(script is not in a git repo)"}`,
    `  ${globalRoot || "(npm root -g failed)"}`,
    "Install it in the repo root:  npm i -D playwright && npx playwright install chromium",
    "or globally:                  npm i -g playwright && playwright install chromium",
  ];
  return { error: lines.join("\n") };
}

const EXE = new Set(["chrome-headless-shell", "headless_shell", "chrome-headless-shell.exe", "headless_shell.exe", "chrome", "chrome.exe", "Chromium", "Google Chrome for Testing"]);
function cachedBrowsers() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), "Library/Caches/ms-playwright"), join(homedir(), ".cache/ms-playwright"), process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright")].filter((r) => r && r !== "0" && existsSync(r));
  const found = [];
  for (const r of roots) {
    const builds = readdirSync(r).map((d) => /^(chromium_headless_shell|chromium)-(\d+)$/.exec(d)).filter(Boolean)
      .sort((a, b) => Number(b[2]) - Number(a[2]) || (a[1] === "chromium_headless_shell" ? -1 : 1));
    for (const b of builds) {
      const walk = (d, depth) => {
        if (depth > 5) return null;
        let entries = [];
        try { entries = readdirSync(d); } catch { return null; }
        for (const e of entries) {
          const p = join(d, e);
          let st; try { st = statSync(p); } catch { continue; }
          if (st.isFile() && EXE.has(e) && (st.mode & 0o111 || e.endsWith(".exe"))) return p;
        }
        for (const e of entries) { const p = join(d, e); try { if (statSync(p).isDirectory()) { const x = walk(p, depth + 1); if (x) return x; } } catch {} }
        return null;
      };
      const exe = walk(join(r, b[0]), 0);
      if (exe) found.push(exe);
    }
  }
  return found;
}

const SYSTEM = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

// Returns { browser, from, how } or { error }.
export async function launchChromium(options = {}, { root } = {}) {
  const pw = findPlaywright(root || repoRoot());
  if (pw.error) return { error: pw.error };
  const tried = [];
  const attempt = async (how, opts) => {
    try { return { browser: await pw.chromium.launch({ ...options, ...opts }), from: pw.from, how }; }
    catch (e) { tried.push(`${how}: ${String(e.message).split("\n")[0].slice(0, 140)}`); return null; }
  };
  let r = null;
  if (process.env.PW_CHROMIUM) r = await attempt(`PW_CHROMIUM ${process.env.PW_CHROMIUM}`, { executablePath: process.env.PW_CHROMIUM });
  if (!r) r = await attempt("Playwright's own download", {});
  if (!r) for (const exe of cachedBrowsers()) { r = await attempt(`cached Playwright build ${exe}`, { executablePath: exe }); if (r) break; }
  if (!r) r = await attempt("system Chrome (channel chrome)", { channel: "chrome" });
  if (!r) for (const exe of SYSTEM.filter((p) => existsSync(p))) { r = await attempt(`system browser ${exe}`, { executablePath: exe }); if (r) break; }
  if (r) return r;
  return { error: [`found ${pw.from} but no Chromium would launch. Tried:`, ...tried.map((t) => `  ${t}`), "Run `npx playwright install chromium` in the repo root, or set PW_CHROMIUM to a Chrome or Chromium executable."].join("\n") };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.some((a) => a.startsWith("--") && a !== "--root" && a !== "--self-test")) {
    console.log("usage: node find-chromium.mjs [--root <dir>] [--self-test]\nPrints where Playwright and a launchable Chromium come from, after launching and closing it. Exit 0 when one launches, 2 when none does.\n--self-test is the same run: it passes only when a browser really launched.");
    process.exit(argv.includes("--help") || argv.includes("-h") ? 0 : 2);
  }
  const i = argv.indexOf("--root");
  const root = repoRoot(i >= 0 ? argv[i + 1] : null);
  const r = await launchChromium({}, { root });
  if (r.error) { console.error(r.error); process.exit(2); }
  console.log(`root ${root}\nplaywright ${r.from}\nbrowser ${r.how}`);
  await r.browser.close();
}
