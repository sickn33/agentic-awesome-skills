import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const checker = path.resolve(here, "..", "bin", "check-baseline.mjs");

test("frozen structure-only baseline is internally valid", () => {
  const run = spawnSync(process.execPath, [checker, "--mode", "structure"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.heldOutDescriptors, 180);
  assert.equal(report.pendingCount, 0);
});

test("freeze-ready mode never reports an incomplete baseline as complete", () => {
  const run = spawnSync(process.execPath, [checker, "--mode", "freeze-ready"], { encoding: "utf8" });
  if (run.status === 0) {
    const report = JSON.parse(run.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.pendingCount, 0);
    return;
  }
  assert.equal(run.status, 2, run.stdout || run.stderr);
  const report = JSON.parse(run.stderr);
  assert.equal(report.code, "AAS_BASELINE_NOT_FREEZE_READY");
  assert.ok(report.pending.length > 0);
  assert.ok(report.pending.every((entry) => entry.code.endsWith("_PENDING")));
});
