# Product Strategy Session Examples

### Example 1: Good Product Strategy Session (SaaS Onboarding Improvement)

**Context:** Existing SaaS product with 60% onboarding drop-off, need strategic approach to retention.

**Phase 1 - Positioning:**
- Ran `positioning-workshop.md`: Defined target = "non-technical small business owners"
- Created proto-personas: "Solo Entrepreneur Sam" (no IT support)
- JTBD: "Help me get value from software fast without technical expertise"

**Phase 2 - Problem Framing:**
- Ran `problem-framing-canvas.md`: Problem = "Users abandon onboarding because jargon-heavy UI and lack guidance"
- Problem statement: "60% of non-technical users drop off in first 24 hours due to overwhelming, unclear onboarding flow"

**Phase 3 - Solution Exploration:**
- Ran `opportunity-solution-tree.md`: Generated 3 opportunities (guidance, simplification, support)
- Selected opportunity: "Lack of onboarding guidance"
- Solutions: Guided checklist, tooltips, email drip, human-assisted onboarding
- POC: Guided checklist (test with prototype)

**Phase 4 - Prioritization:**
- Ran `prioritization-advisor.md`: Recommended RICE (early PMF stage, some data)
- Scored epics: Guided onboarding (RICE: 12,000), In-app help (8,000), Human onboarding (3,000)
- Roadmap: Q1 = Guided onboarding, Q2 = In-app help

**Phase 5 - Alignment:**
- Presented to execs: Problem statement + OST + roadmap
- Feedback: "Can we run experiment before full build?" → Added 2-week prototype test

**Phase 6 - Execution:**
- Ran `epic-breakdown-advisor.md`: Split "Guided onboarding" using workflow pattern
- Stories: R1 = Simple checklist (3 steps), R2 = Progress tracking, R3 = Celebration/gamification
- Planned Sprint 1: Build R1 (simple checklist)

**Outcome:** Clear, validated strategy with executive buy-in and executable roadmap.

---

### Example 2: Bad Product Strategy Session (Skipped Discovery)

**Context:** Startup wants to build mobile app.

**Phase 1 - Positioning:** Skipped (assumed positioning was clear)

**Phase 2 - Problem Framing:** Skipped (jumped to solution: "We need a mobile app")

**Phase 3 - Solution Exploration:** Skipped (already decided on solution)

**Phase 4 - Prioritization:** Built feature list, prioritized by "what's easiest"

**Phase 6 - Execution:** Started building mobile app immediately

**Why this failed:**
- No positioning validation (who is the app for?)
- No problem validation (do customers actually need mobile access?)
- No alternative solutions explored (responsive web? PWA?)
- 3 months later: Mobile app built, low usage, wrong problem solved

**Fix with strategy session:**
- Run positioning workshop: Discovered target = "field workers who can't access desktop"
- Run problem framing: Validated that mobile-first users can't complete workflows on the go
- Run OST: Explored alternatives (mobile app, responsive web, PWA, SMS notifications)
- Run experiments: Tested responsive web first (2 weeks), validated it solved 80% of problem
- Outcome: Built responsive web instead of native app, saved 2 months dev time

---
