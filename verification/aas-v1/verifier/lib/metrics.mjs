function ratio(numerator, denominator, emptyValue = 0) {
  if (denominator === 0) return emptyValue;
  return numerator / denominator;
}

function solutionSatisfiesRequiredGroups(includedSkillIds, solution) {
  const included = new Set(includedSkillIds);
  return (solution.requiredGroups || []).every((group) => group.some((skillId) => included.has(skillId)));
}

export function evaluateCase(result, goldCase, acceptedSolutions = []) {
  const criticalTotal = goldCase.criticalGoals.length;
  const nonCriticalTotal = goldCase.nonCriticalGoals.length;
  if (criticalTotal === 0) {
    throw new Error("Every in-scope held-out case must declare at least one critical goal.");
  }

  const covered = new Set(result.coveredGoals || []);
  const criticalCovered = goldCase.criticalGoals.filter((goal) => covered.has(goal)).length;
  const nonCriticalCovered = goldCase.nonCriticalGoals.filter((goal) => covered.has(goal)).length;
  const criticalGoalCoverage = ratio(criticalCovered, criticalTotal);
  const nonCriticalGoalCoverage = ratio(nonCriticalCovered, nonCriticalTotal, 1);
  const minimumNonCriticalGoalCoverage = Math.max(
    0.8,
    goldCase.minimumNonCriticalGoalCoverage ?? 0.8,
  );
  const includedSkillIds = Array.isArray(result.includedSkillIds) ? result.includedSkillIds : [];
  const discoveryPromotions = Array.isArray(result.discoveryPromotions)
    ? result.discoveryPromotions
    : [];
  const everyDiscoveryPromotionHasVisibleOverride = discoveryPromotions.every(
    (promotion) => promotion && promotion.visibleOverride === true,
  );
  const hardPolicyViolations = Array.isArray(result.hardPolicyViolations)
    ? result.hardPolicyViolations.length
    : Number(result.hardPolicyViolations || 0);
  const terminal = result.terminal === true
    && result.crashed !== true
    && result.timedOut !== true
    && result.missing !== true;

  const independentlyAcceptedStack = acceptedSolutions.length > 0
    && acceptedSolutions.some((solution) => (
      includedSkillIds.every((skillId) => (solution.allowedSkillIds || []).includes(skillId))
      && solutionSatisfiesRequiredGroups(includedSkillIds, solution)
    ));

  const verified = terminal
    && result.schemaValid === true
    && hardPolicyViolations === 0
    && criticalGoalCoverage === 1
    && nonCriticalGoalCoverage >= minimumNonCriticalGoalCoverage
    && (!goldCase.requiresSkill || includedSkillIds.length >= 1)
    && everyDiscoveryPromotionHasVisibleOverride
    && independentlyAcceptedStack;

  return {
    verified,
    terminal,
    hardPolicyViolations,
    criticalGoalCoverage,
    nonCriticalGoalCoverage,
    everyDiscoveryPromotionHasVisibleOverride,
    independentlyAcceptedStack,
    includedSkillIds,
  };
}

export function caseInclusionAssessment(includedSkillIds, acceptedSolutions) {
  if (!Array.isArray(includedSkillIds) || includedSkillIds.length === 0) {
    return {
      acceptedCount: 0,
      inclusionCount: 0,
      precision: null,
      matchedSolutionId: null,
    };
  }
  if (!Array.isArray(acceptedSolutions) || acceptedSolutions.length === 0) {
    throw new Error("At least one coherent accepted-equivalent solution is required.");
  }

  const assessments = acceptedSolutions.map((solution) => {
    const allowed = new Set(solution.allowedSkillIds || []);
    const acceptedCount = includedSkillIds.filter((id) => allowed.has(id)).length;
    return {
      acceptedCount,
      inclusionCount: includedSkillIds.length,
      precision: acceptedCount / includedSkillIds.length,
      matchedSolutionId: solution.solutionId,
    };
  });
  assessments.sort((left, right) => (
    right.precision - left.precision
    || right.acceptedCount - left.acceptedCount
    || String(left.matchedSolutionId).localeCompare(String(right.matchedSolutionId))
  ));
  return assessments[0];
}

export function caseInclusionPrecision(includedSkillIds, acceptedSolutions) {
  return caseInclusionAssessment(includedSkillIds, acceptedSolutions).precision;
}

export function aggregateIntent(caseReports, frozenDenominator = 30) {
  if (frozenDenominator !== 30) {
    throw new Error("The v1 held-out denominator is frozen at exactly 30 cases per intent.");
  }
  const verifiedCount = caseReports.filter((report) => report.verified === true).length;
  const acceptedInclusions = caseReports.reduce(
    (total, report) => total + Number(report.acceptedInclusionCount || 0),
    0,
  );
  const totalInclusions = caseReports.reduce(
    (total, report) => total + Number(report.inclusionCount || 0),
    0,
  );
  const perStackPrecisions = caseReports
    .filter((report) => Number(report.inclusionCount || 0) > 0)
    .map((report) => {
      if (typeof report.inclusionPrecision === "number") return report.inclusionPrecision;
      return Number(report.acceptedInclusionCount || 0) / Number(report.inclusionCount);
    });
  const nonEmptyStackCount = caseReports.filter((report) => Number(report.inclusionCount || 0) > 0).length;
  const emptyStackCount = caseReports.filter((report) => Number(report.inclusionCount || 0) === 0).length
    + Math.max(0, frozenDenominator - caseReports.length);

  return {
    frozenDenominator,
    observedResultCount: caseReports.length,
    verifiedCount,
    verifiedCoverage: verifiedCount / frozenDenominator,
    inclusionPrecision: perStackPrecisions.length === 0
      ? null
      : perStackPrecisions.reduce((sum, value) => sum + value, 0) / perStackPrecisions.length,
    acceptedInclusions,
    totalInclusions,
    nonEmptyStackCount,
    emptyStackCount,
  };
}

export function macroAverage(perIntent, field) {
  if (!Array.isArray(perIntent) || perIntent.length !== 6) {
    throw new Error("The v1 macro average requires exactly six intent values.");
  }
  const values = perIntent.map((entry) => entry[field]);
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / 6;
}

export function isCorrectAbstention(result) {
  return result?.ok === true
    && result?.status === "insufficientCoverage"
    && Array.isArray(result?.proposedStack)
    && result.proposedStack.length === 0;
}
