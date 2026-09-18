const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  NETWORK_TEST_FILES,
  discoverTestCommands,
  isTestFile,
  listFiles,
  parseArgs,
  shardCommands,
  stableShardIndex,
} = require("./run-test-suite.js");

const TEST_ROOT = path.join("tools", "scripts", "tests");

function commandPath(command) {
  return command.at(-1);
}

function testDiscoveryCoversEveryRepositoryTestFile() {
  const expected = [...new Set([
    ...listFiles(TEST_ROOT)
      .filter((filePath) => isTestFile(path.relative(TEST_ROOT, filePath))),
    ...NETWORK_TEST_FILES,
  ])].sort();
  const { local, network } = discoverTestCommands();
  const actual = [...local, ...network].map(commandPath).sort();

  assert.deepStrictEqual(actual, expected);
  assert.ok(actual.includes(path.join(TEST_ROOT, "test_ws_listener_security.py")));
  assert.ok(actual.includes(path.join(TEST_ROOT, "run_test_suite.test.js")));
}

function testNetworkTestsRemainExplicitlySeparated() {
  const { local, network } = discoverTestCommands();
  const localPaths = new Set(local.map(commandPath));
  const networkPaths = new Set(network.map(commandPath));

  assert.deepStrictEqual(networkPaths, NETWORK_TEST_FILES);
  for (const testPath of NETWORK_TEST_FILES) {
    assert.ok(!localPaths.has(testPath));
    assert.ok(fs.existsSync(testPath));
  }
}

function testDefaultAndNetworkModesRejectSharding() {
  assert.deepStrictEqual(parseArgs([]), {
    mode: null,
    shardIndex: null,
    shardCount: null,
  });
  assert.deepStrictEqual(parseArgs(["--network"]), {
    mode: "--network",
    shardIndex: null,
    shardCount: null,
  });
  assert.throws(
    () => parseArgs(["--shard-index", "0", "--shard-count", "2"]),
    /only with explicit --local mode/,
  );
  assert.throws(
    () => parseArgs(["--network", "--shard-index=0", "--shard-count=2"]),
    /only with explicit --local mode/,
  );
}

function testShardArgumentsFailClosed() {
  assert.deepStrictEqual(
    parseArgs(["--local", "--shard-index", "0", "--shard-count=3"]),
    { mode: "--local", shardIndex: 0, shardCount: 3 },
  );
  assert.throws(() => parseArgs(["--local", "--shard-index", "0"]), /supplied together/);
  assert.throws(
    () => parseArgs(["--local", "--shard-index", "3", "--shard-count", "3"]),
    /zero-based/,
  );
  assert.throws(
    () => parseArgs(["--local", "--shard-index", "0", "--shard-count", "0"]),
    /at least 1/,
  );
  assert.throws(
    () => parseArgs(["--local", "--shard-index", "x", "--shard-count", "3"]),
    /must be an integer/,
  );
  assert.throws(() => parseArgs(["--local", "--unexpected"]), /Unknown test option/);
}

function testStableShardingPartitionsEveryLocalTestExactlyOnce() {
  const { local } = discoverTestCommands();
  const shardCount = 4;
  const assignments = new Map();

  for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
    for (const command of shardCommands(local, shardIndex, shardCount)) {
      const testPath = commandPath(command);
      assert.strictEqual(stableShardIndex(testPath, shardCount), shardIndex);
      assignments.set(testPath, (assignments.get(testPath) || 0) + 1);
    }
  }

  assert.deepStrictEqual(
    [...assignments.keys()].sort(),
    local.map(commandPath).sort(),
  );
  assert.ok([...assignments.values()].every((count) => count === 1));

  const reversed = [...local].reverse();
  for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
    assert.deepStrictEqual(
      shardCommands(reversed, shardIndex, shardCount).map(commandPath).sort(),
      shardCommands(local, shardIndex, shardCount).map(commandPath).sort(),
    );
  }
}

function main() {
  testDiscoveryCoversEveryRepositoryTestFile();
  testNetworkTestsRemainExplicitlySeparated();
  testDefaultAndNetworkModesRejectSharding();
  testShardArgumentsFailClosed();
  testStableShardingPartitionsEveryLocalTestExactlyOnce();
  console.log("run-test-suite discovery and sharding tests passed.");
}

main();
