# Communication Templates — Inventory Demand Planning

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing demand planning communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by audience and purpose. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [Vendor Replenishment Order](#1-vendor-replenishment-order)
2. [Vendor Lead Time Escalation](#2-vendor-lead-time-escalation)
3. [Internal Stockout Alert](#3-internal-stockout-alert)
4. [Markdown Recommendation to Merchandising](#4-markdown-recommendation-to-merchandising)
5. [Promotional Forecast Submission](#5-promotional-forecast-submission)
6. [Safety Stock Adjustment Request](#6-safety-stock-adjustment-request)
7. [New Product Forecast Assumptions](#7-new-product-forecast-assumptions)
8. [Excess Inventory Liquidation Plan](#8-excess-inventory-liquidation-plan)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{po_number}}` | Purchase order number | `PO-2025-08843` |
| `{{sku}}` | SKU or item number | `SKU-44281` |
| `{{sku_description}}` | Product description | `Organic Olive Oil 16oz` |
| `{{vendor_name}}` | Vendor company name | `Mediterranean Imports LLC` |
| `{{vendor_contact}}` | Vendor contact name | `Marco Bellini` |
| `{{vendor_contact_email}}` | Vendor contact email | `m.bellini@medimports.com` |
| `{{our_contact_name}}` | Our planner name | `Sarah Kim` |
| `{{our_contact_title}}` | Our planner title | `Senior Demand Planner` |
| `{{our_contact_email}}` | Our planner email | `s.kim@retailco.com` |
| `{{our_contact_phone}}` | Our planner phone | `(404) 555-0192` |
| `{{our_company}}` | Our company name | `RetailCo` |
| `{{dc_location}}` | Distribution center location | `Nashville, TN DC` |
| `{{delivery_date}}` | Requested delivery date | `2025-09-22` |
| `{{order_qty}}` | Order quantity | `1,200 units (100 cases)` |
| `{{current_on_hand}}` | Current on-hand inventory | `840 units` |
| `{{weeks_of_supply}}` | Weeks of supply at current rate | `4.2 weeks` |
| `{{weekly_demand}}` | Average weekly demand | `200 units/week` |
| `{{category}}` | Product category | `Cooking Oils` |
| `{{store_count}}` | Number of affected stores | `85 stores` |
| `{{abc_class}}` | ABC classification | `A-item` |
| `{{service_level_target}}` | Target service level | `97%` |
| `{{current_service_level}}` | Current service level | `91%` |
| `{{revenue_at_risk}}` | Estimated revenue at risk | `$18,400/week` |
| `{{promo_start}}` | Promotion start date | `2025-10-05` |
| `{{promo_end}}` | Promotion end date | `2025-10-18` |
| `{{promo_type}}` | Promotion type | `TPR 25% off + circular feature` |
| `{{baseline_forecast}}` | Baseline forecast | `500 units/week` |
| `{{lift_estimate}}` | Promotional lift estimate | `180% (900 incremental units)` |
| `{{markdown_pct}}` | Markdown percentage | `30%` |
| `{{excess_units}}` | Excess inventory units | `3,200 units` |
| `{{excess_wos}}` | Excess weeks of supply | `18.4 weeks` |

---

## 1. Vendor Replenishment Order

### When to Use
- Standard replenishment order based on forecast and inventory position.
- No urgency beyond normal lead time expectations.

### Tone Guidance
Transactional and efficient. The vendor receives dozens of these daily. Be clear, reference the PO, specify quantities, delivery date, and delivery location. No need for pleasantries beyond professional courtesy.

### What NOT to Say
- Do not include forecast data or inventory levels in routine POs — this is proprietary information.
- Do not request lead time changes or raise performance issues in a PO communication.

### Template

**Subject:** `PO {{po_number}} — {{vendor_name}} — Delivery {{delivery_date}}`

---

{{vendor_contact}},

Please find below our purchase order for delivery to {{dc_location}}.

**PO Number:** {{po_number}}
**Requested Delivery Date:** {{delivery_date}}
**Ship-To:** {{dc_location}}

| SKU | Description | Qty (units) | Qty (cases) | Unit Cost | Line Total |
|---|---|---|---|---|---|
| {{sku}} | {{sku_description}} | {{order_qty}} | {{cases}} | {{unit_cost}} | {{line_total}} |

**Order Total:** {{order_total}}

Please confirm receipt and expected ship date within 2 business days.

If any items are unavailable or quantities will be shorted, notify us immediately at {{our_contact_email}} so we can adjust our planning.

Regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 2. Vendor Lead Time Escalation

### When to Use
- Vendor's actual lead times have exceeded the stated/contracted lead time by >20% for 3+ consecutive orders.
- Lead time variability is causing stockouts or excessive safety stock costs.
- You need a formal escalation before involving procurement or vendor management.

### Tone Guidance
Firm and data-driven. You are not complaining — you are presenting evidence and requesting a corrective action plan. Lead with the impact to your business, not the vendor's failure. Offer collaboration: you want to solve this together, but you need a commitment.

### What NOT to Say
- Do not threaten to switch vendors in this communication (that's a procurement conversation).
- Do not speculate on the cause of the lead time issue — let the vendor explain.
- Do not use vague language like "often late" — provide specific PO numbers, dates, and deviations.

### Template

**Subject:** `Lead Time Performance Review — {{vendor_name}} — Action Required by {{deadline_date}}`

---

{{vendor_contact}},

I'm writing to address a consistent lead time issue that is impacting our inventory planning for your product line.

**Summary of the Problem:**

Over the past {{time_period}}, we have observed the following lead time performance on our orders:

| PO Number | Order Date | Stated Lead Time | Actual Lead Time | Deviation |
|---|---|---|---|---|
| {{po_1}} | {{date_1}} | {{stated_lt}} days | {{actual_lt_1}} days | +{{dev_1}} days |
| {{po_2}} | {{date_2}} | {{stated_lt}} days | {{actual_lt_2}} days | +{{dev_2}} days |
| {{po_3}} | {{date_3}} | {{stated_lt}} days | {{actual_lt_3}} days | +{{dev_3}} days |

**Average stated lead time:** {{stated_lt}} days
**Average actual lead time:** {{actual_lt_avg}} days (+{{pct_increase}}%)
**Lead time coefficient of variation:** {{lt_cv}}

**Impact to Our Business:**

This lead time increase has required us to:
- Increase safety stock by {{ss_increase_pct}}%, tying up an additional ${{ss_cost_increase}} in working capital
- Experience {{stockout_count}} stockout events on {{sku_description}} in the past {{time_period}}, with estimated lost sales of ${{lost_sales}}
- Expedite {{expedite_count}} orders at an additional cost of ${{expedite_cost}}

**What We Need:**

1. A written explanation of the root cause of the lead time increase by {{deadline_date}}.
2. A corrective action plan with a committed timeline to return to the stated {{stated_lt}}-day lead time.
3. If the lead time increase is permanent, we need an updated lead time commitment so we can recalibrate our planning parameters.

We value our partnership with {{vendor_name}} and want to resolve this collaboratively. I'm available to discuss on a call at your convenience this week.

Regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 3. Internal Stockout Alert

### When to Use
- Projected stockout on an A or B-item within 7 days based on current inventory position and demand forecast.
- Actual stockout occurring at 3+ locations.
- Any stockout where revenue at risk exceeds $10,000/week.

### Tone Guidance
Urgent, concise, action-oriented. The audience is internal (planning manager, category merchant, supply chain director). Lead with the impact, follow with the facts, close with the recommended action. This is not a post-mortem — it's a call to action.

### What NOT to Say
- Do not assign blame in the alert (e.g., "because the buyer didn't order enough"). That's for the post-mortem.
- Do not present multiple options without a recommendation — decision-makers need a clear ask.

### Template

**Subject:** `🔴 STOCKOUT ALERT — {{sku_description}} — {{store_count}} locations at risk`

---

**Attention:** {{recipient_names}}

**Item:** {{sku}} — {{sku_description}}
**ABC Class:** {{abc_class}}
**Current Status:** {{current_status}} (e.g., "Out of stock at 8 locations; projected stockout at 22 additional locations by {{stockout_date}}")

**Inventory Position:**
- DC On-Hand: {{dc_on_hand}} units
- Store On-Hand (aggregate): {{store_on_hand}} units
- On-Order: {{on_order}} units (ETA: {{on_order_eta}})
- Weekly Demand: {{weekly_demand}}
- Weeks of Supply (current): {{weeks_of_supply}}

**Revenue at Risk:** ${{revenue_at_risk}}/week across {{store_count}} locations

**Root Cause:** {{root_cause}} (e.g., "Vendor shipment delayed by 10 days; demand running 20% above forecast due to competitive market exit")

**Recommended Actions:**

1. **Immediate:** {{action_1}} (e.g., "Reallocate 400 units from low-velocity stores to stockout locations — list attached")
2. **Short-term:** {{action_2}} (e.g., "Expedite PO {{po_number}} — vendor confirmed can ship 800 units by {{expedite_date}} at ${{expedite_cost}} additional freight")
3. **If above fails:** {{action_3}} (e.g., "Substitute with {{alt_sku}} — similar product, available in DC, can ship to affected stores within 48 hours")

**Decision needed by:** {{decision_deadline}}

Please reply or call me directly to confirm action.

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_phone}}

---

## 4. Markdown Recommendation to Merchandising

### When to Use
- SKU or category has excess inventory exceeding 12 weeks of supply with no promotional activity planned.
- Seasonal product with sell-through below 60% at season midpoint.
- Slow-mover kill decision has been triggered.

### Tone Guidance
Data-driven and collaborative. You are presenting a financial analysis, not demanding a price change. Merchandising owns pricing decisions — your job is to provide the inventory data and margin impact analysis to inform their decision. Frame recommendations as margin recovery, not "we bought too much."

### What NOT to Say
- Do not say "we overbought" or "the forecast was wrong" — frame as "sell-through pace requires price action."
- Do not propose a specific retail price — propose a markdown depth (% off) and let merchandising set the price.

### Template

**Subject:** `Markdown Recommendation — {{sku_description}} — {{excess_units}} units excess`

---

**To:** {{merchandising_contact}}
**From:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{date}}

**Summary:**
{{sku_description}} ({{sku}}) is carrying {{excess_units}} units of excess inventory representing {{excess_wos}} weeks of supply at current sell-through rates. Based on our analysis, a markdown is recommended to recover margin and free working capital before the inventory ages further.

**Current Inventory Position:**

| Metric | Value |
|---|---|
| On-Hand (DC + Stores) | {{total_on_hand}} units |
| Weekly Demand (trailing 4-week avg) | {{weekly_demand}} |
| Weeks of Supply | {{excess_wos}} |
| Seasonal Window Remaining | {{season_weeks_remaining}} weeks |
| Current Sell-Through vs. Plan | {{sell_through_pct}}% |

**Financial Analysis:**

| Scenario | Markdown Depth | Projected Velocity | Weeks to Clear | Margin Recovery |
|---|---|---|---|---|
| No action | 0% | {{current_velocity}} units/week | {{wos_no_action}} weeks | {{margin_no_action}} |
| Option A | {{md_depth_a}}% | {{velocity_a}} units/week | {{wos_a}} weeks | {{margin_a}} |
| Option B | {{md_depth_b}}% | {{velocity_b}} units/week | {{wos_b}} weeks | {{margin_b}} |
| Liquidation | Cost recovery | Immediate | 1–2 weeks | {{margin_liquidation}} |

**Recommendation:** Option {{recommended_option}} ({{md_depth_recommended}}% markdown) offers the best margin recovery of {{margin_recommended}} while clearing inventory within {{wos_recommended}} weeks.

**Holding Cost of Inaction:** Carrying this excess for another {{delay_weeks}} weeks costs approximately ${{holding_cost}} in inventory carrying costs and risks additional obsolescence if the product ages or a seasonal window closes.

**Next Steps:**
If approved, we can execute the markdown effective {{proposed_start_date}} and monitor weekly sell-through against the projected velocity.

Happy to discuss the analysis in detail.

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_email}} | {{our_contact_phone}}

---

## 5. Promotional Forecast Submission

### When to Use
- Submitting the demand forecast for a planned promotion to supply chain, merchandising, and vendor partners.
- Required 6–8 weeks before promotion start date to allow for procurement.

### Tone Guidance
Structured and transparent. This document is the "source of truth" for promotional inventory planning. Include all assumptions, the baseline, the lift estimate, and the post-promo dip so that all stakeholders can challenge or validate the numbers before POs are placed.

### What NOT to Say
- Do not present a single point estimate without a confidence range — this gives false precision.
- Do not omit the post-promo dip — it's as important as the lift.

### Template

**Subject:** `Promotional Forecast — {{sku_description}} — {{promo_start}} to {{promo_end}}`

---

**To:** Supply Chain Planning, Category Merchandising, {{vendor_name}} (if applicable)
**From:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{date}}
**Promotion:** {{promo_description}}

---

### Promotion Details

| Field | Value |
|---|---|
| SKU | {{sku}} — {{sku_description}} |
| Promotion Period | {{promo_start}} — {{promo_end}} ({{promo_weeks}} weeks) |
| Promotion Type | {{promo_type}} |
| Promotional Retail Price | ${{promo_price}} (regular: ${{reg_price}}, {{discount_pct}}% off) |
| Media Support | {{media_support}} (e.g., "Circular page 3 + endcap display") |
| Stores Participating | {{store_count}} of {{total_stores}} |

### Forecast

| Period | Baseline Forecast | Lift Estimate | Total Forecast | Confidence Range (±) |
|---|---|---|---|---|
| Pre-promo (week before) | {{baseline}} units | — | {{baseline}} units | — |
| Promo Week 1 | {{baseline}} | +{{lift_wk1}}% ({{lift_units_1}} units) | {{total_wk1}} units | ±{{conf_1}}% |
| Promo Week 2 | {{baseline}} | +{{lift_wk2}}% ({{lift_units_2}} units) | {{total_wk2}} units | ±{{conf_2}}% |
| Post-Promo Week 1 | {{baseline}} | −{{dip_wk1}}% ({{dip_units_1}} units) | {{post_1}} units | ±{{conf_post_1}}% |
| Post-Promo Week 2 | {{baseline}} | −{{dip_wk2}}% ({{dip_units_2}} units) | {{post_2}} units | ±{{conf_post_2}}% |
| Recovery (Week 3+) | {{baseline}} | — | {{baseline}} units | — |

**Total Promotional Period Demand:** {{total_promo_demand}} units
**Total Incremental Demand (above baseline):** {{incremental_demand}} units

### Assumptions and Methodology

1. **Baseline:** {{baseline_method}} (e.g., "Holt-Winters model fitted on de-promoted trailing 52-week data")
2. **Lift source:** {{lift_source}} (e.g., "Average of 3 most recent comparable promotions on this SKU, weighted 50/30/20 by recency")
3. **Cannibalization:** Estimated {{cannibalization_pct}}% cannibalization from {{cannibalized_sku}}, reducing net category lift to {{net_category_lift}}%
4. **Post-promo dip:** Based on {{dip_source}} (e.g., "Product type: shelf-stable pantry; historical dip factor 45% of incremental lift")
5. **Confidence range:** Based on historical promotional forecast accuracy for this category (trailing 12-month promo WMAPE: {{promo_wmape}}%)

### Inventory Requirements

| Item | Quantity |
|---|---|
| Current on-hand (DC + pipeline) | {{current_inventory}} units |
| Total demand through post-promo recovery | {{total_demand}} units |
| Gap to fill | {{gap_units}} units |
| Recommended PO quantity | {{po_qty}} units ({{cases}} cases) |
| PO must arrive by | {{po_arrive_by}} ({{lead_time_buffer}} days before promo start) |

### Risks

- **Upside risk:** If lift exceeds {{upside_lift}}%, we may stock out in week 2 of the promotion. Contingency: {{contingency_up}}.
- **Downside risk:** If lift is below {{downside_lift}}%, we will carry {{excess_if_low}} excess units post-promo, requiring {{excess_weeks}} additional weeks to sell through.

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_email}}

---

## 6. Safety Stock Adjustment Request

### When to Use
- Demand variability or lead time variability has changed, requiring a safety stock parameter update.
- Service level targets have been revised (up or down) for a segment or individual SKU.
- Post a supply disruption or regime change that permanently alters risk parameters.

### Tone Guidance
Analytical and justified. Every safety stock change is an inventory investment change. Present the before/after calculation, the reason for the change, and the financial impact (incremental holding cost or reduced stockout risk).

### Template

**Subject:** `Safety Stock Adjustment — {{sku_description}} — {{adjustment_direction}} by {{adjustment_pct}}%`

---

**To:** {{planning_manager}}, {{finance_contact}} (if material)
**From:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{date}}

**Item:** {{sku}} — {{sku_description}} ({{abc_class}})

### Reason for Adjustment

{{reason}} (e.g., "Vendor lead time has increased from 14 days to 28 days effective 2025-09-01. Lead time variability has also increased, with CV rising from 0.12 to 0.31.")

### Calculation

| Parameter | Previous | Updated | Change |
|---|---|---|---|
| Average weekly demand | {{prev_demand}} units | {{new_demand}} units | {{demand_change}} |
| Demand std. deviation (σ_d) | {{prev_sigma_d}} units | {{new_sigma_d}} units | {{sigma_d_change}} |
| Lead time (weeks) | {{prev_lt}} weeks | {{new_lt}} weeks | {{lt_change}} |
| Lead time std. deviation (σ_LT) | {{prev_sigma_lt}} weeks | {{new_sigma_lt}} weeks | {{sigma_lt_change}} |
| Service level target | {{service_level}} | {{service_level}} | No change |
| Z-score | {{z_score}} | {{z_score}} | No change |
| **Safety stock (units)** | **{{prev_ss}}** | **{{new_ss}}** | **+{{ss_delta}} units** |

### Financial Impact

- Incremental inventory investment: {{ss_delta}} units × ${{unit_cost}} = ${{incremental_investment}}
- Annual holding cost increase: ${{incremental_investment}} × {{holding_cost_pct}}% = ${{annual_holding_increase}}
- Expected stockout reduction: from {{prev_stockout_events}} events/year to {{new_stockout_events}} events/year
- Estimated recovered revenue: ${{recovered_revenue}}/year

**Net impact:** {{net_assessment}} (e.g., "The $2,400 annual holding cost increase is justified by the $18,000 in projected recovered revenue from reduced stockouts.")

### Approval Requested By

{{deadline}} — needed before the next replenishment cycle to take effect.

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_email}}

---

## 7. New Product Forecast Assumptions

### When to Use
- Documenting the forecast basis for a new product launch with < 8 weeks of own-history data.
- Required at the pre-launch planning meeting and updated at the 4-week and 8-week checkpoints.

### Tone Guidance
Transparent and falsifiable. The purpose of this document is to make every assumption explicit so that the post-mortem can identify where the forecast diverged from reality. Do not hedge with vague language — state the assumptions clearly so they can be validated or disproved.

### Template

**Subject:** `New Product Forecast Assumptions — {{sku_description}} — Launch {{launch_date}}`

---

**To:** Category Merchandising, Supply Chain Planning, Finance
**From:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{date}}

### Product Details

| Field | Value |
|---|---|
| SKU | {{sku}} — {{sku_description}} |
| Category | {{category}} / {{subcategory}} |
| Retail Price | ${{retail_price}} |
| Unit Cost | ${{unit_cost}} |
| Gross Margin | {{gross_margin_pct}}% |
| Launch Date | {{launch_date}} |
| Initial Distribution | {{store_count}} stores ({{pct_of_chain}}% of chain) |
| Vendor | {{vendor_name}} |
| Lead Time | {{lead_time}} weeks |
| Shelf Life | {{shelf_life}} |

### Analogous Items Selected

| Analog SKU | Description | Similarity Score | Launch Velocity (wks 1–13) | Current Velocity |
|---|---|---|---|---|
| {{analog_1_sku}} | {{analog_1_desc}} | {{analog_1_score}}/5.0 | {{analog_1_launch_vel}} units/store/week | {{analog_1_current_vel}} |
| {{analog_2_sku}} | {{analog_2_desc}} | {{analog_2_score}}/5.0 | {{analog_2_launch_vel}} units/store/week | {{analog_2_current_vel}} |
| {{analog_3_sku}} | {{analog_3_desc}} | {{analog_3_score}}/5.0 | {{analog_3_launch_vel}} units/store/week | {{analog_3_current_vel}} |

**Weighted average analog velocity (weeks 1–13):** {{weighted_avg_vel}} units/store/week

### Forecast by Phase

| Phase | Weeks | Velocity (units/store/wk) | Total Weekly Demand ({{store_count}} stores) | Confidence Band |
|---|---|---|---|---|
| Introduction | 1–4 | {{intro_vel}} | {{intro_weekly}} units | ±{{intro_conf}}% |
| Growth | 5–8 | {{growth_vel}} | {{growth_weekly}} units | ±{{growth_conf}}% |
| Stabilization | 9–13 | {{stable_vel}} | {{stable_weekly}} units | ±{{stable_conf}}% |

### Key Assumptions

1. {{assumption_1}} (e.g., "Product will receive endcap display in all {{store_count}} stores for weeks 1–4")
2. {{assumption_2}} (e.g., "No direct competitor launch in the same subcategory during the launch window")
3. {{assumption_3}} (e.g., "Price point is within the category's high-volume range ($3–$5)")
4. {{assumption_4}} (e.g., "Vendor will maintain {{lead_time}}-week lead time for reorders")

### Initial Buy and Reorder Plan

| Component | Quantity | Timing |
|---|---|---|
| Initial buy | {{initial_buy}} units | PO placed {{initial_po_date}} |
| Safety stock | {{initial_ss}} units (analog-based, 30% uncertainty premium) | Included in initial buy |
| First reorder trigger | If week 1–2 velocity > {{reorder_trigger}} units/store/week | Auto-trigger PO |
| Reserve for reorder | {{reserve_units}} units (held at vendor or allocated in budget) | Weeks 3–5 |

### Monitoring Plan

| Checkpoint | Date | Metric | Action if Below Plan | Action if Above Plan |
|---|---|---|---|---|
| Week 2 | {{wk2_date}} | Velocity vs. {{intro_vel}} target | Review display compliance; consider early promo | Place reorder for 50% of reserve |
| Week 4 | {{wk4_date}} | Sell-through vs. initial buy | Flag for promotional support | Place reorder for remaining reserve |
| Week 8 | {{wk8_date}} | Velocity trend (growing/declining/stable) | Initiate slow-mover review if declining for 4 wks | Upgrade to standard forecasting method |

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_email}}

---

## 8. Excess Inventory Liquidation Plan

### When to Use
- SKU has been classified as dead stock (zero sales for 13+ weeks) or critical excess (>26 weeks of supply).
- Seasonal product with unsold inventory after the markdown selling window.
- Discontinued product with remaining inventory after final markdown.

### Tone Guidance
Pragmatic and action-oriented. The liquidation plan is an acknowledgment that margin recovery is limited and the priority has shifted to cash recovery and warehouse space liberation. Present the options dispassionately — the goal is to make the best of a bad situation, not to relitigate the buying decision.

### Template

**Subject:** `Excess Inventory Liquidation Plan — {{sku_description}} — {{excess_units}} units`

---

**To:** {{merchandising_contact}}, {{finance_contact}}, {{warehouse_contact}}
**From:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{date}}

### Inventory Summary

| Metric | Value |
|---|---|
| SKU | {{sku}} — {{sku_description}} |
| Current On-Hand | {{excess_units}} units |
| Original Cost | ${{unit_cost}} per unit (${{total_cost}} total) |
| Current Retail | ${{current_retail}} (after markdowns) |
| Weekly Demand (trailing 8 weeks) | {{weekly_demand}} units |
| Weeks of Supply | {{excess_wos}} |
| Reason for Excess | {{reason}} |

### Liquidation Options Analysis

| Option | Recovery per Unit | Total Recovery | Timeline | Pros | Cons |
|---|---|---|---|---|---|
| **A: Deeper markdown ({{md_depth}}% off)** | ${{recovery_a}} | ${{total_a}} | {{timeline_a}} weeks | Retains customer; recovers shelf space gradually | Margin erosion; may not clear |
| **B: Liquidation channel** | ${{recovery_b}} | ${{total_b}} | {{timeline_b}} weeks | Immediate clearance; frees space | Very low recovery; no brand control |
| **C: Donation (tax write-off)** | ${{recovery_c}} (tax benefit) | ${{total_c}} | {{timeline_c}} weeks | Goodwill; tax benefit; immediate space recovery | No cash recovery |
| **D: Destroy / write-off** | $0 | $0 | Immediate | Frees space immediately; clean books | Total loss; disposal cost of ${{disposal_cost}} |

### Recommendation

Option {{recommended_option}} is recommended based on the following rationale:

{{recommendation_rationale}} (e.g., "Option B (liquidation) recovers $3,200 compared to Option A's $4,100 — but Option A requires 8 more weeks of shelf space that has a higher-value alternative use. The opportunity cost of holding the shelf space exceeds the $900 margin difference.")

### Execution Plan

| Step | Action | Owner | Deadline |
|---|---|---|---|
| 1 | Approve liquidation plan | {{approver}} | {{approval_date}} |
| 2 | Remove from active replenishment | Demand Planning | {{replenishment_stop_date}} |
| 3 | {{action_3}} | {{owner_3}} | {{date_3}} |
| 4 | {{action_4}} | {{owner_4}} | {{date_4}} |
| 5 | Confirm zero on-hand; close SKU in system | Warehouse / IT | {{close_date}} |

### Financial Summary

| Line Item | Amount |
|---|---|
| Original inventory investment | ${{total_cost}} |
| Revenue recovered (to date, markdowns) | ${{markdown_revenue}} |
| Projected recovery (this plan) | ${{projected_recovery}} |
| **Total write-down** | **${{total_writedown}}** |

### Post-Mortem Assignment

Root cause analysis for this excess is assigned to {{postmortem_owner}} with a due date of {{postmortem_date}}. The analysis should address: Was this a forecast error, a buying decision error, a market change, or a timing issue? What process change would prevent recurrence?

{{our_contact_name}}
{{our_contact_title}} | {{our_contact_email}} | {{our_contact_phone}}
