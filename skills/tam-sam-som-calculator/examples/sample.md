# TAM/SAM/SOM Examples

### Example 1: Good TAM/SAM/SOM Analysis (B2B SaaS Workflow Automation)

**Step 0 - Context Provided:**
User shares Zapier's homepage copy:
> "Zapier connects your apps and automates workflows. Easy automation for busy people. Move info between your web apps automatically, so you can focus on your most important work."

**Question 1 Response:** "B2B SaaS productivity — Workflow automation for small business operations" (extracted from "automates workflows" and "busy people")
**Question 2 Response:** "United States"
**Question 3 Response:** "SMB services sector"
**Question 4 Response:** "SMBs with 10-50 employees"

---

**Generated Analysis:**

```markdown
# TAM/SAM/SOM Analysis: Workflow Automation for SMBs

**Problem Space:** Workflow automation for small business operations
**Geographic Region:** United States
**Industry/Market Segments:** SMB services sector
**Potential Customers:** SMBs with 10-50 employees

---

## Total Addressable Market (TAM)

**Definition:** Total US market for workflow automation tools across all business sizes.

**Population Estimate:** 33.2M businesses (US Census Bureau, 2023)

**Market Size Estimate:** $50B
- **Source:** Gartner, "Business Process Automation Market, 2023"
- **URL:** [gartner.com/business-automation-report]
- **Breakdown:** $30B (large enterprise), $15B (mid-market), $5B (SMB)

---

## Serviceable Available Market (SAM)

**Definition:** US SMBs (10-50 employees) in services sector that could use workflow automation.

**Segment of TAM:** SMBs with 10-50 employees in services sector

**Population Estimate:** 1.2M businesses
- **Source:** US Census Bureau, "County Business Patterns, 2023"
- **URL:** [census.gov/cbp]
- **Calculation:** 5.4M total SMBs × 22% (10-50 employee size) = 1.2M

**Market Size Estimate:** $3.6B
- **Source:** IBISWorld, "SMB Software Market, 2023"
- **Calculation:** 1.2M businesses × $3,000 avg spend/year = $3.6B
- **URL:** [ibisworld.com/smb-software]

**Assumptions:**
- 50% of SMBs have budget for automation tools ($1.8B addressable)
- Avg $3,000/year spend on software (Statista, 2023)

---

## Serviceable Obtainable Market (SOM)

**Definition:** Market share we can realistically capture in next 3 years.

**Realistically Capturable Market:** 5-15% of SAM over 3 years

**Year 1 Population Estimate:** 12K customers (1% of SAM)
- **Calculation:** 1.2M businesses × 1% = 12K
- **Revenue:** $36M (12K × $3,000 ARPU)

**Year 3 Population Estimate:** 180K customers (15% of SAM)
- **Calculation:** 1.2M businesses × 15% = 180K
- **Revenue:** $540M (180K × $3,000 ARPU)

**Assumptions:**
- **Competition:** 5 major players (Zapier 20% share, Integromat 10%, others <5%)
- **GTM Capacity:** PLG motion, 1K trial signups/month in Year 1, scaling to 15K/month by Year 3
- **Conversion:** 10% trial-to-paid conversion
- **Churn:** 15% annual churn (industry standard for SMB SaaS)

**Year 1-3 Projections:**
- **Year 1:** 12K customers, $36M revenue (1% of SAM)
- **Year 2:** 60K customers, $180M revenue (5% of SAM)
- **Year 3:** 180K customers, $540M revenue (15% of SAM)

---

## Data Sources & Citations

- US Census Bureau (2023). County Business Patterns. [census.gov/cbp]
- Gartner (2023). Business Process Automation Market Report. [gartner.com]
- IBISWorld (2023). SMB Software Market Analysis. [ibisworld.com]
- Statista (2023). SMB Software Spending. [statista.com]

---

## Validation Questions

1. **Does TAM align with industry reports?** ✅ Yes—Gartner estimates $50B total BPA market
2. **Is SAM realistically serviceable?** ✅ Yes—PLG motion can reach 1.2M SMBs via digital marketing
3. **Is SOM achievable given competition?** ⚠️ Stretch goal—Zapier has 20% share; 15% in Year 3 requires strong differentiation

---

## Next Steps

1. **Validate with 20 customer interviews:** Confirm $3K/year budget exists
2. **Benchmark against Zapier/Integromat:** Study their GTM, pricing, churn
3. **Refine SOM based on pilot:** Run 6-month pilot, measure actual conversion/churn
4. **Reassess annually:** SMB market growing 5%/year—update TAM/SAM annually
```

**Why this works:**
- Citations for every data point (Census, Gartner, IBISWorld, Statista)
- Shows math and assumptions transparently
- Realistic SOM (1% → 5% → 15% over 3 years)
- Identifies validation gaps ("⚠️ Stretch goal")

---

### Example 2: Bad TAM/SAM/SOM Analysis (No Citations, Vague)

```markdown
# TAM/SAM/SOM Analysis: Productivity Tool

**TAM:** The productivity market is huge, probably $100 billion.

**SAM:** We're targeting small businesses, so maybe $10 billion.

**SOM:** We think we can get 1% in the first year, so $100 million.
```

**Why this fails:**
- No citations (where did "$100B" come from?)
- Vague segments ("small businesses" = how many? what size?)
- No assumptions documented (1% of SAM—why?)
- No population estimates (how many customers?)
- No validation questions or next steps

---
