# Energy Procurement — Edge Cases Reference

> Tier 3 reference. Load on demand when handling complex energy procurement situations that don't resolve through standard decision frameworks.

These edge cases represent the scenarios that separate experienced energy procurement managers from everyone else. Each involves competing priorities, market structure nuances, regulatory complexity, and real financial exposure. They are structured to guide resolution when standard procurement playbooks break down.

---

## How to Use This File

When an energy procurement situation doesn't fit a clean decision tree — when market dynamics create conflicting incentives, when tariff structures produce counterintuitive outcomes, or when a PPA that looked good at signing turns problematic — find the edge case below that most closely matches the situation. Follow the expert approach step by step.

---

### Edge Case 1: ERCOT Price Spike During Extreme Winter Weather (Uri-Type Event)

**Situation:**
A food manufacturing company operates two facilities in Texas: a 6 MW production plant in Houston and a 3 MW distribution center in Dallas. Both are on index-priced supply contracts (ERCOT real-time settlement node price + $0.004/kWh supplier adder). During a February polar vortex event, temperatures drop to 5°F in Houston (normal February low: 42°F). ERCOT declares an Energy Emergency Alert Level 3 (EEA3) and implements rolling blackouts. Real-time wholesale prices hit the ERCOT system-wide offer cap of $5,000/MWh (during Uri in 2021, the cap was $9,000/MWh). The event lasts 5 days. The Houston plant has backup natural gas generators but cannot run them because natural gas supply has been curtailed due to wellhead freeze-offs. The Dallas facility has no backup generation.

Your weekly energy cost is normally $85,000 across both sites. During this event, the projected weekly cost at $5,000/MWh average for 120 hours of peak pricing would exceed $4.5M.

**Why It's Tricky:**
The contract is working as designed — index pricing means you pay the market price. There is no breach, no force majeure claim against the supplier (they are delivering at index), and no contractual price cap unless you negotiated one. The financial exposure is catastrophic for a company where annual energy spend is $5M. A single week could equal the entire annual budget.

Simultaneously, you need to keep the food production plant running (product in process will spoil if power is lost) and the distribution center must maintain cold chain for $8M of perishable inventory. Shutting down to reduce energy cost means accepting $3–$5M in product loss.

**Common Mistake:**
Keeping both facilities at full load throughout the event and accepting the $4.5M bill as a cost of doing business. The second mistake: attempting to renegotiate or dispute the contract after the event — courts consistently enforce index pricing during price spikes because that is the contract structure.

**Expert Approach:**
1. **Immediate load curtailment (Hour 0-4):** Reduce all discretionary load at both facilities. Target: 30-40% load reduction without shutting production lines. Turn off office HVAC (employees can layer up for a week), reduce warehouse lighting to emergency levels, shut down non-essential compressed air (only keep production-critical compressors), and turn off electric water heaters. A 35% load reduction on 9 MW combined peak saves approximately $1.6M over 5 days at $5,000/MWh.

2. **Production schedule modification (Hour 4-12):** Shift production to overnight hours (10 PM - 6 AM) when prices typically dip to $1,000-$2,000/MWh even during extreme events (the sun isn't up, wind may be producing, and some thermal generation returns overnight). Run the Houston plant at minimum load during daytime peak hours (keep product in process alive but don't start new batches).

3. **Demand response activation (Hour 0):** If enrolled in any ERCOT demand response program (ERS or 4CP programs), curtail to earn the event payment. This partially offsets the extreme energy cost. An ERS enrollment for 1 MW could pay $2,000-$5,000 per event hour depending on the program.

4. **Generator options (Hour 2-6):** Contact your natural gas supplier and pipeline operator about gas availability. If pipeline gas is curtailed, evaluate diesel portable generators — rental generators during extreme weather events cost $50-$100/kW per day but at $5,000/MWh wholesale, generation cost at even $150/kW/day is far cheaper than grid power. Contact industrial generator rental companies immediately — they will be overwhelmed within 24 hours.

5. **Supplier communication (Hour 0):** Contact your retail energy provider to understand their exposure and settlement timeline. Some REPs offer post-event payment plans. If your REP is likely to fail (several REPs went bankrupt after Uri), your account reverts to the utility's Provider of Last Resort (POLR) rate — which during an emergency may be even higher. Prepare for this contingency.

6. **Post-event restructuring (Week 2+):** After the event, restructure your energy contracts. For ERCOT exposure, never go fully unhedged into winter. Options include:
   - Add a price cap to your index contract ($100-$200/MWh ceiling, costs $2-$5/MWh in premium)
   - Switch to block-and-index with blocks covering 80% of winter load
   - Purchase OTC call options that cap your exposure above a strike price
   - Maintain a cash reserve equal to 2 weeks of energy cost at $500/MWh

**Key Indicators:**
- ERCOT weather forecasts showing temperatures >20°F below seasonal norms for >3 days warrant pre-event hedging action
- Natural gas spot prices at Houston Ship Channel exceeding $10/MMBtu signal potential generator fuel supply issues
- ERCOT Conservation Voltage Reduction or EEA Level 1 declarations are early warnings — act before EEA3
- Monitor ERCOT's generation outage report: if forced outages exceed 20 GW, price spikes above $1,000/MWh are likely

**Documentation Required:**
- Real-time price records from the ISO settlement system
- Facility load data during the event (to demonstrate curtailment efforts for internal reporting and potential rate dispute)
- Generator rental invoices and fuel costs
- Communication log with REP and utility
- Total financial exposure calculation for executive and board reporting
- Post-event contract restructuring analysis

**Resolution Timeline:**
- Hours 0-6: Implement all immediate load curtailment measures
- Hours 6-24: Execute production schedule shifts, secure backup generation if available
- Days 2-5: Maintain curtailed operations, monitor market for normalization signals
- Week 2: Receive preliminary settlement from REP, assess total financial impact
- Week 3-4: Initiate contract restructuring discussions with REP
- Month 2-3: Execute new contract structure with winter price protection

---

### Edge Case 2: Virtual PPA Basis Risk in a Congested Transmission Zone

**Situation:**
A technology company headquartered in Northern Virginia (PJM territory, Dominion zone) executed a 15-year VPPA with a 100 MW wind farm in western PJM (AEP zone, near the Ohio-West Virginia border). The VPPA strike price is $32/MWh, which at signing was $12/MWh below the PJM Western Hub forward curve of $44/MWh. The company projected $1.2M/year in positive settlement value, plus 350,000 RECs annually for their RE100 commitment.

After 18 months of operation, the actual financial performance shows persistent negative settlements. The wind farm generates during overnight and shoulder hours when AEP zone LMPs average $28/MWh. The company's load zone (Dominion) averages $48/MWh during the same hours due to transmission congestion between AEP and Dominion zones. The generation-weighted average basis (Dominion LMP minus AEP node LMP) is $14/MWh.

Net financial impact: the wind farm settles at $28/MWh average, which is $4/MWh below the $32 strike, meaning the company owes the developer $4/MWh. Plus the $14/MWh basis spread means the company's effective energy cost premium from the VPPA is $18/MWh — turning a projected $1.2M/year benefit into a $2.1M/year cost.

**Why It's Tricky:**
The VPPA contract is performing as written — the settlement is based on the generator's node price, not the company's load zone price. Basis risk was disclosed during contracting, but the company's internal projection used a 3-year historical average basis of $6/MWh (which was correct at the time). The basis widened due to new generation additions in AEP zone and continued transmission constraints into the Dominion zone — structural factors that will likely persist or worsen.

The company cannot exit the VPPA without paying a termination fee based on the mark-to-market value, which at negative $2.1M/year for the remaining 13.5 years, discounted at 8%, is approximately $16M. The RECs are still valuable — 350,000 RECs at $5/REC = $1.75M/year — partially offsetting the financial loss, but the net economics are negative.

**Common Mistake:**
Terminating the VPPA immediately and paying the $16M termination fee. This crystallizes the loss. The second mistake: ignoring the problem and hoping basis narrows — structural congestion rarely self-corrects without transmission investment.

**Expert Approach:**
1. **Quantify the actual basis exposure.** Request hourly settlement data from the PPA counterparty. Calculate generation-weighted basis for each month. Identify whether basis is seasonal (wider in summer when AC load drives Dominion congestion) or persistent year-round.

2. **Model forward basis expectations.** Engage an energy consultant or your supplier's market analytics team to model forward basis between AEP and Dominion zones. Key factors: planned transmission upgrades (PJM RTEP projects that relieve the constraint), new generation additions in AEP zone (more wind/solar behind the constraint worsens basis), and load growth in Dominion zone.

3. **Evaluate basis hedging.** PJM offers Financial Transmission Rights (FTRs) that can hedge congestion costs between two points on the grid. Purchase FTRs from the AEP zone to the Dominion zone in the PJM FTR auction. An FTR paying $10/MWh on 350,000 MWh = $3.5M/year, which significantly offsets the basis loss. FTR costs vary — the auction determines the price, and popular paths (like AEP-to-Dominion) may be expensive. Budget $5-$8/MWh for FTR basis hedging.

4. **Renegotiate the settlement point.** Approach the developer about switching the settlement point from the generator's node to the Western Hub or a more liquid hub closer to your load zone. The developer may accept this if the hub price is close to their node price (it often is — hub prices are less volatile than nodal prices). This doesn't eliminate basis risk but may reduce it.

5. **Restructure the contract.** Options include:
   - Reduce the contract volume (buy down from 100 MW to 60 MW, reducing exposure while keeping some REC delivery)
   - Add a basis risk sharing mechanism (developer absorbs basis beyond $8/MWh)
   - Convert to a fixed-price REC purchase (eliminate the energy settlement entirely, pay a fixed $/REC)

6. **Portfolio-level offset.** If you have other facilities in the AEP zone, the VPPA's node-price settlement is actually favorable for loads in that zone (where LMPs are lower). Consider whether any current or planned facility expansion in AEP territory could benefit from the VPPA's economics.

**Key Indicators:**
- Basis widening beyond 150% of historical average for 2+ consecutive quarters signals structural change
- PJM RTEP transmission projects targeting the constrained corridor may take 5-7 years to complete
- New generation interconnection queue in the generator's zone exceeding 3 GW is a bearish signal for basis
- FTR auction results showing increasing clearing prices on the relevant path confirm market recognition of the congestion

**Documentation Required:**
- Monthly VPPA settlement statements
- Hourly generation-weighted basis calculations
- FTR auction results and cost analysis
- Developer communication regarding contract restructuring
- Board-level financial exposure report
- Revised forward-looking PPA valuation under multiple basis scenarios

---

### Edge Case 3: Demand Charge Ratchet Trap After Equipment Installation

**Situation:**
A plastics manufacturer in Georgia Power territory installed a new 1,200 kW production line. During commissioning week, the electrical contractor tested all equipment simultaneously at full load — standard practice for commissioning acceptance testing. The test occurred on a Wednesday afternoon in August, coinciding with the facility's normal summer HVAC peak. The 15-minute interval data shows a peak demand of 5,800 kW — compared to the facility's normal summer peak of 4,200 kW.

Georgia Power's PLM-4 tariff includes an 80% demand ratchet. The billing demand for the next 11 months cannot fall below 80% of the maximum demand in the prior 11 months. The new floor: 5,800 × 0.80 = 4,640 kW. During winter months, when normal demand drops to 3,200 kW, the facility will be billed for 4,640 kW.

Additional demand charges: (4,640 - 3,200) × $12.50/kW × 7 winter months = $126,000 in excess demand charges. And the new production line's normal operating demand of 900 kW (not the 1,200 kW commissioning peak) means the facility's normal summer peak going forward is 5,100 kW — still below the ratchet. Even in summer, the facility is billed for 5,800 kW peak demand.

Annual excess demand charges from the commissioning peak: approximately $174,000.

**Why It's Tricky:**
The damage is done — a single 15-minute interval set the peak, and the ratchet clause is contractual. Georgia Power has no tariff provision for removing ratcheted demand due to commissioning events. You cannot dispute the meter reading (the test genuinely drew 5,800 kW). The only way to "reset" the ratchet is to either (a) wait 11 months for the peak to roll off, or (b) consistently hit a higher peak that makes the ratchet irrelevant (which would mean higher demand charges anyway).

**Common Mistake:**
Calling Georgia Power and asking them to waive the ratchet. They won't — it's a tariff provision approved by the Georgia Public Service Commission, not a negotiable contract term. The second mistake: assuming nothing can be done and absorbing the $174K cost.

**Expert Approach:**
1. **Immediate investigation (Day 1):** Pull the interval data for commissioning week. Identify the exact 15-minute interval(s) that set the new peak. Determine whether the peak was caused by legitimate commissioning (all equipment at rated load) or by an avoidable event (existing HVAC running at maximum while new equipment was at full test load).

2. **Tariff analysis:** Review the PLM-4 tariff document line-by-line. Some tariffs have provisions for "temporary service" or "construction power" that could apply if the commissioning load was billed under a temporary service agreement. If the contractor should have been on temporary service during commissioning, the peak may not count against the permanent meter. This is rare but worth checking.

3. **Demand response enrollment:** Georgia Power offers demand response programs that can provide credit against demand charges. If the facility can commit to curtailing 800-1,000 kW during summer peak events, the DR credit may offset a significant portion of the ratchet cost. Enroll immediately — programs have seasonal enrollment windows.

4. **Operational changes to reduce the ratchet impact:** Since the ratchet is based on the single highest 15-minute interval, focus on ensuring that the facility NEVER exceeds 5,800 kW again (which would reset the ratchet at a higher level). Install a demand controller on the main meter that sheds non-critical loads (compressed air, water heating, battery chargers) whenever demand approaches 5,500 kW.

5. **Future prevention protocol:** Establish a policy that all equipment commissioning involving loads >200 kW must be scheduled during off-peak hours (overnight or weekends), with the building HVAC in setback mode and non-essential production loads off. The commissioning electrician should coordinate with the energy manager, not just the maintenance supervisor. Include this requirement in all future capital project specifications.

6. **Financial recovery:** If the electrical contractor failed to follow a commissioning plan that specified load management during testing, evaluate whether the excess demand charges ($174K) are recoverable as consequential damages under the construction contract. Review the contract's commissioning provisions and liability clauses.

**Key Indicators:**
- Any planned equipment installation >200 kW capacity should trigger a commissioning demand management plan
- Request interval data within 48 hours of commissioning to identify ratchet exposure before the billing cycle closes
- If your tariff has a demand ratchet, the energy manager must be involved in all capital project commissioning plans

---

### Edge Case 4: Utility Rate Case Filing Mid-Contract

**Situation:**
A hospital system with 12 facilities in Ohio (AEP Ohio territory) has a 36-month fixed-price electricity supply contract with a competitive retail energy provider at $0.052/kWh for the energy component. The contract was signed 8 months ago. AEP Ohio has just filed a distribution rate case with the Public Utilities Commission of Ohio (PUCO), proposing a $480M revenue increase across all rate classes — an average 18% increase in distribution charges.

For the hospital system's rate class (GS-3 General Service-Large), the proposed increase translates to approximately $0.014/kWh in additional distribution charges. Across the hospital system's 180 GWh annual consumption, the annual cost increase would be approximately $2.52M. The current total delivered cost is $0.088/kWh; the proposed distribution increase would raise it to $0.102/kWh — a 16% total cost increase.

The fixed-price supply contract covers only the energy and capacity components ($0.052/kWh). Distribution charges, transmission charges, riders, and surcharges are pass-through items — the hospital system pays whatever the utility tariff dictates.

**Why It's Tricky:**
The supply contract is performing as agreed. The $0.052/kWh energy price is locked. But the total delivered cost is increasing by $2.52M/year, and the hospital system's CFO expected the "fixed-price contract" to provide budget certainty on the total energy bill. The disconnect between "supply is fixed" and "delivery is pass-through" is one of the most common misunderstandings in commercial energy procurement.

The rate case will take 12-18 months to adjudicate. The proposed $0.014/kWh increase is the utility's opening position — the final settlement typically lands at 50-75% of the proposed increase. But even a 50% outcome ($0.007/kWh) means $1.26M/year in additional costs.

**Common Mistake:**
Ignoring the rate case because "we have a fixed-price contract" and only discovering the cost increase when the new tariff rates take effect. The second mistake: blaming the energy supplier for not protecting against distribution rate increases — the supplier explicitly passes these through in the contract, and there is no commercial product that can fix distribution rates (these are regulated, not competitive).

**Expert Approach:**
1. **Rate case analysis (Week 1):** Obtain the full rate case filing from the PUCO docket. Focus on the cost of service study for the GS-3 rate class. Identify what specific distribution cost components are driving the increase (infrastructure replacement, storm hardening, grid modernization, rate of return request). Calculate the exact impact on each hospital facility based on their billing determinants.

2. **Intervention evaluation (Week 2-3):** Large C&I customers have the right to intervene in rate cases. Intervention allows you to file testimony challenging the utility's cost allocation, rate design, or revenue requirement. The hospital system's $2.5M+ annual impact justifies the cost of intervention ($50K-$150K in legal and expert witness fees). Contact a utility regulatory attorney in Ohio.

3. **Coalition building (Week 2-4):** Join the Ohio Industrial Energy Consumers (OIEC) or similar industrial intervenor group. These organizations pool resources to intervene in rate cases, reducing individual company costs to $10K-$30K/year in membership fees while providing professional regulatory representation.

4. **Rate design advocacy:** Even if the total revenue increase is approved, the rate design (how the revenue is allocated across rate classes and billing determinants) can be influenced. Advocate for cost allocation that reflects actual cost causation — hospitals with high load factors and coincident peak management should pay less per kWh in distribution than low-load-factor commercial buildings. File testimony supporting demand-based distribution rates rather than volumetric rates.

5. **Budget adjustment (Month 1):** Present the rate case exposure to the hospital system's CFO immediately. Provide three scenarios: full proposed increase ($2.52M/year), likely settlement (60% = $1.51M/year), and best case (40% = $1.01M/year). Recommend budgeting at the likely scenario and establishing a reserve for the upside case. The rate case outcome is 12-18 months away, but budget planning should begin immediately.

6. **Demand-side response:** A rate case that increases distribution charges makes demand charge management more valuable. Every kW of peak reduction now saves more per month. Re-run the ROI analysis for battery storage, demand response, and load management projects with the proposed new rates — projects that were marginal at old rates may now have strong payback.

**Key Indicators:**
- Monitor your state PUC docket for utility rate case filings quarterly
- Track the authorized rate of return — utilities filing for ROE >10% in the current interest rate environment will face pushback
- Rate cases proposing >15% overall increases typically settle at 50-65% of the request
- Infrastructure replacement riders often bypass rate case proceedings — monitor these separately

**Documentation Required:**
- Rate case docket filing and all testimony
- Facility-level billing determinant analysis
- Impact assessment under proposed and likely settlement scenarios
- Intervention timeline and cost estimate
- Budget revision memo for CFO
- Coalition membership evaluation

---

### Edge Case 5: Negative LMP Pricing Affecting PPA Economics

**Situation:**
A consumer products company has a 20-year physical PPA with a 50 MW solar farm in CAISO (Central California). The PPA price is $28/MWh with a clause that the offtaker purchases all energy generated at the contract price. During spring months (March-May), CAISO experiences significant solar oversupply during midday hours. Day-ahead LMPs at the project's node have gone negative — averaging -$8/MWh between 10 AM and 2 PM on weekdays during April.

When LMPs are negative, the generator actually earns negative revenue in the wholesale market (they would have to pay to inject power). However, under the PPA terms, the offtaker (the company) is obligated to purchase at $28/MWh regardless of the market clearing price. During these negative-price hours, the effective premium the company pays is $28 - (-$8) = $36/MWh above market. In April alone, 120 hours of negative pricing on an average 35 MW output represents: 120 hrs × 35 MW × $36/MWh premium = $151,200 of above-market cost in a single month.

Annually, negative pricing during spring months creates approximately $400K-$600K in above-market costs. This was not modeled in the original PPA financial analysis, which assumed LMPs would always be positive.

**Why It's Tricky:**
The PPA contract requires the company to purchase all generated output at $28/MWh. The contract was signed when CAISO negative pricing was infrequent (occurring <50 hours/year). Since then, solar buildout has accelerated, and negative pricing now occurs 500-800 hours/year in central California during spring. This is a structural trend — it will get worse as more solar is added.

The solar farm continues to generate during negative-price hours because it earns the $28/MWh PPA price (a positive return) plus federal production tax credits ($0.026/kWh), which together exceed its marginal operating cost of effectively $0. The developer has no economic incentive to curtail during negative price hours as long as the PPA requires the offtaker to buy the output.

**Common Mistake:**
Demanding that the developer curtail during negative price hours (the contract doesn't require this). The second mistake: building a financial model that assumes negative pricing will revert to historical norms — the structural drivers are getting stronger, not weaker.

**Expert Approach:**
1. **Contract review:** Examine the PPA for any provisions related to economic curtailment, negative pricing, or market price floors. Modern PPAs (post-2020) often include a "negative price curtailment" clause where the developer is curtailed when market prices go negative for >2 consecutive hours, and the offtaker is not obligated to purchase during curtailed hours. Older PPAs may lack this provision.

2. **Economic curtailment negotiation:** Approach the developer to add a negative price curtailment provision. The developer's perspective: they lose PPA revenue ($28/MWh) and may lose PTC value during curtailed hours, but they also avoid the operational cost of generating into a negative-price market and maintain grid operator goodwill (CAISO can mandate curtailment for reliability — voluntary curtailment preserves the developer's standing). Propose: curtailment when the 15-minute LMP is negative, with the developer retaining RECs for curtailed hours (they can sell them separately to partially offset lost PPA revenue).

3. **REC value assessment:** Quantify the REC value for curtailed hours. If the company needs 175,000 RECs/year for RE100 and the PPA delivers 160,000 RECs (net of curtailment), the company must purchase 15,000 replacement RECs at market price ($8-$15/MWh for CAISO solar RECs). Compare this cost ($120K-$225K) against the negative-price exposure ($400K-$600K). The math likely favors curtailment.

4. **Behind-the-meter storage pairing:** If the company has a facility near the solar farm (or in the same utility territory), pairing a battery with the solar PPA allows absorption of midday generation for discharge during evening peak hours when LMPs are highest. This converts the negative-price exposure into a TOU arbitrage opportunity. A 10 MW / 40 MWh battery co-located with or at the facility could shift 4 hours of midday production to evening hours, capturing a $50-$80/MWh spread.

5. **Settlement structure revision:** Negotiate a change from "buy all output at $28/MWh" to "buy all output at $28/MWh with a market price floor of $0/MWh." Under this revised structure, during negative price hours, the company pays $28/MWh (not $36/MWh above market) because the settlement reference price is floored at zero. The developer absorbs the negative market price risk.

**Key Indicators:**
- CAISO negative pricing frequency exceeding 300 hours/year and growing YoY signals structural oversupply
- New solar interconnection queue in the generator's zone exceeding 5 GW indicates the problem will worsen
- CAISO proposed market reforms (extended day-ahead market, WEIM expansion) may partially mitigate negative pricing through broader geographic dispatch
- Battery storage additions in CAISO are absorbing midday solar and may reduce negative pricing frequency by 2027-2030

---

### Edge Case 6: Behind-the-Meter Solar Cannibalizing Demand Response Value

**Situation:**
A cold storage operator in New Jersey (PSE&G territory, PJM market) installed a 1.5 MW rooftop solar array under a 25-year on-site solar PPA at $0.065/kWh. The facility is also enrolled in PJM's Economic Demand Response program, committing to curtail 800 kW during high-priced hours. The DR program calculates the Customer Baseline Load (CBL) using the average of the highest 4 out of the prior 5 business days' consumption during the DR event hours.

After the solar installation, the facility's grid consumption during sunny weekday afternoons dropped by approximately 1,100 kW (the solar array's typical output). This reduced the CBL by the same amount. When a DR event is called on a cloudy day (when solar output is only 200 kW instead of 1,100 kW), the facility's actual load is close to its pre-solar level — but the CBL is based on recent sunny days when grid consumption was lower. The measured curtailment (CBL minus actual metered load during the event) is effectively zero or negative, even though the facility is genuinely curtailing discretionary loads.

The result: the facility fails performance testing for the DR program, loses its 800 kW capacity commitment credit ($48,000/year at $60/kW-yr), and faces a non-performance penalty of $25,000.

**Why It's Tricky:**
The solar array and the DR program each made financial sense individually. But the interaction between the CBL methodology and behind-the-meter solar creates a perverse outcome: solar production on sunny days lowers the baseline, making it harder to demonstrate curtailment on cloudy event days (when solar isn't helping). The CBL methodology was designed for facilities with predictable, weather-independent load — it doesn't account for behind-the-meter generation that varies with weather.

**Common Mistake:**
Installing behind-the-meter solar and enrolling in DR programs without modeling the CBL interaction. The second mistake: reducing the DR commitment to match the new (lower) CBL, which sacrifices significant capacity revenue.

**Expert Approach:**
1. **CBL methodology analysis:** Request the detailed CBL calculation methodology from PJM or your curtailment service provider (CSP). Some DR programs allow CBL adjustment for behind-the-meter generation — PJM's rules have evolved, and recent provisions may allow the CBL to be calculated on a "gross load" basis (metered load + estimated solar generation) rather than "net load" basis. If gross load CBL is available, apply for the adjustment.

2. **Solar metering:** Install a revenue-grade meter on the solar array's output (separate from the utility meter). This provides real-time solar generation data that can be used to adjust the CBL. The meter cost ($2,000-$5,000 installed) is trivial compared to the lost DR revenue.

3. **CSP negotiation:** Engage your Curtailment Service Provider to restructure the DR enrollment. Options:
   - Switch to a "firm service level" (FSL) baseline methodology where your committed curtailment is measured as the difference between your maximum load and a pre-agreed service level, rather than a rolling CBL
   - Enroll the solar production as a separate DR resource (solar + storage dispatch) rather than netting it against the facility load
   - Reduce the committed curtailment volume to a level achievable on cloudy days (e.g., 400 kW instead of 800 kW) as an interim measure

4. **Battery integration:** Add a battery system (200 kW / 400 kWh minimum) that charges from solar during sunny hours and discharges during DR events. This allows the facility to demonstrate curtailment on cloudy days by discharging stored solar energy, keeping the CBL higher and providing real kW reduction during events. The battery also earns frequency regulation revenue in PJM during non-event hours.

5. **Re-evaluate the overall value stack.** Recalculate the total economic benefit of each component (solar PPA savings, DR revenue, capacity tag reduction, TOU arbitrage) with the interaction effects included. The optimal configuration may involve sizing the DR commitment to a level that is achievable regardless of solar output, rather than maximizing the individual DR commitment.

**Key Indicators:**
- Before installing behind-the-meter generation at a facility enrolled in DR, model the CBL impact for all weather scenarios
- DR programs using CBL-10 (average of 10 prior similar days) are more vulnerable to solar cannibalization than those using metered generation adjustment
- PJM's wholesale market rules for DR are updated annually — check for behind-the-meter generation accommodation provisions

---

### Edge Case 7: Capacity Market Obligation Surprise from Coincident Peak

**Situation:**
A data center operator in PJM (ComEd zone, Northern Illinois) runs three facilities with a combined peak demand of 30 MW. The company has been aggressively managing capacity costs — PLC tags for the prior delivery year totaled 24 MW (reflecting successful load reduction during the 5 coincident peak hours).

During the current summer, an unprecedented heat wave hit the Midwest. PJM called for demand response and conservation. The data center operator's backup diesel generators were offline for maintenance during the two hottest days. Without generator backup, the facilities ran at full grid load during what turned out to be 3 of the 5 coincident peak hours. The data center also accepted an emergency colocation request from a major client, adding 2 MW of temporary load.

When PJM publishes the new PLC values, the data center's tag jumps from 24 MW to 31 MW (full grid load of 30 MW plus the 2 MW temporary load minus some non-coincidence). At the BRA clearing price of $98/MW-day, the annual capacity charge increases from $858,720 to $1,108,870 — a $250,150 increase that persists for the entire delivery year.

**Why It's Tricky:**
The PLC is set by metered data during the 5CP hours — there's no appeals process, no adjustment for maintenance schedules or temporary load. The data center operator managed their PLC carefully for years but a single summer with bad timing (generators offline during the peak) erased all that work. The $250K annual increase is locked for the entire delivery year, regardless of what the data center does going forward.

**Common Mistake:**
Treating PLC management as "nice to have" rather than a critical operational priority. The second mistake: scheduling generator maintenance during summer months (June-September) when coincident peaks are most likely.

**Expert Approach:**
1. **Generator maintenance scheduling (preventive):** Never schedule backup generator maintenance during June-September. If maintenance must occur during summer, complete it on a single unit at a time and only on days when the PJM weather forecast shows temperatures below the 5CP trigger zone (typically <90°F for ComEd zone). Maintain at least 80% of generator capacity available during all summer weekday afternoon hours.

2. **Temporary load policies:** Establish a policy that no temporary or emergency load additions are accepted during June-September without explicit approval from the energy procurement team. The $250K capacity charge increase from 2 MW of temporary load far exceeds any revenue from the colocation contract (unless the contract is specifically priced for capacity cost pass-through).

3. **PLC monitoring service:** Subscribe to a PJM coincident peak prediction service (offered by most retail energy providers and specialized consultants). These services predict 5CP hours 24-48 hours in advance with 80-90% accuracy. When a predicted 5CP hour is forecast, activate all available generators, curtail all discretionary load, and notify operations that this is a "gold hour" — every kW reduced during these 5 hours saves $35,770/year at the current capacity price.

4. **Recovery strategy for the current year:** The new PLC is set and cannot be changed for this delivery year. Focus on minimizing next year's PLC. Implement:
   - Firm generator maintenance blackout window (June 1 - September 30)
   - Automated demand response controls that shed 3-5 MW of discretionary load within 15 minutes of a 5CP alert
   - Contractual provisions for all new colocation agreements requiring load shedding during capacity peak events

5. **Financial recovery:** Calculate whether the temporary colocation client's contract covers the capacity cost increase. If not, renegotiate the contract to include capacity cost pass-through. For future emergency colocation requests during summer, quote the capacity cost impact explicitly: "Adding 2 MW during potential 5CP hours will cost $71,540/year in capacity charges — this must be included in the colocation pricing."

**Key Indicators:**
- PJM summer weather forecasts predicting temperatures >92°F for the ComEd zone on 3+ consecutive weekdays signal likely 5CP hours
- PJM issuing hot weather alerts or emergency procedures is a near-certain 5CP indicator
- Backup generator availability below 80% during June-September is a capacity management risk

---

### Edge Case 8: Renewable Curtailment Exceeding Developer Projections

**Situation:**
A manufacturing company signed a 15-year physical PPA with a 75 MW wind farm in ERCOT (West Texas) at $22/MWh with projected annual generation of 270,000 MWh (41% capacity factor). The company's RE100 target depends on receiving at least 250,000 MWh of bundled RECs from this project annually.

After the first full year of operations, actual generation is 235,000 MWh — 13% below the P50 projection. The shortfall is primarily driven by curtailment: ERCOT curtailed the wind farm for 680 hours (7.8% of the year), versus the developer's projection of 250 hours (2.9%). The curtailment is caused by transmission congestion on the CREZ (Competitive Renewable Energy Zone) lines from West Texas to the Houston and Dallas load centers — the same lines that were built to export West Texas wind, but which are now at capacity due to the exponential growth of wind and solar in the region.

The company is 15,000 RECs short of its annual RE100 requirement and must purchase replacement RECs. Additionally, the lower generation volume means lower PPA settlement income (the positive spread between market price and PPA strike price is earned on fewer MWh).

**Why It's Tricky:**
Wind farm curtailment in West Texas is a known risk, but the magnitude exceeded projections. The developer used historical curtailment data from 2020-2022 (when the CREZ lines had more headroom) — since then, 8 GW of new wind and solar have interconnected in the same constrained region. The ERCOT interconnection queue shows another 15 GW of proposed projects in West Texas, suggesting curtailment will worsen before it improves.

The PPA contract allocates curtailment risk to the offtaker (the company pays the contract price only for delivered energy, and receives no compensation for curtailed energy). This is standard in older PPA structures.

**Common Mistake:**
Assuming the developer can solve the curtailment problem (they can't — it's a grid-level transmission constraint). The second mistake: projecting future generation using the developer's original P50 without adjusting for actual curtailment experience.

**Expert Approach:**
1. **Rebase generation projections.** Using 12 months of actual data, create an adjusted generation projection: actual wind resource (may differ from developer's model), actual curtailment rate (680 hours, not 250), and trend-adjust curtailment based on ERCOT interconnection queue data. A reasonable forward projection might be 225,000-240,000 MWh/year with curtailment worsening 1-2% per year until new transmission is built.

2. **Curtailment clause renegotiation.** Approach the developer to renegotiate the curtailment allocation. Propose a shared risk model: developer bears first 4% of curtailment (their original projection); offtaker bears next 2%; any curtailment above 6% is the developer's risk. The developer may agree because locking in the PPA relationship is preferable to losing the offtaker's volume entirely.

3. **REC replacement strategy.** Budget for annual replacement REC purchases to cover the shortfall. ERCOT wind RECs trade at $2-$4/MWh. A 15,000 REC shortfall costs $30,000-$60,000/year — manageable, but the cost grows if curtailment increases. Consider purchasing replacement RECs through a multi-year contract to lock in pricing.

4. **Transmission monitoring.** Track ERCOT's Long-Term System Assessment and regional transmission plans. New 345 kV lines from West Texas to North Central Texas are planned but typically take 5-7 years from approval to energization. Model the curtailment trajectory assuming transmission expansion occurs on ERCOT's published timeline, and model the scenario where it's delayed 2-3 years.

5. **Portfolio diversification.** For the next renewable procurement, avoid West Texas siting. Diversify to the Texas Gulf Coast (solar, lower curtailment) or outside ERCOT entirely (PJM wind/solar where curtailment is minimal). A portfolio of 2-3 projects across different regions reduces curtailment concentration risk.

**Key Indicators:**
- ERCOT curtailment orders exceeding 5% of annual hours for a specific generator region signals structural congestion
- ERCOT interconnection queue exceeding 2× existing generation capacity in a constrained zone is a bearish curtailment signal
- Developer reporting curtailment exceeding P90 projections in year 1 indicates the projections were based on outdated grid conditions

---

### Edge Case 9: Deregulated Market Re-Regulation Risk

**Situation:**
A retail chain with 200 stores across Ohio and Pennsylvania has 150 stores on competitive supply contracts (fixed-price, $0.058/kWh energy, average 36 months remaining). After a summer price spike that caused $800M in aggregate consumer cost increases statewide, the Ohio legislature introduces a bill to re-regulate the electricity market — returning all generation procurement to the regulated utilities at tariff rates.

The proposed bill would void all existing competitive supply contracts within 180 days of enactment and require all customers to return to utility standard service. The current utility standard service rate for commercial customers is $0.071/kWh energy — 22% higher than the chain's competitive rate.

The Ohio stores represent 120 of the 200 locations, consuming 95 GWh annually. If re-regulation occurs, the annual energy cost increase for Ohio alone would be approximately $1.24M (95 GWh × $0.013/kWh increase).

**Why It's Tricky:**
Re-regulation bills are introduced periodically but rarely enacted. However, this bill has political momentum because the summer price spike affected residential customers, and legislators want to "protect consumers." The bill is expected to reach committee vote within 4 months. Even if it doesn't pass, the legislative uncertainty creates contract enforcement risk — retail energy providers may attempt to add regulatory change provisions to new contracts, and existing contract renewal terms may include re-regulation exit clauses.

The more insidious risk: even without formal re-regulation, Ohio could introduce a "provider of last resort" surcharge, a competitive market administration fee, or other mechanisms that reduce the competitive supply discount. These incremental regulatory changes are more likely than full re-regulation and can erode 30-50% of the competitive savings.

**Common Mistake:**
Ignoring the legislative risk because "re-regulation never happens." It happened in Ohio once before (SB 221 in 2008 attempted partial re-regulation), and Virginia effectively re-regulated in 2007 before partially deregulating again. The second mistake: panicking and trying to exit competitive contracts — the contracts are favorable, and any exit would involve early termination fees.

**Expert Approach:**
1. **Assess probability.** Engage a regulatory affairs consultant or your energy supplier's government relations team to assess the bill's likelihood of passage. Track committee votes, sponsor count, and utility lobbying positions. If the utility supports re-regulation (they often do, as it restores their captive customer base), the bill has stronger prospects.

2. **Coalition advocacy.** Join or form a C&I customer coalition opposing re-regulation. Large commercial customers benefit most from competition and have the strongest voice against re-regulation. Provide testimony on the consumer savings from competitive supply — a retail chain saving $1.24M/year is a compelling data point.

3. **Contract review.** Examine existing supply contracts for regulatory change clauses. Most well-drafted competitive supply contracts include a provision allowing either party to terminate or renegotiate if the regulatory structure fundamentally changes. Understand your termination rights and the supplier's — if the supplier can exit your contract due to re-regulation, you lose your favorable rate but avoid paying an early termination fee.

4. **Hedging the Pennsylvania exposure.** If Ohio re-regulates, accelerate procurement for Pennsylvania stores. Lock in competitive rates for the maximum available tenor (36-48 months) while the Pennsylvania market remains competitive. Diversify supplier credit exposure in case one supplier exits the Ohio market.

5. **Contingency budgeting.** Model the financial impact of three scenarios:
   - Full re-regulation (Ohio energy cost increases $1.24M/year)
   - Partial re-regulation (competitive supply preserved for large C&I but with new surcharges — increase $400K-$600K/year)
   - Bill fails (no cost change, but future legislative risk remains)
   
   Present scenarios to the CFO with probability weights. Budget to the expected value.

**Key Indicators:**
- State legislature introducing electricity market reform bills after consumer price spike events
- Utility lobbying spend increasing for "market reform" or "default service enhancement"
- Residential customer complaint rates exceeding 3× historical average (political pressure builds)
- Governor or PUC chair making public statements about "market failure" in competitive supply

---

### Edge Case 10: Transmission Congestion Invalidating Procurement Strategy

**Situation:**
A chemical manufacturer with a 15 MW facility in southern New Jersey (JCPL zone, PJM) has been buying power at the PJM Western Hub price through a retail energy provider, with a $0.003/kWh adder. The Western Hub price of $38/MWh has been a reasonable proxy for the JCPL zone price historically (basis of $2-$4/MWh). The company's energy budget is built on $41/MWh all-in.

A new data center campus interconnected 8 miles from the chemical plant, adding 80 MW of load in the JCPL zone. Simultaneously, a 500 MW natural gas plant in the zone retired. The combination of added load and reduced generation created a transmission constraint. The JCPL zone day-ahead LMP jumped from $40/MWh to $58/MWh during peak hours, while the Western Hub price remained at $38/MWh. The basis between Western Hub and JCPL zone widened from $3/MWh to $18/MWh.

The company's retail supply contract settles at Western Hub + adder, but the company pays the utility for energy delivery at the zonal LMP. The net effect: the company is paying $38 + $3 (supplier) but the utility pass-through for congestion is $18/MWh, raising the effective cost to $59/MWh. Against a $41/MWh budget, the facility is running $18/MWh over — $2.36M/year on 131 GWh.

**Why It's Tricky:**
The supply contract is performing as agreed (Western Hub + $3). The congestion cost is a separate charge flowing through the utility bill. This is a market structure nuance that many C&I buyers don't model — they assume the hub price is approximately equal to their delivered price. When basis was $2-$4/MWh, this assumption was harmless. At $18/MWh, it's a $2.4M/year error.

The structural congestion is unlikely to reverse quickly — the data center load is permanent, the retired plant is not coming back, and new transmission or local generation takes 3-7 years to build.

**Common Mistake:**
Assuming the congestion is temporary and will revert to historical levels. Structural congestion caused by load growth and generation retirement is persistent until the grid is physically reconfigured. The second mistake: trying to renegotiate the supply contract — the supplier is delivering at the agreed-upon hub price and is not responsible for zonal congestion.

**Expert Approach:**
1. **Immediate contract restructuring:** Switch the supply contract settlement point from Western Hub to the JCPL zone (load zone pricing). The supplier will quote a higher price that reflects the zone premium, but this eliminates the basis exposure. The company pays a known, locked-in price that includes congestion, rather than a low hub price plus an unpredictable congestion pass-through.

2. **FTR procurement:** Purchase Financial Transmission Rights (FTRs) from Western Hub to the JCPL zone in PJM's monthly or annual FTR auction. An FTR pays the congestion component between the two points — if congestion is $18/MWh and you hold an FTR for your load volume, you receive $18/MWh × volume in FTR settlement, offsetting the congestion charge on your utility bill.

3. **On-site generation evaluation:** With zonal LMPs at $58/MWh during peak hours, the economics for on-site generation improve dramatically. A 5 MW natural gas combined heat and power (CHP) system generating at $40/MWh (fuel + O&M) would save $18/MWh on the kWh it generates. At 8,000 hours/year: $720K/year savings on a $7-$10M capital investment — strong payback.

4. **Long-term transmission monitoring:** Track PJM's Regional Transmission Expansion Plan (RTEP) for projects addressing the JCPL constraint. If PJM approves a transmission upgrade, the congestion may ease in 4-6 years. Factor this into the decision on long-term investments like CHP — if the congestion premium will disappear in 5 years, a CHP plant that was justified by congestion savings may not pencil on its own economics.

5. **Budget reforecast:** Immediately reforecast the energy budget using the new basis reality. Use $55-$60/MWh as the delivered cost assumption until the contract is restructured. Present to finance with a clear explanation of the structural change and the remediation timeline.

**Key Indicators:**
- PJM Congestion reports showing zonal basis >$10/MWh for >30% of peak hours indicates structural congestion
- Generator retirement announcements in your zone without replacement capacity signal worsening congestion
- Large load interconnection applications (data centers, industrial facilities) in your zone increase future congestion risk
- PJM RTEP project approvals targeting your constraint indicate relief timeline (but delivery is typically 4-7 years out)

**Documentation Required:**
- Hourly LMP data for Western Hub and JCPL zone (12+ months)
- Basis calculation spreadsheet (generation-weighted for PPA, load-weighted for supply)
- FTR auction bid strategy and results
- CHP feasibility study (if applicable)
- Budget reforecast with basis scenarios
- Communication log with supplier regarding settlement point change

**Resolution Timeline:**
- Week 1: Quantify basis exposure, pull LMP data, reforecast budget
- Week 2-3: Evaluate FTR procurement, contact supplier about settlement point change
- Month 2: Execute contract restructuring (settlement point or FTR hedge)
- Month 3-6: Monitor whether structural congestion persists, evaluate CHP or on-site generation
- Month 6-12: Reassess portfolio-level strategy for facilities in congested zones

---

### Edge Case 11: Retail Energy Provider Credit Deterioration Mid-Contract

**Situation:**
A healthcare system with 8 hospitals across Pennsylvania has a 36-month fixed-price electricity supply contract with GreenPeak Energy Solutions, a mid-tier retail energy provider. The contract covers 120 GWh/year at $0.058/kWh energy — well below the current market of $0.067/kWh. GreenPeak's S&P credit rating was BBB at contract signing. Eighteen months into the contract, GreenPeak is downgraded to BB+ (sub-investment grade) after reporting significant trading losses in the most recent quarter. Industry reports suggest GreenPeak overcommitted on fixed-price contracts when forward curves were low and is now underwater as market prices have risen.

The healthcare system's contract has a termination provision allowing either party to exit with 90 days' notice if a material adverse change occurs, including a credit downgrade below investment grade. If GreenPeak fails, the hospitals revert to the utility's default service at $0.071/kWh — a $1.56M annual cost increase.

**Why It's Tricky:**
The contract is favorable — $0.058/kWh is $0.009/kWh below market. Exercising the termination right is irrational (you'd voluntarily lose a below-market contract). But NOT exercising it means staying exposed to a supplier that may default. If GreenPeak declares bankruptcy, the contract may be rejected in bankruptcy court, and the hospitals lose the favorable rate anyway. The risk calculus: certain below-market pricing today vs. potential forced exit to above-market default service later.

Complicating factor: healthcare facilities cannot tolerate billing disruption. Hospitals must have unambiguous supply arrangements for regulatory compliance, and a supplier default triggers administrative chaos (account switches, utility enrollment, billing reconciliation) that disproportionately impacts a multi-site healthcare system.

**Common Mistake:**
Doing nothing because the contract is favorable and hoping GreenPeak survives. The second mistake: exercising the termination right immediately and losing the below-market rate. Both extremes are wrong.

**Expert Approach:**
1. **Credit monitoring (immediate):** Set up alerts for further credit actions on GreenPeak — S&P CreditWatch, Moody's review, and any SEC filings (8-K, 10-Q with going concern language). A further downgrade to BB or below, or a going concern note, significantly increases default probability.

2. **Contract review:** Examine the contract for:
   - **Adequate assurance clause:** Can you demand financial assurance (letter of credit, parent guarantee) from GreenPeak as a condition of continuing the contract? Many commercial supply contracts include this right upon a material credit event.
   - **Assignment rights:** Can the contract be assigned to another creditworthy supplier? If GreenPeak is acquired or merges with a stronger company, your contract may survive.
   - **Setoff rights:** If GreenPeak owes you credits (overcollections, reconciliation adjustments), can you offset those against future payments?

3. **Demand adequate assurance (Week 1):** Formally request that GreenPeak post a standby letter of credit equal to 3-6 months of expected below-market value. Calculate: ($0.067 market - $0.058 contract) × 120 GWh / 12 months × 6 months = $540,000 LC. This protects the healthcare system if GreenPeak defaults — the LC covers the cost of switching to a new supplier at market rates during the transition period.

4. **Parallel supplier qualification (Week 1-3):** Issue an expedited RFP to 3-4 investment-grade suppliers for a replacement contract. Obtain indicative pricing so you know exactly what the replacement cost would be if GreenPeak fails. This is not a commitment — it's insurance. Having a qualified backup supplier with a standing offer reduces the transition time from weeks to days.

5. **Hedging the replacement risk (Month 1):** If the replacement cost at market ($0.067) is significantly above your contract ($0.058), consider purchasing a financial hedge that pays out if you're forced to switch suppliers. Specifically, buy a call option on PJM electricity at a strike price of $0.060/kWh for the remaining contract volume. If GreenPeak defaults and you switch to a market-priced supplier, the call option offsets the cost increase above $0.060.

6. **Ongoing monitoring cadence:** Review GreenPeak's financial health monthly. Track: credit rating changes, SEC filings, employee LinkedIn departures (mass exits from a supplier signal trouble), utility regulatory filings (some states require REPs to post bonds), and industry rumors (energy industry is small — your broker will hear about financial distress before it hits the news).

**Key Indicators:**
- Supplier credit downgrade below BBB- (investment grade threshold) is the first warning
- Supplier requesting early payment, changing payment terms, or delaying customer credits signals cash flow problems
- Supplier laying off commercial/pricing staff suggests they're de-risking by not taking new business
- State utility commission audits of REP financial requirements may reveal shortfalls
- If 2+ other C&I buyers report the same supplier is requesting contract modifications, the supplier is restructuring its book

**Documentation Required:**
- Credit rating history and monitoring alerts
- Adequate assurance demand letter and GreenPeak response
- Replacement supplier indicative pricing
- Financial hedge evaluation (call option cost vs. benefit)
- Board-level risk assessment memo
- Contingency communication plan for hospitals (billing continuity)

**Resolution Timeline:**
- Week 1: Demand adequate assurance, initiate backup supplier RFP
- Week 2-3: Receive GreenPeak response to assurance demand, evaluate backup bids
- Month 1-2: If assurance is posted, continue monitoring. If refused, evaluate termination.
- Month 3+: Monthly credit monitoring until GreenPeak's financial position stabilizes or the contract expires

---

### Edge Case 12: Multi-State Portfolio with Mixed Regulated/Deregulated Markets

**Situation:**
A food and beverage company operates 35 facilities across 18 states: 15 manufacturing plants (2-12 MW each), 12 distribution centers (500 kW - 3 MW each), and 8 corporate/R&D offices (200-800 kW each). Total electricity consumption: 680 GWh/year, $58M annual energy spend. The facilities are split: 20 in deregulated markets (PJM, ERCOT, NYISO, ISO-NE), 10 in regulated markets (Georgia, Florida, Alabama, Tennessee), and 5 in markets with limited competition (partial deregulation or pilot programs).

The VP of Sustainability has committed the company to RE100 by 2030. The CFO wants 5% annual energy cost reduction. The Director of Operations wants zero disruption to production. Currently, each facility manages its own utility relationship — there is no centralized energy procurement function. Tariff selection, contract renewals, and demand charge management are handled by facility managers with no energy expertise, resulting in:
- 12 facilities on suboptimal tariff schedules (estimated $1.2M/year in unnecessary charges)
- 6 deregulated sites on utility default service (never switched to competitive supply — $2.1M/year above market)
- No demand charge management programs at any facility
- RE100 progress at 12% (entirely from unbundled RECs purchased by the sustainability team)

**Why It's Tricky:**
Building a centralized energy procurement function from scratch requires addressing every aspect simultaneously: competitive procurement in deregulated markets, tariff optimization in regulated markets, demand charge management at high-potential sites, renewable procurement to hit RE100, and budget forecasting and reporting across 35 facilities. With no existing infrastructure, even basic tasks like assembling interval data for 35 facilities take months.

The mixed regulatory landscape means no single strategy works everywhere. A VPPA that works for PJM sites is irrelevant for Georgia sites. Demand charge management that works at a manufacturing plant doesn't apply to an office. Tariff optimization requires state-by-state regulatory expertise.

**Common Mistake:**
Trying to do everything at once — hiring a consultant, issuing an enterprise RFP, signing a mega-VPPA, and installing batteries at every site simultaneously. This overwhelms the organization, produces poor execution on every front, and alienates facility managers who feel central procurement is disrupting their operations.

**Expert Approach:**
1. **Phase 0: Data assembly and baselining (Month 1-3).**
   Deploy an energy management information system (EMIS) like EnergyCAP, Urjanet, or UtilityAPI to automatically collect utility bill data for all 35 sites. This eliminates the manual data collection bottleneck. Target: complete 12-month utility bill history and interval data for all sites within 90 days.

2. **Phase 1: Quick wins (Month 2-6).** Prioritize actions with immediate savings and minimal disruption:
   - **Switch 6 default-service sites to competitive supply.** Issue an aggregated RFP covering all 6 sites (combined volume gives leverage). Expected savings: 10-15% on energy charges = $200K-$300K/year per site.
   - **Tariff audit all 35 sites.** Engage a tariff optimization consultant or use software to model each site against all available rate schedules. Switch 12 sites to optimal tariffs. Expected savings: $1.2M/year.
   - **Demand charge review for top 10 sites by demand charge cost.** Implement zero-cost measures (staggered startups, BAS programming) at the top 5 sites. Expected savings: $300K-$500K/year.

   Phase 1 total savings estimate: $2.5M-$4M/year, achievable within 6 months.

3. **Phase 2: Strategic procurement (Month 4-12).** With data and quick wins establishing credibility:
   - **Portfolio procurement for deregulated sites.** Aggregate 20 deregulated sites by ISO and issue portfolio RFPs. Use layered block-and-index structure for manufacturing (high load factor) and fixed-price for offices/DCs (lower load factor, less optimization potential).
   - **Demand charge capital projects.** Using Phase 1 analysis, identify 3-5 sites where battery storage or demand response has <5 year payback. Develop business cases and submit for capital approval.
   - **Renewable procurement strategy.** Design a phased RE100 roadmap:
     - Year 1-2: Switch unbundled RECs from national wind to project-specific solar RECs (better additionality, modest cost increase)
     - Year 2-3: Execute first VPPA (100-150 GWh/year) targeting PJM or MISO sites
     - Year 3-4: Add a second VPPA or physical PPA for ERCOT sites
     - Year 4-5: On-site solar at 5-8 facilities with favorable economics
     - Year 5-6: Utility green tariffs or community solar for regulated market sites

4. **Phase 3: Optimization and continuous improvement (Year 2+).** With infrastructure in place:
   - Implement real-time energy monitoring and automated demand response at top 15 sites
   - Build internal capability for capacity tag management (PJM, ISO-NE)
   - Establish a quarterly energy procurement committee (finance, sustainability, operations, procurement)
   - Develop forward-looking energy risk management policy with hedge ratios and governance

5. **Governance and reporting:** From Day 1, establish a reporting framework:
   - Monthly: energy cost vs. budget by site, demand charge performance, supply contract status
   - Quarterly: portfolio-level hedge ratio, RE100 progress, supplier scorecard, market outlook
   - Annually: total energy spend vs. prior year (weather-normalized), cost avoidance from optimization, sustainability target progress, 3-year procurement strategy refresh

**Key Indicators:**
- If quick wins (Phase 1) don't deliver $2M+ in annual savings, the baseline analysis was wrong — revisit data
- Facility manager resistance to centralized procurement is the #1 implementation risk — address it through communication and shared savings incentives
- RE100 progress requires committed procurement volume, not just REC purchases — if RE% stalls at 30-40%, it's because the VPPA/PPA pipeline isn't producing
- Total energy cost as a percentage of revenue should decrease YoY (weather-normalized) — if it's flat or increasing, the optimization program isn't working

**Documentation Required:**
- 35-site energy baseline (utility bills, interval data, tariff schedules, contracts)
- Phase 1 savings tracking (actual vs. projected by initiative)
- Portfolio procurement RFP and award documentation
- RE100 roadmap with annual milestones and procurement commitments
- Energy risk management policy
- Capital project business cases for demand-side investments
- Quarterly energy management committee reports

**Resolution Timeline:**
- Month 1-3: Data assembly, EMIS deployment, Phase 0 complete
- Month 2-6: Phase 1 quick wins executed, $2.5M-$4M/year savings captured
- Month 4-12: Phase 2 strategic procurement, first VPPA executed
- Year 2: Phase 3 optimization, demand-side capital projects operational
- Year 3: RE100 at 50%+, energy cost reduction at 15%+ from baseline
- Year 5: RE100 at 80%+, fully mature energy management program

---

### Edge Case 13: Natural Gas Supply Disruption During Winter Heating Season

**Situation:**
A pharmaceutical manufacturer in New Jersey operates a 150,000 sq ft production facility with a 6,000 MMBtu/month winter natural gas load (process heat for API synthesis plus facility heating). The facility is on a firm transportation gas contract with a local distribution company (LDC) at a rate of $8.50/MMBtu delivered. During a prolonged January cold snap (15 consecutive days below 15°F), the LDC issues an Operational Flow Order (OFO) restricting deliveries to critical-use customers only. The pharmaceutical plant's gas supply is not classified as "critical use" under the LDC's tariff — hospitals and residential heating take priority.

The OFO reduces the facility's gas allocation to 60% of normal. The remaining 40% (2,400 MMBtu/month) must be sourced on the spot market through an alternative supply arrangement, or the facility must curtail operations. Spot gas at the Transco Zone 6 delivery point is trading at $28/MMBtu — more than 3× the contract rate. Alternatively, the facility could switch some process heat to electric resistance heating, but this would increase electricity demand by 1.8 MW during a period when electricity prices are also elevated ($180/MWh due to gas-fired generation being price-setting at high gas prices).

The pharmaceutical product in process has a 72-hour window before it must be temperature-controlled or destroyed — $4.2M worth of active pharmaceutical ingredient is at risk.

**Why It's Tricky:**
The facility faces a trilemma: (1) pay $28/MMBtu spot gas to maintain full operations (4× the normal cost), (2) switch to electric heating at $180/MWh equivalent cost (which may be even more expensive per BTU than spot gas), or (3) curtail production and risk $4.2M in product loss. None of these options is clearly superior, and the decision must be made within hours.

The LDC's OFO is legally enforceable — the tariff allows curtailment of non-critical-use customers during supply emergencies. The facility's "firm" gas contract is firm for transportation, but the OFO overrides transportation priority during emergencies. This is a distinction most facility managers don't understand until it happens.

**Common Mistake:**
Assuming "firm" gas service means guaranteed delivery under all conditions. Firm transportation is firm relative to interruptible service — but OFOs can curtail even firm customers. The second mistake: relying entirely on gas without a dual-fuel backup for critical process heat.

**Expert Approach:**
1. **Immediate triage (Hour 0-2):** Calculate the cost of each option per MMBtu equivalent:
   - Spot gas: $28/MMBtu delivered
   - Electric resistance heating: $180/MWh ÷ 3,412 BTU/kWh × 1,000,000 = $52.75/MMBtu equivalent (even more expensive than spot gas and subject to demand charge spikes)
   - Product loss: $4.2M ÷ 72 hours = $58,333/hour of delay. Even at $28/MMBtu, running the process heat costs far less than product loss.

   **Decision: Purchase spot gas at $28/MMBtu for process heat. Use electric heating only for space heating (lower priority, can tolerate temperature setback).**

2. **Spot gas procurement (Hour 0-4):** Contact your gas marketer or broker to secure spot supply at Transco Zone 6. Request a 15-day deal (covering the forecast cold snap duration). Negotiate for a fixed daily quantity with a price cap rather than floating daily pricing — during extreme events, daily spot prices can swing $10-$15/MMBtu between morning and afternoon.

3. **Demand charge protection (Hour 0):** If switching any load to electric heating, install temporary demand limiting controls. A 1.8 MW increase in electric demand at a $15/kW demand rate = $27,000/month in additional demand charges, plus potential ratchet impact. If possible, offset the added electric load by curtailing other electric loads (lighting, non-essential compressed air).

4. **Dual-fuel capability assessment (Week 2, post-event):** After the event, evaluate installing dual-fuel capability for the critical process heat systems. A dual-fuel burner that can switch between gas and #2 fuel oil costs $150K-$300K for a 6,000 MMBtu/month system. With fuel oil on-site in a storage tank, the facility can maintain operations during gas curtailments without relying on spot gas or electric conversion. Annual carrying cost (tank rental, fuel turnover): $25K-$40K.

5. **LDC tariff engagement (Month 2-3):** Petition the LDC to reclassify the pharmaceutical facility as "critical use" under the tariff. Pharmaceutical manufacturing has arguments for critical use designation: product at risk of destruction, FDA compliance implications, public health importance. The reclassification requires a tariff filing with the state utility commission — engage regulatory counsel.

6. **Contractual protection (next renewal):** At the next gas contract renewal, negotiate a "firm-firm" or "no-notice" transportation agreement that provides the highest curtailment priority available from the LDC. This costs 10-20% more than standard firm transportation but eliminates OFO exposure. Alternatively, negotiate a "supplemental supply" agreement with a gas marketer that automatically activates when the LDC issues an OFO — pre-arranged backup supply at a pre-negotiated spread above the index.

**Key Indicators:**
- Weather forecasts showing >10 consecutive days below 20°F in the Northeast signal potential OFO conditions
- LDC "system alerts" or "constraint days" preceding a full OFO — act on alerts, don't wait for the OFO
- Henry Hub spot gas exceeding $5/MMBtu during winter signals tight national supply — regional prices will spike harder
- Electricity price correlation: when gas spot is elevated, electricity spot is elevated proportionally — electric heating is not a cheap alternative during gas supply emergencies

**Documentation Required:**
- LDC Operational Flow Order notification and curtailment percentage
- Spot gas purchase confirmations and pricing
- Product-at-risk calculation and decision documentation
- Electric load impact and demand charge analysis
- Post-event dual-fuel capability feasibility study
- LDC tariff reclassification petition (if pursuing critical use designation)
- Gas contract renewal strategy with enhanced curtailment protection

**Resolution Timeline:**
- Hour 0-4: Triage, spot gas procurement, demand limiting controls
- Days 1-15: Manage blended gas supply (contract + spot), monitor cold snap duration
- Week 3: Post-event financial analysis, present cost impact to management
- Month 2-3: Initiate dual-fuel feasibility study, LDC tariff reclassification
- Month 4-6: Install dual-fuel capability (if approved), negotiate enhanced gas contract
- Next renewal: Execute firm-firm or no-notice gas transportation agreement
