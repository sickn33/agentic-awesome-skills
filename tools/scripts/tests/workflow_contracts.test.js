const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  classifyChangeRecords,
  classifyChangedFiles,
  classifyPathPolicy,
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

const publishWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "publish-npm.yml"),
  "utf8",
);
assert.match(publishWorkflow, /name: Verify release identity/);
assert.match(publishWorkflow, /GITHUB_REF_TYPE" = "tag/);
assert.match(publishWorkflow, /expected_tag="v\$\(node -p/);

const pagesWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "pages.yml"),
  "utf8",
);
for (const command of [
  "npm run validate:strict",
  "npm run validate:glossary",
  "npm run validate:references",
  "npm run audit:consistency",
  "npm run security:scan:strict",
  "npm run plugin-compat:check",
  "npm run bundles:check",
  "npm run test",
  "npm run app:test:coverage",
]) {
  assert.match(pagesWorkflow, new RegExp(command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
}
assert.match(pagesWorkflow, /verify:seo -- --require-hosted-url/);

const ciWorkflow = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "..", ".github", "workflows", "ci.yml"),
  "utf8",
);
assert.doesNotMatch(
  ciWorkflow,
  /ENABLE_NETWORK_TESTS:\s*["']1["']/,
  "PR and push CI must not depend on mutable upstream network clones",
);
assert.match(ciWorkflow, /^permissions:\n  contents: read$/m);
assert.match(
  ciWorkflow,
  /source-validation:[\s\S]*?- name: Refresh ephemeral skill index for source tests\n\s+run: npm run index\n[\s\S]*?- name: Run tests\n\s+run: npm run test/,
  "source-only skill PRs must refresh the uncommitted index before tests read it",
);
assert.match(ciWorkflow, /name: pr-evidence-/);
assert.doesNotMatch(ciWorkflow, /pull_request_target:/);
assert.doesNotMatch(ciWorkflow, /actions\/download-artifact/);
const prEvidenceJob = ciWorkflow.match(/^  pr-evidence:\n([\s\S]*?)(?=^  artifact-preview:)/m)?.[0] || "";
assert.ok(prEvidenceJob, "pr-evidence job must exist");
assert.doesNotMatch(prEvidenceJob, /(?:contents|pull-requests|actions): write/);
assert.doesNotMatch(prEvidenceJob, /secrets\./);

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
assert.match(skillReviewWorkflow, /^  review:$/m);
assert.match(skillReviewWorkflow, /^  manual-review-required:$/m);
assert.match(skillReviewWorkflow, /^  missing-review-credentials:$/m);
assert.match(
  skillReviewWorkflow,
  /if: \$\{\{ needs\.review-state\.outputs\.configured != 'true' && github\.event\.pull_request\.head\.repo\.full_name != github\.repository \}\}/,
);
assert.match(
  skillReviewWorkflow,
  /if: \$\{\{ needs\.review-state\.outputs\.configured != 'true' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository \}\}/,
);
assert.match(skillReviewWorkflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
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
]) {
  const policy = classifyPathPolicy(filePath);
  assert.strictEqual(policy.approvalSafe, true, filePath);
  assert.strictEqual(policy.kind, expectedKind, filePath);
}

for (const [filePath, reason] of [
  [".github/workflows/ci.yml", "unapproved_path"],
  ["tools/scripts/check.js", "unapproved_path"],
  ["skills/example/references/run.py", "unknown_extension"],
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
