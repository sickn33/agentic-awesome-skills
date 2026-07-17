"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  aggregateIntent,
  assessInclusion,
  enumerateTuningPairs,
  macroAverage,
} = require("../run-aas-v1-tuning");

test("tuning runner enumerates only the paired tuning corpus", () => {
  const pairs = enumerateTuningPairs();
  assert.equal(pairs.length, 60);
  assert.equal(new Set(pairs.map(({ benchmarkCase }) => benchmarkCase.caseId)).size, 60);
  assert.deepEqual(
    Object.fromEntries([...new Set(pairs.map(({ benchmarkCase }) => benchmarkCase.intent))]
      .sort()
      .map((intent) => [intent, pairs.filter(({ benchmarkCase }) => benchmarkCase.intent === intent).length])),
    {
      "agent-mcp-development": 10,
      "api-backend-delivery": 10,
      "deployment-devops": 10,
      "security-review-hardening": 10,
      "test-qa-automation": 10,
      "web-application-delivery": 10,
    },
  );
  assert.equal(pairs.some(({ relativePath }) => relativePath.includes("held")), false);
});

test("inclusion precision selects one coherent gold solution instead of their union", () => {
  const assessment = assessInclusion(["a", "b"], [
    { solutionId: "solution-a", allowedSkillIds: ["a", "a-helper"] },
    { solutionId: "solution-b", allowedSkillIds: ["b", "b-helper"] },
  ]);
  assert.deepEqual(assessment, {
    acceptedCount: 1,
    inclusionCount: 2,
    matchedSolutionId: "solution-a",
    precision: 0.5,
  });
});

test("intent precision is pooled over inclusions and macro is unweighted", () => {
  const reports = [
    {
      acceptedInclusionCount: 1,
      criticalGoalCoverage: 1,
      hardPolicyViolationCount: 0,
      inclusionCount: 1,
      nonCriticalGoalCoverage: 1,
      status: "complete",
      verified: true,
    },
    {
      acceptedInclusionCount: 1,
      criticalGoalCoverage: 1,
      hardPolicyViolationCount: 0,
      inclusionCount: 9,
      nonCriticalGoalCoverage: 1,
      status: "complete",
      verified: true,
    },
  ];
  const aggregate = aggregateIntent("example", reports);
  assert.equal(aggregate.inclusionPrecision, 0.2);
  assert.equal(aggregate.verifiedCoverage, 1);
  assert.equal(
    macroAverage([0.8, 0.8, 0.8, 0.8, 0.8, 1].map((verifiedCoverage) => ({ verifiedCoverage })), "verifiedCoverage"),
    5 / 6,
  );
});
