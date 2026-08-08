# Gate Selection

Gate selection should track risk. More gates are not automatically better.

## Minimum Gates By Risk

| Risk Level | Typical Archetype | Required Gates |
| --- | --- | --- |
| low | Scaffold | `validate_skill.py`, `resource_boundary_check.py` |
| medium | Production | low-risk gates plus `trigger_eval.py` |
| high | Library | medium-risk gates plus `optimize_description.py`, route confusion, packaging validation |
| critical | Governed | high-risk gates plus governance scoring, regression history, promotion policy |

## Trigger Gates

Use trigger gates when:

- a route can be confused with a nearby skill
- the workflow will be reused by multiple people
- the skill boundary must be defended over time

Trigger gates, in order:

1. `trigger_eval.py`
2. `optimize_description.py`
3. blind holdout
4. judge-backed blind holdout
5. adversarial holdout
6. route confusion

## Packaging Gates

Use packaging gates when:

- output must be consumed by multiple clients
- metadata drift would break discoverability
- portability is part of the skill's value

Packaging gates:

- `validate_skill.py`
- `cross_packager.py`
- packager failure fixtures
- adapter snapshot checks

## Governance Gates

Use governance gates when:

- the skill is shared infrastructure
- the skill has an owner and review cadence
- lifecycle state matters

Governance gates:

- `governance_check.py`
- regression history
- maturity scoring
- promotion policy

## Context Gates

Use context gates on every non-trivial skill.

- `context_sizer.py`
- `resource_boundary_check.py`

If rigor increases but initial load crosses the tier budget, move detail into `references/`, `scripts/`, or `reports/` before adding more checks.
