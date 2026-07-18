#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { selfTestObserver } from "../lib/observer.mjs";
import { isolatedZones } from "../lib/runtime.mjs";

const jobIndex = process.argv.indexOf("--job-id");
const jobId = jobIndex >= 0 ? process.argv[jobIndex + 1] : "";
const expected = jobId.startsWith("linux-") ? "linux-strace-process-tree"
  : jobId.startsWith("macos-") ? "macos-fs_usage-process"
    : jobId.startsWith("windows-") ? "windows-etw-kernel-process-tree" : null;
if (!expected) throw new Error("--job-id must be a frozen runtime-matrix job");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-observer-self-test-"));
try {
  const zones = isolatedZones(path.join(root, "zones"));
  const evidenceDir = path.join(root, "evidence");
  const result = await selfTestObserver({ cwd: zones.tmp, env: process.env, zones, evidenceDir });
  if (result.backend !== expected) throw new Error(`observer backend mismatch: ${result.backend}/${expected}`);
  if (result.observedNetworkSentinels < 1 || result.observedWriteSentinels < 1) throw new Error("observer sentinel was not detected");
  process.stdout.write(`${JSON.stringify({ ok: true, jobId, ...result })}\n`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
