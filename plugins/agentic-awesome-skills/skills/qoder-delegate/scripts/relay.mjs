#!/usr/bin/env node
/**
 * delegate-skills · qoder-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to Qoder CLI (`qodercli -p`), capture the
 * structured event stream, and write a result the orchestrator can review.
 * The relay uses Node built-ins only and shells out only to `qodercli`, `git`,
 * and the platform process-termination utility when needed. It makes no
 * network calls, does not explicitly parse credentials or send telemetry, and never directly commits.
 * The child inherits the environment and can use credentials/network and git.
 *
 * The brief is passed as a command-line argument. Keep secrets out of the
 * brief on shared hosts; point Qoder at workspace files or environment
 * variables instead.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Brief path. If omitted, read stdin.
 *   --cd <dir>              Qoder working root (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --model <name>          Model from `qodercli --list-models`.
 *   --context-window <n>    Positive integer; supported models only.
 *   --resume <id>           Resume one Qoder session; send a delta brief.
 *   --resume-last           Continue the latest session; send a delta brief.
 *   --add-dir <dir>         Add a workspace directory. Repeatable.
 *   --permission-mode <m>   default | accept_edits | auto |
 *                           bypass_permissions | dont_ask | plan
 *                           (default: auto).
 *   --timeout <dur>         Relay watchdog (default: 30m; h/m/s syntax).
 *   --out-dir <dir>         Artifact directory (default: system temp).
 *   -h, --help              Show this help.
 *
 * Result: <out-dir>/result.json plus brief.txt, events.jsonl, stderr.txt, and
 * final.txt when Qoder emits a final message. Pre-run usage errors exit 2 and
 * write no result. Missing `qodercli` exits 127 with qoder_unavailable. Once
 * dispatched, every outcome writes a result: completed, failed, timeout,
 * aborted, or qoder_unavailable.
 */

import {execFileSync, spawn, spawnSync } from "node:child_process";
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
import { constants, tmpdir } from "node:os";
import {basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StringDecoder } from "node:string_decoder";
const MAX_BUFFERED_CHARS = 1_048_576;

const DEFAULT_TIMEOUT = "30m";
const MAX_TIMER_MS = 2_147_483_647;
const VERSION_TIMEOUT_MS = 10_000;
const MAX_BRIEF_BYTES = (process.platform === "win32" ? 12 : 120) * 1024;
const PERMISSION_MODES = new Set([
  "default",
  "accept_edits",
  "bypass_permissions",
  "dont_ask",
  "auto",
  "plan",
]);

const IMPLEMENTER_KEY = "qoder";

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
    { encoding: "utf8", env: process.env, timeout: VERSION_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
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
    contextWindow: null,
    resume: null,
    resumeLast: false,
    addDirs: [],
    permissionMode: "auto",
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
      case "--context-window": opts.contextWindow = next(); break;
      case "--resume": opts.resume = next(); break;
      case "--resume-last": opts.resumeLast = true; break;
      case "--add-dir": opts.addDirs.push(next()); break;
      case "--permission-mode": opts.permissionMode = next(); flagged.add("permissionMode"); break;
      case "--timeout": opts.timeout = next(); flagged.add("timeout"); break;
      case "--out-dir": opts.outDir = resolve(next()); break;
      default: fail(`unknown option: ${arg}`);
    }
  }
  applyFleetLane(opts, flagged);

  if (opts.resumeLast && opts.resume) {
    fail("--resume-last and --resume are mutually exclusive; pass only one");
  }
  if (opts.resume !== null && !opts.resume.trim()) fail("--resume must not be empty");
  if (opts.model !== null && !opts.model.trim()) fail("--model must not be empty");
  if (opts.contextWindow !== null && !/^[1-9]\d*$/.test(opts.contextWindow)) {
    fail("--context-window must be a positive integer");
  }
  if (!PERMISSION_MODES.has(opts.permissionMode)) {
    fail(`unsupported --permission-mode: ${opts.permissionMode}`);
  }
  if (parseDuration(opts.timeout) === null) {
    fail(`--timeout "${opts.timeout}" is invalid or too long; use a positive h/m/s duration no longer than about 24 days`);
  }
  if (!existsSync(opts.cd) || !statSync(opts.cd).isDirectory()) {
    fail(`working directory not found: ${opts.cd}`);
  }

  opts.addDirs = opts.addDirs.map((dir) => resolve(opts.cd, dir));
  for (const dir of opts.addDirs) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) fail(`additional directory not found: ${dir}`);
  }
  return opts;
}

function headerComment() {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  const match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "relay.mjs - dispatch a brief to qodercli -p\n";
  return `${match[1].replace(/^\s*\* ?/gm, "").trim()}\n`;
}

function readBrief(opts) {
  if (opts.brief) {
    if (!existsSync(opts.brief)) fail(`brief file not found: ${opts.brief}`);
    return readFileSync(opts.brief, "utf8");
  }
  if (process.stdin.isTTY) {
    fail("no --brief given and stdin is a TTY; pass --brief <file> or pipe stdin");
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

function qoderVersion(timeoutMs) {
  try {
    return {
      version: execFileSync("qodercli", ["--version"], {
        encoding: "utf8",
        shell: false,
        timeout: Math.min(timeoutMs, VERSION_TIMEOUT_MS),
        killSignal: "SIGKILL",
      }).trim() || "unknown",
      error: null,
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: null, error: null };
    return { version: null, error };
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildArgv(opts, brief) {
  const argv = ["--output-format", "stream-json", "--permission-mode", opts.permissionMode];
  if (opts.resume) argv.push("--resume", opts.resume);
  else if (opts.resumeLast) argv.push("-c");
  if (opts.model) argv.push("--model", opts.model);
  if (opts.contextWindow) argv.push("--context-window", opts.contextWindow);
  for (const dir of opts.addDirs) argv.push("--add-dir", dir);
  argv.push("-p", brief);
  return argv;
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  // Fresh private directory: never erase artifacts or follow pre-existing links.
  const outDir = opts.outDir || mkdtempSync(join(tmpdir(), "qoder-relay-"));
  if (opts.outDir) mkdirSync(outDir, { mode: 0o700 });
  const run = {
    startedAt,
    briefPath: join(outDir, "brief.txt"),
    finalPath: join(outDir, "final.txt"),
    eventsPath: join(outDir, "events.jsonl"),
    stderrPath: join(outDir, "stderr.txt"),
    resultPath: join(outDir, "result.json"),
  };
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
      tool: "qoder",
      workdir: opts.cd,
      model: opts.model,
      contextWindow: opts.contextWindow,
      permissionMode: opts.permissionMode,
      resumed: Boolean(opts.resumeLast || opts.resume),
      qoderVersion: version,
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

function reportUnavailable(writeResult, resultPath) {
  const result = writeResult({
    status: "qoder_unavailable",
    exitCode: 127,
    signal: null,
    sessionId: null,
    actualModel: null,
    actualPermissionMode: null,
    usage: null,
    finalMessage: "",
    touchedFiles: null,
  });
  printSummary(result, resultPath);
  process.stderr.write("relay: `qodercli` not found on PATH. Install from https://docs.qoder.com/en/cli/quick-start, then run `qodercli login` or set QODER_PERSONAL_ACCESS_TOKEN for automation.\n");
  process.exit(127);
}

function reportVersionFailure(writeResult, run, error, timeoutMs) {
  const timedOut = error?.code === "ETIMEDOUT";
  const stderr = String(error?.stderr || "").trim();
  if (stderr) writeFileSync(run.stderrPath, `${stderr}\n`, "utf8");
  const message = timedOut
    ? `qodercli --version preflight timed out after ${Math.min(timeoutMs, VERSION_TIMEOUT_MS)}ms; Qoder was not dispatched`
    : `qodercli --version preflight failed${Number.isInteger(error?.status) ? ` with exit ${error.status}` : ""}; Qoder was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error?.status) ? error.status : 1,
    signal: null,
    sessionId: null,
    actualModel: null,
    actualPermissionMode: null,
    usage: null,
    resultSubtype: null,
    qoderErrors: [],
    permissionDenials: [],
    finalMessage: "",
    touchedFiles: null,
    ...(stderr ? { stderrTail: stderr.split("\n").slice(-20) } : {}),
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function dispatch(opts, brief, run, writeResult) {
  // Target Qoder's currently documented native Windows executable, keeping
  // argv structured and avoiding a command shell on every platform.
  const child = spawn("qodercli", buildArgv(opts, brief), {
    cwd: opts.cd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    detached: process.platform !== "win32",
  });
  let sessionId = null;
  let actualModel = null;
  let actualPermissionMode = null;
  let usage = null;
  let finalResult = "";
  let resultIsError = false;
  let resultSubtype = null;
  let qoderErrors = [];
  let permissionDenials = [];
  const textChunks = [];
  const deltaChunks = [];
  const stderrTail = [];

  const scan = makeEventScanner((event) => {
    const eventSessionId = event.session_id ?? event.sessionId ?? event.session?.id;
    if (typeof eventSessionId === "string") sessionId = eventSessionId;
    if (event.type === "system" && event.subtype === "init") {
      if (typeof event.model === "string") actualModel = event.model;
      const mode = event.permissionMode ?? event.permission_mode;
      if (typeof mode === "string") actualPermissionMode = mode;
    }
    if (event.type === "assistant" || event.role === "assistant") {
      const content = event.message?.content ?? event.content;
      if (typeof content === "string") textChunks.push(content);
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === "text" && typeof block.text === "string") textChunks.push(block.text);
        }
      }
    }
    if (event.type === "content_block_delta" && typeof event.delta?.text === "string") {
      deltaChunks.push(event.delta.text);
    }
    if (event.type === "result" || event.type === "final") {
      resultSubtype = typeof event.subtype === "string" ? event.subtype : null;
      resultIsError = event.is_error === true || event.status === "error";
      const resultText = event.result ?? event.final_message ?? event.finalMessage;
      if (typeof resultText === "string") finalResult = resultText;
      if (!finalResult && typeof event.message === "string") finalResult = event.message;
      if (!finalResult && Array.isArray(event.message?.content)) {
        const blocks = event.message.content
          .filter((block) => block?.type === "text" && typeof block.text === "string")
          .map((block) => block.text);
        if (blocks.length) finalResult = blocks.join("\n\n");
      }
      if (event.usage && typeof event.usage === "object") usage = event.usage;
      if (Array.isArray(event.errors)) qoderErrors = event.errors;
      if (Array.isArray(event.permission_denials)) permissionDenials = event.permission_denials;
    }
  });
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  child.stdout.on("data", (chunk) => {
    appendFileSync(run.eventsPath, chunk);
    scan(stdoutDecoder.write(chunk));
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    appendFileSync(run.stderrPath, chunk);
    for (const line of stderrDecoder.write(chunk).split("\n")) {
      if (line.trim()) stderrTail.push(line.trimEnd());
    }
    while (stderrTail.length > 20) stderrTail.shift();
  });

  const assembleFinal = () => {
    const message = finalResult || textChunks.join("\n\n") || deltaChunks.join("");
    if (message) writeFileSync(run.finalPath, message, "utf8");
    return message;
  };

  let settled = false;
  let watchdogFired = false;
  let sigkillTimer = null;
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
  }, parseDuration(opts.timeout) ?? parseDuration(DEFAULT_TIMEOUT));

  const clearWatchdog = () => {
    clearTimeout(watchdogTimer);
    if (sigkillTimer) clearTimeout(sigkillTimer);
  };

  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(sig, () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      const abortedFields = () => ({
        status: "aborted",
        exitCode: 128 + (constants.signals[sig] || 15),
        signal: sig,
        sessionId,
        actualModel,
        actualPermissionMode,
        usage,
        resultSubtype,
        qoderErrors,
        permissionDenials,
        finalMessage: assembleFinal(),
        touchedFiles: gitTouchedFiles(opts.cd),
        stderrTail: stderrTail.slice(-20),
        error: `the relay was killed by ${sig}; qodercli was terminated with it — inspect the working tree before re-dispatching`,
      });
      const result = writeResult(abortedFields());
      printSummary(result, run.resultPath);
      killChild(child);
      setTimeout(() => {
        killChild(child, "SIGKILL");
        writeResult(abortedFields());
        process.exit(result.exitCode);
      }, 2000);
    });
  }

  // A grandchild that outlives qoder and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once qoder itself is
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

  child.on("error", (error) => {
    if (settled) return;
    settled = true;
    clearWatchdog();
    const result = writeResult({
      status: "failed",
      exitCode: 1,
      signal: null,
      sessionId,
      actualModel,
      actualPermissionMode,
      usage,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      stderrTail: stderrTail.slice(-20),
      error: String(error?.message || error),
    });
    printSummary(result, run.resultPath);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (settled) return;
    settled = true;
    clearWatchdog();
    if (watchdogFired) killChild(child, "SIGKILL");
    scan(stdoutDecoder.end());
    const stderrEnd = stderrDecoder.end();
    if (stderrEnd.trim()) stderrTail.push(stderrEnd.trimEnd());
    const succeeded = code === 0 && !watchdogFired && !resultIsError;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    const exitCode = succeeded ? 0 : mapped === 0 ? 1 : mapped;
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode,
      signal: signal ?? null,
      sessionId,
      actualModel,
      actualPermissionMode,
      usage,
      resultSubtype,
      qoderErrors,
      permissionDenials,
      finalMessage: assembleFinal(),
      touchedFiles: gitTouchedFiles(opts.cd),
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired ? { error: `qodercli did not finish within --timeout ${opts.timeout}; killed by the relay watchdog` } : {}),
    });
    printSummary(result, run.resultPath);
    process.exit(exitCode);
  });
}

function printSummary(result, resultPath) {
  const lines = [
    "",
    `relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""}) · qodercli ${result.qoderVersion ?? "?"}`,
  ];
  if (result.signal === "SIGKILL" && result.status === "failed") lines.push("hint: the host killed qodercli (commonly an OOM killer or supervisor timeout); check host memory and inspect the working tree before re-dispatching.");
  if (result.signal === "SIGTERM" && result.status === "failed") lines.push("hint: something outside the relay terminated qodercli; relay watchdogs and relay signals report timeout or aborted instead.");
  if (result.resumed) lines.push("mode: resumed an existing session");
  if (result.actualModel) lines.push(`model: ${result.actualModel}`);
  if (result.contextWindow) lines.push(`context window requested: ${result.contextWindow}`);
  if (result.sessionId) lines.push(`session id (resume with: --resume ${result.sessionId}): ${result.sessionId}`);
  if (result.touchedFiles === null) {
    lines.push("touched files: git unavailable - inspect the working tree directly");
  } else {
    lines.push(`touched files: ${result.touchedFiles.length}`);
    for (const file of result.touchedFiles.slice(0, 40)) lines.push(`  ${file}`);
    if (result.touchedFiles.length > 40) lines.push(`  ... and ${result.touchedFiles.length - 40} more`);
  }
  if (result.stderrTail?.length) {
    lines.push("last stderr:");
    for (const line of result.stderrTail.slice(-8)) lines.push(`  ${line}`);
  }
  lines.push("", "--- qoder final report ---", result.finalMessage || "(no final message captured)", "--- end report ---", "");
  lines.push(`result: ${resultPath}`);
  lines.push("relay does not commit. Review the diff, rerun the project gates yourself, then commit from the orchestrator.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("empty brief (pass --brief <file> or pipe stdin)");
  const briefBytes = Buffer.byteLength(brief, "utf8");
  if (briefBytes > MAX_BRIEF_BYTES) {
    fail(`brief is ${Math.round(briefBytes / 1024)}KB; keep large context in workspace files instead of argv`);
  }

  const run = prepareRunDir(opts, brief);
  const timeoutMs = parseDuration(opts.timeout) ?? parseDuration(DEFAULT_TIMEOUT);
  const probe = qoderVersion(timeoutMs);
  const writeResult = makeResultWriter(opts, probe.version, run);
  if (!probe.version && !probe.error) return reportUnavailable(writeResult, run.resultPath);
  if (probe.error) return reportVersionFailure(writeResult, run, probe.error, timeoutMs);
  dispatch(opts, brief, run, writeResult);
}

main();
