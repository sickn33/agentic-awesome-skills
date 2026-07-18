#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  canonicalJson,
  loadBundledCatalog,
  recommendStack,
} = require("../lib/aas-v1");

const REPO_ROOT = path.resolve(__dirname, "../..");
const TUNING_ROOT = path.join(
  REPO_ROOT,
  "verification",
  "aas-v1",
  "baseline",
  "v1",
  "benchmark",
  "tuning",
);
const CASE_ROOT = path.join(TUNING_ROOT, "cases");
const GOLD_ROOT = path.join(TUNING_ROOT, "gold");
const EXPECTED_INTENTS = [
  "agent-mcp-development",
  "api-backend-delivery",
  "deployment-devops",
  "security-review-hardening",
  "test-qa-automation",
  "web-application-delivery",
];
const THRESHOLDS = {
  verifiedCoverage: 0.8,
  inclusionPrecision: 0.9,
  criticalGoalCoverage: 1,
  minimumNonCriticalGoalCoverage: 0.8,
  hardPolicyViolations: 0,
};

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function listJsonFiles(root) {
  const resolvedRoot = fs.realpathSync(root);
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const resolved = fs.realpathSync(entryPath);
        const relative = path.relative(resolvedRoot, resolved);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error(`Tuning fixture escapes its frozen root: ${entryPath}`);
        }
        files.push({ absolute: resolved, relative: relative.split(path.sep).join("/") });
      }
    }
  };
  visit(resolvedRoot);
  return files.sort((left, right) => compareStrings(left.relative, right.relative));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function enumerateTuningPairs() {
  const cases = listJsonFiles(CASE_ROOT);
  const gold = listJsonFiles(GOLD_ROOT);
  const goldByRelative = new Map(gold.map((entry) => [entry.relative, entry]));
  const pairs = cases.map((caseEntry) => {
    const goldEntry = goldByRelative.get(caseEntry.relative);
    if (!goldEntry) throw new Error(`Missing tuning gold fixture for ${caseEntry.relative}`);
    goldByRelative.delete(caseEntry.relative);
    const benchmarkCase = readJson(caseEntry.absolute);
    const goldCase = readJson(goldEntry.absolute);
    if (benchmarkCase.caseId !== goldCase.caseId) {
      throw new Error(`Tuning case/gold ID mismatch for ${caseEntry.relative}`);
    }
    return {
      relativePath: caseEntry.relative,
      benchmarkCase,
      goldCase,
    };
  });
  if (goldByRelative.size > 0) {
    throw new Error(`Unpaired tuning gold fixtures: ${[...goldByRelative.keys()].sort(compareStrings).join(", ")}`);
  }
  return pairs.sort((left, right) => compareStrings(left.benchmarkCase.caseId, right.benchmarkCase.caseId));
}

function ratio(numerator, denominator, emptyValue = 0) {
  return denominator === 0 ? emptyValue : numerator / denominator;
}

function assessInclusion(includedSkillIds, acceptedSolutions) {
  if (includedSkillIds.length === 0) {
    return {
      acceptedCount: 0,
      inclusionCount: 0,
      matchedSolutionId: null,
      precision: null,
    };
  }
  if (!Array.isArray(acceptedSolutions) || acceptedSolutions.length === 0) {
    throw new Error("Every tuning gold fixture must contain an accepted solution");
  }
  const assessments = acceptedSolutions.map((solution) => {
    const allowed = new Set(solution.allowedSkillIds || []);
    const acceptedCount = includedSkillIds.filter((id) => allowed.has(id)).length;
    return {
      acceptedCount,
      inclusionCount: includedSkillIds.length,
      matchedSolutionId: String(solution.solutionId),
      precision: acceptedCount / includedSkillIds.length,
    };
  });
  assessments.sort((left, right) => (
    right.precision - left.precision
    || right.acceptedCount - left.acceptedCount
    || compareStrings(left.matchedSolutionId, right.matchedSolutionId)
  ));
  return assessments[0];
}

function assessCase(result, benchmarkCase, goldCase) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`Core returned a non-object result for ${benchmarkCase.caseId}`);
  }
  for (const field of ["coveredGoals", "includedSkillIds", "discoveryPromotions", "hardPolicyViolations"]) {
    if (!Array.isArray(result[field])) {
      throw new Error(`Core result field ${field} is not an array for ${benchmarkCase.caseId}`);
    }
  }
  if (result.ok !== true || !["complete", "partial", "insufficientCoverage"].includes(result.status)) {
    throw new Error(`Core returned an invalid tuning result envelope for ${benchmarkCase.caseId}`);
  }

  const covered = new Set(result.coveredGoals);
  const criticalCovered = benchmarkCase.criticalGoals.filter((goal) => covered.has(goal)).length;
  const nonCriticalCovered = benchmarkCase.nonCriticalGoals.filter((goal) => covered.has(goal)).length;
  const criticalGoalCoverage = ratio(criticalCovered, benchmarkCase.criticalGoals.length);
  const nonCriticalGoalCoverage = ratio(
    nonCriticalCovered,
    benchmarkCase.nonCriticalGoals.length,
    1,
  );
  const requiredNonCriticalCoverage = Math.max(
    THRESHOLDS.minimumNonCriticalGoalCoverage,
    benchmarkCase.minimumNonCriticalGoalCoverage ?? THRESHOLDS.minimumNonCriticalGoalCoverage,
  );
  const everyDiscoveryPromotionHasVisibleOverride = result.discoveryPromotions.every(
    (promotion) => promotion && promotion.visibleOverride === true,
  );
  const inclusion = assessInclusion(result.includedSkillIds, goldCase.acceptedSolutions);
  const verified = result.hardPolicyViolations.length === 0
    && criticalGoalCoverage === THRESHOLDS.criticalGoalCoverage
    && nonCriticalGoalCoverage >= requiredNonCriticalCoverage
    && (!benchmarkCase.requiresSkill || result.includedSkillIds.length >= 1)
    && everyDiscoveryPromotionHasVisibleOverride;

  return {
    caseId: benchmarkCase.caseId,
    criticalGoalCoverage,
    everyDiscoveryPromotionHasVisibleOverride,
    hardPolicyViolationCount: result.hardPolicyViolations.length,
    inclusionCount: inclusion.inclusionCount,
    inclusionPrecision: inclusion.precision,
    acceptedInclusionCount: inclusion.acceptedCount,
    includedSkillIds: result.includedSkillIds,
    intent: benchmarkCase.intent,
    matchedSolutionId: inclusion.matchedSolutionId,
    nonCriticalGoalCoverage,
    requiredNonCriticalGoalCoverage: requiredNonCriticalCoverage,
    status: result.status,
    verified,
  };
}

function recommendationInputForBenchmarkCase(benchmarkCase) {
  const fields = [
    "intent",
    "targets",
    "profile",
    "criticalGoals",
    "nonCriticalGoals",
    "minimumNonCriticalGoalCoverage",
    "policy",
    "maxSkills",
  ];
  return Object.fromEntries(fields
    .filter((field) => benchmarkCase[field] !== undefined)
    .map((field) => [field, benchmarkCase[field]]));
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateIntent(intent, reports) {
  const acceptedInclusions = reports.reduce((sum, report) => sum + report.acceptedInclusionCount, 0);
  const totalInclusions = reports.reduce((sum, report) => sum + report.inclusionCount, 0);
  const verifiedCount = reports.filter((report) => report.verified).length;
  const verifiedCoverage = ratio(verifiedCount, reports.length);
  const inclusionPrecision = totalInclusions === 0 ? null : acceptedInclusions / totalInclusions;
  const hardPolicyViolations = reports.reduce((sum, report) => sum + report.hardPolicyViolationCount, 0);
  return {
    acceptedInclusions,
    caseCount: reports.length,
    criticalGoalCoverage: mean(reports.map((report) => report.criticalGoalCoverage)),
    emptyStackCount: reports.filter((report) => report.inclusionCount === 0).length,
    gates: {
      hardPolicyViolations: hardPolicyViolations === THRESHOLDS.hardPolicyViolations,
      inclusionPrecision: inclusionPrecision !== null && inclusionPrecision >= THRESHOLDS.inclusionPrecision,
      verifiedCoverage: verifiedCoverage >= THRESHOLDS.verifiedCoverage,
    },
    hardPolicyViolations,
    inclusionPrecision,
    insufficientCoverageCount: reports.filter((report) => report.status === "insufficientCoverage").length,
    intent,
    nonCriticalGoalCoverage: mean(reports.map((report) => report.nonCriticalGoalCoverage)),
    nonEmptyStackCount: reports.filter((report) => report.inclusionCount > 0).length,
    totalInclusions,
    verifiedCount,
    verifiedCoverage,
  };
}

function macroAverage(perIntent, field) {
  const values = perIntent.map((entry) => entry[field]);
  return values.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ? null
    : mean(values);
}

function buildReport(catalog, pairs) {
  const caseReports = pairs.map(({ benchmarkCase, goldCase }) => {
    const result = recommendStack(catalog, recommendationInputForBenchmarkCase(benchmarkCase));
    return assessCase(result, benchmarkCase, goldCase);
  });
  const intents = [...new Set(caseReports.map((report) => report.intent))].sort(compareStrings);
  if (canonicalJson(intents) !== canonicalJson(EXPECTED_INTENTS)) {
    throw new Error(`Tuning corpus intent set changed: ${intents.join(", ")}`);
  }
  const perIntent = intents.map((intent) => aggregateIntent(
    intent,
    caseReports.filter((report) => report.intent === intent),
  ));
  const macro = {
    criticalGoalCoverage: macroAverage(perIntent, "criticalGoalCoverage"),
    inclusionPrecision: macroAverage(perIntent, "inclusionPrecision"),
    nonCriticalGoalCoverage: macroAverage(perIntent, "nonCriticalGoalCoverage"),
    verifiedCoverage: macroAverage(perIntent, "verifiedCoverage"),
  };
  const hardPolicyViolations = perIntent.reduce((sum, entry) => sum + entry.hardPolicyViolations, 0);
  return {
    schemaVersion: 1,
    reportType: "aas-v1-tuning-diagnostic",
    benchmark: {
      caseCount: pairs.length,
      casesPerIntent: Object.fromEntries(perIntent.map((entry) => [entry.intent, entry.caseCount])),
      roots: [
        "verification/aas-v1/baseline/v1/benchmark/tuning/cases",
        "verification/aas-v1/baseline/v1/benchmark/tuning/gold",
      ],
      tuningOnly: true,
    },
    catalog: {
      digest: catalog.digest,
      package: catalog.package,
      version: catalog.version,
    },
    execution: {
      exitOnThresholdFailure: false,
      resultEnvelopeValidated: true,
      terminalAssumedForSuccessfulInProcessCalls: true,
    },
    thresholds: THRESHOLDS,
    perIntent,
    macro,
    gates: {
      hardPolicyViolations: hardPolicyViolations === THRESHOLDS.hardPolicyViolations,
      inclusionPrecision: macro.inclusionPrecision !== null
        && macro.inclusionPrecision >= THRESHOLDS.inclusionPrecision
        && perIntent.every((entry) => entry.gates.inclusionPrecision),
      verifiedCoverage: macro.verifiedCoverage !== null
        && macro.verifiedCoverage >= THRESHOLDS.verifiedCoverage
        && perIntent.every((entry) => entry.gates.verifiedCoverage),
    },
    abstention: {
      applicable: false,
      reasonCode: "AAS_TUNING_CORPUS_HAS_NO_OUT_OF_COVERAGE_CASES",
    },
    caseReports,
  };
}

function main() {
  const pairs = enumerateTuningPairs();
  const catalog = loadBundledCatalog({ root: REPO_ROOT });
  const report = buildReport(catalog, pairs);
  process.stdout.write(`${canonicalJson(report)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const failure = {
      ok: false,
      code: "AAS_TUNING_RUNNER_EXECUTION_FAILED",
      message: error instanceof Error ? error.message : String(error),
    };
    process.stderr.write(`${canonicalJson(failure)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  CASE_ROOT,
  GOLD_ROOT,
  aggregateIntent,
  assessCase,
  assessInclusion,
  buildReport,
  enumerateTuningPairs,
  listJsonFiles,
  macroAverage,
  recommendationInputForBenchmarkCase,
};
