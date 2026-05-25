# PoL Probe Examples

### ✅ Good: Task-Focused PoL Probe

**Hypothesis:** "Users can distinguish between 'archive' and 'delete' without a confirmation modal."

**Probe Type:** Task-Focused Test
**Method:** UsabilityHub 5-second test with 20 users
**Timeline:** 2 days (build task, recruit, analyze)
**Success Criteria:**
- **Pass:** 80%+ users correctly identify action consequences
- **Fail:** <60% correct, or 3+ users express confusion

**Harsh Truth Delivered:** Only 45% understood the difference. Added explicit labels ("Delete forever" vs "Archive for 30 days"). Re-tested at 92%. **Probe deleted.**

**Why This Works:**
- Narrow hypothesis (one UI decision)
- Fast execution (2 days)
- Brutal honesty (failed first attempt)
- Disposable (deleted after learning)

---

### ✅ Good: Feasibility Check PoL Probe

**Hypothesis:** "We can auto-generate meeting summaries from Zoom transcripts using GPT-4 with <2% error rate."

**Probe Type:** Feasibility Check
**Method:** 1-day spike with 10 real transcripts, GenAI prompt chain
**Timeline:** 1 day
**Success Criteria:**
- **Pass:** 9/10 summaries accurate, <5 manual edits per summary
- **Fail:** >3 summaries require full rewrites

**Harsh Truth Delivered:** Error rate was 18%. Discovered that medical jargon and crosstalk broke the model. Decided NOT to build feature. **Probe deleted.**

**Why This Works:**
- Eliminated technical risk before building
- Cheap (1 day)
- Falsifiable (clear error threshold)
- Saved months of wasted development

---

### ❌ Bad: "Prototype Theater" (Not a PoL Probe)

**Hypothesis:** "Executives will approve budget if we show a polished demo."

**Probe Type:** *(None—this isn't a probe)*
**Method:** 3-week Figma design + coded prototype with animations
**Timeline:** 3 weeks
**Success Criteria:** "Get exec buy-in"

**Why This Fails:**
- Not testing a user hypothesis (testing internal politics)
- Too polished (3 weeks = not disposable)
- No harsh truth (vanity metrics: "Execs liked it!")
- No clear disposal plan (became "the prototype we have to maintain")

**What Should Have Been Done:**
- Skip the prototype entirely
- Use a **Narrative Prototype** (Loom walkthrough in 1 day)
- Test with 5 target users, not executives
- Measure task completion, not stakeholder applause

---

### ❌ Bad: MVP Disguised as PoL Probe

**Hypothesis:** "Users will subscribe to our AI writing assistant."

**Probe Type:** Vibe-Coded PoL Probe *(claimed)*
**Method:** Fully functional React app with Stripe integration
**Timeline:** 4 weeks
**Success Criteria:** "10 paying customers"

**Why This Fails:**
- Not disposable (4 weeks of work, payment processing—too invested)
- Too broad ("will subscribe" tests price, value prop, UX, and onboarding simultaneously)
- This is an **MVP**, not a probe
- No disposal plan (team will resist deleting working code)

**What Should Have Been Done:**
- Test value prop with a **Narrative Prototype** (explainer video, measure interest)
- Test pricing with a **landing page + waitlist** (ConvertKit, Carrd)
- Test core AI quality with a **Feasibility Check** (1-day spike)
- Build MVP only after all three probes pass

---

## Common Pitfalls

### 1. **Prototype Theater**
**Failure Mode:** Building impressive demos that don't test hypotheses.

**Consequence:** Waste weeks impressing stakeholders while learning nothing about users.

**Fix:** Before building, write down: "What harsh truth am I seeking? What would prove me wrong?"

---

### 2. **Confusing PoL with MVP**
**Failure Mode:** Treating probes as "version 1.0" instead of disposable experiments.

**Consequence:** Scope creep, technical debt, resistance to disposal.

**Fix:** Set a disposal date before you start. If you can't commit to deleting it, you're building an MVP, not a probe.

---

### 3. **Choosing Based on Tooling Comfort**
**Failure Mode:** "I know Figma, so I'll design a prototype" (regardless of whether design is the risk).

**Consequence:** Validate the wrong thing; miss the actual risk.

**Fix:** Match probe type to hypothesis, not your skillset. If you need a Feasibility Check but only know design tools, pair with an engineer for 1 day.

---

### 4. **Vanity Metrics**
**Failure Mode:** Measuring "stakeholder excitement" instead of user behavior.

**Consequence:** False confidence; ship something users don't want.

**Fix:** Define success criteria as observable user behavior (task completion rate, error rate, time-on-task), not opinions.

---

### 5. **No Disposal Plan**
**Failure Mode:** "We'll figure out what to do with it later."

**Consequence:** Probe becomes technical debt, "temporary" code ships to production.

**Fix:** Document disposal date and method before building. Treat it like a spike in Agile—timeboxed and deleted by design.

---
