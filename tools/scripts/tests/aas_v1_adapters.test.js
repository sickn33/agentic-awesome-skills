"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  applyHostConfigPatch,
  buildPatch,
  cleanupBackups,
  inspectHostConfig,
} = require("../../lib/aas-v1/adapters");
const { inspectRegularFile } = require("../../lib/aas-v1/adapters/safety");

const FIXTURES = path.join(__dirname, "fixtures", "aas-v1-adapters");
const CODEX_SERVER = { command: "/opt/aas/aas-mcp", args: ["--stdio", "--runtime", "14.6.0"], enabled: true };
const CLAUDE_SERVER = { command: "/opt/aas/aas-mcp", args: ["--stdio"], env: { AAS_MODE: "offline", SECRET: "new-secret-never-previewed" } };

async function temporaryDirectory(t, prefix = "aas-adapter-") {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function copyFixture(t, name, mode = 0o640) {
  const directory = await temporaryDirectory(t);
  const target = path.join(directory, name.endsWith("json") ? ".mcp.json" : "config.toml");
  await fsp.copyFile(path.join(FIXTURES, name), target);
  await fsp.chmod(target, mode);
  return { directory, target };
}

async function backupFiles(directory) {
  return (await fsp.readdir(directory)).filter((name) => name.endsWith(".bak") || name.endsWith(".json")).sort();
}

test("fixture provenance pins the validated host contracts without real user data", async () => {
  const provenance = JSON.parse(await fsp.readFile(path.join(FIXTURES, "provenance.json"), "utf8"));
  assert.equal(provenance.validatedAt, "2026-07-17");
  assert.equal(provenance.anonymized, true);
  assert.deepEqual(provenance.hosts.map((entry) => entry.host), ["codex", "claude"]);
  assert.ok(provenance.hosts.every((entry) => entry.hostVersion && entry.documentation.startsWith("https://")));
});

test("Codex preview is value-free and patches only the aas table while preserving unknown text", async (t) => {
  const { target } = await copyFixture(t, "codex-existing.toml");
  const original = await fsp.readFile(target, "utf8");
  const inspected = await inspectHostConfig({ host: "codex", scope: "project", configPath: target });
  assert.equal(inspected.sectionPresent, true);
  assert.deepEqual(inspected.unknownKeys, ["startup_timeout_sec"]);
  const patch = await buildPatch({ host: "codex", scope: "project", configPath: target, server: CODEX_SERVER });
  assert.equal(patch.changed, true);
  assert.deepEqual(patch.redactedDiff.changedPaths, ["mcp_servers.aas.args", "mcp_servers.aas.command", "mcp_servers.aas.enabled"]);
  const serialized = JSON.stringify(patch);
  assert.ok(!serialized.includes("fixture-secret"));
  assert.ok(!serialized.includes(CODEX_SERVER.command));
  assert.ok(!serialized.includes("14.6.0"));
  assert.equal(await fsp.readFile(target, "utf8"), original);
});

test("Claude preview preserves unknown objects and never exposes env values", async (t) => {
  const { directory, target } = await copyFixture(t, "claude-existing.mcp.json");
  const patch = await buildPatch({ host: "claude", scope: "user", configPath: target, server: CLAUDE_SERVER });
  const serialized = JSON.stringify(patch);
  for (const forbidden of ["fixture-root-secret", "fixture-other-secret", "fixture-old-secret", "new-secret", CLAUDE_SERVER.command]) {
    assert.ok(!serialized.includes(forbidden), forbidden);
  }
  assert.deepEqual(patch.inspection.unknownKeys, ["disabled"]);
  const result = await applyHostConfigPatch({ patch, approved: true, backupDirectory: path.join(directory, "backups"), now: "2026-07-17T01:02:03.000Z" });
  assert.equal(result.status, "applied");
  const parsed = JSON.parse(await fsp.readFile(target, "utf8"));
  assert.equal(parsed.unrelated.token, "fixture-root-secret-must-not-appear-in-preview");
  assert.equal(parsed.mcpServers.other.env.TOKEN, "fixture-other-secret-must-not-appear-in-preview");
  assert.equal(parsed.mcpServers.aas.disabled, false);
  assert.deepEqual(parsed.mcpServers.aas.env, CLAUDE_SERVER.env);
});

test("apply requires approval, preserves mode and owner, writes 0600 backups, and leaves no stage or lock", async (t) => {
  const { directory, target } = await copyFixture(t, "codex-existing.toml", 0o640);
  const originalStat = await fsp.stat(target);
  const original = await fsp.readFile(target);
  const patch = await buildPatch({ host: "codex", scope: "project", configPath: target, server: CODEX_SERVER });
  await assert.rejects(applyHostConfigPatch({ patch, backupDirectory: path.join(directory, "backups") }), (error) => error.code === "AAS_ADAPTER_APPROVAL_REQUIRED");
  assert.deepEqual(await fsp.readFile(target), original);
  const result = await applyHostConfigPatch({ patch, approved: true, backupDirectory: path.join(directory, "backups"), retention: 3, now: "2026-07-17T02:00:00.000Z" });
  assert.equal(result.status, "applied");
  const nextStat = await fsp.stat(target);
  assert.equal(nextStat.mode & 0o777, originalStat.mode & 0o777);
  assert.equal(nextStat.uid, originalStat.uid);
  assert.equal(nextStat.gid, originalStat.gid);
  const configured = await fsp.readFile(target, "utf8");
  assert.match(configured, /startup_timeout_sec = 20/);
  assert.match(configured, /# preserve this comment/);
  assert.match(configured, /fixture-secret-must-not-appear-in-preview/);
  assert.ok(configured.includes('command = "/opt/aas/aas-mcp"'));
  const files = await backupFiles(path.join(directory, "backups"));
  assert.equal(files.length, 2);
  for (const name of files) assert.equal((await fsp.stat(path.join(directory, "backups", name))).mode & 0o777, 0o600);
  const metadataName = files.find((name) => name.endsWith(".json"));
  const metadata = JSON.parse(await fsp.readFile(path.join(directory, "backups", metadataName), "utf8"));
  assert.deepEqual(metadata.retention, { enforcement: "explicit-cleanup", maxEntries: 3 });
  assert.deepEqual(await fsp.readFile(result.backup.backupPath), original);
  assert.ok((await fsp.readdir(directory)).every((name) => !name.includes("aas-stage") && !name.endsWith(".aas.lock")));
});

test("apply blocks drift and an existing lock without overwriting current bytes", async (t) => {
  const { directory, target } = await copyFixture(t, "codex-existing.toml");
  const patch = await buildPatch({ host: "codex", scope: "project", configPath: target, server: CODEX_SERVER });
  await fsp.appendFile(target, "\n# concurrent edit\n");
  const drifted = await fsp.readFile(target);
  await assert.rejects(
    applyHostConfigPatch({ patch, approved: true, backupDirectory: path.join(directory, "backups") }),
    (error) => error.code === "AAS_ADAPTER_CONFIG_CHANGED",
  );
  assert.deepEqual(await fsp.readFile(target), drifted);
  const fresh = await buildPatch({ host: "codex", scope: "project", configPath: target, server: CODEX_SERVER });
  const lockPath = path.join(directory, ".config.toml.aas.lock");
  await fsp.writeFile(lockPath, "occupied", { mode: 0o600 });
  await assert.rejects(
    applyHostConfigPatch({ patch: fresh, approved: true, backupDirectory: path.join(directory, "backups") }),
    (error) => error.code === "AAS_ADAPTER_LOCKED",
  );
  assert.deepEqual(await fsp.readFile(target), drifted);
});

test("symlink, non-regular, and ownership mismatches are rejected", async (t) => {
  const directory = await temporaryDirectory(t);
  const real = path.join(directory, "real.toml");
  const link = path.join(directory, "link.toml");
  await fsp.writeFile(real, "");
  await fsp.symlink(real, link);
  await assert.rejects(inspectHostConfig({ host: "codex", scope: "project", configPath: link }), (error) => error.code === "AAS_ADAPTER_CONFIG_UNSAFE");
  await assert.rejects(inspectHostConfig({ host: "codex", scope: "project", configPath: directory }), (error) => error.code === "AAS_ADAPTER_CONFIG_UNSAFE");
  const stat = await fsp.stat(real);
  await assert.rejects(inspectRegularFile(real, { expectedUid: stat.uid + 1 }), (error) => error.code === "AAS_ADAPTER_OWNERSHIP_MISMATCH");
});

test("ambiguous TOML and duplicate JSON keys fail closed", async (t) => {
  const directory = await temporaryDirectory(t);
  const toml = path.join(directory, "config.toml");
  await fsp.writeFile(toml, "[mcp_servers]\naas.command = \"ambiguous\"\n");
  await assert.rejects(buildPatch({ host: "codex", scope: "project", configPath: toml, server: CODEX_SERVER }), (error) => error.code === "AAS_ADAPTER_CODEX_SECTION_AMBIGUOUS");
  const json = path.join(directory, ".mcp.json");
  await fsp.writeFile(json, '{"mcpServers":{},"mcpServers":{}}');
  await assert.rejects(buildPatch({ host: "claude", scope: "project", configPath: json, server: CLAUDE_SERVER }), (error) => error.code === "AAS_ADAPTER_CLAUDE_JSON_DUPLICATE_KEY");
});

test("a missing explicit path is created with 0600 and no implicit backup", async (t) => {
  const directory = await temporaryDirectory(t);
  const target = path.join(directory, ".mcp.json");
  const patch = await buildPatch({ host: "claude", scope: "project", configPath: target, server: CLAUDE_SERVER });
  assert.equal(patch.exists, false);
  const result = await applyHostConfigPatch({ patch, approved: true });
  assert.equal(result.backup, null);
  assert.equal((await fsp.stat(target)).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(await fsp.readFile(target, "utf8")).mcpServers.aas, CLAUDE_SERVER);
});

test("retention is metadata only until explicit cleanup is approved", async (t) => {
  const { directory, target } = await copyFixture(t, "codex-existing.toml");
  const backups = path.join(directory, "backups");
  const first = await buildPatch({ host: "codex", scope: "project", configPath: target, server: CODEX_SERVER });
  await applyHostConfigPatch({ patch: first, approved: true, backupDirectory: backups, retention: 1, now: "2026-07-17T03:00:00.000Z" });
  const secondServer = { ...CODEX_SERVER, args: [...CODEX_SERVER.args, "--second"] };
  const second = await buildPatch({ host: "codex", scope: "project", configPath: target, server: secondServer });
  await applyHostConfigPatch({ patch: second, approved: true, backupDirectory: backups, retention: 1, now: "2026-07-17T04:00:00.000Z" });
  assert.equal((await backupFiles(backups)).length, 4);
  await assert.rejects(cleanupBackups({ backupDirectory: backups, configPath: target, keep: 1 }), (error) => error.code === "AAS_ADAPTER_APPROVAL_REQUIRED");
  assert.equal((await backupFiles(backups)).length, 4);
  const cleaned = await cleanupBackups({ backupDirectory: backups, configPath: target, keep: 1, approved: true });
  assert.equal(cleaned.removed.length, 1);
  assert.equal((await backupFiles(backups)).length, 2);
});

test("adapters never infer HOME and reject relative config and backup paths", async (t) => {
  const { directory, target } = await copyFixture(t, "codex-existing.toml");
  await assert.rejects(buildPatch({ host: "codex", scope: "user", configPath: "config.toml", server: CODEX_SERVER }), (error) => error.code === "AAS_ADAPTER_PATH_INVALID");
  const patch = await buildPatch({ host: "codex", scope: "user", configPath: target, server: CODEX_SERVER });
  await assert.rejects(applyHostConfigPatch({ patch, approved: true, backupDirectory: "backups" }), (error) => error.code === "AAS_ADAPTER_BACKUP_PATH_INVALID");
  const publicBackups = path.join(directory, "public-backups");
  await fsp.mkdir(publicBackups, { mode: 0o755 });
  await fsp.chmod(publicBackups, 0o755);
  await assert.rejects(applyHostConfigPatch({ patch, approved: true, backupDirectory: publicBackups }), (error) => error.code === "AAS_ADAPTER_BACKUP_DIRECTORY_PERMISSIONS");
});

test("Windows sensitive-byte and directory-flush contracts stay fail-closed", async () => {
  const adapterSource = await fsp.readFile(path.join(__dirname, "../../lib/aas-v1/adapters/index.js"), "utf8");
  const safetySource = await fsp.readFile(path.join(__dirname, "../../lib/aas-v1/adapters/safety.js"), "utf8");
  const durabilitySource = await fsp.readFile(path.join(__dirname, "../../lib/aas-v1/durability.js"), "utf8");

  const stageCreate = adapterSource.indexOf('const handle = await fsp.open(stagePath, "wx", targetMode)');
  const stageAcl = adapterSource.indexOf("copyWindowsAcl(patch.configPath, stagePath)", stageCreate);
  const stageWrite = adapterSource.indexOf("await handle.writeFile(internal.nextBytes)", stageCreate);
  assert.ok(stageCreate >= 0 && stageAcl > stageCreate && stageAcl < stageWrite);

  const privateWriteStart = safetySource.indexOf("async function writeExclusiveSynced");
  const privateAcl = safetySource.indexOf("hardenWindowsPrivatePath(filePath, false)", privateWriteStart);
  const privateWrite = safetySource.indexOf("await handle.writeFile(bytes)", privateWriteStart);
  assert.ok(privateAcl > privateWriteStart && privateAcl < privateWrite);

  assert.ok(durabilitySource.includes("CreateFileW($args[0],0x40000000,7,"));
  assert.ok(!durabilitySource.includes("CreateFileW($args[0],0x80000000,7,"));
});
