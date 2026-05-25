---
name: pm-roadmap-planning
description: Plan a strategic roadmap across prioritization, epic definition, stakeholder alignment, and sequencing. Use when turning strategy into a release plan that teams can execute.
risk: safe
source: community
---


## Purpose
Guide product managers through strategic roadmap planning by orchestrating prioritization, epic definition, stakeholder alignment, and release sequencing skills into a structured process. Use this to move from disconnected feature requests to a cohesive, outcome-driven roadmap that aligns stakeholders, sequences work logically, and communicates strategic intent—avoiding "feature factory" roadmaps that lack strategic narrative or customer-centric framing.

This is not a Gantt chart—it's a strategic communication tool that shows what you're building, why it matters, and how it ladders up to business outcomes.

## Key Concepts

### What is Strategic Roadmap Planning?

Roadmap planning is the process of:
1. **Gathering inputs** — Customer problems, business goals, technical constraints
2. **Defining initiatives** — Epics with clear hypotheses and success metrics
3. **Prioritizing** — Rank initiatives by impact, effort, strategic fit
4. **Sequencing** — Organize into releases/quarters with logical dependencies
5. **Communicating** — Present roadmap to stakeholders with strategic narrative

### Types of Roadmaps

**Now/Next/Later Roadmap:**
- **Now:** Current quarter (committed)
- **Next:** Following quarter (high confidence)
- **Later:** Future exploration (low confidence)
- **Best for:** Agile teams, uncertainty, continuous discovery

**Theme-Based Roadmap:**
- Organize by strategic themes (e.g., "Retention," "Enterprise Expansion," "Mobile Experience")
- **Best for:** Communicating to execs, showing strategic intent

**Timeline Roadmap (Quarters):**
- Q1: Epics A, B; Q2: Epics C, D; Q3: Epics E, F
- **Best for:** Resource planning, stakeholder communication

**Feature-Based Roadmap (Anti-Pattern):**
- Lists features without context (e.g., "Dark mode," "SSO," "Advanced reporting")
- **Why it fails:** No strategic narrative, no customer problems framed

### Why This Works
- **Outcome-driven:** Ties initiatives to business/customer outcomes
- **Stakeholder alignment:** Transparent process reduces political friction
- **Strategic clarity:** Shows not just "what" but "why"
- **Flexible:** Adapts as you learn from discovery/delivery

### Anti-Patterns (What This Is NOT)
- **Not a commitment:** Roadmaps are strategic plans, not contracts
- **Not a feature list:** Roadmaps frame problems, not just solutions
- **Not waterfall:** Roadmaps evolve quarterly based on learning

## When to Use
- Annual or quarterly planning cycles
- After product strategy session (translate strategy to roadmap)
- Onboarding new stakeholders (align on direction)
- Reframing existing roadmap (shift from feature-driven to outcome-driven)

### When NOT to Use This
- For tactical sprint planning (use backlog instead)
- When strategy is unclear (run product-strategy-session first)
- When stakeholders expect date commitments (address expectations first)

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

This workflow orchestrates **5 phases** over **1-2 weeks**, using multiple component and interactive skills.

---

## Phase 1: Gather Inputs (Day 1-2)

**Goal:** Collect business goals, customer problems, technical constraints, stakeholder requests.

### Activities

**1. Review Business Goals (OKRs, Strategic Initiatives)**
- **Source:** Company OKRs, exec strategy memos, board decks
- **Questions:**
  - What are the company's top 3 priorities this year?
  - What metrics must we move? (revenue, retention, acquisition, efficiency)
  - Are there strategic bets? (new markets, partnerships, product lines)
- **Output:** 3-5 business outcomes to optimize for

**2. Review Customer Problems (Discovery Insights)**
- **Source:** Discovery interviews, support tickets, NPS feedback, churn surveys
- **Use:** Insights from `skills/discovery-process/SKILL.md` (if recently completed)
- **Questions:**
  - What are the top 3-5 customer pain points?
  - Which problems affect the most customers?
  - Which problems have highest intensity?
- **Output:** 3-5 validated customer problems

**3. Review Technical Constraints & Opportunities**
- **Source:** Engineering leadership, tech debt assessments
- **Questions:**
  - Are there technical blockers? (scaling, performance, security)
  - Are there enabling investments? (platform upgrades, API rewrites)
  - What's the technical roadmap? (migrations, deprecations)
- **Output:** List of technical investments required

**4. Review Stakeholder Requests**
- **Source:** Sales, marketing, customer success, execs
- **Questions:**
  - What are sales asking for? (enterprise features, integrations)
  - What's marketing requesting? (growth initiatives, positioning)
  - What's customer success flagging? (churn risks, expansion blockers)
- **Output:** List of stakeholder requests (not yet committed)

### Outputs from Phase 1

- **Business outcomes:** 3-5 OKRs or strategic goals
- **Customer problems:** 3-5 validated pain points
- **Technical investments:** Platform/tech debt items
- **Stakeholder requests:** Feature requests from internal teams

---

## Phase 2: Define Initiatives (Epics) (Day 3-4)

**Goal:** Turn inputs into epics with hypotheses, success metrics, and effort estimates.

### Activities

**1. Define Epic Hypotheses**
- **Use:** `skills/epic-hypothesis/SKILL.md` (component)
- **For each initiative:** Write hypothesis statement
- **Format:** "We believe that [building X] for [persona] will achieve [outcome] because [assumption]."
- **Participants:** PM
- **Duration:** 60 minutes per epic
- **Output:** 10-15 epic hypotheses

**Example Epics (SaaS Product):**

```
Epic 1: Guided Onboarding
Hypothesis: We believe that adding a step-by-step onboarding checklist for non-technical users will increase activation rate from 40% to 60% because users currently drop off due to lack of guidance.

Success Metric: Activation rate (% completing first action within 24 hours)
Target: 40% → 60%

Epic 2: Enterprise SSO
Hypothesis: We believe that adding SSO for enterprise accounts will increase enterprise deals closed from 2/quarter to 5/quarter because enterprise buyers require SSO for security compliance.

Success Metric: Enterprise deals closed per quarter
Target: 2 → 5

Epic 3: Mobile-Optimized Workflows
Hypothesis: We believe that optimizing core workflows for mobile will increase mobile DAU from 5% to 20% because mobile-first users currently can't complete workflows on the go.

Success Metric: Mobile DAU as % of total DAU
Target: 5% → 20%
```

**2. Estimate Effort (T-Shirt Sizing)**
- **Participants:** PM + engineering lead
- **Duration:** 90 minutes
- **Method:**
  - **Small (S):** 1-2 weeks (1-2 engineers)
  - **Medium (M):** 3-4 weeks (2-3 engineers)
  - **Large (L):** 2-3 months (3-5 engineers)
  - **Extra Large (XL):** 3+ months (5+ engineers)
- **Output:** Effort estimate per epic

**3. Map to Business Outcomes**
- **For each epic:** Tag with primary business outcome
- **Example:**
  - Epic 1 (Guided Onboarding) → Retention
  - Epic 2 (Enterprise SSO) → Acquisition (enterprise)
  - Epic 3 (Mobile Workflows) → Engagement

### Outputs from Phase 2

- **10-15 epics:** Each with hypothesis, success metric, effort estimate
- **Business outcome mapping:** Which epics drive which OKRs

---

## Phase 3: Prioritize Initiatives (Day 5)

**Goal:** Rank epics by impact, effort, and strategic fit.

### Activities

**1. Choose Prioritization Framework**
- **Use:** `skills/prioritization-advisor/SKILL.md` (interactive)
- **Participants:** PM
- **Duration:** 30 minutes
- **Output:** Recommended framework (RICE, ICE, Value/Effort, etc.)

**2. Score Epics**
- **Participants:** PM, engineering lead, product leadership
- **Duration:** 120 minutes
- **Method:** Apply framework to all epics
- **Example (RICE scoring):**

| Epic | Reach | Impact | Confidence | Effort | RICE Score |
|------|-------|--------|------------|--------|------------|
| Guided Onboarding | 10,000 users | 3 (massive) | 80% | 1 month | 24,000 |
| Enterprise SSO | 500 users | 3 (massive) | 90% | 2 months | 675 |
| Mobile Workflows | 5,000 users | 2 (high) | 60% | 3 months | 2,000 |
| Advanced Reporting | 2,000 users | 2 (high) | 50% | 2 months | 1,000 |

**3. Adjust for Strategic Fit**
- **Review scores:** Do they align with business goals?
- **Strategic overrides:** Promote epics that align with strategic bets (even if score is lower)
- **Example:** Enterprise SSO scores lower, but it's critical for enterprise expansion strategy → boost priority

### Outputs from Phase 3

- **Ranked backlog:** Epics sorted by priority (RICE score + strategic adjustments)
- **Top 10 epics:** Highest-priority initiatives for roadmap

---

## Phase 4: Sequence Roadmap (Day 6-7)

**Goal:** Organize epics into quarters/releases with logical dependencies.

### Activities

**1. Map Dependencies**
- **Questions:**
  - Does Epic B depend on Epic A? (e.g., "Advanced Reporting" requires "Data Pipeline Upgrade")
  - Are there technical blockers? (e.g., "Mobile App" requires "API Redesign")
- **Output:** Dependency graph (Epic A → Epic B → Epic C)

**2. Sequence by Quarter (or Release)**
- **Now (Q1):** Top 3-5 epics, no dependencies
- **Next (Q2):** Next 3-5 epics, may depend on Q1 completion
- **Later (Q3+):** Remaining epics, lower confidence

**Example Roadmap (Timeline-Based):**

```
Q1 2026 (Now - Committed):
├─ Guided Onboarding (Retention)
├─ Enterprise SSO (Acquisition)
└─ Mobile-Optimized Workflows (Engagement)

Q2 2026 (Next - High Confidence):
├─ Advanced Reporting (depends on Data Pipeline, Q1)
├─ Slack Integration (Engagement)
└─ Pricing Page Redesign (Acquisition)

Q3 2026 (Later - Lower Confidence):
├─ Mobile App (depends on API Redesign)
├─ AI-Powered Recommendations
└─ Multi-Language Support

Q4 2026 (Exploration):
├─ Marketplace/Plugin Ecosystem
└─ Enterprise Onboarding Concierge
```

**Alternative: Now/Next/Later Roadmap**

```
NOW (Current Quarter):
- Guided Onboarding
- Enterprise SSO
- Mobile-Optimized Workflows

NEXT (Following Quarter):
- Advanced Reporting
- Slack Integration
- Pricing Page Redesign

LATER (Future):
- Mobile App
- AI Recommendations
- Multi-Language Support
```

**3. Validate with Engineering**
- **Participants:** PM + engineering lead
- **Questions:**
  - Is sequencing realistic? (capacity, dependencies)
  - Are there hidden technical blockers?
  - Do we need to adjust scope?
- **Output:** Validated roadmap sequence

### Outputs from Phase 4

- **Sequenced roadmap:** Epics organized by Q1, Q2, Q3
- **Dependency map:** What depends on what
- **Capacity check:** Engineering agrees sequence is feasible

---

## Phase 5: Communicate Roadmap (Week 2)

**Goal:** Present roadmap to stakeholders, gather feedback, build alignment.

### Activities

**1. Create Roadmap Presentation**
- **Format:** 30-45 min presentation
- **Structure:**
  - **Slide 1:** Strategic context (business goals, customer problems)
  - **Slide 2-3:** Roadmap overview (Q1, Q2, Q3)
  - **Slide 4-6:** Deep dive per quarter (epics, hypotheses, success metrics)
  - **Slide 7:** What's NOT on roadmap (and why)
  - **Slide 8:** Dependencies and risks
- **Participants:** PM, design
- **Duration:** 2-3 hours to prepare

**2. Present to Stakeholders**
- **Audience:** Execs, product leadership, engineering, sales, marketing, CS
- **Duration:** 45 min presentation + 15 min Q&A
- **Focus:**
  - Strategic narrative: "Here's why we're prioritizing X over Y"
  - Outcome focus: "Each epic drives [business outcome]"
  - Flexibility: "This roadmap is a plan, not a commitment; we'll adjust as we learn"

**3. Gather Feedback**
- **Questions to ask:**
  - Do these priorities align with business goals?
  - Are we missing critical customer problems?
  - Are dependencies clear?
  - What concerns do you have?
- **Output:** List of feedback, concerns, questions

**4. Refine Roadmap**
- **Based on feedback:** Adjust priorities, add missing epics, clarify dependencies
- **Duration:** 1-2 days
- **Output:** Final roadmap v1.0

**5. Publish Roadmap**
- **Internal:** Share with team (Confluence, Notion, Productboard, etc.)
- **External (Optional):** Public roadmap for customers (use Now/Next/Later format)
- **Format:** Visual roadmap + narrative doc

### Outputs from Phase 5

- **Roadmap presentation:** 30-45 min deck
- **Stakeholder alignment:** Feedback incorporated, concerns addressed
- **Published roadmap:** Accessible to team (internal) or customers (external)

---

## Complete Workflow: End-to-End Summary

```
Week 1:
├─ Day 1-2: Gather Inputs
│  ├─ Review business goals (OKRs)
│  ├─ Review customer problems (discovery insights)
│  ├─ Review technical constraints
│  └─ Review stakeholder requests
│
├─ Day 3-4: Define Initiatives (Epics)
│  ├─ skills/epic-hypothesis/SKILL.md (60 min per epic)
│  ├─ Estimate effort (90 min)
│  └─ Map to business outcomes
│
├─ Day 5: Prioritize Initiatives
│  ├─ skills/prioritization-advisor/SKILL.md (30 min)
│  ├─ Score epics (120 min)
│  └─ Adjust for strategic fit
│
└─ Day 6-7: Sequence Roadmap
   ├─ Map dependencies
   ├─ Sequence by quarter (Q1, Q2, Q3)
   └─ Validate with engineering

Week 2:
└─ Communicate Roadmap
   ├─ Create presentation (2-3 hours)
   ├─ Present to stakeholders (60 min)
   ├─ Gather feedback
   ├─ Refine roadmap (1-2 days)
   └─ Publish roadmap
```

**Total Time Investment:**
- **Fast track:** 1 week (existing epics, quick alignment)
- **Typical:** 1.5-2 weeks (define epics, stakeholder review)

---

## Examples

See `examples/sample.md` for full roadmap examples.

Mini example excerpt:

```markdown
Now: Guided onboarding (activation +20%)
Next: Enterprise SSO (deal velocity)
Later: Mobile workflows (DAU lift)
```

## Common Pitfalls

### Pitfall 1: Feature-Driven Roadmap (No Outcomes)
**Symptom:** Roadmap lists features ("Dark mode," "SSO," "Advanced filters") with no context

**Consequence:** No strategic clarity, stakeholders don't understand "why"

**Fix:** Frame epics as hypotheses with success metrics (not just feature names)

---

### Pitfall 2: Prioritizing by HiPPO (Highest Paid Person's Opinion)
**Symptom:** Execs dictate roadmap, no data-driven prioritization

**Consequence:** Build wrong things, ignore customer problems

**Fix:** Use prioritization framework (RICE, ICE) to transparently score epics

---

### Pitfall 3: Roadmap as Commitment (Waterfall Thinking)
**Symptom:** Roadmap treated as contract, no flexibility to adjust

**Consequence:** Can't pivot when you learn new information

**Fix:** Communicate roadmap as "strategic plan, subject to change based on learning"

---

### Pitfall 4: No Dependencies Mapped
**Symptom:** Sequence epics without checking technical dependencies

**Consequence:** Q2 epic blocked because Q1 dependency didn't finish

**Fix:** Map dependencies explicitly in Phase 4, validate with engineering

---

### Pitfall 5: Solo PM Roadmap (No Stakeholder Input)
**Symptom:** PM creates roadmap alone, presents finished plan

**Consequence:** No buy-in, stakeholders feel excluded

**Fix:** Gather inputs (Phase 1) from all stakeholders, present draft (Phase 5) for feedback

---

## References

### Related Skills (Orchestrated by This Workflow)

**Phase 2:**
- `skills/epic-hypothesis/SKILL.md` (component)

**Phase 3:**
- `skills/prioritization-advisor/SKILL.md` (interactive)

**Phase 4:**
- (Dependencies mapped manually, no specific skill)

**Phase 5:**
- (Presentation created manually, no specific skill)

**Optional/Related:**
- `skills/product-strategy-session/SKILL.md` (workflow) — Run before roadmap planning to establish strategy
- `skills/discovery-process/SKILL.md` (workflow) — Provides customer problem inputs for Phase 1
- `skills/user-story-mapping-workshop/SKILL.md` (interactive) — For complex epics requiring release planning

### External Frameworks
- Bruce McCarthy, *Product Roadmaps Relaunched* (2017) — Outcome-driven roadmaps
- C. Todd Lombardo, *Product Roadmaps Relaunched* (2017) — Now/Next/Later framework
- Intercom, "RICE Prioritization" (2016) — Prioritization framework

### Dean's Work
- [If Dean has roadmap planning resources, link here]

---

**Skill type:** Workflow
**Suggested filename:** `roadmap-planning.md`
**Suggested placement:** `/skills/workflows/`
**Dependencies:** Orchestrates `skills/epic-hypothesis/SKILL.md`, `skills/prioritization-advisor/SKILL.md`, plus manual activities
