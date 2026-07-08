---
name: rich-elicitation
description: "Asks clarifying questions in multiple rounds before starting ambiguous tasks. Fires when 2+ task dimensions each have 3+ viable answers."
category: productivity
risk: none
source: self
source_type: self
date_added: "2026-05-07"
author: abubakar
tags: [elicitation, clarifying-questions, ambiguity, multi-round, prompt-engineering]
tools: [antigravity]
---

# Rich Elicitation Skill

## Overview

This skill governs how Antigravity resolves task ambiguity before starting work. When a user's request has too many unanswered dimensions — each with several reasonable answers — Antigravity asks targeted clarifying questions across multiple rounds rather than silently picking defaults.

The goal is a correct first draft, not a generic answer that requires three revision cycles. Rounds are capped at three; anything still unclear after Round 3 gets a stated assumption and Antigravity proceeds.

---

## When to Use This Skill

- Use when a request has 2 or more dimensions that are ambiguous and each has 3+ viable options
- Use when the user's likely intent is unclear across scope, audience, tone, format, or strategy
- Use when an early answer would meaningfully change the structure or direction of the output
- Use when working on writing, planning, design, recommendations, or creative tasks with open-ended scope
- Use when a Round 1 answer unlocks a new set of meaningful choices that need resolving before proceeding

Do **not** trigger for:
- Simple factual lookups or math
- Clearly scoped requests with a single obvious interpretation
- Minor unknowns where a safe default exists

---

## How It Works

### Step 1: Run the Trigger Checklist

Before starting any task, mentally check how many of these apply:

| Signal | Action |
|---|---|
| Multiple valid output formats | Ask about format |
| Audience is unknown | Ask about audience |
| Tone is ambiguous | Ask about tone |
| Scope could be narrow or broad | Ask about depth/length |
| Technical vs. simple treatment unclear | Ask about technical level |
| Multiple strategic directions exist | Ask which direction |
| User's constraints are unknown | Ask about constraints |

**If 2+ rows apply → trigger this skill.**

### Step 2: Ask Round 1 Questions

Ask up to 3 questions using `ask_user_input_v0`. Group related questions in a single call. Lead with 1–2 sentences explaining why you're asking. Mark one option per question as **(Recommended)**.

### Step 3: Re-run the Checklist

After Round 1 answers, re-run the checklist on what's still unresolved. If 2+ rows still apply, run Round 2. Otherwise, proceed.

### Step 4: Run Follow-up Rounds (if needed)

| Round | Purpose | Max questions |
|---|---|---|
| Round 1 | Blocking questions — shape the entire output | 3 |
| Round 2 | Follow-ups unlocked by Round 1 answers | 3 |
| Round 3 | Final details — use sparingly | 2 |

Transition between rounds naturally. Don't announce "Round 2" mechanically. Use phrasing like:
> "Got it — that helps a lot. One more thing before I start:"

### Step 5: Proceed

After Round 3 (or earlier, if enough context exists), state any remaining assumptions briefly and begin the task.

---

## Examples

### Example 1: Multi-Round — Investor Pitch Deck

**User:** "Help me create a presentation for my project."

**Round 1** — Three blocking questions:

```
Framing: "This could go a lot of different ways. Quick questions before I start:"

Q1: Who is the audience?
  - Internal team / colleagues
  - External clients or partners
  - Investors or stakeholders (Recommended)
  - General / public audience

Q2: What's the primary goal?
  - Inform and update
  - Persuade and drive a decision (Recommended)
  - Teach or explain a concept
  - Pitch and raise funding

Q3: How much content do you already have?
  - Starting from scratch
  - Rough notes or an outline (Recommended)
  - Full draft — just needs polish
  - Previous version to update
```

*User answers: Investors | Pitch | Rough notes → Round 2 is warranted.*

**Round 2** — Unlocked by Round 1:

```
Framing: "Perfect — investor pitch it is. A couple more things:"

Q1: What stage is this raise?
  - Pre-seed / idea stage
  - Seed round (Recommended)
  - Series A or later
  - Strategic partnership / grant

Q2: How long should the deck be?
  - Short and punchy, 8–10 slides (Recommended)
  - Standard, 12–15 slides
  - Comprehensive, 20+ slides
```

*No Round 3 needed — proceed.*

---

### Example 2: Single-Round — Business Email

**User:** "Write a business email to follow up on a proposal."

**Round 1 only:**

```
Framing: "Two quick questions to nail the tone:"

Q1: What tone should this email strike?
  - Formal and professional (Recommended)
  - Friendly but direct
  - Urgent and firm
  - Warm and relationship-focused

Q2: What's the primary goal?
  - Request action / get a response (Recommended)
  - Share information only
  - Repair or maintain the relationship
  - Negotiate or push back
```

*Enough context. No Round 2 needed.*

---

## Best Practices

- ✅ Always mark one option per question as **(Recommended)**
- ✅ Lead with a 1–2 sentence framing before the question widget
- ✅ Group up to 3 related questions in a single `ask_user_input_v0` call
- ✅ Re-evaluate after each round — stop as soon as you have enough context
- ✅ Use `single_select` for mutually exclusive choices, `multi_select` when combinations are valid
- ✅ State remaining assumptions explicitly before proceeding after Round 3
- ❌ Don't ask 6 separate question calls when 2 grouped calls would do
- ❌ Don't mark two options as Recommended in the same question
- ❌ Don't use vague option labels like "Other" or "It depends" without elaborating
- ❌ Don't mechanically label rounds in the UI ("Round 1:", "Round 2:")
- ❌ Don't run a follow-up round for minor details that have safe defaults

---

## Limitations

- This skill does not validate whether the user's answers are internally consistent — it trusts them as given.
- Round structure is a guideline, not a rigid contract; judgment is required on when to stop.
- Works best with `ask_user_input_v0` — in environments without that tool, question quality may degrade.
- Does not handle tasks where ambiguity can only be resolved by fetching external information (e.g., reading a file the user hasn't uploaded).
- Not designed for real-time or high-latency-sensitive workflows where any question overhead is unacceptable.

---

## Security & Safety Notes

This skill is pure reasoning — it issues no shell commands, reads no files, makes no network requests, and mutates no state. Risk level is `none`.

No `npm run security:docs` review is required for this skill.

---

## Common Pitfalls

- **Problem:** Antigravity asks one good question, gets an answer, then proceeds without checking if new unknowns emerged.
  **Solution:** Always re-run the trigger checklist mentally after each round before deciding to proceed.

- **Problem:** All options in a question look equally valid so Antigravity marks none as Recommended.
  **Solution:** Pick the option that works for most users or is lowest-risk and mark it. "No preference" is rarely true.

- **Problem:** Antigravity runs 4+ rounds trying to eliminate every unknown.
  **Solution:** Hard cap at 3 rounds. After Round 3, state assumptions and proceed.

- **Problem:** Round 2 questions cover the same category as Round 1 (e.g., tone again).
  **Solution:** Each round should unlock new dimensions, not re-ask resolved ones.

---

## Related Skills

- `@ask-user-questions` — Single-round elicitation with recommended options. Use that skill for simpler tasks; use rich-elicitation when answers to early questions open up new meaningful choices.
