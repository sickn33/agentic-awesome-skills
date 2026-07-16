const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const helper = path.join(projectRoot, "skills", "git-pushing", "scripts", "smart_commit.sh");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "git-pushing-helper-"));

function run(command, args, cwd, expectedStatus = 0, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  assert.strictEqual(
    result.status,
    expectedStatus,
    `${command} ${args.join(" ")} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function git(cwd, ...args) {
  return run("git", args, cwd).stdout.trim();
}

try {
  const remote = path.join(tempRoot, "remote.git");
  const repo = path.join(tempRoot, "repo");
  fs.mkdirSync(repo);
  run("git", ["init", "--bare", remote], tempRoot);
  run("git", ["init", "-b", "main"], repo);
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "remote", "add", "origin", remote);

  fs.writeFileSync(path.join(repo, "intended.txt"), "base\n");
  fs.writeFileSync(path.join(repo, "unrelated.txt"), "base\n");
  fs.writeFileSync(path.join(repo, "staged.txt"), "base\n");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "chore: seed repository");
  git(repo, "push", "-u", "origin", "main");
  git(repo, "branch", "--unset-upstream");

  fs.writeFileSync(path.join(repo, "intended.txt"), "selected change\n");
  fs.writeFileSync(path.join(repo, "unrelated.txt"), "keep local\n");
  run("bash", [helper, "fix: commit selected path", "--", "intended.txt"], repo);
  assert.deepStrictEqual(git(repo, "show", "--pretty=", "--name-only", "HEAD").split("\n"), ["intended.txt"]);
  assert.match(git(repo, "status", "--short"), /^\s*M unrelated\.txt$/m);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/heads/main"));
  assert.strictEqual(git(repo, "rev-parse", "@{upstream}"), git(remote, "rev-parse", "refs/heads/main"));
  git(repo, "restore", "unrelated.txt");

  fs.writeFileSync(path.join(repo, "hidden.txt"), "base\n");
  git(repo, "add", "hidden.txt");
  git(repo, "commit", "-m", "chore: add hidden fixture");
  git(repo, "push", "origin", "main");
  git(repo, "update-index", "--assume-unchanged", "hidden.txt");
  fs.writeFileSync(path.join(repo, "hidden.txt"), "must remain hidden\n");
  fs.writeFileSync(path.join(repo, "intended.txt"), "visible all-path change\n");
  run("bash", [helper, "fix: preserve live index flags"], repo);
  assert.deepStrictEqual(git(repo, "show", "--pretty=", "--name-only", "HEAD").split("\n"), ["intended.txt"]);
  assert.strictEqual(git(repo, "show", "HEAD:hidden.txt"), "base");
  git(repo, "update-index", "--no-assume-unchanged", "hidden.txt");
  git(repo, "restore", "hidden.txt", "unrelated.txt");
  fs.writeFileSync(path.join(repo, "unrelated.txt"), "keep local\n");

  const headBeforeEmptySelector = git(repo, "rev-parse", "HEAD");
  const emptySelector = run("bash", [helper, "fix: reject empty selector", "--"], repo, 1);
  assert.match(emptySelector.stderr, /requires at least one path/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeEmptySelector);
  assert.match(git(repo, "status", "--short"), /^\s*M unrelated\.txt$/m);

  const invalidMessage = run("bash", [helper, "not conventional", "--", "intended.txt"], repo, 1);
  assert.match(invalidMessage.stderr, /conventional/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeEmptySelector);

  fs.writeFileSync(path.join(repo, "staged.txt"), "pre-staged change\n");
  fs.writeFileSync(path.join(repo, "intended.txt"), "second selected change\n");
  git(repo, "add", "staged.txt");
  const headBeforeRejection = git(repo, "rev-parse", "HEAD");
  const rejected = run("bash", [helper, "fix: must reject mixed index", "--", "intended.txt"], repo, 1);
  assert.match(rejected.stderr, /index already contains staged changes/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeRejection);
  const rejectedStatus = git(repo, "status", "--short");
  assert.match(rejectedStatus, /^\s*M intended\.txt$/m);
  assert.match(rejectedStatus, /^M  staged\.txt$/m);

  const alternateIndex = path.join(tempRoot, "alternate-index");
  run("git", ["read-tree", "HEAD"], repo, 0, { GIT_INDEX_FILE: alternateIndex });
  const alternateIndexRejected = run(
    "bash",
    [helper, "fix: ignore inherited alternate index", "--", "intended.txt"],
    repo,
    1,
    { GIT_INDEX_FILE: alternateIndex },
  );
  assert.match(alternateIndexRejected.stderr, /index already contains staged changes/i);
  assert.match(git(repo, "status", "--short"), /^M  staged\.txt$/m);

  git(repo, "restore", "--staged", "staged.txt");
  git(repo, "restore", "intended.txt", "staged.txt", "unrelated.txt");
  const empty = run("bash", [helper, "chore: no changes"], repo, 1);
  assert.match(empty.stderr, /no changes staged for commit/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeRejection);

  const upstream = path.join(tempRoot, "upstream.git");
  run("git", ["init", "--bare", upstream], tempRoot);
  git(repo, "remote", "add", "upstream", upstream);
  git(repo, "push", "upstream", "main");
  git(repo, "config", "branch.main.remote", "upstream");
  git(repo, "config", "branch.main.merge", "refs/heads/main");
  git(repo, "config", "branch.main.pushRemote", "origin");
  const upstreamBeforeTriangularPush = git(upstream, "rev-parse", "refs/heads/main");
  fs.writeFileSync(path.join(repo, "intended.txt"), "configured upstream change\n");
  run("bash", [helper, "refactor: honor configured push remote", "--", "intended.txt"], repo);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/heads/main"));
  assert.strictEqual(git(upstream, "rev-parse", "refs/heads/main"), upstreamBeforeTriangularPush);

  const hookPath = path.join(repo, ".git", "hooks", "pre-commit");
  fs.writeFileSync(hookPath, "#!/bin/sh\ngit add unrelated.txt\n");
  fs.chmodSync(hookPath, 0o755);
  const headBeforeHook = git(repo, "rev-parse", "HEAD");
  const upstreamBeforeHook = git(upstream, "rev-parse", "refs/heads/main");
  fs.writeFileSync(path.join(repo, "intended.txt"), "hook-protected intended change\n");
  fs.writeFileSync(path.join(repo, "unrelated.txt"), "hook must not add this\n");
  const hookRejected = run("bash", [helper, "fix: reject hook-expanded tree", "--", "intended.txt"], repo, 1);
  assert.match(hookRejected.stderr, /pre-commit hooks changed the isolated index/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeHook);
  assert.strictEqual(git(remote, "rev-parse", "refs/heads/main"), headBeforeHook);
  assert.strictEqual(git(upstream, "rev-parse", "refs/heads/main"), upstreamBeforeHook);
  assert.match(git(repo, "status", "--short"), /^\s*M intended\.txt$/m);
  assert.match(git(repo, "status", "--short"), /^\s*M unrelated\.txt$/m);
  fs.unlinkSync(hookPath);
  git(repo, "restore", "intended.txt", "unrelated.txt");

  const postCommitHook = path.join(repo, ".git", "hooks", "post-commit");
  const headBeforePostCommitRace = git(repo, "rev-parse", "HEAD");
  const originBeforePostCommitRace = git(remote, "rev-parse", "refs/heads/main");
  fs.writeFileSync(
    postCommitHook,
    `#!/bin/sh\ngit update-ref refs/heads/main ${headBeforePostCommitRace}\n`,
  );
  fs.chmodSync(postCommitHook, 0o755);
  fs.writeFileSync(path.join(repo, "intended.txt"), "post-commit race change\n");
  const postCommitRace = run("bash", [helper, "fix: lock branch during post-commit", "--", "intended.txt"], repo);
  assert.match(postCommitRace.stderr, /cannot lock ref/i);
  assert.match(postCommitRace.stderr, /post-commit hook failed/i);
  assert.notStrictEqual(git(repo, "rev-parse", "HEAD"), headBeforePostCommitRace);
  assert.notStrictEqual(git(remote, "rev-parse", "refs/heads/main"), originBeforePostCommitRace);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/heads/main"));
  assert.strictEqual(git(repo, "status", "--short"), "");
  fs.unlinkSync(postCommitHook);
  git(repo, "restore", "intended.txt");

  const headBeforeFailingPostCommit = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(postCommitHook, "#!/bin/sh\nexit 23\n");
  fs.chmodSync(postCommitHook, 0o755);
  fs.writeFileSync(path.join(repo, "intended.txt"), "failing post-commit change\n");
  const failingPostCommit = run(
    "bash",
    [helper, "fix: keep index consistent after hook failure", "--", "intended.txt"],
    repo,
  );
  assert.match(failingPostCommit.stderr, /post-commit hook failed/i);
  assert.notStrictEqual(git(repo, "rev-parse", "HEAD"), headBeforeFailingPostCommit);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/heads/main"));
  assert.strictEqual(git(repo, "status", "--short"), "");
  fs.unlinkSync(postCommitHook);

  const headBeforePushRace = git(repo, "rev-parse", "HEAD");
  const prePushHook = path.join(repo, ".git", "hooks", "pre-push");
  fs.writeFileSync(
    prePushHook,
    `#!/bin/sh\ngit update-ref refs/heads/main ${headBeforeFailingPostCommit}\n`,
  );
  fs.chmodSync(prePushHook, 0o755);
  fs.writeFileSync(path.join(repo, "intended.txt"), "late ref race change\n");
  const pushRace = run(
    "bash",
    [helper, "fix: lock the branch during push hooks", "--", "intended.txt"],
    repo,
    1,
  );
  assert.match(pushRace.stderr, /cannot lock ref|pre-push hook declined/i);
  const remoteAfterPushRace = git(remote, "rev-parse", "refs/heads/main");
  assert.strictEqual(remoteAfterPushRace, headBeforePushRace);
  assert.strictEqual(git(repo, "show", "-s", "--format=%s", "HEAD"), "fix: lock the branch during push hooks");
  assert.strictEqual(git(repo, "status", "--short"), "");
  fs.unlinkSync(prePushHook);
  git(repo, "push", "origin", "HEAD:main");

  git(repo, "config", "branch.main.pushRemote", "upstream");
  git(repo, "config", "branch.main.remote", "upstream");
  git(repo, "config", "branch.main.merge", "refs/pull/123/head");
  const headBeforeReadOnlyUpstream = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "intended.txt"), "read-only upstream change\n");
  const readOnlyUpstream = run(
    "bash",
    [helper, "fix: reject non-branch upstream", "--", "intended.txt"],
    repo,
    1,
  );
  assert.match(readOnlyUpstream.stderr, /not a pushable branch ref/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeReadOnlyUpstream);
  assert.strictEqual(git(upstream, "show-ref", "--verify", "--quiet", "refs/heads/main"), "");
  git(repo, "restore", "intended.txt");
  git(repo, "config", "branch.main.merge", "refs/heads/main");
  git(repo, "config", "branch.main.pushRemote", "origin");

  const linkedWorktree = path.join(tempRoot, "linked-worktree");
  run("git", ["worktree", "add", "-b", "linked-test", linkedWorktree, "main"], repo);
  const linkedParent = git(linkedWorktree, "rev-parse", "HEAD");
  fs.writeFileSync(
    postCommitHook,
    `#!/bin/sh\ngit update-ref refs/heads/linked-test ${linkedParent}\n`,
  );
  fs.chmodSync(postCommitHook, 0o755);
  fs.appendFileSync(path.join(linkedWorktree, "intended.txt"), `linked worktree race from ${linkedParent}\n`);
  const linkedRace = run(
    "bash",
    [helper, "fix: lock common worktree refs", "--", "intended.txt"],
    linkedWorktree,
  );
  assert.match(linkedRace.stderr, /cannot lock ref/i);
  assert.match(linkedRace.stderr, /post-commit hook failed/i);
  assert.notStrictEqual(git(linkedWorktree, "rev-parse", "HEAD"), linkedParent);
  assert.strictEqual(git(linkedWorktree, "status", "--short"), "");
  fs.unlinkSync(postCommitHook);
  run("git", ["worktree", "remove", linkedWorktree], repo);

  git(repo, "switch", "--detach");
  const detachedHead = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "intended.txt"), "detached change\n");
  const detached = run("bash", [helper, "fix: reject detached head", "--", "intended.txt"], repo, 1);
  assert.match(detached.stderr, /detached HEAD/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), detachedHead);
  git(repo, "restore", "intended.txt");
  git(repo, "switch", "main");

  const legacyRepo = path.join(tempRoot, "legacy-ref-format-repo");
  const legacyRemote = path.join(tempRoot, "legacy-ref-format-remote.git");
  const shimDir = path.join(tempRoot, "legacy-git-shim");
  fs.mkdirSync(legacyRepo);
  fs.mkdirSync(shimDir);
  run("git", ["init", "--bare", legacyRemote], tempRoot);
  run("git", ["init", "-b", "main"], legacyRepo);
  git(legacyRepo, "config", "user.name", "Test User");
  git(legacyRepo, "config", "user.email", "test@example.com");
  git(legacyRepo, "remote", "add", "origin", legacyRemote);
  fs.writeFileSync(path.join(legacyRepo, "file.txt"), "base\n");
  git(legacyRepo, "add", "file.txt");
  git(legacyRepo, "commit", "-m", "chore: seed legacy Git repository");
  git(legacyRepo, "push", "-u", "origin", "main");
  fs.writeFileSync(
    path.join(shimDir, "git"),
    `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--show-ref-format" ]; then
  printf '%s\\n' --show-ref-format
  exit 0
fi
exec "$REAL_GIT" "$@"
`,
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(legacyRepo, "file.txt"), "legacy Git change\n");
  run(
    "bash",
    [helper, "fix: support legacy ref format detection", "--", "file.txt"],
    legacyRepo,
    0,
    { PATH: `${shimDir}${path.delimiter}${process.env.PATH}`, REAL_GIT: run("which", ["git"], tempRoot).stdout.trim() },
  );
  assert.strictEqual(git(legacyRepo, "show", "-s", "--format=%s", "HEAD"), "fix: support legacy ref format detection");
  assert.strictEqual(git(legacyRepo, "rev-parse", "HEAD"), git(legacyRemote, "rev-parse", "refs/heads/main"));

  const reftableRepo = path.join(tempRoot, "reftable-repo");
  run("git", ["init", "--ref-format=reftable", "-b", "main", reftableRepo], tempRoot);
  git(reftableRepo, "config", "user.name", "Test User");
  git(reftableRepo, "config", "user.email", "test@example.com");
  fs.writeFileSync(path.join(reftableRepo, "file.txt"), "base\n");
  git(reftableRepo, "add", "file.txt");
  git(reftableRepo, "commit", "-m", "chore: seed reftable repository");
  const reftableHead = git(reftableRepo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(reftableRepo, "file.txt"), "change\n");
  const reftableRejected = run(
    "bash",
    [helper, "fix: reject unsupported ref backend", "--", "file.txt"],
    reftableRepo,
    1,
  );
  assert.match(reftableRejected.stderr, /ref backend 'reftable'/i);
  assert.strictEqual(git(reftableRepo, "rev-parse", "HEAD"), reftableHead);
  assert.strictEqual(git(reftableRepo, "status", "--short"), "M file.txt");

  git(repo, "remote", "remove", "upstream");
  git(repo, "remote", "remove", "origin");
  const headBeforeMissingRemote = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "intended.txt"), "missing remote change\n");
  const missingRemote = run("bash", [helper, "fix: reject missing remote", "--", "intended.txt"], repo, 1);
  assert.match(missingRemote.stderr, /does not exist/i);
  assert.strictEqual(git(repo, "rev-parse", "HEAD"), headBeforeMissingRemote);

  console.log("git-pushing helper tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
