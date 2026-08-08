"use strict";

const { canonicalJson } = require("./canonical-json");
const { sortedUnique, tokenize } = require("./normalize");

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
  const query = input.query === undefined ? "" : input.query;
  if (typeof query !== "string" || [...query].length > 256
    || Buffer.byteLength(query, "utf8") > 1024 || FORBIDDEN_QUERY_SYNTAX.test(query)) {
    const error = new Error("query must be a string of at most 256 characters");
    error.code = "AAS_INPUT_QUERY_INVALID";
    throw error;
  }
  const limit = validateLimit(input.limit);
  const cursor = input.cursor === undefined ? 0 : input.cursor;
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > catalog.skills.length) {
    const error = new Error("cursor must be a valid catalog offset");
    error.code = "AAS_INPUT_CURSOR_INVALID";
    throw error;
  }
  const queryTokens = sortedUnique(tokenize(query));
  const normalizedQuery = query.trim().toLowerCase();
  const matches = catalog.skills.map((skill) => {
    const document = new Set(skill.searchTokens || []);
    const matchedTokens = queryTokens.filter((token) => document.has(token));
    const matchesQuery = !normalizedQuery
      || skill.id.startsWith(normalizedQuery)
      || matchedTokens.length > 0;
    return { skill, matchedTokens, matchesQuery };
  }).filter((entry) => entry.matchesQuery);
  const results = matches.slice(cursor, cursor + limit)
    .map(({ skill, matchedTokens }) => {
      const result = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        matchedTokens,
        description: skill.description,
        tags: skill.tags,
        triggers: skill.triggers,
      };
      return result;
    });
  const nextCursor = cursor + results.length < matches.length ? cursor + results.length : null;
  return { queryTokens, totalMatches: matches.length, cursor, nextCursor, resultCount: results.length, results };
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
