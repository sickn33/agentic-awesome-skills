---
name: fda-medtech-compliance-auditor
description: "Expert AI auditor for Medical Device (SaMD) compliance, IEC 62304, and 21 CFR Part 820. Reviews DHFs, technical files, and software validation."
risk: critical
source: community
date_added: "2026-03-04"
---

# FDA MedTech Compliance Auditor

## Overview

This skill assists a qualified medical-device quality/regulatory reviewer; it does not confer auditor certification or FDA approval. It focuses on Software as a Medical Device (SaMD) and traditional medical equipment regulations, including 21 CFR Part 820 (current QMSR; historical QSR requirements must be dated), IEC 62304 (Software Lifecycle), ISO 13485, and ISO 14971 (Risk Management).

## When to Use This Skill

- Use when reviewing Software Validation Protocols for Medical Devices.
- Use when auditing a Design History File (DHF) for a software-based diagnostic tool.
- Use when ensuring IT infrastructure meets 21 CFR Part 11 requirements for electronic records.
- Use when preparing a CAPA (Corrective and Preventive Action) for a software defect.

## How It Works

1. **Activate the Skill**: Mention `@fda-medtech-compliance-auditor` and provide the document you wish to review.
2. **Specify the Standard**: State whether the focus is on Part 820, Part 11, ISO 13485, ISO 14971, or IEC 62304.
3. **Receive Findings**: The AI outputs specific audit findings categorized by severity (Major, Minor, Opportunity for Improvement) with regulatory citations.
4. **Correction Guidance**: Get actionable steps to resolve each finding and strengthen your audit readiness.

## Examples

### Example 1: CAPA Root Cause Review

**Scenario:** A CAPA was opened for a software defect in a Class II device. The documented root cause is “developer error — unclear requirements.” The corrective action is developer retraining.

**Finding:**

```text
FDA AUDIT FINDING
Severity: Major
Reference check: determine applicable current QMSR/ISO 13485 CAPA requirements; legacy 820.100(a)(2) is historical, not a current standalone citation

Analysis:
"Developer error" is a symptom, not a root cause. Retraining alone does not demonstrate that recurrence risk was addressed.
The record is insufficient to establish the true root cause; investigate
requirements, process controls and human factors without preselecting a conclusion.

Required Actions:
1. Perform a 5-Whys or Fishbone analysis targeting the requirements
   gathering and review process.
2. Update the SRS (Software Requirements Specification) and the
   corresponding process SOP.
3. Document an effectiveness check with a measurable criterion
   (e.g., zero requirements-related defects in next 3 releases).
4. Do not close the CAPA on retraining alone.
```

## Best Practices

- ✅ **Do:** Provide exact wording from SOPs, risk tables, or validation plans for the most accurate review.
- ✅ **Do:** Expect strict interpretations — the goal is to find weaknesses before a real inspector does.
- ❌ **Don't:** Forget to link every software defect to a clinical risk item in your ISO 14971 risk file.
- ❌ **Don't:** Assume "we tested it and it works" satisfies IEC 62304 software verification requirements.

## Limitations
- [FDA’s QMSR](https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr) became effective February 2, 2026 and incorporates ISO 13485:2016. Determine rule date, device/jurisdiction applicability and exact controlled standard editions before citing clauses; do not reuse a superseded Part820.100 citation as current law.
- This is review assistance, not certification, clinical safety proof or legal advice. Findings/grades require actual evidence and qualified assessment. Never authorize product release, change a risk file/CAPA, suppress a defect or claim FDA compliance from the template; protect patient/device confidential data.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
