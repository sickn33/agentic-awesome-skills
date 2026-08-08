# Communication Templates — Quality & Non-Conformance Management

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing quality communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by audience and situation. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [NCR Notification (Internal)](#1-ncr-notification-internal)
2. [MRB Disposition Record](#2-mrb-disposition-record)
3. [Corrective Action Request (CAR) to Supplier](#3-corrective-action-request-car-to-supplier)
4. [CAPA Initiation Record](#4-capa-initiation-record)
5. [CAPA Effectiveness Review](#5-capa-effectiveness-review)
6. [Audit Finding Response](#6-audit-finding-response)
7. [Customer Quality Notification](#7-customer-quality-notification)
8. [Supplier Audit Report Summary](#8-supplier-audit-report-summary)
9. [Quality Alert (Internal)](#9-quality-alert-internal)
10. [Management Review Quality Summary](#10-management-review-quality-summary)
11. [Regulatory Agency Response (FDA Form 483)](#11-regulatory-agency-response-fda-form-483)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{ncr_number}}` | Non-conformance report number | `NCR-2025-0412` |
| `{{capa_number}}` | CAPA record number | `CAPA-2025-0023` |
| `{{scar_number}}` | Supplier corrective action request number | `SCAR-2025-0089` |
| `{{part_number}}` | Part number and revision | `7832-A Rev D` |
| `{{part_description}}` | Part description | `Shaft, Output — Titanium` |
| `{{lot_number}}` | Lot or batch number | `LOT-2025-4471` |
| `{{po_number}}` | Purchase order number | `PO-2025-08832` |
| `{{wo_number}}` | Work order number | `WO-2025-1104` |
| `{{serial_numbers}}` | Affected serial numbers (if applicable) | `SN-10042 through SN-10089` |
| `{{supplier_name}}` | Supplier company name | `Precision Castings Corp.` |
| `{{supplier_contact}}` | Supplier quality contact name | `Maria Gonzalez, Quality Manager` |
| `{{customer_name}}` | Customer company name | `MedTech Instruments Inc.` |
| `{{customer_contact}}` | Customer quality contact name | `David Chen, Supplier Quality Engineer` |
| `{{spec_requirement}}` | Specification and requirement violated | `Drawing 7832-A Rev D, Dim A: 12.45 ±0.05mm` |
| `{{actual_values}}` | Measured values of nonconforming product | `12.52mm, 12.54mm, 12.51mm (3 of 50 sample)` |
| `{{quantity_affected}}` | Number of parts affected | `18 of 500 pieces inspected` |
| `{{quantity_total}}` | Total lot quantity | `2,000 pieces` |
| `{{defect_description}}` | Description of the non-conformance | `OD exceeds USL by 0.02-0.04mm` |
| `{{containment_status}}` | Current containment actions | `Material quarantined in MRB cage, Bay 3` |
| `{{our_quality_contact}}` | Internal quality contact | `Sarah Thompson, Quality Engineer` |
| `{{our_quality_email}}` | Internal quality email | `sthompson@company.com` |
| `{{our_quality_phone}}` | Internal quality phone | `(555) 234-5678` |
| `{{our_company}}` | Our company name | `Advanced Manufacturing Solutions` |
| `{{date_discovered}}` | Date non-conformance was discovered | `2025-03-15` |
| `{{response_deadline}}` | Deadline for response | `2025-03-25 (10 business days)` |
| `{{severity_level}}` | NCR severity classification | `Major — Dimensional non-conformance on key characteristic` |

---

## 1. NCR Notification (Internal)

### When to Use
- Non-conformance identified at incoming inspection, in-process, or final inspection
- Initial notification to affected departments (manufacturing, engineering, procurement, planning)
- Material has been quarantined; disposition pending

### Tone Guidance
Factual and direct. Internal teams need to know what happened, what the scope is, and what the immediate impact is. No blame, no speculation — data only. Include enough detail for engineering to begin their assessment and for planning to evaluate the production impact.

### Template

**Subject:** `{{ncr_number}}: {{part_number}} — {{defect_description}}`

**To:** Manufacturing Engineering, Production Planning, Procurement (if supplier-related), Quality Manager
**Cc:** Quality file

---

**Non-Conformance Report: {{ncr_number}}**

**Date Discovered:** {{date_discovered}}
**Discovered By:** {{inspector_name}}, {{inspection_stage}} (incoming / in-process / final)
**Part Number:** {{part_number}} — {{part_description}}
**Lot/Batch:** {{lot_number}} | Work Order: {{wo_number}} | PO: {{po_number}} (if incoming)

**Non-Conformance Description:**
{{defect_description}}

**Specification Requirement:** {{spec_requirement}}
**Actual Values:** {{actual_values}}
**Quantity Affected:** {{quantity_affected}} of {{quantity_total}} total lot

**Containment Status:**
{{containment_status}}

**Initial Scope Assessment:**
- [ ] Other lots from same supplier/production run checked: {{scope_check_result}}
- [ ] WIP containing this material identified: {{wip_status}}
- [ ] Finished goods containing this material identified: {{fg_status}}
- [ ] Downstream customer shipments containing this material: {{shipped_status}}

**Production Impact:**
{{production_impact_summary}} (e.g., "Line 3 is waiting on this material for WO-2025-1104; 2-day impact if not dispositioned by Thursday")

**Requested Action:**
Engineering review of functional impact requested by {{disposition_deadline}}.
MRB meeting scheduled: {{mrb_date_time}}.

**Quality Contact:** {{our_quality_contact}} | {{our_quality_email}} | {{our_quality_phone}}

---

## 2. MRB Disposition Record

### When to Use
- Documenting the Material Review Board's disposition decision
- Required for all NCR dispositions that are not straightforward scrap
- Audit-trail document; this is what auditors review

### Tone Guidance
Formal, precise, and complete. This is a controlled document. Every field must be populated. Engineering justification must be technically sound and specific — not "acceptable per engineering review" but a detailed rationale citing functional requirements.

### Template

**MRB DISPOSITION RECORD**

| Field | Value |
|---|---|
| NCR Number | {{ncr_number}} |
| MRB Date | {{mrb_date}} |
| Part Number / Rev | {{part_number}} |
| Part Description | {{part_description}} |
| Lot/Batch | {{lot_number}} |
| Quantity Affected | {{quantity_affected}} |
| Nonconformance | {{defect_description}} |
| Specification Violated | {{spec_requirement}} |
| Actual Values | {{actual_values}} |

**Disposition Decision:** ☐ Use-As-Is ☐ Rework ☐ Repair ☐ Return to Vendor ☐ Scrap

**Engineering Justification (required for Use-As-Is and Repair):**
{{engineering_justification}}

Example: "The OD measurement of 12.52mm (USL 12.50mm) exceeds the drawing tolerance by 0.02mm. Per engineering analysis EA-2025-0034, this dimension interfaces with bore ID 12.60 +0.05/-0.00mm on mating part 7833-B. Minimum clearance at worst-case stack-up (shaft 12.52mm, bore 12.60mm) is 0.08mm. Assembly requirement per DWG 100-ASSY-Rev C specifies minimum 0.05mm clearance. The 0.08mm clearance meets the functional requirement. No impact to form, fit, or function."

**Risk Assessment (required for safety-critical parts):**
{{risk_assessment_reference}} (e.g., "Per ISO 14971 risk assessment RA-2025-0012, risk level is acceptable — severity [minor], probability [remote]")

**Customer Approval (required for aerospace Use-As-Is/Repair):**
☐ Not required (standard/non-regulated) ☐ Requested — Reference: {{customer_approval_ref}} ☐ Approved — Date: {{approval_date}} ☐ Denied

**Cost Impact:**
| Item | Amount |
|---|---|
| Scrap cost | {{scrap_cost}} |
| Rework labor | {{rework_cost}} |
| Re-inspection | {{reinspect_cost}} |
| Expedite / replacement | {{expedite_cost}} |
| **Total NCR cost** | **{{total_cost}}** |

**CAPA Required:** ☐ Yes — {{capa_number}} ☐ No — Rationale: {{no_capa_rationale}}

**MRB Attendees and Signatures:**

| Name | Department | Signature | Date |
|---|---|---|---|
| {{quality_rep}} | Quality Engineering | | {{date}} |
| {{engineering_rep}} | Design/Product Engineering | | {{date}} |
| {{manufacturing_rep}} | Manufacturing Engineering | | {{date}} |
| {{other_rep}} | {{other_dept}} | | {{date}} |

---

## 3. Corrective Action Request (CAR) to Supplier

### When to Use
- Significant non-conformance on incoming material traceable to a supplier
- Repeated minor non-conformances from the same supplier (3+ in 90 days)
- Supplier escalation Level 1 (SCAR issuance)

### Tone Guidance
Professional, specific, and structured. Provide all data the supplier needs to investigate. Set clear expectations for the response format and timeline. Do not be accusatory — present the facts and ask for investigation. The supplier's willingness and quality of response will tell you whether this is a fixable issue or a systemic problem.

### What NOT to Say
- Do not threaten ASL removal in a first-time CAR (save escalation language for Level 2+)
- Do not speculate on the root cause — that's the supplier's job
- Do not include internal financial impact numbers (the supplier doesn't need to know your downstream costs at this stage)

### Template

**Subject:** `SCAR-{{scar_number}}: Non-Conformance on PO# {{po_number}} — Response Required by {{response_deadline}}`

**To:** {{supplier_contact}}, {{supplier_name}}
**Cc:** {{our_quality_contact}}, Procurement buyer

---

**SUPPLIER CORRECTIVE ACTION REQUEST**

**SCAR Number:** {{scar_number}}
**Date Issued:** {{date_issued}}
**Response Due:** {{response_deadline}} (initial response with containment + preliminary root cause)
**Full Corrective Action Plan Due:** {{full_response_deadline}} (30 calendar days)

**Supplier Information:**
- Supplier: {{supplier_name}}
- Supplier Code: {{supplier_code}}
- Contact: {{supplier_contact}}

**Non-Conformance Details:**
- Part Number: {{part_number}} — {{part_description}}
- PO Number: {{po_number}}
- Lot/Batch: {{lot_number}}
- Quantity Received: {{quantity_total}}
- Quantity Nonconforming: {{quantity_affected}}
- Date Received: {{date_received}}
- Date Non-Conformance Identified: {{date_discovered}}

**Specification Requirement:**
{{spec_requirement}}

**Actual Results:**
{{actual_values}}

**Supporting Documentation Attached:**
- [ ] Inspection report with measurement data
- [ ] Photographs of nonconforming material
- [ ] Drawing excerpt highlighting affected dimension/requirement
- [ ] Copy of your Certificate of Conformance for this lot

**Impact to Our Operations:**
{{impact_summary}} (e.g., "Production line held pending disposition. Estimated 3-day impact to customer delivery schedule.")

**Required Response (use 8D format or equivalent):**
1. **Containment actions** — immediate actions to protect our inventory and any other customers who may have received material from the same lot. Confirm whether other lots from the same production run may be affected.
2. **Root cause analysis** — we require a rigorous root cause investigation, not a surface-level explanation. "Operator error" or "inspection escape" are not acceptable root causes. Identify the systemic process or system failure that allowed this non-conformance.
3. **Corrective actions** — specific, measurable actions addressing the verified root cause. Include implementation dates and responsible personnel.
4. **Effectiveness verification plan** — how and when will you verify that the corrective actions are effective?

**Disposition of Nonconforming Material:**
☐ Return to Vendor — please issue RMA# and shipping instructions
☐ Sort at our facility — credit memo for sort labor will follow
☐ Scrap at our facility — credit memo for material value will follow

**Contact for Questions:**
{{our_quality_contact}} | {{our_quality_email}} | {{our_quality_phone}}

---

## 4. CAPA Initiation Record

### When to Use
- Formal CAPA initiation based on established trigger criteria
- Documents the triggering event, scope, team assignment, and initial timeline

### Tone Guidance
Structured and factual. The initiation record sets the scope and expectations for the entire CAPA. Ambiguity here leads to scope creep or incomplete investigations later. Be specific about what triggered the CAPA and what the expected outcome is.

### Template

**CORRECTIVE AND PREVENTIVE ACTION RECORD**

| Field | Value |
|---|---|
| CAPA Number | {{capa_number}} |
| Date Initiated | {{date_initiated}} |
| Type | ☐ Corrective ☐ Preventive |
| Source | ☐ NCR ☐ Customer Complaint ☐ Audit Finding ☐ Trend Analysis ☐ Field Failure ☐ Other: {{other_source}} |
| Source Reference(s) | {{source_references}} (e.g., NCR-2025-0412, NCR-2025-0398, NCR-2025-0456) |
| Priority | ☐ Critical (safety/regulatory) ☐ High (customer impact) ☐ Medium (internal) ☐ Low (improvement) |

**Problem Statement:**
{{problem_statement}}

Example: "Recurring dimensional non-conformance on Part 7832-A Rev D — bore diameter out of tolerance (>USL of 12.50mm). Three NCRs in the last 60 days (NCR-2025-0398, -0412, -0456) affecting lots from three different production runs. Total scrap cost to date: $14,200. No customer impact confirmed, but risk of escape exists based on inspection sampling rates."

**Scope:**
- Product(s) affected: {{products_affected}}
- Process(es) affected: {{processes_affected}}
- Location(s): {{locations_affected}}
- Period: {{time_period}}

**Team Assignment:**

| Role | Name | Department |
|---|---|---|
| CAPA Owner | {{capa_owner}} | {{owner_dept}} |
| Lead Investigator | {{investigator}} | {{investigator_dept}} |
| Team Members | {{team_members}} | {{team_depts}} |
| Management Sponsor | {{sponsor}} | {{sponsor_dept}} |

**Timeline:**

| Phase | Target Date |
|---|---|
| Root Cause Investigation Complete | {{rca_target}} |
| Corrective Action Plan Approved | {{plan_target}} |
| Implementation Complete | {{implementation_target}} |
| Effectiveness Verification Start | {{verification_start}} |
| Effectiveness Verification Complete | {{verification_end}} |
| CAPA Closure Target | {{closure_target}} |

**Initial Containment Actions (if applicable):**
{{containment_actions}}

---

## 5. CAPA Effectiveness Review

### When to Use
- At the end of the effectiveness monitoring period (typically 90 days after implementation)
- Documents the evidence of effectiveness and the closure/extension decision

### Tone Guidance
Data-driven and conclusive. The effectiveness review is where the CAPA either closes with evidence of success or reopens with evidence of failure. Auditors specifically review effectiveness evidence — it must be quantitative and linked to the original problem statement.

### Template

**CAPA EFFECTIVENESS REVIEW**

| Field | Value |
|---|---|
| CAPA Number | {{capa_number}} |
| Original Problem | {{problem_statement}} |
| Root Cause | {{verified_root_cause}} |
| Corrective Action(s) Implemented | {{corrective_actions}} |
| Implementation Date | {{implementation_date}} |
| Monitoring Period | {{monitoring_start}} to {{monitoring_end}} |

**Implementation Verification:**
- [ ] Work instruction / procedure updated: Rev {{rev}} effective {{date}}
- [ ] Personnel trained: {{training_records_ref}}
- [ ] Equipment/fixture installed and validated: {{validation_ref}}
- [ ] FMEA / Control Plan updated: {{fmea_ref}}
- [ ] Supplier corrective action verified: {{scar_ref}}

**Effectiveness Data:**

| Metric | Baseline (Pre-CAPA) | Target | Actual (Monitoring Period) | Result |
|---|---|---|---|---|
| {{metric_1}} | {{baseline_1}} | {{target_1}} | {{actual_1}} | ☐ Pass ☐ Fail |
| {{metric_2}} | {{baseline_2}} | {{target_2}} | {{actual_2}} | ☐ Pass ☐ Fail |
| Recurrence count | {{baseline_recurrence}} | Zero | {{actual_recurrence}} | ☐ Pass ☐ Fail |

**Conclusion:**
☐ **CAPA Effective — Close.** All effectiveness criteria met. Zero recurrences during monitoring period. Process capability meets target.
☐ **CAPA Partially Effective — Extend monitoring.** Improvement demonstrated but monitoring period insufficient for definitive conclusion. Extend by {{extension_days}} days.
☐ **CAPA Not Effective — Reopen.** Recurrence observed during monitoring period. Root cause re-investigation required. See {{reopened_investigation_ref}}.

**Reviewed By:**

| Name | Role | Signature | Date |
|---|---|---|---|
| {{reviewer_1}} | CAPA Owner | | |
| {{reviewer_2}} | Quality Manager | | |

---

## 6. Audit Finding Response

### When to Use
- Responding to external audit findings (registrar, customer, regulatory)
- Structure applies to ISO audit NCRs, customer audit CARs, and FDA 483 responses (with modifications per template 11)

### Tone Guidance
Factual, accountable, and solution-oriented. Accept the finding (even if you disagree with the interpretation — debate the interpretation separately, not in the corrective action response). Demonstrate that you understand the intent of the requirement, not just the words. Auditors value self-awareness and systemic thinking.

### Template

**AUDIT FINDING CORRECTIVE ACTION RESPONSE**

**Audit:** {{audit_type}} (e.g., ISO 9001 Surveillance, Customer Audit, IATF 16949 Recertification)
**Auditor / Organization:** {{auditor_name}}, {{audit_organization}}
**Audit Date(s):** {{audit_dates}}
**Finding Number:** {{finding_number}}
**Finding Classification:** ☐ Major Non-Conformity ☐ Minor Non-Conformity ☐ Observation / OFI

**Finding Statement:**
{{finding_statement}}

**Standard Clause Referenced:** {{standard_clause}} (e.g., ISO 9001:2015 §8.5.2, IATF 16949 §10.2.3)

**Our Response:**

**1. Acknowledgment:**
We acknowledge the finding. {{brief_acknowledgment}}

**2. Root Cause Analysis:**
{{root_cause_analysis}}

**3. Containment (immediate action taken):**
{{containment_actions}}

**4. Corrective Action:**
| Action | Responsible | Target Date | Evidence of Completion |
|---|---|---|---|
| {{action_1}} | {{responsible_1}} | {{date_1}} | {{evidence_1}} |
| {{action_2}} | {{responsible_2}} | {{date_2}} | {{evidence_2}} |

**5. Scope Extension (did we check for similar gaps elsewhere?):**
{{scope_extension}}

**6. Effectiveness Verification Plan:**
{{effectiveness_plan}}

**Submitted By:** {{responder_name}}, {{responder_title}}
**Date:** {{submission_date}}

---

## 7. Customer Quality Notification

### When to Use
- Non-conformance discovered on product already shipped to the customer
- Proactive notification — the customer should hear about it from you before they discover it themselves

### Tone Guidance
Transparent, action-oriented, and structured. Lead with what you know and what you've done (containment), not with excuses. Provide the specific traceability data the customer needs to identify and segregate affected product in their inventory. The customer will judge your quality system based on how you handle this notification — transparency and speed build trust; delay and vagueness destroy it.

### What NOT to Say
- Do not minimize: "A minor issue was detected" when you don't yet know the scope
- Do not speculate on root cause: "We believe this was caused by..." without verified data
- Do not over-promise on timeline: "This will be resolved by Friday" unless you're certain

### Template

**Subject:** `Quality Notification: {{part_number}} — {{defect_description}} — Action Required`

**To:** {{customer_contact}}, {{customer_name}}
**Cc:** {{our_quality_contact}}, Account Manager

---

**CUSTOMER QUALITY NOTIFICATION**

**Date:** {{date}}
**Our Reference:** {{ncr_number}}
**Priority:** {{priority_level}} (Critical / High / Standard)

Dear {{customer_contact}},

We are contacting you to notify you of a quality concern with material we have supplied.

**Affected Product:**
- Part Number: {{part_number}} — {{part_description}}
- Lot Number(s): {{lot_numbers}}
- Serial Number(s): {{serial_numbers}} (if applicable)
- Ship Date(s): {{ship_dates}}
- PO/Order Reference(s): {{po_numbers}}
- Quantity Shipped: {{quantity_shipped}}

**Nature of Non-Conformance:**
{{defect_description_for_customer}}

**Containment Actions Taken:**
1. All inventory at our facility has been quarantined and placed on hold
2. Shipments in transit have been intercepted where possible: {{transit_status}}
3. We request that you quarantine the following lot(s) in your inventory: {{lots_to_quarantine}}

**Recommended Customer Action:**
{{recommended_customer_action}} (e.g., "Please segregate and hold the affected lot numbers listed above. Do not use this material until we provide disposition guidance.")

**Investigation Status:**
We have initiated an investigation ({{ncr_number}}) and are conducting [root cause analysis / containment sort / material verification]. We will provide an updated status by {{next_update_date}}.

**Your Direct Contact:**
{{our_quality_contact}}
{{our_quality_email}}
{{our_quality_phone}}

We take this matter seriously and are committed to full transparency as our investigation progresses. We will provide updates at minimum every {{update_frequency}} until this is resolved.

Sincerely,
{{our_quality_contact}}, {{our_quality_title}}
{{our_company}}

---

## 8. Supplier Audit Report Summary

### When to Use
- Summary of a supplier quality audit (process, system, or product audit)
- Distributed to procurement, engineering, and supplier quality management
- Basis for audit follow-up actions

### Tone Guidance
Objective and balanced. Report what was observed, both strengths and deficiencies. An audit report that is exclusively negative suggests the auditor was looking for problems rather than assessing capability. An audit report that is exclusively positive suggests the auditor wasn't thorough. The summary should give management a clear picture of the supplier's quality maturity.

### Template

**SUPPLIER AUDIT REPORT SUMMARY**

| Field | Value |
|---|---|
| Supplier | {{supplier_name}} |
| Supplier Code | {{supplier_code}} |
| Audit Type | ☐ System ☐ Process ☐ Product ☐ Combined |
| Audit Date(s) | {{audit_dates}} |
| Auditor(s) | {{auditor_names}} |
| Standard(s) Audited Against | {{standards}} (e.g., ISO 9001:2015, IATF 16949, AS9100D) |
| Scope | {{audit_scope}} |

**Overall Assessment:** ☐ Approved ☐ Approved with Conditions ☐ Not Approved

**Strengths Observed:**
1. {{strength_1}}
2. {{strength_2}}
3. {{strength_3}}

**Findings:**

| # | Clause | Finding | Classification |
|---|---|---|---|
| 1 | {{clause_1}} | {{finding_1}} | Major / Minor / OFI |
| 2 | {{clause_2}} | {{finding_2}} | Major / Minor / OFI |

**Corrective Action Requirements:**
- Response due: {{car_deadline}}
- Format: 8D or equivalent with root cause analysis and implementation plan
- Submit to: {{submit_to}}

**Recommendations:**
{{recommendations}} (e.g., "Approve for production with mandatory follow-up audit in 6 months to verify corrective actions. Increase incoming inspection level to tightened until corrective actions verified.")

---

## 9. Quality Alert (Internal)

### When to Use
- Urgent notification to production floor, inspection, and shipping about a quality issue requiring immediate action
- Non-conformance that could affect product currently in production or awaiting shipment
- Temporary enhanced inspection or containment measure

### Tone Guidance
Urgent, clear, and actionable. This goes to the production floor — operators, supervisors, inspectors. Use plain language. Include photographs if possible. Specify exactly what to do and what to look for. This is not a request for analysis; it's an instruction for immediate action.

### Template

**⚠ QUALITY ALERT ⚠**

**Alert Number:** QA-{{alert_number}}
**Date Issued:** {{date_issued}}
**Effective Immediately — Until Rescinded**

**Affected Part(s):** {{part_number}} — {{part_description}}
**Affected Area(s):** {{production_areas}} (e.g., "Line 3 — CNC Turning, Incoming Inspection, Final Inspection, Shipping")

**Issue:**
{{issue_description_plain_language}}

**What to Look For:**
{{what_to_look_for}} (specific, measurable criteria with photographs if available)

**Required Action:**
1. {{action_1}} (e.g., "100% inspect all WIP on this part number for the affected dimension before releasing to the next operation")
2. {{action_2}} (e.g., "Segregate and tag any nonconforming parts found — do NOT scrap without Quality Engineering authorization")
3. {{action_3}} (e.g., "Notify Quality Engineering immediately if any additional nonconforming parts are found: {{contact_info}}")

**This alert remains in effect until:** {{rescind_condition}} (e.g., "written notification from Quality Engineering that the root cause has been addressed and verified")

**Issued By:** {{issuer_name}}, {{issuer_title}}

---

## 10. Management Review Quality Summary

### When to Use
- Monthly or quarterly management review input on quality performance
- Summarizes key metrics, significant quality events, CAPA status, and cost of quality

### Tone Guidance
Executive-level. Lead with the headline — is quality performance improving, stable, or deteriorating? Then provide the supporting data. Managers need to understand trend direction and business impact, not individual NCR details. Use charts and tables; minimize narrative.

### Template

**QUALITY MANAGEMENT REVIEW — {{review_period}}**

**Prepared By:** {{quality_manager}}
**Date:** {{date}}

**Executive Summary:**
{{executive_summary}} (2-3 sentences: overall quality trend, most significant event, key action needed)

**Key Performance Indicators:**

| Metric | Target | Prior Period | Current Period | Trend |
|---|---|---|---|---|
| Internal defect rate (PPM) | < 1,000 | {{prior_ppm}} | {{current_ppm}} | ↑ ↓ → |
| Customer complaint rate | < 50/1M units | {{prior_complaints}} | {{current_complaints}} | ↑ ↓ → |
| Supplier PPM (incoming) | < 500 | {{prior_supplier_ppm}} | {{current_supplier_ppm}} | ↑ ↓ → |
| NCR closure time (median days) | < 15 | {{prior_ncr_cycle}} | {{current_ncr_cycle}} | ↑ ↓ → |
| CAPA on-time closure rate | > 90% | {{prior_capa_otc}} | {{current_capa_otc}} | ↑ ↓ → |
| Cost of quality (% revenue) | < 3% | {{prior_coq}} | {{current_coq}} | ↑ ↓ → |

**Significant Quality Events:**
1. {{event_1}}
2. {{event_2}}

**CAPA Status:**

| Status | Count |
|---|---|
| Open — On Track | {{on_track}} |
| Open — Overdue | {{overdue}} |
| Closed This Period | {{closed}} |
| Effectiveness Verified | {{verified}} |

**Top Suppliers by PPM (worst 5):**

| Supplier | PPM | Trend | Current Escalation Level |
|---|---|---|---|
| {{supplier_1}} | {{ppm_1}} | ↑ ↓ → | {{level_1}} |
| {{supplier_2}} | {{ppm_2}} | ↑ ↓ → | {{level_2}} |

**Cost of Quality Breakdown:**

| Category | Amount | % of Revenue |
|---|---|---|
| Prevention | {{prevention_cost}} | {{prevention_pct}} |
| Appraisal | {{appraisal_cost}} | {{appraisal_pct}} |
| Internal Failure | {{internal_failure_cost}} | {{internal_pct}} |
| External Failure | {{external_failure_cost}} | {{external_pct}} |
| **Total COQ** | **{{total_coq}}** | **{{total_coq_pct}}** |

**Actions Required from Management:**
1. {{action_request_1}} (e.g., "Approve capital expenditure for automated inspection system — ROI analysis attached")
2. {{action_request_2}} (e.g., "Decision needed on Supplier X escalation to Level 3 / alternate source qualification")

---

## 11. Regulatory Agency Response (FDA Form 483)

### When to Use
- Formal response to FDA Form 483 observations
- Due within 15 business days of receiving the 483
- This is a critical document — it becomes part of the public FDA inspection record

### Tone Guidance
Respectful, thorough, and accountable. Acknowledge each observation. Do not argue, minimize, or blame individuals. Demonstrate that you understand the intent of the regulations, not just the words. FDA reviewers specifically evaluate whether your response addresses the systemic issue, not just the specific observation.

### What NOT to Say
- "We disagree with this observation" — address it even if you disagree
- "This was an isolated incident" — FDA explicitly looks for systemic issues
- "Employee has been terminated" — this is punitive, not corrective; FDA wants system fixes
- "We will address this" without specific actions, dates, and responsible parties

### Template

**[Company Letterhead]**

{{date}}

{{fda_district_director_name}}
Director, {{fda_district_office}}
Food and Drug Administration
{{fda_address}}

**Re: Response to FDA Form 483 Inspectional Observations**
**Establishment:** {{facility_name_address}}
**FEI Number:** {{fei_number}}
**Inspection Dates:** {{inspection_dates}}
**Investigator:** {{investigator_name}}

Dear {{fda_district_director_name}},

{{our_company}} appreciates the opportunity to respond to the observations identified during the FDA inspection of our {{facility_name}} facility conducted {{inspection_dates}}. We take these observations seriously and have initiated corrective actions as described below.

---

**Observation {{obs_number}}:**
"{{verbatim_483_observation}}"

**Response:**

**Acknowledgment:**
{{acknowledgment}} (e.g., "We acknowledge that our procedure QP-4401 did not adequately address...")

**Investigation:**
{{investigation_summary}} (What we investigated, what we found, root cause)

**Corrective Action:**

| Action | Description | Responsible | Target Date | Status |
|---|---|---|---|---|
| 1 | {{action_1_description}} | {{responsible_1}} | {{date_1}} | {{status_1}} |
| 2 | {{action_2_description}} | {{responsible_2}} | {{date_2}} | {{status_2}} |

**Scope Extension:**
{{scope_extension}} (e.g., "We reviewed all similar procedures across our facility and identified two additional areas where the same gap existed. These have been corrected as part of actions 3 and 4 above.")

**Effectiveness Verification:**
{{effectiveness_plan}} (e.g., "We will monitor the effectiveness of these corrective actions over a 90-day period by tracking [specific metric]. Evidence of effectiveness will be available for review upon request.")

**Evidence Attached:** {{list_of_evidence}}

---

[Repeat for each observation]

---

We are committed to maintaining full compliance with 21 CFR Part 820 and to the continuous improvement of our quality management system. We welcome the opportunity to discuss these responses or to provide additional information.

Sincerely,

{{signatory_name}}
{{signatory_title}}
{{our_company}}
{{contact_information}}

Enclosures: {{list_of_enclosures}}
