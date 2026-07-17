"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { canonicalJson } = require("../canonical-json");
const { parsePackageArchive } = require("./archive");
const { cacheError, parseNpmIntegrity, validatePackageVersion } = require("./identity");
const { promoteCatalogDirectory } = require("./promote");

const PACKAGE_NAME = "agentic-awesome-skills";
const REGISTRY_ORIGIN = "https://registry.npmjs.org";
const CATALOG_MANIFEST_PATH = "data/aas-v1/catalog-manifest.v1.json";
const CATALOG_ASSET_PATHS = Object.freeze([
  "data/aas-v1/skill-content-index.v1.json",
  "data/aas-v1/skill-content.v1.ndjson",
  "data/catalog.json",
  "data/plugin-compatibility.json",
  "tools/lib/aas-v1/metadata-reviews.v1.json",
  "tools/lib/aas-v1/metadata-overrides.v1.json",
  "tools/lib/aas-v1/ontology.v1.json",
]);

function fetchBytes(url, maximumBytes, request = https.get) {
  const parsed = new URL(url);
  if (parsed.origin !== REGISTRY_ORIGIN || parsed.protocol !== "https:") {
    return Promise.reject(cacheError("AAS_UPDATE_REGISTRY_URL_INVALID", "registry URL is outside the pinned npm origin"));
  }
  return new Promise((resolve, reject) => {
    const call = request(parsed, {
      headers: { accept: "application/json", "user-agent": "agentic-awesome-skills/catalog-updater-v1" },
      timeout: 15000,
    }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(cacheError("AAS_UPDATE_HTTP_STATUS", `registry returned ${response.statusCode}`));
        return;
      }
      const chunks = [];
      let total = 0;
      response.on("data", (chunk) => {
        total += chunk.length;
        if (total > maximumBytes) {
          response.destroy(cacheError("AAS_UPDATE_DOWNLOAD_LIMIT", "registry response exceeded its byte limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    call.on("timeout", () => call.destroy(cacheError("AAS_UPDATE_TIMEOUT", "registry request timed out")));
    call.on("error", reject);
  });
}

function verifySri(bytes, integrity) {
  const parsed = parseNpmIntegrity(integrity);
  const actual = crypto.createHash(parsed.algorithm).update(bytes).digest();
  if (actual.length !== parsed.bytes.length || !crypto.timingSafeEqual(actual, parsed.bytes)) {
    throw cacheError("AAS_UPDATE_DIST_INTEGRITY_MISMATCH", "downloaded tarball does not match npm dist.integrity");
  }
}

function validateCatalogManifest(bytes, version) {
  const text = bytes.toString("utf8");
  const manifest = JSON.parse(text);
  if (`${canonicalJson(manifest)}\n` !== text || manifest.schemaVersion !== 1 || manifest.digestVersion !== 1
    || manifest.package !== PACKAGE_NAME || manifest.packageVersion !== version || manifest.skillCount !== 1965
    || !/^sha256-[a-f0-9]{64}$/.test(manifest.catalogDigest) || !Array.isArray(manifest.assets)) {
    throw cacheError("AAS_UPDATE_CATALOG_MANIFEST_INVALID", "catalog manifest is invalid or incompatible");
  }
  const paths = manifest.assets.map((asset) => asset.path).sort();
  if (canonicalJson(paths) !== canonicalJson([...CATALOG_ASSET_PATHS].sort())) {
    throw cacheError("AAS_UPDATE_CATALOG_ALLOWLIST_MISMATCH", "release catalog assets do not match the v1 allowlist");
  }
  return manifest;
}

function materializeSelected(entries) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aas-catalog-update-"));
  try {
    for (const entry of entries) {
      const relative = entry.path.replace(/^package\//, "");
      const output = path.join(directory, ...relative.split("/"));
      fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
      fs.writeFileSync(output, entry.bytes, { mode: 0o600, flag: "wx" });
    }
    return directory;
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

async function updateCatalogFromRegistry({ cacheRoot, version, fetcher = fetchBytes }) {
  const packageVersion = validatePackageVersion(version);
  const metadataUrl = `${REGISTRY_ORIGIN}/${PACKAGE_NAME}/${packageVersion}`;
  const metadataBytes = await fetcher(metadataUrl, 2 * 1024 * 1024);
  let metadata;
  try { metadata = JSON.parse(metadataBytes.toString("utf8")); } catch {
    throw cacheError("AAS_UPDATE_PACKUMENT_INVALID", "registry metadata is invalid JSON");
  }
  const dist = metadata?.dist;
  if (!dist || typeof dist.integrity !== "string" || typeof dist.tarball !== "string") {
    throw cacheError("AAS_UPDATE_PACKUMENT_INVALID", "registry metadata lacks dist identity");
  }
  const tarballUrl = new URL(dist.tarball);
  if (tarballUrl.origin !== REGISTRY_ORIGIN || tarballUrl.protocol !== "https:") {
    throw cacheError("AAS_UPDATE_TARBALL_URL_INVALID", "registry tarball URL is outside the pinned origin");
  }
  const archiveBytes = await fetcher(tarballUrl.href, 64 * 1024 * 1024);
  verifySri(archiveBytes, dist.integrity);
  const selectedPaths = [CATALOG_MANIFEST_PATH, ...CATALOG_ASSET_PATHS].map((asset) => `package/${asset}`);
  const parsed = parsePackageArchive(archiveBytes, { selectPaths: selectedPaths });
  const byPath = new Map(parsed.entries.map((entry) => [entry.path.replace(/^package\//, ""), entry]));
  const manifest = validateCatalogManifest(byPath.get(CATALOG_MANIFEST_PATH).bytes, packageVersion);
  const sourceDir = materializeSelected(parsed.entries);
  try {
    const promoted = await promoteCatalogDirectory({
      cacheRoot,
      sourceDir,
      allowlist: CATALOG_ASSET_PATHS,
      controlPaths: [CATALOG_MANIFEST_PATH],
      identity: {
        schemaVersion: 1,
        package: PACKAGE_NAME,
        version: packageVersion,
        integrity: dist.integrity,
        catalogDigest: manifest.catalogDigest,
      },
      limits: { maxFiles: 16, maxEntries: 32, maxFileBytes: 32 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024, maxDepth: 8 },
    });
    return {
      ok: true,
      status: promoted.status,
      identity: promoted.identity,
      provenance: {
        registryOrigin: REGISTRY_ORIGIN,
        distIntegrity: dist.integrity,
        signaturesPresent: Array.isArray(dist.signatures) && dist.signatures.length > 0,
        attestationsPresent: Boolean(dist.attestations),
      },
    };
  } finally {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
}

module.exports = {
  CATALOG_ASSET_PATHS,
  CATALOG_MANIFEST_PATH,
  PACKAGE_NAME,
  REGISTRY_ORIGIN,
  fetchBytes,
  updateCatalogFromRegistry,
  validateCatalogManifest,
  verifySri,
};
