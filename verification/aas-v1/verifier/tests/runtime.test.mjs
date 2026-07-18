import assert from "node:assert/strict";
import test from "node:test";
import { npmInvocation } from "../lib/runtime.mjs";

test("npm invocation executes directly on POSIX", () => {
  assert.deepEqual(npmInvocation(["install", "/tmp/candidate.tgz"], "linux", {}), {
    executable: "npm",
    args: ["install", "/tmp/candidate.tgz"],
  });
});

test("npm invocation runs npm-cli.js through the current Windows Node binary", () => {
  assert.deepEqual(npmInvocation(["install", "C:\\runner temp\\candidate.tgz"], "win32", "C:\\node\\node.exe"), {
    executable: "C:\\node\\node.exe",
    args: ["C:\\node\\node_modules\\npm\\bin\\npm-cli.js", "install", "C:\\runner temp\\candidate.tgz"],
  });
});

test("npm invocation rejects an untrusted Windows Node executable", () => {
  assert.throws(
    () => npmInvocation(["install"], "win32", "relative\\node.exe"),
    (error) => error.code === "AAS_VERIFIER_UNSAFE_NODE_EXECUTABLE",
  );
});
