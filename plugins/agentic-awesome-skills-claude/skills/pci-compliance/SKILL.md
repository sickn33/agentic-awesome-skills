---
name: pci-compliance
description: "Scope and evidence PCI DSS v4.0.1 work without claiming certification or inventing payment-security controls."
risk: critical
source: https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss
source_type: official
date_added: "2026-02-27"
---

# PCI DSS Compliance Evidence Workflow

Use this skill to structure PCI DSS v4.0.1 scoping, gap analysis, remediation evidence, and assessment preparation. The current standard and supporting documents must be retrieved from the PCI Security Standards Council (PCI SSC) Document Library before relying on requirement numbers or effective dates.

## When to Use

- A system stores, processes, or transmits cardholder data or sensitive authentication data.
- A component can affect the security of the cardholder data environment (CDE).
- A team needs to reduce scope, prepare evidence, or coordinate with an acquiring bank, payment brand, Qualified Security Assessor (QSA), or Internal Security Assessor (ISA).

## Do Not Use

- Do not use this skill to declare an organization compliant, select a Self-Assessment Questionnaire (SAQ), or determine a merchant/service-provider validation level without the acquiring bank or payment brand.
- Do not design a custom card-data vault or tokenization service from snippets. Use a validated payment provider or a separately reviewed, purpose-built system.
- Do not collect production card data, sensitive authentication data, credentials, keys, or assessment evidence in chat.

## Safety Boundaries

- Never retain card verification codes, PINs, PIN blocks, or full track data after authorization. Confirm the exact PCI DSS data-retention rules in the current official standard.
- Prefer hosted payment fields, redirects, or provider tokens that keep account data out of the application environment. Tokenization can reduce scope only after the full data flow and provider responsibilities are verified.
- Treat PAN, logs, traces, backups, queues, analytics, crash reports, screenshots, and support tools as possible account-data locations.
- Do not paste real PANs into examples or tests. Use payment-provider test environments and documented test values.
- Do not weaken TLS, authentication, monitoring, segmentation, or key management to make an integration work.
- Escalate legal interpretations, compensating controls, customized approaches, and disputed scope to a QSA/ISA or the responsible compliance authority.

## Workflow

### 1. Freeze authoritative inputs

Record:

- the PCI DSS version and publication date from PCI SSC;
- the assessment period and target validation date;
- the entities, brands, acquirer, assessor, and service providers involved;
- the applicable official SAQ, ROC, AOC, or other reporting instructions as confirmed by the responsible authority.

Link every requirement interpretation to the exact official document and version. Do not rely on memory, old requirement summaries, or transaction-volume tables copied from third-party sites.

### 2. Map account-data flows

Create a reviewed diagram and inventory covering:

- collection points and payment channels;
- applications, APIs, networks, endpoints, people, and facilities;
- storage, processing, transmission, logging, backup, and deletion paths;
- encryption and key-management boundaries;
- third-party service providers and shared responsibilities;
- systems connected to, or able to affect, the CDE.

For every component, record the owner, environment, data handled, trust boundary, segmentation control, and evidence source. Unknown paths remain in scope until disproved with evidence.

### 3. Confirm scope and responsibilities

Review the map with security, engineering, operations, legal/compliance, and the assessor or acquirer when required. Verify segmentation with technical testing; a diagram or firewall rule alone is not proof.

Maintain a responsibility matrix for each applicable requirement:

| Requirement | Responsible party | Control owner | Evidence | Period | Status |
|---|---|---|---|---|---|
| Exact PCI DSS reference | Organization/provider/shared | Named role | Immutable evidence location | Required window | pass/gap/blocked |

Provider attestations do not automatically cover the organization's configuration or integration duties.

### 4. Evaluate controls against the official standard

For each applicable requirement:

1. quote only the minimum identifier needed to locate it;
2. document why it applies or the evidence-backed reason it does not;
3. identify the implemented control and owner;
4. collect dated configuration, procedure, sample, and operating evidence;
5. test both design and operation across the required period;
6. record gaps, risk, remediation owner, deadline, and retest result.

Do not turn example code or policy text into evidence. Evidence must come from the actual in-scope environment and be handled under the organization's access and retention rules.

### 5. Remediate safely

Prioritize exposure of prohibited or unnecessary account data, authentication and access failures, missing monitoring, exploitable vulnerabilities, weak segmentation, and unmanaged cryptographic keys. Each remediation needs:

- an approved change and rollback plan;
- non-production testing with synthetic data;
- production verification by an authorized operator;
- before/after evidence bound to the changed system and date;
- assessor review when the control interpretation affects compliance scope.

Do not mark a gap closed until the control is operating and the evidence meets the applicable testing procedure.

### 6. Produce an honest assessment packet

The packet should include the authoritative-document manifest, scope and data-flow diagrams, inventories, responsibility matrix, requirement ledger, evidence index, gap register, remediation/retest records, provider attestations, and unresolved decisions.

Use precise states such as `verified`, `gap`, `not-applicable-with-evidence`, or `blocked-needs-authority`. Label preparatory work as readiness or gap analysis—not certification.

## Completion Checks

- Official PCI SSC documents and versions are recorded.
- Scope includes all systems that store, process, transmit, or can affect account data.
- Third-party and shared responsibilities are explicit.
- Every applicable requirement has current, access-controlled evidence or a tracked gap.
- No sensitive authentication data or production secrets were collected in the work product.
- Changes were tested and retested without weakening controls.
- Compliance claims are made only by the authorized assessing or accepting party.

## References

- PCI SSC Document Library: https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss
- PCI DSS overview: https://www.pcisecuritystandards.org/standards/pci-dss/

## Limitations

- PCI DSS applicability, validation level, reporting method, and acceptance depend on payment-brand, acquirer, jurisdictional, contractual, and assessor decisions.
- This skill supports evidence preparation; it is not legal advice, a formal assessment, or proof of compliance.
- Verify all requirement text, dates, and guidance against current official PCI SSC sources before acting.
