#!/usr/bin/env node
/**
 * delegate-skills · opencode-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to the OpenCode CLI (`opencode run`),
 * capture the run, and write a structured result the orchestrating agent can
 * review. The orchestrator runs this one command and reads the result JSON —
 * every OpenCode-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic. Verified against opencode CLI v1.17.13.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `opencode` and `git`. The `opencode` process it
 * launches does authenticate — exactly as you do at the terminal. Read this
 * file before you run it.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's job —
 * after it reviews the diff and re-runs the project gates.
 *
 * OpenCode autonomy is governed by the chosen agent, not a sandbox enum:
 *   build (default) — write-capable; edits files in the working dir headlessly.
 *   plan            — read-only; reviews/diagnoses without touching the tree.
 * A build run passes `--auto` by default so OpenCode never blocks on a permission
 * prompt no one can answer in headless mode; the orchestrator's diff review is the
 * safety net. Pass --no-auto to instead honor the agent's own permission config.
 * A plan (read-only) run never gets --auto, so it can't be auto-approved into edits.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Path to the brief. If omitted, the brief is read from stdin.
 *   --cd <dir>              Working root for OpenCode (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --model <name>          Model as provider/model, or provider/model#variant on opencode 2.x.
 *                           REQUIRED for a fresh run — OpenCode has no
 *                           safe default; a resumed run inherits its session's model.
 *   --agent <name>          OpenCode agent (default: build). Use plan for read-only review.
 *   --read-only             Shortcut for --agent plan (review/diagnosis, no edits).
 *   --variant <name>        Provider reasoning effort (e.g. high, max, minimal). Sent as
 *                           --variant on opencode 1.x; on 2.x it joins the model value
 *                           as provider/model#variant (2.x has no --variant flag).
 *   --no-auto               Don't pass --auto; honor the agent's own permission config (a headless
 *                           run may then hang if the agent is set to ask for a permission).
 *   --resume-last           Continue the most recent OpenCode session; send only the delta brief.
 *   --session <id>          Continue a specific session id (ses_...); send only the delta brief.
 *   --pure                  Run OpenCode without external plugins (cleaner event stream).
 *                           1.x only; rejected on 2.x, which dropped the flag.
 *   --timeout <dur>         Relay-side watchdog (default: off). Durations use h/m/s
 *                           strings like 30m or 2h. On expiry the opencode child is
 *                           killed and result.json gets status "timeout".
 *   --out-dir <dir>         Where to write run artifacts (default: a fresh dir under
 *                           the system temp dir, so the repo under review stays clean).
 *   -h, --help              Show this help.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout —
 *   status, exitCode, signal, opencodeVersion, sessionId (for a later resume), finalMessage
 *   (OpenCode's own report), touchedFiles (git porcelain, null if git can't report), and the
 *   paths to events.jsonl and final.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief) exits 2
 * before any run and writes no result file; a missing `opencode` binary exits 127;
 * otherwise the exit code mirrors OpenCode's own (0 success, non-zero failure).
 * If the child dies on a signal, the exit code is 128 plus the signal number and
 * `result.json` records the signal.
 * Once the brief validates, `result.json` is written on every outcome —
 * completed, failed, timeout (the --timeout watchdog fired), aborted (the relay
 * itself was killed and forwarded the kill to opencode), or
 * opencode_unavailable. An orchestrator that polls for the
 * file must therefore also treat a non-zero exit with no file as a usage error.
 */

import {spawn, execSync, execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, renameSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import {join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { constants, tmpdir } from "node:os";
import { StringDecoder } from "node:string_decoder";
const MAX_BUFFERED_CHARS = 1_048_576;

const VERSION_PROBE_TIMEOUT_MS = 10_000;
const MAX_TIMER_MS = 2_147_483_647;
// model/variant reach cmd.exe on win32 (shell:true for the opencode.cmd shim). The
// model token may carry a variant suffix (provider/model#variant on opencode 2.x), and
// catalog ids carry '@' (Workers AI @cf/..., Vertex model@default, region@eu) and '~'
// (OpenRouter/Kilo ~vendor/model-latest aliases). None of '#', '@' or '~' is a cmd.exe
// metacharacter, and no shell runs off win32. Keep SAFE_TOKEN in lockstep with
// delegate-setup MODEL_TOKEN.shellSafe, and MODEL_TOKEN with MODEL_TOKEN.opencode.
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const MODEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:@~/#-]*$/;

const IMPLEMENTER_KEY = "opencode";

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
    model: null,
    agent: "build",
    variant: null,
    auto: true,
    resumeLast: false,
    session: null,
    pure: false,
    timeout: null,
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
      case "--agent": opts.agent = next(); flagged.add("agent"); break;
      case "--read-only": opts.agent = "plan"; flagged.add("agent"); flagged.add("readOnly"); break;
      case "--variant": opts.variant = next(); flagged.add("variant"); break;
      case "--auto": opts.auto = true; break;
      case "--no-auto": opts.auto = false; break;
      case "--resume-last": opts.resumeLast = true; break;
      case "--session": opts.session = next(); break;
      case "--pure": opts.pure = true; break;
      case "--timeout": opts.timeout = next(); flagged.add("timeout"); break;
      case "--out-dir": opts.outDir = resolve(next()); break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }
  applyFleetLane(opts, flagged);
  if (opts.model !== null && !MODEL_TOKEN.test(opts.model)) {
    fail("--model contains unsupported characters (allowed: letters, digits, . _ : @ ~ / # -)");
  }
  if (opts.variant !== null && !SAFE_TOKEN.test(opts.variant)) {
    fail("--variant contains unsupported characters (allowed: letters, digits, . _ : / -)");
  }
  if (opts.model !== null && opts.model.includes("#") && opts.variant !== null) {
    fail("--model already carries a variant (provider/model#variant); pass either that or --model plus --variant, not both");
  }
  for (const field of ["agent", "session"]) {
    if (opts[field] !== null && !SAFE_TOKEN.test(opts[field])) fail(`--${field} contains unsupported characters`);
  }
  // The watchdog is relay-only (the opencode launch has no timeout flag), so a malformed
  // --timeout must fail loudly here - a silent no-watchdog fallback would be wrong.
  if (opts.timeout !== null && parseDuration(opts.timeout) === null) {
    fail(`--timeout "${opts.timeout}" is invalid or too long; use a positive h/m/s duration no longer than about 24 days`);
  }
  return opts;
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

function headerComment() {
  // The leading block comment doubles as --help text.
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const match = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "relay.mjs — dispatch a brief to opencode run\n";
  return match[1].replace(/^\s*\* ?/gm, "").trim() + "\n";
}

function readBrief(opts) {
  if (opts.brief) {
    if (!existsSync(opts.brief)) fail(`brief file not found: ${opts.brief}`);
    return readFileSync(opts.brief, "utf8");
  }
  // No --brief: read from stdin (fd 0). Empty stdin is an error.
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

function versionProbeTimeout(opts) {
  // The watchdog is only armed once opencode is running, so the preflight needs a bound of
  // its own: an `opencode --version` that never returns would wedge the relay here, before
  // any result.json exists, and --timeout could not reach it.
  const timeoutMs = opts.timeout === null ? null : parseDuration(opts.timeout);
  return timeoutMs === null ? VERSION_PROBE_TIMEOUT_MS : Math.min(timeoutMs, VERSION_PROBE_TIMEOUT_MS);
}

function opencodeVersion(probeTimeoutMs) {
  try {
    // On Windows, npm installs `opencode` as a .cmd shim; Node's CreateProcess only
    // auto-appends .exe, never .cmd, so launching it needs shell:true there or it
    // ENOENTs on a working install. POSIX is unaffected. (git installs a real
    // git.exe and must NOT get this flag — see gitTouchedFiles.)
    const options = {
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: probeTimeoutMs,
      killSignal: "SIGKILL",
    };
    const version = (process.platform === "win32"
      ? execSync("opencode --version", options)
      : execFileSync("opencode", ["--version"], options)).trim();
    return { version: version || "unknown", error: null };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: null, error: null };
    // shell:true routes a missing binary through cmd.exe, which reports it as a non-zero
    // exit rather than ENOENT; that is still "not installed", not a broken install.
    if (process.platform === "win32" &&
        /not recognized as an internal or external command/i.test(String(error?.stderr || ""))) {
      return { version: null, error: null };
    }
    // Anything else — a hung probe we killed, or a real non-zero exit — means opencode is
    // installed but not usable. Reporting that as "unavailable" would send the caller
    // off to reinstall a binary that is already there.
    return { version: null, error };
  }
}

// opencode 2.x replaced the --variant flag with a provider/model#variant model value
// (2.0.11's `run --help` documents exactly that format and ships no --variant flag);
// 1.x still documents --variant. The preflight above already probed the version, so the
// dial mapping gates on it. An unparseable string falls back to the 1.x mapping — the
// flag every opencode line has accepted so far.
function opencodeJoinsVariant(version) {
  const match = /(\d+)(?:\.\d+)*/.exec(String(version || ""));
  return match !== null && Number(match[1]) >= 2;
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
  // Local script (not a workflow): Date is available and fine here.
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildArgv(opts, version) {
  const argv = ["run", "--format", "json"];
  if (opts.pure) argv.push("--pure");
  // Resume continues an existing session; --session pins a specific id, otherwise
  // --continue picks up the most recent one. OpenCode selects the agent for each
  // prompt, so preserve the relay's requested autonomy on resumed turns too.
  if (opts.session) {
    argv.push("--session", opts.session);
  } else if (opts.resumeLast) {
    argv.push("--continue");
  }
  argv.push("--agent", opts.agent);
  // Variant dial: 2.x folds it into the model value as provider/model#variant (it has
  // no --variant flag); 1.x still takes --variant. See opencodeJoinsVariant.
  const joinsVariant = Boolean(opts.model && opts.variant) && opencodeJoinsVariant(version);
  if (opts.model) {
    argv.push("--model", joinsVariant ? `${opts.model}#${opts.variant}` : opts.model);
  }
  if (opts.variant && !joinsVariant) argv.push("--variant", opts.variant);
  // --auto (on by default) auto-approves permissions so a headless build run doesn't
  // block on a prompt no one can answer; --no-auto honors the agent's own config.
  // Never on a plan (read-only) run: --auto would approve the plan agent's ask-gated
  // edit/bash permissions and let a "read-only" review modify the tree. A plan run
  // only reads, so it doesn't need auto-approval anyway.
  if (opts.auto && opts.agent !== "plan") argv.push("--auto");
  // No message argument: the brief is piped on stdin (see dispatchToOpenCode),
  // which avoids all argv-quoting issues with multi-line, XML-tagged briefs.
  return argv;
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  // Default the run dir to system temp so the repo under review stays pristine —
  // the touched-files report must show only OpenCode's edits, not relay's artifacts.
  const outDir = opts.outDir || join(tmpdir(), "delegate-relay", `${basename(opts.cd) || "repo"}-${timestamp()}`);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  for (const name of ["brief.txt", "events.jsonl", "final.txt", "result.json"]) {
    if (existsSync(join(outDir, name))) fail(`refusing to reuse existing run artifacts: ${outDir}`);
  }
  const run = {
    startedAt,
    eventsPath: join(outDir, "events.jsonl"),
    finalPath: join(outDir, "final.txt"),
    briefPath: join(outDir, "brief.txt"),
    resultPath: join(outDir, "result.json"),
  };
  writeFileSync(run.briefPath, brief, "utf8");
  writeFileSync(run.eventsPath, "", "utf8");
  return run;
}

function makeResultWriter(opts, version, run) {
  // Returns writeResult(extra): merges the per-outcome fields onto the run's
  // standing metadata, persists result.json, and returns the object it just
  // wrote so the caller can hand it straight to printSummary.
  return (extra) => {
    const resuming = Boolean(opts.session || opts.resumeLast);
    const result = {
      schema: "delegate-relay.result.v1",
      lane: opts.lane,
      laneSource: opts.laneSource,
      tool: "opencode",
      workdir: opts.cd,
      agent: opts.agent,
      model: opts.model,
      variant: opts.variant,
      auto: opts.auto,
      resumed: resuming,
      resumeLast: opts.resumeLast,
      opencodeVersion: version,
      startedAt: run.startedAt,
      finishedAt: new Date().toISOString(),
      briefPath: run.briefPath,
      eventsPath: run.eventsPath,
      finalPath: existsSync(run.finalPath) ? run.finalPath : null,
      ...extra,
    };
    // Publish atomically so a polling orchestrator never reads a half-written file
    // (same idiom as claude-delegate's writeJsonAtomic and qoder-delegate).
    const temporary = `${run.resultPath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    renameSync(temporary, run.resultPath);
    return result;
  };
}

function reportUnavailable(writeResult, resultPath) {
  const result = writeResult({ status: "opencode_unavailable", exitCode: 127, signal: null, sessionId: null, finalMessage: "", touchedFiles: null, cost: null });
  printSummary(result, resultPath);
  process.stderr.write("relay: `opencode` not found on PATH. Install it (npm i -g opencode-ai) and run `opencode auth login`.\n");
  process.exit(127);
}

function reportVersionFailure(opts, writeResult, run, error, probeTimeoutMs) {
  const timedOut = error?.code === "ETIMEDOUT";
  const stderr = String(error?.stderr || "").trim();
  const message = timedOut
    ? `opencode --version preflight timed out after ${probeTimeoutMs}ms; OpenCode was not dispatched`
    : `opencode --version preflight failed${Number.isInteger(error?.status) ? ` with exit ${error.status}` : ""}; OpenCode was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error?.status) ? error.status : 1,
    signal: null,
    sessionId: null,
    finalMessage: "",
    touchedFiles: gitTouchedFiles(opts.cd),
    cost: null,
    stderrTail: stderr ? stderr.split("\n").slice(-20) : [],
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function spawnShellLaunch(binary, argv, options, useShell) {
  if (!useShell) return spawn(binary, argv, options);
  // Node 24 warns when shell:true is paired with an args array. The args here
  // are already token-validated or quoted for cmd.exe, so serialize them once.
  return spawn([binary, ...argv].join(" "), { ...options, shell: true });
}

function dispatchToOpenCode(opts, brief, run, writeResult, version) {
  const argv = buildArgv(opts, version);
  // Pin the working root two ways: `cwd` sets the child's real directory, and PWD
  // is set explicitly because OpenCode can resolve its project root from the
  // inherited PWD env — which spawn does NOT rewrite — so without it a run could
  // operate on the orchestrator's directory instead of opts.cd (and, with --auto
  // on, edit it unattended). Passing the path via env, not argv, keeps it clear of
  // shell quoting.
  // shell:true on Windows so the opencode.cmd shim resolves (see opencodeVersion).
  // Safe: the brief is fed via child.stdin below — never argv — and argv holds only
  // flag names, an agent enum, a model string, and a session id, with no shell
  // metacharacters or spaceable paths.
  const child = spawnShellLaunch("opencode", argv, {
    cwd: opts.cd,
    env: { ...process.env, PWD: opts.cd },
    stdio: ["pipe", "pipe", "pipe"],
    detached: process.platform !== "win32", // POSIX: lead a new process group so killChild can fell the whole tree
  }, process.platform === "win32");

  let sessionId = opts.session || null;
  let totalCost = 0;
  let sawCost = false;
  const textParts = new Map(); // part.id -> latest text
  const textOrder = []; // part.ids in first-seen order
  const stderrTail = [];

  const scan = makeEventScanner((event) => {
    // Session id: real events carry `sessionID` (camelCase); plugin notify objects
    // carry `session_id` (snake_case). Accept either.
    const sid = event.sessionID || event.session_id;
    if (sid) sessionId = sid;
    // Assistant text lives in `type:"text"` events under part.text. Key by part.id
    // so streamed updates to the same part replace rather than duplicate; preserve
    // first-seen order so multi-segment messages assemble correctly.
    if (event.type === "text" && event.part && event.part.type === "text") {
      const id = event.part.id || `anon-${textOrder.length}`;
      if (!textParts.has(id)) textOrder.push(id);
      textParts.set(id, event.part.text ?? "");
    }
    if (event.type === "step_finish" && event.part && typeof event.part.cost === "number") {
      totalCost += event.part.cost;
      sawCost = true;
    }
  });

  // Decode across chunk boundaries: a multibyte UTF-8 character split between
  // two data events would otherwise decode as U+FFFD and corrupt the report.
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  child.stdout.on("data", (chunk) => {
    appendFileSync(run.eventsPath, chunk); // faithful raw record of the event stream
    scan(stdoutDecoder.write(chunk));
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk); // surface OpenCode progress live for the orchestrator
    const text = stderrDecoder.write(chunk);
    for (const line of text.split("\n")) {
      if (line.trim()) stderrTail.push(line.trimEnd());
    }
    while (stderrTail.length > 20) stderrTail.shift();
  });

  const assembleFinal = () => {
    const message = textOrder.map((id) => textParts.get(id)).join("").trim();
    if (message) writeFileSync(run.finalPath, message, "utf8");
    return message;
  };

  let settled = false;
  let watchdogFired = false;
  let watchdogTimer = null;
  let sigkillTimer = null;
  const timeoutMs = opts.timeout === null ? null : parseDuration(opts.timeout);
  if (timeoutMs !== null) {
    watchdogTimer = setTimeout(() => {
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
  }

  const clearWatchdog = () => {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    if (sigkillTimer) clearTimeout(sigkillTimer);
  };

  // The relay's own death must still produce a result: without this, a kill from the
  // orchestrator's side (its command timeout, a stopped task, a closed terminal) writes
  // no result.json and leaves the opencode child running or dying mid-edit with nothing
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
        finalMessage: assembleFinal(),
        touchedFiles: gitTouchedFiles(opts.cd),
        cost: sawCost ? Number(totalCost.toFixed(6)) : null,
        stderrTail: stderrTail.slice(-20),
        error: `the relay was killed by ${sig}; opencode was terminated with it — inspect the working tree before re-dispatching`,
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

  // A grandchild that outlives opencode and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once opencode itself is
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
    const result = writeResult({ status: "failed", exitCode: 1, signal: null, sessionId, finalMessage: assembleFinal(), touchedFiles: gitTouchedFiles(opts.cd), cost: sawCost ? totalCost : null, error: String(err && err.message ? err.message : err) });
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
    const finalMessage = assembleFinal();
    // A timed-out run is never a success even if opencode handles SIGTERM by exiting 0 -
    // orchestrators key off status and the relay exit code.
    const succeeded = code === 0 && !watchdogFired;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode: succeeded ? 0 : mapped === 0 ? 1 : mapped,
      signal: signal ?? null,
      sessionId,
      finalMessage,
      touchedFiles: gitTouchedFiles(opts.cd),
      cost: sawCost ? Number(totalCost.toFixed(6)) : null,
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired ? { error: `opencode did not finish within --timeout ${opts.timeout}; killed by the relay watchdog` } : {}),
    });
    printSummary(result, run.resultPath);
    process.exit(result.exitCode);
  });

  // If the child failed to launch, writing to its stdin can emit a stray 'error'
  // on the pipe; the 'error' handler above owns that outcome, so swallow it here.
  child.stdin.on("error", () => {});
  child.stdin.write(brief);
  child.stdin.end();
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("empty brief (pass --brief <file> or pipe the brief on stdin)");
  // --session pins a specific session and --resume-last picks the most recent; passing both is a
  // contradiction, and buildArgv would silently prefer --session. Reject it rather than guess.
  if (opts.session && opts.resumeLast) {
    fail("--session and --resume-last are mutually exclusive; pass only one");
  }
  // OpenCode has no safe default model (a bare `opencode run` errors), so a fresh run must name one.
  // A resumed run inherits its session's model, so --model is optional there.
  if (!opts.model && !opts.resumeLast && !opts.session) {
    fail("no model given: pass --model provider/model — opencode has no safe default (e.g. a plan you're subscribed to, like opencode-go/kimi-k2.7-code)");
  }

  // Prepare the run dir before probing, so a preflight that times out or fails still has
  // somewhere to publish result.json rather than exiting silently.
  const run = prepareRunDir(opts, brief);
  const probeTimeoutMs = versionProbeTimeout(opts);
  const probe = opencodeVersion(probeTimeoutMs);
  const writeResult = makeResultWriter(opts, probe.version, run);

  if (!probe.version && !probe.error) {
    reportUnavailable(writeResult, run.resultPath);
    return;
  }
  if (probe.error) {
    reportVersionFailure(opts, writeResult, run, probe.error, probeTimeoutMs);
    return;
  }
  // A resumed run may inherit its session's model, but a variant can only join a model
  // value — on 2.x there is no --variant flag to fall back to.
  if (opts.variant && !opts.model && opencodeJoinsVariant(probe.version)) {
    fail("--variant needs --model on opencode 2.x: the variant joins the model value as provider/model#variant");
  }
  // 2.x dropped --pure from `opencode run` (same version gate as the variant dial).
  if (opts.pure && opencodeJoinsVariant(probe.version)) {
    fail("--pure is not supported on opencode 2.x: `opencode run` dropped the flag and has no replacement; drop --pure");
  }

  dispatchToOpenCode(opts, brief, run, writeResult, probe.version);
}

function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(`relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""})  ·  opencode ${result.opencodeVersion ?? "?"}`);
  if (result.signal === "SIGKILL" && result.status === "failed") lines.push("hint: the host killed the process (commonly the OOM killer or a supervisor timeout) — this is not an opencode error; check host memory and re-dispatch, or split the task into smaller briefs.");
  if (result.signal === "SIGTERM" && result.status === "failed") lines.push("hint: something outside the relay terminated opencode (a supervisor, the session ending, or a manual kill) — when the relay itself does the killing it reports status \"timeout\" or \"aborted\" instead; inspect the working tree before re-dispatching.");
  if (result.resumed) lines.push("mode: resumed existing session");
  if (result.sessionId) lines.push(`session id (resume with: --session ${result.sessionId}): ${result.sessionId}`);
  if (typeof result.cost === "number") lines.push(`cost: $${result.cost}`);
  const touched = result.touchedFiles;
  if (touched === null) {
    lines.push("touched files: git unavailable — inspect the working tree directly");
  } else {
    lines.push(`touched files: ${touched.length}`);
    for (const file of touched.slice(0, 40)) lines.push(`  ${file}`);
    if (touched.length > 40) lines.push(`  … and ${touched.length - 40} more`);
  }
  if (result.stderrTail && result.stderrTail.length) {
    lines.push("last stderr:");
    for (const line of result.stderrTail.slice(-8)) lines.push(`  ${line}`);
  }
  lines.push("");
  lines.push("--- opencode final report ---");
  lines.push(result.finalMessage || "(no final message captured)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push("relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
