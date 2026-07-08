# Governance Model

This project treats important skills as governed assets rather than one-shot prompt files.

## Goals

- keep shared skills trustworthy over time
- make ownership explicit
- avoid stale or oversized skill packages
- define when a skill should evolve, split, or retire

## Required Governance Metadata

For reusable or library-grade skills, `manifest.json` should include:

- `name`
- `version`
- `owner`
- `updated_at`
- `review_cadence`
- `status`
- `maturity_tier`
- `lifecycle_stage`

## Allowed Values

### `status`

- `experimental`
- `active`
- `deprecated`

### `maturity_tier`

- `scaffold`
- `production`
- `library`
- `governed`

### `lifecycle_stage`

- `scaffold`
- `production`
- `library`
- `governed`

### `review_cadence`

- `monthly`
- `quarterly`
- `semiannual`
- `annual`
- `per-release`

## Governance Rules

### 1. Owner Required

Any skill meant for reuse must have a named owner or owning team.

### 2. Review Cadence Required

If a skill is shared, it must declare how often it should be reviewed.

### 3. Maturity Should Match Rigor

- `scaffold`: lightweight, personal, low-governance
- `production`: reusable team skill with validation
- `library`: curated shared skill with explicit packaging and evals
- `governed`: critical or meta-level skill with regression, maintenance, and review expectations

### 4. Deprecated Skills Need Explicit Intent

Deprecated skills should include a deprecation note or replacement reference in adjacent documentation or manifest extensions.

### 5. Drift Must Be Observable

Important skills should keep:

- a regression history
- visible evaluation results
- known anti-patterns or failure modes

## Governance Actions

Use governance review to decide whether a skill should:

- stay as-is
- tighten trigger boundaries
- split into sibling skills
- move detail into `references/`
- move brittle logic into `scripts/`
- be deprecated or replaced

## Governance Maturity Scoring

`scripts/governance_check.py` also computes a maturity score out of `100`.

### Score Buckets

The governance checker computes a score band in addition to the declared manifest tier. The score band is a diagnostic output, not a replacement for the declared lifecycle tier.

- `90-100`: governed
- `80-89`: production
- `65-79`: reusable
- `45-64`: emerging
- `<45`: draft

### Recommended Minimums For Declared Tiers

- `scaffold`: no hard minimum
- `production`: `80`
- `library`: `85`
- `governed`: `90`

### Score Dimensions

- metadata integrity
- ownership and review cadence
- boundary and eval evidence
- operational assets
- maintenance evidence

The score is not a replacement for human review. It is a fast signal that a shared skill is structured enough to be trusted, maintained, and audited. `scripts/governance_check.py` warns when a declared tier claims more rigor than the score currently supports.

## Why This Matters

Most skill systems stop at creation. World-class skill systems also manage:

- ownership
- drift
- maturity
- deprecation
- evidence of ongoing quality
