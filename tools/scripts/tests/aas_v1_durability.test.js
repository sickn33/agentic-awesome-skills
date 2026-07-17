"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const DURABILITY_MODULE = path.join(__dirname, "../../lib/aas-v1/durability.js");

function loadWithWindowsHelperResult(result) {
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  const originalSpawnSync = childProcess.spawnSync;
  Object.defineProperty(process, "platform", { ...platformDescriptor, value: "win32" });
  childProcess.spawnSync = () => result;
  delete require.cache[require.resolve(DURABILITY_MODULE)];
  const durability = require(DURABILITY_MODULE);
  return {
    durability,
    restore() {
      delete require.cache[require.resolve(DURABILITY_MODULE)];
      childProcess.spawnSync = originalSpawnSync;
      Object.defineProperty(process, "platform", platformDescriptor);
    },
  };
}

test("Windows directory-flush failures expose only a structured native phase and error number", () => {
  const loaded = loadWithWindowsHelperResult({
    status: 42,
    stdout: "AAS_WIN32_DIRECTORY_FLUSH_FAILURE|flushFileBuffers|6\r\n",
    stderr: "sensitive path must not be copied",
  });
  try {
    assert.throws(
      () => loaded.durability.fsyncDirectorySync(path.join(__dirname, "missing-directory")),
      (error) => {
        assert.equal(error.code, "AAS_DURABILITY_CAPABILITY_UNAVAILABLE");
        assert.deepEqual(error.details, {
          platform: "win32",
          capability: "directoryMetadataFlush",
          helperPhase: "flushFileBuffers",
          win32Error: 6,
        });
        assert.ok(!JSON.stringify(error.details).includes("sensitive"));
        assert.ok(!JSON.stringify(error.details).includes(__dirname));
        return true;
      },
    );
  } finally {
    loaded.restore();
  }
});

test("unexpected PowerShell output stays redacted and fail-closed", () => {
  const loaded = loadWithWindowsHelperResult({
    status: 1,
    stdout: "C:\\sensitive\\project\\path",
    stderr: "another sensitive path",
  });
  try {
    assert.throws(
      () => loaded.durability.fsyncDirectorySync(path.join(__dirname, "missing-directory")),
      (error) => {
        assert.equal(error.code, "AAS_DURABILITY_CAPABILITY_UNAVAILABLE");
        assert.deepEqual(error.details, {
          platform: "win32",
          capability: "directoryMetadataFlush",
          helperPhase: "unknown",
          helperExitCode: 1,
        });
        return true;
      },
    );
  } finally {
    loaded.restore();
  }
});
