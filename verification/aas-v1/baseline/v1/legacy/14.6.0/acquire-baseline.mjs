#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_SHASUM,
  EXPECTED_SRI,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  canonicalize,
  sha256,
  sri512,
  runtimeReceipt,
  writeJson,
} from "./corpus-lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const artifacts = path.join(root, "artifacts");
const work = path.join(root, "_work");
const tarball = path.join(artifacts, `${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz`);
const runtime = path.join(work, "runtime");
const cache = path.join(work, "npm-cache");
const offline = process.argv.includes("--offline");
const metadataUrl = `https://registry.npmjs.org/${PACKAGE_NAME}/${PACKAGE_VERSION}`;
const expectedTarballUrl = `https://registry.npmjs.org/${PACKAGE_NAME}/-/${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz`;
const metadataPath = path.join(artifacts, "registry-metadata.json");
const previousMetadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath, "utf8")) : null;
let acquiredMetadata = previousMetadata;

function verifyTarball(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing acquired tarball: ${file}`);
  const bytes = fs.readFileSync(file);
  const observed = sri512(bytes);
  if (observed !== EXPECTED_SRI) throw new Error(`SRI mismatch: expected ${EXPECTED_SRI}, observed ${observed}`);
  return { bytes, sha256: sha256(bytes), sri: observed };
}

async function fetchBounded(url, maximumBytes) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.origin !== "https://registry.npmjs.org") {
    throw new Error(`Untrusted acquisition origin: ${parsed.origin}`);
  }
  const response = await fetch(parsed, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || response.url !== parsed.href) throw new Error(`Registry request failed: ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) throw new Error("Registry response exceeds the declared size limit");
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maximumBytes) throw new Error("Registry response exceeded the streaming size limit");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function downloadVerified() {
  const metadata = JSON.parse((await fetchBounded(metadataUrl, 1024 * 1024)).toString("utf8"));
  if (metadata?.dist?.integrity !== EXPECTED_SRI || metadata?.dist?.shasum !== EXPECTED_SHASUM) {
    throw new Error("Registry metadata does not match the independently frozen integrity identity");
  }
  if (metadata.dist.tarball !== expectedTarballUrl) throw new Error("Registry metadata returned an unexpected tarball URL");
  const bytes = await fetchBounded(metadata.dist.tarball, 1024 * 1024);
  if (sri512(bytes) !== EXPECTED_SRI) throw new Error("Downloaded tarball failed frozen SRI verification");
  fs.mkdirSync(artifacts, { recursive: true });
  const temporary = path.join(work, "download.tgz");
  fs.mkdirSync(work, { recursive: true, mode: 0o700 });
  fs.writeFileSync(temporary, bytes, { mode: 0o600 });
  fs.renameSync(temporary, tarball);
  acquiredMetadata = {
    schemaVersion: 1,
    package: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    distIntegrity: metadata.dist.integrity,
    distShasum: metadata.dist.shasum,
    tarball: metadata.dist.tarball,
    tarballSha256: sha256(bytes),
  };
}

if (!offline) await downloadVerified();
const verified = verifyTarball(tarball);

const installedEntrypoint = path.join(runtime, "node_modules", PACKAGE_NAME, "tools", "bin", "install.js");
if (offline && !fs.existsSync(installedEntrypoint)) {
  throw new Error("Offline replay requires the previously acquired isolated runtime");
}
if (!offline) {
  fs.rmSync(runtime, { recursive: true, force: true });
  fs.mkdirSync(runtime, { recursive: true, mode: 0o700 });
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, [
    "install", "--prefix", runtime, tarball, "--ignore-scripts", "--no-audit", "--no-fund", "--cache", cache,
  ], { stdio: "inherit", env: { ...process.env, HOME: work, USERPROFILE: work } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const installed = JSON.parse(fs.readFileSync(path.join(runtime, "node_modules", PACKAGE_NAME, "package.json"), "utf8"));
if (installed.name !== PACKAGE_NAME || installed.version !== PACKAGE_VERSION) throw new Error("Installed baseline identity mismatch");
const receipt = runtimeReceipt(runtime);
if (previousMetadata?.runtimeReceipt
  && JSON.stringify(canonicalize(previousMetadata.runtimeReceipt)) !== JSON.stringify(canonicalize(receipt))) {
  throw new Error("Installed runtime closure differs from the frozen acquisition receipt");
}
if (!acquiredMetadata) throw new Error("Acquisition metadata is missing");
writeJson(metadataPath, { ...acquiredMetadata, runtimeReceipt: receipt });
process.stdout.write(`${JSON.stringify({ ok: true, offline, package: `${PACKAGE_NAME}@${PACKAGE_VERSION}`, integrity: verified.sri, sha256: verified.sha256 })}\n`);
