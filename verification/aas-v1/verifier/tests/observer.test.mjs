import assert from "node:assert/strict";
import test from "node:test";
import { parseDelimitedObserver, parseLinuxStrace } from "../lib/observer.mjs";

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

