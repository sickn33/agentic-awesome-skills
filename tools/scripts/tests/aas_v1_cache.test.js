"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  CATALOG_IDENTITY_FILE,
  catalogCachePath,
  catalogStatus,
  filesystemSafeIntegrityKey,
  promoteCatalogDirectory,
  runtimeCachePath,
  scanDataDirectory,
  validateCatalogIdentity,
} = require("../../lib/aas-v1/cache");

const INTEGRITY = `sha512-${Buffer.alloc(64, 0xab).toString("base64")}`;
const ALLOWLIST = ["data/catalog.json", "data/plugin-compatibility.json"];

async function makeDirectory(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeAsset(root, relativePath, content = "{}\n", mode = 0o644) {
  const target = path.join(root, ...relativePath.split("/"));
  await fsp.mkdir(path.dirname(target), { recursive: true, mode: 0o755 });
  await fsp.writeFile(target, content, { mode });
  await fsp.chmod(target, mode);
}

async function makeValidSource(prefix = "aas-cache-source-") {
  const sourceDir = await makeDirectory(prefix);
  await writeAsset(sourceDir, ALLOWLIST[0], '[{"id":"alpha"}]\n');
  await writeAsset(sourceDir, ALLOWLIST[1], '{"alpha":{"codex":"supported"}}\n');
  return sourceDir;
}

async function identityFor(sourceDir, allowlist = ALLOWLIST, extra = {}) {
  const scan = await scanDataDirectory({ sourceDir, allowlist });
  return {
    schemaVersion: 1,
    package: "agentic-awesome-skills",
    version: "14.6.0",
    integrity: INTEGRITY,
    catalogDigest: scan.catalogDigest,
    ...extra,
  };
}

async function snapshotTree(root) {
  try {
    await fsp.lstat(root);
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    throw error;
  }
  const records = [];
  async function walk(relativeDirectory) {
    const directory = relativeDirectory ? path.join(root, relativeDirectory) : root;
    const entries = await fsp.readdir(directory);
    entries.sort();
    for (const name of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const absolutePath = path.join(root, relativePath);
      const stat = await fsp.lstat(absolutePath);
      if (stat.isDirectory()) {
        records.push([relativePath, "directory", stat.mode & 0o7777]);
        await walk(relativePath);
      } else if (stat.isFile()) {
        records.push([relativePath, "file", stat.mode & 0o7777, (await fsp.readFile(absolutePath)).toString("base64")]);
      } else if (stat.isSymbolicLink()) {
        records.push([relativePath, "symlink", await fsp.readlink(absolutePath)]);
      } else {
        records.push([relativePath, "special", stat.mode & 0o170000]);
      }
    }
  }
  await walk("");
  return JSON.stringify(records);
}

async function assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir, allowlist, limits, code }) {
  const before = await snapshotTree(cacheRoot);
  await assert.rejects(
    promoteCatalogDirectory({
      cacheRoot,
      sourceDir,
      allowlist,
      limits,
      identity: {
        schemaVersion: 1,
        package: "agentic-awesome-skills",
        version: "14.6.0",
        integrity: INTEGRITY,
        catalogDigest: `sha256-${"0".repeat(64)}`,
      },
    }),
    (error) => !code || error.code === code,
  );
  assert.equal(await snapshotTree(cacheRoot), before);
}

test("npm SRI has one canonical filesystem-safe key and layouts are content-addressed", () => {
  const key = filesystemSafeIntegrityKey(INTEGRITY);
  assert.equal(key, `sha512-${Buffer.alloc(64, 0xab).toString("base64url")}`);
  assert.equal(runtimeCachePath({ cacheRoot: "/cache", packageVersion: "14.6.0", integrity: INTEGRITY }), `/cache/runtimes/14.6.0/${key}`);
  const digest = `sha256-${"1".repeat(64)}`;
  assert.equal(catalogCachePath({ cacheRoot: "/cache", packageVersion: "14.6.0", catalogDigest: digest }), `/cache/catalogs/14.6.0/${digest}`);
  assert.throws(() => filesystemSafeIntegrityKey(`sha512-${Buffer.alloc(63).toString("base64")}`), (error) => error.code === "AAS_CACHE_INTEGRITY_INVALID");
  assert.throws(() => validateCatalogIdentity({ schemaVersion: 1, package: "evil", version: "14.6.0", integrity: INTEGRITY, catalogDigest: digest }), (error) => error.code === "AAS_CACHE_IDENTITY_INVALID");
});

test("catalog status is read-only and does not create a missing cache root", async (t) => {
  const parent = await makeDirectory("aas-cache-status-");
  t.after(() => fsp.rm(parent, { recursive: true, force: true }));
  const cacheRoot = path.join(parent, "not-created");
  const result = await catalogStatus({ cacheRoot, packageVersion: "14.6.0", catalogDigest: `sha256-${"2".repeat(64)}` });
  assert.equal(result.status, "missing");
  await assert.rejects(fsp.lstat(cacheRoot), (error) => error.code === "ENOENT");
});

test("a verified data-only catalog is staged, atomically promoted, and idempotent", async (t) => {
  const parent = await makeDirectory("aas-cache-valid-");
  const sourceDir = await makeValidSource();
  const cacheRoot = path.join(parent, "cache");
  t.after(() => Promise.all([fsp.rm(parent, { recursive: true, force: true }), fsp.rm(sourceDir, { recursive: true, force: true })]));
  const identity = await identityFor(sourceDir);
  const promoted = await promoteCatalogDirectory({ cacheRoot, sourceDir, allowlist: ALLOWLIST, identity });
  assert.equal(promoted.status, "promoted");
  assert.ok(promoted.targetPath.startsWith(path.join(cacheRoot, "catalogs", "14.6.0")));
  assert.equal((await catalogStatus({ cacheRoot, packageVersion: "14.6.0", catalogDigest: identity.catalogDigest, integrity: INTEGRITY })).status, "verified");
  const before = await snapshotTree(cacheRoot);
  const repeated = await promoteCatalogDirectory({ cacheRoot, sourceDir, allowlist: [...ALLOWLIST].reverse(), identity });
  assert.equal(repeated.status, "alreadyPresent");
  assert.equal(await snapshotTree(cacheRoot), before);
});

test("tampering invalidates catalog identity without status writes", async (t) => {
  const parent = await makeDirectory("aas-cache-tamper-");
  const sourceDir = await makeValidSource();
  const cacheRoot = path.join(parent, "cache");
  t.after(() => Promise.all([fsp.rm(parent, { recursive: true, force: true }), fsp.rm(sourceDir, { recursive: true, force: true })]));
  const identity = await identityFor(sourceDir);
  const promoted = await promoteCatalogDirectory({ cacheRoot, sourceDir, allowlist: ALLOWLIST, identity });
  await fsp.chmod(path.join(promoted.targetPath, ALLOWLIST[0]), 0o644);
  await fsp.writeFile(path.join(promoted.targetPath, ALLOWLIST[0]), "tampered\n");
  const before = await snapshotTree(cacheRoot);
  const result = await catalogStatus({ cacheRoot, packageVersion: identity.version, catalogDigest: identity.catalogDigest, integrity: INTEGRITY });
  assert.equal(result.status, "invalid");
  assert.equal(await snapshotTree(cacheRoot), before);
  assert.equal(path.basename(path.join(promoted.targetPath, CATALOG_IDENTITY_FILE)), CATALOG_IDENTITY_FILE);
});

test("traversal, absolute paths, extra files, permissions, and expansion limits leave cache unchanged", async (t) => {
  const parent = await makeDirectory("aas-cache-hostile-basic-");
  const cacheRoot = path.join(parent, "cache");
  await fsp.mkdir(cacheRoot, { mode: 0o700 });
  await fsp.writeFile(path.join(cacheRoot, "sentinel"), "unchanged");
  const sources = [];
  t.after(() => Promise.all([fsp.rm(parent, { recursive: true, force: true }), ...sources.map((entry) => fsp.rm(entry, { recursive: true, force: true }))]));

  const valid = await makeValidSource(); sources.push(valid);
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: valid, allowlist: ["../escape"], code: "AAS_CACHE_ASSET_PATH_INVALID" });
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: valid, allowlist: [path.resolve(valid, "data/catalog.json")], code: "AAS_CACHE_ASSET_PATH_INVALID" });

  const extra = await makeValidSource(); sources.push(extra);
  await writeAsset(extra, "data/not-allowed.json");
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: extra, allowlist: ALLOWLIST, code: "AAS_CACHE_ASSET_NOT_ALLOWED" });

  const executable = await makeValidSource(); sources.push(executable);
  await fsp.chmod(path.join(executable, ALLOWLIST[0]), 0o755);
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: executable, allowlist: ALLOWLIST, code: "AAS_CACHE_MODE_UNSAFE" });

  const oversized = await makeValidSource(); sources.push(oversized);
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: oversized, allowlist: ALLOWLIST, limits: { maxFileBytes: 4 }, code: "AAS_CACHE_FILE_LIMIT" });
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: oversized, allowlist: ALLOWLIST, limits: { maxEntries: 1 }, code: "AAS_CACHE_ENTRY_LIMIT" });
});

test("symlinks, hardlinks, special files, and Unicode/case collisions leave cache unchanged", async (t) => {
  const parent = await makeDirectory("aas-cache-hostile-types-");
  const cacheRoot = path.join(parent, "cache");
  await fsp.mkdir(cacheRoot, { mode: 0o700 });
  await fsp.writeFile(path.join(cacheRoot, "sentinel"), "unchanged");
  const sources = [];
  t.after(() => Promise.all([fsp.rm(parent, { recursive: true, force: true }), ...sources.map((entry) => fsp.rm(entry, { recursive: true, force: true }))]));

  const symlinkSource = await makeValidSource(); sources.push(symlinkSource);
  await fsp.rm(path.join(symlinkSource, ALLOWLIST[0]));
  await fsp.symlink(path.join(symlinkSource, ALLOWLIST[1]), path.join(symlinkSource, ALLOWLIST[0]));
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: symlinkSource, allowlist: ALLOWLIST, code: "AAS_CACHE_LINK_FORBIDDEN" });

  const hardlinkSource = await makeValidSource(); sources.push(hardlinkSource);
  await fsp.rm(path.join(hardlinkSource, ALLOWLIST[0]));
  await fsp.link(path.join(hardlinkSource, ALLOWLIST[1]), path.join(hardlinkSource, ALLOWLIST[0]));
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: hardlinkSource, allowlist: ALLOWLIST, code: "AAS_CACHE_HARDLINK_FORBIDDEN" });

  const socketSource = await makeDirectory("aas-cache-socket-"); sources.push(socketSource);
  await fsp.mkdir(path.join(socketSource, "data"), { mode: 0o755 });
  const socketPath = path.join(socketSource, "data", "catalog.sock");
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(socketPath, resolve));
  try {
    await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir: socketSource, allowlist: ["data/catalog.sock"], code: "AAS_CACHE_SPECIAL_FILE_FORBIDDEN" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const collisionSource = await makeValidSource(); sources.push(collisionSource);
  await assertHostileLeavesCacheUnchanged({
    cacheRoot,
    sourceDir: collisionSource,
    allowlist: ["data/catalog.json", "data/catalog.json"],
    code: "AAS_CACHE_PATH_COLLISION",
  });
  await assertHostileLeavesCacheUnchanged({
    cacheRoot,
    sourceDir: collisionSource,
    allowlist: ["data/CATALOG.json", "data/catalog.json"],
    code: "AAS_CACHE_PATH_COLLISION",
  });
  await assertHostileLeavesCacheUnchanged({
    cacheRoot,
    sourceDir: collisionSource,
    allowlist: ["data/caf\u00e9.json", "data/cafe\u0301.json"],
    code: "AAS_CACHE_PATH_COLLISION",
  });
});

test("a digest mismatch is rejected before creating a cache root", async (t) => {
  const parent = await makeDirectory("aas-cache-digest-mismatch-");
  const sourceDir = await makeValidSource();
  const cacheRoot = path.join(parent, "cache");
  t.after(() => Promise.all([fsp.rm(parent, { recursive: true, force: true }), fsp.rm(sourceDir, { recursive: true, force: true })]));
  await assertHostileLeavesCacheUnchanged({ cacheRoot, sourceDir, allowlist: ALLOWLIST, code: "AAS_CACHE_CATALOG_DIGEST_MISMATCH" });
  assert.equal(fs.existsSync(cacheRoot), false);
});
