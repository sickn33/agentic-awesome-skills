"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { after, before, test } = require("node:test");
const { canonicalJson, sha256 } = require("../../lib/aas-v1/canonical-json");
const {
  CATALOG_MANIFEST_PATH,
  CATALOG_ASSET_PATHS,
  REGISTRY_ORIGIN,
  catalogStatus,
  createVerifiedCatalogResolver,
  updateCatalogFromRegistry,
  verifySri,
} = require("../../lib/aas-v1/cache");

const ROOT = path.resolve(__dirname, "../../..");
const packageMetadata = require(path.join(ROOT, "package.json"));
const TARBALL_URL = `${REGISTRY_ORIGIN}/${packageMetadata.name}/-/${packageMetadata.name}-${packageMetadata.version}.tgz`;

let fixtureRoot;
let archiveBytes;
let archiveIntegrity;

function npmIntegrity(bytes) {
  return `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`;
}

async function makeAlternateBundledCatalog(sourceRoot, destinationRoot) {
  await fsp.cp(sourceRoot, destinationRoot, { recursive: true });
  const manifestPath = path.join(destinationRoot, ...CATALOG_MANIFEST_PATH.split("/"));
  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
  const changedPath = "data/plugin-compatibility.json";
  const changedFile = path.join(destinationRoot, ...changedPath.split("/"));
  await fsp.appendFile(changedFile, "\n");
  const bytes = await fsp.readFile(changedFile);
  const asset = manifest.assets.find((entry) => entry.path === changedPath);
  asset.size = bytes.length;
  asset.sha256 = sha256(bytes);
  const records = manifest.assets
    .map(({ path: assetPath, size, sha256: digest }) => ({ path: assetPath, size, sha256: digest }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  manifest.catalogDigest = sha256(canonicalJson({ digestVersion: manifest.digestVersion, assets: records }));
  await fsp.writeFile(manifestPath, `${canonicalJson(manifest)}\n`);
  return manifest.catalogDigest;
}

before(async () => {
  fixtureRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "aas-v1-update-test-"));
  const packDirectory = path.join(fixtureRoot, "pack");
  await fsp.mkdir(packDirectory, { mode: 0o700 });
  execFileSync("npm", ["pack", "--ignore-scripts", "--pack-destination", packDirectory, "--silent"], {
    cwd: ROOT,
    env: { ...process.env, npm_config_cache: path.join(fixtureRoot, "npm-cache") },
    stdio: "ignore",
  });
  const archivePath = path.join(packDirectory, `${packageMetadata.name}-${packageMetadata.version}.tgz`);
  archiveBytes = await fsp.readFile(archivePath);
  archiveIntegrity = npmIntegrity(archiveBytes);
});

after(async () => {
  if (fixtureRoot) await fsp.rm(fixtureRoot, { recursive: true, force: true });
});

test("npm dist.integrity accepts the exact package and rejects changed bytes", () => {
  assert.doesNotThrow(() => verifySri(archiveBytes, archiveIntegrity));
  const changed = Buffer.from(archiveBytes);
  changed[changed.length - 1] ^= 1;
  assert.throws(
    () => verifySri(changed, archiveIntegrity),
    (error) => error.code === "AAS_UPDATE_DIST_INTEGRITY_MISMATCH",
  );
});

test("an SRI failure leaves the cache absent", async (t) => {
  const testRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "aas-v1-update-sri-fail-"));
  t.after(() => fsp.rm(testRoot, { recursive: true, force: true }));
  const cacheRoot = path.join(testRoot, "cache");
  const wrongIntegrity = `sha512-${Buffer.alloc(64, 0).toString("base64")}`;
  const fetcher = async (url) => {
    if (url === `${REGISTRY_ORIGIN}/${packageMetadata.name}/${packageMetadata.version}`) {
      return Buffer.from(JSON.stringify({ dist: { integrity: wrongIntegrity, tarball: TARBALL_URL } }));
    }
    if (url === TARBALL_URL) return archiveBytes;
    throw new Error(`unexpected mocked registry URL: ${url}`);
  };

  await assert.rejects(
    updateCatalogFromRegistry({ cacheRoot, version: packageMetadata.version, fetcher }),
    (error) => error.code === "AAS_UPDATE_DIST_INTEGRITY_MISMATCH",
  );
  assert.equal(fs.existsSync(cacheRoot), false);
});

test("the mocked npm registry promotes, verifies, resolves, and reuses the real package catalog", async (t) => {
  const testRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "aas-v1-update-success-"));
  t.after(() => fsp.rm(testRoot, { recursive: true, force: true }));
  const cacheRoot = path.join(testRoot, "cache");
  const calls = [];
  const fetcher = async (url, maximumBytes) => {
    calls.push({ url, maximumBytes });
    if (url === `${REGISTRY_ORIGIN}/${packageMetadata.name}/${packageMetadata.version}`) {
      return Buffer.from(JSON.stringify({
        dist: {
          integrity: archiveIntegrity,
          tarball: TARBALL_URL,
          signatures: [{ keyid: "fixture", sig: "fixture" }],
          attestations: { url: "fixture" },
        },
      }));
    }
    if (url === TARBALL_URL) return archiveBytes;
    throw new Error(`unexpected mocked registry URL: ${url}`);
  };

  const result = await updateCatalogFromRegistry({ cacheRoot, version: packageMetadata.version, fetcher });
  assert.equal(result.ok, true);
  assert.equal(result.status, "promoted");
  assert.equal(result.identity.integrity, archiveIntegrity);
  assert.equal(result.provenance.registryOrigin, REGISTRY_ORIGIN);
  assert.equal(result.provenance.signaturesPresent, true);
  assert.equal(result.provenance.attestationsPresent, true);
  assert.deepEqual(calls, [
    { url: `${REGISTRY_ORIGIN}/${packageMetadata.name}/${packageMetadata.version}`, maximumBytes: 2 * 1024 * 1024 },
    { url: TARBALL_URL, maximumBytes: 64 * 1024 * 1024 },
  ]);

  const status = await catalogStatus({
    cacheRoot,
    packageVersion: packageMetadata.version,
    catalogDigest: result.identity.catalogDigest,
    integrity: archiveIntegrity,
  });
  assert.equal(status.status, "verified");
  assert.equal(status.identity.controls.length, 1);
  assert.equal(status.identity.controls[0].path, CATALOG_MANIFEST_PATH);
  assert.equal(status.identity.assets.length, CATALOG_ASSET_PATHS.length);

  const alternateRoot = path.join(testRoot, "alternate-bundled");
  const alternateDigest = await makeAlternateBundledCatalog(status.targetPath, alternateRoot);
  assert.notEqual(alternateDigest, result.identity.catalogDigest);
  const resolveCatalog = createVerifiedCatalogResolver({ cacheRoot, bundledRoot: alternateRoot });
  const resolved = await resolveCatalog(result.identity.catalogDigest);
  assert.ok(resolved);
  assert.equal(resolved.digest, result.identity.catalogDigest);
  assert.equal(resolved.skills.length, 1965);

  const beforeRepeat = JSON.stringify(status.identity);
  calls.length = 0;
  const repeated = await updateCatalogFromRegistry({ cacheRoot, version: packageMetadata.version, fetcher });
  assert.equal(repeated.status, "alreadyPresent");
  const repeatedStatus = await catalogStatus({
    cacheRoot,
    packageVersion: packageMetadata.version,
    catalogDigest: result.identity.catalogDigest,
    integrity: archiveIntegrity,
  });
  assert.equal(repeatedStatus.status, "verified");
  assert.equal(JSON.stringify(repeatedStatus.identity), beforeRepeat);
});
