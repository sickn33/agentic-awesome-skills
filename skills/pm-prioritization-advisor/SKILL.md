---
name: pm-prioritization-advisor
description: Choose a prioritization framework based on stage, team context, and stakeholder needs. Use when deciding between RICE, ICE, value/effort, or another scoring approach.
risk: safe
source: community
---


## Purpose
Guide product managers in choosing the right prioritization framework by asking adaptive questions about product stage, team context, decision-making needs, and stakeholder dynamics. Use this to avoid "framework whiplash" (switching frameworks constantly) or applying the wrong framework (e.g., using RICE for strategic bets or ICE for data-driven decisions). Outputs a recommended framework with implementation guidance tailored to your context.

This is not a scoring calculator—it's a decision guide that matches prioritization frameworks to your specific situation.

## Key Concepts

### The Prioritization Framework Landscape
Common frameworks and when to use them:

**Scoring frameworks:**
- **RICE** (Reach, Impact, Confidence, Effort) — Data-driven, requires metrics
- **ICE** (Impact, Confidence, Ease) — Lightweight, gut-check scoring
- **Value vs. Effort** (2x2 matrix) — Quick wins vs. strategic bets
- **Weighted Scoring** — Custom criteria with stakeholder input

**Strategic frameworks:**
- **Kano Model** — Classify features by customer delight (basic, performance, delight)
- **Opportunity Scoring** — Rate importance vs. satisfaction gap
- **Buy-a-Feature** — Customer budget allocation exercise
- **Moscow** (Must, Should, Could, Won't) — Forcing function for hard choices

**Contextual frameworks:**
- **Cost of Delay** — Urgency-based (time-sensitive features)
- **Impact Mapping** — Goal-driven (tie features to outcomes)
- **Story Mapping** — User journey-based (narrative flow)

### Why This Works
- **Context-aware:** Matches framework to product stage, team maturity, data availability
- **Anti-dogmatic:** No single "best" framework—it depends on your situation
- **Actionable:** Provides implementation steps, not just framework names

### Anti-Patterns (What This Is NOT)
- **Not a universal ranking:** Frameworks aren't "better" or "worse"—they fit different contexts
- **Not a replacement for strategy:** Frameworks execute strategy; they don't create it
- **Not set-it-and-forget-it:** Reassess frameworks as your product matures

## When to Use
- Choosing a prioritization framework for the first time
- Switching frameworks (current one isn't working)
- Aligning stakeholders on prioritization process
- Onboarding new PMs to team practices

### When NOT to Use This
- When you already have a working framework (don't fix what isn't broken)
- For one-off decisions (frameworks are for recurring prioritization)
- As a substitute for strategic vision (frameworks can't tell you what to build)

---

### Facilitation Source of Truth

Use [`workshop-facilitation`](../workshop-facilitation/SKILL.md) as the default interaction protocol for this skill.

It defines:
- session heads-up + entry mode (Guided, Context dump, Best guess)
- one-question turns with plain-language prompts
- progress labels (for example, Context Qx/8 and Scoring Qx/5)
- interruption handling and pause/resume behavior
- numbered recommendations at decision points
- quick-select numbered response options for regular questions (include `Other (specify)` when useful)

This file defines the domain-specific assessment content. If there is a conflict, follow this file's domain logic.

## Application

This interactive skill asks **up to 4 adaptive questions**, offering **3-4 enumerated options** at each step.

---

### Question 1: Product Stage

**Agent asks:**
"What stage is your product in?"

**Offer 4 enumerated options:**

1. **Pre-product/market fit** — "Searching for PMF; experimenting rapidly; unclear what customers want" (High uncertainty, need speed)
2. **Early PMF, scaling** — "Found initial PMF; growing fast; adding features to retain/expand" (Moderate uncertainty, balancing speed + quality)
3. **Mature product, optimization** — "Established market; incremental improvements; competing on quality/features" (Low uncertainty, data-driven decisions)
4. **Multiple products/platform** — "Portfolio of products; cross-product dependencies; complex stakeholder needs" (Coordination complexity)

**Or describe your product stage (new idea, growth mode, established, etc.).**

**User response:** [Selection or custom]

---

### Question 2: Team Context

**Agent asks:**
"What's your team and stakeholder environment like?"

**Offer 4 enumerated options:**

1. **Small team, limited resources** — "3-5 engineers, 1 PM, need to focus ruthlessly" (Need simple, fast framework)
2. **Cross-functional team, aligned** — "Product, design, engineering aligned; clear goals; good collaboration" (Can use data-driven frameworks)
3. **Multiple stakeholders, misaligned** — "Execs, sales, customers all have opinions; need transparent process" (Need consensus-building framework)
4. **Large org, complex dependencies** — "Multiple teams, shared roadmap, cross-team dependencies" (Need coordination framework)

**Or describe your team/stakeholder context.**

**User response:** [Selection or custom]

---

### Question 3: Decision-Making Needs

**Agent asks:**
"What's the primary challenge you're trying to solve with prioritization?"

**Offer 4 enumerated options:**

1. **Too many ideas, unclear which to pursue** — "Backlog is 100+ items; need to narrow to top 10" (Need filtering framework)
2. **Stakeholders disagree on priorities** — "Sales wants features, execs want strategic bets, engineering wants tech debt" (Need alignment framework)
3. **Lack of data-driven decisions** — "Prioritizing by gut feel; want metrics-based process" (Need scoring framework)
4. **Hard tradeoffs between strategic bets vs. quick wins** — "Balancing long-term vision vs. short-term customer needs" (Need value/effort framework)

**Or describe your specific challenge.**

**User response:** [Selection or custom]

---

### Question 4: Data Availability

**Agent asks:**
"How much data do you have to inform prioritization?"

**Offer 3 enumerated options:**

1. **Minimal data** — "New product, no usage metrics, few customers to survey" (Gut-based frameworks)
2. **Some data** — "Basic analytics, customer feedback, but no rigorous data collection" (Lightweight scoring frameworks)
3. **Rich data** — "Usage metrics, A/B tests, customer surveys, clear success metrics" (Data-driven frameworks)

**Or describe your data situation.**

**User response:** [Selection or custom]

---

### Output: Recommend Prioritization Framework

After collecting responses, the agent recommends a framework:

```markdown
# Prioritization Framework Recommendation

**Based on your context:**
- **Product Stage:** [From Q1]
- **Team Context:** [From Q2]
- **Decision-Making Need:** [From Q3]
- **Data Availability:** [From Q4]

---

## Recommended Framework: [Framework Name]

**Why this framework fits:**
- [Rationale 1 based on Q1-Q4]
- [Rationale 2]
- [Rationale 3]

**When to use it:**
- [Context where this framework excels]

**When NOT to use it:**
- [Limitations or contexts where it fails]

---

## How to Implement

### Step 1: [First implementation step]
- [Detailed guidance]
- [Example: "Define scoring criteria: Reach, Impact, Confidence, Effort"]

### Step 2: [Second step]
- [Detailed guidance]
- [Example: "Score each feature on 1-10 scale"]

### Step 3: [Third step]
- [Detailed guidance]
- [Example: "Calculate RICE score: (Reach × Impact × Confidence) / Effort"]

### Step 4: [Fourth step]
- [Detailed guidance]
- [Example: "Rank by score; review top 10 with stakeholders"]

---

## Example Scoring Template

[Provide a concrete example of how to use the framework]

**Example (if RICE):**

| Feature | Reach (users/month) | Impact (1-3) | Confidence (%) | Effort (person-months) | RICE Score |
|---------|---------------------|--------------|----------------|------------------------|------------|
| Feature A | 10,000 | 3 (massive) | 80% | 2 | 12,000 |
| Feature B | 5,000 | 2 (high) | 70% | 1 | 7,000 |
| Feature C | 2,000 | 1 (medium) | 50% | 0.5 | 2,000 |

**Priority:** Feature A > Feature B > Feature C

---

## Alternative Framework (Second Choice)

**If the recommended framework doesn't fit, consider:** [Alternative framework name]

**Why this might work:**
- [Rationale]

**Tradeoffs:**
- [What you gain vs. what you lose]

---

## Common Pitfalls with This Framework

1. **[Pitfall 1]** — [Description and how to avoid]
2. **[Pitfall 2]** — [Description and how to avoid]
3. **[Pitfall 3]** — [Description and how to avoid]

---

## Reassess When

- Product stage changes (e.g., PMF → scaling)
- Team grows or reorganizes
- Stakeholder dynamics shift
- Current framework feels broken (e.g., too slow, ignoring important factors)

---

**Would you like implementation templates or examples for this framework?**
```

---

## Examples

### Example 1: Good Framework Match (Early PMF, RICE)

**Q1 Response:** "Early PMF, scaling — Found initial PMF; growing fast; adding features to retain/expand"

**Q2 Response:** "Cross-functional team, aligned — Product, design, engineering aligned; clear goals"

**Q3 Response:** "Lack of data-driven decisions — Prioritizing by gut feel; want metrics-based process"

**Q4 Response:** "Some data — Basic analytics, customer feedback, but no rigorous data collection"

---

**Recommended Framework: RICE (Reach, Impact, Confidence, Effort)**

**Why this fits:**
- You have some data (analytics, customer feedback) to estimate Reach and Impact
- Cross-functional team alignment means you can agree on scoring criteria
- Transitioning from gut feel to data-driven = RICE provides structure without overwhelming complexity
- Early PMF stage = need speed, but also need to prioritize high-impact features for retention/expansion

**When to use it:**
- Quarterly or monthly roadmap planning
- When backlog exceeds 20-30 items
- When stakeholders debate priorities

**When NOT to use it:**
- For strategic, multi-quarter bets (RICE favors incremental wins)
- When you lack basic metrics (Reach requires usage data)
- For single-feature decisions (overkill)

---

**Implementation:**

### Step 1: Define Scoring Criteria
- **Reach:** How many users will this feature affect per month/quarter?
- **Impact:** How much will it improve their experience? (1 = minimal, 2 = high, 3 = massive)
- **Confidence:** How confident are you in your Reach/Impact estimates? (50% = low data, 80% = good data, 100% = certain)
- **Effort:** How many person-months to build? (Include design, engineering, QA)

### Step 2: Score Each Feature
- Use a spreadsheet or Airtable
- Involve PM, design, engineering in scoring (not just PM solo)
- Be honest about Confidence (don't inflate scores)

### Step 3: Calculate RICE Score
- Formula: `(Reach × Impact × Confidence) / Effort`
- Higher score = higher priority

### Step 4: Review and Adjust
- Sort by RICE score
- Review top 10-20 with stakeholders
- Adjust for strategic priorities (RICE doesn't capture everything)

---

**Example Scoring:**

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|-------|--------|------------|--------|------------|
| Email reminders | 5,000 | 2 | 70% | 1 | 7,000 |
| Mobile app | 10,000 | 3 | 60% | 6 | 3,000 |
| Dark mode | 8,000 | 1 | 90% | 0.5 | 14,400 |

**Priority:** Dark mode > Email reminders > Mobile app (despite mobile app having high Reach/Impact, Effort is too high)

---

**Alternative Framework: ICE (Impact, Confidence, Ease)**

**Why this might work:**
- Simpler than RICE (no Reach calculation)
- Faster to score (good if you need quick decisions)

**Tradeoffs:**
- Less data-driven (no Reach metric = can't compare features affecting different user bases)
- More subjective (Impact/Ease are gut-feel, not metrics)

---

**Common Pitfalls:**

1. **Overweighting Effort** — Don't avoid hard problems just because they score low. Some strategic bets require high effort.
2. **Inflating Confidence** — Be honest. 50% confidence is okay if data is scarce.
3. **Ignoring strategy** — RICE doesn't capture strategic importance. Adjust for vision/goals.

---

### Example 2: Bad Framework Match (Pre-PMF + RICE = Wrong Fit)

**Q1 Response:** "Pre-product/market fit — Searching for PMF; experimenting rapidly"

**Q2 Response:** "Small team, limited resources — 3 engineers, 1 PM"

**Q3 Response:** "Too many ideas, unclear which to pursue"

**Q4 Response:** "Minimal data — New product, no usage metrics"

---

**Recommended Framework: ICE (Impact, Confidence, Ease) or Value/Effort Matrix**

**Why NOT RICE:**
- You don't have usage data to estimate Reach
- Pre-PMF = you need speed, not rigorous scoring
- Small team = overhead of RICE scoring is too heavy

**Why ICE instead:**
- Lightweight, gut-check framework
- Can score 20 ideas in 30 minutes
- Good for rapid experimentation phase

**Or Value/Effort Matrix:**
- Visual 2x2 matrix (high value/low effort = quick wins)
- Even faster than ICE
- Good for stakeholder alignment (visual, intuitive)

---

## Common Pitfalls

### Pitfall 1: Using the Wrong Framework for Your Stage
**Symptom:** Pre-PMF startup using weighted scoring with 10 criteria

**Consequence:** Overhead kills speed. You need experiments, not rigorous scoring.

**Fix:** Match framework to stage. Pre-PMF = ICE or Value/Effort. Scaling = RICE. Mature = Opportunity Scoring or Kano.

---

### Pitfall 2: Framework Whiplash
**Symptom:** Switching frameworks every quarter

**Consequence:** Team confusion, lost time, no consistency.

**Fix:** Stick with one framework for 6-12 months. Reassess only when stage/context changes.

---

### Pitfall 3: Treating Scores as Gospel
**Symptom:** "Feature A scored 8,000, Feature B scored 7,999, so A wins"

**Consequence:** Ignores strategic context, judgment, and vision.

**Fix:** Use frameworks as input, not automation. PM judgment overrides scores when needed.

---

### Pitfall 4: Solo PM Scoring
**Symptom:** PM scores features alone, presents to team

**Consequence:** Lack of buy-in, engineering/design don't trust scores.

**Fix:** Collaborative scoring sessions. PM, design, engineering score together.

---

### Pitfall 5: No Framework at All
**Symptom:** "We prioritize by who shouts loudest"

**Consequence:** HiPPO (Highest Paid Person's Opinion) wins, not data or strategy.

**Fix:** Pick *any* framework. Even imperfect structure beats chaos.

---

## References

### Related Skills
- `user-story.md` — Prioritized features become user stories
- `epic-hypothesis.md` — Prioritized epics validated with experiments
- `recommendation-canvas.md` — Business outcomes inform prioritization

### External Frameworks
- Intercom, *RICE Prioritization* (2016) — Origin of RICE framework
- Sean McBride, *ICE Scoring* (2012) — Lightweight prioritization
- Luke Hohmann, *Innovation Games* (2006) — Buy-a-Feature and other collaborative methods
- Noriaki Kano, *Kano Model* (1984) — Customer satisfaction framework

### Dean's Work
- [If Dean has prioritization resources, link here]

---

**Skill type:** Interactive
**Suggested filename:** `prioritization-advisor.md`
**Suggested placement:** `/skills/interactive/`
**Dependencies:** None (standalone, but informs roadmap and backlog decisions)
