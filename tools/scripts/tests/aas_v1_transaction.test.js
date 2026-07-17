"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const versions = require("../../lib/aas-v1/versions");
const { sha256, canonicalJson } = require("../../lib/aas-v1/canonical-json");
const { buildPlanEnvelope } = require("../../lib/aas-v1/stack");
const {
  appendRecord,
  acquireLock,
  applyPlan,
  buildRecoveryPlan,
  buildManagedState,
  createJournal,
  digestManagedEntries,
  doctor,
  journalPath,
  preflight,
  readManagedState,
  recover,
  releaseLock,
  recoveryIdFor,
  treeDigest,
} = require("../../lib/aas-v1/transaction");
const {
  cleanupMaterializedLayout,
  inspectLayout,
  materializeLayout,
} = require("../../lib/aas-v1/transaction/safety");

const DIGEST = (letter) => `sha256-${letter.repeat(64)}`;
const CATALOG = { package: "agentic-awesome-skills", version: "15.0.0", integrity: DIGEST("a") };
const TARGET_ID = DIGEST("b");

function writeTree(directory, files) {
  fs.mkdirSync(directory, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(directory, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
}

function fixture() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "aas-v1-transaction-"));
  const root = path.join(sandbox, "target");
  const skillsDirectory = path.join(root, "skills");
  const transactionDirectory = path.join(root, ".aas-transactions");
  const stateFile = path.join(root, ".aas-managed-state.json");
  const sources = path.join(sandbox, "sources");
  fs.mkdirSync(skillsDirectory, { recursive: true });
  fs.mkdirSync(transactionDirectory, { recursive: true });
  fs.mkdirSync(sources, { recursive: true });
  const adapter = {
    resolveTransactionLayout() { return { root, skillsDirectory, stateFile, transactionDirectory }; },
    computeTargetIdentity() { return TARGET_ID; },
    resolveSourceTree({ skillId }) { return path.join(sources, skillId); },
    validateSourceTree(source) { return source.endsWith(`${path.sep}sources${path.sep}${path.basename(source)}`); },
  };
  return { sandbox, root, skillsDirectory, transactionDirectory, stateFile, sources, adapter };
}

function buildInstallPlan(fx, skillId = "alpha", overrides = {}) {
  const source = path.join(fx.sources, skillId);
  if (!fs.existsSync(source)) writeTree(source, { "SKILL.md": "# Alpha\n", "nested/example.txt": "hello\n" });
  const sourceDigest = treeDigest(source);
  const emptyDigest = digestManagedEntries([]);
  const nextDigest = digestManagedEntries([{ skillId, treeDigest: sourceDigest, catalogIntegrity: CATALOG.integrity }]);
  return buildPlanEnvelope({
    manifest: {
      schemaVersion: 1,
      name: "transaction-test",
      catalog: CATALOG,
      targets: [{ host: "codex", scope: "project" }],
      intent: { goals: ["test"] },
      policy: { allowedRisk: ["safe"], requireKnownSource: true, allowManualSetup: false },
      skills: [{ id: skillId }],
    },
    handshake: versions,
    catalog: CATALOG,
    runtime: { package: "agentic-awesome-skills", version: "15.0.0", integrity: "sha512-runtime", closureDigest: DIGEST("c") },
    target: { host: "codex", scope: "project", adapterVersion: "1.0.0", identityDigest: TARGET_ID },
    installedState: { digest: emptyDigest, entries: [] },
    operations: [{ kind: "install", skillId, sourceTreeDigest: sourceDigest, expectedTreeDigest: null, resultTreeDigest: sourceDigest, backupRequired: false }],
    overrides: [],
    stateCommit: { previousDigest: emptyDigest, nextDigest, position: "final" },
    ...overrides,
  });
}

function buildReplacePlan(fx, { allowDrift }) {
  const state = readManagedState(fx.stateFile);
  const destination = path.join(fx.skillsDirectory, "alpha");
  const currentDigest = treeDigest(destination);
  const source = path.join(fx.sources, "alpha-next");
  writeTree(source, { "SKILL.md": "# Alpha v2\n" });
  const resultDigest = treeDigest(source);
  const nextDigest = digestManagedEntries([{ skillId: "alpha", treeDigest: resultDigest, catalogIntegrity: CATALOG.integrity }]);
  const adapter = { ...fx.adapter, resolveSourceTree() { return source; } };
  const plan = buildPlanEnvelope({
    manifest: {
      schemaVersion: 1,
      name: "transaction-test",
      catalog: CATALOG,
      targets: [{ host: "codex", scope: "project" }],
      intent: { goals: ["test"] },
      policy: { allowedRisk: ["safe"], requireKnownSource: true, allowManualSetup: false },
      skills: [{ id: "alpha" }],
    },
    handshake: versions,
    catalog: CATALOG,
    runtime: { package: "agentic-awesome-skills", version: "15.0.0", integrity: "sha512-runtime", closureDigest: DIGEST("c") },
    target: { host: "codex", scope: "project", adapterVersion: "1.0.0", identityDigest: TARGET_ID },
    installedState: {
      digest: state.stateDigest,
      entries: state.entries.map(({ skillId, treeDigest: digest, catalogIntegrity }) => ({ skillId, treeDigest: digest, catalogIntegrity })),
    },
    operations: [{ kind: "replaceManaged", skillId: "alpha", sourceTreeDigest: resultDigest, expectedTreeDigest: currentDigest, resultTreeDigest: resultDigest, backupRequired: true }],
    overrides: allowDrift ? [{ kind: "managedDrift", skillId: "alpha", reasonCodes: ["approved-local-backup"], unknownFields: [] }] : [],
    stateCommit: { previousDigest: state.stateDigest, nextDigest, position: "final" },
  });
  return { adapter, plan, resultDigest };
}

function snapshot(root) {
  const results = [];
  function visit(directory, relative = "") {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const item = relative ? `${relative}/${name}` : name;
      const stat = fs.lstatSync(absolute);
      if (stat.isDirectory()) {
        results.push(`d:${item}`);
        visit(absolute, item);
      } else results.push(`f:${item}:${sha256(fs.readFileSync(absolute))}`);
    }
  }
  visit(root);
  return results;
}

test("tree digest is deterministic and rejects symlinks", () => {
  const fx = fixture();
  const one = path.join(fx.sandbox, "one");
  const two = path.join(fx.sandbox, "two");
  writeTree(one, { "z.txt": "z", "a/x.txt": "x" });
  writeTree(two, { "a/x.txt": "x", "z.txt": "z" });
  assert.equal(treeDigest(one), treeDigest(two));
  fs.symlinkSync(path.join(one, "z.txt"), path.join(one, "link"));
  assert.throws(() => treeDigest(one), { code: "AAS_TRANSACTION_TREE_SYMLINK" });
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("apply commits managed state last, preserves unmanaged bytes, and is idempotent", () => {
  const fx = fixture();
  writeTree(path.join(fx.skillsDirectory, "unmanaged"), { "keep.txt": "do not change" });
  const unmanagedBefore = treeDigest(path.join(fx.skillsDirectory, "unmanaged"));
  const plan = buildInstallPlan(fx);
  const boundaries = [];
  const result = applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest, onBoundary: (name) => boundaries.push(name) });
  assert.equal(result.status, "applied");
  assert.equal(treeDigest(path.join(fx.skillsDirectory, "unmanaged")), unmanagedBefore);
  assert.equal(treeDigest(path.join(fx.skillsDirectory, "alpha")), plan.payload.operations[0].resultTreeDigest);
  const state = readManagedState(fx.stateFile);
  assert.deepEqual(state.completedPlanDigests, [plan.digest]);
  assert.equal(boundaries.at(-1), "committed");
  const before = snapshot(fx.root);
  let called = false;
  const again = applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest, onBoundary: () => { called = true; } });
  assert.equal(again.status, "alreadyApplied");
  assert.equal(called, false);
  assert.deepEqual(snapshot(fx.root), before);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("a post-commit cleanup failure is surfaced and completed by approved recovery", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "committed") throw new Error("cleanup boundary fault");
    },
  }), { code: "AAS_TRANSACTION_RECOVERY_REQUIRED" });
  assert.equal(treeDigest(path.join(fx.skillsDirectory, "alpha")), plan.payload.operations[0].resultTreeDigest);
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId: diagnosis.recoveries[0].recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  assert.equal(applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest }).status, "alreadyApplied");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("bootstrap publication failure preserves plan-bound recovery evidence", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "bootstrapPublished") throw new Error("fault after bootstrap rename");
    },
  }), { code: "AAS_TRANSACTION_RECOVERY_REQUIRED" });
  const lockFile = path.join(fx.root, ".aas-transaction.lock");
  assert.equal(fs.existsSync(lockFile), true);
  let diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  assert.equal(diagnosis.recoveries[0].bootstrapOnly, true);

  // Simulate the failed CLI process having exited before the separately
  // approved recovery command starts.
  const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  lock.pid = 2147483647;
  fs.writeFileSync(lockFile, `${canonicalJson(lock)}\n`);
  const cleanup = buildRecoveryPlan({
    plan,
    adapter: fx.adapter,
    recoveryId: diagnosis.recoveries[0].recoveryId,
    action: "cleanup",
  });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "healthy");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("layout publication failure is tracked before fsync and leaves no partial artifact", () => {
  const fx = fixture();
  fs.rmSync(fx.skillsDirectory, { recursive: true });
  fs.rmSync(fx.transactionDirectory, { recursive: true });
  const plan = buildInstallPlan(fx);
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "layoutDirectoryPublished") throw new Error("fault after layout rename");
    },
  }), { code: "AAS_TRANSACTION_LAYOUT_CREATE_FAILED" });
  assert.equal(fs.existsSync(fx.skillsDirectory), false);
  assert.equal(fs.existsSync(fx.transactionDirectory), false);
  assert.equal(fs.readdirSync(fx.root).some((name) => name.startsWith(".aas-")), false);
  assert.equal(doctor({ target: plan.payload.target, adapter: fx.adapter }).status, "healthy");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("layout tombstone cleanup resumes after its rename durability boundary", () => {
  const fx = fixture();
  fs.rmSync(fx.skillsDirectory, { recursive: true });
  fs.rmSync(fx.transactionDirectory, { recursive: true });
  const inspected = inspectLayout(fx.adapter, { host: "codex", scope: "project", identityDigest: TARGET_ID });
  const markerToken = "c".repeat(48);
  const markerName = `.aas-layout-recovery-${"d".repeat(32)}`;
  const created = [];
  materializeLayout(inspected, { markerName, markerToken, createdDirectories: created });
  assert.throws(() => cleanupMaterializedLayout(inspected, created, {
    markerName,
    markerToken,
    onBoundary(name) {
      if (name === "layoutDirectoryTombstoned") throw new Error("fault after tombstone rename");
    },
  }), /fault after tombstone rename/);
  assert.ok(fs.readdirSync(fx.root).some((name) => name.startsWith(`.aas-layout-remove-${markerToken}-`)));
  cleanupMaterializedLayout(inspected, created, { markerName, markerToken });
  assert.equal(fs.existsSync(fx.skillsDirectory), false);
  assert.equal(fs.existsSync(fx.transactionDirectory), false);
  assert.equal(fs.readdirSync(fx.root).some((name) => name.includes(markerToken)), false);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("alreadyApplied verifies final bytes and refuses a completed state with drift or recovery artifacts", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest });
  fs.writeFileSync(path.join(fx.skillsDirectory, "alpha", "SKILL.md"), "tampered\n");
  assert.throws(() => applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest }), { code: "AAS_TRANSACTION_FINAL_STATE_DRIFT" });
  fs.writeFileSync(path.join(fx.skillsDirectory, "alpha", "SKILL.md"), "# Alpha\n");
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  createJournal(fx.root, recoveryId, plan.digest, TARGET_ID);
  assert.throws(() => applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest }), { code: "AAS_TRANSACTION_RECOVERY_REQUIRED" });
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("unmanaged collision and target identity drift fail before writes", () => {
  const fx = fixture();
  writeTree(path.join(fx.skillsDirectory, "alpha"), { "personal.txt": "mine" });
  const plan = buildInstallPlan(fx);
  const before = snapshot(fx.root);
  assert.throws(() => preflight({ plan, adapter: fx.adapter }), { code: "AAS_TRANSACTION_UNMANAGED_COLLISION" });
  assert.deepEqual(snapshot(fx.root), before);
  const drifting = { ...fx.adapter, computeTargetIdentity() { return DIGEST("f"); } };
  assert.throws(() => preflight({ plan, adapter: drifting }), { code: "AAS_TRANSACTION_TARGET_DRIFT" });
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("target lock is held before materialization and preflight, preventing concurrent stale plans", () => {
  const fx = fixture();
  const first = buildInstallPlan(fx, "alpha");
  const second = buildInstallPlan(fx, "beta");
  let concurrentCode = null;
  const result = applyPlan({
    plan: first,
    adapter: fx.adapter,
    approvalDigest: first.digest,
    onBoundary(name) {
      if (name !== "lockAcquired" || concurrentCode) return;
      try {
        applyPlan({ plan: second, adapter: fx.adapter, approvalDigest: second.digest });
      } catch (error) {
        concurrentCode = error.code;
      }
    },
  });
  assert.equal(result.status, "applied");
  assert.equal(concurrentCode, "AAS_TRANSACTION_LOCKED");
  const state = readManagedState(fx.stateFile);
  assert.deepEqual(state.entries.map((entry) => entry.skillId), ["alpha"]);
  assert.equal(fs.existsSync(path.join(fx.skillsDirectory, "beta")), false);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("managed local edits block unless the immutable plan carries an explicit backed-up override", () => {
  const fx = fixture();
  const initial = buildInstallPlan(fx);
  applyPlan({ plan: initial, adapter: fx.adapter, approvalDigest: initial.digest });
  fs.writeFileSync(path.join(fx.skillsDirectory, "alpha", "SKILL.md"), "# locally edited\n");
  const blocked = buildReplacePlan(fx, { allowDrift: false });
  assert.throws(() => preflight({ plan: blocked.plan, adapter: blocked.adapter }), { code: "AAS_TRANSACTION_MANAGED_DRIFT" });
  const approved = buildReplacePlan(fx, { allowDrift: true });
  assert.equal(applyPlan({ plan: approved.plan, adapter: approved.adapter, approvalDigest: approved.plan.digest }).status, "applied");
  assert.equal(treeDigest(path.join(fx.skillsDirectory, "alpha")), approved.resultDigest);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("fault after promotion rolls back bytes and requires approved cleanup before reuse", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  let injected = false;
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "destinationPromoted" && !injected) {
        injected = true;
        throw new Error("fault");
      }
    },
  }), { code: "AAS_TRANSACTION_APPLY_ROLLED_BACK" });
  assert.equal(fs.existsSync(path.join(fx.skillsDirectory, "alpha")), false);
  assert.equal(fs.existsSync(fx.stateFile), false);
  assert.throws(() => applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest }), { code: "AAS_TRANSACTION_RECOVERY_REQUIRED" });
  const diagnosisBefore = snapshot(fx.root);
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  assert.deepEqual(snapshot(fx.root), diagnosisBefore, "doctor must be read-only");
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId: diagnosis.recoveries[0].recoveryId, action: "cleanup" });
  assert.throws(() => recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: DIGEST("0") }), { code: "AAS_RECOVERY_APPROVAL_MISMATCH" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  assert.equal(applyPlan({ plan, adapter: fx.adapter, approvalDigest: plan.digest }).status, "applied");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("rollback restores a pre-existing empty managed-state file byte-for-byte", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const emptyState = buildManagedState({
    target: plan.payload.target,
    catalog: CATALOG,
    entries: [],
    completedPlanDigests: [],
  });
  const previousBytes = `${canonicalJson(emptyState)}\n`;
  fs.writeFileSync(fx.stateFile, previousBytes);
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "managedStateCommitted") throw new Error("fault after state promote");
    },
  }), { code: "AAS_TRANSACTION_APPLY_ROLLED_BACK" });
  assert.equal(fs.readFileSync(fx.stateFile, "utf8"), previousBytes);
  assert.equal(fs.existsSync(path.join(fx.skillsDirectory, "alpha")), false);
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId: diagnosis.recoveries[0].recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("explicit rollback is digest-bound and refuses destination drift", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  const root = path.join(fx.transactionDirectory, recoveryId);
  fs.mkdirSync(root, { mode: 0o700 });
  const journal = createJournal(fx.root, recoveryId, plan.digest, TARGET_ID);
  fs.renameSync(path.join(fx.sources, "alpha"), path.join(fx.skillsDirectory, "alpha"));
  appendRecord(journal, "destinationPromoted", { skillId: "alpha", treeDigest: plan.payload.operations[0].resultTreeDigest });
  const recoveryPlan = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "rollback" });
  const misleading = structuredClone(recoveryPlan);
  misleading.payload.operations = [];
  misleading.digest = sha256(canonicalJson(misleading.payload));
  assert.throws(() => recover({ recoveryPlan: misleading, plan, adapter: fx.adapter, approvalDigest: misleading.digest }), { code: "AAS_RECOVERY_OPERATIONS_MISMATCH" });
  fs.writeFileSync(path.join(fx.skillsDirectory, "alpha", "SKILL.md"), "tampered\n");
  assert.throws(() => recover({ recoveryPlan, plan, adapter: fx.adapter, approvalDigest: recoveryPlan.digest }), { code: "AAS_RECOVERY_PRECONDITION_DRIFT" });
  fs.writeFileSync(path.join(fx.skillsDirectory, "alpha", "SKILL.md"), "# Alpha\n");
  assert.equal(recover({ recoveryPlan, plan, adapter: fx.adapter, approvalDigest: recoveryPlan.digest }).status, "rolledBack");
  assert.equal(fs.existsSync(path.join(fx.skillsDirectory, "alpha")), false);
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("recovery never retires an apply lock owned by a live process", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const ready = preflight({ plan, adapter: fx.adapter });
  const applyLock = acquireLock(ready.layout, plan);
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  createJournal(fx.root, recoveryId, plan.digest, TARGET_ID);
  const recoveryPlan = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "cleanup" });
  assert.throws(() => recover({ recoveryPlan, plan, adapter: fx.adapter, approvalDigest: recoveryPlan.digest }), { code: "AAS_TRANSACTION_LOCK_LIVE_OR_UNKNOWN" });
  assert.equal(fs.existsSync(applyLock.path), true);
  releaseLock(applyLock);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("doctor exposes and recovery retires a dead standalone recovery guard", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const ready = preflight({ plan, adapter: fx.adapter });
  const guard = acquireLock(ready.layout, plan, "recovery-guard");
  fs.closeSync(guard.descriptor);
  const record = { ...guard.record, pid: 2147483647 };
  fs.writeFileSync(guard.path, `${canonicalJson(record)}\n`);
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  assert.equal(diagnosis.recoveries.length, 1);
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId: diagnosis.recoveries[0].recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  assert.equal(fs.readdirSync(fx.root).some((name) => name.includes("transaction-recovery.lock")), false);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("a partial bootstrap record is recoverable only before a root WAL exists", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const ready = preflight({ plan, adapter: fx.adapter });
  const applyLock = acquireLock(ready.layout, plan);
  fs.closeSync(applyLock.descriptor);
  fs.writeFileSync(applyLock.path, `${canonicalJson({ ...applyLock.record, pid: 2147483647 })}\n`);
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  const bootstrap = path.join(fx.root, `.aas-bootstrap-${recoveryId}.json`);
  fs.writeFileSync(bootstrap, '{"partial":');
  const pendingWal = `${journalPath(fx.root, recoveryId)}.pending-${applyLock.token}`;
  fs.writeFileSync(pendingWal, '{"partialWal":');
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  assert.equal(diagnosis.recoveries[0].recoveryId, recoveryId);
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  assert.equal(fs.existsSync(bootstrap), false);
  assert.equal(fs.existsSync(pendingWal), false);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("recovery repairs only an approved torn WAL tail", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  assert.throws(() => applyPlan({
    plan,
    adapter: fx.adapter,
    approvalDigest: plan.digest,
    onBoundary(name) {
      if (name === "destinationPromoted") throw new Error("fault");
    },
  }), { code: "AAS_TRANSACTION_APPLY_ROLLED_BACK" });
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  const wal = journalPath(fx.root, recoveryId);
  fs.appendFileSync(wal, '{"partial":');
  const diagnosis = doctor({ target: plan.payload.target, adapter: fx.adapter });
  assert.equal(diagnosis.status, "recoveryRequired");
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "cleanup" });
  assert.match(cleanup.payload.checkpoint.tornTailDigest, /^sha256-[a-f0-9]{64}$/);
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  assert.equal(fs.existsSync(wal), false);
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("the same approved recovery plan resumes after a crash between mutation and WAL completion", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  const recoveryId = recoveryIdFor(plan.digest, TARGET_ID);
  const root = path.join(fx.transactionDirectory, recoveryId);
  fs.mkdirSync(root, { mode: 0o700 });
  const journal = createJournal(fx.root, recoveryId, plan.digest, TARGET_ID);
  fs.renameSync(path.join(fx.sources, "alpha"), path.join(fx.skillsDirectory, "alpha"));
  appendRecord(journal, "mutationIntent", {
    actionId: "apply:promote:alpha", phase: "apply", kind: "rename", logicalId: "alpha",
    beforeDigest: null, afterDigest: plan.payload.operations[0].resultTreeDigest,
  });
  const recoveryPlan = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "rollback" });
  let killed = false;
  assert.throws(() => recover({
    recoveryPlan,
    plan,
    adapter: fx.adapter,
    approvalDigest: recoveryPlan.digest,
    onBoundary(name) {
      if (name === "rollback:discard-new:alpha:mutated" && !killed) {
        killed = true;
        throw new Error("simulated hard stop");
      }
    },
  }), /simulated hard stop/);
  assert.equal(fs.existsSync(path.join(fx.skillsDirectory, "alpha")), false);
  fs.appendFileSync(journalPath(fx.root, recoveryId), '{"partialRecovery":');
  assert.equal(recover({ recoveryPlan, plan, adapter: fx.adapter, approvalDigest: recoveryPlan.digest }).status, "rolledBack");
  const cleanup = buildRecoveryPlan({ plan, adapter: fx.adapter, recoveryId, action: "cleanup" });
  assert.equal(recover({ recoveryPlan: cleanup, plan, adapter: fx.adapter, approvalDigest: cleanup.digest }).status, "cleaned");
  fs.rmSync(fx.sandbox, { recursive: true });
});

test("plan physical paths are ignored and adapter containment is enforced", () => {
  const fx = fixture();
  const plan = buildInstallPlan(fx);
  assert.equal(canonicalJson(plan).includes(fx.root), false);
  const escaping = {
    ...fx.adapter,
    resolveTransactionLayout() {
      return { root: fx.root, skillsDirectory: fx.skillsDirectory, stateFile: path.join(fx.sandbox, "outside.json"), transactionDirectory: fx.transactionDirectory };
    },
  };
  assert.throws(() => preflight({ plan, adapter: escaping }), { code: "AAS_TRANSACTION_PATH_OUTSIDE_TARGET" });
  fs.rmSync(fx.sandbox, { recursive: true });
});
