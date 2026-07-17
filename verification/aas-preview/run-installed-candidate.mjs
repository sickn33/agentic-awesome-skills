#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function fail(code) {
  throw new Error(`AAS_PREVIEW_INSTALL_${code}`);
}

function parseArgs(argv) {
  if (argv.length % 2 !== 0) fail("ARGUMENTS_INVALID");
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) fail("ARGUMENTS_INVALID");
    const name = flag.slice(2);
    if (Object.hasOwn(values, name)) fail("ARGUMENT_DUPLICATE");
    values[name] = value;
  }
  for (const name of ["artifact-root", "install-root", "work-root", "job-id", "out"]) {
    if (!values[name]) fail("ARGUMENT_REQUIRED");
  }
  for (const name of ["artifact-root", "install-root", "work-root", "out"]) {
    values[name] = path.resolve(values[name]);
    if (!path.isAbsolute(values[name])) fail("ABSOLUTE_PATH_REQUIRED");
  }
  return values;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    timeout: options.timeout || 180_000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0 || result.signal) fail(options.code || "COMMAND_FAILED");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tarballs = fs.readdirSync(args["artifact-root"])
    .filter((name) => name.endsWith(".tgz"))
    .sort();
  if (tarballs.length !== 1) fail("TARBALL_COUNT_INVALID");
  const tarball = path.join(args["artifact-root"], tarballs[0]);
  fs.mkdirSync(args["install-root"], { recursive: true, mode: 0o700 });
  fs.mkdirSync(args["work-root"], { recursive: true, mode: 0o700 });
  const npmCommand = process.platform === "win32" ? process.execPath : "npm";
  const npmArgs = process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
  const npmCache = path.join(args["work-root"], "npm-cache");
  run(npmCommand, [...npmArgs,
    "install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund",
    "--prefix", args["install-root"], tarball,
  ], { code: "NPM_INSTALL_FAILED", env: { ...process.env, npm_config_cache: npmCache } });
  run(process.execPath, [
    path.resolve("verification/aas-preview/runner.mjs"),
    "--tarball", tarball,
    "--package-root", path.join(args["install-root"], "node_modules", "agentic-awesome-skills"),
    "--work-root", args["work-root"],
    "--job-id", args["job-id"],
    "--out", args.out,
  ], { code: "FUNCTIONAL_RUNNER_FAILED" });
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error?.message || "AAS_PREVIEW_INSTALL_FAILED"}\n`);
  process.exitCode = 1;
}
