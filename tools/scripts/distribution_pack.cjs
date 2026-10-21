#!/usr/bin/env node
"use strict";
// Pack the immutable npm candidate once, with the release commit recorded the
// way npm records it when publishing from a Git checkout.
//
// Publishing a pre-built tarball (`npm publish <file>.tgz`) does not populate
// the registry metadata `gitHead` field, while `npm publish` from a directory
// inside a Git work tree does. The direct installer verifies `--release`
// against that immutable field, so the candidate tarball must carry it.
//
// The field is injected only into the packed bytes and never left in the
// working tree, so the sealed distribution stays byte-identical to the
// reviewed tree and the checkout returns to a clean state.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { parsePackageArchive } = require("../lib/aas-v1/cache/archive");

const GIT_SHA = /^[0-9a-f]{40}$/;
const PACKAGE_NAME = /\.tgz$/;

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || "").trim();
    throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : ""}`);
  }
  return String(result.stdout || "").trim();
}

function headCommit(root) {
  const head = git(root, ["rev-parse", "HEAD"]);
  if (!GIT_SHA.test(head)) throw new Error("Unable to record the release commit: HEAD is not a full commit SHA");
  return head;
}

function assertSealedTree(root) {
  const diff = spawnSync("git", ["diff", "--exit-code", "HEAD", "--"], { cwd: root, stdio: "pipe" });
  if (diff.status !== 0) throw new Error("Refusing to pack an unsealed tree: tracked files differ from HEAD");
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  if (untracked) throw new Error("Refusing to pack an unsealed tree: untracked source files are present");
}

function runNpmPack(root, destination) {
  const result = spawnSync(
    "npm",
    ["pack", "--ignore-scripts", "--pack-destination", destination],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || "npm pack failed").trim();
    throw new Error(`Unable to pack the runtime candidate: ${detail}`);
  }
}

function findPackedTarball(destination) {
  const candidates = fs.readdirSync(destination).filter((name) => PACKAGE_NAME.test(name));
  if (candidates.length !== 1) throw new Error(`Expected exactly one packed candidate, found ${candidates.length}`);
  return path.join(destination, candidates[0]);
}

function readTarballManifest(tarball) {
  const stat = fs.statSync(tarball);
  if (!stat.isFile() || stat.size > 64 * 1024 * 1024)
    throw new Error("Packed candidate archive exceeds the runtime limit");
  // Use the same bounded, inert parser as runtime installation. Native Windows
  // tar can fail while scanning otherwise valid npm archives; no extraction or
  // platform executable is needed to verify one manifest.
  const parsed = parsePackageArchive(fs.readFileSync(tarball), {
    selectPaths: ["package/package.json"],
  });
  try {
    return JSON.parse(parsed.entries[0].bytes.toString("utf8"));
  } catch {
    throw new Error("The packed candidate manifest is not valid JSON");
  }
}

function readTarballGitHead(tarball) {
  return readTarballManifest(tarball)?.gitHead ?? null;
}

function pack(root, destination, dependencies = {}) {
  const commit = (dependencies.headCommit || headCommit)(root);
  (dependencies.assertSealedTree || assertSealedTree)(root);
  const target = path.resolve(destination);
  fs.mkdirSync(target, { recursive: true });
  for (const name of fs.readdirSync(target)) fs.rmSync(path.join(target, name), { force: true });

  const packagePath = path.join(root, "package.json");
  const original = fs.readFileSync(packagePath);
  const manifest = JSON.parse(original.toString("utf8"));
  manifest.gitHead = commit;
  try {
    fs.writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
    (dependencies.runNpmPack || runNpmPack)(root, target);
  } finally {
    fs.writeFileSync(packagePath, original);
  }
  if (!fs.readFileSync(packagePath).equals(original)) throw new Error("Failed to restore package.json after packing");

  const packed = (dependencies.findPackedTarball || findPackedTarball)(target);
  const finalPath = path.join(target, "package.tgz");
  fs.renameSync(packed, finalPath);
  const recorded = (dependencies.readTarballGitHead || readTarballGitHead)(finalPath);
  if (recorded !== commit) {
    throw new Error("Packed candidate does not record the release commit in its manifest");
  }
  return { tarball: finalPath, commit };
}

if (require.main === module) {
  const [destination] = process.argv.slice(2);
  try {
    if (process.argv.length !== 3 || !destination) {
      throw new Error("Usage: distribution_pack.cjs ABSOLUTE_DESTINATION");
    }
    const result = pack(path.resolve(__dirname, "../.."), destination);
    console.log(`[distribution] Packed candidate ${path.basename(result.tarball)} for ${result.commit}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { pack, headCommit, assertSealedTree, readTarballGitHead, readTarballManifest, PACKAGE_NAME };
