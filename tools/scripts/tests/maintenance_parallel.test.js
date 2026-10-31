"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { executeParallelPlan, executeCheckAsync, prepareWebCopy } = require("../maintenance_validate.cjs");
const { verifyResults } = require("../../lib/maintenance-impact");
const plan = { headSha: "a".repeat(40), checks: ["preview", "test", "web"] };
const serial = (root, selected) => ({ ...selected, results: selected.checks.map(check => ({ check, exitCode: 0 })), passed: true });

test("full tail overlaps only after prerequisites, preserves receipt order and waits before cleanup", async () => {
  const events = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const receipt = await executeParallelPlan("source", plan, {
    serial(root, selected) { events.push("prerequisites"); return serial(root, selected); },
    prepare(root, head) {
      assert.equal(head, plan.headSha); events.push("prepared");
      return { root: "isolated", cleanup() { events.push("cleanup"); } };
    },
    async run(root, check) {
      assert.equal(root, check === "test" ? "source" : "isolated");
      events.push(check + "-start");
      if (check === "web") release();
      await gate;
      events.push(check + "-finish");
      return { check, exitCode: 0 };
    },
  });
  assert.deepEqual(events.slice(0, 4), ["prerequisites", "prepared", "test-start", "web-start"]);
  assert.equal(events.at(-1), "cleanup");
  assert(verifyResults(plan.checks, receipt.results));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.execution.mode, "isolated-parallel");
});

test("failed prerequisite prevents both branches and copy preparation", async () => {
  const receipt = await executeParallelPlan("source", plan, {
    serial: () => ({ results: [{ check: "preview", exitCode: 3 }], passed: false }),
    prepare() { assert.fail("must not prepare"); }, run() { assert.fail("must not execute"); },
  });
  assert.equal(receipt.passed, false);
  assert.deepEqual(receipt.checks, plan.checks);
});

test("preparation failures cannot create successful evidence", async () => {
  const receipt = await executeParallelPlan("source", plan, {
    serial, prepare() { throw new Error("copy failed"); }, run() { assert.fail("must not execute"); },
  });
  assert.equal(receipt.passed, false); assert.match(receipt.error, /copy failed/);
});

for (const kind of ["failed", "thrown", "missing", "misordered"]) {
  test(`${kind} child results fail closed and sibling finishes before removal`, async () => {
    let finished = false, cleaned = false;
    const receipt = await executeParallelPlan("source", plan, {
      serial,
      prepare: () => ({ root: "isolated", cleanup() { assert(finished); cleaned = true; } }),
      async run(root, check) {
        if (check === "test") {
          if (kind === "thrown") throw new Error("launch failure");
          if (kind === "missing") return undefined;
          return { check: kind === "misordered" ? "web" : check, exitCode: kind === "failed" ? 7 : 0 };
        }
        await new Promise(resolve => setImmediate(resolve)); finished = true;
        return { check, exitCode: 0 };
      },
    });
    assert.equal(receipt.passed, false); assert(cleaned);
  });
}

test("narrow plans keep existing execution; full suite is never sharded", async () => {
  const narrow = { checks: ["preview", "web"] };
  const receipt = await executeParallelPlan("source", narrow, {
    serial, prepare() { assert.fail("narrow plan must not clone"); },
  });
  assert.equal(receipt.passed, true);
  const { commandsFor } = require("../maintenance_validate.cjs");
  assert.deepEqual(commandsFor("test", "."), [["npm", ["run", "test"]]]);
});

test("web copy contains exact preview bytes, deletions, new files, ignored public files and isolated dependencies", () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "aas-parallel-fixture-"));
  let copy;
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" }).toString().trim();
  try {
    git("init", "-q"); git("config", "user.email", "fixture@example.test"); git("config", "user.name", "Fixture");
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "parallel-fixture", version: "1.0.0" }));
    fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ name: "parallel-fixture", version: "1.0.0", lockfileVersion: 3, packages: { "": { name: "parallel-fixture", version: "1.0.0" } } }));
    fs.writeFileSync(path.join(root, ".gitignore"), "node_modules/\napps/web-app/public/ignored.json\n");
    fs.writeFileSync(path.join(root, "preview.json"), "old");
    fs.writeFileSync(path.join(root, "removed.json"), "old");
    git("add", "."); git("commit", "-qm", "fixture"); const head = git("rev-parse", "HEAD");
    fs.writeFileSync(path.join(root, "preview.json"), "generated");
    fs.rmSync(path.join(root, "removed.json"));
    fs.writeFileSync(path.join(root, "new.json"), "new generated output");
    fs.mkdirSync(path.join(root, "apps/web-app/public"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps/web-app/public/ignored.json"), "ignored generated output");
    fs.mkdirSync(path.join(root, "node_modules")); fs.writeFileSync(path.join(root, "node_modules/private-marker"), "source");
    copy = prepareWebCopy(root, head);
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: copy.root }).toString().trim(), head);
    assert.equal(execFileSync("git", ["remote"], { cwd: copy.root }).toString().trim(), "");
    for (const file of ["preview.json", "new.json", "apps/web-app/public/ignored.json"])
      assert.equal(fs.readFileSync(path.join(copy.root, file), "utf8"), fs.readFileSync(path.join(root, file), "utf8"));
    assert(!fs.existsSync(path.join(copy.root, "removed.json")));
    assert(!fs.existsSync(path.join(copy.root, "node_modules/private-marker")));
    fs.writeFileSync(path.join(copy.root, "preview.json"), "web writes");
    assert.equal(fs.readFileSync(path.join(root, "preview.json"), "utf8"), "generated");
  } finally {
    const directory = copy?.root; copy?.cleanup();
    if (directory) assert(!fs.existsSync(directory));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("child termination and missing commands are failures, including web install before coverage/build", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-parallel-child-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: {
      test: `node -e "process.kill(process.pid, 'SIGTERM')"`,
      "app:install": "node -e \"process.exit(5)\"",
      "app:ci": "node -e \"require('fs').writeFileSync('unexpected', 'coverage')\"",
    } }));
    assert.notEqual((await executeCheckAsync(root, "test", plan)).exitCode, 0);
    assert.notEqual((await executeCheckAsync(root, "web", plan)).exitCode, 0);
    assert(!fs.existsSync(path.join(root, "unexpected")));
    assert.notEqual((await executeCheckAsync(root, "missing-script", plan)).exitCode, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
