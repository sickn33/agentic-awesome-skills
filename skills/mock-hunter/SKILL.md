---
name: mock-hunter
description: "Audit a live web page in five phases (catalog, click, trace, classify, report) to identify mock data, hardcoded values, LLM-generated metrics, and broken endpoints. Outputs a markdown report with REAL/MOCK/LLM/HARDCODED/BROKEN/UNKNOWN verdicts per visible value."
category: testing
risk: safe
source: community
source_repo: CodeShuX/mockhunter
source_type: community
date_added: "2026-05-07"
author: CodeShuX
tags: [testing, qa, playwright, mock-detection, web-audit, ai-testing, vibe-coding, claude-code]
tools: [claude]
license: "MIT"
license_source: "https://github.com/CodeShuX/mockhunter/blob/main/LICENSE"
---

# MockHunter — Live Page Reality Check

## Overview

MockHunter is a Claude Code skill that audits a live web page and tells you, for every visible value, whether it is real, mocked, LLM-generated, hardcoded, broken, or unknown. It is built for vibe-coded apps (Lovable, Bolt, v0, Replit, AI Studio, Cursor Composer) where the UI may look complete but the data layer often is not. It uses Playwright MCP to drive a real browser, then traces each visible value through the network and DOM to its source.

This skill adapts the upstream `CodeShuX/mockhunter` project (community source).

## When to Use This Skill

- Use when auditing an AI-generated UI to find out which values are actually wired up
- Use when reviewing a contractor or teammate's deliverable before sign-off
- Use before showing a vibe-coded MVP to a customer or investor
- Use when a dashboard "looks too clean" — every metric uniformly round, all timestamps clustered, no variance — and you suspect seeded data

## How It Works

### Phase 1: Setup & Smart Questions

1. Greet the user, ask for the target URL
2. Auto-detect the stack from the URL (`*.lovable.app`, `*.bolt.new`, `*.v0.app`, `*.replit.app`, `aistudio.google.com`, otherwise Custom)
3. Ask 3-5 targeted questions: auth mode (public / localhost / form / skip), DB access (optional), suspicions, page goal
4. Confirm the audit plan before proceeding

### Phase 2: Navigate & Catalog

1. `browser_navigate` to the target URL
2. Handle auth per chosen mode (form-login: fill fields, click submit)
3. Wait for network idle (max 10s)
4. Take full-page screenshot, capture accessibility snapshot
5. Inventory every: heading, button, link, input, card, badge, stat, table cell, empty state, image
6. Capture initial console errors and network requests

### Phase 3: Test Interactivity

1. For every tab: click, snapshot, scroll to bottom, re-catalog
2. For every button (excluding destructive matches `/delete|remove|cancel|deactivate|terminate|destroy|drop|wipe|clear|reset|logout|sign out|transfer|pay|purchase|charge|send (email|message|invoice)|publish|deploy/i`): click, observe, classify outcome (modal, toast, navigation, network call, NO-OP)
3. For every form: identify required fields, attempt empty submit (validate), submit valid throwaway data only if non-destructive
4. Record per-element behavior

### Phase 4: Trace Provenance

For every visible value, run this decision tree:

```
Did any network request return this value?
├── YES — found in a response:
│   ├── Status 4xx/5xx → BROKEN
│   ├── Endpoint matches /ai|openai|generate|llm|chat → LLM
│   ├── Response shape matches mock library (faker, MSW, mockoon) → MOCK
│   ├── Uniformity flags trigger → MOCK or LLM (review)
│   ├── DB connection provided?
│   │   ├── Run read-only SELECT, value matches DB row → REAL
│   │   └── Value not in DB → MOCK
│   └── No DB → UNKNOWN (best-guess)
└── NO — value not in any network response:
    ├── String literal in DOM source → HARDCODED
    ├── Computed from Math.random / Date.now / faker → MOCK
    └── Cannot determine → UNKNOWN
```

Uniformity heuristics flag suspicious data:
- All numeric values identical across rows
- All percentages round (50%, 75%, 90%)
- All timestamps cluster within a single minute
- < 3 unique values across 10+ rows

### Phase 5: Report

Generate `mockhunter-report.md` with:
- Summary table (verdict counts)
- Findings per section/tab (element / value / verdict / source / severity / action)
- Console errors and network failures
- NO-OP buttons
- Suspicious patterns
- Smart follow-up questions for the user

## Examples

### Example 1: Auditing a Lovable admin dashboard

```
User: /mockhunter audit https://my-app.lovable.app/admin
Skill: [Phase 1] Stack detected: Lovable. Auth: skip. DB: no.
       [Phase 2] Catalog: 6 stat cards, 4 verification queues, 8 activity items.
       [Phase 3] Search box: NO-OP (zero network requests). Activity link → 404.
       [Phase 4] Bundle 2.7 MB. Zero /api/, zero supabase, zero axios.
                 "$42,850" → string literal in JSX → HARDCODED.
                 "+12% vs last month" → string literal → HARDCODED.
       [Phase 5] Verdict: 23 HARDCODED, 1 BROKEN, 1 NO-OP, 0 REAL.
                 Report written to ./mockhunter-report.md
```

### Example 2: Public marketing site (mostly real)

```
User: /mockhunter audit https://example-saas.com
Skill: ...
       [Phase 5] Verdict: 8 REAL, 18 HARDCODED (intentional marketing copy),
                 0 MOCK, 0 BROKEN, 2 UNKNOWN.
                 No console errors, no broken endpoints.
```

## Best Practices

- ✅ Provide DB access when available — lifts UNKNOWN verdicts to REAL or MOCK
- ✅ Use a dedicated test account for form-login auth
- ✅ Run cold-start tests (zero data) — many vibe-coded apps fail there
- ✅ Tell the skill if specific sections are intentionally AI-generated, so it doesn't false-flag them
- ❌ Don't run on apps you don't own without permission — it clicks every button
- ❌ Don't skip the destructive-button exclusion list — apps can mutate state
- ❌ Don't trust the audit if the page failed to load — check console first

## Limitations

- Single-page audit per run — no multi-page crawl in v0.1.0
- Form-login only for auth — no OAuth, magic-link, or 2FA in v0.1.0
- Caps at ~30 most-prominent buttons per page
- Markdown report only — no JSON output yet
- DB verification supports any DB reachable via shell command (psql, mysql, mongosh, wrangler, supabase REST), but not Firestore directly

## Security & Safety Notes

- The skill runs read-only DB SELECTs only, never INSERT/UPDATE/DELETE
- Skips destructive-looking buttons via regex match
- Never submits forms that look like payment, account deletion, or external write operations
- Uses placeholder credentials (`mockhunter@example.com`) for any throwaway form tests, never the user's real credentials
- All Playwright actions happen in a controlled MCP browser context — no headless escalation
