"use strict";

const ontology = require("./ontology.v1.json");
const { validateInstance } = require("./schema-validator");

const ALLOWED_PROFILE_FIELDS = new Set([
  "projectType",
  "languages",
  "frameworks",
  "context",
  "constraints",
  "request",
]);

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function normalizeToken(value) {
  const token = String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ontology.aliases[token] || token;
}

function tokenize(value) {
  const values = Array.isArray(value) ? value : [value];
  const tokens = [];
  for (const item of values) {
    const source = String(item ?? "");
    const whole = normalizeToken(source);
    if (whole) tokens.push(whole);
    for (const piece of source.split(/[\s/.,:;()_-]+/)) {
      const token = normalizeToken(piece);
      if (token && token !== whole) tokens.push(token);
    }
  }
  return tokens;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort(compareStrings);
}

function normalizeStringArray(value, field, maximum = 32) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => typeof item !== "string")) {
    const error = new Error(`${field} must be an array of at most ${maximum} strings`);
    error.code = "AAS_INPUT_ARRAY_INVALID";
    throw error;
  }
  return sortedUnique(value.map((item) => normalizeToken(item)));
}

function normalizeProfile(profile = {}) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    const error = new Error("profile must be an object");
    error.code = "AAS_INPUT_PROFILE_INVALID";
    throw error;
  }
  const forbidden = Object.keys(profile).filter((field) => !ALLOWED_PROFILE_FIELDS.has(field));
  if (forbidden.length) {
    const error = new Error("profile contains forbidden fields");
    error.code = "AAS_INPUT_PROFILE_FIELD_FORBIDDEN";
    error.details = { fields: forbidden.sort() };
    throw error;
  }
  const result = {};
  for (const field of ["projectType", "context", "request"]) {
    if (profile[field] !== undefined) {
      if (typeof profile[field] !== "string" || profile[field].length > 2048) {
        const error = new Error(`${field} must be a bounded string`);
        error.code = "AAS_INPUT_STRING_INVALID";
        throw error;
      }
      result[field] = profile[field].normalize("NFKC").trim();
    }
  }
  result.languages = normalizeStringArray(profile.languages, "profile.languages");
  result.frameworks = normalizeStringArray(profile.frameworks, "profile.frameworks");
  result.constraints = normalizeStringArray(profile.constraints, "profile.constraints");
  return result;
}

function normalizeTargets(targets) {
  if (!Array.isArray(targets) || targets.length === 0 || targets.length > 8) {
    const error = new Error("targets must contain between one and eight entries");
    error.code = "AAS_INPUT_TARGETS_INVALID";
    throw error;
  }
  return targets.map((target) => {
    if (!target || !["codex", "claude"].includes(target.host) || !["project", "user"].includes(target.scope)) {
      const error = new Error("target host or scope is unsupported in v1");
      error.code = "AAS_INPUT_TARGET_UNSUPPORTED";
      throw error;
    }
    return { host: target.host, scope: target.scope };
  }).sort((left, right) => compareStrings(`${left.host}:${left.scope}`, `${right.host}:${right.scope}`));
}

function normalizePolicy(policy = {}) {
  const allowedRisk = normalizeStringArray(policy.allowedRisk ?? ["none", "safe"], "policy.allowedRisk", 5);
  if (allowedRisk.some((risk) => !["none", "safe", "unknown", "critical", "offensive"].includes(risk))) {
    const error = new Error("policy.allowedRisk contains an unsupported value");
    error.code = "AAS_INPUT_POLICY_INVALID";
    throw error;
  }
  return {
    allowedRisk,
    requireKnownSource: policy.requireKnownSource === true,
    allowManualSetup: policy.allowManualSetup === true,
  };
}

function normalizeRecommendationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    const error = new Error("recommendation input must be an object");
    error.code = "AAS_INPUT_INVALID";
    throw error;
  }
  if (input.profile && typeof input.profile === "object" && !Array.isArray(input.profile)) {
    const forbiddenProfileFields = Object.keys(input.profile).filter((field) => !ALLOWED_PROFILE_FIELDS.has(field));
    if (forbiddenProfileFields.length) {
      const error = new Error("profile contains forbidden fields");
      error.code = "AAS_INPUT_PROFILE_FIELD_FORBIDDEN";
      error.details = { fields: forbiddenProfileFields.sort() };
      throw error;
    }
  }
  validateInstance(
    "recommendation-input.schema.json",
    input,
    "AAS_INPUT_SCHEMA_INVALID",
    "invalidInput",
  );
  const intent = normalizeToken(input.intent);
  if (!Object.hasOwn(ontology.intentAliases, intent)) {
    const error = new Error("intent is unsupported in v1");
    error.code = "AAS_INPUT_INTENT_UNSUPPORTED";
    throw error;
  }
  const criticalGoals = normalizeStringArray(input.criticalGoals, "criticalGoals");
  const nonCriticalGoals = normalizeStringArray(input.nonCriticalGoals, "nonCriticalGoals");
  if (criticalGoals.length === 0) {
    const error = new Error("at least one critical goal is required");
    error.code = "AAS_INPUT_CRITICAL_GOALS_REQUIRED";
    throw error;
  }
  const profile = normalizeProfile(input.profile);
  const normalized = {
    intent,
    targets: normalizeTargets(input.targets),
    profile,
    criticalGoals,
    nonCriticalGoals,
    minimumNonCriticalGoalCoverage: Math.max(800, Math.min(1000, Math.round(Number(input.minimumNonCriticalGoalCoverage ?? 0.8) * 1000))),
    policy: normalizePolicy(input.policy),
    maxSkills: Math.max(1, Math.min(12, Number.isInteger(input.maxSkills) ? input.maxSkills : 6)),
  };
  normalized.queryTokens = sortedUnique([
    ...ontology.intentAliases[intent],
    ...tokenize(intent),
    ...tokenize(criticalGoals),
    ...tokenize(nonCriticalGoals),
    ...tokenize(profile.projectType),
    ...tokenize(profile.languages),
    ...tokenize(profile.frameworks),
    ...tokenize(profile.context),
    ...tokenize(profile.constraints),
    ...tokenize(profile.request),
  ]);
  return normalized;
}

module.exports = {
  normalizeToken,
  compareStrings,
  tokenize,
  sortedUnique,
  normalizeProfile,
  normalizePolicy,
  normalizeRecommendationInput,
};
