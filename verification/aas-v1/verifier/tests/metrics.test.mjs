import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateIntent,
  caseInclusionAssessment,
  caseInclusionPrecision,
  evaluateCase,
  isCorrectAbstention,
  macroAverage,
} from "../lib/metrics.mjs";

const gold = {
  criticalGoals: ["critical-a", "critical-b"],
  nonCriticalGoals: ["optional-a", "optional-b", "optional-c", "optional-d", "optional-e"],
  minimumNonCriticalGoalCoverage: 0.8,
  requiresSkill: true,
};

const validResult = {
  terminal: true,
  schemaValid: true,
  hardPolicyViolations: [],
  coveredGoals: ["critical-a", "critical-b", "optional-a", "optional-b", "optional-c", "optional-d"],
  includedSkillIds: ["skill-a"],
  discoveryPromotions: [],
};

test("verified case requires all critical and at least 80 percent non-critical coverage", () => {
  assert.equal(evaluateCase(validResult, gold).verified, true);
  assert.equal(evaluateCase({ ...validResult, coveredGoals: validResult.coveredGoals.slice(0, -1) }, gold).verified, false);
  assert.equal(evaluateCase({ ...validResult, coveredGoals: validResult.coveredGoals.slice(1) }, gold).verified, false);
});

test("hard policy, timeout, empty required stack, and hidden discovery override fail verification", () => {
  assert.equal(evaluateCase({ ...validResult, hardPolicyViolations: ["risk"] }, gold).verified, false);
  assert.equal(evaluateCase({ ...validResult, timedOut: true }, gold).verified, false);
  assert.equal(evaluateCase({ ...validResult, includedSkillIds: [] }, gold).verified, false);
  assert.equal(evaluateCase({ ...validResult, discoveryPromotions: [{ id: "skill-a", visibleOverride: false }] }, gold).verified, false);
});

test("precision scores one coherent alternative rather than a union", () => {
  const solutions = [
    { allowedSkillIds: ["a", "a-helper"] },
    { allowedSkillIds: ["b", "b-helper"] },
  ];
  assert.equal(caseInclusionPrecision(["a", "a-helper"], solutions), 1);
  assert.equal(caseInclusionPrecision(["a", "b"], solutions), 0.5);
  assert.equal(caseInclusionPrecision([], solutions), null);
  assert.deepEqual(caseInclusionAssessment(["a", "a-helper"], solutions), {
    acceptedCount: 2,
    inclusionCount: 2,
    precision: 1,
    matchedSolutionId: undefined,
  });
});

test("coverage denominator stays 30 when results are missing", () => {
  const reports = Array.from({ length: 24 }, () => ({
    verified: true,
    acceptedInclusionCount: 9,
    inclusionCount: 10,
  }));
  const aggregate = aggregateIntent(reports);
  assert.equal(aggregate.verifiedCoverage, 0.8);
  assert.equal(aggregate.emptyStackCount, 6);
  assert.ok(Math.abs(aggregate.inclusionPrecision - 0.9) < Number.EPSILON * 24);
  assert.equal(aggregateIntent(reports.slice(0, 23)).verifiedCoverage < 0.8, true);
});

test("intent precision is pooled over inclusions rather than averaged per case", () => {
  const aggregate = aggregateIntent([
    { verified: true, acceptedInclusionCount: 1, inclusionCount: 1 },
    { verified: true, acceptedInclusionCount: 1, inclusionCount: 9 },
  ]);
  assert.equal(aggregate.inclusionPrecision, 0.2);
  assert.equal(aggregate.acceptedInclusions, 2);
  assert.equal(aggregate.totalInclusions, 10);
});

test("macro average requires six intents and is not a micro average", () => {
  assert.equal(macroAverage([0.8, 0.8, 0.8, 0.8, 0.8, 1].map((value) => ({ value })), "value"), 5 / 6);
  assert.throws(() => macroAverage([{ value: 1 }], "value"), /exactly six/i);
});

test("correct abstention is successful, insufficient, and empty", () => {
  assert.equal(isCorrectAbstention({ ok: true, status: "insufficientCoverage", proposedStack: [] }), true);
  assert.equal(isCorrectAbstention({ ok: false, status: "insufficientCoverage", proposedStack: [] }), false);
  assert.equal(isCorrectAbstention({ ok: true, status: "insufficientCoverage", proposedStack: ["weak"] }), false);
});
