# Skill Atlas Method

Skill Atlas is the 2.0 operating layer for a workspace that contains many skills.

## Purpose

Single-skill quality is not enough for a team library. A skill portfolio also needs to reveal route collisions, stale ownership, duplicate resources, and repeated no-route opportunities.

## V0 Checks

- Catalog every `SKILL.md` under a workspace.
- Extract name, description, owner, maturity, targets, updated date, and review cadence.
- Detect similar descriptions as route-overlap candidates.
- Detect duplicate skill names.
- Detect shared script/reference filenames as dependency signals.
- Flag missing owner or review metadata.
- Flag stale skills based on `updated_at` and `review_cadence`.
- Extract no-route opportunities from failure notes.
- Read aggregate adoption drift reports and flag telemetry drift without reading raw telemetry logs.

## Scope Policy

Atlas keeps a full catalog, but release gates should distinguish actionable library skills from examples and test fixtures.

Use `skill_atlas/policy.json` to mark path prefixes as non-actionable when they are intentionally retained as examples, evolution snapshots, embedded generated skills, or validator fixtures. Non-actionable items still appear in the full report, route matrix, stale list, and owner gap list, but Review Studio should use the actionable counts for release readiness.

## Telemetry Link

Atlas may read each skill's aggregate `reports/adoption_drift_report.json` to surface portfolio drift signals such as no telemetry for production/library/governed skills, missed triggers, bad outputs, missing resources, script errors, and review-overdue counts. It must not read or package `reports/telemetry_events.jsonl`; raw telemetry remains local-only evidence owned by the skill.

Write drift output to `skill_atlas/drift_signals.json`. Non-actionable scopes stay visible in that file and in the HTML report, but only actionable drift signals should affect release readiness.

## Reviewer Gate

Use Atlas before promoting a single skill into a shared library. If an actionable route collision, missing owner, stale governed skill, or telemetry drift signal appears, fix the portfolio boundary before adding more local complexity to one skill. Non-actionable issues should stay visible as evidence, not as release blockers.
