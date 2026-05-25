# Opportunity Solution Tree Examples

### Example 1: Good OST (Retention Use Case)

**Step 0 - Context:** User shares stakeholder request: "Customers churn after 3 months. We need better retention features."

**Q1 Response:** "Customer retention — Reduce churn from 15% to 8% within 6 months"

**Agent extracts outcome:**
- **Desired Outcome:** Reduce monthly churn rate from 15% to 8%
- **Why it matters:** High churn indicates value delivery problem; retention drives LTV

---

**Agent generates 3 opportunities:**

1. **Opportunity 1: Users don't integrate product into daily workflow** — "Sign up, use once or twice, forget about it; not a habit"
   - Evidence: Usage data shows 60% of churned users had <5 logins/month

2. **Opportunity 2: Product missing critical features** — "Users switch to competitors because we lack [X feature]"
   - Evidence: Exit interviews mention "missing advanced reporting" 40% of the time

3. **Opportunity 3: Poor customer support** — "Users encounter issues, don't get help, give up"
   - Evidence: Support ticket volume from churned users 2x higher than retained users

**User selects:** "Opportunity 1 — Users don't integrate into daily workflow"

---

**Agent generates 3 solutions:**

1. **Solution 1: Email digest (daily summary)** — "Send daily email with key updates, prompts to return to product"
   - Hypothesis: Reminders drive re-engagement
   - Experiment: A/B test daily digest vs. no digest, measure DAU/MAU ratio

2. **Solution 2: Slack/Teams integration** — "Bring product notifications into where users already are"
   - Hypothesis: Meeting users in their workflow increases usage
   - Experiment: Offer to 100 users, measure engagement lift vs. control

3. **Solution 3: In-app triggers (progress prompts)** — "Show 'You're 80% to your goal' prompts when users log in"
   - Hypothesis: Progress feedback creates habit loop
   - Experiment: A/B test triggers vs. no triggers, measure retention at 30/60/90 days

**User:** "Move to POC selection"

---

**Agent evaluates:**

| Solution | Feasibility | Impact | Market Fit | Total | Rationale |
|----------|-------------|--------|------------|-------|-----------|
| Solution 1: Email digest | 5 | 3 | 4 | 12 | Easy to build, moderate impact (email fatigue risk), good market fit |
| Solution 2: Slack integration | 3 | 5 | 5 | 13 | Medium effort, high impact (meets users where they are), strong market fit |
| Solution 3: In-app triggers | 4 | 4 | 4 | 12 | Moderate effort, good impact, good market fit |

**Recommended POC:** Solution 2 (Slack/Teams integration)

**Why this POC:**
- Highest total score (13)
- Strong market fit (users already live in Slack/Teams)
- High impact (notifications in existing workflow drive re-engagement)
- Medium feasibility (3-4 weeks to build basic integration)

**Experiment:**
- **Type:** A/B test
- **Participants:** 200 users (100 with Slack integration, 100 control)
- **Duration:** 30 days
- **Success criteria:** Slack group shows 20%+ higher DAU/MAU vs. control

**Why this works:**
- Clear hypothesis tied to retention metric
- Testable in 30 days
- High confidence in market fit (users requested this)

---

### Example 2: Bad OST (Solution-First Thinking)

**Q1 Response:** "We need to build a mobile app"

**Why this fails:**
- "Build a mobile app" is a solution, not an outcome
- No measurable business metric
- Jumps straight to solution without exploring problems

**Fix:**
- **Agent pushes back:** "A mobile app is a solution. What's the desired outcome? (e.g., Increase engagement, reach mobile-first users, drive feature adoption?)"
- **User clarifies:** "Increase daily active users from mobile-first customer segment"
- **Agent extracts:** Desired Outcome = Increase mobile DAU from 5% to 20% of total users

**Now proceed with opportunity generation:**

1. **Opportunity 1: Mobile-first users can't access product on the go**
2. **Opportunity 2: Mobile web experience is broken/slow**
3. **Opportunity 3: Competitors offer native mobile apps**

**Solutions for Opportunity 1 might include:**
- Build native mobile app (high effort)
- Optimize mobile web (medium effort)
- Build progressive web app (PWA) (medium effort)

**POC evaluation reveals:** Optimize mobile web scores higher on feasibility + impact than building native app. Test mobile web improvements first.

---
