---
name: screen-adverse-media
description: Screen a person or organisation for adverse media coverage, PEP status, and sanctions exposure — corroboration-gated, returns "review" never "guilty". Use when the user asks to screen someone before onboarding, partnership, or investment; for AML/CTF flows; or for ongoing counterparty monitoring.
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

# Screen Adverse Media

Screen a person or organisation for adverse media coverage, PEP (Politically Exposed Person) status, and sanctions exposure. Every hit is **corroboration-gated**: the screen returns "review", never "guilty", and "nothing found" is never a clean record. Uses the Stipple API (free anonymous tier).

## When to use

- AML/CTF onboarding (Tranche 2 reforms make this mandatory for more Australian businesses)
- Vendor/supplier due diligence before signing
- Investor or LP vetting
- Ongoing counterparty monitoring (re-run periodically, compare warrant IDs)

## Instructions

1. **Get the target.** Name of the person or organisation. For document-based screening, a PDF/image of their ID or company extract can also be submitted.

2. **Run the screen.**

   Name-based (via MCP — the REST intake is document-based):
   ```bash
   # Via any MCP client pointed at https://www.stipple.sh/mcp:
   # tool: screen_adverse_media
   # args: {"name": "John Citizen", "entity_type": "person"}
   ```

   Document-based (REST — screens the person/org named in the uploaded document):
   ```bash
   curl -X POST https://www.stipple.sh/v1/adverse-media \
     -F "file=@company-extract.pdf" \
     -H "Authorization: Bearer $STIPPLE_API_KEY"
   ```

3. **Interpret the response.**

   - `rating` — the overall screening result ("review", "clear", etc.)
   - `hits[]` — adverse media articles: date, title, source, URL, summary
   - `pep[]` — PEP signals (empty = none found)
   - `sanctions[]` — sanctions list signals (empty = none found)

4. **Report with the right framing.** Non-negotiable framing rules:

   | Finding | Correct framing |
   |---|---|
   | Hits found | "Review recommended — see articles below" (never "guilty") |
   | Nothing found | "No corroborated adverse media found — this is NOT a clean record; coverage is bounded by the source list" |
   | PEP signal | "PEP status identified — enhanced due diligence may apply" |

5. **Contextualize.** Every hit is corroborated across sources before inclusion — but the screen is the start of human review, not the end of it. Date-range and source-coverage limitations are real.

## Output format

```
screening rating: review

adverse media hits:
  - [2025-11-02] Court action over unpaid supplier debts
      source: The Age  https://...
  - [2024-06-18] ASIC disqualification
      source: ASIC media releases  https://...

PEP signals: 0
sanctions list signals: 0

This screen returns "review", never "guilty" — every hit is corroboration-gated.
```

## Limitations and Safety

- Screening processes personal data and potentially damaging allegations through a
  hosted third party. Confirm a lawful purpose, obtain any required approval, send
  only the minimum identifiers needed, and verify current retention, residency,
  access, and deletion terms before transmission.
- Name matches, PEP signals, sanctions hits, and media reports can be incomplete,
  stale, misattributed, or false. Corroborate every consequential result with the
  original source and authoritative registers; never publish an allegation as fact.
- This is not a legal AML/CTF determination. A qualified human reviewer must resolve
  identity ambiguity, document the reasoning, and provide an appropriate correction
  or appeal path before rejecting or restricting a person or organization.

## Notes

- Costs 3 credits per screen; free weekly allowance applies
- For AML flows, pair with `check-identity-pack` (identity) and `verify-document` (document genuineness)
- "Nothing found" ≠ "clean record" — always state this in reports
- Free key at https://www.stipple.sh for metering beyond the anonymous allowance
