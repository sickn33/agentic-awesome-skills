---
name: fsi-compliance-checker
description: "Maps code, architecture, and infrastructure changes to specific control IDs in PCI-DSS v4.0 and MAS TRM (Singapore financial regulator), producing an audit-traceable findings report with per-control remediation."
category: security
risk: safe
source: community
source_repo: timwukp/agent-skills-best-practice
source_type: community
date_added: "2026-06-12"
author: timwukp
tags: [compliance, pci-dss, mas-trm, fintech, banking, security-review, audit, financial-services]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/timwukp/agent-skills-best-practice/blob/main/LICENSE"
---

# FSI Compliance Checker

## Overview

Maps a concrete change (code diff, architecture design, IaC, pipeline config) to the specific controls it touches in financial services compliance frameworks — PCI-DSS v4.0 for payment card data and MAS TRM for Singapore-regulated institutions — and reports gaps with actionable remediation. This is engineering-level compliance triage: it helps teams catch violations before audit, but it does not replace a qualified assessor (QSA) or the institution's compliance function. Say so in every report.

## When to Use This Skill

- Use when a change touches payment card data (PAN, CVV, track data) and needs a PCI-DSS check
- Use when reviewing changes at a Singapore-regulated financial institution against MAS TRM expectations
- Use when someone asks "is this compliant", "does logging this violate PCI", or requests a banking-regulation review of a diff, design, or Terraform change
- Do NOT use for generic security review (no framework involved), GDPR/SOC2/HIPAA (out of bundled scope), or legal advice

## How It Works

### Step 1: Select the framework

Load only the reference file(s) the engagement needs:

| Situation | Load |
|-----------|------|
| Payment card data is stored, processed, or transmitted | [pci-dss.md](pci-dss.md) |
| Singapore-regulated financial institution (bank, insurer, capital markets, major payment institution) | [mas-trm.md](mas-trm.md) |
| Both apply (e.g. Singapore bank handling cards) | Both files |
| Other jurisdictions/frameworks (SOX, GDPR, HKMA, APRA) | State they are out of scope; offer general secure-engineering review instead |

If the user hasn't said which applies, ask one question: what data does the change touch, and is the institution Singapore-regulated?

### Step 2: Scope the change

Identify what the diff/design actually touches: data elements (card data? customer PII? credentials?), trust boundaries, environments (production? DR?), and third parties.

### Step 3: Assess applicable controls

Select the applicable controls from the loaded reference file(s) — typically 5-15 controls, not the whole framework. List what you ruled out and why (one line each) so the scoping is auditable. Assess each as `Compliant` / `Gap` / `Needs evidence` (can't tell from the artifact — name the evidence required).

### Step 4: Report

Every Gap gets: the control ID, what's wrong in this specific change, concrete remediation, and severity (Critical = violation involving live regulated data; High = control absent; Medium = control partial/undocumented).

```markdown
# Compliance Review: [change title]
**Frameworks:** [PCI-DSS v4.0 / MAS TRM 2021] · **Date:** [YYYY-MM-DD]
**Scope:** [what was reviewed: files, design doc, pipeline]
> Engineering triage only — not a substitute for QSA assessment or the compliance function.

## Data & Boundary Analysis
- Data elements touched: [e.g. PAN (masked), customer NRIC, none]
- Environments/boundaries: [e.g. CDE-adjacent service, public API]

## Findings
| # | Control | Status | Severity | Finding | Remediation |
|---|---------|--------|----------|---------|-------------|
| 1 | [PCI 3.5.1] | Gap | Critical | [specific issue in this change] | [specific fix] |

## Ruled Out (not applicable)
- [Control area] — [one-line reason]

## Evidence Needed
- [Control]: [what artifact would demonstrate compliance]
```

### Step 5: Offer story conversion

Offer to turn findings into backlog items with the control ID in each story for traceability.

## Examples

### Example 1: Logging review

**User**: "Is this PCI-DSS compliant: we log the full request body of card authorization calls for debugging?"

**Skill**: Loads pci-dss.md → Critical findings against 3.3.1 (CVV must never be stored post-authorization — logs are storage), 3.4.1 (PAN display masking), 3.5.1 (PAN unreadable at rest); remediation: remove the log line or apply a field-allowlist redaction filter; flags downstream log-pipeline scoping (10.3.x); QSA disclaimer included.

### Example 2: Cloud migration

**User**: "Our Singapore bank is moving the customer notification service to a cloud region in another country. MAS TRM implications?"

**Skill**: Loads mas-trm.md → reviews against §11.5 (cloud: due diligence, data residency, exit strategy), flags the MAS Outsourcing Guidelines as a related instrument, asks what customer data the service touches before rating severity.

## Common FSI Engineering Triggers

Changes that almost always have compliance impact — check proactively when they appear in a diff:

- Logging statements near payment or authentication flows (PAN/CVV must never be logged; MAS TRM requires security event logging — both directions matter)
- New data stores or caches receiving customer or card data (encryption at rest, retention, residency)
- Authentication/session changes (MFA requirements, session timeout, credential storage)
- New third-party SDKs or API integrations (outsourcing/vendor controls, data flows leaving the boundary)
- Infrastructure changes touching network segmentation, security groups, or public exposure
- CI/CD changes that alter who/what can deploy to production (change management, segregation of duties)

## Guardrails

- Cite control IDs precisely (e.g. "PCI-DSS 8.3.6", "MAS TRM 9.1.1") so findings are traceable in audit tooling; the bundled reference files carry the ID schemes.
- Severity discipline: don't inflate. A missing comment is not a Critical; unencrypted PAN at rest is.
- When the change is compliant, say so affirmatively per control — "no findings" plus the checked-control list is a useful audit artifact.
- Never output real card numbers, even as examples; use the standard test PANs (e.g. 4111 1111 1111 1111) when illustrating.
- Read-only: this skill reviews and reports; it never modifies code, infrastructure, or configuration.

## Credits

Adapted from [timwukp/agent-skills-best-practice](https://github.com/timwukp/agent-skills-best-practice) (MIT), where the skill ships with evals and a documented 4-layer test methodology (see the repo's TESTING.md).
