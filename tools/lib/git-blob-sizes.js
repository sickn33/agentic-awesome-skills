const { spawnSync } = require("child_process");

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function runCommand(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    input: options.input,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (typeof result.status !== "number" || result.status !== 0) {
    throw new Error(result.stderr.trim() || `${command} ${args.join(" ")} failed with status ${result.status}`);
  }
  return result.stdout.trim();
}

function resolveBlobSizes(projectRoot, records, options = {}) {
  const execute = options.runCommand || runCommand;
  const objectIds = [...new Set(records.flatMap((record) => [record.old_oid, record.new_oid]))]
    .filter((oid) => FULL_SHA_PATTERN.test(String(oid || "")) && !/^0+$/u.test(oid));
  if (!objectIds.length) {
    throw new Error("Raw Git diff did not contain any materialized blob object IDs.");
  }

  const stdout = execute(
    "git",
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    projectRoot,
    { capture: true, input: `${objectIds.join("\n")}\n` },
  );
  const sizes = new Map();
  for (const line of String(stdout || "").split(/\r?\n/u).filter(Boolean)) {
    const match = line.match(/^(?<oid>[0-9a-f]{40}) (?<type>\S+) (?<size>\d+)$/u);
    if (!match?.groups || !objectIds.includes(match.groups.oid)) {
      throw new Error(`Unexpected git cat-file response: ${line}`);
    }
    if (match.groups.type !== "blob") {
      throw new Error(`Object ${match.groups.oid} is ${match.groups.type}, not a blob.`);
    }
    const size = Number(match.groups.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`Object ${match.groups.oid} has an invalid size.`);
    }
    sizes.set(match.groups.oid, size);
  }
  for (const oid of objectIds) {
    if (!sizes.has(oid)) {
      throw new Error(`git cat-file did not return metadata for ${oid}.`);
    }
  }
  return sizes;
}

module.exports = { resolveBlobSizes };
