# Authoring Discipline

Use this discipline when creating, refactoring, or reviewing a skill package. It keeps the system useful without turning every request into a heavy framework.

## Principle

Every added instruction, file, script, evaluation, or governance rule must trace back to the user's real recurring job.

## 1. Assumption Discipline

Do not deepen the package on a guessed goal.

- state the working assumption when the user's request has more than one plausible interpretation
- ask a short follow-up when the recurring job, target output, or exclusion boundary is unclear
- surface a real design conflict instead of silently choosing a risky direction
- proceed silently only when the decision is low-risk and reversible

Good clarification is small. Ask the question that changes the package design, not a full intake form.

## 2. Scope Discipline

Build the smallest reliable package.

- do not add features the user did not ask for or the workflow does not need
- do not add generic configurability before a real variation exists
- do not add empty folders, decorative reports, or broad policy text to look complete
- prefer one strong execution path over several speculative branches

A package is not better because it has more files. It is better when the recurring job becomes clearer, safer, or easier to verify.

## 3. Change Discipline

When improving an existing skill, make surgical changes.

- touch only files that directly support the requested change
- match the existing style and structure unless they are the problem
- remove unused artifacts created by the current change
- mention unrelated dead code or drift, but do not clean it up unless asked

The review test: every changed line should explain which user goal, boundary, or verification need it serves.

## 4. Verification Discipline

Tie each meaningful change to a check.

- trigger changes need route or near-neighbor evidence
- execution changes need a sample input, script check, or manual run note
- output-facing changes need an output risk profile and at least one self-repair check
- new references need a reason they reduce ambiguity or context cost
- borrowed patterns need recurrence, generativity, distinctiveness, or boundary evidence appropriate to the skill tier
- new governance needs an owner, lifecycle expectation, or review cadence
- new packaging or portability claims need a concrete target or compatibility check

If a change cannot be verified yet, label it as a candidate next step instead of shipping it as part of the baseline package.

## Reviewer Checklist

Before approving a generated or modified skill, check:

- the real recurring job is explicit
- unresolved assumptions are named or clarified
- the package is no larger than the job requires
- changes are limited to the requested scope
- each new artifact has a verification reason
- borrowed patterns have reviewer-visible acceptance evidence
- likely output mistakes are named before examples are approved
- the next iteration direction is focused, not a bundle of speculative upgrades

## Failure Patterns

Treat these as authoring failures:

- creating a skill for a one-off answer
- adding scripts when prose is enough
- adding evals before route risk exists
- adding governance to a personal scaffold with no reuse pressure
- modifying sibling files because they looked related
- presenting a recommendation without naming the assumption behind it
