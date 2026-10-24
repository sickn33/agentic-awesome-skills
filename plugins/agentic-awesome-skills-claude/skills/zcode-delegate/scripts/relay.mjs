#!/usr/bin/env node
/**
 * delegate-skills · zcode-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to the Z.AI ZCode CLI, capture the run, and
 * write a structured result the orchestrating agent can review. The
 * orchestrator runs this one command and reads the result JSON — every
 * ZCode-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic. Verified on Claude Code; other shell-capable agents
 * (OpenCode, Cursor, …) are designed-for but not yet verified.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `zcode` (or `node <bundle>`) and `git`. The
 * ZCode process it launches does authenticate — exactly as you do at the
 * terminal. Read this file before you run it.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's
 * job — after it reviews the diff and re-runs the project gates.
 *
 * Finding the CLI: ZCode ships its CLI inside the desktop app rather than on
 * PATH or npm, so the relay resolves it as --zcode-path/ZCODE_CLI → PATH → the
 * installed app bundle, and records which route won in result.json.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Path to the brief. If omitted, the brief is read from stdin.
 *   --cd <dir>              Working root for ZCode (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --mode <mode>           ZCode's own --mode. Only `plan` and `yolo` are accepted
 *                           (default: yolo). ZCode also documents `build` and `edit`,
 *                           but a headless run has no permission client, so those two
 *                           block every write tool and exit 0 having changed nothing;
 *                           this relay rejects them rather than report that as success.
 *   --read-only             Shortcut for --mode plan (review/diagnosis, no edits).
 *   --disallowed-tools <l>  Comma/space-separated tool denylist, e.g. "Write,Edit,Bash".
 *                           Enforced by ZCode. There is no --allowed-tools counterpart.
 *   --resume-last           Continue the latest ZCode session for --cd; send only the
 *                           delta brief. Scoped to the directory, not a global "last".
 *   --session <id>          Continue a specific ZCode session by its sess_... id (from a
 *                           prior result.json). Mutually exclusive with --resume-last.
 *   --zcode-path <file>     Path to the ZCode CLI (a Node bundle or native executable; no shell shims).
 *                           Overrides PATH and bundle discovery; ZCODE_CLI does the same.
 *   --timeout <dur>         Relay-side watchdog (default: off). Durations use h/m/s
 *                           strings like 30m or 2h. On expiry the ZCode child is killed
 *                           and result.json gets status "timeout". ZCode has no timeout
 *                           flag of its own, so the watchdog is relay-only.
 *   --out-dir <dir>         Where to write run artifacts (default: a fresh dir under
 *                           the system temp dir, so the repo under review stays clean).
 *   -h, --help              Show this help.
 *
 * Brief delivery: ZCode reads no stdin, so the brief is written to brief.md in
 * the run directory and passed with ZCode's own --attach. That also keeps the
 * brief clear of the command line, which is bounded on Windows.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout —
 *   status, exitCode, signal, zcodeVersion, zcodeSource, mode, sessionId (for a later
 *   resume), finalMessage (ZCode's own report), touchedFiles (git porcelain, null if git
 *   can't report), readOnlyViolation, usage, contextWindow, and the paths to the raw
 *   output and final.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief, a rejected
 * --mode) exits 2 before any run and writes no result file; a ZCode CLI that
 * cannot be found — including one named explicitly that does not exist — exits
 * 127 and DOES write one; otherwise the exit code mirrors ZCode's own (0
 * success, non-zero failure). If the child dies on a signal, the exit code is
 * 128 plus the signal number and `result.json` records the signal.
 * Once the brief validates, `result.json` is written on every outcome —
 * completed, failed, timeout (the --timeout watchdog fired), aborted (the relay
 * itself was killed and forwarded the kill to ZCode), or zcode_unavailable. An
 * orchestrator that polls for the file must therefore also treat a non-zero exit
 * with no file as a usage error.
 */

import {spawn, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, readFileSync, readdirSync, existsSync, appendFileSync, statSync, readlinkSync, lstatSync, openSync, readSync, closeSync, realpathSync } from "node:fs";
import {join, resolve, basename, dirname, sep, isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { constants, tmpdir, homedir } from "node:os";
import { StringDecoder } from "node:string_decoder";
import { createHash } from "node:crypto";

const VERSION_PROBE_TIMEOUT_MS = 10_000;
const MAX_BUFFERED_CHARS = 1_048_576;
const MAX_TIMER_MS = 2_147_483_647;
const SCHEMA = "delegate-relay.result.v1";
// ZCode's own --mode. build/edit are documented by the CLI but omitted here: a
// headless run has no permission client, so they block every write tool and exit
// 0 having changed nothing. Reporting that as "completed" is the failure mode
// this repo already hit once (issue #55), so they are rejected up front instead.
const ZCODE_MODES = new Set(["plan", "yolo"]);
const ZCODE_REJECTED_MODES = new Set(["build", "edit"]);
// Keep ZCode session ids within the documented sess_ token shape.
const SAFE_SESSION = /^sess_[A-Za-z0-9][A-Za-z0-9._:-]*$/;
// ZCode accepts comma- or space-separated tool names, optionally with a pattern.
const SAFE_TOOLS = /^[A-Za-z0-9][A-Za-z0-9 ,.:*()_/-]*$/;

// ZCode reads no stdin, so the brief travels as an attached file and the prompt
// is this fixed instruction. Keep the two in lockstep with writing-the-brief.md.
const ATTACH_PROMPT = "Follow the attached brief exactly.";
const BUNDLE_RELATIVE = ["resources", "glm", "zcode.cjs"];

const IMPLEMENTER_KEY = "zcode";

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
    if (field === "readOnly" && (flagged.has("readOnly") || flagged.has("mode"))) continue;
    if (field === "force" && flagged.has("force")) continue;
    opts[field] = value;
    if (field === "sandbox") opts.sandboxConfigured = true;
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
    mode: null,
    readOnly: false,
    disallowedTools: null,
    resumeLast: false,
    session: null,
    zcodePath: null,
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
      case "--mode": opts.mode = next(); flagged.add("mode"); flagged.add("permissionMode"); break;
      case "--read-only": opts.readOnly = true; flagged.add("readOnly"); break;
      case "--disallowed-tools": opts.disallowedTools = next(); flagged.add("disallowedTools"); break;
      case "--resume-last": opts.resumeLast = true; break;
      case "--session": opts.session = next(); break;
      case "--zcode-path": opts.zcodePath = resolve(next()); break;
      case "--timeout": opts.timeout = next(); flagged.add("timeout"); break;
      case "--out-dir": opts.outDir = resolve(next()); break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }
  applyFleetLane(opts, flagged);
  // delegate-setup carries ZCode's --mode as the `permissionMode` dial, so accept
  // either name from a lane without inventing a second dial vocabulary.
  if (opts.mode === null && typeof opts.permissionMode === "string") opts.mode = opts.permissionMode;
  if (opts.readOnly && opts.mode !== null && opts.mode !== "plan") {
    fail(`--read-only conflicts with --mode ${opts.mode}; read-only runs use ZCode's plan mode`);
  }
  if (opts.mode === null) opts.mode = opts.readOnly ? "plan" : "yolo";
  if (ZCODE_REJECTED_MODES.has(opts.mode)) {
    fail(`--mode ${opts.mode} cannot write in a headless run: ZCode has no permission client there, so its write tools are blocked and the run exits 0 having changed nothing. Use --mode yolo to write, or --read-only for plan mode.`);
  }
  if (!ZCODE_MODES.has(opts.mode)) {
    fail(`invalid --mode "${opts.mode}" (expected: ${[...ZCODE_MODES].join(", ")})`);
  }
  opts.readOnly = opts.mode === "plan";
  if (opts.disallowedTools !== null && !SAFE_TOOLS.test(opts.disallowedTools)) {
    fail("--disallowed-tools contains unsupported characters (allowed: letters, digits, spaces, and , . : * ( ) _ / -)");
  }
  // The watchdog is relay-only (ZCode has no timeout flag), so a malformed
  // --timeout must fail loudly here - a silent no-watchdog fallback would be wrong.
  if (opts.timeout !== null && parseDuration(opts.timeout) === null) {
    fail(`--timeout "${opts.timeout}" is invalid or too long; use a positive h/m/s duration no longer than about 24 days`);
  }
  if (opts.session !== null && opts.resumeLast) {
    fail("--session and --resume-last are mutually exclusive; pass only one");
  }
  // Accept only the sess_ token shape ZCode itself issues.
  if (opts.session !== null && !SAFE_SESSION.test(opts.session)) {
    fail("--session must be a ZCode session id of the form sess_... (letters, digits, . _ : -)");
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
  if (!match) return "relay.mjs — dispatch a brief to the ZCode CLI\n";
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
  // The watchdog is only armed once ZCode is running, so the preflight needs a bound of
  // its own: a `zcode --version` that never returns would wedge the relay here, before
  // any result.json exists, and --timeout could not reach it.
  const timeoutMs = opts.timeout === null ? null : parseDuration(opts.timeout);
  return timeoutMs === null ? VERSION_PROBE_TIMEOUT_MS : Math.min(timeoutMs, VERSION_PROBE_TIMEOUT_MS);
}

/** Walk PATH for a bare binary name, honouring PATHEXT on win32. */
function onPath(binary) {
  const pathValue = process.env.PATH || process.env.Path || "";
  if (!pathValue) return null;
  const entries = pathValue
    .split(process.platform === "win32" ? ";" : ":")
    .map((entry) => entry.replace(/^"(.*)"$/, "$1"))
    .filter((entry) => entry.length > 0);
  const suffixes = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").map((ext) => ext.trim()).filter(Boolean)
    : [""];
  for (const entry of entries) {
    for (const suffix of suffixes) {
      const candidate = join(resolve(entry), `${binary}${suffix}`);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // keep looking
      }
    }
  }
  return null;
}

/** Where the ZCode desktop app keeps its bundled CLI, per platform. */
function bundleCandidates() {
  const home = homedir();
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || join(home, "AppData", "Local");
    return [join(local, "Programs", "ZCode", ...BUNDLE_RELATIVE)];
  }
  if (process.platform === "darwin") {
    return [
      join("/Applications", "ZCode.app", "Contents", "Resources", "glm", "zcode.cjs"),
      join(home, "Applications", "ZCode.app", "Contents", "Resources", "glm", "zcode.cjs"),
    ];
  }
  // Linux ships an AppImage with no fixed install path, so there is nothing
  // honest to guess: --zcode-path or ZCODE_CLI is required there.
  return [];
}

function asTarget(file, source) {
  // The bundled CLI is a Node bundle, not an executable, so it runs under node
  // and needs no shell. A binary or a .cmd/.bat shim launches as itself.
  return /\.(?:c?js|mjs)$/i.test(file)
    ? { command: process.execPath, prefixArgs: [file], display: file, source }
    : { command: file, prefixArgs: [], display: file, source };
}

/**
 * Resolve the ZCode CLI: --zcode-path/ZCODE_CLI → PATH → installed app bundle.
 * Returns null when none is found, which the caller reports as
 * zcode_unavailable (127 WITH a result file) — never a usage error. A CLI named
 * explicitly that does not exist is the same condition as finding none, so it
 * takes the same path rather than exiting 2.
 */
function resolveZcode(opts) {
  const named = opts.zcodePath || (process.env.ZCODE_CLI || "").trim();
  if (named) {
    if (!existsSync(named)) return null;
    return asTarget(resolve(named), opts.zcodePath ? "flag" : "env");
  }
  const fromPath = onPath("zcode");
  if (fromPath) return asTarget(fromPath, "path");
  for (const candidate of bundleCandidates()) {
    if (existsSync(candidate)) return asTarget(candidate, "bundle");
  }
  return null;
}

/** Shell shims are never interpreted; callers must choose a reviewed CLI entry. */
export function assertDirectExecutable(command) {
  if (/\.(?:cmd|bat)$/i.test(command)) {
    const error = new Error("Shell shims (.cmd/.bat) are unsupported; select the reviewed ZCode Node CLI entry (.cjs/.mjs/.js) or native executable with --zcode-path");
    error.code = "UNSUPPORTED_SHELL_SHIM";
    throw error;
  }
}

function zcodeVersion(target, probeTimeoutMs) {
  try {
    // Refuse shell shims before version probing as well as runtime dispatch.
    assertDirectExecutable(target.command);
    const options = {
      encoding: "utf8",
      shell: false,
      timeout: probeTimeoutMs,
      killSignal: "SIGKILL",
      env: process.env,
    };
    const version = execFileSync(target.command, [...target.prefixArgs, "--version"], options).trim();
    return { version: version || "unknown", error: null };
  } catch (error) {
    if (error?.code === "ENOENT") return { version: null, error: null };
    // Anything else — a hung probe we killed, or a real non-zero exit — means ZCode is
    // installed but not usable. Reporting that as "unavailable" would send the caller
    // off to reinstall a CLI that is already there.
    return { version: null, error };
  }
}

const FINGERPRINT_UNREADABLE = "<unreadable>";
const FINGERPRINT_DIRECTORY = "<directory>";

function gitRepoRoot(cwd) {
  // Porcelain paths are relative to the repository ROOT, not to the directory git ran in
  // (--porcelain forces status.relativePaths off). Joining them against a --cd that is a
  // subdirectory would look for <repo>/src/src/file and find nothing at either end.
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
    }).replace(/\n$/, "") || null;
  } catch {
    return null;
  }
}

function gitStatusEntries(cwd) {
  // -z so a path containing a space, a quote, or a newline stays one field rather than being
  // quoted and escaped; -uall so an untracked directory is expanded into its files, because a
  // collapsed "?? dir/" line never changes when a file inside it does.
  try {
    const output = execFileSync("git", ["status", "--porcelain", "-z", "-uall"], {
      cwd,
      timeout: 10_000,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    const fields = new TextDecoder("utf-8", { fatal: true }).decode(output)
      .split("\0").filter((field) => field.length > 0);
    const entries = [];
    for (let i = 0; i < fields.length; i += 1) {
      const entry = fields[i];
      const status = entry.slice(0, 2);
      const path = entry.slice(3);
      // R and C can sit in EITHER status column, and under -z such an entry is followed by its
      // origin path as its own unprefixed field. Consume that field in both cases. A rename
      // origin belongs in the dirty set (the file moved away from it); a copy origin does not,
      // since a copy source can be a perfectly clean file.
      const renamed = status.includes("R");
      const copied = status.includes("C");
      let origin = null;
      if (renamed || copied) {
        i += 1;
        origin = fields[i] ?? null;
      }
      entries.push({ status, path, origin });
    }
    return entries;
  } catch {
    return null;
  }
}

function dirtyPaths(cwd) {
  const entries = gitStatusEntries(cwd);
  if (entries === null) return null;
  const paths = [];
  for (const entry of entries) {
    paths.push(entry.path);
    if (entry.status.includes("R") && entry.origin !== null) paths.push(entry.origin);
  }
  return paths;
}

function asciiFold(value) {
  return value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

function canonicalFilePath(path) {
  const absolute = resolve(path);
  let parent;
  try { parent = realpathSync.native(dirname(absolute)); } catch { return absolute; }
  const leaf = basename(absolute);
  const canonical = join(parent, leaf);
  try { lstatSync(canonical); } catch { return canonical; }
  try {
    const entries = readdirSync(parent);
    if (entries.includes(leaf)) return canonical;
    const matches = entries.filter((entry) => asciiFold(entry) === asciiFold(leaf));
    return join(parent, matches.length === 1 ? matches[0] : leaf);
  } catch {
    return canonical;
  }
}

function gitPathKey(root, path) {
  let canonicalRoot;
  try { canonicalRoot = realpathSync.native(root); } catch { canonicalRoot = resolve(root); }
  const key = relative(canonicalRoot, canonicalFilePath(path));
  return process.platform === "win32" ? key.replaceAll("\\", "/") : key;
}

function gitPathIsExcluded(root, path, excluded, foldedExcluded) {
  return excluded.has(path) ||
    (foldedExcluded.has(asciiFold(path)) && excluded.has(gitPathKey(root, join(root, path))));
}

function gitTripwireState(cwd, excludedPaths) {
  const root = gitRepoRoot(cwd);
  if (root === null) return null;
  const entries = gitStatusEntries(cwd);
  if (entries === null) return null;
  const excluded = new Set(excludedPaths.map((path) => gitPathKey(root, path)));
  const foldedExcluded = new Set([...excluded].map(asciiFold));
  return entries.flatMap((entry) => [
    [entry.status, "path", entry.path],
    ...(entry.origin === null ? [] : [[entry.status.replace(/[^RC]/g, " "), "origin", entry.origin]]),
  ]
    .filter(([, , path]) => !gitPathIsExcluded(root, path, excluded, foldedExcluded)));
}

function pathFingerprint(absolutePath) {
  // Identity, not just bytes: a retargeted symlink, a flipped mode bit, or a file replaced by a
  // directory are all writes, and none of them change file contents.
  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    // Absence is a state, not a failure - it differs from every real fingerprint, so a deletion
    // or a re-creation still registers. Any other errno means we genuinely cannot tell.
    return error && error.code === "ENOENT" ? "absent" : FINGERPRINT_UNREADABLE;
  }
  if (stats.isSymbolicLink()) {
    try {
      return `symlink:${readlinkSync(absolutePath, { encoding: "buffer" }).toString("hex")}`;
    } catch {
      return FINGERPRINT_UNREADABLE;
    }
  }
  // A directory in the dirty set is a submodule, whose contents belong to another repository.
  // Reported as unknown coverage rather than silently passed off as unchanged.
  if (stats.isDirectory()) return FINGERPRINT_DIRECTORY;
  if (!stats.isFile()) return FINGERPRINT_UNREADABLE;
  let fd;
  try {
    // Streamed rather than read whole: an unignored multi-gigabyte artifact must not be pulled
    // into memory just to answer whether it changed.
    const hash = createHash("sha256");
    fd = openSync(absolutePath, "r");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const read = readSync(fd, buffer, 0, buffer.length, null);
      if (read <= 0) break;
      hash.update(buffer.subarray(0, read));
    }
    return `file:${(stats.mode & 0o7777).toString(8)}:${hash.digest("hex")}`;
  } catch {
    return FINGERPRINT_UNREADABLE;
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* already closed */ }
    }
  }
}

function gitIndexFingerprints(root, paths) {
  if (paths.length === 0) return new Map();
  try {
    const output = execFileSync("git", ["ls-files", "--stage", "-z"], {
      cwd: root,
      timeout: 10_000,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    const wanted = new Set(paths);
    const prints = new Map(paths.map((path) => [path, []]));
    for (const field of new TextDecoder("utf-8", { fatal: true }).decode(output).split("\0")) {
      if (!field) continue;
      const separator = field.indexOf("\t");
      if (separator === -1) return null;
      const path = field.slice(separator + 1);
      if (wanted.has(path)) prints.get(path).push(field.slice(0, separator));
    }
    return prints;
  } catch {
    return null;
  }
}

function fingerprintPaths(root, paths) {
  // `complete` goes false the moment one path cannot be fingerprinted, so the caller reports
  // "unknown" instead of an unearned clean bill of health.
  const indexPrints = gitIndexFingerprints(root, paths);
  const prints = new Map();
  let complete = indexPrints !== null;
  for (const path of paths) {
    const file = pathFingerprint(join(root, path));
    if (file === FINGERPRINT_UNREADABLE || file === FINGERPRINT_DIRECTORY) complete = false;
    prints.set(path, { file, index: indexPrints?.get(path) ?? null });
  }
  return { prints, complete };
}

function fingerprintDirtyPaths(cwd, excludedPaths) {
  // Only the already-dirty set is covered. A path that is clean at dispatch and gets written
  // surfaces as a brand-new porcelain line anyway, and fingerprinting a whole repository per run
  // would cost far more than the case it covers.
  const root = gitRepoRoot(cwd);
  if (root === null) return null;
  const paths = dirtyPaths(cwd);
  if (paths === null) return null;
  const excluded = new Set(excludedPaths.map((path) => gitPathKey(root, path)));
  const foldedExcluded = new Set([...excluded].map(asciiFold));
  return {
    root,
    ...fingerprintPaths(root, paths.filter((path) => !gitPathIsExcluded(root, path, excluded, foldedExcluded))),
  };
}

function changedDirtyPaths(before) {
  // Re-fingerprint exactly the baseline paths, not whatever happens to be dirty now: a path the
  // run newly dirtied is already reported by the porcelain comparison, and letting an unreadable
  // one of those blind this signal would be a regression, not caution.
  if (!before) return { changed: [], complete: false };
  const now = fingerprintPaths(before.root, [...before.prints.keys()]);
  const changed = [];
  for (const [path, print] of before.prints) {
    const current = now.prints.get(path);
    const fileKnown = print.file !== FINGERPRINT_UNREADABLE && current.file !== FINGERPRINT_UNREADABLE;
    const fileChanged = fileKnown &&
      !(print.file === FINGERPRINT_DIRECTORY && current.file === FINGERPRINT_DIRECTORY) &&
      current.file !== print.file;
    const indexChanged = print.index !== null && current.index !== null &&
      JSON.stringify(current.index) !== JSON.stringify(print.index);
    if (fileChanged || indexChanged) changed.push(path);
  }
  return { changed: changed.sort(), complete: before.complete && now.complete };
}

function readOnlyVerdict(beforeTree, afterTree, beforeFingerprints) {
  // Three-valued on purpose. Proof of a write settles it even when the other signal is unknown;
  // only when nothing is proven AND coverage is incomplete is the answer genuinely unknown.
  // Collapsing that last case to false is the false assurance a tripwire must never give.
  const changed = changedDirtyPaths(beforeFingerprints);
  const porcelainMoved =
    beforeTree !== null && afterTree !== null && JSON.stringify(beforeTree) !== JSON.stringify(afterTree);
  if (porcelainMoved || changed.changed.length > 0) return true;
  if (beforeTree === null || afterTree === null || !changed.complete) return null;
  return false;
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

function buildArgv(opts, target, briefPath) {
  // Keep logical argv raw; quote and validate exactly once at the shim boundary.
  const quote = (value) => value; // Quote exactly once at the shim invocation boundary.
  const argv = ["--cwd", quote(opts.cd), "--json", "--no-color", "--mode", opts.mode];
  if (opts.disallowedTools) argv.push("--disallowed-tools", quote(opts.disallowedTools));
  // ZCode's own resume terms: --resume takes a sess_ id, -c continues the latest
  // session for --cwd (directory-scoped, not a global "last").
  if (opts.session) argv.push("--resume", opts.session);
  else if (opts.resumeLast) argv.push("-c");
  // The brief is a file, not prompt text: ZCode reads no stdin, and argv is
  // bounded on Windows. --prompt carries only the fixed instruction.
  argv.push("--attach", quote(briefPath), "--prompt", quote(ATTACH_PROMPT));
  return argv;
}

/**
 * ZCode's --json prints ONE JSON document at the end, not a stream of events —
 * but stdout is not guaranteed to be pure JSON: the bundled AI SDK emits its
 * warning banner through console.info, which is stdout, ahead of the document.
 * So skip to the first brace rather than parsing the whole buffer. Returns null
 * when nothing parses, which the caller reports rather than hides.
 */
function parseZcodeOutput(stdout) {
  const start = stdout.indexOf("{");
  if (start === -1) return null;
  try {
    const parsed = JSON.parse(stdout.slice(start));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function prepareRunDir(opts, brief) {
  const startedAt = new Date().toISOString();
  // Default the run dir to system temp so the repo under review stays pristine —
  // the touched-files report must show only ZCode's edits, not relay's artifacts.
  const outDir = opts.outDir || mkdtempSync(join(tmpdir(), "delegate-relay-"));
  if (opts.outDir) {
    if (existsSync(outDir) || (() => { try { return lstatSync(outDir).isSymbolicLink(); } catch { return false; } })()) fail("--out-dir must be a new path; existing artifacts are preserved");
    mkdirSync(outDir, { recursive: true, mode: 0o700 });
  }
  const run = {
    startedAt,
    outputPath: join(outDir, "output.json"),
    finalPath: join(outDir, "final.txt"),
    // .md, and attached rather than piped: ZCode reads no stdin.
    briefPath: join(outDir, "brief.md"),
    resultPath: join(outDir, "result.json"),
  };
  writeFileSync(run.briefPath, brief, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return run;
}

function makeResultWriter(opts, version, run, target) {
  // Returns writeResult(extra): merges the per-outcome fields onto the run's
  // standing metadata, persists result.json, and returns the object it just
  // wrote so the caller can hand it straight to printSummary.
  return (extra) => {
    const result = {
      schema: SCHEMA,
      lane: opts.lane,
      laneSource: opts.laneSource,
      workdir: opts.cd,
      mode: opts.mode,
      readOnly: opts.readOnly,
      disallowedTools: opts.disallowedTools,
      resumeLast: opts.resumeLast,
      session: opts.session,
      zcodeVersion: version,
      zcodeSource: target ? target.source : null,
      zcodePath: target ? target.display : null,
      startedAt: run.startedAt,
      finishedAt: new Date().toISOString(),
      briefPath: run.briefPath,
      outputPath: existsSync(run.outputPath) ? run.outputPath : null,
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
  const result = writeResult({ status: "zcode_unavailable", exitCode: 127, signal: null, sessionId: null, finalMessage: "", touchedFiles: null, readOnlyViolation: null, usage: null, contextWindow: null });
  printSummary(result, resultPath);
  process.stderr.write("relay: no ZCode CLI found. ZCode ships its CLI inside the desktop app, so point at it with --zcode-path <file> or ZCODE_CLI, put a `zcode` shim on PATH, or install the ZCode desktop app.\n");
  process.exit(127);
}

function reportVersionFailure(opts, writeResult, run, error, probeTimeoutMs) {
  const timedOut = error?.code === "ETIMEDOUT";
  const stderr = String(error?.stderr || "").trim();
  const message = error?.code === "UNSUPPORTED_SHELL_SHIM"
    ? "Shell shims (.cmd/.bat) are unsupported; choose a reviewed Node CLI entry or native executable with --zcode-path; ZCode was not dispatched"
    : timedOut
    ? `zcode --version preflight timed out after ${probeTimeoutMs}ms; ZCode was not dispatched`
    : `zcode --version preflight failed${Number.isInteger(error?.status) ? ` with exit ${error.status}` : ""}; ZCode was not dispatched`;
  const result = writeResult({
    status: timedOut ? "timeout" : "failed",
    exitCode: timedOut ? 124 : Number.isInteger(error?.status) ? error.status : 1,
    signal: null,
    sessionId: null,
    finalMessage: "",
    touchedFiles: gitTouchedFiles(opts.cd),
    readOnlyViolation: null,
    usage: null,
    contextWindow: null,
    stderrTail: stderr ? stderr.split("\n").slice(-20) : [],
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function dispatchToZcode(opts, run, target, writeResult, beforeTree, beforeFingerprints, relayArtifacts) {
  const argv = buildArgv(opts, target, run.briefPath);
  assertDirectExecutable(target.command);
  // Pass argv directly; no shell interpreter is involved.
  // detached on POSIX: the child leads a new process group so killChild can fell the whole tree
  const child = spawn(target.command, [...target.prefixArgs, ...argv], {
    cwd: opts.cd,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    env: process.env,
    shell: false,
  });

  let stdoutBuf = "";
  let stdoutTruncated = false;
  const stderrTail = [];

  // Decode across chunk boundaries: a multibyte UTF-8 character split between
  // two data events would otherwise decode as U+FFFD and corrupt the report.
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  // ZCode prints ONE JSON document at the end rather than a stream, so stdout is
  // buffered whole and parsed at close. The bound keeps a runaway CLI from
  // exhausting memory; past it we keep the HEAD, since the document starts there
  // and a truncated tail is reported rather than silently parsed.
  child.stdout.on("data", (chunk) => {
    if (stdoutTruncated) return;
    stdoutBuf += stdoutDecoder.write(chunk);
    if (stdoutBuf.length > MAX_BUFFERED_CHARS) {
      stdoutBuf = stdoutBuf.slice(0, MAX_BUFFERED_CHARS);
      stdoutTruncated = true;
    }
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk); // surface ZCode progress live for the orchestrator
    const text = stderrDecoder.write(chunk);
    for (const line of text.split("\n")) {
      if (line.trim()) stderrTail.push(line.trimEnd());
    }
    while (stderrTail.length > 20) stderrTail.shift();
  });

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
  // no result.json and leaves the ZCode child running or dying mid-edit with nothing
  // recording why. SIGTERM/SIGHUP registration is a no-op on Windows; SIGINT works there.
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(sig, () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      const partial = parseZcodeOutput(stdoutBuf);
      const abortedFields = {
        status: "aborted",
        exitCode: 128 + (constants.signals[sig] || 15),
        signal: sig,
        sessionId: partial?.sessionId ?? null,
        finalMessage: typeof partial?.response === "string" ? partial.response : "",
        touchedFiles: gitTouchedFiles(opts.cd),
        readOnlyViolation: null,
        usage: partial?.usage ?? null,
        contextWindow: partial?.projection?.contextWindow ?? null,
        stderrTail: stderrTail.slice(-20),
        error: `the relay was killed by ${sig}; ZCode was terminated with it — inspect the working tree before re-dispatching`,
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

  // A grandchild that outlives zcode and inherited the pipes keeps stdout/stderr open, so
  // "close" never fires and the relay waits forever, writing no result. Once zcode itself is
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
    const result = writeResult({ status: "failed", exitCode: 1, signal: null, sessionId: null, finalMessage: "", touchedFiles: gitTouchedFiles(opts.cd), readOnlyViolation: null, usage: null, contextWindow: null, error: String(err && err.message ? err.message : err) });
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
    stdoutBuf += stdoutDecoder.end();
    // Preserve the bounded stdout head before parsing; bytes beyond the cap are lost
    // and the parse warning makes that coverage limit explicit.
    if (stdoutBuf) writeFileSync(run.outputPath, stdoutBuf, "utf8");
    const parsed = parseZcodeOutput(stdoutBuf);
    const finalMessage = typeof parsed?.response === "string" ? parsed.response.trim() : stdoutBuf.trim();
    if (finalMessage) writeFileSync(run.finalPath, `${finalMessage}\n`, "utf8");
    // A timed-out run is never a success even if ZCode handles SIGTERM by exiting 0 -
    // orchestrators key off status and the relay exit code.
    const succeeded = code === 0 && !watchdogFired;
    const mapped = code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);
    // Only a plan-mode run makes a read-only claim worth measuring; a yolo run is
    // supposed to write, so the tripwire stays null rather than reporting noise.
    const readOnlyViolation = opts.readOnly
      ? readOnlyVerdict(beforeTree, gitTripwireState(opts.cd, relayArtifacts), beforeFingerprints)
      : null;
    const result = writeResult({
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode: succeeded ? 0 : mapped === 0 ? 1 : mapped,
      signal: signal ?? null,
      sessionId: parsed?.sessionId ?? null,
      finalMessage,
      touchedFiles: gitTouchedFiles(opts.cd),
      readOnlyViolation,
      usage: parsed?.usage ?? null,
      contextWindow: parsed?.projection?.contextWindow ?? null,
      // Say so rather than pretend: a run whose document did not parse still has
      // a status, but its sessionId and usage are unknown and the report is raw.
      ...(parsed ? {} : { parseWarning: stdoutTruncated
        ? `ZCode's stdout exceeded ${MAX_BUFFERED_CHARS} characters and was truncated; the JSON result could not be parsed. finalMessage is the raw head — read outputPath.`
        : "ZCode's stdout did not contain a parseable JSON result; finalMessage is the raw output — read outputPath." }),
      ...(succeeded ? {} : { stderrTail: stderrTail.slice(-20) }),
      ...(watchdogFired ? { error: `ZCode did not finish within --timeout ${opts.timeout}; killed by the relay watchdog` } : {}),
    });
    printSummary(result, run.resultPath);
    process.exit(result.exitCode);
  });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("empty brief (pass --brief <file> or pipe the brief on stdin)");

  // Prepare the run dir before probing, so a preflight that times out or fails still has
  // somewhere to publish result.json rather than exiting silently.
  const run = prepareRunDir(opts, brief);
  const probeTimeoutMs = versionProbeTimeout(opts);
  // Resolve before probing: with no CLI there is nothing to ask for a version,
  // and "not found" must stay distinguishable from "found but broken".
  const target = resolveZcode(opts);
  if (!target) {
    reportUnavailable(makeResultWriter(opts, null, run, null), run.resultPath);
    return;
  }
  const probe = zcodeVersion(target, probeTimeoutMs);
  const writeResult = makeResultWriter(opts, probe.version, run, target);

  if (!probe.version && !probe.error) {
    reportUnavailable(writeResult, run.resultPath);
    return;
  }
  if (probe.error) {
    reportVersionFailure(opts, writeResult, run, probe.error, probeTimeoutMs);
    return;
  }

  // Fingerprint before dispatch so a plan-mode run has something to compare
  // against. ZCode's plan mode refused edits in testing, but whether that is
  // tool-enforced or model compliance is unproven, so this measures instead.
  // The relay's own artifacts are excluded: --out-dir can point into the repo
  // under review, and the relay must not trip its own tripwire.
  const relayArtifacts = [run.briefPath, run.outputPath, run.finalPath, run.resultPath];
  const beforeTree = opts.readOnly ? gitTripwireState(opts.cd, relayArtifacts) : null;
  const beforeFingerprints = opts.readOnly ? fingerprintDirtyPaths(opts.cd, relayArtifacts) : null;

  dispatchToZcode(opts, run, target, writeResult, beforeTree, beforeFingerprints, relayArtifacts);
}

function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(`relay: ${result.status} (exit ${result.exitCode}${result.signal ? `, killed by ${result.signal}` : ""})  ·  zcode ${result.zcodeVersion ?? "?"}${result.zcodeSource ? ` (${result.zcodeSource})` : ""}`);
  if (result.signal === "SIGKILL" && result.status === "failed") lines.push("hint: the host killed the process (commonly the OOM killer or a supervisor timeout) — this is not a ZCode error; check host memory and re-dispatch, or split the task into smaller briefs.");
  if (result.signal === "SIGTERM" && result.status === "failed") lines.push("hint: something outside the relay terminated ZCode (a supervisor, the session ending, or a manual kill) — when the relay itself does the killing it reports status \"timeout\" or \"aborted\" instead; inspect the working tree before re-dispatching.");
  if (result.mode) lines.push(`mode: ${result.mode}${result.readOnly ? " (read-only)" : ""}`);
  if (result.resumeLast) lines.push("resume: latest session for this directory");
  if (result.session) lines.push(`resume: session ${result.session}`);
  if (result.sessionId) lines.push(`session id (resume with: --session ${result.sessionId}): ${result.sessionId}`);
  if (result.readOnlyViolation === true) lines.push("READ-ONLY VIOLATION: the tree changed during a plan-mode run — inspect it before trusting this result.");
  if (result.parseWarning) lines.push(`warning: ${result.parseWarning}`);
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
  lines.push("--- zcode final report ---");
  lines.push(result.finalMessage || "(no final message captured)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push("relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
