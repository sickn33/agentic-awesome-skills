---
name: ecl-harness-engineer
description: "Create or audit ECL Agent Harness infrastructure: AGENTS.md, change tracking, repository guidance, lint checks, CI gates, and agent handoff docs."
category: development
risk: safe
source: community
source_repo: qinghui316/ecl-harness-engineer
source_type: community
date_added: "2026-06-13"
author: qinghui316
tags: [codex, agent-harness, ecl, workflow, ci]
tools: [codex, claude, cursor, gemini, antigravity]
license: MIT
license_source: "https://github.com/qinghui316/ecl-harness-engineer/blob/main/LICENSE"
---

# ECL Harness Engineer
Design and create Harness Engineering infrastructure so AI agents can work reliably in a codebase.

> **Core Philosophy**: "Intelligence without infrastructure is just a demo." The Agent Harness is the Operating System — the LLM is just the CPU. The repository becomes the single source of truth — if an agent can't see it in context, it doesn't exist.

## When to Use This Skill

- Use when a repository needs AI-agent collaboration infrastructure such as `AGENTS.md`, `docs/ECL.md`, `docs/STATUS.md`, harness change tracking, or mechanical validation gates.
- Use when auditing an existing Agent Harness for missing ECL lifecycle docs, change templates, lint checks, environment contracts, or CI integration.
- Use when converting repeated agent workflow failures into repository-local documentation, tests, lint rules, or lightweight auto-evolution checks.
- Do not use for ordinary business feature implementation unless the requested work is specifically about creating or improving the repository harness.

## Limitations

- This skill creates or audits harness infrastructure; it does not replace product requirements, implementation planning, code review, or release approval for the target project.
- The generated ECL docs, linters, scripts, and CI examples must be adapted to the repository's actual stack, security model, and existing contributor workflow before enforcement.
- Auto-evolve recommendations are guidance only. Apply harness changes through normal review, validation, and rollback discipline instead of accepting them as autonomous policy changes.

## Unified Workflow

This skill follows a single unified workflow regardless of project state (empty, existing code, or existing harness). The core idea: **detect the gap between current state and target state, then fill it**.

Default to a **core ECL harness**. Core includes lightweight auto-evolve threshold checking:
closed changes are counted, a pending evolution note is generated when the threshold is reached,
and Codex applies harness improvements only through evidence, validation, scoring, and rollback.
Advanced agent-platform capabilities such as eval datasets, execution traces, durable state,
checkpoints, long-term memory, and metrics remain optional profiles only when the user explicitly
asks for agent evaluation, observability, resumable execution, or long-term memory.

This skill improves the target repository's agent harness. It does **not** implement ordinary
business features, replace the coding agent's plan mode, or create a separate requirements product.
Plan mode is useful for live discussion; ECL artifacts are the repository record that later agents,
linters, CI, and archive history can inspect.

1. **Quick Detection + Intent Confirmation** — what exists, what already passes, and what the user wants.
2. **Analysis** — architecture, harness state, environment, and project identity.
3. **Intake Review + Delta Synthesis** — classify small vs structured work, support requirement-first
   and plan-first inputs, and compute exactly what to create or update.
4. **Creation/Update** — docs, status handoff, linters, ECL/change scripts, environment config, and CI.
5. **Verification + Handoff** — run checks, attribute failures, update STATUS.md, trigger auto-evolve checks, and summarize results.

---

## Phase 1: Quick Detection + Intent Confirmation

**Goal**: In under 5 minutes, understand project state and user intent.

### 1.1 Project State Detection

Run this quick scan:

```bash
# Count files
file_count=$(find . -type f ! -path './.git/*' ! -path './node_modules/*' ! -path './vendor/*' 2>/dev/null | wc -l)
code_files=$(find . -type f \( -name "*.go" -o -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.rs" \) ! -path './.git/*' ! -path './node_modules/*' ! -path './vendor/*' 2>/dev/null | wc -l)

# Check harness components
has_agents_md=$(test -f AGENTS.md && echo "yes" || echo "no")
has_architecture=$(test -f docs/ARCHITECTURE.md && echo "yes" || echo "no")
has_linters=$(ls scripts/lint-* 2>/dev/null | wc -l)
has_harness_dir=$(test -d harness && echo "yes" || echo "no")
has_ecl_doc=$(test -f docs/ECL.md && echo "yes" || echo "no")
has_changes_dir=$(test -d harness/changes && echo "yes" || echo "no")
has_change_templates=$(test -d harness/templates/change && echo "yes" || echo "no")
has_change_script=$(ls scripts/harness-change.* 2>/dev/null | wc -l)
has_evolve_script=$(ls scripts/harness-evolve.* 2>/dev/null | wc -l)
has_ecl_lint=$(ls scripts/lint-ecl.* 2>/dev/null | wc -l)
has_encoding_lint=$(ls scripts/lint-encoding.* 2>/dev/null | wc -l)
has_makefile=$(test -f Makefile && echo "yes" || echo "no")
has_package_json=$(test -f package.json && echo "yes" || echo "no")

# Detect tech stack
if test -f go.mod; then TECH="Go"
elif test -f package.json; then TECH="TypeScript/Node.js"
elif test -f requirements.txt || test -f pyproject.toml; then TECH="Python"
else TECH="Unknown"
fi
```

### 1.2 Classify Project State

Based on detection:

| State | Criteria | Action |
|-------|----------|--------|
| **Empty** | file_count < 5 AND code_files = 0 | Guide user through project choices first |
| **Code Only** | code_files > 0 AND has_agents_md = "no" | Full analysis + core harness creation |
| **Partial Harness** | has_agents_md = "yes" AND (has_linters = 0 OR has_harness_dir = "no") | Gap analysis + fill gaps |
| **Harness Present** | Core harness components exist | Audit + improvement suggestions |

Also classify ECL readiness:

| ECL State | Criteria | Action |
|-----------|----------|--------|
| **ECL Missing** | has_ecl_doc = "no" OR has_changes_dir = "no" | Create ECL docs, change templates, and scripts |
| **ECL Partial** | ECL doc exists but scripts/templates missing | Fill ECL automation gaps |
| **ECL Ready** | docs/ECL.md, harness/changes, templates, harness-change, harness-evolve, lint-ecl, lint-encoding exist | Audit index freshness and workflow quality |

### 1.3 Baseline Verification Snapshot

For existing projects, capture a best-effort baseline before creating or updating harness files.
The baseline is for attribution only: it distinguishes pre-existing project failures from
failures introduced by harness work. It must not be used to weaken default CI.

Run only commands that already exist in the project:

| Ecosystem | Baseline commands |
|-----------|-------------------|
| TypeScript/Node.js | package scripts such as `lint`, `typecheck`, `test`, `build`; include nested package build scripts when detected |
| Go | `go test ./...`, `go build ./...`, existing `make lint` or `make test` |
| Python | existing test/lint scripts, `python -m compileall .` |

Record each command as `pass`, `fail`, or `missing`, with the short failure reason. If a command
fails before harness creation, report it later as **pre-existing project debt**, not as harness
failure. Default CI remains strict and should still include normal business gates unless the user
explicitly asks for a temporary staged rollout.

### 1.4 Intent Confirmation

Before planning changes, classify requested scope:

| Scope | Default? | Includes |
|-------|----------|----------|
| **Core harness** | Yes | AGENTS.md, docs/ECL.md, docs/STATUS.md, docs, ECL changes, lightweight auto-evolve, linters, environment contract, CI |
| **Advanced harness** | No | Core harness plus explicitly requested eval, trace, state, checkpoints, memory, or metrics |
| **Documentation only** | No | AGENTS.md and docs without linters, scripts, or CI |

When a user-confirmation tool is available, confirm scope. In Codex, use `request_user_input`.
On other platforms, use the equivalent user-choice tool. If no such tool is available, use the
detected context and record assumptions.

```json
{
  "question": "What's your priority for this harness setup?",
  "header": "Scope",
  "multiSelect": false,
  "options": [
    {
      "label": "Core harness (Recommended)",
      "description": "Project-first AGENTS.md, ECL changes, STATUS handoff, auto-evolve threshold checks, linters, environment contract, and strict CI"
    },
    {
      "label": "Advanced harness",
      "description": "Core harness plus explicitly requested eval, trace, memory, checkpoint, or metrics infrastructure"
    },
    {
      "label": "Documentation only",
      "description": "AGENTS.md and project docs only; skip linters, scripts, and CI for now"
    }
  ]
}
```

**If Empty project**, also ask for basics:

```json
{
  "question": "What tech stack for this project?",
  "header": "Tech Stack",
  "multiSelect": false,
  "options": [
    {"label": "Go", "description": "CLI tools, high-performance services, system programming"},
    {"label": "TypeScript/Node.js", "description": "Web APIs, full-stack apps, rapid prototyping"},
    {"label": "Python", "description": "Data processing, ML/AI, scripting"}
  ]
}
```

If no user-confirmation tool is available, use detected values and document assumptions:

```markdown
## Auto-Detected Context

| Field | Value | Confidence | Evidence |
|-------|-------|------------|----------|
| Tech Stack | {TECH} | High | Found {config file} |
| Project State | {state} | High | {criteria matched} |
| Scope | Core harness | Default | No user preference specified |

Proceeding with these assumptions. Tell me if any need adjustment.
```

### 1.5 ECL Work Intake Rules

When generating ECL guidance for a target project, keep the process small enough to use:

| Intake type | Criteria | Required ECL handling |
|-------------|----------|-----------------------|
| **Small Change** | Local, low-risk edits such as copy, comments, style-only tweaks, or single-file bug fixes with no interface, data, permission, architecture, or release impact | Active change optional; still record the verification command in the final response or existing task notes |
| **Structured Change** | Cross-file/module behavior, APIs, data model, permissions, architecture, validation chain, unclear requirements, or work likely to exceed 20 minutes | Use active change files and require intake/spec/plan review before implementation |

Decision tree:

1. If an active change already exists, keep using it; do not create a second active context.
2. If the change is copy, comments, README text, formatting, or an obviously local single-file fix
   with no runtime, API, data, permission, architecture, or validation-chain impact, treat it as
   Small Change.
3. If the change touches APIs, data, permissions, architecture, multiple modules, release/runtime
   behavior, or unclear requirements, treat it as Structured Change.
4. If impact is unclear, do read-only investigation first. If uncertainty remains after inspection,
   ask one high-impact question or upgrade to Structured Change; do not assume Small Change.

For structured changes, support both common entry points:

- **Requirement-first input**: extract target users/scenarios, evidence, success criteria,
  acceptance criteria, non-goals, constraints, assumptions, and risks into `spec.md`.
- **Plan-first input**: treat the user's plan as a draft, split WHAT/WHY into `spec.md` and HOW into
  `plan.md`, then ask only about high-impact gaps that affect implementation direction or acceptance.
  If the plan is complete and does not conflict with repository evidence, do not repeat a full
  interview. If it conflicts with code, docs, commands, or existing harness constraints, record the
  conflict and return to Intake Review.

Questions are allowed and expected, but must be bounded: ask at most three high-impact questions per
round. Low-risk unknowns become assumptions; high-impact unknowns become
`[NEEDS CLARIFICATION: ...]` and block implementation until resolved.

For complex structured changes, use a lightweight iteration loop rather than treating the first
spec as final:

```text
Draft Spec -> Draft Plan -> Review Gaps -> Revise Spec/Plan -> Gate -> Tasks
```

Default to at most two loops. If key gaps remain, continue up to five loops; after that, record a
blocker instead of implementing from guesses. `plan.md` must include any planning-discovered spec
gaps, because plans often expose missing acceptance, boundary, permission, data, or validation
requirements.

---

## Phase 2: Analysis

**Goal**: Deeply understand codebase architecture, harness state, and environment requirements.

### 2.1 Execution Mode

Use subagents only when the user authorized delegation and the environment supports it. Otherwise, execute the same responsibilities inline.

If using subagents, assign:

- Code architecture analysis: follow `agents/analyzer.md`; output `harness/.analysis/architecture.json`.
- Harness state audit: follow `agents/auditor.md`; output `harness/.analysis/audit.json`.
- Environment analysis: follow `references/environment-detection-guide.md`; output `harness/.analysis/environment.json`.

If working inline, produce the same three analysis artifacts or equivalent in-memory summaries before Phase 3.

### 2.2 Project Identity Extraction

For existing projects, extract target-project meaning before writing docs:
- One-sentence project identity: what it does and for whom.
- Core workflow or domain model: user/system flow, key entities, API resources, jobs, or commands.
- Primary source entrypoints and where common changes belong.

Use `README.md`, manifests, entrypoints, routes/controllers, schemas/models, and key source
directories. Harness files are not sufficient evidence for project identity.

### 2.3 Adapter Selection

After detecting the tech stack, load the matching adapter before creating linters, scripts, CI,
or environment config. Adapter guidance overrides generic templates for language-specific details.

| Detected stack | Required adapter |
|----------------|------------------|
| TypeScript/Node.js | `references/adapters/typescript.md` |
| Go | `references/adapters/go.md` |
| Python | `references/adapters/python.md` |
| Rust | `references/adapters/rust.md` |
| Java | `references/adapters/java.md` |
| Unknown/mixed | `references/adapters/generic.md` plus any detected language adapters |

For TypeScript/Node.js projects, prefer Node/TS-native outputs: `scripts/lint-deps.mjs` or
equivalent, `scripts/lint-quality.mjs`, npm/package-manager scripts, and Node/TS GitHub Actions.
Do not adapt Go linter or Makefile-only patterns to TypeScript unless the project is actually Go
or already uses Makefile as the primary command surface.

### 2.4 Command Surface Selection

Before creating ECL scripts, select the target project's command surface. Do not assume
PowerShell is the only Windows option. This selection is normally automatic; do not ask the user to
choose a script format unless project evidence conflicts or the user has already expressed a hard
constraint.

Priority:

1. Existing project entrypoints: package-manager scripts, Makefile targets, README commands,
   or CI shell conventions.
2. Explicit user/project constraints. If the project rejects `.ps1`, do not generate PowerShell
   as the only harness entrypoint.
3. Bash profile when allowed. For Windows projects that accept Bash, generate `.sh` scripts and
   document the prerequisite: Git Bash, WSL, MSYS2, or a CI Linux runner.
4. PowerShell profile when the project accepts Windows-native PowerShell. Keep it compatible with
   Windows PowerShell 5.1 and PowerShell 7.
5. Node or Python profiles when those runtimes are already first-class project dependencies.

Default when evidence is sparse: for TypeScript/Node projects choose Node/package-manager scripts;
for Windows projects that allow Bash choose Bash profile and document Git Bash/WSL/MSYS2; otherwise
choose the adapter's native lightweight scripting profile.

All profiles must implement the same ECL invariants and command set. `harness-change`,
`harness-evolve`, `lint-ecl`, and `lint-encoding` may be implemented as `.ps1`, `.sh`, `.mjs`,
or `.py`, but docs, CI, Makefile/package scripts, and verification commands must use the chosen
entrypoint consistently.

### 2.5 Wait for Analysis Completion

When subagents are running, wait for their final reports. While waiting, you can:
- Review any existing documentation
- Prepare templates for Phase 4

### 2.5 For Empty Projects

Skip Phase 2 analysis agents. Instead:
- Use templates from `references/greenfield-templates.md`
- Base decisions on user's tech stack choice
- Design a standard 3-layer architecture

---

## Phase 3: Delta Synthesis

**Goal**: Merge analysis results and compute exactly what needs to be created/updated.

### 3.1 Read Analysis Results

```bash
cat harness/.analysis/architecture.json
cat harness/.analysis/audit.json
cat harness/.analysis/environment.json
```

### 3.2 Compute Delta

Create a delta list:

```markdown
## Delta: What Needs to Be Done

### Core To Create (doesn't exist)
- [ ] AGENTS.md
- [ ] docs/ECL.md
- [ ] docs/STATUS.md
- [ ] docs/ARCHITECTURE.md
- [ ] scripts/lint-deps.go
- [ ] scripts/harness-change.{ps1|sh|mjs|py}
- [ ] scripts/harness-evolve.{ps1|sh|mjs|py}
- [ ] scripts/lint-ecl.{ps1|sh|mjs|py}
- [ ] scripts/lint-encoding.{ps1|sh|mjs|py}
- [ ] harness/changes/{active,parking,archive}
- [ ] harness/templates/change/
- [ ] harness/config/environment.json
- [ ] harness/evolution/{state.json,results.tsv,proposals/} (`pending.md` is generated later only when the archive threshold is reached)

### Optional Advanced (only if explicitly requested)
- [ ] harness/eval/ — agent evaluation datasets and runner inputs
- [ ] harness/trace/ — execution traces for agent runs
- [ ] harness/state/ — executor runtime state
- [ ] harness/checkpoints/ — resumable execution checkpoints
- [ ] harness/memory/ — long-term agent memory experiments
- [ ] harness/metrics/ — execution and quality metrics

### To Update (exists but has gaps)
- [ ] docs/DEVELOPMENT.md — missing build commands
- [ ] scripts/lint-quality.py — missing 3 packages in layer map

### Already Good (no changes needed)
- [x] Makefile — has all required targets
- [x] .github/workflows/ci.yml — properly configured
```

### 3.3 Confirm with User (if confirmation tool is available)

For significant changes:

```json
{
  "question": "I've analyzed the codebase. Ready to proceed with these changes?",
  "header": "Confirm",
  "multiSelect": false,
  "options": [
    {"label": "Yes, proceed with all", "description": "Create/update all identified items"},
    {"label": "Show me the details first", "description": "I'll explain what each change involves"},
    {"label": "Only critical items", "description": "Just P0/P1 items, skip P2/P3 for now"}
  ]
}
```

---

## Phase 4: Creation/Update

**Goal**: Create or update all harness files from the delta.

### 4.1 Execution Mode

Use subagents only when authorized and available. Otherwise, perform the same work inline. Keep write scopes disjoint if using parallel workers.

Creation responsibilities:

- Documentation: follow `agents/creator-docs.md`; create/update AGENTS.md, docs/ECL.md, docs/STATUS.md, docs/ARCHITECTURE.md, docs/DEVELOPMENT.md, and design docs. AGENTS.md is the target project's entry map, not a harness creation record. Keep the first screen project-first, but preserve ECL/current-change priority in context loading: `AGENTS.md` -> `docs/ECL.md` -> active change if present -> auto-evolve pending if present -> otherwise `docs/STATUS.md` -> task-specific project docs.
- Linters: follow `agents/creator-linters.md`; create/update dependency, quality, ECL, and encoding checks.
- Config and scripts: follow `agents/creator-config.md`; create/update environment contract, harness scripts, changes directories/templates, lightweight evolution state, harness-change, harness-evolve, Makefile targets, and CI. Create advanced directories only when the confirmed scope requires them.

ECL change templates must include `summary.md`, `spec.md`, `plan.md`, `tasks.md`, and
`reviews/review.md`. `spec.md` captures WHAT/WHY, `plan.md` captures HOW and planning-discovered
spec gaps, and `tasks.md` is generated only after the spec/plan gate is ready enough for
implementation. Do not require old archived changes to contain `plan.md`; compatibility applies to
history.

Important: do not create static verification config such as `harness/config/verify.json`. Verification plans are generated at runtime by the executor from `environment.json` and the task context.

Strict CI rule: default CI must include normal business quality gates (`lint`, `typecheck`, `test`,
`build`, and backend/package-specific equivalents when available) plus harness checks. Do not remove
or skip business gates because the baseline is red. If the baseline was already red, explain that CI
will be red until the pre-existing project issues are fixed. Generate staged or relaxed CI only when
the user explicitly asks for it.

Command surface rule: create ECL scripts for the selected profile, not a hardcoded shell. If Bash is
selected on Windows, document Git Bash, WSL, MSYS2, or CI Linux shell requirements in the generated
environment/development docs. If PowerShell is selected, detect whether `pwsh` is available; if not,
use `powershell -NoProfile -ExecutionPolicy Bypass`. PowerShell templates must be compatible with
Windows PowerShell 5.1: avoid ambiguous overloads such as `TrimStart(".\")`, and avoid non-ASCII
mojibake marker string literals in `.ps1`; represent markers by Unicode codepoint or another
PS5-safe construction.

### 4.2 For Empty Projects: Also Create Business Code Plan

For empty projects, add one more agent:

```
Agent("create-exec-plan", prompt="""
Create execution plan for business code (harness-executor will implement this):

Tech stack: {TECH}
Project type: {from user choice}
Architecture: 3-layer (Types → Core → Entry Points)

Create: docs/exec-plans/active/bootstrap-code.md

Contents:
- Full source code for initial project structure
- main.go/index.ts/main.py entry point
- Basic types and core logic
- Test files

This is for harness-executor to implement — not ecl-harness-engineer's responsibility.
""")
```

### 4.3 Wait for Creation Completion

Agents will notify when done. Collect any issues they encountered.

---

## Phase 5: Verification + Handoff

**Goal**: Ensure everything works, then hand off or present results.

### 5.1 Run Verification

```bash
# 0. Compare against the baseline snapshot
# Re-run the same existing lint/typecheck/test/build commands captured in Phase 1.

# 1. Harness checks pass
make verify-harness || npm run lint:harness || {generated_harness_lint_command}

# 2. Architecture linters pass
make lint-arch || npm run lint:arch

# 3. Business build/test gates run
go build ./... || npm run build || python -m compileall .

# 4. AGENTS.md size check
wc -l AGENTS.md  # Should be 80-120 lines

# 4b. AGENTS.md content gate
# Confirm it explains project identity, core workflow/domain model, source entrypoints,
# task-based verification, active-change-before-STATUS loading, and contains no
# ECL Harness Engineer internal boundary language.

# 5. All expected files exist
test -f AGENTS.md && echo "✓ AGENTS.md"
test -f docs/ARCHITECTURE.md && echo "✓ ARCHITECTURE.md"
test -f docs/ECL.md && echo "✓ ECL.md"
test -f docs/STATUS.md && echo "✓ STATUS.md"
test -f scripts/lint-deps* && echo "✓ lint-deps"
test -f scripts/harness-change.* && echo "✓ harness-change"
test -f scripts/lint-ecl.* && echo "✓ lint-ecl"
test -f scripts/harness-evolve.* && echo "✓ harness-evolve"
test -d harness/ && echo "✓ harness/"
test -d harness/changes && echo "✓ harness/changes"
test -f harness/evolution/state.json && echo "✓ evolution state"

# 6. Design docs exist (not just index)
find docs/design-docs -name "*.md" ! -name "index.md" | wc -l
```

Classify every verification result:

| Classification | Meaning |
|----------------|---------|
| Harness pass | Harness-created checks/files/scripts work |
| Pre-existing project failure | The same command failed in the Phase 1 baseline |
| New regression | The command passed in Phase 1 and fails after harness creation |
| Not available | The command/script does not exist in this project |

AGENTS.md content gate:
- A new agent can tell what the project does within 30 seconds.
- The core product/system workflow or domain model is visible.
- Main source entrypoints and task-to-directory mapping are visible.
- Verification guidance maps to task type.
- Context loading reads `docs/ECL.md` first, then active change when present.
- If no active change exists and `harness/evolution/pending.md` exists, read it before
  `docs/STATUS.md`, mention it as pending maintenance, and ask whether to handle it now unless the
  user already prioritized the current task. Reading or asking does not start auto-evolve and must
  not block ordinary user work.
- If no active change exists and no pending evolution exists, context loading reads `docs/STATUS.md` before task-specific project docs.
- For structured work, `docs/ECL.md` explains Small Change vs Structured Change, bounded Intake
  Review, plan-first input handling, and the spec/plan review gate.
- Archive history is loaded selectively through `docs/STATUS.md` paths or `harness/changes/INDEX.json`, starting with historical `summary.md` only.
- No skill-internal boundary leaks, such as sections or sentences that describe this skill's own scope limits as target-project rules.

### 5.2 STATUS.md Handoff Update

When a target project uses ECL changes, maintain `docs/STATUS.md` as a lightweight handoff file.
It is not the authority while an active change exists, but it becomes the default recent-history
entry point after the active change is closed.

Close-change handoff protocol:

1. Before running `harness-change close`, read the active change `summary.md`, `spec.md`,
   `plan.md`, `tasks.md`, and relevant `reviews/`; update `docs/STATUS.md` with completed work,
   verification results, residual risks, and the next recommended resume point.
2. Run the close command so the active change moves to `harness/changes/archive/...` and
   `harness/changes/INDEX.json` is rebuilt.
3. After close, update `docs/STATUS.md` again with the final archive path, normally pointing to
   the archived `summary.md`.
4. Run the harness lint command (`npm run lint:harness`, `make verify-harness`, or the generated
   ECL lint command) to confirm STATUS, ECL structure, and INDEX state are consistent.

Hooks and CI may validate `docs/STATUS.md`, but must not auto-write it or move changes.

### 5.3 Auto-Evolve Check

Core harnesses include lightweight auto-evolve by default. The script layer only detects when
enough new archive evidence exists and writes `harness/evolution/pending.md`; Codex performs the
semantic improvement pass.

Trigger model: `harness-change close` and `reindex` run `harness-evolve check`; `new` only reminds
when pending exists. Hooks and CI may warn, but must not modify docs, scripts, STATUS, or changes.
Generated scripts do not call subagents. They only count archive evidence and create pending
context. When no active change exists and Codex notices pending maintenance, it should ask the user
whether to handle it now unless the user already prioritized the current task. Asking does not start
pending evolution.

`harness/evolution/pending.md` is a maintenance reminder, not a hard lock. Reading it for context
does not start pending evolution. Pending evolution starts only when Codex creates or uses an
`auto-evolve-harness-*` change, writes an evolution proposal/result, or edits Harness files based
on the pending evidence. Once started, finish with a proposal, one `harness/evolution/results.tsv`
row, and `harness-evolve mark-complete`; otherwise park or close blocked, not completed.

Apply only the smallest evidence-backed delta that passes review. No independent scorer =
no auto-apply: user approval to handle pending implies permission to request an independent
auditor/subagent when the environment supports it. If the environment still requires explicit
authorization, ask once. If scoring is unavailable, declined, or still unauthorized after asking,
record `noop` with `eval_mode=dry_run`, keep the proposal, run `mark-complete`, and stop.
Machinery repair
(`harness-evolve`, pending templates, lint) does not complete pending evolution by itself; after
repair, still evaluate candidate archives or leave the work parked/blocked.

Detailed proposal format, scoring weights, status values, and complexity budget live in
`references/ecl-harness.md`.

### 5.4 Present Summary

```markdown
## Harness Infrastructure Complete

**Project**: {project-name}
**Tech Stack**: {TECH}
**Files Created/Updated**: {count}

### Created Files
- AGENTS.md ({N} lines)
- docs/ARCHITECTURE.md
- docs/ECL.md
- docs/STATUS.md
- docs/DEVELOPMENT.md
- docs/design-docs/{component}.md
- scripts/lint-deps.{ext}
- scripts/lint-quality.{ext}
- scripts/harness-change.{ps1|sh|mjs|py}
- scripts/lint-ecl.{ps1|sh|mjs|py}
- scripts/lint-encoding.{ps1|sh|mjs|py}
- scripts/harness-evolve.{ps1|sh|mjs|py}
- harness/config/environment.json
- harness/changes/
- harness/evolution/
- harness/templates/change/
- Makefile

### Verification Results
- Harness checks: ✓
- Architecture checks: ✓
- Business gates: ✓ or pre-existing failures listed below
- AGENTS.md size: ✓ ({N} lines)

### Pre-existing Project Failures
- {List baseline-red commands and short reasons, or "None observed."}

### New Regressions Introduced By Harness
- {List commands that passed before and failed after, or "None observed."}

### Next Steps
{For empty projects: "Run harness-executor to implement business code from docs/exec-plans/active/bootstrap-code.md"}
{For existing projects: "The harness is ready. AI agents can now use AGENTS.md as their entry point."}
```

### 5.5 Automatic Handoff (for Empty Projects)

If this was an empty project with a bootstrap exec-plan, invoke harness-executor:

```
Skill(skill="harness-executor")
```

With context: "Implement the bootstrap exec-plan at docs/exec-plans/active/bootstrap-code.md"

---

## Core Principles

### 1. Repository as Single Source of Truth

Agents cannot access Slack, Google Docs, or tribal knowledge. If it's not in the repository, it doesn't exist for the agent.

### 2. AGENTS.md is a Map, Not a Manual

Keep it 80-120 lines. Link to detailed docs, don't embed them.

### 3. Enforce Invariants Mechanically

Linter errors must be agent-actionable:
```
✗ BAD: "Forbidden import in core/types/user.go"

✓ GOOD: "core/types/user.go:15 imports core/config (layer 0 → layer 2).
         Layer 0 packages must have NO internal dependencies.

         Fix options:
         1. Move config-dependent logic to a higher layer
         2. Pass the config value as a parameter
         3. Use dependency injection via an interface"
```

### 4. Build to Delete

Every component should be replaceable. Capabilities that required complex pipelines yesterday may be single prompts tomorrow.

### 5. Start Simple

Atomic, well-documented tools > complex agent choreography. Don't over-engineer.

### 6. Change State Is Explicit

Use a single `harness/changes/active/` task for personal development. Move paused work to `parking/` and closed work to `archive/` with the generated `scripts/harness-change.*` command. Maintain `docs/STATUS.md` as the soft handoff summary after active work is closed. Never hand-edit `harness/changes/INDEX.json`; it is a generated index rebuilt by `park`, `close`, `resume`, and `reindex`. Structured changes use `spec.md` for WHAT/WHY, `plan.md` for HOW, and `tasks.md` for executable work.

### 7. Harness Evolves From Evidence

Every few closed changes, the generated `scripts/harness-evolve.* check` command may create
`harness/evolution/pending.md`. Treat it as a maintenance reminder to improve harness rules from
real archived evidence, not as a hard blocker for unrelated user work. If you start acting on the
pending evidence, first refresh `harness/changes/INDEX.json` and use the current eligible archive
window; the Candidate Archives in an old pending file are a trigger snapshot, not the only evidence.
Then finish with proposal + results.tsv + `mark-complete`, or park/block the work.
Do not turn one-off business bugs into permanent process. Keep only changes that improve the audit
score and pass validation.

---

## Reference Files

| File | When to Read | Contents |
|------|-------------|----------|
| `references/greenfield-templates.md` | Empty projects (Phase 2.5) | Complete Go/TS/Python scaffolding |
| `references/documentation-templates.md` | Phase 4 doc creation | Doc templates with numbered sections |
| `references/linter-templates.md` | Phase 4 linter creation | Linter code templates per language |
| `references/ecl-harness.md` | ECL-aware harness creation | docs/ECL.md, docs/STATUS.md, change lifecycle, INDEX.json, PowerShell script templates |
| `references/darwin-eval-prompts.md` | Skill quality evaluation | Dry-run prompts for darwin-skill review |
| `references/environment-detection-guide.md` | Phase 2 env analysis | Environment ecosystem detection |
| `references/environment-config-guide.md` | Phase 4 config creation | Startup, services, env vars, user-confirmation templates |
| `references/adapters/typescript.md` | TypeScript/Node.js projects | npm scripts, Node linters, package-manager detection, CI defaults |
| `references/adapters/{go,python,rust,java,generic}.md` | Matching detected stacks | Language-specific commands and conventions |

Agent prompts for Phase 2 and Phase 4 subagents are in `agents/`.

For small projects (< 20 files) or when subagents aren't available, execute phases inline instead of spawning agents.
