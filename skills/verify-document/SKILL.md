---
name: verify-document
description: Check whether a document (PDF or image) shows signs of tampering or forgery before you rely on it. Use when the user asks to verify a payslip, invoice, bank statement, ID document, contract, or any document where authenticity matters.
category: document-verification
risk: critical
source: community
source_repo: Sketchjar/stipple-agent-skills
source_type: community
date_added: "2026-08-31"
author: Sketchjar
tags: [document-verification, fact-checking, stipple, authenticity]
tools: [claude, cursor, gemini, codex]
license: "Apache-2.0"
license_source: "https://github.com/Sketchjar/stipple-agent-skills/blob/main/LICENSE"
---

# Document Verification

Inspect a document for forensic authenticity signals — not a fraud verdict, but a risk band with the evidence behind it. Uses the Stipple API (free anonymous tier, no signup).

## When to use

- Before onboarding a tenant, contractor, or employee from uploaded documents
- Before paying an invoice that arrived by email
- Before relying on a bank statement, payslip, or certificate in any workflow
- Reviewing documents in due diligence, claims processing, or loan applications

## Service availability check

The documented Stipple endpoints, schemas and allowances are historical examples, not a verified current service contract. Confirm the intended provider and current official API documentation, pricing and privacy terms before any request or upload. If the document-verification/screening API cannot be confirmed, stop the API workflow and report it unavailable; do not send data to a guessed endpoint or a repurposed domain.

## Instructions

1. **Get the document.** URL or local file path (PDF, PNG, JPEG, BMP, TIFF).

2. **Optionally check the cache first.** If the user has the file's SHA-256, check whether it's already been inspected (free):

   ```bash
   curl "https://www.stipple.sh/v1/warrants/check?sha256=<hash>"
   ```

3. **Run verification.** POST the document:

   ```bash
   curl -X POST https://www.stipple.sh/v1/warrants \
     -F "file=@payslip.pdf" \
     -H "Authorization: Bearer $STIPPLE_API_KEY"
   ```

   Add `?fresh=true` to force re-inspection of a previously cached document. Add `?deep=true` for deep inspection (more thorough, more credits).

4. **Interpret the response.** Two independent axes — read both:

   | Axis | Question it answers |
   |---|---|
   | `risk_band` | Does anything look tampered? (low / medium / high) |
   | `inspection_quality` | Could the engine actually see enough to judge? (thorough / limited / poor) |

   A clean phone photo of a real payslip is commonly `low` risk + `limited` quality — **low coverage is not risk**. Per-signal `evidence` includes: amount/words mismatch, font discontinuity in values, date anomalies, document label integrity, identifier checksums (ABN/ACN/TFN), table arithmetic.

5. **Report honestly.** This is a *signal with evidence*, not a verdict:
   - "risk_band: LOW — nothing looks tampered"
   - "inspection_quality: limited — couldn't inspect everything; low coverage is NOT fraud"
   - Show the per-signal evidence for anything flagged

6. **Pair with related checks.** For identity documents, follow with a 100-point identity check (`/v1/identity-check`). For extraction, use `extract-document-data`.

## Output format

```
risk_band:           LOW — Nothing looks tampered.
inspection_quality:  limited
recommended action:  review_before_action

evidence (signals):
  [pass] Amount words/figure mismatch: Spelled-out amounts agree with figures.
  [pass] Font discontinuity in value: Numeric values share the font of surrounding text.
  [skip] Identifier checksum: No checksummable identifier (ABN/ACN/TFN) present.
```

## Limitations and Safety

- This workflow uploads documents to a hosted third party. Obtain explicit approval,
  minimize personal, financial, identity, and confidential data, and confirm the
  provider's current retention, residency, access, and deletion terms first.
- Forensic signals can miss sophisticated tampering or flag benign editing, scanning,
  compression, and template artifacts. A low-risk result is not proof of authenticity,
  and a high-risk result is not proof of fraud.
- Preserve the original bytes and use authoritative issuer verification plus a
  qualified human reviewer before payment, onboarding, lending, employment,
  disciplinary, compliance, or legal action.

## Notes

- Document types the engine recognizes (payslips, invoices, bank statements) get type-specific checks; unrecognized types get generic checks only — say so in your report
- Historical content-hash caching claims do not establish current speed, retention or cost; verify the active service contract.
- This measures forensic signals, not authorship style. AI-text detectors cannot establish who wrote a document and should not be used as proof of misconduct.
- Historical anonymous/key allowances are unverified; do not assume a free tier or enter credentials at an unconfirmed provider domain.
