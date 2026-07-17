#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { canonicalJson, sha256 } = require("../lib/aas-v1/canonical-json");
const { compareStrings, sortedUnique } = require("../lib/aas-v1/normalize");

const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_PATH = path.join(ROOT, "tools/lib/aas-v1/metadata-reviews.v1.json");
const SOURCES_ROOT = path.join(ROOT, "tools/metadata-sources/aas-v1");
const DEFAULT_SOURCE_PAIRS = Object.freeze([
  { audit: "api-deploy.semantic.json", fields: "api-deploy.fields.json" },
  { audit: "security-agent.semantic.json", fields: "security-agent.fields.json" },
  { audit: "web-test.semantic.json", fields: "web-test.fields.json" },
]);
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "data/catalog.json"), "utf8"));
const CATALOG_BY_SOURCE = new Map((CATALOG.skills || []).flatMap((skill) => [
  [skill.id, { id: skill.canonical_id || skill.id, path: skill.path }],
  [String(skill.path || "").replace(/^skills\//, "").replace(/\/SKILL\.md$/, ""), { id: skill.canonical_id || skill.id, path: skill.path }],
]));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveReviewSource(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || path.isAbsolute(value)) {
    throw new Error("review source path must be relative to the committed source root");
  }
  if (/(^|\/)(verification|gold|held-?out)(\/|$)/i.test(value.split(path.sep).join("/"))) {
    throw new Error("benchmark or verification paths cannot be metadata review sources");
  }
  const absolute = path.resolve(SOURCES_ROOT, value);
  const relative = path.relative(SOURCES_ROOT, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("review source path escapes the committed source root");
  }
  let cursor = SOURCES_ROOT;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error("review source path contains a symlink");
  }
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4 * 1024 * 1024) throw new Error("review source is not a safe regular file");
  return { absolute, relative: relative.split(path.sep).join("/") };
}

function parsePairs(argv) {
  const pairs = [];
  let output = OUTPUT_PATH;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--pair") {
      const audit = argv[index + 1];
      const fields = argv[index + 2];
      if (!audit || !fields) throw new Error("--pair requires semantic and field audit paths");
      pairs.push({ audit, fields });
      index += 2;
    } else if (argv[index] === "--out") {
      output = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--check") {
      check = true;
    } else {
      throw new Error(`unknown option: ${argv[index]}`);
    }
  }
  const selected = pairs.length ? pairs : DEFAULT_SOURCE_PAIRS;
  return {
    pairs: selected.map((pair) => ({ audit: resolveReviewSource(pair.audit), fields: resolveReviewSource(pair.fields) })),
    output,
    check,
  };
}

function auditId(audit, filePath) {
  return String(audit.auditId || `${path.basename(filePath, ".json")}-2026-07-17`);
}

function normalizedCandidate(candidate, selectionRule) {
  const sourceId = candidate.id || candidate.skillId;
  const capabilities = candidate.supportedCanonicalCapabilities || candidate.capabilities || candidate.canonicalCapabilities;
  const intents = candidate.intents || [candidate.intent];
  const contentPath = candidate.contentEvidence?.path || candidate.catalog?.path || candidate.evidence?.[0]?.path;
  const catalogRecord = CATALOG_BY_SOURCE.get(sourceId);
  if (!catalogRecord) throw new Error(`semantic audit candidate references an unknown catalog ID: ${sourceId || "unknown"}`);
  const { id } = catalogRecord;
  let contentDigest = candidate.contentEvidence?.sha256 || candidate.skillDigest;
  if (contentDigest && !contentDigest.startsWith("sha256-")) contentDigest = `sha256-${contentDigest}`;
  const lineEvidence = (candidate.evidence || []).map((entry) => ({
    path: entry.path,
    lineStart: entry.lineStart || entry.line || null,
    lineEnd: entry.lineEnd || entry.line || null,
    supports: sortedUnique(entry.supports || []),
  })).filter((entry) => entry.path && entry.supports.length > 0);
  if (!Array.isArray(capabilities) || capabilities.length === 0 || !contentPath || !contentDigest) {
    throw new Error(`semantic audit candidate is incomplete: ${id || "unknown"}`);
  }
  if (contentPath !== catalogRecord.path) throw new Error(`semantic audit content path is not canonical for ${id}`);
  const absolute = path.join(ROOT, ...catalogRecord.path.split("/"));
  const actual = sha256(fs.readFileSync(absolute));
  if (actual !== contentDigest) throw new Error(`content digest mismatch for ${id}`);
  for (const entry of lineEvidence) {
    if (entry.path !== catalogRecord.path) throw new Error(`semantic audit line evidence path is not canonical for ${id}`);
  }
  const selection = candidate.selectionProvenance || {};
  const ruleVersion = selection.ruleVersion || selectionRule?.ruleVersion || selectionRule?.name;
  if (typeof ruleVersion !== "string" || ruleVersion.length === 0) throw new Error(`semantic audit selection rule is missing for ${id}`);
  return {
    id,
    sourceId,
    intents: sortedUnique(intents),
    capabilities: sortedUnique(capabilities),
    content: { path: catalogRecord.path, digest: contentDigest },
    lineEvidence,
    selection: { ...selection, ruleVersion },
  };
}

function assertBenchmarkSeparation(audit) {
  let goldControls = 0;
  let heldOutControls = 0;
  function visit(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === "boolean" && /gold/i.test(key) && /(read|access|used)/i.test(key)) {
        goldControls += 1;
        if (nested !== false) throw new Error(`semantic audit declares benchmark gold access: ${key}`);
      }
      if (typeof nested === "boolean" && /held.?out/i.test(key) && /(read|access|used)/i.test(key)) {
        heldOutControls += 1;
        if (nested !== false) throw new Error(`semantic audit declares held-out access: ${key}`);
      }
      visit(nested);
    }
  }
  visit(audit);
  if (goldControls === 0 || heldOutControls === 0) throw new Error("semantic audit lacks explicit gold and held-out separation controls");
}

function statusOf(field) {
  if (!field || ["unknown", "incomplete"].includes(field.status)) return "unknown";
  if (field.status === "reviewed" && field.value === "unknown") return "unknown";
  if (["known", "known-empty", "reviewed"].includes(field.status)) return "known";
  return "unknown";
}

function sanitizedEvidence(value) {
  if (Array.isArray(value)) return value.map(sanitizedEvidence);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["excerpt", "representativeSamples"].includes(key))
    .map(([key, nested]) => [key, sanitizedEvidence(nested)]));
}

function normalizeField(name, field) {
  const status = statusOf(field);
  let value = status === "known" ? field.value : null;
  if (name === "setup" && value && typeof value === "object") value = value.mode;
  if (name === "setup" && value === "conditional") value = "manual";
  if (["dependencies", "conflicts"].includes(name) && status === "known") {
    if (!Array.isArray(value)) throw new Error(`${name} known value must be an array`);
    value = sortedUnique(value.filter((entry) => typeof entry === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(entry)));
  }
  return {
    status,
    value,
    evidence: sanitizedEvidence(field?.evidence || []),
  };
}

function severity(value) {
  return { none: 0, safe: 1, unknown: 2, critical: 3, offensive: 4 }[value] ?? 2;
}

function mergeField(name, fields) {
  if (fields.length === 1) return fields[0];
  if (name === "risk") {
    const chosen = [...fields].sort((left, right) => severity(right.value) - severity(left.value))[0];
    return {
      status: chosen.value === "unknown" || fields.some((field) => field.status === "unknown") ? "unknown" : chosen.status,
      value: chosen.value === "unknown" || fields.some((field) => field.status === "unknown") ? null : chosen.value,
      evidence: fields.flatMap((field) => field.evidence),
    };
  }
  if (["dependencies", "conflicts"].includes(name)) {
    if (fields.some((field) => field.status === "unknown")) {
      return { status: "unknown", value: null, evidence: fields.flatMap((field) => field.evidence) };
    }
    return { status: "known", value: sortedUnique(fields.flatMap((field) => field.value || [])), evidence: fields.flatMap((field) => field.evidence) };
  }
  const known = fields.filter((field) => field.status === "known");
  if (known.length === 0) return { status: "unknown", value: null, evidence: fields.flatMap((field) => field.evidence) };
  const serialized = new Set(known.map((field) => canonicalJson(field.value)));
  if (serialized.size > 1) return { status: "unknown", value: null, evidence: fields.flatMap((field) => field.evidence) };
  return { status: "known", value: known[0].value, evidence: fields.flatMap((field) => field.evidence) };
}

function aasImportProvenance(content) {
  const output = execFileSync("git", ["log", "--diff-filter=A", "--follow", "--format=%H", "--", content.path], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim().split(/\s+/).filter(Boolean);
  const commit = output.at(-1);
  if (!commit || !/^[a-f0-9]{40,64}$/.test(commit)) throw new Error(`missing AAS import provenance for ${content.path}`);
  return {
    status: "known",
    value: {
      kind: "aas-import-provenance",
      repository: "sickn33/agentic-awesome-skills",
      commit,
      path: content.path,
      contentDigest: content.digest,
      limitation: "AAS import provenance does not independently attest the upstream publisher account",
    },
    evidence: [{ type: "git-addition-history", commit, path: content.path }],
  };
}

function buildLedger(pairs) {
  const merged = new Map();
  const audits = [];
  for (const pair of pairs) {
    const semantic = readJson(pair.audit.absolute);
    const fieldAudit = readJson(pair.fields.absolute);
    assertBenchmarkSeparation(semantic);
    const semanticId = auditId(semantic, pair.audit.absolute);
    const fieldId = auditId(fieldAudit, pair.fields.absolute);
    const semanticDigest = sha256(fs.readFileSync(pair.audit.absolute));
    const fieldDigest = sha256(fs.readFileSync(pair.fields.absolute));
    const selectionRule = semantic.selectionRule || semantic.selectionRules || semantic.selectionMethod;
    if (!selectionRule || typeof selectionRule !== "object") throw new Error(`semantic audit selection rule is missing: ${semanticId}`);
    const selectorDigest = sha256(canonicalJson(selectionRule));
    audits.push({ semanticId, semanticPath: pair.audit.relative, semanticDigest, fieldId, fieldPath: pair.fields.relative, fieldDigest, selectorDigest });
    const candidates = semantic.candidates || [];
    for (const raw of candidates) {
      const candidate = normalizedCandidate(raw, selectionRule);
      const fieldRecord = fieldAudit.skills?.[candidate.sourceId] || fieldAudit.skills?.[candidate.id];
      if (!fieldRecord) throw new Error(`field audit missing ${candidate.id}`);
      const fields = Object.fromEntries(["risk", "provenance", "setup", "dependencies", "conflicts"]
        .map((name) => [name, normalizeField(name, fieldRecord[name])]));
      const entry = merged.get(candidate.id) || {
        id: candidate.id,
        intents: new Set(),
        capabilities: new Set(),
        content: candidate.content,
        lineEvidence: [],
        selections: [],
        reviews: [],
        fields: { risk: [], provenance: [], setup: [], dependencies: [], conflicts: [] },
      };
      if (canonicalJson(entry.content) !== canonicalJson(candidate.content)) throw new Error(`content identity disagreement for ${candidate.id}`);
      candidate.intents.forEach((intent) => entry.intents.add(intent));
      candidate.capabilities.forEach((capability) => entry.capabilities.add(capability));
      entry.lineEvidence.push(...candidate.lineEvidence);
      entry.selections.push({ auditId: semanticId, auditDigest: semanticDigest, selectorDigest, provenance: candidate.selection });
      entry.reviews.push({ semanticId, semanticDigest, fieldId, fieldDigest });
      for (const name of Object.keys(entry.fields)) entry.fields[name].push(fields[name]);
      merged.set(candidate.id, entry);
    }
  }
  const skills = {};
  for (const [id, entry] of [...merged].sort(([left], [right]) => compareStrings(left, right))) {
    const fields = Object.fromEntries(Object.entries(entry.fields).map(([name, values]) => [name, mergeField(name, values)]));
    if (fields.provenance.status === "unknown") fields.provenance = aasImportProvenance(entry.content);
    skills[id] = {
      intents: [...entry.intents].sort(compareStrings),
      capabilities: [...entry.capabilities].sort(compareStrings),
      content: entry.content,
      capabilityEvidence: entry.lineEvidence.sort((left, right) => compareStrings(canonicalJson(left), canonicalJson(right))),
      selectionEvidence: entry.selections.sort((left, right) => compareStrings(left.auditId, right.auditId)),
      reviews: entry.reviews.sort((left, right) => compareStrings(left.semanticId, right.semanticId)),
      fields,
    };
  }
  return {
    schemaVersion: 1,
    rubricVersion: "1.0.0",
    reviewedAt: "2026-07-17",
    reviewPolicy: "catalog-wide-public-selection-and-digest-bound-content-audit",
    provenancePolicy: "canonical-upstream-or-content-addressed-AAS-import-history",
    scope: { catalogSkillCount: 1965, reviewedSkillCount: Object.keys(skills).length, benchmarkIndependent: true },
    sourceAudits: audits.sort((left, right) => compareStrings(left.semanticId, right.semanticId)),
    skills,
  };
}

function main() {
  const { pairs, output, check } = parsePairs(process.argv.slice(2));
  const ledger = buildLedger(pairs);
  const serialized = `${canonicalJson(ledger)}\n`;
  if (check) {
    if (fs.readFileSync(output, "utf8") !== serialized) throw new Error("metadata-reviews.v1.json is stale; regenerate it from committed review sources");
    process.stdout.write(`Validated ${Object.keys(ledger.skills).length} benchmark-separated metadata reviews.\n`);
    return;
  }
  fs.writeFileSync(output, serialized, { mode: 0o644 });
  process.stdout.write(`Wrote ${Object.keys(ledger.skills).length} benchmark-independent metadata reviews.\n`);
}

if (require.main === module) main();

module.exports = {
  DEFAULT_SOURCE_PAIRS,
  SOURCES_ROOT,
  assertBenchmarkSeparation,
  buildLedger,
  normalizeField,
  normalizedCandidate,
  parsePairs,
  resolveReviewSource,
};
