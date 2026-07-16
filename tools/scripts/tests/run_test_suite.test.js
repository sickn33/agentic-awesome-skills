const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  NETWORK_TEST_FILES,
  discoverTestCommands,
  isTestFile,
  listFiles,
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

function main() {
  testDiscoveryCoversEveryRepositoryTestFile();
  testNetworkTestsRemainExplicitlySeparated();
  console.log("run-test-suite discovery tests passed.");
}

main();
