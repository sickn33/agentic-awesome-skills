const assert = require("assert");

const fs = require("fs");
const os = require("os");
const path = require("path");

const { buildDecisionManifest, isSensitivePath } = require("../../lib/pr-decision");
const { getDirectDerivedChanges } = require("../../lib/workflow-contract");
const { appendGithubOutput, parseArgs } = require("../pr_decision_manifest.cjs");
const { changedFilesFromRecords } = require("../pr_preflight.cjs");

const docsRecord = {
  status: "M",
  old_path: "docs/users/faq.md",
  new_path: "docs/users/faq.md",
  old_mode: "100644",
  new_mode: "100644",
  old_oid: "1".repeat(40),
  new_oid: "2".repeat(40),
  similarity: null,
};

const preflight = {
  baseRef: "origin/main",
  headRef: "HEAD",
  changedFiles: ["docs/users/faq.md"],
  categories: ["docs"],
  primaryCategory: "docs",
  directDerivedChanges: [],
  changeRecords: [docsRecord],
};

assert.strictEqual(isSensitivePath("tools/scripts/merge_batch.cjs"), true);
assert.strictEqual(isSensitivePath("docs/users/faq.md"), false);
assert.strictEqual(isSensitivePath("skills/group/example/SKILL.md"), false);

const sensitiveRenameRecord = {
  status: "R",
  old_path: ".github/workflows/old.md",
  new_path: "docs/old.md",
  old_mode: "100644",
  new_mode: "100644",
  old_oid: "1".repeat(40),
  new_oid: "2".repeat(40),
  similarity: 100,
};
assert.deepStrictEqual(
  changedFilesFromRecords([sensitiveRenameRecord]),
  [".github/workflows/old.md", "docs/old.md"],
);
assert.deepStrictEqual(
  getDirectDerivedChanges(
    changedFilesFromRecords([{
      ...sensitiveRenameRecord,
      old_path: "plugins/generated.md",
      new_path: "docs/generated.md",
    }]),
    { derivedFiles: ["plugins/"] },
  ),
  ["plugins/generated.md"],
);

assert.strictEqual(
  parseArgs([
    "--preflight", "preflight.json",
    "--evidence", "evidence.json",
    "--write-github-output",
  ]).writeGithubOutput,
  true,
);

{
  const manifest = buildDecisionManifest({
    preflight,
    evidence: { base_ref: "origin/main", head_ref: "HEAD", changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.mode, "shadow");
  assert.strictEqual(manifest.untrusted_advisory, true);
  assert.strictEqual(manifest.route, "eligible_for_later_automation");
}

{
  const renamedPreflight = {
    ...preflight,
    changedFiles: changedFilesFromRecords([sensitiveRenameRecord]),
    changeRecords: [sensitiveRenameRecord],
  };
  const manifest = buildDecisionManifest({
    preflight: renamedPreflight,
    evidence: { changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.route, "human_review");
  assert.ok(manifest.change.sensitive_paths.includes(".github/workflows/old.md"));
  assert.deepStrictEqual(manifest.change.change_records, [sensitiveRenameRecord]);
}

for (const [label, record] of [
  ["backslash", { ...sensitiveRenameRecord, status: "M", old_path: "docs\\foo.md", new_path: "docs\\foo.md", similarity: null }],
  ["symlink", { ...sensitiveRenameRecord, status: "M", old_path: "docs/foo.md", new_path: "docs/foo.md", new_mode: "120000", similarity: null }],
  ["executable", { ...sensitiveRenameRecord, status: "M", old_path: "docs/foo.md", new_path: "docs/foo.md", new_mode: "100755", similarity: null }],
  ["gitlink", { ...sensitiveRenameRecord, status: "M", old_path: "docs/foo.md", new_path: "docs/foo.md", new_mode: "160000", similarity: null }],
]) {
  const manifest = buildDecisionManifest({
    preflight: {
      ...preflight,
      changedFiles: changedFilesFromRecords([record]),
      changeRecords: [record],
    },
    evidence: { changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.route, "human_review", label);
  assert.ok(manifest.reason_codes.includes("unsafe_change_records"), label);
  assert.strictEqual(manifest.change.record_policy.approval_safe, false, label);
}

{
  const manifest = buildDecisionManifest({
    preflight: {
      ...preflight,
      changedFiles: ["plugins/generated.md", "docs/generated.md"],
      directDerivedChanges: ["plugins/generated.md"],
    },
    evidence: { changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.route, "block");
  assert.ok(manifest.reason_codes.includes("direct_derived_changes"));
}

{
  const manifest = buildDecisionManifest({
    preflight: {
      ...preflight,
      changedFiles: ["skills/example/SKILL.md"],
      changeRecords: [{ ...docsRecord, old_path: "skills/example/SKILL.md", new_path: "skills/example/SKILL.md" }],
      categories: ["skill"],
      primaryCategory: "skill",
    },
    evidence: { changes: [{ skill_id: "example", change_type: "added" }], blocking: false, reasons: [] },
    semanticReviewState: "unavailable",
  });
  assert.strictEqual(manifest.route, "human_review");
  assert.ok(manifest.reason_codes.includes("semantic_review_unavailable"));
  assert.ok(manifest.reason_codes.includes("canonical_skill_content_changed"));
}

{
  const manifest = buildDecisionManifest({
    preflight: { ...preflight, changeRecords: [] },
    evidence: { changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.route, "human_review");
  assert.ok(manifest.reason_codes.includes("unsafe_change_records"));
  assert.ok(manifest.change.record_policy.reasons.includes("missing_change_records"));
}

{
  const manifest = buildDecisionManifest({
    preflight: { ...preflight, changedFiles: [], changeRecords: [] },
    evidence: { changes: [], blocking: false, reasons: [] },
    semanticReviewState: "unknown",
  });
  assert.strictEqual(manifest.route, "eligible_for_later_automation");
}

{
  const manifest = buildDecisionManifest({
    preflight,
    evidence: { changes: [], blocking: true, reasons: ["new_warning"] },
    semanticReviewState: "available",
  });
  assert.strictEqual(manifest.route, "block");
  assert.strictEqual(manifest.deterministic_gate.blocking, true);
}

assert.throws(
  () => buildDecisionManifest({ preflight, evidence: {}, semanticReviewState: "unknown" }),
  /evidence is incomplete/,
);

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pr-decision-output-"));
  const outputPath = path.join(directory, "github-output");
  const previous = process.env.GITHUB_OUTPUT;
  process.env.GITHUB_OUTPUT = outputPath;
  try {
    appendGithubOutput(buildDecisionManifest({
      preflight,
      evidence: { changes: [], blocking: false, reasons: [] },
      semanticReviewState: "available",
    }));
    const output = fs.readFileSync(outputPath, "utf8");
    assert.match(output, /^route=eligible_for_later_automation$/m);
    assert.match(output, /^blocking=false$/m);
    assert.match(output, /^changed_skills_count=0$/m);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_OUTPUT;
    else process.env.GITHUB_OUTPUT = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

console.log("ok");
