---
name: prd-development
description: Build a structured PRD that connects problem, users, solution, and success criteria. Use when turning discovery notes into an engineering-ready document for a major initiative.
risk: safe
source: community
---


## Purpose
Guide product managers through structured PRD (Product Requirements Document) creation by orchestrating problem framing, user research synthesis, solution definition, and success criteria into a cohesive document. Use this to move from scattered notes and Slack threads to a clear, comprehensive PRD that aligns stakeholders, provides engineering context, and serves as a source of truth—avoiding ambiguity, scope creep, and the "build what's in my head" trap.

This is not a waterfall spec—it's a living document that captures strategic context, customer problems, proposed solutions, and success criteria, evolving as you learn through delivery.

## Key Concepts

### What is a PRD?

A PRD (Product Requirements Document) is a structured document that answers:
1. **What problem are we solving?** (Problem statement)
2. **For whom?** (Target users/personas)
3. **Why now?** (Strategic context, business case)
4. **What are we building?** (Solution overview)
5. **How will we measure success?** (Metrics, success criteria)
6. **What are the requirements?** (User stories, acceptance criteria, constraints)
7. **What are we NOT building?** (Out of scope)

### PRD Structure (Standard Template)

```markdown
# [Feature/Product Name] PRD

## 1. Executive Summary
- One-paragraph overview (problem + solution + impact)

## 2. Problem Statement
- Who has this problem?
- What is the problem?
- Why is it painful?
- Evidence (customer quotes, data, research)

## 3. Target Users & Personas
- Primary persona(s)
- Secondary persona(s)
- Jobs-to-be-done

## 4. Strategic Context
- Business goals (OKRs)
- Market opportunity (TAM/SAM/SOM)
- Competitive landscape
- Why now?

## 5. Solution Overview
- High-level description
- User flows or wireframes
- Key features

## 6. Success Metrics
- Primary metric (what we're optimizing for)
- Secondary metrics
- Targets (current → goal)

## 7. User Stories & Requirements
- Epic hypothesis
- User stories with acceptance criteria
- Edge cases, constraints

## 8. Out of Scope
- What we're NOT building (and why)

## 9. Dependencies & Risks
- Technical dependencies
- External dependencies (integrations, partnerships)
- Risks and mitigations

## 10. Open Questions
- Unresolved decisions
- Areas requiring discovery
```

### Why This Works
- **Alignment:** Ensures everyone (PM, design, eng, stakeholders) understands the "why"
- **Context preservation:** Captures research and strategic rationale for future reference
- **Decision log:** Documents what's in scope, out of scope, and why
- **Execution clarity:** Provides engineering with user stories and acceptance criteria

### Anti-Patterns (What This Is NOT)
- **Not a detailed spec:** PRDs frame the problem and solution; they don't specify UI pixel-by-pixel
- **Not waterfall:** PRDs evolve as you learn; they're not frozen contracts
- **Not a substitute for collaboration:** PRDs complement conversation, not replace it

## When to Use
- Starting a major feature or product initiative
- Aligning cross-functional teams on scope and requirements
- Documenting decisions for future reference
- Onboarding new team members to a project

### When NOT to Use This
- For small bug fixes or trivial features (overkill)
- When problem and solution are already clear and aligned (just write user stories)
- For continuous discovery experiments (use Lean UX Canvas instead)

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

This workflow orchestrates **8 phases** over **2-4 days**, using multiple component and interactive skills.

---

## Phase 1: Executive Summary (30 minutes)

**Goal:** Write a one-paragraph overview for skimmers.

### Activities

**1. Draft Executive Summary**
- **Format:** "We're building [solution] for [persona] to solve [problem], which will result in [impact]."
- **Example:**
  > "We're building a guided onboarding checklist for non-technical small business owners to solve the problem of 60% drop-off in the first 24 hours due to lack of guidance, which will increase activation rate from 40% to 60% and reduce churn by 10%."

- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** One-paragraph summary

**Tip:** Write this first (forces clarity), but refine it last (after other sections are complete).

---

## Phase 2: Problem Statement (60 minutes)

**Goal:** Frame the customer problem with evidence.

### Activities

**1. Write Problem Statement**
- **Use:** `skills/problem-statement/SKILL.md` (component)
- **Input:** Discovery insights from `skills/discovery-process/SKILL.md` or `skills/problem-framing-canvas/SKILL.md`
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Structured problem statement

**Example Problem Statement:**

```markdown
## 2. Problem Statement

### Who has this problem?
Non-technical small business owners (solopreneurs, 1-10 employees) who sign up for our SaaS product.

### What is the problem?
60% of users abandon onboarding within the first 24 hours because they don't know what to do first. They see an empty dashboard with no guidance, get overwhelmed by options, and leave.

### Why is it painful?
- **User impact:** Wastes time (30-60 min trying to figure out product), never reaches "aha moment," churns before experiencing value
- **Business impact:** 60% activation rate → high churn, low LTV, poor word-of-mouth

### Evidence
- **Interviews:** 8/10 churned users said "I didn't know what to do first" (discovery interviews, Feb 2026)
- **Analytics:** 60% of signups complete 0 actions within 24 hours (Mixpanel, Jan 2026)
- **Support tickets:** "How do I get started?" is #1 support question (350 tickets/month)
- **Customer quote:** "I logged in, saw an empty dashboard, and thought 'now what?' I gave up and went back to my spreadsheet."
```

**2. Add Supporting Context (Optional)**
- **Customer journey map:** If problem spans multiple touchpoints
- **Use:** `skills/customer-journey-mapping-workshop/SKILL.md` output
- **Jobs-to-be-done:** If motivations are key
- **Use:** `skills/jobs-to-be-done/SKILL.md` output

### Outputs from Phase 2

- **Problem statement:** Who, what, why, evidence
- **Supporting artifacts:** Journey map, JTBD (if relevant)

---

## Phase 3: Target Users & Personas (30 minutes)

**Goal:** Define who you're building for.

### Activities

**1. Document Personas**
- **Use:** `skills/proto-persona/SKILL.md` (component) output
- **Participants:** PM
- **Duration:** 30 minutes
- **Format:** Include persona name, role, goals, pain points, behaviors

**Example:**

```markdown
## 3. Target Users & Personas

### Primary Persona: Solo Entrepreneur Sam
- **Role:** Freelance consultant, solopreneur
- **Company size:** 1 person (no IT support)
- **Tech savviness:** Low (uses email, spreadsheets, basic SaaS)
- **Goals:** Get value from software fast without technical expertise
- **Pain points:** Overwhelmed by complex UIs, no time to watch tutorials, needs immediate value
- **Current behavior:** Signs up for products, tries for 1 day, churns if not immediately useful

### Secondary Persona: Small Business Owner (5-10 employees)
- **Role:** Owner-operator, manages team
- **Needs:** Onboard team members quickly
- **Differs from primary:** More tolerant of complexity, willing to invest setup time
```

### Outputs from Phase 3

- **Primary persona:** Detailed profile
- **Secondary personas:** (if applicable)

---

## Phase 4: Strategic Context (45 minutes)

**Goal:** Explain why this matters to the business and why now.

### Activities

**1. Document Business Goals**
- **Source:** Company OKRs, strategic memos, roadmap
- **Format:** Link feature to business outcomes
- **Example:**
  > "This initiative supports our Q1 OKR: Reduce churn from 15% to 8%. Improving onboarding activation directly impacts retention."

**2. Size Market Opportunity (Optional)**
- **Use:** `skills/tam-sam-som-calculator/SKILL.md` (interactive) output
- **When:** For major initiatives, new products, exec presentations
- **Example:**
  > "TAM: 50M small businesses globally. SAM: 5M using SaaS tools. SOM: 500K solopreneurs in our target segments. Improving onboarding could unlock 30% of SAM (1.5M potential customers)."

**3. Document Competitive Landscape (Optional)**
- **Source:** Competitor research, G2/Capterra reviews
- **Example:**
  > "Competitors (Competitor A, B) have guided onboarding. Our lack of guidance is cited as a churn reason in exit surveys."

**4. Explain "Why Now?"**
- **Rationale:** Why prioritize this now vs. later?
- **Example:**
  > "Churn spiked 15% in Q4. Onboarding is the #1 driver (60% churn in first 30 days). Fixing this is critical to hitting retention OKR."

### Outputs from Phase 4

- **Business goals:** OKRs or strategic initiatives
- **Market opportunity:** TAM/SAM/SOM (if applicable)
- **Competitive context:** How competitors address this
- **Why now:** Urgency rationale

---

## Phase 5: Solution Overview (60 minutes)

**Goal:** Describe what you're building (high-level, not detailed spec).

### Activities

**1. Write Solution Description**
- **Format:** High-level overview, 2-3 paragraphs
- **Example:**

```markdown
## 5. Solution Overview

We're building a **guided onboarding checklist** that walks new users through core workflows step-by-step when they first log in.

**How it works:**
1. User signs up and logs in for the first time
2. Modal appears: "Let's get you set up! Complete these 3 steps to get started."
3. Checklist shows:
   - ☐ Create your first project
   - ☐ Invite a teammate (optional)
   - ☐ Complete a sample task
4. As user completes each step, checklist updates with checkmarks
5. After completion, celebration modal: "You're all set! Here's what to do next."

**Key features:**
- Minimal: Only 3 core steps (not overwhelming)
- Dismissible: Users can skip if they prefer to explore
- Progress tracking: Visual progress bar (1/3, 2/3, 3/3)
- Celebration: Positive reinforcement when complete
```

**2. Add User Flows or Wireframes (Optional)**
- **Use:** Design tools (Figma, Sketch), or hand-drawn sketches
- **When:** For complex features requiring visual explanation
- **Output:** Embedded in PRD or linked

**3. Reference Story Map (Optional)**
- **Use:** `skills/user-story-mapping-workshop/SKILL.md` output
- **When:** For complex features with multiple release slices
- **Output:** Link to story map

### Outputs from Phase 5

- **Solution description:** High-level overview
- **User flows/wireframes:** (if applicable)
- **Story map:** (if applicable)

---

## Phase 6: Success Metrics (30 minutes)

**Goal:** Define how you'll measure success.

### Activities

**1. Define Primary Metric**
- **Question:** What is the ONE metric this feature must move?
- **Example:** "Activation rate (% of users completing first action within 24 hours)"
- **Target:** "Increase from 40% to 60%"

**2. Define Secondary Metrics**
- **Question:** What else should we monitor (but not optimize for)?
- **Examples:**
  - Time-to-first-action (reduce from 3 days to 1 day)
  - Completion rate of onboarding checklist (target: 80%)
  - Support ticket volume (reduce "How do I get started?" tickets by 50%)

**3. Define Guardrail Metrics**
- **Question:** What should NOT get worse?
- **Example:** "Sign-up conversion rate (don't add friction to signup flow)"

**Example:**

```markdown
## 6. Success Metrics

### Primary Metric
**Activation rate** (% of users completing first action within 24 hours)
- **Current:** 40%
- **Target:** 60%
- **Timeline:** Measure 30 days after launch

### Secondary Metrics
- **Time-to-first-action:** Reduce from 3 days to 1 day
- **Onboarding checklist completion rate:** 80% of users complete all 3 steps
- **Support tickets:** Reduce "How do I get started?" tickets from 350/month to 175/month

### Guardrail Metrics
- **Sign-up conversion rate:** Maintain at 10% (don't add friction to signup)
```

### Outputs from Phase 6

- **Primary metric:** What you're optimizing for
- **Secondary metrics:** Additional success indicators
- **Guardrail metrics:** What shouldn't regress

---

## Phase 7: User Stories & Requirements (90-120 minutes)

**Goal:** Break solution into user stories with acceptance criteria.

### Activities

**1. Write Epic Hypothesis**
- **Use:** `skills/epic-hypothesis/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Epic hypothesis statement

**Example:**
> "We believe that adding a guided onboarding checklist for non-technical users will increase activation rate from 40% to 60% because users currently drop off due to lack of guidance. We'll measure success by activation rate 30 days post-launch."

**2. Break Down Epic into User Stories**
- **Use:** `skills/epic-breakdown-advisor/SKILL.md` (interactive - with Richard Lawrence's 9 patterns)
- **Participants:** PM, design, engineering
- **Duration:** 90 minutes
- **Output:** User stories split by patterns (workflow, CRUD, business rules, etc.)

**3. Write User Stories**
- **Use:** `skills/user-story/SKILL.md` (component)
- **Participants:** PM
- **Duration:** 30 minutes per story
- **Format:** User story + acceptance criteria

**Example User Stories:**

```markdown
## 7. User Stories & Requirements

### Epic Hypothesis
We believe that adding a guided onboarding checklist for non-technical users will increase activation rate from 40% to 60% because users currently drop off due to lack of guidance.

### User Stories

**Story 1: Display onboarding checklist on first login**
As a new user, I want to see a guided checklist when I first log in, so I know what to do first.

**Acceptance Criteria:**
- [ ] When user logs in for the first time, modal appears with checklist
- [ ] Checklist shows 3 steps: "Create project," "Invite teammate," "Complete task"
- [ ] Modal is dismissible (close button)
- [ ] If dismissed, checklist doesn't reappear (user preference saved)

**Story 2: Track checklist progress**
As a new user, I want to see my progress as I complete checklist steps, so I feel a sense of accomplishment.

**Acceptance Criteria:**
- [ ] When user completes step 1, checkmark appears next to "Create project"
- [ ] Progress bar updates (1/3 → 2/3 → 3/3)
- [ ] Checklist persists across sessions (if user logs out and back in)

**Story 3: Celebrate checklist completion**
As a new user, I want to receive positive feedback when I complete the checklist, so I feel confident using the product.

**Acceptance Criteria:**
- [ ] When user completes all 3 steps, celebration modal appears
- [ ] Message: "You're all set! Here's what to do next: [suggested next actions]"
- [ ] Confetti animation (optional, nice-to-have)
```

**4. Document Constraints & Edge Cases**
- **Technical constraints:** Platform limitations, browser support, etc.
- **Edge cases:** What if user skips step 2? What if they complete steps out of order?

### Outputs from Phase 7

- **Epic hypothesis:** Testable statement
- **User stories:** 3-10 stories with acceptance criteria
- **Constraints:** Technical limitations, edge cases

---

## Phase 8: Out of Scope & Dependencies (30 minutes)

**Goal:** Define what you're NOT building and what you depend on.

### Activities

**1. Document Out of Scope**
- **Format:** List features/requests explicitly excluded
- **Rationale:** Why not building now?

**Example:**

```markdown
## 8. Out of Scope

**Not included in this release:**
- **Advanced onboarding personalization** (e.g., different checklists per persona) — Adds complexity, test simple version first
- **Video tutorials embedded in checklist** — Resource-intensive, validate checklist concept first
- **Gamification (badges, points)** — Nice-to-have, focus on core workflow guidance

**Future consideration:**
- Mobile-optimized onboarding (desktop-first for now)
```

**2. Document Dependencies**
- **Technical dependencies:** Platform upgrades, API changes required
- **External dependencies:** Third-party integrations, partnerships
- **Team dependencies:** Design handoff, data pipeline work

**Example:**

```markdown
## 9. Dependencies & Risks

### Dependencies
- **Design:** Wireframes for checklist UI (ETA: Week 1)
- **Engineering:** No technical dependencies (uses existing modals framework)

### Risks & Mitigations
- **Risk:** Users dismiss checklist immediately, never see it
  - **Mitigation:** Track dismissal rate; if >50%, iterate on messaging or timing
- **Risk:** Checklist steps are too generic, don't resonate with all personas
  - **Mitigation:** Start with primary persona (Solo Entrepreneur Sam), personalize later
```

**3. Document Open Questions**
- **Unresolved decisions:** Areas requiring discovery or discussion

**Example:**

```markdown
## 10. Open Questions

- Should checklist be mandatory or optional? (Decision: Optional, dismissible)
- Should we A/B test checklist vs. no checklist? (Decision: Yes, show to 50% of new users)
- What happens if user completes steps out of order? (Decision: Allow any order, update checklist dynamically)
```

### Outputs from Phase 8

- **Out of scope:** What we're NOT building
- **Dependencies:** What we need before starting
- **Risks:** Potential blockers and mitigations
- **Open questions:** Unresolved decisions

---

## Complete Workflow: End-to-End Summary

```
Day 1:
├─ Phase 1: Executive Summary (30 min)
├─ Phase 2: Problem Statement (60 min)
│  └─ Use: skills/problem-statement/SKILL.md
├─ Phase 3: Target Users & Personas (30 min)
│  └─ Use: skills/proto-persona/SKILL.md
└─ Phase 4: Strategic Context (45 min)
   └─ Use: skills/tam-sam-som-calculator/SKILL.md (optional)

Day 2:
├─ Phase 5: Solution Overview (60 min)
│  └─ Use: skills/user-story-mapping-workshop/SKILL.md (optional)
├─ Phase 6: Success Metrics (30 min)
└─ Phase 7: User Stories & Requirements (90-120 min)
   ├─ Use: skills/epic-hypothesis/SKILL.md
   ├─ Use: skills/epic-breakdown-advisor/SKILL.md
   └─ Use: skills/user-story/SKILL.md

Day 3:
├─ Phase 8: Out of Scope & Dependencies (30 min)
└─ Review & Refine (60 min)
   └─ Read full PRD, polish, get feedback

Day 4 (Optional):
└─ Stakeholder Review & Approval
   └─ Present PRD to stakeholders, incorporate feedback
```

**Total Time Investment:**
- **Fast track:** 1.5-2 days (straightforward feature, clear requirements)
- **Typical:** 2-3 days (includes discovery synthesis, stakeholder review)
- **Complex:** 3-4 days (major initiative, multiple personas, extensive user stories)

---

## Examples

See `examples/sample.md` for full PRD examples.

Mini example excerpt:

```markdown
## 2. Problem Statement
- 60% of trial users drop off in first 24 hours
## 6. Success Metrics
- Activation rate: 40% → 60%
```

## Common Pitfalls

### Pitfall 1: PRD Written in Isolation
**Symptom:** PM writes PRD alone, presents finished doc to team

**Consequence:** No buy-in, team doesn't understand rationale

**Fix:** Collaborate on Phase 7 (user stories) with design + eng; review draft PRD before finalizing

---

### Pitfall 2: No Evidence in Problem Statement
**Symptom:** "We believe users have this problem" (no data, no quotes)

**Consequence:** Team questions whether problem is real

**Fix:** Use discovery insights from `skills/discovery-process/SKILL.md`; include customer quotes, analytics, support tickets

---

### Pitfall 3: Solution Too Prescriptive
**Symptom:** PRD specifies exact UI, pixel dimensions, button colors

**Consequence:** Removes design collaboration, becomes waterfall spec

**Fix:** Keep Phase 5 high-level; let design own UI details

---

### Pitfall 4: No Success Metrics
**Symptom:** PRD defines problem + solution but no metrics

**Consequence:** Can't validate if feature succeeded

**Fix:** Always define primary metric in Phase 6 (what you're optimizing for)

---

### Pitfall 5: Out of Scope Not Documented
**Symptom:** No section on what's NOT being built

**Consequence:** Scope creep, stakeholders expect features not planned

**Fix:** Explicitly document out of scope in Phase 8

---

## References

### Related Skills (Orchestrated by This Workflow)

**Phase 2:**
- `skills/problem-statement/SKILL.md` (component)
- `skills/problem-framing-canvas/SKILL.md` (interactive, for context)
- `skills/customer-journey-mapping-workshop/SKILL.md` (interactive, optional)

**Phase 3:**
- `skills/proto-persona/SKILL.md` (component)
- `skills/jobs-to-be-done/SKILL.md` (component, optional)

**Phase 4:**
- `skills/tam-sam-som-calculator/SKILL.md` (interactive, optional)

**Phase 5:**
- `skills/user-story-mapping-workshop/SKILL.md` (interactive, optional)

**Phase 7:**
- `skills/epic-hypothesis/SKILL.md` (component)
- `skills/epic-breakdown-advisor/SKILL.md` (interactive)
- `skills/user-story/SKILL.md` (component)

### External Frameworks
- Martin Eriksson, "How to Write a Good PRD" (2012) — PRD structure
- Marty Cagan, *Inspired* (2017) — Product spec principles
- Amazon, "Working Backwards" (PR/FAQ format) — Alternative to PRD

### Dean's Work
- [If Dean has PRD templates, link here]

---

**Skill type:** Workflow
**Suggested filename:** `prd-development.md`
**Suggested placement:** `/skills/workflows/`
**Dependencies:** Orchestrates 8+ component and interactive skills across 8 phases
