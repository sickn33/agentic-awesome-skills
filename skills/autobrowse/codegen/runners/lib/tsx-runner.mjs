// tsx-runner.mjs — shared logic for codegen target runners that boot a tsx
// script in a scaffolded output dir and parse its trailing JSON line.
//
// Playwright and Stagehand runners (and any future TS target that follows the
// same {"success":boolean,"data":...} contract) call runTsxTarget with their
// per-framework tweaks: a label for stderr prefix, extra env (e.g.
// PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1), and an optional preflight check (e.g.
// "ANTHROPIC_API_KEY required for Stagehand").

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawnSync } from "node:child_process";

export function getArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

// Emit a JSON result line on stdout and exit. Centralized so the contract
// (single {passed:bool,...} JSON line, exit 0/2) is consistent across runners.
function emitAndExit(result) {
  console.log(JSON.stringify(result));
  process.exit(result.passed ? 0 : 2);
}

/**
 * Run a tsx target script against a fresh BB session.
 *
 * @param {object} opts
 * @param {string} opts.label                 stderr prefix, e.g. "playwright"
 * @param {Record<string,string>} [opts.extraEnv]  merged into the run's env
 * @param {Record<string,string>} [opts.installEnv] merged into npm install's env
 * @param {() => string|null} [opts.preflight]  return error message to fail fast
 */
export function runTsxTarget(opts) {
  const { label, extraEnv = {}, installEnv = {}, preflight } = opts;
  const outDir = getArg("out-dir");
  const script = getArg("script");

  if (!outDir || !script) {
    emitAndExit({ passed: false, error: "runner missing --out-dir or --script" });
  }

  const scriptPath = path.join(outDir, script);
  if (!fs.existsSync(scriptPath)) {
    emitAndExit({ passed: false, error: `script not found at ${scriptPath}` });
  }

  if (preflight) {
    const err = preflight();
    if (err) emitAndExit({ passed: false, error: err });
  }

  // Install deps when package.json changes. Gating purely on node_modules
  // existing is wrong when two frameworks share an --out dir: framework #2's
  // dropScaffold merges its deps into the existing package.json, but the
  // node_modules from framework #1's install is still missing them. We hash
  // package.json and compare against a stamp under node_modules/ to detect
  // that and re-install.
  const pkgPath = path.join(outDir, "package.json");
  const stampPath = path.join(outDir, "node_modules", ".codegen-pkg-hash");
  const pkgHash = fs.existsSync(pkgPath)
    ? crypto.createHash("sha256").update(fs.readFileSync(pkgPath)).digest("hex")
    : null;
  const stampedHash = fs.existsSync(stampPath)
    ? fs.readFileSync(stampPath, "utf-8").trim()
    : null;
  if (pkgHash && pkgHash !== stampedHash) {
    process.stderr.write(`[runner.${label}] installing deps in ${outDir}\n`);
    // Always set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 here, regardless of which
    // runner we are. In shared --out mode, framework #2 (e.g. stagehand) gets
    // playwright merged into its package.json by dropScaffold, so even runners
    // that don't list playwright in installEnv would still trigger its
    // postinstall and try to fetch hundreds of MB of chromium — exhausting
    // the 3min install budget. We never need bundled browsers (always CDP).
    const install = spawnSync("npm", ["install", "--silent", "--no-audit", "--no-fund"], {
      cwd: outDir,
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1", ...installEnv },
      timeout: 3 * 60 * 1000,
    });
    if (install.status !== 0) {
      emitAndExit({ passed: false, error: `npm install exited ${install.status}` });
    }
    try {
      fs.mkdirSync(path.dirname(stampPath), { recursive: true });
      fs.writeFileSync(stampPath, pkgHash);
    } catch {}
  }

  // Per-run screenshot dir, exposed to the script via SCREENSHOT_DIR so its
  // snap() helper can write progress / failure shots somewhere we can find.
  const screenshotDir = path.join(outDir, "screenshots", `verify-${Date.now()}`);
  fs.mkdirSync(screenshotDir, { recursive: true });

  process.stderr.write(`[runner.${label}] running ${scriptPath}\n`);
  const run = spawnSync("npx", ["tsx", script], {
    cwd: outDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...extraEnv, SCREENSHOT_DIR: screenshotDir },
    timeout: 5 * 60 * 1000,
  });

  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";

  // Parse the script's trailing JSON line — walk backward through lines and
  // take the last one that parses as JSON with a boolean `success` field.
  let parsed = null;
  const lines = stdout.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(lines[i]);
      if (typeof candidate?.success === "boolean") {
        parsed = candidate;
        break;
      }
    } catch {}
  }

  const passed = run.status === 0 && parsed?.success === true;
  const result = {
    passed,
    exit_code: run.status,
    script_output: parsed,
    screenshot_dir: screenshotDir,
    stderr_tail: stderr.slice(-2000),
  };
  if (!passed) {
    result.error = parsed?.error
      || (run.status !== 0 ? `script exited ${run.status}` : "script did not emit success:true");
  }
  emitAndExit(result);
}
