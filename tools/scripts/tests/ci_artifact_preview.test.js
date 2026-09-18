const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const preview = require("../ci_artifact_preview.cjs");

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "ci-artifact-preview-"));
const MANIFEST = path.join(ROOT, "preview.json");
const OUTPUT = path.join(ROOT, "github-output.txt");
const SUMMARY = path.join(ROOT, "summary.md");
const WORKFLOW_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);

assert.strictEqual(
  preview.escapeHtml(`<tag attr="value">&'\\\``),
  "&lt;tag attr=&quot;value&quot;&gt;&amp;&#39;\\`",
  "step-summary values must be HTML-encoded instead of relying on incomplete Markdown escaping",
);

process.env.GITHUB_OUTPUT = OUTPUT;
const created = preview.createManifest({
  output: MANIFEST,
  mode: "source-preview",
  repository: "owner/repo",
  runId: "12345",
  runAttempt: "1",
  workflowSha: WORKFLOW_SHA,
  headSha: HEAD_SHA,
  primaryCategory: "skill",
  categoriesJson: '["docs","skill"]',
  driftFile: ["CATALOG.md", "data/skills.json"],
  writeGithubOutput: true,
});
assert.match(created.digest, /^[0-9a-f]{64}$/);
assert.strictEqual(fs.readFileSync(OUTPUT, "utf8"), `manifest_digest=${created.digest}\n`);
assert.strictEqual(
  fs.readFileSync(MANIFEST, "utf8"),
  `${preview.canonicalJson(created.manifest)}\n`,
  "create must use byte-stable canonical JSON",
);

process.env.GITHUB_STEP_SUMMARY = SUMMARY;
const verified = preview.verifySummary({
  manifest: MANIFEST,
  expectedRepository: "owner/repo",
  expectedRunId: "12345",
  expectedRunAttempt: "1",
  expectedWorkflowSha: WORKFLOW_SHA,
  expectedHeadSha: HEAD_SHA,
  expectedDigest: created.digest,
  writeStepSummary: true,
});
assert.deepStrictEqual(verified, created.manifest);
assert.match(fs.readFileSync(SUMMARY, "utf8"), /Artifact Preview[\s\S]*CATALOG\.md/);

for (const [field, value, pattern] of [
  ["expectedRepository", "other/repo", /repository/],
  ["expectedRunId", "999", /runId/],
  ["expectedRunAttempt", "2", /runAttempt/],
  ["expectedWorkflowSha", "c".repeat(40), /workflowSha/],
  ["expectedHeadSha", "d".repeat(40), /headSha/],
  ["expectedDigest", "e".repeat(64), /SHA-256/],
]) {
  const options = {
    manifest: MANIFEST,
    expectedRepository: "owner/repo",
    expectedRunId: "12345",
    expectedRunAttempt: "1",
    expectedWorkflowSha: WORKFLOW_SHA,
    expectedHeadSha: HEAD_SHA,
    expectedDigest: created.digest,
    [field]: value,
  };
  assert.throws(() => preview.verifySummary(options), pattern);
}

assert.throws(
  () => preview.validateManifest({ ...created.manifest, workflowSha: "short" }),
  /full lowercase SHA-1/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, categories: ["skill", "docs"] }),
  /strictly sorted/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, driftFiles: ["CATALOG.md", "CATALOG.md"] }),
  /strictly sorted/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, driftFiles: ["../escape.md"] }),
  /unsafe path segment/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, driftFiles: ["bad\\path.md"] }),
  /normalized repository-relative/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, driftFiles: ["bad\npath.md"] }),
  /control characters/,
);
assert.throws(
  () => preview.validateManifest({ ...created.manifest, mode: "canonical-exact-tree" }),
  /must not contain generated drift/,
);
assert.doesNotThrow(() => preview.validateManifest({
  ...created.manifest,
  mode: "canonical-exact-tree",
  driftFiles: [],
}));

const nonCanonicalPath = path.join(ROOT, "noncanonical.json");
fs.writeFileSync(nonCanonicalPath, `${JSON.stringify(created.manifest, null, 2)}\n`, "utf8");
assert.throws(
  () => preview.readCanonicalManifest(nonCanonicalPath),
  /not encoded as canonical JSON/,
);

const tamperedPath = path.join(ROOT, "tampered.json");
fs.writeFileSync(tamperedPath, fs.readFileSync(MANIFEST, "utf8").replace("CATALOG.md", "README.md"), "utf8");
assert.throws(
  () => preview.verifySummary({
    manifest: tamperedPath,
    expectedRepository: "owner/repo",
    expectedRunId: "12345",
    expectedRunAttempt: "1",
    expectedWorkflowSha: WORKFLOW_SHA,
    expectedHeadSha: HEAD_SHA,
    expectedDigest: created.digest,
  }),
  /SHA-256/,
);

assert.throws(
  () => preview.parseOptions(["create", "--mode", "source-preview", "--mode", "canonical-exact-tree"]),
  /Duplicate option/,
);
assert.throws(() => preview.parseOptions(["unknown"]), /Unknown command/);

fs.rmSync(ROOT, { recursive: true, force: true });
console.log("ci artifact preview tests passed");
