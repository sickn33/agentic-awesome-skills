# Inventory Demand Planning — Edge Cases Reference

> Tier 3 reference. Load on demand when handling complex or ambiguous demand planning situations that don't resolve through standard forecasting and replenishment workflows.

These edge cases represent the scenarios that separate experienced demand planners from everyone else. Each one involves competing signals, imperfect data, time pressure, and real financial exposure. They are structured to guide decision-making when standard models break down.

---

## How to Use This File

When a planning situation doesn't fit a clean pattern — when demand signals conflict, when models fail silently, or when the financial exposure justifies deeper analysis — find the edge case below that most closely matches the situation. Follow the expert approach step by step. Document every assumption and override so the decision can be audited at post-mortem.

---

### Edge Case 1: New Product Launch with Zero History and No Close Analog

**Situation:**
A retailer's private-label team is launching a plant-based protein bar in a new flavor profile (mango turmeric) that has no direct precedent in their assortment or their competitors'. The product will launch in 120 stores across the Southeast region. Retail price is $3.49 per bar, case pack of 12, with a vendor cost of $1.85. The vendor requires a minimum initial order of 10,000 units (833 cases) with a 6-week lead time for reorder. The merchandising team is projecting "strong performance" based on consumer trend data showing plant-based snacking growing 22% YoY, but has no quantitative forecast. The product has a 9-month shelf life.

**Why It's Tricky:**
There is no demand history for this exact item, and the nearest analogs (existing protein bars, existing plant-based snacks) are imperfect matches. The mango turmeric flavor is novel — it could be a breakout trend or a niche product. The 6-week reorder lead time means you cannot react quickly if the product takes off, but the 9-month shelf life means overstock is not immediately catastrophic. The merchandising team's qualitative confidence is not a substitute for a quantitative forecast.

**Common Mistake:**
Accepting the merchandising team's optimistic "gut feel" as the forecast and ordering aggressively. Or, conversely, ordering so conservatively that the product launches out-of-stock in week 2, killing momentum and making the launch look like a failure when it was actually a supply failure.

**Expert Approach:**
1. Build a structured analog set. Score candidates on category (snack bars), price point ($3–$4), brand tier (private label), format (single serve), and target demo (health-conscious). Select the top 3–5 analogs even if they're imperfect.
2. Compute the median weekly velocity of the analogs at the same lifecycle stage (launch weeks 1–13). Weight by analog similarity score. Typical private-label snack bar launch velocity is 2–4 units/store/week after the trial bump.
3. Build three scenarios: conservative (2 units/store/week), base (3.5 units/store/week), optimistic (6 units/store/week). For 120 stores, this yields weekly demand of 240, 420, or 720 units.
4. Initial buy: commit to the base scenario for weeks 1–8 (420 × 8 = 3,360 units), plus safety stock at the conservative rate for the 6-week reorder lead time (240 × 6 × 1.3 buffer = 1,872 units). Total initial order: ~5,232 units. This is below the vendor's 10,000 MOQ.
5. Negotiate with the vendor: either accept the 10,000 MOQ (accepting ~10 weeks of forward stock at base rate, which is fine given 9-month shelf life), or negotiate a 5,000-unit initial order with a committed reorder at week 4 based on early sell-through.
6. Set weekly POS monitoring triggers: if week-1 velocity > 5 units/store/day, escalate to the optimistic scenario and place reorder immediately. If week-2 velocity < 1.5 units/store, flag for review — the product may be underperforming.
7. Plan a week-3 evaluation checkpoint with merchandising. If sell-through is < 40% of base scenario, begin discussing promotional support. If > 150%, ensure reorder is en route.

**Documentation Required:**
- Analog selection with scoring rationale
- Three-scenario forecast with assumptions
- Initial buy calculation with safety stock methodology
- Vendor MOQ negotiation outcome
- Monitoring triggers and escalation plan
- Week-3 checkpoint agenda

**Resolution Timeline:**
- Weeks -8 to -6: Analog selection, scenario modeling, initial buy decision
- Weeks -6 to -4: PO placement, promotional material preparation
- Week 0: Launch
- Weeks 1–3: Daily POS monitoring against scenarios
- Week 3: First checkpoint with merchandising
- Week 4: Reorder decision based on actual sell-through

---

### Edge Case 2: Viral Social Media Spike — 10× Demand with No Warning

**Situation:**
A mid-tier kitchen gadget (a silicone garlic peeler, retail $8.99, category C-item averaging 15 units/week across 80 stores) suddenly goes viral on TikTok. A cooking influencer with 4.2M followers posted a 45-second video using the product, and it accumulated 8M views in 48 hours. Store-level POS data shows demand jumped to 180 units/day across the chain (vs. the normal ~2 units/day) starting Tuesday morning. Your DC has 2,400 units in stock. The vendor is a small importer based in Portland with 8-week lead time from their factory in Shenzhen. Your last PO for this item was 3 months ago for 1,200 units.

**Why It's Tricky:**
The instinct is to chase the demand — place a massive order and ride the wave. But viral demand follows a power-law decay curve, not a sustained step change. By the time a 8-week-lead-time order arrives, the spike is almost certainly over. Meanwhile, your DC inventory will be exhausted in 13 days at current run rate, and you'll be out of stock for 6+ weeks. Customers who can't find it will buy from Amazon.

**Common Mistake:**
Ordering 10,000+ units from the vendor based on the spike's peak demand. When the order arrives 8 weeks later, demand has returned to 20–30 units/week (slightly elevated baseline), and you're sitting on 10,000 units — 300+ weeks of supply.

**Expert Approach:**
1. Do NOT place a large emergency order based on peak demand. Viral spikes typically follow this decay pattern: peak in days 1–5, 50% decay by day 10, 80% decay by day 21, new baseline establishes by day 30–45 (usually 1.5–3× the pre-viral level).
2. With 2,400 units in DC and ~180 units/day demand, you have ~13 days of supply. Implement allocation rules immediately: cap store-level fulfillment at 3× historical daily average (6 units/store/day max). This stretches DC supply to ~20 days and prevents a single high-traffic store from claiming all the inventory.
3. Contact the vendor. Determine: (a) do they have any finished goods inventory in Portland? (b) can they expedite a partial shipment by air from Shenzhen? (c) what is the minimum order for an air shipment? Air freight at ~$5/unit on a $4.50 cost item is expensive but justified if you can capture $8.99 retail during the spike.
4. Place a modest reorder: 2,000–3,000 units (not 10,000). If the vendor can air-ship 500 units in 7–10 days, do that for immediate demand. The remaining 2,000 by ocean in 8 weeks will arrive when the new baseline is establishing.
5. Monitor the TikTok video and social conversation daily. Track engagement rate decay. When the video drops off the "For You" page algorithm (typically day 7–14), demand will fall sharply.
6. After the spike subsides (day 30+), assess the new baseline. If it's 2–3× the pre-viral level, adjust the forecast model upward. If it's back to pre-viral levels, return to the standard model. Do not permanently inflate the forecast based on a one-time event.

**Key Indicators:**
- Social media engagement half-life (how quickly the video's daily views are declining)
- Store-level POS day-over-day trend (is demand decelerating?)
- Amazon price and availability for the same or similar product (competitor action)
- Geographic concentration of demand (if concentrated in a few markets, the spike is more narrow)

**Documentation Required:**
- Social media monitoring data (daily view counts, engagement)
- Daily POS data at store level during the spike
- Allocation rules implemented and their rationale
- Vendor communication log and order decisions
- Post-spike baseline reassessment (at day 30 and day 60)

**Resolution Timeline:**
- Hours 0–4: Detect the spike via POS anomaly alerts; identify the social media source
- Hours 4–12: Implement store-level allocation caps; contact vendor for emergency supply
- Day 1–3: Monitor daily POS; track social media engagement decay
- Day 3–7: If spike sustaining, place modest reorder (air freight if available)
- Day 7–14: Social media engagement typically decays below threshold; spike decelerating
- Day 21–30: Demand settling to new baseline; assess whether permanent elevation occurred
- Day 30–45: Final baseline recalibration; close event; update model if sustained lift > 50%

**Financial Impact:**
A C-item at $8.99 retail and 15 units/week going to 180 units/day represents a revenue jump
from ~$135/week to ~$11,328/week — an 84× increase. With 2,400 units in DC, the captured
revenue is ~$21,576 before stockout. Chasing with a 10,000-unit ocean order ($45,000 at cost)
that arrives to 25 units/week demand creates $39,375 in excess inventory. The smart play
(500-unit air shipment + 2,000-unit modest ocean order) captures ~$8,500 in additional revenue
during the tail of the spike while limiting overage risk to ~$3,500 in excess inventory.

---

### Edge Case 3: Supplier Lead Time Doubles Overnight — Single-Source Critical Item

**Situation:**
Your primary vendor for organic olive oil (an A-item, $12.99 retail, ~800 units/week across 150 stores) notifies you that their lead time is increasing from 14 days to 28 days effective immediately. The cause: their Mediterranean source experienced a poor harvest season, and the vendor is now sourcing from a secondary supplier in South America, which adds transit and quality testing time. You currently have 2,800 units in DC (3.5 weeks of supply at current demand) and a PO for 2,400 units that was due in 10 days but is now due in 24 days. Your safety stock calculation was based on the old 14-day lead time.

**Why It's Tricky:**
Your safety stock was calibrated for 14-day lead time. At the old lead time, your safety stock formula was: SS = 1.65 × 120 × √2 = 280 units (where σ_d = 120 units/week, LT = 2 weeks). Now LT = 4 weeks, so SS should be: 1.65 × 120 × √4 = 396 units. But you also need to recalculate the reorder point: ROP = d_avg × LT + SS = 800 × 4 + 396 = 3,596 units. You currently have IP = 2,800 + 2,400 = 5,200 units. That seems sufficient, but the in-transit PO is delayed by 14 days, meaning your effective on-hand for the next 24 days is only 2,800 units, which covers 3.5 weeks — less than the new 4-week lead time.

**Common Mistake:**
Accepting the vendor's new lead time without recalculating safety stock and reorder points. The planner orders the same quantities at the same frequency and discovers a stockout 3 weeks later when the gap becomes visible.

**Expert Approach:**
1. Immediately recalculate safety stock and reorder points using the new 28-day lead time. Document the before/after impact.
2. Assess the inventory gap: Current on-hand (2,800) will last 3.5 weeks. The delayed PO (2,400 units) arrives in 24 days (~3.4 weeks). At 800 units/week consumption, you'll need 800 × 3.4 = 2,720 units in those 3.4 weeks, leaving only 80 units when the PO arrives — essentially zero safety stock.
3. Place an emergency order immediately. Target quantity: enough to bridge the gap plus rebuild safety stock. Emergency order = (new SS − projected SS at PO arrival) + buffer = (396 − 80) + 400 = ~716 units. Round up to a case pack multiple.
4. Contact the vendor: can they expedite any portion of the delayed PO? Even splitting it — 1,200 units at the original 14-day lead time and 1,200 at 28 days — would dramatically improve the position.
5. Qualify a secondary supplier. Even if the secondary vendor has a higher cost or lower quality tier, having a backup prevents single-source dependency. Begin the qualification process immediately — don't wait for the crisis to deepen.
6. Consider temporary demand-side measures: can you reduce facings (from 3 facings to 2) to slow sell-through without creating a visible out-of-stock? Can you substitute a different size (e.g., 25 oz instead of 16 oz) to spread demand across SKUs?
7. Communicate to merchandising: service level on this item will temporarily drop from 97% to ~92% for the next 4–6 weeks. If this is unacceptable, discuss promotional alternatives or substitution strategies.

**Documentation Required:**
- Before/after safety stock and ROP calculations
- Inventory position timeline projection (weekly, for the next 8 weeks)
- Emergency order details and vendor response
- Secondary supplier qualification plan with timeline
- Communication to merchandising and category management

**Resolution Timeline:**
- Hour 0: Vendor notification received
- Hours 0–4: Recalculate safety stock, ROP, and inventory position with new lead time
- Hours 4–8: Place emergency order for the inventory gap
- Day 1–2: Contact vendor to negotiate partial early shipment of delayed PO
- Week 1: Begin secondary supplier qualification process
- Week 1–2: Communicate revised service level expectations to merchandising
- Weeks 2–6: Monitor inventory position weekly against projections
- Weeks 6–8: Assess whether lead time has stabilized; update parameters permanently if so
- Week 12: Review secondary supplier qualification status; decide whether to dual-source

**Dual-Source Strategy Post-Crisis:**
After any single-source lead time shock, evaluate dual-sourcing economics:
- If the category is A-tier (>$500K annual purchases), dual-source at 70/30 split.
  The 30% secondary supplier provides insurance and keeps the primary vendor competitive.
- If B-tier ($100K–$500K), qualify a backup but keep orders single-source until triggered.
- If C-tier (<$100K), the qualification cost may exceed the risk. Accept single-source
  and carry additional safety stock instead.

---

### Edge Case 4: Unplanned Competitor Promotion Causes Demand Drop — Cannibalization You Didn't Plan

**Situation:**
Your chain's premium laundry detergent (Tide Ultra, A-item, $13.99, ~600 units/week across 120 stores) shows a sudden 35% velocity decline starting this week. POS data confirms it — down to ~390 units/week. There is no quality issue, no out-of-stock, and no change in shelf placement. A field report from a regional manager reveals that a competing national chain launched an aggressive BOGO promotion on their comparable Persil product, and a mass-market competitor is running a 40% off promotion on their private-label equivalent. Neither of these competitive actions was in your promotional calendar or forecasting inputs.

**Why It's Tricky:**
Your forecast model doesn't incorporate competitive promotional activity (most don't). The model will treat this as an unexplained demand drop and slowly adjust the baseline downward — which is wrong, because the competitive promotions will end in 2–3 weeks and your demand will recover. If you let the model self-correct, it will under-forecast the recovery period, leading to a stockout when competitive promotions end and demand snaps back.

**Common Mistake:**
Letting the automated forecast adjust downward based on the depressed actual sales. The model doesn't know why sales dropped, so it interprets it as a trend change. Two weeks later, when demand recovers, the system doesn't have enough inventory because it ordered based on the depressed forecast.

**Expert Approach:**
1. Confirm the cause: verify the competitive promotion through field observation, competitive intelligence, or syndicated data (Nielsen/IRI). Don't assume — there could be multiple causes.
2. Once confirmed, apply a manual forecast override for the promotional period. Set the forecast to the depressed level (390 units/week) for the known duration of the competitive promotion (typically 2–4 weeks).
3. Critically: also apply a forward override for the recovery period. When the competitive promo ends, expect a 10–20% bounce-back above the pre-event baseline for 1–2 weeks as customers who delayed purchases return. Set the recovery forecast to 660–720 units/week for weeks 1–2 post-competitive-promo.
4. Adjust incoming orders: reduce the next 2 POs by the difference (600 → 390 = 210 units/week reduction). But do NOT cancel or defer orders that would leave you short during the recovery.
5. Brief merchandising: "Tide is down 35% this week due to competitive BOGO on Persil at [competitor]. We project this lasts 2–3 weeks. We do not recommend a reactive promotion — it would erode margin without recovering the lost volume (customers have already stockpiled from the competitor). Recommend holding price and capturing the recovery."
6. After the event, mark these 2–4 weeks as "competitive interference" in the demand history so the baseline model excludes them from future training data.

**Key Indicators:**
- Duration of the competitive promotion (check competitor circulars/websites weekly)
- Whether additional competitors pile on (competitive cascades happen in laundry, soda, and cereal)
- Whether the demand recovery follows the expected bounce-back pattern
- Whether the competitive promotion was a one-time event or signals a strategic price repositioning

**Documentation Required:**
- Competitive intelligence source and verification
- Manual override with reason code "competitive_promo_external"
- Adjusted PO schedule for the event window
- Recovery forecast and rationale
- Post-event analysis comparing actuals to the override forecast

**Resolution Timeline:**
- Day 0–1: Detect the velocity drop; confirm competitive cause via field reports
- Day 1–2: Apply manual forecast override for the dip and the expected recovery
- Day 2–5: Adjust incoming POs downward for the promotional window
- End of competitive promo + 2 weeks: Analyze recovery pattern vs. forecast
- End of competitive promo + 4 weeks: Close out event; tag demand history; update model

**Financial Impact Quantification:**
Compute the lost margin during the event: (normal demand − actual demand) × unit margin × duration.
For this example: (600 − 390) × ~$4.00 margin × 3 weeks = ~$2,520 lost margin from volume loss.
Compare this to the cost of a reactive promotion (which would typically cost $3,000–$5,000 in margin
erosion for a category this size) to justify the "hold price" recommendation.

---

### Edge Case 5: Demand Pattern Regime Change — Model Fails Silently

**Situation:**
A popular breakfast cereal (Cheerios 18 oz, B-item, $4.29, ~400 units/week across 100 stores) has been forecasted with Holt-Winters for 3 years with stable seasonal patterns and WMAPE of 18%. Over the past 6 weeks, the model's tracking signal has crept from +1.5 to +4.8, indicating systematic positive bias (forecast > actuals). Actual sales have declined from 400 units/week to 310 units/week with no promotional activity, no competitive change, and no price change. A deeper look reveals that a competitor launched a new high-protein cereal at the same price point 8 weeks ago, and your chain's health-conscious customer segment is shifting to it.

**Why It's Tricky:**
This is a permanent demand level shift, not a temporary dip. The Holt-Winters model's seasonal component will eventually adapt, but the level component (alpha) adapts slowly — especially if alpha is set low (e.g., 0.1–0.2) for stability. The model will take 10–15 more weeks to self-correct, during which time it will consistently over-forecast, creating excess inventory.

**Common Mistake:**
Waiting for the model to self-correct. Or, conversely, panicking and switching the model entirely when a simple level adjustment would suffice.

**Expert Approach:**
1. Confirm the regime change: the tracking signal at +4.8 for 2+ periods is a clear indicator. Verify by computing the new mean demand (310 units/week) and comparing to the model's level component.
2. Do NOT switch the forecast model yet. The seasonal pattern may still be valid — the item is still seasonal cereal. What changed is the level (intercept), not the pattern.
3. Apply a one-time level adjustment: reset the Holt-Winters level component to the current 4-week average (310 units/week). Keep the seasonal indices and trend parameters. Re-initialize the model from this new level.
4. Increase alpha temporarily (from 0.15 to 0.25) for the next 8 weeks to allow faster adaptation, then return to the standard alpha.
5. Immediately recalculate safety stock using σ_d from the recent 8 weeks (which reflects the new demand regime), not the trailing 52 weeks.
6. Reduce open POs to match the new run rate. Cancel or defer any POs that would push weeks of supply above 8 at the new demand level.
7. Classify the competitor product as a "regime change event" and add it to the demand planning log. Propose to merchandising that they evaluate their assortment response (match the competitor product, promote Cheerios, or accept the share loss).

**Key Indicators:**
- Tracking signal trend (is it stabilizing at the new level or still diverging?)
- Competitor product's velocity (is it still growing, or has it plateaued?)
- Category total velocity (is the category growing, or is this a zero-sum shift?)
- Customer switching behavior (if loyalty card data is available)

**Documentation Required:**
- Tracking signal history showing the drift from normal to ±4.8
- Before/after forecast comparison at the new demand level
- Safety stock recalculation with the new σ_d
- PO adjustment details (quantities deferred or cancelled)
- Root cause classification (competitive entry, consumer preference shift, etc.)
- Merchandising communication and their response

**Resolution Timeline:**
- Day 0: Tracking signal triggers model review
- Day 1–3: Confirm regime change vs. temporary dip; analyze root cause
- Day 3–5: Apply level adjustment; recalculate safety stock; adjust POs
- Weeks 2–8: Monitor with elevated alpha; confirm model is tracking the new level
- Week 8: Return alpha to standard; close the event
- Week 12: Retrospective — was the level shift permanent or did it partially reverse?

**Frequency of Occurrence:**
Regime changes affect 5–10% of SKUs annually. The most common causes are competitive
entry/exit (40%), reformulation or packaging changes (25%), price repositioning (20%),
and distribution changes (15%). The key is detecting them quickly — every week of delay
in responding to a downward regime change adds ~1 week of excess inventory.

---

### Edge Case 6: Phantom Inventory — System Shows Stock, Shelves Are Empty

**Situation:**
Your highest-velocity SKU in the beverage category (a 24-pack water case, A-item, ~1,200 units/week across 80 stores) has been showing 95%+ in-stock rate in the system, but customer complaints about out-of-stocks have tripled in the past month. The WMS shows 3,400 units at the DC and the stores collectively show 2,100 units on hand. However, three separate stores have reported that they can't find the product despite the system showing 50–80 units each. A partial cycle count at the DC reveals an actual count of 2,100 units — the WMS is overstating by 1,300 units (38% phantom inventory).

**Why It's Tricky:**
Every replenishment decision for the past several weeks has been based on a position that was 1,300 units higher than reality. The system thinks the DC has 4.7 weeks of supply when it actually has 2.9 weeks. Stores are running out because store-level inventory is also likely overstated (if receiving errors or shrinkage are the cause). The problem is almost certainly not limited to this one SKU — whatever process caused the phantom inventory (receiving errors, system timing, shrinkage) is likely affecting other items.

**Common Mistake:**
Correcting the inventory in the WMS and moving on. The correction fixes the symptom but not the cause. Next month, phantom inventory will reappear.

**Expert Approach:**
1. Immediately conduct a full physical count on this SKU at the DC and at the 10 highest-volume stores. Adjust WMS/POS inventory records to match physical counts.
2. Recalculate the inventory position with corrected numbers. You likely need to place an emergency order — the corrected IP is probably below the reorder point.
3. Place an emergency order: the delta between the old (phantom) IP and the corrected IP is 1,300 units at the DC alone, plus whatever store-level adjustments are needed. Rush this order if possible.
4. Investigate the root cause of the phantom inventory:
   - **Receiving error:** Were units scanned into the WMS but physically not there? Check receiving logs against PO quantities for the past 60 days.
   - **Shrinkage:** Is this a high-theft item? Water cases are not typically theft targets, so this is less likely.
   - **System timing:** Is there a lag between physical movement and WMS update (e.g., cross-dock items that are "received" but immediately shipped to stores without a separate ship transaction)?
   - **Return processing:** Were damaged/returned units re-entered into available inventory without physical verification?
5. Expand the investigation. Run a phantom inventory screening across all A-items: pull any SKU where the system in-stock rate is > 95% but customer complaints or lost sales proxy metrics (search-to-purchase ratio, substitute purchase rate) indicate stockouts. These are your phantom inventory suspects.
6. Implement a cycle count program targeting high-velocity items quarterly and any item with a discrepancy > 10% between system and physical counts.
7. Adjust safety stock upward by 10–15% for the category until the root cause is resolved and verified, to buffer against ongoing phantom inventory risk.

**Documentation Required:**
- Physical count vs. system count by location
- Root cause investigation findings
- Emergency order details
- Expanded screening results for other SKUs
- Cycle count program specification
- Safety stock adjustment and rationale

**Resolution Timeline:**
- Day 0: Customer complaints or lost-sales signals trigger investigation
- Day 0–1: Physical count at DC; confirm phantom inventory exists
- Day 1–2: Adjust WMS records; place emergency order; expand screening to all A-items
- Days 3–7: Physical counts at top 20 stores on the affected SKU
- Weeks 1–2: Root cause investigation across receiving, shrinkage, and system processes
- Week 3: Implement corrective action (process change, cycle count program)
- Month 2–3: Monitor for recurrence; verify corrective action effectiveness

**Financial Impact:**
Phantom inventory has a dual cost: (1) the lost sales from stockouts that the system didn't
predict (in this case, ~300 units/week × $sell_price = significant revenue), and (2) the
upstream effects — overstated inventory means the replenishment system didn't trigger orders
when it should have, creating a cascading supply gap. For an A-item at 1,200 units/week,
even a 20% phantom inventory rate translates to ~240 lost sales per week, which at $5 retail
is $1,200/week in lost revenue, or ~$62,400/year for a single SKU.

---

### Edge Case 7: Vendor MOQ Conflict — Ordering Constraint vs. Demand Reality

**Situation:**
You carry a specialty imported Italian pasta brand (5 SKUs, each averaging 30–50 units/week across 60 stores). The vendor's minimum order quantity is 500 units per SKU per order, and they only accept orders on a monthly basis (once per month, delivery in 3 weeks). For a SKU averaging 40 units/week, the MOQ of 500 units represents 12.5 weeks of supply. With a 7-week order cycle (4-week review + 3-week lead time), your target order-up-to level should be about 360 units (7 weeks × 40 + safety stock). The MOQ forces you to order 39% more than you need.

**Why It's Tricky:**
You can't order less than the MOQ, but ordering 500 units every month means you're always carrying ~5 weeks of excess inventory. Across 5 SKUs, that's 2,500 excess units at ~$3.50 cost each = ~$8,750 in excess inventory investment. The holding cost (25% annually = ~$0.07/unit/week) seems small per unit but adds up to ~$9,100/year in excess carrying cost across the 5 SKUs. This isn't a one-time problem — it recurs every month.

**Common Mistake:**
Accepting the MOQ without quantifying the cost. Or, alternatively, fighting the vendor on MOQ without considering the alternatives.

**Expert Approach:**
1. Quantify the total cost of the MOQ constraint: annual excess holding cost ($9,100), waste risk (if shelf life is limited), and opportunity cost of the working capital.
2. Evaluate options in order:
   a. **Negotiate a dollar minimum instead of unit minimum:** If you order all 5 SKUs together, the combined order is 2,500 units × $3.50 = $8,750 per order. Propose a $6,000 order minimum with flexibility to allocate across SKUs based on need. Many importers prefer this because they still get a meaningful order.
   b. **Extend the review period:** Instead of monthly orders, order every 6 weeks. This increases the target order-up-to level, making the MOQ less excessive. But it also increases safety stock needs.
   c. **Accept the MOQ for top 2–3 SKUs and negotiate lower for the bottom 2:** Concentrate volume on the fast movers and ask for 300-unit MOQ on the slowest.
   d. **Cross-dock or consolidate with other retailers:** If you're part of a buying group or co-op, combine orders with other members to share the MOQ.
   e. **Assess the overage as forward stock:** If the product has 18+ months of shelf life, 12.5 weeks of supply is tolerable. The holding cost may be acceptable relative to the value of carrying the brand.
3. Before negotiating, know your BATNA: are there alternative Italian pasta brands with better terms? What would switching cost (delisting fees, lost loyal customers)?
4. Propose a 6-month trial: "We'd like to test a $5,000 minimum order across the 5 SKUs for Q3 and Q4. If our order frequency and reliability are maintained, we'd like to formalize this for the annual agreement."

**Key Indicators:**
- Shelf life remaining on excess inventory (critical for food products)
- Sell-through rate of excess units before the next order arrives
- Whether the vendor has other regional customers you could consolidate with
- Total vendor spend as leverage for negotiation

**Documentation Required:**
- Annual excess holding cost calculation per SKU and total for the vendor
- Vendor negotiation correspondence and outcome
- Comparison of options evaluated (lower MOQ vs. dollar minimum vs. accept overage)
- Any agreed trial terms and review dates

**Resolution Timeline:**
- Month 0: Quantify the MOQ cost impact across all SKUs from this vendor
- Month 0–1: Prepare negotiation package; identify BATNA (alternative suppliers)
- Month 1: Present to vendor at the next order cycle or QBR
- Month 2: Implement the agreed terms on a 6-month trial basis
- Month 8: Review trial results; formalize in the annual vendor agreement

**MOQ Impact Calculator (per SKU):**
```
Excess Units per Order = MOQ − EOQ (or optimal order quantity)
Annual Orders = 52 / (MOQ / Weekly Demand)
Annual Excess Units = Excess per Order × Annual Orders
Annual Excess Holding Cost = Annual Excess Units × Unit Cost × Holding Cost %
```

For the pasta example: Excess = 500 − 280 = 220 units per order. Annual orders = 52 / (500/40) = ~4.2.
Annual excess units = 220 × 4.2 = ~924. Holding cost at 25% on $3.50 cost = 924 × $0.875 = ~$809/year.
Across 5 SKUs with similar profiles, that's ~$4,000/year — worth negotiating but not worth losing the brand.

---

### Edge Case 8: Holiday Calendar Shift — Easter Moves 3 Weeks, Forecast Breaks

**Situation:**
Last year Easter fell on March 31. This year it falls on April 20 — a 3-week shift. Your seasonal candy category (Easter chocolate, jelly beans, marshmallow Peeps) typically sees a 6-week selling season centered on Easter week. Your Holt-Winters model uses 52-week seasonal indices. Because Easter shifted, the model is projecting peak demand in the same calendar weeks as last year (weeks 10–13) rather than the correct weeks (weeks 13–16 this year). The seasonal indices are aligning to the wrong calendar weeks.

**Why It's Tricky:**
Holt-Winters seasonal indices are indexed to week numbers, not to event dates. A 3-week shift in Easter means the model peaks 3 weeks too early. If you follow the model, you'll over-order for late March (building inventory for a peak that doesn't come) and under-order for mid-April (missing the actual peak). The financial exposure is significant: Easter candy is a $200K–$400K category with 15–20% margins on regular items and near-zero margin on post-Easter clearance.

**Common Mistake:**
Running the Holt-Winters model without adjusting for the holiday shift. Or manually shifting the seasonal indices but forgetting to shift the promotional calendar, vendor order deadlines, and markdown timing.

**Expert Approach:**
1. Before the forecasting cycle begins (typically 12–16 weeks before Easter), compute the calendar-week shift: ΔW = Easter_this_year_week − Easter_last_year_week. This year, ΔW = +3 weeks.
2. Shift the seasonal indices: for any SKU with Easter-linked seasonality, shift the 52-week seasonal index array by ΔW positions. Index for week 10 last year now applies to week 13 this year.
3. Apply the same shift to the build schedule: the 6-week selling window moves from weeks 8–13 (last year) to weeks 11–16 (this year). Vendor orders that were placed in January for March delivery now need to be placed for April delivery.
4. Shift the markdown timing: post-Easter clearance moves from week 14 (last year) to week 17 (this year). Any markdown price changes scheduled for the old dates must be updated.
5. Coordinate with store operations: Easter display set dates, endcap resets, and seasonal aisle transitions all shift by 3 weeks.
6. Validate with at least 3 prior Easter years that show similar shifts. Look at 2019 (April 21) as the closest date comparator for demand patterns.
7. Watch for interaction effects: if the shifted Easter overlaps with spring break schedules differently than last year, travel-related demand patterns (convenience stores, airports) may not follow the standard shift formula.
8. Model the "gap" period: the 3 weeks between last year's Easter and this year's Easter will have lower demand than last year's model suggests but higher demand than a non-Easter baseline. Use a blended estimate.

**Documentation Required:**
- Holiday shift calculation and affected SKUs
- Shifted seasonal indices (before and after)
- Adjusted vendor order schedule
- Adjusted markdown timing
- Promotional calendar updates
- Historical comparisons to similar-dated Easters

**Financial Impact:**
Easter candy is typically a $200K–$400K category for a mid-size retailer. A 3-week
misalignment in seasonal indices can cause 25–35% of that inventory to be mistimed:
arriving too early (incurring holding cost and space conflict) or peaking when demand
has already shifted. Markdowns on Easter-specific product (chocolate bunnies, egg-shaped
candy) are particularly steep because the product has zero value after Easter weekend.
A mistimed buy can easily cost $30K–$60K in margin erosion on a category this size.

**Other Holiday Shifts to Monitor:**
- **Thanksgiving:** Always the 4th Thursday of November, but the gap between Thanksgiving
  and Christmas (22–29 days) affects holiday season build timing.
- **Ramadan:** Shifts ~11 days earlier each year (lunar calendar). Critical for retailers
  with significant Muslim customer demographics. Specialty food demand shifts.
- **Chinese New Year:** Falls between Jan 21 and Feb 20. Affects import lead times from
  China by 2–3 weeks (factory closures).
- **Back-to-school:** Not a fixed holiday but a regional event. Northern states start
  in late August; Southern states start in early August. A planner managing both regions
  needs different seasonal indices for the same categories.

---

### Edge Case 9: Weather-Sensitive Demand Miscalculation — Heat Wave in March

**Situation:**
An unexpected early heat wave hits the Southeast (temperatures 15–20°F above normal for 10 days in mid-March). Your forecast models are projecting normal March demand for summer-seasonal categories: bottled water, sunscreen, ice cream, fans, and outdoor furniture. POS data on day 2 of the heat wave shows bottled water up 280%, sunscreen up 420%, and ice cream up 190%. Your DC has standard March inventory levels for these categories — roughly 3–4 weeks of supply at normal March rates, which translates to 8–12 days at the spiked demand.

**Why It's Tricky:**
Weather-driven demand spikes are temporary but intense. The heat wave will end in 10 days, but you'll have stockouts within 5–7 days on the fastest-moving items. Unlike seasonal ramp-up (which is gradual), this is a step-change. Your vendors are also not expecting March orders at summer volumes. And if you over-react and place summer-sized orders, you'll have excess when temperatures normalize, especially for sunscreen (which most customers won't need again until actual summer).

**Common Mistake:**
Treating the heat wave as the start of summer. Placing orders sized for sustained summer demand when this is a 10-day weather event. Or, alternatively, doing nothing because "March orders are already placed" and letting stores run out.

**Expert Approach:**
1. Separate items into "weather-temporary" and "weather-pull-forward" categories:
   - **Weather-temporary:** Items consumed during the heat wave that won't reduce summer demand (e.g., ice cream eaten today doesn't reduce ice cream eaten in July). These need incremental inventory for the event only.
   - **Weather-pull-forward:** Items purchased now that would have been purchased later (e.g., sunscreen, fans). These pull demand from the summer season — over-ordering now creates a surplus later.
2. For weather-temporary items (water, ice cream): place an emergency order sized for 10 days of elevated demand minus current inventory. Use regional distributors or DSD (direct-store-delivery) vendors who can respond in 24–48 hours.
3. For weather-pull-forward items (sunscreen, fans, outdoor furniture): order conservatively. These customers are buying their summer supply early. Order enough to cover the current spike (5–7 days of additional supply) but reduce your planned April/May orders by the same amount.
4. Communicate to stores: allocate weather-sensitive items based on geographic proximity to the heat wave. Stores in the affected region get priority; stores in unaffected northern markets maintain normal allocations.
5. After the heat wave: analyze the demand transfer. For pull-forward categories, compute how much April/May demand was pulled into March and adjust the summer season forecast downward accordingly.
6. Do NOT let the heat wave contaminate the seasonal baseline model. Tag these 10 days as "weather event" in the demand history so the model ignores them when computing seasonal indices for next year.

**Documentation Required:**
- Weather forecast data (NWS source) and affected geographic regions
- Category classification: weather-temporary vs. weather-pull-forward
- Emergency order details by category
- Store allocation rules during the event
- Post-event demand transfer analysis
- Demand history tagging for model hygiene

**Resolution Timeline:**
- Day 0–1: Weather alert triggers category review; classify temporary vs. pull-forward
- Day 1–2: Place emergency orders for weather-temporary items via DSD and regional distributors
- Day 2–3: Adjust allocations to stores in the affected region; reduce allocations to unaffected regions
- Day 5–7: Monitor if the heat wave is extending beyond 10 days; adjust orders if so
- Post-event (day 12–15): Analyze demand transfer for pull-forward categories
- Post-event (day 20–30): Adjust forward forecasts for summer categories downward by the pull-forward amount
- Post-event: Tag affected days in demand history; run model hygiene cleanup

**Common Weather Events and Their Demand Impact:**

| Weather Event | Key Categories Affected | Typical Demand Change | Duration |
|---|---|---|---|
| Heat wave (10+ days above normal) | Water, ice cream, fans, sunscreen, outdoor | +100–400% | 7–14 days |
| Cold snap (10+ days below normal) | Soup, hot chocolate, space heaters, rock salt | +80–250% | 5–10 days |
| Hurricane / major storm (pre-landfall) | Water, batteries, flashlights, canned food, generators | +500–1000% | 2–4 days pre-event |
| Blizzard / ice storm | Bread, milk, eggs ("French toast index"), shovels | +200–500% | 1–3 days pre-event |
| Extended rain | Umbrellas, rain gear, indoor entertainment | +50–150% | Duration of event |

---

### Edge Case 10: End-of-Life Transition — Old and New SKU Cannibalize Each Other

**Situation:**
A major brand is transitioning from V1 to V2 of a popular household cleaner (improved formula, new packaging, same price point). V1 is a B-item averaging 250 units/week. V2 will launch in 4 weeks with planned distribution to all 100 stores. The manufacturer is offering a one-time V2 introductory buy at a 15% discount. The complication: V1 and V2 will coexist on shelf for 6–10 weeks during the transition. The brand is not offering to buy back unsold V1 inventory. You currently have 3,200 units of V1 in the system (DC + stores = ~12.8 weeks of supply at the current rate).

**Why It's Tricky:**
During the transition, V1 and V2 will cannibalize each other. Total brand demand will likely remain flat or grow slightly (V2 launch may attract trial), but the split between V1 and V2 is uncertain. If V2 takes off quickly, V1 demand collapses and you're stuck with excess. If V2 launches slowly (customer resistance to change), V1 holds demand longer. The manufacturer's introductory discount pressures you to buy heavily on V2, but that bet compounds the V1 excess risk.

**Common Mistake:**
Buying V2 aggressively to capture the introductory discount while ignoring the V1 run-down plan. Six weeks later, V1 is occupying shelf space, DC slots, and working capital while V2 is the seller.

**Expert Approach:**
1. Model the transition as a combined brand forecast with a split ratio that shifts over time:
   - Weeks 1–2 (post-V2 launch): V1 retains 70% of brand volume, V2 captures 30% (trial phase)
   - Weeks 3–4: V1 at 50%, V2 at 50%
   - Weeks 5–6: V1 at 30%, V2 at 70%
   - Weeks 7+: V1 at 10%, V2 at 90%
   These ratios are estimates — adjust based on brand's historical transition data and customer research.
2. Run down V1 inventory intentionally. Stop reordering V1 immediately — you have 12.8 weeks at current rate, but demand will decline per the split model. Compute V1 sales under the declining split: ~250 × (0.7 + 0.7 + 0.5 + 0.5 + 0.3 + 0.3 + 0.1 + 0.1) = ~800 units over 8 weeks. You have 3,200 in the system — you'll have ~2,400 excess.
3. Initiate V1 markdowns early — don't wait for the product to become unsellable. Week 1 post-V2 launch: take 20% off V1 to accelerate sell-through. Week 4: 40% off. Week 6: liquidate or donate any remainder.
4. Size the V2 introductory buy conservatively: 4 weeks of supply at the V2 split rate, not at the full brand rate. That's ~250 × (0.3 + 0.5 + 0.7 + 0.9) = ~600 units for the first 4 weeks. Take the introductory discount on 600–800 units, not the 2,000+ the manufacturer will suggest.
5. Negotiate with the manufacturer: request unsold V1 return credit or a markdown fund contribution. Most CPG brands transitioning formulas will contribute 25–50% of the V1 markdown cost if asked, because they want V1 off shelf to drive V2 trial.
6. Track the actual V1/V2 split weekly and adjust. If V2 takes off faster than modeled, accelerate V1 markdowns. If V2 is slow, hold V1 price and defer V2 reorder.

**Documentation Required:**
- Combined brand forecast with V1/V2 split ratios
- V1 run-down plan with markdown schedule
- V2 introductory buy calculation
- Manufacturer negotiation on return credit / markdown fund
- Weekly V1/V2 split tracking vs. plan

**Resolution Timeline:**
- Weeks -6 to -4: Build V1/V2 combined forecast; compute V1 run-down plan
- Week -4: Stop V1 reorders; negotiate manufacturer markdown support
- Week -2: Set V1 markdown schedule; finalize V2 introductory buy
- Week 0: V2 launches; V1 takes first markdown (20% off)
- Week 4: V1 takes second markdown (40% off) if excess remains
- Week 6: Liquidate any remaining V1 inventory
- Week 8: Transition complete; V2 on standard replenishment

**Financial Modeling:**
Compute the total transition cost: V1 markdown cost (units × markdown depth × unit cost) +
V1 liquidation loss + V2 introductory buy discount benefit − manufacturer markdown fund.
For this example: if 2,400 V1 units remain and average markdown recovery is 60% of cost,
the V1 loss is 2,400 × $cost × 0.40. The V2 introductory buy at 15% discount on 600–800
units saves ~$cost × 0.15 × 700 = modest savings. Net transition cost is typically $2K–$5K
for a brand of this size, which is the cost of maintaining a clean shelf transition.

---

### Edge Case 11: Multi-Location Allocation During Supply Constraint — Not Enough for Everyone

**Situation:**
A critical supplier shortage has reduced your supply of a top-selling protein powder (A-item, $34.99, ~900 units/week across 120 stores) by 60% for the next 6 weeks. You'll receive approximately 360 units/week instead of the normal 900. You cannot source from an alternative supplier — this is a branded product with an exclusive distribution agreement. The 120 stores have widely varying velocities: the top 20 stores sell 40% of total volume, the middle 40 sell 35%, and the bottom 60 sell 25%.

**Why It's Tricky:**
You can't serve all stores at their normal levels. Pro-rata allocation (giving each store 40% of their normal replenishment) seems fair but is suboptimal — it guarantees every store runs out rather than keeping some stores in-stock. But fully stocking the top 20 stores and cutting off the bottom 60 creates customer service issues at those locations and potential legal/franchise issues if you have contractual obligations.

**Common Mistake:**
Pro-rata allocation across all stores. Every store gets 40% of normal, every store stocks out in ~4 days, and the customer experience is universally bad rather than selectively managed.

**Expert Approach:**
1. Calculate the allocation by store tier to maximize total units sold (minimize lost sales):
   - Top 20 stores: allocate at 70% of their normal rate (252 units/week). These stores have the highest traffic; even partial stock generates more sales per unit than full stock at a low-traffic store.
   - Middle 40 stores: allocate at 35% of their normal rate (~110 units/week). Enough to maintain some presence.
   - Bottom 60 stores: allocate at 15% of their normal rate (~54 units/week). Maintain minimum presentation stock only.
   - Total: 252 + 110 + 54 = ~416 units/week. This exceeds the 360 available, so scale proportionally.
2. Implement a maximum per-customer purchase limit at the store level (2 units per transaction) to prevent stockpiling.
3. Communicate transparently to store managers: "Protein powder is on constrained allocation for the next 6 weeks due to supplier shortage. Your allocation is [X] units/week. We'll resume normal replenishment in [date]."
4. Monitor sell-through rates at each tier. If the top-20 stores are selling out in 3 days, they're effectively under-allocated. If bottom-60 stores are carrying inventory into the next week, they're over-allocated. Adjust weekly.
5. Prepare substitution signage for stores: "Looking for [brand]? Try [alternative] while supplies are limited." Even without a direct substitute supplier, suggesting a different brand/format captures some sales that would otherwise be lost.
6. Track lost sales using a proxy: compare same-store sales of complementary items (protein bars, shakers) — a decline suggests customers are going elsewhere entirely.

**Documentation Required:**
- Allocation model with tier breakdowns
- Weekly allocation vs. sell-through by tier
- Customer purchase limit implementation
- Lost sales estimate methodology and tracking
- Supplier communication and expected resolution timeline

**Resolution Timeline:**
- Day 0: Supplier confirms constraint; demand planner receives allocation
- Day 0–1: Build tiered allocation model; communicate to store operations
- Day 1–2: Implement POS purchase limits; prepare substitution signage
- Weekly for 6 weeks: Adjust allocations based on actual sell-through by tier
- Week 6: Supplier confirms return to normal supply
- Week 7–8: Rebuild safety stock at normal replenishment rates

**Financial Impact:**
Lost sales during a 60% supply constraint on a 900 units/week A-item at $34.99 retail:
(900 − 360) × $34.99 × 6 weeks = ~$113,367 in lost revenue. With tiered allocation
optimizing sell-through, you can recapture 15–25% of the otherwise lost sales compared
to naive pro-rata allocation, worth $17K–$28K in recovered revenue. The allocation
optimization effort pays for itself many times over.

---

### Edge Case 12: Demand Forecast Consensus Meeting Override — Sales Team Inflates Forecast

**Situation:**
During the monthly S&OP demand review, the sales team insists on overriding the statistical forecast for a key product line (premium pet food, 15 SKUs, ~$1.2M annual revenue). The statistical forecast projects flat demand at ~$100K/month. The sales team argues that a new distribution agreement with a pet specialty chain will add $30K/month starting next month. They want the forecast increased to $130K/month across all 15 SKUs proportionally. However, the distribution agreement is not yet signed (it's in "final review"), the specialty chain hasn't confirmed shelf dates, and the sales team has a history of overestimating new account volume by 40–60%.

**Why It's Tricky:**
The sales team may be right — the distribution deal is real and the incremental volume is plausible. But "plausible" is not "certain." If you accept the override and the deal delays by 2 months (common), you'll have 2 months of $30K/month in excess inventory ($60K), which for pet food with 12-month shelf life is manageable but ties up working capital. If you reject the override and the deal closes on time, you'll be short $30K/month and unable to serve the new account, potentially killing the deal.

**Common Mistake:**
Either accepting the sales team's number at face value (leading to chronic over-forecasting) or rejecting it entirely (leading to under-investment in growth).

**Expert Approach:**
1. Never accept or reject an override without a probability-weighted approach. Ask the sales team to commit to a probability of close and timing:
   - Probability the deal closes: 70% (sales team's estimate — discount to 50% based on historical calibration)
   - If it closes, when will volume start? 4 weeks (sales team) — add 4 weeks for historical optimism = 8 weeks realistic
   - If it closes, what's the ramp rate? Rarely 100% from day 1. Model 50% in month 1, 75% in month 2, 100% in month 3.
2. Compute the expected value override: $30K × 50% probability × ramp rate = $7.5K in month 1, $11.25K in month 2, $15K in month 3.
3. Apply this as a staged override, not a flat $30K increase. Month 1: $107.5K. Month 2: $111.25K. Month 3: $115K.
4. Set a kill trigger: if the deal hasn't closed by month 2, remove the override entirely and return to the statistical forecast. Do not carry speculative overrides indefinitely.
5. Track the outcome: did the deal close? When? At what volume? Use this to calibrate the sales team's future override accuracy and adjust the probability discount accordingly.
6. Distribute the override unevenly across SKUs: the new account likely won't carry all 15 SKUs. Ask the sales team which 5–8 SKUs the new account will stock, and concentrate the override there.

**Documentation Required:**
- S&OP meeting notes with the original override request
- Probability-weighted override calculation
- Staged implementation plan by month and SKU
- Kill trigger date and conditions
- Post-event accuracy tracking

**Resolution Timeline:**
- S&OP meeting: Capture the override request; apply probability weighting
- Day 1–3: Compute the staged override and distribute across relevant SKUs
- Week 1: Adjust POs to reflect the staged override (not the full $30K)
- Week 4 (if deal not signed): Reduce override by 50%
- Week 8 (if deal still not signed): Remove override entirely; return to statistical forecast
- When deal closes: Ramp up based on actual account setup timeline
- Month 3 post-close: Compare actual volume to the staged override; calibrate sales team accuracy

**Historical Calibration:**
Track the accuracy of sales team overrides over time. Maintain a simple table:

| Override Source | Override Count (trailing 12 months) | Avg. Override Amount | Avg. Actual Result | Realization Rate |
|---|---|---|---|---|
| Sales team — new accounts | 8 | +$25K/month | +$12K/month | 48% |
| Sales team — existing account growth | 12 | +$15K/month | +$9K/month | 60% |
| Marketing — promotional lift | 6 | +40% lift | +32% lift | 80% |
| Category management — trend calls | 5 | ±20% | ±8% | 40% |

This calibration table allows you to apply evidence-based probability discounts to future
overrides. A sales team with a 48% realization rate on new account overrides should have
their stated volume multiplied by 0.48, not accepted at face value.
