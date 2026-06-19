# Review Studio 2.0 Method

Review Studio is the release-facing audit surface for a skill package. It does not replace the detailed reports; it turns them into one reviewer decision page.

## Purpose

- Show release blockers and warnings before the package deepens.
- Link every gate back to a concrete evidence artifact.
- Generate review actions for every blocker and warning, with source-fix location and verification command.
- Make human warning acceptance auditable through a waiver ledger.
- Make reviewer comments auditable through an annotation ledger tied to gates, source/report paths, and optional line numbers.
- Keep review flow vertical: summary first, gates second, supporting details after.
- Avoid hiding output quality, runtime, trust, portfolio, and operating-loop issues across separate pages.

## Required Gates

1. Intent Canvas: intent confidence and unresolved input/output/exclusion gaps.
2. Trigger Lab: route scorecard, misroutes, ambiguous cases, and near-neighbor safety.
3. Output Lab: with-skill vs baseline delta, execution mode, timing/token evidence, case count, file-backed cases, near-neighbor cases, boundary cases, blind A/B review pack evidence, and reviewer adjudication status.
4. Context Budget: initial load, budget tier, warnings, and quality density.
5. Runtime Matrix: target conformance pass/fail and degradation notes.
6. Trust Report: secret scan, script surface, dependency pinning, network/interactive flags, and package hash.
7. Permission Gates: reviewer-approved capability scope, reason, expiry, evidence, and target-enforcement notes.
8. Runtime Permission Probes: packaged adapter permission contracts, native-enforcement flags, metadata fallback notes, and residual risks.
9. Skill Atlas: route collisions, stale skills, owner gaps, and no-route opportunities.
10. Operations Loop: local-first metadata-only adoption, missed-trigger, bad-output, script-error, and review-drift signals.
11. Review Waivers: human risk approvals, active coverage, expired approvals, invalid records, and expiry policy.
12. Registry Audit: package metadata, install evidence, compatibility entries, and archive/source checksums.
13. Release Notes: promotion status, migration notes, known gaps, and next move.

## Gate Semantics

- `pass`: evidence is present and the gate is satisfied.
- `warn`: review can continue, but the issue must be visible before release.
- `block`: do not claim production, library, governed, or public readiness until fixed.

For library and governed skills, Output Lab should have at least five cases and cover file-backed, near-neighbor, and boundary scenarios.

Production, library, and governed reviews should also show a blind A/B review pack. The Review Studio gate may warn when scorecard evidence exists but no blind pack is present, because the package can prove assertions but not yet reduce reviewer bias.

When `reports/output_execution_runs.json` exists, Review Studio should show the number of variant runs, command-executed runs, model-executed runs, recorded fixtures, timing-observed runs, and token-estimated runs. Recorded fixtures are valid reproducibility evidence, but they must not be described as model-executed output evidence.

When `reports/output_review_adjudication.json` exists, Review Studio should show reviewed pairs and pending pairs. Pending reviewer decisions are acceptable as an explicit state, but they must not be counted as agreement or human review evidence. For production, library, and governed packages, pending reviewer decisions should keep the Output Lab in `warn` until reviewer decisions are recorded or the warning is explicitly accepted in the waiver ledger. Invalid adjudication records should block release because they make the blind review audit untrustworthy.

The Operations Loop must never display raw telemetry logs. It should link only to `reports/adoption_drift_report.md`; privacy or schema violations are blockers.

The Runtime Permission Probes gate is evaluated after packaging, because it reads generated target adapters. A missing probe can warn in lighter modes, but governed release should not claim target permission readiness without `reports/runtime_permission_probes.json`.

The Review Waivers gate must never convert a blocker into a pass. Waivers only cover warning-level risks, require reviewer, reason, scope, and expiry, and must link only to `reports/review_waivers.md`.

Review Annotations are not waivers. They are reviewer comments attached to a Review Studio gate plus a relative source/report path and optional line number. Use them to preserve review context, requested edits, and source-line notes. Open blocker annotations should make the Review Studio decision `blocked` until the annotation is resolved or deferred with reviewer rationale. Open warning annotations can move the package into review, but they do not create gate-specific `review_actions`; actions remain reserved for non-pass gates.

## Review Actions

Every non-pass gate must produce a `review_actions` entry in `reports/review-studio.json`. When all gates pass, `review_actions` should be an empty list and the page should explicitly say there are no blocker or warning actions.

Each action must include:

- `gate_key`
- `status`
- `summary`
- `why`
- `source_fix`
- `source_refs`
- `evidence`
- `verification_command`

`source_refs` must be structured entries with relative `path`, human label, kind, existence flag, best-effort line number, matched pattern, short source excerpt, and relative link when the file exists. They should point to the smallest useful report or source file, not just a broad directory. The HTML page should render the excerpt next to the link so reviewers can understand why a line anchor matters before opening the full artifact.

The HTML page should render these actions before the detailed supporting sections so a reviewer can move directly from warning to fix. Action entries do not change gate count or score; they make the current decision more operational.

For `world-class-evidence`, the action should also expose an evidence-step card for every pending evidence key. Each card should show the submission path, template path, blocked source checks, command handoff, first runbook steps, provenance requirements, success checks, evidence artifacts, and privacy boundary. These cards are collection guidance only; they must not count as accepted evidence or change world-class readiness.

## Review Annotations

`reports/review_annotations.json` is the structured ledger, and `reports/review_annotations.md` is the human-readable review note surface. Each annotation should include:

- `gate_key`
- `target_path`
- `line` when a useful source line exists
- `severity`
- `status`
- `reviewer`
- `body`
- optional `suggested_action`

The ledger should reject absolute paths or paths that escape the skill directory. Missing target files are allowed as visible evidence gaps, not hidden failures.
