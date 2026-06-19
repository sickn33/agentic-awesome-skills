---
name: analyze-project
description: Forensic root cause analyzer for Antigravity sessions. Classifies scope deltas, rework patterns, root causes, hotspots, and auto-improves prompts/health.
risk: unknown
source: community
version: "1.0"
tags: [analysis, diagnostics, meta, root-cause, project-health, session-review]
---

# /analyze-project — Root Cause Analyst Workflow

Analyze AI-assisted coding sessions in `~/.gemini/antigravity/brain/` and produce a report that explains not just **what happened**, but **why it happened**, **who/what caused it**, and **what should change next time**.

## Goal

For each session, determine:

1. What changed from the initial ask to the final executed work
2. Whether the main cause was:
   - user/spec
   - agent
   - repo/codebase
   - validation/testing
   - legitimate task complexity
3. Whether the opening prompt was sufficient
4. Which files/subsystems repeatedly correlate with struggle
5. What changes would most improve future sessions

## When to Use
- You need a postmortem on AI-assisted coding sessions, especially when scope drift or repeated rework occurred.
- You want root-cause analysis that separates user/spec issues from agent mistakes, repo friction, or validation gaps.
- You need evidence-backed recommendations for improving future prompts, repo health, or delivery workflows.

## Global Rules

- Treat `.resolved.N` counts as **iteration signals**, not proof of failure
- Separate **human-added scope**, **necessary discovered scope**, and **agent-introduced scope**
- Separate **agent error** from **repo friction**
- Every diagnosis must include **evidence** and **confidence**
- Confidence levels:
  - **High** = direct artifact/timestamp evidence
  - **Medium** = multiple supporting signals
  - **Low** = plausible inference, not directly proven
- Evidence precedence:
  - artifact contents > timestamps > metadata summaries > inference
- If evidence is weak, say so

---

## Step 0.5: Session Intent Classification

Classify the primary session intent from objective + artifacts:

- `DELIVERY`
- `DEBUGGING`
- `REFACTOR`
- `RESEARCH`
- `EXPLORATION`
- `AUDIT_ANALYSIS`

Record:
- `session_intent`
- `session_intent_confidence`

Use intent to contextualize severity and rework shape.
Do not judge exploratory or research sessions by the same standards as narrow delivery sessions.

---

## Step 1: Discover Conversations

1. Read available conversation summaries from system context
2. List conversation folders in the user’s Antigravity `brain/` directory
3. Build a conversation index with:
   - `conversation_id`
   - `title`
   - `objective`
   - `created`
   - `last_modified`
4. If the user supplied a keyword/path, filter to matching conversations; otherwise analyze all

Output: indexed list of conversations to analyze.

---

## Step 2: Extract Session Evidence

For each conversation, read if present:

### Core artifacts
- `task.md`
- `implementation_plan.md`
- `walkthrough.md`

### Metadata
- `*.metadata.json`

### Version snapshots
- `task.md.resolved.0 ... N`
- `implementation_plan.md.resolved.0 ... N`
- `walkthrough.md.resolved.0 ... N`

### Additional signals
- other `.md` artifacts
- timestamps across artifact updates
- file/folder/subsystem names mentioned in plans/walkthroughs
- validation/testing language
- explicit acceptance criteria, constraints, non-goals, and file targets

Record per conversation:

#### Lifecycle
- `has_task`
- `has_plan`
- `has_walkthrough`
- `is_completed`
- `is_abandoned_candidate` = task exists but no walkthrough

#### Revision / change volume
- `task_versions`
- `plan_versions`
- `walkthrough_versions`
- `extra_artifacts`

#### Scope
- `task_items_initial`
- `task_items_final`
- `task_completed_pct`
- `scope_delta_raw`
- `scope_creep_pct_raw`

#### Timing
- `created_at`
- `completed_at`
- `duration_minutes`

#### Content / quality
- `objective_text`
- `initial_plan_summary`
- `final_plan_summary`
- `initial_task_excerpt`
- `final_task_excerpt`
- `walkthrough_summary`
- `mentioned_files_or_subsystems`
- `validation_requirements_present`
- `acceptance_criteria_present`
- `non_goals_present`
- `scope_boundaries_present`
- `file_targets_present`
- `constraints_present`

---

## Step 3: Prompt Sufficiency

Score the opening request on a 0–2 scale for:

- **Clarity**
- **Boundedness**
- **Testability**
- **Architectural specificity**
- **Constraint awareness**
- **Dependency awareness**

Create:
- `prompt_sufficiency_score`
- `prompt_sufficiency_band` = High / Medium / Low

Then note which missing prompt ingredients likely contributed to later friction.

Do not punish short prompts by default; a narrow, obvious task can still have high sufficiency.

---

## Step 4: Scope Change Classification

Classify scope change into:

- **Human-added scope** — new asks beyond the original task
- **Necessary discovered scope** — work required to complete the original task correctly
- **Agent-introduced scope** — likely unnecessary work introduced by the agent

Record:
- `scope_change_type_primary`
- `scope_change_type_secondary` (optional)
- `scope_change_confidence`
- evidence

Keep one short example in mind for calibration:
- Human-added: “also refactor nearby code while you’re here”
- Necessary discovered: hidden dependency must be fixed for original task to work
- Agent-introduced: extra cleanup or redesign not requested and not required

---

## Step 5: Rework Shape

Classify each session into one primary pattern:

- **Clean execution**
- **Early replan then stable finish**
- **Progressive scope expansion**
- **Reopen/reclose churn**
- **Late-stage verification churn**
- **Abandoned mid-flight**
- **Exploratory / research session**

Record:
- `rework_shape`
- `rework_shape_confidence`
- evidence

---

## Step 6: Root Cause Analysis

For every non-clean session, assign:

### Primary root cause
One of:
- `SPEC_AMBIGUITY`
- `HUMAN_SCOPE_CHANGE`
- `REPO_FRAGILITY`
- `AGENT_ARCHITECTURAL_ERROR`
- `VERIFICATION_CHURN`
- `LEGITIMATE_TASK_COMPLEXITY`

### Secondary root cause
Optional if materially relevant

### Root-cause guidance
- **SPEC_AMBIGUITY**: opening ask lacked boundaries, targets, criteria, or constraints
- **HUMAN_SCOPE_CHANGE**: scope expanded because the user broadened the task
- **REPO_FRAGILITY**: hidden coupling, brittle files, unclear architecture, or environment issues forced extra work
- **AGENT_ARCHITECTURAL_ERROR**: wrong files, wrong assumptions, wrong approach, hallucinated structure
- **VERIFICATION_CHURN**: implementation mostly worked, but testing/validation caused loops
- **LEGITIMATE_TASK_COMPLEXITY**: revisions were expected for the difficulty and not clearly avoidable

Every root-cause assignment must include:
- evidence
- why stronger alternative causes were rejected
- confidence

---

## Step 6.5: Session Severity Scoring (0–100)

Assign each session a severity score to prioritize attention.

Components (sum, clamp 0–100):
- **Completion failure**: 0–25 (`abandoned = 25`)
- **Replanning intensity**: 0–15
- **Scope instability**: 0–15
- **Rework shape severity**: 0–15
- **Prompt sufficiency deficit**: 0–10 (`low = 10`)
- **Root cause impact**: 0–10 (`REPO_FRAGILITY` / `AGENT_ARCHITECTURAL_ERROR` highest)
- **Hotspot recurrence**: 0–10

Bands:
- **0–19 Low**
- **20–39 Moderate**
- **40–59 Significant**
- **60–79 High**
- **80–100 Critical**

Record:
- `session_severity_score`
- `severity_band`
- `severity_drivers` = top 2–4 contributors
- `severity_confidence`

Use severity as a prioritization signal, not a verdict. Always explain the drivers.
Contextualize severity using session intent so research/exploration sessions are not over-penalized.

---

## Step 7: Subsystem / File Clustering

Across all conversations, cluster repeated struggle by file, folder, or subsystem.

For each cluster, calculate:
- number of conversations touching it
- average revisions
- completion rate
- abandonment rate
- common root causes
- average severity

Goal: identify whether friction is mostly prompt-driven, agent-driven, or concentrated in specific repo areas.

---

## Step 8: Comparative Cohorts

Compare:
- first-shot successes vs re-planned sessions
- completed vs abandoned
- high prompt sufficiency vs low prompt sufficiency
- narrow-scope vs high-scope-growth
- short sessions vs long sessions
- low-friction subsystems vs high-friction subsystems

For each comparison, identify:
- what differs materially
- which prompt traits correlate with smoother execution
- which repo traits correlate with repeated struggle

Do not just restate averages; extract cautious evidence-backed patterns.

---

## Step 9: Non-Obvious Findings

Generate 3–7 findings that are not simple metric restatements.

Each finding must include:
- observation
- why it matters
- evidence
- confidence

Examples of strong findings:
- replans cluster around weak file targeting rather than weak acceptance criteria
- scope growth often begins after initial success, suggesting post-success human expansion
- auth-related struggle is driven more by repo fragility than agent hallucination

---

## Step 10: Report Generation

Create `session_analysis_report.md` with this structure:

# 📊 Session Analysis Report — [Project Name]

**Generated**: [timestamp]  
**Conversations Analyzed**: [N]  
**Date Range**: [earliest] → [latest]

## Executive Summary

| Metric | Value | Rating |
|:---|:---|:---|
| First-Shot Success Rate | X% | 🟢/🟡/🔴 |
| Completion Rate | X% | 🟢/🟡/🔴 |
| Avg Scope Growth | X% | 🟢/🟡/🔴 |
| Replan Rate | X% | 🟢/🟡/🔴 |
| Median Duration | Xm | — |
| Avg Session Severity | X | 🟢/🟡/🔴 |
| High-Severity Sessions | X / N | 🟢/🟡/🔴 |

Thresholds:
- First-shot: 🟢 >70 / 🟡 40–70 / 🔴 <40
- Scope growth: 🟢 <15 / 🟡 15–40 / 🔴 >40
- Replan rate: 🟢 <20 / 🟡 20–50 / 🔴 >50

Avg severity guidance:
- 🟢 <25
- 🟡 25–50
- 🔴 >50

Note: avg severity is an aggregate health signal, not the same as per-session severity bands.

Then add a short narrative summary of what is going well, what is breaking down, and whether the main issue is prompt quality, repo fragility, workflow discipline, or validation churn.

## Root Cause Breakdown

| Root Cause | Count | % | Notes |
|:---|:---|:---|:---|

## Prompt Sufficiency Analysis
- common traits of high-sufficiency prompts
- common missing inputs in low-sufficiency prompts
- which missing prompt ingredients correlate most with replanning or abandonment

## Scope Change Analysis
Separate:
- Human-added scope
- Necessary discovered scope
- Agent-introduced scope

## Rework Shape Analysis
Summarize the main failure patterns across sessions.

## Friction Hotspots
Show the files/folders/subsystems most associated with replanning, abandonment, verification churn, and high severity.

## First-Shot Successes
List the cleanest sessions and extract what made them work.

## Non-Obvious Findings
List 3–7 evidence-backed findings with confidence.

## Severity Triage
List the highest-severity sessions and say whether the best intervention is:
- prompt improvement
- scope discipline
- targeted skill/workflow
- repo refactor / architecture cleanup
- validation/test harness improvement

## Recommendations
For each recommendation, use:
- **Observed pattern**
- **Likely cause**
- **Evidence**
- **Change to make**
- **Expected benefit**
- **Confidence**

## Per-Conversation Breakdown

| # | Title | Intent | Duration | Scope Δ | Plan Revs | Task Revs | Root Cause | Rework Shape | Severity | Complete? |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|

---

## Step 11: Optional Post-Analysis Improvements

If appropriate, also:
- update any local project-health or memory artifact (if present) with recurring failure modes and fragile subsystems
- generate `prompt_improvement_tips.md` from high-sufficiency / first-shot-success sessions
- suggest missing skills or workflows when the same subsystem or task sequence repeatedly causes struggle

Only recommend workflows/skills when the pattern appears repeatedly.

---

## Final Output Standard

The workflow must produce:
1. metrics summary
2. root-cause diagnosis
3. prompt-sufficiency assessment
4. subsystem/friction map
5. severity triage and prioritization
6. evidence-backed recommendations
7. non-obvious findings

Prefer explicit uncertainty over fake precision.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
