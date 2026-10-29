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
assert.throws(
  () => release.isPrereleaseVersion("15.0.0 & echo injected"),
  /Invalid semantic version/,
);

for (const invalid of ["15.0.0-01", "15.0.0-rc.01", "15.0.0\n"]) {
  assert.throws(() => release.isPrereleaseVersion(invalid), /Invalid semantic version/);
}

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

const candidateRun = {
  id: 42,
  run_attempt: 1,
  head_sha: "c".repeat(40),
  repository: { full_name: "owner/repo" },
  head_repository: { full_name: "owner/repo" },
  path: ".github/workflows/distribution-candidate.yml",
  event: "push",
  head_branch: "v1.2.3",
  status: "completed",
  conclusion: "success",
};
function candidateProofDependencies(runs) {
  return {
    runCommand(command, args) {
      if (command === "gh" && args[0] === "repo") {
        return JSON.stringify({ nameWithOwner: "owner/repo" });
      }
      if (command === "gh" && args[0] === "api") {
        return JSON.stringify({ workflow_runs: runs });
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    },
  };
}
assert.strictEqual(
  release.requireSuccessfulDistributionCandidate(
    "/fixture",
    "1.2.3",
    candidateRun.head_sha,
    candidateProofDependencies([candidateRun]),
  ).id,
  candidateRun.id,
);
for (const override of [
  { head_sha: "d".repeat(40) },
  { head_branch: "main" },
  { repository: { full_name: "attacker/repo" } },
  { head_repository: { full_name: "attacker/repo" } },
  { path: ".github/workflows/ci.yml" },
  { event: "pull_request" },
  { status: "in_progress" },
  { conclusion: "failure" },
]) {
  assert.throws(
    () => release.requireSuccessfulDistributionCandidate(
      "/fixture",
      "1.2.3",
      candidateRun.head_sha,
      candidateProofDependencies([{ ...candidateRun, ...override }]),
    ),
    /no successful immutable distribution candidate/,
  );
}

const npmRun = {
  id: 73,
  repository: { full_name: "owner/repo" },
  head_repository: { full_name: "owner/repo" },
  path: ".github/workflows/publish-npm.yml",
  event: "workflow_dispatch",
  head_branch: "main",
  display_title: release.npmPublicationTitle("1.2.3", candidateRun.head_sha),
  status: "completed",
  conclusion: "success",
};
function npmProofDependencies(runs) {
  return {
    runCommand(command, args) {
      if (command === "gh" && args[0] === "repo") {
        return JSON.stringify({ nameWithOwner: "owner/repo" });
      }
      if (command === "gh" && args[0] === "api") {
        return JSON.stringify({ workflow_runs: runs });
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    },
  };
}
assert.strictEqual(
  release.requireSuccessfulNpmPublication(
    "/fixture",
    "1.2.3",
    candidateRun.head_sha,
    npmProofDependencies([npmRun]),
  ).id,
  npmRun.id,
);
for (const override of [
  { repository: { full_name: "attacker/repo" } },
  { head_repository: { full_name: "attacker/repo" } },
  { path: ".github/workflows/ci.yml" },
  { event: "release" },
  { head_branch: "release/v1.2.3" },
  { display_title: release.npmPublicationTitle("9.9.9", candidateRun.head_sha) },
  { status: "in_progress" },
  { conclusion: "failure" },
]) {
  assert.throws(
    () => release.requireSuccessfulNpmPublication(
      "/fixture",
      "1.2.3",
      candidateRun.head_sha,
      npmProofDependencies([{ ...npmRun, ...override }]),
    ),
    /npm publication has not succeeded/,
  );
}

let preparedSuite = null;
release.runPreparedReleaseTestSuite("/fixture", {
  pack(root, destination) {
    preparedSuite = { ...preparedSuite, packedRoot: root, destination };
  },
  runReleaseSuite(root) {
    preparedSuite = { ...preparedSuite, suiteRoot: root };
  },
  run(command, args, cwd, options) {
    preparedSuite = { ...preparedSuite, command, args, cwd, env: options.env };
  },
});
assert.deepStrictEqual(preparedSuite.args, ["run", "test"]);
assert.strictEqual(preparedSuite.packedRoot, "/fixture");
assert.strictEqual(preparedSuite.suiteRoot, "/fixture");
assert.strictEqual(preparedSuite.cwd, "/fixture");
assert.strictEqual(
  preparedSuite.env.AAS_TEST_CANDIDATE_TARBALL,
  path.join(preparedSuite.destination, "package.tgz"),
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-workflow-"));
const repo = path.join(root, "repo");
const remote = path.join(root, "remote.git");
const fakeNode = path.join(root, "node.exe");
const fakeNpmCli = path.join(root, "npm-cli.js");
fs.writeFileSync(fakeNpmCli, "// test fixture\n");
assert.deepStrictEqual(
  release.resolveCommandInvocation("npm", ["run", "test"], {
    platform: "win32",
    execPath: fakeNode,
    env: { npm_execpath: fakeNpmCli },
  }),
  { command: fakeNode, args: [fakeNpmCli, "run", "test"] },
);
assert.deepStrictEqual(
  release.resolveCommandInvocation("git", ["status"], {
    platform: "win32",
    execPath: fakeNode,
    env: { npm_execpath: fakeNpmCli },
  }),
  { command: "git", args: ["status"] },
);
// Exercise real subprocess argument boundaries on every supported local host.
const literalArgument = "value & echo INJECTED>release-shell-injection-marker.txt";
assert.deepStrictEqual(
  JSON.parse(release.runCommand(process.execPath,
    ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", literalArgument],
    root, { capture: true, shell: true })),
  [literalArgument],
);
assert.strictEqual(fs.existsSync(path.join(root, "release-shell-injection-marker.txt")), false);
assert.throws(() => release.resolveCommandInvocation("npm", [], {
  platform: "win32", execPath: fakeNode, env: { npm_execpath: root },
}), /Unable to resolve npm-cli/);
for (const command of ["prepare", "publish"]) {
  const rejected = spawnSync(process.execPath,
    [path.resolve(__dirname, "../release_workflow.js"), command, "15.0.0 & echo injected"],
    { cwd: root, encoding: "utf8", shell: false });
  assert.strictEqual(rejected.status, 1);
  assert.match(rejected.stderr, /Invalid semantic version/,
    "version validation must precede Git or filesystem effects even outside a repository");
}
fs.mkdirSync(repo);
git(repo, "init", "-b", "main");
git(repo, "config", "user.name", "Test");
git(repo, "config", "user.email", "test@example.com");
fs.writeFileSync(path.join(repo, "README.md"), "release\n");
git(repo, "add", "README.md");
git(repo, "commit", "-m", "chore: release v1.2.3");
const releaseCommit = git(repo, "rev-parse", "HEAD");

if (process.platform === "win32") {
  const marker = path.join(repo, "release-shell-injection-marker.txt");
  assert.throws(
    () => release.runCommand(
      "git",
      ["rev-parse", "--verify", "missing & echo INJECTED>release-shell-injection-marker.txt"],
      repo,
      { capture: true },
    ),
    /fatal|failed/u,
  );
  assert.strictEqual(
    fs.existsSync(marker),
    false,
    "release commands must never interpret argument metacharacters through cmd.exe",
  );
  assert.match(release.runCommand("npm", ["--version"], repo, { capture: true }), /^\d+\.\d+\.\d+/u);
}

assert.strictEqual(release.validateReleaseSuccessors(repo, releaseCommit, releaseCommit), true);

fs.writeFileSync(path.join(repo, "README.md"), "release synced\n");
git(repo, "commit", "-am", "chore: synchronize canonical repository state");
const canonicalCommit = git(repo, "rev-parse", "HEAD");
let managedValidationCalls = 0;
assert.strictEqual(release.validateReleaseSuccessors(repo, releaseCommit, canonicalCommit, {
  validateManagedRange() { managedValidationCalls += 1; },
}), true);
assert.strictEqual(managedValidationCalls, 1);

fs.writeFileSync(path.join(repo, "README.md"), "release synced with pages skip\n");
git(repo, "commit", "-am", "[skip pages] chore: synchronize canonical repository state");
const skipPagesCanonicalCommit = git(repo, "rev-parse", "HEAD");
managedValidationCalls = 0;
assert.strictEqual(release.validateReleaseSuccessors(repo, releaseCommit, skipPagesCanonicalCommit, {
  validateManagedRange() { managedValidationCalls += 1; },
}), true);
assert.strictEqual(managedValidationCalls, 1);

fs.writeFileSync(path.join(repo, "README.md"), "near canonical but invalid\n");
git(repo, "commit", "-am", "[skip ci] chore: synchronize canonical repository state");
const invalidCanonicalCommit = git(repo, "rev-parse", "HEAD");
let invalidManagedValidationCalls = 0;
assert.throws(
  () => release.validateReleaseSuccessors(repo, releaseCommit, invalidCanonicalCommit, {
    validateManagedRange() { invalidManagedValidationCalls += 1; },
  }),
  /Unexpected commit/,
);
assert.strictEqual(invalidManagedValidationCalls, 0);

git(root, "init", "--bare", remote);
git(repo, "remote", "add", "origin", remote);
git(repo, "tag", "v1.2.3", skipPagesCanonicalCommit);
assert.strictEqual(release.localTagTarget(repo, "v1.2.3"), skipPagesCanonicalCommit);
assert.strictEqual(release.remoteTagTarget(repo, "v1.2.3"), null);
git(repo, "push", "origin", "v1.2.3");
assert.strictEqual(release.remoteTagTarget(repo, "v1.2.3"), skipPagesCanonicalCommit);

// Reproduce a sitemap lastmod that changes only after its source guide is committed.
function convergenceFixture(label) {
  const cwd = path.join(root, label);
  fs.mkdirSync(cwd);
  git(cwd, "init", "-b", "release/v1.2.3");
  git(cwd, "config", "user.name", "Test");
  git(cwd, "config", "user.email", "test@example.com");
  fs.writeFileSync(path.join(cwd, "guide.md"), "version 1\n");
  fs.writeFileSync(path.join(cwd, "sitemap.xml"), "2026-10-12\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "--date=2026-10-12T12:00:00Z", "-m", "base");
  fs.writeFileSync(path.join(cwd, "guide.md"), "version 2\n");
  git(cwd, "add", "guide.md");
  git(cwd, "commit", "--date=2026-10-13T12:00:00Z", "-m", "release");
  return cwd;
}
const convergenceContract = { derivedFiles: ["sitemap.xml"], mixedFiles: ["guide.md"], releaseManagedFiles: [] };
function fixtureRunner(generate) {
  return (command, args, cwd) => {
    if (command === "npm") { generate(cwd); return ""; }
    return git(cwd, ...args);
  };
}
const stable = convergenceFixture("stable");
const initial = git(stable, "rev-parse", "HEAD");
release.convergePreparedRelease(stable, convergenceContract, { runCommand: fixtureRunner(cwd => {
  fs.writeFileSync(path.join(cwd, "sitemap.xml"), git(cwd, "log", "-1", "--format=%aI", "--", "guide.md").slice(0, 10) + "\n");
}) });
assert.notStrictEqual(git(stable, "rev-parse", "HEAD"), initial);
assert.strictEqual(fs.readFileSync(path.join(stable, "sitemap.xml"), "utf8"), "2026-10-13\n");
assert.strictEqual(git(stable, "status", "--porcelain"), "");
const twoStamp = convergenceFixture("two-stamp-generator");
let twoStampGeneration = 0;
release.convergePreparedRelease(twoStamp, convergenceContract, {
  runCommand: fixtureRunner(cwd => {
    const stamps = ["2026-10-13\n", "2026-10-14\n"];
    fs.writeFileSync(path.join(cwd, "sitemap.xml"), stamps[Math.min(twoStampGeneration++, stamps.length - 1)]);
  }),
});
assert.strictEqual(twoStampGeneration, 3);
assert.strictEqual(fs.readFileSync(path.join(twoStamp, "sitemap.xml"), "utf8"), "2026-10-14\n");
assert.strictEqual(git(twoStamp, "status", "--porcelain"), "");
const firstPassAmend = git(twoStamp, "rev-parse", "HEAD");
release.convergePreparedRelease(twoStamp, convergenceContract, { runCommand: fixtureRunner(() => {}) });
assert.strictEqual(git(twoStamp, "rev-parse", "HEAD"), firstPassAmend, "no amendment after two stable passes");
const committer = convergenceFixture("committer-date-generator");
const committerBefore = git(committer, "show", "-s", "--format=%cI", "HEAD");
let committerPasses = 0;
release.convergePreparedRelease(committer, convergenceContract, {
  runCommand(command, args, cwd, options = {}) {
    if (command === "npm") {
      committerPasses += 1;
      fs.writeFileSync(path.join(cwd, "sitemap.xml"), git(cwd, "log", "-1", "--format=%cI", "--", "guide.md") + "\n");
      return "";
    }
    return release.runCommand(command, args, cwd, options);
  },
});
assert.equal(git(committer, "show", "-s", "--format=%cI", "HEAD"), committerBefore);
assert.equal(committerPasses, 2, "Git committer-date metadata converges without moving time");
const settled = git(stable, "rev-parse", "HEAD");
release.convergePreparedRelease(stable, convergenceContract, { runCommand: fixtureRunner(() => {}) });
assert.strictEqual(git(stable, "rev-parse", "HEAD"), settled, "no amendment when already stable");
const missing = convergenceFixture("missing-guide");
assert.throws(() => release.convergePreparedRelease(missing, { ...convergenceContract, mixedFiles: [] }, {
  runCommand: fixtureRunner(cwd => fs.writeFileSync(path.join(cwd, "guide.md"), "generated version 3\n")),
}), /drift/);
const moving = convergenceFixture("moving-generator");
let generation = 0;
assert.throws(() => release.convergePreparedRelease(moving, convergenceContract, {
  runCommand: fixtureRunner(cwd => {
    const stamps = ["2026-10-13\n", "2026-10-14\n", "2026-10-15\n"];
    fs.writeFileSync(path.join(cwd, "sitemap.xml"), stamps[Math.min(generation++, stamps.length - 1)]);
  }),
}), /drift/);
assert.strictEqual(generation, 3, "a third changed pass fails closed after two settling amendments");

fs.rmSync(root, { recursive: true, force: true });
console.log("Release workflow tests passed.");

// Source main may have stale generated snapshots; preflight must isolate them.
{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'release-preflight-source-'));
 git(root,'init','-b','main');git(root,'config','user.name','Tests');git(root,'config','user.email','tests@example.com');
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'1.0.0'}));
 fs.writeFileSync(path.join(root,'snapshot.txt'),'old');git(root,'add','.');git(root,'commit','-m','fixture');
 let cleaned=false;
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'release-preflight-preview-'));
 const deps={prepare:()=>({root:scratch,preparation:{exitCode:0},cleanup:()=>{cleaned=true;fs.rmSync(scratch,{recursive:true,force:true});}}),suite:dir=>fs.writeFileSync(path.join(dir,'snapshot.txt'),'new')};
 release.runReleasePreflight(root,deps);
 assert.equal(cleaned,true);assert.equal(fs.readFileSync(path.join(root,'snapshot.txt'),'utf8'),'old');assert.equal(git(root,'status','--porcelain'),'');
 assert.throws(()=>release.runReleasePreflight(root,{...deps,suite:()=>{throw Error('validation failed');}}),/validation failed/);
 fs.rmSync(root,{recursive:true,force:true});
}
