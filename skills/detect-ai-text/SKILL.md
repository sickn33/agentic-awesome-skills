---
name: detect-ai-text
description: Estimate whether a document's prose was written by AI, with the linguistic tells and honest abstention on non-prose. Use when the user asks whether an essay, report, CV, submission, or article was AI-generated — for triage, not proof.
category: document-verification
risk: safe
source: community
source_repo: Sketchjar/stipple-agent-skills
source_type: community
date_added: "2026-08-31"
author: Sketchjar
tags: [document-verification, fact-checking, stipple, authenticity]
tools: [claude, cursor, gemini, codex]
---

# AI-Text Detection

Estimate the probability that a document's prose was written by AI, with the specific linguistic tells and an honest abstention when the document isn't prose. Uses the Stipple API (free anonymous tier).

## When to use

- Educators screening student submissions
- Publishers and platforms triaging inbound content
- HR reviewing AI-drafted CVs (flag, don't reject)
- Researchers checking source provenance

## Instructions

1. **Get the document.** URL, local file path (PDF, DOCX, TXT, MD), or raw text via `--text`.

2. **Run detection.**

   ```bash
   curl -X POST https://www.stipple.sh/v1/detect-ai-text \
     -F "file=@essay.pdf" \
     -H "Authorization: Bearer $STIPPLE_API_KEY"
   ```

   For raw text: POST JSON `{"text": "..."}` to the same endpoint.

3. **Interpret the response.**

   - `applicable: false` — the document is not prose (forms, tables, scans, spreadsheets). Detection is **deliberately refused** rather than guessed. Report this and stop.
   - `probability` — model confidence (0–1), NOT a calibrated truth
   - `lean` — "ai" | "human" | "unsure"
   - `tells[]` — the specific phrases/patterns flagged (e.g. "It is important to note that", uniform sentence length, low burstiness)
   - `reasoning` — why the model reached its verdict
   - `limitations` — always present; the API states its own noise profile

4. **Report honestly.** This measures *style, not authenticity*:

   | Question | Tool |
   |---|---|
   | Was this *written* by AI? (style) | this skill |
   | Is this document *genuine/tampered*? (forensics) | `verify-document` skill |

   A human can write generically; an AI can write plainly. One triage signal, never a verdict.

## Output format

```
AI-written probability: 0.87  (lean: ai)
prose ratio: 0.82

linguistic tells:
  - "It is important to note that, in today's fast-paced world" (stock phrase)
  - uniform sentence length across paragraphs
  - low burstiness; no authorial asides

reasoning: The text relies entirely on formulaic transition clichés...
limitations: The probability is the model's CONFIDENCE, not a calibrated truth.
```

## Notes

- Non-prose documents (forms, tables, payslips) get `applicable: false` — the engine refuses rather than guessing
- Can false-flag templated/coached or non-native-English writing — always present as one signal alongside human review
- Free anonymous tier works without a key; free key at https://www.stipple.sh
