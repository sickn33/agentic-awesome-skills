import assert from "node:assert/strict";
import test from "node:test";
import { isMacPersistentWriteLine, macObserverBudgets, parseDelimitedObserver, parseLinuxStrace, parseMacCombinedFsUsage, parseMacFsUsage, rewriteMacObservedNodeInput, windowsObserverBudgets } from "../lib/observer.mjs";
import { runProcess } from "../lib/process.mjs";

test("process runner distinguishes observer cleanup kills from timeouts", async () => {
  const externallyKilled = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    timeoutMs: 5_000,
    onSpawn(child) { setTimeout(() => child.kill("SIGKILL"), 25); },
  });
  assert.equal(externallyKilled.signal, "SIGKILL");
  assert.equal(externallyKilled.timedOut, false);
  const timedOut = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 25 });
  assert.equal(timedOut.signal, "SIGKILL");
  assert.equal(timedOut.timedOut, true);
});

test("strace parser counts failed network attempts and non-stream writes", () => {
  const result = parseLinuxStrace([
    'execve("/usr/bin/node", ["node"], 0x0) = 0',
    'connect(7<TCP:[1]>, {sa_family=AF_INET}, 16) = -1 ECONNREFUSED',
    'openat(AT_FDCWD, "/tmp/x", O_WRONLY|O_CREAT, 0600) = 8',
    'write(8</tmp/x>, "x", 1) = 1',
    'write(5<pipe:[123]>, "x", 1) = 1',
    'write(6<anon_inode:[eventfd]>, "x", 1) = 1',
    'write(7</dev/null>, "x", 1) = 1',
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
    readinessMaxAttempts: 4,
    readinessProcessTimeoutMs: 10_000,
    readinessDelayMs: 500,
    candidateHandshakeTimeoutMs: 8_000,
    drainMs: 1_000,
    traceMaxOutputBytes: 64 * 1024 * 1024,
    observerTimeoutMs: 67_500,
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

test("macOS fs_usage excludes only inherited process-stream writes", () => {
  assert.equal(isMacPersistentWriteLine("12:00:00.100 write F=1 B=0x20 aasobs.1"), false);
  assert.equal(isMacPersistentWriteLine("12:00:00.110 writev F=2 B=0x20 aasobs.1"), false);
  assert.equal(isMacPersistentWriteLine("12:00:00.120 write F=3 B=0x20 aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.130 WrData[A] F=1 /tmp/reopened-output aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.140 WrMeta[A] F=2 /tmp/reopened-error aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.150 rename F=1 /tmp/renamed aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.160 fsync F=2 aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.170 write F=10 B=0x20 aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.180 write_nocancel F=1 B=0x20 aasobs.1"), true);
  assert.equal(isMacPersistentWriteLine("12:00:00.190 write F=1 /tmp/project/rebound.log aasobs.1", { project: "/tmp/project" }), true);
  const result = parseMacCombinedFsUsage([
    "12:00:00.005 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1",
    "12:00:00.010 WrData[A] F=3 /tmp/aas-start-1 aasobs.1",
    "12:00:00.020 write F=1 B=0x20 aasobs.1",
    "12:00:00.030 write F=2 B=0x20 aasobs.1",
    "12:00:00.040 WrData[A] F=1 /tmp/reopened-output aasobs.1",
  ].join("\n"), {}, "aas-ready-1", "aas-start-1");
  assert.equal(result.writeAttempts, 1);
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
  const bufferedOutOfOrder = parseMacCombinedFsUsage([
    "12:00:02.030 connect 127.0.0.1:9 node.1",
    "12:00:02.020 WrData[A] F=3 /tmp/candidate-output node.1",
    "12:00:00.005 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1",
    "12:00:02.010 WrData[A] F=3 /tmp/aas-start-1 aasobs.1",
  ].join("\n"), {}, "aas-ready-1", "aas-start-1");
  assert.deepEqual([bufferedOutOfOrder.networkAttempts, bufferedOutOfOrder.writeAttempts], [1, 1]);
  const midnightWrap = parseMacCombinedFsUsage([
    "00:00:00.250 connect 127.0.0.1:9 node.1",
    "23:59:59.900 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1",
    "00:00:00.100 WrData[A] F=3 /tmp/aas-start-1 aasobs.1",
    "00:00:00.200 WrData[A] F=3 /tmp/candidate-output node.1",
  ].join("\n"), {}, "aas-ready-1", "aas-start-1");
  assert.deepEqual([midnightWrap.networkAttempts, midnightWrap.writeAttempts], [1, 1]);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.010 WrData[A] F=3 /tmp/aas-start-1 aasobs.1\n", {}, "aas-ready-1", "aas-start-1"), /readiness canary/);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.010 WrData[A] F=3 /tmp/aas-ready-1 aasobs.1\n", {}, "aas-ready-1", "aas-start-1"), /candidate start canary/);
});

test("macOS observer keeps transaction children inside its native process filter", () => {
  const input = JSON.stringify({ executable: "/usr/local/bin/node", args: ["candidate.js"], untouched: true });
  assert.deepEqual(JSON.parse(rewriteMacObservedNodeInput(input, "/usr/local/bin/node", "/tmp/aasobs123")), {
    executable: "/tmp/aasobs123",
    args: ["candidate.js"],
    untouched: true,
  });
  assert.equal(rewriteMacObservedNodeInput(input, "/other/node", "/tmp/aasobs123"), input);
  assert.equal(rewriteMacObservedNodeInput("not-json", "/usr/local/bin/node", "/tmp/aasobs123"), "not-json");
});
