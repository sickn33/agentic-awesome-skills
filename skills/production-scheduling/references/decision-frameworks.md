# Production scheduling decision frameworks

## Feasibility before priority

Define calendars, resource eligibility, simultaneous labour/tooling, maintenance,
material/quality release, precedence, transfer batches, setup state, yields and
due dates. Schedule only ready operations or calculate predecessors first; queue
unready work until feasible. Reserve all affected resources and revalidate the
whole affected chain after a change. Parallel machines are not interchangeable
unless their capability and approvals support the operation.

A forward pass gives earliest completion under the selected resource decisions;
a backward pass tests latest starts and may expose conflicts. Neither alone
proves feasibility with shared resources. If demand cannot fit, report the gap
and alternatives; do not force negative starts or overwrite another reservation.

## Dispatching assumptions

| Rule | Appropriate interpretation |
|---|---|
| EDD | Minimises maximum lateness in the classical single-machine, ready-at-zero, non-preemptive model without sequence-dependent setups; not a general job-shop guarantee |
| SPT | Minimises sum/mean completion times in the corresponding unweighted model; does not guarantee all due dates or higher completed output for a fixed job set |
| Weighted SPT | Decreasing weight/p for weighted completion under its model; document units and weights |
| Critical ratio/slack | Dynamic urgency heuristics using a consistent available-time calendar and explicit remaining-work definition |
| FIFO | A simple arrival-order policy; fairness/objectives still need assessment |

No fixed customer multiplier, urgency cutoff or swap saving is universally valid.
Use actual contracts and approved economic priorities. A job due tomorrow must
not outrank an otherwise comparable job due in two hours under EDD merely because
it is longer. Avoid counting correlated value and penalty estimates twice.

## Setup search

Measure transition-specific setup including cleaning, current state, tooling,
first-piece release, labour and prohibited transitions. Nearest-neighbour is a
heuristic and can leave jobs unschedulable. Adjacent swaps are local search, not
2-opt by definition. In a directed setup matrix, reversing a segment changes all
internal arcs; evaluate them as well as boundaries. Include initial/final setup
where required and re-check every resource/deadline after a move.

The illustrative six-colour route White-Yellow-Orange-Red-Blue-Black has 49 minutes
from its specified five arcs. That total alone does not prove global optimality
or include the unknown starting state. Do not claim an optimum without exhaustive
comparison or a solver bound. Safety/cleaning constraints cannot be traded away.

## Capacity and bottlenecks

Compute load and availability in matched machine-hours, operator-hours and time
windows. Summing operator overtime does not automatically add equal machine-hours:
four people needed simultaneously contribute one crew-hour per four person-hours.
Observe actual WIP, starvation and blocking; excess WIP alone is not proof of a
constraint, nor does one overloaded ratio decide the whole system.

Simulate changes jointly across near-constraints and product mix. A downstream
blockage or non-constraint hazard can still stop shipments or require immediate
safety action. DBR buffers and release rates need measured variability and yield;
do not impose a universal buffer fraction, hidden-capacity recovery or compulsory
100% utilisation. Demand can itself constrain output.

Subcontracting a constraint operation can be a valid elevation/recovery option.
Assess qualified capacity, product/data transfer approvals, transport, inspection,
lead time and total cost; it is not inherently a last resort or prohibited at the
constraint. FDA registration or a generic ISO certificate is not proof that a
particular process, product, site or customer approval is satisfied.

## Safe process improvement

SMED means aiming for a single-digit minute changeover, not a guarantee. Record
last-good to first-good times, classify tasks and propose engineering-controlled
improvements. Energy isolation, guarding, sanitation, maintenance and first-piece
release remain binding. A first value inside SPC limits does not prove a capable,
stable process or replace product acceptance/validated trial requirements.

CIP/allergen durations and tests come from the validated product/site procedure;
there are no universal 15/60/120/240 minute regulatory minima. Do not lower sterilisation
parameters or keep a leaking retort running just to preserve constraint output.

## Labour, line balance and calendars

Check real qualifications, rest/overtime rules, relief coverage and fatigue
assessment. Do not infer FDA personally certifies every plant operator or that
an 8-hour rest universally permits another shift. Worker safety precedes output.
For a net 450 minute shift and demand 240, takt is 1.875 min/unit. Balance tasks with
precedence and validate station/model peaks, buffers, parallel work and permissible
overlap. An average below takt does not prove a long individual task can catch up.

Keep plant operating hours distinct from hours per worker/crew. A24/7 line offers
168 calendar hours/week before losses; a four-on/four-off individual roster does
not itself staff every hour. Measure setup and rework once; apply yield factors
consistently. A move from 95% to 97% yield is two percentage points and about 2.105%
relative increase, not automatically the same as a 2% capacity expansion.

## Economics and reporting

Compare expected incremental contribution, avoided penalties and actual costs,
not gross shipment value as ROI. Forecasts and hazard assessments must come from
reliable owners; do not fabricate failure probabilities from MTBF alone. Separate
machine elapsed time, person-hours, critical-path delay and calendar shipping time.
State whether a due date is shipment, arrival or customer acceptance.

Keep frozen-zone versions, changes, approvals and actuals. Safety/quality stops
apply immediately regardless of a stability lock or cost-benefit threshold.
During an ERP outage use the approved continuity plan with unique transaction
identifiers and reconciliation; do not pre-post nonexistent issues/receipts or
blindly replay transactions that can duplicate inventory.

## Primary references

- [OSHA hazardous-energy control](https://www.osha.gov/control-hazardous-energy/)
- [FDA current device QMSR](https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr)

Use plant-specific validated procedures and current governing rules for execution.
