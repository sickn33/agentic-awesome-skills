import assert from "node:assert/strict";
import test from "node:test";
import { parseDelimitedObserver, parseLinuxStrace, parseMacCombinedFsUsage, parseMacFsUsage } from "../lib/observer.mjs";

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

test("combined macOS fs_usage parser requires bootstrap lineage and classifies native calls", () => {
  const result = parseMacCombinedFsUsage([
    "12:00:00.005 WrData[A] F=3 /tmp/aas-ready-1 zsh.1",
    "12:00:00.010 execve node node.1",
    "12:00:00.020 WrData[A] F=3 /tmp/canary node.1",
    "12:00:00.030 connect 127.0.0.1:9 node.1",
    "12:00:00.040 posix_spawn child node.1",
  ].join("\n"), {}, "aas-ready-1");
  assert.deepEqual([result.networkAttempts, result.writeAttempts, result.childProcesses], [1, 1, 1]);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.020 WrData[A] F=3 /tmp/canary node.1\n"), /bootstrap exec/);
  assert.throws(() => parseMacCombinedFsUsage("12:00:00.010 execve node node.1\n", {}, "aas-ready-1"), /readiness canary/);
});
