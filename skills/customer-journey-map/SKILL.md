---
name: customer-journey-map
description: Create a customer journey map across stages, touchpoints, actions, emotions, and metrics. Use when diagnosing a broken experience or aligning a team on the full customer flow.
risk: safe
source: community
---


## Purpose
Create a comprehensive customer journey map that visualizes how customers interact with your brand across all stages—from awareness to loyalty—documenting their actions, touchpoints, emotions, KPIs, business goals, and teams involved at each stage. Use this to identify pain points, align cross-functional teams, and systematically improve the customer experience to achieve business objectives.

This is not a user flow diagram—it's a strategic artifact that combines customer empathy with business metrics to drive actionable improvements.

## Key Concepts

### The Customer Journey Mapping Framework
Adapted from NNGroup's framework and Carnegie Mellon's PM curriculum, a customer journey map documents:

**Horizontal structure (stages):**
- **Awareness:** Customer first learns about your brand
- **Consideration:** Customer evaluates your offering
- **Decision:** Customer makes a purchase
- **Service:** Customer uses the product/service post-purchase
- **Loyalty:** Customer becomes a repeat buyer and advocate

**Vertical structure (for each stage):**
- **Customer Actions:** What customers do
- **Touchpoints:** Where/how they interact with your brand
- **Customer Experience:** Emotions and thoughts
- **KPIs:** Metrics to measure success
- **Business Goals:** What you're trying to achieve
- **Teams Involved:** Who owns this stage

### Why This Works
- **Empathy-driven:** Centers on customer emotions, not just actions
- **Cross-functional alignment:** Shows which teams affect which stages
- **Metric-focused:** Ties customer experience to measurable outcomes
- **Gap identification:** Makes pain points and opportunities visible
- **Actionable:** Clear KPIs and goals enable prioritization

### Anti-Patterns (What This Is NOT)
- **Not a user story map:** Journey maps are broader (all touchpoints, not just product use)
- **Not a service blueprint:** Less detailed on internal processes, more focused on customer experience
- **Not static:** Journey maps evolve as customer behavior changes

## When to Use
- Understanding customer experience across all touchpoints (not just product)
- Aligning cross-functional teams (marketing, sales, product, support)
- Identifying pain points and prioritizing improvements
- Onboarding new team members to customer perspective
- Auditing the end-to-end customer experience

### When NOT to Use This
- For deep product-specific workflows (use story mapping instead)
- Before defining personas (need to know who you're mapping)
- As a one-time exercise (journey maps require ongoing updates)

---

## Application

Use `template.md` for the full fill-in structure.

### Step 1: Prepare Prerequisites

Before mapping, ensure you have:
1. **Key stakeholders:** Marketing, sales, product, customer service representatives
2. **Buyer personas:** Detailed personas with demographics, psychographics, goals, challenges (reference `skills/proto-persona/SKILL.md`)
3. **Defined stages:** Main stages of your buying process (typically: Awareness, Consideration, Decision, Service, Loyalty)
4. **Touchpoint inventory:** All places customers interact with your brand (website, social, email, store, support, etc.)

**If missing:** Run discovery interviews, persona definition work, or touchpoint audits first.

---

### Step 2: Set Clear Objectives

Define what you want to achieve:

```markdown
## Objectives
- [Goal 1: e.g., "Identify top 3 pain points causing drop-off between Awareness and Consideration"]
- [Goal 2: e.g., "Align marketing and sales on customer motivations at each stage"]
- [Goal 3: e.g., "Understand emotional journey to inform messaging strategy"]
```

**Quality checks:**
- **Specific:** Not "understand customers" but "identify drop-off causes in Consideration stage"
- **Actionable:** Results should inform decisions, not just document observations

---

### Step 3: Choose a Buyer Persona

Select one persona to focus on (create separate maps for each persona):

```markdown
## Persona
- [Persona name and brief description]
- [Example: "Manager Mike: 35-42, Director of Product at mid-sized B2B SaaS, struggles with data-driven prioritization, values time savings over feature depth"]
```

**Why one persona per map:** Different personas have different journeys. Mixing them creates confusion.

---

### Step 4: Map Each Stage

For each stage (Awareness, Consideration, Decision, Service, Loyalty), document:

#### Customer Actions
What customers do at this stage:

```markdown
### Stage: [Stage Name, e.g., Awareness]

**Customer Actions:**
- [Action 1: e.g., "See LinkedIn ad about product management tools"]
- [Action 2: e.g., "Hear about tool from PM peer at conference"]
- [Action 3: e.g., "Google 'best product roadmap software'"]
```

**Quality checks:**
- **Observable:** You can see or measure this action
- **Specific:** Not "research products" but "Google 'best roadmap software' and read comparison articles"

---

#### Touchpoints
Where/how customers interact with your brand:

```markdown
**Touchpoints:**
- [Touchpoint 1: e.g., "LinkedIn Ads"]
- [Touchpoint 2: e.g., "Word-of-mouth at PM conferences"]
- [Touchpoint 3: e.g., "Google organic search results"]
- [Touchpoint 4: e.g., "Review sites (G2, Capterra)"]
```

**Quality checks:**
- **Comprehensive:** Include both digital and physical touchpoints
- **Specific:** Not "social media" but "LinkedIn Ads," "Twitter mentions," etc.

---

#### Customer Experience
Emotions and thoughts customers have:

```markdown
**Customer Experience:**
- [Emotion 1: e.g., "Curious but skeptical—'Is this actually better than spreadsheets?'"]
- [Emotion 2: e.g., "Overwhelmed by options—'Too many tools, how do I choose?'"]
- [Emotion 3: e.g., "Hopeful but cautious—'Could this save me time?'"]
```

**Quality checks:**
- **Authentic:** Use customer quotes from research when possible
- **Emotional:** Capture feelings, not just thoughts
- **Specific:** Not "interested" but "curious but skeptical—worried about setup time"

---

#### KPIs
Key performance indicators for this stage:

```markdown
**KPIs:**
- [KPI 1: e.g., "Brand awareness (measured via surveys)"]
- [KPI 2: e.g., "LinkedIn ad impressions: 100k/month"]
- [KPI 3: e.g., "Organic search traffic: 5k visitors/month"]
- [KPI 4: e.g., "G2 review views: 2k/month"]
```

**Quality checks:**
- **Measurable:** Can you track this?
- **Stage-appropriate:** Awareness KPIs differ from Decision KPIs

---

#### Business Goals
What you're trying to achieve at this stage:

```markdown
**Business Goals:**
- [Goal 1: e.g., "Increase brand awareness among PMs at B2B SaaS companies"]
- [Goal 2: e.g., "Generate 500 qualified leads/month"]
- [Goal 3: e.g., "Position as top 3 roadmap tool in G2 rankings"]
```

**Quality checks:**
- **Outcome-focused:** Not "run ads" but "increase brand awareness"
- **Aligned with stage:** Don't expect conversions at Awareness stage

---

#### Teams Involved
Who owns this stage:

```markdown
**Teams Involved:**
- [Team 1: e.g., "Marketing (ad campaigns, SEO)"]
- [Team 2: e.g., "Content (blog posts, comparison guides)"]
- [Team 3: e.g., "Customer Success (case studies, testimonials)"]
```

**Quality checks:**
- **Cross-functional:** Multiple teams usually touch each stage
- **Specific roles:** Not just "marketing" but "marketing (ad campaigns, SEO)"

---

### Step 5: Visualize the Map

Create a table or visual diagram:

| **Stage** | **Awareness** | **Consideration** | **Decision** | **Service** | **Loyalty** |
|-----------|---------------|-------------------|--------------|-------------|-------------|
| **Customer Actions** | See ad, hear from peers, Google search | Compare features, read reviews, request demo | Free trial signup, test with real data, evaluate ROI | Onboard team, build first roadmap, integrate with Jira | Use daily, recommend to peers, share wins on LinkedIn |
| **Touchpoints** | LinkedIn Ads, conferences, Google, review sites | Website, demo calls, sales emails | Product (free trial), onboarding emails | Product, support chat, knowledge base | Product, community forums, customer success check-ins |
| **Customer Experience** | Curious but skeptical | Excited but overwhelmed by options | Anxious about setup time, hopeful about time savings | Relieved if easy, frustrated if complex | Satisfied and confident, proud of wins |
| **KPIs** | Impressions: 100k/month, traffic: 5k/month | Demo requests: 100/month, trial signups: 50/month | Conversion rate: 20%, time-to-value: <2 hours | Activation rate: 70%, support ticket volume | Retention rate: 85%, NPS: 50, referral rate: 15% |
| **Business Goals** | Increase brand awareness, generate 500 leads/month | Improve lead quality, reduce sales cycle to 30 days | Increase trial-to-paid conversion, optimize onboarding | Reduce churn, improve activation, minimize support costs | Increase LTV, generate referrals, upsell premium features |
| **Teams Involved** | Marketing, Content | Marketing, Sales, Product | Sales, Product, Onboarding | Product, Support, Customer Success | Product, Customer Success, Marketing |

---

### Step 6: Analyze and Prioritize

Review the map and ask:
1. **Where are the biggest pain points?** (Look for negative emotions + high drop-off rates)
2. **Which stages have the weakest KPIs?** (Prioritize low-performing stages)
3. **Are teams aligned?** (Do teams understand their role in each stage?)
4. **What opportunities exist?** (Where can small improvements create big impact?)

**Prioritization criteria:**
- **Impact:** How much would fixing this improve the customer experience?
- **Feasibility:** How easy is this to fix?
- **Alignment:** Does this support business goals?

---

### Step 7: Test and Refine

- **Update regularly:** Customer behavior changes—revisit the map quarterly
- **Validate with data:** Use analytics, surveys, and customer interviews to confirm assumptions
- **Track improvements:** After making changes, measure impact on KPIs

---

## Examples

See `examples/sample.md` for a full customer journey map example.
See `examples/meta-product-manager-skills.md` for a meta dogfooding example mapping this repository's own customer journey.

Mini example excerpt:

```markdown
| **Stage** | **Awareness** | **Consideration** | **Decision** |
| **Customer Actions** | Sees LinkedIn ad | Compares on G2 | Starts free trial |
| **Customer Experience** | Curious but skeptical | Overwhelmed | Anxious about setup |
```

---

## Common Pitfalls

### Pitfall 1: Generic Emotions
**Symptom:** "Customer feels happy" or "Customer is satisfied"

**Consequence:** No insight into *why* they feel that way or what to improve.

**Fix:** Be specific: "Relieved that setup took 30 minutes, not 3 hours as feared."

---

### Pitfall 2: Missing Touchpoints
**Symptom:** Only documenting digital touchpoints (website, app)

**Consequence:** Miss offline interactions (conferences, word-of-mouth, support calls).

**Fix:** Include all touchpoints: physical, digital, human, and automated.

---

### Pitfall 3: Internal Perspective
**Symptom:** Mapping what *you* want customers to do, not what they *actually* do

**Consequence:** Journey map reflects wishful thinking, not reality.

**Fix:** Validate with customer research, analytics, and support tickets.

---

### Pitfall 4: No KPIs or Goals
**Symptom:** Journey map has actions and emotions but no metrics or business objectives

**Consequence:** No way to measure success or prioritize improvements.

**Fix:** Add KPIs and business goals for each stage. Make them measurable.

---

### Pitfall 5: One-and-Done Exercise
**Symptom:** Journey map created once, never updated

**Consequence:** Map becomes outdated as customer behavior evolves.

**Fix:** Review quarterly. Update based on new data, product changes, or market shifts.

---

## References

### Related Skills
- `skills/proto-persona/SKILL.md` — Defines the persona for the journey map
- `skills/jobs-to-be-done/SKILL.md` — Informs customer actions and goals
- `skills/problem-statement/SKILL.md` — Identifies pain points at each stage
- `skills/user-story-mapping/SKILL.md` — Complementary (story mapping focuses on product usage, journey mapping covers all touchpoints)

### External Frameworks
- NNGroup, *Customer Journey Mapping* (2016) — Foundational framework
- Carnegie Mellon University, *Product Management Curriculum* — Academic approach
- Chris Risdon & Patrick Quattlebaum, *Orchestrating Experiences* (2018) — Journey mapping for service design

### Dean's Work
- Customer Journey Mapping Prompt Template (adapted from NNGroup and CMU frameworks)

### Provenance
- Adapted from `prompts/customer-journey-mapping-prompt-template.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

---

**Skill type:** Component
**Suggested filename:** `customer-journey-map.md`
**Suggested placement:** `/skills/components/`
**Dependencies:** References `skills/proto-persona/SKILL.md`, `skills/jobs-to-be-done/SKILL.md`, `skills/problem-statement/SKILL.md`
