const assert = require("assert");

const {
  parseArgs,
  validateRecords,
} = require("../validate_canonical_sync_pr.cjs");

assert.deepStrictEqual(parseArgs([]), { base: "origin/main", head: "HEAD", includeReleaseManaged: false });
assert.deepStrictEqual(parseArgs(["--base", "base", "--head", "head", "--include-release-managed"]), {
  base: "base",
  head: "head",
  includeReleaseManaged: true,
});
assert.throws(() => parseArgs(["--base"]), /requires a Git revision/);
assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);

const managedFiles = ["skills_index.json", "plugins/", "README.md"];
const result = validateRecords(
  [
    { old_path: "skills_index.json", new_path: "skills_index.json" },
    { old_path: null, new_path: "plugins/example/SKILL.md" },
  ],
  managedFiles,
);
assert.deepStrictEqual(result.changedFiles, ["plugins/example/SKILL.md", "skills_index.json"]);

assert.throws(() => validateRecords([], managedFiles), /contains no changed files/);
assert.throws(
  () => validateRecords([{ old_path: null, new_path: ".github/workflows/ci.yml" }], managedFiles),
  /unmanaged or unsafe paths/,
);
assert.throws(
  () => validateRecords([{ old_path: "plugins/example/SKILL.md", new_path: "../escape" }], managedFiles),
  /unmanaged or unsafe paths/,
);

console.log("Canonical sync PR validation tests passed.");
