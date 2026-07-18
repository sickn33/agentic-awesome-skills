#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { isTransientTraversalError, validateObservedLockRecord } from "../lib/transaction-fault-contract.mjs";

function digest(value) {
  return `sha256-${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function listMatching(root, matcher) {
  const found = [];
  const visit = (directory) => {
    let names;
    try {
      names = fs.readdirSync(directory);
    } catch (error) {
      if (isTransientTraversalError(error)) return;
      throw error;
    }
    for (const name of names) {
      const absolute = path.join(directory, name);
      let stat;
      try { stat = fs.lstatSync(absolute); } catch (error) {
        if (isTransientTraversalError(error)) continue;
        throw error;
      }
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (matcher(relative, stat)) found.push(relative);
      if (stat.isDirectory() && !stat.isSymbolicLink()) visit(absolute);
    }
  };
  visit(root);
  return found.sort();
}

function predicate(className, targetRoot, skillId, expected) {
  const matchers = {
    lock: (relative) => relative === ".aas-transaction.lock",
    journal: (relative) => /^\.aas-transaction-recovery-[a-f0-9]+\.wal$/.test(relative),
    backup: (relative) => relative.includes("/backups/") && relative.split("/backups/")[1]?.split("/").length === 1,
    write: (relative, stat) => relative.includes("/staged/") && stat.isFile(),
    fsync: (relative) => /^\.aas-bootstrap-recovery-[a-f0-9]+\.json$/.test(relative),
    rename: (relative) => relative === `.agents/skills/${skillId}`,
    commit: (relative) => /^\.aas-transaction-recovery-[a-f0-9]+\.wal$/.test(relative),
  };
  if (!matchers[className]) throw new Error(`Unknown fault class: ${className}`);
  const lockPath = path.join(targetRoot, ".aas-transaction.lock");
  try {
    const stat = fs.lstatSync(lockPath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) return null;
    const text = fs.readFileSync(lockPath, "utf8");
    const record = JSON.parse(text);
    if (!text.endsWith("\n") || !validateObservedLockRecord(record, expected)) return null;
    expected.lockDigest = digest(record);
  } catch { return null; }
  const matches = listMatching(targetRoot, matchers[className]);
  if (!matches.length) return null;
  try {
    if (className === "journal") {
      const text = fs.readFileSync(path.join(targetRoot, matches[0]), "utf8");
      const first = JSON.parse(text.split("\n").filter(Boolean)[0]);
      if (!text.includes("\n") || first.event !== "started" || first.sequence !== 0) return null;
    }
    if (className === "fsync") {
      const text = fs.readFileSync(path.join(targetRoot, matches[0]), "utf8");
      const value = JSON.parse(text);
      if (!text.endsWith("\n") || !/^sha256-[a-f0-9]{64}$/.test(value.recordDigest || "")) return null;
    }
    if (className === "commit") {
      const text = fs.readFileSync(path.join(targetRoot, matches[0]), "utf8");
      const records = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
      if (!text.endsWith("\n") || !records.some((record) => record.event === "committed")) return null;
    }
  } catch { return null; }
  return {
    class: className,
    pathsDigest: digest(matches),
    count: matches.length,
    lockValidated: true,
    lockDigest: expected.lockDigest,
  };
}

function walEvidence(targetRoot) {
  const wal = fs.readdirSync(targetRoot).find((name) => /^\.aas-transaction-recovery-[a-f0-9]+\.wal$/.test(name));
  if (!wal) return { events: [], digest: digest([]), pathDigest: null };
  const text = fs.readFileSync(path.join(targetRoot, wal), "utf8");
  const records = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return { events: records.map((record) => record.event), digest: digest(records), pathDigest: digest(wal) };
}

function laterBoundarySnapshot(className, targetRoot, skillId) {
  const later = {
    lock: (relative) => /^\.aas-bootstrap-|^\.aas-transaction-recovery-/.test(relative)
      || relative.includes("/staged/") || relative === `.agents/skills/${skillId}` || relative === ".aas/managed-state.codex.json",
    // The WAL is reversible recovery metadata and may be created immediately
    // after the observed bootstrap fsync. A kill at this boundary is too late
    // only if it reaches user-visible publication or the state-last commit.
    fsync: (relative) => relative === `.agents/skills/${skillId}` || relative === ".aas/managed-state.codex.json",
    journal: (relative) => relative.includes("/staged/") || relative === `.agents/skills/${skillId}` || relative === ".aas/managed-state.codex.json",
    write: (relative) => relative === `.agents/skills/${skillId}` || relative === ".aas/managed-state.codex.json",
    backup: (relative) => relative === ".aas/managed-state.codex.json",
    rename: (relative) => relative === ".aas/managed-state.codex.json",
    commit: () => false,
  };
  return listMatching(targetRoot, later[className]).map((relative) => {
    const absolute = path.join(targetRoot, relative);
    const stat = fs.lstatSync(absolute);
    if (stat.isFile()) {
      return { path: relative, type: "file", size: stat.size, contentDigest: digest(fs.readFileSync(absolute).toString("base64")) };
    }
    if (stat.isSymbolicLink()) return { path: relative, type: "symlink", target: fs.readlinkSync(absolute) };
    return { path: relative, type: stat.isDirectory() ? "directory" : "special", size: stat.size };
  });
}

function changedLaterBoundaries(before, after) {
  const beforeByPath = new Map(before.map((entry) => [entry.path, JSON.stringify(entry)]));
  const afterByPath = new Map(after.map((entry) => [entry.path, JSON.stringify(entry)]));
  return [
    ...after.filter((entry) => beforeByPath.get(entry.path) !== JSON.stringify(entry)).map((entry) => entry.path),
    ...before.filter((entry) => !afterByPath.has(entry.path)).map((entry) => `removed:${entry.path}`),
  ].sort();
}

function terminate(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, encoding: "utf8", timeout: 10_000 });
    return;
  }
  try { process.kill(-pid, "SIGKILL"); } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const beforeLaterBoundaries = laterBoundarySnapshot(input.className, input.targetRoot, input.skillId);
const child = spawn(input.executable, input.args, {
  cwd: input.cwd,
  env: input.env,
  detached: process.platform !== "win32",
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const expectedLock = {
  pid: child.pid,
  planDigest: input.expectedPlanDigest,
  targetIdentityDigest: input.expectedTargetIdentityDigest,
  plannedDirectories: [],
  lockDigest: null,
};
const stdout = [];
const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
const closed = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code: code ?? 128, signal }));
});
const started = Date.now();
let observed = null;
let terminationStarted = false;
const observeAndTerminate = () => {
  if (observed || terminationStarted) return;
  const value = predicate(input.className, input.targetRoot, input.skillId, expectedLock);
  if (!value) return;
  observed = value;
  terminationStarted = true;
  terminate(child.pid);
};
const watchers = [];
const watchDirectory = (directory) => {
  try {
    const watcher = fs.watch(directory, { persistent: false }, observeAndTerminate);
    watcher.on("error", () => watcher.close());
    watchers.push(watcher);
  } catch {}
};
const visitDirectories = (directory) => {
  watchDirectory(directory);
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (isTransientTraversalError(error)) return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) visitDirectories(path.join(directory, entry.name));
  }
};
visitDirectories(input.targetRoot);
while (Date.now() - started < input.timeoutMs) {
  observeAndTerminate();
  if (observed) break;
  const settled = await Promise.race([closed.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 2))]);
  if (settled) break;
}
if (!observed) terminate(child.pid);
const outcome = await closed;
for (const watcher of watchers) watcher.close();
const laterBoundaries = observed
  ? changedLaterBoundaries(beforeLaterBoundaries, laterBoundarySnapshot(input.className, input.targetRoot, input.skillId))
  : [];
const recoveryLockPresent = fs.existsSync(path.join(input.targetRoot, ".aas-transaction.lock"));
const wal = walEvidence(input.targetRoot);
let value = null;
for (const line of (outcome.code === 0 ? Buffer.concat(stdout) : Buffer.concat(stderr)).toString("utf8").split("\n").reverse()) {
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    value = { status: parsed?.status ?? null, code: parsed?.code ?? null, category: parsed?.category ?? null };
    break;
  } catch {}
}
process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  observed,
  elapsedMilliseconds: Date.now() - started,
  outcome,
  laterBoundaries,
  recoveryLockPresent,
  wal,
  value,
  stdoutDigest: digest(Buffer.concat(stdout).toString("utf8")),
  stderrDigest: digest(Buffer.concat(stderr).toString("utf8")),
})}\n`);
if (!observed || laterBoundaries.length || !recoveryLockPresent) process.exitCode = 2;
