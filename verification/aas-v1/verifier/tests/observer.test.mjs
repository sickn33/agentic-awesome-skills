import assert from "node:assert/strict";
import test from "node:test";
import { macObserverBudgets, parseDelimitedObserver, parseLinuxStrace, parseMacCombinedFsUsage, parseMacFsUsage, windowsObserverBudgets } from "../lib/observer.mjs";

test("strace parser counts failed network attempts and non-stream writes", () => {
  const result = parseLinuxStrace([
    'execve("/usr/bin/node", ["node"], 0x0) = 0',
    'connect(7<TCP:[1]>, {sa_family=AF_INET}, 16) = -1 ECONNREFUSED',
    'openat(AT_FDCWD, "/tmp/x", O_WRONLY|O_CREAT, 0600) = 8',
    'write(8</tmp/x>, "x", 1) = 1',
    'write(1</dev/pts/1>, "ok", 2) = 2',
    'execve("/bin/true", ["true"], 0x0) = 0',
  ].join("\n"), { tmp: "/tmp" });
  assert.equal(result.networkAttempts, 1);
  assert.equal(result.writeAttempts, 2);
  assert.equal(result.childProcesses, 1);
  assert.ok(result.events.every((entry) => !JSON.stringify(entry).includes("/tmp/x")));
});

test("delimited observers ignore malformed and unknown records", () => {
  const result = parseDelimitedObserver("network|connect|127.0.0.1\nwrite|open|/tmp/x\nnoise|secret\n");
  assert.deepEqual([result.networkAttempts, result.writeAttempts, result.childProcesses], [1, 1, 0]);
});

test("Windows observer separates the candidate limit from ETW finalization grace", () => {
  assert.deepEqual(windowsObserverBudgets(10_000), {
    candidateTimeoutMs: 10_000,
    wrapperTimeoutMs: 70_000,
  });
  assert.throws(() => windowsObserverBudgets(0), (error) => error.code === "AAS_OBSERVER_INVALID_TIMEOUT");
  assert.throws(() => windowsObserverBudgets(900_001), (error) => error.code === "AAS_OBSERVER_INVALID_TIMEOUT");
});

test("macOS observer lifetime covers readiness, candidate, drain, and stop margin", () => {
  assert.deepEqual(macObserverBudgets(10_000), {
    startupMs: 1_500,
    readinessMaxAttempts: 2,
    readinessProcessTimeoutMs: 10_000,
    readinessDelayMs: 250,
    drainMs: 1_000,
    observerTimeoutMs: 38_000,
  });
  assert.throws(() => macObserverBudgets(0), (error) => error.code === "AAS_OBSERVER_INVALID_TIMEOUT");
});

test("macOS fs_usage parser separates network, writes, and child execs", () => {
  const result = parseMacFsUsage(
    "12:00:00.100 WrData[A] F=3 /tmp/canary node.1\n12:00:00.200 read F=4 /tmp/input node.1\n",
    "12:00:00.300 connect 127.0.0.1:9 node.1\n",
    "12:00:00.400 exec node node.1\n12:00:00.500 exec child node.2\n",
  );
  assert.equal(result.networkAttempts, 1);
  assert.equal(result.writeAttempts, 1);
  assert.equal(result.childProcesses, 1);
});

test("combined macOS fs_usage parser enforces canary ordering and classifies candidate calls", () => {
  const result = parseMacCombinedFsUsage([
    "12:00:00.005 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1",
    "12:00:00.010 WrData[A] F=3 /tmp/aas-start-1 aasobs.1",
    "12:00:00.020 WrData[A] F=3 /tmp/canary node.1",
    "12:00:00.030 connect 127.0.0.1:9 node.1",
    "12:00:00.040 posix_spawn child node.1",
  ].join("\n"), {}, "aas-ready-1", "aas-start-1");
  assert.deepEqual([result.networkAttempts, result.writeAttempts, result.childProcesses], [1, 1, 1]);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.010 WrData[A] F=3 /tmp/aas-start-1 aasobs.1\n", {}, "aas-ready-1", "aas-start-1"), /readiness canary/);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.010 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1\n", {}, "aas-ready-1", "aas-start-1"), /candidate start canary/);
});
