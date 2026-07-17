"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const core = require("../../lib/aas-v1");
const { execute, main } = require("../../lib/aas-v1/cli/main");

const ROOT = path.resolve(__dirname, "../../..");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-cli-"));
  const runtime = {
    package: "agentic-awesome-skills",
    version: "14.6.0",
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

test("CLI stack lifecycle creates a minimal manifest, immutable plan, applies it, and diagnoses it", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const manifestPath = path.join(item.root, "aas-stack.json");
  const initialized = await execute(["stack", "init", "--out", manifestPath, "--name", "cli-test", "--goal", "build"]);
  assert.equal(initialized.status, "initialized");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(manifest.skills, []);
  manifest.skills = [{ id: "ai-agents-architect" }];
  fs.writeFileSync(manifestPath, `${core.canonicalJson(manifest)}\n`);
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
    "--approve", `sha256-${"0".repeat(64)}`,
  ], item.dependencies), { code: "AAS_TRANSACTION_APPROVAL_MISMATCH" });
  assert.equal(fs.existsSync(path.join(item.root, ".agents")), false, "a rejected approval must not create target directories");
  const applied = await execute([
    "stack", "apply", "--plan", planPath, "--target-root", item.root,
    "--approve", plan.digest,
  ], item.dependencies);
  assert.equal(applied.status, "applied");
  assert.equal(fs.existsSync(path.join(item.root, ".agents", "skills", "ai-agents-architect", "SKILL.md")), true);
  const doctor = await execute(["stack", "doctor", "--plan", planPath, "--target-root", item.root], item.dependencies);
  assert.equal(doctor.status, "healthy");
  const again = await execute([
    "stack", "apply", "--plan", planPath, "--target-root", item.root,
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

test("CLI recommendation reads only the explicit profile file", async (context) => {
  const item = fixture();
  context.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const profile = {
    intent: "test-qa-automation",
    targets: [{ host: "codex", scope: "project" }],
    profile: { languages: ["javascript"] },
    criticalGoals: ["unit-testing"],
    nonCriticalGoals: [],
    policy: { allowedRisk: ["none", "safe"], requireKnownSource: true, allowManualSetup: false },
  };
  const profilePath = path.join(item.root, "profile.json");
  fs.writeFileSync(profilePath, `${core.canonicalJson(profile)}\n`);
  const result = await execute(["stack", "recommend", "--profile", profilePath]);
  assert.equal(result.ok, true);
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
    version: "14.6.0",
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
      version: "14.6.0",
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
    "--cache-root", cacheRoot, "--runtime-version", "14.6.0", "--runtime-integrity", integrity,
    "--out", planPath,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(planned.status, 0, planned.stderr);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(plan.payload.runtime.closureDigest, promoted.runtimeIdentity.closureDigest);
  assert.equal(fs.existsSync(path.join(targetRoot, ".aas")), false);

  fs.writeFileSync(path.join(promoted.targetPath, "package", "skills", "ai-agents-architect", "SKILL.md"), "tampered\n");
  const rejected = spawnSync(process.execPath, [
    path.join(ROOT, "tools/bin/aas.js"), "stack", "doctor", "--plan", planPath,
    "--target-root", targetRoot, "--cache-root", cacheRoot,
  ], { cwd: targetRoot, encoding: "utf8" });
  assert.equal(rejected.status, 3, rejected.stderr);
  assert.equal(JSON.parse(rejected.stderr).code, "AAS_RUNTIME_NOT_VERIFIED");
  assert.equal(fs.existsSync(path.join(targetRoot, ".aas")), false);
});
