---
name: epic-hypothesis
description: Frame an epic as a testable hypothesis with target user, expected outcome, and validation method. Use when defining a major initiative before roadmap, discovery, or delivery planning.
risk: safe
source: community
---


## Purpose
Frame epics as testable hypotheses using an if/then structure that articulates the action or solution, the target beneficiary, the expected outcome, and how you'll validate success. Use this to manage uncertainty in product development by making assumptions explicit, defining lightweight experiments ("tiny acts of discovery"), and establishing measurable success criteria before committing to full build-out.

This is not a requirements spec—it's a hypothesis you're testing, not a feature you're committed to shipping.

## Key Concepts

### The Epic Hypothesis Framework
Inspired by Tim Herbig's Lean UX hypothesis format, the structure is:

**If/Then Hypothesis:**
- **If we** [action or solution on behalf of target persona]
- **for** [target persona]
- **Then we will** [attain or achieve a desirable outcome or job-to-be-done]

**Tiny Acts of Discovery Experiments:**
- **We will test our assumption by:**
  - [Experiment 1]
  - [Experiment 2]
  - [Add more as necessary]

**Validation Measures:**
- **We know our hypothesis is valid if within** [timeframe]
- **we observe:**
  - [Quantitative measurable outcome]
  - [Qualitative measurable outcome]
  - [Add more as necessary]

### Why This Structure Works
- **Hypothesis-driven:** Forces you to state what you believe (and could be wrong about)
- **Outcome-focused:** "Then we will" emphasizes user benefit, not feature output
- **Experiment-first:** Encourages lightweight validation before full build
- **Falsifiable:** Clear success criteria make it possible to kill bad ideas early
- **Risk management:** Treats epics as bets, not commitments

### Anti-Patterns (What This Is NOT)
- **Not a feature spec:** "Build a dashboard with 5 charts" is a feature, not a hypothesis
- **Not a guaranteed commitment:** Hypotheses can (and should) be invalidated
- **Not output-focused:** "Ship feature X by Q2" misses the point—did it achieve the outcome?
- **Not experiment-free:** If you skip experiments and go straight to build, you're not testing a hypothesis

## When to Use
- Early-stage feature exploration (before committing to full roadmap)
- Validating product-market fit for new capabilities
- Prioritizing backlog (epics with validated hypotheses get higher priority)
- Managing stakeholder expectations (frame work as experiments, not promises)

### When NOT to Use This
- For well-validated features (if you've already proven demand, skip straight to user stories)
- For trivial features (don't over-engineer small tweaks)
- When experiments aren't feasible (rare, but sometimes you must commit before testing)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Gather Context
Before drafting an epic hypothesis, ensure you have:
- **Problem understanding:** What user problem does this address? (reference `skills/problem-statement/SKILL.md`)
- **Target persona:** Who benefits? (reference `skills/proto-persona/SKILL.md`)
- **Jobs-to-be-Done:** What outcome are they trying to achieve? (reference `skills/jobs-to-be-done/SKILL.md`)
- **Current alternatives:** What do users do today? (competitors, workarounds, doing nothing)

**If missing context:** Run discovery interviews or problem validation work first.

---

### Step 2: Draft the If/Then Hypothesis

Fill in the template:

```markdown
### If/Then Hypothesis

**If we** [action or solution on behalf of the target persona]
**for** [target persona]
**Then we will** [attain or achieve a desirable outcome or job-to-be-done for the persona]
```

**Quality checks:**
- **"If we" is specific:** Not "improve the product" but "add one-click Slack notifications when tasks are assigned"
- **"For" is a clear persona:** Not "users" but "remote project managers juggling 3+ distributed teams" (reference `skills/proto-persona/SKILL.md`)
- **"Then we will" is an outcome:** Not "users will have notifications" but "users will respond to task assignments 50% faster"

**Examples:**
- ✅ "If we add one-click Google Calendar integration for trial users, then we will increase activation rates by 20% within 30 days"
- ✅ "If we provide bulk delete functionality for power users managing 1000+ items, then we will reduce time spent on cleanup tasks by 70%"
- ❌ "If we build a dashboard, then users will use it" (vague, not measurable)

---

### Step 3: Design Tiny Acts of Discovery Experiments

Before building the full epic, define lightweight experiments to test the hypothesis:

```markdown
### Tiny Acts of Discovery Experiments

**We will test our assumption by:**
- [Experiment 1: low-cost, fast test]
- [Experiment 2: another low-cost, fast test]
- [Add more as necessary]
```

**Experiment types:**
- **Prototype + user testing:** Fake the feature with a clickable prototype, test with 5-10 users
- **Concierge test:** Manually perform the feature for a few users, see if they value it
- **Landing page test:** Describe the feature, measure sign-ups or interest
- **Wizard of Oz test:** Present the feature as if it's automated, but do it manually behind the scenes
- **A/B test (if feasible):** Test a lightweight version vs. control

**Quality checks:**
- **Fast:** Experiments should take days/weeks, not months
- **Cheap:** Avoid full engineering builds—use prototypes, manual processes, or existing tools
- **Falsifiable:** Design experiments that could prove you *wrong*

**Examples:**
- "Create a Figma prototype of the bulk delete flow and test with 5 power users"
- "Manually send Slack notifications to 10 trial users and track response time"
- "Add a 'Request this feature' button to the UI and measure click-through rate"

---

### Step 4: Define Validation Measures

Specify what success looks like and the timeframe for evaluation:

```markdown
### Validation Measures

**We know our hypothesis is valid if within** [timeframe in days or weeks]
**we observe:**
- [Desirable quantitative, measurable outcome]
- [Desirable qualitative, measurable outcome]
- [Add more as necessary]
```

**Quality checks:**
- **Timeframe is realistic:** Not "within 6 months" (too slow) or "within 3 days" (too fast)
- **Quantitative measures are specific:** Not "more users" but "20% increase in activation rate"
- **Qualitative measures are observable:** Not "users like it" but "8 out of 10 users say they'd pay for this feature"

**Examples:**
- ✅ "Within 4 weeks, we observe:"
  - "Activation rate increases from 40% to 50% (quantitative)"
  - "75% of surveyed trial users say the integration saved them time (qualitative)"
- ❌ "Within 1 year, we observe:"
  - "Revenue goes up" (too vague, too long)

---

### Step 5: Run Experiments and Evaluate

- **Execute experiments:** Build prototypes, run tests, gather data
- **Measure results:** Did you hit the validation measures?
- **Decision point:**
  - ✅ **Hypothesis validated:** Proceed to building user stories and adding to roadmap
  - ❌ **Hypothesis invalidated:** Kill the epic or pivot to a different hypothesis
  - ⚠️ **Inconclusive:** Run additional experiments or tighten validation measures

---

### Step 6: Convert to User Stories (If Validated)

Once the hypothesis is validated, break the epic into user stories:

```markdown
### Epic: [Epic Name]

**Stories:**
1. [User Story 1 - reference `skills/user-story/SKILL.md`]
2. [User Story 2]
3. [User Story 3]
```

---

## Examples

See `examples/sample.md` for full epic hypothesis examples.

Mini example excerpt:

```markdown
**If we** provide one-click Google Calendar integration
**for** trial users managing multiple meetings
**Then we will** increase activation rate from 40% to 50%
```

---

## Common Pitfalls

### Pitfall 1: Hypothesis is a Feature, Not an Outcome
**Symptom:** "If we build a dashboard, then we will have a dashboard"

**Consequence:** You're describing output, not outcome. This doesn't test anything.

**Fix:** Focus on the user outcome: "If we build a dashboard showing real-time task status, then PMs will spend 50% less time asking for status updates."

---

### Pitfall 2: Skipping Experiments
**Symptom:** "We'll test our assumption by building the full feature"

**Consequence:** You've committed to building before validating. Not a hypothesis—it's a feature commitment.

**Fix:** Design lightweight experiments (prototypes, concierge tests, landing pages) that take days/weeks, not months.

---

### Pitfall 3: Vague Validation Measures
**Symptom:** "We know it's valid if users are happy"

**Consequence:** Success criteria are subjective and unmeasurable.

**Fix:** Define specific, falsifiable metrics: "80% of surveyed users rate the feature 4+ out of 5" or "Response time drops by 50%."

---

### Pitfall 4: Unrealistic Timeframes
**Symptom:** "We know it's valid if within 6 months revenue increases"

**Consequence:** Too slow to inform decisions. By then, you've already built it.

**Fix:** Aim for 2-4 week validation cycles. If you can't measure in that timeframe, choose a leading indicator (e.g., activation rate, not annual revenue).

---

### Pitfall 5: Treating Epics as Commitments
**Symptom:** "We already told the CEO we're shipping this, so we have to validate it"

**Consequence:** Experiments are theater—you're going to build it regardless of results.

**Fix:** Frame epics as hypotheses *before* making commitments. If stakeholders need certainty, explain the risk of building unvalidated features.

---

## References

### Related Skills
- `skills/problem-statement/SKILL.md` — Hypothesis should address a validated problem
- `skills/proto-persona/SKILL.md` — Defines the "for [persona]" section
- `skills/jobs-to-be-done/SKILL.md` — Informs the "then we will" outcome
- `skills/user-story/SKILL.md` — Validated epics decompose into user stories
- `skills/user-story-splitting/SKILL.md` — How to break validated epics into stories

### External Frameworks
- Tim Herbig, *Lean UX Hypothesis Statement* — Origin of if/then hypothesis format
- Jeff Gothelf & Josh Seiden, *Lean UX* (2013) — Hypothesis-driven product development
- Alberto Savoia, *Pretotype It* (2011) — Lightweight experiments to validate ideas
- Eric Ries, *The Lean Startup* (2011) — Build-Measure-Learn cycle

### Dean's Work
- Backlog Epic Hypothesis Prompt (inspired by Tim Herbig's framework)

### Provenance
- Adapted from `prompts/backlog-epic-hypothesis.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `epic-hypothesis.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/problem-statement/SKILL.md`, `skills/proto-persona/SKILL.md`, `skills/jobs-to-be-done/SKILL.md`
**Used by:** `skills/user-story/SKILL.md`, `skills/user-story-splitting/SKILL.md`
