#!/usr/bin/env node

const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
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

// These groups read repository inputs and write only their own temporary
// fixtures. Keep all other groups behind the completion barrier. Priority is
// observational scheduling only; it never selects or removes required tests.
const ISOLATED_COHORT = [
  "aas_v1_runtime_config.test.js",
  "test_report_skill_boundary_examples.py",
  "aas_v1_update.test.js",
  "aas_v1_cli.test.js",
  "npm_package_contents.test.js",
  "aas_v1_mcp.test.js",
].map(name => path.join(TOOL_TESTS, name));

function cohortWorkers(environment = process.env) {
  const value = environment.AAS_TEST_COHORT_WORKERS;
  if (value === undefined || value === "1") return 1;
  if (value === "2") return 2;
  throw new Error("AAS_TEST_COHORT_WORKERS must be 1 or 2");
}

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

function runNodeCommandAsync(args, report = emitTiming) {
  const startedAt = process.hrtime.bigint();
  return new Promise(resolve => {
    let settled = false;
    function finish(result) {
      if (settled) return;
      settled = true;
      report({ type: "test", path: args.at(-1),
        elapsed_ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000),
        status: result.error || result.signal || result.exitCode !== 0 ? "failed" : "passed" });
      resolve(result);
    }
    try {
      const child = spawn(process.execPath, args, {
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: process.env.PYTHONDONTWRITEBYTECODE || "1" },
        stdio: "inherit", shell: false,
      });
      child.once("error", error => finish({ error, exitCode: 1 }));
      child.once("close", (code, signal) => finish({ exitCode: code ?? 1, signal }));
    } catch (error) { finish({ error, exitCode: 1 }); }
  });
}

async function runIsolatedCohort(commands, workers, execute = runNodeCommandAsync) {
  if (workers !== 2) throw new Error("Isolated cohort requires exactly two workers");
  const byPath = new Map(commands.map(args => [args.at(-1), args]));
  if (byPath.size !== commands.length) throw new Error("Duplicate test group in inventory");
  const cohort = ISOLATED_COHORT.filter(file => byPath.has(file)).map(file => byPath.get(file));
  const selected = new Set(cohort);
  let next = 0;
  let failed = false;
  let failure;
  await Promise.all(Array.from({ length: Math.min(workers, cohort.length) }, async () => {
    while (!failed && next < cohort.length) {
      const args = cohort[next++];
      try {
        const result = await execute(args);
        if (!result || result.error || result.signal || result.exitCode !== 0) {
          const error = new Error(`Test group failed: ${args.at(-1)}`);
          error.exitCode = result?.exitCode || 1;
          error.signal = result?.signal;
          throw error;
        }
      } catch (error) {
        if (!failed) { failed = true; failure = error instanceof Error ? error : new Error("Test execution rejected without an error"); }
      }
    }
  }));
  // Both active children are finished before failure propagation or the
  // sequential remainder. Never exit while a sibling is using its fixtures.
  if (failed) throw failure;
  return commands.filter(args => !selected.has(args));
}

async function runCommandSet(commands, metadata = {}) {
  const startedAt = process.hrtime.bigint();
  const remaining = metadata.workers === 2 ? await runIsolatedCohort(commands, 2) : commands;
  for (const commandArgs of remaining) runNodeCommand(commandArgs);

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  emitTiming({
    type: "summary",
    mode: metadata.mode || "default",
    shard_index: metadata.shardIndex,
    shard_count: metadata.shardCount,
    test_count: commands.length,
    isolated_workers: metadata.workers || 1,
    manifest_sha256: crypto.createHash("sha256").update(JSON.stringify(commands.map(args => args.at(-1)).sort())).digest("hex"),
    elapsed_ms: Math.round(elapsedMs),
  });
}

async function main() {
  const { mode, shardIndex, shardCount } = parseArgs(process.argv.slice(2));
  const workers = cohortWorkers();
  if (shardCount !== null && workers !== 1) throw new Error("Isolated concurrency cannot be combined with local sharding");
  const { local, network } = discoverTestCommands();

  if (mode === "--local") {
    const selected = shardCommands(local, shardIndex, shardCount);
    await runCommandSet(selected, { mode: "local", shardIndex, shardCount, workers });
    return;
  }

  if (mode === "--network") {
    await runCommandSet(network, { mode: "network", shardIndex: null, shardCount: null, workers: 1 });
    return;
  }

  await runCommandSet(local, { mode: "local", shardIndex: null, shardCount: null, workers });

  if (!isNetworkTestsEnabled()) {
    console.log(
      `[tests] Skipping network integration tests. Set ${NETWORK_TEST_ENV}=1 to enable.`,
    );
    return;
  }

  console.log(`[tests] ${NETWORK_TEST_ENV} enabled; running network integration tests.`);
  await runCommandSet(network, { mode: "network", shardIndex: null, shardCount: null, workers: 1 });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    if (error.signal) process.kill(process.pid, error.signal);
    else process.exitCode = error.exitCode || 1;
  });
}

module.exports = {
  NETWORK_TEST_FILES,
  ISOLATED_COHORT,
  cohortWorkers,
  runIsolatedCohort,
  runNodeCommandAsync,
  commandForTest,
  discoverTestCommands,
  isTestFile,
  listFiles,
  parseArgs,
  shardCommands,
  stableShardIndex,
};
