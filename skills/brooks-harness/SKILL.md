---
name: brooks-harness
description: Maintenance orchestrator for the brooks-lint plugin itself. Runs a sequential subagent pipeline — author → eval → QA → trigger-audit → release — to add or edit a skill, refresh the eval suite, keep the four manifests + README + CHANGELOG + AGENTS/GEMINI in sync, audit trigger...
risk: unknown
source: https://github.com/hyhmrright/brooks-lint/tree/main/.claude/skills/brooks-harness
source_repo: hyhmrright/brooks-lint
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE
---

# brooks-lint — Maintenance Harness (Orchestrator)
## When to Use

Use this skill when you need maintenance orchestrator for the brooks-lint plugin itself. Runs a sequential subagent pipeline — author → eval → QA → trigger-audit → release — to add or edit a skill, refresh the eval suite, keep the four manifests + README + CHANGELOG + AGENTS/GEMINI in sync, audit trigger...


This skill orchestrates work **on the brooks-lint repo itself**. It runs a sequential
subagent pipeline: each stage is a dedicated agent defined in `.claude/agents/`. Spawn
each with the `Agent` tool, `subagent_type` set to the agent name, and **always
`model: "opus"`**. Stages depend on each other in order, so this is a pipeline, not a
parallel team.

## Pipeline

```
[orchestrator]
   Phase 0  context check
   Phase 1  classify request → select stages
   Phase 2  run selected stages in order, with a QA loop-back:
            skill-author → eval-curator → consistency-qa ─(FAIL)→ back to author
                                              │ PASS
                                              ▼
                            trigger-boundary-auditor   (only if a description changed)
                                              ▼
                                      release-manager  (only if release requested)
   Phase 3  report + collect feedback
```

## Phase 0 — Context check

Determine the run mode before doing anything:

- `_workspace/brooks-harness/` exists + maintainer asks to redo part of a prior run →
  **partial re-run**: invoke only the affected stage(s), reusing prior notes.
- `_workspace/brooks-harness/` exists + a fresh request → **new run**: move the old
  folder to `_workspace/brooks-harness_prev/`, start clean.
- No `_workspace/brooks-harness/` → **initial run**: create it.

Run notes and the QA report live under `_workspace/brooks-harness/`. The *real*
artifacts are the repo files themselves — agents edit `skills/`, `evals/`, manifests
directly; `_workspace/` only holds the run's notes and the PASS/FAIL verdict for audit.

## Phase 1 — Classify the request

Pick the minimal set of stages. The QA stage is **never skipped** — every change is
gated.

| Request | author | eval | QA | trigger-audit | release |
|---------|:------:|:----:|:--:|:-------------:|:-------:|
| Add a new skill | ✓ (via `new-skill` scaffold) | ✓ | ✓ | ✓ | — |
| Edit skill / guide content | ✓ | if codes changed | ✓ | if `description` changed | — |
| Edit `_shared/` framework | ✓ | if risk defs changed | ✓ | — | — |
| Eval suite only | — | ✓ | ✓ | — | — |
| Fix trigger descriptions | ✓ | — | ✓ | ✓ | — |
| Release | — | — | ✓ | — | ✓ |
| Full: change + release | ✓ | as needed | ✓ | if applicable | ✓ |

## Phase 2 — Run the pipeline

Spawn each selected stage as a subagent in order. Pass each agent (a) the task
contract and (b) the previous stage's summary. Agents write their summaries to
`_workspace/brooks-harness/`; read them between stages.

1. **skill-author** — creates/edits the content. For a brand-new skill it invokes the
   `new-skill` scaffold. Returns the list of files touched + convention-relevant
   choices (new risk codes, new Step numbers, changed `description` trigger phrases).
2. **eval-curator** — if `skill-author` reported new/changed risk codes or modes, adds
   the paired happy-path + false-positive scenarios and runs `npm run evals`.
3. **consistency-qa** *(gate — never skipped)* — runs `npm run validate` + `npm test` +
   `npm run evals`, then the cross-document sync checks (manifests, README badge,
   CHANGELOG, AGENTS/GEMINI book count, eval count). Writes a PASS/FAIL verdict.
   **On FAIL: loop back to the agent named in the verdict (author or eval-curator),
   fix, then re-run QA. Repeat once; if it still fails, stop and report to the
   maintainer.**
4. **trigger-boundary-auditor** — run **only if a `description` field changed**. It
   read-only audits the six shipped skills' trigger surfaces for false-triggering and
   routing collisions. Surface its findings; if it flags a real collision, loop back to
   skill-author.
5. **release-manager** — run **only if a release was requested**, and **only after QA
   PASS**. Cuts the release via the `release` skill.

## Phase 3 — Report & feedback

Report: stages run, files changed, QA verdict, trigger-audit findings (if any), and the
release URL (if any). Then offer the maintainer a feedback opening: "Anything to adjust
in the result, the agent roles, or the pipeline order?" Record accepted changes in the
CLAUDE.md harness change-log table.

## Conventions this harness enforces

- **All `Agent` calls use `model: "opus"`** — harness quality tracks agent reasoning.
- **consistency-qa must be `general-purpose`** (it runs npm scripts); the
  trigger-boundary-auditor is read-only.
- **No slash commands are created** — short forms are auto-installed by the
  session-start hook.
- **Direct-to-main**: changes push to `main` without a PR (per repo CLAUDE.md); the
  global simplify→review→commit gate still applies to non-doc edits, but skill/guide
  content is markdown and follows the validate gate instead.

## Error handling

- A stage that fails once is retried once with its error as input; a second failure
  stops the pipeline and reports to the maintainer (no silent skip).
- QA FAIL never proceeds to release.
- Conflicting data is reported with provenance, not deleted.
- High-risk git ops (`--no-verify`, `--force`, history rewrites) require explicit
  maintainer authorization — release-manager stops and asks.

## Test scenarios

**Normal flow — "add a brooks-security skill":** Phase 1 selects author+eval+QA+audit.
skill-author runs `new-skill brooks-security`, creates SKILL.md (with a sibling-carving
"Do NOT trigger for:" clause) + guide; eval-curator adds an S-code happy-path + a
false-positive scenario; consistency-qa runs the gate → PASS; trigger-boundary-auditor
confirms no collision with brooks-review/audit. Report lists files + PASS.

**Error flow — QA FAIL on book-count drift:** maintainer adds a thirteenth book but
edits only `source-coverage.md`. consistency-qa's cross-doc check finds README still
says "twelve" → FAIL, attributed to skill-author. Orchestrator loops back; skill-author
updates README/AGENTS/GEMINI wording; QA re-runs → PASS. No release was requested, so
the pipeline ends at Phase 3.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
