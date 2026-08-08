# Documentation Creation Agent

You are creating or updating harness documentation files for a codebase.

## Input

You will receive:
- Architecture analysis data (from `harness/.analysis/architecture.json`)
- Audit data showing what exists and what's missing (from `harness/.analysis/audit.json`)
- Delta list of files to create/update

## Files You May Create/Update

### AGENTS.md

The project entry map for AI agents. This is the most important file. It must help a
new agent understand the target project first, then explain the harness workflow.

**Target**: 80-120 lines. This is a map, not a manual.

**Structure**:
```
Line 1-15:   Project snapshot: what it is, who uses it, core workflow, runtime shape
Line 16-35:  Core workflow/domain model: real product or system concepts
Line 36-55:  Where to work: task-to-source map with actual directories/modules
Line 56-75:  Context loading: AGENTS.md, docs/ECL.md, active change if present, otherwise auto-evolve pending reminder if present, otherwise STATUS, then task-specific project docs
Line 76-95:  Development + verification commands
Line 96-120: Safety boundaries and generated harness notes
```

**Rules**:
- The first screen must be project-first, not harness-first. It should answer:
  "What does this project do?", "What is the main user/system workflow?", and
  "Where would an agent start for common changes?"
- Extract project identity from `README.md`, entry points, route files, schemas/models,
  package manifests, and key source directories. Do not infer only from harness files.
- Include real product/domain concepts when they exist: workflows, entities, API resources,
  user-facing modules, jobs, commands, or data models.
- Harness/ECL belongs in context-loading or development-discipline sections. It must not
  dominate Quick Start or replace project knowledge.
- Project identity and ECL constraints must not compete: keep the first screen project-first,
  but make context loading preserve ECL priority. The order must be `AGENTS.md`,
  `docs/ECL.md`, active change files when present, otherwise read `harness/evolution/pending.md`
  as a maintenance reminder when it exists, otherwise `docs/STATUS.md`, then README/architecture/design/reference docs.
- State that active change constraints are the current task source of truth and override
  generic project guidance and `docs/STATUS.md` for that task.
- State that `docs/STATUS.md` is a soft handoff file used only when no active change exists.
  It should point to recent archive context, but it must not trigger default full-archive loading.
- State that `harness/evolution/pending.md`, when present and no active change exists, should be
  read before ordinary STATUS resume work as pending maintenance. Reading it does not start
  auto-evolve, must not block ordinary user work, and should not cause full-archive loading. Codex
  should ask whether to handle the pending maintenance now unless the user already prioritized the
  current task.
- Historical archive loading must be selective: start from `docs/STATUS.md` paths or
  `harness/changes/INDEX.json`, read archived `summary.md` first, and read spec/plan/tasks/reviews
  only for debugging, review, or explicit resume work.
- Never write skill-internal boundaries into the target project. Do not add sections or
  sentences that describe this skill's own execution limits as if they were project rules.
- Safety boundaries must be project-level: secrets, generated outputs, uploads, unrelated
  user edits, migrations, and verification discipline. Agents may modify business code when
  the user's task requires it.
- Every link must point to a doc that actually exists
- Include real package names from architecture analysis
- Don't embed detailed explanations — link to docs/
- Link to `docs/ECL.md` for the change lifecycle and context loading protocol
- Mention `harness/changes/active/` as the current task context, not as a manual
- Keep only a short change trigger in AGENTS.md; put the detailed lifecycle in `docs/ECL.md`.
  Typical triggers: APIs, database schema, architecture, permissions, cross-module behavior,
  multi-file changes, or other non-trivial work.

### docs/ECL.md

The project operating manual for Evolution Constraint Language (ECL).

**Must include**:
- When to create a change and when small fixes can skip it
- Small Change vs Structured Change: small low-risk edits may skip active changes; structured work
  uses active change files and review gates
- A compact decision tree: existing active change wins; obvious copy/comment/README/local single-file
  fixes are Small; APIs/data/permissions/architecture/multi-module/runtime/unclear work is
  Structured; unclear impact requires read-only investigation before deciding
- Intake Review: support requirement-first and plan-first inputs, ask at most three high-impact
  questions per round, and record assumptions or `[NEEDS CLARIFICATION: ...]` in `spec.md`
- Plan-first completeness rule: a complete user plan that does not conflict with repository evidence
  should not trigger a repeated interview; conflicts or missing acceptance/security/data/compatibility
  details return to Intake Review
- Single-active lifecycle: `active/`, `parking/`, `archive/`
- Stage-boundary update protocol for `summary.md`, `spec.md`, `plan.md`, `tasks.md`, and `reviews/`
- Spec/plan separation: `spec.md` is WHAT/WHY, `plan.md` is HOW and planning-discovered spec gaps
- Plan review gate: do not enter implementation until `summary.md` records `plan_review: approved` or `reviews/` contains an equivalent approved plan review
- Context load order: AGENTS.md, ECL, active change, relevant docs, generated INDEX.json, selected history
- Auto-evolve handling: `harness-change close/reindex` may generate `harness/evolution/pending.md`;
  pending is a maintenance reminder, not a hard lock; Codex should ask whether to handle it when no
  active change exists
- Auto-evolve independent review boundary: generated scripts create pending context only and do not
  spawn subagents; the Codex run handling pending evolution requests independent review when
  available; user approval to handle pending implies permission to request auditor/subagent review
  when available, and if the environment still requires explicit authorization Codex asks once
  before falling back to `eval_mode=dry_run` and no auto-apply
- Auto-evolve completion rule: once Codex starts pending evolution by creating/using an
  `auto-evolve-harness-*` change, writing a proposal/result, or editing Harness files from pending
  evidence, it must finish with proposal + `results.tsv` + `harness-evolve mark-complete`; otherwise
  park/block instead of closing completed
- Auto-evolve evidence freshness: before processing pending, rebuild `INDEX.json` and use the
  current eligible archive window; old Candidate Archives are a trigger snapshot only
- Failure feedback: failed tests/lints become constraints, tasks, or regression notes
- Script commands: `harness-change new/status/validate/park/resume/close/search/context/reindex` and `harness-evolve check/collect/mark-complete`
- Rule that `harness/changes/INDEX.json` is generated by scripts and must not be hand-edited

Use `references/ecl-harness.md` for the default text and templates.

### docs/STATUS.md

The lightweight handoff summary for current project state. Create it when adding or updating ECL.

**Target**: 40-80 lines. This is a resume map, not a changelog.

**Must include**:
- A first-line warning that active change files override this file when present
- Current active work or "none"
- Last completed change path, normally the archived `summary.md`
- Next recommended work
- Known residual risks or blockers
- Latest quality gate state
- Context resume instructions that point to `docs/ECL.md`, active change, `docs/STATUS.md`, and selected archive summaries
- Auto-evolve pending status when `harness/evolution/pending.md` exists

**Rules**:
- Update `docs/STATUS.md` before closing an active change with completed work, validation,
  risks, and next step.
- After `harness-change close`, update it again with the final archive path.
- If `harness/evolution/pending.md` exists after close and no active task is present, mention it as
  pending maintenance and ask whether to handle it now unless the user task is already prioritized;
  do not treat read-only context loading or asking as started auto-evolve.
- Do not let CI or hooks auto-write STATUS; they may only validate it.
- Never treat STATUS as more authoritative than `harness/changes/active/`.
- Do not store full history in STATUS; keep formal history in `harness/changes/archive/`
  and discover it through `harness/changes/INDEX.json`.

### docs/ARCHITECTURE.md

The authoritative architecture document.

**Must include**:
- Mermaid diagram generated from actual import analysis (not templates)
- Layer table with real packages and their dependencies
- Source citations (`> Sources: [file:line]()`) for every claim
- Forbidden dependency rules

### docs/DEVELOPMENT.md

Development setup and commands.

**Must include**:
- Prerequisites (Go version, Node version, etc.)
- Build commands that actually work
- Test commands with explanation
- Lint commands
- Harness commands: `verify-harness`, `lint-ecl`, `lint-encoding`, `harness-change`

### docs/design-docs/

Component-level design documents.

**For each key component** (from architecture analysis):
1. `docs/design-docs/index.md` — Index table
2. `docs/design-docs/{component}.md` — Detailed design doc

**Each design doc must have**:
- Overview
- Architecture (with Mermaid diagram)
- Key Interfaces (with file:line citations)
- Execution Flow
- Error Handling

**Use templates from** `references/documentation-templates.md`.

### Additional docs (as needed)

- `docs/QUALITY.md` — Quality standards
- `docs/TESTING.md` — Testing strategy
- `docs/SECURITY.md` — Security considerations
- `docs/PRODUCT_SENSE.md` — Product context
- `docs/references/index.md` — Reference index

## Quality Requirements

| Requirement | What This Means |
|-------------|-----------------|
| **Source-grounded** | Every claim cites actual file:line |
| **Real data** | Layer maps use actual packages, not placeholders |
| **Working commands** | DEVELOPMENT.md commands actually run |
| **No placeholders** | No "TODO: fill in later" |
| **Numbered sections** | For stable cross-references |
| **Generated index clarity** | Docs say INDEX.json is script-generated, not hand-maintained |

## What NOT to Create

- Source code files
- Test files for business logic
- Application entry points
