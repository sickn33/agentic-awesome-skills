#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const verificationRoot = path.resolve(here, "..", "..");
const manifestPath = path.join(verificationRoot, "baseline", "v1", "freeze-manifest.json");
const write = process.argv.includes("--write");
const excludedPrefixes = [
  "verifier/node_modules/",
  "baseline/v1/legacy/14.6.0/_work/",
];

function relativePath(target) {
  return path.relative(verificationRoot, target).split(path.sep).join("/");
}

function isExcluded(target, { directory = false } = {}) {
  const relative = relativePath(target);
  const candidate = directory ? `${relative}/` : relative;
  return excludedPrefixes.some((prefix) => candidate.startsWith(prefix));
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (isExcluded(target, { directory: true })) return [];
        return walk(target);
      }
      if (!entry.isFile()) throw new Error(`Non-regular baseline entry: ${target}`);
      return [target];
    })
    .sort();
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const files = walk(verificationRoot)
  .filter((file) => file !== manifestPath)
  .filter((file) => !isExcluded(file))
  .map((file) => {
    const bytes = fs.readFileSync(file);
    return {
      path: relativePath(file),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
const rootDigest = sha256(Buffer.from(JSON.stringify(files)));
const candidate = {
  schemaVersion: 1,
  baselineVersion: "1.0.1",
  status: "frozen",
  digestAlgorithm: "sha256",
  excludedPaths: ["baseline/v1/freeze-manifest.json", ...excludedPrefixes],
  rootDigest: `sha256-${rootDigest}`,
  fileCount: files.length,
  files,
};

if (write) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(candidate, null, 2)}\n`, { mode: 0o644 });
  console.log(JSON.stringify({ ok: true, wrote: path.relative(verificationRoot, manifestPath), fileCount: files.length, rootDigest: candidate.rootDigest }, null, 2));
  process.exit(0);
}

if (!fs.existsSync(manifestPath)) {
  console.error(JSON.stringify({ ok: false, code: "AAS_BASELINE_FREEZE_MANIFEST_MISSING" }, null, 2));
  process.exit(2);
}
const expected = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (JSON.stringify(expected) !== JSON.stringify(candidate)) {
  const expectedByPath = new Map((expected.files || []).map((entry) => [entry.path, entry]));
  const actualByPath = new Map(files.map((entry) => [entry.path, entry]));
  const changed = [...new Set([...expectedByPath.keys(), ...actualByPath.keys()])]
    .filter((file) => JSON.stringify(expectedByPath.get(file)) !== JSON.stringify(actualByPath.get(file)))
    .sort();
  console.error(JSON.stringify({
    ok: false,
    code: "AAS_BASELINE_FREEZE_DIGEST_MISMATCH",
    expectedRootDigest: expected.rootDigest,
    actualRootDigest: candidate.rootDigest,
    changed,
  }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, fileCount: files.length, rootDigest: candidate.rootDigest }, null, 2));
