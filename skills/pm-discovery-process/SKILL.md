---
name: pm-discovery-process
description: Run a full discovery cycle from problem hypothesis to validated solution. Use when a team needs a structured path through framing, interviews, synthesis, and experiments.
risk: safe
source: community
---


## Purpose
Guide product managers through a complete discovery cycle—from initial problem hypothesis to validated solution—by orchestrating problem framing, customer interviews, synthesis, and experimentation skills into a structured process. Use this to systematically explore problem spaces, validate assumptions, and build confidence before committing to full development—avoiding "build it and they will come" syndrome and ensuring you're solving real customer problems.

This is not a one-time research project—it's a continuous discovery practice that runs in parallel with delivery, typically 1-2 discovery cycles per quarter.

## Key Concepts

### What is the Discovery Process?

The discovery process (Teresa Torres, Marty Cagan) is a structured approach to exploring problem spaces and validating solutions before building. It consists of:

1. **Frame the Problem** — Define what you're investigating and why
2. **Conduct Research** — Gather qualitative and quantitative evidence
3. **Synthesize Insights** — Identify patterns, pain points, and opportunities
4. **Generate Solutions** — Explore multiple solution options
5. **Validate Solutions** — Test assumptions through experiments
6. **Decide & Document** — Commit to build, pivot, or kill

### Why This Works
- **De-risks product decisions:** Tests assumptions before expensive builds
- **Customer-centric:** Grounds decisions in real customer problems, not internal opinions
- **Iterative:** Builds confidence progressively through small experiments
- **Fast learning:** Discovers "no-go" signals early, saves wasted effort

### Anti-Patterns (What This Is NOT)
- **Not waterfall research:** Discovery runs continuously, not once before dev
- **Not user testing:** Discovery validates problems; testing validates solutions
- **Not a substitute for shipping:** Discovery informs delivery, doesn't replace it

## When to Use
- Exploring new product/feature areas
- Investigating retention or churn problems
- Validating strategic initiatives before roadmap commitment
- Continuous discovery (weekly customer touchpoints)

### When NOT to Use This
- For well-understood problems (move to execution)
- When stakeholders have already committed to a solution (address alignment first)
- For tactical bug fixes or technical debt (no discovery needed)

---

### Facilitation Source of Truth

When running this workflow as a guided conversation, use [`workshop-facilitation`](../workshop-facilitation/SKILL.md) as the interaction protocol.

It defines:
- session heads-up + entry mode (Guided, Context dump, Best guess)
- one-question turns with plain-language prompts
- progress labels (for example, Context Qx/8 and Scoring Qx/5)
- interruption handling and pause/resume behavior
- numbered recommendations at decision points
- quick-select numbered response options for regular questions (include `Other (specify)` when useful)

This file defines the workflow sequence and domain-specific outputs. If there is a conflict, follow this file's workflow logic.

## Application

Use `template.md` for the full fill-in structure.

This workflow orchestrates **6 phases** over **2-4 weeks**, using multiple component and interactive skills.

---

## Phase 1: Frame the Problem (Day 1-2)

**Goal:** Define what you're investigating, who's affected, and success criteria.

### Activities

**1. Run Problem Framing Canvas**
- **Use:** `skills/problem-framing-canvas/SKILL.md` (interactive - MITRE)
- **Participants:** PM, design, engineering lead
- **Duration:** 120 minutes
- **Output:** Problem statement + "How Might We" question

**2. Create Formal Problem Statement**
- **Use:** `skills/problem-statement/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Structured problem statement with hypothesis

**3. Define Proto-Personas (If Needed)**
- **Use:** `skills/proto-persona/SKILL.md` (component)
- **When:** If target customer segment is unclear
- **Duration:** 60 minutes
- **Output:** Hypothesis-driven personas

**4. Map Jobs-to-be-Done (If Needed)**
- **Use:** `skills/jobs-to-be-done/SKILL.md` (component)
- **When:** If customer motivations are unclear
- **Duration:** 60 minutes
- **Output:** JTBD statements

### Outputs from Phase 1

- **Problem hypothesis:** "We believe [persona] struggles with [problem] because [root cause], leading to [consequence]."
- **Research questions:** 3-5 questions to answer through discovery
- **Success criteria:** What would validate/invalidate the problem?

### Decision Point 1: Do we have enough context to start research?

**If YES:** Proceed to Phase 2 (Research Planning)

**If NO:** Gather existing data first:
- Review support tickets, churn surveys, NPS feedback
- Analyze product analytics (drop-off points, usage patterns)
- Review competitor research, market trends
- **Time impact:** +2-3 days

---

## Phase 2: Research Planning (Day 3)

**Goal:** Design research approach, recruit participants, prepare interview guide.

### Activities

**1. Prep Discovery Interviews**
- **Use:** `skills/discovery-interview-prep/SKILL.md` (interactive)
- **Participants:** PM, design
- **Duration:** 90 minutes
- **Output:** Interview plan with methodology, questions, biases to avoid

**2. Recruit Participants**
- **Target:** 5-10 customers per discovery cycle (Teresa Torres: continuous discovery = 1 interview/week)
- **Segment:** Focus on personas from Phase 1
- **Recruitment channels:**
  - Existing customers (email, in-app prompts)
  - Churned customers (exit interviews)
  - Cold outreach (LinkedIn, communities)
- **Incentive:** $50-100 gift card or product credit
- **Duration:** 2-3 days (parallel with Phase 1)

**3. Schedule Interviews**
- **Format:** 45-60 min per interview (30-40 min conversation + buffer)
- **Timeline:** Spread across 1-2 weeks
- **Recording:** Get consent, record for synthesis

### Outputs from Phase 2

- **Interview guide:** 5-7 open-ended questions (Mom Test style)
- **Participant roster:** 5-10 scheduled interviews
- **Synthesis plan:** How you'll capture and analyze insights

---

## Phase 3: Conduct Research (Week 1-2)

**Goal:** Gather qualitative evidence through customer interviews.

### Activities

**1. Conduct Discovery Interviews**
- **Methodology:** From `skills/discovery-interview-prep/SKILL.md` (Problem validation, JTBD, switch interviews, etc.)
- **Participants:** PM + optional observer (design, eng)
- **Duration:** 5-10 interviews over 1-2 weeks
- **Focus areas:**
  - Past behavior (not hypotheticals): "Tell me about the last time you [experienced this problem]"
  - Workarounds: "How do you currently handle this?"
  - Alternatives tried: "Have you tried other solutions? Why did you stop?"
  - Pain intensity: "How much time/money does this cost you?"

**2. Take Structured Notes**
- **Template:**
  - Participant: [Name, role, company size]
  - Context: [When/where they experience problem]
  - Actions: [What they do, step-by-step]
  - Pain points: [Frustrations, blockers]
  - Workarounds: [Current solutions]
  - Quotes: [Verbatim customer language]
  - Insights: [Patterns, surprises]

**3. Review Support Tickets & Analytics (Parallel)**
- **Support tickets:** Tag by theme (onboarding, feature confusion, bugs)
- **Analytics:** Identify drop-off points, feature usage, cohort behavior
- **Surveys:** Review NPS comments, exit surveys, feature requests

### Outputs from Phase 3

- **Interview transcripts:** Recorded sessions + detailed notes
- **Support ticket themes:** Top 10 issues by frequency
- **Analytics insights:** Quantitative data on behavior (e.g., "60% abandon onboarding at step 3")

### Decision Point 2: Have we reached saturation?

**Saturation = same pain points emerge across 3+ interviews, no new insights**

**If YES (saturated after 5-7 interviews):** Proceed to Phase 4 (Synthesis)

**If NO (still learning new things):** Schedule 3-5 more interviews
- **Time impact:** +1 week

---

## Phase 4: Synthesize Insights (End of Week 2)

**Goal:** Identify patterns, prioritize pain points, map opportunities.

### Activities

**1. Affinity Mapping (Thematic Analysis)**
- **Method:**
  - Write each insight/quote on sticky note
  - Group by theme (e.g., "onboarding confusion," "pricing objections," "mobile access")
  - Count frequency (how many customers mentioned each theme)
- **Participants:** PM, design, optional eng
- **Duration:** 90-120 minutes
- **Output:** Themed clusters with frequency counts

**2. Create Customer Journey Map (Optional)**
- **Use:** `skills/customer-journey-mapping-workshop/SKILL.md` (interactive)
- **When:** If pain points span multiple phases (discover, try, buy, use, support)
- **Duration:** 90 minutes
- **Output:** Journey map with opportunities ranked by impact

**3. Prioritize Pain Points**
- **Criteria:**
  - **Frequency:** How many customers mentioned this?
  - **Intensity:** How painful is it? (time wasted, money lost, emotional frustration)
  - **Strategic fit:** Does solving this align with business goals?
- **Method:** Score each pain point (1-5) on frequency, intensity, strategic fit
- **Output:** Ranked list of top 3-5 pain points to address

**4. Update Problem Statement**
- **Use:** `skills/problem-statement/SKILL.md` (component)
- **Refine based on research:** Did initial hypothesis hold? Adjust if needed.
- **Output:** Validated problem statement

### Outputs from Phase 4

- **Affinity map:** Themes with frequency counts
- **Top 3-5 pain points:** Prioritized by frequency × intensity × strategic fit
- **Customer quotes:** 3-5 verbatim quotes per pain point
- **Validated problem statement:** Refined based on evidence

---

## Phase 5: Generate & Validate Solutions (Week 3)

**Goal:** Explore solution options, design experiments, validate assumptions.

### Activities

**1. Generate Opportunity Solution Tree**
- **Use:** `skills/opportunity-solution-tree/SKILL.md` (interactive)
- **Input:** Top 3 pain points from Phase 4
- **Participants:** PM, design, engineering lead
- **Duration:** 90 minutes
- **Output:** 3 opportunities, 3 solutions per opportunity, POC recommendation

**Alternative: Use Lean UX Canvas**
- **Use:** `skills/lean-ux-canvas/SKILL.md` (interactive)
- **When:** Prefer hypothesis-driven approach over OST
- **Output:** Hypotheses to test, minimal experiments

**2. Design Experiments**
- **For each solution:** Define "What's the least work to learn the next most important thing?"
- **Experiment types:**
  - **Concierge test:** Manually deliver solution to 10 customers, observe
  - **Prototype test:** Clickable mockup, usability test with 10 users
  - **Landing page test:** Fake door test (show feature, measure interest)
  - **A/B test:** Build minimal version, test with 50% of users
- **Success criteria:** What metric/behavior validates hypothesis?

**3. Run Experiments**
- **Timeline:** 1-2 weeks per experiment
- **Participants:** PM + design (for prototypes), eng (for A/B tests)
- **Output:** Quantitative and qualitative validation data

### Outputs from Phase 5

- **Solution options:** 3-9 solutions (3 per opportunity)
- **Experiment results:** Did hypothesis validate or invalidate?
- **Customer feedback:** Qualitative reactions to prototypes/concepts

### Decision Point 3: Did experiments validate solution?

**If YES (validated):** Proceed to Phase 6 (Decide & Document)

**If NO (invalidated):**
- Pivot to next solution option
- Re-run experiments with adjusted approach
- **Time impact:** +1-2 weeks

---

## Phase 6: Decide & Document (End of Week 3-4)

**Goal:** Commit to build, document decision, communicate to stakeholders.

### Activities

**1. Make Go/No-Go Decision**
- **Criteria:**
  - Problem validated? (Phase 3-4)
  - Solution validated? (Phase 5)
  - Strategic fit? (aligns with business goals)
  - Feasible? (engineering capacity, technical complexity)
- **Decision:**
  - **GO:** Move to roadmap, write epics/stories
  - **PIVOT:** Explore alternative solution
  - **KILL:** De-prioritize, not worth solving now

**2. Define Epic Hypotheses (If GO)**
- **Use:** `skills/epic-hypothesis/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 60 minutes per epic
- **Output:** Epic hypothesis statement with success criteria

**3. Write PRD (If GO)**
- **Use:** `skills/prd-development/SKILL.md` (workflow)
- **Participants:** PM
- **Duration:** 1-2 days
- **Output:** Structured PRD with problem, solution, success metrics

**4. Communicate Findings**
- **Format:** 30-min readout covering:
  - Problem validation (Phase 3-4 insights)
  - Solution validation (Phase 5 experiments)
  - Recommendation (GO/PIVOT/KILL)
- **Participants:** Execs, product leadership, key stakeholders
- **Output:** Alignment on next steps

### Outputs from Phase 6

- **Decision:** GO, PIVOT, or KILL
- **Epic hypotheses:** (if GO) Testable epic statements
- **PRD:** (if GO) Formal product requirements document
- **Stakeholder alignment:** Exec buy-in on recommendation

---

## Complete Workflow: End-to-End Summary

```
Week 1:
├─ Day 1-2: Frame the Problem
│  ├─ skills/problem-framing-canvas/SKILL.md (120 min)
│  ├─ skills/problem-statement/SKILL.md (30 min)
│  └─ [Optional] skills/proto-persona/SKILL.md, skills/jobs-to-be-done/SKILL.md
│
├─ Day 3: Research Planning
│  ├─ skills/discovery-interview-prep/SKILL.md (90 min)
│  ├─ Recruit participants (2-3 days)
│  └─ Schedule 5-10 interviews
│
└─ Day 4-5: Conduct Research (Start)
   └─ First 2-3 customer interviews

Week 2:
├─ Day 1-3: Conduct Research (Continue)
│  └─ Remaining customer interviews (3-7 more)
│
├─ Day 4-5: Synthesize Insights
│  ├─ Affinity mapping (120 min)
│  ├─ [Optional] skills/customer-journey-mapping-workshop/SKILL.md (90 min)
│  ├─ Prioritize pain points
│  └─ Update problem statement
│
└─ Decision: Reached saturation? (if NO, +1 week more interviews)

Week 3:
├─ Day 1-2: Generate & Validate Solutions
│  ├─ skills/opportunity-solution-tree/SKILL.md (90 min)
│  └─ Design experiments
│
├─ Day 3-5: Run Experiments
│  ├─ Concierge tests, prototypes, or A/B tests
│  └─ Gather validation data
│
└─ Decision: Validated? (if NO, pivot to next solution, +1-2 weeks)

Week 4:
└─ Decide & Document
   ├─ Make GO/NO-GO decision
   ├─ [If GO] skills/epic-hypothesis/SKILL.md (60 min per epic)
   ├─ [If GO] skills/prd-development/SKILL.md (1-2 days)
   └─ Communicate findings (30 min readout)
```

**Total Time Investment:**
- **Fast track:** 3 weeks (5 interviews, 1 experiment)
- **Typical:** 4 weeks (7-10 interviews, 1-2 experiments)
- **Thorough:** 6-8 weeks (10+ interviews, multiple experiment rounds)

---

## Examples

See `examples/sample.md` for a full discovery process example.

Mini example excerpt:

```markdown
**Problem:** Onboarding drop-off due to jargon
**Insight:** 6/10 users quit at step 3
**Decision:** Go with guided checklist experiment
```

## Common Pitfalls

### Pitfall 1: Skipping Customer Interviews
**Symptom:** Rely only on analytics and support tickets, no qualitative research

**Consequence:** Miss "why" behind behavior, build wrong solutions

**Fix:** Always interview 5-10 customers per discovery cycle (even if you have data)

---

### Pitfall 2: Asking Leading Questions
**Symptom:** "Would you use [feature X] if we built it?"

**Consequence:** Confirmation bias, customers say "yes" to be polite

**Fix:** Use Mom Test questions from `skills/discovery-interview-prep/SKILL.md` (focus on past behavior)

---

### Pitfall 3: Not Reaching Saturation
**Symptom:** Interview 2-3 customers, declare discovery complete

**Consequence:** Small sample, not representative

**Fix:** Continue interviews until same patterns emerge across 3+ customers (typically 5-7 interviews minimum)

---

### Pitfall 4: Analysis Paralysis
**Symptom:** Spend 6 weeks synthesizing insights, never move to solutions

**Consequence:** No delivery, team loses momentum

**Fix:** Time-box discovery to 3-4 weeks; after Phase 6, move to execution

---

### Pitfall 5: Discovery as One-Time Activity
**Symptom:** Run discovery once before building, then stop

**Consequence:** Miss evolving customer needs, market changes

**Fix:** Continuous discovery (Teresa Torres): 1 customer interview per week, ongoing

---

## References

### Related Skills (Orchestrated by This Workflow)

**Phase 1:**
- `skills/problem-framing-canvas/SKILL.md` (interactive)
- `skills/problem-statement/SKILL.md` (component)
- `skills/proto-persona/SKILL.md` (component, optional)
- `skills/jobs-to-be-done/SKILL.md` (component, optional)

**Phase 2:**
- `skills/discovery-interview-prep/SKILL.md` (interactive)

**Phase 4:**
- `skills/customer-journey-mapping-workshop/SKILL.md` (interactive, optional)

**Phase 5:**
- `skills/opportunity-solution-tree/SKILL.md` (interactive)
- `skills/lean-ux-canvas/SKILL.md` (interactive, alternative)

**Phase 6:**
- `skills/epic-hypothesis/SKILL.md` (component)
- `skills/prd-development/SKILL.md` (workflow)

### External Frameworks
- Teresa Torres, *Continuous Discovery Habits* (2021) — Weekly customer touchpoints, OST framework
- Rob Fitzpatrick, *The Mom Test* (2013) — How to ask good interview questions
- Marty Cagan, *Inspired* (2017) — Product discovery principles

### Dean's Work
- Productside Blueprint — Strategic discovery process
- [If Dean has discovery resources, link here]

---

**Skill type:** Workflow
**Suggested filename:** `discovery-process.md`
**Suggested placement:** `/skills/workflows/`
**Dependencies:** Orchestrates 10+ component and interactive skills across 6 phases
