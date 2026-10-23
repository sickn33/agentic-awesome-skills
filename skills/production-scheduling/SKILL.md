---
name: production-scheduling
description: Codified expertise for production scheduling, job sequencing, line balancing, changeover optimisation, and bottleneck resolution in discrete and batch manufacturing.
risk: safe
source: https://github.com/ai-evos/agent-skills
date_added: '2026-02-27'
---

# Production Scheduling

## When to Use

Use to draft finite-capacity production schedules, compare sequencing alternatives,
plan changeovers, assess bottlenecks and recover from shortages or downtime.

## Inputs and Boundaries

Obtain work orders, quantities, due dates (ship versus delivery), routings,
precedence/transfer batches, setup matrix/current machine state, verified material
availability, yields, qualified labour/tooling, calendars, maintenance and quality
holds. State the objective and hard constraints. Do not invent resource capacity,
operator qualifications, legal rest periods or customer commitments.

Prepare a proposal. Releasing orders, changing ERP/MES records, approving overtime,
contacting customers, purchasing services and operating equipment require the
responsible owner's authority. Safety, quality, traceability and applicable labour
rules remain hard constraints regardless of output targets or frozen schedules.

## Workflow

1. Reconcile demand and actual shop-floor status before planning. Investigate BOM,
   inventory and routing anomalies through approved change control; do not delete
   unexplained demand or create duplicate replacement orders.
2. Build actual availability by resource and time interval. Include simultaneous
   labour/tooling, qualified alternates, sequence-dependent setup, maintenance,
   material release and downstream storage/inspection. Avoid counting the same
   OEE loss in both run rate and calendar.
3. Identify candidate constraints by load/capacity and observed queues, starvation
   and blocking over the relevant product mix. Highest utilisation or a threshold
   such as 85% is not proof of a system constraint. Simulate local capacity changes
   and check the effect on completed good output and due dates.
4. Generate a feasible baseline, then compare dispatching/setup heuristics against
   the objective. EDD/SPT optimality applies only under specific single-machine
   assumptions; a job-shop heuristic does not prove a global optimum.
5. Validate every operation's predecessor/material release, eligible resources,
   setup/cleaning, calendar, overlap and completion/delivery path. Mark infeasible
   commitments and remaining conflicts; do not present a greedy sort as a solver
   certificate or schedule an unready predecessor.
6. Compare alternatives using incremental contribution, penalties and actual
   costs, with uncertainty. Revenue at risk is not profit or overtime ROI. Escalate
   commercial priority decisions and unsupported assumptions to the owner.
7. Publish only after approval, using version, timezone, effective time and status.
   Reconcile actuals and change records. A frozen zone limits routine changes;
   it cannot override a safety stop, quality hold or newly infeasible operation.

## Core Models

- **Takt:** net available production time / required good units in the same period.
  An 8-hour shift minus 30 minutes breaks has 450 minutes; demand 240 gives 1.875 min/unit.
  Validate parallel capacity and station-by-model work, not only average cycle time.
- **Critical ratio:** remaining available time until due / required remaining time,
  with consistent calendar units and an explicit definition of processing versus
  estimated total lead time. Handle zero remaining time separately. CR below 1
  signals a tight plan under its assumptions, not a certain recovery outcome.
- **Weighted processing priority:** for the classical weighted-completion model,
  order by decreasing weight/processing-time (equivalently increasing p/weight).
  Do not multiply days-until-due by a customer weight and sort ascending: that
  demotes high-weight customers. Cost-of-delay variants need explicit units and
  assumptions; avoid double counting weight and margin.
- **EPQ:** `sqrt(2*D*S/(H*(1-D/P)))`, requiring P>D, consistent period units,
  stationary deterministic rates and a single-item setup/holding model. It is not
  a complete shared-capacity or due-date schedule. Evaluate feasible nearby lot
  sizes rather than automatically rounding up to a whole shift.
- **OEE:** availability×performance×quality using stated planned-production and
  loss definitions. **TEEP:** OEE×loading, with loading=planned production/calendar
  time. Neither is a substitute for product-specific finite-capacity checks.

## Changeovers and Disruptions

Separate internal/external SMED tasks only with approved engineering and hazardous-
energy controls. Do not bypass guards, sensors, inspections, cleaning validation
or process limits to meet a setup target. Quick clamps, parallel maintenance,
unattended cycles and two-out tooling need qualified design and validation.

Contain unsafe/nonconforming goods and preserve traceability first. Keep held
inventory visible but unavailable for consumption/shipment until authorised
release. Rework, substitutions, alternate equipment/sites and subcontractors need
actual qualifications and customer/regulatory approval where applicable.

For drum-buffer-rope, link releases to feasible constraint work and selected
buffers. Buffers can be expressed in time and supported by WIP; they are not
universally 50% of lead time. Do not keep a constraint busy by making unneeded
inventory or ignoring hazards at another work centre.

## Example

A cycle increases from 40 to 45 minutes: time per batch rises 12.5%, but rate falls
`1-40/45=11.11%`. In 120 hours the ideal counts are 180 versus 160 batches (20 fewer),
before setup/yield. With 40 hours remaining, an 8-hour repair leaves 32 hours at 40 min/batch, or 48 batches; running 40 hours at 45 min/batch yields 53.33 batch-equivalents. Compare complete scenarios;
do not subtract 8 hours and report a 4.8-hour gain. A thermal-process change also
needs engineering/quality release before any schedule assumes it is safe.

## Required Output

Provide the versioned operation table (order, resource, setup/start/end, quantity,
status), load/capacity by interval, constraint conflicts, assumptions, delivery
impact and alternate-plan costs. Distinguish proposed versus approved actions and
simulated versus measured performance. State whether the plan is feasible,
heuristic, solver-bounded or unverified.

## References

- [Decision frameworks](references/decision-frameworks.md)
- [Seventeen disruption scenarios](references/edge-cases.md)
- [Draft communications](references/communication-templates.md)

## Limitations

No ERP/MES integration, plant safety assessment, validated process recipe or
optimisation solver is bundled. Verify current systems and site requirements.
Generic examples cannot authorise work, certify product release or guarantee
capacity, customer dates or savings.
