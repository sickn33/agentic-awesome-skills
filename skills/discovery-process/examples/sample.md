# Discovery Process Examples

### Example 1: Good Discovery Process (SaaS Retention Problem)

**Context:** SaaS product with 15% monthly churn, hypothesis = onboarding problem.

**Phase 1 - Frame Problem:**
- Ran `problem-framing-canvas.md`: Problem = "Users abandon onboarding due to lack of guidance"
- Problem statement: "60% of non-technical users drop off in first 24 hours"

**Phase 2 - Research Planning:**
- Ran `discovery-interview-prep.md`: Chose "switch interviews" (users who churned)
- Recruited 10 churned customers (last 30 days)

**Phase 3 - Conduct Research:**
- Interviewed 10 churned customers
- Asked: "Walk me through your first experience with the product. Where did you get stuck?"
- Pattern emerged after 6 interviews: Same pain point (empty dashboard, unclear next step)

**Phase 4 - Synthesize:**
- Affinity mapping: 8/10 mentioned "didn't know what to do first"
- Customer quote: "I logged in, saw an empty dashboard, and thought 'now what?'"
- Pain point: "Lack of onboarding guidance" (frequency: 8/10, intensity: HIGH)

**Phase 5 - Generate Solutions:**
- Ran `opportunity-solution-tree.md`: 3 solutions (guided checklist, tooltips, human onboarding)
- Experiment: Figma prototype of guided checklist, tested with 10 new signups
- Result: 9/10 completed first action with checklist (vs. 4/10 without)

**Phase 6 - Decide:**
- Decision: GO (validated problem + solution)
- Wrote epic hypothesis: "If we add guided onboarding checklist, activation rate will increase from 40% to 60%"
- Moved to roadmap (Q1 priority)

**Outcome:** 4 weeks, validated problem/solution, high confidence in build decision.

---

### Example 2: Bad Discovery Process (Jumped to Solution)

**Context:** Product team wants to build mobile app.

**Phase 1 - Frame Problem:** Skipped (assumed problem = "need mobile app")

**Phase 2-3 - Research:** Skipped (no customer interviews)

**Phase 5 - Generate Solutions:** Skipped (already decided on solution)

**Phase 6 - Decide:** GO (no validation)

**Outcome:** Built mobile app over 6 months, low adoption, discovered later that responsive web would've solved 80% of use cases in 2 weeks.

**Fix with discovery process:**
- **Phase 1:** Frame problem: "Mobile-first users can't complete workflows on the go"
- **Phase 3:** Interview 10 mobile-first users: "What workflows do you need mobile access for?"
- **Phase 4:** Insight = Users only need 2-3 core workflows on mobile (not full app)
- **Phase 5:** Test responsive web + mobile-optimized flows (2-week experiment)
- **Phase 6:** Result = Responsive web solved problem, saved 5 months dev time

---
