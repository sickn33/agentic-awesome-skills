#!/usr/bin/env node
/**
 * delegate-skills · vibe-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to the Mistral Vibe CLI (`vibe --prompt`),
 * capture the run, and write a structured result the orchestrating agent can
 * review. The orchestrator runs this one command and reads the result JSON —
 * every Vibe-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `vibe`, `git`, and Windows `taskkill` for
 * process-tree termination. The `vibe` process it launches does authenticate —
 * exactly as you do at the terminal. Read this file before you run it.
 *
 * Note: `vibe --prompt` takes the prompt as a command-line argument, so the
 * brief is visible in the host process list (`ps`, /proc). On a shared machine
 * keep secrets out of the brief — reference them by a path or environment
 * variable the workspace can read.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's job
 * — after it reviews the diff and re-runs the project gates.
 *
 * Default mode uses Vibe's `accept-edits` agent, which auto-approves its
 * built-in file edits while other tools remain unapproved in headless mode.
 * `--full-access` explicitly opts into `auto-approve`; `--plan-only` selects
 * Vibe's read-only `plan` agent.
 *
 * Upstream Vibe works on Windows but officially supports and targets UNIX. This
 * repository has not smoke-tested the relay's native Windows launch.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>           Path to the brief. If omitted, read it from stdin.
 *   --cd <dir>               Working root for Vibe (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --max-turns <n>          Maximum number of Vibe agent turns (--max-turns).
 *   --max-price <usd>        Indicative cost threshold in USD (--max-price);
 *                            not a hard budget.
 *   --max-tokens <n>         Maximum cumulative session tokens (--max-tokens).
 *   --session <id>           Resume a specific Vibe session (--resume SESSION_ID);
 *                            send only the delta brief.
 *   --resume-last            Resume the most recent Vibe session (--continue);
 *                            send only the delta brief.
 *   --plan-only              Use Vibe's read-only plan agent.
 *   --full-access            Use Vibe's auto-approve agent; all tool executions
 *                            are approved. Mutually exclusive with --plan-only.
 *   --enabled-tools <tool>   Enable only this tool (--enabled-tools). Repeatable.
 *   --disabled-tools <tool>  Disable this tool (--disabled-tools). Repeatable.
 *   --timeout <dur>          Relay-side watchdog (default: 30m). Vibe has no
 *                            timeout flag; durations use h/m/s strings.
 *   --out-dir <dir>          Where to write run artifacts (default: a fresh dir
 *                            under the system temp dir).
 *   -h, --help               Show this help.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout —
 *   status, exitCode, signal, vibeVersion, agent, finalMessage (the last
 *   assistant message), touchedFiles (git porcelain, null if git cannot report),
 *   and paths to brief.txt, final.txt, events.jsonl, and stderr.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief) exits 2
 * before any run and writes no result file; a missing `vibe` binary exits 127;
 * otherwise the exit code mirrors Vibe's own (0 success, non-zero failure). If
 * the child dies on a signal, the exit code is 128 plus the signal number and
 * `result.json` records the signal. Once the run artifacts are prepared,
 * `result.json` is written on every outcome — completed, failed, timeout, aborted, or
 * vibe_unavailable.
 */

import {spawn, execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { constants, tmpdir } from "node:os";
import { StringDecoder } from "node:string_decoder";
const MAX_BUFFERED_CHARS = 1_048_576;

const DEFAULT_TIMEOUT = "30m";
const MAX_TIMER_MS = 2_147_483_647;
const MAX_BRIEF_BYTES = (process.platform === "win32" ? 12 : 120) * 1024;
const PROBE_TIMEOUT_MS = 10_000;

const IMPLEMENTER_KEY = "vibe";

function makeLineScanner(onObject) {
  let buf = "";
  return (chunk) => {
    if (!chunk) return;
    let start = 0;
    for (;;) {
      const end = chunk.indexOf("\n", start);
      if (end === -1) break;
      const line = buf + chunk.slice(start, end);
      buf = "";
      const trimmed = line.trim();
      if (trimmed) {
        try { onObject(JSON.parse(trimmed)); } catch { /* skip non-JSON lines */ }
      }
      start = end + 1;
    }
    buf += chunk.slice(start);
    if (buf.length > MAX_BUFFERED_CHARS) buf = "";
  };
}

function applyFleetLane(opts, flagged) {
  if (!opts.lane) return;
  const script = join(dirname(fileURLToPath(import.meta.url)), "../../delegate-setup/scripts/lane.mjs");
  if (!existsSync(script)) {
    fail("--lane requires the delegate-setup skill installed beside this relay");
  }
  const r = spawnSync(
    process.execPath,
    [script, "resolve", "--cwd", opts.cd, "--lane", opts.lane, "--implementer", IMPLEMENTER_KEY],
    { encoding: "utf8", env: process.env },
  );
  if (r.error) fail(`lane resolve failed: ${r.error.message}`);
  if (r.status !== 0) {
    fail((r.stderr || "lane resolve failed").trim().replace(/^lane\.mjs:\s*/, ""));
  }
  let resolved;
  try {
    const lines = (r.stdout || "").trim().split("\n").filter(Boolean);
    resolved = JSON.parse(lines[lines.length - 1]);
  } catch {
    fail("lane resolve returned invalid JSON");
  }
  opts.laneSource = resolved.source;
  for (const [field, value] of Object.entries(resolved.dials || {})) {
    if (flagged.has(field)) continue;
    if (field === "autonomy" && (flagged.has("autonomy") || flagged.has("sandbox") || flagged.has("readOnly"))) continue;
    if (field === "agent" && (flagged.has("agent") || flagged.has("readOnly"))) continue;
    if (field === "sandbox" && (flagged.has("sandbox") || flagged.has("readOnly"))) continue;
    if (field === "permissionMode" && (flagged.has("permissionMode") || flagged.has("readOnly"))) continue;
    if (
      field === "planOnly" &&
      (flagged.has("planOnly") || flagged.has("readOnly") || flagged.has("fullAccess"))
    ) {
      continue;
    }
    if (
      field === "readOnly" &&
      (flagged.has("readOnly") || flagged.has("fullAccess"))
    ) {
      continue;
    }
    if (field === "force" && flagged.has("force")) continue;
    if (!["maxTurns", "maxPrice", "maxTokens", "timeout", "planOnly"].includes(field)) {
      fail(`unsupported fleet lane dial: ${field}; permission changes require explicit CLI flags`);
    }
    opts[field] = value;
  }
}

function fail(message, code = 2) {
  process.stderr.write(`relay: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const flagged = new Set();
  const opts = {
    lane: null,
    laneSource: null,
    brief: null,
    cd: process.cwd(),
    maxTurns: null,
    maxPrice: null,
    maxTokens: null,
    session: null,
    resumeLast: false,
    planOnly: false,
    fullAccess: false,
    enabledTools: [],
    disabledTools: [],
    timeout: DEFAULT_TIMEOUT,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) fail(`${arg} requires a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(headerComment());
        process.exit(0);
        break;
      case "--brief": opts.brief = next(); break;
      case "--cd": opts.cd = resolve(next()); break;
      case "--lane": opts.lane = next(); break;
      case "--max-turns": {
        const v = next();
        const n = Number(v);
        if (!/^[1-9]\d*$/.test(v) || !Number.isSafeInteger(n)) {
          fail(`--max-turns must be a positive safe integer; got: ${v}`);
        }
        opts.maxTurns = n;
        break;
      }
      case "--max-price": {
        const v = next();
        const n = Number(v);
        if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v) || !Number.isFinite(n) || n <= 0) {
          fail(`--max-price must be a positive decimal number; got: ${v}`);
        }
        opts.maxPrice = n;
        break;
      }
      case "--max-tokens": {
        const v = next();
        const n = Number(v);
        if (!/^[1-9]\d*$/.test(v) || !Number.isSafeInteger(n)) {
          fail(`--max-tokens must be a positive safe integer; got: ${v}`);
        }
        opts.maxTokens = n;
        break;
      }
      case "--session": opts.session = next(); break;
      case "--resume-last": opts.resumeLast = true; break;
      case "--plan-only": opts.planOnly = true; flagged.add("planOnly"); flagged.add("readOnly"); break;
      case "--full-access":
        opts.fullAccess = true;
        flagged.add("fullAccess");
        flagged.add("planOnly");
        flagged.add("readOnly");
        break;
      case "--enabled-tools": opts.enabledTools.push(next()); break;
      case "--disabled-tools": opts.disabledTools.push(next()); break;
      case "--timeout": opts.timeout = next(); flagged.add("timeout"); break;
      case "--out-dir": opts.outDir = resolve(next()); break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }
  applyFleetLane(opts, flagged);
  if (opts.resumeLast && opts.session) {
    fail("--resume-last and --session are mutually exclusive; pass only one");
  }
  if (opts.session !== null && !opts.session.trim()) fail("--session must not be empty");
  if (opts.planOnly && opts.fullAccess) {
    fail("--plan-only and --full-access are mutually exclusive");
  }
  if (opts.enabledTools.some((tool) => !tool.trim())) fail("--enabled-tools must not be empty");
  if (opts.disabledTools.some((tool) => !tool.trim())) fail("--disabled-tools must not be empty");
  // The watchdog is relay-only (vibe has no timeout flag), so a malformed
  // --timeout must fail loudly here — a silent 30m fallback would be wrong.
  if (parseDuration(opts.timeout) === null) {
    fail(`--timeout "${opts.timeout}" is invalid or too long; use a positive h/m/s duration no longer than about 24 days`);
  }
  try {
    if (!statSync(opts.cd).isDirectory()) fail(`--cd is not a directory: ${opts.cd}`);
  } catch {
    fail(`--cd directory not found: ${opts.cd}`);
  }
  if (opts.outDir && existsSync(opts.outDir)) {
    try {
      if (!statSync(opts.outDir).isDirectory()) fail(`--out-dir is not a directory: ${opts.outDir}`);
    } catch {
      fail(`cannot inspect --out-dir: ${opts.outDir}`);
    }
  }
  return opts;
}

function headerComment() {
  // The leading block comment doubles as --help text.
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const match = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "relay.mjs - dispatch a brief to vibe --prompt\n";
  return `${match[1].replace(/^\s*\* ?/gm, "").trim()}\n`;
}

function readBrief(opts) {
  if (opts.brief) {
    if (!existsSync(opts.brief)) fail(`brief file not found: ${opts.brief}`);
    return readFileSync(opts.brief, "utf8");
  }
  if (process.stdin.isTTY) {
    fail("no --brief given and stdin is a TTY; pass --brief <file> or pipe the brief on stdin");
  }
  let stdin = "";
  try {
    stdin = readFileSync(0, "utf8");
  } catch {
    stdin = "";
  }
  return stdin;
}

function vibeVersion(timeoutMs) {
  try {
    return {
      version: execFileSync("vibe", ["--version"], {
        encoding: "utf8",
        timeout: Math.min(timeoutMs, PROBE_TIMEOUT_MS),
        killSignal: "SIGKILL",
      }).trim() || "unknown",
      error: null,
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: null, error: null };
    return { version: null, error };
  }
}

function parseDuration(duration) {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(duration);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  try {
    const seconds =
      BigInt(match[1] || 0) * 3600n +
      BigInt(match[2] || 0) * 60n +
      BigInt(match[3] || 0);
    const milliseconds = seconds * 1000n;
    if (milliseconds <= 0n || milliseconds > BigInt(MAX_TIMER_MS)) return null;
    return Number(milliseconds);
  } catch {
    return null;
  }
}

function gitTouchedFiles(cwd) {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return output.split("\n").map((line) => line.trimEnd()).filter(Boolean);
  } catch {
    return null;
  }
}

function killChild(child, signal = "SIGTERM") {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    if (signal !== "SIGTERM") return;
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: ["ignore", "ignore", "inherit"],
      });
    } catch {
      // The process tree already exited.
    }
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process group already exited.
    }
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function agentName(opts) {
  if (opts.planOnly) return "plan";
  if (opts.fullAccess) return "auto-approve";
  return "accept-edits";
}

function buildArgv(opts, brief) {
  const argv = [
    "--output", "streaming",
    "--agent", agentName(opts),
    "--trust",
  ];
  if (opts.maxTurns != null) argv.push("--max-turns", String(opts.maxTurns));
  if (opts.maxPrice != null) argv.push("--max-price", String(opts.maxPrice));
  if (opts.maxTokens != null) argv.push("--max-tokens", String(opts.maxTokens));
  if (opts.session) argv.push("--resume", opts.session);
  else if (opts.resumeLast) argv.push("--continue");
  for (const tool of opts.enabledTools) argv.push("--enabled-tools", tool);
  for (const tool of opts.disabledTools) argv.push("--disabled-tools", tool);
  // Use --prompt=<brief>, not a separate ["--prompt", brief] pair: the equals
  // form binds a brief that starts with "-" instead of letting it parse as a flag.
  argv.push(`--prompt=${brief}`);
  return argv;
}

function extractFromEvent(obj, textChunks) {
  if (!obj || typeof obj !== "object") return;

  // Primary format: { role: "assistant", content: "..." }
  if (obj.role === "assistant") {
    const content =
      typeof obj.content === "string"
        ? obj.content
        : Array.isArray(obj.content)
          ? obj.content
              .filter((c) => c && c.type === "text")
              .map((c) => (typeof c.text === "string" ? c.text : ""))
              .join("")
          : "";
    if (content) {
      textChunks.length = 0;
      textChunks.push(content.slice(-MAX_BUFFERED_CHARS));
    }
    return;
  }
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  let outDir;
  if (opts.outDir) {
    // A fresh directory prevents artifact overwrite and linked-file clobbering.
    mkdirSync(opts.outDir, { recursive: false, mode: 0o700 });
    outDir = opts.outDir;
  } else {
    outDir = mkdtempSync(join(tmpdir(), "vibe-relay-"));
  }
  const run = {
    startedAt,
    briefPath: join(outDir, "brief.txt"),
    finalPath: join(outDir, "final.txt"),
    eventsPath: join(outDir, "events.jsonl"),
    stderrPath: join(outDir, "stderr.txt"),
    resultPath: join(outDir, "result.json"),
  };
  rmSync(run.finalPath, { force: true });
  rmSync(run.resultPath, { force: true });
  writeFileSync(run.briefPath, brief, "utf8");
  writeFileSync(run.eventsPath, "", "utf8");
  writeFileSync(run.stderrPath, "", "utf8");
  return run;
}

function makeResultWriter(opts, version, run) {
  return (extra) => {
    const result = {
      schema: "delegate-relay.result.v1",
      lane: opts.lane,
      laneSource: opts.laneSource,
      tool: "vibe",
      workdir: opts.cd,
      agent: agentName(opts),
      maxTurns: opts.maxTurns,
      maxPrice: opts.maxPrice,
      maxTokens: opts.maxTokens,
      resumed: Boolean(opts.resumeLast || opts.session),
      sessionId: null,
      vibeVersion: version,
      startedAt: run.startedAt,
      finishedAt: new Date().toISOString(),
      briefPath: run.briefPath,
      finalPath: existsSync(run.finalPath) ? run.finalPath : null,
      eventsPath: run.eventsPath,
      stderrPath: run.stderrPath,
      ...extra,
    };
    const temporary = `${run.resultPath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    renameSync(temporary, run.resultPath);
    return result;
  };
}

function reportUnavailable(opts, writeResult, resultPath) {
  const result = writeResult({
    status: "vibe_unavailable",
    exitCode: 127,
    signal: null,
    finalMessage: "",
    touchedFiles: gitTouchedFiles(opts.cd),
  });
  printSummary(result, resultPath);
  process.stderr.write(
    "relay: `vibe` not found on PATH. Install `uv`, run `uv tool install mistral-vibe`, and configure MISTRAL_API_KEY.\n",
  );
  process.exit(127);
}

function reportVersionFailure(opts, writeResult, run, error, timeoutMs) {
  const timedOut = error?.code === "ETIMEDOUT";
  const stderr = String(error?.stderr || "").trim();
  if (stderr) writeFileSync(run.stderrPath, `${stderr}\n`, "utf8");
  const message = timedOut
    ? `vibe --version preflight timed out after ${Math.min(timeoutMs, PROBE_TIMEOUT_MS)}ms; Vibe was not dispatched`
    : `vibe --version preflight failed${Number.isInteger(error?.status) ? ` with exit ${error.status}` : ""}; Vibe was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error?.status) ? error.status : 1,
    signal: null,
    finalMessage: "",
    touchedFiles: gitTouchedFiles(opts.cd),
    ...(stderr ? { stderrTail: stderr.split("\n").slice(-20) } : {}),
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function installPreflightSignalHandlers(opts, run, writeResult) {
  let active = true;
  const handlers = new Map();
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    const handler = () => {
      if (!active) return;
      active = false;
      const result = writeResult({
        status: "aborted",
        exitCode: 128 + (constants.signals[sig] || 15),
        signal: sig,
        finalMessage: "",
        touchedFiles: gitTouchedFiles(opts.cd),
        error: `the relay was killed by ${sig} during the vibe version preflight; Vibe was not dispatched`,
      });
      printSummary(result, run.resultPath);
      process.exit(result.exitCode);
    };
    handlers.set(sig, handler);
    process.on(sig, handler);
  }
  return () => {
    active = false;
    for (const [sig, handler] of handlers) process.off(sig, handler);
  };
}

function dispatchToVibe(opts, brief, run, writeResult, onReady) {
  const child = spawn("vibe", buildArgv(opts, brief), {
    cwd: opts.cd,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  const textChunks = [];
  const stderrTail = [];

  // Decode across chunk boundaries: a multibyte UTF-8 character split between
  // two data events would otherwise decode as U+FFFD and corrupt the report.
  // Files get the raw bytes; only in-memory parsing goes through the decoders.
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  const scan = makeLineScanner((obj) => extractFromEvent(obj, textChunks));

  child.stdout.on("data", (chunk) => {
    appendFileSync(run.eventsPath, chunk);
    scan(stdoutDecoder.write(chunk));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    appendFileSync(run.stderrPath, chunk);
    const text = stderrDecoder.write(chunk);
    for (const line of text.split("\n")) {
      if (line.trim()) stderrTail.push(line.trimEnd());
    }
    while (stderrTail.length > 20) stderrTail.shift();
  });

  const assembleFinal = () => {
    const message = textChunks.at(-1) || "";
    if (message) writeFileSync(run.finalPath, message, "utf8");
    return message;
  };

  let settled = false;
  let watchdogFired = false;
  let sigkillTimer = null;
  const timeoutMs = parseDuration(opts.timeout) ?? parseDuration(DEFAULT_TIMEOUT);
  const watchdogTimer = setTimeout(() => {
    watchdogFired = true;
    child.once("exit", () => {
      child.stdout.destroy();
      child.stderr.destroy();
    });
    killChild(child);
    sigkillTimer = setTimeout(() => {
      if (!settled) killChild(child, "SIGKILL");
    }, 10_000);
  }, timeoutMs);

  const clearWatchdog = () => {
    clearTimeout(watchdogTimer);
    if (sigkillTimer) clearTimeout(sigkillTimer);
  };

  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(sig, () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      const exitCode = 128 + (constants.signals[sig] || 15);
      let finalized = false;
      const finishAbort = () => {
        if (finalized) return;
        finalized = true;
        if (sigkillTimer) clearTimeout(sigkillTimer);
        killChild(child, "SIGKILL");
        const result = writeResult({
          status: "aborted",
          exitCode,
          signal: sig,
          finalMessage: assembleFinal(),
          touchedFiles: gitTouchedFiles(opts.cd),
          stderrTail: stderrTail.slice(-20),
          error: `the relay was killed by ${sig}; vibe was terminated with it — inspect the working tree before re-dispatching`,
        });
        printSummary(result, run.resultPath);
        process.exit(exitCode);
      };
      child.once("exit", finishAbort);
      killChild(child);
      sigkillTimer = setTimeout(finishAbort, 2000);
    });
  }
  onReady();

  // A grandchild that outlives vibe and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once vibe itself is
  // gone the pipes hold nothing we still need, so drop them after a short drain grace and let
  // "close" run. This is the normal-exit twin of the stream teardown the watchdog already
  // does on the timeout path.
  child.once("exit", () => {
    // The implementer already exited. Leaving the watchdog armed lets a drain that
    // overlaps the remaining budget fire, set watchdogFired, and report timeout.
    if (!watchdogFired) clearWatchdog();
    const drain = setTimeout(() => {
      if (settled) return;
      child.stdout.destroy();
      child.stderr.destroy();
    }, 500);
    if (typeof drain.unref === "function") drain.unref();
  });

  child.on("error", (err) => {
    if (settled) return;
    settled = true;
    clearWatchdog();
    const result = writeResult({
      status: "failed",
      exitCode: 1,
      signal: null,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      stderrTail: stderrTail.slice(-20),
      error: String(err && err.message ? err.message : err),
    });
    printSummary(result, run.resultPath);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (settled) return;
    settled = true;
    clearWatchdog();
    if (watchdogFired) killChild(child, "SIGKILL");
    // Force a delimiter so a final event without a trailing newline still parses:
    // the line scanner retains an un-newlined tail, and end() alone can hand it "".
    scan(`${stdoutDecoder.end()}\n`);
    const stderrEnd = stderrDecoder.end();
    if (stderrEnd.trim()) stderrTail.push(stderrEnd.trimEnd());
    const succeeded = code === 0 && !watchdogFired;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    const exitCode = succeeded ? 0 : mapped === 0 ? 1 : mapped;
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode,
      signal: signal ?? null,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired
        ? {
            error: `vibe did not finish within --timeout ${opts.timeout}; killed by the relay watchdog`,
          }
        : {}),
    });
    printSummary(result, run.resultPath);
    process.exit(result.exitCode);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("empty brief (pass --brief <file> or pipe the brief on stdin)");
  if (brief.includes("\0")) fail("brief contains a NUL byte, which cannot be passed in --prompt");

  // vibe --prompt takes the prompt as a CLI argument, so the brief rides argv.
  // The OS caps command arguments; reject a huge brief before an opaque spawn
  // failure (Windows has the smaller limit).
  const briefBytes = Buffer.byteLength(brief, "utf8");
  if (briefBytes > MAX_BRIEF_BYTES) {
    fail(
      `brief is ${Math.round(briefBytes / 1024)}KB; keep large context in workspace files instead of argv`,
    );
  }

  const run = prepareRunDir(opts, brief);
  const timeoutMs = parseDuration(opts.timeout) ?? parseDuration(DEFAULT_TIMEOUT);
  let writeResult = makeResultWriter(opts, null, run);
  const clearPreflightSignals = installPreflightSignalHandlers(opts, run, writeResult);
  const probe = vibeVersion(timeoutMs);
  // execFileSync defers JS signal handlers; yield once so a signal received
  // during the bounded preflight becomes "aborted" before any dispatch.
  await new Promise((resolve) => setImmediate(resolve));
  writeResult = makeResultWriter(opts, probe.version, run);
  if (!probe.version && !probe.error) {
    clearPreflightSignals();
    return reportUnavailable(opts, writeResult, run.resultPath);
  }
  if (probe.error) {
    clearPreflightSignals();
    return reportVersionFailure(opts, writeResult, run, probe.error, timeoutMs);
  }
  dispatchToVibe(opts, brief, run, writeResult, clearPreflightSignals);
}

function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(
    `relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""})  ·  vibe ${result.vibeVersion ?? "?"}`,
  );
  if (result.signal === "SIGKILL" && result.status === "failed") {
    lines.push(
      "hint: the host killed the process (commonly the OOM killer or a supervisor timeout) — this is not a vibe error; check host memory and re-dispatch, or split the task into smaller briefs.",
    );
  }
  if (result.signal === "SIGTERM" && result.status === "failed") {
    lines.push(
      "hint: something outside the relay terminated vibe; relay watchdogs and relay signals report timeout or aborted instead.",
    );
  }
  if (result.resumed) lines.push("mode: resumed an existing session");
  const touched = result.touchedFiles;
  if (touched === null) {
    lines.push("touched files: git unavailable - inspect the working tree directly");
  } else {
    lines.push(`touched files: ${touched.length}`);
    for (const file of touched.slice(0, 40)) lines.push(`  ${file}`);
    if (touched.length > 40) lines.push(`  ... and ${touched.length - 40} more`);
  }
  if (result.stderrTail && result.stderrTail.length) {
    lines.push("last stderr:");
    for (const line of result.stderrTail.slice(-8)) lines.push(`  ${line}`);
  }
  lines.push("");
  lines.push("--- vibe final report ---");
  lines.push(result.finalMessage || "(no final message captured)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push(
    "relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator.",
  );
  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
