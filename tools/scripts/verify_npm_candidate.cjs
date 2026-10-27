#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const REGISTRY = "https://registry.npmjs.org";
const MAX_RESPONSE = 32 * 1024 * 1024;

function packageIdentity(version) {
  return version.includes("-") ? "next" : "latest";
}

function candidateIntegrity(tarball) {
  const stat = fs.lstatSync(tarball);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024)
    throw new Error("Unsafe npm candidate artifact");
  return `sha512-${crypto.createHash("sha512").update(fs.readFileSync(tarball)).digest("base64")}`;
}

function validateMetadata(metadata, expected) {
  const observed = metadata?.versions?.[expected.version];
  if (!observed || observed.version !== expected.version)
    throw new Error(`npm package ${expected.version} is not published`);
  if (observed.gitHead !== expected.commit)
    throw new Error("npm gitHead differs from the immutable release commit");
  if (observed.dist?.integrity !== expected.integrity)
    throw new Error("npm artifact integrity differs from the tested candidate");
  if (metadata?.["dist-tags"]?.[expected.distTag] !== expected.version)
    throw new Error(`npm ${expected.distTag} dist-tag does not point to ${expected.version}`);
  return {
    version: expected.version,
    gitHead: observed.gitHead,
    integrity: observed.dist.integrity,
    distTag: expected.distTag,
  };
}

async function fetchMetadata(fetchImpl = fetch) {
  const response = await fetchImpl(`${REGISTRY}/agentic-awesome-skills`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE) throw new Error("npm registry response is too large");
  return JSON.parse(text);
}

async function verifyExpected(expected, options = {}) {
  const fetchMetadataImpl = options.fetchMetadata || fetchMetadata;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const now = options.now || Date.now;
  const timeoutMs = options.timeoutMs || 0;
  const intervalMs = options.intervalMs || 2_000;
  const started = now();
  for (;;) {
    try {
      return validateMetadata(await fetchMetadataImpl(), expected);
    } catch (error) {
      if (!timeoutMs || now() - started >= timeoutMs) throw error;
      await sleep(intervalMs);
    }
  }
}

function parseArgs(argv) {
  const [version, commit, tarball, ...options] = argv;
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version || ""))
    throw new Error("Invalid release version");
  if (!/^[a-f0-9]{40}$/.test(commit || ""))
    throw new Error("Invalid release commit");
  if (!tarball || !fs.existsSync(tarball))
    throw new Error("Tested npm candidate is missing");
  const wait = options.length === 1 && options[0] === "--wait-until-published";
  if (options.length && !wait)
    throw new Error("Expected --wait-until-published");
  return { version, commit, tarball, wait };
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const args = parseArgs(argv);
  const expected = {
    version: args.version,
    commit: args.commit,
    distTag: packageIdentity(args.version),
    integrity: candidateIntegrity(args.tarball),
  };
  return verifyExpected(expected, {
    ...dependencies,
    timeoutMs: args.wait ? 60_000 : 0,
  });
}

if (require.main === module) {
  main().then(result => {
    console.log(`[npm] Verified ${result.version} (${result.distTag}) ${result.integrity}`);
  }).catch(error => {
    console.error(`[npm] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  candidateIntegrity,
  main,
  packageIdentity,
  validateMetadata,
  verifyExpected,
};
