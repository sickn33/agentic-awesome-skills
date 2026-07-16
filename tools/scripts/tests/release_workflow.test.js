const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const release = require("../release_workflow.js");

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

const mergeOid = "a".repeat(40);
const candidate = {
  number: 10,
  headRefName: "release/v1.2.3",
  baseRefName: "main",
  mergeCommit: { oid: mergeOid },
};
assert.strictEqual(release.selectMergedReleaseCandidate([candidate], "1.2.3"), candidate);
assert.throws(() => release.selectMergedReleaseCandidate([], "1.2.3"), /exactly one/);
assert.throws(() => release.selectMergedReleaseCandidate([candidate, { ...candidate, number: 11 }], "1.2.3"), /exactly one/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-workflow-"));
const repo = path.join(root, "repo");
const remote = path.join(root, "remote.git");
fs.mkdirSync(repo);
git(repo, "init", "-b", "main");
git(repo, "config", "user.name", "Test");
git(repo, "config", "user.email", "test@example.com");
fs.writeFileSync(path.join(repo, "README.md"), "release\n");
git(repo, "add", "README.md");
git(repo, "commit", "-m", "chore: release v1.2.3");
const releaseCommit = git(repo, "rev-parse", "HEAD");

assert.strictEqual(release.validateReleaseSuccessors(repo, releaseCommit, releaseCommit), true);

fs.writeFileSync(path.join(repo, "README.md"), "release synced\n");
git(repo, "commit", "-am", "chore: synchronize canonical repository state");
const canonicalCommit = git(repo, "rev-parse", "HEAD");
let managedValidationCalls = 0;
assert.strictEqual(release.validateReleaseSuccessors(repo, releaseCommit, canonicalCommit, {
  validateManagedRange() { managedValidationCalls += 1; },
}), true);
assert.strictEqual(managedValidationCalls, 1);

fs.writeFileSync(path.join(repo, "README.md"), "unrelated\n");
git(repo, "commit", "-am", "docs: unrelated change");
const unrelatedCommit = git(repo, "rev-parse", "HEAD");
assert.throws(
  () => release.validateReleaseSuccessors(repo, releaseCommit, unrelatedCommit, { validateManagedRange() {} }),
  /Unexpected commit/,
);

git(root, "init", "--bare", remote);
git(repo, "remote", "add", "origin", remote);
git(repo, "tag", "v1.2.3", canonicalCommit);
assert.strictEqual(release.localTagTarget(repo, "v1.2.3"), canonicalCommit);
assert.strictEqual(release.remoteTagTarget(repo, "v1.2.3"), null);
git(repo, "push", "origin", "v1.2.3");
assert.strictEqual(release.remoteTagTarget(repo, "v1.2.3"), canonicalCommit);

fs.rmSync(root, { recursive: true, force: true });
console.log("Release workflow tests passed.");
