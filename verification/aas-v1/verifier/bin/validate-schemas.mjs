#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = path.dirname(fileURLToPath(import.meta.url));
const verificationRoot = path.resolve(here, "..", "..");
const baselineRoot = path.join(verificationRoot, "baseline", "v1");
const schemasRoot = path.join(verificationRoot, "schemas");
const failures = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function walkJson(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walkJson(target) : entry.name.endsWith(".json") ? [target] : [];
    })
    .sort();
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const compiled = new Map();
for (const file of walkJson(schemasRoot)) {
  const schema = readJson(file);
  compiled.set(path.basename(file), ajv.compile(schema));
}

function validate(schemaName, files) {
  const validator = compiled.get(schemaName);
  if (!validator) throw new Error(`Unknown schema: ${schemaName}`);
  for (const file of files) {
    const data = readJson(file);
    if (!validator(data)) {
      failures.push({
        schema: schemaName,
        file: path.relative(verificationRoot, file),
        errors: validator.errors,
      });
    }
  }
}

const benchmarkRoot = path.join(baselineRoot, "benchmark");
validate("benchmark-case.schema.json", [
  ...walkJson(path.join(benchmarkRoot, "cases", "held-out")),
  ...walkJson(path.join(benchmarkRoot, "tuning", "cases")),
]);
validate("benchmark-gold.schema.json", [
  ...walkJson(path.join(benchmarkRoot, "gold", "held-out")),
  ...walkJson(path.join(benchmarkRoot, "tuning", "gold")),
]);
validate("benchmark-manifest.schema.json", [path.join(benchmarkRoot, "manifest.json")]);
validate("held-out-index.schema.json", [path.join(benchmarkRoot, "held-out-index.json")]);
validate("budget-manifest.schema.json", [path.join(baselineRoot, "budgets.json")]);
validate("hostile-corpus-manifest.schema.json", [path.join(baselineRoot, "hostile", "manifest.json")]);
validate("legacy-command-corpus.schema.json", [path.join(baselineRoot, "legacy", "14.6.0", "manifest.json")]);
validate("metric-definition.schema.json", [path.join(baselineRoot, "metrics.json")]);
validate("runtime-matrix.schema.json", [path.join(baselineRoot, "runtime-matrix.json")]);
validate("tuning-gold-equivalence-review.schema.json", [
  path.join(baselineRoot, "reviews", "reviewer-tuning-equivalence-alpha.json"),
  path.join(baselineRoot, "reviews", "reviewer-tuning-equivalence-beta.json"),
  path.join(baselineRoot, "reviews", "reviewer-tuning-equivalence-adjudicator.json"),
  path.join(baselineRoot, "reviews", "reviewer-tuning-equivalence-ci-tiebreak.json"),
]);
validate("tuning-gold-equivalence-audit.schema.json", [
  path.join(baselineRoot, "reviews", "tuning-gold-equivalence-audit.json"),
]);
validate("product-verifier-manifest.schema.json", [path.join(baselineRoot, "verifier-manifest.json")]);
validate("host-adapter-fixtures.schema.json", [path.join(baselineRoot, "host-adapters", "manifest.json")]);

const abstentionRoot = path.join(benchmarkRoot, "abstention");
const abstentionSchemas = path.join(abstentionRoot, "schemas");
for (const name of ["abstention-case", "abstention-label", "abstention-index"]) {
  const schema = readJson(path.join(abstentionSchemas, `${name}.schema.json`));
  const validator = ajv.compile(schema);
  const files = name === "abstention-case"
    ? walkJson(path.join(abstentionRoot, "cases"))
    : name === "abstention-label"
      ? walkJson(path.join(abstentionRoot, "labels"))
      : [path.join(abstentionRoot, "index.json")];
  for (const file of files) {
    const data = readJson(file);
    if (!validator(data)) {
      failures.push({ schema: `${name}.schema.json`, file: path.relative(verificationRoot, file), errors: validator.errors });
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  publicSchemas: compiled.size,
  heldOutCases: 180,
  heldOutGold: 180,
  tuningCases: 60,
  tuningGold: 60,
  abstentionCases: 30,
  abstentionLabels: 30,
  tuningEquivalenceReviews: 4,
  tuningEquivalenceAudits: 1,
}, null, 2));
