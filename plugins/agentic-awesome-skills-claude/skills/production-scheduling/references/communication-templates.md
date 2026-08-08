# Communication Templates — Production Scheduling

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing production scheduling communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by audience and purpose. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [Production Schedule Publication](#1-production-schedule-publication)
2. [Schedule Change Notification](#2-schedule-change-notification)
3. [Disruption Alert](#3-disruption-alert)
4. [Overtime Request](#4-overtime-request)
5. [Customer Delivery Impact Notice](#5-customer-delivery-impact-notice)
6. [Maintenance Coordination Request](#6-maintenance-coordination-request)
7. [Quality Hold Notification](#7-quality-hold-notification)
8. [Capacity Constraint Escalation](#8-capacity-constraint-escalation)
9. [New Product Trial Run Request](#9-new-product-trial-run-request)
10. [Cross-Functional Priority Alignment](#10-cross-functional-priority-alignment)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{date}}` | Date of communication | `2025-09-15` |
| `{{shift}}` | Shift identifier | `Day Shift (06:00–14:00)` |
| `{{line_id}}` | Production line identifier | `Line 3 — CNC Machining Cell` |
| `{{work_order}}` | Work order number | `WO-2025-04823` |
| `{{product}}` | Product name/number | `Valve Body Assembly VB-220` |
| `{{customer}}` | Customer name | `Apex Automotive GmbH` |
| `{{customer_po}}` | Customer purchase order | `APX-PO-88412` |
| `{{qty}}` | Quantity | `500 units` |
| `{{due_date}}` | Customer due date | `2025-09-22` |
| `{{revised_date}}` | Revised delivery date | `2025-09-25` |
| `{{scheduler_name}}` | Scheduler name | `Dave Morrison` |
| `{{scheduler_title}}` | Scheduler title | `Senior Production Scheduler` |
| `{{scheduler_email}}` | Scheduler email | `d.morrison@mfgco.com` |
| `{{scheduler_phone}}` | Scheduler phone | `(513) 555-0147` |
| `{{plant}}` | Plant name/location | `Cincinnati Plant — Building 2` |
| `{{constraint_wc}}` | Constraint work centre | `CNC Horizontal Boring — WC 420` |
| `{{oee_value}}` | OEE percentage | `72%` |
| `{{downtime_hrs}}` | Downtime hours | `4.5 hours` |
| `{{changeover_time}}` | Changeover duration | `45 minutes` |
| `{{operator_name}}` | Operator name | `J. Rodriguez` |
| `{{supervisor_name}}` | Shift supervisor | `Karen Phillips` |
| `{{maintenance_lead}}` | Maintenance lead | `Tom Becker` |
| `{{quality_lead}}` | Quality lead | `Dr. Sarah Chen` |

---

## 1. Production Schedule Publication

**Audience:** Shift supervisors, operators, material handlers, quality inspectors
**Frequency:** Published at shift start; updated only if disruption requires re-sequencing
**Format:** Table-driven, no paragraphs. Shop floor reads tables, not prose.
**Delivery:** Printed and posted at each work centre + emailed to supervisors + displayed on MES screens

---

**Subject:** Production Schedule — {{plant}} — {{shift}} — {{date}}

**Schedule published by:** {{scheduler_name}} at {{date}} {{time}}

**Priority Legend:** 🔴 Past-due or critical | 🟡 At risk (CR < 1.0) | 🟢 On schedule

| Seq | Work Order | Product | Qty | Start Time | End Time | Work Centre | Operator | Priority | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | {{work_order}} | {{product}} | {{qty}} | 06:00 | 08:30 | {{line_id}} | {{operator_name}} | 🔴 | Rush — customer line-down |
| 2 | WO-2025-04824 | Housing H-340 | 200 | 08:45 | 11:15 | {{line_id}} | {{operator_name}} | 🟢 | Std changeover at 08:30 |
| 3 | WO-2025-04826 | Bracket BR-110 | 350 | 11:30 | 14:00 | {{line_id}} | {{operator_name}} | 🟡 | Material confirm by 10:00 |

**Changeover Summary:**
- 08:30–08:45: Changeover WO-04823 → WO-04824 (tooling pre-staged at machine)
- 11:15–11:30: Changeover WO-04824 → WO-04826 (fixture change, 15 min)

**Material Status:**
- WO-04823: All material staged ✅
- WO-04824: All material staged ✅
- WO-04826: Bracket raw material pending — confirm with stores by 10:00 ⚠️

**Labour Notes:**
- {{operator_name}} certified on all three jobs
- Relief operator for 10:00 break: M. Thompson

**Constraint Status:** {{constraint_wc}} — current OEE {{oee_value}}. Buffer status: GREEN.

**Do not deviate from this sequence without scheduler approval.**

---

**Tone guidance:** Directive, not conversational. The schedule is an instruction, not a suggestion. Use clear times, no approximations. Flag risks with symbols that are visible at a glance. Include material and labour status because the most common schedule disruption is "I didn't have the material" or "nobody told me I was on this job."

---

## 2. Schedule Change Notification

**Audience:** Shift supervisors, affected operators, material handlers
**Trigger:** Any change to the published schedule during the frozen zone
**Delivery:** In-person verbal confirmation + written (posted + emailed)

---

**Subject:** ⚠️ SCHEDULE CHANGE — {{line_id}} — Effective {{effective_time}}

**Change issued by:** {{scheduler_name}} at {{date}} {{time}}
**Approved by:** {{supervisor_name}} (Production Manager approval required for frozen-zone changes)

**Reason for change:** {{change_reason}}

**What changed:**

| | Before | After |
|---|---|---|
| Job sequence at {{line_id}} | WO-04824 → WO-04826 | WO-04826 → WO-04824 |
| WO-04826 start time | 11:30 | 08:45 |
| WO-04824 start time | 08:45 | 11:30 |
| Changeover | Tooling → Fixture (15 min) | Fixture → Tooling (20 min) |

**Why:** {{detailed_reason}} — e.g., "WO-04826 material (bracket raw stock) arrived early. WO-04826 due date is 1 day earlier than WO-04824. Swapping sequence saves 5 minutes of changeover time and improves on-time delivery for both orders."

**Impact on other work centres:** None — downstream operations unaffected.

**Action required:**
- Material handler: Re-stage WO-04826 material at {{line_id}} by 08:30.
- Operator: Confirm fixture change procedure for WO-04826 with setup technician.

**No further changes to this shift's schedule unless a new disruption occurs.**

---

**Tone guidance:** Authoritative but explanatory. The "why" is important because frequent unexplained changes erode shop floor trust in the schedule. Always include who approved the change (accountability). End with a stability commitment — "no further changes" — to prevent the shop floor from anticipating constant flux.

---

## 3. Disruption Alert

**Audience:** Production manager, maintenance manager, shift supervisors, planning
**Trigger:** Any unplanned event affecting the constraint or customer deliveries
**Delivery:** Immediate — phone/radio for constraint events, email for non-constraint

---

**Subject:** 🔴 DISRUPTION ALERT — {{disruption_type}} at {{line_id}} — {{date}} {{time}}

**Reported by:** {{scheduler_name}}
**Severity:** {{severity}} (Critical / Major / Minor)

**What happened:**
{{disruption_description}}
Example: "Hydraulic pump failure on CNC Horizontal Boring Mill (WC 420) at 09:15. Machine stopped mid-cycle on WO-04823 (defence contract valve body, $38,000 piece in machine). Maintenance assessment: pump replacement required, 6–8 hour repair estimated."

**Impact:**
- **Constraint affected:** Yes / No
- **Estimated downtime:** {{downtime_hrs}}
- **Throughput loss:** {{throughput_loss}} (e.g., "$4,800 — 6 hours × $800/hr constraint throughput")
- **Customer orders at risk:** {{at_risk_orders}} (e.g., "3 orders totalling $220,000, due dates within 2 weeks")
- **Current buffer status:** {{buffer_status}} (e.g., "Buffer was GREEN, will reach RED in 4 hours if not resolved")

**Immediate actions taken:**
1. Machine isolated. Maintenance on-site.
2. Replacement pump ordered from OEM distributor — ETA {{pump_eta}}.
3. In-machine part assessed: datum offsets preserved, part likely salvageable on restart.
4. Queued jobs reviewed for alternate routing — 3 of 14 can run on vertical CNC.

**Decision needed from management:**
- Authorise Saturday overtime (8 hours, estimated cost ${{overtime_cost}}) to recover lost capacity? Y/N
- Approve subcontracting for {{subcontract_jobs}} to external shop (cost ${{subcontract_cost}})? Y/N
- Customer notification: approve revised delivery dates for {{at_risk_customers}}? Y/N

**Next update:** {{next_update_time}} or when repair status changes.

---

**Tone guidance:** Lead with impact, not description. The production manager needs to know "how bad is this?" before "what exactly happened." Quantify everything in hours and dollars. Present decisions as explicit Y/N choices — do not leave it ambiguous. Set a next-update cadence so management isn't chasing you for information.

---

## 4. Overtime Request

**Audience:** Production manager (approval), HR/payroll (processing), affected operators
**Trigger:** Capacity shortfall that can be recovered with additional hours
**Delivery:** Email with formal cost justification; verbal pre-approval for urgency

---

**Subject:** Overtime Request — {{line_id}} — {{date_range}}

**Requested by:** {{scheduler_name}}
**Date of request:** {{date}}

**Business justification:**
{{business_case}}
Example: "Constraint work centre (CNC Boring, WC 420) lost 20 hours due to unplanned hydraulic failure on 9/15. Recovery requires Saturday overtime shift to process queued customer orders and prevent 3 delivery misses totalling $220,000 in at-risk revenue."

**Overtime details:**

| Item | Detail |
|---|---|
| Work centre | {{constraint_wc}} |
| Date(s) | {{overtime_dates}} (e.g., Saturday 9/20, 06:00–14:00) |
| Duration | {{overtime_hours}} hours |
| Personnel required | {{personnel_count}} (e.g., 2 CNC operators + 1 setup tech) |
| Personnel names | {{personnel_names}} (voluntary — confirmed availability) |
| Estimated cost | ${{overtime_cost}} ({{hours}} hrs × ${{rate}}/hr × {{multiplier}} OT premium) |
| Union compliance | ✅ Voluntary. Offered by seniority per CBA Article 14.3. 8-hour rest observed. |

**Revenue at risk without overtime:** ${{revenue_at_risk}}
**Cost-to-benefit ratio:** {{ratio}} (e.g., "$1,200 OT cost to protect $220,000 revenue = 183:1 ROI")

**Orders recovered with overtime:**

| Work Order | Customer | Due Date | Status Without OT | Status With OT |
|---|---|---|---|---|
| WO-04825 | {{customer}} | {{due_date}} | 2 days late | On time |
| WO-04827 | Nexus Defense | 9/26 | 1 day late | On time |
| WO-04829 | Summit Aero | 9/28 | On time (barely) | Comfortable margin |

**Approval requested by:** {{approval_deadline}} (e.g., "Thursday 5:00 PM to allow operator notification per CBA 48-hour notice requirement")

---

**Tone guidance:** Treat overtime requests as business cases, not pleas. Quantify both the cost and the benefit. Include union compliance confirmation proactively — the production manager should not have to ask. Provide the approval deadline because overtime notification requirements are contractual, not flexible.

---

## 5. Customer Delivery Impact Notice

**Audience:** Sales/account manager (internal), then customer
**Trigger:** Any order projected to miss its committed delivery date
**Delivery:** Internal first (email + phone to account manager), then customer (via account manager or directly)

---

**Internal Version (to Sales/Account Manager):**

**Subject:** Delivery Impact — {{customer}} — Order {{customer_po}} — Revised ETA {{revised_date}}

**From:** {{scheduler_name}}, Production Scheduling
**Date:** {{date}}

**Summary:**
Order {{customer_po}} for {{customer}} ({{qty}} of {{product}}, original commit date {{due_date}}) will ship {{delay_days}} days late. Revised delivery date: {{revised_date}}.

**Root cause:** {{root_cause_internal}}
Example: "Unplanned constraint downtime on 9/15 (hydraulic failure, 20 hours lost) consumed the schedule buffer. Recovery overtime approved but insufficient to fully close the gap for all affected orders."

**Recovery actions in progress:**
- Saturday overtime shift authorised (recovers 8 hours)
- 3 lower-priority jobs subcontracted to reduce constraint queue (recovers 6 hours)
- Remaining gap: 6 hours, which pushes {{customer_po}} delivery from {{due_date}} to {{revised_date}}

**Contractual exposure:** {{penalty_info}}
Example: "Customer A framework agreement includes $25,000/day late delivery penalty. 3-day delay = $75,000 exposure. Recommend proactive notification and negotiation."

**Recommended customer message:** See external version below. Please review and send by {{notification_deadline}}, or let me know if you'd like to adjust the messaging.

---

**External Version (to Customer):**

**Subject:** Delivery Update — Order {{customer_po}}

Dear {{customer_contact}},

I am writing to update you on the delivery timeline for your order {{customer_po}} ({{qty}} of {{product}}).

Due to {{root_cause_external}} (e.g., "an equipment issue at our machining facility"), we are revising the delivery date from {{due_date}} to {{revised_date}}.

We have taken the following actions to minimise the delay:
- Authorised additional production shifts dedicated to your order
- Re-prioritised your order to the front of the production queue
- Assigned our senior machining team to ensure quality and speed

We understand the impact this may have on your operations and sincerely regret the inconvenience. If the revised date presents difficulties, please let us know and we will explore every option to accelerate further.

{{scheduler_name}} is available at {{scheduler_phone}} for any questions about the production status.

Regards,
{{account_manager_name}}
{{account_manager_title}}
{{our_company}}

---

**Tone guidance — internal:** Factual, quantified, includes penalty exposure. The account manager needs the full picture to make the right call on messaging.

**Tone guidance — external:** Proactive (before the customer discovers the delay), accountable (acknowledge the impact), action-oriented (show what you're doing), no blame (do not name internal equipment or personnel). Never use "we apologise for any inconvenience" — that phrase signals insincerity. Instead, acknowledge the specific impact on their operations.

---

## 6. Maintenance Coordination Request

**Audience:** Maintenance manager/planner
**Trigger:** Scheduling a preventive maintenance window, or requesting priority on corrective maintenance
**Delivery:** Email + calendar invite for planned; phone/radio + email for urgent

---

**Subject:** Maintenance Window Request — {{line_id}} — {{requested_date_range}}

**From:** {{scheduler_name}}, Production Scheduling
**Date:** {{date}}

**Request type:** Preventive Maintenance / Corrective Maintenance / Calibration

**Equipment:** {{equipment_id}} (e.g., "600-ton Stamping Press #2, Asset Tag SP-602")
**Work centre:** {{constraint_wc}}

**Requested window:** {{pm_start}} to {{pm_end}} (e.g., "Saturday 9/20, 06:00–16:00, 10 hours")

**Business justification for this timing:**
{{timing_justification}}
Example: "Saturday window avoids impacting the Week 39 production plan, which is loaded at 94% Mon–Fri. Vibration readings on SP-602 are trending into the caution zone (0.28 in/s, threshold is 0.30). Deferring beyond Saturday increases the risk of an unplanned breakdown during the peak Monday–Wednesday production window."

**Impact if deferred:**
- Probability of unplanned failure in next 2 weeks: {{failure_probability}} (e.g., "estimated 35% based on vibration trend and historical MTBF data")
- Cost of unplanned failure: {{failure_cost}} (e.g., "$16,000 lost throughput + $5,000 emergency repair + potential die damage")
- Production orders at risk: {{at_risk_orders}}

**Production impact of performing the PM:**
- Lost production during the PM window: {{lost_production}} (e.g., "0 — Saturday is non-scheduled overtime; if OT was planned, 8 hours of production displaced")
- Recovery plan: {{recovery_plan}} (e.g., "displaced OT production moved to Friday evening shift extension")

**Coordination requirements:**
- Maintenance personnel: {{maintenance_personnel}} (e.g., "1 millwright + 1 electrician, 10 hours each")
- Parts/materials: {{parts_needed}} (e.g., "hydraulic seal kit #HS-602-A, confirm available in stores")
- Production support: {{production_support}} (e.g., "Operator needed for first 2 hours to assist with die removal and last 1 hour for test run")

---

**Tone guidance:** Collaborative, not adversarial. Scheduling and maintenance are allies, not opponents. Provide the business case for the timing (so maintenance understands why this window matters) and the risk assessment for deferral (so maintenance can prioritise appropriately). Include all logistics so maintenance can plan their work order without back-and-forth.

---

## 7. Quality Hold Notification

**Audience:** Quality manager, production manager, affected work centre supervisors, planning
**Trigger:** In-process quality issue requiring quarantine of WIP
**Delivery:** Immediate email + verbal to quality and production managers

---

**Subject:** 🔴 QUALITY HOLD — {{product}} — Batch {{batch_id}} — {{qty_affected}} units

**Issued by:** {{scheduler_name}} in coordination with {{quality_lead}}
**Date/Time:** {{date}} {{time}}

**Defect summary:** {{defect_description}}
Example: "Dimensional defect on stamped chassis frames — hole pattern shifted 2mm from specification due to suspected die wear. Discovered at weld inspection station."

**Scope of hold:**

| Production Stage | Quantity Affected | Location | Status |
|---|---|---|---|
| Stamping (completed) | 80 units | Welding station queue | QUARANTINED |
| Welding (completed) | 60 units | Paint queue staging | QUARANTINED |
| Paint (completed) | 60 units | Final assembly staging | QUARANTINED |
| **Total** | **200 units** | | |

**Customer impact:**
- Customer: {{customer}}
- Order: {{customer_po}}, {{qty}} units due {{due_date}}
- 60 painted frames were scheduled to feed final assembly (constraint) starting {{date}}.
- Constraint will be short material for {{impact_duration}} unless rework or replacement is expedited.

**Schedule impact:**
- Final assembly (constraint) schedule revised: {{revised_schedule_summary}}
- Alternate work pulled forward to keep constraint running: {{alternate_work}}
- Estimated delivery impact: {{delivery_impact}}

**Disposition pending from Quality:**
- Rework feasibility assessment requested by {{rework_assessment_deadline}}
- If reworkable: estimated rework time = {{rework_time}} per unit
- If not reworkable: replacement production order required — estimated lead time {{replacement_lead_time}}

**Immediate actions taken:**
1. All affected WIP physically segregated and tagged
2. Die #{{die_number}} removed from service for inspection
3. Production schedule revised — constraint fed from alternate work orders
4. Customer notification drafted (pending quality disposition)

---

## 8. Capacity Constraint Escalation

**Audience:** Plant manager, planning manager, production manager
**Trigger:** MRP-generated load exceeds finite capacity by >15% for the upcoming week
**Delivery:** Email with supporting data, presented at weekly S&OP or production meeting

---

**Subject:** Capacity Overload Alert — {{constraint_wc}} — Week {{week_number}}

**From:** {{scheduler_name}}, Production Scheduling
**Date:** {{date}}

**Summary:**
MRP-generated load for {{constraint_wc}} in Week {{week_number}} exceeds available capacity by {{overload_pct}}%. Without intervention, {{overload_hours}} hours of work cannot be scheduled, affecting {{affected_orders}} customer orders.

**Capacity analysis:**

| Item | Hours |
|---|---|
| Available capacity ({{shifts}} shifts × {{hours_per_shift}} hrs, less {{pm_hours}} hrs planned maintenance) | {{available_hours}} |
| MRP-required load | {{required_hours}} |
| Overload | {{overload_hours}} ({{overload_pct}}%) |

**Options for resolution:**

| Option | Capacity Recovered | Cost | Risk | Recommendation |
|---|---|---|---|---|
| Saturday overtime (1 shift) | {{ot_hours}} hrs | ${{ot_cost}} | Low — voluntary OT available | ✅ Recommended |
| Defer {{defer_count}} lower-priority orders to Week {{week_number + 1}} | {{defer_hours}} hrs | $0 | Medium — delivery impact on deferred orders | Acceptable if customers agree |
| Subcontract {{subcontract_ops}} | {{subcontract_hours}} hrs | ${{subcontract_cost}} | Medium — quality and lead time | Last resort |
| Reduce constraint changeovers (campaign scheduling) | {{co_hours}} hrs | $0 | Low — requires schedule restructuring | ✅ Recommended in combination |

**Recommended plan:** Combine overtime ({{ot_hours}} hrs) + changeover reduction ({{co_hours}} hrs) to close the gap. Total gap closed: {{total_recovered}} hrs. Remaining gap: {{remaining_gap}} hrs — address by deferring {{defer_count}} Tier-3 orders with customer agreement.

**Decision needed by:** {{decision_deadline}} (to allow operator notification and material staging)

---

## 9. New Product Trial Run Request

**Audience:** Production manager, engineering, quality, scheduling
**Trigger:** NPI (new product introduction) requiring constraint time for trial runs
**Delivery:** Email with formal request; presented at production planning meeting

---

**Subject:** NPI Trial Run Request — {{npi_product}} — {{requested_dates}}

**From:** {{scheduler_name}} in coordination with {{engineering_lead}}

**Product:** {{npi_product}} (e.g., "EV Battery Enclosure — Part #BE-4400")
**Customer:** {{customer}}
**Qualification deadline:** {{qualification_deadline}}

**Trial run requirements:**

| Trial # | Date | Constraint Time (nominal) | Buffered Time (planned) | Changeover | Total Window |
|---|---|---|---|---|---|
| 1 | {{trial_1_date}} | 8 hrs | 14 hrs | 4 hrs | 18 hrs |
| 2 | {{trial_2_date}} | 8 hrs | 12 hrs | 4 hrs | 16 hrs |
| 3 | {{trial_3_date}} | 8 hrs | 10 hrs | 2 hrs | 12 hrs |

**Capacity impact:**
- Current constraint utilisation: {{current_util}}%
- With NPI trials: {{projected_util}}%
- Buffer reduction: constraint buffer shrinks from {{current_buffer}} hrs to {{projected_buffer}} hrs per week

**Proposed scheduling approach:**
- Schedule trials on Friday PM / Saturday AM to contain overrun risk
- {{buffer_hours}} hrs/week reserved as "trial buffer" — converts to regular production if trial is cancelled or completes early
- Existing customer commitments are not moved to accommodate trials

**Risk mitigation:**
- Most experienced setup technician assigned to all trials
- First-article inspection protocol defined with quality
- Trial time estimates will be updated after each run for the next trial

**Approval required from:** Production Manager (capacity impact) + Quality (trial protocol) + Engineering (trial plan)

---

## 10. Cross-Functional Priority Alignment

**Audience:** Sales, planning, production, quality, finance
**Trigger:** Competing priorities require alignment (quarterly or when significant conflicts arise)
**Delivery:** Presented at S&OP meeting with supporting data

---

**Subject:** Priority Alignment Request — Week {{week_number}} / Month {{month}}

**From:** {{scheduler_name}}, Production Scheduling

**Issue:**
The current production plan contains conflicting priorities that cannot be resolved within available capacity. Scheduling has identified {{conflict_count}} conflicts requiring cross-functional alignment.

**Conflict summary:**

| # | Conflict | Departments Involved | Scheduler's Assessment |
|---|---|---|---|
| 1 | Customer A rush order vs. Customer B committed delivery — both need CNC constraint, 16-hour gap | Sales + Production | Need commercial decision: which customer takes priority? |
| 2 | NPI trial run vs. production schedule — trial requires 14 hrs of constraint time in a week loaded at 94% | Engineering + Production | Recommend scheduling trial on Saturday to avoid displacement |
| 3 | Maintenance PM window vs. peak production week — PM deferred twice already | Maintenance + Production | Recommend executing PM this week; deferral risk exceeds production value of the PM window |

**For each conflict, scheduling needs:**
1. A single, clear priority decision
2. Written confirmation (email or meeting minutes) that the decision is endorsed by all affected departments
3. Decision by {{decision_deadline}} so the schedule can be locked for the week

**Scheduling will execute whatever priority is agreed. We are not requesting a specific outcome — we are requesting clarity so the schedule can be built without ambiguity.**

---

**Tone guidance:** Neutral facilitator, not advocate. The scheduler's role in priority alignment is to surface conflicts, quantify tradeoffs, and execute decisions — not to make commercial or strategic calls. Make it clear that you need a decision, not a discussion. Provide the data that enables the decision.
