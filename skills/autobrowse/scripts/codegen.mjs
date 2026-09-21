#!/usr/bin/env node

/**
 * codegen.mjs — Convert a converged autobrowse trace into a runnable script in
 * one or more frameworks (Playwright, Stagehand, …).
 *
 * Pipeline per framework:
 *   1. Compose the context: task.md + unified-events.jsonl (when present) +
 *      descriptors.ndjson (when present) + strategy.md + the framework's
 *      cdp-bridge reference doc.
 *   2. Compute a cache key over (framework, prompt-template, task, trace,
 *      descriptors). Cache hit short-circuits with zero LLM cost.
 *   3. Single Anthropic completion against the framework's prompt template.
 *      Emit `<task>.<ext>` to the output dir.
 *   4. Drop the framework's scaffold files (package.json, tsconfig, …).
 *   5. If --verify: invoke the framework's runner against a fresh Browserbase
 *      session. On failure, feed the error back into a rewrite call up to
 *      --max-retries times.
 *
 * One JSON status line per framework on stdout. Non-zero exit if any selected
 * framework's final state is fail.
 *
 * Usage:
 *   node scripts/codegen.mjs --task <name> [options]
 *
 * Options:
 *   --task <name>                  task name under <workspace>/tasks/ (required)
 *   --workspace <dir>              default ./autobrowse
 *   --run <id>                     default: latest run-NNN with success: true
 *   --frameworks <a,b,...>         default: playwright
 *   --verify | --no-verify         default: --verify
 *   --max-retries <N>              rewrite-on-verify-failure cap (default: 2)
 *   --cache-dir <dir>              default <workspace>/codegen-cache
 *   --out <dir>                    default <workspace>/tasks/<name>/<framework>
 *   --prompt-template <path>       custom framework prompt (pair with --frameworks custom)
 *   --force                        bust cache
 *   --dry-run                      estimate cost without LLM call
 *   --cache-only                   error if cache miss (no LLM call)
 *   --model <name>                 override Claude model
 *   --help
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, "..");
const PROMPT_TEMPLATE_VERSION = "2"; // bump to invalidate cache after prompt edits or scaffold/runner contract changes

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;

// ── CLI ────────────────────────────────────────────────────────────

function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (n) => process.argv.includes(`--${n}`);

if (hasFlag("help") || hasFlag("h")) {
  console.log(`autobrowse codegen — produce runnable scripts from a converged trace

Usage: node scripts/codegen.mjs --task <name> [options]

Options:
  --task <name>                  task name under <workspace>/tasks/ (required)
  --workspace <dir>              default: ./autobrowse
  --run <id>                     specific run-NNN (default: newest passing)
  --frameworks <a,b,...>         comma list; default: playwright
                                 builtins: playwright, stagehand
  --verify | --no-verify         run the script in a fresh BB session (default: --verify)
  --max-retries <N>              cap rewrite-on-verify-fail loop (default: 2)
  --cache-dir <dir>              default: <workspace>/codegen-cache
  --out <dir>                    default: <workspace>/tasks/<name>/<framework>
  --prompt-template <path>       custom prompt template (pair with --frameworks=custom)
  --force                        ignore cache, regenerate
  --dry-run                      estimate cost; don't call the LLM
  --cache-only                   error if cache miss
  --model <name>                 default: ${DEFAULT_MODEL}

Env:
  ANTHROPIC_API_KEY              required for LLM call
  BROWSERBASE_API_KEY            required for --verify

Exits 0 if all selected frameworks ended in pass (or --no-verify), 2 if any
failed, 1 on harness error.`);
  process.exit(0);
}

const TASK = getArg("task");
if (!TASK) {
  console.error("ERROR: --task <name> is required. Pass --help for usage.");
  process.exit(1);
}
const WORKSPACE = path.resolve(getArg("workspace", "autobrowse"));
const FORCED_RUN = getArg("run");
const FRAMEWORKS = getArg("frameworks", "playwright").split(",").map((s) => s.trim()).filter(Boolean);
const VERIFY = !hasFlag("no-verify");
const MAX_RETRIES = parseInt(getArg("max-retries", "2"), 10);
const CACHE_DIR = path.resolve(getArg("cache-dir", path.join(WORKSPACE, "codegen-cache")));
const OUT_OVERRIDE = getArg("out");
const PROMPT_TEMPLATE_OVERRIDE = getArg("prompt-template");
const FORCE = hasFlag("force");
const DRY_RUN = hasFlag("dry-run");
const CACHE_ONLY = hasFlag("cache-only");
const MODEL = getArg("model", DEFAULT_MODEL);

// ── Inputs ─────────────────────────────────────────────────────────

const taskDir = path.join(WORKSPACE, "tasks", TASK);
const tracesDir = path.join(WORKSPACE, "traces", TASK);
const taskFile = path.join(taskDir, "task.md");

for (const [label, file] of [["task.md", taskFile]]) {
  if (!fs.existsSync(file)) {
    console.error(`ERROR: ${label} not found at ${file}. Run autobrowse first.`);
    process.exit(1);
  }
}

function pickRun() {
  if (FORCED_RUN) {
    // --run was passed; still confirm the directory exists. Without this we'd
    // happily call codegen with empty trace/events/descriptors and the LLM
    // would invent a script from just task.md + strategy.md, while logs
    // still report the forced run id as if it were a real input.
    const forcedDir = path.join(tracesDir, FORCED_RUN);
    if (!fs.existsSync(forcedDir)) return null;
    return FORCED_RUN;
  }
  if (!fs.existsSync(tracesDir)) return null;
  const runs = fs.readdirSync(tracesDir)
    .filter((d) => /^run-\d+$/.test(d))
    .sort()
    .reverse();
  for (const r of runs) {
    const summary = path.join(tracesDir, r, "summary.md");
    if (!fs.existsSync(summary)) continue;
    const text = fs.readFileSync(summary, "utf-8");
    if (/success:\s*true/.test(text) || /"success"\s*:\s*true/.test(text)) return r;
  }
  return null;
}

const RUN_ID = pickRun();
if (!RUN_ID) {
  if (FORCED_RUN) {
    console.error(`ERROR: --run ${FORCED_RUN} not found at ${path.join(tracesDir, FORCED_RUN)}.`);
  } else {
    console.error(`ERROR: no passing run found under ${tracesDir}. Pass --run <id> to force, or run autobrowse first.`);
  }
  process.exit(1);
}
const runDir = path.join(tracesDir, RUN_ID);

// Try multiple candidate paths for each input — autobrowse layouts have
// shifted over time and we want this to be robust to both modern and legacy.
function readFirstExisting(...candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return { path: p, content: fs.readFileSync(p, "utf-8") };
  }
  return null;
}

const taskMd = fs.readFileSync(taskFile, "utf-8");
const strategyMd = readFirstExisting(path.join(taskDir, "strategy.md"))?.content || "";
const traceJson = readFirstExisting(path.join(runDir, "trace.json"))?.content || "";
const unifiedEvents = readFirstExisting(path.join(runDir, "unified-events.jsonl"))?.content || "";
const descriptors = readFirstExisting(
  path.join(runDir, ".o11y", RUN_ID, "cdp", "descriptors.ndjson"),
  path.join(runDir, "cdp", "descriptors.ndjson"),
)?.content || "";

// ── Framework registry ────────────────────────────────────────────

const CODEGEN_DIR = path.join(SKILL_DIR, "codegen");
const REFERENCES_DIR = path.join(SKILL_DIR, "references");

function frameworkConfig(framework) {
  const promptPath = PROMPT_TEMPLATE_OVERRIDE && framework === "custom"
    ? path.resolve(PROMPT_TEMPLATE_OVERRIDE)
    : path.join(CODEGEN_DIR, "prompts", `${framework}.md`);
  const scaffoldDir = path.join(CODEGEN_DIR, "scaffolds", framework);
  const runnerPath = path.join(CODEGEN_DIR, "runners", `${framework}.mjs`);
  const extByFramework = { playwright: "ts", stagehand: "ts", puppeteer: "js", selenium: "py" };
  const ext = extByFramework[framework] || "ts";
  return { promptPath, scaffoldDir, runnerPath, ext };
}

// ── Context builder ───────────────────────────────────────────────

// Trim a stringified blob to a budget while keeping head + tail.
function clip(text, maxBytes) {
  if (text.length <= maxBytes) return text;
  const head = Math.floor(maxBytes * 0.7);
  const tail = maxBytes - head - 64;
  return text.slice(0, head) + `\n\n…[truncated ${text.length - head - tail} bytes]…\n\n` + text.slice(-tail);
}

function buildContext({ promptTemplate, cdpBridgeDoc, previousAttempt, verifyFailure }) {
  const parts = [];
  parts.push("# Task\n\n" + taskMd.trim());
  if (strategyMd.trim()) parts.push("# Strategy notes\n\n" + strategyMd.trim());
  if (cdpBridgeDoc) parts.push("# Reference: Playwright ↔ Browserbase bridge\n\n" + cdpBridgeDoc.trim());
  if (unifiedEvents.trim()) {
    parts.push("# Unified events (agent + browser, time-ordered)\n\n```\n" + clip(unifiedEvents, 32_000) + "\n```");
  } else if (traceJson.trim()) {
    parts.push("# Trace (agent turns)\n\n```json\n" + clip(traceJson, 32_000) + "\n```");
  }
  if (descriptors.trim()) {
    parts.push("# Descriptors (per-command DOM target)\n\n```\n" + clip(descriptors, 16_000) + "\n```");
  }
  if (previousAttempt && verifyFailure) {
    parts.push(
      "# Previous attempt and the verify failure\n\nYour previous attempt was:\n\n```\n" +
      clip(previousAttempt, 12_000) +
      "\n```\n\nIt failed verification with:\n\n```\n" +
      clip(verifyFailure, 4_000) +
      "\n```\n\nFix the issue and emit a complete corrected script.",
    );
  }
  return promptTemplate.trim() + "\n\n" + parts.join("\n\n");
}

// ── Cache ─────────────────────────────────────────────────────────

function hashContent(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}
function cacheKey(framework, promptTemplate) {
  return hashContent([
    "v" + PROMPT_TEMPLATE_VERSION,
    framework,
    hashContent(promptTemplate),
    hashContent(taskMd),
    hashContent(traceJson),
    hashContent(unifiedEvents),
    hashContent(descriptors),
    hashContent(strategyMd),
  ].join("|"));
}
function readCache(key) {
  const p = path.join(CACHE_DIR, `${key}.txt`);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}
function writeCache(key, content) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.txt`), content);
}

// ── LLM call ──────────────────────────────────────────────────────

let _anthropic = null;
function anthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new Error("ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) is required for codegen.");
    }
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

async function callLlm(systemPrompt, userMessage) {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  // The agent might emit fences anyway; strip a single outer code block.
  const fenced = text.match(/^```[\w-]*\n([\s\S]*?)\n```\s*$/);
  const code = fenced ? fenced[1] : text.trim();
  const cost = (res.usage?.input_tokens ?? 0) * 3e-6 + (res.usage?.output_tokens ?? 0) * 15e-6;
  return { code, cost, tokens: res.usage };
}

// ── Scaffold + write output ───────────────────────────────────────

// Scaffold version pins. Each framework's scaffold/package.json references
// these via {{PLAYWRIGHT_VERSION}} / {{STAGEHAND_VERSION}} / etc. so callers
// can canary a new release without forking — set the corresponding env var.
// Loose semver guard rejects shell-injection shapes before they hit npm.
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
function resolveVersion(envName, fallback) {
  const raw = process.env[envName];
  if (!raw) return fallback;
  if (!VERSION_RE.test(raw)) {
    throw new Error(`${envName}="${raw}" is not a valid X.Y.Z[-tag] version`);
  }
  return raw;
}
const SCAFFOLD_VERSIONS = {
  PLAYWRIGHT_VERSION: resolveVersion("PLAYWRIGHT_VERSION", "1.50.0"),
  STAGEHAND_VERSION: resolveVersion("STAGEHAND_VERSION", "3.4.0"),
  TSX_VERSION: resolveVersion("TSX_VERSION", "4.22.3"),
  ZOD_VERSION: resolveVersion("ZOD_VERSION", "4.4.3"),
  DOTENV_VERSION: resolveVersion("DOTENV_VERSION", "16.4.5"),
};

function templateInterpolate(content, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    content,
  );
}

function dropScaffold(scaffoldDir, outDir, taskName, scriptBasename) {
  if (!fs.existsSync(scaffoldDir)) return;
  // Two distinct template vars: TASK is the slug (used in package name),
  // SCRIPT is the actual filename (used in the start script). They diverge
  // in --out mode where files are named <framework>.ts but TASK is the
  // task slug — without SCRIPT, `npm start` would invoke a missing file.
  const vars = { TASK: taskName, SCRIPT: scriptBasename, ...SCAFFOLD_VERSIONS };
  for (const entry of fs.readdirSync(scaffoldDir)) {
    const src = path.join(scaffoldDir, entry);
    const dst = path.join(outDir, entry);
    const content = templateInterpolate(fs.readFileSync(src, "utf-8"), vars);
    // Special-case package.json: when --out is shared across frameworks (e.g.
    // browse.sh passes one dir for playwright+stagehand), the first framework
    // writes its package.json and the second must MERGE its dependencies in,
    // not skip. Otherwise the second framework's `node_modules` lacks its own
    // runtime deps (e.g. @browserbasehq/stagehand) and verify can never pass.
    if (entry === "package.json" && fs.existsSync(dst)) {
      try {
        const existing = JSON.parse(fs.readFileSync(dst, "utf-8"));
        const incoming = JSON.parse(content);
        existing.dependencies = {
          ...(existing.dependencies || {}),
          ...(incoming.dependencies || {}),
        };
        existing.devDependencies = {
          ...(existing.devDependencies || {}),
          ...(incoming.devDependencies || {}),
        };
        fs.writeFileSync(dst, JSON.stringify(existing, null, 2) + "\n");
        continue;
      } catch {
        // Fall through to never-overwrite policy if either side is malformed.
      }
    }
    if (fs.existsSync(dst)) continue; // never overwrite a user's file
    fs.writeFileSync(dst, content);
  }
}

// ── Verify ────────────────────────────────────────────────────────

function verify(framework, outDir, scriptBasename) {
  const { runnerPath } = frameworkConfig(framework);
  if (!fs.existsSync(runnerPath)) {
    return { passed: false, error: `no runner for framework "${framework}" at ${runnerPath}`, runner_missing: true };
  }
  // The parent timeout must exceed the runner's worst case: tsx-runner allows
  // up to 3min for npm install + 5min for the tsx run = 8min, plus slack for
  // process startup and the trailing-JSON parse. 10min keeps us safely above
  // that so a healthy slow run isn't killed mid-flight.
  const res = spawnSync("node", [runnerPath, "--out-dir", outDir, "--script", scriptBasename], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    timeout: 10 * 60 * 1000,
  });
  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  // Runners must emit a final JSON line: {"passed":true,...} or {"passed":false,...}
  const lastLine = stdout.trim().split("\n").pop() || "";
  let parsed = null;
  try { parsed = JSON.parse(lastLine); } catch {}
  if (parsed && typeof parsed.passed === "boolean") {
    return { ...parsed, stdout, stderr };
  }
  return { passed: false, error: `runner did not emit a {passed:boolean} JSON line; exit=${res.status}`, stdout, stderr };
}

// ── Per-framework pipeline ────────────────────────────────────────

async function generateOne(framework) {
  const cfg = frameworkConfig(framework);
  if (!fs.existsSync(cfg.promptPath)) {
    return { framework, passed: false, error: `no prompt template for "${framework}" at ${cfg.promptPath}` };
  }
  const promptTemplate = fs.readFileSync(cfg.promptPath, "utf-8");
  const cdpBridgeDoc = fs.existsSync(path.join(REFERENCES_DIR, "playwright-cdp-bridge.md"))
    ? fs.readFileSync(path.join(REFERENCES_DIR, "playwright-cdp-bridge.md"), "utf-8")
    : "";

  // Filename + outDir convention:
  //  - default mode (--out unset): per-framework subdir, file named after the
  //    task, so the dir feels like a standalone project — e.g.
  //    tasks/<task>/playwright/<task>.ts  with its own package.json.
  //  - --out mode: caller is flattening into someone else's tree (e.g.
  //    browse.sh's /tmp/skill/{domain}/{task}/), so we use the framework
  //    name as the filename — playwright.ts + stagehand.ts in the same dir,
  //    no collision.
  const outDir = OUT_OVERRIDE ? path.resolve(OUT_OVERRIDE) : path.join(taskDir, framework);
  const scriptBasename = OUT_OVERRIDE ? `${framework}.${cfg.ext}` : `${TASK}.${cfg.ext}`;
  fs.mkdirSync(outDir, { recursive: true });
  const scriptPath = path.join(outDir, scriptBasename);

  // Cache lookup
  const key = cacheKey(framework, promptTemplate);
  let cached = !FORCE ? readCache(key) : null;
  if (CACHE_ONLY && !cached) {
    return { framework, passed: false, error: `--cache-only set but no cached output for key ${key}` };
  }

  if (DRY_RUN) {
    const ctx = buildContext({ promptTemplate, cdpBridgeDoc });
    const bytes = ctx.length;
    const estCost = (bytes / 4) * 3e-6; // ~4 chars/token, $3/M in
    return { framework, dryRun: true, prompt_bytes: bytes, estimated_cost_usd: Number(estCost.toFixed(4)) };
  }

  // `attempts` counts emitted-script-versions. Cached and uncached both start
  // at 1 (the script-on-disk is one version, whether the LLM just wrote it or
  // we restored it from cache). The retry loop below then increments per
  // rewrite, bounded by --max-retries. Initializing to 0 on a cache hit gave
  // cached runs one extra rewrite vs uncached — caught by Bugbot.
  let code, cost = 0, attempts = 1;
  if (cached) {
    code = cached;
  } else {
    const ctx = buildContext({ promptTemplate, cdpBridgeDoc });
    const { code: c, cost: k } = await callLlm(
      "You are an expert browser-automation engineer. Output ONLY the contents of the script file — no preamble, no explanation, no markdown fences. The script must be runnable as-is.",
      ctx,
    );
    code = c;
    cost += k;
    writeCache(key, code);
  }

  fs.writeFileSync(scriptPath, code);
  dropScaffold(cfg.scaffoldDir, outDir, TASK, scriptBasename);

  if (!VERIFY) {
    return { framework, passed: true, scriptPath, cached: !!cached, verify_skipped: true, cost_usd: cost };
  }

  // Verify loop with rewrite-on-failure
  let lastVerify = verify(framework, outDir, scriptBasename);
  while (!lastVerify.passed && attempts < MAX_RETRIES + 1) {
    if (lastVerify.runner_missing) break;
    // --cache-only forbids ANY LLM call, including the rewrite path. Without
    // this guard a cached script that fails verify would still burn quota
    // through the rewrite loop, contradicting the documented "no LLM call"
    // CI behavior.
    if (CACHE_ONLY) break;
    attempts++;
    const previousCode = code;
    const failureContext =
      (lastVerify.error || "") +
      "\n\nstderr:\n" + (lastVerify.stderr || "").slice(-2000) +
      "\nstdout:\n" + (lastVerify.stdout || "").slice(-2000);
    const ctx = buildContext({
      promptTemplate,
      cdpBridgeDoc,
      previousAttempt: previousCode,
      verifyFailure: failureContext,
    });
    const { code: c, cost: k } = await callLlm(
      "You are an expert browser-automation engineer. Output ONLY the corrected script file — no preamble, no explanation, no markdown fences.",
      ctx,
    );
    code = c;
    cost += k;
    fs.writeFileSync(scriptPath, code);
    writeCache(key, code); // overwrite cache with the latest attempt
    lastVerify = verify(framework, outDir, scriptBasename);
  }

  return {
    framework,
    passed: lastVerify.passed,
    scriptPath,
    cached: !!cached && cost === 0,
    verify_attempts: attempts,
    last_error: lastVerify.passed ? null : (lastVerify.error || lastVerify.stderr?.slice(-200) || null),
    cost_usd: Number(cost.toFixed(4)),
  };
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.error(`[codegen] task=${TASK} run=${RUN_ID} frameworks=[${FRAMEWORKS.join(",")}] verify=${VERIFY}`);
  let anyFailed = false;
  for (const framework of FRAMEWORKS) {
    try {
      const result = await generateOne(framework);
      console.log(JSON.stringify(result));
      if (result.passed === false) anyFailed = true;
    } catch (err) {
      console.log(JSON.stringify({ framework, passed: false, error: err.message }));
      anyFailed = true;
    }
  }
  process.exit(anyFailed ? 2 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err.stack || err.message);
  process.exit(1);
});
