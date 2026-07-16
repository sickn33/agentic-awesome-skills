const assert = require("assert");

const canonicalMerge = require("../merge_canonical_sync_pr.cjs");

const HEAD = "a".repeat(40);
const options = canonicalMerge.parseArgs(["--repo", "owner/repo", "--pr", "42", "--head", HEAD]);
assert.strictEqual(options.pollSeconds, 10);
assert.throws(() => canonicalMerge.parseArgs(["--repo", "owner/repo", "--pr", "42", "--head", "short"]), /full SHA-1/);

const CHECK_SUITE_ID = 777;

function run(name, conclusion = "success", id = 1, appId = 15368, checkSuiteId = CHECK_SUITE_ID) {
  return {
    id,
    name,
    status: "completed",
    conclusion,
    completed_at: `2026-07-13T20:00:0${id}Z`,
    app: { id: appId },
    check_suite: { id: checkSuiteId },
  };
}

const passing = ["pr-policy", "pr-evidence", "source-validation", "artifact-preview"].map((name, index) => run(name, "success", index + 1));
assert.ok(canonicalMerge.summarizeChecks(passing, CHECK_SUITE_ID).every((item) => item.state === "success"));
assert.strictEqual(canonicalMerge.summarizeChecks([...passing, run("pr-policy", "success", 9, 999)], CHECK_SUITE_ID)[0].state, "success");
assert.strictEqual(canonicalMerge.summarizeChecks(passing.filter((item) => item.name !== "pr-evidence"), CHECK_SUITE_ID)[1].state, "pending");
assert.strictEqual(canonicalMerge.summarizeChecks([...passing, run("artifact-preview", "failure", 9)], CHECK_SUITE_ID)[3].state, "failed");
const spoofSuitePassing = ["pr-policy", "pr-evidence", "source-validation", "artifact-preview"]
  .map((name, index) => run(name, "success", index + 20, 15368, 888));
assert.strictEqual(
  canonicalMerge.summarizeChecks([...spoofSuitePassing, run("artifact-preview", "failure", 9)], CHECK_SUITE_ID)[3].state,
  "failed",
);

assert.strictEqual(canonicalMerge.validatePullRequest({
  number: 42,
  state: "open",
  base: { ref: "main", sha: "b".repeat(40) },
  head: { ref: "automation/canonical-repo-state", sha: HEAD, repo: { full_name: "owner/repo" } },
  auto_merge: null,
}, options, "b".repeat(40)), true);
assert.strictEqual(canonicalMerge.validateProtectedMain({ name: "main", protected: true }), true);
assert.throws(() => canonicalMerge.validateProtectedMain({ name: "main", protected: false }), /main as protected/);
assert.throws(() => canonicalMerge.validatePullRequest({
  number: 42,
  state: "open",
  base: { ref: "main", sha: "b".repeat(40) },
  head: { ref: "other", sha: HEAD, repo: { full_name: "owner/repo" } },
}, options, "b".repeat(40)), /identity/);

const canonicalRun = {
  id: 123,
  check_suite_id: CHECK_SUITE_ID,
  path: ".github/workflows/ci.yml",
  event: "pull_request",
  status: "completed",
  conclusion: "action_required",
  head_branch: "automation/canonical-repo-state",
  head_sha: HEAD,
  head_repository: { id: 999, full_name: "owner/repo" },
  actor: { login: "github-actions[bot]" },
  pull_requests: [{
    number: 42,
    base: { ref: "main", sha: "b".repeat(40), repo: { id: 999 } },
    head: { ref: "automation/canonical-repo-state", sha: HEAD, repo: { id: 999 } },
  }],
};
assert.strictEqual(canonicalMerge.selectCanonicalPullRequestRun([canonicalRun], options, "b".repeat(40)), canonicalRun);
assert.strictEqual(canonicalMerge.selectCanonicalPullRequestRun([
  { ...canonicalRun, actor: { login: "attacker" } },
], options, "b".repeat(40)), null);
assert.strictEqual(canonicalMerge.selectCanonicalPullRequestRun([
  { ...canonicalRun, pull_requests: [{ ...canonicalRun.pull_requests[0], number: 41 }] },
], options, "b".repeat(40)), null);
assert.strictEqual(canonicalMerge.selectCanonicalPullRequestRun([
  {
    ...canonicalRun,
    pull_requests: [{
      ...canonicalRun.pull_requests[0],
      base: { ...canonicalRun.pull_requests[0].base, sha: "c".repeat(40) },
    }],
  },
], options, "b".repeat(40)), null);
assert.throws(
  () => canonicalMerge.selectCanonicalPullRequestRun(
    [canonicalRun, { ...canonicalRun, id: 124 }],
    options,
    "b".repeat(40),
  ),
  /Multiple canonical-sync/,
);

(async () => {
  let reruns = 0;
  await canonicalMerge.ensurePullRequestChecksStarted({ ...options, pollSeconds: 1, maxAttempts: 2 }, "b".repeat(40), {
    loadWorkflowRuns: () => [canonicalRun],
    rerunWorkflow(run) {
      assert.strictEqual(run.id, 123);
      reruns += 1;
    },
    wait: async () => {},
  });
  assert.strictEqual(reruns, 1);

  let loads = 0;
  await canonicalMerge.ensurePullRequestChecksStarted({ ...options, pollSeconds: 1, maxAttempts: 2 }, "b".repeat(40), {
    loadWorkflowRuns() {
      loads += 1;
      return loads === 1 ? [] : [{ ...canonicalRun, status: "in_progress", conclusion: null }];
    },
    rerunWorkflow() {
      throw new Error("in-progress CI must not be rerun");
    },
    wait: async () => {},
  });
  assert.strictEqual(loads, 2);

  let calls = 0;
  await canonicalMerge.waitForChecks({ ...options, pollSeconds: 1, maxAttempts: 2 }, CHECK_SUITE_ID, {
    loadCheckRuns() {
      calls += 1;
      return calls === 1 ? passing.slice(0, 3) : passing;
    },
    wait: async () => {},
  });
  assert.strictEqual(calls, 2);
  console.log("Canonical sync merge tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
