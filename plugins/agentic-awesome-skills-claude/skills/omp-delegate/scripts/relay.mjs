#!/usr/bin/env node
/**
 * delegate-skills · omp-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to Oh My Pi (`omp --mode json`), capture the
 * JSON event stream, and write a structured result the orchestrating agent can
 * review. The orchestrator runs this one command and reads the result JSON —
 * every omp-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `omp` and `git`, plus the platform
 * process-termination utility when a Windows process-tree kill requires one.
 * The `omp` process it launches does authenticate — exactly as you do at the
 * terminal. Read this file before you run it.
 *
 * The brief is piped to omp on stdin, so it never appears in the host process
 * list and no argv size cap applies. Keep secrets out of the brief anyway on
 * shared machines — reference workspace files or environment variables instead.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's job
 * — after it reviews the diff and re-runs the project gates.
 *
 * Autonomy: omp has no sandbox. Print mode has no approval UI, so a write run
 * passes `--yolo` (`tools.approvalMode: yolo`) and executes without prompts.
 * `--read-only` restricts the callable tool surface to `read,grep,glob`.
 * Installed extension code still runs with the user's host permissions when
 * project resources are trusted. The relay passes `--no-extensions --no-skills
 * --no-rules` unless `--approve` explicitly trusts project `.omp` resources.
 * The diff reported in `touchedFiles` is the record of what changed.
 *
 * omp is a native binary (bun / install script / Homebrew), including on
 * Windows, so this relay never launches it through a shell. Only
 * token-validated flag values ride argv (the brief never does).
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Path to the brief. If omitted, read it from stdin.
 *   --cd <dir>              Working root for omp (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --provider <name>       omp provider name (default: omp's own default).
 *   --model <pattern>       omp model id or fuzzy pattern (default: omp's own
 *                           default). List ids with `omp models`, not
 *                           `--list-models`. Letters, digits, and . _ : / - only.
 *   --thinking <level>      omp --thinking: off, auto, minimal, low, medium,
 *                           high, xhigh, or max.
 *   --session <id>          Resume a specific omp session; send only the delta brief.
 *   --resume-last           Continue the most recent omp session for this cwd
 *                           (`omp --continue`); send only the delta brief.
 *   --approve               Trust project-local .omp extensions, skills, and
 *                           rules. By default the relay passes --no-extensions
 *                           --no-skills --no-rules.
 *   --read-only             Restrict omp to read,grep,glob (no write/edit/bash).
 *   --timeout <dur>         Relay-side watchdog (default: 30m). Durations use
 *                           h/m/s strings. omp's --max-time is not forwarded.
 *   --out-dir <dir>         Where to write run artifacts (default: a fresh dir
 *                           under the system temp dir).
 *   -h, --help              Show this help.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout —
 *   status, exitCode, signal, ompVersion, sessionId, finalMessage (omp's own
 *   report), requested/actual provider and model, thinking, usage, touchedFiles
 *   (git porcelain, null if git cannot report), readOnly, yolo, projectTrusted,
 *   and paths to brief.txt, final.txt, events.jsonl, and stderr.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief) exits 2
 * before any run and writes no result file; a missing `omp` binary exits 127;
 * otherwise the exit code mirrors omp's own (0 success, non-zero failure), except
 * a final assistant `error`/`aborted` event exits 1 even if omp exits 0. If the
 * child dies on a signal, the exit code is 128 plus the signal number and
 * `result.json` records the signal. Once the brief validates, `result.json` is
 * written on every outcome — completed, failed, timeout (the --timeout watchdog
 * fired, or the bounded --version preflight hung), aborted (the relay itself
 * was killed and forwarded the kill to omp), or omp_unavailable.
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
const VERSION_TIMEOUT_MS = 10_000;
const READ_ONLY_TOOLS = "read,grep,glob";
const THINKING_LEVELS = new Set(["off", "auto", "minimal", "low", "medium", "high", "xhigh", "max"]);
// --model, --provider, and --session values must not look like flags. omp is
// launched without a shell, so this is flag-injection defense, not quoting.
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

const IMPLEMENTER_KEY = "omp";

function makeEventScanner(onObject) {
  let buf = "";
  let index = 0;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  return (chunk) => {
    if (!chunk) return;
    buf += chunk;
    for (;;) {
      while (index < buf.length) {
        const ch = buf[index];
        // Only track strings inside an object (depth > 0). At depth 0 we are
        // skipping a junk prefix, and an unmatched `"` there must not swallow the
        // real `{...}` that follows in the same chunk.
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === '"') inString = false;
        } else if (ch === '"') {
          if (depth > 0) inString = true;
        } else if (ch === "{") {
          if (depth === 0) start = index;
          depth += 1;
        } else if (ch === "}") {
          if (depth > 0) {
            depth -= 1;
            if (depth === 0 && start !== -1) {
              const slice = buf.slice(start, index + 1);
              try { onObject(JSON.parse(slice)); } catch { /* skip malformed */ }
              start = -1;
            }
          }
        }
        index += 1;
      }
      if (depth === 0 || start === -1 || buf.length - start <= MAX_BUFFERED_CHARS) break;
      // A complete object may exceed the retained-input cap within this chunk.
      // Drop only an oversized partial, then rescan its suffix so a later
      // concatenated event is not lost.
      buf = buf.slice(start + MAX_BUFFERED_CHARS);
      index = 0;
      start = -1;
      depth = 0;
      inString = false;
      escaped = false;
    }
    if (depth > 0 && start !== -1) {
      if (start > 0) {
        buf = buf.slice(start);
        index -= start;
        start = 0;
      }
    } else {
      buf = "";
      index = 0;
      start = -1;
    }
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
    if (field === "planOnly" && (flagged.has("planOnly") || flagged.has("readOnly"))) continue;
    if (field === "readOnly" && flagged.has("readOnly")) continue;
    if (field === "force" && flagged.has("force")) continue;
    if (field === "effort") {
      if (flagged.has("thinking")) continue;
      opts.thinking = value;
      continue;
    }
    if (field === "thinking" && flagged.has("thinking")) continue;
    opts[field] = value;
  }
}

function fail(message, code = 2) {
  process.stderr.write(`relay: ${message}\n`);
  process.exit(code);
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

function parseArgs(argv) {
  const flagged = new Set();
  const opts = {
    lane: null,
    laneSource: null,
    brief: null,
    cd: process.cwd(),
    provider: null,
    model: null,
    thinking: null,
    session: null,
    resumeLast: false,
    readOnly: false,
    approve: false,
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
      case "--provider": opts.provider = next(); flagged.add("provider"); break;
      case "--model": opts.model = next(); flagged.add("model"); break;
      case "--thinking": opts.thinking = next(); flagged.add("thinking"); break;
      case "--session": opts.session = next(); break;
      case "--resume-last": opts.resumeLast = true; break;
      case "--read-only": opts.readOnly = true; flagged.add("readOnly"); break;
      case "--approve": opts.approve = true; break;
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
  for (const flag of ["model", "provider", "session"]) {
    if (opts[flag] !== null && !SAFE_TOKEN.test(opts[flag])) {
      fail(`--${flag} value contains unsupported characters (allowed: letters, digits, . _ : / -)`);
    }
  }
  if (opts.thinking !== null && !THINKING_LEVELS.has(opts.thinking)) {
    fail(`invalid --thinking "${opts.thinking}" (expected: ${[...THINKING_LEVELS].join(", ")})`);
  }
  if (parseDuration(opts.timeout) === null) {
    fail(`--timeout "${opts.timeout}" is not a duration; use h/m/s strings like 30m, 90s, or 1h30m`);
  }
  if (parseDuration(opts.timeout) === 0) fail("--timeout must be greater than zero");
  // setTimeout overflows past 2^31 - 1 ms (~24.8 days) and fires immediately,
  // which would read as an instant spurious timeout — reject it up front.
  if (parseDuration(opts.timeout) > 2_147_483_647) {
    fail(`--timeout "${opts.timeout}" exceeds the maximum schedulable watchdog (~24.8 days)`);
  }
  if (!existsSync(opts.cd) || !statSync(opts.cd).isDirectory()) {
    fail(`working directory not found: ${opts.cd}`);
  }
  return opts;
}

function headerComment() {
  // The leading block comment doubles as --help text.
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const match = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "relay.mjs - dispatch a brief to omp --mode json\n";
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
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
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

async function ompVersion(timeoutMs, onChild) {
  const limit = Math.min(timeoutMs, VERSION_TIMEOUT_MS);
  const runProbe = (command, argv, options = {}) => new Promise((resolveProbe) => {
    const child = spawn(command, argv, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      ...options,
    });
    onChild(child);
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveProbe({ stdout, stderr, ...result });
    };
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish({ code: null, error, timedOut: false }));
    child.on("close", (code) => finish({ code, error: null, timedOut }));
    timer = setTimeout(() => {
      timedOut = true;
      killChild(child, process.platform === "win32" ? "SIGTERM" : "SIGKILL");
    }, limit);
  });

  const probe = await runProbe("omp", ["--version"]);
  if (probe.timedOut) {
    return { version: null, error: Object.assign(new Error("omp --version timed out"), { code: "ETIMEDOUT", stderr: probe.stderr }) };
  }
  if (probe.error && probe.error.code === "ENOENT") return { version: null, error: null };
  if (probe.error) return { version: null, error: probe.error };
  if (probe.code !== 0) {
    return { version: null, error: Object.assign(new Error("omp --version failed"), { status: probe.code, stderr: probe.stderr }) };
  }
  return { version: probe.stdout.trim() || "unknown", error: null };
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildArgv(opts) {
  // The brief rides stdin, never argv. --mode json is print mode: omp reads
  // the piped brief, streams events, and exits.
  const argv = ["--mode", "json"];
  if (opts.provider) argv.push("--provider", opts.provider);
  if (opts.model) argv.push("--model", opts.model);
  if (opts.thinking) argv.push("--thinking", opts.thinking);
  if (opts.session) argv.push("--session", opts.session);
  else if (opts.resumeLast) argv.push("--continue");
  if (!opts.readOnly) argv.push("--yolo");
  if (opts.readOnly) argv.push("--tools", READ_ONLY_TOOLS);
  if (!opts.approve) argv.push("--no-extensions", "--no-skills", "--no-rules");
  return argv;
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  // Fresh private storage prevents reused logs or symlinks from redirecting writes.
  const outDir = opts.outDir || mkdtempSync(join(tmpdir(), "omp-delegate-"));
  if (opts.outDir) mkdirSync(outDir, { mode: 0o700 });
  const run = {
    startedAt,
    briefPath: join(outDir, "brief.txt"),
    finalPath: join(outDir, "final.txt"),
    eventsPath: join(outDir, "events.jsonl"),
    stderrPath: join(outDir, "stderr.txt"),
    resultPath: join(outDir, "result.json"),
  };
  // The new private directory contains no prior artifacts.
  rmSync(run.finalPath, { force: true });
  rmSync(run.resultPath, { force: true });
  writeFileSync(run.briefPath, brief, { encoding: "utf8", mode: 0o600, flag: "wx" });
  writeFileSync(run.eventsPath, "", { encoding: "utf8", mode: 0o600, flag: "wx" });
  writeFileSync(run.stderrPath, "", { encoding: "utf8", mode: 0o600, flag: "wx" });
  return run;
}

function makeResultWriter(opts, version, run) {
  return (extra) => {
    const result = {
      schema: "delegate-relay.result.v1",
      lane: opts.lane,
      laneSource: opts.laneSource,
      tool: "omp",
      workdir: opts.cd,
      provider: opts.provider,
      model: opts.model,
      thinking: opts.thinking,
      readOnly: opts.readOnly,
      yolo: !opts.readOnly,
      projectTrusted: opts.approve,
      resumed: Boolean(opts.resumeLast || opts.session),
      ompVersion: version,
      startedAt: run.startedAt,
      finishedAt: new Date().toISOString(),
      briefPath: run.briefPath,
      finalPath: existsSync(run.finalPath) ? run.finalPath : null,
      eventsPath: run.eventsPath,
      stderrPath: run.stderrPath,
      ...extra,
    };
    // Atomic write: a polling orchestrator never reads a half-written result.
    const temporary = `${run.resultPath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, run.resultPath);
    return result;
  };
}

function reportUnavailable(writeResult, resultPath) {
  const result = writeResult({
    status: "omp_unavailable",
    exitCode: 127,
    signal: null,
    sessionId: null,
    actualProvider: null,
    actualModel: null,
    usage: null,
    stopReason: null,
    finalMessage: "",
    touchedFiles: null,
  });
  printSummary(result, resultPath);
  process.stderr.write("relay: `omp` not found on PATH. Install with `bun install -g @oh-my-pi/pi-coding-agent`, then authenticate (`/login`, or an API-key environment variable).\n");
  process.exit(127);
}

function reportVersionFailure(writeResult, run, error, timeoutMs) {
  const timedOut = error && error.code === "ETIMEDOUT";
  const stderr = String((error && error.stderr) || "").trim();
  if (stderr) writeFileSync(run.stderrPath, `${stderr}\n`, "utf8");
  const message = timedOut
    ? `omp --version preflight timed out after ${Math.min(timeoutMs, VERSION_TIMEOUT_MS)}ms; omp was not dispatched`
    : `omp --version preflight failed${Number.isInteger(error && error.status) ? ` with exit ${error.status}` : ""}; omp was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error && error.status) ? error.status : 1,
    signal: null,
    sessionId: null,
    actualProvider: null,
    actualModel: null,
    usage: null,
    stopReason: null,
    finalMessage: "",
    touchedFiles: null,
    ...(stderr ? { stderrTail: stderr.split("\n").slice(-20) } : {}),
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function installPreflightSignalHandlers(opts, run, writeResult, getChild) {
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
        sessionId: null,
        actualProvider: null,
        actualModel: null,
        usage: null,
        stopReason: null,
        finalMessage: "",
        touchedFiles: gitTouchedFiles(opts.cd),
        error: `the relay was killed by ${sig} during the omp version preflight; omp was not dispatched`,
      });
      printSummary(result, run.resultPath);
      const child = getChild();
      if (child) killChild(child, process.platform === "win32" ? "SIGTERM" : "SIGKILL");
      process.exit(result.exitCode);
    };
    handlers.set(sig, handler);
    process.on(sig, handler);
  }
  return () => {
    active = false;
    for (const [sig, handler] of handlers) process.removeListener(sig, handler);
  };
}

function dispatchToOmp(opts, brief, run, writeResult) {
  const child = spawn("omp", buildArgv(opts), {
    cwd: opts.cd,
    stdio: ["pipe", "pipe", "pipe"],
    // Native binary on every platform, including Windows. Never shell: a shell
    // would reinterpret the (already stdin-delivered) session, and omp.exe is
    // not a .cmd shim.
    detached: process.platform !== "win32", // POSIX: lead a new process group so killChild can fell the whole tree
  });

  let sessionId = null;
  let actualProvider = null;
  let actualModel = null;
  let usage = null;
  let stopReason = null;
  let assistantError = null;
  const textChunks = [];
  const stderrTail = [];
  const scan = makeEventScanner((event) => {
    if (event.type === "session" && typeof event.id === "string") {
      sessionId = event.id;
    }
    if (event.type === "message_end" && event.message && event.message.role === "assistant") {
      const content = event.message.content;
      if (typeof content === "string") textChunks.push(content);
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part && part.type === "text" && typeof part.text === "string") textChunks.push(part.text);
        }
      }
      if (typeof event.message.provider === "string") actualProvider = event.message.provider;
      if (typeof event.message.model === "string") actualModel = event.message.model;
      if (event.message.usage && typeof event.message.usage === "object") usage = event.message.usage;
      if (typeof event.message.stopReason === "string") stopReason = event.message.stopReason;
      if (typeof event.message.errorMessage === "string") assistantError = event.message.errorMessage;
    }
  });

  // Decode across chunk boundaries: a multibyte UTF-8 character split between
  // two data events would otherwise decode as U+FFFD and corrupt the report.
  // Files get the raw bytes; only in-memory parsing goes through the decoders.
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

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

  // A fast-exiting omp (usage error, crashed startup) closes the pipe before
  // the write; swallow EPIPE here — the exit code reports the failure.
  child.stdin.on("error", () => {});
  child.stdin.write(brief);
  child.stdin.end();

  const assembleFinal = () => {
    const message = textChunks.join("\n\n");
    if (message) writeFileSync(run.finalPath, message, { encoding: "utf8", mode: 0o600 });
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

  // The relay's own death must still produce a result: without this, a kill from the
  // orchestrator's side (its command timeout, a stopped task, a closed terminal) writes
  // no result.json and leaves the omp child running or dying mid-edit with nothing
  // recording why. SIGTERM/SIGHUP registration is a no-op on Windows; SIGINT works there.
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(sig, () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      const abortedFields = {
        status: "aborted",
        exitCode: 128 + (constants.signals[sig] || 15),
        signal: sig,
        sessionId,
        actualProvider,
        actualModel,
        usage,
        stopReason,
        finalMessage: assembleFinal(),
        touchedFiles: gitTouchedFiles(opts.cd),
        stderrTail: stderrTail.slice(-20),
        error: `the relay was killed by ${sig}; omp was terminated with it — inspect the working tree before re-dispatching`,
      };
      const result = writeResult(abortedFields);
      printSummary(result, run.resultPath);
      killChild(child);
      setTimeout(() => {
        killChild(child, "SIGKILL");
        // the child may flush files during the grace window; refresh the snapshot so the
        // artifact matches the tree the orchestrator will actually find
        writeResult({ ...abortedFields, touchedFiles: gitTouchedFiles(opts.cd) });
        process.exit(result.exitCode);
      }, 2000);
    });
  }

  // A grandchild that outlives omp and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once omp itself is
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
      sessionId,
      actualProvider,
      actualModel,
      usage,
      stopReason,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      error: String(err && err.message ? err.message : err),
    });
    printSummary(result, run.resultPath);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (settled) return;
    settled = true;
    clearWatchdog();
    // a descendant that ignored SIGTERM must not outlive the timeout report: once the
    // parent is down, sweep the group (no-op where taskkill already felled the tree)
    if (watchdogFired) killChild(child, "SIGKILL");
    // A timed-out run is failed even if omp handles SIGTERM by exiting 0 —
    // orchestrators key off status and the relay exit code.
    const assistantFailed = stopReason === "error" || stopReason === "aborted";
    const succeeded = code === 0 && !watchdogFired && !assistantFailed;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    const exitCode = succeeded ? 0 : mapped === 0 ? 1 : mapped;
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode,
      signal: signal ?? null,
      sessionId,
      actualProvider,
      actualModel,
      usage,
      stopReason,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired ? { error: `omp did not finish within --timeout ${opts.timeout}; killed by the relay watchdog` } : {}),
      ...(!watchdogFired && assistantFailed ? { error: assistantError || `omp ended with stopReason "${stopReason}"` } : {}),
    });
    printSummary(result, run.resultPath);
    process.exit(result.exitCode);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("empty brief (pass --brief <file> or pipe the brief on stdin)");

  const timeoutMs = parseDuration(opts.timeout) ?? parseDuration(DEFAULT_TIMEOUT);
  const run = prepareRunDir(opts, brief);
  let writeResult = makeResultWriter(opts, null, run);
  let preflightChild = null;
  const clearPreflightSignals = installPreflightSignalHandlers(opts, run, writeResult, () => preflightChild);
  const probe = await ompVersion(timeoutMs, (child) => { preflightChild = child; });
  writeResult = makeResultWriter(opts, probe.version, run);
  if (!probe.version && !probe.error) {
    clearPreflightSignals();
    reportUnavailable(writeResult, run.resultPath);
    return;
  }
  if (!probe.version) {
    clearPreflightSignals();
    reportVersionFailure(writeResult, run, probe.error, timeoutMs);
    return;
  }
  clearPreflightSignals();
  dispatchToOmp(opts, brief, run, writeResult);
}

function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(`relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""})  ·  omp ${result.ompVersion ?? "?"}`);
  if (result.signal === "SIGKILL" && result.status === "failed") lines.push("hint: the host killed the process (commonly the OOM killer or a supervisor timeout) — this is not an omp error; check host memory and re-dispatch, or split the task into smaller briefs.");
  if (result.signal === "SIGTERM" && result.status === "failed") lines.push("hint: something outside the relay terminated omp (a supervisor, the session ending, or a manual kill) — when the relay itself does the killing it reports status \"timeout\" or \"aborted\" instead; inspect the working tree before re-dispatching.");
  if (result.readOnly) lines.push(`mode: read-only (tools ${READ_ONLY_TOOLS})`);
  if (result.yolo) lines.push("mode: --yolo (tools.approvalMode yolo)");
  if (result.projectTrusted) lines.push("mode: project resources trusted (--approve)");
  if (result.resumed) lines.push("mode: resumed an existing session");
  if (result.thinking) lines.push(`thinking: ${result.thinking}`);
  if (result.actualModel) lines.push(`model: ${result.actualProvider ? `${result.actualProvider}/` : ""}${result.actualModel}`);
  if (result.sessionId) lines.push(`session id (resume with: --session ${result.sessionId}): ${result.sessionId}`);
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
  lines.push("--- omp final report ---");
  lines.push(result.finalMessage || "(no final message captured)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push("relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
