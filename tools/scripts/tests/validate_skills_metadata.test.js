const assert = require("assert");

const {
  ALLOWED_FIELDS,
  SOURCE_REPO_PATTERN,
  VALID_SOURCE_TYPES,
  validateSourceMetadata,
} = require("../validate-skills.js");

assert.ok(ALLOWED_FIELDS.has("source_repo"), "source_repo should be an allowed frontmatter field");
assert.ok(ALLOWED_FIELDS.has("source_type"), "source_type should be an allowed frontmatter field");

assert.match("openai/skills", SOURCE_REPO_PATTERN, "OWNER/REPO should be accepted");
assert.doesNotMatch("not-a-repo", SOURCE_REPO_PATTERN, "source_repo must require OWNER/REPO");

assert.ok(VALID_SOURCE_TYPES.has("official"));
assert.ok(VALID_SOURCE_TYPES.has("community"));
assert.ok(VALID_SOURCE_TYPES.has("self"));

assert.deepStrictEqual(
  validateSourceMetadata({ source_repo: "openai/skills", source_type: "official" }, "demo-skill"),
  [],
  "valid source metadata should pass",
);

assert.ok(
  validateSourceMetadata({ source_repo: "invalid", source_type: "official" }, "demo-skill").some((error) =>
    error.includes("source_repo must match OWNER/REPO"),
  ),
  "invalid source_repo should fail",
);

assert.ok(
  validateSourceMetadata({ source_repo: "openai/skills", source_type: "partner" }, "demo-skill").some((error) =>
    error.includes("source_type must be one of"),
  ),
  "invalid source_type should fail",
);

console.log("ok");
