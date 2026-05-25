---
name: recommendation-canvas
description: Evaluate an AI product idea across outcomes, hypotheses, risks, and positioning. Use when deciding whether an AI solution deserves investment or recommendation.
risk: safe
source: community
---


## Purpose
Evaluate and propose AI product solutions using a structured canvas that assesses business outcomes, customer outcomes, problem framing, solution hypotheses, positioning, risks, and value justification. Use this to build a comprehensive, defensible recommendation for stakeholders and decision-makers—especially when proposing AI-powered features or products that carry higher uncertainty and risk.

This is not a feature spec—it's a strategic proposal that articulates *why* this AI solution is worth building, *what* assumptions need validating, and *how* you'll measure success.

## Key Concepts

### The Recommendation Canvas Framework
Created for Dean Peters' Productside "AI Innovation for Product Managers" class, the canvas synthesizes multiple PM frameworks into one strategic view:

**Core Components:**
1. **Business Outcome:** What's in it for the business?
2. **Product Outcome:** What's in it for the customer?
3. **Problem Statement:** Persona-centric problem framing
4. **Solution Hypothesis:** If/then hypothesis with experiments
5. **Positioning Statement:** Value prop and differentiation
6. **Assumptions & Unknowns:** What could invalidate this?
7. **PESTEL Risks:** Political, Economic, Social, Technological, Environmental, Legal
8. **Value Justification:** Why this is worth doing
9. **Success Metrics:** SMART metrics to measure impact
10. **What's Next:** Strategic next steps

### Why This Works
- **Outcome-driven:** Forces clarity on business AND customer value
- **Hypothesis-centric:** Treats solution as a bet to validate, not a commitment
- **Risk-explicit:** Makes assumptions and risks visible upfront
- **Executive-friendly:** Comprehensive but structured for C-level review
- **AI-appropriate:** Especially useful for AI features with high uncertainty

### Anti-Patterns (What This Is NOT)
- **Not a PRD:** This is strategic framing, not detailed requirements
- **Not a business case (yet):** It informs the business case but needs validation first
- **Not a feature list:** Focus on outcomes, not capabilities

## When to Use
- Proposing a new AI-powered product or feature
- Pitching to execs or securing budget/sponsorship
- Evaluating whether an AI solution is worth pursuing
- Aligning cross-functional stakeholders (product, engineering, data science, business)
- After completing initial discovery (you need context to fill this out)

### When NOT to Use This
- For trivial features (don't over-engineer small tweaks)
- Before any discovery work (you need user research and problem validation first)
- As a replacement for experimentation (canvas informs experiments, not vice versa)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Gather Context
Before filling out the canvas, ensure you have:
- **Problem understanding:** User research, pain points (reference `skills/problem-statement/SKILL.md`)
- **Persona clarity:** Who experiences the problem? (reference `skills/proto-persona/SKILL.md`)
- **Market context:** Competitive landscape, category positioning
- **Business constraints:** Budget, timelines, strategic priorities

**If missing context:** Run discovery work first. This canvas synthesizes insights—it doesn't create them.

---

### Step 2: Define Outcomes

#### Business Outcome
What's in it for the business? Use this format:
- [Direction] [Metric] [Outcome] [Context] [Acceptance Criteria]

```markdown
## Business Outcome
- [e.g., "Reduce by 25% the churn of existing customers using our existing product"]
```

**Example:**
- "Increase by 15% the monthly recurring revenue from enterprise customers within 12 months"

**Quality checks:**
- **Measurable:** Can you track this metric?
- **Time-bound:** Within what timeframe?
- **Ambitious but realistic:** Not "10x revenue in 1 month"

---

#### Product Outcome
What's in it for the customer? Use this format:
- [Direction] [Metric] [Outcome] [Context from persona's POV] [Acceptance Criteria]

```markdown
## Product Outcome
- [e.g., "Increase the speed of finding patients when I know the inclusion and exclusion criteria"]
```

**Example:**
- "Reduce by 60% the time spent manually processing invoices for small business owners"

**Quality checks:**
- **Customer-centric:** Written from user perspective ("I," not "we")
- **Outcome, not feature:** "Reduce time spent" not "Use AI automation"

---

### Step 3: Frame the Problem
Use the problem framing narrative from `skills/problem-statement/SKILL.md`:

```markdown
## The Problem Statement

### Problem Statement Narrative
- [Persona description: 2-3 sentences telling the persona's story from their POV]
- [Example: "Sarah is a freelance designer managing 10 clients. She spends 8 hours/month manually tracking invoices and chasing late payments. By the time she follows up, some clients have already moved to other designers, costing her revenue and damaging relationships."]
```

**Quality checks:**
- **Empathetic:** Does this sound like the user's voice?
- **Specific:** Not "users want better tools" but "Sarah spends 8 hours/month..."
- **Validated:** Based on real user research, not assumptions

---

### Step 4: Define the Solution Hypothesis

#### Hypothesis Statement
Use the epic hypothesis format from `skills/epic-hypothesis/SKILL.md`:

```markdown
## Solution Hypothesis

### Hypothesis Statement
**If we** [action or solution on behalf of target persona]
**for** [target persona]
**Then we will** [attain or achieve desirable outcome]
```

**Example:**
- "If we provide AI-powered invoice reminders that auto-send at optimal times for freelance designers, then we will reduce time spent on payment follow-ups by 70%"

---

#### Tiny Acts of Discovery
Define lightweight experiments to validate the hypothesis:

```markdown
### Tiny Acts of Discovery
**We will test our assumption by:**
- [Experiment 1: Prototype AI reminder system and test with 5 freelancers]
- [Experiment 2: A/B test manual vs. AI-timed reminders for 20 users]
- [Experiment 3: Survey users on perceived value after 2 weeks]
```

**Quality checks:**
- **Fast:** Days/weeks, not months
- **Cheap:** Prototypes, concierge tests, not full builds
- **Falsifiable:** Could prove you wrong

---

#### Proof-of-Life
Define validation measures:

```markdown
### Proof-of-Life
**We know our hypothesis is valid if within** [timeframe]
**we observe:**
- [Quantitative outcome: e.g., "80% of users send reminders via the AI system"]
- [Qualitative outcome: e.g., "8 out of 10 users report saving 5+ hours/month"]
```

---

### Step 5: Define Positioning
Use the positioning statement format from `skills/positioning-statement/SKILL.md`:

```markdown
## Positioning Statement

### Value Proposition
**For** [target customer/user persona]
**that need** [statement of underserved need]
[product name]
**is a** [product category]
**that** [statement of benefit, focusing on outcomes]

### Differentiation Statement
**Unlike** [primary competitor or competitive arena]
[product name]
**provides** [unique differentiation, focusing on outcomes]
```

---

### Step 6: Document Assumptions & Unknowns

```markdown
## Assumptions & Unknowns
- **[Assumption 1]** - [Description, e.g., "We assume users will trust AI-generated reminders"]
- **[Assumption 2]** - [Description, e.g., "We assume payment timing optimization increases response rates"]
- **[Unknown 1]** - [Description, e.g., "We don't know if users prefer email or SMS reminders"]
```

**Quality checks:**
- **Explicit:** Make hidden assumptions visible
- **Testable:** Each assumption can be validated via experiments

---

### Step 7: Identify PESTEL Risks

#### Risks to Investigate (High Priority)
```markdown
## Issues/Risks to Investigate
- **Political:** [e.g., "Regulatory changes to AI-generated communications"]
- **Economic:** [e.g., "Economic downturn reduces willingness to pay for premium features"]
- **Social:** [e.g., "Users may perceive AI reminders as impersonal or pushy"]
- **Technological:** [e.g., "AI model accuracy may degrade over time without retraining"]
- **Environmental:** [e.g., "Energy costs of AI processing"]
- **Legal:** [e.g., "GDPR compliance for storing customer email patterns"]
```

---

#### Risks to Monitor (Lower Priority)
```markdown
## Issues/Risks to Monitor
- **Political:** [e.g., "Potential AI regulation in EU markets"]
- **Economic:** [e.g., "Exchange rate fluctuations affecting international customers"]
- **Social:** [e.g., "Changing norms around automated communication"]
- **Technological:** [e.g., "Emerging AI competitors with better models"]
- **Environmental:** [e.g., "Carbon footprint concerns from stakeholders"]
- **Legal:** [e.g., "Future data privacy laws"]
```

---

### Step 8: Justify the Value

```markdown
## Value Justification

### Is this Valuable?
- [Absolutely yes / Yes with caveats / No with suggested alternatives / Absolutely NO!]

### Solution Justification
<!-- Write these to convince C-level executives -->
We think this is a valuable idea. Here's why:
1. **[Justification 1]** - [Description, e.g., "Addresses the #1 pain point for our target segment"]
2. **[Justification 2]** - [Description, e.g., "Differentiates us from competitors who only offer manual reminders"]
3. **[Justification 3]** - [Description, e.g., "Low technical risk—leverages existing AI infrastructure"]
```

---

### Step 9: Define Success Metrics
Use SMART metrics (Specific, Measurable, Attainable, Relevant, Time-Bound):

```markdown
## Success Metrics
1. **[Metric 1]** - [e.g., "80% of active users adopt AI reminders within 3 months"]
2. **[Metric 2]** - [e.g., "Average time spent on payment follow-ups decreases by 50% within 6 months"]
3. **[Metric 3]** - [e.g., "Net Promoter Score for invoicing feature increases from 6 to 8 within 6 months"]
```

---

### Step 10: Define Next Steps

```markdown
## What's Next
1. **[Next step 1]** - [e.g., "Run 2-week prototype test with 10 beta users"]
2. **[Next step 2]** - [e.g., "Build lightweight AI model for reminder timing optimization"]
3. **[Next step 3]** - [e.g., "Conduct legal review of GDPR implications"]
4. **[Next step 4]** - [e.g., "Present findings to exec team for go/no-go decision"]
5. **[Next step 5]** - [e.g., "If validated, add to Q2 roadmap"]
```

---

## Examples

See `examples/sample.md` for a full recommendation canvas example.

Mini example excerpt:

```markdown
### Business Outcome
- Increase by 20% MRR from freelance users within 12 months

### Solution Hypothesis
**If we** provide AI-powered invoice reminders
**for** freelance designers
**Then we will** reduce time spent on follow-ups by 70%
```

## Common Pitfalls

### Pitfall 1: Vague Outcomes
**Symptom:** "Business outcome: increase revenue. Product outcome: improve UX."

**Consequence:** No measurability or accountability.

**Fix:** Use the outcome formula: [Direction] [Metric] [Outcome] [Context] [Acceptance Criteria]. Be specific.

---

### Pitfall 2: Solution-First Thinking
**Symptom:** Problem statement is "We need AI-powered X"

**Consequence:** You've jumped to solution without validating the problem.

**Fix:** Frame problem from user perspective. Let the solution hypothesis emerge from validated pain points.

---

### Pitfall 3: Skipping Tiny Acts of Discovery
**Symptom:** Hypothesis → straight to roadmap, no experiments

**Consequence:** High risk of building the wrong thing.

**Fix:** Define 2-3 lightweight experiments. Test before committing engineering resources.

---

### Pitfall 4: Generic PESTEL Risks
**Symptom:** "Political: regulations might change"

**Consequence:** Risk analysis is theater, not actionable.

**Fix:** Be specific: "GDPR compliance for storing client email timing data requires legal review."

---

### Pitfall 5: Weak Value Justification
**Symptom:** "This is valuable because customers will like it"

**Consequence:** Not convincing to execs.

**Fix:** Use data: "Addresses #1 pain point per user research. 20% churn reduction = $500k ARR. Low tech risk."

---

## References

### Related Skills
- `skills/problem-statement/SKILL.md` — Informs the problem narrative
- `skills/epic-hypothesis/SKILL.md` — Informs the solution hypothesis structure
- `skills/positioning-statement/SKILL.md` — Informs positioning section
- `skills/proto-persona/SKILL.md` — Defines target persona
- `skills/jobs-to-be-done/SKILL.md` — Informs customer outcomes

### External Frameworks
- Osterwalder's Value Proposition Canvas — Influences problem/solution framing
- PESTEL Analysis — Risk assessment framework
- SMART Goals — Success metrics structure

### Dean's Work
- AI Recommendation Canvas Template (created for Productside "AI Innovation for Product Managers" class)

### Provenance
- Adapted from `prompts/recommendation-canvas-template.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `recommendation-canvas.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/problem-statement/SKILL.md`, `skills/epic-hypothesis/SKILL.md`, `skills/positioning-statement/SKILL.md`, `skills/proto-persona/SKILL.md`, `skills/jobs-to-be-done/SKILL.md`
