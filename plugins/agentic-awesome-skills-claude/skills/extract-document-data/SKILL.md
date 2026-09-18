---
name: extract-document-data
description: Extract structured, grounded fields from documents — values cite their page, missing values abstain instead of hallucinating. Use for parsing invoices, payslips, statements, contracts.
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

# Extract Document Data

Extract structured JSON from documents with per-value grounding: every extracted value cites where it came from (page number, confidence), and values that aren't clearly present are reported in `not_found` rather than hallucinated. Uses the Stipple API (free anonymous tier).

## When to use

- Parsing payslips, invoices, bank statements, receipts, or contracts
- Converting unstructured documents to JSON for downstream systems
- Any extraction where hallucinated values are worse than missing values (lending, accounting, compliance)

## Instructions

1. **Get the document.** URL or local file path (PDF, PNG, JPEG, DOCX).

2. **Choose the extraction mode:**
   - **Ad-hoc fields** — tell the API exactly which fields you want:
     ```bash
     curl -X POST https://www.stipple.sh/v1/extract \
       -F "file=@payslip.pdf" \
       -F 'fields=[{"name":"employer_name"},{"name":"net_pay"},{"name":"pay_date"}]' \
       -H "Authorization: Bearer $STIPPLE_API_KEY"
     ```
   - **Template** — use a built-in schema: `payslip`, `tax_invoice`, `bank_statement`, `receipt`, `contract`
   - **Schema-free** — omit `fields` and let the model extract what it finds

3. **Interpret the response.**

   ```json
   {
     "mode": "schema_free",
     "document_type": "payslip",
     "pages_read": 1,
     "fields": {
       "employer_name": {"value": "Acme Cleaning Pty Ltd", "confidence": 0.95, "page": 1},
       "net_pay": {"value": "2845.10", "confidence": 0.97, "page": 1}
     },
     "not_found": ["ytd_tax"]
   }
   ```

   - Every value carries `confidence` (the model's self-report) and `page` (grounding)
   - `not_found[]` lists requested fields the model couldn't find — **absences are reported, never guessed**
   - `pages_read` shows how many pages were processed (page limits apply per document)

4. **Report honestly.** This is *extraction, not verification* — values are what the document **shows**, not proof it's genuine:
   - "Employer: Acme Cleaning Pty Ltd (confidence 0.95, page 1)"
   - "ytd_tax: not found in document" — never "ytd_tax: 0" or a guess
   - For "is this document genuine?", pair with the `verify-document` skill first

## Output format

```
Payslip fields (grounded, not guessed):

  Employer          Acme Cleaning Pty Ltd  (confidence 0.95, page 1)
  Employee          J. Citizen             (confidence 0.98, page 1)
  Net pay           2,845.10               (confidence 0.97, page 1)
  Superannuation    268.20                 (confidence 0.93, page 1)

not_found: ytd_tax
(absences are reported, never hallucinated)
```

## Limitations and Safety

- Invoices, statements, payslips, and contracts often contain sensitive personal,
  financial, or commercial data. Obtain explicit approval before uploading them to
  a hosted third party, minimize the submitted content, and confirm current
  retention, residency, access, and deletion terms.
- Confidence and page grounding do not prove that an extracted value is correct or
  that the source document is authentic. Reconcile consequential values against the
  original document and authoritative systems before payment, lending, accounting,
  compliance, or legal action.
- Keep the original file and extraction response so a human reviewer can reproduce
  and correct disputed fields.

## Notes

- Costs 1 credit per page read by the model (minimum 1); free weekly allowance applies
- Templates: `payslip`, `tax_invoice`, `bank_statement`, `receipt`, `contract` — pass as the `template` form field
- Tables are extracted with structure preserved; multi-page documents are processed page by page
- Pairs with `verify-document` (run first, for authenticity) — an extracted value from a tampered document is still wrong
- Free key at https://www.stipple.sh for metering beyond the anonymous allowance
