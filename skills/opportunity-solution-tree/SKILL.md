---
name: opportunity-solution-tree
description: Build an Opportunity Solution Tree from outcomes to opportunities, solutions, and tests. Use when a stakeholder request needs problem framing before you decide what to build.
risk: safe
source: community
---


## Purpose
Guide product managers through creating an Opportunity Solution Tree (OST) by extracting target outcomes from stakeholder requests, generating opportunity options (problems to solve), mapping potential solutions, and selecting the best proof-of-concept (POC) based on feasibility, impact, and market fit. Use this to move from vague product requests to structured discovery, ensuring teams solve the right problems before jumping to solutions—avoiding "feature factory" syndrome and premature convergence on ideas.

This is not a roadmap generator—it's a structured discovery process that outputs validated opportunities with testable solution hypotheses.

## Key Concepts

### What is an Opportunity Solution Tree (OST)?

An OST is a visual framework (Teresa Torres, *Continuous Discovery Habits*) that connects:
1. **Desired Outcome** (business goal or product metric)
2. **Opportunities** (customer problems, needs, pain points, or desires that could drive the outcome)
3. **Solutions** (ways to address each opportunity)
4. **Experiments** (tests to validate solutions)

**Structure:**
```
         Desired Outcome (1)
                |
    +-----------+-----------+
    |           |           |
Opportunity  Opportunity  Opportunity (3)
    |           |           |
  +-+-+       +-+-+       +-+-+
  | | |       | | |       | | |
 S1 S2 S3    S1 S2 S3    S1 S2 S3 (9 total solutions)
```

### Why This Works
- **Outcome-driven:** Starts with business goal, not feature requests
- **Divergent before convergent:** Explores multiple opportunities before picking solutions
- **Problem-focused:** Opportunities are problems, not solutions disguised as problems
- **Testable:** Each solution maps to experiments, not just "build it and ship"
- **POC selection:** Evaluates feasibility, impact, market fit before committing resources

### Anti-Patterns (What This Is NOT)
- **Not a feature list:** Opportunities are problems customers face, not "we need dark mode"
- **Not solution-first:** Don't start with "we should build X"—start with "customers struggle with Y"
- **Not waterfall planning:** OST is a discovery tool, not a project plan
- **Not a one-time exercise:** OSTs evolve as you learn from experiments

## When to Use
- Stakeholder requests a feature or product initiative
- Starting discovery for a new product area
- Clarifying vague OKRs or strategic goals
- Prioritizing which problems to solve first
- Aligning team on what outcomes you're driving

### When NOT to Use This
- When the problem is already validated (move to solution testing)
- For tactical bug fixes or technical debt (no discovery needed)
- When stakeholders demand a specific solution (address alignment issues first)

---

### Facilitation Source of Truth

Use [`workshop-facilitation`](../workshop-facilitation/SKILL.md) as the default interaction protocol for this skill.

It defines:
- session heads-up + entry mode (Guided, Context dump, Best guess)
- one-question turns with plain-language prompts
- progress labels (for example, Context Qx/8 and Scoring Qx/5)
- interruption handling and pause/resume behavior
- numbered recommendations at decision points
- quick-select numbered response options for regular questions (include `Other (specify)` when useful)

This file defines the domain-specific assessment content. If there is a conflict, follow this file's domain logic.

## Application

Use `template.md` for the full fill-in structure.

This interactive skill follows a **two-phase process**:

**Phase 1:** Generate OST (extract outcome, identify opportunities, map solutions)
**Phase 2:** Select POC (evaluate solutions, recommend best starting point)

---

### Step 0: Gather Context (Before Questions)

**Agent suggests:**

Before we create your Opportunity Solution Tree, let's gather context:

**Stakeholder Request or Product Initiative:**
- What did the stakeholder ask for? (Feature request, product idea, strategic goal)
- Any existing materials: PRD drafts, OKR documents, strategy memos, meeting notes
- Problem statements, customer complaints, or research findings

**Product Context (if available):**
- Website copy, positioning statements, product descriptions
- Competitor materials, customer reviews (G2, Capterra), community discussions
- Usage data, support tickets, churn reasons

**You can paste this content directly, or describe the request briefly.**

---

## Phase 1: Generate Opportunity Solution Tree

### Question 1: Extract Desired Outcome

**Agent asks:**
"What's the desired outcome for this initiative? (What business or product metric are you trying to move?)"

**Offer 4 enumerated options:**

1. **Revenue growth** — "Increase ARR, expand revenue from existing customers, new revenue streams" (Common for scaling products)
2. **Customer retention** — "Reduce churn, increase activation, improve engagement/stickiness" (Common for established products with retention issues)
3. **Customer acquisition** — "Increase sign-ups, trial conversions, new user growth" (Common for early-stage or growth products)
4. **Product efficiency** — "Reduce support costs, decrease time-to-value, improve operational metrics" (Common for mature products optimizing operations)

**Or describe your specific desired outcome (be measurable: e.g., "Increase trial-to-paid conversion from 15% to 25%").**

**User response:** [Selection or custom]

**Agent extracts and confirms:**
- **Desired Outcome:** [Specific, measurable outcome]
- **Why it matters:** [Rationale from stakeholder request or context]

---

### Question 2: Identify Opportunities (Problems to Solve)

**Agent generates 3 opportunities** based on the desired outcome and context provided.

**Agent says:**
"Based on your desired outcome ([from Q1]) and the context you provided, here are **3 opportunities** (customer problems or needs) that could drive this outcome:"

**Example (if Outcome = Increase trial-to-paid conversion):**

1. **Opportunity 1: Users don't experience value during trial** — "New users sign up but don't complete onboarding, never reach 'aha moment,' abandon before seeing core value"
   - Evidence: [From context: onboarding analytics, support tickets, exit surveys]

2. **Opportunity 2: Pricing is unclear or misaligned** — "Users unsure if paid plan is worth it; don't understand what they get for the price; pricing page confusing"
   - Evidence: [From context: conversion funnel drop-off at pricing page, sales objections]

3. **Opportunity 3: Free plan is 'good enough'** — "Users stay on free tier indefinitely because it meets their needs; no compelling reason to upgrade"
   - Evidence: [From context: freemium user retention data, support tickets asking for workarounds]

**Agent asks:**
"Which opportunity feels most critical to explore first, or would you like to modify/add opportunities?"

**User response:** [Selection or custom]

---

### Question 3: Generate Solutions for Selected Opportunity

**Agent generates 3 solution ideas** for the selected opportunity.

**Agent says:**
"For **Opportunity [X]: [Name]**, here are **3 potential solutions** to test:"

**Example (if Opportunity 1 selected: Users don't experience value during trial):**

1. **Solution 1: Guided onboarding checklist** — "Interactive checklist that walks users through core workflows step-by-step (e.g., 'Create your first project,' 'Invite a teammate,' 'Complete a task')"
   - Hypothesis: Structured guidance increases completion rate
   - Experiment: A/B test checklist vs. no checklist, measure activation rate

2. **Solution 2: Time-to-value triggers** — "Automatically prompt users when they're stuck (e.g., 'You haven't created a project yet—here's a template to get started')"
   - Hypothesis: Proactive nudges prevent drop-off
   - Experiment: Track engagement with prompts, measure trial-to-paid lift

3. **Solution 3: Human-assisted onboarding** — "Offer 15-min onboarding call with CSM for high-value trial users (enterprise, team plans)"
   - Hypothesis: Personal touch increases conversion for high-intent users
   - Experiment: Offer to 50 trial users, measure conversion vs. control group

**Agent asks:**
"Would you like to explore solutions for another opportunity, or move to POC selection?"

**User response:** [Selection or custom]

---

## Phase 2: Select Proof-of-Concept (POC)

After generating solutions, the agent helps select which solution to test first.

---

### Question 4: Evaluate Solutions (Feasibility, Impact, Market Fit)

**Agent says:**
"Let's evaluate your solutions to pick the best starting point. I'll score each solution on **Feasibility** (how hard to build), **Impact** (how much it could move the outcome), and **Market Fit** (how well it aligns with customer needs)."

**Agent generates evaluation table:**

| Solution | Feasibility (1-5) | Impact (1-5) | Market Fit (1-5) | Total Score | Rationale |
|----------|-------------------|--------------|------------------|-------------|-----------|
| Solution 1: Guided onboarding checklist | 4 | 4 | 5 | 13 | High feasibility (UI pattern), proven impact (industry standard), strong market fit (users expect onboarding) |
| Solution 2: Time-to-value triggers | 3 | 3 | 4 | 10 | Medium feasibility (requires analytics integration), moderate impact (depends on trigger quality), good market fit |
| Solution 3: Human-assisted onboarding | 5 | 5 | 3 | 13 | High feasibility (no dev work), high impact (personal touch), lower market fit (doesn't scale, high-touch only) |

**Scoring criteria:**
- **Feasibility:** 1 = months of work, 5 = days/weeks
- **Impact:** 1 = minimal outcome movement, 5 = major outcome shift
- **Market Fit:** 1 = customers don't care, 5 = customers actively request this

**Agent recommends:**

**Recommended POC: Solution 1 (Guided onboarding checklist)**

**Why this POC:**
- Balances feasibility (can build in 2-4 weeks) with impact (proven pattern)
- Strong market fit (users expect onboarding guidance)
- Testable hypothesis: "If we guide users through core workflows, activation rate will increase from X% to Y%"

**Alternative POC:** Solution 3 (Human-assisted onboarding)
- If you want to learn fast with no dev work, start here
- Test manually with 20-50 trial users, gather qualitative feedback
- Use learnings to inform automated solution (Solution 1)

**Not recommended for POC:** Solution 2 (Time-to-value triggers)
- Requires more upfront investment
- Impact depends on trigger quality (needs experimentation to get right)
- Better as follow-up after validating core onboarding flow

---

### Question 5: Define Experiment

**Agent asks:**
"How will you test this solution? What's the experiment?"

**Offer 3 enumerated options:**

1. **A/B test** — "Build MVP, show to 50% of trial users, compare conversion vs. control" (Best for: Quantitative validation, requires traffic)
2. **Prototype + usability test** — "Create clickable prototype, watch 10 users attempt onboarding, gather qualitative feedback" (Best for: Early-stage validation, low traffic)
3. **Manual concierge test** — "Run the solution manually with 20 users (e.g., personally walk them through onboarding), measure outcomes" (Best for: Learning fast, no dev work)

**Or describe your experiment approach.**

**User response:** [Selection or custom]

---

### Output: Opportunity Solution Tree + POC Plan

After completing the flow, the agent outputs:

```markdown
# Opportunity Solution Tree + POC Plan

## Desired Outcome
**Outcome:** [From Q1]
**Target Metric:** [Specific, measurable goal]
**Why it matters:** [Rationale]

---

## Opportunity Map

### Opportunity 1: [Name]
**Problem:** [Description]
**Evidence:** [From context]

**Solutions:**
1. [Solution A]
2. [Solution B]
3. [Solution C]

---

### Opportunity 2: [Name]
**Problem:** [Description]
**Evidence:** [From context]

**Solutions:**
1. [Solution A]
2. [Solution B]
3. [Solution C]

---

### Opportunity 3: [Name]
**Problem:** [Description]
**Evidence:** [From context]

**Solutions:**
1. [Solution A]
2. [Solution B]
3. [Solution C]

---

## Selected POC

**Opportunity:** [Selected opportunity]
**Solution:** [Selected solution]

**Hypothesis:**
- "If we [implement solution], then [outcome metric] will [increase/decrease] from [X] to [Y] because [rationale]."

**Experiment:**
- **Type:** [A/B test / Prototype test / Concierge test]
- **Participants:** [Number of users, segment]
- **Duration:** [Timeline]
- **Success criteria:** [What validates the hypothesis]

**Feasibility Score:** [1-5]
**Impact Score:** [1-5]
**Market Fit Score:** [1-5]
**Total:** [Sum]

**Why this POC:**
- [Rationale 1]
- [Rationale 2]
- [Rationale 3]

---

## Next Steps

1. **Build experiment:** [Specific action, e.g., "Create onboarding checklist wireframes"]
2. **Run experiment:** [Specific action, e.g., "Deploy to 50% of trial users for 2 weeks"]
3. **Measure results:** [Specific metric, e.g., "Compare activation rate: checklist vs. control"]
4. **Decide:** [If successful → scale; if failed → try next solution]

---

**Ready to build the experiment? Let me know if you'd like to refine the hypothesis or explore alternative solutions.**
```

---

## Examples

See `examples/sample.md` for full OST examples.

Mini example excerpt:

```markdown
**Desired Outcome:** Increase trial-to-paid conversion from 15% to 25%
**Opportunity:** Users don’t reach "aha" moment during trial
**Solution:** Guided onboarding checklist
```

## Common Pitfalls

### Pitfall 1: Opportunities Disguised as Solutions
**Symptom:** "Opportunity: We need a mobile app"

**Consequence:** You've already converged on a solution without exploring the problem.

**Fix:** Reframe opportunities as customer problems: "Mobile-first users can't access product on the go."

---

### Pitfall 2: Skipping Divergence (Jumping to One Solution)
**Symptom:** "We know the solution is [X], just need to build it"

**Consequence:** Miss better alternatives, no learning.

**Fix:** Generate at least 3 solutions per opportunity. Force divergence before convergence.

---

### Pitfall 3: Outcome is Too Vague
**Symptom:** "Desired Outcome: Improve user experience"

**Consequence:** Can't measure success, can't prioritize opportunities.

**Fix:** Make outcomes measurable: "Increase NPS from 30 to 50" or "Reduce onboarding drop-off from 60% to 40%."

---

### Pitfall 4: No Experiments (Just Build It)
**Symptom:** Picking a solution and moving straight to roadmap

**Consequence:** No validation, high risk of building wrong thing.

**Fix:** Every solution must map to an experiment. No experiments = no OST.

---

### Pitfall 5: Analysis Paralysis (Exploring Forever)
**Symptom:** Generating 20 opportunities, 50 solutions, never picking one

**Consequence:** Team stuck in discovery, no progress.

**Fix:** Limit to 3 opportunities, 3 solutions each (9 total). Pick POC, run experiment, learn, iterate.

---

## References

### Related Skills
- `skills/problem-statement/SKILL.md` — Frames opportunities as customer problems
- `skills/jobs-to-be-done/SKILL.md` — Helps identify opportunities from JTBD research
- `skills/epic-hypothesis/SKILL.md` — Turns validated solutions into testable epics
- `skills/user-story/SKILL.md` — Breaks experiments into deliverable stories
- `skills/discovery-interview-prep/SKILL.md` — Validates opportunities through customer interviews

### External Frameworks
- Teresa Torres, *Continuous Discovery Habits* (2021) — Origin of Opportunity Solution Tree
- Jeff Patton, *User Story Mapping* (2014) — Outcome-driven product planning
- Ash Maurya, *Running Lean* (2012) — Hypothesis-driven experimentation

### Dean's Work
- Productside Blueprint — Strategic product discovery process
- [If Dean has OST resources, link here]

---

**Skill type:** Interactive
**Suggested filename:** `opportunity-solution-tree.md`
**Suggested placement:** `/skills/interactive/`
**Dependencies:** Uses `skills/problem-statement/SKILL.md`, `skills/jobs-to-be-done/SKILL.md`, `skills/epic-hypothesis/SKILL.md`, `skills/user-story/SKILL.md`
