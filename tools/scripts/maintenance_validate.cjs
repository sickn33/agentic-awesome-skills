#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const { parseRawDiff } = require("../lib/git-raw-diff");
const { classifyImpact, checkPlan, verifyResults } = require("../lib/maintenance-impact");
const { resolveCommandInvocation } = require("./release_workflow");

function git(root, args) {
  const r = spawnSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr.toString());
  return r.stdout;
}
function planFor(root, base, head) {
  const resolve = ref => {
    const sha = git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).toString().trim();
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Invalid commit identity");
    return sha;
  };
  const baseSha = resolve(base), headSha = resolve(head);
  const records = parseRawDiff(git(root, ["diff", "--raw", "--no-abbrev", "-z", "-M", `${baseSha}...${headSha}`]), { allowEmpty: true });
  let impact = classifyImpact(records);
  // An exact prepared snapshot has already converged in the protected release
  // PR. The immutable tag candidate owns full distribution/platform execution.
  if (fs.existsSync(path.join(root, "data/distribution-snapshot.json"))
      && git(root, ["rev-parse", "HEAD"]).toString().trim() === headSha) {
    try { require("./distribution_snapshot.cjs").verify(root); impact = { ...impact, profile: "distribution" }; }
    catch { /* development snapshots intentionally fail this proof */ }
  }
  return { ...impact, baseSha, headSha, checks: checkPlan(impact.profile) };
}
function commandsFor(check, root, plan = {}) {
  if (check === "source-credits") return [["npm", ["run", "check:readme-credits", "--", "--base", plan.baseSha, "--head", plan.headSha]]];
  if (check === "documentation") return [["node", ["tools/scripts/run-python.js", "tools/scripts/tests/test_documentation_consistency.py"]]];
  if (check === "preview") return ["plugin-compat:sync", "index", "bundles:sync", "sync:metadata", "catalog", "build:aas-v1-catalog", "sync:web-assets"].map(s => ["npm", ["run", s]]);
  if (check === "web") return ["app:install", "app:test:coverage", "app:build"].map(s => ["npm", ["run", s]]);
  if (check === "package-tests") return fs.readdirSync(path.join(root, "tools/scripts/tests"))
    .filter(f => /^(installer_.*|npm_package_contents)\.test\.js$/.test(f)).sort()
    .map(f => ["node", [`tools/scripts/tests/${f}`]]);
  return [["npm", ["run", check]]];
}
function executePlan(root, plan, execute = spawnSync) {
  const results = [];
  for (const check of plan.checks) {
    const started = Date.now();
    let exitCode = 0;
    const commands = commandsFor(check, root, plan);
    if (!commands.length) throw new Error(`Empty required check: ${check}`);
    for (const [command, args] of commands) {
      const invocation = resolveCommandInvocation(command, args);
      const r = execute(invocation.command, invocation.args, { cwd: root, stdio: "inherit", shell: false });
      if (r.error || r.status !== 0) { exitCode = r.status || 1; break; }
    }
    results.push({ check, exitCode, elapsedMs: Date.now() - started });
    if (exitCode) break;
  }
  let passed = false;
  try { passed = verifyResults(plan.checks, results); } catch { /* retain incomplete evidence */ }
  return { ...plan, results, passed };
}
// Only the independent full-suite tail overlaps. Keep prerequisites ordered and
// leave the complete, unsharded script suite as one invocation.
function prepareWebCopy(root, headSha) {
  const directory = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "aas-validation-web-"));
  const cleanup = () => fs.rmSync(directory, { recursive: true, force: true });
  try {
    git(root, ["clone", "--shared", "--no-checkout", root, directory]);
    git(directory, ["checkout", "--detach", headSha]);
    git(directory, ["remote", "remove", "origin"]);
    // Preview generators have already run once. Copy their actual bytes, not a
    // second generation, and retain exact Git history for prerender lastmod.
    const patch = git(root, ["diff", "--binary", "HEAD", "--"]);
    if (patch.length) {
      const result = spawnSync("git", ["apply", "--binary", "-"], { cwd: directory, input: patch });
      if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.toString());
    }
    const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
    for (const file of untracked) {
      const destination = path.resolve(directory, file);
      if (!destination.startsWith(directory + path.sep)) throw new Error("Unsafe preview path");
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.cpSync(path.join(root, file), destination, { dereference: false });
    }
    // app:setup also writes ignored public assets needed by coverage before build.
    const publicPath = path.join("apps", "web-app", "public");
    if (fs.existsSync(path.join(root, publicPath))) {
      fs.rmSync(path.join(directory, publicPath), { recursive: true, force: true });
      fs.cpSync(path.join(root, publicPath), path.join(directory, publicPath), { recursive: true, dereference: false });
    }
    const invocation = resolveCommandInvocation("npm", ["ci", "--ignore-scripts", "--audit=false"]);
    const result = spawnSync(invocation.command, invocation.args, { cwd: directory, stdio: "inherit", shell: false });
    if (result.error || result.status !== 0) throw new Error("Isolated web dependencies could not be installed");
    return { root: directory, cleanup };
  } catch (error) { cleanup(); throw error; }
}
function executeCheckAsync(root, check, plan) {
  const started = Date.now();
  return (async () => {
    const commands = commandsFor(check, root, plan);
    if (!commands.length) throw new Error(`Empty required check: ${check}`);
    for (const [command, args] of commands) {
      const invocation = resolveCommandInvocation(command, args);
      const exitCode = await new Promise(resolve => {
        const child = spawn(invocation.command, invocation.args, { cwd: root, stdio: "inherit", shell: false });
        child.once("error", () => resolve(1));
        child.once("close", code => resolve(code ?? 1));
      });
      if (exitCode) return { check, exitCode, elapsedMs: Date.now() - started };
    }
    return { check, exitCode: 0, elapsedMs: Date.now() - started };
  })();
}
async function executeParallelPlan(root, plan, { prepare = prepareWebCopy, run = executeCheckAsync, serial = executePlan } = {}) {
  const started = Date.now();
  if (plan.checks.slice(-2).join(",") !== "test,web") return serial(root, plan);
  const prerequisites = serial(root, { ...plan, checks: plan.checks.slice(0, -2) });
  if (!prerequisites.passed) return { ...plan, results: prerequisites.results, passed: false };
  let copy;
  const preparationStarted = Date.now();
  try {
    copy = prepare(root, plan.headSha);
    const preparationMs = Date.now() - preparationStarted;
    // allSettled waits for both branches even when one fails, before cleanup.
    const settled = await Promise.allSettled([run(root, "test", plan), run(copy.root, "web", plan)]);
    const tail = settled.map((result, i) => result.status === "fulfilled" ? result.value
      : { check: ["test", "web"][i], exitCode: 1, error: String(result.reason?.message || result.reason) });
    const results = [...prerequisites.results, ...tail];
    let passed = false;
    try { passed = verifyResults(plan.checks, results); } catch { /* fail closed */ }
    return { ...plan, results, passed, execution: { mode: "isolated-parallel", preparationMs, elapsedMs: Date.now() - started } };
  } catch (error) {
    return { ...plan, results: prerequisites.results, passed: false, error: error.message };
  } finally { copy?.cleanup(); }
}
async function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--plan") options.plan = true;
    else if (argv[i] === "--parallel") options.parallel = true;
    else if (["--repo", "--base", "--head", "--output"].includes(argv[i]) && argv[i + 1]) options[argv[i++].slice(2)] = argv[i];
    else throw new Error(`Unknown or incomplete option: ${argv[i]}`);
  }
  if (!options.base || !options.head) throw new Error("Exact --base and --head are required");
  const root = path.resolve(options.repo || process.cwd());
  const plan = planFor(root, options.base, options.head);
  if (!options.plan && git(root, ["rev-parse", "HEAD"]).toString().trim() !== plan.headSha)
    throw new Error("Validation checkout must equal the requested head");
  if (!options.plan && git(root, ["status", "--porcelain", "--untracked-files=normal"]).toString().trim())
    throw new Error("Validation requires a clean immutable source checkout");
  const receipt = options.plan ? plan : options.parallel ? await executeParallelPlan(root, plan) : executePlan(root, plan);
  const json = JSON.stringify(receipt, null, 2) + "\n";
  if (options.output) { fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true }); fs.writeFileSync(options.output, json); }
  process.stdout.write(json);
  if (!options.plan && !receipt.passed) process.exitCode = 1;
}
module.exports = { planFor, commandsFor, executePlan, prepareWebCopy, executeCheckAsync, executeParallelPlan };
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
