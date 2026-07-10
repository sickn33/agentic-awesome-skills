---
name: idea-autopsy
description: "Autopsy a business idea before you build it: kill-list check, five hard filters, a free-AI one-prompt test, live ad-market verification, and a verdict with a named kill-pattern."
category: product
risk: critical
source: community
source_repo: hafiz-actyte/idea-autopsy
source_type: community
date_added: "2026-07-10"
author: hafiz-actyte
tags: [business-ideas, idea-validation, market-research, startup, founders]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/hafiz-actyte/idea-autopsy/blob/main/LICENSE"
---

# Idea Autopsy

## Overview

Turns the agent into a ruthless business-idea pathologist: instead of encouraging
the user, it hunts for the one sentence that kills an idea — before any money or
weeks are spent building it. Built from a real founder kill-list of 42 dead ideas
(including a 9/10-scored idea and one that turned out to be federally illegal to
charge for). Every autopsy ends in a hard verdict: DEAD with a named kill-pattern,
or SURVIVED with the one cheapest test that could still kill it.

## When to Use This Skill

- Use when the user proposes a new business, product, or side-project idea
- Use when the user asks "should I build X?" or "validate this idea"
- Use when the user says "autopsy my idea"
- Use before any market-research or build-planning task for a new venture

## How It Works

### Step 1: Kill-list check

If the project contains a `REJECTION.md` (the user's personal kill-list), read it
first and match the idea by niche OR by kill-pattern. A match = verdict DEAD, cite
the row, stop. If no kill-list exists, ask the user for permission to create one
with exactly this schema — this autopsy writes its first row:

```markdown
# REJECTION.md — my kill-list

## Killed ideas

| # | Idea/Niche | Killed (date) | Hard reason (one line) | Pattern |
|---|-----------|---------------|------------------------|---------|

## Survivors under test

| Idea | Passed filters (date) | Pending test | Deadline |
|------|----------------------|--------------|----------|
```

### Step 2: The five filters

Demand evidence, not optimism. One hard NO = dead.

1. **Real pain?** 2am-problem, or a nice-to-have "vitamin"?
2. **Buyer has money?** Right now — not after the product helps them.
3. **Proven demand?** Can the user name a single live competitor ad?
4. **Legal to charge for?** Regulated, licensed, or illegal in the target market? Name the law if suspicion exists.
5. **A moat?** What stops the 50th copycat next month?

### Step 3: The free-AI test

Try to produce the idea's core deliverable with one prompt to a frontier model.
If one prompt produces the whole deliverable free, the verdict is DEAD with
kill-pattern `free-AI`: the user doesn't have a product, they have a prompt.

### Step 4: Live-market verification (own eyes)

Desk research lies. Walk the user through the Meta Ad Library (or equivalent) with
an explicit checklist: number of ACTIVE advertisers, age of the oldest running ad
(90+ days = someone is paying because it works), and the three traps — zero ads
(`wrong-channel`), a few giants (`incumbent-owned`), or hundreds of ads
(`crowded` commodity knife-fight: demand ≠ room for you).

### Step 5: Verdict

```
VERDICT: DEAD | SURVIVED
KILL-PATTERN: <name>            (if dead)
THE ONE SENTENCE: <the single finding that decided it>
EVIDENCE: <2-4 hard facts with sources/numbers>
NEXT: <if survived: the ONE cheapest test that could still kill it>
```

Then record the result — gated on consent: if `REJECTION.md` exists, or the user
approved creating it in Step 1, append a one-line row (dead) or note the survivor
with the date and pending test. If the user declined the kill-list, do NOT create
or write the file — print the proposed row as text so they can save it wherever
they prefer. The kill-list is the compounding asset — every autopsy makes the
next one faster, but only with the user's consent.

## Examples

### Example 1: Idea that dies on the free-AI test

```
User: Should I build a chargeback-response kit for Shopify sellers? Ready-to-send
      evidence packets, $29 one-time.
Agent: Running the autopsy... Step 3 kills it: one prompt to a frontier model
      produces a complete, usable evidence packet for free.
      VERDICT: DEAD. KILL-PATTERN: free-AI.
      THE ONE SENTENCE: If AI ships your whole deliverable in one prompt, you
      don't have a product — you have a prompt.
```

### Example 2: Proven demand that still dies

```
User: An app that identifies plants from a photo — there are over a thousand
      active ads for these, demand is proven!
Agent: Step 4 confirms ~1,100 active advertisers — and that's the trap. The AI is
      free, the datasets are public, everyone could build it, so everyone did.
      VERDICT: DEAD. KILL-PATTERN: no-moat.
      THE ONE SENTENCE: Demand tells you a market exists; it doesn't tell you
      there's room for you.
```

## Best Practices

- ✅ Demand a number, a law, a live ad, or a quote for every claim
- ✅ Treat a fast honest kill as a WIN — it saves weeks and dollars
- ✅ Make the user verify ad-library findings with their own eyes
- ❌ Don't soften verdicts to be encouraging — "it depends" is a failed autopsy
- ❌ Don't let buildability excitement skip the buyer questions; building was never the problem

## Limitations

- This skill does not replace legal advice, financial advice, or professional market research.
- Kill-patterns are priors, not verdicts — a new niche matching an old pattern still deserves a fresh check that the pattern applies.
- Ad-library checks reflect one acquisition channel; some categories legitimately sell through search or app stores.
- Stop and ask for clarification if the idea's target market, buyer, or deliverable is unclear.

## Security & Safety Notes

- This skill performs no shell commands, network calls, or credential handling.
- It modifies project state in exactly one place: creating or appending rows to the project's own `REJECTION.md` (hence `risk: critical`). It never edits other files; ask permission before creating the file on first run.
- Web checks (ad libraries) are performed by the USER in their own browser; the skill only provides the checklist.
