"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const core = require("../../lib/aas-v1");
const {
  execute,
  main,
  windowsOutputDurabilityDetails,
  writeNewStackArtifactDirectory,
} = require("../../lib/aas-v1/cli/main");

const ROOT = path.resolve(__dirname, "../../..");
const PACKAGE_VERSION = require(path.join(ROOT, "package.json")).version;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-cli-"));
  const runtime = {
    package: "agentic-awesome-skills",
    version: PACKAGE_VERSION,
    integrity: "sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==",
    closureDigest: `sha256-${"1".repeat(64)}`,
  };
  const dependencies = {
    async resolveVerifiedRuntime({ expected }) {
      if (expected) assert.equal(core.canonicalJson(expected), core.canonicalJson(runtime));
      return { identity: runtime, sourceRoot: ROOT };
    },
  };
  return { root, runtime, dependencies };
}

test("Windows output reports certified durability without marking the preview fallback", () => {
  assert.deepEqual(
    windowsOutputDurabilityDetails({ outputDurability: "directorySynced", certificationStatus: "certifiable" }, "win32"),
    { outputDurability: "directorySynced", certificationStatus: "certifiable" },
  );
  assert.deepEqual(
    windowsOutputDurabilityDetails({ outputDurability: "fileSyncedDirectoryUnverified", certificationStatus: "notCertified" }, "win32"),
    { releaseProfile: "preview", outputDurability: "fileSyncedDirectoryUnverified", certificationStatus: "notCertified" },
  );
  assert.deepEqual(
    windowsOutputDurabilityDetails({ outputDurability: "directorySynced", certificationStatus: "certifiable" }, "linux"),
    {},
  );
});

test("CLI stack lifecycle persists an explicit agent selection, plans it, applies it, and diagnoses it", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const manifestPath = path.join(item.root, "aas-stack.json");
  const selectionPath = path.join(item.root, "selection.json");
  fs.writeFileSync(selectionPath, `${core.canonicalJson({
    name: "cli-test",
    targets: [{ host: "codex", scope: "project" }],
    profile: {
      goals: ["build"],
      projectType: "agent application",
      languages: ["javascript"],
      frameworks: [],
      constraints: ["local-only"],
    },
    skillIds: ["ai-agents-architect"],
  })}\n`);
  const created = await execute(["stack", "create", "--selection", selectionPath, "--out", manifestPath]);
  assert.equal(created.status, "created");
  assert.equal(created.selectionSource, "agent");
  assert.deepEqual(created.selectedSkillIds, ["ai-agents-architect"]);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.skills, [{ id: "ai-agents-architect" }]);
  assert.deepEqual(manifest.profile.goals, ["build"]);
  assert.equal(Object.hasOwn(manifest, "policy"), false);
  const planPath = path.join(item.root, "plan.json");
  const planned = await execute([
    "stack", "plan", "--manifest", manifestPath, "--target", "codex:project",
    "--target-root", item.root, "--out", planPath,
  ], item.dependencies);
  assert.equal(planned.status, "planned");
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(plan.payload.operations[0].kind, "install");
  assert.deepEqual(plan.payload.overrides, []);
  assert.equal(fs.existsSync(path.join(item.root, ".agents")), false, "plan must not materialize the target layout");
  assert.equal(fs.existsSync(path.join(item.root, ".aas")), false, "plan must not create AAS state");
  const beforeDoctor = fs.readdirSync(item.root).sort();
  const pristineDoctor = await execute(["stack", "doctor", "--plan", planPath, "--target-root", item.root], item.dependencies);
  assert.equal(pristineDoctor.status, "healthy");
  assert.deepEqual(fs.readdirSync(item.root).sort(), beforeDoctor, "doctor must remain read-only on a fresh target");
  await assert.rejects(execute([
    "stack", "apply", "--plan", planPath, "--target-root", item.root,
    "--approve", plan.digest,
  ], item.dependencies), { code: "AAS_STACK_APPLY_EXPERIMENTAL_DISABLED" });
  await assert.rejects(execute([
    "stack", "recover", "--plan", planPath, "--target-root", item.root,
    "--id", "preview-recovery", "--action", "cleanup",
  ], item.dependencies), { code: "AAS_STACK_RECOVERY_EXPERIMENTAL_DISABLED" });
  assert.equal(fs.existsSync(path.join(item.root, ".agents")), false, "preview apply must be disabled without explicit opt-in");
  assert.equal(fs.existsSync(path.join(item.root, ".aas")), false, "preview apply guard must not create AAS state");
  await assert.rejects(execute([
    "stack", "apply", "--experimental-apply", "--plan", planPath, "--target-root", item.root,
    "--approve", `sha256-${"0".repeat(64)}`,
  ], item.dependencies), { code: "AAS_TRANSACTION_APPROVAL_MISMATCH" });
  assert.equal(fs.existsSync(path.join(item.root, ".agents")), false, "a rejected approval must not create target directories");
  const applied = await execute([
    "stack", "apply", "--experimental-apply", "--plan", planPath, "--target-root", item.root,
    "--approve", plan.digest,
  ], item.dependencies);
  assert.equal(applied.status, "applied");
  assert.equal(applied.releaseProfile, "preview");
  assert.equal(applied.certificationStatus, "experimental");
  assert.equal(fs.existsSync(path.join(item.root, ".agents", "skills", "ai-agents-architect", "SKILL.md")), true);
  const doctor = await execute(["stack", "doctor", "--plan", planPath, "--target-root", item.root], item.dependencies);
  assert.equal(doctor.status, "healthy");
  const again = await execute([
    "stack", "apply", "--experimental-apply", "--plan", planPath, "--target-root", item.root,
    "--approve", plan.digest,
  ], item.dependencies);
  assert.equal(again.status, "alreadyApplied");
});

test("CLI exits stably on missing approval and never prints a stack trace", async () => {
  let stdout = "";
  let stderr = "";
  const code = await main(["stack", "apply"], {
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(code, 2);
  assert.equal(stdout, "");
  const error = JSON.parse(stderr);
  assert.equal(error.code, "AAS_CLI_OPTION_REQUIRED");
  assert.equal(error.schemaVersion, 1);
  assert.equal(error.status, "error");
  assert.equal(error.protocolVersion, core.protocolVersion);
  assert.doesNotMatch(stderr, /\bat\s+\S+\.js:/);
});

test("CLI reports an invalid stack manifest as invalid input", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const manifestPath = path.join(item.root, "invalid-stack.json");
  fs.writeFileSync(manifestPath, "{}\n");
  let stdout = "";
  let stderr = "";
  const code = await main(["stack", "validate", "--manifest", manifestPath], {
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(code, 2);
  assert.equal(stdout, "");
  const error = JSON.parse(stderr);
  assert.equal(error.status, "error");
  assert.equal(error.code, "AAS_STACK_MANIFEST_INVALID");
  assert.equal(error.category, "invalidInput");
  assert.ok(error.details.issues.length > 0);
});

test("CLI success is emitted through the versioned result envelope", async () => {
  let stdout = "";
  const code = await main(["help"], {
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write() { throw new Error("unexpected stderr"); } },
  });
  assert.equal(code, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.protocolVersion, core.protocolVersion);
  assert.equal(result.status, "help");
  assert.deepEqual(result.reasonCodes, []);
  assert.deepEqual(result.unknown, []);
});

test("CLI rejects unknown flags and extra positional arguments fail-closed", async () => {
  await assert.rejects(
    execute(["stack", "validate", "extra", "--manifest", "/tmp/unused", "--source-root", "/tmp", "--runtime-identity", "/tmp/fake"]),
    { code: "AAS_CLI_COMMAND_UNKNOWN" },
  );
  await assert.rejects(
    execute(["stack", "validate", "--manifest", "/tmp/unused", "--source-root", "/tmp"]),
    { code: "AAS_CLI_OPTION_UNKNOWN" },
  );
});

test("CLI stack create reads the agent's explicit selection and persists it atomically", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const selection = {
    name: "qa-stack",
    targets: [{ host: "codex", scope: "project" }],
    profile: {
      goals: ["unit-testing"],
      languages: ["javascript"],
      frameworks: [],
      constraints: [],
    },
    skillIds: ["playwright-skill"],
  };
  const selectionPath = path.join(item.root, "selection.json");
  const manifestPath = path.join(item.root, "selected-stack.json");
  fs.writeFileSync(selectionPath, `${core.canonicalJson(selection)}\n`);
  const result = await execute(["stack", "create", "--selection", selectionPath, "--out", manifestPath]);
  assert.equal(result.status, "created");
  assert.deepEqual(result.selectedSkillIds, selection.skillIds);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(manifest.skills, [{ id: "playwright-skill" }]);
  await assert.rejects(
    execute(["stack", "create", "--selection", selectionPath, "--out", manifestPath]),
    { code: "AAS_CLI_OUTPUT_EXISTS" },
  );
});

test("CLI publishes stack and selection evidence together as a durable artifact directory", (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const artifactDirectory = path.join(item.root, "audit-artifact");
  const manifest = {
    schemaVersion: 2,
    profile: { goals: ["first", "second"] },
    skills: [{ id: "playwright-skill" }, { id: "ai-agents-architect" }],
  };
  const evidence = { schemaVersion: 1, manifestDigest: `sha256-${"1".repeat(64)}` };

  const written = writeNewStackArtifactDirectory(artifactDirectory, { manifest, evidence });

  assert.deepEqual(written, { outputDurability: "directorySynced", certificationStatus: "certifiable" });
  assert.equal(fs.statSync(artifactDirectory).mode & 0o777, 0o700);
  const manifestPath = path.join(artifactDirectory, "aas-stack.json");
  const evidencePath = path.join(artifactDirectory, "aas-selection-evidence.json");
  assert.equal(fs.statSync(manifestPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(evidencePath).mode & 0o777, 0o600);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), `${core.canonicalJson(manifest)}\n`);
  assert.equal(fs.readFileSync(evidencePath, "utf8"), `${core.canonicalJson(evidence)}\n`);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).skills, manifest.skills);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).profile.goals, manifest.profile.goals);
});

test("CLI artifact directory publication refuses overwrite without changing existing state", (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const artifactDirectory = path.join(item.root, "audit-artifact");
  fs.mkdirSync(artifactDirectory);
  fs.writeFileSync(path.join(artifactDirectory, "keep.txt"), "unchanged\n");

  assert.throws(
    () => writeNewStackArtifactDirectory(artifactDirectory, {
      manifest: { schemaVersion: 2 },
      evidence: { schemaVersion: 1 },
    }),
    { code: "AAS_CLI_OUTPUT_EXISTS" },
  );
  assert.deepEqual(fs.readdirSync(artifactDirectory), ["keep.txt"]);
  assert.equal(fs.readFileSync(path.join(artifactDirectory, "keep.txt"), "utf8"), "unchanged\n");
});

test("CLI artifact directory rechecks the destination immediately before publication", (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const artifactDirectory = path.join(item.root, "audit-artifact");
  let destinationChecks = 0;
  const racingFilesystem = new Proxy(fs, {
    get(target, property) {
      if (property === "lstatSync") {
        return (candidate) => {
          if (candidate === artifactDirectory) {
            destinationChecks += 1;
            if (destinationChecks === 2) target.mkdirSync(artifactDirectory);
          }
          return target.lstatSync(candidate);
        };
      }
      return Reflect.get(target, property);
    },
  });

  assert.throws(
    () => writeNewStackArtifactDirectory(artifactDirectory, {
      manifest: { schemaVersion: 2 },
      evidence: { schemaVersion: 1 },
    }, { filesystem: racingFilesystem }),
    { code: "AAS_CLI_OUTPUT_EXISTS" },
  );
  assert.equal(destinationChecks, 2);
  assert.deepEqual(fs.readdirSync(artifactDirectory), []);
  assert.deepEqual(fs.readdirSync(item.root), ["audit-artifact"]);
});

test("CLI artifact directory rolls back staging when the second durable file write fails", (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const artifactDirectory = path.join(item.root, "audit-artifact");
  let fileSyncs = 0;
  const faultingFilesystem = new Proxy(fs, {
    get(target, property) {
      if (property === "fsyncSync") {
        return (descriptor) => {
          fileSyncs += 1;
          if (fileSyncs === 2) throw Object.assign(new Error("fault after second file write"), { code: "EIO" });
          return target.fsyncSync(descriptor);
        };
      }
      return Reflect.get(target, property);
    },
  });

  assert.throws(
    () => writeNewStackArtifactDirectory(artifactDirectory, {
      manifest: { schemaVersion: 2 },
      evidence: { schemaVersion: 1 },
    }, { filesystem: faultingFilesystem }),
    /fault after second file write/,
  );
  assert.equal(fs.existsSync(artifactDirectory), false);
  assert.deepEqual(fs.readdirSync(item.root), []);
});

test("CLI artifact directory removes the complete pair when final directory sync fails", (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const artifactDirectory = path.join(item.root, "audit-artifact");
  let directorySyncs = 0;

  assert.throws(
    () => writeNewStackArtifactDirectory(artifactDirectory, {
      manifest: { schemaVersion: 2 },
      evidence: { schemaVersion: 1 },
    }, {
      syncDirectory(directory) {
        directorySyncs += 1;
        if (directorySyncs === 2) throw Object.assign(new Error(`fault syncing ${path.basename(directory)}`), { code: "EIO" });
      },
    }),
    /fault syncing/,
  );
  assert.equal(fs.existsSync(artifactDirectory), false);
  assert.deepEqual(fs.readdirSync(item.root), []);
});

test("CLI audit create preserves the agent selection and publishes the validated sidecar", async (context) => {
  const item = fixture();
  const originalValidator = core.validateSelectionEvidence;
  context.after(() => {
    if (originalValidator === undefined) delete core.validateSelectionEvidence;
    else core.validateSelectionEvidence = originalValidator;
    fs.rmSync(item.root, { recursive: true, force: true });
  });
  const selection = {
    name: "audited-stack",
    targets: [{ host: "claude", scope: "project" }, { host: "codex", scope: "project" }],
    profile: {
      goals: ["second", "first"],
      languages: ["typescript", "javascript"],
      frameworks: ["vite", "react"],
      constraints: ["local-only", "read-only"],
    },
    skillIds: ["playwright-skill", "ai-agents-architect"],
  };
  const evidence = { schemaVersion: 1, trace: { source: "mcp-session" } };
  const evidenceDigest = `sha256-${"2".repeat(64)}`;
  core.validateSelectionEvidence = (received, { manifest }) => {
    assert.deepEqual(received, evidence);
    assert.deepEqual(manifest.skills.map(({ id }) => id), selection.skillIds);
    return { ok: true, status: "valid", evidenceDigest };
  };
  const selectionPath = path.join(item.root, "selection.json");
  const evidencePath = path.join(item.root, "evidence.json");
  const artifactDirectory = path.join(item.root, "audit-artifact");
  fs.writeFileSync(selectionPath, `${core.canonicalJson(selection)}\n`);
  fs.writeFileSync(evidencePath, `${core.canonicalJson(evidence)}\n`);

  const result = await execute([
    "stack", "create", "--selection", selectionPath, "--evidence", evidencePath,
    "--artifact-dir", artifactDirectory, "--require-evidence",
  ]);

  assert.equal(result.evidenceDigest, evidenceDigest);
  assert.equal(result.artifactDirectory, artifactDirectory);
  assert.equal(result.path, path.join(artifactDirectory, "aas-stack.json"));
  assert.equal(result.evidencePath, path.join(artifactDirectory, "aas-selection-evidence.json"));
  assert.deepEqual(result.selectedSkillIds, selection.skillIds);
  const persistedManifest = JSON.parse(fs.readFileSync(result.path, "utf8"));
  assert.deepEqual(persistedManifest.targets, selection.targets);
  assert.deepEqual(persistedManifest.profile, selection.profile);
  assert.deepEqual(persistedManifest.skills.map(({ id }) => id), selection.skillIds);
  assert.deepEqual(JSON.parse(fs.readFileSync(result.evidencePath, "utf8")), evidence);
});

test("CLI audit create leaves no artifact when evidence validation fails", async (context) => {
  const item = fixture();
  const originalValidator = core.validateSelectionEvidence;
  context.after(() => {
    if (originalValidator === undefined) delete core.validateSelectionEvidence;
    else core.validateSelectionEvidence = originalValidator;
    fs.rmSync(item.root, { recursive: true, force: true });
  });
  core.validateSelectionEvidence = () => ({
    ok: false,
    status: "invalid",
    code: "AAS_SELECTION_EVIDENCE_MANIFEST_MISMATCH",
    category: "integrity",
    details: { field: "manifestDigest" },
  });
  const selectionPath = path.join(item.root, "selection.json");
  const evidencePath = path.join(item.root, "evidence.json");
  const artifactDirectory = path.join(item.root, "audit-artifact");
  fs.writeFileSync(selectionPath, `${core.canonicalJson({
    profile: { goals: ["audit"], languages: [], frameworks: [], constraints: [] },
    skillIds: ["playwright-skill"],
  })}\n`);
  fs.writeFileSync(evidencePath, "{}\n");

  await assert.rejects(execute([
    "stack", "create", "--selection", selectionPath, "--evidence", evidencePath,
    "--artifact-dir", artifactDirectory, "--require-evidence",
  ]), { code: "AAS_SELECTION_EVIDENCE_MANIFEST_MISMATCH" });
  assert.equal(fs.existsSync(artifactDirectory), false);
});

test("CLI require-evidence fails closed before writing when the sidecar is absent", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const selectionPath = path.join(item.root, "selection.json");
  const artifactDirectory = path.join(item.root, "audit-artifact");
  fs.writeFileSync(selectionPath, `${core.canonicalJson({
    profile: { goals: ["audit"], languages: [], frameworks: [], constraints: [] },
    skillIds: ["playwright-skill"],
  })}\n`);

  await assert.rejects(execute([
    "stack", "create", "--selection", selectionPath,
    "--artifact-dir", artifactDirectory, "--require-evidence",
  ]), { code: "AAS_CLI_EVIDENCE_REQUIRED" });
  assert.equal(fs.existsSync(artifactDirectory), false);
});

test("production CLI resolves and re-verifies a content-addressed runtime cache", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const cacheRoot = path.join(item.root, "cache");
  const targetRoot = path.join(item.root, "project");
  fs.mkdirSync(targetRoot, { mode: 0o700 });
  const integrity = item.runtime.integrity;
  const packageJson = {
    name: "agentic-awesome-skills",
    version: item.runtime.version,
    bin: { "aas-mcp": "tools/bin/aas-mcp.js" },
    bundledDependencies: ["ajv", "sanitize-filename", "yaml"],
  };
  const entries = [
    ["package/package.json", `${JSON.stringify(packageJson)}\n`],
    ["package/tools/bin/aas-mcp.js", "#!/usr/bin/env node\n"],
    ["package/tools/lib/aas-v1/index.js", "module.exports = {};\n"],
    ["package/data/aas-v1/catalog-manifest.v1.json", "{}\n"],
    ["package/data/catalog.json", '{"skills":[]}\n'],
    ["package/data/plugin-compatibility.json", '{"skills":[]}\n'],
    ["package/node_modules/ajv/package.json", '{"name":"ajv","version":"8.20.0"}\n'],
    ["package/node_modules/sanitize-filename/package.json", '{"name":"sanitize-filename","version":"1.6.4"}\n'],
    ["package/node_modules/yaml/package.json", '{"name":"yaml","version":"2.9.0"}\n'],
    ["package/skills_index.json", `${JSON.stringify([{ id: "ai-agents-architect", path: "skills/ai-agents-architect" }])}\n`],
    ["package/skills/ai-agents-architect/SKILL.md", "# AI Agents Architect\n"],
  ].map(([entryPath, bytes]) => ({ path: entryPath, bytes: Buffer.from(bytes) }));
  const promoted = await core.cache.promoteRuntime({
    cacheRoot,
    release: {
      package: "agentic-awesome-skills",
      version: item.runtime.version,
      integrity,
      provenance: { registryOrigin: "https://registry.npmjs.org", signaturesPresent: false, attestationsPresent: false },
    },
    parsed: { entries },
  });
  assert.equal(promoted.status, "promoted");

  const manifestPath = path.join(item.root, "production-stack.json");
  const initialized = spawnSync(process.execPath, [
    path.join(ROOT, "tools/bin/aas.js"), "stack", "init", "--goal", "build", "--out", manifestPath,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.skills = [{ id: "ai-agents-architect" }];
  fs.writeFileSync(manifestPath, `${core.canonicalJson(manifest)}\n`);

  const planPath = path.join(item.root, "production-plan.json");
  const planned = spawnSync(process.execPath, [
    path.join(ROOT, "tools/bin/aas.js"), "stack", "plan",
    "--manifest", manifestPath, "--target", "codex:project", "--target-root", targetRoot,
    "--cache-root", cacheRoot, "--runtime-integrity", integrity,
    "--out", planPath,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(planned.status, 0, planned.stderr);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(plan.payload.runtime.version, manifest.catalog.version);
  assert.equal(plan.payload.runtime.closureDigest, promoted.runtimeIdentity.closureDigest);
  assert.equal(fs.existsSync(path.join(targetRoot, ".aas")), false);

  const mismatchedPlanPath = path.join(item.root, "mismatched-plan.json");
  const mismatched = spawnSync(process.execPath, [
    path.join(ROOT, "tools/bin/aas.js"), "stack", "plan",
    "--manifest", manifestPath, "--target", "codex:project", "--target-root", targetRoot,
    "--cache-root", cacheRoot, "--runtime-version", "99.0.0", "--runtime-integrity", integrity,
    "--out", mismatchedPlanPath,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(mismatched.status, 3, mismatched.stderr);
  assert.equal(JSON.parse(mismatched.stderr).code, "AAS_PLAN_RUNTIME_CATALOG_MISMATCH");
  assert.equal(fs.existsSync(mismatchedPlanPath), false);

  fs.writeFileSync(path.join(promoted.targetPath, "package", "skills", "ai-agents-architect", "SKILL.md"), "tampered\n");
  const rejected = spawnSync(process.execPath, [
    path.join(ROOT, "tools/bin/aas.js"), "stack", "doctor", "--plan", planPath,
    "--target-root", targetRoot, "--cache-root", cacheRoot,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(rejected.status, 3, rejected.stderr);
  assert.equal(JSON.parse(rejected.stderr).code, "AAS_RUNTIME_NOT_VERIFIED");
  assert.equal(fs.existsSync(path.join(targetRoot, ".aas")), false);
});
