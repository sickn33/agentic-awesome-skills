---
name: quality-nonconformance
description: Operational guidance for quality control, non-conformance investigation, root cause analysis, corrective action, and supplier quality management in regulated manufacturing.
risk: critical
source: https://github.com/ai-evos/agent-skills
date_added: '2026-02-27'
---

# Quality and Non-Conformance Management

## When to Use

Use to investigate defects or process deviations, prepare NCR/MRB records, root-cause analysis, corrective/preventive actions, SPC interpretation, incoming inspection and supplier quality reviews in manufacturing.

## Workflow

1. Confirm the product, process, jurisdiction, standard edition, applicable customer requirements, current approved specification/control plan and the user's requested output. Do not claim personal professional experience or certifications.
2. Put safety and required containment first through the authorized site procedure. Identify suspect product across incoming stock, WIP, finished goods and shipped units. Emergency actions and reporting clocks do not wait for a complete root-cause investigation.
3. Record facts: part/revision, lot/serial, quantities inspected/failed/suspect, discovery time, requirement, actual measurement, units, instrument and calibration status. Preserve originals and distinguish observations from hypotheses. Unknown quantities are not zero; no signature, approval, completed action or test result may be invented.
4. Assess scope and risk with qualified engineering/quality personnel. A passed sample, stable control chart, certificate or low complaint count cannot prove all units safe. Evaluate measurement adequacy and uncertainty before interpreting product data.
5. Prepare disposition options: rework to full conformance, approved repair/concession, authorized use-as-is, return or scrap. Show technical rationale, applicable approvals, verification, traceability and costs. Production urgency and supplier scarcity never authorize release, bypassing safety requirements or accepting deviations.
6. Investigate causes using evidence. Five Whys and fishbone generate candidate explanations; test them, consider interactions and occurrence-versus-escape causes. Use 8D, FTA or another method when the actual requirement/risk warrants it. Do not assume a named method is universally mandatory or that training is always sufficient/always useless.
7. Propose risk-based CAPA initiation, actions and effectiveness criteria under the actual QMS. Separate correction/containment from systemic corrective action and implementation evidence from effectiveness evidence. Choose exposure, sample size, duration and uncertainty to detect recurrence; there is no universal 90-day/three-lot closure rule or guarantee from zero observed failures.
8. Prepare controlled drafts, not official records or autonomous actions. Sending notifications, filing regulatory reports, changing QMS/ERP/ASL status, accepting concessions, releasing product, ordering tests, spending or issuing debits requires direct authorization within existing delegated authority.
9. Handoff verified facts, evidence references, unresolved scope, current containment, statutory/customer deadlines, owners, approved decisions, next checkpoints and limitations. Keep patient, employee, customer and proprietary manufacturing data access-restricted and minimal.

## Regulatory and statistical checks

For US medical devices, FDA's [QMSR](https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr) became effective 2 February 2026, incorporating ISO 13485:2016 into revised Part 820. Legacy QSR clause numbers such as 820.90/.100/.198 must not be presented as current requirements. Check current rules, product scope and historical record dates. Drug CGMP, device MDR/corrections/removals, automotive and aerospace requirements are distinct and need their own applicability assessment.

Use approved versions of licensed standards and actual customer requirements. Do not reproduce guessed acceptance tables or label sampling “AQL 0” as a guarantee of no defects. General inspection levels I/II/III are separate from normal/tightened/reduced schemes. See the decision reference for plan controls and SPC interpretation.

## Examples

- Field failure after passing inspection: open a factual complaint investigation and reporting assessment; examine use conditions and test coverage without assuming misuse or a design root cause.
- Calibration issue affecting shipped lots: preserve as-found/as-left data, bound affected production and measurement uncertainty, then propose qualified impact assessment and containment.
- CAPA recurrence: link the previous action and new evidence, reassess cause and effectiveness under controlled QMS procedures; do not erase history or close records to improve a dashboard.

## References

- [Decision frameworks](references/decision-frameworks.md)
- [Edge cases](references/edge-cases.md)
- [Communication templates](references/communication-templates.md)

## Limitations

This skill supports investigation and drafting. It cannot certify compliance, determine clinical safety, act as MRB/design authority, establish a recall obligation or approve production. Statistical conclusions require suitable data and methods; templates do not replace current approved procedures or qualified regulatory/engineering assessment.
