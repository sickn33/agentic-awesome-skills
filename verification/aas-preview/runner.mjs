#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const NOT_EVALUATED = Object.freeze([
  "native-network-and-filesystem-attempt-observation",
  "transactional-crash-and-race-certification",
  "benchmark-80-90-100",
  "real-host-configuration-writes",
  "public-release",
]);
const require = createRequire(import.meta.url);

function fail(message) {
  throw new Error(`AAS_PREVIEW_${message}`);
}

function parseArgs(argv) {
  if (argv.length % 2 !== 0) fail("ARGUMENTS_INVALID");
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) fail("ARGUMENTS_INVALID");
    const name = key.slice(2);
    if (Object.hasOwn(values, name)) fail("ARGUMENT_DUPLICATE");
    values[name] = value;
  }
  for (const key of ["tarball", "package-root", "work-root", "job-id", "out"]) {
    if (!values[key]) fail("ARGUMENT_REQUIRED");
  }
  for (const key of ["tarball", "package-root", "work-root", "out"]) {
    if (!path.isAbsolute(values[key])) fail("ABSOLUTE_PATH_REQUIRED");
  }
  if (!/^(linux|macos|windows)-node-(22|24)$/.test(values["job-id"])) fail("JOB_ID_INVALID");
  return values;
}

function sha256(bytes) {
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function sha512Sri(bytes) {
  return `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function runNode(script, args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return result;
}

function parseCliSuccess(result, label) {
  if (result.status !== 0 || result.stderr.trim()) fail(`${label}_FAILED`);
  const value = JSON.parse(result.stdout);
  if (value.ok !== true || value.schemaVersion !== 1) fail(`${label}_ENVELOPE_INVALID`);
  return value;
}

function parseCliFailure(result, { exitCode, code, category }, label) {
  if (result.status !== exitCode || result.stdout.trim()) fail(`${label}_EXIT_INVALID`);
  const value = JSON.parse(result.stderr);
  if (value.ok !== false || value.code !== code || value.category !== category) fail(`${label}_ERROR_INVALID`);
  return value;
}

function parseCliError(result, code, label) {
  return parseCliFailure(result, { exitCode: 3, code, category: "policy" }, label);
}

function snapshotTree(root) {
  const records = [];
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) fail("SNAPSHOT_SYMLINK_FORBIDDEN");
      if (stat.isDirectory()) visit(absolute, relative);
      else if (stat.isFile()) records.push({ path: relative, size: stat.size, sha256: sha256(fs.readFileSync(absolute)) });
      else fail("SNAPSHOT_SPECIAL_FILE_FORBIDDEN");
    }
  }
  if (fs.existsSync(root)) visit(root);
  return sha256(stable(records));
}

async function provisionVerifiedPreviewRuntime(aas, { cacheRoot, release, parsed }) {
  const scanned = aas.cache.runtimeRecords(parsed.entries, release.version);
  const targetPath = aas.cache.runtimeCachePath({
    cacheRoot,
    packageVersion: release.version,
    integrity: release.integrity,
  });
  fs.mkdirSync(targetPath, { recursive: true, mode: 0o700 });
  for (const record of scanned.records) {
    const destination = path.join(targetPath, ...record.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.writeFileSync(destination, record.bytes, { flag: "wx", mode: 0o600 });
  }
  const identity = aas.cache.validateRuntimeIdentity({
    schemaVersion: 1,
    package: release.package,
    version: release.version,
    integrity: release.integrity,
    closureDigest: scanned.closureDigest,
    digestVersion: aas.cache.DIGEST_VERSION,
    assets: scanned.assets,
    provenance: release.provenance,
  });
  fs.writeFileSync(
    path.join(targetPath, aas.cache.RUNTIME_IDENTITY_FILE),
    `${aas.canonicalJson(identity)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  const verified = await aas.cache.runtimeStatus({
    cacheRoot,
    packageVersion: release.version,
    integrity: release.integrity,
    closureDigest: scanned.closureDigest,
  });
  assert.equal(verified.status, "verified");
  return verified;
}

class JsonLineClient {
  constructor(script, args, cwd) {
    this.child = spawn(process.execPath, [script, ...args], {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.pending = new Map();
    this.buffer = "";
    this.stderr = "";
    this.fatalError = null;
    this.exit = new Promise((resolve) => {
      this.child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => { this.stderr += chunk; });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      while (this.buffer.includes("\n")) {
        const newline = this.buffer.indexOf("\n");
        const line = this.buffer.slice(0, newline).replace(/\r$/, "");
        this.buffer = this.buffer.slice(newline + 1);
        if (!line) continue;
        try {
          const message = JSON.parse(line);
          const waiter = this.pending.get(message.id);
          if (!waiter) throw new Error("AAS_PREVIEW_MCP_UNEXPECTED_RESPONSE");
          this.pending.delete(message.id);
          waiter.resolve(message);
        } catch (error) {
          this.fatalError = error;
          for (const waiter of this.pending.values()) waiter.reject(error);
          this.pending.clear();
          this.child.kill();
        }
      }
    });
    this.child.on("error", (error) => {
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
    });
  }

  notify(method, params = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  request(id, method, params = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("AAS_PREVIEW_MCP_TIMEOUT"));
      }, 20_000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async close() {
    this.child.stdin.end();
    let timer;
    const exit = await Promise.race([
      this.exit,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          this.child.kill();
          reject(new Error("AAS_PREVIEW_MCP_EXIT_TIMEOUT"));
        }, 10_000);
      }),
    ]).finally(() => clearTimeout(timer));
    if (this.fatalError) throw this.fatalError;
    if (exit.code !== 0 || exit.signal || this.stderr.trim() || this.buffer.trim() || this.pending.size) fail("MCP_EXIT_INVALID");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tarball = path.resolve(args.tarball);
  const packageRoot = path.resolve(args["package-root"]);
  const workRoot = path.resolve(args["work-root"]);
  const out = path.resolve(args.out);
  const projectRoot = path.join(workRoot, "project");
  const cacheRoot = path.join(workRoot, "cache");
  fs.mkdirSync(projectRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(cacheRoot, { recursive: true, mode: 0o700 });

  const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  assert.equal(metadata.name, "agentic-awesome-skills");
  assert.deepEqual(Object.keys(metadata.bin).sort(), ["aas", "aas-mcp", "agentic-awesome-skills"]);
  const aasBin = path.join(packageRoot, metadata.bin.aas);
  const mcpBin = path.join(packageRoot, metadata.bin["aas-mcp"]);
  const legacyBin = path.join(packageRoot, metadata.bin["agentic-awesome-skills"]);
  for (const entrypoint of [aasBin, mcpBin, legacyBin]) assert.equal(fs.statSync(entrypoint).isFile(), true);

  parseCliSuccess(runNode(aasBin, ["help"], { cwd: projectRoot }), "HELP");
  const legacyBefore = snapshotTree(projectRoot);
  const legacyHelp = runNode(legacyBin, ["--help"], { cwd: projectRoot });
  if (legacyHelp.status !== 0) fail("LEGACY_HELP_FAILED");
  assert.equal(snapshotTree(projectRoot), legacyBefore, "legacy help changed project state");

  const tarballBytes = fs.readFileSync(tarball);
  const runtimeIntegrity = sha512Sri(tarballBytes);
  const aas = require(path.join(packageRoot, "tools/lib/aas-v1/index.js"));
  const parsedArchive = aas.cache.parsePackageArchive(tarballBytes);
  const release = {
    package: metadata.name,
    version: metadata.version,
    integrity: runtimeIntegrity,
    provenance: { registryOrigin: "https://registry.npmjs.org", signaturesPresent: false, attestationsPresent: false },
  };
  // Windows directory-flush capability belongs to the certified-v1 durability
  // gate. The preview runner materializes only its isolated test cache, then
  // requires the production core to verify every byte before lifecycle use.
  const promoted = process.platform === "win32"
    ? await provisionVerifiedPreviewRuntime(aas, { cacheRoot, release, parsed: parsedArchive })
    : await aas.cache.promoteRuntime({ cacheRoot, release, parsed: parsedArchive });

  const manifestPath = path.join(workRoot, "aas-stack.json");
  const previewOutputArgs = process.platform === "win32" ? ["--preview-windows-output"] : [];
  const initialized = parseCliSuccess(runNode(aasBin, [
    "stack", "init", "--out", manifestPath, "--name", "preview-smoke", "--goal", "agent-boundaries",
    ...previewOutputArgs,
  ], { cwd: projectRoot }), "INIT");
  assert.equal(initialized.status, "initialized");
  if (process.platform === "win32") {
    assert.equal(initialized.certificationStatus, "notCertified");
    assert.equal(initialized.outputDurability, "fileSyncedDirectoryUnverified");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.deepEqual(manifest.skills, []);

  const profilePath = path.join(workRoot, "profile.json");
  fs.writeFileSync(profilePath, `${stable({
    intent: "agent-mcp-development",
    targets: [{ host: "codex", scope: "project" }],
    profile: { languages: ["javascript"] },
    criticalGoals: ["agent-boundaries"],
    nonCriticalGoals: [],
    policy: { allowedRisk: ["none", "safe"], requireKnownSource: false, allowManualSetup: false },
  })}\n`, { mode: 0o600 });
  const recommendationOne = runNode(aasBin, ["stack", "recommend", "--profile", profilePath], { cwd: projectRoot });
  const recommendationTwo = runNode(aasBin, ["stack", "recommend", "--profile", profilePath], { cwd: projectRoot });
  const recommendation = parseCliSuccess(recommendationOne, "RECOMMEND");
  parseCliSuccess(recommendationTwo, "RECOMMEND_REPLAY");
  assert.equal(recommendationOne.stdout, recommendationTwo.stdout, "recommendation replay drifted");
  assert.ok(Array.isArray(recommendation.recommended));
  assert.ok(Array.isArray(recommendation.discoveryCandidates));
  assert.equal(recommendation.discoveryCandidates.length > 0, true);
  for (const field of ["unknown", "exclusions", "measures"]) {
    assert.equal(Object.hasOwn(recommendation, field), true, `recommendation is missing ${field}`);
  }
  for (const field of ["goalCoverage", "metadataCompleteness", "evidenceStrength"]) {
    assert.equal(Object.hasOwn(recommendation.measures, field), true, `recommendation measures are missing ${field}`);
  }
  assert.notEqual(recommendation.status, "insufficientCoverage");
  assert.equal(recommendation.proposedStack.includes("ai-agents-architect"), true);

  const restrictedProfilePath = path.join(workRoot, "restricted-profile.json");
  const restrictedProfile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  restrictedProfile.policy.allowedRisk = ["none"];
  fs.writeFileSync(restrictedProfilePath, `${stable(restrictedProfile)}\n`, { mode: 0o600 });
  const restricted = parseCliSuccess(runNode(aasBin, ["stack", "recommend", "--profile", restrictedProfilePath], { cwd: projectRoot }), "POLICY_RECOMMEND");
  const disallowedRiskIds = new Set(restricted.exclusions
    .filter((entry) => entry.reasonCodes.includes("AAS_ELIGIBILITY_RISK_DISALLOWED"))
    .map((entry) => entry.id));
  assert.equal(disallowedRiskIds.size > 0, true);
  assert.equal(restricted.recommended.some((entry) => disallowedRiskIds.has(entry.id)), false);
  assert.equal(restricted.proposedStack.some((id) => disallowedRiskIds.has(id)), false);

  const evidence = [{ type: "preview-functional-fixture", id: "proved-target-block" }];
  const blockedSkill = {
    id: "blocked-agent-skill",
    name: "blocked-agent-skill",
    description: "",
    category: "test",
    tags: [],
    triggers: [],
    searchTokens: ["agent", "boundaries"],
    recommendationTokens: ["agent", "boundaries"],
    metadata: {
      capabilities: aas.judgment(["agent-boundaries"], evidence),
      risk: aas.judgment("safe", evidence),
      source: aas.judgment("fixture", evidence),
      license: aas.judgment(null),
      targets: { codex: aas.judgment("blocked", evidence), claude: aas.judgment("supported", evidence) },
      setup: aas.judgment("none", evidence),
      dependencies: aas.judgment([], evidence),
      conflicts: aas.judgment([], evidence),
      validation: aas.judgment(true, evidence),
      tests: aas.judgment(null),
      reviews: aas.judgment(true, evidence),
    },
    untrustedContentPath: null,
  };
  const incompatibility = aas.recommendStack(aas.syntheticCatalog([blockedSkill]), JSON.parse(fs.readFileSync(profilePath, "utf8")));
  assert.deepEqual(incompatibility.proposedStack, []);
  assert.deepEqual(incompatibility.exclusions, [{ id: blockedSkill.id, reasonCodes: ["AAS_ELIGIBILITY_TARGET_BLOCKED"] }]);

  const malformedProfilePath = path.join(workRoot, "malformed-profile.json");
  fs.writeFileSync(malformedProfilePath, `${stable({ ...restrictedProfile, repositoryPath: "/not-allowed" })}\n`, { mode: 0o600 });
  parseCliFailure(
    runNode(aasBin, ["stack", "recommend", "--profile", malformedProfilePath], { cwd: projectRoot }),
    { exitCode: 2, code: "AAS_INPUT_SCHEMA_INVALID", category: "invalidInput" },
    "MALFORMED_INPUT_GUARD",
  );

  manifest.skills = [{ id: "ai-agents-architect" }];
  fs.writeFileSync(manifestPath, `${stable(manifest)}\n`, { mode: 0o600 });
  const validated = parseCliSuccess(runNode(aasBin, ["stack", "validate", "--manifest", manifestPath], { cwd: projectRoot }), "VALIDATE");
  assert.equal(validated.status, "valid");

  const planPath = path.join(workRoot, "plan.json");
  const planned = parseCliSuccess(runNode(aasBin, [
    "stack", "plan", "--manifest", manifestPath, "--target", "codex:project",
    "--target-root", projectRoot, "--cache-root", cacheRoot,
    "--runtime-version", metadata.version, "--runtime-integrity", runtimeIntegrity,
    "--out", planPath,
    ...previewOutputArgs,
  ], { cwd: projectRoot }), "PLAN");
  assert.equal(planned.status, "planned");
  if (process.platform === "win32") {
    assert.equal(planned.certificationStatus, "notCertified");
    assert.equal(planned.outputDurability, "fileSyncedDirectoryUnverified");
  }
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const beforeDoctor = { project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) };
  const doctor = parseCliSuccess(runNode(aasBin, [
    "stack", "doctor", "--plan", planPath, "--target-root", projectRoot, "--cache-root", cacheRoot,
  ], { cwd: projectRoot }), "DOCTOR");
  assert.equal(doctor.status, "healthy");
  assert.deepEqual({ project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) }, beforeDoctor, "doctor changed persistent state");

  const beforeWriteGuards = { project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) };
  const applyError = parseCliError(runNode(aasBin, [
    "stack", "apply", "--plan", planPath, "--target-root", projectRoot, "--cache-root", cacheRoot,
    "--approve", plan.digest,
  ], { cwd: projectRoot }), "AAS_STACK_APPLY_EXPERIMENTAL_DISABLED", "APPLY_GUARD");
  assert.equal(applyError.details.certificationStatus, "notCertified");
  parseCliError(runNode(aasBin, [
    "stack", "recover", "--plan", planPath, "--target-root", projectRoot, "--cache-root", cacheRoot,
    "--id", "preview", "--action", "cleanup",
  ], { cwd: projectRoot }), "AAS_STACK_RECOVERY_EXPERIMENTAL_DISABLED", "RECOVERY_GUARD");
  assert.deepEqual({ project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) }, beforeWriteGuards, "default write guards changed persistent state");
  assert.equal(fs.existsSync(path.join(projectRoot, ".agents")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".aas")), false);

  const beforeMcp = { project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) };
  const client = new JsonLineClient(mcpBin, ["--cache-root", cacheRoot], projectRoot);
  const initialize = await client.request(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "aas-preview", version: "1" },
  });
  assert.equal(initialize.result.protocolVersion, "2025-06-18");
  client.notify("notifications/initialized");
  const tools = await client.request(2, "tools/list");
  const toolNames = tools.result.tools.map((tool) => tool.name);
  assert.deepEqual(toolNames, ["search_skills", "get_skill", "recommend_stack", "inspect_stack", "diff_stack"]);
  const templates = await client.request(3, "resources/templates/list");
  assert.deepEqual(templates.result.resourceTemplates.map((item) => item.uriTemplate), ["aas://skills/{id}"]);
  const search = await client.request(4, "tools/call", { name: "search_skills", arguments: { query: "android ui", limit: 3 } });
  assert.equal(search.result.structuredContent.ok, true);
  const skillId = search.result.structuredContent.results[0].id;
  const get = await client.request(5, "tools/call", { name: "get_skill", arguments: { id: skillId } });
  assert.equal(get.result.structuredContent.skill.id, skillId);
  assert.equal(get.result.structuredContent.untrustedContent.authority, "untrusted");
  const resource = await client.request(6, "resources/read", { uri: `aas://skills/${skillId}` });
  assert.equal(resource.result.contents[0].uri, `aas://skills/${skillId}`);
  assert.equal(resource.result.contents[0].mimeType, "application/json");
  const resourcePayload = JSON.parse(resource.result.contents[0].text);
  assert.equal(resourcePayload.skill.id, skillId);
  assert.equal(resourcePayload.untrustedContent.authority, "untrusted");
  assert.equal(resourcePayload.untrustedContent.available, true);
  const mcpRecommendation = await client.request(7, "tools/call", {
    name: "recommend_stack",
    arguments: {
      intent: "test-qa-automation",
      targets: [{ host: "codex", scope: "project" }],
      profile: { languages: ["javascript"] },
      criticalGoals: ["unit-testing"],
      nonCriticalGoals: [],
      policy: { allowedRisk: ["none", "safe"], requireKnownSource: false, allowManualSetup: false },
      maxSkills: 5,
    },
  });
  assert.equal(mcpRecommendation.result.structuredContent.ok, true);
  const inspection = await client.request(8, "tools/call", { name: "inspect_stack", arguments: { manifest } });
  assert.equal(inspection.result.structuredContent.ok, true);
  const diff = await client.request(9, "tools/call", {
    name: "diff_stack",
    arguments: { stack: manifest, toCatalogDigest: manifest.catalog.integrity },
  });
  assert.equal(diff.result.structuredContent.ok, true);
  await client.close();
  const afterMcp = { project: snapshotTree(projectRoot), cache: snapshotTree(cacheRoot) };
  assert.deepEqual(afterMcp, beforeMcp, "MCP changed persistent project or cache state");

  const receipt = {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    previewQualified: true,
    certifiedV1: false,
    jobId: args["job-id"],
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    package: { name: metadata.name, version: metadata.version, tarballIntegrity: runtimeIntegrity, tarballSha256: sha256(tarballBytes) },
    recommendationDigest: sha256(recommendationOne.stdout),
    mcpContractDigest: sha256(stable({ toolNames, templates: ["aas://skills/{id}"] })),
    lifecycle: { initialized: true, recommended: true, validated: true, planned: true, doctorReadOnly: true },
    writeGuards: { applyDisabledByDefault: true, recoveryDisabledByDefault: true, targetStateCreated: false },
    mcp: { localStdio: true, readOnlySnapshot: true, nativeAttemptObservation: "notEvaluated" },
    runtimeCache: { integrity: promoted.runtimeIdentity.integrity, closureDigest: promoted.runtimeIdentity.closureDigest },
    notEvaluated: NOT_EVALUATED,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
  fs.writeFileSync(out, `${stable(receipt)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${stable(receipt)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.message || "AAS_PREVIEW_FAILED"}\n`);
  process.exitCode = 1;
});
