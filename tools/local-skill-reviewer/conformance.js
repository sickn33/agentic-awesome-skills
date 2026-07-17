"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeBundle } = require("./analyzer");
const { DIMENSIONS } = require("./constants");
const { sha256 } = require("./safe-bundle");
const { deterministicValidation, tesslAlignedValidation } = require("./validation");

function bundle(description, body, extraFiles = []) {
  const text = `---\nname: synthetic\ndescription: ${JSON.stringify(description)}\nrisk: safe\nsource: local\n---\n\n${body}\n`;
  const bytes = Buffer.from(text);
  const primary = { path: "skills/synthetic/SKILL.md", bytes, text, encoding: "utf-8", sha256: sha256(bytes), size: bytes.length };
  return { skillId: "synthetic", skillPath: primary.path, bundleHash: sha256(bytes), files: [primary, ...extraFiles] };
}

function loadCorpus() {
  const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/local-skill-review-conformance.json"), "utf8"));
  const expectedKeys = ["cases", "expectedDimensions", "kind", "profiles", "schemaVersion"].sort().join(",");
  if (Object.keys(corpus).sort().join(",") !== expectedKeys || corpus.schemaVersion !== 2 || corpus.kind !== "aas-local-skill-review-conformance") throw new Error("Conformance corpus schema mismatch");
  return corpus;
}

function expandedBody(profile) {
  const parts = [profile.body];
  if (profile.repeat?.line) parts.push(Array.from({ length: profile.repeat.count }, () => profile.repeat.line).join("\n"));
  if (profile.repeat?.linePrefix) parts.push(Array.from({ length: profile.repeat.count }, (_, index) => `${profile.repeat.linePrefix}${index}${profile.repeat.lineSuffix || ""}`).join("\n"));
  if (profile.tail) parts.push(profile.tail);
  return parts.join("\n\n");
}

function syntheticProfiles() {
  const corpus = loadCorpus();
  return Object.fromEntries(["bad", "medium", "good"].map((level) => [level, bundle(corpus.profiles[level].description, expandedBody(corpus.profiles[level]))]));
}

function specialCases() {
  const corpus = loadCorpus();
  return Object.fromEntries(Object.entries(corpus.cases).map(([name, item]) => {
    if (item.rawText) {
      const bytes = Buffer.from(item.rawText);
      const primary = { path: "skills/synthetic/SKILL.md", bytes, text: item.rawText, encoding: "utf-8", sha256: sha256(bytes), size: bytes.length };
      return [name, { skillId: "synthetic", skillPath: primary.path, bundleHash: sha256(bytes), files: [primary] }];
    }
    const extras = [];
    if (item.reference) {
      const bytes = Buffer.from(item.reference.text);
      extras.push({ path: item.reference.path, bytes, text: item.reference.text, encoding: "utf-8", sha256: sha256(bytes), size: bytes.length });
    }
    return [name, bundle(item.description, item.body, extras)];
  }));
}

function runConformance() {
  const corpus = loadCorpus();
  const profiles = syntheticProfiles();
  const analyzed = Object.fromEntries(Object.entries(profiles).map(([name, value]) => [name, analyzeBundle(value)]));
  const dimensions = {};
  for (const kind of ["description", "content"]) {
    for (const name of Object.keys(DIMENSIONS[kind])) {
      const scores = [analyzed.bad[kind].dimensions[name].score, analyzed.medium[kind].dimensions[name].score, analyzed.good[kind].dimensions[name].score];
      const expected = corpus.expectedDimensions[`${kind}.${name}`];
      if (!Array.isArray(expected) || scores.join(",") !== expected.join(",")) throw new Error(`Synthetic conformance failed: ${kind}.${name} = ${scores.join(",")}`);
      dimensions[`${kind}.${name}`] = scores;
    }
  }
  if (Object.keys(corpus.expectedDimensions).sort().join("\0") !== Object.keys(dimensions).sort().join("\0")) throw new Error("Conformance dimension set mismatch");
  const cases = specialCases();
  const simple = analyzeBundle(cases["simple-skill"]);
  if (simple.content.dimensions.conciseness.score < 2 || simple.content.dimensions.actionability.score < 2) throw new Error("Simple-skill conformance failed");
  const instructionOnly = deterministicValidation(cases["instruction-only"].files[0].text, "synthetic");
  if (instructionOnly.checks.find((item) => item.id === "substantive_body")?.passed !== true) throw new Error("Instruction-only conformance failed");
  const risky = analyzeBundle(cases["risky-workflow-without-feedback-loop"]);
  if (risky.content.dimensions.workflow_clarity.score >= 3) throw new Error("Risky no-feedback-loop conformance failed");
  const progressive = analyzeBundle(cases["progressive-disclosure-with-real-bundle"]);
  if (progressive.content.dimensions.progressive_disclosure.score !== 3 || cases["progressive-disclosure-with-real-bundle"].files.length !== 2) throw new Error("Real-bundle progressive disclosure conformance failed");
  const invalid = tesslAlignedValidation(cases["invalid-frontmatter"], "synthetic");
  if (invalid.overallPassed || invalid.errorCount < 1) throw new Error("Invalid-frontmatter conformance failed");
  return { status: "pass", profiles: 3, dimensions, cases: Object.keys(cases) };
}

module.exports = { loadCorpus, runConformance, specialCases, syntheticProfiles };
