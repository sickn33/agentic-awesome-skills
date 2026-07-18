"use strict";

const TRIAGE_VERSION = "aas-local-review-triage-v1";
const TRIAGE_THRESHOLDS = Object.freeze({
  reviewFloor: 50,
  strongBand: 75,
  boundaryMargin: 3,
  extremeConfidenceFloor: 0.55,
});

const PRIORITY_ORDER = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });
const BROKEN_REFERENCE_CHECKS = new Set(["relative_links", "referenced_paths_exist"]);

function scoreBand(score) { return score < 50 ? "below-50" : score < 75 ? "50-74" : "75-plus"; }

function extremeConfidenceReason(result) {
  for (const kind of ["description", "content"]) {
    for (const item of Object.values(result.judgments?.[kind]?.dimensions || {})) {
      if ((item.score === 1 || item.score === 3) && item.confidence < TRIAGE_THRESHOLDS.extremeConfidenceFloor) return true;
    }
  }
  return false;
}

function productionTriage(result, { mergeGate = false } = {}) {
  const score = result?.local_quality_score;
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error("Triage requires a completed local quality score");
  const codes = new Set();
  const validation = result.components?.validation;
  if (validation?.errorCount > 0) codes.add("validation_error");
  if (validation?.checks?.some((item) => BROKEN_REFERENCE_CHECKS.has(item.name) && item.status !== "passed")) codes.add("broken_reference_warning");
  if (result.aas_policy?.status === "needs_review" || result.aas_policy?.findings?.length) codes.add("deterministic_policy_findings");
  if (score < TRIAGE_THRESHOLDS.reviewFloor) codes.add("low_quality_score");
  if (Math.abs(score - TRIAGE_THRESHOLDS.reviewFloor) <= TRIAGE_THRESHOLDS.boundaryMargin) codes.add("threshold_proximity_50");
  if (Math.abs(score - TRIAGE_THRESHOLDS.strongBand) <= TRIAGE_THRESHOLDS.boundaryMargin) codes.add("threshold_proximity_75");
  if (extremeConfidenceReason(result)) codes.add("low_confidence_extreme");
  if (["critical", "offensive"].includes(result.risk)) codes.add("high_risk_skill");
  if (mergeGate) codes.add("merge_blocking_candidate");
  const reasonCodes = [...codes].sort();
  const required = reasonCodes.length > 0;
  let priority = "P3";
  if (codes.has("merge_blocking_candidate")) priority = "P0";
  else if (["validation_error", "high_risk_skill", "low_quality_score"].some((code) => codes.has(code))) priority = "P1";
  else if (required || score < TRIAGE_THRESHOLDS.strongBand) priority = "P2";
  const reviewStatus = required ? "manual-review-required" : "pass";
  return {
    version: TRIAGE_VERSION,
    source: "local-skill-reviewer",
    reviewerClaim: "local-triage-only",
    reviewStatus,
    priority,
    reasonCodes,
    localQualityScore: score,
    scoreBand: scoreBand(score),
    thresholdDistances: { to50: Math.abs(score - TRIAGE_THRESHOLDS.reviewFloor), to75: Math.abs(score - TRIAGE_THRESHOLDS.strongBand) },
    manualReview: { required, mergeBlocking: codes.has("merge_blocking_candidate"), exactHeadAttestationStillRequired: codes.has("merge_blocking_candidate") },
    thresholds: TRIAGE_THRESHOLDS,
    disclaimer: "Local triage is not Tessl, is not equivalent to Tessl, does not predict Tessl passage, and does not by itself approve a merge.",
  };
}

function compareTriage(left, right) {
  return (PRIORITY_ORDER[left.triage.priority] - PRIORITY_ORDER[right.triage.priority]) || (left.local_quality_score - right.local_quality_score) || left.skillId.localeCompare(right.skillId);
}

module.exports = { PRIORITY_ORDER, TRIAGE_THRESHOLDS, TRIAGE_VERSION, compareTriage, productionTriage, scoreBand };
