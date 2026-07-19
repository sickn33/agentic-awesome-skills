"use strict";

const path = require("node:path");
const { canonicalJson, sha256 } = require("./canonical-json");
const { validateInstance } = require("./schema-validator");
const { validateManifest } = require("./stack");

const DIMENSION_IDS = Object.freeze([
  "architecture-runtime",
  "languages-frameworks",
  "domain-behavior",
  "data-storage",
  "external-integrations",
  "testing-quality",
  "security-privacy",
  "user-experience-accessibility",
  "deployment-operations",
  "maintenance-workflow",
]);
const DIMENSION_SET = new Set(DIMENSION_IDS);
const MAX_CAPABILITIES = 256;
const MAX_EVIDENCE_REFS = 4096;
const MAX_SELECTED_SKILLS = 128;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, allowed) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowed.has(key));
}

function issue(field, code, keyword, limit) {
  return { field, code, keyword, ...(limit === undefined ? {} : { limit }) };
}

function evidenceError(issues, category = "integrity") {
  const error = new Error("selection evidence is invalid");
  error.code = "AAS_SELECTION_EVIDENCE_INVALID";
  error.category = category;
  error.details = { issues: issues.slice(0, 32) };
  throw error;
}

function cloneCanonical(value) {
  return JSON.parse(canonicalJson(value));
}

function assertSafeRelativePath(value, field = "project.files[].path") {
  if (typeof value !== "string" || value.length < 1 || value.length > 512) {
    evidenceError([issue(field, "AAS_EVIDENCE_PATH_INVALID", "maxLength", 512)]);
  }
  if (value !== value.normalize("NFC")
    || value.startsWith("/")
    || /^[A-Za-z]:/.test(value)
    || value.includes("\\")
    || value.includes("%")
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    evidenceError([issue(field, "AAS_EVIDENCE_PATH_INVALID", "pattern")]);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")
    || path.posix.normalize(value) !== value) {
    evidenceError([issue(field, "AAS_EVIDENCE_PATH_INVALID", "pattern")]);
  }
  return value;
}

function normalizeProject(project) {
  if (!exactKeys(project, new Set(["schemaVersion", "fingerprint", "commit", "files"]))
    || project.schemaVersion !== 1 || !Array.isArray(project.files)) {
    evidenceError([issue("project", "AAS_EVIDENCE_PROJECT_INVALID", "type", "object")], "invalidInput");
  }
  const files = project.files.map((entry) => {
    if (!exactKeys(entry, new Set(["path", "size", "sha256"]))) {
      evidenceError([issue("project.files[]", "AAS_EVIDENCE_PROJECT_FILE_INVALID", "additionalProperties", false)], "invalidInput");
    }
    assertSafeRelativePath(entry.path);
    if (!Number.isSafeInteger(entry.size) || entry.size < 0
      || typeof entry.sha256 !== "string" || !/^sha256-[a-f0-9]{64}$/.test(entry.sha256)) {
      evidenceError([issue("project.files[]", "AAS_EVIDENCE_PROJECT_FILE_INVALID", "type")], "invalidInput");
    }
    return { path: entry.path, size: entry.size, sha256: entry.sha256 };
  }).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  for (let index = 1; index < files.length; index += 1) {
    if (files[index - 1].path === files[index].path) {
      evidenceError([issue("project.files[].path", "AAS_EVIDENCE_PROJECT_PATH_DUPLICATE", "uniqueItems")], "invalidInput");
    }
  }
  const descriptor = {
    schemaVersion: 1,
    ...(project.commit === undefined ? {} : { commit: project.commit }),
    files,
  };
  if (descriptor.commit !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(descriptor.commit)) {
    evidenceError([issue("project.commit", "AAS_EVIDENCE_PROJECT_COMMIT_INVALID", "pattern")], "invalidInput");
  }
  const fingerprint = sha256(canonicalJson(descriptor));
  if (project.fingerprint !== undefined && project.fingerprint !== fingerprint) {
    evidenceError([issue("project.fingerprint", "AAS_EVIDENCE_PROJECT_FINGERPRINT_MISMATCH", "const")], "invalidInput");
  }
  return { ...descriptor, fingerprint };
}

function projectDescriptor(project) {
  return {
    schemaVersion: project.schemaVersion,
    ...(project.commit === undefined ? {} : { commit: project.commit }),
    files: project.files,
  };
}

function catalogIdentity(catalog) {
  if (!catalog || typeof catalog.package !== "string" || typeof catalog.version !== "string") {
    evidenceError([issue("catalog", "AAS_EVIDENCE_CATALOG_INVALID", "type", "object")], "invalidInput");
  }
  const integrity = catalog.digest || catalog.integrity;
  if (typeof integrity !== "string" || !/^sha256-[a-f0-9]{64}$/.test(integrity)) {
    evidenceError([issue("catalog.integrity", "AAS_EVIDENCE_CATALOG_INVALID", "pattern")], "invalidInput");
  }
  return { package: catalog.package, version: catalog.version, integrity };
}

function normalizeDimensions(dimensions) {
  if (!Array.isArray(dimensions) || dimensions.length !== DIMENSION_IDS.length) {
    evidenceError([issue("dimensions", "AAS_EVIDENCE_DIMENSIONS_INCOMPLETE", "minItems", 10)], "invalidInput");
  }
  const byId = new Map();
  for (const dimension of dimensions) {
    if (!isPlainObject(dimension) || typeof dimension.id !== "string" || byId.has(dimension.id)) {
      evidenceError([issue("dimensions[].id", "AAS_EVIDENCE_DIMENSION_DUPLICATE", "uniqueItems")], "invalidInput");
    }
    byId.set(dimension.id, cloneCanonical(dimension));
  }
  if (DIMENSION_IDS.some((id) => !byId.has(id)) || [...byId.keys()].some((id) => !DIMENSION_SET.has(id))) {
    evidenceError([issue("dimensions[].id", "AAS_EVIDENCE_DIMENSIONS_INCOMPLETE", "enum")], "invalidInput");
  }
  return DIMENSION_IDS.map((id) => byId.get(id));
}

function traceShapeIssues(processTrace) {
  const issues = [];
  let previous = -1;
  const sequences = new Set();
  for (const call of processTrace.calls) {
    if (call.sequence <= previous || sequences.has(call.sequence)) {
      issues.push(issue("processTrace.calls[].sequence", "AAS_EVIDENCE_TRACE_SEQUENCE_INVALID", "uniqueItems"));
      break;
    }
    previous = call.sequence;
    sequences.add(call.sequence);
    if (call.retryOf !== undefined && (!sequences.has(call.retryOf) || call.retryOf === call.sequence || call.attempt < 2)) {
      issues.push(issue("processTrace.calls[].retryOf", "AAS_EVIDENCE_TRACE_RETRY_INVALID", "minimum", 0));
      break;
    }
    const inputKeys = Object.keys(call.input);
    const valid = call.input.inputValid !== false;
    if (!valid && (inputKeys.length !== 1 || inputKeys[0] !== "inputValid")) {
      issues.push(issue("processTrace.calls[].input", "AAS_EVIDENCE_TRACE_INPUT_INVALID", "additionalProperties", false));
      break;
    }
    if (valid) {
      const expected = call.tool === "search_skills" ? ["query", "cursor", "limit"]
        : call.tool === "get_skill" ? ["id", "includeContent"]
          : call.tool === "compose_stack" ? ["skillIds"] : ["manifestDigest"];
      if (expected.some((key) => !Object.hasOwn(call.input, key))) {
        issues.push(issue("processTrace.calls[].input", "AAS_EVIDENCE_TRACE_INPUT_INVALID", "required"));
        break;
      }
    }
    if (call.output.ok === false && (!call.output.code || !call.output.category)) {
      issues.push(issue("processTrace.calls[].output", "AAS_EVIDENCE_TRACE_ERROR_INVALID", "required"));
      break;
    }
    if (call.output.ok === true) {
      const expectedOutput = call.tool === "search_skills" ? ["returnedSkillIds", "nextCursor", "totalMatches"]
        : call.tool === "get_skill" ? ["openedSkillId"]
          : call.tool === "compose_stack" ? ["manifestDigest", "selectedSkillIds"]
            : ["status", "manifestDigest", "selectedSkillIds"];
      if (expectedOutput.some((key) => !Object.hasOwn(call.output, key))) {
        issues.push(issue("processTrace.calls[].output", "AAS_EVIDENCE_TRACE_OUTPUT_INVALID", "required"));
        break;
      }
    }
  }
  return issues;
}

function crossFieldIssues(evidence, { catalog, manifest } = {}) {
  const { payload } = evidence;
  const issues = [];
  const descriptor = projectDescriptor(payload.project);
  if (payload.project.fingerprint !== sha256(canonicalJson(descriptor))) {
    issues.push(issue("project.fingerprint", "AAS_EVIDENCE_PROJECT_FINGERPRINT_MISMATCH", "const"));
  }
  for (let index = 1; index < payload.project.files.length; index += 1) {
    if (payload.project.files[index - 1].path >= payload.project.files[index].path) {
      issues.push(issue("project.files", "AAS_EVIDENCE_PROJECT_FILES_NONCANONICAL", "uniqueItems"));
      break;
    }
  }
  const projectFiles = new Map();
  for (const file of payload.project.files) {
    try { assertSafeRelativePath(file.path); } catch { issues.push(issue("project.files[].path", "AAS_EVIDENCE_PATH_INVALID", "pattern")); break; }
    if (projectFiles.has(file.path)) issues.push(issue("project.files[].path", "AAS_EVIDENCE_PROJECT_PATH_DUPLICATE", "uniqueItems"));
    projectFiles.set(file.path, file);
  }

  const dimensions = new Map();
  for (const dimension of payload.dimensions) {
    if (dimensions.has(dimension.id)) issues.push(issue("dimensions[].id", "AAS_EVIDENCE_DIMENSION_DUPLICATE", "uniqueItems"));
    dimensions.set(dimension.id, dimension);
  }
  if (DIMENSION_IDS.some((id, index) => payload.dimensions[index]?.id !== id)) {
    issues.push(issue("dimensions", "AAS_EVIDENCE_DIMENSIONS_NONCANONICAL", "const"));
  }

  const capabilities = new Map();
  let referenceCount = 0;
  const mappedSkills = new Set();
  for (const capability of payload.capabilities) {
    if (capabilities.has(capability.id)) issues.push(issue("capabilities[].id", "AAS_EVIDENCE_CAPABILITY_DUPLICATE", "uniqueItems"));
    capabilities.set(capability.id, capability);
    referenceCount += capability.evidence.length;
    const dimension = dimensions.get(capability.dimensionId);
    if (!dimension || !dimension.capabilityIds.includes(capability.id)) {
      issues.push(issue("capabilities[].dimensionId", "AAS_EVIDENCE_CAPABILITY_ORPHAN", "required"));
    }
    if (capability.status === "covered") {
      if (capability.selectedSkillIds.length < 1 || capability.evidence.length < 1) {
        issues.push(issue("capabilities[]", "AAS_EVIDENCE_COVERED_CAPABILITY_INCOMPLETE", "minItems", 1));
      }
      capability.selectedSkillIds.forEach((id) => mappedSkills.add(id));
    } else if (capability.selectedSkillIds.length !== 0) {
      issues.push(issue("capabilities[].selectedSkillIds", "AAS_EVIDENCE_UNCOVERED_CAPABILITY_HAS_SKILLS", "maxItems", 0));
    } else if (capability.status === "catalog-gap" && capability.evidence.length < 1) {
      issues.push(issue("capabilities[].evidence", "AAS_EVIDENCE_CATALOG_GAP_UNSUPPORTED", "minItems", 1));
    }
    for (const ref of capability.evidence) {
      try { assertSafeRelativePath(ref.path, "capabilities[].evidence[].path"); } catch { issues.push(issue("capabilities[].evidence[].path", "AAS_EVIDENCE_PATH_INVALID", "pattern")); continue; }
      const file = projectFiles.get(ref.path);
      if (!file || file.sha256 !== ref.sha256) {
        issues.push(issue("capabilities[].evidence[]", "AAS_EVIDENCE_REFERENCE_MISMATCH", "const"));
      }
    }
  }
  if (referenceCount > MAX_EVIDENCE_REFS) issues.push(issue("capabilities[].evidence", "AAS_EVIDENCE_REFERENCE_LIMIT_EXCEEDED", "maxItems", MAX_EVIDENCE_REFS));

  for (const dimension of payload.dimensions) {
    if (dimension.status === "not-applicable" && dimension.capabilityIds.length !== 0) {
      issues.push(issue("dimensions[].capabilityIds", "AAS_EVIDENCE_DIMENSION_NOT_APPLICABLE_HAS_CAPABILITIES", "maxItems", 0));
    }
    if (dimension.status === "applicable" && dimension.capabilityIds.length < 1) {
      issues.push(issue("dimensions[].capabilityIds", "AAS_EVIDENCE_DIMENSION_ORPHAN", "minItems", 1));
    }
    for (const capabilityId of dimension.capabilityIds) {
      const capability = capabilities.get(capabilityId);
      if (!capability || capability.dimensionId !== dimension.id) {
        issues.push(issue("dimensions[].capabilityIds", "AAS_EVIDENCE_CAPABILITY_ORPHAN", "required"));
      }
    }
  }

  const selectedSet = new Set(payload.selectedSkillIds);
  if (selectedSet.size !== payload.selectedSkillIds.length) issues.push(issue("selectedSkillIds", "AAS_EVIDENCE_SELECTED_SKILL_DUPLICATE", "uniqueItems"));
  if (selectedSet.size !== mappedSkills.size || [...selectedSet].some((id) => !mappedSkills.has(id))) {
    issues.push(issue("selectedSkillIds", "AAS_EVIDENCE_SKILL_MAPPING_MISMATCH", "const"));
  }
  issues.push(...traceShapeIssues(payload.processTrace));
  const successfulComposition = payload.processTrace.calls.find((call) => call.tool === "compose_stack"
    && call.output.ok === true
    && call.output.manifestDigest === payload.manifestDigest
    && canonicalJson(call.input.skillIds) === canonicalJson(payload.selectedSkillIds)
    && canonicalJson(call.output.selectedSkillIds) === canonicalJson(payload.selectedSkillIds));
  if (!successfulComposition) issues.push(issue("processTrace.calls", "AAS_EVIDENCE_COMPOSE_TRACE_MISSING", "required"));
  const successfulInspection = successfulComposition && payload.processTrace.calls.some((call) => call.tool === "inspect_stack"
    && call.sequence > successfulComposition.sequence
    && call.output.ok === true
    && call.output.status === "valid"
    && call.input.manifestDigest === payload.manifestDigest
    && call.output.manifestDigest === payload.manifestDigest
    && canonicalJson(call.output.selectedSkillIds) === canonicalJson(payload.selectedSkillIds));
  if (!successfulInspection) issues.push(issue("processTrace.calls", "AAS_EVIDENCE_INSPECT_TRACE_MISSING", "required"));

  if (evidence.runtimeObservations) {
    const traceSequences = new Set(payload.processTrace.calls.map((call) => call.sequence));
    const runtimeSequences = new Set();
    for (const observation of evidence.runtimeObservations.calls) {
      if (!traceSequences.has(observation.sequence) || runtimeSequences.has(observation.sequence)) {
        issues.push(issue("runtimeObservations.calls[].sequence", "AAS_EVIDENCE_RUNTIME_OBSERVATION_ORPHAN", "const"));
        break;
      }
      runtimeSequences.add(observation.sequence);
    }
  }

  if (manifest) {
    const validation = validateManifest(manifest);
    if (!validation.ok || validation.manifestDigest !== payload.manifestDigest) {
      issues.push(issue("manifestDigest", "AAS_EVIDENCE_MANIFEST_DIGEST_MISMATCH", "const"));
    } else {
      const manifestIds = manifest.skills.map((skill) => skill.id);
      if (canonicalJson(manifestIds) !== canonicalJson(payload.selectedSkillIds)) {
        issues.push(issue("selectedSkillIds", "AAS_EVIDENCE_MANIFEST_SELECTION_MISMATCH", "const"));
      }
      const identity = { package: manifest.catalog.package, version: manifest.catalog.version, integrity: manifest.catalog.integrity };
      if (canonicalJson(identity) !== canonicalJson(payload.catalog)) issues.push(issue("catalog", "AAS_EVIDENCE_MANIFEST_CATALOG_MISMATCH", "const"));
    }
  }
  if (catalog) {
    const identity = catalogIdentity(catalog);
    if (canonicalJson(identity) !== canonicalJson(payload.catalog)) issues.push(issue("catalog", "AAS_EVIDENCE_CATALOG_MISMATCH", "const"));
    if (Array.isArray(catalog.skills)) {
      const known = new Set(catalog.skills.map((skill) => skill.id));
      if (payload.selectedSkillIds.some((id) => !known.has(id))) issues.push(issue("selectedSkillIds", "AAS_EVIDENCE_SKILL_UNKNOWN", "enum"));
    }
  }
  return issues;
}

function validateSelectionEvidence(evidence, { catalog, manifest } = {}) {
  try {
    validateInstance("selection-evidence.schema.json", evidence, "AAS_SELECTION_EVIDENCE_INVALID", "integrity");
  } catch (error) {
    throw error;
  }
  if (evidence.digest !== sha256(canonicalJson(evidence.payload))) {
    evidenceError([issue("digest", "AAS_EVIDENCE_DIGEST_MISMATCH", "const")]);
  }
  const issues = crossFieldIssues(evidence, { catalog, manifest });
  if (issues.length) evidenceError(issues);
  return {
    ok: true,
    status: "valid",
    evidenceDigest: evidence.digest,
    selectedSkillIds: [...evidence.payload.selectedSkillIds],
    details: {},
  };
}

function createSelectionEvidence(input) {
  if (!exactKeys(input, new Set(["catalog", "manifest", "project", "dimensions", "capabilities", "processTrace", "client", "runtimeObservations"]))) {
    evidenceError([issue("input", "AAS_EVIDENCE_INPUT_INVALID", "additionalProperties", false)], "invalidInput");
  }
  if (!Array.isArray(input.capabilities) || input.capabilities.length > MAX_CAPABILITIES
    || !isPlainObject(input.processTrace)) {
    evidenceError([issue("input", "AAS_EVIDENCE_INPUT_INVALID", "type", "object")], "invalidInput");
  }
  const manifestValidation = validateManifest(input.manifest);
  if (!manifestValidation.ok) evidenceError([issue("manifest", "AAS_EVIDENCE_MANIFEST_INVALID", "type", "object")], "invalidInput");
  const identity = catalogIdentity(input.catalog);
  const manifestIdentity = {
    package: input.manifest.catalog.package,
    version: input.manifest.catalog.version,
    integrity: input.manifest.catalog.integrity,
  };
  if (canonicalJson(identity) !== canonicalJson(manifestIdentity)) {
    evidenceError([issue("catalog", "AAS_EVIDENCE_MANIFEST_CATALOG_MISMATCH", "const")], "invalidInput");
  }
  const project = normalizeProject(input.project);
  const payload = {
    schemaVersion: 1,
    kind: "aas.selection-evidence.payload",
    project,
    catalog: identity,
    manifestDigest: manifestValidation.manifestDigest,
    dimensions: normalizeDimensions(input.dimensions),
    capabilities: cloneCanonical(input.capabilities),
    selectedSkillIds: input.manifest.skills.map((skill) => skill.id),
    processTrace: cloneCanonical(input.processTrace),
    ...(input.client === undefined ? {} : { client: cloneCanonical(input.client) }),
  };
  const evidence = {
    schemaVersion: 1,
    kind: "aas.selection-evidence",
    digest: sha256(canonicalJson(payload)),
    payload,
    ...(input.runtimeObservations === undefined ? {} : { runtimeObservations: cloneCanonical(input.runtimeObservations) }),
  };
  validateSelectionEvidence(evidence, { catalog: input.catalog, manifest: input.manifest });
  return evidence;
}

module.exports = {
  DIMENSION_IDS,
  MAX_CAPABILITIES,
  MAX_EVIDENCE_REFS,
  MAX_SELECTED_SKILLS,
  assertSafeRelativePath,
  createSelectionEvidence,
  validateSelectionEvidence,
};
