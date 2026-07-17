"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const versions = require("../../lib/aas-v1/versions");
const { canonicalJson, sha256 } = require("../../lib/aas-v1/canonical-json");
const { buildPlanEnvelope, validateManifest, validatePlanEnvelope } = require("../../lib/aas-v1/stack");
const { validateInstance } = require("../../lib/aas-v1/schema-validator");

const DIGEST_A = `sha256-${"a".repeat(64)}`;
const DIGEST_B = `sha256-${"b".repeat(64)}`;
const DIGEST_C = `sha256-${"c".repeat(64)}`;
const DIGEST_D = `sha256-${"d".repeat(64)}`;
const DIGEST_E = `sha256-${"e".repeat(64)}`;
const DIGEST_F = `sha256-${"f".repeat(64)}`;

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    name: "react-vite-production",
    catalog: {
      package: "agentic-awesome-skills",
      version: "15.0.0",
      integrity: DIGEST_A,
    },
    targets: [
      { host: "codex", scope: "project" },
      { host: "claude", scope: "user" },
    ],
    intent: { goals: ["build", "test", "deploy"] },
    policy: {
      allowedRisk: ["none", "safe"],
      requireKnownSource: true,
      allowManualSetup: false,
    },
    skills: [
      { id: "react-best-practices" },
      { id: "testing/playwright-skill" },
    ],
    ...overrides,
  };
}

function planInput(overrides = {}) {
  const value = manifest();
  const installedEntries = [
    { skillId: "react-best-practices", treeDigest: DIGEST_E, catalogIntegrity: DIGEST_A },
  ];
  const nextEntries = [
    { skillId: "react-best-practices", treeDigest: DIGEST_B, catalogIntegrity: DIGEST_A },
    { skillId: "testing/playwright-skill", treeDigest: DIGEST_F, catalogIntegrity: DIGEST_A },
  ];
  return {
    manifest: value,
    handshake: { ...versions },
    catalog: { ...value.catalog },
    runtime: {
      package: "agentic-awesome-skills",
      version: "15.0.0",
      integrity: "sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==",
      closureDigest: DIGEST_B,
    },
    target: {
      host: "codex",
      scope: "project",
      adapterVersion: "1.0.0",
      identityDigest: DIGEST_C,
    },
    installedState: {
      digest: sha256(canonicalJson({ schemaVersion: 1, entries: installedEntries })),
      entries: installedEntries,
    },
    operations: [
      {
        kind: "install",
        skillId: "testing/playwright-skill",
        sourceTreeDigest: DIGEST_F,
        expectedTreeDigest: null,
        resultTreeDigest: DIGEST_F,
        backupRequired: false,
      },
      {
        kind: "replaceManaged",
        skillId: "react-best-practices",
        sourceTreeDigest: DIGEST_B,
        expectedTreeDigest: DIGEST_E,
        resultTreeDigest: DIGEST_B,
        backupRequired: true,
      },
    ],
    overrides: [
      {
        kind: "discoveryCandidate",
        skillId: "testing/playwright-skill",
        reasonCodes: ["AAS_OVERRIDE_DISCOVERY_UNKNOWN"],
        unknownFields: ["validation", "source"],
      },
    ],
    stateCommit: {
      previousDigest: sha256(canonicalJson({ schemaVersion: 1, entries: installedEntries })),
      nextDigest: sha256(canonicalJson({ schemaVersion: 1, entries: nextEntries })),
      position: "final",
    },
    ...overrides,
  };
}

test("validateManifest returns a canonical digest without persisting derived profile data", () => {
  const value = manifest();
  const result = validateManifest(value);
  assert.equal(result.ok, true);
  assert.equal(result.status, "valid");
  assert.equal(result.manifestDigest, sha256(canonicalJson(value)));
  assert.deepEqual(
    {
      protocolVersion: result.protocolVersion,
      coreVersion: result.coreVersion,
      metadataSchemaVersion: result.metadataSchemaVersion,
      scorerVersion: result.scorerVersion,
    },
    versions,
  );

  const withDerivedProfile = { ...value, profile: { languages: ["typescript"] } };
  const invalid = validateManifest(withDerivedProfile);
  assert.equal(invalid.ok, false);
  assert(invalid.details.issues.some((entry) => entry.path === "$.profile" && entry.code === "AAS_STACK_FIELD_UNKNOWN"));
});

test("validateManifest rejects duplicates, unsafe ids, unknown policy keys, and unsupported targets", () => {
  const value = manifest({
    targets: [
      { host: "codex", scope: "project" },
      { host: "codex", scope: "project" },
      { host: "gemini", scope: "project" },
    ],
    policy: {
      allowedRisk: ["safe", "safe"],
      requireKnownSource: true,
      allowManualSetup: false,
      force: true,
    },
    skills: [{ id: "../escape" }, { id: "same" }, { id: "same" }],
  });
  const result = validateManifest(value);
  assert.equal(result.ok, false);
  const codes = new Set(result.details.issues.map((entry) => entry.code));
  for (const code of [
    "AAS_STACK_TARGET_DUPLICATE",
    "AAS_STACK_TARGET_HOST_UNSUPPORTED",
    "AAS_STACK_FIELD_UNKNOWN",
    "AAS_STACK_VALUE_DUPLICATE",
    "AAS_STACK_STRING_FORMAT_INVALID",
    "AAS_STACK_SKILL_DUPLICATE",
  ]) assert(codes.has(code), `missing issue code ${code}`);
});

test("buildPlanEnvelope is byte-deterministic, single-target, path-free, and digest-bound", () => {
  const firstInput = planInput();
  const secondInput = planInput({
    operations: [...firstInput.operations].reverse(),
    overrides: [{
      ...firstInput.overrides[0],
      reasonCodes: [...firstInput.overrides[0].reasonCodes].reverse(),
      unknownFields: [...firstInput.overrides[0].unknownFields].reverse(),
    }],
  });
  const first = buildPlanEnvelope(firstInput);
  const second = buildPlanEnvelope(secondInput);

  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(first.kind, "aas.stack-plan");
  assert.equal(first.digest, sha256(canonicalJson(first.payload)));
  assert.deepEqual(first.payload.target, firstInput.target);
  assert.equal(Object.hasOwn(first.payload.target, "path"), false);
  assert.deepEqual(first.payload.desiredSkills, ["react-best-practices", "testing/playwright-skill"]);
  assert.deepEqual(first.payload.operations.map((entry) => entry.kind), ["replaceManaged", "install"]);
  assert.equal(first.payload.stateCommit.position, "final");

  const tampered = structuredClone(first);
  tampered.payload.operations[0].resultTreeDigest = DIGEST_C;
  assert.notEqual(tampered.digest, sha256(canonicalJson(tampered.payload)));
});

test("buildPlanEnvelope fails closed on handshake, catalog, target, drift, and physical path input", () => {
  assert.throws(
    () => buildPlanEnvelope(planInput({ handshake: { ...versions, scorerVersion: "2.0.0" } })),
    (error) => error.code === "AAS_PLAN_VERSION_INCOMPATIBLE" && error.category === "incompatibleVersion",
  );
  assert.throws(
    () => buildPlanEnvelope(planInput({ catalog: { ...manifest().catalog, integrity: DIGEST_B } })),
    (error) => error.code === "AAS_PLAN_CATALOG_MISMATCH",
  );
  assert.throws(
    () => buildPlanEnvelope(planInput({ target: { host: "claude", scope: "project", adapterVersion: "1.0.0", identityDigest: DIGEST_C } })),
    (error) => error.code === "AAS_PLAN_TARGET_NOT_IN_MANIFEST",
  );
  assert.throws(
    () => buildPlanEnvelope(planInput({ stateCommit: { previousDigest: DIGEST_A, nextDigest: DIGEST_F, position: "final" } })),
    (error) => error.code === "AAS_PLAN_STATE_COMMIT_MISMATCH",
  );
  assert.throws(
    () => buildPlanEnvelope(planInput({ target: { ...planInput().target, path: "/tmp/escape" } })),
    (error) => error.code === "AAS_PLAN_FIELD_UNKNOWN" && error.details.keys.includes("path"),
  );
});

test("validatePlanEnvelope rejects a re-digested incompatible or internally inconsistent plan", () => {
  const plan = buildPlanEnvelope(planInput());
  assert.equal(validatePlanEnvelope(plan), plan);

  const incompatible = structuredClone(plan);
  incompatible.payload.versions.scorerVersion = "9.0.0";
  incompatible.digest = sha256(canonicalJson(incompatible.payload));
  assert.throws(() => validatePlanEnvelope(incompatible), { code: "AAS_PLAN_VERSION_INCOMPATIBLE" });

  const inconsistent = structuredClone(plan);
  inconsistent.payload.stateCommit.nextDigest = DIGEST_C;
  inconsistent.digest = sha256(canonicalJson(inconsistent.payload));
  assert.throws(() => validatePlanEnvelope(inconsistent), { code: "AAS_PLAN_NEXT_STATE_MISMATCH" });
});

test("all public v1 stack schemas are valid JSON Schema documents with unique ids", () => {
  const schemaDirectory = path.resolve(__dirname, "..", "..", "..", "schemas", "aas-v1");
  const expected = [
    "catalog-manifest.schema.json",
    "catalog-metadata.schema.json",
    "doctor-result.schema.json",
    "journal.schema.json",
    "managed-state.schema.json",
    "plan.schema.json",
    "recommendation-input.schema.json",
    "recommendation-output.schema.json",
    "recovery-plan.schema.json",
    "result-envelope.schema.json",
    "stack-manifest.schema.json",
  ];
  const ids = new Set();
  for (const name of expected) {
    const schema = JSON.parse(fs.readFileSync(path.join(schemaDirectory, name), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^urn:agentic-awesome-skills:schema:/);
    assert.equal(ids.has(schema.$id), false, `duplicate schema id ${schema.$id}`);
    ids.add(schema.$id);
  }
});

test("the generated offline catalog manifest validates against its public schema", () => {
  const manifestPath = path.resolve(__dirname, "..", "..", "..", "data", "aas-v1", "catalog-manifest.v1.json");
  const instance = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(validateInstance("catalog-manifest.schema.json", instance), instance);
});
