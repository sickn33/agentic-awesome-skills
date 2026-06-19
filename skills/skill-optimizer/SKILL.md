---
name: skill-optimizer
description: "Diagnose and optimize Agent Skills (SKILL.md) with real session data and research-backed static analysis. Works with Claude Code, Codex, and any Agent Skills-compatible agent."
risk: safe
source: hqhq1025/skill-optimizer (MIT)
date_added: "2026-04-11"
---

## When to Use This Skill

- Use when skills are not triggering as expected or seem broken
- Use when you want to audit and improve your skill library's quality
- Use when you want to understand which skills are underperforming or wasting context tokens

## Rules

- **Read-only**: never modify skill files. Only output report.
- **All 8 dimensions**: do not skip any. If data is insufficient, report "N/A — insufficient session data" rather than omitting.
- **Quantify**: "you had 12 research tasks last week but the skill never triggered" beats "you often do research".
- **Suggest, don't prescribe**: give specific wording suggestions for description improvements, but frame as suggestions.
- **Show evidence**: for undertrigger claims, quote the actual user message that should have triggered the skill.
- **Evidence-based suggestions**: when suggesting description rewrites, cite the specific research finding that motivates the change (e.g., "front-load trigger keywords — MCP study shows 3.6x selection rate improvement").

## Overview

Analyze skills using **historical session data + static quality checks**, output a diagnostic report with P0/P1/P2 prioritized fixes. Scores each skill on a 5-point composite scale across 8 dimensions.

CSO (Claude/Agent Search Optimization) = writing skill descriptions so agents select the right skill at the right time. This skill checks for CSO violations.

## Usage

- `/optimize-skill` → scan all skills
- `/optimize-skill my-skill` → single skill
- `/optimize-skill skill-a skill-b` → multiple specified skills

## Data Sources

Auto-detect the current agent platform and scan the corresponding paths:

| Source | Claude Code | Codex | Shared |
|--------|------------|-------|--------|
| Session transcripts | `~/.claude/projects/**/*.jsonl` | `~/.codex/sessions/**/*.jsonl` | — |
| Skill files | `~/.claude/skills/*/SKILL.md` | `~/.codex/skills/*/SKILL.md` | `~/.agents/skills/*/SKILL.md` |

**Platform detection:** Check which directories exist. Scan all available sources — a user may have both Claude Code and Codex installed.

## Workflow

```
Identify target skills
        ↓
Collect session data (python3 scripts scan JSONL transcripts)
        ↓
Run 8 analysis dimensions
        ↓
Compute composite scores
        ↓
Output report with P0/P1/P2
```

### Step 1: Identify Target Skills

Scan skill directories in order: `~/.claude/skills/`, `~/.codex/skills/`, `~/.agents/skills/`. Deduplicate by skill name (same name in multiple locations = same skill). For each, read `SKILL.md` and extract:
- name, description (from YAML frontmatter)
- trigger keywords (from description field)
- defined workflow steps (Step 1/2/3... or ### sections under Workflow)
- word count

If user specified skill names, filter to only those.

### Step 2: Collect Session Data

Use python3 scripts via Bash to scan session JSONL files. Extract:

**Claude Code sessions** (`~/.claude/projects/**/*.jsonl`):
- `Skill` tool_use calls (which skills were invoked)
- User messages (full text)
- Assistant messages after skill invocation (for workflow tracking)
- User messages after skill invocation (for reaction analysis)

**Codex sessions** (`~/.codex/sessions/**/*.jsonl`):
- `session_meta` events → extract `base_instructions` for skill loading evidence
- `response_item` events → assistant outputs (workflow tracking)
- `event_msg` events → tool execution and skill-related events
- User messages from `turn_context` events (for reaction analysis)

**Note:** Codex injects skills via context rather than explicit `Skill` tool calls. Skill loading (present in `base_instructions`) does NOT equal active invocation. To detect actual use, search for skill-specific workflow markers (step headers, output formats) in `response_item` content within that session. A skill is "invoked" only if the agent produced output following the skill's defined workflow.

**Aggregated:**
- Per-skill: invocation count, trigger keyword match count
- Per-skill: user reaction sentiment after invocation
- Per-skill: workflow step completion markers

### Step 3: Run 8 Analysis Dimensions

**You MUST run ALL 8 dimensions.** The baseline behavior without this skill is to skip dimensions 4.2, 4.3, 4.5b, and 4.8. These are the most valuable dimensions — do not skip them.

#### 4.1 Trigger Rate

Count how many times each skill was actually invoked vs how many times its trigger keywords appeared in user messages.

**Claude Code:** count `Skill` tool_use calls in transcripts.
**Codex:** count sessions where the agent produced output following the skill's workflow markers (not merely loaded in context).

**Diagnose:**
- Never triggered → skill may be useless or trigger words wrong
- Keywords match >> actual invocations → undertrigger problem, description needs work
- High frequency → core skill, worth optimizing

#### 4.2 Post-Invocation User Reaction

**This dimension is critical and easy to skip. Do not skip it.**

After a skill is invoked in a session, read the user's next 3 messages. Classify:
- **Negative**: "no", "wrong", "never mind", "not what I wanted", user interrupts
- **Correction**: user re-describes their intent, manually overrides skill output
- **Positive**: "good", "ok", "continue", "nice", user follows the workflow
- **Silent switch**: user changes topic entirely (likely false positive trigger)

Report per-skill satisfaction rate.

#### 4.3 Workflow Completion Rate

**This dimension is critical and easy to skip. Do not skip it.**

For each skill invocation found in session data:
1. Extract the skill's defined steps from SKILL.md
2. Search the assistant messages in that session for step markers (Step N, specific output formats defined in the skill)
3. Calculate: how far did execution get?

Report: `{skill-name} (N steps): avg completed Step X/N (Y%)`

If a specific step is frequently where execution stops, flag it.

#### 4.4 Static Quality Analysis

Check each SKILL.md against these 14 rules:

| Check | Pass Criteria |
|-------|--------------|
| Frontmatter format | Only `name` + `description`, total < 1024 chars |
| Name format | Letters, numbers, hyphens only |
| Description trigger | Starts with "Use when..." or has explicit trigger conditions |
| Description workflow leak | Description does NOT summarize the skill's workflow steps (CSO violation) |
| Description pushiness | Description actively claims scenarios where it should be used, not just passive |
| Overview section | Present |
| Rules section | Present |
| MUST/NEVER density | Count ALL-CAPS directive words; >5 per 100 words = flag |
| Word count | < 500 words (flag if over) |
| Narrative anti-pattern | No "In session X, we found..." storytelling |
| YAML quoting safety | description containing `: ` must be wrapped in double quotes |
| Critical info position | Core trigger conditions and primary actions must be in the first 20% of SKILL.md |
| Description 250-char check | Primary trigger keywords must appear within the first 250 characters of description |
| Trigger condition count | ≤ 2 trigger conditions in description is ideal |

#### 4.5a False Positive Rate (Overtrigger)

Skill was invoked but user immediately rejected or ignored it.

#### 4.5b Undertrigger Detection

**This is the highest-value dimension.** For each skill, extract its **capability keywords** (not just trigger keywords — what the skill CAN do). Then scan user messages for tasks that match those capabilities but where the skill was NOT invoked.

Report: which user messages SHOULD have triggered the skill but didn't, and suggest description improvements.

**Compounding Risk Assessment:**
For skills with chronic undertriggering (0 triggers across 5+ sessions where relevant tasks appeared), flag as "compounding risk" — undertriggered skills cannot self-improve through usage feedback, causing the gap to widen over time. Recommend immediate description rewrite as P0.

#### 4.6 Cross-Skill Conflicts

Compare all skill pairs:
- Trigger keyword overlap (same keywords in two descriptions)
- Workflow overlap (two skills teach similar processes)
- Contradictory guidance

#### 4.7 Environment Consistency

For each skill, extract referenced:
- File paths → check if they exist (`test -e`)
- CLI tools → check if installed (`which`)
- Directories → check if they exist

Flag any broken references.

#### 4.8 Token Economics

**This dimension is critical and easy to skip. Do not skip it.**

For each skill:
- Word count (from Step 1)
- Trigger frequency (from 4.1)
- Cost-effectiveness = trigger count / word count
- Flag: large + never-triggered skills as candidates for removal or compression

**Progressive Disclosure Tier Check:**
Evaluate each skill against the 3-tier loading model:
- Tier 1 (frontmatter): ~100 tokens. Check: is description ≤ 1024 chars?
- Tier 2 (SKILL.md body): <500 lines recommended. Check: word count.
- Tier 3 (reference files): loaded on demand. Check: does skill use reference files for detailed content, or cram everything into SKILL.md?

Flag skills that put 500+ words in SKILL.md without using reference files as "poor progressive disclosure".

### Step 4: Composite Score

Rate each skill on a 5-point scale:

| Score | Meaning |
|-------|---------|
| 5 | Healthy: high trigger rate, positive reactions, complete workflows, clean static |
| 4 | Good: minor issues in 1-2 dimensions |
| 3 | Needs attention: significant gap in 1 dimension or minor gaps in 3+ |
| 2 | Problematic: never triggered, or negative user reactions, or major static issues |
| 1 | Broken: doesn't work, references missing, or fundamentally misaligned |

**Scored dimensions** (weighted average):
- Trigger rate: 25%
- User reaction: 20%
- Workflow completion: 15%
- Static quality: 15%
- Undertrigger: 15%
- Token economics: 10%

**Qualitative dimensions** (reported but not scored):
- 4.5a Overtrigger: reported as count + examples
- 4.6 Cross-Skill Conflicts: reported as conflict pairs
- 4.7 Environment Consistency: reported as pass/fail per reference

## Report Format

```markdown
# Skill Optimization Report
**Date**: {date}
**Scope**: {all / specified skills}
**Session data**: {N} sessions, {date range}

## Overview
| Skill | Triggers | Reaction | Completion | Static | Undertrigger | Token | Score |
|-------|----------|----------|------------|--------|--------------|-------|-------|
| example-skill | 2 | 100% | 86% | B+ | 1 miss | 486w | 4/5 |

## P0 Fixes (blocking usage)
1. ...

## P1 Improvements (better experience)
1. ...

## P2 Optional Optimizations
1. ...

## Per-Skill Diagnostics
### {skill-name}
#### 4.1 Trigger Rate
...
#### 4.2 User Reaction
...
(all 8 dimensions)
```

## Research Background

The analysis dimensions in this report are grounded in the following research:
- **Undertrigger detection**: Memento-Skills (arXiv:2603.18743) — skills as structured files require accurate routing; unrouted skills cannot self-improve via the read-write learning loop
- **Description quality**: MCP Description Quality (arXiv:2602.18914) — well-written descriptions achieve 72% tool selection rate vs. 20% random baseline (3.6x improvement)
- **Information position**: Lost in the Middle (Liu et al., TACL 2024) — U-shaped LLM attention curve
- **Format impact**: He et al. (arXiv:2411.10541) — format changes alone can cause 9-40% performance variance
- **Instruction compliance**: IFEval (arXiv:2311.07911) — LLMs struggle with multi-constraint prompts

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
