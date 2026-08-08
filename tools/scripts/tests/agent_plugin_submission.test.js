const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");

const projectRoot = findProjectRoot(__dirname);
const dossierRoot = path.join(
  projectRoot,
  "docs",
  "plugin-submissions",
  "aas-agent-mcp-builder",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const submission = readJson(path.join(dossierRoot, "submission.json"));
const evaluations = readJson(path.join(dossierRoot, "evaluation-cases.json"));
const evaluationResults = readJson(path.join(dossierRoot, "evaluation-results.json"));
const packageJson = readJson(path.join(projectRoot, "package.json"));
const pluginRoot = path.join(projectRoot, submission.plugin.packagePath);
const codexManifest = readJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"));

assert.strictEqual(submission.submissionState, "draft-ready");
assert.strictEqual(submission.submissionType, "skills-only");
assert.strictEqual(submission.plugin.packageId, "aasb-aas-agent-mcp-builder");
assert.strictEqual(submission.plugin.authenticationRequired, false);
assert.strictEqual(submission.plugin.mcpServerIncluded, false);
assert.ok(fs.statSync(pluginRoot).isDirectory());
assert.ok(fs.statSync(path.join(projectRoot, submission.plugin.skillsPath)).isDirectory());
assert.strictEqual(codexManifest.name, submission.plugin.packageId);
assert.strictEqual(codexManifest.version, packageJson.version);

const requiredListingFields = [
  "shortDescription",
  "longDescription",
  "categoryRecommendation",
  "logoPath",
  "websiteURL",
  "supportURL",
  "privacyPolicyURL",
  "termsOfServiceURL",
];
for (const field of requiredListingFields) {
  assert.ok(String(submission.listing[field] || "").trim(), `missing listing field: ${field}`);
}
assert.ok(fs.statSync(path.join(projectRoot, submission.listing.logoPath)).isFile());
assert.ok(fs.statSync(path.join(projectRoot, "PRIVACY.md")).isFile());
assert.ok(fs.statSync(path.join(projectRoot, "TERMS.md")).isFile());
assert.strictEqual(
  codexManifest.interface.privacyPolicyURL,
  submission.listing.privacyPolicyURL,
);
assert.strictEqual(
  codexManifest.interface.termsOfServiceURL,
  submission.listing.termsOfServiceURL,
);
assert.deepStrictEqual(codexManifest.interface.defaultPrompt, [
  "Use this plugin to design an MCP server for this workflow, including tools, schemas, and test cases.",
  "Use this plugin to create an eval plan for this agent and define reliability metrics.",
  "Use this plugin to review this RAG or LangGraph architecture for tool, memory, prompt, and observability gaps.",
]);

assert.strictEqual(evaluations.pluginId, submission.plugin.packageId);
assert.ok(evaluations.positive.length >= 5, "submission requires at least five positive cases");
assert.ok(evaluations.negative.length >= 3, "submission requires at least three negative cases");

const caseIds = new Set();
const prompts = new Set();
for (const testCase of evaluations.positive) {
  for (const field of ["id", "prompt", "expectedBehavior", "expectedResultShape", "fixtureData"]) {
    assert.ok(String(testCase[field] || "").trim(), `positive case missing ${field}`);
  }
  assert.ok(!caseIds.has(testCase.id), `duplicate case id: ${testCase.id}`);
  assert.ok(!prompts.has(testCase.prompt), `duplicate case prompt: ${testCase.prompt}`);
  caseIds.add(testCase.id);
  prompts.add(testCase.prompt);
}
for (const testCase of evaluations.negative) {
  for (const field of ["id", "prompt", "expectedBehavior", "rationale"]) {
    assert.ok(String(testCase[field] || "").trim(), `negative case missing ${field}`);
  }
  assert.ok(!caseIds.has(testCase.id), `duplicate case id: ${testCase.id}`);
  assert.ok(!prompts.has(testCase.prompt), `duplicate case prompt: ${testCase.prompt}`);
  caseIds.add(testCase.id);
  prompts.add(testCase.prompt);
}

assert.strictEqual(submission.availability.requiresPublisherConfirmation, true);
assert.ok(submission.externalRequirements.length >= 4);
assert.strictEqual(evaluationResults.summary.status, "pass-with-client-warnings");
assert.strictEqual(evaluationResults.summary.failed, 0);
assert.strictEqual(evaluationResults.summary.passed, caseIds.size);
assert.deepStrictEqual(
  new Set(evaluationResults.results.map((result) => result.id)),
  caseIds,
);
for (const result of evaluationResults.results) {
  assert.strictEqual(result.status, "pass", `recorded eval failed: ${result.id}`);
  assert.ok(String(result.activation || "").trim(), `missing activation evidence: ${result.id}`);
  assert.ok(String(result.evidence || "").trim(), `missing result evidence: ${result.id}`);
}
assert.ok(evaluationResults.clientWarnings.length >= 1);

console.log(
  `Agent Plugin submission dossier verified: ${evaluations.positive.length} positive, ${evaluations.negative.length} negative, ${evaluationResults.summary.passed} executed`,
);
