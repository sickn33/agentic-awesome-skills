const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const release = require("../release_workflow.js");

assert.strictEqual(release.isPrereleaseVersion("15.0.0-rc.1"), true);
assert.strictEqual(release.isPrereleaseVersion("15.0.0"), false);
assert.strictEqual(release.isPrereleaseVersion("15.0.0+build.1"), false);
assert.throws(() => release.isPrereleaseVersion("15.0"), /Invalid semantic version/);

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

const mergeOid = "a".repeat(40);
const candidate = {
  number: 10,
  title: "chore: release v1.2.3",
  author: { login: "owner" },
  headRefName: "release/v1.2.3",
  headRepository: { nameWithOwner: "owner/repo" },
  baseRefName: "main",
  mergeCommit: { oid: mergeOid },
  mergedAt: "2026-01-01T00:00:00Z",
};
const releaseIdentity = { repoSlug: "owner/repo", ownerLogin: "owner" };
assert.strictEqual(release.selectMergedReleaseCandidate([candidate], "1.2.3", releaseIdentity), candidate);
assert.throws(() => release.selectMergedReleaseCandidate([], "1.2.3", releaseIdentity), /exactly one/);
const newerCandidate = {
  ...candidate,
  number: 11,
  mergeCommit: { oid: "b".repeat(40) },
  mergedAt: "2026-01-02T00:00:00Z",
};
assert.throws(
  () => release.selectMergedReleaseCandidate([candidate, newerCandidate], "1.2.3", releaseIdentity),
  /found 2/,
);
assert.throws(
  () => release.selectMergedReleaseCandidate([{ ...candidate, headRepository: { nameWithOwner: "attacker/repo" } }], "1.2.3", releaseIdentity),
  /found 0/,
);
assert.throws(
  () => release.selectMergedReleaseCandidate([{ ...candidate, author: { login: "collaborator" } }], "1.2.3", releaseIdentity),
  /found 0/,
);

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
