#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");

const NETWORK_TEST_ENV = "ENABLE_NETWORK_TESTS";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const TOOL_SCRIPTS = path.join("tools", "scripts");
const TOOL_TESTS = path.join(TOOL_SCRIPTS, "tests");

// Network coverage is deliberately explicit: it depends on live Microsoft
// infrastructure and must not turn every local test run into a network call.
const NETWORK_TEST_FILES = new Set([
  path.join(TOOL_TESTS, "inspect_microsoft_repo.py"),
  path.join(TOOL_TESTS, "test_comprehensive_coverage.py"),
]);

function isTestFile(relativePath) {
  const basename = path.basename(relativePath);
  return (
    /^test_.*\.py$/.test(basename) ||
    /\.test\.(?:js|cjs|mjs)$/.test(basename)
  );
}

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(filePath));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }

  return files.sort();
}

function commandForTest(testPath) {
  return testPath.endsWith(".py")
    ? [path.join(TOOL_SCRIPTS, "run-python.js"), testPath]
    : [testPath];
}

function discoverTestCommands() {
  const discovered = listFiles(TOOL_TESTS)
    .filter((testPath) => isTestFile(path.relative(TOOL_TESTS, testPath)))
    .map(commandForTest);

  const network = [...NETWORK_TEST_FILES]
    .map(commandForTest)
    .sort((left, right) => left.at(-1).localeCompare(right.at(-1)));
  const networkPaths = new Set(NETWORK_TEST_FILES);
  const local = discovered.filter((command) => !networkPaths.has(command.at(-1)));

  return { local, network };
}

function isNetworkTestsEnabled() {
  const value = process.env[NETWORK_TEST_ENV];
  return value
    ? ENABLED_VALUES.has(String(value).trim().toLowerCase())
    : false;
}

function parsePositiveInteger(value, flag) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${flag} must be an integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${flag} is outside the supported integer range`);
  }
  return parsed;
}

function readOptionValue(args, index, flag) {
  const argument = args[index];
  const prefix = `${flag}=`;
  if (argument.startsWith(prefix)) {
    return { value: argument.slice(prefix.length), consumed: 1 };
  }
  if (argument === flag) {
    if (index + 1 >= args.length || args[index + 1].startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return { value: args[index + 1], consumed: 2 };
  }
  return null;
}

function parseArgs(args) {
  let mode = null;
  let shardIndex = null;
  let shardCount = null;

  for (let index = 0; index < args.length;) {
    const argument = args[index];
    if (argument === "--local" || argument === "--network") {
      if (mode) {
        throw new Error(`Test mode specified more than once: ${argument}`);
      }
      mode = argument;
      index += 1;
      continue;
    }

    const indexOption = readOptionValue(args, index, "--shard-index");
    if (indexOption) {
      if (shardIndex !== null) {
        throw new Error("--shard-index specified more than once");
      }
      shardIndex = parsePositiveInteger(indexOption.value, "--shard-index");
      index += indexOption.consumed;
      continue;
    }

    const countOption = readOptionValue(args, index, "--shard-count");
    if (countOption) {
      if (shardCount !== null) {
        throw new Error("--shard-count specified more than once");
      }
      shardCount = parsePositiveInteger(countOption.value, "--shard-count");
      index += countOption.consumed;
      continue;
    }

    throw new Error(`Unknown test option: ${argument}`);
  }

  const hasShardOption = shardIndex !== null || shardCount !== null;
  if (hasShardOption && (shardIndex === null || shardCount === null)) {
    throw new Error("--shard-index and --shard-count must be supplied together");
  }
  if (hasShardOption && mode !== "--local") {
    throw new Error("Test sharding is supported only with explicit --local mode");
  }
  if (hasShardOption && shardCount < 1) {
    throw new Error("--shard-count must be at least 1");
  }
  if (hasShardOption && shardIndex >= shardCount) {
    throw new Error("--shard-index is zero-based and must be less than --shard-count");
  }

  return { mode, shardIndex, shardCount };
}

function stableShardIndex(testPath, shardCount) {
  const digest = crypto.createHash("sha256").update(testPath).digest();
  return digest.readUInt32BE(0) % shardCount;
}

function shardCommands(commands, shardIndex, shardCount) {
  if (shardIndex === null || shardCount === null) {
    return commands;
  }
  return commands.filter(
    (commandArgs) => stableShardIndex(commandArgs.at(-1), shardCount) === shardIndex,
  );
}

function emitTiming(record) {
  console.log(`[tests:timing] ${JSON.stringify(record)}`);
}

function runNodeCommand(args) {
  const startedAt = process.hrtime.bigint();
  const result = spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: process.env.PYTHONDONTWRITEBYTECODE || "1",
    },
    stdio: "inherit",
  });

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  emitTiming({
    type: "test",
    path: args.at(-1),
    elapsed_ms: Math.round(elapsedMs),
    status: result.error || result.signal || result.status !== 0 ? "failed" : "passed",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }

  if (typeof result.status !== "number") {
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function runCommandSet(commands, metadata = {}) {
  const startedAt = process.hrtime.bigint();
  for (const commandArgs of commands) {
    runNodeCommand(commandArgs);
  }

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  emitTiming({
    type: "summary",
    mode: metadata.mode || "default",
    shard_index: metadata.shardIndex,
    shard_count: metadata.shardCount,
    test_count: commands.length,
    elapsed_ms: Math.round(elapsedMs),
  });
}

function main() {
  const { mode, shardIndex, shardCount } = parseArgs(process.argv.slice(2));
  const { local, network } = discoverTestCommands();

  if (mode === "--local") {
    const selected = shardCommands(local, shardIndex, shardCount);
    runCommandSet(selected, { mode: "local", shardIndex, shardCount });
    return;
  }

  if (mode === "--network") {
    runCommandSet(network, { mode: "network", shardIndex: null, shardCount: null });
    return;
  }

  runCommandSet(local, { mode: "local", shardIndex: null, shardCount: null });

  if (!isNetworkTestsEnabled()) {
    console.log(
      `[tests] Skipping network integration tests. Set ${NETWORK_TEST_ENV}=1 to enable.`,
    );
    return;
  }

  console.log(`[tests] ${NETWORK_TEST_ENV} enabled; running network integration tests.`);
  runCommandSet(network, { mode: "network", shardIndex: null, shardCount: null });
}

if (require.main === module) {
  main();
}

module.exports = {
  NETWORK_TEST_FILES,
  commandForTest,
  discoverTestCommands,
  isTestFile,
  listFiles,
  parseArgs,
  shardCommands,
  stableShardIndex,
};
