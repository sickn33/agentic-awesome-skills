"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const core = require("../../lib/aas-v1");
const { mcpBackupCleanup, mcpConfigure } = require("../../lib/aas-v1/cli/main");

function octal(value, length) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  return `${encoded}\0`;
}

function tar(entries) {
  const blocks = [];
  for (const [name, value] of entries) {
    const bytes = Buffer.from(value);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write(octal(0o644, 8), 100, 8, "ascii");
    header.write(octal(0, 8), 108, 8, "ascii");
    header.write(octal(0, 8), 116, 8, "ascii");
    header.write(octal(bytes.length, 12), 124, 12, "ascii");
    header.write(octal(0, 12), 136, 12, "ascii");
    header.fill(0x20, 148, 156);
    header[156] = "0".charCodeAt(0);
    header.write("ustar\0", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
    blocks.push(header, bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}

function releaseFixture() {
  const packageJson = JSON.stringify({
    name: "agentic-awesome-skills",
    version: "14.6.0",
    bin: { "agentic-awesome-skills": "tools/bin/install.js", aas: "tools/bin/aas.js", "aas-mcp": "tools/bin/aas-mcp.js" },
    bundledDependencies: ["ajv", "sanitize-filename", "yaml"],
  });
  const archive = tar([
    ["package/package.json", packageJson],
    ["package/tools/bin/aas-mcp.js", "#!/usr/bin/env node\nrequire('../lib/aas-v1/mcp');\n"],
    ["package/tools/lib/aas-v1/index.js", "module.exports = {};\n"],
    ["package/data/aas-v1/catalog-manifest.v1.json", "{}\n"],
    ["package/data/catalog.json", '{"skills":[]}\n'],
    ["package/data/plugin-compatibility.json", '{"skills":[]}\n'],
    ["package/skills_index.json", "[]\n"],
    ["package/node_modules/ajv/package.json", '{"name":"ajv","version":"8.20.0"}\n'],
    ["package/node_modules/sanitize-filename/package.json", '{"name":"sanitize-filename","version":"1.6.4"}\n'],
    ["package/node_modules/yaml/package.json", '{"name":"yaml","version":"2.9.0"}\n'],
  ]);
  const integrity = `sha512-${crypto.createHash("sha512").update(archive).digest("base64")}`;
  const tarballUrl = "https://registry.npmjs.org/agentic-awesome-skills/-/agentic-awesome-skills-14.6.0.tgz";
  const metadataUrl = "https://registry.npmjs.org/agentic-awesome-skills/14.6.0";
  const metadata = Buffer.from(JSON.stringify({ name: "agentic-awesome-skills", version: "14.6.0", dist: { integrity, tarball: tarballUrl } }));
  const fetcher = async (url) => {
    if (url === metadataUrl) return metadata;
    if (url === tarballUrl) return archive;
    throw new Error(`unexpected URL: ${url}`);
  };
  return { archive, fetcher, integrity };
}

async function temp(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "aas-runtime-config-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  return root;
}

test("runtime promotion is content addressed, verifies every cached byte, and is idempotent", async (t) => {
  const root = await temp(t);
  const cacheRoot = path.join(root, "cache");
  const fixture = releaseFixture();
  const installed = await core.cache.installRuntimeFromRegistry({ cacheRoot, version: "14.6.0", expectedIntegrity: fixture.integrity, fetcher: fixture.fetcher });
  assert.equal(installed.status, "promoted");
  assert.deepEqual(Object.keys(installed.runtimeIdentity), ["package", "version", "integrity", "closureDigest"]);
  assert.match(installed.targetPath, new RegExp(`/runtimes/14\\.6\\.0/${core.cache.filesystemSafeIntegrityKey(fixture.integrity)}$`));
  const status = await core.cache.runtimeStatus({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity, closureDigest: installed.runtimeIdentity.closureDigest });
  assert.equal(status.status, "verified");
  const again = await core.cache.installRuntimeFromRegistry({ cacheRoot, version: "14.6.0", expectedIntegrity: fixture.integrity, fetcher: fixture.fetcher });
  assert.equal(again.status, "alreadyPresent");
  await fsp.appendFile(core.cache.runtimeMcpPath({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity }), "tamper");
  assert.equal((await core.cache.runtimeStatus({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity })).status, "invalid");
});

test("the packed runtime launches MCP from an isolated verified dependency closure", async (t) => {
  const root = await temp(t);
  const repoRoot = path.resolve(__dirname, "../../..");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const packed = spawnSync(npmCommand, [
    "pack",
    "--silent",
    "--pack-destination",
    root,
    "--cache",
    path.join(root, "npm-cache"),
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(packed.status, 0, packed.stderr);
  const archiveName = packed.stdout.trim().split(/\r?\n/).at(-1);
  const archive = await fsp.readFile(path.join(root, archiveName));
  const integrity = `sha512-${crypto.createHash("sha512").update(archive).digest("base64")}`;
  const packageVersion = require(path.join(repoRoot, "package.json")).version;
  const tarballUrl = `https://registry.npmjs.org/agentic-awesome-skills/-/agentic-awesome-skills-${packageVersion}.tgz`;
  const metadataUrl = `https://registry.npmjs.org/agentic-awesome-skills/${packageVersion}`;
  const fetcher = async (url) => {
    if (url === metadataUrl) return Buffer.from(JSON.stringify({
      name: "agentic-awesome-skills",
      version: packageVersion,
      dist: { integrity, tarball: tarballUrl },
    }));
    if (url === tarballUrl) return archive;
    throw new Error(`unexpected URL: ${url}`);
  };
  const cacheRoot = path.join(root, "isolated-cache");
  const installed = await core.cache.installRuntimeFromRegistry({
    cacheRoot,
    version: packageVersion,
    expectedIntegrity: integrity,
    fetcher,
  });
  const mcpPath = core.cache.runtimeMcpPath({ cacheRoot, packageVersion, integrity });
  const runtimeStatus = await core.cache.runtimeStatus({ cacheRoot, packageVersion, integrity });
  assert.equal(runtimeStatus.status, "verified");
  assert.ok(runtimeStatus.identity.assets.some((asset) => asset.path.startsWith("package/node_modules/ajv/")));
  assert.ok(runtimeStatus.identity.assets.some((asset) => asset.path.startsWith("package/skills/")));
  assert.ok(runtimeStatus.identity.assets.every((asset) => !asset.path.startsWith("package/docs/")));
  const request = `${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: core.protocolVersion,
      capabilities: {},
      clientInfo: { name: "isolated-runtime-test", version: "1" },
    },
  })}\n`;
  const launched = spawnSync(process.execPath, [mcpPath, "--cache-root", cacheRoot], {
    cwd: root,
    input: request,
    encoding: "utf8",
    env: { ...process.env, NODE_PATH: "" },
    maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(launched.status, 0, launched.stderr);
  const response = JSON.parse(launched.stdout.trim());
  assert.equal(response.result.protocolVersion, core.protocolVersion);
  assert.equal(response.result._meta.catalogDigest, core.loadBundledCatalog({ root: repoRoot }).digest);
  assert.equal(installed.runtimeIdentity.closureDigest.startsWith("sha256-"), true);
});

test("mcp configure previews without writes, binds exact approval, then configures the cached runtime", async (t) => {
  const root = await temp(t);
  const cacheRoot = path.join(root, "cache");
  const config = path.join(root, ".mcp.json");
  const backups = path.join(root, "backups");
  await fsp.writeFile(config, '{"secret":"never-print","mcpServers":{}}\n', { mode: 0o600 });
  const fixture = releaseFixture();
  const options = { host: "claude", scope: "user", config, "cache-root": cacheRoot, "backup-dir": backups, version: "14.6.0" };
  const preview = await mcpConfigure(options, { fetcher: fixture.fetcher });
  assert.equal(preview.status, "approvalRequired");
  assert.equal(fs.existsSync(cacheRoot), false);
  assert.equal(fs.existsSync(backups), false);
  const serialized = JSON.stringify(preview);
  assert.ok(!serialized.includes("never-print"));
  assert.ok(!serialized.includes(config));
  assert.ok(!serialized.includes(cacheRoot));
  await assert.rejects(mcpConfigure({ ...options, approve: core.sha256("wrong") }, { fetcher: fixture.fetcher }), (error) => error.code === "AAS_ADAPTER_APPROVAL_MISMATCH");
  assert.equal(fs.existsSync(cacheRoot), false);
  const configured = await mcpConfigure({ ...options, approve: preview.approvalDigest }, { fetcher: fixture.fetcher });
  assert.equal(configured.status, "configured");
  assert.equal(configured.runtime.integrity, fixture.integrity);
  const parsed = JSON.parse(await fsp.readFile(config, "utf8"));
  assert.equal(parsed.secret, "never-print");
  assert.equal(parsed.mcpServers.aas.command, process.execPath);
  assert.deepEqual(parsed.mcpServers.aas.args, [core.cache.runtimeMcpPath({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity }), "--cache-root", cacheRoot]);
  assert.deepEqual(parsed.mcpServers.aas.env, {});
  assert.equal((await fsp.stat(backups)).mode & 0o777, 0o700);
});

test("mcp configure can bind an already verified runtime without registry access", async (t) => {
  const root = await temp(t);
  const cacheRoot = path.join(root, "cache");
  const config = path.join(root, ".mcp.json");
  await fsp.writeFile(config, '{"mcpServers":{}}\n', { mode: 0o600 });
  const fixture = releaseFixture();
  const installed = await core.cache.installRuntimeFromRegistry({
    cacheRoot,
    version: "14.6.0",
    expectedIntegrity: fixture.integrity,
    fetcher: fixture.fetcher,
  });
  let fetchAttempts = 0;
  const noNetwork = async () => {
    fetchAttempts += 1;
    throw new Error("registry access is forbidden for an explicitly pinned cached runtime");
  };
  const options = {
    host: "claude",
    scope: "project",
    config,
    "cache-root": cacheRoot,
    "backup-dir": path.join(root, "backups"),
    version: "14.6.0",
    "runtime-integrity": fixture.integrity,
    "runtime-closure-digest": installed.runtimeIdentity.closureDigest,
  };
  const preview = await mcpConfigure(options, { fetcher: noNetwork });
  assert.equal(preview.status, "approvalRequired");
  assert.deepEqual(preview.runtime, installed.runtimeIdentity);
  const configured = await mcpConfigure({ ...options, approve: preview.approvalDigest }, { fetcher: noNetwork });
  assert.equal(configured.status, "configured");
  assert.equal(configured.runtimeCacheStatus, "verified");
  assert.deepEqual(configured.runtime, installed.runtimeIdentity);
  assert.equal(fetchAttempts, 0);
  const parsed = JSON.parse(await fsp.readFile(config, "utf8"));
  assert.deepEqual(parsed.mcpServers.aas.args, [
    core.cache.runtimeMcpPath({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity }),
    "--cache-root",
    cacheRoot,
  ]);
});

test("mcp configure fails closed on incomplete, missing, or changed cached runtime identity", async (t) => {
  const root = await temp(t);
  const cacheRoot = path.join(root, "cache");
  const config = path.join(root, ".mcp.json");
  const initialConfig = '{"mcpServers":{}}\n';
  await fsp.writeFile(config, initialConfig, { mode: 0o600 });
  const fixture = releaseFixture();
  const base = { host: "claude", scope: "project", config, "cache-root": cacheRoot, version: "14.6.0" };
  await assert.rejects(
    mcpConfigure({ ...base, "runtime-integrity": fixture.integrity }),
    (error) => error.code === "AAS_CLI_RUNTIME_IDENTITY_INCOMPLETE",
  );
  await assert.rejects(
    mcpConfigure({ ...base, "runtime-closure-digest": core.sha256("missing") }),
    (error) => error.code === "AAS_CLI_RUNTIME_IDENTITY_INCOMPLETE",
  );
  await assert.rejects(
    mcpConfigure({ ...base, "runtime-integrity": fixture.integrity, "runtime-closure-digest": core.sha256("missing") }),
    (error) => error.code === "AAS_RUNTIME_NOT_VERIFIED" && error.details.status === "missing",
  );
  const installed = await core.cache.installRuntimeFromRegistry({
    cacheRoot,
    version: "14.6.0",
    expectedIntegrity: fixture.integrity,
    fetcher: fixture.fetcher,
  });
  const options = {
    ...base,
    "runtime-integrity": fixture.integrity,
    "runtime-closure-digest": installed.runtimeIdentity.closureDigest,
  };
  const preview = await mcpConfigure(options);
  await fsp.appendFile(core.cache.runtimeMcpPath({ cacheRoot, packageVersion: "14.6.0", integrity: fixture.integrity }), "tamper");
  await assert.rejects(
    mcpConfigure({ ...options, approve: preview.approvalDigest }),
    (error) => error.code === "AAS_RUNTIME_NOT_VERIFIED" && error.details.status === "invalid",
  );
  assert.equal(await fsp.readFile(config, "utf8"), initialConfig);
});

test("mcp configure rejects relative machine paths and a registry identity change", async (t) => {
  const root = await temp(t);
  const config = path.join(root, "config.toml");
  await fsp.writeFile(config, "");
  const fixture = releaseFixture();
  await assert.rejects(mcpConfigure({ host: "codex", scope: "project", config: "config.toml", "cache-root": path.join(root, "cache") }, { fetcher: fixture.fetcher }), (error) => error.code === "AAS_CLI_ABSOLUTE_PATH_REQUIRED");
  await assert.rejects(core.cache.installRuntimeFromRegistry({ cacheRoot: path.join(root, "cache"), version: "14.6.0", expectedIntegrity: `sha512-${Buffer.alloc(64).toString("base64")}`, fetcher: fixture.fetcher }), (error) => error.code === "AAS_RUNTIME_RELEASE_CHANGED");
  assert.equal(fs.existsSync(path.join(root, "cache")), false);
});

test("backup cleanup has a path-redacted exact approval and preserves retained records", async (t) => {
  const root = await temp(t);
  const cacheRoot = path.join(root, "cache");
  const config = path.join(root, ".mcp.json");
  const backups = path.join(root, "backups");
  await fsp.writeFile(config, '{"mcpServers":{}}\n', { mode: 0o600 });
  const fixture = releaseFixture();
  const options = { host: "claude", scope: "user", config, "cache-root": cacheRoot, "backup-dir": backups, version: "14.6.0" };
  let preview = await mcpConfigure(options, { fetcher: fixture.fetcher });
  await mcpConfigure({ ...options, approve: preview.approvalDigest }, { fetcher: fixture.fetcher });
  await fsp.writeFile(config, '{"mcpServers":{},"changed":true}\n', { mode: 0o600 });
  preview = await mcpConfigure(options, { fetcher: fixture.fetcher });
  await mcpConfigure({ ...options, approve: preview.approvalDigest }, { fetcher: fixture.fetcher });
  const cleanupOptions = { config, "backup-dir": backups, keep: "1" };
  const cleanupPreview = await mcpBackupCleanup(cleanupOptions);
  assert.equal(cleanupPreview.removeCount, 1);
  assert.ok(!JSON.stringify(cleanupPreview).includes(config));
  await assert.rejects(mcpBackupCleanup({ ...cleanupOptions, approve: core.sha256("wrong") }), (error) => error.code === "AAS_ADAPTER_APPROVAL_MISMATCH");
  await fsp.writeFile(config, '{"mcpServers":{},"changed":2}\n', { mode: 0o600 });
  preview = await mcpConfigure(options, { fetcher: fixture.fetcher });
  await mcpConfigure({ ...options, approve: preview.approvalDigest }, { fetcher: fixture.fetcher });
  await assert.rejects(mcpBackupCleanup({ ...cleanupOptions, approve: cleanupPreview.approvalDigest }), (error) => error.code === "AAS_ADAPTER_APPROVAL_MISMATCH");
  const freshCleanup = await mcpBackupCleanup(cleanupOptions);
  const cleaned = await mcpBackupCleanup({ ...cleanupOptions, approve: freshCleanup.approvalDigest });
  assert.equal(cleaned.removedCount, 2);
  assert.equal(cleaned.retained, 1);
});
