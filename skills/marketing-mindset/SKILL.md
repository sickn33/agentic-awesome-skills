---
name: marketing-mindset
description: "Use when a marketing, growth, or client-acquisition task needs a marketer's operating mindset instead of tactics — first customers, idea evaluation, positioning, cold outreach, ads, copy."
category: marketing
risk: none
source: https://github.com/axelfreeman/marketing-mindset
source_repo: axelfreeman/marketing-mindset
source_type: community
date_added: "2026-09-21"
author: axelfreeman
tags: [marketing, growth, positioning, cold-outreach, go-to-market, b2b, decision-making]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/axelfreeman/marketing-mindset/blob/main/LICENSE"
---

# Marketing Mindset

## Overview

A marketing operating system distilled from 15 years of hands-on B2B internet marketing. It is not a tactic library — it is the reasoning layer that decides which tactic is worth running. The skill gives an agent an opinionated method for the questions a founder actually asks: where the first customers come from, whether an idea is worth the effort, what promise belongs on the landing page, how to reach someone cold.

The gap it fills: most marketing skills hand over checklists. None of them model how a marketer *decides*. That matters most when what is being sold cannot be touched — a service, a SaaS product, an offer nobody has validated yet.

## When to Use This Skill

- Use when the user asks where their first customers come from, or how to get clients for a product with no traction.
- Use when the user asks "should I do X to get Y" and needs the idea evaluated honestly instead of encouraged.
- Use when the user needs positioning, an offer, a landing-page promise, an ad, cold outreach, or a creative brief.
- Use when the user wants marketing copy or visuals and would otherwise get generic, template-shaped output.
- Do not use when a narrower tool skill already covers the exact tactical how-to, or when the task is not marketing at all.

## How It Works

### Step 1: Replace stale doctrine with a current source of truth

Do not answer from cached knowledge or the first search results — it is globally outdated and usually inapplicable to this situation. Work from fresh data. The first source of truth is competitors, and specifically the ones **working the same audience right now and making money at it**; a young growing company's moves are the most valuable, a plateauing company's press coverage is noise.

### Step 2: Set the horizon and the test before the idea

Evaluate every idea on a three-month window, because planning cycles are three months and anyone pitching a two-year cycle is not being straight. Then force the hypothesis into a shape that can be tested fast, by anyone on the team, isolating one variable — never a hypothesis that needs a specialist or weeks of setup.

### Step 3: Start with client number one, by hand

The first client is won by hand and for free — cold email, cold outreach, direct contact. Paid channels are a scaling instrument, not a starting one; money in marketing buys access to a channel that already works, so it cannot rescue a product with no clients. Competitors get copied for clients two through ten. Beyond that is a different skill.

### Step 4: Sharpen the presentation, not the facts

Take the user's raw description and translate it into marketing language without inventing proof. The reference point is the McDonald's burger: the photograph is meant to be better than what is handed over. Position boldly and borrow competitor wording legally, but never fabricate testimonials or numbers.

### Step 5: Serve both halves of attention

Every person's attention splits in two: the rational half, reachable mathematically with facts, and the emotional half, which is where the real work is. Reach both, and put the user into the emotional investment instead of asking whether they want to. Every number in the plan should also be checkable, because proxy metrics and perfect-looking case studies are written by someone — interrogate them first.

## Examples

### Example 1: a B2B SaaS with zero customers

**User**: "We built a SaaS for finance teams. How do we get customers?"

**Answer shape** (the skill's output, not a template):

```
Client #0 = the founder using the product. Client #1 is won by hand this week:
a list of 40 finance leads, one cold email, sent manually.

Competitor set (earning from the same audience today): <3 named companies>.
Their closest move to our stage: <the one you copy>.

Promise for the landing page: <product's intended value, in plain words>.

Test: 60 sends, one variable (the opening line).
Verdict threshold declared now: 2+ replies = wording works; 0 replies = the offer does not land yet.
No paid channels — there is no flow yet to scale.
```

### Example 2: deciding whether an idea is worth it

**User**: "Should our first move be a Product Hunt launch?"

The answer is a straight no with the reasoning attached: that channel is a battleground where marketers fight marketers, it is read as advertising rather than as market truth, and a launch is not how first clients are won by hand.

## Best Practices

- ✅ Start from the competitor who is earning right now, and copy the move closest to your own stage.
- ✅ Declare the test volume before the test starts, so the result is a verdict and not a mood.
- ✅ Keep every deliverable concrete: a shot list, an ad draft, a send list, a launch instruction.
- ✅ Say the inconvenient thing out loud when the maths says an idea will not work.
- ❌ Don't recommend paid channels to a user with zero clients.
- ❌ Don't treat Product Hunt, top-10 lists, influencer posts, or any report older than six months as truth.

## Common Pitfalls

- **Problem:** Answering from general marketing knowledge because it feels fluent.
  **Solution:** Check the current competitive field first; fluency is the failure mode here.
- **Problem:** A hypothesis that looks reasonable and has already failed for everyone else.
  **Solution:** When the reasonable moves are exhausted, expect the working hypothesis to look strange — that is the method, not a dead end.
- **Problem:** Scaling with money before a single client has been won by hand.
  **Solution:** Prove the exchange by hand first; if the product cannot win a client that way, that is the honest answer.

## Limitations

- It is a reasoning layer, not a channel playbook: it will not produce a keyword-research table, an ad-platform walkthrough, or a media plan. Pair it with channel-specific skills for those.
- Scope stops at the first ten clients. Scaling from 10 to 100 is explicitly out of scope.
- The method assumes a B2B or SaaS-shaped offer with a reachable buyer; it was not built for consumer marketplaces, brand/awareness campaigns, or enterprise ABM motion.
- It carries one practitioner's opinionated stance (no paid channels before clients, three-month horizon, competitors as first source of truth). Where a team's own tested playbook disagrees, the team's evidence wins.
- It does not verify the user's market data; the numbers it reasons from still have to come from real sources.

## Verification

- Every hypothesis carries a three-month outcome and one fast test.
- The competitor set names companies working the user's exact audience today.
- The first-client plan is concrete and names client #0.
- Output is content, offers, and tests — not advice.

## Additional Resources

- [marketing-mindset repository](https://github.com/axelfreeman/marketing-mindset) — SKILL.md, lite and DeepSeek variants, demo transcript, install command.
- [Landing page and docs](https://axelfreeman.github.io/marketing-mindset/) — the full method and the test-volume limits table with cited sources.
