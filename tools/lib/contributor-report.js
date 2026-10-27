// Parse Markdown template comments only for evidence presence. This is not the
// output security boundary; literal() escapes all displayed untrusted values.
// Keep a newline at each removed span so fragments cannot join into new markup.
function evidenceText(body) {
  const text = String(body || "");
  const visible = [];
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("<!--", cursor);
    if (open === -1) {
      visible.push(text.slice(cursor));
      break;
    }
    visible.push(text.slice(cursor, open), "\n");
    const close = text.indexOf("-->", open + 4);
    if (close === -1) break;
    cursor = close + 3;
  }
  return visible.join("");
}
function missingEvidence(body) {
  const text = evidenceText(body);
  const required = ["Change evidence", "Validation evidence", "Source and operational boundaries"];
  return required.filter(heading => {
    const section = text.match(new RegExp("^## " + heading + "[ \\t]*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))", "im"));
    const content = section?.[1]?.trim() || "";
    return content.length < 12 || /^\[.*\]$/.test(content) || /^(?:todo|tbd|placeholder|replace with)\b/i.test(content);
  });
}
// Contributor guidance only. Trusted intake and merge:batch remain authoritative.
function instruction(reason) {
  if (/missing_change_records/.test(reason)) return "No contribution diff was found. Fetch the official upstream main and select the intended base and committed head.";
  if (/derived|generated/.test(reason)) return "Remove generated changes; distribution snapshots refresh in a protected release PR.";
  if (/unapproved_path|unknown_extension/.test(reason)) return "Use the documented source paths. For scripts or other restricted bundle files, request maintainer review in a Discussion; do not move or rename files to evade policy.";
  if (/mode|symlink|gitlink/.test(reason)) return "Submit regular non-executable files; describe required executable content for maintainer review.";
  if (/size|oversized|too_many/.test(reason)) return "Reduce the contribution or split independent changes into focused PRs.";
  if (/provenance|source_repo|source_type|source_identity/.test(reason)) return "Preserve attribution and provide the upstream repository, immutable revision and license. Identity changes need maintainer review.";
  if (/missing_examples/.test(reason)) return "Add a concrete usable example with its expected result.";
  if (/missing_limitations/.test(reason)) return "Document actual prerequisites, unsupported cases and failure conditions.";
  if (/missing_when_to_use/.test(reason)) return "Describe specific triggers and when another skill is more appropriate.";
  if (/risk_downgrade/.test(reason)) return "Explain the behavior change and ask the maintainer to review the risk downgrade.";
  if (/security/.test(reason)) return "Inspect the named finding, document authorization and data boundaries, and correct unsafe examples.";
  if (/audit/.test(reason)) return "Correct the named metadata/content finding and rerun the contribution preflight.";
  return "Inspect the named finding and rerun the preflight; ask in Discussions if the required correction is unclear.";
}
function buildContributorReport(preflight, evidence = null, checks = []) {
  const blockers = [];
  for (const file of preflight.directDerivedChanges || []) {
    blockers.push({ path: file, reason: "direct_derived_change", action: instruction("derived") });
  }
  if (preflight.forkSafety?.applicable && !preflight.forkSafety.approvalSafe) {
    for (const reason of preflight.forkSafety.reasons?.length ? preflight.forkSafety.reasons : ["fork_policy"]) {
      const recordIndex = Number(/^record_(\d+):/.exec(reason)?.[1]);
      const side = /:(old|new)_/.exec(reason)?.[1];
      const entry = (preflight.forkSafety.paths || []).find(item => item.record === recordIndex && (!side || item.side === side));
      blockers.push({ path: entry?.path || "PR", reason, action: instruction(reason) });
    }
  }
  for (const reason of evidence?.reasons || []) {
    const skillId = String(reason).split(":")[0];
    const change = evidence?.changes?.find(change => (change.skill_id || change.new_skill_id || change.old_skill_id) === skillId);
    const finding = change?.after?.security?.flags?.find(flag => String(reason).includes(`:${flag.code}:`));
    blockers.push({
      path: `skills/${skillId}/`,
      reason, detail: finding ? `${finding.message} (scanner excerpt line ${finding.line}; inspect the complete skill tree for the source location)` : null, action: instruction(reason),
    });
  }
  for (const check of checks.filter(check => check.exitCode !== 0 && !(check.script === "pr:evidence" && evidence?.reasons?.length))) {
    blockers.push({ path: check.script, reason: "check_failed", action: "Read this check's output below (or its Actions log), correct the failure and rerun the preflight." });
  }
  return {
    schema_version: 1, advisory: true,
    base: preflight.baseOid || null, head: preflight.headOid || null,
    scope: preflight.contributor ? "local fork-policy preview" : "PR intake",
    checks_run: checks.map(check => ({ name: check.script, passed: check.exitCode === 0 })),
    blockers,
    missing_evidence: preflight.prBody?.available ? missingEvidence(preflight.prBody.body) : [],
    contributor_evidence: [
      "Describe input or prompt, tool/version, expected and observed result; distinguish a live test from a source inspection or structural validation.",
      "For additions explain the gap versus existing skills; for fixes show before/after; for upstream updates identify the revision, retained local changes and license notices.",
      "State any untested behavior, required account/connector, costs and affiliation. Never attach secrets or private transcripts.",
    ],
    maintainer_review: "Complete skill-tree semantics, safety, provenance and license obligations require review. Tessl manual-review-required needs exact-head maintainer attestation. A passing preflight grants no merge approval.",
    verification: evidence ? "Changed-skill evidence evaluated for the selected commits." : "Changed-skill evidence and component checks may still be pending; classification alone is not a completed preflight.",
  };
}
function literal(value) {
  // Changed paths and evidence are untrusted. Keep Markdown, HTML and terminal
  // control characters from becoming active markup in logs or Actions summaries.
  return String(value).replace(/[\x00-\x1f\x7f-\x9f]/g, "?").replace(/[&<>`|\[\]\\]/g, char => `&#${char.charCodeAt(0)};`);
}
function formatContributorReport(report) {
  const lines = ["## Contribution readiness", "", `Head: ${literal(report.head || "unknown")}`, "", "### Corrections", ""];
  if (!report.blockers.length) lines.push("No intake blockers reported in this summary. Check all required jobs before requesting review.");
  for (const item of report.blockers.slice(0,40)) lines.push(`- ${literal(item.path)}: ${literal(item.reason)}. ${item.detail ? literal(item.detail) + ". " : ""}${literal(item.action)}`);
  if (report.blockers.length > 40) lines.push(`Further findings: ${report.blockers.length - 40}; see the full JSON report.`);
  lines.push("", "### Evidence to provide", "", ...(report.missing_evidence || []).map(heading => `- Complete the PR section: ${heading}.`), ...report.contributor_evidence.map(item => `- ${item}`), "", "### Maintainer review", "", report.maintainer_review, "", report.verification, "");
  return lines.join("\n");
}
module.exports = { buildContributorReport, formatContributorReport, instruction, missingEvidence, evidenceText };
