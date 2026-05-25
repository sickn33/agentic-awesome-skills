# Roadmap Examples

### Example 1: Good Roadmap Planning (SaaS Product)

**Context:** Annual planning, need to align roadmap with retention and enterprise expansion goals.

**Phase 1 - Gather Inputs:**
- Business goals: Reduce churn from 15% to 8%, increase enterprise deals from 2/quarter to 5/quarter
- Customer problems: Onboarding confusion, enterprise SSO gap, mobile access issues
- Technical: Need to upgrade data pipeline for advanced reporting

**Phase 2 - Define Epics:**
- Wrote 12 epics with hypotheses (guided onboarding, enterprise SSO, mobile workflows, advanced reporting, etc.)
- Estimated effort: Onboarding = M (3 weeks), SSO = M (4 weeks), Mobile = L (2 months)

**Phase 3 - Prioritize:**
- Used RICE framework (recommended by `prioritization-advisor.md`)
- Scored: Onboarding (24,000), SSO (675), Mobile (2,000), Reporting (1,000)
- Strategic override: Boosted SSO priority (critical for enterprise expansion)

**Phase 4 - Sequence:**
- Q1: Guided Onboarding, Enterprise SSO, Mobile Workflows
- Q2: Advanced Reporting (depends on Data Pipeline in Q1), Slack Integration
- Q3: Mobile App (depends on API Redesign)

**Phase 5 - Communicate:**
- Presented to execs: "Q1 focuses on retention (onboarding) and enterprise expansion (SSO)"
- Feedback: "Can we add pricing page redesign to Q2?" → Adjusted roadmap
- Published: Internal roadmap (Confluence), external roadmap (Now/Next/Later)

**Outcome:** Clear, aligned roadmap with strategic narrative.

---

### Example 2: Bad Roadmap Planning (Feature List)

**Context:** PM creates roadmap alone, based on stakeholder requests.

**Phase 1 - Gather Inputs:** Skipped (no business goals reviewed)

**Phase 2 - Define Epics:** Listed features requested by sales, marketing, CS

**Phase 3 - Prioritize:** Prioritized by "who shouted loudest"

**Phase 4 - Sequence:** Threw features into Q1, Q2, Q3 with no rationale

**Phase 5 - Communicate:** Presented feature list to execs

**Why this failed:**
- No strategic narrative ("Why are we building this?")
- No customer problems framed
- No hypotheses or success metrics
- Roadmap felt like random feature list

**Fix with roadmap planning workflow:**
- **Phase 1:** Review business goals (reduce churn, increase enterprise)
- **Phase 2:** Turn feature requests into epics with hypotheses
- **Phase 3:** Prioritize by RICE (impact + effort), not politics
- **Phase 4:** Sequence logically by dependencies, business goals
- **Phase 5:** Present with narrative: "Q1 = Retention, Q2 = Enterprise Expansion"

---
