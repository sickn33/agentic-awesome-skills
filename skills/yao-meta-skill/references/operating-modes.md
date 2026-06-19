# Operating Modes

This playbook expands the compact mode routing in `SKILL.md`.

## Scaffold

Use when:

- the skill is exploratory
- the workflow is personal or short-lived
- eval and packaging cost would exceed reuse value

Default deliverables:

- `SKILL.md`
- `agents/interface.yaml`
- `references/` only when a small amount of deferred reading is clearly helpful

Avoid:

- automatic `scripts/`, `evals/`, or `manifest.json`
- packaging targets the user did not ask for

## Production

Use when:

- the skill will be reused by a team
- routing mistakes would waste time
- a small amount of deterministic automation improves reliability

Default deliverables:

- lean `SKILL.md`
- `agents/interface.yaml`
- `references/` for policies, checklists, or examples
- `scripts/` only when deterministic logic is real
- `evals/` when trigger or output quality should be checked
- `manifest.json` when lifecycle metadata matters

Minimum gates:

- `resource_boundary_check.py`
- `validate_skill.py`
- `trigger_eval.py` when route confusion is plausible

## Library

Use when:

- the skill is organizationally important
- the package will be shared broadly
- maintenance and portability matter
- the skill itself shapes how other skills are created or governed

Default deliverables:

- trigger positives, negatives, and near neighbors
- packaging expectations
- maintenance metadata
- visible regression evidence
- governance review readiness

Minimum gates:

- `resource_boundary_check.py`
- `governance_check.py`
- `trigger_eval.py`
- `cross_packager.py` for requested targets

## Governed

Use when:

- the skill affects incident, release, compliance, security, or organizational standards
- external distribution, public claims, or high-permission scripts require reviewable evidence
- wrong output or wrong activation can cause operational, legal, trust, or reputational harm

Default deliverables:

- everything required for Library
- explicit owner, lifecycle, review cadence, and expiry-aware approvals
- trust/security reports for scripts, dependencies, permissions, secrets, and package hash
- output eval evidence with blind review status and reviewer-visible boundaries
- world-class or public-claim evidence ledger when public readiness is claimed

Minimum gates:

- Library gates
- `trust_check.py`
- runtime permission probes for packaged adapters
- review waiver ledger for accepted warning-level risk
- Review Studio before release
- claim guard before public world-class language

## Escalation Rules

- stay in Scaffold unless reuse is clearly real
- move to Production when team reuse or route confusion matters
- move to Library when the skill becomes shared infrastructure
- move to Governed when the skill needs explicit risk ownership, high-permission review, or public-claim evidence

## Context Discipline

- a mode upgrade does not justify a larger `SKILL.md`
- higher rigor should mostly add better references, reports, evals, and metadata
- if a mode upgrade bloats the initial load, move detail out before adding more checks
