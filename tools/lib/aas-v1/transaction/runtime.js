"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const versions = require("../versions");
const { canonicalJson, canonicalize, sha256 } = require("../canonical-json");
const { validatePlanEnvelope } = require("../stack/plan");
const { validateInstance } = require("../schema-validator");
const { treeDigest, treeManifest } = require("./digest");
const { transactionError } = require("./errors");
const {
  appendRecord,
  createJournal,
  journalCheckpoint,
  journalEvents,
  journalPath,
  listJournalIds,
  readJournal,
  recoveryIdFor,
  removeJournal,
  repairTornTail,
  truncateTornTail,
  verifyCheckpoint,
} = require("./journal");
const {
  clearMaterializedMarkers,
  cleanupMaterializedLayout,
  inspectLayout,
  materializeLayout,
  resolveDestination,
  resolveLayout,
  resolveSource,
} = require("./safety");
const {
  buildManagedState,
  digestManagedEntries,
  fsyncDirectory,
  readManagedState,
  writeFileDurable,
} = require("./state");

function ensurePlan(plan) {
  try { validatePlanEnvelope(plan); } catch (cause) {
    if (cause && cause.code) throw cause;
    throw transactionError("AAS_TRANSACTION_PLAN_INVALID", "integrity", {}, cause);
  }
}

function ensureRecoveryPlan(recoveryPlan) {
  validateInstance("recovery-plan.schema.json", recoveryPlan, "AAS_RECOVERY_PLAN_SCHEMA_INVALID");
  const digestPattern = /^sha256-[a-f0-9]{64}$/;
  const exactKeys = (value, expected) => value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join(",") === [...expected].sort().join(",");
  const payloadKeys = [
    "schemaVersion", "kind", "versions", "recoveryId", "action", "bootstrapOnly", "planDigest",
    "journalDigest", "checkpoint", "targetIdentityDigest", "preconditions", "operations",
  ];
  if (!exactKeys(recoveryPlan, ["schemaVersion", "kind", "digest", "payload"])
    || recoveryPlan.schemaVersion !== 1 || recoveryPlan.kind !== "aas.recovery-plan"
    || !digestPattern.test(recoveryPlan.digest || "") || !exactKeys(recoveryPlan.payload, payloadKeys)
    || recoveryPlan.payload.schemaVersion !== 1 || recoveryPlan.payload.kind !== "aas.recovery-plan.payload"
    || recoveryPlan.digest !== sha256(canonicalJson(recoveryPlan.payload))
    || canonicalJson(recoveryPlan.payload.versions) !== canonicalJson(versions)
    || !/^recovery-[a-f0-9]{32,64}$/.test(recoveryPlan.payload.recoveryId || "")
    || !new Set(["rollback", "cleanup"]).has(recoveryPlan.payload.action)
    || typeof recoveryPlan.payload.bootstrapOnly !== "boolean"
    || !digestPattern.test(recoveryPlan.payload.planDigest || "")
    || !digestPattern.test(recoveryPlan.payload.journalDigest || "")
    || !digestPattern.test(recoveryPlan.payload.targetIdentityDigest || "")
    || !Array.isArray(recoveryPlan.payload.preconditions) || !Array.isArray(recoveryPlan.payload.operations)) {
    throw transactionError("AAS_RECOVERY_PLAN_INVALID", "integrity", {});
  }
  for (const item of recoveryPlan.payload.preconditions) {
    if (!exactKeys(item, ["logicalId", "expectedDigest"]) || typeof item.logicalId !== "string"
      || !digestPattern.test(item.expectedDigest || "")) throw transactionError("AAS_RECOVERY_PLAN_INVALID", "integrity", {});
  }
  for (const item of recoveryPlan.payload.operations) {
    if (!exactKeys(item, ["kind", "logicalId"]) || typeof item.kind !== "string" || typeof item.logicalId !== "string") {
      throw transactionError("AAS_RECOVERY_PLAN_INVALID", "integrity", {});
    }
  }
  const checkpoint = recoveryPlan.payload.checkpoint;
  if (recoveryPlan.payload.bootstrapOnly ? checkpoint !== null : (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint))) {
    throw transactionError("AAS_RECOVERY_PLAN_INVALID", "integrity", {});
  }
}

function verifyTargetIdentity(adapter, layout, target) {
  if (typeof adapter.computeTargetIdentity !== "function") {
    throw transactionError("AAS_TRANSACTION_ADAPTER_IDENTITY_REQUIRED", "invalidInput", {});
  }
  const actual = adapter.computeTargetIdentity(layout, target);
  if (actual !== target.identityDigest) {
    throw transactionError("AAS_TRANSACTION_TARGET_DRIFT", "drift", {});
  }
}

function revalidateLayout(adapter, expected, target) {
  const current = resolveLayout(adapter, target);
  verifyTargetIdentity(adapter, current, target);
  for (const key of ["root", "skillsDirectory", "stateFile", "transactionDirectory", "device"]) {
    if (current[key] !== expected[key]) {
      throw transactionError("AAS_TRANSACTION_TARGET_SWAP", "drift", { logicalId: key });
    }
  }
}

function lockPath(layout, kind = "apply") {
  return path.join(layout.root, kind === "recovery-guard" ? ".aas-transaction-recovery.lock" : ".aas-transaction.lock");
}

function acquireLock(layout, plan, kind = "apply") {
  const target = lockPath(layout, kind);
  if (kind !== "recovery-guard" && fs.existsSync(lockPath(layout, "recovery-guard"))) {
    throw transactionError("AAS_TRANSACTION_LOCKED", "conflict", { kind: "recovery" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  let descriptor;
  try {
    descriptor = fs.openSync(target, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR | (fs.constants.O_NOFOLLOW || 0), 0o600);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device
      || (typeof process.getuid === "function" && typeof stat.uid === "number" && stat.uid !== process.getuid())) {
      throw transactionError("AAS_TRANSACTION_LOCK_UNSAFE", "filesystem", {});
    }
    const record = {
      schemaVersion: 1,
      kind,
      pid: process.pid,
      createdAt: new Date().toISOString(),
      planDigest: plan.digest,
      targetIdentityDigest: plan.payload.target.identityDigest,
      recoveryId: recoveryIdFor(plan.digest, plan.payload.target.identityDigest),
      journalName: path.basename(journalPath(layout.root, recoveryIdFor(plan.digest, plan.payload.target.identityDigest))),
      plannedDirectories: [],
      token,
    };
    fs.writeFileSync(descriptor, `${canonicalJson(record)}\n`);
    fs.fsyncSync(descriptor);
    fsyncDirectory(layout.root);
    if (kind !== "recovery-guard" && fs.existsSync(lockPath(layout, "recovery-guard"))) {
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.unlinkSync(target);
      fsyncDirectory(layout.root);
      throw transactionError("AAS_TRANSACTION_LOCKED", "conflict", { kind: "recovery" });
    }
    return { descriptor, path: target, token, record };
  } catch (cause) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (cause && cause.code === "EEXIST") {
      throw transactionError("AAS_TRANSACTION_LOCKED", "conflict", { kind });
    }
    throw cause;
  }
}

function releaseLock(lock) {
  if (!lock) return;
  try {
    if (lock.descriptor !== undefined) fs.closeSync(lock.descriptor);
    lock.descriptor = undefined;
  } finally {
    let owned = false;
    try {
      const record = JSON.parse(fs.readFileSync(lock.path, "utf8"));
      owned = record.token === lock.token;
    } catch {}
    if (owned) {
      fs.unlinkSync(lock.path);
      fsyncDirectory(path.dirname(lock.path));
    }
  }
}

function closeLockPreservingEvidence(lock) {
  if (!lock || lock.descriptor === undefined) return;
  fs.closeSync(lock.descriptor);
  lock.descriptor = undefined;
}

function bootstrapPath(layout, recoveryId) {
  return path.join(layout.root, `.aas-bootstrap-${recoveryId}.json`);
}

function createBootstrapRecord(layout, plan, lock, onBoundary) {
  const markerName = `.aas-layout-${recoveryIdFor(plan.digest, plan.payload.target.identityDigest)}`;
  const body = canonicalize({
    schemaVersion: 1,
    recoveryId: recoveryIdFor(plan.digest, plan.payload.target.identityDigest),
    planDigest: plan.digest,
    targetIdentityDigest: plan.payload.target.identityDigest,
    markerName,
    markerToken: lock.token,
    directories: layout.missingDirectories.map((directory) => path.relative(layout.root, directory).split(path.sep).join("/")),
  });
  const record = { ...body, recordDigest: sha256(canonicalJson(body)) };
  const target = bootstrapPath(layout, body.recoveryId);
  const pending = `${target}.pending-${lock.token}`;
  let published = false;
  try {
    writeFileDurable(pending, `${canonicalJson(record)}\n`);
    fs.renameSync(pending, target);
    published = true;
    callBoundary(onBoundary, "bootstrapPublished", { recoveryId: body.recoveryId });
    fsyncDirectory(layout.root);
  } catch (cause) {
    try { if (fs.existsSync(pending)) fs.unlinkSync(pending); } catch {}
    if (published && fs.existsSync(target)) {
      const failure = transactionError(
        "AAS_TRANSACTION_BOOTSTRAP_DURABILITY_FAILED",
        "filesystem",
        { recoveryId: body.recoveryId },
        cause,
      );
      failure.bootstrapRecord = { ...record, path: target };
      throw failure;
    }
    throw cause;
  }
  return { ...record, path: target };
}

function readBootstrapRecord(layout, recoveryId, { allowMissing = true } = {}) {
  const target = bootstrapPath(layout, recoveryId);
  if (!fs.existsSync(target)) {
    if (allowMissing) return null;
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_MISSING", "recovery", {});
  }
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device || stat.size > 128 * 1024) {
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_UNSAFE", "filesystem", {});
  }
  let record;
  try { record = JSON.parse(fs.readFileSync(target, "utf8")); } catch (cause) {
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_CORRUPT", "integrity", {}, cause);
  }
  const { recordDigest, ...body } = record;
  if (record.recoveryId !== recoveryId || recordDigest !== sha256(canonicalJson(body)) || !Array.isArray(record.directories)
    || typeof record.markerName !== "string" || typeof record.markerToken !== "string") {
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_CORRUPT", "integrity", {});
  }
  return { ...record, path: target };
}

function removeBootstrapRecord(record, layout) {
  if (!record || !fs.existsSync(record.path)) return;
  const observed = readBootstrapRecord(layout, record.recoveryId, { allowMissing: false });
  if (observed.recordDigest !== record.recordDigest) throw transactionError("AAS_TRANSACTION_BOOTSTRAP_DRIFT", "drift", {});
  fs.unlinkSync(record.path);
  fsyncDirectory(layout.root);
}

function bootstrapEvidence(layout, recoveryId) {
  const target = bootstrapPath(layout, recoveryId);
  const pendingPrefix = `${path.basename(target)}.pending-`;
  const candidates = [
    ...(fs.existsSync(target) ? [target] : []),
    ...fs.readdirSync(layout.root).filter((name) => name.startsWith(pendingPrefix)).map((name) => path.join(layout.root, name)),
  ];
  if (candidates.length > 1) throw transactionError("AAS_TRANSACTION_BOOTSTRAP_AMBIGUOUS", "integrity", {});
  if (!candidates.length) return null;
  const filePath = candidates[0];
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device || stat.size > 128 * 1024) {
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_UNSAFE", "filesystem", {});
  }
  const bytes = fs.readFileSync(filePath);
  const digest = sha256(bytes);
  if (filePath === target) {
    try {
      const record = readBootstrapRecord(layout, recoveryId, { allowMissing: false });
      return { path: filePath, digest: record.recordDigest, record, rawDigest: digest, pending: false };
    } catch (error) {
      if (error.code !== "AAS_TRANSACTION_BOOTSTRAP_CORRUPT") throw error;
    }
  }
  return { path: filePath, digest, record: null, rawDigest: digest, pending: filePath !== target };
}

function removeBootstrapEvidence(evidence, layout) {
  if (!evidence || !fs.existsSync(evidence.path)) return;
  const stat = fs.lstatSync(evidence.path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device
    || sha256(fs.readFileSync(evidence.path)) !== evidence.rawDigest) {
    throw transactionError("AAS_TRANSACTION_BOOTSTRAP_DRIFT", "drift", {});
  }
  fs.unlinkSync(evidence.path);
  fsyncDirectory(layout.root);
}

function pendingJournalEvidence(layout, recoveryId) {
  const prefix = `${path.basename(journalPath(layout.root, recoveryId))}.pending-`;
  const matches = fs.readdirSync(layout.root).filter((name) => name.startsWith(prefix)).sort();
  if (matches.length > 1) throw transactionError("AAS_TRANSACTION_JOURNAL_PENDING_AMBIGUOUS", "integrity", {});
  if (!matches.length) return null;
  const filePath = path.join(layout.root, matches[0]);
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device || stat.size > 4 * 1024 * 1024) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_UNSAFE", "filesystem", {});
  }
  return { path: filePath, digest: sha256(fs.readFileSync(filePath)) };
}

function bootstrapOnlyDigest(lockRecord, bootstrap, pendingJournal) {
  return sha256(canonicalJson({
    lockDigest: lockRecord.digest,
    bootstrapDigest: bootstrap?.digest || null,
    pendingJournalDigest: pendingJournal?.digest || null,
  }));
}

function removePendingJournal(evidence, layout) {
  if (!evidence || !fs.existsSync(evidence.path)) return;
  const stat = fs.lstatSync(evidence.path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device
    || sha256(fs.readFileSync(evidence.path)) !== evidence.digest) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_DRIFT", "drift", {});
  }
  fs.unlinkSync(evidence.path);
  fsyncDirectory(layout.root);
}

function readLockRecord(layout) {
  const target = lockPath(layout);
  if (!fs.existsSync(target)) return null;
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device
    || (typeof process.getuid === "function" && typeof stat.uid === "number" && stat.uid !== process.getuid()) || stat.size > 64 * 1024) {
    throw transactionError("AAS_TRANSACTION_LOCK_UNSAFE", "filesystem", {});
  }
  let record;
  try { record = JSON.parse(fs.readFileSync(target, "utf8")); } catch (cause) {
    throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {}, cause);
  }
  if (record.schemaVersion !== 1 || typeof record.token !== "string" || typeof record.planDigest !== "string"
    || typeof record.targetIdentityDigest !== "string" || typeof record.recoveryId !== "string"
    || typeof record.journalName !== "string" || record.journalName !== path.basename(journalPath(layout.root, record.recoveryId))
    || !Array.isArray(record.plannedDirectories)) {
    throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {});
  }
  return { ...record, digest: sha256(canonicalJson(record)), path: target };
}

function readRecoveryGuardRecord(layout) {
  const target = lockPath(layout, "recovery-guard");
  if (!fs.existsSync(target)) return null;
  const record = readLockRecordAt(target, layout);
  if (record.schemaVersion !== 1 || record.kind !== "recovery-guard" || typeof record.token !== "string"
    || typeof record.planDigest !== "string" || typeof record.targetIdentityDigest !== "string"
    || typeof record.recoveryId !== "string") {
    throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {});
  }
  return { ...record, digest: sha256(canonicalJson(record)), path: target };
}

function copyTree(source, destination) {
  const manifest = treeManifest(source);
  fs.mkdirSync(destination, { mode: 0o700 });
  const directories = new Set([destination]);
  for (const entry of manifest.entries) {
    const output = path.join(destination, ...entry.path.split("/"));
    if (entry.type === "directory") {
      fs.mkdirSync(output, { mode: 0o700 });
      directories.add(output);
    } else {
      fs.copyFileSync(path.join(source, ...entry.path.split("/")), output, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(output, 0o600);
      const descriptor = fs.openSync(output, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    }
  }
  for (const directory of [...directories].sort((left, right) => right.split(path.sep).length - left.split(path.sep).length)) {
    fsyncDirectory(directory);
  }
}

function currentStateSnapshot(state) {
  return state ? {
    digest: state.stateDigest,
    entries: state.entries.map(({ skillId, treeDigest, catalogIntegrity }) => ({ skillId, treeDigest, catalogIntegrity })),
  } : { digest: digestManagedEntries([]), entries: [] };
}

function verifyCompletedPlanState(plan, layout, state) {
  if (!state || !state.completedPlanDigests.includes(plan.digest)
    || state.stateDigest !== plan.payload.stateCommit.nextDigest
    || state.target.identityDigest !== plan.payload.target.identityDigest
    || state.catalog.integrity !== plan.payload.catalog.integrity) {
    throw transactionError("AAS_TRANSACTION_FINAL_STATE_DRIFT", "drift", {});
  }
  const managed = new Map(state.entries.map((entry) => [entry.skillId, entry]));
  for (const entry of state.entries) {
    const destination = resolveDestination(layout, entry.skillId);
    if (!fs.existsSync(destination) || treeDigest(destination) !== entry.treeDigest) {
      throw transactionError("AAS_TRANSACTION_FINAL_STATE_DRIFT", "drift", { skillId: entry.skillId });
    }
  }
  for (const operation of plan.payload.operations) {
    const destination = resolveDestination(layout, operation.skillId);
    const entry = managed.get(operation.skillId);
    if (operation.kind === "removeManaged") {
      if (entry || fs.existsSync(destination)) throw transactionError("AAS_TRANSACTION_FINAL_STATE_DRIFT", "drift", { skillId: operation.skillId });
    } else if (!entry || entry.treeDigest !== operation.resultTreeDigest || entry.installedByPlanDigest !== plan.digest
      || !fs.existsSync(destination) || treeDigest(destination) !== operation.resultTreeDigest) {
      throw transactionError("AAS_TRANSACTION_FINAL_STATE_DRIFT", "drift", { skillId: operation.skillId });
    }
  }
  return {
    stateDigest: state.stateDigest,
    entries: state.entries.map((entry) => ({ skillId: entry.skillId, treeDigest: entry.treeDigest, installedByPlanDigest: entry.installedByPlanDigest })),
  };
}

function observeAlreadyApplied(plan, adapter) {
  const layout = inspectLayout(adapter, plan.payload.target);
  verifyTargetIdentity(adapter, layout, plan.payload.target);
  if (layout.missingDirectories.length || fs.existsSync(lockPath(layout)) || fs.existsSync(lockPath(layout, "recovery-guard"))) return false;
  const recoveryId = recoveryIdFor(plan.digest, plan.payload.target.identityDigest);
  const artifactIds = rootRecoveryArtifactIds(layout);
  if (artifactIds.length || fs.existsSync(path.join(layout.transactionDirectory, recoveryId))) {
    throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: artifactIds[0] || recoveryId });
  }
  const firstState = readManagedState(layout.stateFile);
  if (!firstState || !firstState.completedPlanDigests.includes(plan.digest)) return false;
  const first = verifyCompletedPlanState(plan, layout, firstState);
  if (fs.existsSync(lockPath(layout)) || fs.existsSync(lockPath(layout, "recovery-guard"))
    || fs.existsSync(path.join(layout.transactionDirectory, recoveryId)) || fs.existsSync(bootstrapPath(layout, recoveryId))
    || fs.existsSync(journalPath(layout.root, recoveryId))) {
    throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId });
  }
  const second = verifyCompletedPlanState(plan, layout, readManagedState(layout.stateFile));
  if (canonicalJson(first) !== canonicalJson(second)) throw transactionError("AAS_TRANSACTION_FINAL_STATE_DRIFT", "drift", {});
  return true;
}

function prepareNextState(plan, state) {
  const byId = new Map((state ? state.entries : []).map((entry) => [entry.skillId, entry]));
  for (const operation of plan.payload.operations) {
    if (operation.kind === "removeManaged") byId.delete(operation.skillId);
    else byId.set(operation.skillId, {
      skillId: operation.skillId,
      treeDigest: operation.resultTreeDigest,
      catalogIntegrity: plan.payload.catalog.integrity,
      installedByPlanDigest: plan.digest,
    });
  }
  const entries = [...byId.values()];
  if (digestManagedEntries(entries) !== plan.payload.stateCommit.nextDigest) {
    throw transactionError("AAS_TRANSACTION_NEXT_STATE_MISMATCH", "integrity", {});
  }
  return buildManagedState({
    target: plan.payload.target,
    catalog: plan.payload.catalog,
    entries,
    completedPlanDigests: [...(state ? state.completedPlanDigests : []), plan.digest],
  });
}

function preflight({ plan, adapter, layout: suppliedLayout }) {
  ensurePlan(plan);
  const layout = suppliedLayout || resolveLayout(adapter, plan.payload.target);
  verifyTargetIdentity(adapter, layout, plan.payload.target);
  const state = readManagedState(layout.stateFile);
  const recoveryId = recoveryIdFor(plan.digest, plan.payload.target.identityDigest);
  const transactionRoot = path.join(layout.transactionDirectory, recoveryId);
  if (fs.existsSync(transactionRoot)) {
    throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId });
  }
  if (state && state.completedPlanDigests.includes(plan.digest)) {
    verifyCompletedPlanState(plan, layout, state);
    return { status: "alreadyApplied", layout, state };
  }
  const snapshot = currentStateSnapshot(state);
  if (snapshot.digest !== plan.payload.installedState.digest || canonicalJson(snapshot.entries) !== canonicalJson(plan.payload.installedState.entries)) {
    throw transactionError("AAS_TRANSACTION_MANAGED_STATE_DRIFT", "drift", {});
  }
  if (state && state.target.identityDigest !== plan.payload.target.identityDigest) {
    throw transactionError("AAS_TRANSACTION_TARGET_DRIFT", "drift", {});
  }
  const managed = new Map((state ? state.entries : []).map((entry) => [entry.skillId, entry]));
  const driftOverrides = new Set(plan.payload.overrides.filter((item) => item.kind === "managedDrift").map((item) => item.skillId));
  const prepared = [];
  for (const operation of plan.payload.operations) {
    const destination = resolveDestination(layout, operation.skillId);
    const entry = managed.get(operation.skillId);
    const exists = fs.existsSync(destination);
    if (operation.kind === "install") {
      if (entry || exists) {
        throw transactionError("AAS_TRANSACTION_UNMANAGED_COLLISION", "conflict", { skillId: operation.skillId });
      }
    } else {
      if (!entry || !exists) {
        throw transactionError("AAS_TRANSACTION_MANAGED_ENTRY_MISSING", "drift", { skillId: operation.skillId });
      }
      const stat = fs.lstatSync(destination);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw transactionError("AAS_TRANSACTION_DESTINATION_UNSAFE", "filesystem", { skillId: operation.skillId });
      }
      const actual = treeDigest(destination);
      const drift = actual !== entry.treeDigest;
      if (actual !== operation.expectedTreeDigest || (drift && !(driftOverrides.has(operation.skillId) && operation.backupRequired))) {
        throw transactionError("AAS_TRANSACTION_MANAGED_DRIFT", "drift", { skillId: operation.skillId });
      }
    }
    const parent = path.dirname(destination);
    if (!fs.existsSync(parent)) {
      throw transactionError("AAS_TRANSACTION_DESTINATION_PARENT_UNSAFE", "filesystem", { skillId: operation.skillId });
    }
    const parentStat = fs.lstatSync(parent);
    if (parentStat.isSymbolicLink() || !parentStat.isDirectory() || parentStat.dev !== layout.device) {
      throw transactionError("AAS_TRANSACTION_DESTINATION_PARENT_UNSAFE", "filesystem", { skillId: operation.skillId });
    }
    let source = null;
    if (operation.kind !== "removeManaged") {
      source = resolveSource(adapter, operation, layout, plan.payload.target);
      if (treeDigest(source) !== operation.sourceTreeDigest) {
        throw transactionError("AAS_TRANSACTION_SOURCE_DIGEST_MISMATCH", "integrity", { skillId: operation.skillId });
      }
    }
    prepared.push({ operation, destination, source });
  }
  const nextState = prepareNextState(plan, state);
  return { status: "ready", layout, state, recoveryId, transactionRoot, prepared, nextState };
}

function callBoundary(onBoundary, name, details = {}) {
  if (typeof onBoundary === "function") onBoundary(name, details);
}

function assertMutationAuthority(context) {
  const authority = context.authority;
  if (!authority) throw transactionError("AAS_TRANSACTION_AUTHORITY_MISSING", "integrity", {});
  const record = readLockRecordAt(authority.path, context.layout);
  if (!record || record.token !== authority.token) throw transactionError("AAS_TRANSACTION_LOCK_LOST", "conflict", {});
  if (authority.kind === "apply" && fs.existsSync(lockPath(context.layout, "recovery-guard"))) {
    throw transactionError("AAS_TRANSACTION_RECOVERY_GUARD_ACTIVE", "conflict", {});
  }
}

function readLockRecordAt(filePath, layout) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device || stat.size > 64 * 1024) {
    throw transactionError("AAS_TRANSACTION_LOCK_UNSAFE", "filesystem", {});
  }
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (cause) {
    throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {}, cause);
  }
}

function performMutation(context, intent, effect, syncDirectories, onBoundary) {
  appendRecord(context, "mutationIntent", intent);
  callBoundary(onBoundary, `${intent.actionId}:intent`, { logicalId: intent.logicalId || null });
  assertMutationAuthority(context);
  effect();
  for (const directory of [...new Set(syncDirectories)]) fsyncDirectory(directory);
  callBoundary(onBoundary, `${intent.actionId}:mutated`, { logicalId: intent.logicalId || null });
  appendRecord(context, "mutationDone", { actionId: intent.actionId, phase: intent.phase, kind: intent.kind, logicalId: intent.logicalId || null });
  callBoundary(onBoundary, `${intent.actionId}:done`, { logicalId: intent.logicalId || null });
}

function rollbackApplied(context, prepared, stateWasCommitted, previousStateFile, onBoundary) {
  appendRecord(context, "rollbackStarted", {});
  callBoundary(onBoundary, "rollbackStarted");
  const discardedRoot = path.join(context.transactionRoot, "rollback-discarded");
  if (!fs.existsSync(discardedRoot)) fs.mkdirSync(discardedRoot, { mode: 0o700 });
  const discardedState = path.join(discardedRoot, "managed-state.next.json");
  let currentState = readManagedState(context.layout.stateFile);
  if (currentState && currentState.stateDigest === context.nextState.stateDigest) {
    if (fs.existsSync(discardedState)) throw transactionError("AAS_TRANSACTION_ROLLBACK_STATE_DRIFT", "drift", {});
    performMutation(context, {
      actionId: "rollback:discard-next-state",
      phase: "rollback",
      kind: "rename",
      logicalId: "managed-state.next",
      beforeDigest: context.nextState.stateDigest,
      afterDigest: null,
    }, () => fs.renameSync(context.layout.stateFile, discardedState), [path.dirname(context.layout.stateFile), discardedRoot], onBoundary);
    currentState = null;
  } else if (currentState && currentState.stateDigest !== context.previousStateDigest) {
    throw transactionError("AAS_TRANSACTION_ROLLBACK_STATE_DRIFT", "drift", {});
  }
  if (!currentState && fs.existsSync(previousStateFile)) {
    const previous = readManagedState(previousStateFile);
    if (!previous || previous.stateDigest !== context.previousStateDigest) throw transactionError("AAS_TRANSACTION_ROLLBACK_STATE_DRIFT", "drift", {});
    performMutation(context, {
      actionId: "rollback:restore-state",
      phase: "rollback",
      kind: "rename",
      logicalId: "managed-state.previous",
      beforeDigest: context.previousStateDigest,
      afterDigest: context.previousStateDigest,
    }, () => fs.renameSync(previousStateFile, context.layout.stateFile), [path.dirname(context.layout.stateFile), path.dirname(previousStateFile)], onBoundary);
  } else if (!currentState && context.previousStateDigest !== digestManagedEntries([])) {
    throw transactionError("AAS_TRANSACTION_ROLLBACK_STATE_DRIFT", "drift", {});
  }
  for (const item of [...prepared].reverse()) {
    const staged = path.join(context.transactionRoot, "staged", item.operation.skillId);
    const backup = path.join(context.transactionRoot, "backups", item.operation.skillId);
    const discarded = path.join(discardedRoot, item.operation.skillId);
    const destinationDigest = fs.existsSync(item.destination) ? treeDigest(item.destination) : null;
    const backupDigest = fs.existsSync(backup) ? treeDigest(backup) : null;
    if (destinationDigest === item.operation.resultTreeDigest && item.operation.resultTreeDigest) {
      if (fs.existsSync(discarded)) throw transactionError("AAS_TRANSACTION_ROLLBACK_DESTINATION_DRIFT", "drift", { skillId: item.operation.skillId });
      fs.mkdirSync(path.dirname(discarded), { recursive: true, mode: 0o700 });
      performMutation(context, {
        actionId: `rollback:discard-new:${item.operation.skillId}`,
        phase: "rollback",
        kind: "rename",
        logicalId: item.operation.skillId,
        beforeDigest: item.operation.resultTreeDigest,
        afterDigest: null,
      }, () => fs.renameSync(item.destination, discarded), [path.dirname(item.destination), path.dirname(discarded)], onBoundary);
    } else if (destinationDigest && destinationDigest !== item.operation.expectedTreeDigest) {
      throw transactionError("AAS_TRANSACTION_ROLLBACK_DESTINATION_DRIFT", "drift", { skillId: item.operation.skillId });
    }
    const afterDiscardDigest = fs.existsSync(item.destination) ? treeDigest(item.destination) : null;
    if (item.operation.kind !== "install") {
      if (afterDiscardDigest === item.operation.expectedTreeDigest && backupDigest === null) {
        // Already restored, including a retry after a crash between rename and journal completion.
      } else if (afterDiscardDigest === null && backupDigest === item.operation.expectedTreeDigest) {
        performMutation(context, {
          actionId: `rollback:restore-backup:${item.operation.skillId}`,
          phase: "rollback",
          kind: "rename",
          logicalId: item.operation.skillId,
          beforeDigest: item.operation.expectedTreeDigest,
          afterDigest: item.operation.expectedTreeDigest,
        }, () => fs.renameSync(backup, item.destination), [path.dirname(backup), path.dirname(item.destination)], onBoundary);
      } else {
        throw transactionError("AAS_TRANSACTION_ROLLBACK_BACKUP_DRIFT", "drift", { skillId: item.operation.skillId });
      }
    } else if (afterDiscardDigest !== null || backupDigest !== null) {
      throw transactionError("AAS_TRANSACTION_ROLLBACK_DESTINATION_DRIFT", "drift", { skillId: item.operation.skillId });
    }
    if (fs.existsSync(staged)) performMutation(context, {
      actionId: `rollback:remove-staged:${item.operation.skillId}`,
      phase: "rollback",
      kind: "removeTransactionOwned",
      logicalId: item.operation.skillId,
      beforeDigest: null,
      afterDigest: null,
    }, () => fs.rmSync(staged, { recursive: true }), [path.dirname(staged)], onBoundary);
  }
  fsyncDirectory(context.layout.skillsDirectory);
  appendRecord(context, "rollbackCompleted", {});
  callBoundary(onBoundary, "rollbackCompleted");
}

function applyPlan({ plan, adapter, approvalDigest, onBoundary }) {
  ensurePlan(plan);
  if (approvalDigest !== plan.digest) {
    throw transactionError("AAS_TRANSACTION_APPROVAL_MISMATCH", "approval", {});
  }
  const inspected = inspectLayout(adapter, plan.payload.target);
  verifyTargetIdentity(adapter, inspected, plan.payload.target);
  if (observeAlreadyApplied(plan, adapter)) return { ok: true, status: "alreadyApplied", planDigest: plan.digest };
  let lock;
  let context;
  let ready;
  let activeInspection = inspected;
  let createdDirectories = [];
  let bootstrapRecord = null;
  let preserveLockForRecovery = false;
  let stateWasCommitted = false;
  let previousStateFile;
  try {
    lock = acquireLock(inspected, plan);
    callBoundary(onBoundary, "lockAcquired");
    activeInspection = inspectLayout(adapter, plan.payload.target);
    verifyTargetIdentity(adapter, activeInspection, plan.payload.target);
    const recoveryArtifacts = rootRecoveryArtifactIds(activeInspection);
    if (recoveryArtifacts.length) {
      throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: recoveryArtifacts[0] });
    }
    bootstrapRecord = createBootstrapRecord(activeInspection, plan, lock, onBoundary);
    const recoveryId = recoveryIdFor(plan.digest, plan.payload.target.identityDigest);
    const transactionRoot = path.join(activeInspection.transactionDirectory, recoveryId);
    context = createJournal(activeInspection.root, recoveryId, plan.digest, plan.payload.target.identityDigest);
    Object.assign(context, {
      layout: activeInspection,
      transactionRoot,
      previousStateDigest: plan.payload.stateCommit.previousDigest,
      authority: { kind: "apply", path: lock.path, token: lock.token },
    });
    callBoundary(onBoundary, "journalStarted");
    materializeLayout(activeInspection, {
      markerName: bootstrapRecord.markerName,
      markerToken: bootstrapRecord.markerToken,
      createdDirectories,
      onBoundary(name, details) { callBoundary(onBoundary, name, details); },
    });
    for (const directory of createdDirectories) {
      const logicalId = path.relative(activeInspection.root, directory).split(path.sep).join("/");
      appendRecord(context, "layoutDirectoryCreated", { logicalId, bootstrapDigest: bootstrapRecord.recordDigest });
      callBoundary(onBoundary, "layoutDirectoryCreated", { logicalId });
    }
    const layout = resolveLayout(adapter, plan.payload.target);
    ready = preflight({ plan, adapter, layout });
    if (ready.status === "alreadyApplied") {
      clearMaterializedMarkers(layout, createdDirectories, { markerName: bootstrapRecord.markerName, markerToken: bootstrapRecord.markerToken });
      removeBootstrapRecord(bootstrapRecord, layout);
      removeJournal(context);
      return { ok: true, status: "alreadyApplied", planDigest: plan.digest };
    }
    previousStateFile = path.join(ready.transactionRoot, "managed-state.previous.json");
    Object.assign(context, ready);
    performMutation(context, {
      actionId: "apply:create-transaction-root",
      phase: "prepare",
      kind: "mkdir",
      logicalId: recoveryId,
      beforeDigest: null,
      afterDigest: null,
    }, () => {
      fs.mkdirSync(ready.transactionRoot, { mode: 0o700 });
      fs.mkdirSync(path.join(ready.transactionRoot, "staged"), { mode: 0o700 });
      fs.mkdirSync(path.join(ready.transactionRoot, "backups"), { mode: 0o700 });
    }, [ready.layout.transactionDirectory, ready.transactionRoot], onBoundary);
    for (const item of ready.prepared) {
      if (item.source) {
        const staged = path.join(ready.transactionRoot, "staged", item.operation.skillId);
        performMutation(context, {
          actionId: `apply:stage:${item.operation.skillId}`,
          phase: "prepare",
          kind: "copyTree",
          logicalId: item.operation.skillId,
          beforeDigest: null,
          afterDigest: item.operation.resultTreeDigest,
        }, () => {
          fs.mkdirSync(path.dirname(staged), { recursive: true, mode: 0o700 });
          copyTree(item.source, staged);
        }, [path.dirname(staged)], onBoundary);
        if (treeDigest(staged) !== item.operation.resultTreeDigest) {
          throw transactionError("AAS_TRANSACTION_STAGING_DIGEST_MISMATCH", "integrity", { skillId: item.operation.skillId });
        }
        callBoundary(onBoundary, "staged", { skillId: item.operation.skillId });
      }
    }
    verifyTargetIdentity(adapter, ready.layout, plan.payload.target);
    for (const item of ready.prepared) {
      revalidateLayout(adapter, ready.layout, plan.payload.target);
      if (resolveDestination(ready.layout, item.operation.skillId) !== item.destination) {
        throw transactionError("AAS_TRANSACTION_TARGET_SWAP", "drift", { skillId: item.operation.skillId });
      }
      const destinationParent = fs.lstatSync(path.dirname(item.destination));
      if (destinationParent.isSymbolicLink() || !destinationParent.isDirectory() || destinationParent.dev !== ready.layout.device) {
        throw transactionError("AAS_TRANSACTION_DESTINATION_PARENT_UNSAFE", "filesystem", { skillId: item.operation.skillId });
      }
      const currentExists = fs.existsSync(item.destination);
      if (item.operation.kind !== "install") {
        if (!currentExists || treeDigest(item.destination) !== item.operation.expectedTreeDigest) {
          throw transactionError("AAS_TRANSACTION_WRITE_TIME_DRIFT", "drift", { skillId: item.operation.skillId });
        }
        const backup = path.join(ready.transactionRoot, "backups", item.operation.skillId);
        fs.mkdirSync(path.dirname(backup), { recursive: true, mode: 0o700 });
        performMutation(context, {
          actionId: `apply:backup:${item.operation.skillId}`,
          phase: "apply",
          kind: "rename",
          logicalId: item.operation.skillId,
          beforeDigest: item.operation.expectedTreeDigest,
          afterDigest: item.operation.expectedTreeDigest,
        }, () => fs.renameSync(item.destination, backup), [path.dirname(item.destination), path.dirname(backup)], onBoundary);
        callBoundary(onBoundary, "backupMoved", { skillId: item.operation.skillId });
      } else if (currentExists) {
        throw transactionError("AAS_TRANSACTION_UNMANAGED_COLLISION", "conflict", { skillId: item.operation.skillId });
      }
      if (item.operation.kind === "removeManaged") {
        appendRecord(context, "destinationRemoved", { skillId: item.operation.skillId });
        callBoundary(onBoundary, "destinationRemoved", { skillId: item.operation.skillId });
      } else {
        const staged = path.join(ready.transactionRoot, "staged", item.operation.skillId);
        performMutation(context, {
          actionId: `apply:promote:${item.operation.skillId}`,
          phase: "apply",
          kind: "rename",
          logicalId: item.operation.skillId,
          beforeDigest: null,
          afterDigest: item.operation.resultTreeDigest,
        }, () => fs.renameSync(staged, item.destination), [path.dirname(staged), path.dirname(item.destination)], onBoundary);
        callBoundary(onBoundary, "destinationPromoted", { skillId: item.operation.skillId });
      }
    }
    revalidateLayout(adapter, ready.layout, plan.payload.target);
    const nextStateFile = path.join(ready.transactionRoot, "managed-state.next.json");
    performMutation(context, {
      actionId: "apply:state-next",
      phase: "commit",
      kind: "write",
      logicalId: "managed-state.next",
      beforeDigest: null,
      afterDigest: ready.nextState.stateDigest,
    }, () => writeFileDurable(nextStateFile, `${canonicalJson(ready.nextState)}\n`), [ready.transactionRoot], onBoundary);
    if (ready.state) performMutation(context, {
      actionId: "apply:state-backup",
      phase: "commit",
      kind: "rename",
      logicalId: "managed-state.previous",
      beforeDigest: ready.state.stateDigest,
      afterDigest: ready.state.stateDigest,
    }, () => fs.renameSync(ready.layout.stateFile, previousStateFile), [path.dirname(ready.layout.stateFile), ready.transactionRoot], onBoundary);
    performMutation(context, {
      actionId: "apply:state-promote",
      phase: "commit",
      kind: "rename",
      logicalId: "managed-state",
      beforeDigest: null,
      afterDigest: ready.nextState.stateDigest,
    }, () => fs.renameSync(nextStateFile, ready.layout.stateFile), [ready.transactionRoot, path.dirname(ready.layout.stateFile)], onBoundary);
    stateWasCommitted = true;
    callBoundary(onBoundary, "managedStateCommitted");
    appendRecord(context, "committed", {});
    callBoundary(onBoundary, "committed");
    try {
      clearMaterializedMarkers(ready.layout, createdDirectories, { markerName: bootstrapRecord.markerName, markerToken: bootstrapRecord.markerToken });
      removeBootstrapRecord(bootstrapRecord, ready.layout);
      fs.rmSync(ready.transactionRoot, { recursive: true });
      fsyncDirectory(ready.layout.transactionDirectory);
      removeJournal(context);
    } catch (cleanupCause) {
      throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: ready.recoveryId }, cleanupCause);
    }
    return { ok: true, status: "applied", planDigest: plan.digest, recoveryId: ready.recoveryId };
  } catch (cause) {
    if (cause?.bootstrapRecord) {
      bootstrapRecord = cause.bootstrapRecord;
      preserveLockForRecovery = true;
    }
    if (preserveLockForRecovery) {
      throw transactionError(
        "AAS_TRANSACTION_RECOVERY_REQUIRED",
        "recovery",
        { recoveryId: bootstrapRecord.recoveryId },
        cause,
      );
    }
    if (context && stateWasCommitted && journalEvents(context).has("committed")) {
      throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: ready.recoveryId }, cause);
    }
    if (context && ready) {
      try { appendRecord(context, "failed", { code: cause.code || "AAS_TRANSACTION_EXECUTION_FAILED" }); } catch {}
      try { rollbackApplied(context, ready.prepared, stateWasCommitted, previousStateFile, onBoundary); } catch (rollbackCause) {
        throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: ready.recoveryId }, rollbackCause);
      }
      throw transactionError("AAS_TRANSACTION_APPLY_ROLLED_BACK", "execution", { recoveryId: ready.recoveryId }, cause);
    }
    if (context) {
      try { appendRecord(context, "failed", { code: cause.code || "AAS_TRANSACTION_EXECUTION_FAILED" }); } catch {}
      try {
        cleanupMaterializedLayout(activeInspection, createdDirectories, { markerName: bootstrapRecord.markerName, markerToken: bootstrapRecord.markerToken });
        removeBootstrapRecord(bootstrapRecord, activeInspection);
        removeJournal(context);
      } catch (cleanupCause) {
        throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId: context.recoveryId }, cleanupCause);
      }
      throw cause;
    }
    if (bootstrapRecord) {
      cleanupMaterializedLayout(activeInspection, createdDirectories, { markerName: bootstrapRecord.markerName, markerToken: bootstrapRecord.markerToken });
      removeBootstrapRecord(bootstrapRecord, activeInspection);
    }
    throw cause;
  } finally {
    if (preserveLockForRecovery) closeLockPreservingEvidence(lock);
    else releaseLock(lock);
  }
}

function allowedRecoveryActions(journal) {
  const events = journalEvents(journal);
  if (events.has("committed") || events.has("rollbackCompleted")) return ["cleanup"];
  const mutationIntents = journal.records.filter((record) => record.event === "mutationIntent");
  if (mutationIntents.some((record) => ["apply", "commit", "rollback"].includes(record.details.phase))) return ["rollback"];
  if (!events.has("backupMoved") && !events.has("destinationPromoted") && !events.has("destinationRemoved") && !events.has("managedStateCommitted")) {
    return ["cleanup"];
  }
  return ["rollback"];
}

function scanJournals(layout) {
  return listJournalIds(layout.root).map((recoveryId) => readJournal(layout.root, recoveryId));
}

function rootRecoveryArtifactIds(layout) {
  const ids = new Set(listJournalIds(layout.root));
  for (const name of fs.readdirSync(layout.root)) {
    const bootstrap = /^\.aas-bootstrap-(recovery-[a-f0-9]{32,64})\.json(?:\.pending-[a-f0-9]{48})?$/.exec(name);
    const pendingWal = /^\.aas-transaction-(recovery-[a-f0-9]{32,64})\.wal\.pending-[a-f0-9]{32}$/.exec(name);
    if (bootstrap) ids.add(bootstrap[1]);
    if (pendingWal) ids.add(pendingWal[1]);
    if (name.startsWith(".aas-transaction.lock.retired.") || name.startsWith(".aas-transaction-recovery.lock.retired.")) {
      const record = readLockRecordAt(path.join(layout.root, name), layout);
      if (typeof record.recoveryId !== "string") throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_CORRUPT", "integrity", {});
      ids.add(record.recoveryId);
    }
  }
  return [...ids].sort();
}

function doctor({ target, adapter }) {
  const layout = inspectLayout(adapter, target);
  verifyTargetIdentity(adapter, layout, target);
  const findings = [];
  let state = null;
  try { state = readManagedState(layout.stateFile); } catch (error) {
    findings.push({ code: error.code, category: error.category, severity: "error", details: error.details });
  }
  if (state) {
    for (const entry of state.entries) {
      const destination = resolveDestination(layout, entry.skillId);
      try {
        if (!fs.existsSync(destination) || treeDigest(destination) !== entry.treeDigest) {
          findings.push({ code: "AAS_TRANSACTION_MANAGED_DRIFT", category: "drift", severity: "error", details: { skillId: entry.skillId } });
        }
      } catch {
        findings.push({ code: "AAS_TRANSACTION_MANAGED_DRIFT", category: "drift", severity: "error", details: { skillId: entry.skillId } });
      }
    }
  }
  const recoveries = [];
  try {
    for (const journal of scanJournals(layout)) {
      const actions = allowedRecoveryActions(journal);
      recoveries.push({ recoveryId: journal.recoveryId, allowedActions: actions, journalDigest: journal.digest, planDigest: journal.planDigest });
    }
  } catch (error) {
    findings.push({ code: error.code || "AAS_TRANSACTION_JOURNAL_CORRUPT", category: "integrity", severity: "error", details: {} });
  }
  try {
    const lockRecord = readLockRecord(layout);
    if (lockRecord) {
      findings.push({ code: "AAS_TRANSACTION_STALE_OR_ACTIVE_LOCK", category: "conflict", severity: "warning", details: {} });
      if (!recoveries.some((entry) => entry.recoveryId === lockRecord.recoveryId)) {
        const evidence = bootstrapEvidence(layout, lockRecord.recoveryId);
        const pendingJournal = pendingJournalEvidence(layout, lockRecord.recoveryId);
        recoveries.push({
          recoveryId: lockRecord.recoveryId,
          allowedActions: ["cleanup"],
          journalDigest: bootstrapOnlyDigest(lockRecord, evidence, pendingJournal),
          planDigest: lockRecord.planDigest,
          bootstrapOnly: true,
        });
      }
    }
  } catch (error) {
    findings.push({ code: error.code || "AAS_TRANSACTION_LOCK_CORRUPT", category: error.category || "integrity", severity: "error", details: {} });
  }
  try {
    const guard = readRecoveryGuardRecord(layout);
    if (guard) {
      findings.push({ code: "AAS_TRANSACTION_STALE_OR_ACTIVE_RECOVERY_LOCK", category: "conflict", severity: "warning", details: {} });
      if (!recoveries.some((entry) => entry.recoveryId === guard.recoveryId)) {
        const evidence = bootstrapEvidence(layout, guard.recoveryId);
        const pendingJournal = pendingJournalEvidence(layout, guard.recoveryId);
        recoveries.push({
          recoveryId: guard.recoveryId,
          allowedActions: ["cleanup"],
          journalDigest: bootstrapOnlyDigest(guard, evidence, pendingJournal),
          planDigest: guard.planDigest,
          bootstrapOnly: true,
        });
      }
    }
  } catch (error) {
    findings.push({ code: error.code || "AAS_TRANSACTION_LOCK_CORRUPT", category: error.category || "integrity", severity: "error", details: {} });
  }
  try {
    for (const recoveryId of rootRecoveryArtifactIds(layout)) {
      if (recoveries.some((entry) => entry.recoveryId === recoveryId)) continue;
      const retiredName = fs.readdirSync(layout.root).find((name) => {
        if (!name.startsWith(".aas-transaction.lock.retired.") && !name.startsWith(".aas-transaction-recovery.lock.retired.")) return false;
        try { return readLockRecordAt(path.join(layout.root, name), layout).recoveryId === recoveryId; } catch { return false; }
      });
      if (!retiredName) {
        findings.push({ code: "AAS_TRANSACTION_ORPHAN_RECOVERY_ARTIFACT", category: "recovery", severity: "error", details: { recoveryId } });
        continue;
      }
      const filePath = path.join(layout.root, retiredName);
      const record = readLockRecordAt(filePath, layout);
      const lockRecord = { ...record, digest: sha256(canonicalJson(record)) };
      const evidence = bootstrapEvidence(layout, recoveryId);
      const pendingJournal = pendingJournalEvidence(layout, recoveryId);
      findings.push({ code: "AAS_TRANSACTION_RETIRED_LOCK_PRESENT", category: "recovery", severity: "warning", details: { recoveryId } });
      recoveries.push({
        recoveryId,
        allowedActions: ["cleanup"],
        journalDigest: bootstrapOnlyDigest(lockRecord, evidence, pendingJournal),
        planDigest: record.planDigest,
        bootstrapOnly: true,
      });
    }
  } catch (error) {
    findings.push({ code: error.code || "AAS_TRANSACTION_RECOVERY_SCAN_FAILED", category: error.category || "integrity", severity: "error", details: {} });
  }
  const status = recoveries.length ? "recoveryRequired" : (findings.length ? "degraded" : "healthy");
  return validateInstance("doctor-result.schema.json", {
    schemaVersion: 1,
    ok: true,
    status,
    ...versions,
    target: { host: target.host, scope: target.scope, identityDigest: target.identityDigest },
    findings,
    recoveries,
  }, "AAS_TRANSACTION_DOCTOR_SCHEMA_INVALID");
}

function buildRecoveryPlan({ plan, adapter, recoveryId, action }) {
  ensurePlan(plan);
  const layout = inspectLayout(adapter, plan.payload.target);
  verifyTargetIdentity(adapter, layout, plan.payload.target);
  const expectedId = recoveryIdFor(plan.digest, plan.payload.target.identityDigest);
  if (recoveryId !== expectedId) throw transactionError("AAS_RECOVERY_ID_MISMATCH", "integrity", {});
  const root = path.join(layout.transactionDirectory, recoveryId);
  const walPath = journalPath(layout.root, recoveryId);
  if (!fs.existsSync(walPath)) {
    const liveLock = readLockRecord(layout);
    const retired = liveLock ? null : findRetiredLock(layout, plan, "apply");
    const recoveryGuard = liveLock || retired ? null : readRecoveryGuardRecord(layout);
    const retiredGuard = liveLock || retired || recoveryGuard ? null : findRetiredLock(layout, plan, "recovery-guard");
    const lockRecord = liveLock || (retired ? { ...retired.record, digest: retired.digest } : null) || recoveryGuard
      || (retiredGuard ? { ...retiredGuard.record, digest: retiredGuard.digest } : null);
    if (!lockRecord || lockRecord.recoveryId !== recoveryId || lockRecord.planDigest !== plan.digest
      || lockRecord.targetIdentityDigest !== plan.payload.target.identityDigest || action !== "cleanup") {
      throw transactionError("AAS_RECOVERY_JOURNAL_MISMATCH", "integrity", {});
    }
    const evidence = bootstrapEvidence(layout, recoveryId);
    const pendingJournal = pendingJournalEvidence(layout, recoveryId);
    const bootstrap = evidence?.record || null;
    const plannedLogicalDirectories = bootstrap?.directories || [];
    validatePlannedDirectories(layout, plannedLogicalDirectories);
    const payload = canonicalize({
      schemaVersion: 1,
      kind: "aas.recovery-plan.payload",
      versions: { ...versions },
      recoveryId,
      action,
      bootstrapOnly: true,
      planDigest: plan.digest,
      journalDigest: bootstrapOnlyDigest(lockRecord, evidence, pendingJournal),
      checkpoint: null,
      targetIdentityDigest: plan.payload.target.identityDigest,
      preconditions: [],
      operations: expectedRecoveryOperations(plan, action, recoveryId, plannedLogicalDirectories),
    });
    return validateInstance("recovery-plan.schema.json", {
      schemaVersion: 1, kind: "aas.recovery-plan", digest: sha256(canonicalJson(payload)), payload,
    }, "AAS_RECOVERY_PLAN_SCHEMA_INVALID");
  }
  const journal = readJournal(layout.root, recoveryId);
  if (journal.planDigest !== plan.digest || journal.targetIdentityDigest !== plan.payload.target.identityDigest) {
    throw transactionError("AAS_RECOVERY_JOURNAL_MISMATCH", "integrity", {});
  }
  if (!allowedRecoveryActions(journal).includes(action)) {
    throw transactionError("AAS_RECOVERY_ACTION_BLOCKED", "recovery", { action });
  }
  const preconditions = [];
  let operations;
  if (action === "rollback") {
    for (const operation of [...plan.payload.operations].reverse()) {
      const destination = resolveDestination(layout, operation.skillId);
      if (fs.existsSync(destination)) preconditions.push({ logicalId: `destination:${operation.skillId}`, expectedDigest: treeDigest(destination) });
    }
  }
  operations = expectedRecoveryOperations(plan, action, recoveryId);
  const payload = canonicalize({
    schemaVersion: 1,
    kind: "aas.recovery-plan.payload",
    versions: { ...versions },
    recoveryId,
    action,
    bootstrapOnly: false,
    planDigest: plan.digest,
    journalDigest: journal.digest,
    checkpoint: journalCheckpoint(journal),
    targetIdentityDigest: plan.payload.target.identityDigest,
    preconditions,
    operations,
  });
  return validateInstance("recovery-plan.schema.json", {
    schemaVersion: 1, kind: "aas.recovery-plan", digest: sha256(canonicalJson(payload)), payload,
  }, "AAS_RECOVERY_PLAN_SCHEMA_INVALID");
}

function expectedRecoveryOperations(plan, action, recoveryId, bootstrapDirectories = null) {
  if (Array.isArray(bootstrapDirectories)) {
    return [
      ...[...bootstrapDirectories].reverse().map((logicalId) => ({ kind: "removeBootstrapDirectory", logicalId })),
      { kind: "closeJournal", logicalId: recoveryId },
    ];
  }
  if (action === "rollback") {
    return [
      ...[...plan.payload.operations].reverse().map((operation) => ({
        kind: operation.kind === "install" ? "removeStaged" : "restoreBackup",
        logicalId: operation.skillId,
      })),
      { kind: "restoreManagedState", logicalId: "managed-state" },
    ];
  }
  return [
    { kind: "removeStaged", logicalId: recoveryId },
    { kind: "removeBackup", logicalId: recoveryId },
    { kind: "closeJournal", logicalId: recoveryId },
  ];
}

function validatePlannedDirectories(layout, logicalDirectories) {
  if (!Array.isArray(logicalDirectories)) throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {});
  const allowed = new Map(layout.layoutDirectories.map((directory) => [path.relative(layout.root, directory).split(path.sep).join("/"), directory]));
  const seen = new Set();
  const resolved = [];
  for (const logicalId of logicalDirectories) {
    if (typeof logicalId !== "string" || seen.has(logicalId) || !allowed.has(logicalId)) {
      throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {});
    }
    seen.add(logicalId);
    resolved.push(allowed.get(logicalId));
  }
  return resolved;
}

function processDefinitelyDead(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error.code === "ESRCH";
  }
}

function readRetiredLock(layout, filePath, plan, expectedKind = "apply") {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.dev !== layout.device || stat.size > 64 * 1024) {
    throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_UNSAFE", "filesystem", {});
  }
  let record;
  try { record = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (cause) {
    throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_CORRUPT", "integrity", {}, cause);
  }
  if (record.kind !== expectedKind || record.planDigest !== plan.digest
    || record.targetIdentityDigest !== plan.payload.target.identityDigest || typeof record.token !== "string") {
    throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_MISMATCH", "integrity", {});
  }
  return { record, digest: sha256(canonicalJson(record)), path: filePath };
}

function findRetiredLock(layout, plan, kind = "apply") {
  const prefix = kind === "apply" ? ".aas-transaction.lock.retired." : ".aas-transaction-recovery.lock.retired.";
  const matches = fs.readdirSync(layout.root).filter((name) => name.startsWith(prefix)).sort();
  if (matches.length > 1) throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_AMBIGUOUS", "recovery", {});
  return matches.length ? readRetiredLock(layout, path.join(layout.root, matches[0]), plan, kind) : null;
}

function retireDeadRecoveryGuard(layout, plan) {
  const existing = findRetiredLock(layout, plan, "recovery-guard");
  const target = lockPath(layout, "recovery-guard");
  if (!fs.existsSync(target)) return existing?.path || null;
  if (existing) throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_AMBIGUOUS", "recovery", {});
  const record = readLockRecordAt(target, layout);
  if (record.kind !== "recovery-guard" || record.planDigest !== plan.digest
    || record.targetIdentityDigest !== plan.payload.target.identityDigest || !processDefinitelyDead(record.pid)) {
    throw transactionError("AAS_TRANSACTION_LOCK_LIVE_OR_UNKNOWN", "conflict", {});
  }
  const second = readLockRecordAt(target, layout);
  if (canonicalJson(second) !== canonicalJson(record)) throw transactionError("AAS_TRANSACTION_LOCK_DRIFT", "drift", {});
  const retired = path.join(layout.root, `.aas-transaction-recovery.lock.retired.${record.token}`);
  fs.renameSync(target, retired);
  fsyncDirectory(layout.root);
  return retired;
}

function retireDeadApplyLock(layout, plan) {
  const target = lockPath(layout);
  const existing = findRetiredLock(layout, plan, "apply");
  if (!fs.existsSync(target)) return existing?.path || null;
  if (existing) throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_AMBIGUOUS", "recovery", {});
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw transactionError("AAS_TRANSACTION_LOCK_UNSAFE", "filesystem", {});
  let record;
  try { record = JSON.parse(fs.readFileSync(target, "utf8")); } catch (cause) {
    throw transactionError("AAS_TRANSACTION_LOCK_CORRUPT", "integrity", {}, cause);
  }
  if (record.planDigest !== plan.digest || record.targetIdentityDigest !== plan.payload.target.identityDigest) {
    throw transactionError("AAS_TRANSACTION_LOCK_MISMATCH", "integrity", {});
  }
  if (!processDefinitelyDead(record.pid)) throw transactionError("AAS_TRANSACTION_LOCK_LIVE_OR_UNKNOWN", "conflict", {});
  const secondStat = fs.lstatSync(target);
  const secondBytes = fs.readFileSync(target, "utf8");
  if (secondBytes !== `${canonicalJson(record)}\n`
    || (stat.dev !== 0 && secondStat.dev !== stat.dev) || (stat.ino !== 0 && secondStat.ino !== stat.ino)) {
    throw transactionError("AAS_TRANSACTION_LOCK_DRIFT", "drift", {});
  }
  const retired = path.join(layout.root, `.aas-transaction.lock.retired.${record.token}`);
  if (fs.existsSync(retired)) throw transactionError("AAS_TRANSACTION_RETIRED_LOCK_EXISTS", "recovery", {});
  fs.renameSync(target, retired);
  fsyncDirectory(layout.root);
  return retired;
}

function removeRetiredLock(filePath, layout) {
  if (!filePath || !fs.existsSync(filePath)) return;
  fs.unlinkSync(filePath);
  fsyncDirectory(layout.root);
}

function recover({ recoveryPlan, plan, adapter, approvalDigest, onBoundary }) {
  ensureRecoveryPlan(recoveryPlan);
  if (approvalDigest !== recoveryPlan.digest) throw transactionError("AAS_RECOVERY_APPROVAL_MISMATCH", "approval", {});
  ensurePlan(plan);
  if (recoveryPlan.payload.planDigest !== plan.digest
    || recoveryPlan.payload.targetIdentityDigest !== plan.payload.target.identityDigest
    || recoveryPlan.payload.recoveryId !== recoveryIdFor(plan.digest, plan.payload.target.identityDigest)) {
    throw transactionError("AAS_RECOVERY_PLAN_MISMATCH", "integrity", {});
  }
  const layout = inspectLayout(adapter, plan.payload.target);
  verifyTargetIdentity(adapter, layout, plan.payload.target);
  const root = path.join(layout.transactionDirectory, recoveryPlan.payload.recoveryId);
  if (recoveryPlan.payload.bootstrapOnly === true) {
    const liveLock = readLockRecord(layout);
    const retiredEvidence = liveLock ? null : findRetiredLock(layout, plan, "apply");
    const recoveryGuard = liveLock || retiredEvidence ? null : readRecoveryGuardRecord(layout);
    const retiredGuardEvidence = liveLock || retiredEvidence || recoveryGuard ? null : findRetiredLock(layout, plan, "recovery-guard");
    const lockRecord = liveLock || (retiredEvidence ? { ...retiredEvidence.record, digest: retiredEvidence.digest } : null) || recoveryGuard
      || (retiredGuardEvidence ? { ...retiredGuardEvidence.record, digest: retiredGuardEvidence.digest } : null);
    const evidence = bootstrapEvidence(layout, recoveryPlan.payload.recoveryId);
    const pendingJournal = pendingJournalEvidence(layout, recoveryPlan.payload.recoveryId);
    const bootstrap = evidence?.record || null;
    const evidenceDigest = lockRecord ? bootstrapOnlyDigest(lockRecord, evidence, pendingJournal) : null;
    if (!lockRecord || evidenceDigest !== recoveryPlan.payload.journalDigest
      || lockRecord.recoveryId !== recoveryPlan.payload.recoveryId || lockRecord.planDigest !== plan.digest) {
      throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
    }
    const plannedDirectories = validatePlannedDirectories(layout, bootstrap?.directories || []);
    const plannedLogicalDirectories = bootstrap?.directories || [];
    if (canonicalJson(recoveryPlan.payload.operations) !== canonicalJson(expectedRecoveryOperations(
      plan,
      recoveryPlan.payload.action,
      recoveryPlan.payload.recoveryId,
      plannedLogicalDirectories,
    ))) throw transactionError("AAS_RECOVERY_OPERATIONS_MISMATCH", "integrity", {});
    let guard;
    let retiredGuard;
    let retiredApply;
    try {
      retiredGuard = retireDeadRecoveryGuard(layout, plan);
      guard = acquireLock(layout, plan, "recovery-guard");
      removeRetiredLock(retiredGuard, layout);
      retiredGuard = null;
      retiredApply = retireDeadApplyLock(layout, plan);
      const current = inspectLayout(adapter, plan.payload.target);
      verifyTargetIdentity(adapter, current, plan.payload.target);
      if (bootstrap) {
        cleanupMaterializedLayout(current, plannedDirectories, { markerName: bootstrap.markerName, markerToken: bootstrap.markerToken });
        removeBootstrapRecord(bootstrap, current);
      } else if (evidence) {
        removeBootstrapEvidence(evidence, current);
      }
      removePendingJournal(pendingJournal, current);
      removeRetiredLock(retiredApply, current);
      callBoundary(onBoundary, "cleanupCompleted");
      return { ok: true, status: "cleaned", recoveryId: recoveryPlan.payload.recoveryId };
    } finally {
      releaseLock(guard);
    }
  }
  const strictLayout = resolveLayout(adapter, plan.payload.target);
  if (canonicalJson(recoveryPlan.payload.operations) !== canonicalJson(expectedRecoveryOperations(
    plan,
    recoveryPlan.payload.action,
    recoveryPlan.payload.recoveryId,
  ))) throw transactionError("AAS_RECOVERY_OPERATIONS_MISMATCH", "integrity", {});
  let journal = readJournal(strictLayout.root, recoveryPlan.payload.recoveryId);
  verifyCheckpoint(journal, recoveryPlan.payload.checkpoint);
  let lock;
  let retiredLock;
  let retiredGuard;
  try {
    retiredGuard = retireDeadRecoveryGuard(strictLayout, plan);
    lock = acquireLock(strictLayout, plan, "recovery-guard");
    removeRetiredLock(retiredGuard, strictLayout);
    retiredGuard = null;
    retiredLock = retireDeadApplyLock(strictLayout, plan);
    journal = readJournal(strictLayout.root, recoveryPlan.payload.recoveryId);
    verifyCheckpoint(journal, recoveryPlan.payload.checkpoint);
    const recoveryStart = journal.records[recoveryPlan.payload.checkpoint.recordCount];
    const isRetry = Boolean(recoveryStart);
    if (isRetry) {
      if (recoveryStart.event !== "recoveryStarted" || recoveryStart.details.recoveryPlanDigest !== recoveryPlan.digest) {
        throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
      }
      journal = truncateTornTail(journal);
    } else {
      for (const precondition of recoveryPlan.payload.preconditions) {
        if (precondition.logicalId.startsWith("destination:")) {
          const skillId = precondition.logicalId.slice("destination:".length);
          const destination = resolveDestination(strictLayout, skillId);
          if (!fs.existsSync(destination) || treeDigest(destination) !== precondition.expectedDigest) {
            throw transactionError("AAS_RECOVERY_PRECONDITION_DRIFT", "drift", { logicalId: precondition.logicalId });
          }
        }
      }
      journal = repairTornTail(journal, recoveryPlan.payload.checkpoint);
      appendRecord(journal, "recoveryStarted", { recoveryPlanDigest: recoveryPlan.digest, action: recoveryPlan.payload.action });
    }
    const context = { ...journal, path: journal.path, records: [...journal.records] };
    context.authority = { kind: "recovery", path: lock.path, token: lock.token };
    if (recoveryPlan.payload.action === "rollback") {
      const prepared = plan.payload.operations.map((operation) => ({ operation, destination: resolveDestination(strictLayout, operation.skillId) }));
      Object.assign(context, {
        layout: strictLayout,
        transactionRoot: root,
        nextState: { stateDigest: plan.payload.stateCommit.nextDigest },
        previousStateDigest: plan.payload.stateCommit.previousDigest,
      });
      const state = readManagedState(strictLayout.stateFile);
      rollbackApplied(context, prepared, Boolean(state && state.stateDigest === plan.payload.stateCommit.nextDigest), path.join(root, "managed-state.previous.json"), onBoundary);
      return { ok: true, status: "rolledBack", recoveryId: recoveryPlan.payload.recoveryId };
    }
    const bootstrap = readBootstrapRecord(strictLayout, recoveryPlan.payload.recoveryId);
    const createdDirectories = validatePlannedDirectories(strictLayout, bootstrap?.directories || []);
    if (fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true });
      fsyncDirectory(strictLayout.transactionDirectory);
    }
    if (bootstrap) {
      if (journalEvents(context).has("committed")) {
        clearMaterializedMarkers(strictLayout, createdDirectories, { markerName: bootstrap.markerName, markerToken: bootstrap.markerToken });
      } else {
        cleanupMaterializedLayout(strictLayout, createdDirectories, { markerName: bootstrap.markerName, markerToken: bootstrap.markerToken });
      }
      removeBootstrapRecord(bootstrap, strictLayout);
    }
    appendRecord(context, "cleanupCompleted", {});
    removeRetiredLock(retiredLock, strictLayout);
    retiredLock = null;
    removeJournal(context);
    callBoundary(onBoundary, "cleanupCompleted");
    return { ok: true, status: "cleaned", recoveryId: recoveryPlan.payload.recoveryId };
  } finally {
    releaseLock(lock);
  }
}

module.exports = {
  acquireLock,
  allowedRecoveryActions,
  applyPlan,
  buildRecoveryPlan,
  doctor,
  preflight,
  recover,
  releaseLock,
  verifyTargetIdentity,
};
