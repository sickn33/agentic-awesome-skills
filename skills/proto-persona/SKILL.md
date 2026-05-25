---
name: proto-persona
description: Create a proto-persona from current research, market signals, and team knowledge. Use when you need a working customer profile before deeper validation.
risk: safe
source: community
---


## Purpose
Create an initial, assumption-based persona profile that synthesizes available user research, market data, and stakeholder knowledge into a working hypothesis about your target user. Use this to align teams early in product development, guide initial design decisions, and identify gaps in understanding that require validation through research.

This is not a validated persona—it's a "proto" (prototype) persona that evolves as you learn more. Think of it as a structured placeholder that prevents design-by-committee while acknowledging you don't have all the answers yet.

## Key Concepts

### What is a Proto-Persona?
A proto-persona is a lightweight, hypothesis-driven persona created from:
- **Existing research:** User interviews, surveys, analytics (if available)
- **Market data:** Industry reports, competitor analysis, demographic trends
- **Stakeholder knowledge:** Sales, support, and team insights
- **Informed assumptions:** Best guesses that need validation

### Proto vs. Validated Persona
| Proto-Persona | Validated Persona |
|---------------|-------------------|
| Created in hours/days | Created over weeks/months |
| Based on assumptions + limited research | Based on extensive user research |
| Used to align teams early | Used to guide detailed design |
| Evolves rapidly | Stable over time |
| Good enough to start | High confidence |

### Why Use Proto-Personas?
- **Speed:** Align teams quickly without waiting for months of research
- **Focus:** Provides a shared reference point for "who we're building for"
- **Hypothesis framing:** Makes assumptions explicit, which can then be validated
- **Prevents generic design:** "Design for everyone" = design for no one

### Anti-Patterns (What This Is NOT)
- **Not validated research:** Don't treat it as fact—it's a hypothesis
- **Not a replacement for user research:** Use it to *guide* research, not avoid it
- **Not demographic data alone:** Age and location don't explain behavior
- **Not permanent:** Proto-personas should evolve as you learn

## When to Use
- Early-stage product development (before extensive user research)
- Kicking off a new feature or pivot
- Aligning stakeholders on target users
- Identifying research gaps (who do we need to interview?)

### When NOT to Use This
- After you've done extensive user research (create a validated persona instead)
- For mature products with known user segments (you should already have validated personas)
- As a substitute for quantitative data (proto-personas inform research; research validates them)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Gather Available Context
Before creating a proto-persona, collect:
- **User research:** Interview notes, survey results, support tickets
- **Analytics:** Usage data, demographics, behavioral patterns
- **Market data:** Industry reports, competitor user bases
- **Stakeholder insights:** Sales/support/CS teams who interact with users
- **Product context:** What problem are you solving? (reference `skills/problem-statement/SKILL.md`)

**If missing context:** Don't fabricate—note gaps and plan research to fill them.

---

### Step 2: Define the Persona's Identity

#### Name
Give the persona an **alliterative, memorable name** (makes it easier to reference).

```markdown
### Name
- [Alliterative name, e.g., "Manager Mike," "Startup Sarah," "Enterprise Emma"]
```

**Quality checks:**
- **Memorable:** Can the team recall it easily?
- **Not generic:** Avoid "User 1" or "Persona A"

---

#### Bio & Demographics
Describe who this person is in the real world.

```markdown
### Bio & Demographics
- [Age range]
- [Geographic location]
- [Social status (married, single, family, etc.)]
- [Online presence (active on LinkedIn, avoids social media, etc.)]
- [Leisure activities]
- [Career status (job title, industry, seniority)]
```

**Quality checks:**
- **Behavioral, not just demographic:** Don't stop at "30-40 years old, lives in SF"—add "Works remotely, active in Slack communities, juggles 3 side projects"
- **Context-relevant:** Only include demographics that influence product decisions

**Example:**
- "35-45 years old, lives in urban areas (NYC, SF, Austin)"
- "Director-level at mid-sized tech companies (50-500 employees)"
- "Active on LinkedIn and Twitter, attends 2-3 conferences per year"
- "Married with young kids, values work-life balance"
- "Plays rec sports on weekends, listens to business podcasts during commute"

---

### Step 3: Capture Their Voice

#### Quotes
Use real or representative quotes that reveal how they think and speak.

```markdown
### Quotes
- "[Quote 1 revealing what they say, feel, or think]"
- "[Quote 2 revealing frustrations or motivations]"
- "[Quote 3 revealing attitudes or beliefs]"
```

**Quality checks:**
- **Authentic:** Use real quotes from interviews/support tickets if available
- **Revealing:** Quotes should expose mindset, not just facts ("I need better tools" is weak; "I'm drowning in manual work and can't focus on strategy" is strong)

**Example:**
- "I spend 10 hours a week in status meetings that could be emails."
- "I'm tired of tools that promise automation but require a developer to set up."
- "My team expects me to have answers immediately, but I'm constantly searching for data."

---

### Step 4: Document Their Context

#### Pains
What problems or frustrations does this persona experience? (Reference `skills/jobs-to-be-done/SKILL.md` for structure.)

```markdown
### Pains
- [Pain point 1 related to the problem space]
- [Pain point 2 related to the problem space]
- [Pain point 3 related to the problem space]
```

**Quality checks:**
- **Specific:** "Frustrated with tools" is vague; "Spends 3 hours/week manually copying data between tools" is specific
- **Related to your product:** Focus on pains your product could address

---

#### What is This Person Trying to Accomplish?
What behaviors, actions, or outcomes are they pursuing?

```markdown
### What is This Person Trying to Accomplish?
- [Behavior or outcome 1]
- [Behavior or outcome 2]
- [Behavior or outcome 3]
```

**Quality checks:**
- **Observable:** Can you see this behavior? ("Get promoted" is internal; "Deliver projects 2 weeks ahead of schedule" is observable)
- **Outcome-focused:** Not tasks ("use dashboards") but results ("make data-driven decisions faster")

---

#### Goals
What are their wants, needs, dreams?

```markdown
### Goals
- [Goal 1: want, need, or dream]
- [Goal 2: want, need, or dream]
- [Goal 3: want, need, or dream]
```

**Quality checks:**
- **Short-term and long-term:** Include tactical goals ("ship feature by Q2") and aspirational goals ("become VP within 3 years")
- **Personal and professional:** "Spend more time with family" can be as relevant as "increase team productivity"

---

### Step 5: Understand Their Influences

#### Decision-Making Authority
Do they have the power to buy your solution?

```markdown
### Attitudes & Influences

- **Decision-Making Authority:** [Yes/No + context (e.g., "Has budget authority up to $10k, needs exec approval above that")]
```

**Quality checks:**
- **Procurement reality:** If they're a user but not a buyer, note who approves the purchase

---

#### Decision Influencers
Who influences their decisions?

```markdown
- **Decision Influencers:** [Who influences this person? (e.g., "Boss, peers in industry Slack channels, analyst reports")]
```

**Quality checks:**
- **Specific:** Not just "their manager"—name the types of influences (peer recommendations, Gartner reports, Twitter threads, etc.)

---

#### Beliefs & Attitudes
What beliefs and attitudes shape their decisions?

```markdown
- **Beliefs & Attitudes:** [Beliefs/attitudes that impact decisions (e.g., "Skeptical of tools that require training," "Values data-driven decision making")]
```

**Quality checks:**
- **Relevant to adoption:** Focus on beliefs that affect whether they'd use your product

---

### Step 6: Validate and Iterate

- **Share with the team:** Does this persona resonate? Do they recognize this person?
- **Identify gaps:** What don't we know? (Add "[ASSUMPTION—VALIDATE]" tags where uncertain)
- **Plan research:** Use the proto-persona to guide who to interview next
- **Evolve it:** As you learn, update the proto-persona (or graduate it to a validated persona)

---

## Examples

See `examples/sample.md` for full proto-persona examples.

Mini example excerpt:

```markdown
### Name
- Manager Mike

### Quotes
- "I spend more time in status meetings than actually building product."
```

---

## Common Pitfalls

### Pitfall 1: Demographics Without Behavior
**Symptom:** "28 years old, lives in NYC, has a dog"

**Consequence:** Demographics don't explain *why* someone would use your product.

**Fix:** Add behavioral context: "Works remotely, active in 5 Slack communities, values async communication tools."

---

### Pitfall 2: Treating Proto-Persona as Fact
**Symptom:** "Manager Mike would never use feature X because he hates complexity"

**Consequence:** You're treating an assumption as validated research.

**Fix:** Add "[ASSUMPTION—VALIDATE]" tags and plan interviews to test hypotheses.

---

### Pitfall 3: Creating 10 Proto-Personas
**Symptom:** Trying to model every possible user type upfront

**Consequence:** Analysis paralysis. Teams can't focus on a primary user.

**Fix:** Start with 1-2 proto-personas (primary + secondary). Add more as you validate and expand.

---

### Pitfall 4: Fabricating Quotes
**Symptom:** Quotes that sound like marketing copy: "I love products that delight me!"

**Consequence:** Fake personas lead to fake empathy.

**Fix:** Use real quotes from interviews, support tickets, or sales calls. If you don't have quotes yet, note "[PLACEHOLDER—NEEDS RESEARCH]."

---

### Pitfall 5: Never Validating
**Symptom:** Proto-persona created 6 months ago, never updated

**Consequence:** You're designing for a hypothesis that may be wrong.

**Fix:** Plan research sprints to validate key assumptions. Evolve the proto-persona as you learn. Graduate it to a validated persona when confidence is high.

---

## References

### Related Skills
- `skills/problem-statement/SKILL.md` — Persona informs the "I am" section
- `skills/jobs-to-be-done/SKILL.md` — JTBD informs persona pains/goals
- `skills/positioning-statement/SKILL.md` — Persona is the "For [target]"
- `skills/user-story/SKILL.md` — Stories use "As a [persona]"

### External Frameworks
- Alan Cooper, *The Inmates Are Running the Asylum* (1998) — Origin of persona concept
- Jeff Gothelf, *Lean UX* (2013) — Proto-personas as hypothesis-driven research tools
- Indi Young, *Mental Models* (2008) — Behavior-driven persona development

### Dean's Work
- Proto-Persona Profile Prompt (inspired by Productside Product Manager's Playbook)

### Provenance
- Adapted from `prompts/proto-persona-profile.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `proto-persona.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/jobs-to-be-done/SKILL.md`, `skills/problem-statement/SKILL.md`
**Used by:** `skills/positioning-statement/SKILL.md`, `skills/user-story/SKILL.md`, `skills/problem-statement/SKILL.md`
