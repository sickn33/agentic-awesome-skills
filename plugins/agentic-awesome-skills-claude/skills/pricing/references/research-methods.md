# Pricing Research Methods

## Contents
- Van Westendorp Price Sensitivity Meter (The Four Questions, How to Analyze, Survey Tips, Sample Output)
- MaxDiff Analysis (How It Works, Example Survey Question, Analyzing Results, Using MaxDiff for Packaging)
- Willingness to Pay Surveys
- Usage-Value Correlation Analysis

## Van Westendorp Price Sensitivity Meter

The Van Westendorp survey estimates a perceived price-acceptability range for the surveyed audience. It does not measure observed demand or establish a revenue-maximizing price.

### The Four Questions

Ask each respondent:
1. "At what price would you consider [product] to be so expensive that you would not consider buying it?" (Too expensive)
2. "At what price would you consider [product] to be priced so low that you would question its quality?" (Too cheap)
3. "At what price would you consider [product] to be starting to get expensive, but you still might consider it?" (Expensive/high side)
4. "At what price would you consider [product] to be a bargain—a great buy for the money?" (Cheap/good value)

### How to Analyze

1. Plot cumulative distributions for each question
2. Find the intersections:
   - **Point of Marginal Cheapness (PMC):** "Too cheap" crosses "Expensive"
   - **Point of Marginal Expensiveness (PME):** "Too expensive" crosses "Cheap"
   - **Conventionally named Optimal Price Point (OPP):** "Too cheap" crosses "Too expensive"; the label does not establish that this price is economically optimal
   - **Indifference Price Point (IDP):** "Expensive" crosses "Cheap"

**Perceived acceptability range:** PMC to PME
**Exploratory central range:** Between OPP and IDP; validate it against behavior, alternatives, segment differences, and unit economics

### Survey Tips
- Determine sample size from the design, desired precision, audience heterogeneity, and planned segment analysis; there is no universal reliable respondent count
- Segment only when the design has enough observations to support the comparison
- Use realistic product descriptions
- Consider adding purchase intent questions

### Sample Output

```
Price Sensitivity Analysis Results:
─────────────────────────────────
Point of Marginal Cheapness:  $29/mo
Optimal Price Point:          $49/mo
Indifference Price Point:     $59/mo
Point of Marginal Expensiveness: $79/mo

Exploratory perceived range: $49-59/mo
Current price: $39/mo (below that surveyed range)
Next step: test price hypotheses against observed conversion, retention,
segment response, and unit economics before changing price
```

---

## MaxDiff Analysis (Best-Worst Scaling)

MaxDiff estimates relative stated priorities among the features and choice sets tested. It can inform packaging research, but does not by itself determine tiers, willingness to pay, or purchase behavior.

### How It Works

1. List 8-15 features you could include
2. Show respondents sets of 4-5 features at a time
3. Ask: "Which is MOST important? Which is LEAST important?"
4. Repeat across multiple sets until all features compared
5. Statistical analysis produces importance scores

### Example Survey Question

```
Which feature is MOST important to you?
Which feature is LEAST important to you?

□ Unlimited projects
□ Custom branding
□ Priority support
□ API access
□ Advanced analytics
```

### Analyzing Results

Features are ranked by relative utility score within the tested design. Treat high, medium, and low scores as evidence about stated priority—not automatic labels such as must-have, differentiator, or expendable.

### Using MaxDiff for Packaging

Use the scores to form packaging hypotheses, then combine them with segment-level needs, feature dependencies, product strategy, cost to serve, and behavioral tests. Do not map score percentiles mechanically to base, premium, or cut decisions.

---

## Willingness to Pay Surveys

**Direct method (simple but biased):**
"How much would you pay for [product]?"

**Structured stated-intent method: Gabor-Granger:**
"Would you buy [product] at [$X]?" (Yes/No)
Vary price across respondents to estimate a stated purchase-intent curve. Do not present it as observed demand without behavioral validation.

**Tradeoff method: Conjoint analysis:**
Show product bundles at different prices
Respondents choose preferred option
Statistical analysis estimates preferences and price sensitivity under the study design; results still depend on sample, attributes, tasks, and external validation

---

## Usage-Value Correlation Analysis

### 1. Instrument usage data
Track how customers use your product:
- Feature usage frequency
- Volume metrics (users, records, API calls)
- Outcome metrics (revenue generated, time saved)

### 2. Test associations with customer success
- Which usage patterns predict retention?
- Which usage patterns predict expansion?
- Which customers pay the most, and why?

### 3. Identify value thresholds
- At what usage level do customers "get it"?
- At what usage level do they expand?
- At what usage level might a different price or package be worth testing?

### Example Analysis

```
Usage-Value Correlation Analysis:
─────────────────────────────────
Segment: High-LTV customers (>$10k ARR)
Average monthly active users: 15
Average projects: 8
Average integrations: 4

Segment: Churned customers
Average monthly active users: 3
Average projects: 2
Average integrations: 0

Observed association: High-LTV customers in this sample use more seats
                      and integrations; this does not establish causation

Hypothesis to test: Compare seat- or usage-based packaging and integration
                    access against alternatives, adoption, and unit economics
```
