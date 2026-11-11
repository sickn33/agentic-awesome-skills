---
name: accessibility-compliance-accessibility-audit
description: Audit pages and user journeys against a declared WCAG scope. Use when identifying keyboard, screen-reader, focus or contrast barriers and planning verified remediation.
metadata:
  aas-risk: safe
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Accessibility Audit and Testing

Assess the supplied pages and user journeys against the agreed WCAG edition and level. Record observed barriers, actual test coverage, remediation priorities and unresolved manual checks; automated scans alone do not establish conformance.

## Use this skill when

- Auditing web or mobile experiences for WCAG compliance
- Identifying accessibility barriers and remediation priorities
- Establishing ongoing accessibility testing practices
- Preparing compliance evidence for stakeholders

## Do not use this skill when

- You only need a general UI design review without accessibility scope
- The request is unrelated to user experience or compliance
- You cannot access the UI, design artifacts, or content

## Context

Combine automated evidence with keyboard, screen-reader, focus and contrast inspection in the actual target environment. Keep untested journeys and incomplete checks visible.

## Requirements

Use the supplied WCAG edition/level, target pages and flows, authorized test environment, available audit tools and representative interaction states. Missing scope or UI access is an explicit limitation, not a passing audit.

## Instructions

- Confirm scope (platforms, WCAG level, target pages, key user journeys).
- Run automated scans to collect baseline violations and coverage gaps.
- Perform manual checks (keyboard, screen reader, focus order, contrast).
- Map findings to WCAG criteria, severity, and user impact.
- Provide remediation steps and re-test after fixes.
- If detailed procedures are required, open `resources/implementation-playbook.md`.

## Example

**Request:** “Audit keyboard use in our checkout staging flow against WCAG 2.2 AA.”

**Output:** Record the exact staging URL and states tested. Inspect tab order, visible focus, field labels, validation errors and checkout completion without a pointer. Link each observed barrier to the applicable criterion and evidence; mark screen-reader and unvisited-state checks as pending. Propose a fix and repeat the failed interaction after the authorized change. Do not call the whole product compliant from one successful scan.

## Resources

- `resources/implementation-playbook.md` for detailed audit steps, tooling, and remediation examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
