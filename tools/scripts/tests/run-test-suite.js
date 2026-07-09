#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");
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

function runNodeCommand(args) {
  const result = spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: process.env.PYTHONDONTWRITEBYTECODE || "1",
    },
    stdio: "inherit",
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

function runCommandSet(commands) {
  for (const commandArgs of commands) {
    runNodeCommand(commandArgs);
  }
}

function main() {
  const mode = process.argv[2];
  const { local, network } = discoverTestCommands();

  if (mode === "--local") {
    runCommandSet(local);
    return;
  }

  if (mode === "--network") {
    runCommandSet(network);
    return;
  }

  if (mode) {
    throw new Error(`Unknown test mode: ${mode}`);
  }

  runCommandSet(local);

  if (!isNetworkTestsEnabled()) {
    console.log(
      `[tests] Skipping network integration tests. Set ${NETWORK_TEST_ENV}=1 to enable.`,
    );
    return;
  }

  console.log(`[tests] ${NETWORK_TEST_ENV} enabled; running network integration tests.`);
  runCommandSet(network);
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
};
