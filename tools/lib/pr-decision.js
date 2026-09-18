const { classifyChangeRecords, classifyPathPolicy } = require("./workflow-contract");

const DECISION_SCHEMA_VERSION = 1;
const VALID_SEMANTIC_REVIEW_STATES = new Set(["available", "unavailable", "unknown"]);

function normalizePath(value) {
  return String(value || "").replace(/^\.\//, "");
}

function isSensitivePath(filePath) {
  const normalized = normalizePath(filePath);
  return !classifyPathPolicy(normalized).approvalSafe;
}

function stableUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function changeType(change) {
  return String(change?.change_type || change?.status || "").toLowerCase();
}

function buildDecisionManifest({ preflight, evidence, semanticReviewState = "unknown" }) {
  if (!preflight || !Array.isArray(preflight.changedFiles)) {
    throw new Error("preflight.changedFiles is required");
  }
  if (!evidence || !Array.isArray(evidence.changes) || typeof evidence.blocking !== "boolean") {
    throw new Error("changed-skill evidence is incomplete");
  }
  if (!VALID_SEMANTIC_REVIEW_STATES.has(semanticReviewState)) {
    throw new Error(`Invalid semantic review state: ${semanticReviewState}`);
  }

  const changedFiles = stableUnique(preflight.changedFiles.map(normalizePath));
  const sensitivePaths = changedFiles.filter(isSensitivePath);
  const changeRecords = Array.isArray(preflight.changeRecords) ? preflight.changeRecords : [];
  const recordChangedFiles = stableUnique(changeRecords.flatMap((record) => [record?.old_path, record?.new_path])
    .filter(Boolean)
    .map(normalizePath));
  const recordsConsistent = JSON.stringify(recordChangedFiles) === JSON.stringify(changedFiles);
  const recordPolicy = changeRecords.length > 0
    ? classifyChangeRecords(changeRecords, { requireBlobSizes: false })
    : {
        approvalSafe: changedFiles.length === 0,
        reasons: changedFiles.length === 0 ? [] : ["missing_change_records"],
        paths: [],
      };
  if (!recordsConsistent) {
    recordPolicy.approvalSafe = false;
    recordPolicy.reasons = stableUnique([...recordPolicy.reasons, "changed_files_records_mismatch"]);
  }
  const changedSkills = stableUnique(
    evidence.changes.map((change) => change.skill_id || change.new_skill_id || change.old_skill_id),
  );
  const reasons = [];
  let route = "eligible_for_later_automation";

  if ((preflight.directDerivedChanges || []).length > 0) {
    route = "block";
    reasons.push("direct_derived_changes");
  }
  if (evidence.blocking) {
    route = "block";
    reasons.push("changed_skill_regression");
    reasons.push(...(evidence.reasons || []).map((reason) => `evidence:${reason}`));
  }

  if (route !== "block") {
    if (sensitivePaths.length > 0) {
      route = "human_review";
      reasons.push("sensitive_paths");
    }
    if (!recordPolicy.approvalSafe) {
      route = "human_review";
      reasons.push("unsafe_change_records");
      reasons.push(...recordPolicy.reasons.map((reason) => `record:${reason}`));
    }
    if (evidence.changes.length > 0) {
      route = "human_review";
      reasons.push("canonical_skill_content_changed");
    }
    if (evidence.changes.some((change) => ["added", "renamed", "copied"].includes(changeType(change)))) {
      route = "human_review";
      reasons.push("new_or_relocated_skill");
    }
    if (semanticReviewState !== "available" && evidence.changes.length > 0) {
      route = "human_review";
      reasons.push(
        semanticReviewState === "unavailable"
          ? "semantic_review_unavailable"
          : "semantic_review_unknown",
      );
    }
  }

  if (route === "eligible_for_later_automation") {
    reasons.push("deterministic_low_risk_candidate");
  }

  return {
    schema_version: DECISION_SCHEMA_VERSION,
    mode: "shadow",
    untrusted_advisory: true,
    route,
    reason_codes: stableUnique(reasons),
    base_ref: evidence.base_ref || preflight.baseRef || null,
    head_ref: evidence.head_ref || preflight.headRef || null,
    semantic_review: { state: semanticReviewState },
    change: {
      primary_category: preflight.primaryCategory || "none",
      categories: stableUnique(preflight.categories || []),
      changed_files_count: changedFiles.length,
      changed_files: changedFiles,
      change_records: changeRecords,
      record_policy: {
        approval_safe: recordPolicy.approvalSafe,
        reasons: stableUnique(recordPolicy.reasons),
      },
      sensitive_paths: sensitivePaths,
      direct_derived_changes: stableUnique(preflight.directDerivedChanges || []),
      changed_skills: changedSkills,
    },
    deterministic_gate: {
      blocking: Boolean(evidence.blocking || (preflight.directDerivedChanges || []).length > 0),
      evidence_reasons: stableUnique(evidence.reasons || []),
    },
  };
}

module.exports = {
  DECISION_SCHEMA_VERSION,
  buildDecisionManifest,
  isSensitivePath,
  normalizePath,
};
