# Decision Frameworks — Quality & Non-Conformance Management

This reference provides the detailed decision logic, MRB processes, RCA methodology selection,
CAPA lifecycle management, SPC interpretation workflows, inspection level determination,
supplier quality escalation, and cost of quality calculation models for regulated manufacturing
quality engineering.

All thresholds, regulatory references, and process expectations reflect quality engineering
practice across FDA 21 CFR 820, IATF 16949, AS9100, and ISO 13485 environments.

---

## 1. NCR Disposition Decision Trees

### 1.1 Universal Disposition Flow

Every non-conformance, regardless of regulatory environment, begins with this decision sequence.
The flow terminates at the first applicable disposition; do not skip levels.

```
START: Non-conformance identified and documented
  │
  ├─ Is the part safety-critical or regulatory-controlled?
  │   ├─ YES → Can it be reworked to FULL conformance?
  │   │         ├─ YES → REWORK with approved procedure + 100% re-inspection
  │   │         └─ NO  → SCRAP (no use-as-is permitted without formal risk assessment
  │   │                   AND regulatory/customer approval)
  │   └─ NO  → Continue
  │
  ├─ Does the non-conformance affect form, fit, or function?
  │   ├─ YES → Can it be reworked to full conformance?
  │   │         ├─ YES → Is rework cost < 60% of replacement cost?
  │   │         │         ├─ YES → REWORK
  │   │         │         └─ NO  → SCRAP (rework is not economical)
  │   │         └─ NO  → Can it be repaired to acceptable function?
  │   │                   ├─ YES → REPAIR with engineering concession + customer
  │   │                   │         approval (if required by contract/standard)
  │   │                   └─ NO  → SCRAP
  │   └─ NO  → Continue
  │
  ├─ Is the non-conformance cosmetic only?
  │   ├─ YES → Does customer spec address cosmetic requirements?
  │   │         ├─ YES → Does the part meet customer cosmetic spec?
  │   │         │         ├─ YES → USE-AS-IS with documentation
  │   │         │         └─ NO  → Customer concession required → If granted: USE-AS-IS
  │   │         │                                                → If denied: REWORK or SCRAP
  │   │         └─ NO  → USE-AS-IS with engineering sign-off
  │   └─ NO  → Continue
  │
  ├─ Is this a dimensional non-conformance within material review authority?
  │   ├─ YES → Engineering analysis: does the dimension affect assembly or performance?
  │   │         ├─ YES → REWORK or SCRAP (depending on feasibility)
  │   │         └─ NO  → USE-AS-IS with documented engineering justification
  │   └─ NO  → Continue
  │
  └─ Is this a supplier-caused non-conformance?
      ├─ YES → Is the material needed immediately for production?
      │         ├─ YES → Sort/rework at supplier's cost + USE acceptable units
      │         │         + SCAR to supplier + debit memo for sort/rework cost
      │         └─ NO  → RETURN TO VENDOR with SCAR + debit memo or replacement PO
      └─ NO  → Evaluate per the functional impact path above
```

### 1.2 FDA-Regulated Environment (21 CFR 820 / ISO 13485) Specific Logic

Medical device non-conformances carry additional requirements:

**Pre-Market (Design/Development):**
- Non-conformances during design verification/validation must be documented in the Design History File (DHF)
- Disposition must consider risk per ISO 14971 — severity and probability of harm to the patient
- Use-as-is is rarely acceptable for a design non-conformance; it implies the design intent is wrong
- CAPA is almost always required to prevent recurrence in production

**Post-Market (Production/Field):**
- Non-conformances that could affect device safety or performance require evaluation for field action (recall, correction, removal) per 21 CFR 806
- The threshold is low: if there is any reasonable possibility of harm, evaluate formally
- Document the decision NOT to file a field action as rigorously as the decision to file one
- Complaint-related non-conformances must be linked to complaint records per 820.198
- MDR (Medical Device Report) obligations: death or serious injury must be reported to FDA within 30 calendar days (5 days for events requiring remedial action)

**Disposition Authority Matrix:**

| Disposition | Who Can Authorize | Additional Requirements |
|---|---|---|
| Scrap | Quality Engineer or above | Documented with lot traceability |
| Rework | Quality Engineer + Manufacturing Engineering | Approved rework procedure; re-inspect to original spec |
| Repair | MRB (Quality + Engineering + Manufacturing) | Risk assessment per ISO 14971; update DHF if design-related |
| Use-As-Is | MRB + Design Authority | Risk assessment; documented justification; regulatory impact evaluation |
| RTV | Quality Engineer + Procurement | SCAR required; supplier re-qualification if repeated |

### 1.3 Automotive Environment (IATF 16949) Specific Logic

**Customer Notification Requirements:**
- Any non-conformance on product shipped to the customer: notification within 24 hours of discovery
- Any process change affecting fit, form, function, or performance: PPAP resubmission required
- Use-as-is disposition: typically requires a formal deviation request to the customer through their supplier portal (e.g., GM's GQTS, Ford's MQAS, Stellantis' SQP)
- Customer may accept, reject, or accept with conditions (reduced quantity, time-limited deviation)

**Control Plan Integration:**
- When a non-conformance reveals a gap in the control plan, the control plan must be updated as part of the corrective action
- Special characteristics (safety/significant characteristics identified with shield or diamond symbols) have zero tolerance for non-conformance: 100% containment and immediate CAPA
- The reaction plan column of the control plan specifies the predetermined response — follow it first, then investigate

**Controlled Shipping Levels:**
- **CS-1 (Internal Controlled Shipping):** Supplier adds an additional inspection/sort step beyond normal controls and submits inspection data with each shipment
- **CS-2 (External Controlled Shipping):** Third-party inspection at supplier's facility, at supplier's cost, with direct reporting to customer quality
- CS-1 and CS-2 are distinct from the general supplier escalation ladder — they are customer-mandated containment measures, not supplier-initiated improvements

### 1.4 Aerospace Environment (AS9100) Specific Logic

**Customer/Authority Approval:**
- Use-as-is and repair dispositions ALWAYS require customer approval per AS9100 §8.7.1
- If the customer is a prime contractor working under a government contract, the government quality representative (DCMA or equivalent) may also need to approve
- Non-conformances on parts with key characteristics require notification to the design authority
- First Article Inspection (FAI) per AS9102 becomes invalid if a non-conformance indicates the process has changed from the qualified state — partial or full FAI resubmission may be required

**Counterfeit Part Prevention:**
- If a non-conformance raises suspicion of counterfeit material (unexpected material composition, incorrect markings, suspect documentation), invoke the counterfeit prevention procedure per AS9100 §8.1.4
- Quarantine the suspect material in a separate area from other MRB material
- Report to GIDEP (Government-Industry Data Exchange Program) if counterfeit is confirmed
- Do not return suspect counterfeit material to the supplier — it must be quarantined and may need to be retained as evidence

**Traceability Requirements:**
- Aerospace non-conformances must maintain lot, batch, heat, and serial number traceability throughout the disposition process
- Scrap disposition must include documented destruction of serialized parts to prevent re-entry into the supply chain
- OASIS database updates may be required for supplier quality events

---

## 2. Root Cause Analysis Methodology Selection Guide

### 2.1 Selection Decision Matrix

| Factor | 5 Whys | Ishikawa + 5 Whys | 8D | Fault Tree Analysis |
|---|---|---|---|---|
| **Best for** | Single-event, linear cause chain | Multi-factor, need to explore categories | Recurring issue, team-based resolution | Safety-critical, quantitative risk needed |
| **Effort (hours)** | 1–2 | 4–8 | 20–40 (across all D-steps) | 40–80 |
| **Team size** | 1–2 people | 2–4 people | 5–8 cross-functional | 3–6 subject matter experts |
| **When required** | Internal process investigations | Complex non-conformances | Customer mandate (automotive OEMs) | Aerospace product safety; medical device risk analysis |
| **Limitation** | Assumes single linear chain | Still qualitative; hypothesis-driven | Heavyweight for simple issues | Resource-intensive; requires failure rate data for quantitative mode |
| **Output** | Root cause statement | Categorized cause hypotheses with verified root cause | Full 8D report (D0-D8) | Fault tree diagram with probability assignments |

### 2.2 The 5 Whys: When It Works and When It Doesn't

**5 Whys works well when:**
- The failure is a single event with a clear before/after state change
- Each "why" can be verified with data (measurement, observation, record review)
- The causal chain does not branch — there is a single dominant cause
- The investigation can reach a systemic cause (process, system, or design issue) within 5 iterations

**5 Whys fails when:**
- Multiple independent causes interact to produce the failure (combinatorial causes)
- The analyst stops at "human error" or "operator mistake" — this is never a root cause
- Each "why" is answered with opinion rather than verified data
- The analysis becomes circular (Why A? Because B. Why B? Because A.)
- Organizational pressure drives toward a "convenient" root cause that avoids systemic change

**Verification protocol for each "why" level:**

| Why Level | Question | Acceptable Evidence | Unacceptable Evidence |
|---|---|---|---|
| Why 1 (Event) | What physically happened? | Measurement data, photographs, inspection records | "The part was bad" |
| Why 2 (Condition) | What condition allowed it? | Process parameter logs, tool condition records | "The operator didn't check" |
| Why 3 (Process) | Why did the process permit this condition? | Work instruction review, process FMEA gap | "It's always been done this way" |
| Why 4 (System) | Why didn't the system prevent the process gap? | System audit evidence, training records, control plan review | "We need better training" |
| Why 5 (Management) | Why was the system gap undetected? | Management review records, resource allocation evidence, risk assessment gaps | "Management doesn't care about quality" |

### 2.3 Ishikawa Diagram: 6M Framework Deep Dive

For each M category, specific investigation questions that separate thorough analysis from checkbox exercises:

**Man (Personnel):**
- Was the operator trained AND certified on this specific operation?
- When was the most recent certification renewal?
- Was this the operator's normal workstation or were they cross-trained/temporary?
- Was the shift staffing at normal levels or was this during overtime/short-staffing?
- Check operator error rate data — is this an isolated event or a pattern for this individual?

**Machine (Equipment):**
- When was the last preventive maintenance performed (date AND what was done)?
- Is the machine within its calibration cycle for all measuring functions?
- Were any alarms, warnings, or parameter drifts logged before the event?
- Has the machine been modified, repaired, or had a tooling change recently?
- Check the machine's historical Cpk trend — has capability been declining?

**Material:**
- Is this a new lot of raw material? When did the lot change?
- Were incoming inspection results within normal range, or marginal-pass?
- Does the material certificate match what was physically received (heat number, mill, composition)?
- Has the material been stored correctly (temperature, humidity, shelf life, FIFO rotation)?
- Were any material substitutions or equivalents authorized?

**Method (Process):**
- Is the work instruction current revision? When was it last revised?
- Does the operator actually follow the work instruction as written (observation, not assumption)?
- Were any process parameters changed recently (speeds, feeds, temperatures, pressures, cure times)?
- Was an engineering change order (ECO) recently implemented on this part or process?
- Is there a gap between the documented method and the actual method (tribal knowledge)?

**Measurement:**
- Was the measurement system used for this inspection validated (Gauge R&R)?
- Is the gauge within calibration? Check both certificate and physical condition.
- Was the correct measurement method used (per the control plan or inspection instruction)?
- Did the measurement environment (temperature, vibration, lighting) affect the result?
- For attribute inspections (go/no-go, visual): what is the inspection effectiveness rate?

**Mother Nature (Environment):**
- Were ambient conditions (temperature, humidity) within process specification?
- Were there any environmental events (power fluctuation, compressed air pressure drop, vibration from construction)?
- Is there a shift-to-shift or day-to-day correlation in the data (temperature cycling, humidity changes)?
- Was the factory HVAC system operating normally?
- For cleanroom or controlled environment processes: were environmental monitoring logs within specification?

### 2.4 8D Methodology: Detailed Gate Requirements

Each D-step has specific outputs required before advancing. Skipping gates creates 8Ds that look complete but don't actually solve the problem.

| D-Step | Name | Required Output | Common Failure Mode |
|---|---|---|---|
| D0 | Symptom & Emergency Response | Emergency response actions taken; containment effectiveness confirmed | Confusing containment with corrective action |
| D1 | Team Formation | Cross-functional team with defined roles; includes process owner and subject matter expert | Team is all quality, no manufacturing or engineering |
| D2 | Problem Definition | IS/IS NOT analysis completed; problem quantified with data (defect rate, PPM, Cpk shift, complaint count) | Problem statement is too broad ("quality issues") or just restates the symptom |
| D3 | Interim Containment | Actions to protect customer while investigation proceeds; effectiveness verified (inspection data post-containment) | Containment is "100% inspection" without verifying inspection effectiveness through known-defective challenge |
| D4 | Root Cause | Root cause(s) verified through data analysis or designed experiment; escapes the "human error" trap | Root cause = restatement of problem; no verification data; stops at symptoms |
| D5 | Corrective Action Selection | Actions address verified root cause; mistake-proofing (poka-yoke) preferred over procedural controls | Corrective action = "retrain operators" or "add inspection step" (both are weak) |
| D6 | Implementation | Actions implemented with documented evidence (updated WI, installed fixture, modified process); baseline performance established | Implementation date = planned date, not actual; no evidence of implementation |
| D7 | Prevention | Systemic actions to prevent recurrence across similar processes/products; lessons learned documented; FMEA updated | D7 is copy-paste of D5; no horizontal deployment; FMEA not updated |
| D8 | Recognition | Team acknowledged; 8D closed with effectiveness data | Closed without effectiveness data; team not recognized |

### 2.5 Fault Tree Analysis: Construction Methodology

**Step 1: Define the Top Event**
- State the undesired event in specific, measurable terms
- Example: "Shaft diameter exceeds USL of 25.05mm on finished machined part"
- Not: "Bad parts" or "Quality problem"

**Step 2: Identify Immediate Causes (Level 1)**
- What must be true for the top event to occur?
- Use AND gates (all causes must be present) and OR gates (any single cause is sufficient)
- Example: "Shaft OD too large" can be caused by (OR gate): tool wear, incorrect tool offset, material oversize, thermal expansion, fixture misalignment

**Step 3: Decompose Each Cause (Levels 2–N)**
- For each Level 1 cause, ask: what causes this?
- Continue decomposing until you reach basic events (events with known failure rates or that cannot be further decomposed)
- Example: "Tool wear" caused by (AND gate): extended run time + inadequate tool change interval + no in-process SPC alert

**Step 4: Quantify (when data is available)**
- Assign probability values to basic events using historical data, MTBF data, or engineering estimates
- Calculate top event probability through the gate logic
- Identify the minimal cut sets (smallest combinations of basic events that cause the top event)
- Focus corrective actions on the highest-probability cut sets

---

## 3. CAPA Writing and Verification Framework

### 3.1 CAPA Initiation Criteria

**Always initiate CAPA for:**
- Repeat non-conformance: same failure mode occurring 3+ times in 12 months
- Customer complaint involving product performance, safety, or regulatory compliance
- External audit finding (FDA, notified body, customer, registrar)
- Field failure or product return
- Trend signal: SPC control chart out-of-control pattern (not isolated point)
- Regulatory requirement change affecting existing products/processes
- Post-market surveillance data indicating potential safety concern

**Consider CAPA (judgment call) for:**
- Repeat non-conformance: same failure mode 2 times in 12 months
- Internal audit finding of moderate significance
- Supplier non-conformance with systemic indicators
- Near-miss event (non-conformance caught before reaching customer)
- Process deviation from validated parameters without product impact

**Do NOT initiate CAPA for:**
- Isolated non-conformance with clear, non-recurring cause (one-off tool breakage, power outage)
- Non-conformance fully addressed by NCR disposition with no systemic implication
- Customer cosmetic preference that doesn't violate any specification
- Minor documentation errors caught and corrected within the same day

### 3.2 CAPA Action Hierarchy (Effectiveness Ranking)

Corrective actions are not created equal. Rank by effectiveness and default to the highest feasible level:

| Rank | Control Type | Example | Effectiveness | Typical Cost |
|---|---|---|---|---|
| 1 | **Elimination** | Redesign to remove the failure mode entirely | ~100% | High (design change, tooling) |
| 2 | **Substitution** | Change material, supplier, or process to one that cannot produce the failure | ~95% | Medium-High |
| 3 | **Engineering Controls (Poka-Yoke)** | Fixture that physically prevents incorrect assembly; sensor that stops machine on out-of-spec condition | ~90% | Medium |
| 4 | **Detection Controls** | Automated inspection (vision system, laser gauge) that 100% inspects and auto-rejects | ~85% | Medium |
| 5 | **Administrative Controls** | Updated work instruction, revised procedure, checklist | ~50-60% | Low |
| 6 | **Training** | Operator retraining on existing procedure | ~30-40% | Low |

If your corrective action is ranked 5 or 6 and a rank 1-4 action is feasible, the CAPA will likely be challenged by auditors. Training alone is never an adequate corrective action for a significant non-conformance.

### 3.3 CAPA Effectiveness Verification Protocol

**Phase 1: Implementation Verification (within 2 weeks of target date)**

| Evidence Required | What to Check | Acceptable | Not Acceptable |
|---|---|---|---|
| Document revision | Was the WI/procedure updated to reflect the change? | Revision with effective date and training records | "Will be updated in next revision" |
| Physical verification | Is the fixture/tool/sensor installed and operational? | Photograph + validation record | Purchase order placed but not installed |
| Training completion | Were affected personnel trained? | Signed training records with competency assessment | Email sent to team |
| System update | Were QMS documents, FMEA, control plan updated? | Updated documents with revision and approval | "Will update during next review" |

**Phase 2: Effectiveness Validation (90-day monitoring period)**

| Metric | Calculation | Pass Criteria | Fail Criteria |
|---|---|---|---|
| Recurrence rate | Count of same failure mode in monitoring period | Zero recurrences | Any recurrence |
| Related failure rate | Count of related failure modes in same process | No increase from baseline | Increase suggests incomplete root cause |
| Process capability | Cpk or Ppk for the affected characteristic | Cpk ≥ 1.33 (or target value) | Cpk below pre-CAPA level |
| Customer feedback | Complaints related to the addressed failure mode | Zero related complaints | Any related complaint |

**Phase 3: Closure Decision**

| Condition | Decision |
|---|---|
| Phase 1 complete + Phase 2 pass criteria met | Close CAPA |
| Phase 1 complete + Phase 2 shows improvement but not full elimination | Extend monitoring period by 60 days; if still improving, close with condition |
| Phase 1 complete + Phase 2 shows no improvement | Reopen CAPA; root cause was incorrect or action insufficient |
| Phase 1 incomplete (action not implemented) | CAPA remains open; escalate for resource allocation |
| Recurrence during monitoring | Reopen CAPA; do NOT close and open new CAPA for same issue |

### 3.4 CAPA Timeliness Standards

| CAPA Phase | Target Timeline | Regulatory Expectation |
|---|---|---|
| Initiation and assignment | Within 5 business days of trigger | FDA: "timely" — typically within 30 days of awareness |
| Investigation and root cause | Within 30 calendar days | IATF 16949: per customer timeline (often 10-day initial response) |
| Corrective action plan | Within 45 calendar days | AS9100: per contractual agreement |
| Implementation | Within 90 calendar days | Varies by complexity; document delays with justification |
| Effectiveness verification start | Immediately after implementation | Must be defined at initiation |
| Effectiveness verification completion | 90 days after implementation | FDA: must demonstrate effectiveness, not just implementation |
| CAPA closure | Within 180 calendar days of initiation (total) | FDA warning letters cite CAPAs open > 1 year as systemic failure |

---

## 4. SPC Interpretation Decision Logic

### 4.1 Control Chart Selection Flowchart

```
START: What type of data are you charting?
  │
  ├─ CONTINUOUS (variable) data — measurements in units (mm, kg, °C, psi)
  │   ├─ Are you taking subgroups (multiple measurements per sampling event)?
  │   │   ├─ YES → What is the subgroup size (n)?
  │   │   │         ├─ n = 2 to 9  → X-bar / R chart
  │   │   │         ├─ n = 10 to 25 → X-bar / S chart
  │   │   │         └─ n > 25 → X-bar / S chart (consider reducing subgroup size)
  │   │   └─ NO (n=1, individual readings) → Individuals / Moving Range (I-MR) chart
  │   │         Use when: batch process, destructive testing, slow process,
  │   │         or when each unit is unique
  │   └─ (Verify data normality assumption for variable charts — I-MR is sensitive
  │       to non-normality; consider transformation or use nonparametric alternatives)
  │
  └─ ATTRIBUTE (discrete) data — counts or proportions
      ├─ Are you counting DEFECTIVE ITEMS (units that pass or fail)?
      │   ├─ YES → Is the sample size constant?
      │   │         ├─ YES → np-chart (count of defectives, fixed sample)
      │   │         └─ NO  → p-chart (proportion defective, variable sample)
      │   └─ NO  → You're counting DEFECTS (multiple defects possible per unit)
      │             ├─ Is the inspection area/opportunity constant?
      │             │   ├─ YES → c-chart (count of defects per unit, fixed area)
      │             │   └─ NO  → u-chart (defects per unit, variable area)
      │             └─ (Verify Poisson assumption for c/u charts)
      └─ (Attribute charts require larger sample sizes than variable charts for
          equivalent sensitivity — minimum ~50 for p/np, ~25 for c/u)
```

### 4.2 Out-of-Control Response Protocol

When a control chart signals an out-of-control condition, follow this response based on the specific signal:

**Rule 1: Point beyond 3σ control limit**

| Response Level | Action | Timeline |
|---|---|---|
| Immediate | Stop process if product is being produced; quarantine output since last known good point | Within minutes |
| Investigation | Identify the assignable cause — what changed? Check 6M categories systematically | Within 4 hours |
| Containment | Sort/inspect product produced during the out-of-control period | Within 1 shift |
| Correction | Address the assignable cause and restart production with increased monitoring | Before next production run |
| Documentation | NCR if product was affected; update control chart with annotation | Within 24 hours |

**Rule 2: Nine consecutive points on one side of the center line (run)**

| Response Level | Action | Timeline |
|---|---|---|
| Investigation | Process mean has likely shifted. Check for: tool wear progression, material lot change, environmental drift, measurement calibration shift | Within 1 shift |
| Adjustment | If assignable cause found: correct. If no assignable cause found and process is still within spec, continue monitoring but increase sampling frequency | Within 24 hours |
| Recalculation | If the shift is intentional (process improvement) or represents a new process level, recalculate control limits with new data | After 25+ subgroups at new level |

**Rule 3: Six consecutive points steadily increasing or decreasing (trend)**

| Response Level | Action | Timeline |
|---|---|---|
| Investigation | Process is drifting. Most common causes: tool wear, chemical depletion, thermal drift, filter degradation | Within 1 shift |
| Projection | At the current drift rate, when will the process exceed the specification limit? This determines urgency | Immediate calculation |
| Preemptive action | Adjust the process (tool change, chemical replenishment) BEFORE it reaches the spec limit | Before projected spec limit crossing |

**Rule 4: Fourteen consecutive points alternating up and down (stratification/mixing)**

| Response Level | Action | Timeline |
|---|---|---|
| Investigation | This pattern indicates over-control (tampering), two alternating streams (e.g., two spindles, two cavities), or systematic measurement error | Within 24 hours |
| Verification | Check if the subgroup data is being collected from multiple sources that should be charted separately | Within 48 hours |
| Stratification | If data is from multiple streams, create separate charts for each stream | Within 1 week |

### 4.3 Capability Index Interpretation

| Cpk Value | Interpretation | Action Required |
|---|---|---|
| Cpk ≥ 2.00 | Six Sigma capable; consider reducing inspection frequency | Maintain controls; candidate for reduced inspection or skip-lot |
| 1.67 ≤ Cpk < 2.00 | Highly capable; exceeds most customer requirements | Standard monitoring; meets IATF 16949 requirements for new processes |
| 1.33 ≤ Cpk < 1.67 | Capable; meets most industry standards | Standard SPC monitoring; meets IATF 16949 minimum for production |
| 1.00 ≤ Cpk < 1.33 | Marginally capable; producing some defects | Increase monitoring frequency; initiate process improvement; customer notification may be required |
| 0.67 ≤ Cpk < 1.00 | Not capable; significant defect production | 100% inspection until process is improved; CAPA required; customer notification required |
| Cpk < 0.67 | Severely incapable | Stop production; sort all WIP and finished goods; engineering review of process and specification |

**Cp vs. Cpk Interpretation:**

| Condition | Meaning | Action |
|---|---|---|
| Cp high, Cpk high | Process is both capable and centered | Optimal state; maintain |
| Cp high, Cpk low | Process has low variation but is not centered on the target | Adjust the process mean; do NOT reduce variation (it's already good) |
| Cp low, Cpk low | Process has too much variation, possibly also off-center | Reduce variation first (fundamental process improvement), then center |
| Cp low, Cpk ≈ Cp | Process has too much variation but is centered | Reduce variation; centering is not the issue |

**Pp/Ppk vs. Cp/Cpk:**

| Index | Uses | Represents | When to Use |
|---|---|---|---|
| Cp/Cpk | Within-subgroup variation (σ_within) | Short-term or "potential" capability | Evaluating process potential when in statistical control |
| Pp/Ppk | Overall variation (σ_overall) including between-subgroup shifts | Long-term or "actual" performance | Evaluating what the customer actually receives over time |
| Pp/Ppk < Cp/Cpk (common) | Process mean is shifting between subgroups | Between-subgroup variation is significant | Investigate what's causing the mean to shift between subgroups |
| Pp/Ppk ≈ Cp/Cpk | Process is stable over time | Minimal between-subgroup variation | Process is well-controlled; long-term performance matches potential |

---

## 5. Inspection Level Determination

### 5.1 Incoming Inspection Level Decision Matrix

| Factor | Points |
|---|---|
| **Supplier History** | |
| New supplier (< 5 lots received) | 5 |
| Supplier on probation/watch | 5 |
| Qualified supplier with PPM 1,000-5,000 | 3 |
| Qualified supplier with PPM 500-1,000 | 2 |
| Qualified supplier with PPM < 500 | 1 |
| Preferred supplier with PPM < 100 | 0 |
| **Part Criticality** | |
| Safety-critical characteristic | 5 |
| Key characteristic (fit/function) | 3 |
| Standard characteristic | 1 |
| Cosmetic only | 0 |
| **Regulatory Requirement** | |
| FDA/medical device requiring incoming inspection | 5 |
| Aerospace with special process (NADCAP) | 4 |
| Automotive with customer-designated special characteristic | 3 |
| Standard ISO 9001 environment | 1 |
| **Recent Quality History (last 6 months)** | |
| NCR issued against this part/supplier combination | +3 |
| Customer complaint traced to this component | +4 |
| SCAR currently open against this supplier | +3 |
| No quality issues | 0 |

**Inspection Level Assignment:**

| Total Points | Inspection Level | Typical Approach |
|---|---|---|
| 0–3 | Reduced / Skip-Lot | CoC review + skip-lot verification (every 3rd or 5th lot) |
| 4–7 | Normal (AQL Level II) | Standard AQL sampling per ANSI/ASQ Z1.4 |
| 8–11 | Tightened (AQL Level III) | Tightened sampling or increased sample size |
| 12+ | 100% / Full Inspection | 100% inspection of critical characteristics |

### 5.2 ANSI/ASQ Z1.4 Quick Reference

**Sample Size Code Letters (Normal Inspection, General Level II):**

| Lot Size | Code Letter | Sample Size (AQL 1.0) |
|---|---|---|
| 2–8 | A | 2 (Ac=0, Re=1) |
| 9–15 | B | 3 (Ac=0, Re=1) |
| 16–25 | C | 5 (Ac=0, Re=1) |
| 26–50 | D | 8 (Ac=0, Re=1) |
| 51–90 | E | 13 (Ac=1, Re=2) |
| 91–150 | F | 20 (Ac=1, Re=2) |
| 151–280 | G | 32 (Ac=2, Re=3) |
| 281–500 | H | 50 (Ac=3, Re=4) |
| 501–1,200 | J | 80 (Ac=5, Re=6) |
| 1,201–3,200 | K | 125 (Ac=7, Re=8) |
| 3,201–10,000 | L | 200 (Ac=10, Re=11) |
| 10,001–35,000 | M | 315 (Ac=14, Re=15) |
| 35,001–150,000 | N | 500 (Ac=21, Re=22) |

**Switching Rules:**

| Current Level | Switch Condition | Switch To |
|---|---|---|
| Normal | 2 of 5 consecutive lots rejected | Tightened |
| Normal | 10 consecutive lots accepted AND production at steady rate AND approved by responsible authority | Reduced |
| Tightened | 5 consecutive lots accepted | Normal |
| Tightened | 10 consecutive lots not accepted | Discontinue inspection; require supplier corrective action |
| Reduced | 1 lot rejected | Normal |
| Reduced | Production irregular or other conditions warrant | Normal |

### 5.3 Skip-Lot Qualification Requirements

**Qualification Criteria (all must be met):**
1. Supplier is on the Approved Supplier List with "preferred" or "qualified" status
2. Minimum 10 consecutive lots accepted at normal inspection level
3. Supplier's process capability (Cpk) for critical characteristics ≥ 1.33, verified by supplier data AND incoming inspection data
4. No open SCARs against the supplier for this part number
5. Supplier has a certified quality management system (ISO 9001 minimum; industry-specific certification preferred)
6. Written agreement documenting skip-lot terms, reversion criteria, and data submission requirements

**Skip-Lot Frequencies:**

| Qualification Level | Inspection Frequency | Reversion Trigger |
|---|---|---|
| Skip-Lot 1 | Every 2nd lot | 1 lot rejection |
| Skip-Lot 2 | Every 3rd lot | 1 lot rejection or supplier Cpk drops below 1.33 |
| Skip-Lot 3 | Every 5th lot | 1 lot rejection, Cpk concern, or supplier quality system change |
| CoC Reliance | CoC review only; periodic verification (annual or per-lot-change) | Any NCR, customer complaint, or audit finding |

---

## 6. Supplier Quality Escalation Ladder

### 6.1 Detailed Escalation Process

**Level 0: Normal Operations**
- Supplier meets scorecard expectations (PPM < threshold, OTD > threshold, SCAR closure on time)
- Standard incoming inspection level
- Quarterly scorecard review
- Annual audit (if risk-based schedule warrants)

**Level 1: SCAR Issued**
- **Trigger:** Single significant non-conformance (> $5,000 impact or safety/regulatory concern) OR 3+ minor non-conformances on the same part in 90 days
- **Actions:**
  - Formal SCAR issued with 8D or equivalent RCA requirement
  - Supplier has 10 business days for initial response (containment + preliminary root cause)
  - Supplier has 30 calendar days for full corrective action plan with implementation timeline
  - Quality engineering review of SCAR response for adequacy
  - Increase incoming inspection level for the affected part number
- **Exit criteria:** SCAR accepted and closed with verified effectiveness (90-day monitoring)

**Level 2: Supplier on Watch / Probation**
- **Trigger:** SCAR not responded to within timeline OR corrective action not effective (recurrence during monitoring) OR scorecard falls below minimum threshold for 2 consecutive quarters
- **Actions:**
  - Supplier notified of probation status in writing (Quality Manager or Director level)
  - Procurement notified; new business hold (no new part numbers awarded)
  - Increase inspection level for ALL part numbers from this supplier (not just affected part)
  - Monthly performance review calls with supplier quality management
  - Supplier must submit a comprehensive improvement plan within 15 business days
  - Consider on-site quality audit focused on the specific failure mode
- **Exit criteria:** Improvement plan accepted + 2 consecutive quarters meeting scorecard minimum + no new SCARs

**Level 3: Controlled Shipping**
- **Trigger:** Continued failures during watch period OR critical quality escape that reaches customer
- **Actions:**
  - Controlled Shipping Level 1 (CS-1): Supplier adds additional sort/inspection step with data submitted per shipment
  - If CS-1 ineffective within 60 days: Controlled Shipping Level 2 (CS-2): third-party resident inspector at supplier's facility, at supplier's expense
  - All sort/inspection costs debited to supplier
  - Weekly performance review calls with supplier VP/GM level
  - Begin qualification of alternate source (if not already underway)
- **Exit criteria:** 90 consecutive days of zero non-conformances under controlled shipping + root cause fully addressed + systemic improvements validated

**Level 4: New Source Qualification / Phase-Out**
- **Trigger:** No sustained improvement under controlled shipping OR supplier unwilling/unable to invest in required improvements
- **Actions:**
  - Formal notification to supplier of intent to transfer business
  - Accelerated alternate supplier qualification (expedite PPAP/FAI/first articles)
  - Reduce business allocation as alternate source ramps up
  - Maintain controlled shipping on remaining volume
  - Ensure last-time-buy quantities cover the transition period
  - Document all quality costs incurred for potential recovery
- **Timeline:** Depends on part complexity and alternate source readiness; typically 3-12 months

**Level 5: ASL Removal**
- **Trigger:** Qualification of alternate source complete OR supplier's quality system failure is fundamental (e.g., data falsification, loss of certification)
- **Actions:**
  - Formal removal from Approved Supplier List
  - Final shipment received and inspected under 100% inspection
  - All supplier-owned tooling at our facility: disposition per contract terms
  - Our tooling at supplier's facility: retrieve per contract terms
  - Close all open SCARs as "supplier removed"
  - Retain supplier quality file for minimum 7 years (regulatory record retention)
  - Update OASIS (aerospace) or relevant industry databases
- **Re-entry:** If supplier applies for re-qualification, treat as a new supplier with full qualification process; require evidence that systemic issues were addressed

### 6.2 Escalation Decision Quick Reference

| Situation | Start at Level | Rationale |
|---|---|---|
| First minor NC from good supplier | Handle via NCR, no escalation | Single event doesn't warrant formal escalation |
| First significant NC from good supplier | Level 1 (SCAR) | Significant impact requires formal root cause |
| Third minor NC in 90 days from same supplier/part | Level 1 (SCAR) | Pattern indicates systemic issue |
| SCAR response inadequate or late | Level 2 (Watch) | Non-responsiveness is itself a quality system failure |
| NC reaches customer | Level 2 minimum; Level 3 if safety-related | Customer impact demands immediate escalation |
| Falsified documentation discovered | Level 4 minimum; Level 5 if confirmed | Trust is broken; containment scope is unknown |
| Sole-source supplier with quality problems | Level 1 with parallel Level 4 actions (qualify alternate) | Business continuity requires measured response; don't threaten what you can't execute |

---

## 7. Cost of Quality Calculation Models

### 7.1 COQ Category Definitions and Tracking

**Prevention Costs (invest to prevent defects):**

| Cost Element | How to Measure | Typical Range (% of revenue) |
|---|---|---|
| Quality planning | Hours × labor rate for quality planning activities | 0.2–0.5% |
| Process validation/qualification | Labor + equipment + materials for IQ/OQ/PQ | 0.3–0.8% |
| Supplier qualification | Audit travel + labor + first article costs | 0.1–0.3% |
| Training (quality-related) | Hours × labor rate + training materials | 0.1–0.3% |
| SPC implementation/maintenance | Software licenses + labor for chart maintenance | 0.1–0.2% |
| Design reviews / FMEA | Hours × labor rate for cross-functional reviews | 0.2–0.5% |
| Poka-yoke development | Design + fabrication + validation of error-proofing | 0.2–0.5% |

**Appraisal Costs (cost of verifying conformance):**

| Cost Element | How to Measure | Typical Range (% of revenue) |
|---|---|---|
| Incoming inspection | Hours × labor rate + gauge costs | 0.3–0.8% |
| In-process inspection | Hours × labor rate (including production wait time) | 0.5–1.5% |
| Final inspection / testing | Hours × labor rate + test equipment depreciation | 0.3–1.0% |
| Calibration program | Service contracts + labor + standards | 0.1–0.3% |
| Audit program (internal + external) | Labor + travel + registration fees | 0.1–0.3% |
| Laboratory testing | Internal lab costs or external lab fees | 0.2–0.5% |

**Internal Failure Costs (defects caught before shipment):**

| Cost Element | How to Measure | Typical Range (% of revenue) |
|---|---|---|
| Scrap | Scrapped material value + processing labor wasted | 1.0–3.0% |
| Rework | Labor + materials for rework operations | 0.5–2.0% |
| Re-inspection | Hours × labor rate for re-inspection after rework | 0.1–0.5% |
| MRB processing | Hours × labor rate for disposition activities | 0.1–0.3% |
| Root cause investigation | Hours × labor rate for RCA team activities | 0.2–0.5% |
| Production delays | Lost production time due to quarantine, investigation | 0.5–2.0% |
| Supplier sort/containment | Third-party sort labor or internal sort labor for supplier-caused NC | 0.1–0.5% |

**External Failure Costs (defects that reach the customer):**

| Cost Element | How to Measure | Typical Range (% of revenue) |
|---|---|---|
| Customer returns / credits | Credit memos + return shipping + restocking labor | 0.5–2.0% |
| Warranty claims | Claim value + processing labor | 0.5–3.0% |
| Field service / repair | Service labor + travel + parts | 0.3–1.5% |
| Customer complaint processing | Hours × labor rate for investigation + response | 0.2–0.5% |
| Recall / field correction | Product replacement + notification + shipping + regulatory | 0.0–5.0% (highly variable) |
| Regulatory action costs | Fines, consent decree compliance, increased inspections | 0.0–10.0% (catastrophic when triggered) |
| Reputation / lost business | Lost revenue from customer defection (estimate) | Difficult to measure; typically 2-10x direct costs |

### 7.2 COQ Business Case Model

**Calculating ROI for Quality Investment:**

```
ROI = (Failure Cost Reduction - Investment Cost) / Investment Cost × 100%

Where:
  Failure Cost Reduction = (Current internal + external failure costs)
                          - (Projected failure costs after investment)
  Investment Cost = Prevention cost increase + appraisal cost change
```

**Rule of Thumb Multipliers:**

| Investment Type | Expected ROI | Payback Period |
|---|---|---|
| Poka-yoke (error-proofing) | 5:1 to 20:1 | 3–6 months |
| SPC implementation | 3:1 to 10:1 | 6–12 months |
| Supplier development program | 2:1 to 8:1 | 12–24 months |
| Process validation improvement | 4:1 to 15:1 | 6–18 months |
| Training program upgrade | 1:1 to 3:1 | 12–24 months |

### 7.3 MRB Decision Process — Economic Model

When disposition is not dictated by safety or regulatory requirements, use economic analysis:

**Rework vs. Scrap Decision:**

```
Rework if: C_rework + C_reinspect < C_replacement × (1 + premium)

Where:
  C_rework = Direct rework labor + materials + machine time
  C_reinspect = Re-inspection labor + any additional testing
  C_replacement = Purchase price or manufacturing cost of replacement unit
  premium = Schedule urgency factor (0% if no urgency, 10-50% if production impact,
            100%+ if customer delivery at risk)
```

**Sort vs. Return Decision (for supplier-caused lots):**

```
Sort if: (C_sort < C_return_freight + C_production_delay) AND (expected yield > 70%)

Where:
  C_sort = Sort labor hours × rate (typically $25-50/hr for manual sort,
           $50-100/hr for dimensional sort)
  C_return_freight = Shipping cost + handling + administrative
  C_production_delay = (Days of delay × daily production value at risk)
  expected yield = Estimated % of lot that will pass sort
                   (use sample data to estimate)
```

**Use-As-Is vs. Sort/Rework Decision (non-safety, non-regulatory):**

```
Use-as-is if: Risk_functional ≤ Acceptable_risk
              AND C_use_as_is < C_sort_or_rework
              AND engineering provides documented justification

Where:
  Risk_functional = P(failure in use) × Impact(failure)
  C_use_as_is = Warranty risk increase (estimated) + documentation cost
  C_sort_or_rework = Direct sort/rework costs + production delay costs
```

---

## 8. MRB Decision Process — Detailed Workflow

### 8.1 MRB Meeting Structure

**Frequency:** Scheduled weekly; ad hoc for urgent dispositions (safety-critical, production-blocking)

**Required Attendees:**
- Quality Engineering (chair, facilitates and documents)
- Design/Product Engineering (functional impact assessment)
- Manufacturing Engineering (reworkability assessment)
- Production/Operations (schedule impact)
- Procurement (supplier-related dispositions, commercial impact)
- Optional: Regulatory Affairs (if regulatory implications), Customer Quality (if customer notification required)

**Standard Agenda:**
1. Review of new NCRs pending disposition (by priority: safety first, then production-blocking, then age)
2. Presentation of data package per NCR (measurements, photographs, process data)
3. Engineering assessment of functional impact
4. Disposition decision with documented rationale
5. Review of aging NCRs (> 15 days without disposition)
6. Review of MRB metrics (volume, cycle time, cost)

### 8.2 MRB Documentation Requirements

Each MRB disposition must include:

| Element | Purpose | Who Provides |
|---|---|---|
| NCR number and description | Identification and traceability | Quality Engineering |
| Part number, revision, quantity | Scope of disposition | Quality Engineering |
| Specification violated (clause, dimension, requirement) | Clarity on what's nonconforming | Quality Engineering |
| Measurement data (actuals vs. tolerances) | Evidence base for disposition | Quality Engineering / Inspection |
| Photographs (if applicable) | Visual evidence | Quality Engineering / Inspection |
| Engineering justification (for use-as-is or repair) | Technical rationale for accepting deviation | Design/Product Engineering |
| Risk assessment (for safety-related items) | Formal risk evaluation | Design/Product Engineering + Quality |
| Customer approval reference (if required) | Compliance with contract/standard | Quality Engineering |
| Disposition decision | The decision itself | MRB consensus |
| Signatures of all MRB members | Accountability and traceability | All attendees |
| Cost impact | Financial tracking for COQ | Quality Engineering + Finance |
| CAPA reference (if initiated) | Link to systemic corrective action | Quality Engineering |
