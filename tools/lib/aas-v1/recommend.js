"use strict";

const versions = require("./versions");
const { canonicalJson } = require("./canonical-json");
const { compareStrings, normalizeRecommendationInput, sortedUnique } = require("./normalize");

const FIXED_POINT = 1000;

function targetCompatibility(skill, targets) {
  const states = targets.map((target) => skill.metadata.targets?.[target.host]?.value ?? null);
  if (states.includes("blocked")) return "blocked";
  if (states.every((state) => state === "supported")) return "supported";
  return "unknown";
}

function eligibility(skill, input) {
  const reasonCodes = [];
  const unknownFields = [];
  const risk = skill.metadata.risk?.value;
  if (!risk) unknownFields.push("risk");
  else if (!input.policy.allowedRisk.includes(risk)) reasonCodes.push("AAS_ELIGIBILITY_RISK_DISALLOWED");
  const source = skill.metadata.source?.value;
  if (!source) {
    unknownFields.push("source");
    if (input.policy.requireKnownSource) reasonCodes.push("AAS_ELIGIBILITY_SOURCE_REQUIRED");
  }
  const setup = skill.metadata.setup?.value;
  if (!setup) unknownFields.push("setup");
  else if (setup === "manual" && !input.policy.allowManualSetup) reasonCodes.push("AAS_ELIGIBILITY_MANUAL_SETUP_DISALLOWED");
  const compatibility = targetCompatibility(skill, input.targets);
  if (compatibility === "blocked") reasonCodes.push("AAS_ELIGIBILITY_TARGET_BLOCKED");
  if (compatibility === "unknown") unknownFields.push("targetCompatibility");
  if (skill.metadata.capabilities?.status === "notApplicable") {
    reasonCodes.push("AAS_ELIGIBILITY_CAPABILITY_NOT_SUPPORTED");
  } else if (skill.metadata.capabilities?.status !== "known") unknownFields.push("capabilities");
  for (const field of ["dependencies", "conflicts", "validation"]) {
    if (!["known", "notApplicable"].includes(skill.metadata[field]?.status)) unknownFields.push(field);
  }
  const hardBlocked = reasonCodes.length > 0;
  const evidenceBacked = !hardBlocked
    && skill.metadata.capabilities?.status === "known"
    && skill.metadata.risk?.status === "known"
    && skill.metadata.source?.status === "known"
    && compatibility === "supported"
    && skill.metadata.setup?.status === "known"
    && ["known", "notApplicable"].includes(skill.metadata.dependencies?.status)
    && ["known", "notApplicable"].includes(skill.metadata.conflicts?.status)
    && ["known", "notApplicable"].includes(skill.metadata.validation?.status);
  return {
    eligibleForRecommendation: evidenceBacked,
    hardBlocked,
    eligibilityReasonCodes: reasonCodes.sort(),
    evidenceLevel: evidenceBacked ? "evidence-backed" : "incomplete",
    unknownFields: sortedUnique(unknownFields),
    targetCompatibility: compatibility,
  };
}

function documentFrequency(skills) {
  const frequencies = new Map();
  for (const skill of skills) {
    for (const token of new Set(skill.recommendationTokens || skill.searchTokens || [])) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
  }
  return frequencies;
}

function bm25Fixed(skill, queryTokens, corpusSize, frequencies, totalDocumentTokens) {
  const tokens = skill.recommendationTokens || skill.searchTokens || [];
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  let score = 0;
  for (const token of queryTokens) {
    const tf = counts.get(token) || 0;
    if (!tf) continue;
    const df = frequencies.get(token) || 0;
    const idf = Math.max(1, Math.min(8000, Math.floor(((corpusSize - df + 1) * FIXED_POINT) / (df + 1))));
    const lengthNorm = Math.max(1, 250 + Math.floor((750 * tokens.length * corpusSize) / Math.max(1, totalDocumentTokens)));
    const tfFactor = Math.round((tf * 2200 * FIXED_POINT) / (tf * FIXED_POINT + 1200 * lengthNorm / FIXED_POINT));
    score += Math.round((idf * tfFactor) / FIXED_POINT);
  }
  return score;
}

function goalCoverage(skill, goals) {
  const capabilities = new Set(skill.metadata.capabilities?.value || []);
  return goals.filter((goal) => capabilities.has(goal));
}

function scoreCandidates(catalog, input) {
  const frequencies = documentFrequency(catalog.skills);
  const totalDocumentTokens = catalog.skills.reduce(
    (sum, skill) => sum + (skill.recommendationTokens || skill.searchTokens || []).length,
    0,
  );
  const allGoals = [...input.criticalGoals, ...input.nonCriticalGoals];
  return catalog.skills.map((skill) => {
    const eligible = eligibility(skill, input);
    const coveredGoals = goalCoverage(skill, allGoals);
    const lexical = bm25Fixed(skill, input.queryTokens, catalog.skills.length, frequencies, totalDocumentTokens);
    const criticalMatches = coveredGoals.filter((goal) => input.criticalGoals.includes(goal)).length;
    const nonCriticalMatches = coveredGoals.length - criticalMatches;
    const metadataKnown = Object.values(skill.metadata).filter((entry) => entry?.status === "known").length;
    const metadataTotal = Object.values(skill.metadata).filter((entry) => entry && "status" in entry).length;
    const factors = {
      lexical,
      criticalGoalCoverage: criticalMatches * 5000,
      nonCriticalGoalCoverage: nonCriticalMatches * 2500,
      metadataCompleteness: Math.round((metadataKnown * FIXED_POINT) / Math.max(1, metadataTotal)),
      unknownPenalty: eligible.unknownFields.length * -500,
    };
    const totalScore = Object.values(factors).reduce((sum, value) => sum + value, 0);
    return {
      id: skill.id,
      factors,
      totalScore,
      coveredGoals,
      eligibility: eligible,
      metadata: skill.metadata,
    };
  }).sort((left, right) => right.totalScore - left.totalScore || compareStrings(left.id, right.id));
}

function knownStringList(candidate, field) {
  const judgment = candidate.metadata[field];
  return judgment?.status === "known" && Array.isArray(judgment.value) ? judgment.value : [];
}

function candidatesConflict(left, right) {
  return knownStringList(left, "conflicts").includes(right.id)
    || knownStringList(right, "conflicts").includes(left.id);
}

function dependencyClosure(candidate, candidatesById, visiting = new Set(), resolved = new Map()) {
  if (resolved.has(candidate.id)) return resolved;
  if (visiting.has(candidate.id)) return null;
  visiting.add(candidate.id);
  for (const dependencyId of knownStringList(candidate, "dependencies")) {
    const dependency = candidatesById.get(dependencyId);
    if (!dependency?.eligibility.eligibleForRecommendation) return null;
    if (!dependencyClosure(dependency, candidatesById, visiting, resolved)) return null;
  }
  visiting.delete(candidate.id);
  resolved.set(candidate.id, candidate);
  return resolved;
}

function composeStack(candidates, input) {
  const uncovered = new Set([...input.criticalGoals, ...input.nonCriticalGoals]);
  const selected = [];
  const remaining = candidates.filter((candidate) => candidate.eligibility.eligibleForRecommendation);
  const candidatesById = new Map(remaining.map((candidate) => [candidate.id, candidate]));
  while (selected.length < input.maxSkills && uncovered.size > 0) {
    const uncoveredCritical = input.criticalGoals.filter((goal) => uncovered.has(goal));
    const ranked = remaining
      .filter((candidate) => !selected.some((entry) => entry.id === candidate.id))
      .map((candidate) => {
        const closure = dependencyClosure(candidate, candidatesById);
        if (!closure) return null;
        const additions = [...closure.values()]
          .filter((entry) => !selected.some((selectedEntry) => selectedEntry.id === entry.id))
          .sort((left, right) => compareStrings(left.id, right.id));
        if (selected.length + additions.length > input.maxSkills) return null;
        const future = [...selected, ...additions];
        if (future.some((entry, index) => future.slice(index + 1).some((other) => candidatesConflict(entry, other)))) return null;
        const newGoals = sortedUnique(additions.flatMap((entry) => entry.coveredGoals).filter((goal) => uncovered.has(goal)));
        const critical = newGoals.filter((goal) => input.criticalGoals.includes(goal)).length;
        if (uncoveredCritical.length > 0 && critical === 0) return null;
        const nonCritical = newGoals.length - critical;
        const alreadyCovered = additions.reduce((sum, entry) => sum + entry.coveredGoals.filter((goal) => !uncovered.has(goal)).length, 0);
        const dependencyCost = Math.max(0, additions.length - 1) * 750;
        const overlapPenalty = alreadyCovered * 500;
        const marginalValue = critical * 10000 + nonCritical * 5000 - dependencyCost - overlapPenalty;
        return { candidate, additions, newGoals, critical, nonCritical, dependencyCost, overlapPenalty, marginalValue };
      })
      .filter((entry) => entry && entry.newGoals.length > 0 && entry.marginalValue >= 1000)
      .sort((left, right) => (
        right.critical - left.critical
        || right.nonCritical - left.nonCritical
        || left.additions.length - right.additions.length
        || left.overlapPenalty - right.overlapPenalty
        || left.dependencyCost - right.dependencyCost
        || right.candidate.totalScore - left.candidate.totalScore
        || compareStrings(left.candidate.id, right.candidate.id)
      ));
    if (!ranked.length) break;
    const winner = ranked[0];
    for (const addition of winner.additions) {
      selected.push({
        ...addition,
        insertionReason: {
          newGoals: addition.id === winner.candidate.id ? winner.newGoals : [],
          marginalValue: addition.id === winner.candidate.id ? winner.marginalValue : 0,
          dependencyOf: addition.id === winner.candidate.id ? null : winner.candidate.id,
        },
      });
    }
    for (const goal of winner.newGoals) uncovered.delete(goal);
  }
  return { selected, uncovered: [...uncovered].sort(compareStrings) };
}

function recommendStack(catalog, rawInput) {
  const input = normalizeRecommendationInput(rawInput);
  const candidates = scoreCandidates(catalog, input);
  const exclusions = candidates
    .filter((candidate) => candidate.eligibility.hardBlocked)
    .map((candidate) => ({ id: candidate.id, reasonCodes: candidate.eligibility.eligibilityReasonCodes }));
  const recommended = candidates.filter((candidate) => candidate.eligibility.eligibleForRecommendation);
  const discoveryCandidates = candidates
    .filter((candidate) => !candidate.eligibility.hardBlocked && !candidate.eligibility.eligibleForRecommendation && candidate.totalScore > 0)
    .slice(0, 25);
  const composition = composeStack(recommended, input);
  const coveredGoals = sortedUnique(composition.selected.flatMap((candidate) => candidate.coveredGoals));
  const criticalCovered = input.criticalGoals.filter((goal) => coveredGoals.includes(goal)).length;
  const nonCriticalCovered = input.nonCriticalGoals.filter((goal) => coveredGoals.includes(goal)).length;
  const goalCoverageValue = Math.round(((criticalCovered + nonCriticalCovered) * FIXED_POINT) / Math.max(1, input.criticalGoals.length + input.nonCriticalGoals.length));
  const metadataCompleteness = composition.selected.length
    ? Math.round(composition.selected.reduce((sum, candidate) => sum + candidate.factors.metadataCompleteness, 0) / composition.selected.length)
    : 0;
  const evidenceStrength = composition.selected.length
    ? Math.round(composition.selected.filter((candidate) => candidate.eligibility.evidenceLevel === "evidence-backed").length * FIXED_POINT / composition.selected.length)
    : 0;
  const criticalComplete = criticalCovered === input.criticalGoals.length;
  const nonCriticalRatio = input.nonCriticalGoals.length ? Math.round(nonCriticalCovered * FIXED_POINT / input.nonCriticalGoals.length) : FIXED_POINT;
  const status = composition.selected.length === 0
    ? "insufficientCoverage"
    : (criticalComplete && nonCriticalRatio >= input.minimumNonCriticalGoalCoverage ? "complete" : "partial");
  const payload = {
    ok: true,
    status,
    ...versions,
    catalog: { package: catalog.package, version: catalog.version, digest: catalog.digest },
    normalizedInput: input,
    recommended: recommended.slice(0, 50),
    discoveryCandidates,
    proposedStack: composition.selected.map((candidate) => candidate.id),
    includedSkillIds: composition.selected.map((candidate) => candidate.id),
    coveredGoals,
    uncoveredGoals: composition.uncovered,
    goalCapabilityMatrix: [...input.criticalGoals, ...input.nonCriticalGoals].map((goal) => ({
      goal,
      critical: input.criticalGoals.includes(goal),
      skillIds: composition.selected.filter((candidate) => candidate.coveredGoals.includes(goal)).map((candidate) => candidate.id),
    })),
    exclusions,
    hardPolicyViolations: [],
    discoveryPromotions: [],
    unknown: sortedUnique(discoveryCandidates.flatMap((candidate) => candidate.eligibility.unknownFields.map((field) => `${candidate.id}:${field}`))),
    measures: { goalCoverage: goalCoverageValue, metadataCompleteness, evidenceStrength },
  };
  payload.canonicalJson = canonicalJson(payload);
  return payload;
}

module.exports = { eligibility, bm25Fixed, scoreCandidates, composeStack, recommendStack };
