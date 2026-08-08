# QA Ladder

Use the smallest quality gate set that still protects the user from likely failure.

## Basic

Use when:

- the skill is disposable or exploratory
- the route is obvious
- there is little downside to imperfect output

Recommended checks:

- structure sanity
- naming alignment
- a quick read for boundary clarity

## Standard

Use when:

- the skill will be reused
- near-neighbor prompts are plausible
- references or scripts could drift from the main instructions

Recommended checks:

- `validate_skill.py`
- `resource_boundary_check.py`
- a small trigger prompt set
- one description optimization pass when route wording is still unstable
- one realistic output example

## Advanced

Use when:

- the skill is shared infrastructure
- packaging or routing errors would be costly
- you want evidence that the skill stays healthy over time

Recommended checks:

- description optimization suite with dev and holdout cases
- family-based trigger regression
- failure and anti-pattern regression
- governance scoring
- packaging contract validation
- regression history and result reporting

## Escalation Heuristics

- add trigger eval before writing more instruction detail
- add boundary checks before adding more folders
- add governance and history once the skill becomes a maintained asset
- do not add advanced checks only for optics
