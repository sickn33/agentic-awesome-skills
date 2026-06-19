const assert = require("assert");

const {
  classifyChangedFiles,
  extractChangelogSection,
  getDirectDerivedChanges,
  hasIssueLink,
  hasQualityChecklist,
  requiresReferencesValidation,
} = require("../../lib/workflow-contract");

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
      "plugins/antigravity-awesome-skills/skills/docx-official/ooxml/scripts/unpack.py",
      ".agents/plugins/marketplace.json",
      "skills/example/SKILL.md",
    ],
    contract,
  ),
  [
    "plugins/antigravity-awesome-skills/skills/docx-official/ooxml/scripts/unpack.py",
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
