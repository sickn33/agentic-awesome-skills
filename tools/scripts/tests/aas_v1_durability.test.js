"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const DURABILITY_MODULE = path.join(__dirname, "../../lib/aas-v1/durability.js");

function loadWithWindowsHelperResult(result) {
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  const originalSpawnSync = childProcess.spawnSync;
  const invocations = [];
  Object.defineProperty(process, "platform", { ...platformDescriptor, value: "win32" });
  childProcess.spawnSync = (...invocation) => {
    invocations.push(invocation);
    return result;
  };
  delete require.cache[require.resolve(DURABILITY_MODULE)];
  const durability = require(DURABILITY_MODULE);
  return {
    durability,
    invocations,
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
    const directoryPath = path.join(__dirname, "missing-directory");
    assert.throws(
      () => loaded.durability.fsyncDirectorySync(directoryPath),
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
    assert.equal(loaded.invocations.length, 1);
    const [, helperArguments, helperOptions] = loaded.invocations[0];
    assert.ok(!helperArguments.includes(directoryPath));
    assert.equal(helperOptions.env.AAS_WINDOWS_DIRECTORY_FLUSH_PATH, directoryPath);
    assert.equal(helperOptions.timeout, 60_000);
  } finally {
    loaded.restore();
  }
});

test("Windows helper environment removes case-insensitive path-variable collisions", () => {
  const collisionName = "aas_windows_directory_flush_path";
  const previous = process.env[collisionName];
  process.env[collisionName] = "stale-sensitive-path";
  const loaded = loadWithWindowsHelperResult({ status: 0, stdout: "", stderr: "" });
  try {
    const directoryPath = path.join(__dirname, "missing-directory");
    loaded.durability.fsyncDirectorySync(directoryPath);
    const helperEnvironment = loaded.invocations[0][2].env;
    assert.equal(helperEnvironment.AAS_WINDOWS_DIRECTORY_FLUSH_PATH, directoryPath);
    assert.ok(!Object.keys(helperEnvironment).includes(collisionName));
  } finally {
    loaded.restore();
    if (previous === undefined) delete process.env[collisionName];
    else process.env[collisionName] = previous;
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
