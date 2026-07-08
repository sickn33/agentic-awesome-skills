# ECL-aware Harness Reference

Use this reference when creating `docs/ECL.md`, `harness/changes`, change templates,
`harness/evolution`, `scripts/harness-change.*`, `scripts/harness-evolve.*`,
`scripts/lint-ecl.*`, and `scripts/lint-encoding.*`.

Choose the command surface from the target project before wiring docs, Makefile/package scripts, or
CI. Bash, PowerShell, Node, and Python implementations are equivalent profiles when they preserve the
same command set and invariants. For Windows projects that select Bash, document Git Bash, WSL,
MSYS2, or CI Linux shell as a prerequisite. PowerShell templates remain available for projects that
accept `.ps1`; they must support Windows PowerShell 5.1 as well as PowerShell 7.

Command surface selection is automatic. Ask the user only when project evidence conflicts, when no
reasonable runtime or shell can be inferred, or when the user has already stated a hard constraint
such as "no ps1" or "bash only".

## 1. Design Rules

### 1.1 Roles

| Artifact | Role |
|----------|------|
| `AGENTS.md` | Navigation map for agents; keep it short and link to detailed docs |
| `docs/ECL.md` | Project operating manual for change lifecycle and context loading |
| `docs/STATUS.md` | Lightweight handoff summary used only when no active change exists |
| `harness/changes/active/` | Current task context; personal development allows only one active task |
| `harness/changes/parking/` | Paused tasks that may resume later |
| `harness/changes/archive/` | Closed tasks: completed, blocked, or abandoned |
| `harness/changes/INDEX.json` | Generated search index; never hand-edit |
| `harness/evolution/state.json` | Auto-evolve threshold and last-run state |
| `harness/evolution/pending.md` | Generated instruction when enough archived evidence exists |
| `harness/evolution/results.tsv` | Darwin-style keep/revert score log for harness evolution |
| `scripts/harness-change.*` | State transition and index generation tool |
| `scripts/harness-evolve.*` | Mechanical threshold check and pending-context generator |
| `scripts/lint-ecl.*` | Mechanical ECL integrity gate |

Before implementation starts, require an approved plan review. Record it as
`plan_review: "approved"` in `summary.md` front matter or as an approved plan review in
`reviews/`. This gate prevents raw requirements from moving directly into coding.

Structured changes use plan-aware intake. If the user provides only a requirement, ask the smallest
set of high-impact questions needed to draft `spec.md`. If the user already provides a plan, review
that plan as a draft, split WHAT/WHY into `spec.md` and HOW into `plan.md`, and ask only about gaps
that affect implementation direction or acceptance. If the plan is complete and does not conflict
with repository evidence, do not restart the interview. If it conflicts with code, docs, commands,
or existing harness constraints, record the conflict and return to Intake Review. Each intake round
asks at most three questions.
Low-risk unknowns become assumptions; high-impact unknowns become `[NEEDS CLARIFICATION: ...]` and
block implementation.

### 1.2 When to create a change

Create a change when any condition applies:

- The work spans more than two files.
- The work touches APIs, databases, permissions, architecture, or cross-client behavior.
- The work needs user confirmation or plan review.
- The work needs multi-step tests or regression checks.
- The work is likely to take more than 20 minutes.
- A failure needs to be captured as a new constraint, task, or regression.

Small, local fixes can skip `harness/changes` if the final response records validation.
Evidence, non-goals, options, and plan review are mandatory for non-trivial active changes. Small
local fixes that skip a change do not need the full template, but the final response must still
record assumptions and validation.

Decision tree:

1. Existing active change: keep using it; do not create another active context.
2. Small Change: copy, comments, README text, formatting, or an obviously local single-file fix with
   no runtime, API, data, permission, architecture, or validation-chain impact.
3. Structured Change: APIs, data, permissions, architecture, multiple modules, release/runtime
   behavior, unclear requirements, or work likely to exceed 20 minutes.
4. Unclear impact: inspect read-only first. If uncertainty remains, ask one high-impact question or
   upgrade to Structured Change; do not assume Small Change.

### 1.3 Change lifecycle

```text
new -> active/in_progress
active -> close completed -> archive/YYYY-MM-DD-slug
active -> close abandoned -> archive/YYYY-MM-DD-slug
active -> close blocked -> archive/YYYY-MM-DD-slug
active -> park -> parking/YYYY-MM-DD-slug
parking/YYYY-MM-DD-slug -> resume -> active
```

Rules:

- `active/` has no persistent change id. The id is created only when parking or closing.
- Starting a new task must never overwrite an existing active task.
- `INDEX.json` is derived from `parking/*/summary.md` and `archive/*/summary.md`.
- `harness/evolution/pending.md` is generated only after enough new archived changes accumulate.
- Hook and CI may validate, but must not auto-write docs or move changes.
- `docs/STATUS.md` is a handoff summary, not a change record. Active change files always
  override it for the current task.

Close-change STATUS protocol:

1. Before closing active work, update `docs/STATUS.md` from active `summary.md`, `spec.md`,
   `plan.md`, `tasks.md`, and relevant `reviews/` with completed work, validation, residual risks, and
   the next resume point.
2. Run the generated `scripts/harness-change.* close <completed|blocked|abandoned>` command so the active change
   moves to `archive/` and `INDEX.json` is rebuilt.
3. After close, update `docs/STATUS.md` with the final archive `summary.md` path.
4. Run `scripts/harness-evolve.* check` through `harness-change.* close`; if the threshold is
   reached, it creates `harness/evolution/pending.md` but does not edit docs or scripts.
5. Run the generated harness lint command. CI and hooks may validate STATUS, but must not
   update it automatically.

### 1.4 Auto-evolve lifecycle

Core ECL includes auto-evolve threshold checking by default. This is not the advanced eval,
observability, or long-term memory profile. It is a small loop that learns from closed changes:

```text
close/reindex -> count eligible archive evidence -> generate pending.md when threshold reached
pending.md + no active change -> Codex asks whether to handle pending maintenance now
started pending evolution -> proposal -> independent scoring or dry_run -> verify -> results.tsv -> mark-complete
```

Rules:

- `scripts/harness-evolve.*` only performs mechanical counting and pending generation.
- `harness/evolution/pending.md` is a maintenance reminder, not a hard lock. Reading it for context
  does not start pending evolution and must not block ordinary user work.
- When no active change exists and pending maintenance is present, Codex should ask the user whether
  to handle it now unless the user already prioritized the current task. A user yes starts the
  pending evolution flow; a no leaves pending in place and ordinary work continues.
- Pending evolution starts when Codex creates or uses an `auto-evolve-harness-*` change, writes an
  evolution proposal/result, or edits Harness files based on pending evidence.
- Generated scripts do not call subagents. They create pending context; the Codex run that handles
  pending evolution requests an independent auditor/subagent when available. User approval to handle
  pending implies permission to request independent review; if the environment still requires
  explicit authorization, ask once before falling back.
- Codex performs semantic extraction and file edits, inside a dedicated active change.
- Once pending evolution starts, Codex must finish with a proposal, one `results.tsv` row, and
  `harness-evolve mark-complete`; otherwise park or close blocked, not completed.
- Codex must write a proposal before editing harness files. Rejected or no-op candidates stay in
  the proposal and must not enter AGENTS.md, ECL, STATUS, lint, or CI.
- Auto-apply requires independent auditor/subagent scoring. If independent scoring is unavailable,
  declined, or still unauthorized after asking, record `noop` with `eval_mode=dry_run`, keep the
  proposal, run `mark-complete`, and do not auto-apply the delta.
- No independent scorer = no auto-apply.
- Machinery repair (`harness-evolve`, pending templates, lint) is allowed as a prerequisite but does
  not complete pending evolution by itself. After repair, evaluate candidate archives or park/block.
- Before evaluating candidates, rebuild `harness/changes/INDEX.json` and use the current eligible
  archive window. Candidate Archives inside an older pending file are a trigger snapshot, not the
  only allowed evidence.
- Complexity budget: prefer clarifying or replacing existing rules over adding new sections. If an
  idea can be expressed by editing an existing paragraph, do not create a new document, directory,
  script, or workflow.
- AGENTS.md must not carry auto-evolve details; it only points to the pending context when present.
- If active work exists, finish or park it before executing pending evolution.
- Every durable new rule must cite archived change evidence.
- One-off business bugs are not enough to create permanent harness rules.
- The default auto-evolve path must not create `harness/eval`, `harness/trace`, `harness/state`,
  `harness/checkpoints`, `harness/memory`, or `harness/metrics`.
- A delta is kept only when hard gates pass, score is at least 80, independent review passes, and
  validation passes; otherwise log `noop` for reviewed evidence with no durable rule, `rejected`
  for proposals that fail hard gates before apply, or revert the failed applied delta and log
  `revert` in `harness/evolution/results.tsv`. Every started pending evolution ends with
  `harness-evolve mark-complete` or stays parked/blocked.

Auto-evolve scoring:

| Dimension | Weight |
|-----------|-------:|
| Evidence grounding | 30 |
| Project relevance | 25 |
| Mechanical enforceability | 15 |
| Regression safety | 20 |
| Context cost | 10 |

`results.tsv` status values are `keep`, `revert`, `rejected`, and `noop`. Prefer `noop` for
reviewed candidates that yield no durable harness rule. Use
`eval_mode=independent_review` when a separate auditor/subagent scored the proposal and
`eval_mode=dry_run` when independent scoring was unavailable, declined, or still unauthorized after
asking. The `note` field must explain why a candidate was rejected, no-op'd, or reverted.

Minimal proposal template:

```markdown
# Harness Auto-Evolve Proposal

## Accepted Candidates

- [candidate] — evidence: `harness/changes/archive/.../summary.md`

## Rejected Candidates

- [candidate] — reason: [no archive evidence / not project-relevant / too broad / too costly]

## Evidence

- `harness/changes/archive/.../summary.md`

## Project Relevance

- Files/modules/commands/failures/user corrections:

## Target Files

- [existing harness file to edit]

## Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| Evidence grounding /30 |  |  |
| Project relevance /25 |  |  |
| Mechanical enforceability /15 |  |  |
| Regression safety /20 |  |  |
| Context cost /10 |  |  |

## Validation

- Harness checks:
- Relevant business gates:

## Decision

- keep / revert / rejected / noop:
- eval_mode:
- results.tsv note:
```

## 2. Default Change Template

Use the 5-file template by default for new active changes. Old archived changes that only have the
previous 4-file template remain valid and must not fail compatibility checks solely because
`plan.md` is absent.

```text
harness/changes/active/
  summary.md
  spec.md
  plan.md
  tasks.md
  reviews/
```

### 2.1 `summary.md`

```markdown
---
title: "{{TITLE}}"
slug: "{{SLUG}}"
status: "in_progress"
location: "active"
phase: "intake"
intake_status: "pending"
spec_review: "pending"
plan_review: "pending"
modules: []
files: []
tags: []
validation_status: "unknown"
created_at: "{{DATE}}"
updated_at: "{{DATE}}"
---

# Summary

## Outcome

Pending.

## Decisions

- Pending.

## Validation

- Pending.

## Next Step

- Run Intake Review, then update `spec.md` and `plan.md`.
```

### 2.2 `spec.md`

```markdown
# Spec

## Intake Review

- Intake type: Small Change | Structured Change
- Input shape: requirement-first | plan-first | mixed
- Questions asked this round: 0

## Goal And Evidence

- Real problem or user request:
- Current behavior:
- Source of evidence:

## User Scenarios And Success

- Primary user/system scenario:
- Success criteria:
- Acceptance criteria:

## Non-Goals

- Pending.

## Constraints

- Pending.

## Assumptions

- Pending.

## Open Questions

- [NEEDS CLARIFICATION: Replace with a specific high-impact question, or remove before implementation.]

## Resolved Clarifications

- Pending.
```

### 2.3 `plan.md`

```markdown
# Plan

## Technical Approach

- Pending.

## Impacted Modules And Files

- Pending.

## Interfaces, Data, Permissions

- Pending.

## Spec Gaps Found From Planning

- Pending.

## Risks And Mitigations

- Pending.

## Verification Plan

- Pending.
```

### 2.4 `tasks.md`

```markdown
# Tasks

## Format

- `- [ ] T001 [P?] [US?] Action with target path and validation note`
- `[P]` means parallel-safe. `[US1]` maps to a user story when stories exist.

## Setup / Intake

- [ ] T001 Review `spec.md` and `plan.md` gates before implementation.

## Implementation

- [ ] T002 Pending implementation task with target path.

## Validation

- [ ] T003 Pending validation task with command or scenario.

## Deferred Tasks

- None.
```

### 2.5 `reviews/review.md`

```markdown
# Review

## Intake Review

- Status: pending
- Notes:

## Spec Review

- Status: pending
- Open high-impact clarifications:
- WHAT/HOW separation:

## Plan Review

- Status: pending
- Spec gaps found from planning:

## Code Review

- Status: pending

## Validation Review

- Status: pending
```

Complex tasks may split `spec.md`, `plan.md`, or `tasks.md` into focused supporting files only when
the single files become hard to navigate. Do not split small or ordinary changes by default.

### 2.6 Short response examples

Small Change final response:

```markdown
Updated the README typo. I treated this as a Small Change because it only touched documentation copy
and had no runtime, API, data, permission, or architecture impact.

Verification: reviewed the README diff.
```

Structured blocker response:

```markdown
I cannot safely move this to implementation yet. The draft plan leaves high-impact gaps:

1. Which roles or actors must be supported?
2. Which resources/actions require enforcement?
3. What acceptance scenario proves the change works?

I would record these in `spec.md` as `[NEEDS CLARIFICATION: ...]` and keep `plan_review: pending`.
```

Complete plan accepted response:

```markdown
The provided plan includes goal, acceptance criteria, non-goals, constraints, verification commands,
and no conflicts with repository evidence. I would split it into `spec.md` for WHAT/WHY, `plan.md`
for HOW, generate `tasks.md`, and proceed without another intake interview.
```

## 3. Context Loading

Load context progressively:

1. `AGENTS.md`
2. `docs/ECL.md`
3. If active exists: `harness/changes/active/summary.md`
4. If active exists: `harness/changes/active/spec.md`, `plan.md`, `tasks.md`, and relevant `reviews/`
5. If no active exists and `harness/evolution/pending.md` exists: read it before `docs/STATUS.md`,
   mention it as pending maintenance, and ask whether to handle it now unless the user already
   prioritized the current task. Asking or reading does not start auto-evolve.
6. If no active exists and no pending evolution exists: `docs/STATUS.md`
7. Relevant architecture, design, API, or reference docs for the task
8. `harness/changes/INDEX.json` only when selecting historical context
9. Selected archived `summary.md` files only
10. Selected archived spec/plan/tasks/reviews only for explicit resume, review, failure debugging, or auto-evolve evidence extraction

The normal path reads current task context and stable docs. If active change exists, do not use
`docs/STATUS.md` as authority. Archive history is never loaded wholesale. Search or read history
only when the user asks to continue prior work, STATUS points to an archive path, the current task
matches INDEX modules/files/tags, a current failure matches historical validation notes, or
`harness/evolution/pending.md` records a bounded trigger snapshot. When processing starts, refresh
`harness/changes/INDEX.json` and use the current eligible archive window.

## 4. `docs/ECL.md` Required Contents

Create `docs/ECL.md` with these sections:

1. Purpose and scope
2. When to create a change
3. Change lifecycle and state transitions
4. Stage-boundary update protocol
5. Plan review gate before implementation
6. Context loading order
7. STATUS handoff update before and after closing active work
8. Selective archive loading through STATUS and `INDEX.json`
9. Failure feedback and regression capture
10. Auto-evolve threshold checking and pending handling
11. Script command reference
12. Rule: `INDEX.json` is generated by script only

Keep philosophy brief. This is an operating manual.

## 5. Command Surface Profiles

Select one script profile and wire all docs, CI, Makefile targets, and package-manager scripts to
that profile. Do not mix profiles unless the project deliberately exposes aliases to the same
implementation. Choose automatically from project evidence; do not stop for human selection unless
the evidence is contradictory or no supported profile is available.

Supported profiles:

- **Bash profile**: use `.sh` scripts and commands such as `bash scripts/lint-ecl.sh`. On Windows,
  document Git Bash, WSL, MSYS2, or CI Linux shell as a prerequisite.
- **PowerShell profile**: use `.ps1` scripts. Detect whether `pwsh` is available before wiring
  commands; if it is not, use `powershell -NoProfile -ExecutionPolicy Bypass`.
- **Node profile**: use `.mjs` scripts when TypeScript/Node is already the primary project runtime.
- **Python profile**: use `.py` scripts when Python is already a primary project runtime.

Every profile must implement the same commands and invariants:

- `harness-change`: `new`, `status`, `validate`, `park`, `resume`, `close`, `search`, `context`,
  `reindex`, and `index-json`.
- `harness-evolve`: `check`, `collect`, and `mark-complete`.
- `lint-ecl`: active change structure, STATUS presence, completed validation, pending task
  consistency, generated index freshness, and auto-evolve state presence.
- `lint-encoding`: UTF-8 and mojibake-risk checks for source and docs.
- `close` and `reindex` must trigger `harness-evolve check`; hooks and CI may validate but must not
  rewrite docs, move changes, or update STATUS.

### PowerShell Profile Templates

Use these templates only when the selected command surface is PowerShell. Keep them compatible with
Windows PowerShell 5.1 and PowerShell 7; avoid non-ASCII marker literals and ambiguous method
overloads in `.ps1` templates.

### 5.1 `scripts/harness-change.ps1`

```powershell
param(
  [Parameter(Position = 0)]
  [ValidateSet("new", "status", "validate", "park", "resume", "close", "search", "context", "reindex", "index-json")]
  [string]$Command,

  [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Changes = Join-Path $Root "harness/changes"
$Active = Join-Path $Changes "active"
$Parking = Join-Path $Changes "parking"
$Archive = Join-Path $Changes "archive"
$IndexPath = Join-Path $Changes "INDEX.json"
$Template = Join-Path $Root "harness/templates/change"
$Evolution = Join-Path $Root "harness/evolution"
$EvolutionPending = Join-Path $Evolution "pending.md"
$HarnessEvolve = Join-Path $Root "scripts/harness-evolve.ps1"

function Ensure-Dirs {
  foreach ($dir in @($Changes, $Active, $Parking, $Archive, $Template, (Join-Path $Template "reviews"), $Evolution, (Join-Path $Evolution "proposals"))) {
    if (-not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Path $dir | Out-Null
    }
  }
}

function Get-DateText {
  return (Get-Date).ToString("yyyy-MM-dd")
}

function ConvertTo-Slug([string]$Text) {
  $slug = $Text.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "change" }
  return $slug
}

function Read-Text([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -Encoding UTF8 -Raw -LiteralPath $Path
}

function Write-Text([string]$Path, [string]$Content) {
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }
  Set-Content -Encoding UTF8 -LiteralPath $Path -Value $Content
}

function Parse-FrontMatter([string]$Path) {
  $text = Read-Text $Path
  $result = @{}
  if (-not $text.StartsWith("---")) { return $result }
  $lines = $text -split "`r?`n"
  for ($i = 1; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -eq "---") { break }
    if ($lines[$i] -match "^\s*([^:#]+):\s*(.*)\s*$") {
      $key = $Matches[1].Trim()
      $value = $Matches[2].Trim().Trim('"')
      if ($value -match "^\[(.*)\]$") {
        $items = $Matches[1].Split(",") | ForEach-Object { $_.Trim().Trim('"') } | Where-Object { $_ }
        $result[$key] = @($items)
      } else {
        $result[$key] = $value
      }
    }
  }
  return $result
}

function Set-FrontMatterValues([string]$Path, [hashtable]$Values) {
  $text = Read-Text $Path
  if (-not $text.StartsWith("---")) { throw "$Path has no front matter." }
  foreach ($key in $Values.Keys) {
    $value = $Values[$key]
    $line = if ($value -is [array]) {
      $quoted = $value | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }
      "${key}: [" + ($quoted -join ", ") + "]"
    } else {
      "${key}: `"$value`""
    }
    if ($text -match "(?m)^$([regex]::Escape($key)):\s*.*$") {
      $text = [regex]::Replace($text, "(?m)^$([regex]::Escape($key)):\s*.*$", [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $line }, 1)
    } else {
      $lines = $text -split "`r?`n"
      for ($i = 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -eq "---") {
          $before = @($lines[0..($i - 1)])
          $after = @($lines[$i..($lines.Length - 1)])
          $text = (@($before + $line + $after) -join "`n")
          break
        }
      }
    }
  }
  Write-Text $Path $text
}

function Get-SectionLines([string]$Path, [string]$Heading) {
  $text = Read-Text $Path
  if (-not $text) { return @() }
  $lines = $text -split "`r?`n"
  $found = $false
  $items = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line -match "^##\s+$([regex]::Escape($Heading))\s*$") {
      $found = $true
      continue
    }
    if ($found -and $line -match "^##\s+") { break }
    if ($found -and $line.Trim()) {
      $items.Add($line.Trim())
    }
  }
  return @($items)
}

function Get-ValidationStatus([string]$SummaryPath, [hashtable]$Meta) {
  if ($Meta.ContainsKey("validation_status") -and $Meta["validation_status"]) {
    return $Meta["validation_status"]
  }
  $validation = (Get-SectionLines $SummaryPath "Validation") -join " "
  if ($validation -match "(?i)\bpass(ed)?\b|success|ok") { return "pass" }
  if ($validation -match "(?i)\bfail(ed)?\b|error|blocked") { return "fail" }
  return "unknown"
}

function Get-IndexEntries {
  $entries = New-Object System.Collections.Generic.List[object]
  foreach ($pair in @(@("parking", $Parking), @("archive", $Archive))) {
    $location = $pair[0]
    $base = $pair[1]
    if (-not (Test-Path -LiteralPath $base)) { continue }
    Get-ChildItem -LiteralPath $base -Directory | ForEach-Object {
      $summary = Join-Path $_.FullName "summary.md"
      if (-not (Test-Path -LiteralPath $summary)) { return }
      $meta = Parse-FrontMatter $summary
      $decisions = Get-SectionLines $summary "Decisions" | Where-Object { $_ -notmatch "Pending" }
      $relativePath = (Resolve-Path -LiteralPath $_.FullName -Relative).TrimStart([char[]]@(".", "\"))
      $entries.Add([ordered]@{
        id = $_.Name
        title = $meta["title"]
        status = $meta["status"]
        location = $location
        modules = @($meta["modules"])
        files = @($meta["files"])
        tags = @($meta["tags"])
        decisions = @($decisions)
        validation_status = Get-ValidationStatus $summary $meta
        path = ($relativePath -replace "\\", "/")
        updated_at = $meta["updated_at"]
      })
    }
  }
  return $entries.ToArray()
}

function Get-IndexJson {
  $entries = Get-IndexEntries
  if ($entries.Count -eq 0) { return "[]`n" }
  $json = $entries | ConvertTo-Json -Depth 8
  return ($json + "`n")
}

function Reindex {
  Ensure-Dirs
  $entries = Get-IndexEntries
  Write-Text $IndexPath (Get-IndexJson)
  Write-Output "Rebuilt harness/changes/INDEX.json ($($entries.Count) entries)."
}

function Invoke-EvolutionCheck([string]$Reason) {
  if (-not (Test-Path -LiteralPath $HarnessEvolve)) { return }
  try {
    & $HarnessEvolve check -Reason $Reason
  } catch {
    Write-Warning "Auto-evolve check failed: $($_.Exception.Message)"
  }
}

function Show-EvolutionReminder {
  if (Test-Path -LiteralPath $EvolutionPending) {
    Write-Warning "Harness evolution is pending: harness/evolution/pending.md"
  }
}

function Assert-NoActive {
  $summary = Join-Path $Active "summary.md"
  if (Test-Path -LiteralPath $summary) {
    throw "Active change exists. Run 'status', then 'park', 'close', or finish it before starting a new change."
  }
}

function New-Change([string]$Title) {
  Ensure-Dirs
  if ([string]::IsNullOrWhiteSpace($Title)) { throw "Missing title." }
  Assert-NoActive
  $date = Get-DateText
  $slug = ConvertTo-Slug $Title
  Write-Text (Join-Path $Active "summary.md") @"
---
title: "$Title"
slug: "$slug"
status: "in_progress"
location: "active"
phase: "intake"
intake_status: "pending"
spec_review: "pending"
plan_review: "pending"
modules: []
files: []
tags: []
validation_status: "unknown"
created_at: "$date"
updated_at: "$date"
---

# Summary

## Outcome

Pending.

## Decisions

- Pending.

## Validation

- Pending.

## Next Step

- Run Intake Review, then update ``spec.md`` and ``plan.md``.
"@
  Write-Text (Join-Path $Active "spec.md") @"
# Spec

## Intake Review

- Intake type: Small Change | Structured Change
- Input shape: requirement-first | plan-first | mixed
- Questions asked this round: 0

## Goal And Evidence

- Real problem or user request:
- Current behavior:
- Source of evidence:

## User Scenarios And Success

- Primary user/system scenario:
- Success criteria:
- Acceptance criteria:

## Non-Goals

- Pending.

## Constraints

- Pending.

## Assumptions

- Pending.

## Open Questions

- [NEEDS CLARIFICATION: Replace with a specific high-impact question, or remove before implementation.]

## Resolved Clarifications

- Pending.
"@
  Write-Text (Join-Path $Active "plan.md") @"
# Plan

## Technical Approach

- Pending.

## Impacted Modules And Files

- Pending.

## Interfaces, Data, Permissions

- Pending.

## Spec Gaps Found From Planning

- Pending.

## Risks And Mitigations

- Pending.

## Verification Plan

- Pending.
"@
  Write-Text (Join-Path $Active "tasks.md") @"
# Tasks

## Format

- ``- [ ] T001 [P?] [US?] Action with target path and validation note``
- ``[P]`` means parallel-safe. ``[US1]`` maps to a user story when stories exist.

## Setup / Intake

- [ ] T001 Review ``spec.md`` and ``plan.md`` gates before implementation.

## Implementation

- [ ] T002 Pending implementation task with target path.

## Validation

- [ ] T003 Pending validation task with command or scenario.

## Deferred Tasks

- None.
"@
  Write-Text (Join-Path $Active "reviews/review.md") @"
# Review

## Intake Review

- Status: pending
- Notes:

## Spec Review

- Status: pending
- Open high-impact clarifications:
- WHAT/HOW separation:

## Plan Review

- Status: pending
- Spec gaps found from planning:

## Code Review

- Status: pending

## Validation Review

- Status: pending
"@
  Write-Output "Created active change: $Title"
  Show-EvolutionReminder
}

function Validate-Change([string]$Dir) {
  $required = @("summary.md", "spec.md", "tasks.md")
  $isActive = ((Resolve-Path -LiteralPath $Dir).Path -eq (Resolve-Path -LiteralPath $Active).Path)
  if ($isActive) {
    $required = @("summary.md", "spec.md", "plan.md", "tasks.md")
  }
  foreach ($file in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $Dir $file))) {
      throw "Missing $file in $Dir"
    }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Dir "reviews"))) {
    throw "Missing reviews/ in $Dir"
  }
  $summary = Join-Path $Dir "summary.md"
  $meta = Parse-FrontMatter $summary
  $status = $meta["status"]
  if (-not $status) { throw "summary.md missing status front matter." }
  $phase = $meta["phase"]
  $planReview = $meta["plan_review"]
  $spec = Read-Text (Join-Path $Dir "spec.md")
  $reviewText = ""
  $reviewPath = Join-Path $Dir "reviews/review.md"
  if (Test-Path -LiteralPath $reviewPath) { $reviewText = Read-Text $reviewPath }
  $tasks = Read-Text (Join-Path $Dir "tasks.md")
  if ($isActive -and $phase -match "^(implement|validate|done)$" -and $spec -match "\[NEEDS CLARIFICATION:") {
    throw "spec.md has high-impact [NEEDS CLARIFICATION] markers. Resolve them or move the change back to intake/plan before implementation."
  }
  if ($isActive -and $phase -match "^(implement|validate|done)$" -and $planReview -ne "approved" -and $reviewText -notmatch "(?is)Plan Review.*Status:\s*approved") {
    throw "summary.md plan_review must be approved before implementation. Record plan approval in summary.md or reviews/review.md."
  }
  if ($isActive -and $tasks -match "(?m)^- \[[ xX]\] (?!T\d{3})" -and $tasks -notmatch "## Deferred Tasks") {
    throw "tasks.md task lines must use T### ids with target paths and validation notes so agents can execute them predictably."
  }
  if ($status -eq "completed") {
    $validation = Get-ValidationStatus $summary $meta
    if ($validation -ne "pass") { throw "completed change must have validation_status: pass or a passing Validation section." }
    if ($tasks -match "- \[ \] " -and $tasks -notmatch "## Deferred Tasks\s+(\r?\n)+-\s+(None|Deferred|Explained)") {
      throw "completed change has pending tasks without a Deferred Tasks explanation."
    }
  }
}

function Show-Status {
  Ensure-Dirs
  $summary = Join-Path $Active "summary.md"
  if (-not (Test-Path -LiteralPath $summary)) {
    Write-Output "No active change."
    return
  }
  $meta = Parse-FrontMatter $summary
  Write-Output "Active: $($meta["title"])"
  Write-Output "Status: $($meta["status"])"
  Write-Output "Phase: $($meta["phase"])"
}

function New-ClosedId([hashtable]$Meta) {
  $date = Get-DateText
  if ($Meta["updated_at"] -match "^\d{4}-\d{2}-\d{2}$") { $date = $Meta["updated_at"] }
  $slug = $Meta["slug"]
  if (-not $slug) { $slug = ConvertTo-Slug $Meta["title"] }
  $id = "$date-$slug"
  return $id
}

function Move-Active([string]$TargetBase, [string]$Status, [string]$Reason) {
  Ensure-Dirs
  $summary = Join-Path $Active "summary.md"
  if (-not (Test-Path -LiteralPath $summary)) { throw "No active change." }
  $meta = Parse-FrontMatter $summary
  if ($TargetBase -eq $Archive -and $Status -notin @("completed", "blocked", "abandoned")) {
    throw "close status must be completed, blocked, or abandoned."
  }
  if ($Status -eq "completed") { Validate-Change $Active }
  $targetLocation = if ($TargetBase -eq $Parking) { "parking" } else { "archive" }
  $newStatus = if ($TargetBase -eq $Parking) { "parked" } else { $Status }
  Set-FrontMatterValues $summary @{
    status = $newStatus
    location = $targetLocation
    updated_at = (Get-DateText)
  }
  if ($Reason) {
    Add-Content -Encoding UTF8 -LiteralPath $summary -Value "`n## Transition Note`n`n- $Reason`n"
  }
  $meta = Parse-FrontMatter $summary
  $id = New-ClosedId $meta
  $target = Join-Path $TargetBase $id
  $n = 2
  while (Test-Path -LiteralPath $target) {
    $target = Join-Path $TargetBase "$id-$n"
    $n++
  }
  Move-Item -LiteralPath $Active -Destination $target
  New-Item -ItemType Directory -Path $Active | Out-Null
  Reindex
  if ($TargetBase -eq $Archive) { Invoke-EvolutionCheck "close" }
  Write-Output "Moved active change to $target"
}

function Resume-Change([string]$Id) {
  Ensure-Dirs
  Assert-NoActive
  $source = Join-Path $Parking $Id
  if (-not (Test-Path -LiteralPath $source)) { throw "Parking change not found: $Id" }
  $summary = Join-Path $source "summary.md"
  if (Test-Path -LiteralPath $summary) {
    Set-FrontMatterValues $summary @{
      status = "in_progress"
      location = "active"
      updated_at = (Get-DateText)
    }
  }
  Move-Item -LiteralPath $source -Destination $Active
  Reindex
  Write-Output "Resumed $Id into active. Run validate before continuing."
}

function Search-Index([string]$Query) {
  if (-not (Test-Path -LiteralPath $IndexPath)) { Reindex }
  $items = Get-Content -Encoding UTF8 -Raw -LiteralPath $IndexPath | ConvertFrom-Json
  $items | Where-Object { ($_ | ConvertTo-Json -Depth 8) -match [regex]::Escape($Query) } |
    Select-Object id,title,status,location,path,validation_status | Format-Table -AutoSize
}

function Show-Context {
  Write-Output "Required:"
  foreach ($p in @("AGENTS.md", "docs/ECL.md", "harness/changes/active/summary.md", "harness/changes/active/spec.md", "harness/changes/active/plan.md", "harness/changes/active/tasks.md")) {
    if (Test-Path -LiteralPath (Join-Path $Root $p)) { Write-Output "- $p" }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Root "harness/changes/active/summary.md")) -and
      (Test-Path -LiteralPath $EvolutionPending)) {
    Write-Output "- harness/evolution/pending.md"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Root "harness/changes/active/summary.md")) -and
      (Test-Path -LiteralPath (Join-Path $Root "docs/STATUS.md"))) {
    Write-Output "- docs/STATUS.md"
  }
  Write-Output ""
  Write-Output "History index:"
  if (Test-Path -LiteralPath $IndexPath) { Write-Output "- harness/changes/INDEX.json" } else { Write-Output "- Run scripts/harness-change.ps1 reindex" }
}

Ensure-Dirs
switch ($Command) {
  "new" { New-Change ($Args -join " ") }
  "status" { Show-Status }
  "validate" { Validate-Change $Active; Write-Output "ECL active change is valid." }
  "park" { Move-Active $Parking "parked" ($Args -join " ") }
  "resume" { Resume-Change $Args[0] }
  "close" { Move-Active $Archive $Args[0] "" }
  "search" { Search-Index ($Args -join " ") }
  "context" { Show-Context }
  "reindex" { Reindex; Invoke-EvolutionCheck "reindex" }
  "index-json" { Write-Output (Get-IndexJson) }
  default { throw "Command required: new/status/validate/park/resume/close/search/context/reindex" }
}
```

### 5.2 `scripts/harness-evolve.ps1`

```powershell
param(
  [Parameter(Position = 0)]
  [ValidateSet("check", "collect", "mark-complete")]
  [string]$Command = "check",

  [int]$Threshold = 5,
  [int]$Window = 10,
  [string]$Reason = "manual"
)

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Changes = Join-Path $Root "harness/changes"
$IndexPath = Join-Path $Changes "INDEX.json"
$Evolution = Join-Path $Root "harness/evolution"
$StatePath = Join-Path $Evolution "state.json"
$PendingPath = Join-Path $Evolution "pending.md"
$ResultsPath = Join-Path $Evolution "results.tsv"
$Proposals = Join-Path $Evolution "proposals"

function Ensure-EvolutionDirs {
  foreach ($dir in @($Evolution, $Proposals)) {
    if (-not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Path $dir | Out-Null
    }
  }
}

function Write-Text([string]$Path, [string]$Content) {
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }
  Set-Content -Encoding UTF8 -LiteralPath $Path -Value $Content
}

function Read-State {
  Ensure-EvolutionDirs
  if (-not (Test-Path -LiteralPath $StatePath)) {
    $initial = [ordered]@{
      enabled = $true
      threshold = $Threshold
      window = $Window
      last_evolved_archive_count = 0
      last_evolved_change_id = $null
      last_score = $null
      last_run_at = $null
      pending = $false
    }
    Write-Text $StatePath (($initial | ConvertTo-Json -Depth 5) + "`n")
  }
  return Get-Content -Encoding UTF8 -Raw -LiteralPath $StatePath | ConvertFrom-Json
}

function Write-State($State) {
  Write-Text $StatePath (($State | ConvertTo-Json -Depth 8) + "`n")
}

function Test-AutoEvolveArchive($Item) {
  $id = [string]$Item.id
  if ($id -match "^auto-evolve-harness-") { return $true }
  foreach ($tag in @($Item.tags)) {
    if ([string]$tag -eq "auto-evolve") { return $true }
  }
  return $false
}

function Get-ArchiveItems {
  if (-not (Test-Path -LiteralPath $IndexPath)) {
    throw "Missing harness/changes/INDEX.json. Run scripts/harness-change.ps1 reindex first."
  }
  $raw = Get-Content -Encoding UTF8 -Raw -LiteralPath $IndexPath
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  $parsed = $raw | ConvertFrom-Json
  $items = @($parsed | ForEach-Object { $_ })
  return @($items | Where-Object {
    $_.location -eq "archive" -and -not (Test-AutoEvolveArchive $_)
  } | Sort-Object updated_at, id)
}

function Ensure-ResultsHeader {
  if (-not (Test-Path -LiteralPath $ResultsPath)) {
    Write-Text $ResultsPath "timestamp`tchange_id`told_score`tnew_score`tstatus`tdimension`tnote`teval_mode`n"
  }
}

function Add-ResultRow([string]$ChangeId, [string]$OldScore, [string]$NewScore, [string]$Status, [string]$Dimension, [string]$Note, [string]$EvalMode) {
  Ensure-ResultsHeader
  if ($Status -notin @("keep", "revert", "rejected", "noop")) {
    throw "status must be keep, revert, rejected, or noop."
  }
  if ($EvalMode -notin @("independent_review", "dry_run", "full_test")) {
    throw "eval_mode must be independent_review, dry_run, or full_test."
  }
  $timestamp = (Get-Date).ToString("s")
  $line = @($timestamp, $ChangeId, $OldScore, $NewScore, $Status, $Dimension, ($Note -replace "`t", " "), $EvalMode) -join "`t"
  Add-Content -Encoding UTF8 -LiteralPath $ResultsPath -Value $line
}

function New-Pending([object[]]$ArchiveItems, $State, [string]$TriggerReason) {
  if (Test-Path -LiteralPath $PendingPath) {
    Write-Output "Harness evolution already pending: harness/evolution/pending.md"
    return
  }
  $candidateItems = @($ArchiveItems | Select-Object -Last $State.window)
  $candidateLines = @()
  foreach ($item in $candidateItems) {
    $path = [string]$item.path
    if (-not $path) { $path = "harness/changes/archive/$($item.id)" }
    $candidateLines += "- $path/summary.md"
  }
  $now = (Get-Date).ToString("s")
  $content = @'
# Harness Evolution Pending

Generated at: {{NOW}}

## Trigger

- Reason: {{TRIGGER_REASON}}
- Eligible archived changes since last evolution: {{DELTA}}
- Threshold: {{THRESHOLD}}
- Scan window: {{WINDOW}}
- INDEX source: harness/changes/INDEX.json
- Excludes: archive ids beginning with auto-evolve-harness- and archives tagged auto-evolve

## Candidate Archives

{{CANDIDATE_LINES}}

These candidates are the trigger snapshot. Before processing, rebuild `harness/changes/INDEX.json`
and use the current eligible archive window so changes closed after this file was generated are not
missed.

## Instruction For Codex

Run harness auto-evolve:
1. Read docs/ECL.md and this pending file.
2. Rebuild `harness/changes/INDEX.json`, then inspect the current eligible archive window first.
3. Read spec/plan/tasks/reviews only when evidence requires it.
4. Extract repeated failures, verification gaps, user corrections, and reusable constraints.
5. Generate `harness/evolution/proposals/YYYY-MM-DD-auto-evolve.md` from the proposal template in docs/ECL.md or references/ecl-harness.md before editing harness files.
6. Request one independent auditor/subagent score before applying. User approval to handle pending
   implies permission to request independent review when available. If the environment still
   requires explicit authorization, ask once. If scoring is unavailable, declined, or still
   unauthorized after asking, record `status=noop` with `eval_mode=dry_run` and do not auto-apply.
7. Apply only accepted candidates with archive evidence, project relevance, score >= 80, and independent approval.
8. Prefer clarifying existing rules over adding new sections, documents, scripts, or workflows.
9. Run harness checks and relevant business gates.
10. Record one terminal result in `harness/evolution/results.tsv`: `keep` for accepted deltas,
    `noop` for reviewed evidence with no durable rule, `rejected` for pre-apply hard-gate
    failures, or `revert` if an applied delta fails validation.
11. Run `harness-evolve mark-complete` after writing the result. If you cannot complete these
    steps, park or close blocked; do not close completed while leaving the same pending file.
'@
  $content = $content.Replace("{{NOW}}", $now)
  $content = $content.Replace("{{TRIGGER_REASON}}", $TriggerReason)
  $content = $content.Replace("{{DELTA}}", [string]($ArchiveItems.Count - [int]$State.last_evolved_archive_count))
  $content = $content.Replace("{{THRESHOLD}}", [string]$State.threshold)
  $content = $content.Replace("{{WINDOW}}", [string]$State.window)
  $content = $content.Replace("{{CANDIDATE_LINES}}", ($candidateLines -join "`n"))
  Write-Text $PendingPath $content
  $State.pending = $true
  Write-State $State
  Write-Output "Created harness/evolution/pending.md"
}

function Check-Evolution {
  Ensure-EvolutionDirs
  Ensure-ResultsHeader
  $state = Read-State
  if (-not $state.enabled) {
    Write-Output "Harness auto-evolve disabled in harness/evolution/state.json."
    return
  }
  if (-not $state.threshold) { $state.threshold = $Threshold }
  if (-not $state.window) { $state.window = $Window }
  $archives = @(Get-ArchiveItems)
  if ([int]$state.last_evolved_archive_count -gt $archives.Count) {
    $state.last_evolved_archive_count = $archives.Count
    Write-State $state
  }
  $delta = [Math]::Max(0, $archives.Count - [int]$state.last_evolved_archive_count)
  if ($delta -lt [int]$state.threshold) {
    Write-Output "Harness evolution not due ($delta/$($state.threshold) new archived changes)."
    return
  }
  New-Pending $archives $state $Reason
}

function Collect-EvolutionInput {
  Check-Evolution
  if (Test-Path -LiteralPath $PendingPath) {
    Write-Output "Read: harness/evolution/pending.md"
  }
}

function Mark-Complete {
  $state = Read-State
  $archives = @(Get-ArchiveItems)
  $state.last_evolved_archive_count = $archives.Count
  $last = @($archives | Select-Object -Last 1)
  $state.last_evolved_change_id = if ($last.Count -gt 0) { $last[0].id } else { $null }
  $state.last_run_at = (Get-Date).ToString("s")
  $state.pending = $false
  Write-State $state
  if (Test-Path -LiteralPath $PendingPath) {
    Remove-Item -LiteralPath $PendingPath
  }
  Ensure-ResultsHeader
  Write-Output "Marked harness evolution complete."
}

switch ($Command) {
  "check" { Check-Evolution }
  "collect" { Collect-EvolutionInput }
  "mark-complete" { Mark-Complete }
  default { throw "Command required: check/collect/mark-complete" }
}
```

### 5.3 `scripts/lint-ecl.ps1`

```powershell
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Changes = Join-Path $Root "harness/changes"
$Active = Join-Path $Changes "active"
$IndexPath = Join-Path $Changes "INDEX.json"
$HarnessChange = Join-Path $Root "scripts/harness-change.ps1"
$HarnessEvolve = Join-Path $Root "scripts/harness-evolve.ps1"
$StatusPath = Join-Path $Root "docs/STATUS.md"
$EvolutionState = Join-Path $Root "harness/evolution/state.json"

function Fail([string]$Message) {
  Write-Error $Message
  exit 1
}

if (-not (Test-Path -LiteralPath $Changes)) {
  Fail "Missing harness/changes. Run ecl-harness-engineer or create ECL harness structure."
}

foreach ($dir in @("active", "parking", "archive")) {
  if (-not (Test-Path -LiteralPath (Join-Path $Changes $dir))) {
    Fail "Missing harness/changes/$dir."
  }
}

if (-not (Test-Path -LiteralPath $HarnessChange)) {
  Fail "Missing scripts/harness-change.ps1."
}

if (-not (Test-Path -LiteralPath $HarnessEvolve)) {
  Fail "Missing scripts/harness-evolve.ps1."
}

if (-not (Test-Path -LiteralPath $EvolutionState)) {
  Fail "Missing harness/evolution/state.json."
}

if (-not (Test-Path -LiteralPath $StatusPath)) {
  Fail "Missing docs/STATUS.md. Create a lightweight handoff summary; active change files override it when present."
}

if (Test-Path -LiteralPath (Join-Path $Active "summary.md")) {
  foreach ($file in @("summary.md", "spec.md", "plan.md", "tasks.md")) {
    if (-not (Test-Path -LiteralPath (Join-Path $Active $file))) {
      Fail "Active change missing $file."
    }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Active "reviews"))) {
    Fail "Active change missing reviews/."
  }
  $summary = Get-Content -Encoding UTF8 -Raw -LiteralPath (Join-Path $Active "summary.md")
  $spec = Get-Content -Encoding UTF8 -Raw -LiteralPath (Join-Path $Active "spec.md")
  $tasks = Get-Content -Encoding UTF8 -Raw -LiteralPath (Join-Path $Active "tasks.md")
  $review = ""
  $reviewPath = Join-Path $Active "reviews/review.md"
  if (Test-Path -LiteralPath $reviewPath) { $review = Get-Content -Encoding UTF8 -Raw -LiteralPath $reviewPath }
  $phase = [regex]::Match($summary, '(?m)^phase:\s*"?([^"\r\n]+)"?').Groups[1].Value
  $planReview = [regex]::Match($summary, '(?m)^plan_review:\s*"?([^"\r\n]+)"?').Groups[1].Value
  if ($phase -match "^(implement|validate|done)$" -and $spec -match "\[NEEDS CLARIFICATION:") {
    Fail "Active spec.md still has high-impact [NEEDS CLARIFICATION] markers. Resolve them or move phase back to intake/plan."
  }
  if ($phase -match "^(implement|validate|done)$" -and $planReview -ne "approved" -and $review -notmatch "(?is)Plan Review.*Status:\s*approved") {
    Fail "Active change cannot enter implementation until plan_review is approved in summary.md or an equivalent approved Plan Review is recorded."
  }
  if ($tasks -match "(?m)^- \[[ xX]\] (?!T\d{3})") {
    Fail "tasks.md contains executable task lines without T### ids. Use '- [ ] T001 [P?] [US?] Action with target path and validation note'."
  }
}

if (-not (Test-Path -LiteralPath $IndexPath)) {
  Fail "Missing harness/changes/INDEX.json. Run: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness-change.ps1 reindex"
}
$actual = Get-Content -Encoding UTF8 -Raw -LiteralPath $IndexPath
$expected = (& $HarnessChange index-json) -join "`n"
if ($actual.Trim() -ne $expected.Trim()) {
  Fail "harness/changes/INDEX.json is stale. Run: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness-change.ps1 reindex"
}

Write-Output "ECL lint passed."
```

### 5.4 `scripts/lint-encoding.ps1`

```powershell
$ErrorActionPreference = "Stop"

$markers = @(
  ([char]0x9505),
  ([char]0x951B),
  ([char]0x9286),
  ([char]0x9983),
  ([char]0x8133),
  ([char]0x7459),
  ([char]0x8930),
  ([char]0x95C6),
  ([char]0x9365),
  ([char]0x9359),
  ([char]0x9366),
  (([char]0x93C8).ToString() + ([char]0xE047).ToString())
)
$exclude = "\\(node_modules|vendor|\.git|dist|build|coverage|target|\.cache)\\"
$extensions = @(".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".ps1", ".py", ".go", ".rs", ".java", ".cs", ".yml", ".yaml")
$violations = New-Object System.Collections.Generic.List[string]

Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch $exclude -and $extensions -contains $_.Extension
} | ForEach-Object {
  $path = $_.FullName
  $lines = @(Get-Content -Encoding UTF8 -LiteralPath $path)
  for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($marker in $markers) {
      if ($lines[$i].Contains($marker)) {
        $rel = Resolve-Path -LiteralPath $path -Relative
        $violations.Add("${rel}:$($i + 1): possible mojibake marker '$marker'")
      }
    }
  }
}

if ($violations.Count -gt 0) {
  $violations | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output "Encoding lint passed."
```

## 6. Validation Expectations

After creating ECL harness files, run the selected profile's equivalent commands. For the Bash
profile:

```bash
bash scripts/harness-change.sh reindex
bash scripts/harness-evolve.sh check
bash scripts/lint-ecl.sh
bash scripts/lint-encoding.sh
```

For the PowerShell profile:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness-change.ps1 reindex
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/harness-evolve.ps1 check
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lint-ecl.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lint-encoding.ps1
```

If `lint-ecl` reports stale `INDEX.json`, run the generated `harness-change reindex` equivalent,
then rerun `lint-ecl`.
If `lint-ecl` reports missing `docs/STATUS.md`, create it from the STATUS template. Do not let
CI or hooks generate it automatically.
If `harness/evolution/pending.md` exists and no active change exists, read it as pending
maintenance before `docs/STATUS.md`. Reading it does not start auto-evolve or block ordinary user
work. Once Codex starts acting on pending evidence, finish with proposal + results.tsv +
`harness-evolve mark-complete`, or park/block. Do not let hooks or CI apply pending changes.
