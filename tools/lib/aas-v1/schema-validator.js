"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");

const SCHEMA_ROOT = path.resolve(__dirname, "../../../schemas/aas-v1");
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const validators = new Map();
const ISSUE_KEYWORDS = new Set([
  "additionalProperties",
  "const",
  "enum",
  "maxItems",
  "maxLength",
  "minItems",
  "minLength",
  "minimum",
  "oneOf",
  "pattern",
  "propertyNames",
  "required",
  "type",
  "uniqueItems",
]);
const SAFE_FIELD_SEGMENTS = new Set([
  "attempt",
  "calls",
  "canonicalInputBytes",
  "canonicalOutputBytes",
  "capabilities",
  "capabilityIds",
  "catalog",
  "client",
  "commit",
  "constraints",
  "cursor",
  "digest",
  "digestScope",
  "dimensionId",
  "dimensions",
  "durationMicros",
  "evidence",
  "files",
  "fingerprint",
  "frameworks",
  "goals",
  "host",
  "id",
  "includeContent",
  "input",
  "integrity",
  "kind",
  "languages",
  "limit",
  "manifest",
  "manifestDigest",
  "metadata",
  "model",
  "name",
  "output",
  "package",
  "path",
  "processTrace",
  "profile",
  "projectType",
  "query",
  "retryOf",
  "runtimeObservations",
  "schemaVersion",
  "scope",
  "selectedSkillIds",
  "sequence",
  "sha256",
  "skillIds",
  "skills",
  "size",
  "stack",
  "status",
  "targets",
  "toCatalogDigest",
  "tool",
  "version",
]);

function logicalField(pathValue) {
  if (typeof pathValue !== "string" || pathValue === "" || pathValue === "$") return "input";
  const pointer = pathValue.startsWith("/")
    ? pathValue.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    : pathValue.replace(/^\$\.?/, "").replace(/\[(\d*)\]/g, ".$index").split(".");
  let result = "";
  for (const part of pointer.filter(Boolean).slice(0, 16)) {
    if (/^\d+$/.test(part) || part === "$index") {
      result += "[]";
    } else if (SAFE_FIELD_SEGMENTS.has(part)) {
      result += result ? `.${part}` : part;
    } else {
      result += result ? ".[unknown]" : "[unknown]";
    }
  }
  return result || "input";
}

function issueLimit(issue) {
  if (Number.isSafeInteger(issue?.limit) && issue.limit >= 0) return issue.limit;
  if (typeof issue?.limit === "boolean") return issue.limit;
  if (typeof issue?.limit === "string" && /^[a-z]{1,16}$/.test(issue.limit)) return issue.limit;
  const keyword = issue?.keyword;
  const params = issue?.params;
  if (["maxItems", "maxLength", "minItems", "minLength"].includes(keyword)
    && Number.isSafeInteger(params?.limit) && params.limit >= 0) return params.limit;
  if (keyword === "additionalProperties") return false;
  if (keyword === "type" && typeof params?.type === "string" && /^[a-z]{1,16}$/.test(params.type)) return params.type;
  return undefined;
}

function sanitizeValidationDetails(details) {
  if (!details || !Array.isArray(details.issues)) return {};
  const issues = [];
  for (const source of details.issues.slice(0, 32)) {
    if (!source || typeof source !== "object" || !ISSUE_KEYWORDS.has(source.keyword)) continue;
    const entry = {
      field: logicalField(source.field ?? source.instancePath ?? source.path),
      keyword: source.keyword,
    };
    if (typeof source.code === "string" && /^AAS_[A-Z0-9_]{1,96}$/.test(source.code)) entry.code = source.code;
    const limit = issueLimit(source);
    if (limit !== undefined) entry.limit = limit;
    issues.push(entry);
  }
  return issues.length ? { issues } : {};
}

function validatorFor(name) {
  if (validators.has(name)) return validators.get(name);
  if (!/^[a-z0-9-]+\.schema\.json$/.test(name)) throw new Error("AAS_SCHEMA_NAME_INVALID");
  const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_ROOT, name), "utf8"));
  const validate = ajv.compile(schema);
  validators.set(name, validate);
  return validate;
}

function validateInstance(name, value, code = "AAS_SCHEMA_INSTANCE_INVALID", category = "integrity") {
  const validate = validatorFor(name);
  if (validate(value)) return value;
  const error = new Error(code);
  error.code = code;
  error.category = category;
  error.details = sanitizeValidationDetails({ issues: validate.errors || [] });
  throw error;
}

module.exports = { SCHEMA_ROOT, sanitizeValidationDetails, validateInstance, validatorFor };
