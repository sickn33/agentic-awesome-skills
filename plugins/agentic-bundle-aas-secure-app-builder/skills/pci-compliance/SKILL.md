---
name: pci-compliance
description: Review payment data flows and engineering control evidence for a scoped PCI assessment, without claiming certification.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Payment Data and PCI Evidence Review

## When to Use

Review payment data flows, prepare engineering controls or collect evidence for a scoped PCI assessment. This skill does not certify compliance or determine assessment eligibility on its own.

## Inputs and prerequisites

Identify the merchant/service-provider role, acquiring institution, processor integration, systems handling account data and the applicable assessment documents. Obtain the current documents from the [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/); confirm applicability with the responsible assessor or acquiring institution.

## Procedure

1. Follow `resources/implementation-playbook.md` to map forms, APIs, storage, queues, logs, telemetry, backups and support exports.
2. Prefer provider-hosted collection when appropriate. Verify what the application actually receives; a tokenization claim does not prove that raw account data never reaches another system.
3. Minimize retained data and document purpose, access, retention and deletion. Do not retain sensitive authentication data after authorization, even encrypted. Do not build a custom card vault from an illustrative encryption snippet.
4. Map required controls to implementation evidence: network boundaries, system configuration, data protection, access, monitoring, testing and operational ownership. Keep unverified controls marked as gaps.
5. Use allowlisted event fields in logs and responses. Test nested errors and retries with synthetic data; denylist filtering cannot anticipate every sensitive field name.
6. Verify role and resource authorization together. A broad payment role does not grant access to every customer's payment method.
7. Produce a control/evidence/gap/owner table and remediation plan. Treat SAQ eligibility, transaction thresholds and formal attestation as decisions requiring the applicable current guidance.

## Example

Input: a checkout webhook is copied into application logs. Replace the log payload with approved event type, internal request ID and outcome fields. Exercise success, failure and retries using the processor's test environment. Verify the logs contain no synthetic account-data markers and that payment handling still meets its contract.

## Verification

- Data-flow inventory reconciled with actual integration and telemetry.
- Access denial produces no payment or data side effect.
- Redaction checked on nested data and exceptions.
- Evidence tied to actual configuration and test results, with explicit gaps.

## Limitations

Encryption, hosted checkout or a passed scan alone does not prove compliance. This package includes no automated audit script, payment processor client or certified encryption utility. Use reviewed integration code and qualified assessment for the actual environment; never use live cardholder data as a test fixture.
