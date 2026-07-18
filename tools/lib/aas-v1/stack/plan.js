"use strict";

const versions = require("../versions");
const { canonicalJson, canonicalize, sha256 } = require("../canonical-json");
const { DIGEST_PATTERN, ID_PATTERN, validateManifest } = require("./manifest");
const { validateInstance } = require("../schema-validator");

const VERSION_KEYS = Object.freeze([
  "protocolVersion",
  "coreVersion",
  "metadataSchemaVersion",
  "scorerVersion",
]);
const OPERATION_KINDS = new Set(["install", "replaceManaged", "removeManaged"]);
const OVERRIDE_KINDS = new Set(["discoveryCandidate", "managedDrift"]);
const OPERATION_ORDER = Object.freeze({ removeManaged: 0, replaceManaged: 1, install: 2 });

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function planError(code, category, details = {}) {
  const error = new Error(code);
  error.code = code;
  error.category = category;
  error.details = details;
  return error;
}

function assertPlainObject(value, name) {
  const prototype = value && typeof value === "object" ? Object.getPrototypeOf(value) : null;
  if (!value || Array.isArray(value) || (prototype !== Object.prototype && prototype !== null)) {
    throw planError("AAS_PLAN_INPUT_INVALID", "invalidInput", { field: name });
  }
}

function assertExactKeys(value, allowed, field) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (unknown.length) throw planError("AAS_PLAN_FIELD_UNKNOWN", "invalidInput", { field, keys: unknown });
}

function assertDigest(value, field) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    throw planError("AAS_PLAN_DIGEST_INVALID", "invalidInput", { field });
  }
}

function assertNonEmptyString(value, field, maximum = 256) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    throw planError("AAS_PLAN_STRING_INVALID", "invalidInput", { field });
  }
}

function assertVersionHandshake(handshake) {
  assertPlainObject(handshake, "handshake");
  assertExactKeys(handshake, new Set(VERSION_KEYS), "handshake");
  const incompatible = VERSION_KEYS.filter((key) => handshake[key] !== versions[key]);
  if (incompatible.length) {
    throw planError("AAS_PLAN_VERSION_INCOMPATIBLE", "incompatibleVersion", {
      fields: incompatible,
      expected: Object.fromEntries(incompatible.map((key) => [key, versions[key]])),
      received: Object.fromEntries(incompatible.map((key) => [key, handshake[key] ?? null])),
    });
  }
  return Object.fromEntries(VERSION_KEYS.map((key) => [key, versions[key]]));
}

function normalizeCatalog(catalog, manifestCatalog) {
  assertPlainObject(catalog, "catalog");
  assertExactKeys(catalog, new Set(["package", "version", "integrity"]), "catalog");
  for (const key of ["package", "version", "integrity"]) {
    if (catalog[key] !== manifestCatalog[key]) {
      throw planError("AAS_PLAN_CATALOG_MISMATCH", "integrity", { field: key });
    }
  }
  assertDigest(catalog.integrity, "catalog.integrity");
  return { package: catalog.package, version: catalog.version, integrity: catalog.integrity };
}

function normalizeRuntime(runtime) {
  assertPlainObject(runtime, "runtime");
  assertExactKeys(runtime, new Set(["package", "version", "integrity", "closureDigest"]), "runtime");
  assertNonEmptyString(runtime.package, "runtime.package", 214);
  assertNonEmptyString(runtime.version, "runtime.version", 64);
  assertNonEmptyString(runtime.integrity, "runtime.integrity", 512);
  assertDigest(runtime.closureDigest, "runtime.closureDigest");
  return { ...runtime };
}

function normalizeTarget(target, manifest) {
  assertPlainObject(target, "target");
  assertExactKeys(target, new Set(["host", "scope", "adapterVersion", "identityDigest"]), "target");
  assertNonEmptyString(target.adapterVersion, "target.adapterVersion", 64);
  assertDigest(target.identityDigest, "target.identityDigest");
  if (!manifest.targets.some((candidate) => candidate.host === target.host && candidate.scope === target.scope)) {
    throw planError("AAS_PLAN_TARGET_NOT_IN_MANIFEST", "invalidInput", { host: target.host, scope: target.scope });
  }
  return { ...target };
}

function normalizeInstalledState(installedState) {
  assertPlainObject(installedState, "installedState");
  assertExactKeys(installedState, new Set(["digest", "entries"]), "installedState");
  assertDigest(installedState.digest, "installedState.digest");
  if (!Array.isArray(installedState.entries) || installedState.entries.length > 128) {
    throw planError("AAS_PLAN_INSTALLED_STATE_INVALID", "invalidInput", {});
  }
  const seen = new Set();
  const entries = installedState.entries.map((entry, index) => {
    assertPlainObject(entry, `installedState.entries[${index}]`);
    assertExactKeys(entry, new Set(["skillId", "treeDigest", "catalogIntegrity"]), `installedState.entries[${index}]`);
    if (typeof entry.skillId !== "string" || !ID_PATTERN.test(entry.skillId) || seen.has(entry.skillId)) {
      throw planError("AAS_PLAN_INSTALLED_ENTRY_INVALID", "invalidInput", { index });
    }
    seen.add(entry.skillId);
    assertDigest(entry.treeDigest, `installedState.entries[${index}].treeDigest`);
    assertDigest(entry.catalogIntegrity, `installedState.entries[${index}].catalogIntegrity`);
    return { ...entry };
  });
  entries.sort((left, right) => compareStrings(left.skillId, right.skillId));
  const computedDigest = sha256(canonicalJson({ schemaVersion: 1, entries }));
  if (installedState.digest !== computedDigest) {
    throw planError("AAS_PLAN_INSTALLED_STATE_DIGEST_MISMATCH", "integrity", {});
  }
  return { digest: installedState.digest, entries };
}

function normalizeOperation(operation, index, desiredSkillIds) {
  assertPlainObject(operation, `operations[${index}]`);
  assertExactKeys(
    operation,
    new Set(["kind", "skillId", "sourceTreeDigest", "expectedTreeDigest", "resultTreeDigest", "backupRequired"]),
    `operations[${index}]`,
  );
  if (!OPERATION_KINDS.has(operation.kind) || typeof operation.skillId !== "string" || !ID_PATTERN.test(operation.skillId)) {
    throw planError("AAS_PLAN_OPERATION_INVALID", "invalidInput", { index });
  }
  if (operation.kind !== "removeManaged" && !desiredSkillIds.has(operation.skillId)) {
    throw planError("AAS_PLAN_OPERATION_SKILL_NOT_DESIRED", "invalidInput", { index, skillId: operation.skillId });
  }
  if (operation.kind === "removeManaged" && desiredSkillIds.has(operation.skillId)) {
    throw planError("AAS_PLAN_REMOVE_SKILL_STILL_DESIRED", "invalidInput", { index, skillId: operation.skillId });
  }
  if (operation.kind === "install") {
    if (operation.expectedTreeDigest !== null || operation.backupRequired !== false) {
      throw planError("AAS_PLAN_OPERATION_PRECONDITION_INVALID", "invalidInput", { index });
    }
    assertDigest(operation.sourceTreeDigest, `operations[${index}].sourceTreeDigest`);
    assertDigest(operation.resultTreeDigest, `operations[${index}].resultTreeDigest`);
    if (operation.sourceTreeDigest !== operation.resultTreeDigest) {
      throw planError("AAS_PLAN_OPERATION_RESULT_MISMATCH", "integrity", { index });
    }
  } else if (operation.kind === "replaceManaged") {
    assertDigest(operation.sourceTreeDigest, `operations[${index}].sourceTreeDigest`);
    assertDigest(operation.expectedTreeDigest, `operations[${index}].expectedTreeDigest`);
    assertDigest(operation.resultTreeDigest, `operations[${index}].resultTreeDigest`);
    if (operation.sourceTreeDigest !== operation.resultTreeDigest) {
      throw planError("AAS_PLAN_OPERATION_RESULT_MISMATCH", "integrity", { index });
    }
    if (operation.backupRequired !== true) {
      throw planError("AAS_PLAN_OPERATION_BACKUP_REQUIRED", "invalidInput", { index });
    }
  } else {
    if (operation.sourceTreeDigest !== null || operation.resultTreeDigest !== null || operation.backupRequired !== true) {
      throw planError("AAS_PLAN_OPERATION_PRECONDITION_INVALID", "invalidInput", { index });
    }
    assertDigest(operation.expectedTreeDigest, `operations[${index}].expectedTreeDigest`);
  }
  return { ...operation };
}

function normalizeOperations(operations, manifest) {
  if (!Array.isArray(operations) || operations.length > 256) {
    throw planError("AAS_PLAN_OPERATIONS_INVALID", "invalidInput", {});
  }
  const desiredSkillIds = new Set(manifest.skills.map((skill) => skill.id));
  const normalized = operations.map((operation, index) => normalizeOperation(operation, index, desiredSkillIds));
  const seen = new Set();
  for (const operation of normalized) {
    if (seen.has(operation.skillId)) {
      throw planError("AAS_PLAN_OPERATION_DUPLICATE", "invalidInput", { skillId: operation.skillId });
    }
    seen.add(operation.skillId);
  }
  return normalized.sort((left, right) => (
    OPERATION_ORDER[left.kind] - OPERATION_ORDER[right.kind]
    || compareStrings(left.skillId, right.skillId)
  ));
}

function normalizeOverrides(overrides, operationIds, desiredSkillIds) {
  if (!Array.isArray(overrides) || overrides.length > 128) {
    throw planError("AAS_PLAN_OVERRIDES_INVALID", "invalidInput", {});
  }
  const seen = new Set();
  const normalized = overrides.map((override, index) => {
    assertPlainObject(override, `overrides[${index}]`);
    assertExactKeys(override, new Set(["kind", "skillId", "reasonCodes", "unknownFields"]), `overrides[${index}]`);
    const skillAllowed = override.kind === "discoveryCandidate"
      ? desiredSkillIds.has(override.skillId)
      : operationIds.has(override.skillId);
    if (!OVERRIDE_KINDS.has(override.kind) || typeof override.skillId !== "string" || !skillAllowed) {
      throw planError("AAS_PLAN_OVERRIDE_INVALID", "invalidInput", { index });
    }
    if (!Array.isArray(override.reasonCodes) || override.reasonCodes.length < 1 || override.reasonCodes.some((value) => typeof value !== "string")) {
      throw planError("AAS_PLAN_OVERRIDE_REASON_REQUIRED", "invalidInput", { index });
    }
    if (!Array.isArray(override.unknownFields) || override.unknownFields.some((value) => typeof value !== "string")) {
      throw planError("AAS_PLAN_OVERRIDE_UNKNOWN_FIELDS_INVALID", "invalidInput", { index });
    }
    const key = `${override.kind}:${override.skillId}`;
    if (seen.has(key)) throw planError("AAS_PLAN_OVERRIDE_DUPLICATE", "invalidInput", { index });
    seen.add(key);
    return {
      kind: override.kind,
      skillId: override.skillId,
      reasonCodes: [...new Set(override.reasonCodes)].sort(),
      unknownFields: [...new Set(override.unknownFields)].sort(),
    };
  });
  return normalized.sort((left, right) => compareStrings(`${left.kind}:${left.skillId}`, `${right.kind}:${right.skillId}`));
}

function normalizeStateCommit(stateCommit, installedStateDigest) {
  assertPlainObject(stateCommit, "stateCommit");
  assertExactKeys(stateCommit, new Set(["previousDigest", "nextDigest", "position"]), "stateCommit");
  if (stateCommit.previousDigest !== installedStateDigest) {
    throw planError("AAS_PLAN_STATE_COMMIT_MISMATCH", "drift", {});
  }
  assertDigest(stateCommit.nextDigest, "stateCommit.nextDigest");
  if (stateCommit.position !== "final") throw planError("AAS_PLAN_STATE_COMMIT_NOT_FINAL", "invalidInput", {});
  return { ...stateCommit };
}

function expectedNextStateDigest(installedState, operations, catalogIntegrity) {
  const entries = new Map(installedState.entries.map((entry) => [entry.skillId, entry]));
  for (const operation of operations) {
    if (operation.kind === "removeManaged") entries.delete(operation.skillId);
    else entries.set(operation.skillId, {
      skillId: operation.skillId,
      treeDigest: operation.resultTreeDigest,
      catalogIntegrity,
    });
  }
  const normalized = [...entries.values()].sort((left, right) => compareStrings(left.skillId, right.skillId));
  return sha256(canonicalJson({ schemaVersion: 1, entries: normalized }));
}

function buildPlanEnvelope(input) {
  assertPlainObject(input, "input");
  assertExactKeys(
    input,
    new Set(["manifest", "handshake", "catalog", "runtime", "target", "installedState", "operations", "overrides", "stateCommit"]),
    "input",
  );
  const validation = validateManifest(input.manifest);
  if (!validation.ok) throw planError("AAS_PLAN_MANIFEST_INVALID", "invalidInput", validation.details);

  const boundVersions = assertVersionHandshake(input.handshake);
  const catalog = normalizeCatalog(input.catalog, input.manifest.catalog);
  const runtime = normalizeRuntime(input.runtime);
  const target = normalizeTarget(input.target, input.manifest);
  const installedState = normalizeInstalledState(input.installedState);
  const operations = normalizeOperations(input.operations, input.manifest);
  const operationIds = new Set(operations.map((operation) => operation.skillId));
  const desiredSkillIds = new Set(input.manifest.skills.map((skill) => skill.id));
  const overrides = normalizeOverrides(input.overrides ?? [], operationIds, desiredSkillIds);
  const stateCommit = normalizeStateCommit(input.stateCommit, installedState.digest);
  if (runtime.package !== catalog.package || runtime.version !== catalog.version) {
    throw planError("AAS_PLAN_RUNTIME_CATALOG_MISMATCH", "integrity", {});
  }
  if (stateCommit.nextDigest !== expectedNextStateDigest(installedState, operations, catalog.integrity)) {
    throw planError("AAS_PLAN_NEXT_STATE_MISMATCH", "integrity", {});
  }

  const payload = canonicalize({
    schemaVersion: 1,
    kind: "aas.stack-plan.payload",
    versions: boundVersions,
    manifestDigest: validation.manifestDigest,
    catalog,
    runtime,
    target,
    installedState,
    desiredSkills: input.manifest.skills.map((skill) => skill.id).sort(),
    policy: input.manifest.policy,
    operations,
    overrides,
    stateCommit,
  });
  const payloadJson = canonicalJson(payload);
  return validateInstance("plan.schema.json", {
    schemaVersion: 1,
    kind: "aas.stack-plan",
    digest: sha256(payloadJson),
    payload,
  }, "AAS_PLAN_SCHEMA_INVALID", "invalidInput");
}

function validatePlanEnvelope(plan) {
  validateInstance("plan.schema.json", plan, "AAS_TRANSACTION_PLAN_SCHEMA_INVALID");
  assertPlainObject(plan, "plan");
  assertExactKeys(plan, new Set(["schemaVersion", "kind", "digest", "payload"]), "plan");
  if (plan.schemaVersion !== 1 || plan.kind !== "aas.stack-plan") {
    throw planError("AAS_TRANSACTION_PLAN_INVALID", "integrity", {});
  }
  assertDigest(plan.digest, "plan.digest");
  assertPlainObject(plan.payload, "plan.payload");
  assertExactKeys(plan.payload, new Set([
    "schemaVersion", "kind", "versions", "manifestDigest", "catalog", "runtime", "target",
    "installedState", "desiredSkills", "policy", "operations", "overrides", "stateCommit",
  ]), "plan.payload");
  if (plan.payload.schemaVersion !== 1 || plan.payload.kind !== "aas.stack-plan.payload"
    || plan.digest !== sha256(canonicalJson(plan.payload))) {
    throw planError("AAS_TRANSACTION_PLAN_INVALID", "integrity", {});
  }
  assertDigest(plan.payload.manifestDigest, "manifestDigest");
  if (!Array.isArray(plan.payload.desiredSkills) || plan.payload.desiredSkills.length > 128
    || plan.payload.desiredSkills.some((id) => typeof id !== "string" || !ID_PATTERN.test(id))) {
    throw planError("AAS_PLAN_DESIRED_SKILLS_INVALID", "invalidInput", {});
  }
  const syntheticManifest = {
    schemaVersion: 1,
    name: "validated-plan",
    catalog: plan.payload.catalog,
    targets: [{ host: plan.payload.target?.host, scope: plan.payload.target?.scope }],
    intent: { goals: ["validate"] },
    policy: plan.payload.policy,
    skills: plan.payload.desiredSkills.map((id) => ({ id })),
  };
  const rebuilt = buildPlanEnvelope({
    manifest: syntheticManifest,
    handshake: plan.payload.versions,
    catalog: plan.payload.catalog,
    runtime: plan.payload.runtime,
    target: plan.payload.target,
    installedState: plan.payload.installedState,
    operations: plan.payload.operations,
    overrides: plan.payload.overrides,
    stateCommit: plan.payload.stateCommit,
  });
  const expectedPayload = { ...rebuilt.payload, manifestDigest: plan.payload.manifestDigest };
  if (canonicalJson(expectedPayload) !== canonicalJson(plan.payload)) {
    throw planError("AAS_TRANSACTION_PLAN_INVALID", "integrity", {});
  }
  return plan;
}

module.exports = {
  OPERATION_KINDS,
  OVERRIDE_KINDS,
  VERSION_KEYS,
  assertVersionHandshake,
  buildPlanEnvelope,
  validatePlanEnvelope,
};
