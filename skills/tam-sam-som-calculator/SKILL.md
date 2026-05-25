---
name: tam-sam-som-calculator
description: Calculate TAM, SAM, and SOM with explicit assumptions, methods, and caveats. Use when sizing a market for a product idea, business case, or executive review.
risk: safe
source: community
---


## Purpose
Guide product managers through calculating Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM) for a product idea by asking adaptive, contextually relevant questions. Use this to build defensible market size estimates backed by real-world citations, economic projections, and population data—essential for pitching to investors, securing budget, or validating product-market fit.

This is not a back-of-napkin guess—it's a structured, citation-backed analysis that withstands scrutiny.

## Key Concepts

### TAM/SAM/SOM Framework
The three-tier market sizing model:

**Total Addressable Market (TAM):**
- The total market demand for a product or service
- "If we captured 100% of the market, what's the revenue?"
- Broadest possible market (no constraints)

**Serviceable Available Market (SAM):**
- The segment of TAM your company can realistically target
- Narrowed by geography, firmographics, demographics, or product constraints
- "Who can we actually reach with our product?"

**Serviceable Obtainable Market (SOM):**
- The portion of SAM you can realistically capture
- Accounts for competition, market constraints, go-to-market capacity
- "What can we capture in the next 1-3 years?"

### Why This Works
- **Top-down validation:** TAM → SAM → SOM ensures estimates are grounded in reality
- **Investor-friendly:** Standard framework VCs and execs understand
- **Citation-backed:** Real data sources (Census, Statista, World Bank) add credibility
- **Adaptive:** Questions adjust based on context (B2B vs. B2C, US vs. global, etc.)

### Anti-Patterns (What This Is NOT)
- **Not a single-number guess:** "The market is $10B" without supporting data
- **Not static:** Markets evolve—reassess annually
- **Not a substitute for customer validation:** Market size ≠ product-market fit

## When to Use
- Pitching to investors or execs (need market size in deck)
- Validating product ideas (is the market big enough?)
- Prioritizing product lines (which has bigger opportunity?)
- Setting growth targets (what's realistic to capture?)

### When NOT to Use This
- For internal tools with captive users (no external market)
- Before defining the problem (market sizing requires clear problem space)
- As the only validation (pair with customer research)

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

This interactive skill asks **up to 4 adaptive questions**, offering **enumerated context-aware options** at each step. The agent adapts questions based on previous responses.

---

### Step 0: Gather Context (Before Questions)

**Agent suggests:**

Before we begin, it's helpful to have product context. If available, please share:

**For Your Own Product:**
- Website copy (homepage, product pages, value prop statements)
- Marketing emails or landing pages
- Product descriptions or positioning statements
- Case studies or customer testimonials
- Sales deck or pitch materials

**If You Don't Have a Product Yet:**
- Find a similar or adjacent product (competitor or analog)
- Copy their website homepage, product description, or landing page
- We'll use this as a reference point for market sizing

**You can paste this content directly, or we can proceed with a brief description.**

**Why this helps:**
- Marketing materials already contain target audience, pain points, and value props
- Analyzing real content (yours or competitors') grounds the analysis in reality
- You can benchmark against similar products' market positioning

---

### Optional Helper Script (Deterministic Math)

If you already have population and ARPU numbers (or a TAM estimate), you can run a deterministic helper to compute TAM/SAM/SOM and generate a Markdown table. This script does **not** fetch data or write files.

```bash
python3 scripts/market-sizing.py --population 5400000 --arpu 1000 --sam-share 30% --som-share 10%
```

---

### Question 1: Problem Space

**Agent asks:**
"Based on the context you've provided (or will describe), what problem space are you exploring for market sizing?"

**Offer 4 enumerated examples (user can select by number or write custom):**

1. **B2B SaaS productivity** — E.g., "Workflow automation for small business operations" (like Zapier, Integromat)
2. **Consumer fintech** — E.g., "Personal budgeting app for Gen Z users" (like Mint, YNAB)
3. **Healthcare/telehealth** — E.g., "Mental health support for remote workers" (like BetterHelp, Talkspace)
4. **E-commerce enablement** — E.g., "Payment processing for online sellers" (like Stripe, Square)

**Or write your own problem space description based on the marketing materials you shared.**

**Tip:** If you provided website copy or marketing materials, the agent can extract the problem space from phrases like:
- "We help [target] solve [problem]"
- "The #1 solution for [use case]"
- Customer pain points in testimonials or case studies

**User response:** [Selection or custom description]

---

### Question 2: Geographic Region

**Agent asks:**
"What geographic region are you targeting?"

**Offer 4 enumerated options (adapted based on problem space):**

1. **United States** — Best for detailed Census Bureau data, BLS stats, robust industry reports
2. **European Union** — Use Eurostat, local statistical agencies; note GDPR/compliance considerations
3. **Global** — World Bank, IMF data; broader but less granular
4. **Specific country/region** — E.g., "Canada," "Southeast Asia," "Latin America"

**Or specify your own region.**

**User response:** [Selection or custom]

**Adaptation logic:**
- If user selected B2B SaaS (Question 1, Option 1) → Emphasize US/EU markets (mature SaaS adoption)
- If user selected Consumer fintech (Question 1, Option 2) → Mention emerging markets (higher mobile adoption)

---

### Question 3: Industry/Market Segments

**Agent asks:**
"What specific industry or market segments does this problem space relate to?"

**Offer 4 enumerated options (adapted based on problem space + geography):**

**Example (if Question 1 = B2B SaaS, Question 2 = US):**
1. **SMB services sector** — 5.4M businesses, $1.2T revenue (US Census, 2023)
2. **Professional services (legal, accounting)** — 1.1M firms, $850B revenue (IBISWorld, 2023)
3. **Healthcare providers** — 900K practices, $4T industry (BLS, 2023)
4. **Tech/software companies** — 500K firms, $1.8T revenue (Statista, 2023)

**Or describe your own industry segment.**

**User response:** [Selection or custom]

**Adaptation logic:**
- If Question 1 = Consumer fintech, offer consumer segments (e.g., "Gen Z 18-25," "Millennials 25-40")
- If Question 1 = Healthcare, offer segments (e.g., "Primary care physicians," "Therapists/counselors")

---

### Question 4: Potential Customers (Demographics/Firmographics)

**Agent asks:**
"Who are the potential customers affected by this problem?"

**Offer 4 enumerated options (adapted based on previous answers):**

**Example (if Question 1 = B2B SaaS, Question 3 = SMB services sector):**
1. **SMBs with 10-50 employees** — 1.2M businesses, $400B revenue (Census Bureau, 2023)
2. **SMBs with 50-250 employees** — 600K businesses, $800B revenue (Census Bureau, 2023)
3. **Solo entrepreneurs/freelancers** — 3.5M self-employed, $200B revenue (BLS, 2023)
4. **Service businesses with online presence** — 2M businesses, $600B e-commerce (Statista, 2023)

**Or describe your own customer segment (firmographics, demographics, income, etc.).**

**User response:** [Selection or custom]

---

### Output: Generate TAM/SAM/SOM Analysis

After collecting responses, the agent generates a structured analysis:

```markdown
# TAM/SAM/SOM Analysis

**Problem Space:** [User's input from Question 1]
**Geographic Region:** [User's input from Question 2]
**Industry/Market Segments:** [User's input from Question 3]
**Potential Customers:** [User's input from Question 4]

---

## Total Addressable Market (TAM)

**Definition:** The total market demand if you captured 100% of potential customers in the problem space.

**Population Estimate:** [Calculated from data sources]
- **Source:** [Citation, e.g., "US Census Bureau, 2023"]
- **Calculation:** [Show math, e.g., "5.4M SMBs × $1.2T revenue = $1.2T TAM"]

**Market Size Estimate:** $[X] billion/million
- **Source:** [Industry report citation]
- **URL:** [Clickable link to source]

---

## Serviceable Available Market (SAM)

**Definition:** The segment of TAM you can realistically target with your product (narrowed by geography, firmographics, product fit).

**Segment of TAM:** [User's narrowed segment from Question 4]

**Population Estimate:** [Calculated]
- **Source:** [Citation]
- **Calculation:** [Show math, e.g., "1.2M SMBs with 10-50 employees"]

**Market Size Estimate:** $[X] billion/million
- **Source:** [Citation]
- **URL:** [Link]

**Assumptions:**
- [List key assumptions, e.g., "Assumes 50% of SMBs have budget for automation tools"]

---

## Serviceable Obtainable Market (SOM)

**Definition:** The portion of SAM you can realistically capture in the next 1-3 years, accounting for competition and market constraints.

**Realistically Capturable Market:** [Agent's estimation based on market maturity, competition]

**Population Estimate:** [Calculated]
- **Source:** [Citation]
- **Calculation:** [Show math, e.g., "1.2M SMBs × 5% market share (Year 1) = 60K customers"]

**Market Size Estimate:** $[X] million
- **Assumptions:**
  - [Competition assumption, e.g., "5 major competitors, market leader has 15% share"]
  - [GTM assumption, e.g., "Sales capacity: 50 customers/month in Year 1"]
  - [Conversion assumption, e.g., "10% trial-to-paid conversion"]

**Year 1-3 Projections:**
- **Year 1:** [X]K customers, $[X]M revenue (5% of SAM)
- **Year 2:** [X]K customers, $[X]M revenue (10% of SAM)
- **Year 3:** [X]K customers, $[X]M revenue (15% of SAM)

---

## Data Sources & Citations

- [Source 1: e.g., "US Census Bureau (2023). County Business Patterns. URL: census.gov"]
- [Source 2: e.g., "IBISWorld (2023). Professional Services Industry Report. URL: ibisworld.com"]
- [Source 3: e.g., "Statista (2023). SMB Software Market Size. URL: statista.com"]
- [Add all sources used]

---

## Validation Questions

1. **Does TAM align with industry reports?** [Compare to 3rd-party market research]
2. **Is SAM realistically serviceable?** [Can your GTM motion reach this segment?]
3. **Is SOM achievable given competition?** [Is 5-15% market share realistic in 3 years?]

---

## Next Steps

1. **Validate with customer interviews:** Does the problem resonate with target segment?
2. **Benchmark against competitors:** What market share do incumbents have?
3. **Refine SOM based on GTM capacity:** Can sales/marketing support this growth?
4. **Update annually:** Markets shift—reassess TAM/SAM/SOM yearly

---

**Would you like to refine any assumptions or explore a different segment?**
```

---

## Examples

See `examples/sample.md` for a full TAM/SAM/SOM analysis example.

Mini example excerpt:

```markdown
**TAM:** 5.4M SMBs × $2,000 ARPA = $10.8B
**SAM:** 1.2M SMBs × $2,000 ARPA = $2.4B
**SOM:** 5% of SAM = $120M
```

## Common Pitfalls

### Pitfall 1: TAM Without Citations
**Symptom:** "The market is $50B" (no source)

**Consequence:** Can't defend the number to investors or execs.

**Fix:** Cite industry reports (Gartner, IBISWorld, Statista) with URLs.

---

### Pitfall 2: SOM Equals SAM
**Symptom:** "SAM is $5B, SOM is $5B" (assuming 100% capture)

**Consequence:** Unrealistic projection—no market has zero competition.

**Fix:** SOM should be 1-20% of SAM in Year 1-3, accounting for competition.

---

### Pitfall 3: No Population Estimates
**Symptom:** Only dollar amounts, no customer counts

**Consequence:** Can't build sales/marketing plans without knowing customer volume.

**Fix:** Always include population (e.g., "1.2M businesses" or "60K customers in Year 1").

---

### Pitfall 4: Static Assumptions
**Symptom:** TAM/SAM/SOM calculated once, never updated

**Consequence:** Stale data as markets shift.

**Fix:** Reassess annually. Markets grow/shrink, competition changes, new data emerges.

---

### Pitfall 5: Ignoring GTM Constraints
**Symptom:** "SOM is 50% of SAM in Year 1" (but no sales team)

**Consequence:** SOM isn't realistic given GTM capacity.

**Fix:** Ground SOM in GTM constraints (sales capacity, marketing budget, conversion rates).

---

## References

### Related Skills
- `skills/positioning-statement/SKILL.md` — TAM/SAM/SOM informs "For [target]" segment size
- `skills/problem-statement/SKILL.md` — Problem space defines the market
- `skills/recommendation-canvas/SKILL.md` — Market sizing informs business outcome projections

### Optional Helpers
- `skills/tam-sam-som-calculator/scripts/market-sizing.py` — Deterministic TAM/SAM/SOM calculator (no network access)

### External Frameworks
- Steve Blank, *The Four Steps to the Epiphany* (2005) — Market sizing for startups
- Lean Startup methodology — Validate market size with experiments, not just desk research

### Data Sources (For Citations)
- **US:** US Census Bureau, Bureau of Labor Statistics, IBISWorld, Statista
- **Europe:** Eurostat, local statistical agencies
- **Global:** World Bank, IMF, Gartner, Forrester

### Dean's Work
- TAM/SAM/SOM Prompt Generator (multi-turn adaptive market sizing)

---

**Skill type:** Interactive
**Suggested filename:** `tam-sam-som-calculator.md`
**Suggested placement:** `/skills/interactive/`
**Dependencies:** None (standalone interactive skill)
