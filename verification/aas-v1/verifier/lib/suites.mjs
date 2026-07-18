import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { digestJson } from "./canonical.mjs";
import { snapshotZones, assertNoZoneDrift } from "./fs-evidence.mjs";
import { runObserved } from "./observer.mjs";
import { runProcess } from "./process.mjs";
import { candidateEnvironment, parseJsonLines } from "./runtime.mjs";

const require = createRequire(import.meta.url);

const VERSION_FIELDS = {
  protocolVersion: "2025-06-18",
  coreVersion: "1.0.0",
  metadataSchemaVersion: "1.0.0",
  scorerVersion: "1.0.0",
};

function suite(id, evidence, executions = 1) {
  return { id, status: "passed", executions, failures: 0, evidenceSha256: digestJson(evidence), evidence };
}

function decodeToolPayload(response) {
  if (response?.error) return { rpcError: response.error };
  const text = response?.result?.content?.find?.((entry) => entry.type === "text")?.text;
  if (typeof text === "string") {
    try { return JSON.parse(text); } catch { return { text }; }
  }
  return response?.result;
}

function assert(condition, code, message) {
  if (!condition) throw Object.assign(new Error(message), { code });
}

function assertVersions(value, prefix = "response") {
  for (const [key, expected] of Object.entries(VERSION_FIELDS)) {
    assert(value?.[key] === expected, "AAS_VERIFIER_VERSION_CONTRACT", `${prefix}.${key} differs`);
  }
}

function request(id, method, params = {}) {
  return { jsonrpc: "2.0", id, method, params };
}

function parseMcpOutput(stdout) {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim());
  assert(lines.every((line) => Buffer.byteLength(line) <= 256 * 1024), "AAS_VERIFIER_MCP_RESULT_LIMIT", "MCP response exceeded 256 KiB");
  const responses = lines.map((line) => JSON.parse(line));
  assert(responses.every((entry) => entry.jsonrpc === "2.0"), "AAS_VERIFIER_MCP_STDOUT_NOISE", "MCP stdout contains non-protocol output");
  return responses;
}

export async function verifyEntrypoints(runtime, zones) {
  const env = candidateEnvironment(zones);
  const help = await runProcess(process.execPath, [runtime.bins.aas, "--help"], { cwd: zones.project, env });
  assert(help.code === 0 && !help.signal, "AAS_VERIFIER_AAS_HELP", "aas --help failed");
  const values = parseJsonLines(help.stdout);
  assert(values.length === 1 && values[0].ok === true && values[0].status === "help", "AAS_VERIFIER_AAS_HELP_ENVELOPE", "aas --help envelope differs");
  assertVersions(values[0], "aas-help");
  const signatures = values[0].commands || [];
  for (const prefix of ["catalog status", "catalog update", "mcp configure", "mcp backups cleanup", "stack init", "stack recommend", "stack validate", "stack plan", "stack apply", "stack doctor", "stack recover"]) {
    assert(signatures.some((entry) => entry.startsWith(prefix)), "AAS_VERIFIER_COMMAND_MISSING", `Missing command signature: ${prefix}`);
  }
  const legacyHelp = await runProcess(process.execPath, [runtime.bins["agentic-awesome-skills"], "--help"], { cwd: zones.project, env });
  const legacyVersion = await runProcess(process.execPath, [runtime.bins["agentic-awesome-skills"], "--version"], { cwd: zones.project, env });
  assert(legacyHelp.code === 0 && legacyVersion.code === 0, "AAS_VERIFIER_LEGACY_ENTRYPOINT", "Legacy alias smoke failed");
  assert(!fs.existsSync(path.join(zones.project, "aas-stack.json")), "AAS_VERIFIER_LEGACY_STACK_STATE", "Legacy smoke created stack state");
  return suite("entrypoints", {
    helpEnvelope: values[0],
    legacyHelpDigest: digestJson({ stdout: legacyHelp.stdout, stderr: legacyHelp.stderr, code: legacyHelp.code }),
    legacyVersionDigest: digestJson({ stdout: legacyVersion.stdout, stderr: legacyVersion.stderr, code: legacyVersion.code }),
  }, 3);
}

export async function verifyMcp(runtime, zones, evidenceDir) {
  const before = snapshotZones(zones);
  const requests = [
    request(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "aas-v1-verifier", version: "1" } }),
    { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
    request(2, "tools/list"),
    request(3, "resources/templates/list"),
    request(4, "tools/call", { name: "search_skills", arguments: { query: "react testing", target: "codex", limit: 5 } }),
    request(5, "tools/call", { name: "get_skill", arguments: { id: "frontend-design", includeContent: true } }),
    request(6, "tools/call", { name: "recommend_stack", arguments: {
      intent: "web-application-delivery",
      profile: { languages: ["typescript"], frameworks: ["react"] },
      targets: [{ host: "codex", scope: "project" }],
      criticalGoals: ["build", "test"],
      nonCriticalGoals: ["deploy"],
      policy: { allowedRisk: ["none", "safe"], requireKnownSource: true, allowManualSetup: false },
      maxSkills: 6,
    } }),
  ];
  const input = `${requests.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const observed = await runObserved(process.execPath, [runtime.bins["aas-mcp"]], {
    cwd: zones.project,
    env: candidateEnvironment(zones),
    stdin: input,
    timeoutMs: 30_000,
    maxOutputBytes: 2 * 1024 * 1024,
    zones,
    evidenceDir,
  });
  assert(observed.result.code === 0, "AAS_VERIFIER_MCP_EXIT", "MCP smoke exited non-zero");
  assert(observed.observation.networkAttempts === 0, "AAS_VERIFIER_MCP_NETWORK_ATTEMPT", "MCP attempted network access");
  assert(observed.observation.writeAttempts === 0, "AAS_VERIFIER_MCP_WRITE_ATTEMPT", "MCP attempted persistent writes");
  assert(observed.observation.childProcesses === 0, "AAS_VERIFIER_MCP_CHILD_PROCESS", "MCP launched a child process");
  const after = snapshotZones(zones);
  assertNoZoneDrift(before, after);
  const responses = parseMcpOutput(observed.result.stdout);
  const byId = new Map(responses.filter((entry) => entry.id !== undefined).map((entry) => [entry.id, entry]));
  const initialize = byId.get(1)?.result;
  assert(initialize?.protocolVersion === "2025-06-18", "AAS_VERIFIER_MCP_PROTOCOL", "MCP initialize version differs");
  assertVersions(initialize?._meta, "mcp-initialize-meta");
  const toolNames = (byId.get(2)?.result?.tools || []).map((entry) => entry.name).sort();
  assert(JSON.stringify(toolNames) === JSON.stringify(["diff_stack", "get_skill", "inspect_stack", "recommend_stack", "search_skills"]), "AAS_VERIFIER_MCP_TOOL_SURFACE", "MCP tool surface differs");
  const templates = byId.get(3)?.result?.resourceTemplates || [];
  assert(templates.length === 1 && templates[0].uriTemplate === "aas://skills/{id}", "AAS_VERIFIER_MCP_RESOURCE_SURFACE", "MCP resource template differs");
  const getSkillText = JSON.stringify(byId.get(5));
  assert(getSkillText.includes("untrustedContent") && !getSkillText.includes("AAS_SECRET_CANARY_DO_NOT_EMIT_8f37ec75"), "AAS_VERIFIER_UNTRUSTED_CONTENT_BOUNDARY", "Skill content trust boundary missing or leaked canary");
  return suite("mcp", {
    requests: requests.length,
    responseDigest: digestJson(responses),
    canonicalResponseDigest: digestJson(decodeToolPayload(byId.get(6))),
    observation: observed.observation,
    before: Object.fromEntries(Object.entries(before).map(([name, value]) => [name, value.digest])),
    after: Object.fromEntries(Object.entries(after).map(([name, value]) => [name, value.digest])),
    stderrDigest: digestJson(observed.result.stderr),
  }, requests.length);
}

export function packageSuite(inspection, runtime) {
  assert(inspection.failures.length === 0, "AAS_VERIFIER_PACKAGE_CONTENT", "Tarball content contract failed");
  assert(runtime.manifest.name === "agentic-awesome-skills", "AAS_VERIFIER_PACKAGE_NAME", "Package name differs");
  return suite("package", {
    tarballSha256: inspection.sha256,
    tarballSha512: inspection.sha512,
    entries: inspection.entries,
    installTreeSha256: runtime.treeDigest,
    installReceiptDigest: runtime.installReceiptDigest,
  }, inspection.entries.length);
}

async function runDriver(id, driver, runtime, budget, jobIndex) {
  const result = await runProcess(process.execPath, [driver], {
    cwd: runtime.root,
    env: candidateEnvironment({ home: runtime.root, project: runtime.root, cache: runtime.root, tmp: runtime.root }),
    stdin: JSON.stringify({ packageRoot: runtime.packageRoot, budget, jobIndex, jobCount: 6 }),
    timeoutMs: 20 * 60_000,
    maxOutputBytes: 16 * 1024 * 1024,
  });
  assert(result.code === 0 && !result.timedOut && !result.outputLimitExceeded, `AAS_VERIFIER_${id.toUpperCase()}_DRIVER`, `${id} driver failed: ${result.stderr.slice(0, 500)}`);
  const values = parseJsonLines(result.stdout);
  assert(values.length === 1 && values[0].ok === true, `AAS_VERIFIER_${id.toUpperCase()}_RESULT`, `${id} result failed`);
  return suite(id, values[0], values[0].total);
}

export function verifyProperty(runtime, budget, jobIndex, verifierRoot) {
  return runDriver("property", path.join(verifierRoot, "drivers", "property.cjs"), runtime, budget, jobIndex);
}

export function verifyFuzz(runtime, budget, jobIndex, verifierRoot) {
  return runDriver("fuzz", path.join(verifierRoot, "drivers", "fuzz.cjs"), runtime, budget, jobIndex);
}

export async function verifyHostile(runtime, zones, evidenceDir, hostileManifest, hostileRoot, verifierRoot) {
  const before = snapshotZones(zones);
  const observed = await runObserved(process.execPath, [path.join(verifierRoot, "drivers", "hostile.cjs")], {
    cwd: runtime.root,
    env: candidateEnvironment(zones),
    stdin: JSON.stringify({ packageRoot: runtime.packageRoot, manifest: hostileManifest, corpusRoot: hostileRoot }),
    timeoutMs: 120_000,
    maxOutputBytes: 4 * 1024 * 1024,
    zones,
    evidenceDir,
  });
  assert(observed.result.code === 0, "AAS_VERIFIER_HOSTILE_DRIVER", `Hostile driver failed: ${observed.result.stderr.slice(0, 500)}`);
  assert(observed.observation.networkAttempts === 0, "AAS_VERIFIER_HOSTILE_NETWORK", "Hostile suite attempted network access");
  assert(observed.observation.writeAttempts === 0, "AAS_VERIFIER_HOSTILE_WRITE", "Hostile suite attempted writes");
  assert(observed.observation.childProcesses === 0, "AAS_VERIFIER_HOSTILE_CHILD", "Hostile suite launched child code");
  const after = snapshotZones(zones);
  assertNoZoneDrift(before, after);
  const values = parseJsonLines(observed.result.stdout);
  assert(values.length === 1 && values[0].ok === true && values[0].executions === hostileManifest.classes.length * 2, "AAS_VERIFIER_HOSTILE_RESULT", "Hostile result failed");
  return suite("hostile", { ...values[0], observation: observed.observation }, values[0].executions);
}

export async function prepareRuntimeCache(runtime, tarballBytes, integrity, cacheRoot) {
  const core = require(path.join(runtime.packageRoot, "tools/lib/aas-v1"));
  const parsed = core.cache.parsePackageArchive(tarballBytes, { limits: core.cache.RUNTIME_ARCHIVE_LIMITS });
  return core.cache.promoteRuntime({
    cacheRoot,
    release: {
      version: runtime.manifest.version,
      integrity,
      provenance: { registryOrigin: "https://registry.npmjs.org", signaturesPresent: false, attestationsPresent: false },
    },
    parsed,
  });
}

function allOutput(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

export async function verifyAdapters(runtime, zones, fixtureRoot, runtimeIntegrity, runtimeClosureDigest) {
  const hosts = [
    { host: "codex", fixture: "codex-config.toml", config: "codex.toml", sentinel: "unknown_fixture_key" },
    { host: "claude", fixture: "claude-config.json", config: "claude.json", sentinel: "unknownFixtureKey" },
  ];
  const cases = [];
  for (const host of hosts) {
    const root = path.join(zones.project, `adapter-${host.host}`);
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const config = path.join(root, host.config);
    const backupDir = path.join(root, "backups");
    fs.copyFileSync(path.join(fixtureRoot, host.fixture), config);
    if (process.platform !== "win32") fs.chmodSync(config, 0o600);
    const beforeStat = fs.statSync(config);
    const beforeBytes = fs.readFileSync(config);
    const common = ["mcp", "configure", "--host", host.host, "--scope", "project", "--config", config, "--cache-root", zones.cache, "--version", runtime.manifest.version, "--runtime-integrity", runtimeIntegrity, "--runtime-closure-digest", runtimeClosureDigest, "--backup-dir", backupDir];
    const preview = await runProcess(process.execPath, [runtime.bins.aas, ...common], { cwd: root, env: candidateEnvironment(zones), timeoutMs: 30_000 });
    assert(preview.code === 0, "AAS_VERIFIER_ADAPTER_PREVIEW", `${host.host} preview failed`);
    const previewValue = parseJsonLines(preview.stdout)[0];
    assert(previewValue?.status === "approvalRequired" && /^sha256-[a-f0-9]{64}$/.test(previewValue.approvalDigest), "AAS_VERIFIER_ADAPTER_APPROVAL", `${host.host} approval digest missing`);
    assert(fs.readFileSync(config).equals(beforeBytes), "AAS_VERIFIER_ADAPTER_PREVIEW_WRITE", `${host.host} preview changed config`);
    assert(!allOutput(preview).includes("AAS_SECRET_CANARY_DO_NOT_EMIT_"), "AAS_VERIFIER_ADAPTER_SECRET_LEAK", `${host.host} preview leaked canary`);
    assert(previewValue.runtime?.integrity === runtimeIntegrity, "AAS_VERIFIER_RUNTIME_INTEGRITY_BINDING", `${host.host} preview did not bind the exact candidate runtime SRI`);
    const apply = await runProcess(process.execPath, [runtime.bins.aas, ...common, "--approve", previewValue.approvalDigest], { cwd: root, env: candidateEnvironment(zones), timeoutMs: 30_000 });
    assert(apply.code === 0, "AAS_VERIFIER_ADAPTER_APPLY", `${host.host} apply failed: ${apply.stderr}`);
    assert(!allOutput(apply).includes("AAS_SECRET_CANARY_DO_NOT_EMIT_"), "AAS_VERIFIER_ADAPTER_SECRET_LEAK", `${host.host} apply leaked canary`);
    const afterBytes = fs.readFileSync(config);
    const afterText = afterBytes.toString("utf8");
    assert(afterText.includes(host.sentinel) && afterText.includes("preserve-me") && afterText.includes("existing-server"), "AAS_VERIFIER_ADAPTER_UNKNOWN_FIELD", `${host.host} did not preserve unknown/existing fields`);
    assert(afterText.includes("aas-mcp.js"), "AAS_VERIFIER_ADAPTER_MCP_ENTRY", `${host.host} did not configure AAS MCP`);
    const afterStat = fs.statSync(config);
    if (process.platform !== "win32") {
      assert((afterStat.mode & 0o777) === (beforeStat.mode & 0o777), "AAS_VERIFIER_ADAPTER_MODE", `${host.host} mode changed`);
      assert(afterStat.uid === beforeStat.uid && afterStat.gid === beforeStat.gid, "AAS_VERIFIER_ADAPTER_OWNER", `${host.host} owner changed`);
    }
    const backupEntries = fs.readdirSync(backupDir).filter((name) => !name.startsWith(".")).sort();
    const backups = backupEntries.filter((name) => name.endsWith(".bak"));
    const metadata = backupEntries.filter((name) => name.endsWith(".json"));
    assert(backups.length === 1 && metadata.length === 1, "AAS_VERIFIER_ADAPTER_BACKUP", `${host.host} backup pair count differs`);
    if (process.platform !== "win32") {
      for (const name of backupEntries) {
        const backupStat = fs.statSync(path.join(backupDir, name));
        assert((backupStat.mode & 0o077) === 0, "AAS_VERIFIER_ADAPTER_BACKUP_MODE", `${host.host} backup entry is not user-only`);
      }
    }
    const cleanupBase = ["mcp", "backups", "cleanup", "--config", config, "--backup-dir", backupDir, "--keep", "0"];
    const cleanupPreview = await runProcess(process.execPath, [runtime.bins.aas, ...cleanupBase], { cwd: root, env: candidateEnvironment(zones) });
    const cleanupValue = parseJsonLines(cleanupPreview.stdout)[0];
    assert(cleanupPreview.code === 0 && /^sha256-[a-f0-9]{64}$/.test(cleanupValue?.approvalDigest), "AAS_VERIFIER_ADAPTER_CLEANUP_PREVIEW", `${host.host} backup cleanup preview failed`);
    const cleanup = await runProcess(process.execPath, [runtime.bins.aas, ...cleanupBase, "--approve", cleanupValue.approvalDigest], { cwd: root, env: candidateEnvironment(zones) });
    assert(cleanup.code === 0 && fs.readdirSync(backupDir).filter((name) => !name.startsWith(".")).length === 0, "AAS_VERIFIER_ADAPTER_CLEANUP", `${host.host} backup cleanup failed`);

    const unsafe = path.join(root, `unsafe-${host.config}`);
    const outside = path.join(root, `outside-${host.config}`);
    fs.copyFileSync(path.join(fixtureRoot, host.fixture), outside);
    try {
      fs.symlinkSync(outside, unsafe, process.platform === "win32" ? "file" : undefined);
      const unsafeResult = await runProcess(process.execPath, [runtime.bins.aas, "mcp", "configure", "--host", host.host, "--scope", "project", "--config", unsafe, "--cache-root", zones.cache, "--version", runtime.manifest.version], { cwd: root, env: candidateEnvironment(zones) });
      assert(unsafeResult.code !== 0, "AAS_VERIFIER_ADAPTER_SYMLINK", `${host.host} accepted symlink config`);
    } finally { fs.rmSync(unsafe, { force: true }); }
    cases.push({ host: host.host, previewDigest: digestJson(previewValue), applyDigest: digestJson(parseJsonLines(apply.stdout)[0]), backupCount: backups.length, cleanupDigest: digestJson(cleanupValue) });
  }
  return suite("adapters", { runtimeIntegrity, runtimeClosureDigest, cases, invariants: ["unknown-fields-preserved", "minimal-patch", "mode-owner-preserved", "atomic-write", "user-only-backup", "secret-redacted", "unsafe-file-rejected"] }, cases.length * 4);
}

export async function verifyLegacy(runtime, zones, verifierRoot, corpusRoot) {
  const driver = path.resolve(verifierRoot, "drivers", "legacy.mjs");
  const absoluteCorpusRoot = path.resolve(corpusRoot);
  const workRoot = path.join(zones.tmp, "legacy");
  const result = await runProcess(process.execPath, [driver], {
    cwd: zones.project,
    env: candidateEnvironment(zones),
    stdin: JSON.stringify({ packageRoot: runtime.packageRoot, runtimeRoot: runtime.root, corpusRoot: absoluteCorpusRoot, workRoot }),
    timeoutMs: 10 * 60_000,
    maxOutputBytes: 8 * 1024 * 1024,
  });
  const values = parseJsonLines(result.stdout);
  assert(result.code === 0 && values.length === 1 && values[0].ok === true && values[0].executions === 41, "AAS_VERIFIER_LEGACY_DIFFERENTIAL", `Legacy differential failed: ${result.stderr.slice(0, 500)} ${result.stdout.slice(0, 1000)}`);
  return suite("legacy", values[0], values[0].executions);
}

export { suite };
