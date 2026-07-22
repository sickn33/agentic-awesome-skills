const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const scriptPath = path.join(repoRoot, "tools", "scripts", "pr_preflight.cjs");
const { evaluateForkSafety, parseArgs } = require("../pr_preflight.cjs");

assert.strictEqual(parseArgs(["--repo", repoRoot, "--check-fork-safety"]).repo, repoRoot);
assert.strictEqual(parseArgs(["--repo", repoRoot, "--check-fork-safety"]).checkForkSafety, true);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aas-pr-preflight-"));
const eventPath = path.join(tempDir, "event.json");

fs.writeFileSync(
  eventPath,
  JSON.stringify({
    pull_request: {
      body: "## Quality Bar Checklist ✅\n\n- [x] Canonical skill location\n",
      base: { repo: { full_name: "sickn33/agentic-awesome-skills" } },
      head: { repo: { full_name: "sickn33/agentic-awesome-skills" } },
    },
  }),
  "utf8",
);

const result = spawnSync(
  process.execPath,
  [
    scriptPath,
    "--base",
    "HEAD",
    "--head",
    "HEAD",
    "--event-path",
    eventPath,
    "--no-run",
    "--json",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);

assert.strictEqual(result.status, 0, result.stderr || result.stdout);

const parsed = JSON.parse(result.stdout);
assert.strictEqual(parsed.prBody.available, true);
assert.strictEqual(parsed.prBody.hasQualityChecklist, true);
assert.strictEqual(parsed.forkSafety.applicable, false);
assert.strictEqual(parsed.forkSafety.approvalSafe, true);
assert.strictEqual(parsed.shadowImpact.profile, "unknown");

const ZERO_OID = "0".repeat(40);
const WALKTHROUGH_OID = "1".repeat(40);
const walkthroughPolicy = evaluateForkSafety(
  repoRoot,
  [{
    status: "A",
    old_path: null,
    new_path: "walkthrough.md",
    old_mode: "000000",
    new_mode: "100644",
    old_oid: ZERO_OID,
    new_oid: WALKTHROUGH_OID,
  }],
  {
    base: { repo: { full_name: "sickn33/agentic-awesome-skills" } },
    head: { repo: { full_name: "community/example-fork" } },
  },
);
assert.strictEqual(walkthroughPolicy.applicable, true);
assert.strictEqual(walkthroughPolicy.approvalSafe, false);
assert.ok(
  walkthroughPolicy.reasons.some((reason) => reason.includes("new_unapproved_path")),
  `PR #974-style root walkthrough.md must fail before merge: ${walkthroughPolicy.reasons.join(", ")}`,
);

const readmeOid = spawnSync("git", ["rev-parse", "HEAD:README.md"], {
  cwd: repoRoot,
  encoding: "utf8",
});
assert.strictEqual(readmeOid.status, 0, readmeOid.stderr);
const safeForkPolicy = evaluateForkSafety(
  repoRoot,
  [{
    status: "M",
    old_path: "README.md",
    new_path: "README.md",
    old_mode: "100644",
    new_mode: "100644",
    old_oid: readmeOid.stdout.trim(),
    new_oid: readmeOid.stdout.trim(),
  }],
  {
    base: { repo: { full_name: "sickn33/agentic-awesome-skills" } },
    head: { repo: { full_name: "community/example-fork" } },
  },
);
assert.strictEqual(safeForkPolicy.approvalSafe, true);
