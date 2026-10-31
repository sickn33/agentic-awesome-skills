"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { ISOLATED_COHORT, cohortWorkers, runIsolatedCohort, runNodeCommandAsync, discoverTestCommands } = require("./run-test-suite.js");

test("concurrency is opt-in, bounded and never changes the complete discovered inventory", () => {
  assert.equal(cohortWorkers({}), 1); assert.equal(cohortWorkers({ AAS_TEST_COHORT_WORKERS: "1" }), 1);
  assert.equal(cohortWorkers({ AAS_TEST_COHORT_WORKERS: "2" }), 2);
  for (const value of ["", "0", "3", "2.0", "02", "two"]) assert.throws(() => cohortWorkers({ AAS_TEST_COHORT_WORKERS: value }), /must be 1 or 2/);
  const { local, network } = discoverTestCommands();
  for (const file of ISOLATED_COHORT) {
    assert(local.some(args => args.at(-1) === file));
    assert(!network.some(args => args.at(-1) === file));
  }
});

test("only reviewed isolated groups overlap; all groups remain exactly once with the unknown remainder ordered", async () => {
  const commands = [["unknown-first.test.js"], ...ISOLATED_COHORT.map(file => [file]), ["unknown-last.test.js"]];
  const seen = [], completed = [];
  let active = 0, peak = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const remaining = await runIsolatedCohort(commands, 2, async args => {
    seen.push(args.at(-1)); active++; peak = Math.max(peak, active);
    if (seen.length === 2) release();
    await gate; await new Promise(resolve => setImmediate(resolve));
    active--; completed.push(args.at(-1)); return { exitCode: 0 };
  });
  assert.equal(peak, 2); assert.equal(active, 0); assert.equal(completed.length, ISOLATED_COHORT.length);
  assert.deepEqual(remaining, [commands[0], commands.at(-1)]);
  assert.deepEqual([...seen, ...remaining.map(args => args.at(-1))].sort(), commands.map(args => args.at(-1)).sort());
  assert.equal(new Set(seen).size, seen.length);
});

for (const kind of ["nonzero", "signal", "throw", "undefined-throw", "missing", "launch-error"]) {
  test(`${kind} child failure stops dispatch, drains its active sibling and prevents the serial remainder`, async () => {
    const started = []; let siblingFinished = false;
    await assert.rejects(runIsolatedCohort(ISOLATED_COHORT.map(file => [file]), 2, async args => {
      started.push(args.at(-1));
      if (args.at(-1) === ISOLATED_COHORT[0]) {
        await new Promise(resolve => setImmediate(resolve));
        if (kind === "throw") throw new Error("fixture failed");
        if (kind === "undefined-throw") throw undefined;
        if (kind === "missing") return undefined;
        if (kind === "signal") return { exitCode: 1, signal: "SIGTERM" };
        if (kind === "launch-error") return { exitCode: 0, error: new Error("spawn failed") };
        return { exitCode: 7 };
      }
      await new Promise(resolve => setTimeout(resolve, 15)); siblingFinished = true;
      return { exitCode: 0 };
    }));
    assert(siblingFinished); assert.deepEqual(started, ISOLATED_COHORT.slice(0, 2));
  });
}

test("duplicate inventories and unsupported concurrency fail before executing a group", async () => {
  const command = [ISOLATED_COHORT[0]];
  const execute = () => assert.fail("must not start");
  await assert.rejects(runIsolatedCohort([command, command], 2, execute), /Duplicate/);
  await assert.rejects(runIsolatedCohort([command], 3, execute), /exactly two/);
});

test("actual CLI executes the full cohort and unknown group; invalid modes run nothing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-suite-scheduling-"));
  const directory = path.join(root, "tools/scripts/tests"); fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(path.join(__dirname, "run-test-suite.js"), path.join(directory, "run-test-suite.js"));
  const names = ["aas_v1_runtime_config.test.js", "aas_v1_cli.test.js"];
  for (const [index, name] of names.entries()) {
    fs.writeFileSync(path.join(directory, name), `const fs=require('node:fs'); fs.writeFileSync('started-${index}','1'); const deadline=Date.now()+5000; function wait(){if(fs.existsSync('started-${1-index}')){fs.writeFileSync('done-${index}','1');return;}if(Date.now()>deadline)process.exit(9);setTimeout(wait,5);}wait();`);
  }
  fs.writeFileSync(path.join(directory, "z_unknown.test.js"), "const fs=require('node:fs'); if(!fs.existsSync('done-0')||!fs.existsSync('done-1'))process.exit(8);fs.writeFileSync('unknown-done','1');");
  const run = (workers, args = []) => spawnSync(process.execPath, [path.join(directory, "run-test-suite.js"), ...args], {
    cwd: root, encoding: "utf8", timeout: 15000,
    env: { ...process.env, ENABLE_NETWORK_TESTS: "0", AAS_TEST_COHORT_WORKERS: workers },
  });
  try {
    const invalid = run("3"); assert.notEqual(invalid.status, 0); assert(!fs.existsSync(path.join(root, "started-0")));
    const sharded = run("2", ["--local", "--shard-index", "0", "--shard-count", "2"]);
    assert.notEqual(sharded.status, 0); assert.match(sharded.stderr, /cannot be combined/); assert(!fs.existsSync(path.join(root, "started-0")));
    const success = run("2"); assert.equal(success.status, 0, success.stdout + success.stderr);
    assert(fs.existsSync(path.join(root, "unknown-done")));
    const summary = success.stdout.split("\n").filter(line => line.startsWith("[tests:timing] ")).map(line => JSON.parse(line.slice("[tests:timing] ".length))).find(record => record.type === "summary");
    assert.equal(summary.test_count, 3); assert.equal(summary.shard_count, null); assert.equal(summary.isolated_workers, 2);
    assert.match(summary.manifest_sha256, /^[a-f0-9]{64}$/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("real child termination and command errors cannot become a successful result", async () => {
  const terminated = await runNodeCommandAsync(["-e", "process.kill(process.pid, 'SIGTERM')"], () => {});
  assert(terminated.signal || terminated.exitCode !== 0);
  assert.notEqual((await runNodeCommandAsync(["-e", "process.exit(7)"], () => {})).exitCode, 0);
  assert.notEqual((await runNodeCommandAsync([path.join(os.tmpdir(), "aas-missing-scheduling-test.js")], () => {})).exitCode, 0);
});
