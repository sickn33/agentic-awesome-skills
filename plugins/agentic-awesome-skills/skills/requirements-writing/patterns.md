# Requirements Writing Patterns & Techniques

## Ubiquitous requirement (EARS)
**When to use**: a property that always holds, with no trigger.
**How**: "The `<system>` shall `<measurable response>`."
**Trade-offs**: simplest form; make sure the behaviour really is always-on, not state-dependent.

## Event-driven requirement (EARS)
**When to use**: a behaviour fired by a discrete event.
**How**: "When `<trigger>`, the `<system>` shall `<response>` [within `<time>`]."
**Trade-offs**: forces an explicit trigger; add timing so the response is verifiable.

## State-driven requirement (EARS)
**When to use**: a behaviour active throughout a mode/state.
**How**: "While `<in-state>`, the `<system>` shall `<response>`."
**Trade-offs**: clarifies mode-dependent behaviour; requires a defined state model.

## Optional-feature requirement (EARS)
**When to use**: applies only when a configurable feature is present.
**How**: "Where `<feature is included>`, the `<system>` shall `<response>`."
**Trade-offs**: ideal for product lines; needs a clear feature/variant definition.

## Unwanted-behaviour requirement (EARS)
**When to use**: faults, errors, out-of-range inputs, safety responses.
**How**: "If `<unwanted condition>`, then the `<system>` shall `<response>`."
**Trade-offs**: captures the requirements most often forgotten in free text; enumerate the conditions deliberately.

## Convert-in-place
**When to use**: cleaning up a legacy specification or review findings.
**How**: find the implicit trigger and response, name the responsible system, recast into the matching EARS pattern, split any "and".
**Trade-offs**: most requirements convert in one pass and get shorter; some turn out not to be behavioural — reclassify those.

## Pattern-by-trigger selection
**When to use**: choosing the EARS form for any behavioural requirement.
**How**: always → Ubiquitous; event → When; state → While; variant → Where; fault → If/Then.
**Trade-offs**: a one-question decision; combined conditions need the Complex form or a split.

## Make the response measurable
**When to use**: every requirement, to satisfy *verifiable*.
**How**: response = value + units + tolerance + condition (e.g. "within ±0.2 bar of setpoint").
**Trade-offs**: turns opinion into a check; demands real numbers from stakeholders early.

## Assign a verification method at write time
**When to use**: as you author each requirement.
**How**: tag Test / Analysis / Inspection / Demonstration; if none fits affordably, rewrite the requirement.
**Trade-offs**: catches unverifiable requirements before baseline, not at test.

## Split compound requirements
**When to use**: any statement containing "and"/commas/sub-bullets joining needs.
**How**: write one requirement per need so each can be verified and traced atomically.
**Trade-offs**: more requirement IDs, but each is verifiable and traceable.

## Remove design from requirements
**When to use**: a requirement names a mechanism, algorithm, or technology.
**How**: ask "is the mechanism the need, or one way to meet it?"; state the need, capture the mechanism as design/rationale.
**Trade-offs**: frees the designer; keep genuinely-mandated interfaces/standards as constraints.

## Banned-words review
**When to use**: requirement quality gate / peer review.
**How**: scan for "user-friendly, robust, fast, minimal, flexible, support, handle, etc., as appropriate"; replace each with a measurable criterion.
**Trade-offs**: fast, high-yield check; needs a maintained list (see the cheatsheet).

## Capture rationale
**When to use**: any non-obvious requirement.
**How**: record the *why* alongside the requirement.
**Trade-offs**: small overhead now; essential for judging change impact later.
