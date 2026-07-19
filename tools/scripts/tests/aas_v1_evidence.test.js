"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const core = require("../../lib/aas-v1");

const FILE_DIGEST = core.sha256("package fixture");
const SKILL_ID = "skill-one";

function fixture() {
  const catalog = core.syntheticCatalog([{
    id: SKILL_ID,
    name: "Skill One",
    description: "Fixture",
    category: "testing",
    tags: [],
    triggers: [],
  }]);
  const manifest = {
    schemaVersion: 2,
    name: "evidence-stack",
    catalog: { package: catalog.package, version: catalog.version, integrity: catalog.digest },
    targets: [{ host: "codex", scope: "project" }],
    profile: { goals: ["test evidence"], languages: [], frameworks: [], constraints: [] },
    skills: [{ id: SKILL_ID }],
  };
  const manifestDigest = core.stack.validateManifest(manifest).manifestDigest;
  const capabilities = [{
    id: "runtime-design",
    dimensionId: "architecture-runtime",
    status: "covered",
    evidence: [{ path: "package.json", sha256: FILE_DIGEST }],
    selectedSkillIds: [SKILL_ID],
  }];
  const dimensions = core.evidence.DIMENSION_IDS.map((id) => ({
    id,
    status: id === "architecture-runtime" ? "applicable" : "not-applicable",
    capabilityIds: id === "architecture-runtime" ? ["runtime-design"] : [],
  }));
  const processTrace = {
    schemaVersion: 1,
    calls: [{
      sequence: 1,
      tool: "compose_stack",
      attempt: 1,
      input: { skillIds: [SKILL_ID] },
      output: { ok: true, manifestDigest, selectedSkillIds: [SKILL_ID] },
      canonicalInputBytes: 25,
      canonicalOutputBytes: 140,
    }, {
      sequence: 2,
      tool: "inspect_stack",
      attempt: 1,
      input: { manifestDigest },
      output: { ok: true, status: "valid", manifestDigest, selectedSkillIds: [SKILL_ID] },
      canonicalInputBytes: 96,
      canonicalOutputBytes: 160,
    }],
  };
  return {
    catalog,
    manifest,
    project: {
      schemaVersion: 1,
      commit: "a".repeat(40),
      files: [
        { path: "src/index.js", size: 10, sha256: core.sha256("source") },
        { path: "package.json", size: 15, sha256: FILE_DIGEST },
      ],
    },
    dimensions,
    capabilities,
    processTrace,
    client: { name: "codex", version: "1" },
    runtimeObservations: {
      schemaVersion: 1,
      digestScope: "excluded-from-evidence-digest",
      calls: [{ sequence: 1, durationMicros: 100 }, { sequence: 2, durationMicros: 200 }],
    },
  };
}

test("selection evidence is canonical, deterministic, and excludes runtime timing from its digest", () => {
  const input = fixture();
  input.dimensions.reverse();
  const first = core.createSelectionEvidence(input);
  const secondInput = fixture();
  secondInput.runtimeObservations.calls[0].durationMicros = 999999;
  const second = core.createSelectionEvidence(secondInput);

  assert.equal(first.digest, core.sha256(core.canonicalJson(first.payload)));
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.payload.dimensions.map((entry) => entry.id), core.evidence.DIMENSION_IDS);
  assert.deepEqual(first.payload.project.files.map((entry) => entry.path), ["package.json", "src/index.js"]);
  assert.deepEqual(first.payload.selectedSkillIds, [SKILL_ID]);
  assert.equal(core.validateSelectionEvidence(first, { catalog: input.catalog, manifest: input.manifest }).status, "valid");
});

test("selection evidence enforces strict repository-relative paths and project fingerprints", () => {
  for (const unsafe of ["/private/secret", "../secret", "src/../secret", "C:/secret", "src\\secret", "src/%2e%2e/secret", "src//secret"]) {
    const input = fixture();
    input.project.files[0].path = unsafe;
    assert.throws(() => core.createSelectionEvidence(input), { code: "AAS_SELECTION_EVIDENCE_INVALID" });
  }

  const mismatchedInput = fixture();
  mismatchedInput.project.fingerprint = `sha256-${"0".repeat(64)}`;
  assert.throws(
    () => core.createSelectionEvidence(mismatchedInput),
    (error) => error.code === "AAS_SELECTION_EVIDENCE_INVALID"
      && error.details.issues.some((entry) => entry.code === "AAS_EVIDENCE_PROJECT_FINGERPRINT_MISMATCH"),
  );

  const input = fixture();
  const evidence = core.createSelectionEvidence(input);
  evidence.payload.project.fingerprint = `sha256-${"0".repeat(64)}`;
  evidence.digest = core.sha256(core.canonicalJson(evidence.payload));
  assert.throws(
    () => core.validateSelectionEvidence(evidence, { catalog: input.catalog, manifest: input.manifest }),
    (error) => error.code === "AAS_SELECTION_EVIDENCE_INVALID"
      && error.details.issues.some((entry) => entry.code === "AAS_EVIDENCE_PROJECT_FINGERPRINT_MISMATCH"),
  );
});

test("selection evidence never dereferences repository paths or leaks project contents", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../lib/aas-v1/evidence.js"), "utf8");
  assert.doesNotMatch(source, /require\(["']node:fs/);

  const secret = "canary-private-project-content";
  const absoluteTarget = "/private/secret/linked-config.json";
  const input = fixture();
  input.project.files = [{
    path: "config/linked-config.json",
    size: Buffer.byteLength(secret),
    sha256: core.sha256(secret),
  }];
  input.capabilities[0].evidence = [{
    path: input.project.files[0].path,
    sha256: input.project.files[0].sha256,
  }];
  const serialized = core.canonicalJson(core.createSelectionEvidence(input));
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(absoluteTarget), false);
  assert.match(serialized, /config\/linked-config\.json/);
});

test("selection evidence rejects manifest, catalog, capability, and evidence-reference mismatches", () => {
  const cases = [
    (input) => { input.capabilities[0].selectedSkillIds = []; },
    (input) => { input.capabilities[0].evidence[0].sha256 = core.sha256("other"); },
    (input) => { input.dimensions[0].capabilityIds = ["missing-capability"]; },
    (input) => { input.capabilities[0].dimensionId = "testing-quality"; },
    (input) => { input.processTrace.calls.pop(); },
    (input) => { input.processTrace.calls[1].output.status = "invalid"; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    assert.throws(() => core.createSelectionEvidence(input), { code: "AAS_SELECTION_EVIDENCE_INVALID" });
  }

  const input = fixture();
  const evidence = core.createSelectionEvidence(input);
  const otherManifest = structuredClone(input.manifest);
  otherManifest.name = "other-stack";
  assert.throws(
    () => core.validateSelectionEvidence(evidence, { catalog: input.catalog, manifest: otherManifest }),
    { code: "AAS_SELECTION_EVIDENCE_INVALID" },
  );
});

test("catalog-gap and not-applicable states are explicit and structurally valid", () => {
  const input = fixture();
  input.capabilities.push({
    id: "missing-integration",
    dimensionId: "external-integrations",
    status: "catalog-gap",
    evidence: [{ path: "src/index.js", sha256: core.sha256("source") }],
    selectedSkillIds: [],
  });
  const external = input.dimensions.find((entry) => entry.id === "external-integrations");
  external.status = "applicable";
  external.capabilityIds = ["missing-integration"];
  const evidence = core.createSelectionEvidence(input);
  assert.equal(evidence.payload.capabilities[1].status, "catalog-gap");

  input.capabilities[1].selectedSkillIds = [SKILL_ID];
  assert.throws(() => core.createSelectionEvidence(input), { code: "AAS_SELECTION_EVIDENCE_INVALID" });
});

test("schema caps capability, selected-skill, reference, project-file, and trace cardinality", () => {
  const schema = core.evidence;
  assert.equal(schema.MAX_CAPABILITIES, 256);
  assert.equal(schema.MAX_SELECTED_SKILLS, 128);
  assert.equal(schema.MAX_EVIDENCE_REFS, 4096);

  const input = fixture();
  input.processTrace.calls[1].retryOf = 1;
  input.processTrace.calls[1].attempt = 2;
  assert.doesNotThrow(() => core.createSelectionEvidence(input));
  input.processTrace.calls[1].retryOf = 2;
  assert.throws(() => core.createSelectionEvidence(input), { code: "AAS_SELECTION_EVIDENCE_INVALID" });
});
