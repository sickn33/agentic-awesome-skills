"use strict";

const ontology = require("./ontology.v1.json");

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

module.exports = {
  normalizeToken,
  compareStrings,
  tokenize,
  sortedUnique,
};
