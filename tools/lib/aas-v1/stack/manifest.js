"use strict";

const versions = require("../versions");
const { canonicalJson, sha256 } = require("../canonical-json");

const DIGEST_PATTERN = /^sha256-[a-f0-9]{64}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;
const PACKAGE_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const SUPPORTED_HOSTS = new Set(["codex", "claude"]);
const SUPPORTED_SCOPES = new Set(["project", "user"]);
const SUPPORTED_RISKS = new Set(["none", "safe", "unknown", "critical", "offensive"]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function issue(path, code, details = {}) {
  return { path, code, ...details };
}

function rejectUnknownKeys(value, allowed, path, issues) {
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) issues.push(issue(`${path}.${key}`, "AAS_STACK_FIELD_UNKNOWN"));
  }
}

function validateString(value, path, issues, options = {}) {
  const { minimum = 1, maximum = 256, pattern } = options;
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) {
    issues.push(issue(path, "AAS_STACK_STRING_INVALID"));
    return false;
  }
  if (pattern && !pattern.test(value)) {
    issues.push(issue(path, "AAS_STACK_STRING_FORMAT_INVALID"));
    return false;
  }
  return true;
}

function validateUniqueStringArray(value, path, issues, options = {}) {
  const { minimum = 0, maximum = 64, pattern, allowed } = options;
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    issues.push(issue(path, "AAS_STACK_ARRAY_INVALID"));
    return;
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    if (!validateString(entry, `${path}[${index}]`, issues, { maximum: 128, pattern })) return;
    if (allowed && !allowed.has(entry)) issues.push(issue(`${path}[${index}]`, "AAS_STACK_VALUE_UNSUPPORTED"));
    if (seen.has(entry)) issues.push(issue(`${path}[${index}]`, "AAS_STACK_VALUE_DUPLICATE"));
    seen.add(entry);
  });
}

function invalidResult(issues) {
  return {
    schemaVersion: 1,
    ok: false,
    status: "invalid",
    ...versions,
    code: "AAS_STACK_MANIFEST_INVALID",
    category: "invalidInput",
    details: { issues },
  };
}

function validateManifest(manifest) {
  const issues = [];
  if (!isPlainObject(manifest)) return invalidResult([issue("$", "AAS_STACK_OBJECT_REQUIRED")]);

  rejectUnknownKeys(
    manifest,
    new Set(["schemaVersion", "name", "catalog", "targets", "intent", "policy", "skills"]),
    "$",
    issues,
  );

  if (manifest.schemaVersion !== 1) issues.push(issue("$.schemaVersion", "AAS_STACK_SCHEMA_VERSION_UNSUPPORTED"));
  validateString(manifest.name, "$.name", issues, { maximum: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._ -]*$/ });

  if (!isPlainObject(manifest.catalog)) {
    issues.push(issue("$.catalog", "AAS_STACK_OBJECT_REQUIRED"));
  } else {
    rejectUnknownKeys(manifest.catalog, new Set(["package", "version", "integrity"]), "$.catalog", issues);
    validateString(manifest.catalog.package, "$.catalog.package", issues, { maximum: 214, pattern: PACKAGE_PATTERN });
    validateString(manifest.catalog.version, "$.catalog.version", issues, { maximum: 64, pattern: /^[0-9A-Za-z][0-9A-Za-z.+-]*$/ });
    validateString(manifest.catalog.integrity, "$.catalog.integrity", issues, { maximum: 71, pattern: DIGEST_PATTERN });
  }

  if (!Array.isArray(manifest.targets) || manifest.targets.length < 1 || manifest.targets.length > 8) {
    issues.push(issue("$.targets", "AAS_STACK_TARGETS_INVALID"));
  } else {
    const seenTargets = new Set();
    manifest.targets.forEach((target, index) => {
      const path = `$.targets[${index}]`;
      if (!isPlainObject(target)) {
        issues.push(issue(path, "AAS_STACK_OBJECT_REQUIRED"));
        return;
      }
      rejectUnknownKeys(target, new Set(["host", "scope"]), path, issues);
      if (!SUPPORTED_HOSTS.has(target.host)) issues.push(issue(`${path}.host`, "AAS_STACK_TARGET_HOST_UNSUPPORTED"));
      if (!SUPPORTED_SCOPES.has(target.scope)) issues.push(issue(`${path}.scope`, "AAS_STACK_TARGET_SCOPE_UNSUPPORTED"));
      const key = `${target.host}:${target.scope}`;
      if (seenTargets.has(key)) issues.push(issue(path, "AAS_STACK_TARGET_DUPLICATE"));
      seenTargets.add(key);
    });
  }

  if (!isPlainObject(manifest.intent)) {
    issues.push(issue("$.intent", "AAS_STACK_OBJECT_REQUIRED"));
  } else {
    rejectUnknownKeys(manifest.intent, new Set(["goals"]), "$.intent", issues);
    validateUniqueStringArray(manifest.intent.goals, "$.intent.goals", issues, {
      minimum: 1,
      maximum: 32,
      pattern: ID_PATTERN,
    });
  }

  if (!isPlainObject(manifest.policy)) {
    issues.push(issue("$.policy", "AAS_STACK_OBJECT_REQUIRED"));
  } else {
    rejectUnknownKeys(
      manifest.policy,
      new Set(["allowedRisk", "requireKnownSource", "allowManualSetup"]),
      "$.policy",
      issues,
    );
    validateUniqueStringArray(manifest.policy.allowedRisk, "$.policy.allowedRisk", issues, {
      minimum: 1,
      maximum: 5,
      allowed: SUPPORTED_RISKS,
    });
    for (const key of ["requireKnownSource", "allowManualSetup"]) {
      if (typeof manifest.policy[key] !== "boolean") issues.push(issue(`$.policy.${key}`, "AAS_STACK_BOOLEAN_REQUIRED"));
    }
  }

  if (!Array.isArray(manifest.skills) || manifest.skills.length > 128) {
    issues.push(issue("$.skills", "AAS_STACK_SKILLS_INVALID"));
  } else {
    const seenSkills = new Set();
    manifest.skills.forEach((skill, index) => {
      const path = `$.skills[${index}]`;
      if (!isPlainObject(skill)) {
        issues.push(issue(path, "AAS_STACK_OBJECT_REQUIRED"));
        return;
      }
      rejectUnknownKeys(skill, new Set(["id"]), path, issues);
      if (validateString(skill.id, `${path}.id`, issues, { maximum: 256, pattern: ID_PATTERN })) {
        if (seenSkills.has(skill.id)) issues.push(issue(`${path}.id`, "AAS_STACK_SKILL_DUPLICATE"));
        seenSkills.add(skill.id);
      }
    });
  }

  if (issues.length) return invalidResult(issues);
  const serialized = canonicalJson(manifest);
  return {
    schemaVersion: 1,
    ok: true,
    status: "valid",
    ...versions,
    reasonCodes: [],
    unknown: [],
    details: {},
    manifest,
    canonicalJson: serialized,
    manifestDigest: sha256(serialized),
  };
}

module.exports = {
  DIGEST_PATTERN,
  ID_PATTERN,
  SUPPORTED_HOSTS,
  SUPPORTED_SCOPES,
  validateManifest,
};
