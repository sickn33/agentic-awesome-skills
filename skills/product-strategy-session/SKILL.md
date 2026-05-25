---
name: product-strategy-session
description: Run an end-to-end product strategy session across positioning, discovery, and roadmap planning. Use when a team needs validated direction before committing to execution.
risk: safe
source: community
---


## Purpose
Guide product managers through a comprehensive product strategy session by orchestrating positioning, problem framing, customer discovery, and roadmap planning skills into a cohesive end-to-end process. Use this to move from vague strategic direction to concrete, validated product strategy with clear positioning, target customers, problem statements, and prioritized roadmap—ensuring alignment across stakeholders before committing to execution.

This is not a one-time workshop—it's a repeatable process for establishing or refreshing product strategy, typically spanning 2-4 weeks with multiple touchpoints.

## Key Concepts

### What is a Product Strategy Session?

A product strategy session is a structured, multi-phase process that takes a product from strategic ambiguity to validated direction. It orchestrates:

1. **Positioning & Market Context** — Define who you serve, what problem you solve, and how you're differentiated
2. **Problem Discovery & Validation** — Frame and validate customer problems through research
3. **Solution Exploration** — Generate opportunity solutions and prioritize based on impact
4. **Roadmap Planning** — Sequence epics and releases based on strategy

### Why This Works
- **Structured discovery:** Prevents jumping to solutions before understanding problems
- **Stakeholder alignment:** Creates shared mental model across exec, product, design, engineering
- **Validated strategy:** Tests assumptions before committing resources
- **Executable roadmap:** Connects high-level strategy to concrete work

### Anti-Patterns (What This Is NOT)
- **Not a feature brainstorm:** Strategy sessions frame problems, not just list features
- **Not waterfall planning:** Builds in feedback loops and iteration
- **Not a solo PM exercise:** Requires cross-functional participation

## When to Use
- Launching a new product or major initiative
- Annual/quarterly strategic planning cycles
- Repositioning an existing product
- Onboarding new product leaders (align on strategy)

### When NOT to Use This
- When strategy is already clear and validated
- For tactical feature additions (no strategic shift needed)
- When you lack executive sponsorship (strategy won't stick)

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

## Phase 1: Positioning & Market Context (Week 1, Days 1-2)

**Goal:** Define target customer, problem space, and differentiation.

### Activities

**1. Run Positioning Workshop**
- **Use:** `skills/positioning-workshop/SKILL.md` (interactive)
- **Participants:** PM, product leadership, marketing, sales
- **Duration:** 90 minutes
- **Output:** Draft positioning statement

**2. Define Proto-Personas**
- **Use:** `skills/proto-persona/SKILL.md` (component)
- **Participants:** PM, design, customer-facing teams
- **Duration:** 60 minutes
- **Output:** 1-3 proto-personas (hypothesis-driven)

**3. Map Jobs-to-be-Done**
- **Use:** `skills/jobs-to-be-done/SKILL.md` (component)
- **Participants:** PM, design
- **Duration:** 60 minutes
- **Output:** JTBD statements for each persona

### Decision Point 1: Do we have enough customer context?

**If YES:** Proceed to Phase 2 (Problem Framing)

**If NO:** Run additional discovery:
- **Use:** `skills/discovery-interview-prep/SKILL.md` (interactive)
- Schedule 5-10 customer interviews
- Validate positioning assumptions before proceeding
- **Time impact:** +1 week

---

## Phase 2: Problem Framing & Validation (Week 1, Days 3-5)

**Goal:** Frame the core customer problem and validate it's worth solving.

### Activities

**1. Run Problem Framing Canvas**
- **Use:** `skills/problem-framing-canvas/SKILL.md` (interactive - MITRE)
- **Participants:** PM, design, engineering lead, customer success
- **Duration:** 120 minutes
- **Output:** Refined problem statement + "How Might We" question

**2. Create Formal Problem Statement**
- **Use:** `skills/problem-statement/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Structured problem statement for PRD/roadmap

**3. Map Customer Journey (Optional)**
- **Use:** `skills/customer-journey-mapping-workshop/SKILL.md` (interactive)
- **When to use:** If problem spans multiple touchpoints or phases
- **Participants:** PM, design, customer success
- **Duration:** 90 minutes
- **Output:** Journey map with pain points and opportunities

### Decision Point 2: Is the problem validated?

**If YES:** Proceed to Phase 3 (Solution Exploration)

**If NO:** Run customer discovery interviews:
- **Use:** `skills/discovery-interview-prep/SKILL.md` (interactive)
- Validate problem hypothesis with 5-10 customers
- Iterate problem statement based on findings
- **Time impact:** +1 week

---

## Phase 3: Solution Exploration (Week 2, Days 1-3)

**Goal:** Generate solution options, prioritize based on feasibility/impact, and select POC.

### Activities

**1. Generate Opportunity Solution Tree**
- **Use:** `skills/opportunity-solution-tree/SKILL.md` (interactive)
- **Participants:** PM, design, engineering lead
- **Duration:** 90 minutes
- **Output:** 3 opportunities, 3 solutions per opportunity, POC recommendation

**Alternative: Use Lean UX Canvas**
- **Use:** `skills/lean-ux-canvas/SKILL.md` (interactive)
- **When to use:** If you prefer hypothesis-driven approach over OST
- **Output:** Business problem, hypotheses, experiments

**2. Define Epic Hypotheses**
- **Use:** `skills/epic-hypothesis/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 60 minutes per epic
- **Output:** Epic hypothesis statements for top 3-5 initiatives

**3. Create User Story Map (Optional)**
- **Use:** `skills/user-story-mapping-workshop/SKILL.md` (interactive)
- **When to use:** For complex features requiring release planning
- **Participants:** PM, design, engineering
- **Duration:** 120 minutes
- **Output:** Story map with backbone, release slices

### Decision Point 3: Do we need to test solutions before committing?

**If YES (high uncertainty):** Run experiments:
- Design POC experiments per `skills/opportunity-solution-tree/SKILL.md` output
- Test with 10-20 customers (prototype, concierge, landing page test)
- **Time impact:** +1-2 weeks

**If NO (low uncertainty):** Proceed to Phase 4 (Prioritization)

---

## Phase 4: Prioritization & Roadmap Planning (Week 2, Days 4-5)

**Goal:** Prioritize initiatives and sequence into executable roadmap.

### Activities

**1. Choose Prioritization Framework**
- **Use:** `skills/prioritization-advisor/SKILL.md` (interactive)
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Recommended prioritization framework (RICE, ICE, Value/Effort, etc.)

**2. Score & Prioritize Epics**
- **Use:** Prioritization framework from step 1
- **Participants:** PM, engineering lead, product leadership
- **Duration:** 90 minutes
- **Output:** Ranked backlog of epics

**3. Sequence Roadmap by Release**
- **Participants:** PM, engineering lead
- **Duration:** 60 minutes
- **Output:** Quarterly or release-based roadmap (Q1: Epics A, B; Q2: Epics C, D, E)

**4. Map TAM/SAM/SOM (Optional)**
- **Use:** `skills/tam-sam-som-calculator/SKILL.md` (interactive)
- **When to use:** For exec presentations, fundraising, or market sizing
- **Participants:** PM, business ops
- **Duration:** 60 minutes
- **Output:** Market size projections with citations

---

## Phase 5: Stakeholder Alignment & Communication (Week 3)

**Goal:** Present strategy to stakeholders, gather feedback, refine.

### Activities

**1. Create Visionary Press Release (Optional)**
- **Use:** `skills/press-release/SKILL.md` (component)
- **When to use:** For major product launches or exec buy-in
- **Participants:** PM, marketing
- **Duration:** 60 minutes
- **Output:** Amazon Working Backwards-style press release

**2. Present Strategy to Stakeholders**
- **Format:** 60-min presentation covering:
  - Positioning statement (Phase 1)
  - Problem statement (Phase 2)
  - Solution options & prioritization (Phase 3-4)
  - Roadmap (Phase 4)
- **Participants:** Execs, product leadership, key stakeholders
- **Output:** Feedback, open questions, approval to proceed

**3. Refine Based on Feedback**
- **Duration:** 1-2 days
- **Output:** Updated strategy artifacts

---

## Phase 6: Execution Planning (Week 4)

**Goal:** Break epics into user stories, plan first sprint/release.

### Activities

**1. Break Down Top Epic**
- **Use:** `skills/epic-breakdown-advisor/SKILL.md` (interactive - with Richard Lawrence's 9 patterns)
- **Participants:** PM, design, engineering
- **Duration:** 90 minutes
- **Output:** User stories split by patterns (workflow, CRUD, business rules, etc.)

**2. Write User Stories**
- **Use:** `skills/user-story/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 30 minutes per story
- **Output:** User stories with acceptance criteria

**3. Plan First Sprint/Release**
- **Participants:** PM, engineering
- **Duration:** 60 minutes
- **Output:** Sprint backlog or release plan

---

## Complete Workflow: End-to-End Summary

```
Week 1:
├─ Day 1-2: Positioning & Market Context
│  ├─ skills/positioning-workshop/SKILL.md (90 min)
│  ├─ skills/proto-persona/SKILL.md (60 min)
│  └─ skills/jobs-to-be-done/SKILL.md (60 min)
│
├─ Day 3-5: Problem Framing & Validation
│  ├─ skills/problem-framing-canvas/SKILL.md (120 min)
│  ├─ skills/problem-statement/SKILL.md (30 min)
│  └─ [Optional] skills/customer-journey-mapping-workshop/SKILL.md (90 min)
│
└─ Decision: Validate problem? (if NO, +1 week discovery)

Week 2:
├─ Day 1-3: Solution Exploration
│  ├─ skills/opportunity-solution-tree/SKILL.md (90 min)
│  ├─ skills/epic-hypothesis/SKILL.md (60 min per epic)
│  └─ [Optional] skills/user-story-mapping-workshop/SKILL.md (120 min)
│
├─ Decision: Test solutions? (if YES, +1-2 weeks experiments)
│
└─ Day 4-5: Prioritization & Roadmap
   ├─ skills/prioritization-advisor/SKILL.md (30 min)
   ├─ Score & prioritize epics (90 min)
   ├─ Sequence roadmap (60 min)
   └─ [Optional] skills/tam-sam-som-calculator/SKILL.md (60 min)

Week 3:
└─ Stakeholder Alignment
   ├─ [Optional] skills/press-release/SKILL.md (60 min)
   ├─ Present strategy (60 min)
   └─ Refine based on feedback (1-2 days)

Week 4:
└─ Execution Planning
   ├─ skills/epic-breakdown-advisor/SKILL.md (90 min)
   ├─ skills/user-story/SKILL.md (30 min per story)
   └─ Plan first sprint (60 min)
```

**Total Time Investment:**
- **Minimum:** 2 weeks (no discovery/experiments)
- **Typical:** 3 weeks (includes 1 round of validation)
- **Maximum:** 4-6 weeks (includes discovery interviews + experiments)

---

## Examples

See `examples/sample.md` for a full strategy session example.

Mini example excerpt:

```markdown
**Target:** Non-technical SMB owners
**Problem:** Onboarding drop-off due to jargon
**Priority:** Guided onboarding (RICE)
```

## Common Pitfalls

### Pitfall 1: Skipping Problem Validation
**Symptom:** Jump from positioning to solution exploration without validating problem

**Consequence:** Build solutions to unvalidated problems

**Fix:** Force decision point after Phase 2: "Is problem validated?" If NO, run discovery interviews.

---

### Pitfall 2: Solo PM Exercise
**Symptom:** PM runs strategy session alone, presents finished strategy to team

**Consequence:** No buy-in, team doesn't understand rationale

**Fix:** Include cross-functional participants in workshops (design, eng, sales, CS)

---

### Pitfall 3: Strategy Session Without Executive Sponsorship
**Symptom:** Run full strategy session, execs don't show up for Phase 5 alignment

**Consequence:** Strategy doesn't get resourced or prioritized

**Fix:** Secure exec commitment upfront; schedule Phase 5 presentation before starting.

---

### Pitfall 4: No Decision Points (Run All Phases Regardless)
**Symptom:** Blindly follow all 6 phases without checking if discovery/experiments are needed

**Consequence:** Waste time on low-uncertainty activities

**Fix:** Use decision points after Phase 2 and Phase 3 to adapt workflow.

---

### Pitfall 5: Strategy Session Becomes Permanent Process
**Symptom:** Team spends 6 weeks in strategy mode, never executes

**Consequence:** Analysis paralysis, no delivery

**Fix:** Time-box strategy session to 2-4 weeks; after Phase 6, move to execution.

---

## References

### Related Skills (Orchestrated by This Workflow)

**Phase 1:**
- `skills/positioning-workshop/SKILL.md` (interactive)
- `skills/proto-persona/SKILL.md` (component)
- `skills/jobs-to-be-done/SKILL.md` (component)

**Phase 2:**
- `skills/problem-framing-canvas/SKILL.md` (interactive)
- `skills/problem-statement/SKILL.md` (component)
- `skills/customer-journey-mapping-workshop/SKILL.md` (interactive, optional)
- `skills/discovery-interview-prep/SKILL.md` (interactive, if validation needed)

**Phase 3:**
- `skills/opportunity-solution-tree/SKILL.md` (interactive)
- `skills/lean-ux-canvas/SKILL.md` (interactive, alternative)
- `skills/epic-hypothesis/SKILL.md` (component)
- `skills/user-story-mapping-workshop/SKILL.md` (interactive, optional)

**Phase 4:**
- `skills/prioritization-advisor/SKILL.md` (interactive)
- `skills/tam-sam-som-calculator/SKILL.md` (interactive, optional)

**Phase 5:**
- `skills/press-release/SKILL.md` (component, optional)

**Phase 6:**
- `skills/epic-breakdown-advisor/SKILL.md` (interactive)
- `skills/user-story/SKILL.md` (component)

### External Frameworks
- Teresa Torres, *Continuous Discovery Habits* (2021) — Opportunity solution tree framework
- Jeff Gothelf, *Lean UX* (2016) — Hypothesis-driven product development
- Marty Cagan, *Inspired* (2017) — Product discovery process

### Dean's Work
- Productside Blueprint — Strategic product discovery
- [If Dean has strategy session resources, link here]

---

**Skill type:** Workflow
**Suggested filename:** `product-strategy-session.md`
**Suggested placement:** `/skills/workflows/`
**Dependencies:** Orchestrates 15+ component and interactive skills across 6 phases
