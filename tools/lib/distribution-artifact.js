"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const FILES = ["package.tgz", "site.tar"];
function identity(value) {
  if (!value || !/^[a-f0-9]{40}$/.test(value.commit || "")
      || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value.version || "")
      || !/^\d+$/.test(String(value.runId || ""))
      || !/^\d+$/.test(String(value.runAttempt || ""))
      || !/^[a-f0-9]{64}$/.test(value.lockfileDigest || "")
      || !/^[\w.-]+\/[\w.-]+$/.test(value.repository || "")
      || value.workflow !== ".github/workflows/distribution-candidate.yml")
    throw new Error("Invalid distribution provenance");
}
function readArtifact(root, file) {
  if (!FILES.includes(file)) throw new Error("Unknown distribution artifact");
  const target = path.join(root, file);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024) throw new Error("Unsafe distribution artifact");
  return fs.readFileSync(target);
}
function createManifest(root, provenance, scope = "distribution") {
  if (!["distribution", "runtime"].includes(scope)) throw new Error("Invalid artifact scope");
  identity(provenance);
  return { schemaVersion: 1, ...provenance, ...(scope === "runtime" ? { scope } : {}), toolchain: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch }, artifacts: (scope === "runtime" ? ["package.tgz"] : FILES).map(file => {
    const bytes = readArtifact(root, file);
    return { file, size: bytes.length, sha256: digest(bytes) };
  }) };
}
function verifyManifest(root, manifest, expected, scope = "distribution") {
  if (!["distribution", "runtime"].includes(scope) || (manifest.scope || "distribution") !== scope) throw new Error("Wrong artifact scope");
  identity(manifest); identity(expected);
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported distribution schema");
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.toolchain?.node || "") || !manifest.toolchain?.v8 || !manifest.toolchain?.platform || !manifest.toolchain?.arch) throw new Error("Missing build toolchain identity");
  for (const key of ["commit", "version", "runId", "runAttempt", "repository", "workflow", "lockfileDigest"])
    if (String(manifest[key]) !== String(expected[key])) throw new Error(`Distribution identity mismatch: ${key}`);
  const files = scope === "runtime" ? ["package.tgz"] : FILES;
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== files.length) throw new Error("Incomplete distribution artifacts");
  for (const file of files) {
    const entries = manifest.artifacts.filter(a => a.file === file);
    if (entries.length !== 1) throw new Error("Duplicate or missing distribution artifact");
    const bytes = readArtifact(root, file), entry = entries[0];
    if (bytes.length !== entry.size || digest(bytes) !== entry.sha256) throw new Error(`Distribution digest mismatch: ${file}`);
  }
  return true;
}
module.exports = { digest, createManifest, verifyManifest };
