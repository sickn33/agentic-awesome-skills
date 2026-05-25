---
name: jobs-to-be-done
description: Uncover customer jobs, pains, and gains in a structured JTBD format. Use when clarifying unmet needs, repositioning a product, or improving discovery and messaging.
risk: safe
source: community
---


## Purpose
Systematically explore what customers are trying to accomplish (functional, social, emotional jobs), the pains they experience, and the gains they seek. Use this framework to uncover unmet needs, validate product ideas, and ensure your solution addresses real motivations—not just surface-level feature requests.

This is not a survey—it's a structured lens for understanding *why* customers "hire" your product and what would make them "fire" it.

## Key Concepts

### The Jobs-to-be-Done Framework
Influenced by Clayton Christensen and the Value Proposition Canvas (Osterwalder), JTBD breaks customer needs into three categories:

**1. Customer Jobs:**
- **Functional jobs:** Tasks customers need to perform (e.g., "send an invoice")
- **Social jobs:** How customers want to be perceived (e.g., "look professional to clients")
- **Emotional jobs:** Emotional states customers seek or avoid (e.g., "feel confident in my work")

**2. Pains:**
- **Challenges:** Obstacles customers face
- **Costliness:** What's too expensive in time, money, or effort
- **Common mistakes:** Errors customers make that could be prevented
- **Unresolved problems:** Gaps in current solutions

**3. Gains:**
- **Expectations:** What would exceed current solutions
- **Savings:** Time, money, or effort reductions that delight
- **Adoption factors:** What increases likelihood of switching
- **Life improvement:** How a solution makes life easier or more enjoyable

### Why This Structure Works
- **Separates job from solution:** "Communicate with my team" (job) ≠ "email" (solution)
- **Reveals underlying motivations:** Functional job may be "track expenses," but emotional job is "feel in control of finances"
- **Surfaces competition you didn't see:** Customers "hire" non-obvious alternatives (pen and paper, spreadsheets, workarounds)
- **Prioritizes by intensity:** Not all pains are equal—focus on the most acute

### Anti-Patterns (What This Is NOT)
- **Not a feature wishlist:** "I want AI, automation, and dashboards" is not a job
- **Not demographics:** "Millennials want mobile-first" is a persona trait, not a job
- **Not generic:** "Be more productive" is too vague—dig into *which* tasks and *why*
- **Not one-dimensional:** Focusing only on functional jobs misses social/emotional motivations

## When to Use
- Early-stage discovery (before you know the solution)
- Validating product-market fit (does your solution address the right jobs?)
- Prioritizing roadmap (which jobs are most painful/important?)
- Competitive analysis (what are customers "hiring" competitors for?)
- Marketing messaging (speak to jobs, not features)

### When NOT to Use This
- After you've already built the product (too late for discovery)
- For trivial features (don't over-analyze small tweaks)
- As a substitute for quantitative validation (JTBD informs hypotheses; data validates them)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Define the Context
Before exploring JTBD, clarify:
- **Target customer segment:** Who are you studying? (reference `skills/proto-persona/SKILL.md`)
- **Situation:** In what context does the job arise? (e.g., "When managing a project deadline...")
- **Current solutions:** What do they use today? (competitors, workarounds, doing nothing)

**If missing context:** Conduct customer interviews, contextual inquiries, or "switch interviews" (why they switched from a previous solution).

---

### Step 2: Explore Customer Jobs

#### Functional Jobs
Ask: "What tasks are you trying to complete?"

```markdown
### Functional Jobs:
- [Task 1 customer needs to perform]
- [Task 2 customer needs to perform]
- [Task 3 customer needs to perform]
```

**Examples:**
- "Reconcile monthly expenses for tax filing"
- "Onboard a new team member in under 2 hours"
- "Deploy code to production without downtime"

**Quality checks:**
- **Verb-driven:** Jobs are actions ("send," "analyze," "coordinate")
- **Solution-agnostic:** Don't say "use email to communicate"—say "communicate with remote teammates"
- **Specific:** "Manage finances" is too broad; "Track business expenses for tax deductions" is specific

---

#### Social Jobs
Ask: "How do you want to be perceived by others?"

```markdown
### Social Jobs:
- [Way customer wants to be perceived socially 1]
- [Way customer wants to be perceived socially 2]
- [Way customer wants to be perceived socially 3]
```

**Examples:**
- "Be seen as a strategic thinker by my exec team"
- "Appear responsive and reliable to clients"
- "Look tech-savvy to my younger colleagues"

**Quality checks:**
- **Audience-specific:** Who is the customer trying to impress? (boss, clients, peers, etc.)
- **Emotional weight:** Social jobs often drive adoption more than functional jobs

---

#### Emotional Jobs
Ask: "What emotional state do you want to achieve or avoid?"

```markdown
### Emotional Jobs:
- [Emotional state customer seeks or avoids 1]
- [Emotional state customer seeks or avoids 2]
- [Emotional state customer seeks or avoids 3]
```

**Examples:**
- "Feel confident I'm not missing important details"
- "Avoid the anxiety of manual data entry errors"
- "Feel a sense of accomplishment at the end of the day"

**Quality checks:**
- **Positive and negative:** Include both what they seek ("feel in control") and what they avoid ("avoid embarrassment")
- **Rooted in research:** Don't fabricate emotions—use customer quotes

---

### Step 3: Identify Pains

#### Challenges
Ask: "What obstacles are preventing you from completing this job?"

```markdown
### Challenges:
- [Obstacle customer faces 1]
- [Obstacle customer faces 2]
- [Obstacle customer faces 3]
```

**Examples:**
- "Tools don't integrate, forcing manual data entry"
- "No visibility into what teammates are working on"
- "Approval processes take 3+ days, blocking progress"

---

#### Costliness
Ask: "What takes too much time, money, or effort?"

```markdown
### Costliness:
- [What's too costly in time, money, or effort 1]
- [What's too costly in time, money, or effort 2]
```

**Examples:**
- "Generating monthly reports takes 8 hours of manual work"
- "Hiring a specialist costs $10k, which we can't afford"
- "Learning the current tool requires 20+ hours of training"

---

#### Common Mistakes
Ask: "What errors do you make frequently that could be prevented?"

```markdown
### Common Mistakes:
- [Frequent error 1]
- [Frequent error 2]
```

**Examples:**
- "Forgetting to CC stakeholders on critical emails"
- "Miscalculating tax deductions due to missing receipts"
- "Accidentally overwriting someone else's work in shared files"

---

#### Unresolved Problems
Ask: "What problems do current solutions fail to address?"

```markdown
### Unresolved Problems:
- [Problem not solved by current solutions 1]
- [Problem not solved by current solutions 2]
```

**Examples:**
- "Current CRM doesn't track customer health scores"
- "Email doesn't preserve conversation context when people are added mid-thread"
- "Existing tools require technical expertise we don't have"

---

### Step 4: Uncover Gains

#### Expectations
Ask: "What would make you love a solution?"

```markdown
### Expectations:
- [What could exceed expectations 1]
- [What could exceed expectations 2]
```

**Examples:**
- "Automatically categorizes expenses without manual tagging"
- "Suggests next steps based on project status"
- "Integrates seamlessly with tools we already use"

---

#### Savings
Ask: "What savings in time, money, or effort would delight you?"

```markdown
### Savings:
- [Way of saving time, money, or effort 1]
- [Way of saving time, money, or effort 2]
```

**Examples:**
- "Reduce report generation from 8 hours to 10 minutes"
- "Eliminate the need for a full-time admin"
- "Cut onboarding time from 2 weeks to 2 days"

---

#### Adoption Factors
Ask: "What would make you switch from your current solution?"

```markdown
### Adoption Factors:
- [Factor increasing likelihood of adoption 1]
- [Factor increasing likelihood of adoption 2]
```

**Examples:**
- "Free trial with no credit card required"
- "Migration support to import existing data"
- "Testimonials from companies like ours"

---

#### Life Improvement
Ask: "How would your life be better if this job were easier?"

```markdown
### Life Improvement:
- [How solution makes life easier or more enjoyable 1]
- [How solution makes life easier or more enjoyable 2]
```

**Examples:**
- "I could leave work on time instead of staying late to finish reports"
- "I'd feel less stressed about missing important deadlines"
- "I could focus on strategic work instead of busywork"

---

### Step 5: Prioritize and Validate

- **Rank pains by intensity:** Which pains are acute vs. mild annoyances?
- **Identify must-have vs. nice-to-have gains:** What would drive adoption vs. what's just a bonus?
- **Cross-reference with personas:** Do different personas have different jobs/pains/gains? (reference `skills/proto-persona/SKILL.md`)
- **Validate with data:** Survey a broader audience to confirm JTBD insights from interviews

---

## Examples

See `examples/sample.md` for full JTBD examples.

Mini example excerpt:

```markdown
**Functional Jobs:** Coordinate tasks across a distributed team
**Pains - Challenges:** Team members use different tools, creating silos
**Gains - Savings:** Reduce status reporting time from 3 hours to 15 minutes
```

---

## Common Pitfalls

### Pitfall 1: Confusing Jobs with Solutions
**Symptom:** "I need to use Slack" or "I need AI-powered analytics"

**Consequence:** You've anchored on a solution, not the underlying job.

**Fix:** Ask "Why?" 5 times. "I need Slack" → "Why?" → "To communicate with my team" → "Why?" → "To get quick answers" → "Why?" → "To avoid project delays."

---

### Pitfall 2: Generic Jobs
**Symptom:** "Be more productive" or "Save time"

**Consequence:** Too vague to inform product decisions.

**Fix:** Get specific. "Save time" → "Reduce time spent generating monthly reports from 8 hours to 1 hour."

---

### Pitfall 3: Ignoring Social/Emotional Jobs
**Symptom:** Only documenting functional jobs

**Consequence:** You miss powerful motivators. People often buy based on emotional/social needs, not just functional.

**Fix:** Explicitly ask about perception and emotions in interviews. "How would solving this make you feel?" "Who would notice if you solved this?"

---

### Pitfall 4: Fabricating JTBD Without Research
**Symptom:** Filling out the template based on assumptions

**Consequence:** You're guessing. JTBD analysis is only valuable if grounded in real customer insights.

**Fix:** Conduct "switch interviews" (ask why they switched from a previous solution), contextual inquiries, or problem validation interviews.

---

### Pitfall 5: Treating All Pains as Equal
**Symptom:** Listing 20 pains without prioritization

**Consequence:** No clarity on what to solve first.

**Fix:** Rank pains by intensity (acute vs. mild). Ask "If we only solved one pain, which would have the biggest impact?"

---

## References

### Related Skills
- `skills/proto-persona/SKILL.md` — Defines who has these jobs/pains/gains
- `skills/problem-statement/SKILL.md` — JTBD informs the "Trying to" and "But" sections
- `skills/positioning-statement/SKILL.md` — JTBD informs the "that need" statement

### External Frameworks
- Clayton Christensen, *Competing Against Luck* (2016) — Origin of Jobs-to-be-Done theory
- Tony Ulwick, *Outcome-Driven Innovation* (2016) — Quantifying jobs and outcomes
- Alexander Osterwalder, *Value Proposition Canvas* (2014) — Customer jobs/pains/gains framework

### Dean's Work
- [Link to relevant Dean Peters' Substack articles if applicable]

### Provenance
- Adapted from `prompts/jobs-to-be-done.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `jobs-to-be-done.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/proto-persona/SKILL.md`
**Used by:** `skills/positioning-statement/SKILL.md`, `skills/problem-statement/SKILL.md`, `skills/epic-hypothesis/SKILL.md`
