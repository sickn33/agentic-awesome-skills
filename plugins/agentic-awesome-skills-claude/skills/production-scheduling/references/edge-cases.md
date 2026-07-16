# Production Scheduling — Edge Cases Reference

> Tier 3 reference. Load on demand when handling complex or ambiguous production scheduling situations that don't resolve through standard sequencing and dispatching workflows.

These edge cases represent the scenarios that separate experienced production schedulers from everyone else. Each one involves competing constraints, imperfect data, time pressure, and real operational exposure. They are structured to guide decision-making when standard scheduling rules break down.

---

## How to Use This File

When a scheduling situation doesn't fit a clean pattern — when constraints shift mid-shift, when multiple disruptions compound, or when commercial pressure conflicts with physical reality — find the edge case below that most closely matches the situation. Follow the expert approach step by step. Document every decision and override so the shift handover and post-mortem have a clear trail.

---

### Edge Case 1: Shifting Bottleneck Mid-Shift

**Situation:**
A contract manufacturer produces aluminium housings for two automotive OEMs. The morning schedule loads the CNC machining centre at 92% utilisation and the powder coating line at 78% — machining is the constraint. At 10:00 AM, the product mix shifts as a batch of large, complex housings clears CNC (short cycle time per unit for the next batch of small housings) and hits the powder coat line, which now requires extended cure cycles. By 11:00 AM, CNC utilisation has dropped to 70% and powder coat is at 95%. The schedule optimised around CNC as the constraint is now starving CNC (which has excess capacity) while powder coat backs up with WIP stacking on the staging rack.

**Why It's Tricky:**
Most scheduling systems set the constraint at the planning stage and hold it fixed for the shift. When the constraint shifts intra-shift, the buffer management, subordination logic, and priority sequencing all become wrong simultaneously. The CNC buffer is unnecessarily large (tying up WIP), while the powder coat buffer doesn't exist and the line is starving.

**Common Mistake:**
Ignoring the shift because "machining is the constraint this week" based on the weekly capacity plan. Or overreacting by completely re-sequencing the shift, creating chaos on the shop floor.

**Expert Approach:**
1. Recognise the shift by monitoring real-time WIP levels. WIP accumulating before powder coat while CNC's outfeed staging area is empty is the leading indicator.
2. Verify the duration: is this a temporary product-mix effect (2–3 hours) or will it persist for the rest of the shift? Check the remaining work order sequence.
3. If temporary (< 3 hours): do not re-sequence the entire shift. Instead, tactically re-prioritise the 2–3 jobs in the powder coat queue to minimise setup changes (colour sequencing), and slow CNC's release rate to avoid over-building the WIP queue.
4. If persistent (rest of the shift): formally re-designate powder coat as the shift's constraint. Apply constraint protection: pre-stage next jobs at the powder coat line, stagger CNC completions to match powder coat's processing rate, and assign the most experienced operator to the powder coat line.
5. At shift handover, document the constraint shift and the product mix that caused it so the incoming scheduler plans accordingly.

**Documentation Required:**
- Time of constraint shift detection
- Product mix analysis showing utilisation crossover
- Tactical adjustments made (CNC pacing, powder coat priority changes)
- Impact on customer orders (any due date revisions)
- Shift handover note for the incoming scheduler

**Resolution Timeline:**
- 0–15 min: Detect the WIP imbalance
- 15–30 min: Verify duration and decide on tactical vs. full re-sequence
- 30–60 min: Implement adjustments and confirm stabilisation
- Shift end: Document and hand over

---

### Edge Case 2: Certified Operator Absent for Regulated Process

**Situation:**
A pharmaceutical contract manufacturer operates a tablet coating line that requires an FDA-qualified operator (documented training, competency assessment, and supervisor sign-off per 21 CFR Part 211). The night shift has two qualified coating operators: Maria (12 years experience) and Jamal (3 years, recently qualified). At 10:30 PM, Jamal — tonight's scheduled coating operator — calls in sick. Maria works day shift and is off-site. The coating line has 6 hours of work scheduled tonight that feeds a customer shipment due in 3 days. No other night-shift operator has the FDA qualification for this specific process step.

**Why It's Tricky:**
This is a hard regulatory constraint, not a soft preference. Running the coating line with an unqualified operator is a GMP violation that can trigger an FDA Form 483 observation, product recall, or facility warning letter. The cost of non-compliance vastly exceeds any production delay. But the customer shipment is for a hospital network, and delays affect patient medication availability.

**Common Mistake:**
Running the line with an "almost qualified" operator who has completed training but hasn't finished the competency assessment documentation. This is a regulatory violation regardless of the operator's actual skill level.

**Expert Approach:**
1. Confirm that no other night-shift employee holds the qualification. Check the cross-training matrix — not just coating operators, but anyone on night shift who may have been cross-trained on this line (maintenance technicians sometimes hold process qualifications).
2. Contact Maria. Can she work a split shift (come in at midnight, work 6 hours, leave at 6 AM)? Check the union contract and fatigue rules — most agreements require an 8-hour rest between shifts. If Maria left day shift at 3:30 PM, she is eligible to return at 11:30 PM under an 8-hour rest rule.
3. If Maria is available and willing: authorise overtime, document the reason (single-point-of-failure staffing event), and adjust the coating schedule to start when she arrives.
4. If Maria is unavailable: stop the coating line. Do not attempt a workaround. Re-sequence the night shift to run non-regulated operations (packaging, labelling, material preparation for the next coating run). Calculate the impact on the customer shipment: can 6 hours of coating work be completed on the day shift (with overtime if needed) and still meet the 3-day deadline?
5. Escalate to the production manager and quality assurance manager. If the customer deadline cannot be met, notify the customer immediately with a revised delivery date. For pharmaceutical customers, "we maintained GMP compliance" is a stronger position than "we cut corners to hit the date."
6. Post-incident: submit a request to cross-train 2 additional night-shift operators on the coating process. Single-point-of-failure on a regulated process is a systemic risk.

**Documentation Required:**
- Cross-training matrix review (who holds the qualification, who does not)
- Maria's contact record and response
- Overtime authorisation (if applicable) with union compliance check
- Re-sequenced night schedule showing non-regulated work
- Customer notification (if shipment delayed)
- CAPA (Corrective and Preventive Action) for cross-training gap

**Resolution Timeline:**
- 10:30 PM: Absence confirmed
- 10:30–11:00 PM: Cross-training matrix review, Maria contacted
- 11:00 PM: Decision made (Maria coming in, or coating line stopped)
- 11:15 PM: Re-sequenced schedule published for night shift
- Next business day: CAPA initiated for cross-training

---

### Edge Case 3: Competing Rush Orders from Tier-1 Customers

**Situation:**
A precision machining job shop receives two emergency orders on the same Monday morning:

- **Customer A (major automotive OEM):** 500 transmission valve bodies needed by Thursday. Their assembly line is down waiting for these parts. Contractual penalty: $25,000/day of late delivery. Annual revenue from Customer A: $4.2M.
- **Customer B (aerospace prime contractor):** 200 fuel system brackets needed by Friday. Their production schedule slips 1 week for every day of delay on these brackets. No contractual penalty, but Customer B is in a competitive evaluation and a slip here could cost the $8M annual contract renewal in Q3.

Both orders require the same 5-axis CNC machining centre (the plant's constraint), and the combined processing time exceeds the available capacity by 16 hours.

**Why It's Tricky:**
This is not a scheduling problem — it's a commercial decision disguised as a scheduling problem. The scheduler can identify the tradeoff and quantify it, but the decision on which customer to prioritise requires management input on strategic relationships, risk tolerance, and commercial exposure.

**Common Mistake:**
The scheduler makes the commercial decision unilaterally, typically defaulting to the contractual penalty (Customer A) without presenting the strategic risk (Customer B). Or the scheduler tries to split the capacity equally, resulting in both orders being late.

**Expert Approach:**
1. Quantify both scenarios precisely:
   - **Prioritise A:** Customer A ships Thursday (on time). Customer B ships the following Monday (3 days late). Customer B cost: potential $8M contract risk, unquantifiable but real.
   - **Prioritise B:** Customer B ships Friday (on time). Customer A ships Saturday (2 days late). Customer A cost: $50,000 in contractual penalties + relationship damage.
   - **Split capacity:** Customer A ships Friday (1 day late, $25K penalty). Customer B ships Monday (3 days late, contract risk).
2. Identify capacity recovery options:
   - Saturday overtime on the CNC (8 hours, cost ~$3,200). If authorised, both orders can be completed on time: A by Thursday, B by Saturday.
   - Subcontract the simpler machining operations for Customer B to a qualified external shop, freeing 8 hours of CNC capacity for Customer A. Cost: $4,500 for subcontracting + expedited freight.
3. Present the tradeoff matrix to the production manager and sales director with recommended option (overtime or subcontracting, not splitting capacity). Include the cost comparison.
4. Once the decision is made, re-sequence the entire CNC schedule for the week. Lock the frozen zone on the decided sequence. Communicate to both customers.

**Documentation Required:**
- Capacity analysis showing the 16-hour shortfall
- Tradeoff matrix with financial exposure for each scenario
- Recommended recovery options with cost estimates
- Management decision record (who decided, which option, rationale)
- Customer communication log

**Resolution Timeline:**
- Monday AM: Both rush orders received
- Monday AM + 2 hours: Capacity analysis and tradeoff matrix completed
- Monday AM + 4 hours: Management decision
- Monday PM: Re-sequenced schedule published, customers notified

---

### Edge Case 4: MRP Phantom Demand from BOM Error

**Situation:**
The scheduler notices that MRP has generated a planned production order for 3,000 units of a sub-component (Part #SC-4420, a machined bracket) with a due date in 2 weeks. This is unusual — this part typically runs in batches of 500 for the two product families that consume it. A check of the current sales orders and forecast shows demand for only 800 units over the next 6 weeks. The MRP-generated demand of 3,000 appears to be phantom.

Investigation reveals that an engineer updated the BOM for a new product variant (not yet released) and accidentally set the quantity-per of SC-4420 to 12 instead of 1 on the master BOM. The MRP explosion multiplied forecasted demand for the new variant (250 units) by 12, generating 3,000 units of phantom demand. The BOM error has not yet been caught by engineering.

**Why It's Tricky:**
Scheduling systems trust MRP output. If the scheduler blindly converts the planned order to a production order and schedules it, the plant will produce 2,200 units of unwanted inventory, consuming 44 hours of machining capacity that was needed for real customer demand. But if the scheduler ignores MRP output without proper verification, they risk missing legitimate demand.

**Common Mistake:**
Scheduling the MRP-generated order without questioning it ("the system says we need it"), or deleting it without notifying engineering about the BOM error (the error persists and generates phantom demand again in the next MRP run).

**Expert Approach:**
1. **Verify the anomaly:** Compare the MRP-generated demand to the trailing 6-month demand history for SC-4420. A 3× spike with no corresponding sales order or forecast increase is a red flag.
2. **Trace the demand:** Use MRP pegging (SAP: MD04/MD09, Oracle: pegging inquiry) to trace the planned order back to the parent demand that generated it. This reveals which parent product's BOM is driving the demand.
3. **Identify the root cause:** The pegging trace points to the new product variant BOM. Compare the BOM quantity-per to the engineering drawing — the drawing shows 1 unit per assembly, the BOM shows 12.
4. **Do not schedule the phantom demand.** Place a hold on the planned order with a note explaining the suspected BOM error.
5. **Notify engineering immediately.** Provide the specific BOM line, the quantity discrepancy, and the MRP impact. Request urgent correction.
6. **Schedule the real demand:** Create a production order for the actual 800-unit requirement and sequence it normally.
7. **Verify the fix:** After engineering corrects the BOM, re-run MRP for SC-4420 and confirm the planned orders now align with expected demand.

**Documentation Required:**
- Anomaly detection: what triggered the investigation (volume spike, capacity conflict)
- MRP pegging trace results
- BOM error details (parent item, line item, incorrect vs. correct quantity)
- Engineering notification with correction request
- Production order for actual demand
- Verification after BOM correction

**Resolution Timeline:**
- Day 1: Anomaly detected during schedule review
- Day 1 + 2 hours: Pegging trace and root cause identified
- Day 1 + 4 hours: Engineering notified, phantom order held
- Day 2–3: Engineering corrects BOM, MRP re-run
- Day 3: Verified — phantom demand eliminated

---

### Edge Case 5: Quality Hold on WIP Inventory Affecting Downstream

**Situation:**
A metal fabricator discovers a dimensional defect on a batch of 200 stamped chassis frames at the weld inspection station. The defect — a hole pattern shifted 2mm from specification due to a worn die — affects the entire batch produced since the last die change 3 shifts ago. Of the 200 affected frames: 80 are in welding (current operation), 60 have completed welding and are in paint queue, and 60 have completed paint and are in final assembly staging. Final assembly is the plant's constraint, and these 60 painted frames were scheduled to feed the constraint starting tomorrow morning. The customer (a commercial HVAC manufacturer) has a firm delivery commitment for 150 assembled units on Friday.

**Why It's Tricky:**
The quality hold cascades across three production stages. Some units may be reworkable (the hole pattern might be re-drilled), but rework adds operations to the routing and consumes capacity. The constraint (final assembly) will starve tomorrow if the 60 painted frames are quarantined. And the die that caused the defect needs to be replaced before more frames can be stamped, adding a maintenance operation to the schedule.

**Common Mistake:**
Quarantining only the 80 frames at welding (the point of detection) and allowing the 60 painted frames to proceed to assembly. If the defect makes assembly impossible or causes field failures, the cost of rework/recall after assembly is 5–10× the cost of catching it now.

**Expert Approach:**
1. **Full containment:** Quarantine all 200 frames across all three stages immediately. Tag, segregate, and document. No exceptions — even frames that "look fine" at paint stage may have the shifted hole pattern.
2. **Assess reworkability:** Can the 2mm shift be corrected? Options:
   - Re-drill the hole pattern at the correct location (if material allows, the shifted holes will remain as cosmetic defects — check if customer spec allows).
   - Weld-fill the incorrect holes and re-drill (expensive, time-consuming, may not pass NDT for structural components).
   - Scrap all 200 and restart from raw material (if re-drilling is not viable).
3. **Schedule the constraint feed:** The constraint (final assembly) needs 60 frames tomorrow. If rework is feasible and fast enough:
   - Expedite rework of the 60 painted frames first (they are furthest along).
   - Schedule rework as an additional operation in the routing with its own time estimate.
   - If rework takes 0.5 hours per frame and you assign 2 rework operators, 60 frames = 15 hours = 2 shifts.
   - The constraint will be short frames for tomorrow's day shift. Can you pull forward other work at the constraint (different product) to fill the gap? If yes, do that and push the HVAC assembly to tomorrow's night shift or Wednesday.
4. **Fix the die:** Replace or re-sharpen the stamping die before producing any new frames. Add a first-piece dimensional inspection requirement after the die change. If the die is a custom tool with a 2-week replacement lead time, have tooling assess whether the current die can be ground and requalified as a temporary measure.
5. **Customer communication:** If Friday delivery is at risk, notify the customer by end of business today. Provide a revised ETA based on the rework timeline.

**Documentation Required:**
- Defect description, quantity affected, production stages
- Containment actions and quarantine locations
- Rework assessment (feasibility, time, cost)
- Revised schedule showing constraint feed plan
- Die replacement/repair plan
- Customer notification (if delivery impacted)
- CAPA for die wear monitoring (preventive inspection schedule)

**Resolution Timeline:**
- Hour 0: Defect detected at weld inspection
- Hour 0–1: Full containment across all stages
- Hour 1–3: Rework feasibility assessment
- Hour 3–4: Revised schedule published with rework operations
- Hour 4: Customer notified if delivery impacted
- Day 2–3: Rework completed, constraint fed
- Week 1: Die replaced or requalified

---

### Edge Case 6: Equipment Breakdown at the Constraint

**Situation:**
The main CNC horizontal boring mill — the plant's constraint for large machining operations — suffers a hydraulic pump failure at 9:15 AM on a Wednesday. Maintenance assessment: pump replacement requires 6–8 hours, but the replacement pump must be sourced from the OEM distributor 4 hours away. Realistic return-to-service: Thursday 6:00 AM (20+ hours of constraint downtime). Current work in the machine: a $38,000 defence contract part, 6 hours into an 8-hour operation — incomplete, cannot be removed without scrapping. 14 additional jobs are queued behind it, representing $220,000 in customer orders due within 2 weeks.

**Why It's Tricky:**
Every hour of constraint downtime directly reduces plant throughput. 20 hours at a constraint generating $800/hour in throughput = $16,000 in lost output. The defence part in the machine presents a dilemma: can it be completed when the machine restarts (will the part datum be preserved?), or is it scrap?

**Common Mistake:**
Waiting for the repair to complete before re-planning. By then, 20 hours of schedule disruption have cascaded through the plant with no mitigation.

**Expert Approach:**
1. **Immediate (0–15 min):**
   - Confirm maintenance's repair estimate. Ask: is there a faster temporary fix (bypass, rental equipment)? Can the OEM ship the pump by overnight freight instead of driving?
   - Determine if the in-machine part can resume after repair. Consult the machinist: are the datum offsets preserved? If the machine can restart the interrupted operation from the last completed tool path, the part is salvageable. If not, it may need to be re-fixtured and re-qualified, adding 2–3 hours but saving the $38,000 part.
2. **Short-term (15 min – 2 hours):**
   - Identify alternate routings: which of the 14 queued jobs can be processed on a smaller vertical CNC? The tolerances may allow some jobs to run on alternate equipment, even if cycle times are longer. Move those jobs immediately.
   - Re-sequence remaining jobs by customer priority (EDD + customer tier weighting). When the constraint restarts Thursday AM, the first job in the queue must be the highest-priority item.
   - Calculate customer impacts: which of the 14 jobs will miss due dates? Prepare a customer notification for each affected order.
3. **Medium-term (2–20 hours, while machine is down):**
   - Pre-stage everything for the queued jobs: tooling, raw material, fixtures, programs, operator assignments. When the machine restarts, the first job should begin within 15 minutes of the machine's green light.
   - Evaluate whether Saturday overtime (8–16 hours) can recover the lost production. Cost of overtime vs. cost of late deliveries.
   - Contact qualified external machining shops for the most at-risk orders. Can they process any of the 14 jobs faster than your recovery schedule?
4. **Recovery (Thursday AM onward):**
   - Restart with the salvaged in-machine part (if viable) or load the highest-priority queued job.
   - Run the constraint through all breaks and shift changes (stagger operators).
   - Monitor recovery pace hourly against the recovery schedule.

**Documentation Required:**
- Breakdown time, root cause, repair timeline
- In-machine part assessment (salvageable Y/N, additional cost)
- Alternate routing analysis for queued jobs
- Customer impact list with revised ETAs
- Overtime/subcontracting cost analysis
- Recovery schedule with hourly milestones

**Resolution Timeline:**
- 9:15 AM: Breakdown
- 9:15–9:30 AM: Maintenance assessment and pump sourcing
- 9:30–11:00 AM: Alternate routing analysis, re-sequencing, customer notifications
- 11:00 AM – Thursday 6:00 AM: Pre-staging, subcontracting decisions, recovery planning
- Thursday 6:00 AM+: Machine restarts, recovery schedule executed
- Friday: Recovery progress assessment — overtime decision for Saturday

---

### Edge Case 7: Supplier Delivers Wrong Material Mid-Run

**Situation:**
A structural steel fabricator is midway through a production run of 100 beam assemblies for a commercial construction project. Each assembly requires Grade 350 structural steel plate (AS/NZS 3678). At 2:00 PM, the quality inspector checking the second material delivery of the day discovers the mill certificates show Grade 250 instead of Grade 350. The first delivery (Grade 350, correct) fed the first 40 assemblies. The second delivery (Grade 250, wrong) has been kitted into the staging area for assemblies 41–70, and 12 plates from this delivery have already been cut and are at the welding station.

**Why It's Tricky:**
Grade 250 steel has lower yield strength than Grade 350 — assemblies made from it could be structurally inadequate and unsafe. The 12 cut plates cannot be used. But 28 plates from the wrong delivery are still uncut and could be returned. The production line is currently running and operators are about to start welding the incorrect material.

**Common Mistake:**
Continuing production and hoping the customer won't notice (this is a structural integrity and safety issue — non-negotiable). Or shutting down the entire line when only assemblies 41–70 are affected — assemblies 71–100 can use material from a different source if available.

**Expert Approach:**
1. **Stop welding immediately** on any piece using the Grade 250 material. Pull the 12 cut plates from the welding station and quarantine them with clear "HOLD — WRONG MATERIAL" tags.
2. **Segregate the remaining 28 uncut plates** from the wrong delivery. These can be returned to the supplier or used for non-structural orders that specify Grade 250.
3. **Continue production on assemblies 71–100** using material from existing Grade 350 stock (check if there is sufficient on-hand inventory from other purchase orders or stock). If Grade 350 stock is available for assemblies 71–100, the line does not need to stop entirely.
4. **Assemblies 41–70 are now blocked.** Contact the supplier for emergency replacement of 30 Grade 350 plates. Demand same-day or next-day delivery at the supplier's cost (this is a supplier error). If the supplier cannot respond fast enough, source from an alternative supplier.
5. **The 12 cut plates** in Grade 250 are scrap for this project. Calculate the scrap cost (material + cutting labour) and include it in the supplier claim.
6. **Reschedule assemblies 41–70** to start after replacement material arrives. In the meantime, sequence assemblies 71–100 first (if material is available) to keep the welding line productive.
7. **Notify the customer** if the construction project delivery timeline is affected. For structural steel, customers prefer a delay over incorrect material grade — this is a safety issue.

**Documentation Required:**
- Material non-conformance report with mill certificate evidence
- Quarantine records for the 12 cut plates and 28 uncut plates
- Supplier notification and replacement delivery commitment
- Revised production schedule showing assemblies 71–100 pulled forward
- Scrap cost calculation for the supplier claim
- Customer notification (if delivery impacted)

---

### Edge Case 8: Overtime Ban During Peak Demand

**Situation:**
A consumer electronics assembly plant is entering its busiest 6-week period (back-to-school and early holiday orders). The production plan requires 132% of standard capacity at the constraint (SMT pick-and-place line) to meet all customer commitments. Normally, 32% of capacity comes from Saturday overtime shifts. However, the union just notified management that it is invoking the collective agreement clause limiting overtime to 5 hours per employee per week (down from the usual 15-hour soft cap) due to a dispute over shift differential rates. Negotiations are expected to take 3–5 weeks.

**Why It's Tricky:**
The plant was counting on Saturday overtime as the primary capacity lever. Without it, 32% of demand is unfillable. But the 5-hour limit still allows some daily overtime (1 hour/day Mon–Fri = 5 hours/week), which partially offsets. The scheduler must find 20–25% additional effective capacity from other sources while respecting the union constraint.

**Common Mistake:**
Pressuring operators to work "off the books" (violates the collective agreement and exposes the company to legal liability). Or accepting a 20–25% shortfall without exploring all alternatives.

**Expert Approach:**
1. **Quantify the gap precisely:** Standard capacity at constraint = 120 hours/week. Required = 158.4 hours. Overtime now available = 1 hour/day × 5 days × number of qualified operators. If 4 operators run the SMT line and each can do 5 hours/week OT, that's 20 hours/week of overtime capacity, bringing effective capacity to 140 hours. Remaining gap: 18.4 hours/week.
2. **Exploit the constraint (no capital):**
   - Reduce changeovers on SMT: consolidate product families, campaign-schedule similar board types together. Target: recover 4–6 hours/week from reduced changeover time.
   - Run through all breaks and shift changes with staggered relief operators. Target: recover 2–3 hours/week.
   - Reduce micro-stops through preventive maintenance during non-production hours. Target: recover 1–2 hours/week.
3. **Temporary labour:** Can temporary agency operators run non-constraint operations, freeing experienced operators to double up at the constraint? The SMT line requires certification, but downstream operations (manual assembly, testing, packaging) may accept temporary labour.
4. **Subcontract non-constraint work:** If downstream operations (conformal coating, testing) can be subcontracted, the freed-up internal capacity can be redirected to support constraint throughput (material handling, staging, quality inspection at the SMT line).
5. **Customer prioritisation:** If the gap cannot be fully closed, rank customer orders by value and contractual penalty exposure. Allocate constraint capacity to the highest-priority orders first. Negotiate delivery extensions with lower-priority customers before the original due date — proactive notification preserves the relationship.
6. **Demand shaping:** Work with sales to shift some orders from the peak 6-week window to the 2 weeks before or after, if customers have flexibility. Even moving 5% of demand out of peak reduces the capacity gap significantly.

**Documentation Required:**
- Capacity analysis showing the gap (hours/week) with and without overtime
- Constraint exploitation plan with estimated recovery per initiative
- Temporary labour and subcontracting options with cost and timeline
- Customer prioritisation matrix
- Demand shaping proposals to sales
- Weekly progress tracking against the gap closure plan

---

### Edge Case 9: Customer Order Change After Production Started

**Situation:**
A custom industrial equipment manufacturer is 60% through a production order for Customer X: 20 hydraulic press frames, each with a 3-week machining cycle. 12 frames are complete through machining and in welding. 4 frames are in machining. 4 frames have not started (raw material cut but not machined). Customer X contacts sales to change the specification: they now need 15 frames at the original spec and 5 frames at a modified spec (different mounting hole pattern, additional reinforcement welds). The modified spec requires re-programming the CNC, a different welding fixture, and a revised quality inspection plan. Delivery date is unchanged.

**Why It's Tricky:**
The 12 completed frames and 4 in-process frames are at the original spec. If the change applies to any of these, the rework cost is substantial (re-machining mounting holes, adding welds to finished frames). The 4 unstarted frames can be built to the new spec without rework. But the customer wants 5 modified frames, and only 4 are unstarted.

**Common Mistake:**
Accepting the change without quantifying the rework cost and schedule impact, or rejecting the change outright without exploring options.

**Expert Approach:**
1. **Analyse the change impact by production stage:**
   - 4 unstarted frames: can be built to modified spec with no rework. CNC reprogramming takes 4 hours. Welding fixture modification takes 6 hours.
   - 4 frames in machining: modification requires adding the new mounting holes, which can be done as an additional machining operation before the frames leave CNC. Added time: 2 hours per frame = 8 hours.
   - 12 completed frames at welding: modification would require returning frames to CNC (re-fixturing, new hole pattern), then additional welding operations. Cost: $1,200 per frame rework + 4 hours per frame on the CNC constraint. This is expensive and uses 48 hours of constraint capacity.
2. **Propose the least-cost solution:**
   - Build 4 unstarted frames to modified spec.
   - Modify 1 of the 4 in-machining frames (the one least progressed) to modified spec. This gives Customer X their 5 modified frames.
   - Complete the remaining 15 frames at original spec as planned.
   - Total added cost: CNC reprogramming (4 hrs) + welding fixture modification (6 hrs) + additional machining on the modified in-process frame (2 hrs) = 12 hours added to the schedule.
3. **Price the change:** Calculate the total cost (labour, material, fixture modification, schedule disruption) and issue a change order cost estimate to Customer X before executing. The customer should approve the cost delta.
4. **Schedule the change:** Insert the CNC reprogramming and fixture modification into the schedule. The 4 unstarted frames are re-routed to the modified spec routing. The 1 in-process frame gets an additional operation added to its routing.
5. **Assess delivery impact:** 12 hours added to the critical path. Can this be absorbed within the original delivery date? If not, negotiate a 2-day extension or authorize overtime to recover the 12 hours.

**Documentation Required:**
- Engineering change analysis showing impact per production stage
- Rework cost estimate per frame (by stage)
- Recommended solution with minimum cost/disruption
- Change order cost estimate for customer approval
- Revised schedule showing added operations
- Delivery impact assessment

---

### Edge Case 10: New Product Introduction Competing with Existing Orders

**Situation:**
A precision stamping company has been awarded a new contract for an automotive EV battery enclosure (a high-profile new product introduction, or NPI). The NPI requires 3 trial production runs over the next 6 weeks to qualify the tooling, validate the process, and produce samples for customer approval. Each trial run requires 8 hours on the 400-ton stamping press (the plant's constraint) plus 4 hours of changeover and die tryout between runs. The constraint is already running at 88% utilisation with existing customer orders. The NPI trial runs need 36 hours of constraint time over 6 weeks (6 hours/week average), which would push constraint utilisation to 93% — within capacity but with almost no buffer.

**Why It's Tricky:**
NPI trial runs are unpredictable: the first run may reveal tooling issues requiring extended die adjustment (adding 4–8 hours), scrap rates on trial runs are typically 10–30% (vs. 2–3% for production runs), and engineering may need to stop the trial for measurements, adjustments, and design iterations. A trial run scheduled for 8 hours may actually consume 12–16 hours when interruptions are factored in.

**Common Mistake:**
Scheduling NPI trials into standard production slots and expecting them to run on time. When the trial overruns, it displaces existing customer orders and creates cascading delays.

**Expert Approach:**
1. **Do not schedule NPI trials at scheduled utilisation.** The 8-hour nominal trial time should be planned as a 14-hour window (8 hours production + 4 hours changeover + 2 hours contingency for tooling issues). This is realistic, not pessimistic, for first and second trials.
2. **Schedule trial runs at the end of the week** (Friday PM or Saturday) when any overrun pushes into the weekend rather than into Monday's committed production schedule. If the trial finishes early, the slot converts to weekend overtime production (recovering any capacity borrowed from the week).
3. **Reserve a "trial buffer" in the weekly schedule:** Block 14 hours per week as tentatively reserved for NPI. If the trial proceeds on schedule, this time is used as planned. If the trial is cancelled or postponed (common for NPIs), the buffer converts to regular production or maintenance.
4. **Protect existing customer commitments:** No existing order should have its due date moved to accommodate the NPI trial. If constraint capacity cannot accommodate both, escalate to management: the NPI trial schedule may need to extend beyond 6 weeks, or the plant may need Saturday overtime to create the capacity.
5. **Assign the most experienced setup technician and stamping operator** to the NPI trials. Trial-run productivity is heavily dependent on operator skill in adjusting die settings and recognising incipient defects. A junior operator on a trial run will consume 30–50% more time.
6. **After each trial run, update the time estimate** for the next trial. If Trial 1 took 14 hours and produced 15% scrap, plan Trial 2 at 12 hours (process should be improving) but keep the full 14-hour buffer until proven otherwise.

**Documentation Required:**
- NPI trial schedule with buffered time estimates
- Constraint capacity analysis showing impact on existing orders
- Contingency plan if trial overruns
- Customer communication plan if existing orders are at risk
- Trial results and time actuals for updating subsequent trial estimates
- Post-trial tooling qualification report

---

### Edge Case 11: Simultaneous Material Shortage and Equipment Degradation

**Situation:**
A food processing plant producing canned soups faces two simultaneous problems: (1) the primary tomato paste supplier is 4 days late on a delivery that was supposed to arrive Monday, affecting all tomato-based soup production scheduled for this week, and (2) the retort (sterilisation vessel) — the plant's constraint — has developed a slow steam leak that reduces its effective cycle time by 12% (each batch takes 45 minutes instead of 40 minutes). Maintenance can fix the leak during a planned maintenance window on Saturday, but running the retort at reduced capacity all week compounds the supplier delay.

**Expert Approach:**
1. Re-sequence the week to run non-tomato soup products (chicken, vegetable, cream-based) first while waiting for the tomato paste delivery. This keeps the retort running even at reduced capacity.
2. Calculate the effective capacity loss: 12% longer cycles = ~12% throughput reduction at the constraint. Over a 120-hour production week, this is 14.4 hours of lost capacity, equivalent to roughly 18 batches (at 48 min/batch effective).
3. When the tomato paste arrives (projected Thursday), re-sequence tomato soups with the most urgent due dates first.
4. Evaluate whether Saturday maintenance can be pulled forward to Wednesday night (sacrificing one night shift of production but restoring full capacity for Thursday–Friday).
5. Calculate the net capacity impact of early maintenance vs. running degraded all week: early fix loses 8 hours of production but recovers 12% efficiency for remaining 40+ hours = net gain of ~4.8 hours.
6. Customer priority: rank all orders by delivery date and penalty risk. Allocate retort capacity accordingly.

---

### Edge Case 12: ERP System Upgrade During Production Week

**Situation:**
IT has scheduled an ERP system upgrade (SAP ECC to S/4HANA migration cutover) for the upcoming weekend, with the system offline from Friday 6:00 PM to Monday 6:00 AM. The plant runs 24/7 production. During the outage, operators cannot confirm operations, material transactions cannot be posted, and work order status cannot be updated. The scheduling tool (which reads from SAP) will not receive real-time data.

**Expert Approach:**
1. Print all work orders, routings, BOMs, and the production schedule for Friday PM through Monday AM. Distribute physical copies to every shift supervisor and work centre.
2. Pre-issue all materials needed for weekend production. Complete all goods issues in SAP before 6:00 PM Friday. Operators should not need to perform material transactions during the outage.
3. Implement manual shop floor tracking: paper travellers accompanying each batch, operator log sheets recording start/end times, quantities, and scrap.
4. Freeze the schedule for the weekend — no re-sequencing unless a genuine disruption (breakdown, quality hold) occurs. Without system support, ad-hoc schedule changes are extremely error-prone.
5. Monday AM: enter all weekend transactions into the new system. This "catch-up" data entry will take 2–4 hours. Assign a dedicated team. Verify inventory balances match physical counts before releasing the Monday schedule.
6. Have IT on standby for Monday morning to resolve any data migration issues that affect production records.

**Documentation Required:**
- Pre-printed schedule and work order packets
- Material pre-issue verification checklist
- Manual tracking forms and instructions
- Monday catch-up data entry plan
- IT escalation contacts for Monday morning

**Resolution Timeline:**
- Friday − 1 week: Print all production documentation, verify completeness
- Friday − 2 days: Pre-issue all weekend materials in SAP
- Friday 6:00 PM: System goes offline. Switch to manual tracking.
- Saturday–Sunday: Manual operations with paper travellers
- Monday 6:00 AM: System restored. Begin catch-up data entry.
- Monday 10:00 AM: Inventory verification and schedule release for Monday production

---

### Edge Case 13: Batch Traceability Contamination — Product Recall Scenario

**Situation:**
A medical device manufacturer receives a supplier notification that a lot of surgical-grade stainless steel (Heat #A7742) may contain elevated levels of nickel beyond the ASTM F138 specification. The supplier is still testing, but has issued a precautionary advisory. The plant's records show Heat #A7742 was received 3 weeks ago and has been consumed across 14 production work orders for 3 different product families (hip implant stems, bone screws, and spinal rods). Some finished goods from these work orders have already shipped to 4 hospital systems.

**Why It's Tricky:**
Full traceability is mandatory under FDA 21 CFR Part 820 for medical devices. The scheduler must immediately identify every work order, every operation, every batch that consumed material from Heat #A7742. Some of this material may be in WIP across multiple production stages. A false-positive (the material is actually fine) means the quarantine was unnecessary but the disruption was real. A false-negative (failing to quarantine all affected units) could result in a Class I recall.

**Common Mistake:**
Quarantining only the known remaining raw material from Heat #A7742 and missing the WIP and finished goods. Or waiting for the supplier's final test results before acting (which could take 5–7 business days).

**Expert Approach:**
1. **Immediate lot trace (Hour 0–2):** Run a forward lot trace from Heat #A7742 through every production stage. In the ERP, trace the material receipt to every goods issue, then to every work order that consumed it, then to every finished goods batch, then to every shipment.
2. **Quarantine all affected WIP (Hour 0–4):** Every work-in-process piece traceable to Heat #A7742 must be physically segregated and tagged with "QUALITY HOLD — SUPPLIER ADVISORY" status. Update work order status in the ERP to "blocked."
3. **Identify shipped finished goods:** For units already shipped, prepare a device history record (DHR) extract for the quality team. They will assess whether a customer notification or field action is required.
4. **Re-schedule all affected work orders:** These are now blocked. Remove them from the active schedule. Calculate the impact on customer deliveries. The 14 work orders represent significant production volume — their removal creates a capacity surplus at some work centres and a delivery shortfall.
5. **Fill the capacity gap:** Pull forward work orders for unaffected product families. Keep the constraint running on unaffected work. The quarantine should not idle the constraint if other schedulable work exists.
6. **Monitor the supplier investigation:** Request daily updates. If the material passes testing (false alarm), the quarantined WIP can be released and re-inserted into the schedule. If the material fails, transition from quarantine to scrap/rework disposition.
7. **Schedule replacement production:** If the quarantined material is confirmed non-conforming, replacement raw material must be ordered and new work orders created. Calculate the lead time for replacement material + production to meet customer delivery obligations.

**Documentation Required:**
- Full forward lot trace from Heat #A7742
- Quarantine records for all WIP and finished goods
- Shipped goods report for quality team
- Revised schedule excluding quarantined work orders
- Replacement material purchase order
- Customer notification drafts (for quality team review)
- Daily supplier investigation status updates

**Resolution Timeline:**
- Hour 0: Supplier advisory received
- Hour 0–2: Lot trace completed, scope of exposure quantified
- Hour 2–4: All affected WIP quarantined, schedule revised
- Hour 4–8: Customer delivery impact assessed, replacement material ordered
- Day 2–7: Awaiting supplier test results, running unaffected production
- Day 7+: Disposition decision (release or scrap), recovery schedule published

---

### Edge Case 14: Power Curtailment Order During Peak Production

**Situation:**
During a summer heat wave, the regional utility issues a mandatory curtailment order requiring the plant to reduce electrical consumption by 30% during peak hours (1:00 PM – 7:00 PM) for the next 5 business days. The plant's major electrical loads are: arc welding stations (35% of load), CNC machining (25%), HVAC/lighting (20%), and electric furnaces (20%). The constraint work centre is a CNC machining cell. Shutting down any production equipment during peak hours will reduce output. Non-compliance with the curtailment order carries fines of $50,000/day.

**Expert Approach:**
1. **Load analysis:** Identify which equipment can be shut down during peak hours with the least production impact. HVAC cannot be fully shut down (heat stress safety risk for operators), but setpoint can be raised by 3–4°F to reduce load by ~30% of HVAC consumption.
2. **Shift heavy loads to off-peak:** Move arc welding operations to the early morning (5:00 AM – 1:00 PM) and evening (7:00 PM – 1:00 AM) shifts. Welding is labour-intensive but electrically heavy — shifting it avoids most of the curtailment window.
3. **Protect the constraint:** CNC machining is the constraint. Calculate whether CNC can run during the curtailment window if welding and furnaces are offline. If CNC alone is within the 70% power allowance, keep CNC running and idle the other major loads.
4. **Electric furnace scheduling:** Pre-heat and pre-melt in the morning. Hold molten metal in insulated vessels during the curtailment window (thermal mass carries 4–6 hours). Resume furnace operations at 7:00 PM.
5. **Reschedule the week:** Create two sub-schedules:
   - Off-peak (5:00 AM – 1:00 PM and 7:00 PM – 5:00 AM): Full production, all work centres operational.
   - Peak curtailment (1:00 PM – 7:00 PM): Constraint (CNC) running, welding and furnaces offline, non-electrical operations (manual assembly, inspection, packaging, material prep) active.
6. **Labour adjustment:** Operators who normally work day shift welding are reassigned to manual operations during curtailment hours, then brought back to welding on an adjusted schedule. Check overtime implications — some operators may need split shifts.
7. **Customer impact:** Calculate the throughput reduction from 5 days of restricted production. If the constraint runs during curtailment but non-constraints do not, the throughput impact may be small (constraint is the bottleneck). Quantify and notify affected customers if any delivery dates slip.

**Documentation Required:**
- Load analysis by equipment and time window
- Curtailment compliance plan (submitted to utility if required)
- Revised daily schedules for the 5-day curtailment period
- Labour reassignment plan
- Customer delivery impact assessment
- Cost analysis: compliance plan cost vs. $50K/day non-compliance fine

---

### Edge Case 15: Concurrent Preventive Maintenance and Rush Order

**Situation:**
A stamping plant's quarterly preventive maintenance (PM) on the 600-ton press (the constraint) is scheduled for this Saturday, requiring a full 10-hour shutdown for die inspection, hydraulic system service, and electrical control calibration. On Thursday afternoon, the plant receives a rush order from its largest customer: 5,000 brackets due Wednesday of next week. The 600-ton press is the only machine that can stamp these brackets. The job requires 18 hours of press time. Without the Saturday PM, the bracket run can start Friday evening and finish Sunday afternoon, meeting the Wednesday deadline easily. With the PM, the bracket run cannot start until Sunday afternoon and will finish Tuesday, cutting it dangerously close to the Wednesday ship deadline.

**Why It's Tricky:**
Skipping or deferring PM on the constraint is a high-risk gamble. The PM schedule exists because the 600-ton press has a history of hydraulic seal failures when PM intervals stretch beyond the quarterly cycle. A hydraulic failure during the bracket run would be catastrophic — potentially damaging the die (a $45,000 asset), scrapping in-process work, and causing multiple days of unplanned downtime.

**Expert Approach:**
1. **Do not skip the PM.** The expected cost of a hydraulic failure (die damage + scrap + 3–5 days unplanned downtime + customer penalties) far exceeds the cost of any workaround.
2. **Can the PM be compressed?** Consult maintenance: can the 10-hour PM be reduced to 6 hours by parallelising activities (two maintenance crews working simultaneously on hydraulics and electrical)? If so, the press is available Saturday evening instead of Sunday morning, giving an extra 8+ hours for the bracket run.
3. **Can the PM be moved earlier?** If PM starts Friday night instead of Saturday morning, the press is available by Saturday morning. Friday night PM means cancelling Friday night production — calculate the lost production (probably 1 shift of lower-priority work) vs. the benefit of earlier bracket availability.
4. **Can the bracket run be accelerated?** Check if the die can be modified for a 2-out configuration (stamping 2 brackets per stroke instead of 1). If tooling supports this and first-piece quality validates, the 18-hour job drops to 10 hours. This is a production engineering question, not just a scheduling question.
5. **Recommended plan:** Move PM to Friday 10:00 PM – Saturday 8:00 AM (compressed to 10 hours or less). Start bracket run Saturday 8:00 AM. At 18 hours, the run finishes Sunday 2:00 AM. Ship Monday for Wednesday delivery — comfortable margin.
6. **Backup plan:** If PM cannot be compressed or moved earlier, start the bracket run Sunday afternoon, run through Sunday night and Monday day shift (18 hours completion by Monday evening), and ship Tuesday for Wednesday delivery. This is tight but feasible. Add an overtime shift Monday evening as insurance.

**Documentation Required:**
- PM schedule analysis showing compression/shift options
- Bracket run time calculation and earliest-start-time scenarios
- Risk assessment of PM deferral (not recommended, but documented to explain the decision)
- Customer delivery confirmation with the chosen plan
- Maintenance crew availability for compressed PM schedule

**Resolution Timeline:**
- Thursday PM: Rush order received
- Thursday PM + 2 hours: PM compression/shift analysis completed
- Thursday end-of-day: Decision made, revised schedule published
- Friday night or Saturday AM: PM begins
- Saturday AM or PM: Bracket run begins
- Sunday or Monday: Bracket run complete
- Monday–Tuesday: Ship for Wednesday delivery

---

### Edge Case 16: Multi-Site Load Balancing Under Capacity Crunch

**Situation:**
A packaging company operates two plants 90 miles apart. Plant A specialises in rigid plastic containers (thermoforming + printing) and Plant B specialises in flexible pouches (form-fill-seal). Both plants have secondary capability in the other's specialty, but at 30–40% lower throughput rates. Plant A's thermoforming constraint is at 97% utilisation for the next 3 weeks. Plant B's form-fill-seal line is at 72%. A key customer (national retailer) has just increased their Q4 order for rigid containers by 25%, pushing Plant A's projected utilisation to 122%.

**Why It's Tricky:**
Moving rigid container production to Plant B is technically possible but operationally complex: different tooling must be transferred, operator cross-training is limited, Plant B's rigid container quality history is weaker, and the customer has approved Plant A as the manufacturing site (switching sites may require customer re-qualification, especially for food-contact packaging).

**Common Mistake:**
Accepting all incremental volume at Plant A and planning to "make it work" with overtime. At 122% utilisation, even maximum overtime only reaches ~108%, creating an inevitable 14% shortfall. Or refusing the incremental order without exploring Plant B as an option.

**Expert Approach:**
1. **Quantify the overflow precisely:** Plant A needs 22% more capacity = 26.4 hours/week over 3 weeks = 79.2 total overflow hours.
2. **Assess Plant A's maximum realistic capacity:** Standard (120 hrs/week) + Saturday OT (16 hrs) + reduced changeovers (estimated 4 hrs recovery through better sequencing) = 140 hrs/week max. At 122% requirement = 146.4 hrs needed. Plant A can deliver 140 hrs, shortfall = 6.4 hrs/week = 19.2 hours over 3 weeks.
3. **Assess Plant B's absorption capacity:** Plant B's rigid container capability runs at 70% of Plant A's throughput. 19.2 hours of Plant A work = 27.4 hours at Plant B's rate. Plant B has 33.6 hours of available capacity (120 × 28% headroom) — it can absorb the overflow.
4. **Customer qualification:** Contact the customer's quality team to determine whether a temporary site switch requires re-qualification. For food-contact packaging, the answer is usually yes for a new site, but may be waived if both plants hold the same certifications (SQF, BRC, FDA registration) and use identical raw materials.
5. **Tooling transfer plan:** Which moulds and print plates need to move to Plant B? What is the transfer time (transport + setup + qualification runs at Plant B)? Plan for 2–3 days of transfer activity before Plant B can begin producing.
6. **Quality safeguard:** Assign Plant A's quality supervisor to Plant B for the first 2 days of the overflow production run. First-article inspection with full dimensional check before releasing production quantities.
7. **Logistics:** Coordinate shipping from Plant B to the customer's DC. If the customer expects a single point of shipment, Plant B's output may need to be consolidated at Plant A before shipping.

**Documentation Required:**
- Capacity analysis for both plants over the 3-week horizon
- Overflow volume calculation and Plant B absorption plan
- Customer qualification requirement assessment
- Tooling transfer schedule
- Quality plan for Plant B overflow production
- Logistics coordination plan
- Cost comparison: overtime at Plant A vs. transfer + production at Plant B

---

### Edge Case 17: Seasonal Product Transition with Shared Tooling

**Situation:**
A consumer goods manufacturer produces both summer products (portable fans, outdoor lighting) and winter products (space heaters, humidifiers) on shared injection moulding and assembly lines. The seasonal transition begins in August: summer products wind down while winter products ramp up. Both product families share 6 of the plant's 10 injection moulding machines, requiring complete mould changes (4–6 hours per machine). The transition must happen while simultaneously filling the last summer orders (end-of-season clearance orders from retailers, due by August 31) and beginning the winter build-up (first winter shipments due September 15).

**Why It's Tricky:**
During the transition period, the plant needs to produce both summer and winter products on the same machines. Every mould change consumes 4–6 hours of production capacity. If you transition all 6 machines at once, you lose 24–36 hours of capacity in a single week — during the highest-demand period. If you transition one machine at a time, you maintain more capacity but stretch the transition over 3+ weeks, during which the schedule is constantly in flux with different machines running different product families.

**Expert Approach:**
1. **Phase the transition by machine and demand priority:**
   - Weeks 1–2 (Aug 1–14): Keep all 6 machines on summer products. Fill all remaining summer orders.
   - Week 3 (Aug 15–21): Transition 2 machines to winter moulds. These begin producing the highest-priority winter products.
   - Week 4 (Aug 22–28): Transition 2 more machines. Now 4 winter, 2 summer.
   - Week 5 (Aug 29 – Sep 4): Transition final 2 machines. All 6 on winter products.
2. **Priority sequencing during transition:**
   - Summer machines in Weeks 3–4 focus exclusively on committed retailer orders with firm due dates. No speculative production.
   - Winter machines in Weeks 3–4 focus on long-lead-time components that downstream assembly needs by September 15.
3. **Mould change scheduling:** Schedule all mould changes for Friday PM or Saturday AM, when the changeover downtime has the least impact on committed production (assuming the plant runs Mon–Fri with Saturday overtime available).
4. **Buffer management:** Build 1 week of safety stock on critical summer components before Week 3 begins. This buffers downstream assembly from any transition-related disruptions on the moulding machines.
5. **Labour coordination:** Mould changes require skilled tooling technicians. Ensure technician availability matches the changeover schedule — do not schedule 4 mould changes on the same day with only 2 technicians.

**Documentation Required:**
- Phased transition schedule showing machine-by-product assignment per week
- Summer order backlog with due dates and machine requirements
- Winter build-up schedule with component lead times
- Mould change schedule with technician assignments
- Safety stock build plan for transition buffer
- Post-transition capacity verification (all winter moulds qualified and running at standard rates)

**Resolution Timeline:**
- Aug 1: Transition plan published to all departments
- Aug 1–14: Summer production, safety stock build
- Aug 15: First 2 machines transition — winter production begins
- Aug 22: Second pair transitions
- Aug 29: Final pair transitions — full winter production
- Sep 5: Post-transition review — all machines at standard winter rates
- Sep 15: First winter shipments

---

## Summary: Edge Case Pattern Recognition

Experienced production schedulers recognise recurring patterns across these edge cases:

| Pattern | Key Indicator | First Response |
|---|---|---|
| **Constraint shift** | WIP moving from one queue to another unexpectedly | Re-identify the constraint. Don't re-sequence unless shift persists. |
| **Single-point-of-failure** | One operator, one machine, one supplier | Cross-train, qualify alternates, dual-source before the failure occurs. |
| **Commercial vs. physical conflict** | Multiple customers need the same scarce resource | Quantify the tradeoff. Present options. Let management decide. |
| **Data integrity failure** | MRP generating implausible demand, phantom inventory | Verify at the source. Trace the data. Fix the root before acting on bad data. |
| **Cascading quality issue** | Defect detected late, affecting multiple production stages | Full containment first, rework assessment second, schedule recovery third. |
| **External constraint imposed** | Utility curtailment, regulatory stop, weather | Protect the constraint. Shift flexible operations around the restriction. |
| **Transition complexity** | Product mix changing, seasonal changeover, NPI | Phase the transition. Buffer between old and new. Don't try to flip everything at once. |

The common thread: **never sacrifice the constraint's output for a non-constraint problem.** Every decision should be evaluated through the lens of: "Does this protect or harm throughput at the constraint?" If a disruption does not affect the constraint (directly or through buffer penetration), it is lower priority regardless of how visible or noisy it is on the shop floor.
