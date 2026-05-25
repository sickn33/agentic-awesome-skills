---
name: lean-ux-canvas
description: Guide teams through Lean UX Canvas v2. Use when framing a business problem, surfacing assumptions, and defining what to learn next.
risk: safe
source: community
---

## Purpose

Guide product managers through creating **Jeff Gothelf's Lean UX Canvas (v2)**—a one-page facilitation tool that frames work around a **business problem to solve**, not a **solution to implement**. Use this to align cross-functional teams around core assumptions, craft testable hypotheses, and ensure learning happens every sprint by exposing gaps in understanding (problem, users, value, and why the solution should work).

This is not a roadmap or feature list—it's an **"insurance policy"** that turns assumptions into experiments before committing to full development. The canvas shifts conversations from **outputs** to **outcomes** and ensures teams build the right thing, not just build things right.

## Key Concepts

### What is the Lean UX Canvas?

The **Lean UX Canvas (v2)** is a structured, one-page template designed to help teams frame their work around a business problem, not a solution. It aligns cross-functional teams on:
- What problem exists (and why it matters now)
- What measurable outcomes indicate success
- Who we're solving for
- What assumptions we're making
- What we need to learn first
- What experiments will test those assumptions

**Origin:** Created by Jeff Gothelf, author of *Lean UX* (O'Reilly, 2013). Version 2 was released to improve clarity around business vs. user outcomes.

**Key Insight:** The canvas acts like an **insurance policy**—it exposes gaps in understanding before you build, ensuring you don't waste sprints on the wrong thing.

---

### Canvas Structure (8 Boxes)

**Layout (3 columns × 3 rows):**

```
┌─────────────────────┬──────────────┬───────────────────────┐
│ 1. Business Problem │              │ 2. Business Outcomes  │
│                     │              │                       │
├─────────────────────┤ 5. Solutions ├───────────────────────┤
│ 3. Users            │  (tall box   │ 4. User Outcomes      │
│                     │   spanning   │    & Benefits         │
├─────────────────────┤   rows 1-2)  ├───────────────────────┤
│ 6. Hypotheses       │──────────────┤ 8. Least Work /       │
│                     │ 7. Learn     │    Experiments        │
│                     │    First     │                       │
└─────────────────────┴──────────────┴───────────────────────┘
```

**The 8 Boxes (fill in this order):**

1. **Business Problem** — What changed in the world that created a problem worth solving?
2. **Business Outcomes** — What measurable behavior change indicates success?
3. **Users** — Which persona(s) should you focus on first?
4. **User Outcomes & Benefits** — Why would users seek this? What benefit do they gain?
5. **Solutions** — What features/initiatives might solve the problem and meet user needs?
6. **Hypotheses** — Testable assumptions combining boxes 2-5 (If/Then format)
7. **What's Most Important to Learn First?** — The single riskiest assumption right now
8. **What's the Least Work to Learn Next?** — Smallest experiment to validate/invalidate that assumption

---

### Why This Works

**Problem-First, Not Solution-First:**
Starts with "what changed in the world?" not "we should build X." This prevents solution-driven thinking.

**Assumption-Driven:**
Makes hypotheses explicit before building. Every discipline surfaces their risks (technical feasibility, user value, business viability).

**Experiment-Focused:**
Tests assumptions before committing resources. Small experiments beat big bets.

**Cross-Functional Alignment:**
Shared canvas creates common language. Everyone sees the same gaps in understanding.

---

### Key Distinctions (Avoid Confusion)

**Box 2 (Business Outcomes) vs. Box 4 (User Outcomes):**
- **Box 2:** Measurable **behavior change** (retention rate, time on site, average order value)
- **Box 4:** **Goals, benefits, emotions, empathy** (save money, get promoted, spend time with family)

Box 2 is metrics. Box 4 is human.

**Solutions (Box 5) Are Hypotheses, Not Commitments:**
List candidate solutions (features, policies, even business model shifts). You're not committing to build all of them—you're exploring the solution space.

**Hypotheses (Box 6) Are Testable:**
Use the template: "We believe [business outcome] will be achieved if [user] attains [benefit] with [solution]." Each hypothesis focuses on **one** solution.

---

### Anti-Patterns (What This Is NOT)

- **Not a feature list:** Solutions are ideas to test, not a backlog
- **Not a project plan:** Canvas frames learning, not delivery timelines
- **Not a replacement for strategy:** Canvas executes strategy; it doesn't create it
- **Not a one-time exercise:** Re-visit as you learn; update assumptions

---

## When to Use

✅ **Use this when:**
- Starting a new product initiative or feature
- Reframing an existing project (suspect you're building the wrong thing)
- Aligning cross-functional teams on assumptions and experiments
- Planning discovery sprints or MVPs
- Stakeholders are solution-driven ("we need to build X") and you need to expose assumptions

❌ **Don't use this when:**
- Problem and solution are already validated (move to execution)
- Tactical bug fixes or technical debt (no learning needed)
- Stakeholders have committed to a solution regardless of evidence (address alignment first)

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

Use `template.md` for the full fill-in structure.

This interactive skill walks through **8 adaptive questions** (one per canvas box) in sequence. At each step, the agent offers guidance, examples, and options to help you fill the box correctly.

---

### Step 0: Gather Context

**Agent asks:**

Before we fill out the Lean UX Canvas, let's gather context. Please share:

**Business Context:**
- Stakeholder request, product brief, or initiative description
- Business metrics (revenue, churn, growth targets, KPIs)
- Strategic goals (OKRs, roadmap priorities)

**User Context:**
- Customer research, personas, JTBD insights
- User feedback, support tickets, churn reasons
- Competitor analysis, market trends

**You can paste:**
- PRD or product brief
- Stakeholder memo
- User research summary
- Just describe the initiative briefly

---

### Question 1: Business Problem (Box 1)

**Agent asks:**

**What problem does the business have that you are trying to solve?**

Describe:
- **Current state:** How does the business deliver value today?
- **What changed:** Market shift, competitive threat, customer behavior change, new delivery channel
- **Why it matters:** Why isn't the current situation meeting expectations?

**Good examples:**
- "Our checkout conversion rate dropped 15% after mobile traffic surpassed desktop. Our checkout flow wasn't designed for mobile, and competitors have one-tap checkout."
- "Enterprise customers are churning after 6 months because our onboarding process requires 3+ weeks of manual configuration. Competitors offer self-service onboarding."

**Bad examples (too vague):**
- "We need to increase revenue" (no context on what changed)
- "Users want more features" (no business problem stated)

**Agent offers 3 options:**

1. **I'll describe the business problem** — [Paste or write your description]
2. **Help me identify the business problem** — [Agent asks follow-up questions: What changed? What metrics are affected? What are competitors doing?]
3. **I'm not sure what the business problem is** — [Agent suggests starting with `skills/problem-statement/SKILL.md` or `skills/problem-framing-canvas/SKILL.md` first]

**User response:** [Selection or description]

**Agent validates:** Does this describe what **changed** and why it creates a problem? If not, ask clarifying questions.

---

### Question 2: Business Outcomes (Box 2)

**Agent asks:**

**How will you know you solved the business problem? What will you measure?**

Focus on **measurable behavior change** (leading indicators welcome). Ask yourself: "What will people be doing differently if the solution works?"

**Examples of business outcomes:**
- Increase mobile checkout conversion rate from 45% to 60%
- Reduce enterprise onboarding time from 3 weeks to 3 days
- Increase average order value from $50 to $75
- Reduce customer support tickets by 30%
- Increase free-to-paid conversion rate from 5% to 10%

**Important:** This is **Box 2 (behavior change)**, not Box 4 (user benefits/empathy). Metrics go here. Emotions go in Box 4.

**Agent offers 3 options:**

1. **I have specific metrics in mind** — [State your business outcomes]
2. **Help me define measurable outcomes** — [Agent suggests metrics based on the business problem]
3. **I only have lagging indicators (revenue, profit)** — [Agent helps identify leading indicators that predict those outcomes]

**User response:** [Selection or description]

**Agent validates:** Are these measurable? Observable? Do they indicate behavior change (not just "increase revenue")?

---

### Question 3: Users (Box 3)

**Agent asks:**

**What types (i.e., personas) of users and customers should you focus on first?**

Consider:
- Who **buys** it?
- Who **uses** it?
- Who **configures** it?
- Who **administers** it?

**Why this matters:** Teams tend to shortcut here ("everyone"). The canvas wants a **shared vision** of the user—and it's not always "the customer."

**Examples:**
- "SMB owners (1-10 employees) in professional services (consultants, accountants, lawyers)"
- "Enterprise IT admins who configure SSO for 500+ employees"
- "Mobile-first millennials (25-35) who order takeout 3+ times per week"

**Agent offers 3 options:**

1. **I have personas already** — [Reference `skills/proto-persona/SKILL.md` or paste persona]
2. **Help me identify target users** — [Agent asks: Who experiences the business problem most? Who's most likely to adopt? Who's easiest to reach?]
3. **I need to create personas first** — [Agent suggests using `skills/proto-persona/SKILL.md` component skill]

**User response:** [Selection or description]

**Agent validates:** Is this specific enough to imagine a real person? Or is it too broad ("all users")?

---

### Question 4: User Outcomes & Benefits (Box 4)

**Agent asks:**

**Why would your users seek out your product or service? What benefit would they gain? What behavior change can we observe that tells us they've achieved their goal?**

Focus on **goals, benefits, emotions, empathy**—not metrics (those go in Box 2).

**Examples of user outcomes & benefits:**
- Save 10 hours per week on manual data entry (spend more time with family)
- Get promoted by delivering projects faster
- Avoid embarrassment of failed checkout in front of friends
- Feel confident configuring enterprise software without calling support

**Why this matters:** This is the **empathy box**. It's about human motivation, not just behavior change.

**Agent offers 3 options:**

1. **I know what users want to achieve** — [Describe user benefits]
2. **Help me identify user benefits** — [Agent prompts: What job are they hiring this product to do? What pain are they avoiding? What gain are they seeking?]
3. **I need to research this first** — [Agent suggests `skills/jobs-to-be-done/SKILL.md` or `skills/discovery-interview-prep/SKILL.md`]

**User response:** [Selection or description]

**Agent validates:** Does this explain **why** the user cares (not just what they'll do)?

---

### Question 5: Solutions (Box 5)

**Agent asks:**

**What can we make that will solve our business problem and meet the needs of our customers at the same time?**

List **features, initiatives, policies, systems, or even business model shifts** that might work. Encourage a wide solution space: big/small, innovative, "weird," and non-technical solutions.

**Examples:**
- One-tap mobile checkout (Apple Pay, Google Pay)
- Self-service onboarding wizard (no human configuration)
- AI-powered recommendation engine
- Concierge onboarding (high-touch, manual—test before automating)
- Change pricing model (usage-based instead of flat rate)

**Important:** These are **hypotheses**, not commitments. You're exploring options, not committing to build everything.

**Agent offers 3 options:**

1. **I have solution ideas** — [List your candidate solutions]
2. **Help me brainstorm solutions** — [Agent suggests solutions based on problem, outcomes, and users]
3. **I only have one solution in mind** — [Agent challenges: "What else could solve this? What if that solution doesn't work?"]

**User response:** [Selection or description]

**Agent validates:** Do you have at least 3 candidate solutions? (More options = better hypotheses later)

---

### Question 6: Hypotheses (Box 6)

**Agent asks:**

Now let's create testable hypotheses by combining assumptions from Boxes 2-5.

**Use this template:**

> **We believe that** [business outcome from Box 2] **will be achieved if** [user from Box 3] **attains** [benefit from Box 4] **with** [solution from Box 5].

**Rules:**
- Each hypothesis focuses on **one** solution (from Box 5)
- Combines assumptions from Boxes 2, 3, 4, and 5
- Must be testable (you can design an experiment to validate/invalidate it)

**Example:**

> **We believe that** increasing mobile checkout conversion rate from 45% to 60% **will be achieved if** mobile-first millennials (25-35) **attain** faster, friction-free checkout **with** one-tap Apple Pay integration.

**Agent offers:**

Based on your inputs, here are suggested hypotheses (one per solution from Box 5):

1. [Generated hypothesis 1]
2. [Generated hypothesis 2]
3. [Generated hypothesis 3]

**Options:**
- **Accept these hypotheses** — [Agent records them]
- **Edit a hypothesis** — [Modify wording]
- **Write my own hypotheses** — [Use the template]

**User response:** [Selection or description]

**Agent validates:** Does each hypothesis clearly state what you believe will happen if the solution works?

---

### Question 7: What's the Most Important Thing We Need to Learn First? (Box 7)

**Agent asks:**

For each hypothesis from Box 6, identify its **riskiest assumptions**. Then determine the **riskiest one right now**.

**Types of risk:**
- **Value risk:** Will users actually use this? Do they care?
- **Usability risk:** Can users figure out how to use it?
- **Feasibility risk:** Can we technically build this?
- **Viability risk:** Will this achieve the business outcome?

**Hint:** Early on, focus risk on **value** more than feasibility (most of the time). Don't build something users don't want, even if it's technically feasible.

**Agent offers:**

Based on your hypotheses, here are the riskiest assumptions:

1. **[Hypothesis 1 risk]** — e.g., "Users will trust one-tap checkout without seeing itemized charges"
2. **[Hypothesis 2 risk]** — e.g., "Self-service onboarding will reduce setup time to <3 days"
3. **[Hypothesis 3 risk]** — e.g., "AI recommendations will increase average order value by 50%"

**Which is the riskiest right now?**

**Options:**
1. **Risk 1** — [Select and explain why]
2. **Risk 2** — [Select and explain why]
3. **Risk 3** — [Select and explain why]
4. **I'm not sure which is riskiest** — [Agent helps prioritize: Which assumption, if wrong, would kill the initiative?]

**User response:** [Selection]

**Agent records:** This is the assumption we'll test first.

---

### Question 8: What's the Least Amount of Work We Need to Do to Learn the Next Most Important Thing? (Box 8)

**Agent asks:**

Design an experiment to validate or invalidate the riskiest assumption (from Box 7) **as fast as you can**.

**Examples of experiment types:**
- **Customer interviews** — 5-10 interviews to test value hypothesis
- **Landing page** — Fake door test to measure interest
- **Concierge / manual prototype** — High-touch, manual version before automating
- **Wizard-of-Oz** — Pretend the feature exists (humans behind the scenes)
- **Smoke test** — Announce the feature, measure signups

**Reminder:** Experiment design is an art. The canvas nudges you to do it—expect to iterate on the experiment design separately.

**Agent offers:**

Based on your riskiest assumption, here are experiment options:

1. **Customer Interviews** — Talk to 10 users, ask if they'd use [solution], observe their current workaround
2. **Landing Page Test** — Create a landing page describing [solution], measure signup rate
3. **Concierge Test** — Manually deliver [benefit] to 5 users, observe if they achieve [outcome]
4. **Wizard-of-Oz Prototype** — Fake [solution] with humans behind the scenes, see if users complete the workflow
5. **Design a custom experiment** — [Describe your experiment]

**Which experiment will you run?**

**User response:** [Select one or describe custom experiment]

**Agent validates:** Is this the **smallest test** that can validate/invalidate the assumption? (If it takes >2 weeks, it's too big—break it down.)

---

### Step 9: Review and Export Canvas

**Agent summarizes:**

Here's your completed Lean UX Canvas (v2):

```
┌─────────────────────────────────────────────────────────────┐
│ Lean UX Canvas (v2)                                         │
│ Initiative: [Title]                                         │
│ Date: [Today's date]                                        │
│ Iteration: 1                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────┬──────────────┬───────────────────────┐
│ 1. Business Problem │              │ 2. Business Outcomes  │
│ [Your input]        │              │ [Your input]          │
│                     │              │                       │
├─────────────────────┤ 5. Solutions ├───────────────────────┤
│ 3. Users            │              │ 4. User Outcomes      │
│ [Your input]        │ [Your input] │    & Benefits         │
│                     │              │ [Your input]          │
├─────────────────────┤──────────────┼───────────────────────┤
│ 6. Hypotheses       │ 7. Learn     │ 8. Experiments        │
│ [Your input]        │    First     │ [Your input]          │
│                     │ [Your input] │                       │
└─────────────────────┴──────────────┴───────────────────────┘
```

**Next steps:**
1. **Run the experiment (Box 8)** — Set a timeline (e.g., 2 weeks)
2. **Document learnings** — What did you learn? Was the assumption validated or invalidated?
3. **Update the canvas** — Revise hypotheses based on learnings, choose next riskiest assumption
4. **Iterate** — Repeat Box 7 → Box 8 until confidence is high enough to build

**Agent asks:**

Would you like me to:
1. **Export this canvas** as a Markdown file?
2. **Suggest related skills** to use next (e.g., `skills/discovery-interview-prep/SKILL.md` for customer interviews)?
3. **Refine a specific box** (if something feels incomplete)?

---

## Examples

See `examples/sample.md` for full Lean UX Canvas examples.

Mini example excerpt:

```markdown
**Box 1:** Mobile checkout conversion is 15% lower than desktop
**Box 2:** Increase mobile conversion from 45% to 60%
**Box 8:** Wizard-of-Oz test with one-tap checkout
```

## Common Pitfalls

### 1. **Starting with Solutions, Not Problems**
**Failure Mode:** Box 1 says "We need to build X" instead of describing what changed.

**Consequence:** You build the solution someone already decided on, without validating the problem exists.

**Fix:** Ask: "What changed in the world? Why is this a problem now (vs. 6 months ago)?"

---

### 2. **Vague Business Outcomes**
**Failure Mode:** Box 2 says "Increase revenue" or "Make users happy."

**Consequence:** No way to measure success; can't tell if experiments worked.

**Fix:** Define measurable behavior change. "Increase average order value from $50 to $75" or "Reduce support tickets by 30%."

---

### 3. **Too-Broad User Segments**
**Failure Mode:** Box 3 says "All users" or "Everyone."

**Consequence:** Can't design targeted experiments; waste time on personas who won't adopt.

**Fix:** Pick one persona to start. You can expand later.

---

### 4. **Confusing Box 2 and Box 4**
**Failure Mode:** Putting emotions in Box 2 and metrics in Box 4 (or vice versa).

**Consequence:** Misaligned hypotheses; unclear success criteria.

**Fix:** **Box 2 = Behavior change (metrics).** **Box 4 = Goals, benefits, emotions (empathy).**

---

### 5. **Only One Solution in Box 5**
**Failure Mode:** Listing one feature because stakeholders already decided.

**Consequence:** No exploration of alternatives; can't test which solution is best.

**Fix:** Force yourself to list 3+ solutions. Ask: "What else could solve this problem?"

---

### 6. **Skipping Experiments (Box 8)**
**Failure Mode:** "We'll just build it and see what happens."

**Consequence:** Waste weeks/months building the wrong thing.

**Fix:** Design smallest experiment first. If you can't think of one, use `skills/pol-probe-advisor/SKILL.md` to choose a validation method.

---

## References

### Related Skills
- **[problem-statement](skills/problem-statement/SKILL.md)** (Component) — Frame problem before filling Box 1
- **[problem-framing-canvas](skills/problem-framing-canvas/SKILL.md)** (Interactive) — MITRE Problem Framing before canvas
- **[proto-persona](skills/proto-persona/SKILL.md)** (Component) — Create personas for Box 3
- **[jobs-to-be-done](skills/jobs-to-be-done/SKILL.md)** (Component) — Identify user benefits for Box 4
- **[epic-hypothesis](skills/epic-hypothesis/SKILL.md)** (Component) — Write testable hypotheses (Box 6)
- **[discovery-interview-prep](skills/discovery-interview-prep/SKILL.md)** (Interactive) — Design customer interviews for Box 8
- **[pol-probe-advisor](skills/pol-probe-advisor/SKILL.md)** (Interactive) — Choose experiment type for Box 8

### External Frameworks
- **Jeff Gothelf** — *Lean UX: Designing Great Products with Agile Teams* (O'Reilly, 2013; 2nd ed. 2016)
- **Jeff Gothelf** — [Lean UX Canvas v2](https://jeffgothelf.com/blog/leanuxcanvas-v2/) (official blog post)
- **Lean UX Canvas PDF** — [Download v2 PDF](https://static1.squarespace.com/static/5e0238b6bf487105fe3309e1/t/5e1016e061066d7f81f2d8fa/1578112737021/LeanUX_canvas_v5.pdf)

### Tools
- **Miro / Mural** — Digital whiteboard for collaborative canvas filling
- **Google Slides / PowerPoint** — Template available from Jeff Gothelf's site
- **Notion / Coda** — Database view for tracking multiple canvases
