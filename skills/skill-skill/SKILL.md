---
name: skill-skill
description: "Write, upgrade or audit a Claude skill so it changes what gets generated: forcing functions, triggerable descriptions, and a static audit script with a 0-100 health score. Use for 写 skill, 改 skill."
category: meta
risk: safe
source: self
source_repo: jack-reson8/skill-skill
source_type: self
date_added: "2026-10-24"
author: jack-reson8
tags: [skills, authoring, lint, audit]
tools: [claude, codex, cursor]
license: "MIT"
license_source: "https://github.com/jack-reson8/skill-skill/blob/main/LICENSE"
---

# Skill · skill

A skill is worth its tokens only if, when it runs, the output is different: a decision is made that wouldn't have been, an artifact exists that wouldn't have, a mistake is caught. Length is not the problem; lines that change nothing are. For every paragraph ask: **what will the model do differently because of this?** If nothing, it belongs in a reference that a step explicitly uses, or nowhere.

For heavy benchmarking (many evals, variance, description optimisation loops) use Anthropic's `skill-creator`; this skill is the fast path for turning real work into a skill that bites.

## When to Use This Skill

- the user wants to create, rewrite or rename a Claude skill
- the user wants to turn a conversation, workflow or methodology into a skill
- a skill is not taking effect and needs an audit

## 1 · Distil from the real work

Mine the conversation (or the user's notes) before writing anything:
- **Corrections and rejections** in the user's own words ("太 PPT", "越改越不好", "too EDM"). Each becomes a rule with its reason, or a check.
- **Accepted outputs**: what finally worked and *why* (the mechanism, not the adjectives).
- **Repeated work**: anything done by hand twice (a conversion, a check, a render) becomes a script in `scripts/`.
- **Facts from research**: keep only those that change a decision; mark what was verified (✓) and what wasn't (u). Never let an unverified number become a rule.

## 2 · Turn knowledge into forcing functions

Advice is skipped; structure is followed. Prefer, in this order:
1. **Required artifact at a step**: "write `audio-plan.md` with these columns before step 4". The model can't skip a file the next step reads.
2. **Gate**: "don't start the picture until the track is locked"; "propose 3 directions before building".
3. **Script** for deterministic or fiddly parts (render, analyse, convert, lint). Scripts run without loading into context and don't drift.
4. **Checklist run at a named moment** ("run against the shot map before coding"), each line traceable to a past failure.
5. **Template / example** of the output, including one bad → good pair when taste is involved.
6. **Reference file**: only when a step says *when* to read it and *what to output* after reading. A reference nothing points to is never read.

Explain the why in one clause instead of shouting MUST; the model generalises from reasons.

## 3 · Write it

```
name-of-skill/
├── SKILL.md        # frontmatter + the steps (≲500 lines; the workflow, gates, artifacts)
├── scripts/        # deterministic tools the steps call
├── references/     # detail a step loads on purpose (cases, palettes, specs)
└── assets/         # templates / files copied into outputs
```
- **Name**: short, brandable, lowercase-hyphen, same as the folder. Check collisions with installed skills *and* famous tools (e.g. "remotion" = a React video framework → ambiguous).
- **Description** (≤1024 chars, the only thing seen before triggering): what it does + "Use when…" with the user's real phrases in every language they use (中文 too). Slightly pushy; models under-trigger.
- **Body**: numbered steps in the order work happens; each step ends in an artifact, a decision or a check. Lessons and taste go in a lessons file under references/, pointed to from the step where they bite.

## 4 · Audit (static, seconds)

```bash
python3 <this skill's base directory>/scripts/skill_audit.py <skill_dir>     # or --all; --badge prints a README badge
```
Flags: bad name / folder mismatch, description too long or without a trigger clause, name collisions, **orphan files** never mentioned in SKILL.md, **dangling paths**, oversized body, ALL-CAPS overuse, steps that produce nothing. Prints a 0–100 health score (−15 per ✗, −5 per warning). Fix every ✗. To benchmark public repos (report + chart + data), run `scripts/skill_report.py owner/repo …`.

## 5 · Effect test (minutes, not a benchmark)

1. Write 2–3 prompts a real user would type (with context, typos, mixed language).
2. For each, write 3 **observable effects** the skill should cause ("reply contains an energy-map table", "asks for no music file but writes a generator prompt", "uses `audio_post.py` for the loop").
3. Run each prompt with the skill (a subagent, or yourself in a fresh pass) and, if in doubt, without it. An effect that appears in both runs isn't the skill's doing; an effect missing in the skill run means a section isn't biting → convert it into a stronger forcing function (§2), don't add more prose.

## 6 · Keep it alive

- Every new rejection / acceptance → one line in `lessons.md` and, if it recurs, a check or a gate.
- After an edit, rerun the audit; show the user the diff summary, not the whole file.
- Prune what never fires in effect tests. Rename only with the collision check; update every path in SKILL.md.

## Limitations

- The audit is static and checks structure, not whether the instructions are correct
- The effect test is a quick with/without comparison, not a benchmark
