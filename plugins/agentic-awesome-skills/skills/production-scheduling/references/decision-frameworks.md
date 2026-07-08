# Decision Frameworks — Production Scheduling

This reference provides the detailed decision logic, scheduling algorithms, optimisation
methodologies, and capacity planning techniques for production scheduling in discrete
and batch manufacturing. It is loaded on demand when the agent needs to make or recommend
nuanced scheduling decisions.

All thresholds, formulas, and time assumptions reflect discrete and batch manufacturing
operations running 3–8 production lines with 50–300 direct-labour headcount per shift.

---

## 1. Job Scheduling Algorithms

### 1.1 Dispatching Rules — When to Use Each

Dispatching rules are heuristics applied at a work centre when multiple jobs compete for
the same resource. No single rule dominates in all situations. The choice depends on the
plant's primary performance objective.

| Rule | Definition | Best For | Weakness |
|---|---|---|---|
| **SPT (Shortest Processing Time)** | Process the job with the shortest operation time first | Minimising average flow time, reducing WIP, maximising throughput when setup times are negligible | Starves long jobs — a job with 8-hour run time waits behind twenty 20-minute jobs. Creates due date violations on long-cycle products. |
| **EDD (Earliest Due Date)** | Process the job with the earliest due date first | Minimising maximum lateness across all jobs, meeting delivery commitments | Ignores processing time — a job due tomorrow with an 8-hour run time gets priority over a job due in 2 hours with a 5-minute run. Can increase WIP if many jobs have distant due dates. |
| **Critical Ratio (CR)** | CR = (Due Date − Now) / Remaining Processing Time. Schedule lowest CR first. | Balancing due date urgency with remaining work. CR < 1.0 means the job is behind schedule. | Breaks down when due dates are unrealistic (all CRs < 0.5). Requires accurate remaining processing time estimates. |
| **Weighted Shortest Job First (WSJF)** | Priority = (Cost of Delay × Job Weight) / Processing Time. Schedule highest priority first. | Environments where jobs have different economic value. Maximises throughput-weighted value. | Requires reliable cost-of-delay estimates, which are often subjective. Can starve low-value long jobs indefinitely. |
| **Slack Time (ST)** | Slack = Due Date − Now − Remaining Processing Time. Schedule lowest slack first. | Similar to CR but uses absolute slack rather than ratio. Better when processing times are similar. | Same as CR — degrades with unrealistic due dates. Does not account for queue time at downstream work centres. |
| **FIFO (First In, First Out)** | Process jobs in arrival order at the work centre | Ensuring fairness, simple to communicate, works in stable environments with predictable flow | No optimisation — ignores due dates, processing times, and economic value. Use only when all jobs are equal priority and flow is balanced. |

#### Algorithm Selection Decision Tree

1. **Is schedule adherence the primary KPI and are there contractual delivery penalties?**
   → Use EDD as the primary rule. Insert CR checks for jobs where CR < 0.8 — these need
   immediate attention regardless of EDD rank.

2. **Is throughput/output the primary KPI with flexible delivery windows?**
   → Use SPT to minimise average flow time. Monitor maximum lateness; if it exceeds
   the acceptable threshold, switch to a hybrid SPT-EDD (SPT within a due date window).

3. **Do jobs have significantly different economic values (margin, penalty, customer tier)?**
   → Use WSJF. Weight = customer tier multiplier × margin contribution. This is the
   appropriate rule for job shops with heterogeneous order portfolios.

4. **Are setup times sequence-dependent and significant (>15 minutes between families)?**
   → No pure dispatching rule handles this. Use a setup-aware scheduling heuristic
   (Section 2) that groups jobs by setup family and optimises within groups using EDD.

5. **Is the environment stable with balanced flow and predictable demand?**
   → FIFO is acceptable and preferred for its simplicity and shop floor trust.

### 1.2 Multi-Rule Hybrid Approaches

In practice, most schedulers use a hybrid approach layered as follows:

**Layer 1 — Hard Constraints (filter)**
Remove any job from the queue that lacks material, tooling, or a qualified operator.
These jobs are not schedulable regardless of priority.

**Layer 2 — Urgency Override (force-rank)**
Jobs with CR < 0.8 or that are already past-due are force-ranked to the top,
ordered by customer penalty exposure descending.

**Layer 3 — Primary Dispatching Rule (sort remaining)**
Apply the selected dispatching rule (EDD, SPT, WSJF, etc.) to remaining jobs.

**Layer 4 — Setup Optimisation (local reorder)**
Within the primary sequence, perform adjacent-swap improvements to reduce
total setup time, subject to the constraint that no swap causes a due date
violation for either swapped job.

**Layer 5 — Labour Levelling (validate)**
Check that the resulting sequence does not create labour peaks that exceed
available headcount for any hour of the shift. If it does, defer the lowest-
priority job creating the peak to the next available slot.

### 1.3 Critical Ratio in Detail

Critical Ratio is the most versatile single dispatching rule for mixed environments.

**Formula:**
```
CR = (Due Date − Current Date) / Remaining Total Processing Time
```

Where Remaining Total Processing Time includes:
- Setup time for the current operation
- Run time for the current operation
- Queue time estimates for remaining operations (use historical average queue times)
- Setup + run times for all remaining operations in the routing

**Interpretation:**
| CR Value | Meaning | Action |
|---|---|---|
| CR > 2.0 | Comfortable lead — job is well ahead of schedule | Lowest priority. May be deferred if capacity is needed for tighter jobs. |
| 1.0 < CR < 2.0 | On track but limited slack | Schedule normally per dispatching rule |
| CR = 1.0 | Exactly on schedule — no slack remaining | Monitor closely. Any disruption will cause lateness. |
| 0.5 < CR < 1.0 | Behind schedule — will be late without intervention | Escalate. Consider overtime, alternate routing, or partial shipment. |
| CR < 0.5 | Critically late — recovery is unlikely without significant intervention | Immediate escalation to production manager. Notify customer of revised date. |

**Updating CR:** Recalculate CR at every operation completion and at the start of every
shift. A job with CR = 1.5 at shift start that encounters a 4-hour unplanned delay mid-shift
may drop to CR = 0.7 — the shift supervisor needs to know this in real time.

### 1.4 Weighted Scheduling for Customer Tiers

Manufacturing plants serving multiple customer tiers need a weighting system:

| Customer Tier | Weight Multiplier | Rationale |
|---|---|---|
| Tier 1 (OEM, contractual penalties) | 3.0 | Late delivery triggers financial penalties, production line-down claims |
| Tier 2 (Key accounts, framework agreements) | 2.0 | No contractual penalty but relationship value and reorder risk |
| Tier 3 (Standard accounts) | 1.0 | Standard terms, no penalty |
| Tier 4 (Spot orders, distributors) | 0.5 | Price-sensitive, low switching cost for them |

**WSJF with Customer Tier:**
```
Priority Score = (Customer Tier Weight × Days Until Due / Remaining Processing Time)
```
Lower score = higher priority (more urgent). Negative scores = past-due.

---

## 2. Changeover Optimisation

### 2.1 SMED Implementation Phases — Step by Step

#### Phase 0 — Document the Current State (2–4 weeks)

1. Video-record 3–5 changeovers on the target machine/line. Include the full duration
   from last good piece of the outgoing product to first good piece of the incoming product.
2. Create a changeover element sheet listing every task performed, the performer
   (operator, setup tech, maintenance), the duration, and whether the machine was stopped.
3. Categorize each element:
   - **Internal (IED):** Must be performed with the machine stopped.
   - **External (OED):** Can be performed while the machine is still running.
   - **Waste:** Not necessary at all — holdover from old procedures, redundant checks, waiting.

Typical finding: 30–50% of changeover time is either external work incorrectly performed
during machine stoppage, or pure waste (searching for tools, waiting for approval,
walking to the tool crib).

#### Phase 1 — Separate Internal and External (2–4 weeks)

1. Move all external elements to pre-changeover preparation:
   - Pre-stage next-job tooling, dies, fixtures at the machine before the changeover begins.
   - Pre-mix materials, pre-heat moulds, pre-program CNC settings.
   - Pre-print work order documentation and quality checklists.
2. Create a standardised changeover preparation checklist. The setup technician begins
   executing it 30–60 minutes before the scheduled changeover time.
3. Expected result: 25–40% reduction in machine-stopped time with no capital investment.

#### Phase 2 — Convert Internal to External (4–8 weeks)

1. Standardise die/fixture heights and mounting interfaces so that alignment and adjustment
   happen before the die reaches the machine, not after.
2. Implement intermediate jigs — set up the next tool in a staging fixture that mirrors
   the machine's mounting interface. When the changeover begins, the pre-assembled unit
   drops in with minimal adjustment.
3. Pre-condition materials: if the incoming product requires a different temperature,
   viscosity, or chemical mix, start conditioning in a parallel vessel.
4. Expected result: additional 15–25% reduction in machine-stopped time. May require
   modest investment in duplicate tooling or staging fixtures.

#### Phase 3 — Streamline Remaining Internal Elements (4–12 weeks)

1. Replace bolt-on fasteners with quick-release clamps, cam locks, or hydraulic clamping.
   Every bolt removed saves 15–30 seconds.
2. Eliminate adjustments through poka-yoke: centre pins, guide rails, fixed stops that
   guarantee first-piece alignment without trial-and-error.
3. Standardise utility connections: colour-coded quick-disconnect fittings for air, water,
   hydraulic, and electrical. One-motion connect/disconnect.
4. Parallel operations: two people working simultaneously on different sides of the machine
   can halve the internal time. Requires choreographed procedures and safety protocols.
5. Expected result: additional 10–20% reduction. Often requires capital investment in
   quick-change tooling.

#### Phase 4 — Eliminate Adjustments and Verify (ongoing)

1. Implement first-piece verification jigs that confirm dimensions without full inspection.
2. Use statistical process control (SPC) from the first piece — if the first piece is within
   control limits, the changeover is validated without a trial run.
3. Document the final standardised changeover procedure with photos, time targets per element,
   and a sign-off sheet.
4. Target: changeover time under 10 minutes (single-minute exchange of die) for the
   machine-stopped portion.

### 2.2 Sequence-Dependent Setup Matrices

For operations where setup time varies by product-to-product transition, build a
setup time matrix:

**Example — Paint Line Setup Matrix (minutes):**

| From \ To | White | Yellow | Orange | Red | Blue | Black |
|---|---|---|---|---|---|---|
| **White** | 0 | 8 | 10 | 15 | 20 | 25 |
| **Yellow** | 15 | 0 | 8 | 12 | 20 | 25 |
| **Orange** | 20 | 12 | 0 | 8 | 18 | 22 |
| **Red** | 25 | 18 | 12 | 0 | 15 | 18 |
| **Blue** | 20 | 22 | 20 | 18 | 0 | 10 |
| **Black** | 30 | 28 | 25 | 22 | 12 | 0 |

**Observations from this matrix:**
- Light-to-dark transitions (White → Black: 25 min) are cheaper than dark-to-light (Black → White: 30 min).
- Within colour families, transitions are minimal (Red → Orange: 12 min vs. Red → White: 25 min).
- The optimal sequence for all six colours in a campaign would be: White → Yellow → Orange → Red → Blue → Black (total: 8+8+8+15+10 = 49 min) vs. random sequence averaging 17 min per transition (85 min total).

**Using the matrix in scheduling:**
1. Group jobs by colour family when possible (campaign scheduling within families).
2. When inter-family transitions are required, optimise the transition sequence using the
   nearest-neighbour heuristic, then improve with 2-opt swaps.
3. If a specific colour is due earliest but the optimal setup sequence would delay it,
   compute the cost of the suboptimal sequence (extra setup minutes × constraint hourly rate)
   vs. the cost of late delivery. Choose the lower-cost option.

### 2.3 Campaign Length Optimisation

**Economic Production Quantity (EPQ):**
```
EPQ = √((2 × D × S) / (H × (1 − D/P)))
```
Where:
- D = demand rate (units per period)
- S = setup cost per changeover (labour + scrap + lost output opportunity cost)
- H = holding cost per unit per period
- P = production rate (units per period), P > D

**Practical adjustments:**
- Round EPQ up to the nearest full shift or full batch to avoid mid-shift changeovers.
- If EPQ results in WIP that exceeds available staging space, constrain to physical capacity.
- If EPQ results in a campaign longer than the longest customer lead time tolerance,
  shorten it to maintain responsiveness even at higher changeover frequency.

**Campaign vs. mixed-model decision:**

| Factor | Favours Campaign | Favours Mixed-Model |
|---|---|---|
| Setup time | Long (>60 min) | Short (<15 min) |
| Setup cost | High (>$500 per changeover) | Low (<$100 per changeover) |
| Demand variability | Low (stable, forecastable) | High (volatile, order-driven) |
| Customer lead time expectation | Tolerant (>2 weeks) | Tight (<3 days) |
| WIP carrying cost | Low | High |
| Product shelf life | Long or N/A | Short or regulated |
| Number of product variants | Few (<10) | Many (>50) |

---

## 3. Theory of Constraints (TOC) Implementation

### 3.1 Drum-Buffer-Rope — Step by Step

**Step 1: Identify the Constraint**

Run a capacity analysis for each work centre over the next planning horizon (1–4 weeks):

```
Utilisation = Σ(Setup Time + Run Time for all scheduled jobs) / Available Time
```

Available Time = shift hours × number of machines × (1 − planned maintenance %)

The work centre with the highest utilisation ratio is the drum. If multiple work centres
exceed 90% utilisation, the one with the least flexibility (fewest alternate routings,
most specialised equipment) is the primary constraint.

**Validation test:** If you could add 10% more capacity to the suspected constraint
(one more machine, one more shift hour, or a 10% speed increase), would total plant
output increase by approximately 10%? If yes, it is the true constraint. If output
increases less (because a second work centre immediately becomes the bottleneck),
you have an interactive constraint pair that requires different treatment.

**Step 2: Exploit the Constraint**

Maximise the output of the constraint with no capital investment:

1. **Eliminate idle time:** The constraint should never wait for material, tooling,
   operators, quality inspection, or information. Pre-stage everything.
2. **Minimise changeovers on the constraint:** Move changeover to non-constraint
   resources where the time cost is lower. If the constraint must change over,
   ensure SMED discipline is applied rigorously.
3. **Prevent quality defects reaching the constraint:** Inspect before the constraint
   operation, not after. Every defective piece processed at the constraint is wasted
   constraint capacity.
4. **Run through breaks and shift changes:** Stagger operator lunches so the constraint
   never stops for a break. Assign a relief operator.
5. **Eliminate micro-stops:** Address every source of 1–5 minute stoppages (sensor trips,
   material jams, tool wear alarms) that individually seem trivial but cumulatively steal
   2–5% of capacity.

**Step 3: Subordinate Everything to the Constraint**

1. **Upstream work centres:** Release work to upstream operations only at the rate the
   constraint can consume it. This is the "rope." If the constraint processes 100 units/hour,
   the upstream release rate should not exceed 100 units/hour regardless of upstream capacity.
2. **Downstream work centres:** Must maintain enough sprint capacity to clear constraint
   output without becoming a secondary bottleneck. If the constraint produces a batch every
   2 hours, downstream must be able to process that batch within 2 hours.
3. **Scheduling non-constraints:** Do not optimise non-constraint schedules in isolation.
   A non-constraint running at 100% utilisation when the constraint runs at 85% is producing
   excess WIP that clogs the shop floor and slows the constraint's material flow.

**Step 4: Establish the Buffer**

The constraint buffer is a time buffer, not an inventory buffer:

```
Buffer Duration = Planned Lead Time from release to constraint × Buffer Factor
```

Typical buffer factors:
- Stable, reliable upstream operations: 0.3 × lead time
- Moderate reliability, some variability: 0.5 × lead time (most common starting point)
- Unreliable upstream, frequent disruptions: 0.75 × lead time

**Buffer sizing example:**
If the upstream lead time from raw material release to the constraint work centre is
8 hours, and upstream reliability is moderate, set the buffer at 4 hours. This means
material should arrive at the constraint staging area at least 4 hours before the
constraint is scheduled to process it.

**Step 5: Monitor Buffer Penetration**

| Zone | Buffer Consumed | Meaning | Action |
|---|---|---|---|
| Green | 0–33% | Constraint well-protected | Normal operations |
| Yellow | 33–67% | Warning — material may arrive late | Expedite upstream work. Check for blockers. |
| Red | 67–100% | Critical — constraint at risk of starvation | Immediate escalation. Overtime upstream. Re-sequence if needed. |
| Black | >100% | Buffer exhausted — constraint is starving | Constraint is idle or will be idle. Emergency response. Every minute of delay from this point = lost plant output. |

Track buffer penetration trends over 2–4 weeks. Persistent yellow indicates
a systemic upstream issue (not random variation) that needs corrective action.

**Step 6: Elevate the Constraint (only if Steps 1–5 are exhausted)**

If after full exploitation and subordination the constraint still limits plant output
below demand requirements:

1. Add overtime or a weekend shift at the constraint only.
2. Add a parallel machine or alternate routing capability.
3. Outsource constraint-specific operations to a qualified subcontractor.
4. Invest in faster constraint equipment (capital expenditure).

Each elevation step is progressively more expensive. Never elevate before fully
exploiting — most plants have 15–25% hidden capacity at the constraint that
exploitation recovers at minimal cost.

### 3.2 Buffer Management Advanced Patterns

**Shipping Buffer:** Protects customer due dates from internal variability. Typically
50% of the lead time from the constraint to shipping. If the constraint-to-shipping
lead time is 2 days, the shipping buffer is 1 day — work should arrive at the
shipping staging area 1 day before the committed ship date.

**Assembly Buffer:** In plants with convergent product structures (multiple components
feeding a common assembly), each feeder path to the assembly point needs its own
buffer. The assembly can only proceed when ALL components are present, so the
slowest feeder path determines the effective buffer.

**Dynamic Buffer Adjustment:**
- If buffer penetration is consistently in the green zone (>80% of jobs arrive with
  buffer intact over a 4-week rolling window), reduce the buffer by 10–15%. Excess buffer
  means excess WIP and longer lead times.
- If buffer penetration frequently reaches red zone (>20% of jobs in a 4-week window),
  increase the buffer by 15–20% while investigating the root cause upstream.
- Never adjust buffers more frequently than every 2 weeks. Buffer management requires
  stable data over multiple cycles.

---

## 4. Disruption Recovery Protocols

### 4.1 Structured Disruption Response Framework

When a disruption occurs, follow this decision tree:

**Step 1: Classify the Disruption**

| Type | Examples | Typical Duration | Impact Scope |
|---|---|---|---|
| **Equipment** | Breakdown, sensor failure, tooling wear | 30 min – 3 days | Single work centre |
| **Material** | Shortage, wrong specification, quality reject of incoming | 2 hours – 2 weeks | Multiple work centres sharing the material |
| **Labour** | Absenteeism, injury, certification gap | 1 shift – 1 week | Single work centre or line |
| **Quality** | In-process defect, customer complaint triggering hold | 2 hours – 1 week | Entire batch/lot, plus downstream consumers |
| **External** | Supplier failure, power outage, weather, regulatory stop | 4 hours – indefinite | Potentially plant-wide |

**Step 2: Assess Constraint Impact**

| Disruption Location | Constraint Impact | Response Priority |
|---|---|---|
| At the constraint | Direct — every minute = lost throughput | Maximum priority. All resources mobilised. |
| Upstream of constraint, buffer is green | Indirect — buffer absorbs the delay | Monitor buffer penetration. No immediate schedule change. |
| Upstream of constraint, buffer is yellow/red | Indirect but imminent — constraint will starve | Expedite. Overtime upstream. Re-sequence to feed constraint from alternate sources. |
| Downstream of constraint | No throughput impact unless WIP backs up to constraint | Monitor. Clear downstream blockage before constraint output starts queuing. |
| Parallel path (no constraint interaction) | No throughput impact, but delivery impact on affected orders | Re-sequence affected orders. Notify customers. |

**Step 3: Execute Recovery**

1. **Immediate (0–30 minutes):** Assess duration and impact. Notify affected parties. Freeze in-process work.
2. **Short-term (30 min – 4 hours):** Re-sequence remaining work. Activate alternate routings. Assign backup operators. Request emergency maintenance.
3. **Medium-term (4–24 hours):** Negotiate overtime or shift extensions. Contact subcontractors. Update customer ETAs. Recalculate the full planning horizon.
4. **Long-term (>24 hours):** Capacity rebalancing. Possible order reallocation to alternate sites. Customer negotiations on delivery schedules. Insurance/force majeure documentation if applicable.

### 4.2 Material Shortage Response

1. **Confirm the shortage:** Verify physical inventory vs. system count. Phantom inventory
   is common — conduct a physical count before declaring a shortage.
2. **Identify substitutes:** Check BOM alternates, engineering-approved substitutions,
   and customer-approved equivalent materials. In regulated industries (aerospace, pharma),
   only pre-approved substitutes are permissible.
3. **Partial build strategy:** Can you complete operations up to the point where the short
   material is consumed, then hold semi-finished WIP for completion when material arrives?
   This keeps upstream work centres productive and preserves lead time on the non-missing
   portions of the routing.
4. **Re-sequence:** Pull forward all work orders that do not consume the short material.
   This keeps the plant productive even during the shortage.
5. **Expedite procurement:** Emergency purchase order at premium freight. Quantify: is the
   cost of expedited material + freight less than the cost of lost constraint time × hours
   of delay? If yes, expedite without hesitation.
6. **Customer communication:** If the shortage will impact customer deliveries, notify within
   4 hours of confirmation. Provide a revised delivery date and a recovery plan.

### 4.3 Quality Hold Management

When an in-process quality issue is discovered:

1. **Contain immediately:** Quarantine all affected WIP — the batch in process, any
   completed units from the same batch, and any downstream assemblies that consumed
   units from the batch.
2. **Assess scope:** How many units are affected? Which customer orders consume these units?
   What is the rework cost vs. scrap cost vs. customer rejection cost?
3. **Reschedule:** Remove the held inventory from the active schedule. Recalculate all
   downstream operations that depended on this inventory.
4. **Decision tree for held material:**
   - **Rework possible and economical:** Schedule rework operations. Add rework time to the
     routing and re-sequence downstream.
   - **Rework possible but not economical (rework cost > material + labour cost of remaking):**
     Scrap the held batch and schedule a replacement production order from scratch.
   - **Cannot rework, cannot scrap (regulatory hold pending investigation):** Exclude from
     schedule indefinitely. Plan as though the inventory does not exist.
5. **Root cause:** While the schedule adjusts, quality engineering should be isolating the
   root cause. The scheduler needs to know: is this a one-time event, or will subsequent
   batches also be affected? If systemic, reduce yield assumptions for the affected operation
   in the scheduling parameters until the root cause is resolved.

---

## 5. Capacity Planning vs. Finite Scheduling

### 5.1 Rough-Cut Capacity Planning (RCCP)

RCCP is a medium-term planning tool (4–16 weeks out) that validates whether the MPS
is feasible at a high level before detailed scheduling.

**Process:**
1. Take the MPS (production plan by product family by week).
2. Multiply by the routing hours per unit at each key work centre (typically only the
   constraint and 1–2 near-constraints).
3. Compare total required hours against available hours per week at each work centre.
4. If required hours exceed available hours, flag the overloaded weeks for action:
   demand shaping (move orders to adjacent weeks), overtime, subcontracting, or MPS revision.

**RCCP Load Profile Example:**

| Week | Constraint Capacity (hrs) | Required Load (hrs) | Utilisation | Status |
|---|---|---|---|---|
| W23 | 120 | 105 | 87.5% | OK |
| W24 | 120 | 118 | 98.3% | Warning — near capacity |
| W25 | 120 | 142 | 118.3% | Overloaded — action needed |
| W26 | 120 | 96 | 80.0% | OK — could absorb W25 overflow |
| W27 | 80 (planned maintenance window) | 75 | 93.8% | Tight — maintenance may need rescheduling |

**Actions for W25 overload:**
- Can 22 hours of load shift to W24 or W26 without missing customer dates? Check due dates.
- If not shiftable: overtime (22 hrs ÷ 8 hrs/shift = 3 extra shifts, or 3 Saturday shifts).
- If overtime not available: which orders have the most flexible delivery dates? Negotiate.
- Last resort: subcontract 22 hours of work. Assess quality and lead time implications.

### 5.2 Finite Capacity Scheduling (FCS) Detail

FCS goes beyond RCCP by scheduling individual operations on specific resources at
specific times, respecting:

1. **Resource capacity:** Number of machines × hours per shift × shifts per day, minus planned maintenance windows.
2. **Sequence-dependent setups:** Setup time varies based on the preceding job (see setup matrix in Section 2.2).
3. **Material availability:** An operation cannot start until all BOM components are available at the work centre.
4. **Tooling constraints:** A job requiring tooling set ABC cannot run simultaneously with another job requiring the same tooling.
5. **Labour constraints:** A job requiring a certified operator cannot be scheduled when no certified operator is on shift.
6. **Operation dependencies:** Operation 20 on a work order cannot start until Operation 10 is complete (routing precedence).
7. **Transfer batches:** Overlap operations can start before the full batch from the preceding operation is complete, if the transfer batch size is defined.

**FCS Scheduling Algorithm (simplified):**
1. Sort all operations by priority (using the hybrid dispatching approach from Section 1.2).
2. For the highest-priority unscheduled operation:
   a. Find the earliest feasible time slot on the required resource, considering capacity,
      material availability, tooling, labour, and predecessor completion.
   b. Schedule the operation in that slot.
   c. Update resource availability.
3. Repeat for the next-highest-priority operation.
4. After all operations are scheduled, run a post-optimisation pass looking for setup
   reduction opportunities (adjacent-swap improvements) that don't violate due dates.

### 5.3 Capacity Buffers and Protective Capacity

Non-constraint work centres should maintain protective capacity — deliberately planned
idle time that absorbs variability and prevents WIP accumulation.

**Target utilisation by work centre type:**

| Work Centre Type | Target Utilisation | Rationale |
|---|---|---|
| Constraint | 90–95% | Maximise output. Buffer everything else to protect it. |
| Near-constraint (>80% loaded) | 85–90% | Close to becoming the constraint. Monitor for shifting bottleneck. |
| Standard | 75–85% | Protective capacity absorbs upstream variability. |
| Shared resource (forklift, crane, inspector) | 60–75% | High variability in demand for these resources. Over-scheduling creates system-wide delays. |
| Rework/repair | 50–70% | Must have capacity available on demand. Cannot schedule at high utilisation. |

**Warning signs of insufficient protective capacity:**
- WIP queues growing at non-constraint work centres over time.
- Non-constraint work centres occasionally becoming the bottleneck (shifting bottleneck).
- Overtime at non-constraint work centres "to keep up."
- Material handlers constantly expediting between non-constraint operations.

---

## 6. Multi-Constraint Scheduling

### 6.1 Interactive Constraints

When two or more work centres both exceed 85% utilisation and share a material flow path,
they interact — improving throughput at one may starve or overload the other.

**Identification:**
Two work centres are interactive constraints if:
1. They are on the same routing (material flows from one to the other), AND
2. Both exceed 85% utilisation, AND
3. Adding capacity at one causes the other's utilisation to exceed 95%.

**Scheduling Strategy for Interactive Constraints:**

1. **Schedule the primary constraint first** (the one with higher utilisation or the one
   closer to the customer).
2. **Subordinate the secondary constraint** to the primary's schedule — the secondary
   constraint processes work in the order and at the pace dictated by the primary constraint's
   output schedule.
3. **Place a buffer between them** — even though both are constraints, the upstream one
   should feed a time buffer to the downstream one to absorb variability.
4. **Never optimise them independently.** A setup sequence that is optimal for the primary
   constraint may create an impossible sequence for the secondary constraint if setups
   are sequence-dependent at both. Solve jointly.

### 6.2 Machine + Labour Dual Constraints

Common in environments where machines are semi-automated and require an operator for
setup, first-piece inspection, or monitoring but can run unattended for portions of the cycle.

**Scheduling approach:**
1. Schedule machine capacity first (finite capacity by machine).
2. Overlay labour capacity (finite capacity by skill/certification).
3. Identify conflicts: time slots where the machine schedule requires an operator but
   no qualified operator is available.
4. Resolve conflicts by:
   - Shifting the job to a different machine that a different operator is qualified on.
   - Shifting the operator from a lower-priority job to the conflicting job.
   - Scheduling the operator's setup/inspection tasks at the start of the job and
     allowing unattended running thereafter.

### 6.3 Tooling as a Shared Constraint

When specialised tooling (moulds, dies, fixtures, gauges) is shared across machines:

1. **Treat tooling as a resource in the scheduling system** — the same way you schedule
   machines and labour, schedule tooling.
2. **Two jobs requiring the same mould cannot run simultaneously** on different machines.
3. **Tooling changeover time** between machines adds to the total changeover. If Mould A
   moves from Machine 1 to Machine 2, add the mould extraction time (Machine 1) + transport
   time + mould installation time (Machine 2).
4. **Optimise by grouping:** If three jobs all require Mould A, schedule them consecutively
   on the same machine to avoid mould transfers.

---

## 7. Line Balancing for Mixed-Model Production

### 7.1 Takt Time Calculation

```
Takt Time = Available Production Time per Shift / Customer Demand per Shift
```

**Example:** 480 minutes available per shift (8 hours × 60 min, minus 30 min breaks),
customer demand is 240 units per shift.

```
Takt Time = 450 / 240 = 1.875 minutes per unit
```

Every workstation on the line must complete its tasks within 1.875 minutes per unit.
If any station exceeds takt, it becomes the bottleneck and the line cannot meet demand.

### 7.2 Workstation Balancing

1. List all tasks with their duration and precedence relationships.
2. Assign tasks to workstations such that no workstation exceeds takt time.
3. Minimise the number of workstations (to minimise labour cost).
4. Measure balance efficiency:

```
Balance Efficiency = Σ(Task Times) / (Number of Stations × Takt Time) × 100%
```

Target: >85%. Below 80% indicates significant idle time at some stations.

### 7.3 Mixed-Model Sequencing (Heijunka)

When a line produces multiple models with different task times:

1. Calculate the weighted average cycle time across models.
2. Determine the model mix ratio (e.g., Model A: 60%, Model B: 30%, Model C: 10%).
3. Create a repeating pattern that levels the workload. For A:B:C = 6:3:1, a 10-unit
   cycle would be: A-B-A-A-C-A-B-A-B-A.
4. Validate that the bottleneck station can handle every model within takt. If Model C
   takes 2.5 minutes at Station 3 while takt is 1.875 minutes, Model C must be spaced
   sufficiently that Station 3 can catch up between occurrences.

---

## 8. Scheduling with Regulatory and Compliance Constraints

### 8.1 Traceability-Driven Scheduling

In regulated industries (pharmaceutical, food, aerospace), lot traceability requirements
constrain scheduling flexibility:

- **No lot mixing:** A work order for Lot A and a work order for Lot B cannot share
  equipment simultaneously unless the equipment is fully cleaned between lots and
  the cleaning is documented.
- **Dedicated equipment campaigns:** When allergen or contamination controls require
  dedicated equipment, the scheduling window for Product X on Line 1 is limited to
  the dedicated campaign period. Scheduling outside this window requires re-validation.
- **Operator qualification records:** The schedule must record which operator performed
  each operation, and that operator must be certified at the time of execution.

### 8.2 Clean-In-Place (CIP) Scheduling

In food, beverage, and pharma, CIP cycles are mandatory between certain product transitions:

| Transition Type | CIP Duration | Can Be Shortened? |
|---|---|---|
| Same product, next batch | 0–15 min (rinse only) | No — regulatory minimum |
| Same product family | 30–60 min (standard CIP) | Only with validated short-CIP protocol |
| Different product family | 60–120 min (full CIP) | No — regulatory requirement |
| Allergen transition | 120–240 min (enhanced CIP + swab test) | No — requires analytical confirmation |

Schedule CIP cycles as fixed blocks in the schedule, not as "setup time" that can be
compressed. Under-estimating CIP time is a common scheduling error that creates cascading
delays and regulatory risk.

---

## 9. Schedule Stability and Frozen Zones

### 9.1 Frozen / Slushy / Liquid Planning Horizons

| Horizon | Typical Duration | Flexibility | Changes Require |
|---|---|---|---|
| **Frozen** | 0–48 hours | No changes except force majeure | Production Manager + Scheduler approval |
| **Slushy** | 48 hours – 1 week | Sequence changes allowed within day; no date changes | Scheduler approval |
| **Liquid** | 1–4 weeks | Fully flexible for re-sequencing and rescheduling | Scheduler discretion |
| **Tentative** | 4+ weeks | MRP-generated, not yet scheduled | Planning/MRP cycle |

**Why frozen zones matter:** Every schedule change triggers a cascade — material handlers
re-stage kits, operators re-read work orders, quality pre-inspections may need repeating,
and changeover sequences recalculate. A plant that changes the schedule 10 times per shift
has more disruption from schedule changes than from actual production problems.

### 9.2 Schedule Change Cost Model

Before approving a schedule change in the frozen or slushy zone, estimate the total cost:

```
Change Cost = Changeover Cost Delta + Material Restaging Cost + Labour Disruption Cost
              + Quality Re-inspection Cost + Customer Impact Risk
```

If Change Cost > Benefit of Change, reject the change and hold the current schedule.
Document the decision for the post-shift review.

---

## 10. Overtime and Shift Extension Decision Framework

### 10.1 When to Authorise Overtime

Overtime is a scheduling lever, not a default. Use the following decision tree:

1. **Is the overtime required at the constraint?**
   - Yes → Calculate: overtime cost vs. throughput value of additional constraint hours.
     If 4 hours of constraint overtime at $1,200 total cost enables $20,000 of shipments,
     approve immediately. The ROI threshold for constraint overtime is typically 3:1
     (value:cost) or higher.
   - No → The overtime at a non-constraint does not increase plant output. It only makes
     sense if: (a) the non-constraint is starving the constraint and buffer penetration is
     yellow/red, or (b) the non-constraint output is needed for a specific customer shipment
     that cannot wait for the next regular shift.

2. **Is the overtime voluntary or mandatory?**
   - Check union contract or labour regulations. Many agreements require offering overtime
     by seniority before mandating it. Mandatory overtime may require 24–48 hours' notice.
   - Violating overtime assignment rules costs more in grievances and morale damage than
     the production it generates. Always comply.

3. **Fatigue and safety risk:**
   - Operators who have already worked 10+ hours should not be assigned to the constraint
     or to safety-critical operations. Error rates increase 25–40% in hours 11–12.
   - If the overtime extends a 12-hour shift to 16 hours, assign the extended operator to
     non-critical monitoring tasks and bring in a fresh operator for the constraint.

### 10.2 Shift Pattern Comparison for Scheduling

| Pattern | Hours/Week | Handovers/Week | Overtime Headroom | Best For |
|---|---|---|---|---|
| 3 × 8h (Mon–Fri) | 120 | 15 | Saturday shifts, daily OT | High-mix, moderate volume |
| 3 × 8h (24/7) | 168 | 21 | Limited — already near capacity | Process industries, continuous flow |
| 2 × 12h (Mon–Fri) | 120 | 10 | Weekend shifts | Capital-intensive with fewer handovers |
| 2 × 12h (4 on / 4 off) | 168 | 14 | Built into rotation | High-volume, steady demand |
| 4 × 10h (day shift only) | 40 per crew | 4 | Friday, weekend | Low-volume, single-shift operations |

**Handover quality matters for scheduling:** Each handover is a potential point of
information loss — the incoming shift may not know about a developing quality issue,
a material shortage workaround, or a verbal schedule change. Fewer handovers (12-hour
shifts) improve information continuity but increase fatigue risk. Balance based on
operation complexity and error tolerance.

---

## 11. Subcontracting Decision Framework

### 11.1 When to Subcontract

Subcontracting is the scheduling lever of last resort for capacity shortfalls.

**Decision criteria (all must be met):**
1. Internal capacity at the required work centre is fully consumed through the delivery
   deadline, including available overtime.
2. The operation is not at the constraint (subcontracting from the constraint usually means
   the constraint needs elevation, not a one-time fix).
3. A qualified subcontractor exists who can meet the quality specification and delivery timeline.
4. The subcontracting cost + transport cost + quality risk cost is less than the cost of
   late delivery (penalties + customer relationship damage).
5. In regulated industries: the subcontractor holds the necessary certifications
   (ISO, IATF 16949, AS9100, FDA registration, etc.).

### 11.2 Scheduling with Subcontracted Operations

When an operation is subcontracted:
1. Remove the operation from the internal schedule.
2. Add a transport-out time (typically 0.5–2 days) and transport-in time.
3. Add the subcontractor's quoted lead time (add 20% buffer for first-time subcontractors).
4. The total external lead time replaces the internal operation time in the work order routing.
5. Schedule downstream internal operations based on the expected return date, not the
   internal processing time.
6. Monitor subcontractor progress at 50% and 90% completion milestones. Do not wait until
   the due date to discover a delay.

---

## 12. Scheduling Metrics and Continuous Improvement

### 12.1 Key Scheduling Metrics

| Metric | Calculation | Target | What It Reveals |
|---|---|---|---|
| **Schedule Adherence** | Jobs started within ±1 hour of plan / Total jobs | > 90% | How well the plant follows the schedule |
| **Schedule Stability** | Jobs unchanged in frozen zone / Total frozen jobs | > 95% | How often the schedule is disrupted |
| **On-Time Delivery (OTD)** | Orders shipped on or before commit date / Total orders | > 95% | Customer-facing performance |
| **Make Span** | Time from first operation start to last operation end for a work order | Track vs. standard | Total production lead time |
| **Changeover Ratio** | Total changeover time / Total available time at the resource | < 10% at constraint | Setup efficiency |
| **Constraint Utilisation** | Actual producing time / Available time at constraint | > 85% | How well the constraint is exploited |
| **WIP Turns** | Annual COGS / Average WIP Value | > 12 for discrete mfg | Scheduling efficiency and flow |
| **Queue Time Ratio** | Queue time / Total lead time at each work centre | Track trend | Indicates hidden WIP and poor flow |

### 12.2 Scheduling Post-Mortem Process

After every significant schedule disruption (constraint downtime > 1 hour, customer delivery
miss, or overtime exceeding budget by > 20%), conduct a structured post-mortem:

1. **Timeline reconstruction:** What happened, when, and what was the cascade of effects?
2. **Root cause:** Was the disruption caused by equipment, material, labour, quality,
   scheduling logic, or external factors?
3. **Response assessment:** Was the re-sequencing decision optimal? Could the recovery have
   been faster? Were communications timely?
4. **Parameter update:** Do scheduling parameters (setup times, run rates, yield factors,
   buffer sizes) need adjustment based on what we learned?
5. **Systemic fix:** What preventive action will reduce the probability or impact of this
   type of disruption recurring?

Document findings in a scheduling incident log. Review the log monthly with production
management to identify patterns and prioritise improvement actions.

### 12.3 Daily Scheduling Rhythm

A disciplined daily cadence prevents reactive fire-fighting:

| Time | Activity | Participants |
|---|---|---|
| Shift Start − 30 min | Pre-shift review: verify material staging, operator availability, equipment status | Scheduler, Shift Supervisor |
| Shift Start | Publish shift schedule. Walk the floor to confirm understanding. | Scheduler |
| Shift Start + 2 hrs | First checkpoint: plan adherence, buffer penetration, early disruption detection | Scheduler (desk review of MES data) |
| Shift Midpoint | Mid-shift review: actual vs. plan, re-sequence if needed | Scheduler, Shift Supervisor |
| Shift End − 1 hr | End-of-shift projection: what will be incomplete? Handover notes for next shift. | Scheduler, Shift Supervisor |
| Shift End | Shift handover: in-person (preferred) or documented. Key issues, deviations, pending decisions. | Outgoing + Incoming Schedulers |
| Daily (Morning) | Production meeting: yesterday's performance, today's priorities, issues requiring management decision | Scheduler, Production Mgr, Quality, Maintenance, Materials |

This cadence creates at least 5 touchpoints per shift where the schedule is validated
against reality and corrected before deviations compound.

---

## 13. ERP-to-Shop-Floor Data Flow

### 13.1 SAP PP Integration Pattern

```
Sales Orders / Forecast
       ↓
Demand Management (MD61/MD62)
       ↓
MPS — Master Production Schedule (MD40/MD43)
       ↓
MRP Run (MD01/MD02) → Planned Orders
       ↓
Convert Planned → Production Orders (CO40/CO41)
       ↓
Sequence in APS/Scheduling Tool (external or PP/DS)
       ↓
Release to Shop Floor (CO02 — set status REL)
       ↓
MES Execution (operation confirmations — CO11N/CO15)
       ↓
Goods Receipt (MIGO) → Inventory Updated
```

**Common data quality issues:**
- Routing times (setup + run) not updated after process improvements → schedule
  systematically allocates too much or too little time.
- BOM quantities not adjusted for yield → MRP under-orders material.
- Work centre capacity not reflecting actual shift patterns → FCS generates
  infeasible schedules.
- Scrap reporting delayed → plan-vs-actual gap grows silently.

### 13.2 Closing the Feedback Loop

The single most important integration is the MES-to-schedule feedback:

1. **Operation start:** MES records actual start time. Schedule compares to planned start.
   Deviation > 1 hour triggers an alert.
2. **Operation end:** MES records actual end time and quantities (good + scrap). Schedule
   updates remaining operations with actual predecessor completion.
3. **Downtime events:** MES captures downtime start, end, and reason code. Schedule
   automatically adjusts downstream timing.
4. **Quality events:** MES captures inspection results. Failed inspection triggers a
   schedule hold on the affected batch.

Without this feedback loop, the schedule diverges from reality within hours and becomes
aspirational rather than operational. The shop floor stops consulting it, operators make
their own sequencing decisions, and throughput at the constraint drops because ad-hoc
sequencing ignores constraint protection logic.
