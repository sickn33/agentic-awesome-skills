---
name: problem-statement
description: Write a user-centered problem statement with who is blocked, what they are trying to do, why it matters, and how it feels. Use when framing discovery, prioritization, or a PRD.
risk: safe
source: community
---


## Purpose
Articulate a problem from the user's perspective using an empathy-driven framework that captures who they are, what they're trying to do, what's blocking them, why, and how it makes them feel. Use this to align stakeholders on the problem before jumping to solutions, and to frame product work around user outcomes rather than feature requests.

This is not a requirements doc—it's a human-centered problem narrative that ensures you're solving a problem worth solving.

## Key Concepts

### The Problem Framing Framework
Based on Jobs-to-be-Done and empathy mapping, the framework structures problems as:

**Problem Framing Narrative:**
- **I am:** [Describe the persona experiencing the problem]
- **Trying to:** [Desired outcomes the persona cares about]
- **But:** [Barriers preventing the outcomes]
- **Because:** [Root cause of the problem]
- **Which makes me feel:** [Emotional impact]

**Context & Constraints:**
- [Geographic, technological, time-based, demographic factors]

**Final Problem Statement:**
- [Single, concise, empathetic summary]

### Why This Structure Works
- **Persona-centric:** Forces you to see the problem through the user's eyes
- **Outcome-focused:** "Trying to" emphasizes desired results, not tasks
- **Root cause analysis:** "Because" pushes past symptoms to underlying issues
- **Emotional validation:** "Makes me feel" humanizes the problem and builds empathy
- **Contextual:** Constraints acknowledge real-world limitations

### Anti-Patterns (What This Is NOT)
- **Not a solution in disguise:** "The problem is we lack AI-powered analytics" = sneaking in a solution
- **Not a business problem:** "Our revenue is down" isn't a user problem (it's a symptom)
- **Not a feature request:** "Users need a dashboard" isn't a problem (what are they trying to do?)
- **Not generic:** "Users want better UX" is too vague to be actionable

## When to Use
- Kicking off discovery or problem validation work
- Aligning stakeholders before solutioning
- Socializing a problem with engineering, design, or exec teams
- When you have feature requests but unclear underlying problems
- Pitching why a problem is worth solving

### When NOT to Use This
- When you haven't done any user research yet (don't guess—interview first)
- For internal operational problems (this is for user-facing problems)
- As a substitute for a PRD (this frames the problem; PRD defines the solution)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Gather User Context
Before drafting, ensure you have:
- **User interviews or research:** Direct quotes, observed behaviors, pain points
- **Jobs-to-be-Done insights:** What users are "hiring" your product to do (reference `skills/jobs-to-be-done/SKILL.md`)
- **Persona clarity:** Who specifically experiences this problem (reference `skills/proto-persona/SKILL.md`)
- **Constraints data:** Geographic, tech, time, demographic limitations

**If missing context:** Run discovery interviews, contextual inquiries, or user shadowing. Don't fabricate problems.

---

### Step 2: Draft the Problem Framing Narrative

Fill in the template from the persona's point of view:

```markdown
## Problem Framing Narrative

**I am:** [Describe the key persona, highlighting 3-4 key characteristics]
- [Key pain point or characteristic 1]
- [Key pain point or characteristic 2]
- [Key pain point or characteristic 3]

**Trying to:**
- [Single sentence listing the desired outcomes the persona cares most about]

**But:**
- [Describe the barriers preventing the persona from achieving outcomes]
- [Job-to-be-done or outcome obstruction 1]
- [Job-to-be-done or outcome obstruction 2]
- [Job-to-be-done or outcome obstruction 3]

**Because:**
- [Describe the root cause empathetically]

**Which makes me feel:**
- [Describe the emotions from the persona's perspective]
```

**Quality checks:**
- **"I am" specificity:** Can you picture this person? Or is it generic ("busy professionals")?
- **"Trying to" clarity:** Is this an outcome (measurable) or a task (activity)?
- **"But" depth:** Are these real barriers or just inconveniences?
- **"Because" honesty:** Is this the root cause or just a symptom?
- **"Makes me feel" authenticity:** Do these emotions come from research or assumptions?

---

### Step 3: Document Context & Constraints

```markdown
## Context & Constraints

- [Enumerate geographic, technological, time-based, or demographic factors]
- [e.g., "Must work offline in rural areas with limited connectivity"]
- [e.g., "Used by non-technical users unfamiliar with complex software"]
- [e.g., "Time-sensitive: decisions must be made within 24 hours"]
```

**Quality checks:**
- **Relevance:** Do these constraints directly impact the problem?
- **Specificity:** Are they concrete enough to inform design decisions?

---

### Step 4: Craft the Final Problem Statement

Synthesize the narrative into one powerful sentence:

```markdown
## Final Problem Statement

[Single, concise statement that provides a powerful and empathetic summary]
```

**Formula:** `[Persona] needs a way to [desired outcome] because [root cause], which currently [emotional/practical impact].`

**Example:** "Enterprise IT admins need a way to provision user accounts in under 5 minutes because current processes take 2+ hours with manual approvals, which causes project delays and frustrated end-users."

**Quality checks:**
- **One sentence:** If it requires multiple sentences, the problem isn't crisp yet
- **Measurable:** Can you tell if you've solved it?
- **Empathetic:** Does it resonate emotionally?
- **Shareable:** Could you say this in a meeting and have stakeholders nod?

---

### Step 5: Validate and Socialize

- **Test with users:** Read it aloud to people who experience the problem. Do they say "Yes, exactly!"?
- **Share with stakeholders:** Product, engineering, design, exec. Does it align everyone?
- **Iterate based on feedback:** If anyone says "I don't think that's the real problem," dig deeper.

---

## Examples

See `examples/sample.md` for full examples (good and bad problem statements).

Mini example excerpt:

```markdown
**I am:** A software developer on a distributed team
**Trying to:** Communicate in real-time with my team without losing context
**But:** Email is too slow and IM is ephemeral
**Because:** No tool combines real-time chat with searchable history
**Which makes me feel:** Frustrated and disconnected
```

---

## Common Pitfalls

### Pitfall 1: Solution Smuggling
**Symptom:** "The problem is we don't have [specific feature]"

**Consequence:** You've predetermined the solution without validating the problem.

**Fix:** Reframe around the user's desired outcome, not the feature. Ask "What are they trying to achieve?"

---

### Pitfall 2: Business Problem Disguised as User Problem
**Symptom:** "Users want to increase our revenue" or "The problem is our churn rate"

**Consequence:** These are company problems, not user problems. Users don't care about your metrics.

**Fix:** Dig into *why* users churn or *what* would make them spend more. Frame it from their perspective.

---

### Pitfall 3: Generic Personas
**Symptom:** "I am a busy professional trying to be more productive"

**Consequence:** Too broad to be actionable. Every product claims to help "busy professionals."

**Fix:** Get specific. "I am a sales rep managing 50+ leads manually in spreadsheets, trying to prioritize follow-ups without missing high-value opportunities."

---

### Pitfall 4: Symptom Instead of Root Cause
**Symptom:** "Because the UI is confusing"

**Consequence:** You're describing a symptom, not the underlying issue.

**Fix:** Ask "Why is the UI confusing?" Keep asking "why" until you hit the root cause (e.g., "Because users have no mental model for how the system works").

---

### Pitfall 5: Fabricated Emotions
**Symptom:** "Which makes me feel empowered and delighted"

**Consequence:** These sound like marketing copy, not real user emotions.

**Fix:** Use actual quotes from user interviews. Real emotions: "frustrated," "overwhelmed," "anxious," "stuck."

---

## References

### Related Skills
- `skills/jobs-to-be-done/SKILL.md` — Informs the "Trying to" and "But" sections
- `skills/proto-persona/SKILL.md` — Defines the "I am" persona
- `skills/positioning-statement/SKILL.md` — Problem statement informs positioning
- `skills/user-story/SKILL.md` — Problem statement guides story prioritization

### External Frameworks
- Clayton Christensen, *Jobs to Be Done* — Origin of outcome-focused problem framing
- Osterwalder & Pigneur, *Value Proposition Canvas* — Customer pains/gains/jobs
- Dave Gray, *Empathy Mapping* — Emotional framing techniques

### Dean's Work
- [Link to relevant Dean Peters' Substack articles if applicable]

### Provenance
- Adapted from `prompts/framing-the-problem-statement.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `problem-statement.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/jobs-to-be-done/SKILL.md`, `skills/proto-persona/SKILL.md`
