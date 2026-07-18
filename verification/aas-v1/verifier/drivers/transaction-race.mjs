#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function digest(value) {
  return `sha256-${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function treeDigest(root) {
  const records = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const stat = fs.lstatSync(absolute);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        records.push({ path: relative, type: "directory" });
        visit(absolute);
      } else if (stat.isFile()) records.push({ path: relative, type: "file", digest: digest(fs.readFileSync(absolute)) });
      else if (stat.isSymbolicLink()) records.push({ path: relative, type: "symlink", target: fs.readlinkSync(absolute) });
    }
  };
  visit(root);
  return digest(JSON.stringify(records));
}

function stagedBoundary(targetRoot) {
  const root = path.join(targetRoot, ".aas", "transactions", "codex");
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const directory = stack.pop();
    for (const name of fs.readdirSync(directory)) {
      const absolute = path.join(directory, name);
      const stat = fs.lstatSync(absolute);
      if (stat.isDirectory()) stack.push(absolute);
      if (stat.isFile() && absolute.includes(`${path.sep}staged${path.sep}`)) return digest(path.relative(targetRoot, absolute));
    }
  }
  return null;
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const outside = path.join(input.caseRoot, `outside-${input.className}`);
fs.mkdirSync(outside, { mode: 0o700 });
fs.writeFileSync(path.join(outside, "canary.txt"), "outside-must-not-change\n", { mode: 0o600 });
const outsideBefore = treeDigest(outside);
const child = spawn(input.executable, input.args, {
  cwd: input.cwd, env: input.env, detached: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = [];
const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
const closed = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code: code ?? 128, signal }));
});
let boundaryDigest = null;
const started = Date.now();
while (Date.now() - started < input.timeoutMs) {
  boundaryDigest = stagedBoundary(input.targetRoot);
  if (boundaryDigest) break;
  const settled = await Promise.race([closed.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 2))]);
  if (settled) break;
}
let restore = () => {};
if (boundaryDigest) {
  if (input.className === "drift") {
    const destination = path.join(input.targetRoot, ".agents", "skills", input.skillId);
    fs.mkdirSync(destination, { mode: 0o700 });
    fs.writeFileSync(path.join(destination, "personal.txt"), "injected-after-preflight\n", { mode: 0o600 });
    restore = () => fs.rmSync(destination, { recursive: true, force: true });
  } else if (input.className === "symlink-swap") {
    const skills = path.join(input.targetRoot, ".agents", "skills");
    const original = `${skills}.pre-swap`;
    fs.renameSync(skills, original);
    fs.symlinkSync(outside, skills, process.platform === "win32" ? "junction" : "dir");
    restore = () => {
      fs.rmSync(skills, { force: true });
      fs.renameSync(original, skills);
    };
  } else if (input.className === "target-swap") {
    const original = `${input.targetRoot}.pre-swap`;
    fs.renameSync(input.targetRoot, original);
    fs.mkdirSync(input.targetRoot, { mode: 0o700 });
    restore = () => {
      fs.rmSync(input.targetRoot, { recursive: true, force: true });
      fs.renameSync(original, input.targetRoot);
    };
  }
}
const outcome = await closed;
restore();
const outsideAfter = treeDigest(outside);
let value = null;
try { value = JSON.parse((outcome.code === 0 ? Buffer.concat(stdout) : Buffer.concat(stderr)).toString("utf8").trim()); } catch {}
process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  boundaryDigest,
  outsideBefore,
  outsideAfter,
  outcome,
  value,
  stdoutDigest: digest(Buffer.concat(stdout)),
  stderrDigest: digest(Buffer.concat(stderr)),
})}\n`);
if (!boundaryDigest || outsideBefore !== outsideAfter || outcome.code === 0) process.exitCode = 2;
