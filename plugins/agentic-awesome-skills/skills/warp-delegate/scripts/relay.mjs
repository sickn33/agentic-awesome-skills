#!/usr/bin/env node
/**
 * delegate-skills · warp-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to the Warp Agent CLI (`oz agent run
 * --output-format ndjson`), capture the newline-delimited JSON event stream,
 * and write a structured result the orchestrating agent can review. The
 * orchestrator runs this one command and reads the result JSON — every
 * Warp-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `oz` and `git`, plus the platform
 * process-termination utility when a Windows process-tree kill requires one.
 * The `oz` process it launches does authenticate — exactly as you do at the
 * terminal. Read this file before you run it.
 *
 * Brief delivery: `oz agent run` requires one of --prompt/--saved-prompt/
 * --task-id/--skill, and its -f/--file config path does NOT satisfy that
 * requirement, so the brief rides argv as the --prompt value. Two consequences
 * the other relays in this package do not have: the brief is visible in the
 * host process list while the run is live, and a very large brief can hit the
 * OS argv limit. Keep secrets out of the brief — reference workspace files or
 * environment variables instead — and on a shared machine prefer a short brief
 * that points `oz` at files in the repo. Because the brief rides argv, this
 * relay never launches `oz` through a shell on any platform.
 *
 * Workspace snapshots: `oz agent run` uploads an end-of-run workspace snapshot
 * by default. The relay does not change that default — it is the CLI's own
 * behavior — but --no-snapshot forwards Warp's flag when you do not want the
 * upload. Decide deliberately for private repositories.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's job
 * — after it reviews the diff and re-runs the project gates.
 *
 * Autonomy: `oz agent run` has NO sandbox, NO permission mode, and NO
 * read-only mode. A headless run reads, writes, edits, and executes commands
 * with the user's own permissions and never prompts. This relay therefore
 * offers no --read-only flag: there is nothing in the CLI to enforce it, and
 * advertising one would be a lie. (`--auto-approve` belongs to the interactive
 * `warp` TUI, not to `oz agent run`.) The diff reported in `touchedFiles` is
 * the record of what changed — inspect it after every run.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Path to the brief. If omitted, read it from stdin.
 *   --cd <dir>              Working root for oz (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --model <id>            Warp model id (default: Warp's own). See `oz model list`.
 *   --profile <id>          Warp agent profile id.
 *   --name <name>           Label for the run (Warp's `--name`).
 *   --conversation <id>     Continue an existing Warp conversation; send only the delta brief.
 *   --skill <spec>          Warp skill used as the base prompt (`name`, `repo:name`, `org/repo:name`).
 *   --mcp <spec>            MCP server config path or inline JSON. Repeatable.
 *   --no-snapshot           Forward Warp's --no-snapshot (disable the end-of-run snapshot upload).
 *   --timeout <dur>         Relay-side watchdog (default: 30m). Durations use h/m/s strings.
 *   --out-dir <dir>         Where to write run artifacts (default: a fresh dir
 *                           under the system temp dir).
 *   -h, --help              Show this help.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout —
 *   status, exitCode, signal, ozVersion, runId, runUrl, conversationId,
 *   finalMessage (the agent's own report), model, touchedFiles (git porcelain,
 *   null if git cannot report), snapshotDisabled, and paths to brief.txt,
 *   final.txt, events.jsonl, and stderr.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief) exits 2
 * before any run and writes no result file; a missing `oz` binary exits 127;
 * otherwise the exit code mirrors oz's own (0 success, non-zero failure),
 * except a stream-reported agent error exits 1 even if oz exits 0. If the child
 * dies on a signal, the exit code is 128 plus the signal number and
 * `result.json` records the signal. Once the brief validates, `result.json` is
 * written on every outcome — completed, failed, timeout (the --timeout watchdog
 * fired, or the bounded --version preflight hung), aborted (the relay itself
 * was killed and forwarded the kill to oz), or warp_unavailable.
 */

import {spawn, execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
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
// Values that ride argv beside the brief. `oz` is launched without a shell, so
// the risk is not quoting but flag injection: a value starting with "-" would be
// read by oz as another option. Require a leading alphanumeric.
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

const IMPLEMENTER_KEY = "warp";

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
    // Warp exposes no read-only, sandbox, or permission-mode flag on `oz agent
    // run`, so those dials cannot be honoured here. Dropping one silently would
    // run a lane the user believes is restricted, so refuse instead.
    if (["readOnly", "sandbox", "permissionMode", "force", "effort", "variant", "provider"].includes(field)) {
      fail(`lane "${opts.lane}" sets the ${field} dial, which the Warp Agent CLI has no flag for; remove it from the lane or use a different implementer`);
    }
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
    model: null,
    profile: null,
    name: null,
    conversation: null,
    skill: null,
    mcp: [],
    noSnapshot: false,
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
      case "--model": opts.model = next(); flagged.add("model"); break;
      case "--profile": opts.profile = next(); break;
      case "--name": opts.name = next(); break;
      case "--conversation": opts.conversation = next(); break;
      case "--skill": opts.skill = next(); break;
      case "--mcp": opts.mcp.push(next()); break;
      case "--no-snapshot": opts.noSnapshot = true; break;
      case "--timeout": opts.timeout = next(); flagged.add("timeout"); break;
      case "--out-dir": opts.outDir = resolve(next()); break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }
  applyFleetLane(opts, flagged);
  for (const flag of ["model", "profile", "conversation"]) {
    if (opts[flag] !== null && !SAFE_TOKEN.test(opts[flag])) {
      fail(`--${flag} value contains unsupported characters (allowed: letters, digits, . _ : / -)`);
    }
  }
  // --skill and --mcp legitimately carry characters the token rule rejects (an
  // inline MCP JSON blob, a path). Only a leading "-" is dangerous: oz would
  // read the value as the next option.
  for (const [flag, values] of [["skill", opts.skill === null ? [] : [opts.skill]], ["mcp", opts.mcp]]) {
    for (const value of values) {
      if (value === "" || value.startsWith("-")) {
        fail(`--${flag} value must be non-empty and must not start with "-"`);
      }
    }
  }
  if (opts.name !== null && (opts.name === "" || opts.name.startsWith("-"))) {
    fail('--name value must be non-empty and must not start with "-"');
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
  if (!match) return "relay.mjs - dispatch a brief to oz agent run\n";
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

async function probeOzVersion(timeoutMs, onChild) {
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

  // `oz` installs as a native binary on the platforms this relay targets, so
  // there is no .cmd shim to resolve and the probe runs without a shell — the
  // same launch discipline the dispatch uses because the brief rides argv.
  const probe = await runProbe("oz", ["--version"]);
  if (probe.timedOut) {
    return { version: null, error: Object.assign(new Error("oz --version timed out"), { code: "ETIMEDOUT", stderr: probe.stderr }) };
  }
  if (probe.error && probe.error.code === "ENOENT") return { version: null, error: null };
  if (probe.error) return { version: null, error: probe.error };
  if (probe.code !== 0) {
    return { version: null, error: Object.assign(new Error("oz --version failed"), { status: probe.code, stderr: probe.stderr }) };
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

function buildArgv(opts, brief) {
  // ndjson streams one event object per line, so a long run reports progress
  // instead of buffering to the end. The brief is the --prompt value: `oz agent
  // run` requires one of --prompt/--saved-prompt/--task-id/--skill, and -f/--file
  // does not satisfy that requirement.
  const argv = ["agent", "run", "--output-format", "ndjson", "--cwd", opts.cd];
  if (opts.model) argv.push("--model", opts.model);
  if (opts.profile) argv.push("--profile", opts.profile);
  if (opts.name) argv.push("--name", opts.name);
  if (opts.conversation) argv.push("--conversation", opts.conversation);
  if (opts.skill) argv.push("--skill", opts.skill);
  for (const spec of opts.mcp) argv.push("--mcp", spec);
  if (opts.noSnapshot) argv.push("--no-snapshot");
  argv.push("--prompt", brief);
  return argv;
}

/**
 * Pull agent-visible text out of one ndjson event.
 *
 * Verified against a live edit run on oz 0.2026.05.27: the report is carried by
 * `{"type":"agent","text":…}` events, and system events are `type: "system"`
 * with an `event_type` of `run_started` / `conversation_started`.
 *
 * `agent_reasoning` events carry a `text` field of the SAME shape but hold the
 * model's private reasoning, not its report — matching on `text` alone splices
 * that reasoning into finalMessage. They are dropped by type. Tool traffic
 * (`tool_call`, `tool_result`, `tool_error`) carries no `text` and so needs no
 * exclusion; it stays in events.jsonl.
 *
 * Everything past that stays tolerant rather than pinned to `type === "agent"`,
 * so a renamed or added output event still reports instead of yielding an empty
 * finalMessage; events.jsonl always keeps the raw stream.
 */
function collectText(event, push) {
  if (!event || typeof event !== "object") return;
  if (event.type === "system" || event.type === "agent_reasoning") return;
  const pushString = (value) => { if (typeof value === "string" && value.trim()) push(value); };
  if (typeof event.agent_output === "string") { pushString(event.agent_output); return; }
  if (typeof event.text === "string") { pushString(event.text); return; }
  if (typeof event.content === "string") { pushString(event.content); return; }
  if (Array.isArray(event.content)) {
    for (const part of event.content) if (part && part.type === "text") pushString(part.text);
    return;
  }
  const message = event.message;
  if (message && typeof message === "object") {
    if (typeof message.content === "string") { pushString(message.content); return; }
    if (Array.isArray(message.content)) {
      for (const part of message.content) if (part && part.type === "text") pushString(part.text);
    }
  }
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  const outDir = opts.outDir || join(tmpdir(), "delegate-relay", `${basename(opts.cd) || "repo"}-${timestamp()}`);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const run = {
    startedAt,
    briefPath: join(outDir, "brief.txt"),
    finalPath: join(outDir, "final.txt"),
    eventsPath: join(outDir, "events.jsonl"),
    stderrPath: join(outDir, "stderr.txt"),
    resultPath: join(outDir, "result.json"),
  };
  // Never destroy previous evidence or share output paths with a live run.
  if ([run.briefPath, run.finalPath, run.eventsPath, run.stderrPath, run.resultPath].some(existsSync)) {
    fail("--out-dir already contains run artifacts; choose a fresh directory");
  }
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
      tool: "oz",
      workdir: opts.cd,
      model: opts.model,
      profile: opts.profile,
      snapshotDisabled: opts.noSnapshot,
      resumed: Boolean(opts.conversation),
      ozVersion: version,
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
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    renameSync(temporary, run.resultPath);
    return result;
  };
}

function reportUnavailable(writeResult, resultPath) {
  const result = writeResult({
    status: "warp_unavailable",
    exitCode: 127,
    signal: null,
    runId: null,
    runUrl: null,
    conversationId: null,
    stderrTail: [],
    finalMessage: "",
    touchedFiles: null,
  });
  printSummary(result, resultPath);
  process.stderr.write("relay: `oz` not found on PATH. Install the Warp Agent CLI (https://docs.warp.dev/cli/), then authenticate with `oz login` (or set WARP_API_KEY on a headless host).\n");
  process.exit(127);
}

function reportVersionFailure(writeResult, run, error, timeoutMs) {
  const timedOut = error && error.code === "ETIMEDOUT";
  const stderr = String((error && error.stderr) || "").trim();
  if (stderr) writeFileSync(run.stderrPath, `${stderr}\n`, "utf8");
  const message = timedOut
    ? `oz --version preflight timed out after ${Math.min(timeoutMs, VERSION_TIMEOUT_MS)}ms; oz was not dispatched`
    : `oz --version preflight failed${Number.isInteger(error && error.status) ? ` with exit ${error.status}` : ""}; oz was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error && error.status) ? error.status : 1,
    signal: null,
    runId: null,
    runUrl: null,
    conversationId: null,
    finalMessage: "",
    touchedFiles: null,
    stderrTail: stderr ? stderr.split("\n").slice(-20) : [],
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
        runId: null,
        runUrl: null,
        conversationId: null,
        stderrTail: [],
        finalMessage: "",
        touchedFiles: gitTouchedFiles(opts.cd),
        error: `the relay was killed by ${sig} during the oz version preflight; oz was not dispatched`,
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

function dispatchToOz(opts, brief, run, writeResult) {
  const child = spawn("oz", buildArgv(opts, brief), {
    cwd: opts.cd,
    stdio: ["ignore", "pipe", "pipe"],
    // Never shell:true. The brief is an argv value here, and a shell would
    // reinterpret it. `oz` is a native binary, so no shim resolution needs one.
    detached: process.platform !== "win32", // POSIX: lead a new process group so killChild can fell the whole tree
  });

  let runId = null;
  let runUrl = null;
  let conversationId = null;
  let streamError = null;
  const textChunks = [];
  const stderrTail = [];
  const scan = makeEventScanner((event) => {
    if (event && typeof event === "object") {
      if (typeof event.run_id === "string") runId = event.run_id;
      if (typeof event.run_url === "string") runUrl = event.run_url;
      if (typeof event.conversation_id === "string") conversationId = event.conversation_id;
      if (event.type === "error" || event.event_type === "run_failed") {
        const detail = typeof event.message === "string" ? event.message
          : typeof event.error === "string" ? event.error : null;
        streamError = detail || `oz reported ${event.event_type || event.type}`;
      }
    }
    collectText(event, (text) => textChunks.push(text));
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

  const assembleFinal = () => {
    const message = textChunks.join("\n\n");
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

  // The relay's own death must still produce a result: without this, a kill from the
  // orchestrator's side (its command timeout, a stopped task, a closed terminal) writes
  // no result.json and leaves the oz child running or dying mid-edit with nothing
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
        runId,
        runUrl,
        conversationId,
        finalMessage: assembleFinal(),
        touchedFiles: gitTouchedFiles(opts.cd),
        stderrTail: stderrTail.slice(-20),
        error: `the relay was killed by ${sig}; oz was terminated with it — inspect the working tree before re-dispatching`,
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

  // A grandchild that outlives warp and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once warp itself is
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
      runId,
      runUrl,
      conversationId,
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
    // a descendant that ignored SIGTERM must not outlive the timeout report: once the
    // parent is down, sweep the group (no-op where taskkill already felled the tree)
    if (watchdogFired) killChild(child, "SIGKILL");
    // A timed-out run is failed even if oz handles SIGTERM by exiting 0 —
    // orchestrators key off status and the relay exit code.
    const succeeded = code === 0 && !watchdogFired && !streamError;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    const exitCode = succeeded ? 0 : mapped === 0 ? 1 : mapped;
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode,
      signal: signal ?? null,
      runId,
      runUrl,
      conversationId,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired ? { error: `oz did not finish within --timeout ${opts.timeout}; killed by the relay watchdog` } : {}),
      ...(!watchdogFired && streamError ? { error: streamError } : {}),
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
  const probe = await probeOzVersion(timeoutMs, (child) => { preflightChild = child; });
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
  dispatchToOz(opts, brief, run, writeResult);
}

function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(`relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""})  ·  oz ${result.ozVersion ?? "?"}`);
  if (result.signal === "SIGKILL" && result.status === "failed") lines.push("hint: the host killed the process (commonly the OOM killer or a supervisor timeout) — this is not an oz error; check host memory and re-dispatch, or split the task into smaller briefs.");
  if (result.signal === "SIGTERM" && result.status === "failed") lines.push("hint: something outside the relay terminated oz (a supervisor, the session ending, or a manual kill) — when the relay itself does the killing it reports status \"timeout\" or \"aborted\" instead; inspect the working tree before re-dispatching.");
  lines.push("mode: full local tool access — the Warp Agent CLI has no sandbox, permission mode, or read-only run");
  if (result.snapshotDisabled) lines.push("mode: end-of-run workspace snapshot upload disabled (--no-snapshot)");
  if (result.resumed) lines.push("mode: continued an existing conversation");
  if (result.model) lines.push(`model: ${result.model}`);
  if (result.conversationId) lines.push(`conversation id (continue with: --conversation ${result.conversationId}): ${result.conversationId}`);
  if (result.runId) lines.push(`run id: ${result.runId}`);
  if (result.runUrl) lines.push(`run url: ${result.runUrl}`);
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
  lines.push("--- oz final report ---");
  lines.push(result.finalMessage || "(no final message captured — read events.jsonl for the raw stream)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push("relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
