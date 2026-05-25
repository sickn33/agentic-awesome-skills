---
name: positioning-workshop
description: Run a positioning workshop that surfaces target customer, unmet need, category, benefits, and differentiation. Use when your product messaging feels fuzzy, generic, or misaligned.
risk: safe
source: community
---


## Purpose
Guide product managers through discovering and articulating product positioning by asking adaptive questions about target customers, unmet needs, product category, benefits, and competitive differentiation. Use this to align stakeholders on strategic positioning before writing PRDs, launch plans, or marketing materials—ensuring you've made deliberate choices about who you serve, what need you address, and how you differ from alternatives.

This is not a brainstorming session—it's a structured discovery process that outputs a Geoffrey Moore positioning statement backed by evidence and strategic choices.

## Key Concepts

### The Positioning Workshop Flow
An interactive discovery process that:
1. Gathers product context (marketing materials, competitor intel)
2. Identifies target customer segment through questioning
3. Uncovers underserved needs via Jobs-to-be-Done lens
4. Defines product category and benefits
5. Establishes competitive differentiation
6. Outputs a complete positioning statement (uses `positioning-statement.md`)

### Why This Works
- **Structured discovery:** Prevents "positioning by committee" (too vague)
- **Evidence-based:** Uses real marketing materials, customer feedback, competitive intel
- **Adaptive:** Questions adjust based on B2B vs. B2C, new product vs. repositioning, etc.
- **Actionable output:** Generates a Geoffrey Moore positioning statement ready for stakeholder review

### Anti-Patterns (What This Is NOT)
- **Not a tagline generator:** Positioning ≠ marketing copy
- **Not feature-first:** Starts with customer problems, not product capabilities
- **Not consensus-driven:** Forces hard choices (can't be "for everyone")

## When to Use
- Defining positioning for a new product
- Repositioning an existing product (pivot, market shift)
- Aligning stakeholders on product strategy
- Preparing for launch or major release
- Before writing positioning-dependent artifacts (PRD, press release, sales deck)

### When NOT to Use This
- Before customer research (positioning requires validated insights)
- For internal tools with captive users (no market positioning needed)
- When positioning is already clear and validated

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

This interactive skill asks **up to 5 adaptive questions**, offering **3-4 enumerated context-aware options** at each step.

Interaction pattern: Pair with `skills/workshop-facilitation/SKILL.md` when you want a one-step-at-a-time flow with numbered recommendations at decision points and quick-select options for regular questions. If the user asks for a single-shot output, skip the multi-turn facilitation.

---

### Step 0: Gather Context (Before Questions)

**Agent suggests:**

Before we begin, let's gather product context to ground our positioning work:

**For Your Own Product:**
- Current website copy (homepage, product pages, value prop)
- Existing positioning statements or messaging docs
- Customer testimonials or case studies
- Sales objections or competitive win/loss analysis
- Product descriptions or feature lists

**For Repositioning an Existing Product:**
- Current positioning (what are you saying today?)
- Customer feedback or support tickets (what problems do they report?)
- Competitive intel (how do competitors position themselves?)

**If You Don't Have a Product Yet (or Want to Benchmark):**
- Find 2-3 competitor or analog products
- Copy their website homepage, positioning statements, or value props
- We'll use these as reference points

**You can paste this content directly, or we can proceed with a brief description.**

---

### Question 1: Target Customer Segment

**Agent asks:**
"Based on the context provided, who is the primary customer segment you're serving?"

**Offer 4 enumerated options (adapted based on product context):**

1. **B2B: SMB decision-makers** — E.g., "Small business owners (10-50 employees) managing operations" (like Gusto, QuickBooks)
2. **B2B: Enterprise buyers** — E.g., "IT/Product leaders at companies with 500+ employees" (like Salesforce, Workday)
3. **B2C: Mass market consumers** — E.g., "Gen Z users (18-25) seeking budgeting tools" (like Mint, Venmo)
4. **B2C: Niche enthusiasts** — E.g., "Fitness enthusiasts tracking macros and workouts" (like MyFitnessPal, Strava)

**Or describe your own target customer segment (be specific: demographics, role, company size, behaviors).**

**Adaptation tip:** If marketing materials mention "enterprises," "SMBs," "consumers," or specific personas, suggest those.

**User response:** [Selection or custom]

---

### Question 2: Underserved Need (Jobs-to-be-Done)

**Agent asks:**
"What underserved need or pain point does your target customer experience that your product addresses?"

**Offer 4 enumerated options (adapted based on Question 1):**

**Example (if Q1 = B2B SMB decision-makers):**
1. **Time-consuming manual work** — E.g., "Spend 10+ hours/week on tasks that should be automated" (invoice processing, payroll, reporting)
2. **Lack of visibility or control** — E.g., "Can't see real-time status of projects, causing missed deadlines" (project tracking, dashboards)
3. **Compliance or risk burden** — E.g., "Fear of tax penalties or legal issues due to manual errors" (accounting, HR compliance)
4. **Costly inefficiency** — E.g., "Losing revenue due to slow processes or customer friction" (sales ops, customer onboarding)

**Or describe the specific pain point/unmet need based on customer research, support tickets, or competitive gaps.**

**Adaptation tip:** Use language from customer testimonials or case studies in the provided materials.

**User response:** [Selection or custom]

---

### Question 3: Product Category

**Agent asks:**
"What product category does your solution fit into? (This anchors how buyers evaluate you.)"

**Offer 4 enumerated options (adapted based on Q1 + Q2):**

**Example (if Q1 = B2B SMB, Q2 = Time-consuming manual work):**
1. **Workflow automation platform** — E.g., "Automates repetitive tasks across apps" (like Zapier, Integromat)
2. **Business management software** — E.g., "All-in-one platform for operations (invoicing, payroll, CRM)" (like HubSpot, Zoho)
3. **Vertical SaaS** — E.g., "Purpose-built for a specific industry (e.g., HVAC, legal, dental)" (like Jobber, Clio)
4. **AI-powered assistant** — E.g., "AI tool that automates workflows via natural language" (like Notion AI, Jasper)

**Or define your own category. Note: Creating a new category is risky—pick an existing one unless you have strong rationale.**

**Adaptation tip:** If competitors are in a clear category, default to that unless you're deliberately creating a new one.

**User response:** [Selection or custom]

---

### Question 4: Key Benefit (Outcome, Not Features)

**Agent asks:**
"What's the primary benefit or outcome your product delivers? (Focus on what the customer *gets*, not what the product *has*.)"

**Offer 3 enumerated options (adapted based on Q2 need):**

**Example (if Q2 = Time-consuming manual work):**
1. **Time savings** — E.g., "Reduces manual work from 10 hours/week to 1 hour" (measurable efficiency)
2. **Error reduction** — E.g., "Eliminates 95% of manual data entry errors" (accuracy/risk mitigation)
3. **Cost savings** — E.g., "Saves $500/month in labor costs by automating invoicing" (direct ROI)

**Or describe the specific, measurable outcome your product delivers.**

**Quality check:** Avoid features ("has AI," "includes dashboards"). Focus on outcomes ("makes decisions 3x faster," "prevents compliance violations").

**User response:** [Selection or custom]

---

### Question 5: Competitive Differentiation

**Agent asks:**
"What's your primary competitor or competitive alternative, and how do you differ?"

**Offer 4 enumerated options (adapted based on Q3 category):**

**Example (if Q3 = Workflow automation platform):**
1. **Incumbent SaaS leader** — E.g., "Unlike Zapier (which requires technical setup), we offer no-code visual workflows accessible to non-technical users"
2. **Spreadsheets/manual processes** — E.g., "Unlike Excel (which requires manual updates), we provide real-time automated sync across tools"
3. **Vertical competitor** — E.g., "Unlike generic automation tools, we're pre-built for [industry] with templates and compliance features"
4. **Enterprise-only solutions** — E.g., "Unlike enterprise tools (complex, expensive), we're designed for SMBs with simple pricing and 10-minute setup"

**Or describe your primary competitive alternative and your unique differentiation (focus on outcomes, not features).**

**Adaptation tip:** Use competitive intel from provided materials (win/loss analysis, sales objections).

**User response:** [Selection or custom]

---

### Output: Generate Positioning Statement

After collecting responses, the agent generates a positioning statement using the `positioning-statement.md` format:

```markdown
# Positioning Statement

**Based on your responses, here's your positioning statement:**

---

## Value Proposition

**For** [Target customer from Q1]
- **that need** [Underserved need from Q2]
- [Product name]
- **is a** [Product category from Q3]
- **that** [Key benefit from Q4]

---

## Differentiation Statement

- **Unlike** [Primary competitor from Q5]
- [Product name]
- **provides** [Unique differentiation from Q5]

---

## Positioning Summary (One-Sentence Version)

[Product name] is a [category] for [target] that [benefit], unlike [competitor] which [limitation].

**Example:** "Acme Workflows is a no-code automation platform for small business owners that reduces manual work from 10 hours/week to 1 hour, unlike Zapier which requires technical setup and coding knowledge."

---

## Next Steps

1. **Stress-test this positioning:**
   - Read it aloud to 5 target customers. Do they recognize themselves?
   - Share with stakeholders (product, marketing, sales). Does it align?
   - Check if differentiation is defensible (can competitors copy this in 6 months?).

2. **Refine based on feedback:**
   - If target feels too broad → Narrow further (e.g., "SMB owners" → "SMB owners in service industries")
   - If need isn't resonating → Validate with more customer research
   - If category confuses → Pick a clearer category or commit to category creation

3. **Apply to artifacts:**
   - Update website homepage and product pages
   - Revise sales deck and pitch materials
   - Use in PRD, press release, or roadmap planning (reference `press-release.md`, `positioning-statement.md`)

---

**Would you like to refine any part of this positioning, or shall we document it as final?**
```

---

## Examples

### Example 1: Good Positioning Workshop (B2B SaaS Automation)

**Step 0 - Context Provided:**
User shares current website copy:
> "Acme Workflows helps small businesses automate repetitive tasks. Connect your apps and save time."

**Question 1 Response:** "B2B: SMB decision-makers — Small business owners (10-50 employees) managing operations"

**Question 2 Response:** "Time-consuming manual work — Spend 10+ hours/week on invoice processing, data entry, reporting"

**Question 3 Response:** "Workflow automation platform — Automates repetitive tasks across apps"

**Question 4 Response:** "Time savings — Reduces manual work from 10 hours/week to 1 hour"

**Question 5 Response:** "Incumbent SaaS leader — Unlike Zapier (which requires technical setup), we offer no-code visual workflows accessible to non-technical users"

---

**Generated Positioning Statement:**

```markdown
## Value Proposition

**For** small business owners (10-50 employees) managing daily operations
- **that need** to eliminate 10+ hours/week spent on manual tasks like invoice processing, data entry, and reporting
- Acme Workflows
- **is a** no-code workflow automation platform
- **that** reduces manual work from 10 hours/week to 1 hour by automating repetitive tasks across apps

## Differentiation Statement

- **Unlike** Zapier, which requires technical setup and coding knowledge
- Acme Workflows
- **provides** visual, no-code workflows that non-technical business owners can set up in 10 minutes

## Positioning Summary

Acme Workflows is a no-code automation platform for small business owners that reduces manual work from 10 hours/week to 1 hour, unlike Zapier which requires technical setup and coding knowledge.
```

**Why this works:**
- Target is specific (SMB owners, 10-50 employees, operations focus)
- Need is measurable (10+ hours/week on manual tasks)
- Category is clear (workflow automation)
- Benefit is outcome-focused (10 hours → 1 hour)
- Differentiation is defensible (no-code vs. technical setup)

---

### Example 2: Bad Positioning Workshop (Vague)

**Question 1 Response:** "Businesses"
**Question 2 Response:** "Need better tools"
**Question 3 Response:** "Software"
**Question 4 Response:** "Productivity"
**Question 5 Response:** "We're better than competitors"

**Generated Positioning Statement:**

```markdown
**For** businesses
- **that need** better tools
- ProductX
- **is a** software
- **that** improves productivity

**Unlike** competitors
- ProductX
- **provides** better features
```

**Why this fails:**
- Target is too broad ("businesses" = everyone)
- Need is vague ("better tools" = meaningless)
- Category is not specific ("software" says nothing)
- Benefit is unmeasurable ("productivity" = how much?)
- Differentiation is empty ("better features" = unverifiable)

**How to fix:** Go back and answer with specificity. Use customer research, not guesses.

---

## Common Pitfalls

### Pitfall 1: "For Everyone"
**Symptom:** Target is "all businesses" or "anyone who wants to be productive"

**Consequence:** Positioning becomes invisible—no one feels it's *for them*.

**Fix:** Narrow ruthlessly. Pick the *first* customer segment. You can expand later.

---

### Pitfall 2: Need is a Feature Request
**Symptom:** "Need better dashboards" or "Need AI-powered analytics"

**Consequence:** You've jumped to solution, not problem.

**Fix:** Ask "Why do they need that?" Keep asking until you hit the root need.

---

### Pitfall 3: Category Confusion
**Symptom:** "We're a next-generation platform for digital transformation"

**Consequence:** Buyers don't know how to evaluate you.

**Fix:** Pick a category buyers understand. If creating a new one, budget for category education.

---

### Pitfall 4: Differentiation is a Feature
**Symptom:** "Unlike competitors, we have AI"

**Consequence:** Features are copiable. Not durable differentiation.

**Fix:** Focus on outcomes: "Unlike competitors, we reduce setup time from 2 hours to 10 minutes."

---

### Pitfall 5: No Customer Validation
**Symptom:** Positioning created in a vacuum, never tested with customers

**Consequence:** It sounds good internally but doesn't resonate externally.

**Fix:** Read positioning statement to 5 target customers. If they don't say "Yes, that's me," revise.

---

## References

### Related Skills
- `positioning-statement.md` — The output format this workshop generates
- `proto-persona.md` — Defines the "For [target]" segment
- `jobs-to-be-done.md` — Informs the "that need" statement
- `problem-statement.md` — Problem framing supports positioning
- `press-release.md` — Positioning informs press release messaging

### External Frameworks
- Geoffrey Moore, *Crossing the Chasm* (1991) — Origin of positioning statement format
- April Dunford, *Obviously Awesome* (2019) — Modern positioning methodology

### Dean's Work
- Positioning Statement Prompt Template

---

**Skill type:** Interactive
**Suggested filename:** `positioning-workshop.md`
**Suggested placement:** `/skills/interactive/`
**Dependencies:** Uses `positioning-statement.md`, references `proto-persona.md`, `jobs-to-be-done.md`, `problem-statement.md`
