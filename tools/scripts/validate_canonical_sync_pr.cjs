#!/usr/bin/env node

const { execFileSync } = require("child_process");

const { parseRawDiff } = require("../lib/git-raw-diff");
const {
  getManagedFiles,
  loadWorkflowContract,
  matchesContractEntry,
  validateRawRepoPath,
} = require("../lib/workflow-contract");

function parseArgs(argv) {
  const options = { base: "origin/main", head: "HEAD", includeReleaseManaged: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--include-release-managed") {
      options.includeReleaseManaged = true;
      continue;
    }
    if (argument === "--base" || argument === "--head") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a Git revision.`);
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function validateRecords(records, managedFiles) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Canonical sync PR contains no changed files.");
  }

  const rejected = [];
  for (const record of records) {
    for (const filePath of [record.old_path, record.new_path].filter(Boolean)) {
      const pathValidation = validateRawRepoPath(filePath);
      const managed = managedFiles.some((entry) => matchesContractEntry(filePath, entry));
      if (!pathValidation.safe || !managed) {
        rejected.push(filePath);
      }
    }
  }

  if (rejected.length > 0) {
    throw new Error(
      `Canonical sync PR contains unmanaged or unsafe paths: ${[...new Set(rejected)].sort().join(", ")}`,
    );
  }

  return {
    changedFiles: [...new Set(records.flatMap((record) => [record.old_path, record.new_path]).filter(Boolean))].sort(),
  };
}

function readDiff(base, head) {
  return execFileSync(
    "git",
    ["diff", "--raw", "-z", "--no-abbrev", "--no-renames", `${base}...${head}`, "--"],
    { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const contract = loadWorkflowContract(__dirname);
  const managedFiles = getManagedFiles(contract, {
    includeMixed: true,
    includeReleaseManaged: options.includeReleaseManaged,
  });
  const records = parseRawDiff(readDiff(options.base, options.head), { allowEmpty: true });
  const result = validateRecords(records, managedFiles);
  process.stdout.write(
    `Canonical sync PR is restricted to ${result.changedFiles.length} managed file(s).\n`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, validateRecords };
