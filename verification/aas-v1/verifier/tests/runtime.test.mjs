import assert from "node:assert/strict";
import test from "node:test";
import { npmInvocation } from "../lib/runtime.mjs";

test("npm invocation executes directly on POSIX", () => {
  assert.deepEqual(npmInvocation(["install", "/tmp/candidate.tgz"], "linux", {}), {
    executable: "npm",
    args: ["install", "/tmp/candidate.tgz"],
  });
});

test("npm invocation uses the trusted Windows command processor for npm.cmd", () => {
  assert.deepEqual(npmInvocation(["install", "C:\\runner temp\\candidate.tgz"], "win32", {
    ComSpec: "C:\\Windows\\System32\\cmd.exe",
  }), {
    executable: "C:\\Windows\\System32\\cmd.exe",
    args: ["/D", "/S", "/C", '"npm.cmd" "install" "C:\\runner temp\\candidate.tgz"'],
  });
});

test("npm invocation rejects shell metacharacters and an untrusted COMSPEC", () => {
  assert.throws(
    () => npmInvocation(["install", "C:\\tmp\\candidate&other.tgz"], "win32", { ComSpec: "C:\\Windows\\System32\\cmd.exe" }),
    (error) => error.code === "AAS_VERIFIER_UNSAFE_NPM_ARGUMENT",
  );
  assert.throws(
    () => npmInvocation(["install"], "win32", { ComSpec: "relative\\cmd.exe" }),
    (error) => error.code === "AAS_VERIFIER_UNSAFE_COMSPEC",
  );
});
