---
name: pm-ai-pol-probe-advisor
description: Select the right Proof of Life (PoL) probe based on hypothesis, risk, and resources. Use this to match the validation method to the real learning goal, not tooling comfort.
risk: safe
source: community
---

## Purpose

Guide product managers through selecting the right **Proof of Life (PoL) probe** type (of 5 flavors) based on their hypothesis, risk, and available resources. Use this when you need to eliminate a specific risk or test a narrow hypothesis, but aren't sure which validation method to use. This interactive skill ensures you match the cheapest prototype to the harshest truth—not the prototype you're most comfortable building.

This is **not** a tool for deciding *if* you should validate (you should). It's a decision framework for choosing *how* to validate most effectively.

## Key Concepts

### The Core Problem: Method-Hypothesis Mismatch

**Common failure mode:** PMs choose validation methods based on tooling comfort ("I know Figma, so I'll design a prototype") rather than learning goal. Result: validate the wrong thing, miss the actual risk.

**Solution:** Work backwards from the hypothesis. Ask: "What specific risk am I eliminating? What's the cheapest path to harsh truth?"

---

### The 5 PoL Probe Flavors (Quick Reference)

| Type | Core Question | Best For | Timeline |
|------|---------------|----------|----------|
| **Feasibility Check** | "Can we build this?" | Technical unknowns, API dependencies, data integrity | 1-2 days |
| **Task-Focused Test** | "Can users complete this job without friction?" | Critical UI moments, field labels, decision points | 2-5 days |
| **Narrative Prototype** | "Does this workflow earn stakeholder buy-in?" | Storytelling, explaining complex flows, alignment | 1-3 days |
| **Synthetic Data Simulation** | "Can we model this without production risk?" | Edge cases, unknown-unknowns, statistical modeling | 2-4 days |
| **Vibe-Coded PoL Probe** | "Will this solution survive real user contact?" | Workflow/UX validation with real interactions | 2-3 days |

**Golden Rule:** *"Use the cheapest prototype that tells the harshest truth."*

---

### Anti-Patterns (What This Is NOT)

- **Not "build the prototype you're comfortable with":** Match method to hypothesis, not skillset
- **Not "pick based on stakeholder preference":** Optimize for learning, not internal politics
- **Not "choose the most impressive option":** Impressive ≠ informative
- **Not "default to code":** Writing code should be your last resort, not your first

---

## When to Use Skill

✅ **Use this when:**
- You have a clear hypothesis but don't know which validation method to use
- You're unsure whether to build code, create a video, or run a simulation
- You need to eliminate a specific risk quickly (within days)
- You want to avoid prototype theater

❌ **Don't use this when:**
- You don't have a hypothesis yet (use `problem-statement.md` or `problem-framing-canvas.md` first)
- You're trying to impress executives (that's not validation)
- You already know the answer (confirmation bias)
- You need to ship an MVP (this is for pre-MVP reconnaissance)

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

This interactive skill uses **adaptive questioning** to recommend the right PoL probe type based on your context.

---

### Step 0: Gather Context

**Agent asks:**

Let's figure out which PoL probe type is right for your validation needs. First, I need some context:

**1. What hypothesis are you testing?**
(Describe in one sentence, or use "If [we do X] for [persona], then [outcome]" format)

**2. What specific risk are you trying to eliminate?**
Examples:
- Technical feasibility ("Can our API handle real-time data?")
- User task completion ("Can users find the 'export' button?")
- Stakeholder alignment ("Will leadership approve this direction?")
- Edge case behavior ("How does the system handle duplicate entries?")
- Workflow validation ("Will users complete the 3-step onboarding?")

**3. What's your timeline?**
- Hours (same-day validation)
- 1-2 days (quick spike)
- 3-5 days (moderate effort)
- 1 week+ (too long—consider breaking into smaller probes)

**4. What resources do you have available?**
Examples:
- Engineering capacity (1 dev for 1 day)
- Design tools (Figma, Loom, Sora)
- AI/no-code tools (ChatGPT Canvas, Replit, Airtable)
- User access (10 users from waitlist, 5 beta customers, etc.)
- Budget (for UsabilityHub, Optimal Workshop, etc.)

---

### Step 1: Identify the Core Question

**Agent synthesizes user input and asks:**

Based on your hypothesis and risk, which of these core questions are you really trying to answer?

**Offer 5 options (aligned to probe types):**

1. **"Can we build this?"** — You're uncertain about technical feasibility, API integration, data availability, or third-party dependencies
2. **"Can users complete this job without friction?"** — You're validating critical UI moments, field labels, navigation, or decision points
3. **"Does this workflow earn stakeholder buy-in?"** — You need to explain a complex flow, align leadership, or "tell vs. test" the story
4. **"Can we model this without production risk?"** — You need to explore edge cases, simulate user behavior, or test prompt logic safely
5. **"Will this solution survive real user contact?"** — You need users to interact with a semi-functional workflow to catch UX/workflow issues

**User response:** [Select one number, or describe if none fit]

---

### Step 2: Recommend PoL Probe Type

**Based on user selection, agent recommends the matching probe type:**

---

#### Option 1 Selected: "Can we build this?"
→ **Recommended Probe: Feasibility Check**

**What it is:**
A 1-2 day spike-and-delete test to surface technical risk. Not meant to impress anyone—meant to reveal blockers fast.

**Methods:**
- GenAI prompt chains (test if AI can handle your use case)
- API sniff tests (verify third-party integrations work)
- Data integrity sweeps (check if your data supports the feature)
- Third-party tool evaluation (test if Zapier/Stripe/Twilio does what you think)

**Timeline:** 1-2 days

**Tools:**
- ChatGPT/Claude (prompt testing)
- Postman/Insomnia (API testing)
- Jupyter notebooks (data exploration)
- Proof-of-concept scripts (throwaway code)

**Success Criteria Example:**
- **Pass:** API returns expected data format in <200ms
- **Fail:** API times out, or data structure incompatible with our schema
- **Learn:** Identify specific technical blocker

**Disposal Plan:** Delete all spike code after documenting findings.

**Next Step:** Would you like me to generate a `pol-probe` artifact documenting this feasibility check?

---

#### Option 2 Selected: "Can users complete this job without friction?"
→ **Recommended Probe: Task-Focused Test**

**What it is:**
Validate critical moments—field labels, decision points, navigation, drop-off zones—using specialized testing tools. Focus on **observable task completion**, not opinions.

**Methods:**
- Optimal Workshop (tree testing, card sorting)
- UsabilityHub (5-second tests, click tests, preference tests)
- Maze (prototype testing with heatmaps)
- Loom-recorded task walkthroughs (ask users to "think aloud")

**Timeline:** 2-5 days

**Tools:**
- Optimal Workshop ($200/month)
- UsabilityHub ($100-300/month)
- Maze (free tier available)
- Loom (free for basic)

**Success Criteria Example:**
- **Pass:** 80%+ users complete task in <2 minutes
- **Fail:** <60% completion, or 3+ users get stuck on same step
- **Learn:** Identify exact friction point (specific field, button, etc.)

**Disposal Plan:** Archive session recordings, document learnings, delete test prototype.

**Next Step:** Would you like me to generate a `pol-probe` artifact documenting this task-focused test?

---

#### Option 3 Selected: "Does this workflow earn stakeholder buy-in?"
→ **Recommended Probe: Narrative Prototype**

**What it is:**
Tell the story, don't test the interface. Use video walkthroughs or slideware storyboards to explain workflows and measure interest. This is "tell vs. test"—you're validating the narrative, not the UI.

**Methods:**
- Loom walkthroughs (screen recording with voiceover)
- Sora/Synthesia/Veo3 (AI-generated explainer videos)
- Slideware storyboards (PowerPoint/Keynote with illustrations)
- Storyboard sketches (use `storyboard.md` component skill)

**Timeline:** 1-3 days

**Tools:**
- Loom (free, fast)
- Sora/Synthesia (text-to-video, paid)
- PowerPoint/Keynote (slideware animation)
- Figma (static storyboard frames)

**Success Criteria Example:**
- **Pass:** 8/10 stakeholders say "I'd use this" or "This solves the problem"
- **Fail:** Stakeholders ask "Why would I use this?" or suggest alternative approaches
- **Learn:** Identify which part of the narrative resonates (or doesn't)

**Disposal Plan:** Archive video, document feedback, delete supporting files.

**Next Step:** Would you like me to generate a `pol-probe` artifact documenting this narrative prototype?

---

#### Option 4 Selected: "Can we model this without production risk?"
→ **Recommended Probe: Synthetic Data Simulation**

**What it is:**
Use simulated users, synthetic data, or prompt logic testing to explore edge cases and unknown-unknowns without touching production. Think "wind tunnel testing, cheaper than postmortem."

**Methods:**
- Synthea (synthetic patient data generation)
- DataStax LangFlow (test prompt logic without real users)
- Monte Carlo simulations (model probabilistic outcomes)
- Synthetic user behavior scripts (simulate click patterns, load testing)

**Timeline:** 2-4 days

**Tools:**
- Synthea (open-source, healthcare)
- DataStax LangFlow (prompt chain testing)
- Python + Faker library (generate synthetic data)
- Locust/k6 (load testing with synthetic users)

**Success Criteria Example:**
- **Pass:** System handles 10,000 synthetic users with <1% error rate
- **Fail:** Edge cases cause crashes or incorrect outputs
- **Learn:** Identify which edge cases break the system

**Disposal Plan:** Delete synthetic data, archive findings, document edge cases.

**Next Step:** Would you like me to generate a `pol-probe` artifact documenting this synthetic data simulation?

---

#### Option 5 Selected: "Will this solution survive real user contact?"
→ **Recommended Probe: Vibe-Coded PoL Probe**

**What it is:**
A Frankensoft stack (ChatGPT Canvas + Replit + Airtable) that creates just enough illusion for users to interact with a semi-functional workflow. Not production-grade—just enough to catch UX/workflow signals in 48 hours.

**⚠️ Warning:** This is the riskiest probe type. It looks real enough to confuse momentum with maturity. Use only when you need real user contact and other methods won't suffice.

**Methods:**
- ChatGPT Canvas (quick UI generation)
- Replit (host throwaway code)
- Airtable (fake database)
- Carrd/Webflow (landing page + workflow mockup)

**Timeline:** 2-3 days

**Stack Example:**
- ChatGPT Canvas: Generate form UI
- Replit: Host simple Flask/Node app
- Airtable: Capture form submissions
- Loom: Record user sessions for post-mortem analysis

**Success Criteria Example:**
- **Pass:** 8/10 users complete workflow, 0 critical confusion moments
- **Fail:** Users get stuck, ask "Is this broken?", or abandon mid-flow
- **Learn:** Identify exact step where users lose confidence

**Disposal Plan:** Delete all code after user sessions, archive Loom recordings, document learnings.

**Next Step:** Would you like me to generate a `pol-probe` artifact documenting this vibe-coded probe?

---

### Step 3: Apply Component Skill

**Agent offers:**

I recommend using **[selected probe type]** for your hypothesis. Would you like me to:

1. **Generate a complete `pol-probe` artifact** (using the `pol-probe.md` template) with your hypothesis, success criteria, timeline, and disposal plan?
2. **Walk through the execution steps** for this probe type (tools, methods, user recruitment)?
3. **Refine the hypothesis** before proceeding (if it seems too broad or ambiguous)?

**User selects option, and agent executes accordingly.**

---

### Step 4: Refine or Iterate (Optional)

**If user is uncertain or hypothesis is too broad:**

**Agent asks:**

Your hypothesis seems broad or tests multiple things at once. PoL probes work best when they're narrow and falsifiable. Let me ask a few clarifying questions:

**Clarifying Questions:**
1. **What's the smallest thing you could test first?** (Isolate one variable)
2. **What would "failure" look like?** (If you can't describe failure, you can't measure success)
3. **Is this testing user behavior, technical feasibility, or stakeholder alignment?** (Pick one focus)

**Agent then re-recommends probe type based on refined hypothesis.**

---

## Examples

### Example 1: Choosing Task-Focused Test

**User Context:**
- **Hypothesis:** "Users can complete our checkout flow in under 3 minutes"
- **Risk:** High cart abandonment on mobile
- **Timeline:** 3 days
- **Resources:** UsabilityHub account, 20 users from waitlist

**Agent Reasoning:**
- Core question: "Can users complete this job without friction?"
- Risk is task completion (observable behavior), not technical feasibility
- Timeline fits Task-Focused Test (2-5 days)

**Recommendation:** Task-Focused Test using UsabilityHub
- Method: Maze prototype testing with mobile users
- Success criteria: 80%+ complete checkout in <3 minutes
- Disposal: Delete prototype after analyzing heatmaps

---

### Example 2: Choosing Feasibility Check

**User Context:**
- **Hypothesis:** "We can auto-tag support tickets using GPT-4 with <5% error rate"
- **Risk:** Unknown if AI can handle industry-specific jargon
- **Timeline:** 1 day
- **Resources:** 100 past support tickets, ChatGPT API access

**Agent Reasoning:**
- Core question: "Can we build this?"
- Risk is technical feasibility (AI capability), not user behavior
- Timeline is short (1 day = spike territory)

**Recommendation:** Feasibility Check using prompt engineering spike
- Method: Run 100 tickets through GPT-4 prompt chain, measure error rate
- Success criteria: <5% misclassified tickets
- Disposal: Delete spike code after documenting findings

**Outcome:** Error rate was 18%. Decided NOT to build feature. Saved 6 weeks of development.

---

### Example 3: Choosing Narrative Prototype (NOT Vibe-Coded)

**User Context:**
- **Hypothesis:** "Enterprise buyers will understand our multi-tenant security model"
- **Risk:** Complex technical concept needs explanation
- **Timeline:** 2 days
- **Resources:** Loom, 5 enterprise prospects

**Agent Reasoning:**
- Core question: "Does this workflow earn stakeholder buy-in?"
- Risk is comprehension/alignment, not task completion
- Building a functional prototype would over-invest (2 days = just explain it)

**Recommendation:** Narrative Prototype using Loom walkthrough
- Method: 5-minute Loom explaining security model with diagrams
- Success criteria: 4/5 prospects say "I understand this" without follow-up questions
- Disposal: Archive video after 5 sessions

**Why NOT Vibe-Coded Probe:** You don't need users to interact with security settings—you need them to *understand* the concept. Narrative is cheaper and faster.

---

### Example 4: Avoiding Prototype Theater

**User Context:**
- **Hypothesis:** "Executives will approve budget if we show a polished demo"
- **Risk:** Internal politics
- **Timeline:** 3 weeks
- **Resources:** Full design team

**Agent Response:**

⚠️ **This is prototype theater, not a PoL probe.**

You're testing internal politics, not user behavior or technical feasibility. PoL probes eliminate product risk, not organizational risk.

**Recommendation:** Skip the prototype entirely. Instead:
1. Use a **Narrative Prototype** (1-day Loom walkthrough) to explain the concept
2. Test with **5 target users** (not executives) to validate the hypothesis
3. Present user feedback to executives, not a polished demo

If executives need a demo, build it *after* you've validated the hypothesis with real users.

---

## Common Pitfalls

### 1. **Choosing Based on Tooling Comfort**
**Failure Mode:** "I know Figma, so I'll design a UI prototype" (even if design isn't the risk).

**Consequence:** Validate the wrong thing; miss the actual risk.

**Fix:** Answer the core question *first*, then pick the method. If you need a Feasibility Check but only know design tools, pair with an engineer for 1 day.

---

### 2. **Defaulting to Code**
**Failure Mode:** "Let's just build it and see what happens."

**Consequence:** 2 weeks of development before learning you tested the wrong hypothesis.

**Fix:** Ask: "What's the cheapest prototype that tells the harshest truth?" Usually it's NOT code.

---

### 3. **Confusing Vibe-Coded Probes with MVPs**
**Failure Mode:** Vibe-Coded probe "looks real," so team treats it like production code.

**Consequence:** Scope creep, technical debt, resistance to disposal.

**Fix:** Set disposal date before building. Vibe-Coded probes are **Frankensoft by design**—celebrate the jank, delete after learning.

---

### 4. **Testing Multiple Things at Once**
**Failure Mode:** "Let's test the workflow, the pricing, and the UI in one probe."

**Consequence:** Ambiguous results—you won't know which variable caused failure.

**Fix:** One probe, one hypothesis. If you have 3 hypotheses, run 3 probes.

---

### 5. **Skipping Success Criteria**
**Failure Mode:** "We'll know it when we see it."

**Consequence:** No harsh truth—just opinions and vanity metrics.

**Fix:** Write success criteria *before* building. Define "pass," "fail," and "learn" thresholds.

---

## References

### Related Skills
- **[pol-probe](../pol-probe/SKILL.md)** (Component) — Template for documenting PoL probes
- **[problem-statement](../problem-statement/SKILL.md)** (Component) — Frame problem before choosing validation method
- **[problem-framing-canvas](../problem-framing-canvas/SKILL.md)** (Interactive) — MITRE Problem Framing before validation
- **[discovery-process](../discovery-process/SKILL.md)** (Workflow) — Use PoL probes in validation phase
- **[epic-hypothesis](../epic-hypothesis/SKILL.md)** (Component) — Turn epics into testable hypotheses

### External Frameworks
- **Jeff Patton** — *User Story Mapping* (lean validation principles)
- **Marty Cagan** — *Inspired* (2014 prototype flavors framework)
- **Dean Peters** — [*Vibe First, Validate Fast, Verify Fit*](https://deanpeters.substack.com/p/vibe-first-validate-fast-verify-fit) (Dean Peters' Substack, 2025)

### Tools by Probe Type
- **Feasibility:** ChatGPT/Claude, Postman, Jupyter
- **Task-Focused:** Optimal Workshop, UsabilityHub, Maze
- **Narrative:** Loom, Sora, Synthesia, PowerPoint
- **Synthetic Data:** Synthea, DataStax LangFlow, Faker
- **Vibe-Coded:** ChatGPT Canvas, Replit, Airtable, Carrd
