const assert = require("assert");
const { hasUseSection } = require("../validate-skills");

const samples = [
  ["## When to Use", true],
  ["## Use this skill when", true],
  ["## When to Use This Skill", true],
  ["## Overview", false],
];

for (const [heading, expected] of samples) {
  const content = `\n${heading}\n- item\n`;
  assert.strictEqual(hasUseSection(content), expected, heading);
}

// Regression test for YAML validity in frontmatter (Issue #79)
// Logs skills with parse errors as warnings; does not fail (many legacy skills have multiline frontmatter).
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");
const { listSkillIdsRecursive, parseFrontmatter } = require("../../lib/skill-utils");

const SKILLS_DIR = path.join(findProjectRoot(__dirname), "skills");
const skillIds = listSkillIdsRecursive(SKILLS_DIR);

console.log(`Checking YAML validity for ${skillIds.length} skills (smoke test)...`);
let warnCount = 0;
for (const skillId of skillIds) {
  const skillPath = path.join(SKILLS_DIR, skillId, "SKILL.md");
  const content = fs.readFileSync(skillPath, "utf8");
  const { errors, hasFrontmatter } = parseFrontmatter(content);

  if (!hasFrontmatter) {
    console.warn(`[WARN] No frontmatter in ${skillId}`);
    warnCount++;
    continue;
  }

  if (errors.length > 0) {
    console.warn(`[WARN] YAML parse errors in ${skillId}: ${errors.join(", ")}`);
    warnCount++;
  }
}

if (warnCount > 0) {
  console.log(`ok (${warnCount} skills with frontmatter warnings; run validate_skills.py for authoritative schema checks)`);
} else {
  console.log("ok");
}
