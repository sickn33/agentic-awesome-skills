const assert = require("assert");
const path = require("path");

const mergeBatch = require(path.join(__dirname, "..", "merge_batch.cjs"));

const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);
const BLOB_SHA = "3".repeat(40);
const ZERO_SHA = "0".repeat(40);

function makeCheckRun(name, status, conclusion, startedAt, id, suiteId = 1) {
  return {
    name,
    status,
    conclusion,
    started_at: startedAt,
    completed_at: startedAt,
    created_at: startedAt,
    id,
    app: { id: 15368 },
    check_suite: { id: suiteId },
  };
}

function evidenceSnapshot(overrides = {}) {
  return {
    score: {
      scores: {
        metadata: 90,
        documentation: 80,
        security: 100,
        total: 90,
      },
    },
    ...overrides,
  };
}

{
  const parsed = mergeBatch.parsePrList("450, 449  446");
  assert.deepStrictEqual(parsed, [450, 449, 446]);
}

{
  const parsed = mergeBatch.parseArgs([
    "--prs",
    "450",
    "--reviewed-head",
    HEAD_SHA,
    "--reviewed-head",
    BASE_SHA,
    "--dry-run",
  ]);
  assert.deepStrictEqual(parsed.reviewedHeads, [HEAD_SHA, BASE_SHA]);
  assert.strictEqual(parsed.dryRun, true);
  assert.throws(
    () => mergeBatch.parseArgs(["--reviewed-head", HEAD_SHA.slice(0, 12)]),
    /exact 40-character lowercase commit SHA/,
  );
}

{
  const summary = mergeBatch.extractSummaryBlock(`Summary line 1\nSummary line 2\n\n## Change Classification\n- [ ] Skill PR`);
  assert.strictEqual(summary, "Summary line 1\nSummary line 2");
}

{
  const template = `# Pull Request Description\n\nIntro\n\n## Change Classification\n- [ ] Skill PR\n\n## Quality Bar Checklist ✅\n- [ ] Standards`;
  const body = mergeBatch.normalizePrBody(
    `Short summary\n\n## Change Classification\n- [ ] Old item`,
    template,
  );

  assert.ok(body.startsWith("Short summary"));
  assert.ok(body.includes("## Change Classification"));
  assert.ok(body.includes("## Quality Bar Checklist ✅"));
  assert.ok(!body.includes("Old item"));
}

{
  const aliases = mergeBatch.getRequiredCheckAliases({ hasSkillChanges: true });
  assert.ok(aliases.some((entry) => !Array.isArray(entry) && entry.aliases.includes("review")));
  assert.ok(aliases.some((entry) => entry.aliases.includes("pr-policy")));
  assert.ok(aliases.some((entry) => entry.aliases.includes("pr-evidence")));
}

{
  const runs = [
    makeCheckRun("pr-policy", "completed", "failure", "2026-04-01T10:00:00Z", 1),
    makeCheckRun("pr-policy", "completed", "success", "2026-04-01T10:10:00Z", 2),
    makeCheckRun("source-validation", "in_progress", null, "2026-04-01T10:11:00Z", 3),
    makeCheckRun("review", "completed", "success", "2026-04-01T10:12:00Z", 4),
  ];
  const summaries = mergeBatch.summarizeRequiredCheckRuns(runs, [
    ["pr-policy"],
    ["source-validation"],
    ["review", "Skill Review & Optimize"],
  ]);

  assert.deepStrictEqual(
    summaries.map((entry) => entry.state),
    ["success", "pending", "success"],
  );

  const latest = mergeBatch.selectLatestCheckRuns(runs);
  assert.strictEqual(latest.get("pr-policy").conclusion, "success");

  const olderLateFailure = {
    ...makeCheckRun("artifact-preview", "completed", "failure", "2026-04-01T10:00:00Z", 7),
    created_at: "2026-04-01T10:00:00Z",
    completed_at: "2026-04-01T10:20:00Z",
  };
  const newerPending = {
    ...makeCheckRun("artifact-preview", "in_progress", null, "2026-04-01T10:10:00Z", 8),
    created_at: "2026-04-01T10:10:00Z",
    completed_at: null,
  };
  assert.strictEqual(
    mergeBatch.selectLatestCheckRuns([olderLateFailure, newerPending]).get("artifact-preview").id,
    8,
    "run creation order must win over a stale run's later completion time",
  );

  const spoofed = { ...makeCheckRun("pr-policy", "completed", "success", "2026-04-01T10:20:00Z", 6), app: { id: 999 } };
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([spoofed], [["pr-policy"]]).map((entry) => entry.state),
    ["missing"],
    "required checks must come from the GitHub Actions app",
  );

  const skippedGate = makeCheckRun("pr-evidence", "completed", "skipped", "2026-04-01T10:13:00Z", 5);
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([skippedGate], [["pr-evidence"]]).map((entry) => entry.state),
    ["failed"],
    "a skipped deterministic gate must never pass",
  );
}

{
  const skippedReview = makeCheckRun("Skill Review / review", "completed", "skipped", "2026-04-01T10:00:00Z", 10);
  const manualReview = makeCheckRun("Skill Review / manual-review-required", "completed", "success", "2026-04-01T10:01:00Z", 11);
  const withoutAttestation = mergeBatch.getRequiredCheckAliases(
    { hasSkillChanges: true },
    { allowManualReview: false },
  ).at(-1);
  const withAttestation = mergeBatch.getRequiredCheckAliases(
    { hasSkillChanges: true },
    { allowManualReview: true },
  ).at(-1);

  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([skippedReview], [withoutAttestation]).map((entry) => entry.state),
    ["failed"],
    "a skipped semantic review must never pass",
  );
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([skippedReview, manualReview], [withoutAttestation]).map((entry) => entry.state),
    ["failed"],
    "manual review must not count without an exact-head attestation",
  );
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([skippedReview, manualReview], [withAttestation]).map((entry) => entry.state),
    ["success"],
    "manual review may satisfy the check only after exact-head attestation",
  );

  const failedReview = makeCheckRun("Skill Review / review", "completed", "failure", "2026-04-01T10:02:00Z", 12);
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([failedReview, manualReview], [withAttestation]).map((entry) => entry.state),
    ["failed"],
    "manual attestation must not override a real failed semantic review",
  );
  const skippedManual = makeCheckRun("Skill Review / manual-review-required", "completed", "skipped", "2026-04-01T10:03:00Z", 13);
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns([skippedReview, skippedManual], [withAttestation]).map((entry) => entry.state),
    ["missing"],
    "a skipped manual-review job must not pass",
  );
  const missingCredentials = makeCheckRun(
    "Skill Review / missing-review-credentials",
    "completed",
    "failure",
    "2026-04-01T10:04:00Z",
    14,
  );
  assert.deepStrictEqual(
    mergeBatch.summarizeRequiredCheckRuns(
      [skippedReview, skippedManual, missingCredentials],
      [withAttestation],
    ).map((entry) => entry.state),
    ["failed"],
    "missing internal review credentials must fail promptly",
  );
}

{
  assert.strictEqual(mergeBatch.isRetryableMergeError(new Error("Base branch was modified")), true);
  assert.strictEqual(mergeBatch.isRetryableMergeError(new Error("Something else")), false);
}

{
  const literalArg = "safe&echo injected";
  const stdout = mergeBatch.runCommand(
    process.execPath,
    ["-e", "process.stdout.write(process.argv[1])", literalArg],
    path.join(__dirname, "..", "..", ".."),
    { capture: true },
  );
  assert.strictEqual(stdout, literalArg);
}


{
  const raw = Buffer.from(
    `:000000 100644 ${ZERO_SHA} ${BLOB_SHA} A\0skills/example/SKILL.md\0` +
    `:100644 100644 ${BLOB_SHA} ${HEAD_SHA} R100\0skills/example/references/old.md\0skills/example/references/new.md\0`,
    "utf8",
  );
  const records = mergeBatch.parseRawDiff(raw);
  assert.strictEqual(records.length, 2);
  assert.deepStrictEqual(records[0], {
    status: "A",
    old_path: null,
    new_path: "skills/example/SKILL.md",
    old_mode: "000000",
    new_mode: "100644",
    old_oid: ZERO_SHA,
    new_oid: BLOB_SHA,
    similarity: null,
  });
  assert.strictEqual(records[1].status, "R");
  assert.strictEqual(records[1].old_path, "skills/example/references/old.md");
  assert.strictEqual(records[1].new_path, "skills/example/references/new.md");
  assert.strictEqual(records[1].similarity, 100);
  assert.throws(() => mergeBatch.parseRawDiff(raw.subarray(0, raw.length - 1)), /final NUL/);
  assert.throws(() => mergeBatch.parseRawDiff(Buffer.alloc(0)), /empty/);
  assert.deepStrictEqual(mergeBatch.parseRawDiff(Buffer.alloc(0), { allowEmpty: true }), []);

  const mixedWidth = Buffer.from(
    `:100644 100644 ${BLOB_SHA} ${"4".repeat(64)} M\0skills/example/SKILL.md\0`,
    "utf8",
  );
  assert.throws(() => mergeBatch.parseRawDiff(mixedWidth), /Malformed raw Git diff header/);

  const invalidUtf8 = Buffer.concat([
    Buffer.from(`:000000 100644 ${ZERO_SHA} ${BLOB_SHA} A\0skills/example/references/`, "ascii"),
    Buffer.from([0xff, 0]),
  ]);
  assert.throws(() => mergeBatch.parseRawDiff(invalidUtf8), /canonical UTF-8/);
}

function workflowFixture(overrides = {}) {
  return {
    id: 100,
    path: ".github/workflows/ci.yml",
    state: "active",
    ...overrides,
  };
}

function runFixture(overrides = {}) {
  return {
    id: 200,
    workflow_id: 100,
    path: ".github/workflows/ci.yml",
    event: "pull_request",
    head_sha: HEAD_SHA,
    head_branch: "feature/example",
    head_repository: { full_name: "contributor/repo" },
    repository: { full_name: "owner/repo" },
    pull_requests: [{ number: 450 }],
    check_suite_id: 900,
    ...overrides,
  };
}

{
  const valid = mergeBatch.validateActionRequiredRuns(
    [runFixture()],
    [workflowFixture()],
    450,
    HEAD_SHA,
  );
  assert.strictEqual(valid.length, 1);

  const emptyMetadataIdentity = {
    headRefName: "feature/example",
    headRepository: "contributor/repo",
    baseRepository: "owner/repo",
  };
  const emptyMetadata = mergeBatch.validateActionRequiredRuns(
    [runFixture({ pull_requests: [] })],
    [workflowFixture()],
    450,
    HEAD_SHA,
    undefined,
    emptyMetadataIdentity,
  );
  assert.strictEqual(emptyMetadata.length, 1);
  for (const [label, identity] of [
    ["wrong branch", { ...emptyMetadataIdentity, headRefName: "feature/other" }],
    ["wrong fork", { ...emptyMetadataIdentity, headRepository: "attacker/repo" }],
    ["wrong base repository", { ...emptyMetadataIdentity, baseRepository: "attacker/base" }],
  ]) {
    assert.throws(
      () => mergeBatch.validateActionRequiredRuns(
        [runFixture({ pull_requests: [] })],
        [workflowFixture()],
        450,
        HEAD_SHA,
        undefined,
        identity,
      ),
      /exact fork identity does not match/,
      label,
    );
  }
  for (const [label, run, identity = emptyMetadataIdentity] of [
    ["missing pull request metadata", runFixture({ pull_requests: undefined })],
    ["non-array pull request metadata", runFixture({ pull_requests: {} })],
    ["nonempty malformed pull request metadata", runFixture({ pull_requests: [{}] })],
    ["missing run branch", runFixture({ pull_requests: [], head_branch: undefined })],
    ["missing run fork", runFixture({ pull_requests: [], head_repository: undefined })],
    ["missing run base repository", runFixture({ pull_requests: [], repository: undefined })],
    ["missing captured branch", runFixture({ pull_requests: [] }), { ...emptyMetadataIdentity, headRefName: undefined }],
    ["missing captured fork", runFixture({ pull_requests: [] }), { ...emptyMetadataIdentity, headRepository: undefined }],
    ["missing captured base repository", runFixture({ pull_requests: [] }), { ...emptyMetadataIdentity, baseRepository: undefined }],
  ]) {
    assert.throws(
      () => mergeBatch.validateActionRequiredRuns(
        [run],
        [workflowFixture()],
        450,
        HEAD_SHA,
        undefined,
        identity,
      ),
      /exact fork identity does not match/,
      label,
    );
  }

  for (const [label, run, workflows, pattern] of [
    ["unrelated PR", runFixture({ pull_requests: [{ number: 451 }] }), [workflowFixture()], /does not contain #450/],
    ["wrong SHA", runFixture({ head_sha: BASE_SHA }), [workflowFixture()], /head SHA/],
    ["wrong event", runFixture({ event: "push" }), [workflowFixture()], /not pull_request/],
    ["unknown path", runFixture({ path: ".github/workflows/evil.yml" }), [workflowFixture()], /not allowlisted/],
    ["ID mismatch", runFixture({ workflow_id: 101 }), [workflowFixture()], /workflow ID/],
    ["path mismatch", runFixture(), [workflowFixture({ path: ".github/workflows/codeql.yml" })], /mapping/],
  ]) {
    assert.throws(
      () => mergeBatch.validateActionRequiredRuns([run], workflows, 450, HEAD_SHA),
      pattern,
      label,
    );
  }
}

function approvalDependencies(overrides = {}) {
  const record = {
    status: "A",
    old_path: null,
    new_path: "skills/example/SKILL.md",
    old_mode: "000000",
    new_mode: "100644",
    old_oid: ZERO_SHA,
    new_oid: BLOB_SHA,
  };
  return {
    fetchPullRequestObjects() {},
    resolveMergeBase() { return BASE_SHA; },
    readRawChangeRecords() { return [record]; },
    resolveBlobSizes() { return new Map([[BLOB_SHA, 100]]); },
    getEvaluatorOid() { return "4".repeat(40); },
    recomputeChangedSkillEvidence() { return { blocking: false, reasons: [] }; },
    loadPullRequestDetails() {
      return { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
    },
    listWorkflowDefinitions() { return [workflowFixture()]; },
    listActionRequiredRuns() { return [runFixture()]; },
    approveWorkflowRun() {},
    ...overrides,
  };
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  const supportRecord = {
    status: "M",
    old_path: "skills/example/references/guide.md",
    new_path: "skills/example/references/guide.md",
    old_mode: "100644",
    new_mode: "100644",
    old_oid: BASE_SHA,
    new_oid: BLOB_SHA,
  };
  const dependencies = approvalDependencies({
    readRawChangeRecords() { return [supportRecord]; },
    resolveBlobSizes() { return new Map([[BASE_SHA, 100], [BLOB_SHA, 100]]); },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, { dependencies }),
    /--reviewed-head/,
    "skill support content must require an exact-head maintainer attestation",
  );
  const approved = mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
    dependencies,
    reviewedHeads: [HEAD_SHA],
    dryRun: true,
  });
  assert.strictEqual(approved.policy.requiresHumanReview, true);
  assert.deepStrictEqual(approved.policy.canonicalSkillChanges, []);
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  let tupleReads = 0;
  const dependencies = approvalDependencies({
    loadPullRequestDetails() {
      tupleReads += 1;
      return { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
    },
    approveWorkflowRun() { approvals += 1; },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, { dependencies }),
    /--reviewed-head/,
  );
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
      dependencies,
      reviewedHeads: [BASE_SHA],
    }),
    /--reviewed-head/,
    "a stale but full reviewed head must fail closed",
  );
  assert.strictEqual(approvals, 0);

  const result = mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
    dependencies,
    reviewedHeads: [HEAD_SHA],
  });
  assert.strictEqual(approvals, 1);
  assert.strictEqual(tupleReads, 2);
  assert.deepStrictEqual(result.approvedRuns.map((run) => run.id), [200]);
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  const result = mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
    dependencies: approvalDependencies({ approveWorkflowRun() { approvals += 1; } }),
    reviewedHeads: [HEAD_SHA],
    dryRun: true,
  });
  assert.strictEqual(approvals, 0);
  assert.deepStrictEqual(result.approvedRuns, []);
  assert.strictEqual(result.runs.length, 1);
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  const dependencies = approvalDependencies({
    listActionRequiredRuns() {
      return [runFixture({ pull_requests: [{ number: 999 }] })];
    },
    approveWorkflowRun() { approvals += 1; },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
      dependencies,
      reviewedHeads: [HEAD_SHA],
    }),
    /does not contain #450/,
  );
  assert.strictEqual(approvals, 0);
}

{
  const calls = [];
  mergeBatch.fetchPullRequestObjects("/repo", BASE_SHA, HEAD_SHA, {
    runCommand(command, args) { calls.push([command, args]); },
  });
  assert.deepStrictEqual(calls[0], [
    "git",
    ["fetch", "--no-tags", "--no-write-fetch-head", "origin", BASE_SHA, HEAD_SHA],
  ]);
  assert.ok(calls.every(([, args]) => !args.includes("checkout")));
  assert.deepStrictEqual(calls.slice(1).map(([, args]) => args), [
    ["cat-file", "-e", `${BASE_SHA}^{commit}`],
    ["cat-file", "-e", `${HEAD_SHA}^{commit}`],
  ]);
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  const dependencies = approvalDependencies({
    loadPullRequestDetails() {
      return { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: BASE_SHA };
    },
    approveWorkflowRun() { approvals += 1; },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
      dependencies,
      reviewedHeads: [HEAD_SHA],
    }),
    /head changed before approvals/,
  );
  assert.strictEqual(approvals, 0);
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  let blobReads = 0;
  const dependencies = approvalDependencies({
    resolveBlobSizes() { blobReads += 1; return new Map([[BLOB_SHA, 100]]); },
    classifyChangeRecords() {
      return { approvalSafe: false, reasons: ["record_0:new_executable_mode"] };
    },
    approveWorkflowRun() { approvals += 1; },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
      dependencies,
      reviewedHeads: [HEAD_SHA],
    }),
    /not fork-approval-safe/,
  );
  assert.strictEqual(approvals, 0);
  assert.strictEqual(blobReads, 0, "structurally unsafe diffs must fail before blob expansion");
}

{
  const prDetails = {
    number: 450,
    baseRefName: "main",
    baseRefOid: BASE_SHA,
    headRefOid: HEAD_SHA,
    headRefName: "maintenance/internal",
    headRepository: { nameWithOwner: "OWNER/REPO" },
  };
  let classifications = 0;
  const dependencies = approvalDependencies({
    classifyChangeRecords() {
      classifications += 1;
      return {
        approvalSafe: false,
        reasons: ["record_0:new_unapproved_path"],
        requiresHumanReview: false,
        canonicalSkillChanges: [],
      };
    },
    listActionRequiredRuns() { return []; },
    loadPullRequestDetails() { return prDetails; },
  });
  const result = mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
    dependencies,
    reviewedHeads: [HEAD_SHA],
  });
  assert.strictEqual(result.sameRepository, true);
  assert.strictEqual(classifications, 2);
  assert.deepStrictEqual(result.runs, []);
}

{
  const record = {
    status: "M",
    old_path: "skills/example/SKILL.md",
    new_path: "skills/example/SKILL.md",
    old_mode: "100644",
    new_mode: "100644",
    old_oid: BASE_SHA,
    new_oid: BLOB_SHA,
    similarity: null,
  };
  const report = {
    schema_version: 1,
    base_ref: BASE_SHA,
    head_ref: HEAD_SHA,
    base_oid: BASE_SHA,
    head_oid: HEAD_SHA,
    blocking: false,
    reasons: [],
    changes: [{
      change_type: "modified",
      before: evidenceSnapshot(),
      after: evidenceSnapshot(),
      records: [record],
    }],
  };
  assert.strictEqual(
    mergeBatch.validateChangedSkillEvidence(report, {
      mergeBaseOid: BASE_SHA,
      headOid: HEAD_SHA,
      rawRecords: [record],
    }),
    report,
  );
  assert.throws(
    () => mergeBatch.validateChangedSkillEvidence(
      { ...report, head_oid: BLOB_SHA },
      { mergeBaseOid: BASE_SHA, headOid: HEAD_SHA, rawRecords: [record] },
    ),
    /head_oid does not match/,
  );
  assert.throws(
    () => mergeBatch.validateChangedSkillEvidence(
      { ...report, changes: [{ ...report.changes[0], records: [record, record] }] },
      { mergeBaseOid: BASE_SHA, headOid: HEAD_SHA, rawRecords: [record] },
    ),
    /duplicate Git records/,
  );
  const orphan = { ...record, old_path: "skills/orphan/assets/note.md", new_path: "skills/orphan/assets/note.md" };
  assert.throws(
    () => mergeBatch.validateChangedSkillEvidence(
      { ...report, changes: [] },
      { mergeBaseOid: BASE_SHA, headOid: HEAD_SHA, rawRecords: [orphan] },
    ),
    /exact skill-content Git diff/,
  );
  assert.throws(
    () => mergeBatch.validateChangedSkillEvidence(
      { ...report, changes: [{ ...report.changes[0], after: evidenceSnapshot({ score: { scores: { metadata: NaN } } }) }] },
      { mergeBaseOid: BASE_SHA, headOid: HEAD_SHA, rawRecords: [record] },
    ),
    /missing or non-finite/,
  );
}

{
  const protection = {
    required_status_checks: {
      strict: true,
      checks: ["pr-policy", "pr-evidence", "source-validation", "artifact-preview"].map((context) => ({
        context,
        app_id: 15368,
      })),
    },
    enforce_admins: { enabled: true },
    required_pull_request_reviews: { required_approving_review_count: 0 },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
  };
  assert.strictEqual(mergeBatch.validateEffectiveMainProtection(protection, []), true);
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      { ...protection, required_status_checks: { strict: false, checks: protection.required_status_checks.checks } },
      [],
    ),
    /exact app-bound strict checks/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      { ...protection, required_status_checks: { strict: true, checks: [{ context: "pr-policy", app_id: 15368 }] } },
      [],
    ),
    /exact app-bound strict checks/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      { ...protection, required_pull_request_reviews: null },
      [],
    ),
    /through pull requests/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      { ...protection, allow_force_pushes: null },
      [],
    ),
    /disable force pushes/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      {
        ...protection,
        required_pull_request_reviews: {
          required_approving_review_count: 0,
          bypass_pull_request_allowances: { apps: [{ id: 1 }] },
        },
      },
      [],
    ),
    /bypass allowances/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(
      protection,
      [{
        id: 9,
        enforcement: "active",
        target: "branch",
        conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
        bypass_actors: [{ actor_id: 1 }],
      }],
    ),
    /bypass actors/,
  );
  assert.strictEqual(
    mergeBatch.validateEffectiveMainProtection(protection, [{
      id: 10,
      enforcement: "active",
      target: "tag",
      bypass_actors: [{ actor_id: 1 }],
    }]),
    true,
    "tag rulesets must not block main",
  );
  assert.strictEqual(
    mergeBatch.validateEffectiveMainProtection(protection, [{
      id: 11,
      enforcement: "evaluate",
      target: "branch",
      conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
      bypass_actors: [{ actor_id: 1 }],
    }]),
    true,
    "non-enforcing evaluation rulesets must not block main",
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(protection, [{
      id: 12,
      enforcement: "active",
      target: "branch",
      conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
      bypass_actors: [],
      rules: [{ type: "merge_queue" }],
    }]),
    /does not support deferred merge queues/,
  );
  assert.throws(
    () => mergeBatch.validateEffectiveMainProtection(protection, [{
      id: 13,
      enforcement: "active",
      target: "branch",
      conditions: { ref_name: { include: ["refs/heads/ma[i]n"], exclude: [] } },
      bypass_actors: [{ actor_id: 1 }],
    }]),
    /bypass actors/,
    "unsupported fnmatch syntax must fail closed as potentially applicable to main",
  );
}

{
  const calls = [];
  const state = mergeBatch.loadEffectiveMainProtection("/repo", "owner/repo", {
    runGhApiJson(_root, args, options = {}) {
      calls.push([args[0], options]);
      if (args[0].endsWith("/branches/main/protection")) {
        return {
          required_status_checks: {
            strict: true,
            checks: ["pr-policy", "pr-evidence", "source-validation", "artifact-preview"].map((context) => ({ context, app_id: 15368 })),
          },
          enforce_admins: { enabled: true },
          required_pull_request_reviews: { required_approving_review_count: 0 },
          allow_force_pushes: { enabled: false },
          allow_deletions: { enabled: false },
        };
      }
      if (args[0].includes("/rulesets?")) {
        return [[{ id: 101 }], [{ id: 202 }]];
      }
      return { id: Number(args[0].split("/").at(-1)), enforcement: "active", target: "branch" };
    },
  });
  assert.deepStrictEqual(state.rulesets.map((item) => item.id), [101, 202]);
  const paginated = calls.find(([endpoint]) => endpoint.includes("/rulesets?"));
  assert.strictEqual(paginated[1].paginate, true);
  assert.strictEqual(paginated[1].slurp, true);
}

{
  const prDetails = {
    number: 450,
    title: "feat: safe change",
    body: "Summary",
    headRefOid: HEAD_SHA,
  };
  let captured;
  const merged = mergeBatch.mergePullRequestImmediately("/repo", "owner/repo", prDetails, {
    runCommand(command, args, _cwd, options) {
      captured = { command, args, payload: JSON.parse(options.input) };
      return JSON.stringify({ merged: true, sha: BLOB_SHA, message: "Pull Request successfully merged" });
    },
  });
  assert.strictEqual(merged.merged, true);
  assert.strictEqual(captured.command, "gh");
  assert.ok(captured.args.includes("PUT"));
  assert.strictEqual(captured.payload.sha, HEAD_SHA);
  assert.strictEqual(captured.payload.merge_method, "squash");
  assert.throws(
    () => mergeBatch.mergePullRequestImmediately("/repo", "owner/repo", prDetails, {
      runCommand() { return JSON.stringify({ merged: false, message: "queued" }); },
    }),
    /was not merged immediately: queued/,
  );
}

{
  const prDetails = { number: 450, baseRefName: "main", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA };
  let approvals = 0;
  const dependencies = approvalDependencies({
    recomputeChangedSkillEvidence() {
      return { blocking: true, reasons: ["example:score_decreased:90->80"] };
    },
    approveWorkflowRun() { approvals += 1; },
  });
  assert.throws(
    () => mergeBatch.approveActionRequiredRuns("/repo", "owner/repo", prDetails, {
      dependencies,
      reviewedHeads: [HEAD_SHA],
    }),
    /trusted changed-skill evidence is blocking/,
  );
  assert.strictEqual(approvals, 0);
}

{
  const expected = { baseOid: BASE_SHA, headOid: HEAD_SHA };
  assert.throws(
    () => mergeBatch.assertUnchangedTuple(
      { number: 450, baseRefName: "main", baseRefOid: BLOB_SHA, headRefOid: HEAD_SHA },
      expected,
      "before merge",
      450,
    ),
    /base\/head changed before merge/,
  );
  assert.throws(
    () => mergeBatch.pullRequestTuple(
      { number: 450, baseRefName: "develop", baseRefOid: BASE_SHA, headRefOid: HEAD_SHA },
    ),
    /must target main/,
  );
  assert.throws(
    () => mergeBatch.pullRequestTuple({
      number: 450,
      baseRefName: "main",
      baseRefOid: BASE_SHA,
      headRefOid: HEAD_SHA,
      autoMergeRequest: { enabledAt: "2026-07-13T00:00:00Z" },
    }),
    /deferred auto-merge enabled/,
  );
}

(async () => {
  const baselineRun = runFixture({ id: 190, check_suite_id: 890 });
  const freshCiRun = runFixture({ id: 200, check_suite_id: 900 });
  const freshReviewRun = runFixture({
    id: 201,
    workflow_id: 101,
    path: ".github/workflows/skill-review.yml",
    check_suite_id: 901,
  });
  const workflows = [
    workflowFixture(),
    workflowFixture({ id: 101, path: ".github/workflows/skill-review.yml" }),
  ];
  let poll = 0;
  const approvals = [];
  const oldFailure = makeCheckRun("pr-policy", "completed", "failure", "2026-04-01T09:00:00Z", 1, 890);
  const ciChecks = ["pr-policy", "pr-evidence", "source-validation", "artifact-preview"]
    .map((name, index) => makeCheckRun(name, "completed", "success", `2026-04-01T10:0${index}:00Z`, 10 + index, 900));
  const reviewChecks = [
    makeCheckRun("Skill Review / review", "completed", "skipped", "2026-04-01T10:04:00Z", 20, 901),
    makeCheckRun("Skill Review / manual-review-required", "completed", "success", "2026-04-01T10:05:00Z", 21, 901),
  ];
  const prDetails = {
    number: 450,
    baseRefName: "main",
    baseRefOid: BASE_SHA,
    headRefOid: HEAD_SHA,
    headRefName: "feature/example",
    headRepository: { nameWithOwner: "contributor/repo" },
  };

  const summaries = await mergeBatch.waitForFreshRequiredChecks(
    "/repo",
    "owner/repo",
    prDetails,
    mergeBatch.getRequiredCheckAliases(
      { hasSkillChanges: true },
      { allowManualReview: true },
    ),
    0.001,
    {
      baselineRunIds: [190],
      tuple: { baseOid: BASE_SHA, headOid: HEAD_SHA },
      hasSkillChanges: true,
      maxAttempts: 5,
      dependencies: {
        listPullRequestWorkflowRuns() {
          poll += 1;
          if (poll === 1) return [baselineRun];
          if (poll === 2) return [baselineRun, freshCiRun];
          return [baselineRun, freshCiRun, freshReviewRun];
        },
        listActionRequiredRuns() {
          if (poll === 2) return [freshCiRun];
          if (poll === 3) return [freshReviewRun];
          return [];
        },
        listWorkflowDefinitions() { return workflows; },
        listCheckRuns() {
          if (poll < 3) return [oldFailure];
          if (poll === 3) return [oldFailure, ...ciChecks];
          return [oldFailure, ...ciChecks, ...reviewChecks];
        },
        loadPullRequestDetails() { return prDetails; },
        approveWorkflowRun(_root, _slug, run) { approvals.push(run.id); },
        sleep() { return Promise.resolve(); },
      },
    },
  );

  assert.deepStrictEqual(approvals, [200, 201], "only fresh workflow runs are approved once");
  assert.ok(summaries.every((summary) => summary.state === "success"));
  console.log("ok");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
