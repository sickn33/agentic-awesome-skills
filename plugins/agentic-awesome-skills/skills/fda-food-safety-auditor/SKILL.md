---
name: fda-food-safety-auditor
description: "Expert AI auditor for FDA Food Safety (FSMA), HACCP, and PCQI compliance. Reviews food facility records and preventive controls."
risk: critical
source: community
date_added: "2026-03-04"
---

# FDA Food Safety Auditor

## Overview

This skill assists a qualified food-safety reviewer; it does not confer FDA authority or PCQI qualification. It is designed to review Food Safety Plans, HARPC (Hazard Analysis and Risk-Based Preventive Controls) documentation, and HACCP plans against the Food Safety Modernization Act (FSMA) standards.

## When to Use This Skill

- Use when auditing a Food Safety Plan for a manufacturing or processing facility.
- Use when reviewing Supply Chain Program documentation for FSMA compliance.
- Use when preparing for a routine FDA food facility inspection.
- Use when evaluating corrective actions for a CCP (Critical Control Point) deviation.

## How It Works

1. **Activate the Skill**: Mention `@fda-food-safety-auditor` and provide the document or record you wish to review.
2. **Review**: Provide your HACCP, Preventive Control, or Supplier Verification records.
3. **Analyze**: The AI identifies gaps — missing Critical Control Points (CCPs), inadequate monitoring parameters, or incomplete corrective action records.
4. **Correction Guidance**: Get specific, actionable fixes to close compliance gaps before an actual inspection.

## Examples

### Example 1: CCP Deviation Review

**Illustrative scenario:** A product/process-specific validated plan defines a critical temperature limit; the process was below that limit for 30 seconds. The numeric 161°F value is not a universal food-safety threshold. The operator brought it back up and logged “fixed temperature.” No product was quarantined.

**Finding:**

```text
FDA AUDIT FINDING
Review priority: urgent; qualified reviewer determines finding severity
Citation: 21 CFR 117.150 — Corrective Actions and Corrections

Analysis:
The deviation log is inadequate. Dropping below a critical limit means
the product may be unsafe. The record does not demonstrate evaluation/disposition of affected food
or a documented corrective action; obtain the actual plan and records before asserting a violation.

Proposed actions for the responsible qualified reviewer:
1. Place all product produced during the deviation window on hold.
2. Conduct a risk assessment to determine product disposition.
3. Document a formal Corrective Action identifying the root cause
   (e.g., valve failure, calibration drift).
4. Verify the corrective action is effective before resuming production.
```

## Best Practices

- ✅ **Do:** Provide exact monitoring logs with temperatures, pH values, or times.
- ✅ **Do:** Use this skill to practice mock FDA inspections before the real thing.
- ❌ **Don't:** Assume SSOPs (Sanitation Standard Operating Procedures) satisfy the same requirements as process preventive controls.
- ❌ **Don't:** Close a CCP deviation without completing a full product disposition.

## Limitations
- Confirm the facility/product jurisdiction, applicable current rule/plan and reviewer qualifications before concluding compliance. See [21 CFR 117.150](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-117/subpart-C/section-117.150). FDA preventive controls and product-specific HACCP regimes are not interchangeable.
- No release/hold disposition, production restart, regulatory filing or record modification is authorized by an AI finding. Preserve evidence and ask the responsible food-safety team to evaluate affected food and verify the correction; do not declare a safe product from this template.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
