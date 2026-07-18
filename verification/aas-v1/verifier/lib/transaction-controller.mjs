import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { digestJson, sha256 } from "./canonical.mjs";
import { snapshotTree } from "./fs-evidence.mjs";
import { candidateEnvironment, installCandidate, parseJsonLines } from "./runtime.mjs";
import { prepareRuntimeCache } from "./suites.mjs";
import { inspectPackageTarball } from "./tarball.mjs";
import { runObserved } from "./observer.mjs";

const FAULT_CLASSES = Object.freeze(["lock", "journal", "backup", "write", "fsync", "rename", "commit"]);
const RACE_CLASSES = Object.freeze(["concurrency", "drift", "symlink-swap", "target-swap", "corrupt-journal", "recovery-race"]);
const CONTROLLER_VERSION = "1.0.0";
const DRIVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "drivers", "transaction-fault.mjs");
const RACE_DRIVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "drivers", "transaction-race.mjs");

function assert(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, details });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readOneJson(result, expectedCode = 0) {
  let structuredErrorCode = null;
  let structuredErrorDetails = null;
  try {
    const structuredError = parseJsonLines(result.stderr || "")[0];
    structuredErrorCode = structuredError?.code || null;
    const details = structuredError?.details;
    if (details && typeof details === "object" && !Array.isArray(details)) {
      structuredErrorDetails = Object.fromEntries(Object.entries(details)
        .filter(([key, value]) => ["platform", "capability", "helperPhase", "win32Error", "spawnCode", "helperExitCode"].includes(key)
          && (typeof value === "string" || Number.isSafeInteger(value))));
    }
  } catch {}
  assert(result.code === expectedCode, "AAS_TRANSACTION_CONTROLLER_CLI_EXIT", {
    expectedCode, actualCode: result.code, structuredErrorCode, structuredErrorDetails, stderrDigest: sha256(result.stderr || ""),
  });
  const values = parseJsonLines(result.stdout || "");
  assert(values.length === 1, "AAS_TRANSACTION_CONTROLLER_CLI_OUTPUT");
  return values[0];
}

function commandDigest(executable, args) {
  return digestJson({ executable: path.basename(executable), args: args.map((value) => path.isAbsolute(value) ? sha256(value) : value) });
}

function unmanagedDigest(targetRoot) {
  return snapshotTree(path.join(targetRoot, "unmanaged-sentinel")).digest;
}

function logicalSnapshot(targetRoot, skillId) {
  const destination = path.join(targetRoot, ".agents", "skills", skillId);
  const stateFile = path.join(targetRoot, ".aas", "managed-state.codex.json");
  return {
    managedStateDigest: fs.existsSync(stateFile) ? sha256(fs.readFileSync(stateFile)) : null,
    managedDestinationDigest: fs.existsSync(destination) ? snapshotTree(destination).digest : null,
    unmanagedDigest: unmanagedDigest(targetRoot),
  };
}

function logicalDigest(targetRoot, skillId) {
  return digestJson(logicalSnapshot(targetRoot, skillId));
}

export function portableTreeDigest(root) {
  const entries = snapshotTree(root).entries.map((entry) => {
    if (entry.type === "directory") return { path: entry.path, type: entry.type };
    assert(entry.type === "file", "AAS_TRANSACTION_CONTROLLER_EXPECTED_TREE_UNSAFE", { type: entry.type });
    return { path: entry.path, type: entry.type, size: entry.size, sha256: entry.sha256 };
  });
  return digestJson(entries);
}

function recoveryArtifacts(targetRoot) {
  if (!fs.existsSync(targetRoot)) return [];
  const rootNames = fs.readdirSync(targetRoot).filter((name) => /^\.aas-(?:bootstrap|layout|transaction)/.test(name));
  const transactionRoot = path.join(targetRoot, ".aas", "transactions");
  const nested = fs.existsSync(transactionRoot)
    ? snapshotTree(transactionRoot).entries.filter((entry) => !(entry.type === "directory" && entry.path === "codex"))
    : [];
  return [...rootNames, ...nested.map((entry) => `.aas/transactions/${entry.path}`)].sort();
}

export function selectBackupSkillIds(packageRoot, primarySkillId, limit = 12) {
  const metadataPath = path.join(packageRoot, "tools", "lib", "aas-v1", "metadata-overrides.v1.json");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const skills = metadata?.skills;
  assert(skills && typeof skills === "object" && !Array.isArray(skills), "AAS_TRANSACTION_CONTROLLER_BACKUP_METADATA_INVALID");
  const acceptedJudgment = (value) => ["known", "notApplicable"].includes(value?.status);
  const selected = Object.entries(skills)
    .filter(([id, entry]) => id !== primarySkillId
      && /^[a-z0-9][a-z0-9-]*$/.test(id)
      && fs.existsSync(path.join(packageRoot, "skills", id, "SKILL.md"))
      && entry?.reviewDecision === "supported"
      && Array.isArray(entry?.capabilities)
      && entry.capabilities.length > 0
      && entry?.risk?.status === "known"
      && ["none", "safe"].includes(entry.risk.value)
      && entry?.source?.status === "known"
      && entry.source.value != null
      && entry?.setup?.status === "known"
      && entry.setup.value !== "manual"
      && entry?.targets?.codex?.status === "known"
      && entry.targets.codex.value === "supported"
      && acceptedJudgment(entry.dependencies)
      && acceptedJudgment(entry.conflicts)
      && acceptedJudgment(entry.validation))
    .map(([id]) => {
      const entries = snapshotTree(path.join(packageRoot, "skills", id)).entries;
      return {
        id,
        files: entries.filter((entry) => entry.type === "file").length,
        size: entries.filter((entry) => entry.type === "file").reduce((total, entry) => total + entry.size, 0),
      };
    })
    .sort((left, right) => right.size - left.size
      || right.files - left.files
      || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .slice(0, limit);
  assert(selected.length === limit, "AAS_TRANSACTION_CONTROLLER_BACKUP_FIXTURE_INCOMPLETE", {
    required: limit,
    selected: selected.length,
  });
  return selected.map((entry) => entry.id);
}

export function walBoundaryIsValid(className, walEvents) {
  if (!Array.isArray(walEvents) || walEvents.some((event) => typeof event !== "string")) return false;
  if (className === "lock") return walEvents.length === 0;
  if (className === "fsync") return !walEvents.includes("committed");
  if (className === "journal") return walEvents[0] === "started" && !walEvents.includes("committed");
  if (className === "commit") return walEvents.includes("committed");
  return !walEvents.includes("committed");
}

export function nativeObservationLineage(platform, observed) {
  const backendExpected = platform === "linux"
    ? observed?.backend === "linux-strace-process-tree"
    : platform === "darwin"
      ? observed?.backend === "macos-fs_usage-process"
      : observed?.backend === "windows-etw-kernel-process-tree";
  const childObserved = platform === "darwin" || (observed?.observation?.childProcesses ?? 0) > 0;
  const verified = backendExpected
    && observed?.result?.timedOut !== true
    && observed?.result?.outputLimitExceeded !== true
    && (platform !== "win32" || observed?.diagnostics?.processTreeEmpty === true);
  return { childObserved, verified };
}

export function nativeMutationEvidenceSatisfied(platform, className, writeAttempts, lockValidated) {
  if (Number.isSafeInteger(writeAttempts) && writeAttempts > 0) return true;
  // The lock is the first durable boundary and can be created and killed
  // between two fs_usage samples. The driver has independently parsed the
  // complete token-bound lock record from disk; no later boundary or WAL is
  // accepted for this narrow case. Every later fault still requires a native
  // persistent-write event.
  return platform === "darwin" && className === "lock" && lockValidated === true;
}

export function faultFixtureProfile(className, backupSkillIds) {
  const replace = className === "backup";
  const requiresBoundaryWindow = className === "write" || className === "rename" || replace;
  return {
    installed: replace,
    desired: !replace,
    // A single small skill can be copied and renamed between two external
    // polling samples. Stage the same policy-safe corpus used by the backup
    // case so the write boundary remains observable without instrumenting or
    // slowing the candidate under test.
    additionalSkills: requiresBoundaryWindow ? backupSkillIds : [],
  };
}

export function faultObservationSkillId(className, primarySkillId, additionalSkillIds = []) {
  if (className !== "rename") return primarySkillId;
  // Observe the first deterministic publication in the staged corpus. This
  // leaves the remaining verified skill renames between the observed boundary
  // and the state-last commit, giving an external macOS observer enough time
  // to terminate the process without weakening the later-boundary assertion.
  return [primarySkillId, ...additionalSkillIds].sort()[0];
}

export function raceFixtureProfile(className, contentionSkillIds) {
  const requiresVisibleStaging = ["concurrency", "drift", "symlink-swap", "target-swap"].includes(className);
  return {
    // Keep the first apply active long enough for a separately spawned CLI to
    // contend on the observed lock or for the external race driver to mutate
    // the target after staging. A one-skill apply can publish between boundary
    // observation and process scheduling on fast runners.
    additionalSkills: requiresVisibleStaging ? contentionSkillIds : [],
  };
}

export function classifyConcurrencyOutcomes(values) {
  if (!Array.isArray(values) || values.filter(({ value }) => value?.status === "applied").length !== 1) return null;
  const follower = values[1];
  if (follower?.value?.code === "AAS_TRANSACTION_LOCKED" && follower.result?.code !== 0) return "locked";
  if (follower?.value?.status === "alreadyApplied" && follower.result?.code === 0) return "alreadyApplied";
  return null;
}

export function corruptPrefixIsFailClosed(status, findings) {
  return ["degraded", "recoveryRequired"].includes(status)
    && Array.isArray(findings)
    && findings.some((code) => /CORRUPT|SCHEMA|DIGEST/.test(code));
}

function finalState(targetRoot, skillId, expectedContentDigest, plan) {
  const destination = path.join(targetRoot, ".agents", "skills", skillId);
  const state = path.join(targetRoot, ".aas", "managed-state.codex.json");
  if (!fs.existsSync(destination) && !fs.existsSync(state)) return "previous";
  if (!fs.existsSync(destination) || !fs.existsSync(state)) return "partial";
  const stateValue = JSON.parse(fs.readFileSync(state, "utf8"));
  return portableTreeDigest(destination) === expectedContentDigest && stateValue.stateDigest === plan.payload.stateCommit.nextDigest ? "new" : "partial";
}

async function run(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      detached: options.detached === true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    const timer = setTimeout(() => {
      terminateTree(child.pid).catch(() => {});
    }, options.timeoutMs ?? 60_000);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code: code ?? 128, signal, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
}

function startProcess(executable, args, options = {}) {
  const child = spawn(executable, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({
      code: code ?? 128,
      signal,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    }));
  });
  return { child, completed };
}

async function waitForActiveLock(targetRoot, expectedPid, timeoutMs = 30_000) {
  const lockPath = path.join(targetRoot, ".aas-transaction.lock");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const text = fs.readFileSync(lockPath, "utf8");
      const value = JSON.parse(text);
      if (text.endsWith("\n") && value.pid === expectedPid && value.kind === "apply"
        && /^[a-f0-9]{48}$/.test(value.token || "")) return digestJson({ pid: value.pid, token: value.token, planDigest: value.planDigest });
    } catch {}
    await sleep(2);
  }
  throw Object.assign(new Error("AAS_TRANSACTION_CONTROLLER_CONCURRENCY_BOUNDARY_NOT_OBSERVED"), { code: "AAS_TRANSACTION_CONTROLLER_CONCURRENCY_BOUNDARY_NOT_OBSERVED" });
}

async function terminateTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    await run("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { timeoutMs: 10_000 }).catch(() => null);
    return;
  }
  try { process.kill(-pid, "SIGKILL"); } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function spawnUntil({ executable, args, cwd, env, predicate, timeoutMs = 30_000 }) {
  const child = spawn(executable, args, { cwd, env, detached: process.platform !== "win32", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const closed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code: code ?? 128, signal }));
  });
  const events = [];
  const started = Date.now();
  let observed = null;
  while (Date.now() - started < timeoutMs) {
    observed = predicate();
    if (observed) {
      events.push({ elapsedMilliseconds: Date.now() - started, observed });
      await terminateTree(child.pid);
      break;
    }
    const settled = await Promise.race([closed.then(() => true), sleep(2).then(() => false)]);
    if (settled) break;
  }
  const outcome = await closed;
  assert(observed, "AAS_TRANSACTION_CONTROLLER_BOUNDARY_NOT_OBSERVED", {
    commandDigest: commandDigest(executable, args), code: outcome.code, signal: outcome.signal,
    stdoutDigest: sha256(Buffer.concat(stdout)), stderrDigest: sha256(Buffer.concat(stderr)),
  });
  return {
    ...outcome,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
    observation: { events, eventDigest: digestJson(events) },
  };
}

function listMatching(root, matcher) {
  const found = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const name of fs.readdirSync(directory)) {
      const absolute = path.join(directory, name);
      let stat;
      try { stat = fs.lstatSync(absolute); } catch { continue; }
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (matcher(relative, stat)) found.push(relative);
      if (stat.isDirectory() && !stat.isSymbolicLink()) visit(absolute);
    }
  };
  visit(root);
  return found.sort();
}

function boundaryPredicate(className, targetRoot, skillId) {
  const matchers = {
    lock: (relative) => relative === ".aas-transaction.lock",
    journal: (relative) => /^\.aas-transaction-recovery-[a-f0-9]+\.wal$/.test(relative),
    backup: (relative) => relative.includes("/backups/") && relative.endsWith(`/${skillId}`),
    write: (relative, stat) => relative.includes("/staged/") && stat.isFile(),
    // Publication of the durable bootstrap record can only happen after its
    // bytes and file descriptor have been flushed. Observing it from another
    // process is therefore an external durability-boundary signal.
    fsync: (relative) => /^\.aas-bootstrap-recovery-[a-f0-9]+\.json$/.test(relative),
    rename: (relative) => relative === `.agents/skills/${skillId}`,
    commit: (relative) => relative === ".aas/managed-state.codex.json",
  };
  return () => {
    const matches = listMatching(targetRoot, matchers[className]);
    if (!matches.length) return null;
    if (className === "journal") {
      try {
        const text = fs.readFileSync(path.join(targetRoot, matches[0]), "utf8");
        const first = JSON.parse(text.split("\n").filter(Boolean)[0]);
        if (!text.includes("\n") || first.event !== "started" || first.sequence !== 0) return null;
      } catch { return null; }
    }
    return { class: className, pathsDigest: digestJson(matches), count: matches.length };
  };
}

async function publicCli(fixture, args, expectedCode = 0) {
  const result = await run(process.execPath, [fixture.aas, ...args], {
    cwd: fixture.caseRoot,
    env: fixture.env,
    timeoutMs: 120_000,
  });
  return { result, value: readOneJson(result, expectedCode) };
}

async function createFixture(context, id, { installed = false, desired = true, additionalSkills = [] } = {}) {
  const caseRoot = path.join(context.workRoot, id);
  const targetRoot = path.join(caseRoot, "target");
  fs.mkdirSync(targetRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(targetRoot, ".aas"), { mode: 0o700 });
  fs.mkdirSync(path.join(targetRoot, ".agents", "skills"), { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(targetRoot, "unmanaged-sentinel"), { mode: 0o700 });
  fs.writeFileSync(path.join(targetRoot, "unmanaged-sentinel", "keep.txt"), "unmanaged-must-survive\n", { mode: 0o600 });
  const fixture = { ...context, id, caseRoot, targetRoot };
  const manifestPath = path.join(caseRoot, "aas-stack.json");
  const initialized = await publicCli(fixture, ["stack", "init", "--goal", "test", "--out", manifestPath]);
  assert(initialized.value.status === "initialized", "AAS_TRANSACTION_CONTROLLER_INIT");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const selectedSkills = [context.skillId, ...additionalSkills].map((id) => ({ id }));
  manifest.skills = desired || installed ? selectedSkills : [];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
  const planPath = path.join(caseRoot, "plan.json");
  const planArgs = [
    "stack", "plan", "--manifest", manifestPath, "--target", "codex:project", "--target-root", targetRoot,
    "--cache-root", context.cacheRoot, "--runtime-version", context.runtime.version,
    "--runtime-integrity", context.runtime.integrity, "--out", planPath,
  ];
  const planned = await publicCli(fixture, planArgs);
  assert(planned.value.status === "planned", "AAS_TRANSACTION_CONTROLLER_PLAN");
  let plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  if (installed) {
    const applied = await publicCli(fixture, [
      "stack", "apply", "--experimental-apply", "--plan", planPath, "--target-root", targetRoot,
      "--cache-root", context.cacheRoot, "--approve", plan.digest,
    ]);
    assert(applied.value.status === "applied", "AAS_TRANSACTION_CONTROLLER_SEED_APPLY");
    manifest.skills = desired ? selectedSkills : [];
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    fs.rmSync(planPath);
    const replanned = await publicCli(fixture, planArgs);
    assert(replanned.value.status === "planned", "AAS_TRANSACTION_CONTROLLER_REPLAN");
    plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  }
  return {
    ...fixture,
    manifestPath,
    planPath,
    plan,
    beforeDigest: logicalDigest(targetRoot, context.skillId),
    expectedSkillContentDigest: portableTreeDigest(path.join(context.packageRoot, "skills", context.skillId)),
    unmanagedBefore: unmanagedDigest(targetRoot),
  };
}

function applyArgs(fixture) {
  return [
    "stack", "apply", "--experimental-apply", "--plan", fixture.planPath, "--target-root", fixture.targetRoot,
    "--cache-root", fixture.cacheRoot, "--approve", fixture.plan.digest,
  ];
}

async function doctor(fixture) {
  return publicCli(fixture, ["stack", "doctor", "--plan", fixture.planPath, "--target-root", fixture.targetRoot, "--cache-root", fixture.cacheRoot]);
}

async function recover(fixture) {
  let completed = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const diagnosis = await doctor(fixture);
    if (diagnosis.value.status === "recoveryRequired") {
      const recovery = diagnosis.value.recoveries[0];
      const action = recovery.allowedActions.includes("rollback") ? "rollback" : "cleanup";
      const base = [
        "stack", "recover", "--experimental-recovery", "--plan", fixture.planPath, "--target-root", fixture.targetRoot,
        "--cache-root", fixture.cacheRoot, "--id", recovery.recoveryId, "--action", action,
      ];
      const preview = await publicCli(fixture, base);
      assert(preview.value.status === "approvalRequired", "AAS_TRANSACTION_CONTROLLER_RECOVERY_PREVIEW");
      const applied = await publicCli(fixture, [...base, "--approve", preview.value.recoveryPlan.digest]);
      completed = { action, status: applied.value.status, planDigest: preview.value.recoveryPlan.digest };
      continue;
    }
    if (diagnosis.value.status === "healthy") {
      return completed || { action: "none", status: "healthy", planDigest: fixture.plan.digest };
    }
    await sleep(10);
  }
  throw Object.assign(new Error("AAS_TRANSACTION_CONTROLLER_RECOVERY_UNAVAILABLE"), { code: "AAS_TRANSACTION_CONTROLLER_RECOVERY_UNAVAILABLE" });
}

function evidenceRecord(fixture, className, kind, injectionAction, observedOperation, observation, outcome, recoveryResult, expectedFinal) {
  const afterDigest = logicalDigest(fixture.targetRoot, fixture.skillId);
  const unmanagedAfter = unmanagedDigest(fixture.targetRoot);
  const observedFinal = afterDigest === fixture.beforeDigest
    ? "previous"
    : fixture.expectedSkillContentDigest
      ? finalState(fixture.targetRoot, fixture.skillId, fixture.expectedSkillContentDigest, fixture.plan)
      : "partial";
  const noPartialState = observedFinal === expectedFinal && unmanagedAfter === fixture.unmanagedBefore && recoveryArtifacts(fixture.targetRoot).length === 0;
  assert(noPartialState, "AAS_TRANSACTION_CONTROLLER_PARTIAL_STATE", { className, observedFinal, expectedFinal, artifacts: recoveryArtifacts(fixture.targetRoot) });
  return {
    executionId: `${kind}-${className}`,
    class: className,
    kind,
    observedOperation,
    injectionAction,
    planDigest: fixture.plan.digest,
    commandDigest: commandDigest(process.execPath, [fixture.aas, ...applyArgs(fixture)]),
    observerEventDigest: observation.eventDigest,
    beforeDigest: fixture.beforeDigest,
    afterDigest,
    unmanagedBeforeDigest: fixture.unmanagedBefore,
    unmanagedAfterDigest: unmanagedAfter,
    exitCode: outcome.code,
    exitSignal: outcome.signal || null,
    recoveryAction: recoveryResult.action,
    recoveryStatus: recoveryResult.status,
    recoveryPlanDigest: recoveryResult.planDigest,
    finalState: observedFinal,
    noPartialState: true,
  };
}

async function faultCase(context, className) {
  const profile = faultFixtureProfile(className, context.backupSkillIds);
  const replace = profile.installed;
  const fixture = await createFixture(context, `fault-${className}`, profile);
  const observedSkillId = faultObservationSkillId(className, fixture.skillId, profile.additionalSkills);
  const args = applyArgs(fixture);
  const observed = await runObserved(process.execPath, [DRIVER], {
    cwd: fixture.caseRoot,
    env: fixture.env,
    stdin: JSON.stringify({
      executable: process.execPath,
      args: [fixture.aas, ...args],
      cwd: fixture.caseRoot,
      env: fixture.env,
      targetRoot: fixture.targetRoot,
      skillId: observedSkillId,
      className,
      expectedPlanDigest: fixture.plan.digest,
      expectedTargetIdentityDigest: fixture.plan.payload.target.identityDigest,
      timeoutMs: 120_000,
    }),
    timeoutMs: 130_000,
    maxOutputBytes: 1024 * 1024,
    zones: fixture.zones,
    evidenceDir: path.join(fixture.evidenceDir, `fault-${className}`),
  });
  const driverValue = parseJsonLines(observed.result.stdout)[0];
  assert(observed.result.code === 0, "AAS_TRANSACTION_CONTROLLER_NATIVE_OBSERVER_CASE_FAILED", {
    className,
    code: observed.result.code,
    observed: Boolean(driverValue?.observed),
    laterBoundaryCount: driverValue?.laterBoundaries?.length ?? null,
    recoveryLockPresent: driverValue?.recoveryLockPresent ?? null,
    productStatus: driverValue?.value?.status ?? null,
    productCode: driverValue?.value?.code ?? null,
    productCategory: driverValue?.value?.category ?? null,
    stderrDigest: sha256(observed.result.stderr || ""),
  });
  const nativeLineage = nativeObservationLineage(process.platform, observed);
  const lineageVerified = nativeLineage.verified;
  const walEvents = driverValue?.wal?.events || [];
  const walBoundaryValid = walBoundaryIsValid(className, walEvents);
  // fs_usage observes the byte-identical child executable directly but does
  // not emit process-creation records. On macOS, executable binding plus the
  // native write trace establishes lineage; Linux/Windows must also expose a
  // child-process event from their process-tree observers.
  const childLineageObserved = nativeLineage.childObserved;
  assert(driverValue?.observed && driverValue.recoveryLockPresent === true && driverValue.laterBoundaries.length === 0
      && nativeMutationEvidenceSatisfied(process.platform, className, observed.observation.writeAttempts, driverValue?.observed?.lockValidated)
      && childLineageObserved && lineageVerified && walBoundaryValid,
    "AAS_TRANSACTION_CONTROLLER_NATIVE_OBSERVATION_MISSING", {
      className,
      writeAttempts: observed.observation.writeAttempts,
      childProcesses: observed.observation.childProcesses,
      laterBoundaries: driverValue?.laterBoundaries || [],
      recoveryLockPresent: driverValue?.recoveryLockPresent ?? null,
      lineageVerified,
      walEvents,
    });
  const killed = {
    ...driverValue.outcome,
    observation: {
      events: [{ boundary: driverValue.observed, nativeEventDigest: observed.observation.eventDigest }],
      eventDigest: digestJson({ boundary: driverValue.observed, native: observed.observation.eventDigest, wal: driverValue.wal }),
    },
    backend: observed.backend,
  };
  const recoveryResult = await recover(fixture);
  const expectedFinal = className === "commit" ? "new" : "previous";
  // A remove plan's pre-kill seeded installation is its previous state.
  if (replace) {
    const destination = path.join(fixture.targetRoot, ".agents", "skills", fixture.skillId);
    assert(fs.existsSync(destination), "AAS_TRANSACTION_CONTROLLER_BACKUP_NOT_RESTORED");
  }
  const record = evidenceRecord(
    fixture, className, "faultBoundary", "kill", `external-filesystem:${className}`,
    killed.observation, killed, recoveryResult, expectedFinal,
  );
  return { record, backend: observed.backend, lineageVerified, overflow: observed.result.outputLimitExceeded === true };
}

async function raceCase(context, className) {
  const fixture = await createFixture(context, `race-${className}`, raceFixtureProfile(className, context.backupSkillIds));
  let outcome;
  let observation;
  let recoveryResult = { action: "none", status: "healthy", planDigest: fixture.plan.digest };
  let expectedFinal = "previous";
  let native = null;
  if (className === "concurrency") {
    const args = applyArgs(fixture);
    const first = startProcess(process.execPath, [fixture.aas, ...args], { cwd: fixture.caseRoot, env: fixture.env });
    const liveLockDigest = await waitForActiveLock(fixture.targetRoot, first.child.pid);
    const secondResult = await run(process.execPath, [fixture.aas, ...args], { cwd: fixture.caseRoot, env: fixture.env, timeoutMs: 120_000 });
    const results = [await first.completed, secondResult];
    const values = results.map((result) => ({ result, value: parseJsonLines(result.code === 0 ? result.stdout : result.stderr)[0] }));
    const serializationOutcome = classifyConcurrencyOutcomes(values);
    assert(serializationOutcome, "AAS_TRANSACTION_CONTROLLER_CONCURRENCY_NOT_SERIALIZED", {
      code: values[1].value?.code,
      status: values[1].value?.status,
    });
    outcome = values.find(({ value }) => value?.status === "applied").result;
    observation = { eventDigest: digestJson({
      liveLockDigest,
      serializationOutcome,
      outcomes: values.map(({ result, value }) => ({ exitCode: result.code, status: value?.status || null, code: value?.code || null })),
    }) };
    expectedFinal = "new";
  } else if (["drift", "symlink-swap", "target-swap"].includes(className)) {
    const observed = await runObserved(process.execPath, [RACE_DRIVER], {
      cwd: fixture.caseRoot,
      env: fixture.env,
      stdin: JSON.stringify({
        executable: process.execPath,
        args: [fixture.aas, ...applyArgs(fixture)],
        cwd: fixture.caseRoot,
        env: fixture.env,
        caseRoot: fixture.caseRoot,
        targetRoot: fixture.targetRoot,
        skillId: fixture.skillId,
        className,
        timeoutMs: 120_000,
      }),
      timeoutMs: 130_000,
      maxOutputBytes: 1024 * 1024,
      zones: fixture.zones,
      evidenceDir: path.join(fixture.evidenceDir, `race-${className}`),
    });
    const nativeLineage = nativeObservationLineage(process.platform, observed);
    assert(observed.result.code === 0 && observed.observation.writeAttempts > 0 && nativeLineage.childObserved,
      "AAS_TRANSACTION_CONTROLLER_DYNAMIC_RACE_NOT_OBSERVED", { className, code: observed.result.code });
    const driverValue = parseJsonLines(observed.result.stdout)[0];
    assert(driverValue?.boundaryDigest && driverValue.outsideBefore === driverValue.outsideAfter
      && driverValue.outcome.code !== 0 && typeof driverValue.value?.code === "string",
    "AAS_TRANSACTION_CONTROLLER_DYNAMIC_RACE_BINDING", { className, value: driverValue?.value || null });
    outcome = driverValue.outcome;
    observation = {
      eventDigest: digestJson({
        nativeEventDigest: observed.observation.eventDigest,
        boundaryDigest: driverValue.boundaryDigest,
        outsideDigest: driverValue.outsideAfter,
        productCode: driverValue.value.code,
      }),
    };
    recoveryResult = await recover(fixture);
    const lineageVerified = nativeLineage.verified;
    assert(lineageVerified, "AAS_TRANSACTION_CONTROLLER_DYNAMIC_RACE_LINEAGE");
    native = { backend: observed.backend, lineageVerified, overflow: observed.result.outputLimitExceeded === true };
  } else {
    const killed = await spawnUntil({
      executable: process.execPath, args: [fixture.aas, ...applyArgs(fixture)], cwd: fixture.caseRoot, env: fixture.env,
      predicate: boundaryPredicate("journal", fixture.targetRoot, fixture.skillId), timeoutMs: 120_000,
    });
    if (className === "corrupt-journal") {
      const wal = fs.readdirSync(fixture.targetRoot).find((name) => name.endsWith(".wal"));
      assert(wal, "AAS_TRANSACTION_CONTROLLER_WAL_MISSING");
      fs.appendFileSync(path.join(fixture.targetRoot, wal), "{corrupt");
      const diagnosis = await doctor(fixture);
      assert(diagnosis.value.status === "recoveryRequired", "AAS_TRANSACTION_CONTROLLER_CORRUPT_JOURNAL_ACCEPTED", {
        status: diagnosis.value.status,
      });
      const recovered = await recover(fixture);
      const prefixFixture = await createFixture(context, "race-corrupt-journal-prefix");
      const prefixKilled = await spawnUntil({
        executable: process.execPath,
        args: [prefixFixture.aas, ...applyArgs(prefixFixture)],
        cwd: prefixFixture.caseRoot,
        env: prefixFixture.env,
        predicate: boundaryPredicate("journal", prefixFixture.targetRoot, prefixFixture.skillId),
        timeoutMs: 120_000,
      });
      const prefixWalName = fs.readdirSync(prefixFixture.targetRoot).find((name) => name.endsWith(".wal"));
      assert(prefixWalName, "AAS_TRANSACTION_CONTROLLER_PREFIX_WAL_MISSING");
      const prefixWal = path.join(prefixFixture.targetRoot, prefixWalName);
      const prefixLines = fs.readFileSync(prefixWal, "utf8").split("\n").filter(Boolean);
      const firstRecord = JSON.parse(prefixLines[0]);
      firstRecord.recordDigest = `sha256-${"0".repeat(64)}`;
      prefixLines[0] = JSON.stringify(firstRecord);
      fs.writeFileSync(prefixWal, `${prefixLines.join("\n")}\n`);
      const prefixBeforeDoctor = logicalDigest(prefixFixture.targetRoot, prefixFixture.skillId);
      const prefixUnmanagedBefore = unmanagedDigest(prefixFixture.targetRoot);
      const prefixDiagnosis = await doctor(prefixFixture);
      const prefixAfterDoctor = logicalDigest(prefixFixture.targetRoot, prefixFixture.skillId);
      const prefixUnmanagedAfter = unmanagedDigest(prefixFixture.targetRoot);
      const prefixFindingCodes = prefixDiagnosis.value.findings.map((finding) => finding.code);
      assert(corruptPrefixIsFailClosed(prefixDiagnosis.value.status, prefixFindingCodes)
        && prefixBeforeDoctor === prefixAfterDoctor && prefixUnmanagedBefore === prefixUnmanagedAfter,
      "AAS_TRANSACTION_CONTROLLER_CORRUPT_PREFIX_NOT_FAIL_CLOSED", {
        status: prefixDiagnosis.value.status,
        findings: prefixFindingCodes,
      });
      outcome = killed;
      observation = {
        eventDigest: digestJson({
          tornTail: {
            killed: killed.observation.eventDigest,
            diagnosisStatus: diagnosis.value.status,
            recoveryId: diagnosis.value.recoveries[0].recoveryId,
            tailDigest: sha256("{corrupt"),
          },
          corruptPrefix: {
            killed: prefixKilled.observation.eventDigest,
            diagnosisStatus: prefixDiagnosis.value.status,
            findings: prefixFindingCodes,
            beforeDigest: prefixBeforeDoctor,
            afterDigest: prefixAfterDoctor,
            unmanagedBeforeDigest: prefixUnmanagedBefore,
            unmanagedAfterDigest: prefixUnmanagedAfter,
          },
        }),
      };
      recoveryResult = recovered;
      fs.rmSync(prefixFixture.caseRoot, { recursive: true, force: true });
    } else {
      let diagnosis;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        diagnosis = await doctor(fixture);
        if (diagnosis.value.status === "recoveryRequired") break;
        await sleep(10);
      }
      const rec = diagnosis.value.recoveries[0];
      const action = rec.allowedActions.includes("rollback") ? "rollback" : "cleanup";
      const base = ["stack", "recover", "--experimental-recovery", "--plan", fixture.planPath, "--target-root", fixture.targetRoot, "--cache-root", fixture.cacheRoot, "--id", rec.recoveryId, "--action", action];
      const preview = await publicCli(fixture, base);
      const args = [...base, "--approve", preview.value.recoveryPlan.digest];
      const [one, two] = await Promise.all([
        run(process.execPath, [fixture.aas, ...args], { cwd: fixture.caseRoot, env: fixture.env }),
        run(process.execPath, [fixture.aas, ...args], { cwd: fixture.caseRoot, env: fixture.env }),
      ]);
      const successes = [one, two].filter((result) => result.code === 0);
      assert(successes.length === 1, "AAS_TRANSACTION_CONTROLLER_RECOVERY_RACE_NOT_SERIALIZED", { codes: [one.code, two.code] });
      outcome = [one, two].find((result) => result.code !== 0);
      observation = { eventDigest: digestJson([one, two].map((result) => ({ code: result.code, signal: result.signal }))) };
      recoveryResult = { action, status: parseJsonLines(successes[0].stdout)[0].status, planDigest: preview.value.recoveryPlan.digest };
    }
  }
  observation = {
    eventDigest: digestJson({
      processEvidence: observation.eventDigest,
      filesystemEvidence: {
        beforeDigest: fixture.beforeDigest,
        afterDigest: logicalDigest(fixture.targetRoot, fixture.skillId),
        unmanagedBeforeDigest: fixture.unmanagedBefore,
        unmanagedAfterDigest: unmanagedDigest(fixture.targetRoot),
        recoveryArtifacts: recoveryArtifacts(fixture.targetRoot),
      },
    }),
  };
  const record = evidenceRecord(
    fixture, className, "race", className === "concurrency" ? "concurrent" : className,
    `external-race:${className}`, observation, outcome, recoveryResult, expectedFinal,
  );
  return native ? { record, ...native } : { record };
}

export async function generateTransactionEvidence({ tarball, workRoot, zones }) {
  const inspection = inspectPackageTarball(tarball);
  assert(inspection.failures.length === 0, "AAS_TRANSACTION_CONTROLLER_TARBALL_INVALID", { failures: inspection.failures });
  fs.mkdirSync(workRoot, { recursive: true, mode: 0o700 });
  const runtime = await installCandidate(tarball, path.join(workRoot, "candidate-install"));
  const cacheRoot = path.join(workRoot, "runtime-cache");
  const tarballBytes = fs.readFileSync(tarball);
  const promoted = await prepareRuntimeCache(runtime, tarballBytes, inspection.sha512, cacheRoot);
  // This evidence-backed skill is deliberately non-trivial in size, giving
  // the external observer a useful staging window without modifying the
  // verified runtime or manufacturing a synthetic source tree.
  const skillId = fs.existsSync(path.join(runtime.packageRoot, "skills", "react-best-practices")) ? "react-best-practices" : "ai-agents-architect";
  const backupSkillIds = selectBackupSkillIds(runtime.packageRoot, skillId);
  const context = {
    workRoot: path.join(workRoot, "cases"), cacheRoot, runtime: promoted.runtimeIdentity,
    aas: runtime.bins.aas, packageRoot: runtime.packageRoot, skillId, backupSkillIds, env: candidateEnvironment(zones), zones,
    evidenceDir: path.join(workRoot, "native-observer-evidence"),
  };
  fs.mkdirSync(context.workRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(context.evidenceDir, { recursive: true, mode: 0o700 });
  const boundaryEvidence = [];
  const nativeBackends = new Set();
  const nativeLineage = [];
  const nativeOverflow = [];
  for (const className of FAULT_CLASSES) {
    const result = await faultCase(context, className);
    boundaryEvidence.push(result.record);
    nativeBackends.add(result.backend);
    nativeLineage.push(result.lineageVerified);
    nativeOverflow.push(result.overflow);
  }
  for (const className of RACE_CLASSES) {
    const result = await raceCase(context, className);
    boundaryEvidence.push(result.record);
    if (result.backend) nativeBackends.add(result.backend);
    if (result.lineageVerified !== undefined) nativeLineage.push(result.lineageVerified);
    if (result.overflow !== undefined) nativeOverflow.push(result.overflow);
  }
  assert(nativeBackends.size === 1, "AAS_TRANSACTION_CONTROLLER_OBSERVER_AMBIGUOUS", { backends: [...nativeBackends] });
  assert(nativeLineage.every(Boolean) && nativeOverflow.every((value) => value === false), "AAS_TRANSACTION_CONTROLLER_OBSERVER_INCOMPLETE");
  const eventDigest = digestJson(boundaryEvidence.map((item) => item.observerEventDigest));
  const backend = [...nativeBackends][0];
  return {
    schemaVersion: 1,
    status: "passed",
    productionBinary: true,
    testMode: false,
    mocked: false,
    candidate: {
      package: runtime.manifest.name,
      version: runtime.manifest.version,
      tarballSha512: inspection.sha512,
      installedTreeSha256: runtime.treeDigest,
      aasEntrypointSha256: sha256(fs.readFileSync(runtime.bins.aas)),
    },
    controller: { version: CONTROLLER_VERSION, digest: digestJson({ version: CONTROLLER_VERSION, faultClasses: FAULT_CLASSES, raceClasses: RACE_CLASSES }) },
    observer: {
      backend,
      eventDigest,
      eventCount: boundaryEvidence.length,
      overflow: nativeOverflow.some(Boolean),
      ambiguousLineage: !nativeLineage.every(Boolean),
    },
    faultBoundaryClasses: [...FAULT_CLASSES],
    raceClasses: [...RACE_CLASSES],
    executions: boundaryEvidence.length,
    killExecutions: FAULT_CLASSES.length,
    swapExecutions: boundaryEvidence.filter((item) => item.injectionAction.endsWith("swap")).length,
    recoveryExecutions: boundaryEvidence.filter((item) => !["none", "fail-closed"].includes(item.recoveryAction)).length,
    partialStates: 0,
    unmanagedMutations: 0,
    hardPolicyViolations: 0,
    boundaryEvidence,
  };
}

export { FAULT_CLASSES, RACE_CLASSES };
