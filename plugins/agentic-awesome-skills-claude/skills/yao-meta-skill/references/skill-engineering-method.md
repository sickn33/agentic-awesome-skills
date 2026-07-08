# Skill Engineering Method

This doctrine defines the default method for turning messy workflow material into a reusable skill without bloating the entrypoint.

## Core Loop

1. Decide whether the request should become a skill at all.
2. Run a short intent dialogue to capture the real job, outputs, exclusions, and constraints.
3. Choose the smallest viable archetype.
4. Set one clear capability boundary.
5. Write and test the trigger description before expanding the body.
6. Apply authoring discipline: name unresolved assumptions, keep scope small, and tie meaningful changes to checks.
7. Add an output risk profile for user-facing artifacts.
8. Add an artifact design profile for reports, tutorials, viewers, dashboards, screenshots, and visual pages.
9. Add only the gates that match the risk.
10. Ship the first routeable package, then pick the three highest-value next iteration directions.
11. Package and govern the skill only as far as real reuse demands.

## Phase 1: Qualification

Promote a request into a skill only when at least one of these is true:

- the workflow will be reused
- the workflow is easy to route incorrectly
- deterministic scripts reduce repeated effort
- governance or portability matters

Reject skill creation when the request is only:

- explanation
- summary
- translation
- brainstorming
- documentation without agent execution
- a one-off answer with no reuse value

See [Non-Skill Decision Tree](non-skill-decision-tree.md).

## Phase 1.5: Authoring Discipline

Before expanding the package, apply the execution discipline that keeps the work grounded.

- clarify only the assumptions that change the package design
- do not add speculative features, generic configurability, or decorative structure
- when editing an existing skill, touch only files that directly serve the requested change
- connect each meaningful change to a check: route evidence, sample run, resource-boundary check, governance check, or reviewer note

See [Authoring Discipline](authoring-discipline.md).

## Phase 1.6: Problem Diagnosis

When the user gives a fuzzy pain point instead of a clear skill request, diagnose the likely package shape before asking for structure.

- infer whether the need is best served by a scaffold, production workflow, library capability, governed asset, or no skill
- recommend at most three candidate directions
- explain why each candidate fits, where it is limited, and what the first light version should prove
- prefer a concrete recommendation over a menu when the intent is clear enough

This keeps discovery useful for users who can describe the problem but not the skill architecture.

## Phase 2: Intent Dialogue

Before deep authoring, ask only the questions that change the package design.

- open with a human, teacher-like framing rather than a cold field list
- let the user answer naturally first; offer a tiny template only as an optional shortcut
- what recurring job should the skill own
- what real inputs will users hand to it
- what outputs must it produce
- what near-neighbor requests should stay out of scope
- whether the user has reference systems, repos, or products worth learning from
- what constraints matter: privacy, naming, portability, governance, or local fit

See [Intent Dialogue](intent-dialogue.md).

## Phase 3: Archetype Selection

Choose the lightest archetype that fits the job.

- `Scaffold`: exploratory, personal, or short-lived
- `Production`: team-reused, quality-sensitive, but still compact
- `Library`: broad reuse, visible evidence, portability, and maintenance expectations
- `Governed`: organizationally sensitive or operationally critical; lifecycle and review are explicit

See [Skill Archetypes](skill-archetypes.md).

## Phase 4: Boundary Design

Every skill should answer four questions clearly:

- what recurring job does it own
- what outputs does it produce
- what near-neighbor requests should not route here
- what detail belongs outside `SKILL.md`

Boundary work comes before polishing prose.

## Phase 5: Reference Scan

Run a short benchmark pass before deep authoring.

- scan `3-5` reference objects at most
- prioritize high-star external GitHub and official benchmark sources first
- ask for user-supplied references second, but extract only patterns and standards
- use local files third, only for fit, privacy, and compatibility calibration
- choose from method, structure, execution, portability, and domain patterns
- extract only what passes the pattern test: recurrence, generativity, distinctiveness, and boundary clarity
- record what not to borrow so the new skill stays light

See [Reference Scan Strategy](reference-scan.md) and [Pattern Extraction Doctrine](pattern-extraction-doctrine.md).

## Phase 5.5: Output Risk Profiling

Before treating the package as usable, predict the likely mistakes in its final user-facing output.

- tutorial skills should guard against generic headings, vague examples, and missing success checks
- report and Markdown skills should guard against weak tables, dense lists, and poor hierarchy
- screenshot or visual skills should guard against wrong captures, missing assets, and invented visual evidence
- research or citation-heavy skills should guard against footnote clutter and unsupported claims
- code or command skills should guard against hidden cwd, input, output, and side-effect assumptions

Generate `reports/output-risk-profile.md` and expose it to the reviewer before adding more structure.

See [Output Quality Risk](output-quality-risk.md).

## Phase 5.6: Artifact Design Profiling

Before approving generated reports or visual outputs, define how the artifact should read and scan.

- choose the artifact family: tutorial, report, review viewer, dashboard, visual evidence, slide-like narrative, or code/CLI guide
- let the content choose the visual system instead of copying a fixed house style
- borrow document discipline from Kami: route by document type, distill content, verify layout-critical assumptions
- borrow slide discipline from presentation skills: plan hierarchy, density, rhythm, and quality gates before writing HTML
- reject generic headings, noisy citations, weak tables, wrong screenshots, repeated card grids, and decorative visual defaults

Generate `reports/artifact-design-profile.md` and expose it in the overview and review viewer.

See [Artifact Design Doctrine](artifact-design-doctrine.md) and [Output Visual Quality](output-visual-quality.md).

## Phase 5.7: Prompt Quality Profiling

When a skill depends on prompt behavior, role design, dialogue quality, or output contracts, turn prompt methodology into an evidence profile.

- identify the explicit need, implicit need, scenario, user level, and success standard
- map Role, Task, and Format into skill behavior instead of copying a full meta-prompt into `SKILL.md`
- classify the task family and complexity before adding structure
- score completeness, clarity, consistency, practicality, and specificity
- expose the full reasoning to reviewers while keeping the user-facing flow recommendation-led

Generate `reports/prompt-quality-profile.md` and expose it in the overview and review viewer.

See [Prompt Engineering Doctrine](prompt-engineering-doctrine.md).

## Phase 6: Trigger-First Authoring

Author the frontmatter `description` before expanding the body.

- start with the recurring job
- include the trigger actions that should route here
- include exclusions when confusion is plausible
- test the route before growing the file tree

Trigger quality is improved through:

- `trigger_eval.py`
- `optimize_description.py`
- blind holdout
- judge-backed blind holdout
- adversarial holdout
- route confusion

## Phase 7: Gate Selection

Add gates by risk, not by habit.

- low-risk scaffolds: validate structure and context size
- production skills: trigger eval plus resource-boundary checks
- library skills: description optimization, route confusion, packaging checks
- governed skills: governance scoring, lifecycle metadata, regression history

See [Gate Selection](gate-selection.md).

## Phase 8: First Iteration Philosophy

The first package is a routeable baseline, not the final answer.

- improve trigger and exclusions before growing prose
- add one execution asset before adding many documents
- surface the three highest-value next moves so authors do not expand in every direction at once
- prefer the smallest step that increases reliability more than context cost
- move unverifiable ideas into next-step candidates instead of shipping them as baseline structure

See [Iteration Philosophy](iteration-philosophy.md) and [Authoring Discipline](authoring-discipline.md).

## Phase 9: Promotion

A candidate route or package is promotable only when:

- visible holdout does not regress
- blind holdout does not regress
- judge-backed blind holdout does not regress
- adversarial holdout does not regress
- route confusion stays clean
- context and governance gates still pass

See [Promotion Policy](../evals/promotion_policy.md).

## Design Principle

The method is only correct if rigor grows faster than context cost. If a new check or document makes the skill heavier without making it more reliable, remove or relocate it.
