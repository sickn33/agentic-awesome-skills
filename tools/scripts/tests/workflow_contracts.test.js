const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  classifyChangeRecords,
  classifyChangedFiles,
  classifyPathPolicy,
  classifyShadowImpact,
  extractChangelogSection,
  getDirectDerivedChanges,
  hasIssueLink,
  hasQualityChecklist,
  requiresReferencesValidation,
} = require("../../lib/workflow-contract");

const ZERO_OID = "0".repeat(40);
const OLD_OID = "1".repeat(40);
const NEW_OID = "2".repeat(40);

function addedRecord(filePath, overrides = {}) {
  return {
    status: "A",
    old_path: null,
    new_path: filePath,
    old_mode: "000000",
    new_mode: "100644",
    old_oid: ZERO_OID,
    new_oid: NEW_OID,
    new_size: 128,
    ...overrides,
  };
}

function modifiedRecord(filePath, overrides = {}) {
  return {
    status: "M",
    old_path: filePath,
    new_path: filePath,
    old_mode: "100644",
    new_mode: "100644",
    old_oid: OLD_OID,
    new_oid: NEW_OID,
    old_size: 128,
    new_size: 256,
    ...overrides,
  };
}

const contract = {
  derivedFiles: [
    "CATALOG.md",
    "skills_index.json",
    "data/skills_index.json",
    "data/catalog.json",
    "data/bundles.json",
    "data/plugin-compatibility.json",
    "data/aliases.json",
    ".agents/plugins/",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "plugins/",
  ],
  mixedFiles: ["README.md"],
  releaseManagedFiles: ["CHANGELOG.md", "package.json", "package-lock.json", "README.md"],
};

assert.deepStrictEqual(
  classifyShadowImpact([modifiedRecord("skills/example/SKILL.md")], contract),
  { profile: "narrow-skill", reasons: [] },
);
assert.deepStrictEqual(
  classifyShadowImpact([modifiedRecord("docs/users/guide.md")], contract),
  { profile: "narrow-docs", reasons: [] },
);
assert.strictEqual(
  classifyShadowImpact([modifiedRecord("skills/example/SKILL.md"), modifiedRecord("docs/users/guide.md")], contract).profile,
  "full",
);
assert.strictEqual(
  classifyShadowImpact([modifiedRecord("tools/scripts/pr_preflight.cjs")], contract).profile,
  "full",
);
assert.strictEqual(
  classifyShadowImpact([addedRecord("walkthrough.md")], contract).profile,
  "full",
);
assert.deepStrictEqual(
  classifyShadowImpact([modifiedRecord("unclassified.bin")], contract),
  { profile: "unknown", reasons: ["unclassified_path"] },
);

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const agentInstructions = fs.readFileSync(path.join(repositoryRoot, "AGENTS.md"), "utf8");
const maintenanceGuide = fs.readFileSync(path.join(repositoryRoot, ".github", "MAINTENANCE.md"), "utf8");
for (const instructions of [agentInstructions, maintenanceGuide]) {
  assert.match(instructions, /current[- ]base/i);
  assert.match(instructions, /must exist on the current task base/i);
  assert.match(instructions, /do not|never import/i);
  assert.match(instructions, /another branch, worktree, stash, installed copy, or historical commit/i);
}
assert.doesNotMatch(agentInstructions, /review:skills:local|local-skill-reviewer-policy/);
assert.doesNotMatch(maintenanceGuide, /review:skills:local|local-skill-reviewer-policy/);

const maintainerSkill = fs.readFileSync(
  path.join(repositoryRoot, "skills", "antigravity-maintainer-batch-release", "SKILL.md"),
  "utf8",
);
const mergeBatchGuide = fs.readFileSync(path.join(repositoryRoot, "docs", "maintainers", "merge-batch.md"), "utf8");
const mergingGuide = fs.readFileSync(path.join(repositoryRoot, "docs", "maintainers", "merging-prs.md"), "utf8");
const autonomyGuide = fs.readFileSync(path.join(repositoryRoot, "docs", "maintainers", "pr-autonomy.md"), "utf8");
const maintainerSkillUi = fs.readFileSync(
  path.join(repositoryRoot, "skills", "antigravity-maintainer-batch-release", "agents", "openai.yaml"),
  "utf8",
);
for (const contractText of [maintainerSkill, maintenanceGuide, mergeBatchGuide, mergingGuide, autonomyGuide]) {
  assert.match(contractText, /skills\/\*\*|skills\/<skill-id>\/\*\*/);
}
const detailedContract = fs.readFileSync(path.join(repositoryRoot, "docs/maintainers/maintenance-contract.md"), "utf8");
for (const text of [maintainerSkill, maintenanceGuide, mergeBatchGuide, autonomyGuide]) {
  assert.match(text, /maintenance-contract\.md/);
  assert.match(text, /review/i);
}
assert.match(detailedContract, /entire tracked `skills\/<skill-id>\/\*\*` subtree/);
assert.match(detailedContract, /exactly one merged release PR|Exactly one merged release PR/);
assert.match(detailedContract, /authored by the repository owner/);
assert.match(detailedContract, /does not rewrite PR metadata/);
assert.match(detailedContract, /does not retry base drift/);
assert.match(detailedContract, /No direct main pushes, admin bypass/);
assert.match(detailedContract, /minimum runtime/);
assert.match(detailedContract, /public artifact mismatch/);
assert.equal(detailedContract, fs.readFileSync(path.join(repositoryRoot, "skills/antigravity-maintainer-batch-release/references/maintenance-contract.md"), "utf8"));
assert.equal(fs.readFileSync(path.join(repositoryRoot,"docs/maintainers/component-validation.md"),"utf8"), fs.readFileSync(path.join(repositoryRoot,"skills/antigravity-maintainer-batch-release/references/component-validation.md"),"utf8"));
assert.match(maintainerSkillUi, /\$antigravity-maintainer-batch-release/);
assert.match(agentInstructions, /Every stable or prerelease version must finish with the full-release-alignment gate/);

const publishWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "publish-npm.yml"),
  "utf8",
);
assert.match(publishWorkflow, /name: Verify protected release provenance/);
assert.match(publishWorkflow, /git merge-base --is-ancestor "\$tag_commit" "\$main_commit"/);
assert.match(publishWorkflow, /ref: main/);
assert.doesNotMatch(publishWorkflow, /workflow_dispatch/);
assert.match(publishWorkflow, /distribution_fetch\.cjs/);

const pagesWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "pages.yml"),
  "utf8",
);
assert.match(pagesWorkflow, /deployment_target/);
assert.match(pagesWorkflow, /distribution_fetch\.cjs/);
assert.match(pagesWorkflow, /\.draft == false/);
assert.doesNotMatch(pagesWorkflow, /npm run app:build|npm run test/);

const ciWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "ci.yml"),
  "utf8",
);
const latestHeadConcurrency = [
  "concurrency:",
  "  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}",
  "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
].join("\n");
for (const workflowPath of [
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/skill-review.yml",
  ".github/workflows/aas-agent-first-preview.yml",
  ".github/workflows/actionlint.yml",
]) {
  const workflow = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", workflowPath), "utf8");
  assert.ok(
    workflow.includes(latestHeadConcurrency),
    `${workflowPath} must cancel superseded PR heads while keeping every non-PR run in a unique concurrency group`,
  );
}
assert.doesNotMatch(
  ciWorkflow,
  /ENABLE_NETWORK_TESTS:\s*["']1["']/,
  "PR and push CI must not depend on mutable upstream network clones",
);
assert.match(ciWorkflow, /^permissions:\n  contents: read$/m);
const mainValidationJobStart = ciWorkflow.indexOf("  main-validation-and-sync:");
assert.ok(mainValidationJobStart >= 0, "main-validation-and-sync job must exist");
const mainValidationJob = ciWorkflow.slice(mainValidationJobStart);
assert.match(mainValidationJob, /maintenance_validate\.cjs/);
assert.doesNotMatch(mainValidationJob, /create-pull-request|merge_canonical_sync/);
assert.match(
  ciWorkflow,
  /source-validation:[\s\S]*?- name: Run component validation[\s\S]*?maintenance_validate\.cjs --base "\$BASE_SHA" --head "\$HEAD_SHA"/,
  "source validation must execute an exact-diff component plan",
);
assert.doesNotMatch(
  ciWorkflow,
  /build:aas-v1-review-queue|metadata-overrides\.v1\.json|review-queue\.v1\.json/,
  "CI should not rebuild retired Core policy or review assets",
);
assert.match(ciWorkflow, /name: pr-evidence-/);
assert.doesNotMatch(ciWorkflow, /pull_request_target:/);
assert.match(ciWorkflow, /actions\/download-artifact@[0-9a-f]{40}/);
const prEvidenceJob = ciWorkflow.match(/^  pr-evidence:\n([\s\S]*?)(?=^  [a-z][a-z0-9-]*:)/m)?.[0] || "";
assert.ok(prEvidenceJob, "pr-evidence job must exist");
assert.doesNotMatch(prEvidenceJob, /(?:contents|pull-requests|actions): write/);
assert.doesNotMatch(prEvidenceJob, /secrets\./);
for (const stepName of ["Set up Python", "Set up Node", "Install trusted dependencies", "Fetch base branch"]) {
  assert.match(
    prEvidenceJob,
    new RegExp(`- name: ${stepName}\\n\\s+if: env\\.IS_TRUSTED_CANONICAL_SYNC_PR != 'true'`),
    `${stepName} must be skipped for canonical-sync evidence`,
  );
}
assert.match(
  prEvidenceJob,
  /- uses: actions\/checkout@[0-9a-f]{40}[^\n]*\n\s+if: env\.IS_TRUSTED_CANONICAL_SYNC_PR != 'true'/,
  "canonical-sync evidence must not perform an unused checkout",
);
assert.match(
  prEvidenceJob,
  /- name: Record canonical-sync evidence boundary\n\s+if: env\.IS_TRUSTED_CANONICAL_SYNC_PR == 'true'/,
  "canonical-sync evidence must retain its explicit successful boundary record",
);

const sourceValidationJob = ciWorkflow.match(/^  source-validation:\n([\s\S]*?)(?=^  [a-z][a-z0-9-]*:)/m)?.[0] || "";
assert.match(sourceValidationJob, /needs: pr-policy/, "source validation should not wait for independent PR evidence");
assert.doesNotMatch(sourceValidationJob, /needs:.*pr-evidence/);
const componentPlan = require("../../lib/maintenance-impact").checkPlan("catalog");
assert.ok(componentPlan.indexOf("preview") < componentPlan.indexOf("validate:references"),
  "source validation must refresh source-derived bundle data before validating cross-references");

assert.match(
  sourceValidationJob,
  /actions\/checkout@[0-9a-f]{40}[\s\S]*?ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  "source validation must generate its preview from the exact PR head instead of GitHub's synthetic merge commit",
);
assert.match(sourceValidationJob, /preview_manifest_digest: \$\{\{ steps\.preview_manifest\.outputs\.manifest_digest \}\}/);
assert.match(sourceValidationJob, /ci_artifact_preview\.cjs create/);
assert.match(sourceValidationJob, /actions\/upload-artifact@[0-9a-f]{40}/);
assert.match(
  sourceValidationJob,
  /- name: Record canonical source-validation boundary\n\s+if: env\.IS_TRUSTED_CANONICAL_SYNC_PR == 'true'/,
  "canonical source validation should become a lightweight boundary record after pr-policy exact-tree reproduction",
);
const artifactPreviewJob = ciWorkflow.match(/^  artifact-preview:\n([\s\S]*?)(?=^  [a-z][a-z0-9-]*:)/m)?.[0] || "";
assert.match(artifactPreviewJob, /needs: \[pr-policy, source-validation\]/);
assert.match(artifactPreviewJob, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
assert.match(
  artifactPreviewJob,
  /- name: Download exact-head artifact preview manifest[\s\S]*?actions\/download-artifact@[0-9a-f]{40}[\s\S]*?- name: Verify and report exact-head artifact preview[\s\S]*?ci_artifact_preview\.cjs" verify-summary/,
  "artifact preview should consume and verify the source-validation manifest instead of regenerating the same tree",
);
assert.doesNotMatch(
  artifactPreviewJob,
  /npm run chain|Generate canonical artifacts preview/,
  "artifact preview must not regenerate normal source-PR artifacts",
);
assert.match(artifactPreviewJob, /- name: Reproduce canonical-sync PR from main\n\s+if: env\.IS_TRUSTED_CANONICAL_SYNC_PR == 'true'/);
assert.match(artifactPreviewJob, /- name: Report generated drift\n\s+if: env\.IS_TRUSTED_CANONICAL_SYNC_PR == 'true'/);

const decisionModule = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "lib", "pr-decision.js"),
  "utf8",
);
assert.match(decisionModule, /untrusted_advisory: true/);

const skillReviewWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "skill-review.yml"),
  "utf8",
);
assert.match(skillReviewWorkflow, /^permissions:\n  contents: read$/m);
assert.match(skillReviewWorkflow, /^  review-attempt:$/m);
assert.match(skillReviewWorkflow, /^  review:$/m);
assert.match(skillReviewWorkflow, /^  manual-review-required:$/m);
assert.doesNotMatch(skillReviewWorkflow, /^  missing-review-credentials:$/m);
assert.match(
  skillReviewWorkflow,
  /needs\.review-attempt\.outputs\.outcome != 'reviewed'/,
  "every non-passing Tessl outcome must route to exact-head manual review",
);
assert.match(skillReviewWorkflow, /paths:\s*\n\s+- 'skills\/\*\*'\s*\n\s+- 'plugins\/\*\*\/skills\/\*\*'/);
assert.match(skillReviewWorkflow, /steps\.plan\.outputs\.requires-manual != 'true'/);
assert.match(skillReviewWorkflow, /REQUIRES_MANUAL: \$\{\{ steps\.plan\.outputs\.requires-manual \}\}/);
assert.match(skillReviewWorkflow, /result=manual/);
assert.match(skillReviewWorkflow, /needs\.review-state\.outputs\.configured != 'true'/);
assert.match(skillReviewWorkflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
assert.match(skillReviewWorkflow, /review_changed_skills\.cjs --plan/);
assert.match(
  skillReviewWorkflow,
  /timeout --signal=TERM --kill-after=30s 10m node trusted-base\/tools\/scripts\/review_changed_skills\.cjs/,
  "Tessl review must time out into the exact-head manual-review path instead of blocking indefinitely",
);
assert.match(skillReviewWorkflow, /actions\/cache\/restore@[0-9a-f]{40}/);
assert.match(skillReviewWorkflow, /actions\/cache\/save@[0-9a-f]{40}/);
assert.match(skillReviewWorkflow, /tessl-review-v2-\$\{\{ steps\.plan\.outputs\.fingerprint \}\}/);
assert.match(skillReviewWorkflow, /steps\.review-cache\.outputs\.cache-hit != 'true'/);
assert.match(skillReviewWorkflow, /needs\.review-attempt\.outputs\.outcome == 'reviewed'/);
assert.ok(
  skillReviewWorkflow.indexOf("- name: Checkout pull request content") <
    skillReviewWorkflow.indexOf("- name: Checkout trusted base scripts"),
  "trusted-base checkout must happen after the root checkout so it cannot be cleaned away",
);
assert.doesNotMatch(skillReviewWorkflow, /pull_request_target:/);
assert.doesNotMatch(skillReviewWorkflow, /(?:contents|pull-requests|actions): write/);

const skillOnly = classifyChangedFiles(["skills/example/SKILL.md"], contract);
assert.deepStrictEqual(skillOnly.categories, ["skill"]);
assert.strictEqual(skillOnly.primaryCategory, "skill");
assert.strictEqual(requiresReferencesValidation(["skills/example/SKILL.md"], contract), false);

const docsOnly = classifyChangedFiles(["README.md", "docs/users/faq.md"], contract);
assert.deepStrictEqual(docsOnly.categories, ["docs"]);
assert.strictEqual(docsOnly.primaryCategory, "docs");
assert.strictEqual(requiresReferencesValidation(["README.md"], contract), true);

const infraChange = classifyChangedFiles([".github/workflows/ci.yml", "tools/scripts/pr_preflight.cjs"], contract);
assert.deepStrictEqual(infraChange.categories, ["infra"]);
assert.strictEqual(infraChange.primaryCategory, "infra");
assert.strictEqual(requiresReferencesValidation(["tools/scripts/pr_preflight.cjs"], contract), true);

const mixedChange = classifyChangedFiles(["skills/example/SKILL.md", "README.md"], contract);
assert.deepStrictEqual(mixedChange.categories, ["skill", "docs"]);
assert.strictEqual(mixedChange.primaryCategory, "skill");

assert.deepStrictEqual(
  getDirectDerivedChanges(["skills/example/SKILL.md", "data/catalog.json"], contract),
  ["data/catalog.json"],
);
assert.deepStrictEqual(
  getDirectDerivedChanges(
    [
      "plugins/agentic-awesome-skills/skills/docx-official/ooxml/scripts/unpack.py",
      ".agents/plugins/marketplace.json",
      "skills/example/SKILL.md",
    ],
    contract,
  ),
  [
    "plugins/agentic-awesome-skills/skills/docx-official/ooxml/scripts/unpack.py",
    ".agents/plugins/marketplace.json",
  ],
);

const changelog = [
  "## [7.7.0] - 2026-03-13 - \"Merge Friction Reduction\"",
  "",
  "- Line one",
  "",
  "## [7.6.0] - 2026-03-01 - \"Older Release\"",
  "",
  "- Older line",
  "",
].join("\n");

assert.strictEqual(
  extractChangelogSection(changelog, "7.7.0"),
  "## [7.7.0] - 2026-03-13 - \"Merge Friction Reduction\"\n\n- Line one\n",
);

assert.strictEqual(hasQualityChecklist("## Quality Bar Checklist\n- [x] Standards"), true);
assert.strictEqual(hasQualityChecklist("No template here"), false);
assert.strictEqual(hasIssueLink("Fixes #123"), true);
assert.strictEqual(hasIssueLink("Related to #123"), false);

for (const [filePath, expectedKind] of [
  ["skills/example/SKILL.md", "canonical_skill"],
  ["skills/design-it/glassmorphism/SKILL.md", "canonical_skill"],
  ["skills/example/references/guide.md", "skill_support"],
  ["skills/design-it/glassmorphism/references/guide.md", "skill_support"],
  ["skills/example/assets/screenshot.png", "skill_support"],
  ["README.md", "documentation"],
  ["docs/users/faq.md", "documentation"],
  ["apps/web-app/src/hooks/useSkillStars.ts", "web_app_source"],
  ["apps/web-app/src/pages/Home.tsx", "web_app_source"],
  ["apps/web-app/src/styles/theme.css", "web_app_source"],
  ["apps/web-app/src/data/seoLandingPages.json", "web_app_source"],
  ["apps/aas-plugin/package-lock.json", "dependency_lockfile"],
  ["skills/loki-mode/examples/todo-app-generated/backend/package-lock.json", "dependency_lockfile"],
]) {
  const policy = classifyPathPolicy(filePath);
  assert.strictEqual(policy.approvalSafe, true, filePath);
  assert.strictEqual(policy.kind, expectedKind, filePath);
}

for (const [filePath, reason] of [
  [".github/workflows/ci.yml", "unapproved_path"],
  ["tools/scripts/check.js", "unapproved_path"],
  ["skills/example/references/run.py", "unknown_extension"],
  ["apps/web-app/package.json", "unapproved_path"],
  ["apps/web-app/package-lock.json", "unapproved_path"],
  ["apps/other/package-lock.json", "unapproved_path"],
  ["skills/loki-mode/examples/other/package-lock.json", "unapproved_path"],
  ["apps/web-app/vite.config.ts", "unapproved_path"],
  ["apps/web-app/public/skills.json", "unapproved_path"],
  ["apps/web-app/e2e/browse.spec.ts", "unapproved_path"],
  ["apps/web-app/scripts/prerender-routes.js", "unapproved_path"],
  ["apps/web-app/src/hooks/run.sh", "unknown_extension"],
  ["apps/web-app/src/legacy/tool.js", "unknown_extension"],
  ["skills/example/scripts/run.ts", "unknown_extension"],
  ["skills/example\\references\\guide.md", "backslash_path"],
  ["skills/example/references/../SKILL.md", "noncanonical_path"],
  ["skills/design-it/glassmorphism/references/../../escape.md", "noncanonical_path"],
  ["/skills/example/SKILL.md", "absolute_path"],
  ["skills/example/references/guide\n.md", "control_character_path"],
]) {
  const policy = classifyPathPolicy(filePath);
  assert.strictEqual(policy.approvalSafe, false, filePath);
  assert.ok(policy.reasons.includes(reason), `${filePath}: ${policy.reasons.join(",")}`);
}

{
  const policy = classifyChangeRecords([addedRecord("skills/example/SKILL.md")]);
  assert.strictEqual(policy.approvalSafe, true);
  assert.strictEqual(policy.requiresHumanReview, true);
  assert.deepStrictEqual(policy.canonicalSkillChanges, ["skills/example/SKILL.md"]);
}

{
  const record = addedRecord("docs/users/no-size.md");
  delete record.new_size;
  assert.strictEqual(classifyChangeRecords([record]).approvalSafe, false);
  assert.strictEqual(
    classifyChangeRecords([record], { requireBlobSizes: false }).approvalSafe,
    true,
  );
}

{
  const policy = classifyChangeRecords([
    modifiedRecord("skills/example/references/guide.md"),
  ]);
  assert.strictEqual(policy.approvalSafe, true);
  assert.strictEqual(policy.requiresHumanReview, true);
  assert.deepStrictEqual(policy.canonicalSkillChanges, []);
  assert.deepStrictEqual(policy.skillContentChanges, ["skills/example/references/guide.md"]);
}

{
  const policy = classifyChangeRecords([
    modifiedRecord("apps/web-app/src/hooks/useSkillStars.ts"),
  ]);
  assert.strictEqual(policy.approvalSafe, true);
  assert.strictEqual(
    policy.requiresHumanReview,
    true,
    "web-app source runs may be approved, but the merge still requires an exact-head attestation",
  );
  assert.deepStrictEqual(policy.canonicalSkillChanges, []);
  assert.deepStrictEqual(policy.skillContentChanges, []);
  assert.ok(policy.paths.every((entry) => entry.kind === "web_app_source"));
}

{
  const lockfiles = [
    modifiedRecord("apps/aas-plugin/package-lock.json"),
    modifiedRecord("skills/loki-mode/examples/todo-app-generated/backend/package-lock.json"),
  ];
  const policy = classifyChangeRecords(lockfiles);
  assert.strictEqual(policy.approvalSafe, true);
  assert.strictEqual(policy.requiresHumanReview, true);
  assert.deepStrictEqual(policy.skillContentChanges, []);
  assert.deepStrictEqual(policy.dependencyLockfileChanges, lockfiles.map((record) => record.new_path).sort());
  assert.ok(policy.paths.every((entry) => entry.kind === "dependency_lockfile"));
}

{
  const policy = classifyChangeRecords([addedRecord("apps/web-app/package-lock.json")]);
  assert.strictEqual(policy.approvalSafe, false);
  assert.strictEqual(policy.requiresHumanReview, false);
  assert.ok(policy.reasons.some((entry) => entry.includes("new_unapproved_path")));
}

{
  const policy = classifyChangeRecords([
    {
      status: "R",
      old_path: "skills/example/references/old.md",
      new_path: "skills/example/references/new.md",
      old_mode: "100644",
      new_mode: "100644",
      old_oid: OLD_OID,
      new_oid: NEW_OID,
      old_size: 100,
      new_size: 100,
    },
    {
      status: "C",
      old_path: "docs/users/faq.md",
      new_path: "docs/users/faq-copy.md",
      old_mode: "100644",
      new_mode: "100644",
      old_oid: OLD_OID,
      new_oid: NEW_OID,
      old_size: 100,
      new_size: 100,
    },
  ]);
  assert.strictEqual(policy.approvalSafe, true);
}

{
  // Git pairs a copy by similarity against any path already present in the base
  // tree, so the same new canonical SKILL.md can be reported as a copy of a
  // canonical skill, of a generated plugin mirror, or of nothing at all. The
  // read-only origin must be accepted in every case; the destination still
  // carries the reviewed change. Observed on the Beatra skill PRs #1473-#1487.
  const canonicalCopy = {
    status: "C",
    old_path: "skills/suno-lyrics-to-song/SKILL.md",
    new_path: "skills/example/SKILL.md",
    old_mode: "100644",
    new_mode: "100644",
    old_oid: OLD_OID,
    new_oid: NEW_OID,
    old_size: 100,
    new_size: 100,
  };
  const pluginCopy = {
    ...canonicalCopy,
    old_path: "plugins/agentic-awesome-skills/skills/suno-lyrics-to-song/SKILL.md",
  };
  for (const [label, record] of [
    ["canonical origin", canonicalCopy],
    ["generated mirror origin", pluginCopy],
  ]) {
    const policy = classifyChangeRecords([record]);
    assert.strictEqual(policy.approvalSafe, true, label);
    assert.strictEqual(policy.requiresHumanReview, true, label);
    assert.deepStrictEqual(policy.canonicalSkillChanges, ["skills/example/SKILL.md"], label);
    const origin = policy.paths.find((entry) => entry.side === "old");
    assert.strictEqual(origin.approvalSafe, true, label);
    assert.strictEqual(origin.kind, "copy_origin", label);
    assert.ok(!policy.reasons.some((entry) => entry.includes("old_unapproved_path")), label);
  }

  // A rename modifies the origin, and deleting or editing an unapproved path
  // stays a definite failure: only the copy origin is read-only.
  for (const [label, record, reason] of [
    ["unapproved origin rename", { ...pluginCopy, status: "R" }, "old_unapproved_path"],
    ["unapproved origin deletion", {
      status: "D",
      old_path: pluginCopy.old_path,
      new_path: null,
      old_mode: "100644",
      new_mode: "000000",
      old_oid: OLD_OID,
      new_oid: ZERO_OID,
      old_size: 100,
    }, "old_unapproved_path"],
    ["unapproved origin modification", {
      status: "M",
      old_path: pluginCopy.old_path,
      new_path: pluginCopy.old_path,
      old_mode: "100644",
      new_mode: "100644",
      old_oid: OLD_OID,
      new_oid: NEW_OID,
      old_size: 100,
      new_size: 100,
    }, "old_unapproved_path"],
    ["copy origin executable mode", { ...pluginCopy, old_mode: "100755" }, "old_executable_mode"],
    ["copy origin symlink mode", { ...pluginCopy, old_mode: "120000" }, "old_symlink_mode"],
    ["copy origin unapproved destination", {
      ...pluginCopy,
      new_path: "plugins/agentic-awesome-skills/skills/other/SKILL.md",
    }, "new_unapproved_path"],
  ]) {
    const policy = classifyChangeRecords([record]);
    assert.strictEqual(policy.approvalSafe, false, label);
    assert.ok(policy.reasons.some((entry) => entry.includes(reason)), `${label}: ${policy.reasons.join(",")}`);
  }
}

{
  const policy = classifyChangeRecords([{
    status: "R",
    old_path: "skills/design-it/old-style/SKILL.md",
    new_path: "skills/design-it/new-style/SKILL.md",
    old_mode: "100644",
    new_mode: "100644",
    old_oid: OLD_OID,
    new_oid: NEW_OID,
    old_size: 100,
    new_size: 100,
  }]);
  assert.strictEqual(policy.approvalSafe, true);
  assert.strictEqual(policy.requiresHumanReview, true);
  assert.deepStrictEqual(policy.canonicalSkillChanges, [
    "skills/design-it/new-style/SKILL.md",
    "skills/design-it/old-style/SKILL.md",
  ]);
}

{
  const policy = classifyChangeRecords([{
    status: "D",
    old_path: "docs/users/obsolete.md",
    new_path: null,
    old_mode: "100644",
    new_mode: "000000",
    old_oid: OLD_OID,
    new_oid: ZERO_OID,
    old_size: 42,
  }]);
  assert.strictEqual(policy.approvalSafe, true);
}

for (const [label, record, reason] of [
  ["executable", modifiedRecord("skills/example/references/guide.md", { new_mode: "100755" }), "new_executable_mode"],
  ["symlink", addedRecord("skills/example/references/link.md", { new_mode: "120000" }), "new_symlink_mode"],
  ["gitlink", addedRecord("skills/example/references/vendor.md", { new_mode: "160000" }), "new_gitlink_mode"],
  ["unknown mode", addedRecord("skills/example/references/guide.md", { new_mode: "100664" }), "new_unknown_mode"],
  ["oversized", addedRecord("skills/example/assets/large.pdf", { new_size: 1024 * 1024 + 1 }), "new_oversized_blob"],
  ["unknown extension", addedRecord("skills/example/references/run.sh"), "new_unknown_extension"],
  ["sensitive path", addedRecord("tools/scripts/check.md"), "new_unapproved_path"],
  ["mode only", modifiedRecord("skills/example/references/guide.md", { new_mode: "100755", new_oid: OLD_OID }), "new_executable_mode"],
  ["unknown status", modifiedRecord("skills/example/SKILL.md", { status: "X" }), "unknown_status"],
]) {
  const policy = classifyChangeRecords([record]);
  assert.strictEqual(policy.approvalSafe, false, label);
  assert.ok(policy.reasons.some((entry) => entry.includes(reason)), `${label}: ${policy.reasons.join(",")}`);
}

{
  const policy = classifyChangeRecords([
    modifiedRecord("skills/example/references/guide.md"),
    addedRecord(".github/workflows/steal.yml"),
  ]);
  assert.strictEqual(policy.approvalSafe, false);
  assert.strictEqual(policy.sensitive, true);
}

{
  const records = [
    modifiedRecord("docs/users/one.md"),
    modifiedRecord("docs/users/two.md"),
  ];
  const tooMany = classifyChangeRecords(records, { maxChangeRecords: 1 });
  assert.ok(tooMany.reasons.includes("too_many_change_records"));
  const tooLarge = classifyChangeRecords(records, { maxTotalBlobBytes: 700 });
  assert.ok(tooLarge.reasons.includes("oversized_total_diff"));
}

// Both generated setup guides must participate in canonical sync and scripted release staging.
const actualContract = require("../../lib/workflow-contract").loadWorkflowContract(__dirname);
const releaseManaged = require("../../lib/workflow-contract").getManagedFiles(actualContract, { includeMixed: true, includeReleaseManaged: true });
for (const guide of ["docs/users/codex-cli-skills.md", "docs/users/claude-code-skills.md"]) {
  assert.ok(actualContract.mixedFiles.includes(guide), `${guide} must be classified as mixed`);
  assert.ok(releaseManaged.includes(guide), `${guide} must be included in release staging`);
}

// Execute the actual workflow resolver: failed bootstrap cannot be a passing review.
{
  const YAML = require('yaml');
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const workflow = YAML.parse(skillReviewWorkflow);
  const steps = workflow.jobs['review-attempt'].steps;
  const setup = steps.find((step) => step.id === 'tessl-setup');
  const review = steps.find((step) => step.id === 'tessl-review');
  const resolver = steps.find((step) => step.id === 'outcome');
  assert.strictEqual(setup['timeout-minutes'], 2);
  assert.strictEqual(setup['continue-on-error'], true);
  assert.match(review.if, /steps\.tessl-setup\.outcome == 'success'/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-review-outcome-'));
  const output = path.join(directory, 'output');
  try {
    for (const [setupOutcome, result, cache, expected] of [
      ['failure', 'reviewed', 'false', 'manual'],
      ['cancelled', 'reviewed', 'false', 'manual'],
      ['success', 'manual', 'false', 'manual'],
      ['success', 'reviewed', 'false', 'reviewed'],
      ['skipped', '', 'true', 'reviewed'],
    ]) {
      fs.writeFileSync(output, '');
      const run = spawnSync('bash', ['-c', resolver.run], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: output, REQUIRES_MANUAL: 'false',
          HAS_SKILLS: 'true', CACHE_HIT: cache, SETUP_OUTCOME: setupOutcome, TESSL_RESULT: result },
      });
      assert.strictEqual(run.status, 0, run.stderr);
      assert.strictEqual(fs.readFileSync(output, 'utf8').trim(), `outcome=${expected}`);
    }
    // No setup and no trustworthy result must fail closed, not invent a pass.
    const unresolved = spawnSync('bash', ['-c', resolver.run], {
      encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: output,
        REQUIRES_MANUAL: 'false', HAS_SKILLS: 'true', CACHE_HIT: 'false',
        SETUP_OUTCOME: '', TESSL_RESULT: '' },
    });
    assert.notStrictEqual(unresolved.status, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
