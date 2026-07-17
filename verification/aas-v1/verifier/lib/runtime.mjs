import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { digestJson } from "./canonical.mjs";
import { snapshotTree } from "./fs-evidence.mjs";
import { runProcess } from "./process.mjs";

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function installCandidate(tarball, root) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ private: true }, null, 2)}\n`, { mode: 0o600 });
  const npmCache = path.join(root, ".npm-cache");
  const result = await runProcess(npmExecutable(), [
    "install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", "--save=false", path.resolve(tarball),
  ], {
    cwd: root,
    env: { ...process.env, npm_config_cache: npmCache, npm_config_ignore_scripts: "true" },
    timeoutMs: 180_000,
    maxOutputBytes: 8 * 1024 * 1024,
  });
  if (result.code !== 0) {
    const error = new Error(`Clean candidate install failed (${result.code})`);
    error.code = "AAS_VERIFIER_INSTALL_FAILED";
    error.detail = result.stderr.slice(0, 1000);
    throw error;
  }
  const packageRoot = path.join(root, "node_modules", "agentic-awesome-skills");
  const manifestPath = path.join(packageRoot, "package.json");
  if (!fs.existsSync(manifestPath)) throw new Error("Installed candidate package is missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return {
    root,
    packageRoot,
    manifest,
    treeDigest: snapshotTree(packageRoot).digest,
    bins: Object.fromEntries(Object.entries(manifest.bin || {}).map(([name, relative]) => [name, path.join(packageRoot, relative)])),
    installReceiptDigest: digestJson({ manifest, treeDigest: snapshotTree(packageRoot).digest }),
  };
}

export function isolatedZones(root) {
  const zones = Object.fromEntries(["home", "project", "cache", "tmp"].map((name) => [name, path.join(root, name)]));
  for (const directory of Object.values(zones)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return zones;
}

export function candidateEnvironment(zones, extra = {}) {
  const allowed = {};
  for (const key of ["PATH", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT"]) {
    if (process.env[key]) allowed[key] = process.env[key];
  }
  return {
    ...allowed,
    HOME: zones.home,
    USERPROFILE: zones.home,
    TMPDIR: zones.tmp,
    TMP: zones.tmp,
    TEMP: zones.tmp,
    AAS_CACHE_ROOT: zones.cache,
    AAS_CACHE_DIR: zones.cache,
    NO_COLOR: "1",
    NODE_NO_WARNINGS: "1",
    ...extra,
  };
}

export function parseJsonLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

export function systemIdentity(job) {
  return {
    platform: process.platform,
    osVersion: os.version(),
    kernelVersion: os.release(),
    architecture: process.arch,
    nodeVersion: process.version,
    runnerImageLabel: process.env.AAS_VERIFIER_RUNNER_LABEL || "local-untrusted",
    runnerImageVersion: process.env.ImageVersion || process.env.AAS_VERIFIER_RUNNER_VERSION || "unknown",
    filesystemType: process.env.AAS_VERIFIER_FILESYSTEM_TYPE || "unprobed",
    filesystemCaseSensitivity: process.env.AAS_VERIFIER_FILESYSTEM_CASE || "unprobed",
    jobId: job.id,
  };
}
