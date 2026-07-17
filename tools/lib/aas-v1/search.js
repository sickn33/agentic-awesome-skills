"use strict";

const { canonicalJson } = require("./canonical-json");
const { compareStrings, sortedUnique, tokenize } = require("./normalize");

const FORBIDDEN_QUERY_SYNTAX = /[\u0000-\u001f\u007f\\^$*?()[\]{}|]/u;

function validateLimit(value, fallback = 20, maximum = 50) {
  const limit = value === undefined ? fallback : value;
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    const error = new Error(`limit must be an integer between 1 and ${maximum}`);
    error.code = "AAS_INPUT_LIMIT_INVALID";
    throw error;
  }
  return limit;
}

function searchSkills(catalog, input = {}) {
  if (typeof input.query !== "string" || [...input.query].length > 256
    || Buffer.byteLength(input.query, "utf8") > 1024 || FORBIDDEN_QUERY_SYNTAX.test(input.query)) {
    const error = new Error("query must be a string of at most 256 characters");
    error.code = "AAS_INPUT_QUERY_INVALID";
    throw error;
  }
  const limit = validateLimit(input.limit);
  const queryTokens = sortedUnique(tokenize(input.query));
  const target = input.target;
  if (target !== undefined && !["codex", "claude"].includes(target)) {
    const error = new Error("target is unsupported in v1");
    error.code = "AAS_INPUT_TARGET_UNSUPPORTED";
    throw error;
  }
  const results = catalog.skills.map((skill) => {
    const document = new Set(skill.searchTokens || []);
    const matchedTokens = queryTokens.filter((token) => document.has(token));
    const exactId = skill.id === input.query.trim().toLowerCase() ? 1 : 0;
    const prefixId = skill.id.startsWith(input.query.trim().toLowerCase()) ? 1 : 0;
    const score = exactId * 100000 + prefixId * 25000 + matchedTokens.length * 1000;
    return { skill, score, matchedTokens };
  }).filter((entry) => entry.score > 0)
    .filter((entry) => !target || entry.skill.metadata.targets?.[target]?.value !== "blocked")
    .sort((left, right) => right.score - left.score || compareStrings(left.skill.id, right.skill.id))
    .slice(0, limit)
    .map(({ skill, score, matchedTokens }) => {
      const result = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        score,
        matchedTokens,
        risk: skill.metadata.risk,
        source: skill.metadata.source,
      };
      if (target) result.targetCompatibility = skill.metadata.targets?.[target];
      return result;
    });
  return { queryTokens, resultCount: results.length, results };
}

function getSkill(catalog, id) {
  if (typeof id !== "string" || !/^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/.test(id)) {
    const error = new Error("skill id is invalid");
    error.code = "AAS_INPUT_SKILL_ID_INVALID";
    throw error;
  }
  const skill = catalog.skills.find((entry) => entry.id === id);
  if (!skill) {
    const error = new Error("skill was not found in the selected catalog");
    error.code = "AAS_SKILL_NOT_FOUND";
    throw error;
  }
  return skill;
}

function diffCatalogs(left, right) {
  const leftById = new Map(left.skills.map((skill) => [skill.id, skill]));
  const rightById = new Map(right.skills.map((skill) => [skill.id, skill]));
  const ids = sortedUnique([...leftById.keys(), ...rightById.keys()]);
  const added = [];
  const removed = [];
  const changed = [];
  for (const id of ids) {
    if (!leftById.has(id)) added.push(id);
    else if (!rightById.has(id)) removed.push(id);
    else if (canonicalJson(leftById.get(id)) !== canonicalJson(rightById.get(id))) changed.push(id);
  }
  return {
    left: { package: left.package, version: left.version, digest: left.digest },
    right: { package: right.package, version: right.version, digest: right.digest },
    added,
    removed,
    changed,
  };
}

module.exports = { FORBIDDEN_QUERY_SYNTAX, validateLimit, searchSkills, getSkill, diffCatalogs };
