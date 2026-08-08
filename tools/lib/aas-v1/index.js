"use strict";

const { loadBundledCatalog, syntheticCatalog } = require("./catalog");
const { composeStack } = require("./selection");
const { canonicalJson, canonicalize, sha256 } = require("./canonical-json");
const { searchSkills, getSkill, diffCatalogs } = require("./search");
const versions = require("./versions");
const stack = require("./stack");
const cache = require("./cache");
const transaction = require("./transaction");
const evidence = require("./evidence");

module.exports = {
  ...versions,
  loadBundledCatalog,
  syntheticCatalog,
  composeStack,
  canonicalJson,
  canonicalize,
  sha256,
  searchSkills,
  getSkill,
  diffCatalogs,
  stack,
  cache,
  transaction,
  evidence,
  createSelectionEvidence: evidence.createSelectionEvidence,
  validateSelectionEvidence: evidence.validateSelectionEvidence,
};
