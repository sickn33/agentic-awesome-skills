#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const benchmarkRoot = path.resolve(here, "..");
const caseRoot = path.join(benchmarkRoot, "cases", "held-out");
const goldRoot = path.join(benchmarkRoot, "gold", "held-out");
const indexPath = path.join(benchmarkRoot, "held-out-index.json");

function walkJson(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walkJson(target) : entry.name.endsWith(".json") ? [target] : [];
    })
    .sort();
}

function hostsForArchetype(archetype) {
  if (["small-greenfield", "mature-legacy-migration"].includes(archetype)) return ["codex"];
  if (["production-greenfield", "constrained-offline"].includes(archetype)) return ["claude"];
  return ["codex", "claude"];
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const descriptors = new Map(index.cases.map((entry) => [entry.caseId, entry]));
const casePaths = new Map();
const goldPaths = new Map();

for (const file of walkJson(caseRoot)) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const descriptor = descriptors.get(data.caseId);
  if (!descriptor) throw new Error(`Unknown held-out case: ${data.caseId}`);
  const normalized = {
    schemaVersion: 1,
    caseId: data.caseId,
    intent: data.intent,
    targets: hostsForArchetype(descriptor.archetype).map((host) => ({ host, scope: "project" })),
    profile: data.profile,
    criticalGoals: data.criticalGoals,
    nonCriticalGoals: data.nonCriticalGoals,
    minimumNonCriticalGoalCoverage: Math.max(0.8, data.minimumNonCriticalGoalCoverage ?? 0.8),
    requiresSkill: true,
    policy: {
      allowedRisk: ["none", "safe"],
      requireKnownSource: false,
      allowManualSetup: false
    },
    provenance: data.provenance,
    taskFamilyFingerprint: descriptor.taskFamilyId
  };
  fs.writeFileSync(file, `${JSON.stringify(normalized, null, 2)}\n`);
  casePaths.set(data.caseId, path.relative(benchmarkRoot, file));
}

for (const file of walkJson(goldRoot)) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const normalized = {
    schemaVersion: 1,
    caseId: data.caseId,
    acceptedSolutions: data.acceptedSolutions,
    ambiguous: data.ambiguous,
    provenance: {
      source: data.provenance?.source || "independent-synthetic-held-out-gold",
      version: data.provenance?.version || "1.0.0",
      reviewedAt: data.provenance?.reviewedAt || data.provenance?.labeledAt || "2026-07-17"
    },
    reviews: []
  };
  fs.writeFileSync(file, `${JSON.stringify(normalized, null, 2)}\n`);
  goldPaths.set(data.caseId, path.relative(benchmarkRoot, file));
}

index.cases = index.cases.map((entry) => ({
  ...entry,
  inputPath: casePaths.get(entry.caseId),
  goldPath: goldPaths.get(entry.caseId),
  provenance: "independent-synthetic-held-out@1.0.0",
  reviewStatus: "pendingIndependentReview"
}));
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(JSON.stringify({ normalizedCases: casePaths.size, normalizedGold: goldPaths.size }, null, 2));
