import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  canonicalize,
  normalizeText,
  parseTrace,
  treeDigest,
  treeEntries,
} from "../../baseline/v1/legacy/14.6.0/corpus-lib.mjs";

function writeFixtureFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
}

function managedState(target) {
  writeFixtureFile(path.join(target, "frontend-design", "SKILL.md"), "legacy managed bytes\n");
  writeFixtureFile(path.join(target, "removed-managed", "SKILL.md"), "stale managed bytes\n");
  writeFixtureFile(path.join(target, "unmanaged-sentinel", "KEEP.txt"), "unmanaged sentinel\n");
  writeFixtureFile(path.join(target, ".antigravity-install-manifest.json"), `${JSON.stringify({ schemaVersion: 1, updatedAt: "2026-01-01T00:00:00.000Z", entries: ["frontend-design", "removed-managed"] }, null, 2)}\n`);
}

function setupCase(input, caseData, caseRoot, fixtureDigest) {
  fs.rmSync(caseRoot, { recursive: true, force: true });
  const home = path.join(caseRoot, "home");
  const tmp = path.join(caseRoot, "tmp");
  const cwd = path.join(caseRoot, "workspace");
  const targets = path.join(caseRoot, "targets");
  const harness = path.join(caseRoot, "harness");
  const outside = path.join(caseRoot, "outside");
  for (const directory of [home, tmp, cwd, targets, harness, outside]) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const absoluteTarget = path.join(targets, "absolute");
  const missingTarget = path.join(targets, "missing");
  const symlinkTarget = path.join(targets, "symlink");
  if (["stale-managed-with-unmanaged-sentinel", "existing-managed-and-unmanaged"].includes(caseData.fixtureState)) managedState(absoluteTarget);
  if (caseData.fixtureState === "symlink-target") {
    const outsideTarget = path.join(outside, "target");
    fs.mkdirSync(outsideTarget, { recursive: true });
    fs.symlinkSync(outsideTarget, symlinkTarget, process.platform === "win32" ? "junction" : "dir");
  }
  // macOS canonicalizes /tmp to /private/tmp in process.cwd()/path.resolve.
  // Normalize both spellings before comparison so the frozen differential is
  // about candidate behavior, not the runner's symlinked temporary root.
  const roots = [
    [caseRoot, "<CASE_ROOT>"],
    [input.runtimeRoot, "<RUNTIME>"],
    [input.corpusRoot, "<CORPUS_ROOT>"],
  ];
  const replacements = [...new Map(roots.flatMap(([root, token]) => {
    let canonical = root;
    try { canonical = fs.realpathSync(root); } catch {}
    return [[root, token], [canonical, token]];
  }).map((entry) => [entry[0], entry])).values()].sort((left, right) => right[0].length - left[0].length);
  const args = caseData.args.map((arg) => arg.replace("{{ABSOLUTE_TARGET}}", absoluteTarget).replace("{{MISSING_TARGET}}", missingTarget).replace("{{SYMLINK_TARGET}}", symlinkTarget));
  const trace = path.join(harness, "fake-git.jsonl");
  const networkTrace = path.join(harness, "network.jsonl");
  const env = {
    PATH: `${path.join(input.corpusRoot, "bin")}${path.delimiter}${process.env.PATH || ""}`,
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    ...(process.env.WINDIR ? { WINDIR: process.env.WINDIR } : {}),
    ...(process.env.COMSPEC ? { COMSPEC: process.env.COMSPEC } : {}),
    ...(process.env.PATHEXT ? { PATHEXT: process.env.PATHEXT } : {}),
    HOME: home, USERPROFILE: home, TMPDIR: tmp, TMP: tmp, TEMP: tmp,
    AAS_LEGACY_FIXTURE_REPO: path.join(input.corpusRoot, "fixture-repository"),
    AAS_LEGACY_FIXTURE_DIGEST: fixtureDigest,
    AAS_FAKE_GIT_TRACE: trace,
    AAS_FAKE_GIT_ALLOWED_ROOT: tmp,
    AAS_NETWORK_TRACE: networkTrace,
    NODE_OPTIONS: `--require=${path.join(input.corpusRoot, "network-observer.cjs")}`,
    NO_COLOR: "1",
  };
  if (caseData.fixtureState === "codex-home-override") env.CODEX_HOME = path.join(caseRoot, "codex-home");
  return { args, cwd, env, trace, networkTrace, replacements };
}

function normalizedTree(caseRoot, replacements) {
  return treeEntries(caseRoot, { exclude: new Set(["harness"]) }).map((entry) => entry.type === "symlink" ? { ...entry, target: normalizeText(entry.target, replacements) } : entry);
}

function normalizedOutput(text, replacements) {
  return normalizeText(text, replacements).replaceAll("<BASELINE_RUNTIME>", "<RUNTIME>");
}

function normalizeTrace(trace, caseData, candidateVersion) {
  return trace.map((entry) => {
    const normalized = canonicalize(entry);
    const explicit = caseData.args.includes("--release") || caseData.args.includes("--tag");
    if (!explicit && normalized.branch === `v${candidateVersion}`) normalized.branch = "<CANDIDATE_DEFAULT_RELEASE>";
    return normalized;
  });
}

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(input.corpusRoot, "manifest.json"), "utf8"));
const fixtureEntries = treeEntries(path.join(input.corpusRoot, "fixture-repository"));
const fixtureDigest = treeDigest(fixtureEntries);
const installer = path.join(input.packageRoot, "tools", "bin", "install.js");
const candidateManifest = JSON.parse(fs.readFileSync(path.join(input.packageRoot, "package.json"), "utf8"));
const work = input.workRoot;
fs.mkdirSync(path.join(work, "cases"), { recursive: true, mode: 0o700 });
let passed = 0;
const failures = [];
for (const caseData of manifest.cases) {
  const caseRoot = path.join(work, "cases", caseData.id);
  const setup = setupCase(input, caseData, caseRoot, fixtureDigest);
  const result = spawnSync(process.execPath, [installer, ...setup.args], { cwd: setup.cwd, env: setup.env, encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  const expected = JSON.parse(fs.readFileSync(path.join(input.corpusRoot, caseData.expectedSnapshot), "utf8"));
  const observedTrace = normalizeTrace(parseTrace(setup.trace), caseData, candidateManifest.version);
  const expectedTrace = normalizeTrace(expected.fakeGitTrace, caseData, manifest.baseline.version);
  const observedTree = normalizedTree(caseRoot, setup.replacements);
  const observedStdout = normalizedOutput(result.stdout || "", setup.replacements);
  const observedStderr = normalizedOutput(result.stderr || "", setup.replacements);
  const expectedStdout = normalizedOutput(expected.stdout || "", [["<BASELINE_RUNTIME>", "<RUNTIME>"]]);
  const expectedStderr = normalizedOutput(expected.stderr || "", [["<BASELINE_RUNTIME>", "<RUNTIME>"]]);
  const differences = [];
  if ((result.status ?? 128) !== expected.expectedExitCode) differences.push("exitCode");
  if (result.signal !== expected.signal) differences.push("signal");
  if (caseData.id !== "version" && observedStdout !== expectedStdout) differences.push("stdout");
  if (observedStderr !== expectedStderr) differences.push("stderr");
  if (JSON.stringify(observedTrace) !== JSON.stringify(expectedTrace)) differences.push("gitTrace");
  if (treeDigest(observedTree) !== expected.treeDigest) differences.push("filesystem");
  if (parseTrace(setup.networkTrace).length !== 0) differences.push("network");
  if (observedTree.some((entry) => /(^|\/)aas-stack\.json$/.test(entry.path))) differences.push("implicitStackState");
  if (differences.length) failures.push({
    caseId: caseData.id,
    differences,
    ...(process.env.AAS_VERIFIER_DEBUG_FIXTURE === "1" ? {
      args: setup.args,
      cwd: normalizeText(setup.cwd, setup.replacements),
      exitCode: result.status ?? 128,
      expectedExitCode: expected.expectedExitCode,
      observedStdout,
      expectedStdout,
      observedTreeDigest: treeDigest(observedTree),
      expectedTreeDigest: expected.treeDigest,
    } : {}),
  });
  else passed += 1;
}
process.stdout.write(`${JSON.stringify({ schemaVersion: 1, ok: failures.length === 0, executions: manifest.cases.length, passed, failures })}\n`);
if (failures.length) process.exit(1);
