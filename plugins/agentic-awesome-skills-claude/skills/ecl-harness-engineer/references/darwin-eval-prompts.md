# Darwin Evaluation Prompts

Use these dry-run prompts when evaluating ecl-harness-engineer quality with darwin-skill.
They are evaluation prompts only; do not generate files unless the user explicitly asks.

## Prompt 1: Existing TypeScript Project

```text
Use ecl-harness-engineer to create an ECL-aware Harness for an existing TypeScript project.
The project already has package.json, src/, and tests/, but no AGENTS.md or harness/.
Explain the files you would create and the validation commands.
```

Expected: Detect TypeScript, propose AGENTS.md as a map, docs/ECL.md, docs/STATUS.md,
architecture/development docs, changes active/parking/archive, generated INDEX.json workflow,
lint-ecl, lint-encoding, and package script or Makefile verification without writing business code.

## Prompt 2: Audit Partial Harness

```text
Use ecl-harness-engineer to audit a project that already has AGENTS.md and docs/ARCHITECTURE.md,
but no harness/changes and no lint-ecl. Return the gaps and priorities first.
```

Expected: Treat as Partial Harness/ECL Missing or Partial, identify missing ECL docs/scripts/templates,
preserve existing docs where possible, and avoid overwriting without delta review.

## Prompt 3: Personal Change Tracking

```text
Use ecl-harness-engineer to add personal-development change tracking to a small project:
single active task, parking/archive, and automatic INDEX.json generation.
```

Expected: Recommend the summary/spec/plan/tasks/reviews change template, single-active rule, docs/STATUS.md handoff,
script-generated INDEX.json, explicit park/close/resume transitions, and hook/CI validation
without automatic doc mutation.

## Prompt 4: Resume Recent Work

```text
Use ecl-harness-engineer to explain how an agent should resume recent work in a project with
docs/STATUS.md, no active change, and several archived changes in harness/changes/archive.
Which files should be loaded first, and should the full archive be read?
```

Expected: Load AGENTS.md and docs/ECL.md first, then docs/STATUS.md because no active change
exists. Use the STATUS archive path or INDEX.json to select history, start with archived
summary.md only, and do not load the full archive by default.

## Prompt 5: Active Change Overrides STATUS

```text
Use ecl-harness-engineer to define context loading for a project that has both docs/STATUS.md and
harness/changes/active/summary.md. Which source controls the current task?
```

Expected: Active change controls the current task. Read active summary/spec/plan/tasks/reviews before
task-specific docs. STATUS is not authoritative while active exists.

## Prompt 6: Core Harness Must Not Create Advanced Empty Directories

```text
Use ecl-harness-engineer to create a harness for a normal existing TypeScript project. The user wants
agent onboarding, ECL change tracking, lint checks, and CI only. List the directories you would
create under harness/.
```

Expected: Choose the core harness profile. Create `harness/config`, `harness/changes`, and
`harness/templates/change`. Do not create `harness/eval`, `harness/trace`, `harness/state`,
`harness/checkpoints`, `harness/memory`, or `harness/metrics`.

## Prompt 7: Explicit Advanced Eval Profile

```text
Use ecl-harness-engineer to add an agent evaluation framework to a project that already has the core
ECL harness. The user wants reusable eval prompts and benchmark datasets for testing agent
behavior over time.
```

Expected: Treat this as an advanced harness request. Load eval guidance, propose `harness/eval`
and datasets or prompt fixtures, define how evals are run and scored, and avoid touching unrelated
core ECL files except to link the eval workflow if needed.

## Prompt 8: Explicit Observability And Memory Profile

```text
Use ecl-harness-engineer to add trace logging and long-term agent memory to a project. The user wants
to debug long-running agent sessions and inspect recurring failures.
```

Expected: Treat this as an advanced harness request. Load observability and durability guidance,
define read/write protocols for `harness/trace` and `harness/memory`, include validation or
retention rules, and do not present these directories as normal day-one harness defaults.

## Prompt 9: Ordinary Business Feature Must Not Trigger Harness Creation

```text
Add a login button to this React app and wire it to the existing auth route.
```

Expected: Do not use ecl-harness-engineer. This is ordinary application feature implementation, not
harness creation or audit work.

## Prompt 10: Auto-Evolve Threshold Check Is Core

```text
Use ecl-harness-engineer to create a normal ECL harness. The project has no eval or memory request.
Should auto-evolve be included, and which files or scripts are part of it?
```

Expected: Include lightweight `harness/evolution/state.json`, `results.tsv`, `proposals/`, and
`scripts/harness-evolve.*` as core threshold-check infrastructure. Do not create `harness/eval`,
`harness/trace`, `harness/state`, `harness/checkpoints`, `harness/memory`, or `harness/metrics`.

## Prompt 11: Close Triggers Pending Evolution

```text
A project has 10 archived ECL changes and harness/evolution/state.json says the last evolution
processed 5 archives with threshold 5. What should the generated harness-change close command do after
moving the active change to archive?
```

Expected: Rebuild `INDEX.json`, run `harness-evolve check`, and generate
`harness/evolution/pending.md` if no pending file exists. The script must not directly edit
AGENTS.md, docs/ECL.md, STATUS, lint rules, or CI.

## Prompt 12: Pending Does Not Override Active Work

```text
The repository has both harness/changes/active/summary.md and harness/evolution/pending.md.
Which context should Codex handle first?
```

Expected: Active change remains authoritative. Read active summary/spec/plan/tasks/reviews first and
defer auto-evolve until the active change is closed or parked.

## Prompt 13: Darwin Ratchet For Harness Evolution

```text
Auto-evolve proposes a harness delta based on recent archives, but the new audit score is lower
and lint-ecl fails. What should happen?
```

Expected: Revert the auto-evolve delta, record `revert` in `harness/evolution/results.tsv`, keep
the proposal for audit, and run `harness-evolve mark-complete` so the same pending cycle does not
repeat indefinitely.

## Prompt 14: No Independent Scorer Means Proposal Only

```text
Auto-evolve found a possible harness improvement, but this run has no available independent
auditor/subagent. Can Codex apply the delta automatically?
```

Expected: No. User approval to handle pending implies permission to request an independent
auditor/subagent when available. If the environment still requires explicit authorization, ask once.
If scoring remains unavailable, generate and keep the proposal, record `status=noop` with
`eval_mode=dry_run`, run `harness-evolve mark-complete`, and do not auto-apply the delta.
Auto-apply requires independent scoring.

## Prompt 15: Independent Score Below Threshold

```text
The main auto-evolve flow rates a proposal at 84, but the independent auditor scores it 79 because
the evidence is weak. What should happen?
```

Expected: Reject the proposal before apply, record `rejected` in `results.tsv`, and leave harness
files unchanged.

## Prompt 16: Project-Irrelevant Candidate

```text
Auto-evolve proposes adding a broad prompt-engineering rule from an article, but no archived change
shows this project had that failure. The proposal otherwise looks reasonable.
```

Expected: Reject the candidate as project-irrelevant. It may stay in rejected candidates inside the
proposal, but must not enter AGENTS.md, ECL, STATUS, lint, or CI.

## Prompt 17: Accepted Candidate Requires Evidence And Target Files

```text
An auto-evolve proposal accepts a candidate but lists no archive summary and no target project files
or commands. Is it valid?
```

Expected: No. Accepted candidates require archived evidence and project relevance. Independent
review must return `rejected` or `noop`.

## Prompt 18: Small Change Skips Full ECL

```text
Use ecl-harness-engineer guidance for a project where the user asks: "Fix one typo in README.md."
Should the harness require a full active change with spec/plan/tasks?
```

Expected: Treat as Small Change. Do not require a full active change. The agent should make the
local fix, preserve unrelated files, and report the verification used.

## Prompt 19: Vague Requirement Needs Bounded Intake

```text
Use ecl-harness-engineer guidance for a user request: "Add a permissions module."
What should the agent do before generating implementation tasks?
```

Expected: Treat as Structured Change. Extract a draft `spec.md` and ask at most three high-impact
questions about users/scenarios, acceptance criteria, permissions/data boundaries, or compatibility.
Do not generate implementation tasks from the first vague requirement.

## Prompt 20: User Already Provided A Plan

```text
The user provides a detailed implementation plan for adding role-based access control, including
files to change and test commands. How should ecl-harness-engineer guidance handle this?
```

Expected: Treat the user plan as a draft input, not as final truth. Split WHAT/WHY into `spec.md`
and HOW into `plan.md`. If target users, acceptance criteria, non-goals, and verification are clear,
do not re-interview from scratch. If any high-impact gaps remain, ask only those questions.

## Prompt 21: Plan Missing Acceptance Criteria

```text
The user gives a plan with implementation steps for a search feature but no success metrics,
non-goals, or validation scenario. Can the agent proceed to implementation?
```

Expected: No. Record the missing acceptance and boundary information in `spec.md` as
`[NEEDS CLARIFICATION: ...]`, ask bounded high-impact questions, and block implementation until the
spec/plan gate is satisfied.

## Prompt 22: Planning Exposes A Spec Gap

```text
During draft planning, the agent realizes a proposed API change may require data migration and
backward compatibility decisions that were not in the spec. Where should this be recorded?
```

Expected: Record it in `plan.md` under `Spec Gaps Found From Planning`, add or update the related
open question in `spec.md`, and keep `plan_review` pending until resolved.

## Prompt 23: Boundary Check For Platform Scope

```text
Use ecl-harness-engineer to improve AI coding workflow. Should it create a Jira/Confluence sync,
a chat UI for requirements intake, or default eval/trace/memory directories?
```

Expected: No. Keep the skill scoped to harness creation/audit, ECL templates, scripts, lint gates,
and docs. Advanced platform directories or external sync only appear when explicitly requested.

## Prompt 24: Borderline Small Change Requires Read-Only Inspection

```text
The user asks to change one default configuration value in a single file, but the setting affects
application startup behavior. Should ecl-harness-engineer guidance treat this as Small Change?
```

Expected: Not automatically. Inspect read-only first to determine runtime impact. If startup,
validation, or compatibility behavior changes, treat it as Structured Change or ask one high-impact
question before implementation.

## Prompt 25: Complete Plan Does Not Need Re-Interview

```text
The user provides a plan with clear goal, acceptance criteria, non-goals, constraints, target files,
risks, and verification commands, and it matches repository evidence. Should the agent ask a new
round of intake questions?
```

Expected: No. Split WHAT/WHY into `spec.md`, HOW into `plan.md`, generate executable `tasks.md`,
and proceed through plan review without repeating a full interview.

## Prompt 26: Plan Conflicts With Repository Evidence

```text
The user provides a plan that references a package manager and test command that do not exist in the
repository. What should the agent do?
```

Expected: Record the conflict in Intake Review, do not blindly accept the plan, and ask or correct
the high-impact mismatch before implementation.

## Prompt 27: Auto-Evolve Without Subagent

```text
An auto-evolve pending file exists, but the current environment cannot use an independent
auditor/subagent. Can the agent apply the proposed harness delta automatically?
```

Expected: No. Generated scripts do not call subagents. If independent review is supported but not
authorized, the agent asks the user for authorization first. If scoring is unavailable, declined,
or still unauthorized after asking, it writes a proposal, records `status=noop` with
`eval_mode=dry_run`, runs `harness-evolve mark-complete`, and must not auto-apply without
independent scoring.

## Prompt 28: Existing Active Change Wins

```text
A user asks for a small README wording fix while `harness/changes/active/summary.md` exists for an
ongoing related documentation task. Should the agent create a new active change or skip ECL?
```

Expected: Neither. Continue using the existing active change context because there can only be one
active change. Do not create a second active change.

## Prompt 29: Pending Read Is Not A Blocker

```text
No active change exists and harness/evolution/pending.md exists. The user asks for a small README
wording fix and does not ask to handle auto-evolve. Must the agent complete auto-evolve first?
```

Expected: No. Read or mention pending as maintenance context and ask whether the user wants to
handle it now unless the user has already prioritized the README fix. Reading or asking does not
start pending evolution and must not block ordinary user work.

## Prompt 30: Partial Auto-Evolve Cannot Close Completed

```text
An agent starts auto-evolve, fixes a bug in scripts/harness-evolve.ps1, writes a keep result for
that machinery repair, but does not evaluate the pending candidate archives or run
harness-evolve mark-complete. Can it close the auto-evolve change as completed?
```

Expected: No. Machinery repair does not complete pending evolution. The agent must continue to
evaluate candidate archives and finish with proposal + results.tsv + mark-complete, or park/close
blocked.

## Prompt 31: Auto-Evolve Archives Are Not Evidence

```text
The archive contains four normal changes and one auto-evolve-harness-* change tagged auto-evolve.
Threshold is 5. Should harness-evolve check generate a new pending file?
```

Expected: No. The threshold counts only eligible archives. Auto-evolve archives remain available
for audit but are excluded from threshold counts and Candidate Archives.

## Prompt 32: User Approval Implies Independent Review Request

```text
No active change exists and pending auto-evolve exists. Codex asks whether to handle it now, and the
user says yes. The user does not separately say "use a subagent." Should Codex request an
independent auditor/subagent if the environment supports it?
```

Expected: Yes. User approval to handle pending implies permission to request independent review
when available. If the environment still requires explicit authorization, ask once. Without a scorer,
record `noop + dry_run + mark-complete` and do not auto-apply.

## Prompt 33: Fresh Evidence Beats Stale Pending Snapshot

```text
pending.md was generated at five archived changes. Before the user approves handling it, three more
ordinary changes are archived. Which archives should Codex evaluate?
```

Expected: Rebuild `harness/changes/INDEX.json` and use the current eligible archive window. The
Candidate Archives listed in pending.md are a trigger snapshot, not the only evidence source.

## Prompt 34: User Declines Pending Maintenance

```text
Codex notices pending maintenance and asks whether to handle it now. The user says no, finish the
current feature first. What should happen?
```

Expected: Continue the current task through normal Small/Structured intake. Do not mark-complete or
write results.tsv because pending evolution has not started. Mention that pending remains.
