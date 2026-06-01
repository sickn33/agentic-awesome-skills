---
name: moatmri
description: Analyze AI disruption pressure across a business, map competitive exposure, and produce a 90-day defensive action plan.
risk: safe
source: community
date_added: "2026-05-31"
---

# MoatMRI — AI Disruption Pressure Analysis

*Where does intelligence pressure break this system first?*

## When to Use This Skill

- "Is my business at risk from AI? Where am I most exposed?"
- "How would an AI-native startup take over my market?"
- "What should I do in the next 90 days to defend against AI disruption?"
- "I'm doing due diligence on [company] — what's their AI displacement risk?"
- "Where does my competitive moat actually hold against AI pressure?"

## How It Works

### Step 1 — Gather Inputs

Ask if not provided:
- **Industry** (e.g., "real estate", "community banking", "retail pharmacy", "law firm")
- **Entity type** (e.g., "independent broker", "solo practitioner", "regional franchise")
- **Target name** (optional — specific organization for named analysis)

## Limitations

- Produces strategic risk analysis, not audited market research or investment advice.
- Depends on current company, market, regulatory, and competitive context supplied by the user or gathered from reliable sources.
- Treats disruption scenarios as planning tools; scores should be revisited as new evidence appears.

### Step 2 — 10-Vector Pressure Map

Score AI disruption pressure across exactly these 10 vectors (0–10):

| # | Vector | What to Measure |
|---|--------|----------------|
| 1 | **labor_substitution** | Which roles/functions are directly automatable |
| 2 | **customer_interface** | How AI changes how customers reach this entity |
| 3 | **knowledge_commoditization** | Does AI commoditize the expertise this entity sells |
| 4 | **pricing_pressure** | Does AI enable lower-cost competitors to undercut |
| 5 | **supply_chain_automation** | Does AI change input costs or supplier relationships |
| 6 | **data_moat** | Does this entity have proprietary data AI can't replicate |
| 7 | **trust_relationship_moat** | How much does customer loyalty protect against displacement |
| 8 | **distribution_channel_disruption** | Does AI create new channels that bypass this entity |
| 9 | **regulatory_compliance_exposure** | Does AI alter the regulatory or liability landscape |
| 10 | **decision_speed_gap** | Does AI accelerate decisions in ways that disadvantage this entity |

For each vector produce: **score**, **headline**, **near_term** (12 months), **far_term** (3 years).

**Aggregate risk score:** mean of all 10 vectors. Flag any vector ≥ 7 as critical.

### Step 3 — AI Front-Door Takeover Storyboard

6-step narrative of how an AI-native competitor displaces this entity:
1. The entry point
2. The wedge (first 10% of market)
3. The acceleration (what makes it compound)
4. The tipping point (when incumbent can't recover)
5. The aftermath
6. The survivor profile

### Step 4 — 90-Day Counterstrike Plan

- **Track A (Days 0–30):** Immediate defense — what to stop, what to protect
- **Track B (Days 31–60):** Intelligence-layer build — data/relationships to fortify
- **Track C (Days 61–90):** Offensive positioning — use AI pressure as competitive weapon

## Best Practices

- ✅ Score all 10 vectors before calculating aggregate — resist stopping at obvious ones
- ✅ Keep the storyboard specific to industry/entity, not generic disruption narrative
- ✅ Track C should be actionable within 90 days, not aspirational 3-year strategy
- ❌ Don't conflate data_moat with trust_relationship_moat — they protect differently

## Additional Resources

- Repository: [thebrierfox/moatmri-skill](https://github.com/thebrierfox/moatmri-skill)
- Full BYOK tool: [ace-license-server-production.up.railway.app/byok/moatmri](https://ace-license-server-production.up.railway.app/byok/moatmri)
- Built by [IntuiTek¹](https://intuitek.ai) (~K¹) — MIT License
