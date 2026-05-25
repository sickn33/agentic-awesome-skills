---
name: discovery-interview-prep
description: Plan customer discovery interviews with the right goal, segment, constraints, and method. Use when preparing interviews for problem validation, churn research, or new product ideas.
risk: safe
source: community
---


## Purpose
Guide product managers through preparing for customer discovery interviews by asking adaptive questions about research goals, customer segments, constraints, and methodologies. Use this to design effective interview plans, craft targeted questions, avoid common biases, and maximize learning from limited customer access—ensuring discovery interviews yield actionable insights rather than confirmation bias or surface-level feedback.

This is not a script generator—it's a strategic prep process that outputs a tailored interview plan with methodology, question framework, and success criteria.

## Key Concepts

### The Discovery Interview Prep Flow
An interactive process that:
1. Gathers product/problem context (marketing materials, assumptions)
2. Defines research goals (what you're trying to learn)
3. Identifies target customer segment and access constraints
4. Recommends interview methodology (Jobs-to-be-Done, problem validation, switch interviews, etc.)
5. Generates interview framework with questions, biases to avoid, and success metrics

### Why This Works
- **Goal-driven:** Aligns interview approach to what you need to learn
- **Adaptive:** Adjusts methodology based on product stage (idea vs. existing product) and access constraints
- **Bias-aware:** Highlights common pitfalls (leading questions, confirmation bias, solution-first thinking)
- **Actionable:** Outputs interview guide ready to use

### Anti-Patterns (What This Is NOT)
- **Not a user testing script:** Discovery = learning problems; testing = validating solutions
- **Not a sales demo:** Don't pitch—listen and learn
- **Not surveys at scale:** Deep qualitative interviews (5-10 people), not broad surveys (100+ people)

## When to Use
- Starting product discovery (validating problem space)
- Repositioning an existing product (understanding new market)
- Investigating churn or drop-off (retention interviews)
- Evaluating feature ideas before building
- Preparing for customer development sprints

### When NOT to Use This
- User testing a prototype (use usability testing frameworks instead)
- Quantitative research at scale (use surveys, analytics)
- When you already know the problem (move to solution validation)

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

### Step 0: Gather Context (Before Questions)

**Agent suggests:**

Before we design your interview plan, let's gather context:

**For Your Own Product (Existing or Planned):**
- Problem hypothesis or product concept description
- Target customer segment (if known)
- Existing research (support tickets, churn data, user feedback)
- Product website or positioning materials
- Key assumptions you're trying to validate

**For Investigating an Existing Problem:**
- Customer complaints, support tickets, or churn reasons
- Hypotheses about why customers leave or struggle
- Competitive alternatives customers switch to

**If Exploring a New Problem Space:**
- Find similar products or adjacent solutions
- Copy competitor materials, customer reviews (G2, Capterra), or community discussions (Reddit, forums)
- We'll use these to frame hypotheses

**You can paste this content directly, or we can proceed with a brief description.**

---

### Question 1: Research Goal

**Agent asks:**
"What's the primary goal of these discovery interviews? (What do you need to learn?)"

**Offer 4 enumerated options:**

1. **Problem validation** — "Confirm that a problem exists and is painful enough to solve" (for new product ideas)
2. **Jobs-to-be-Done discovery** — "Understand what customers are trying to accomplish and why current solutions fail" (for product strategy)
3. **Retention/churn investigation** — "Figure out why customers leave or don't activate" (for existing products with churn issues)
4. **Feature prioritization** — "Validate which problems/features matter most to customers" (for roadmap planning)

**Or describe your own research goal (be specific: what question are you trying to answer?).**

**User response:** [Selection or custom]

---

### Question 2: Target Customer Segment

**Agent asks:**
"Who are you interviewing? (Be as specific as possible.)"

**Offer 4 enumerated options (adapted based on Q1):**

**Example (if Q1 = Problem validation):**
1. **People who experience the problem regularly** — E.g., "Small business owners who manually process invoices weekly" (high pain frequency)
2. **People who've tried to solve it** — E.g., "Users who've tried 2+ competing solutions and churned" (understand failures)
3. **People in the target segment (regardless of problem awareness)** — E.g., "All freelancers, even if they don't realize invoicing is a problem" (uncover latent needs)
4. **People who've recently experienced the problem** — E.g., "Customers who churned in the last 30 days" (fresh memory)

**Or describe your specific target segment (role, company size, behaviors, demographics).**

**Adaptation tip:** Use personas or customer segments from provided materials.

**User response:** [Selection or custom]

---

### Question 3: Constraints

**Agent asks:**
"What constraints are you working with for these interviews?"

**Offer 4 enumerated options:**

1. **Limited access** — "Can only interview 5-10 customers, need results in 2 weeks" (common for startups or fast timelines)
2. **Existing customer base** — "Have 100+ active customers, can recruit easily" (mature product advantage)
3. **Cold outreach required** — "No existing customers; need to recruit from scratch via LinkedIn, ads, or communities" (new product challenge)
4. **Internal stakeholders only** — "Can interview sales/support teams who talk to customers daily" (proxy research, less ideal but pragmatic)

**Or describe your specific constraints (budget, time, access, team capacity).**

**User response:** [Selection or custom]

---

### Question 4: Interview Methodology

**Agent asks:**
"Based on your goal ([Q1]), target segment ([Q2]), and constraints ([Q3]), here are recommended interview methodologies:"

**Offer 3-4 enumerated options (context-aware based on Q1-Q3):**

**Example (if Q1 = Problem validation, Q2 = People who experience problem regularly, Q3 = Limited access):**

1. **Problem validation interviews (Mom Test style)** — Ask about past behavior, not hypotheticals. Focus on: "Tell me about the last time you [experienced the problem]. What did you try? What happened?" (Best for: Validating if problem is real and painful)

2. **Jobs-to-be-Done (JTBD) interviews** — Focus on what customers are trying to accomplish, not what they want. Ask: "What were you trying to get done? What alternatives did you consider? What made you choose X?" (Best for: Understanding motivations and switching behavior)

3. **Switch interviews** — Interview customers who recently switched from a competitor or alternative. Ask: "What prompted you to look for a new solution? What was the 'push' away from the old tool? What 'pulled' you to try ours?" (Best for: Understanding competitive positioning and unmet needs)

4. **Timeline/journey mapping interviews** — Walk through their entire experience chronologically. Ask: "Walk me through the first time you encountered this problem. What happened next? How did you try to solve it?" (Best for: Uncovering full context and pain points)

**Choose a number, combine approaches (e.g., '1 & 2'), or describe your own methodology.**

**Adaptation examples:**
- If Q1 = Retention/churn → Prioritize "Exit interviews" or "Switch interviews (away from your product)"
- If Q1 = Feature prioritization → Prioritize "Opportunity solution tree interviews" or "Kano model interviews"
- If Q3 = Internal stakeholders only → Add caveat: "Proxy research (talking to sales/support) is better than nothing, but validate with real customers ASAP"

**User response:** [Selection or custom]

---

### Output: Generate Interview Plan

After collecting responses, the agent generates a tailored interview plan:

```markdown
# Discovery Interview Plan

**Research Goal:** [From Q1]
**Target Segment:** [From Q2]
**Constraints:** [From Q3]
**Methodology:** [From Q4]

---

## Interview Framework

### Opening (5 minutes)
- **Build rapport:** "Thanks for taking the time. I'm [name], and I'm researching [problem space]. This isn't a sales call—I'm here to learn from your experience."
- **Set expectations:** "I'll ask about your experiences with [topic]. There are no right answers. Feel free to be honest—critical feedback is most helpful."
- **Get consent:** "Is it okay if I take notes / record this conversation?"

---

### Core Questions (30-40 minutes)

**Based on your methodology ([Q4]), here are suggested questions:**

#### [Methodology Name] Questions:

1. **[Question 1]** — [Rationale for asking this]
   - **Follow-up:** [Dig deeper with...]
   - **Avoid:** [Don't ask leading version like...]

2. **[Question 2]** — [Rationale]
   - **Follow-up:** [...]
   - **Avoid:** [...]

3. **[Question 3]** — [Rationale]
   - **Follow-up:** [...]
   - **Avoid:** [...]

4. **[Question 4]** — [Rationale]
   - **Follow-up:** [...]
   - **Avoid:** [...]

5. **[Question 5]** — [Rationale]
   - **Follow-up:** [...]
   - **Avoid:** [...]

**Example (if Methodology = Problem validation - Mom Test style):**

1. **"Tell me about the last time you [experienced this problem]."** — Gets specific, recent behavior (not hypothetical)
   - **Follow-up:** "What were you trying to accomplish? What made it hard? What did you try?"
   - **Avoid:** "Would you use a tool that solves this?" (leading, hypothetical)

2. **"How do you currently handle [this problem]?"** — Reveals workarounds, alternatives, pain intensity
   - **Follow-up:** "How much time/money does that take? What's frustrating about it?"
   - **Avoid:** "Don't you think that's inefficient?" (leading)

3. **"Can you walk me through what you did step-by-step?"** — Uncovers details, edge cases, context
   - **Follow-up:** "What happened next? Where did you get stuck?"
   - **Avoid:** "Was it hard?" (yes/no question, not useful)

4. **"Have you tried other solutions for this?"** — Reveals competitive landscape, unmet needs
   - **Follow-up:** "What did you like/dislike? Why did you stop using it?"
   - **Avoid:** "Would you pay for a better solution?" (hypothetical)

5. **"If you had a magic wand, what would change?"** — Opens space for ideal outcomes (but treat with skepticism—focus on past behavior, not wishes)
   - **Follow-up:** "Why does that matter to you? What would that enable?"
   - **Avoid:** Taking feature requests literally

---

### Closing (5 minutes)
- **Summarize:** "Just to recap, I heard that [key insights]. Did I get that right?"
- **Ask for referrals:** "Do you know anyone else who experiences this problem? Could you introduce me?"
- **Thank them:** "This was incredibly helpful. I really appreciate your time."

---

## Biases to Avoid

1. **Confirmation bias:** Don't ask "Don't you think X is a problem?" → Ask "Tell me about your experience with X."
2. **Leading questions:** Don't ask "Would you use this?" → Ask "What have you tried? Why did it work/fail?"
3. **Hypothetical questions:** Don't ask "If we built Y, would you pay?" → Ask "What do you currently pay for? Why?"
4. **Pitching disguised as research:** Don't say "We're building Z to solve X" → Say "I'm researching X. Tell me about your experience."
5. **Yes/no questions:** Don't ask "Is invoicing hard?" → Ask "Walk me through your invoicing process."

---

## Success Criteria

You'll know these interviews are successful if:

✅ **You hear specific stories, not generic complaints** — "Last Tuesday, I spent 3 hours..." vs. "Invoicing is annoying"
✅ **You uncover past behavior, not hypothetical wishes** — "I tried Zapier but quit after 2 weeks" vs. "I'd probably use automation"
✅ **You identify patterns across 3+ interviews** — Same pain points emerge independently
✅ **You're surprised by something** — If everything confirms your assumptions, you're asking leading questions
✅ **You can quote customers verbatim** — Actual language = authentic insights

---

## Interview Logistics

**Recruiting:**
- [Based on Q3 constraints, suggest recruitment channels]
- **Example (if Q3 = Limited access):** "Reach out to 20-30 people to get 5-10 interviews (33% response rate is typical)"
- **Example (if Q3 = Existing customers):** "Email 50 customers with $50 Amazon gift card incentive"

**Scheduling:**
- 45-60 minutes per interview (30-40 min conversation + buffer)
- Record if possible (with consent), or take detailed notes
- Schedule 2-3 per day max (you need time to synthesize)

**Synthesis:**
- After each interview, write key insights immediately (memory fades fast)
- After 5 interviews, look for patterns (common pains, jobs, workarounds)
- Use `problem-statement.md` to frame findings

---

**Ready to start recruiting and interviewing? Let me know if you'd like to refine any part of this plan.**
```

---

## Examples

### Example 1: Good Discovery Interview Prep (Problem Validation)

**Step 0 - Context:** User shares hypothesis: "Freelancers waste time chasing late payments manually."

**Q1 Response:** "Problem validation — Confirm that late payment follow-ups are painful enough to solve"

**Q2 Response:** "People who experience the problem regularly — Freelancers who invoice 5+ clients monthly"

**Q3 Response:** "Cold outreach required — No existing customers; need to recruit via LinkedIn, Reddit, freelancer communities"

**Q4 Response:** "Problem validation interviews (Mom Test style) — Focus on past behavior, not hypotheticals"

**Generated Plan:** Includes 5 Mom Test-style questions (last time you chased a late payment, how do you currently handle it, what have you tried, etc.), biases to avoid (leading questions, hypotheticals), and success criteria (specific stories, past behavior, patterns across 3+ interviews).

**Why this works:**
- Goal is clear (validate if problem is real)
- Segment is specific (freelancers with 5+ clients/month)
- Methodology matches goal (Mom Test for validation)
- Questions focus on past behavior, not wishes
- Success criteria are measurable

---

## Common Pitfalls

### Pitfall 1: Asking What Customers Want
**Symptom:** "What features do you want us to build?"

**Consequence:** You get feature requests, not problems. Customers don't know solutions.

**Fix:** Ask about past behavior: "Tell me about the last time you struggled with X."

---

### Pitfall 2: Pitching Instead of Listening
**Symptom:** Spending 20 minutes explaining your product idea

**Consequence:** Customer feels obligated to be nice. No honest feedback.

**Fix:** Don't mention your solution until the last 5 minutes (if at all). Focus on their problems.

---

### Pitfall 3: Interviewing the Wrong People
**Symptom:** Interviewing friends, family, or people who don't experience the problem

**Consequence:** Polite feedback, not real insights.

**Fix:** Interview people who experience the problem regularly and recently.

---

### Pitfall 4: Stopping at 1-2 Interviews
**Symptom:** "We talked to 2 people, they liked it, let's build!"

**Consequence:** Small sample = confirmation bias.

**Fix:** Interview 5-10 people minimum. Look for patterns, not one-off feedback.

---

### Pitfall 5: Not Recording Insights
**Symptom:** Relying on memory after interviews

**Consequence:** Lose details, misremember quotes, can't spot patterns.

**Fix:** Record (with consent) or take detailed notes. Synthesize immediately after each interview.

---

## References

### Related Skills
- `problem-statement.md` — Use interview insights to frame problem statement
- `proto-persona.md` — Define interview target segment
- `jobs-to-be-done.md` — JTBD methodology for interviews

### External Frameworks
- Rob Fitzpatrick, *The Mom Test* (2013) — How to ask good questions without biasing answers
- Clayton Christensen, *Jobs to Be Done* — Interview methodology for understanding motivations
- Teresa Torres, *Continuous Discovery Habits* (2021) — Opportunity solution tree interviews

### Dean's Work
- Problem Framing Canvas (synthesizes interview findings)

---

**Skill type:** Interactive
**Suggested filename:** `discovery-interview-prep.md`
**Suggested placement:** `/skills/interactive/`
**Dependencies:** Uses `problem-statement.md`, `proto-persona.md`, `jobs-to-be-done.md`
