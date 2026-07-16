#!/usr/bin/env node

const { getManagedFiles, loadWorkflowContract } = require("../lib/workflow-contract");

function parseArgs(argv) {
  return {
    includeMixed: argv.includes("--include-mixed"),
    includeReleaseManaged: argv.includes("--include-release-managed"),
    json: argv.includes("--json"),
    shell: argv.includes("--shell"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const contract = loadWorkflowContract(__dirname);
  const files = getManagedFiles(contract, {
    includeMixed: args.includeMixed,
    includeReleaseManaged: args.includeReleaseManaged,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(files, null, 2)}\n`);
    return;
  }

  if (args.shell) {
    process.stdout.write(`${files.join(" ")}\n`);
    return;
  }

  process.stdout.write(`${files.join("\n")}\n`);
}

main();
