"use strict";

const fs = require("node:fs");
const path = require("node:path");
const packageMetadata = require("../../../../package.json");
const core = require("..");
const {
  applyHostConfigPatch,
  buildPatch,
  cleanupBackups,
  previewBackupCleanup,
} = require("../adapters");
const { scanJson } = require("../mcp/strict-json");
const { createSkillTargetAdapter, ADAPTER_VERSION } = require("../target-adapter");
const { inspectLayout, resolveDestination } = require("../transaction/safety");
const { validateInstance } = require("../schema-validator");

const EXIT = Object.freeze({ success: 0, invalid: 2, blocked: 3, recovery: 4, execution: 5 });
const PACKAGE_ROOT = path.resolve(__dirname, "../../../..");

function cliError(code, category, details = {}) {
  const error = new Error(code);
  error.code = code;
  error.category = category;
  error.details = details;
  return error;
}

function parseOptions(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    if (["help", "override-managed-drift"].includes(key)) {
      if (Object.hasOwn(options, key)) throw cliError("AAS_CLI_OPTION_DUPLICATE", "invalidInput", { option: key });
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw cliError("AAS_CLI_OPTION_VALUE_REQUIRED", "invalidInput", { option: key });
    if (Object.hasOwn(options, key)) throw cliError("AAS_CLI_OPTION_DUPLICATE", "invalidInput", { option: key });
    options[key] = value;
    index += 1;
  }
  return { positional, options };
}

const COMMAND_OPTIONS = Object.freeze({
  "catalog status": new Set(["cache-root", "version", "digest", "integrity", "help"]),
  "catalog update": new Set(["cache-root", "version", "help"]),
  "mcp configure": new Set(["host", "scope", "config", "cache-root", "version", "runtime-integrity", "runtime-closure-digest", "backup-dir", "retention", "approve", "help"]),
  "mcp backups cleanup": new Set(["config", "backup-dir", "keep", "approve", "help"]),
  "stack init": new Set(["goal", "catalog-digest", "cache-root", "host", "scope", "name", "out", "help"]),
  "stack recommend": new Set(["profile", "catalog-digest", "cache-root", "help"]),
  "stack validate": new Set(["manifest", "help"]),
  "stack plan": new Set(["manifest", "target", "target-root", "cache-root", "runtime-version", "runtime-integrity", "out", "override-managed-drift", "help"]),
  "stack apply": new Set(["plan", "target-root", "cache-root", "approve", "help"]),
  "stack doctor": new Set(["plan", "target-root", "cache-root", "help"]),
  "stack recover": new Set(["plan", "target-root", "cache-root", "id", "action", "approve", "help"]),
});

function invocationKey(positional) {
  if (positional[0] === "mcp" && positional[1] === "backups") return positional.slice(0, 3).join(" ");
  return positional.slice(0, 2).join(" ");
}

function validateInvocation(positional, options) {
  const key = invocationKey(positional);
  const allowed = COMMAND_OPTIONS[key];
  const expectedLength = key === "mcp backups cleanup" ? 3 : 2;
  if (!allowed || positional.length !== expectedLength) {
    throw cliError("AAS_CLI_COMMAND_UNKNOWN", "invalidInput", { command: positional.join(" ") });
  }
  const unknown = Object.keys(options).filter((option) => !allowed.has(option)).sort();
  if (unknown.length) throw cliError("AAS_CLI_OPTION_UNKNOWN", "invalidInput", { options: unknown });
  return key;
}

function requireOption(options, key) {
  if (!options[key]) throw cliError("AAS_CLI_OPTION_REQUIRED", "invalidInput", { option: key });
  return options[key];
}

function requireAbsoluteOption(options, key) {
  const value = requireOption(options, key);
  if (!path.isAbsolute(value) || value.includes("\0")) throw cliError("AAS_CLI_ABSOLUTE_PATH_REQUIRED", "invalidInput", { option: key });
  return path.normalize(value);
}

function boundedInteger(value, field, minimum, maximum, fallback) {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) throw cliError("AAS_CLI_INTEGER_INVALID", "invalidInput", { option: field });
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw cliError("AAS_CLI_INTEGER_INVALID", "invalidInput", { option: field });
  return parsed;
}

function readJsonFile(filePath, maximumBytes = 4 * 1024 * 1024) {
  const absolute = path.resolve(filePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > maximumBytes) {
    throw cliError("AAS_CLI_JSON_FILE_UNSAFE", "invalidInput", {});
  }
  const text = fs.readFileSync(absolute, "utf8");
  scanJson(text, 64);
  return JSON.parse(text);
}

function writeNewJson(filePath, value) {
  const absolute = path.resolve(filePath);
  const parent = path.dirname(absolute);
  const stat = fs.lstatSync(parent);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw cliError("AAS_CLI_OUTPUT_PARENT_UNSAFE", "filesystem", {});
  const temporary = path.join(parent, `.aas-write-${process.pid}-${Date.now()}`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
    fs.writeFileSync(descriptor, `${core.canonicalJson(value)}\n`);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.linkSync(temporary, absolute);
    fs.unlinkSync(temporary);
    const parentDescriptor = fs.openSync(parent, fs.constants.O_RDONLY);
    try { fs.fsyncSync(parentDescriptor); } finally { fs.closeSync(parentDescriptor); }
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporary); } catch {}
    if (error.code === "EEXIST") throw cliError("AAS_CLI_OUTPUT_EXISTS", "conflict", {});
    throw error;
  }
}

function targetKey(target) {
  return `${target.host}:${target.scope}`;
}

function selectTarget(manifest, value) {
  const target = manifest.targets.find((candidate) => targetKey(candidate) === value);
  if (!target) throw cliError("AAS_CLI_TARGET_NOT_IN_MANIFEST", "invalidInput", { target: value });
  return target;
}

function adapterFor(options, target, sourceRoot) {
  return createSkillTargetAdapter({
    targetRoot: path.resolve(requireOption(options, "target-root")),
    sourceRoot,
    host: target.host,
    scope: target.scope,
  });
}

async function catalogFor(options, expectedDigest) {
  const requestedDigest = expectedDigest || options["catalog-digest"];
  if (!requestedDigest) return core.loadBundledCatalog({ root: PACKAGE_ROOT });
  const cacheRoot = options["cache-root"] === undefined ? undefined : requireAbsoluteOption(options, "cache-root");
  const resolver = core.cache.createVerifiedCatalogResolver({ cacheRoot, bundledRoot: PACKAGE_ROOT });
  const catalog = await resolver(requestedDigest);
  if (!catalog) throw cliError("AAS_CACHE_CATALOG_NOT_VERIFIED", "integrity", { digest: requestedDigest });
  return catalog;
}

async function verifiedRuntimeFor(options, expected, dependencies = {}) {
  if (typeof dependencies.resolveVerifiedRuntime === "function") return dependencies.resolveVerifiedRuntime({ options, expected });
  const cacheRoot = requireAbsoluteOption(options, "cache-root");
  const version = expected?.version || requireOption(options, "runtime-version");
  const integrity = expected?.integrity || requireOption(options, "runtime-integrity");
  const status = await core.cache.runtimeStatus({
    cacheRoot,
    packageVersion: version,
    integrity,
    ...(expected?.closureDigest ? { closureDigest: expected.closureDigest } : {}),
  });
  if (status.status !== "verified") throw cliError("AAS_RUNTIME_NOT_VERIFIED", "integrity", { status: status.status });
  return { identity: status.runtimeIdentity, sourceRoot: path.join(status.targetPath, "package") };
}

function buildOperations({ manifest, target, adapter, allowManagedDrift }) {
  const layout = inspectLayout(adapter, target);
  const state = core.transaction.readManagedState(layout.stateFile);
  const installedState = state
    ? { digest: state.stateDigest, entries: core.transaction.publicEntries(state.entries) }
    : { digest: core.transaction.digestManagedEntries([]), entries: [] };
  const managed = new Map((state ? state.entries : []).map((entry) => [entry.skillId, entry]));
  const desired = new Set(manifest.skills.map((skill) => skill.id));
  const operations = [];
  const overrides = [];
  const next = new Map(managed);
  for (const skill of manifest.skills) {
    const source = adapter.resolveSourceTree({ skillId: skill.id });
    const sourceTreeDigest = core.transaction.treeDigest(source);
    const destination = resolveDestination(layout, skill.id);
    const current = managed.get(skill.id);
    if (!current) {
      if (fs.existsSync(destination)) throw cliError("AAS_TRANSACTION_UNMANAGED_COLLISION", "conflict", { skillId: skill.id });
      operations.push({ kind: "install", skillId: skill.id, sourceTreeDigest, expectedTreeDigest: null, resultTreeDigest: sourceTreeDigest, backupRequired: false });
      next.set(skill.id, { skillId: skill.id, treeDigest: sourceTreeDigest, catalogIntegrity: manifest.catalog.integrity });
      continue;
    }
    if (!fs.existsSync(destination)) throw cliError("AAS_TRANSACTION_MANAGED_ENTRY_MISSING", "drift", { skillId: skill.id });
    const actual = core.transaction.treeDigest(destination);
    if (actual !== current.treeDigest) {
      if (!allowManagedDrift) throw cliError("AAS_TRANSACTION_MANAGED_DRIFT", "drift", { skillId: skill.id });
      overrides.push({ kind: "managedDrift", skillId: skill.id, reasonCodes: ["AAS_PLAN_MANAGED_DRIFT_APPROVED"], unknownFields: [] });
    }
    if (actual !== sourceTreeDigest) {
      operations.push({ kind: "replaceManaged", skillId: skill.id, sourceTreeDigest, expectedTreeDigest: actual, resultTreeDigest: sourceTreeDigest, backupRequired: true });
      next.set(skill.id, { skillId: skill.id, treeDigest: sourceTreeDigest, catalogIntegrity: manifest.catalog.integrity });
    }
  }
  for (const [skillId, current] of managed) {
    if (desired.has(skillId)) continue;
    const destination = resolveDestination(layout, skillId);
    if (!fs.existsSync(destination)) throw cliError("AAS_TRANSACTION_MANAGED_ENTRY_MISSING", "drift", { skillId });
    const actual = core.transaction.treeDigest(destination);
    if (actual !== current.treeDigest) {
      if (!allowManagedDrift) throw cliError("AAS_TRANSACTION_MANAGED_DRIFT", "drift", { skillId });
      overrides.push({ kind: "managedDrift", skillId, reasonCodes: ["AAS_PLAN_MANAGED_DRIFT_APPROVED"], unknownFields: [] });
    }
    operations.push({ kind: "removeManaged", skillId, sourceTreeDigest: null, expectedTreeDigest: actual, resultTreeDigest: null, backupRequired: true });
    next.delete(skillId);
  }
  return { layout, state, installedState, operations, overrides, nextEntries: [...next.values()] };
}

async function stackInit(options) {
  const catalog = await catalogFor(options);
  const host = options.host || "codex";
  const scope = options.scope || "project";
  const manifest = {
    schemaVersion: 1,
    name: options.name || "aas-stack",
    catalog: { package: catalog.package, version: catalog.version, integrity: catalog.digest },
    targets: [{ host, scope }],
    intent: { goals: [requireOption(options, "goal")] },
    policy: { allowedRisk: ["none", "safe"], requireKnownSource: true, allowManualSetup: false },
    skills: [],
  };
  const validation = core.stack.validateManifest(manifest);
  if (!validation.ok) throw cliError(validation.code, validation.category, validation.details);
  const output = options.out || "aas-stack.json";
  writeNewJson(output, manifest);
  return { ok: true, status: "initialized", path: path.resolve(output), manifestDigest: validation.manifestDigest };
}

async function stackPlan(options, dependencies = {}) {
  const manifest = readJsonFile(requireOption(options, "manifest"));
  const validation = core.stack.validateManifest(manifest);
  if (!validation.ok) throw cliError(validation.code, validation.category, validation.details);
  const catalog = await catalogFor(options, manifest.catalog.integrity);
  if (manifest.catalog.package !== catalog.package || manifest.catalog.version !== catalog.version || manifest.catalog.integrity !== catalog.digest) {
    throw cliError("AAS_PLAN_CATALOG_MISMATCH", "integrity", {});
  }
  const targetBase = selectTarget(manifest, requireOption(options, "target"));
  const runtime = await verifiedRuntimeFor(options, null, dependencies);
  if (runtime.identity.package !== manifest.catalog.package || runtime.identity.version !== manifest.catalog.version) {
    throw cliError("AAS_PLAN_RUNTIME_CATALOG_MISMATCH", "integrity", {});
  }
  const adapter = adapterFor(options, targetBase, runtime.sourceRoot);
  const layout = inspectLayout(adapter, targetBase);
  const target = { ...targetBase, adapterVersion: ADAPTER_VERSION, identityDigest: adapter.computeTargetIdentity(layout, targetBase) };
  const observed = buildOperations({ manifest, target, adapter, allowManagedDrift: options["override-managed-drift"] === true });
  for (const desired of manifest.skills) {
    const candidate = core.getSkill(catalog, desired.id);
    const assessment = core.eligibility(candidate, { policy: manifest.policy, targets: [targetBase] });
    if (assessment.hardBlocked) {
      throw cliError("AAS_PLAN_SKILL_POLICY_BLOCKED", "policy", { skillId: desired.id, reasonCodes: assessment.eligibilityReasonCodes });
    }
    if (!assessment.eligibleForRecommendation) {
      observed.overrides.push({
        kind: "discoveryCandidate",
        skillId: desired.id,
        reasonCodes: ["AAS_PLAN_DISCOVERY_CANDIDATE_VISIBLE_OVERRIDE"],
        unknownFields: assessment.unknownFields,
      });
    }
  }
  const plan = core.stack.buildPlanEnvelope({
    manifest,
    handshake: {
      protocolVersion: core.protocolVersion,
      coreVersion: core.coreVersion,
      metadataSchemaVersion: core.metadataSchemaVersion,
      scorerVersion: core.scorerVersion,
    },
    catalog: manifest.catalog,
    runtime: runtime.identity,
    target,
    installedState: observed.installedState,
    operations: observed.operations,
    overrides: observed.overrides,
    stateCommit: {
      previousDigest: observed.installedState.digest,
      nextDigest: core.transaction.digestManagedEntries(observed.nextEntries),
      position: "final",
    },
  });
  writeNewJson(requireOption(options, "out"), plan);
  return { ok: true, status: "planned", planDigest: plan.digest, operationCount: plan.payload.operations.length, out: path.resolve(options.out) };
}

function help() {
  return {
    ok: true,
    status: "help",
    commands: [
      "catalog status [--cache-root <absolute> --version <semver> --digest <sha256> --integrity <npm-sri>]",
      "catalog update --cache-root <absolute> --version <semver>",
      "mcp configure --host codex|claude --scope user|project --config <absolute> --cache-root <absolute> [--version <semver>] [--runtime-integrity <npm-sri> --runtime-closure-digest <sha256>] [--backup-dir <absolute>] [--approve <digest>]",
      "mcp backups cleanup --config <absolute> --backup-dir <absolute> --keep <count> [--approve <digest>]",
      "stack init --goal <goal> [--catalog-digest <sha256> --cache-root <absolute>]",
      "stack recommend --profile <json> [--catalog-digest <sha256> --cache-root <absolute>]",
      "stack validate --manifest <aas-stack.json>",
      "stack plan --manifest <file> --target <host:scope> --target-root <dir> --cache-root <absolute> --runtime-version <semver> --runtime-integrity <npm-sri> --out <file>",
      "stack apply --plan <file> --target-root <dir> --cache-root <absolute> --approve <plan-digest>",
      "stack doctor --plan <file> --target-root <dir> --cache-root <absolute>",
      "stack recover --plan <file> --target-root <dir> --cache-root <absolute> --id <id> --action rollback|cleanup [--approve <digest>]",
    ],
  };
}

function mcpServer({ host, cacheRoot, version, integrity }) {
  const command = process.execPath;
  const args = [core.cache.runtimeMcpPath({ cacheRoot, packageVersion: version, integrity }), "--cache-root", cacheRoot];
  return host === "codex" ? { command, args, enabled: true } : { command, args, env: {} };
}

function configApprovalDigest({ host, scope, configPath, cacheRoot, release, patch }) {
  const runtime = { package: release.package, version: release.version, integrity: release.integrity };
  if (release.closureDigest) runtime.closureDigest = release.closureDigest;
  return core.sha256(core.canonicalJson({
    schemaVersion: 1,
    action: "mcp.configure",
    host,
    scope,
    configPathDigest: core.sha256(configPath),
    cacheRootDigest: core.sha256(cacheRoot),
    runtime,
    config: { exists: patch.exists, currentDigest: patch.currentDigest, nextDigest: patch.nextDigest },
  }));
}

function explicitCachedRuntime(options) {
  const integrity = options["runtime-integrity"];
  const closureDigest = options["runtime-closure-digest"];
  if ((integrity === undefined) !== (closureDigest === undefined)) {
    throw cliError("AAS_CLI_RUNTIME_IDENTITY_INCOMPLETE", "invalidInput", {
      requiredOptions: ["runtime-integrity", "runtime-closure-digest"],
    });
  }
  if (integrity === undefined) return null;
  try { core.cache.parseNpmIntegrity(integrity); } catch {
    throw cliError("AAS_CLI_RUNTIME_INTEGRITY_INVALID", "invalidInput", { option: "runtime-integrity" });
  }
  if (!/^sha256-[0-9a-f]{64}$/.test(closureDigest)) {
    throw cliError("AAS_CLI_RUNTIME_CLOSURE_DIGEST_INVALID", "invalidInput", { option: "runtime-closure-digest" });
  }
  return { integrity, closureDigest };
}

async function verifiedCachedRuntime({ cacheRoot, version, integrity, closureDigest }) {
  const status = await core.cache.runtimeStatus({
    cacheRoot,
    packageVersion: version,
    integrity,
    closureDigest,
  });
  if (status.status !== "verified") {
    throw cliError("AAS_RUNTIME_NOT_VERIFIED", "integrity", { status: status.status });
  }
  return status;
}

async function mcpConfigure(options, dependencies = {}) {
  const host = requireOption(options, "host");
  const scope = requireOption(options, "scope");
  if (!new Set(["codex", "claude"]).has(host)) throw cliError("AAS_ADAPTER_HOST_UNSUPPORTED", "invalidInput", { host });
  if (!new Set(["user", "project"]).has(scope)) throw cliError("AAS_ADAPTER_SCOPE_INVALID", "invalidInput", { scope });
  const configPath = requireAbsoluteOption(options, "config");
  const cacheRoot = requireAbsoluteOption(options, "cache-root");
  const backupDirectory = options["backup-dir"] === undefined ? undefined : requireAbsoluteOption(options, "backup-dir");
  const retention = boundedInteger(options.retention, "retention", 1, 100, 5);
  const version = options.version || packageMetadata.version;
  const fetcher = dependencies.fetcher;
  const cachedIdentity = explicitCachedRuntime(options);
  const cached = cachedIdentity
    ? await verifiedCachedRuntime({ cacheRoot, version, ...cachedIdentity })
    : null;
  const release = cached
    ? cached.runtimeIdentity
    : await core.cache.inspectRuntimeRelease({ version, ...(fetcher ? { fetcher } : {}) });
  const patch = await buildPatch({ host, scope, configPath, server: mcpServer({ host, cacheRoot, version: release.version, integrity: release.integrity }) });
  const approvalDigest = configApprovalDigest({ host, scope, configPath, cacheRoot, release, patch });
  const preview = {
    ok: true,
    status: "approvalRequired",
    action: "mcp.configure",
    approvalDigest,
    runtime: {
      package: release.package,
      version: release.version,
      integrity: release.integrity,
      ...(release.closureDigest ? { closureDigest: release.closureDigest } : {}),
    },
    config: {
      host,
      scope,
      exists: patch.exists,
      status: patch.status,
      currentDigest: patch.currentDigest,
      nextDigest: patch.nextDigest,
      redactedDiff: patch.redactedDiff,
    },
    remediation: { action: "mcp.configure", args: { approvalDigest } },
  };
  if (!options.approve) return preview;
  if (options.approve !== approvalDigest) throw cliError("AAS_ADAPTER_APPROVAL_MISMATCH", "approval", {});
  const installed = cachedIdentity
    ? await verifiedCachedRuntime({ cacheRoot, version: release.version, ...cachedIdentity })
    : await core.cache.installRuntimeFromRegistry({
      cacheRoot,
      version: release.version,
      expectedIntegrity: release.integrity,
      ...(fetcher ? { fetcher } : {}),
    });
  const applied = await applyHostConfigPatch({ patch, approved: true, backupDirectory, retention });
  return {
    ok: true,
    status: applied.status === "alreadyConfigured" ? "alreadyConfigured" : "configured",
    runtime: installed.runtimeIdentity,
    runtimeCacheStatus: cachedIdentity ? "verified" : installed.status,
    config: { host, scope, digest: applied.configDigest, backupCreated: Boolean(applied.backup) },
  };
}

async function mcpBackupCleanup(options) {
  const configPath = requireAbsoluteOption(options, "config");
  const backupDirectory = requireAbsoluteOption(options, "backup-dir");
  const keep = boundedInteger(requireOption(options, "keep"), "keep", 0, 100);
  const preview = await previewBackupCleanup({ backupDirectory, configPath, keep });
  if (!options.approve) {
    return { ok: true, ...preview, action: "mcp.backups.cleanup", remediation: { action: "mcp.backups.cleanup", args: { approvalDigest: preview.approvalDigest } } };
  }
  if (options.approve !== preview.approvalDigest) throw cliError("AAS_ADAPTER_APPROVAL_MISMATCH", "approval", {});
  const result = await cleanupBackups({ backupDirectory, configPath, keep, approvalDigest: options.approve });
  return { ok: true, status: result.status, retained: result.retained, removedCount: result.removed.length };
}

async function execute(argv, dependencies = {}) {
  const { positional, options } = parseOptions(argv);
  if (positional.length === 0 || (positional.length === 1 && positional[0] === "help")) return help();
  validateInvocation(positional, options);
  if (options.help) return help();
  const [root, command] = positional;
  if (root === "catalog" && command === "status") {
    const catalog = core.loadBundledCatalog();
    const result = { ok: true, status: "complete", bundled: { package: catalog.package, version: catalog.version, digest: catalog.digest } };
    if (options["cache-root"] || options.version || options.digest) {
      result.cached = await core.cache.catalogStatus({
        cacheRoot: requireAbsoluteOption(options, "cache-root"),
        packageVersion: requireOption(options, "version"),
        catalogDigest: requireOption(options, "digest"),
        ...(options.integrity ? { integrity: options.integrity } : {}),
      });
    }
    return result;
  }
  if (root === "catalog" && command === "update") {
    return core.cache.updateCatalogFromRegistry({
      cacheRoot: requireAbsoluteOption(options, "cache-root"),
      version: requireOption(options, "version"),
    });
  }
  if (root === "mcp" && command === "configure") return mcpConfigure(options, dependencies);
  if (root === "mcp" && command === "backups" && positional[2] === "cleanup") return mcpBackupCleanup(options);
  if (root !== "stack") throw cliError("AAS_CLI_COMMAND_UNKNOWN", "invalidInput", { command: root });
  if (command === "init") return stackInit(options);
  if (command === "recommend") return core.recommendStack(await catalogFor(options), readJsonFile(requireOption(options, "profile")));
  if (command === "validate") return core.stack.validateManifest(readJsonFile(requireOption(options, "manifest")));
  if (command === "plan") return stackPlan(options, dependencies);
  if (["apply", "doctor", "recover"].includes(command)) {
    const plan = readJsonFile(requireOption(options, "plan"));
    core.stack.validatePlanEnvelope(plan);
    const target = plan.payload?.target;
    if (!target) throw cliError("AAS_TRANSACTION_PLAN_INVALID", "integrity", {});
    if (target.adapterVersion !== ADAPTER_VERSION) throw cliError("AAS_PLAN_ADAPTER_VERSION_INCOMPATIBLE", "incompatibleVersion", {});
    const runtime = await verifiedRuntimeFor(options, plan.payload.runtime, dependencies);
    if (core.canonicalJson(runtime.identity) !== core.canonicalJson(plan.payload.runtime)) {
      throw cliError("AAS_TRANSACTION_RUNTIME_IDENTITY_MISMATCH", "integrity", {});
    }
    const adapter = adapterFor(options, target, runtime.sourceRoot);
    if (command === "apply") {
      return core.transaction.applyPlan({ plan, adapter, approvalDigest: requireOption(options, "approve") });
    }
    if (command === "doctor") return core.transaction.doctor({ target, adapter });
    const action = requireOption(options, "action");
    const recoveryPlan = core.transaction.buildRecoveryPlan({ plan, adapter, recoveryId: requireOption(options, "id"), action });
    if (!options.approve) return { ok: true, status: "approvalRequired", recoveryPlan };
    return core.transaction.recover({ recoveryPlan, plan, adapter, approvalDigest: options.approve });
  }
  throw cliError("AAS_CLI_COMMAND_UNKNOWN", "invalidInput", { command });
}

function exitCodeFor(error) {
  if (["invalidInput", "incompatibleVersion"].includes(error.category)) return EXIT.invalid;
  if (["integrity", "drift", "policy", "approval"].includes(error.category)) return EXIT.blocked;
  if (["conflict", "recovery"].includes(error.category)) return EXIT.recovery;
  return EXIT.execution;
}

async function main(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  try {
    const result = await execute(argv);
    const envelope = {
      schemaVersion: 1,
      protocolVersion: core.protocolVersion,
      coreVersion: core.coreVersion,
      metadataSchemaVersion: core.metadataSchemaVersion,
      scorerVersion: core.scorerVersion,
      reasonCodes: [],
      unknown: [],
      details: {},
      ...result,
    };
    validateInstance("result-envelope.schema.json", envelope, "AAS_CLI_RESULT_SCHEMA_INVALID", "internal");
    stdout.write(`${core.canonicalJson(envelope)}\n`);
    return EXIT.success;
  } catch (error) {
    const payload = {
      schemaVersion: 1,
      ok: false,
      status: "error",
      protocolVersion: core.protocolVersion,
      coreVersion: core.coreVersion,
      metadataSchemaVersion: core.metadataSchemaVersion,
      scorerVersion: core.scorerVersion,
      code: error.code || "AAS_CLI_EXECUTION_FAILED",
      category: error.category || "execution",
      details: error.details || {},
    };
    validateInstance("result-envelope.schema.json", payload, "AAS_CLI_ERROR_SCHEMA_INVALID", "internal");
    stderr.write(`${core.canonicalJson(payload)}\n`);
    return exitCodeFor(payload);
  }
}

module.exports = {
  EXIT,
  adapterFor,
  buildOperations,
  configApprovalDigest,
  execute,
  main,
  mcpBackupCleanup,
  mcpConfigure,
  parseOptions,
  readJsonFile,
  stackPlan,
  writeNewJson,
};
