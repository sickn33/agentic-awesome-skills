#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { readTarballManifest } = require("./distribution_pack.cjs");
const { digest, createManifest, verifyManifest } = require("../lib/distribution-artifact");
function lockfileDigest(root) {
  // Bind the immutable Git bytes, independent of checkout line-ending conversion.
  return digest(execFileSync("git", ["show", "HEAD:package-lock.json"], { cwd: root }));
}
function main(argv, env = process.env) {
  const [mode, directory, runId, runAttempt] = argv;
  if (!["create", "verify", "create-runtime", "verify-runtime"].includes(mode) || !directory || argv.length !== 4)
    throw new Error("Usage: distribution_manifest.cjs create|verify|create-runtime|verify-runtime DIRECTORY RUN_ID RUN_ATTEMPT");
  const creating = mode.startsWith("create"), scope = mode.endsWith("-runtime") ? "runtime" : "distribution";
  const root = path.resolve(__dirname, "../..");
  const runtime = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  const expected = {
    commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    version: runtime.version,
    runId, runAttempt, repository: env.GITHUB_REPOSITORY,
    workflow: ".github/workflows/distribution-candidate.yml",
    lockfileDigest: lockfileDigest(root),
  };
  const manifestPath = path.join(directory, scope === "runtime" ? "runtime.json" : "distribution.json");
  // Preserve structural/digest validation before reading any archive contents.
  const manifest = creating ? createManifest(directory, expected, scope)
    : JSON.parse(fs.readFileSync(manifestPath));
  if (!creating) verifyManifest(directory, manifest, expected, scope);
  // Digest equality alone does not prove the npm installer can resolve this release.
  const packed = readTarballManifest(path.join(directory, "package.tgz"));
  if (packed?.gitHead !== expected.commit)
    throw new Error("Candidate gitHead is missing or differs from the immutable release commit");
  if (packed.name !== runtime.name) throw new Error("Candidate package name differs from the runtime package");
  if (packed.version !== expected.version) throw new Error("Candidate package version differs from the release version");
  if (creating) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { main, lockfileDigest };
