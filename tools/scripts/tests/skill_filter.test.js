const assert = require("assert");

const {
  getSkillsByBundle,
  filterSkillsByCategory,
} = require("../../lib/skill-filter");

const sampleSkills = [
  { id: "core-skill", category: "core" },
  { id: "dev-skill", category: "development" },
  { id: "security-skill", category: "security" },
  { id: "uncategorized-skill", category: "made-up-category" },
];

const filtered = filterSkillsByCategory(sampleSkills, ["security"]);
assert.deepStrictEqual(
  filtered.map((skill) => skill.id),
  ["security-skill"],
  "filterSkillsByCategory should continue filtering by the requested categories",
);

const complete = getSkillsByBundle(sampleSkills, "complete");
assert.deepStrictEqual(
  complete.map((skill) => skill.id),
  sampleSkills.map((skill) => skill.id),
  "the complete bundle should include every skill, even when categories are not hardcoded",
);
