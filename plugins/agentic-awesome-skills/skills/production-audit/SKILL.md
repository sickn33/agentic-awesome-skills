---
name: production-audit
description: "Audit a shipped repo for production-readiness gaps across RLS, webhooks, secrets, grants, Stripe idempotency, mobile UX, and deployment health."
category: security
risk: critical
source: community
source_repo: commitshow/production-audit
source_type: community
date_added: "2026-05-04"
author: commitshow
tags: [security, audit, production, vibe-coding, rls, webhook, stripe, supabase, mobile]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/commitshow/production-audit/blob/main/LICENSE"
---

# Production Audit

## Overview

A skill that runs an external audit on a shipped repo's deployed state — live URL, GitHub signals, secrets exposure, RLS gaps, webhook idempotency, indexes, observability, prompt injection, and ten other failure modes that AI-assisted projects routinely miss.

This is **complementary** to in-session security skills (`security-review`, OWASP-style, VibeSec, Trail of Bits). Those scan the editor buffer at write-time. This scans the deployed product after you commit. Different timing, different inputs, different findings. Run both for serious launches.

The skill wraps the [commit.show](https://commit.show) audit engine via the public CLI (`npx commitshow@0.3.23 audit . --json`). Stable JSON envelope (`schema_version: "1"`, additive-only). Writes a `.commitshow/audit.{md,json}` sidecar so future agent sessions can read prior state without re-running the engine.

## When to Use This Skill

- Use when the user asks "is this production-ready", "what would break in prod", "score my project", "what did I miss", "audit my repo", "ready to ship".
- Use right after merging a feature branch to `main` (helpful as a pre-deploy gate).
- Use before a public launch / Show HN post / investor demo.
- Use when `git log` shows >20 commits since the last `.commitshow/audit.md` was written.

### Skip when

- During active in-session coding — use `security-review` / OWASP-style for line-level patterns. This skill is for post-merge / pre-ship review.
- For library / scaffold-form repos — the engine handles **app form** best; libraries get a partial-substitute score.
- If `.commitshow/audit.json` already exists and is < 1 hour old, read that instead of re-running. Audit is rate-limited (anonymous: 20/IP/day · 5/repo/day · 2000/day global).
- Inside a private / non-GitHub repo — the audit pulls public GitHub signals, so private repos return a `not_found` error.

## How It Works

### Step 1: Run the audit

From the repo root. The CLI is pinned to an exact reviewed version so future npm releases are not selected silently. Because `npx` downloads and runs npm package code locally with the current user's permissions, run it only after the user explicitly approves this external execution and only in a repository where local files and environment variables are safe for that process to access. The sidecar directory is created up-front, and stderr is split off so install/deprecation warnings can't corrupt the JSON envelope:

```bash
mkdir -p .commitshow
npx commitshow@0.3.23 audit . --json \
  > .commitshow/audit.json \
  2> .commitshow/audit.stderr.log
```

This also writes a human-readable `.commitshow/audit.md` next to it. Subsequent invocations should diff against the prior `audit.json` if it exists, so you can lead with "+5 since yesterday's audit" instead of just an absolute number.

If the user pointed at a remote URL instead of `.`, swap `.` for the URL — keep the same `mkdir -p` + version pin + stderr split:

```bash
mkdir -p .commitshow
npx commitshow@0.3.23 audit github.com/owner/repo --json \
  > .commitshow/audit.json \
  2> .commitshow/audit.stderr.log
```

### Step 2: Parse the envelope

The JSON envelope is stable (`schema_version: "1"`, additive-only). Read these fields:

| Field | Meaning |
|---|---|
| `score.total` | 0-100 production-readiness score |
| `score.delta_since_last` | change vs. parent snapshot · positive = improving |
| `score.band` | `strong` (80+) · `mid` (60-79) · `early` (<60) |
| `concerns[]` | top issues, ordered by impact · each has `axis` + `bullet` |
| `strengths[]` | top 3 things that work · for context only |
| `standing` | optional · only when the project is auditioning on commit.show |
| `snapshot.created_at` / `trigger_type` | when the audit ran |

Concerns are sorted by decision-impact, not severity. Position 1 is the bullet to lead with.

### Step 3: Surface to the user

Lead with score + trajectory in **one sentence**, then the top concerns. Do not dump the full JSON. Format:

```
Score: 82/100 (+5 since yesterday) · band: strong

Top concerns:
  ↓ [Security] No API rate limiting on /auth — IP cap missing
  ↓ [Infrastructure] webhook handler at api/stripe.ts — signature verified, but no
    idempotency-key check (replay attack window open)

Want me to fix the webhook idempotency gap first?
```

Rules:
- Use the exact bullet from `concerns[].bullet` — the audit engine already wrote action-oriented copy.
- Don't list strengths unless the user explicitly asks. They're not actionable in this context.
- Always end with a follow-up question that names a specific concern. Don't ask "what do you want to do?" — ask "fix X first?".
- If `score.delta_since_last` is negative or null, lead with the absolute score only.

### Step 4: If the user picks a concern, scope a fix

For the chosen concern:
1. Read the file(s) cited in the bullet.
2. Confirm the gap matches the description (the engine occasionally over-flags when the issue is mitigated elsewhere).
3. Propose a minimal patch — single-file when possible.
4. **Don't apply without explicit approval.** Show the diff first. The user is deciding what to ship; you're a lens.

After applying a fix, suggest re-running with `--refresh` (same canonical form as Step 1, so `audit.json` stays the source of truth for delta calculations):

```bash
mkdir -p .commitshow
npx commitshow@0.3.23 audit . --json --refresh \
  > .commitshow/audit.json \
  2> .commitshow/audit.stderr.log
```

## Examples

### Example 1: User asks "is this production-ready?"

```bash
mkdir -p .commitshow
npx commitshow@0.3.23 audit . --json \
  > .commitshow/audit.json \
  2> .commitshow/audit.stderr.log
```

Then surface:

```
Score: 67/100 · band: mid

Top concerns:
  ↓ [Security] members table uses column-level GRANT but paid_audits_credit
    column lacks SELECT grant — silent 42501 on every read
  ↓ [Infrastructure] stripe.checkout.sessions.create called without
    idempotencyKey — duplicate-charge surface

Want me to fix the column GRANT first? Single SQL line.
```

### Example 2: Cross-check a specific concern

User: "show me where the webhook idempotency gap is"

```bash
cat .commitshow/audit.json | jq '.concerns[] | select(.axis=="Infrastructure")'
```

Find the file path in the bullet, read it, confirm the gap matches.

## Best Practices

- ✅ Always cite the exact bullet from `concerns[].bullet` — they're already action-oriented
- ✅ Lead with score + delta in a single sentence, then concerns
- ✅ End with a specific follow-up question naming a concern
- ✅ Read prior `.commitshow/audit.json` before re-running (within 1h)
- ✅ Use `--refresh` after the user merges a fix so the next audit reflects it
- ❌ Don't dump full JSON to the user
- ❌ Don't list strengths unless the user explicitly asks
- ❌ Don't apply fixes without approval — show diff first
- ❌ Don't fault private repos for not auditing — explain why and suggest making public

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- The audit engine is calibrated for **deployed apps** with a live URL. CLI / library / scaffold form gets a partial-substitute score (max ~45/50 on the audit pillar) — fair but not flattering.
- Behind a corporate firewall blocking `*.supabase.co`, the API call fails. There is no offline mode — the audit relies on the public engine.
- Cold audit takes 60-90s. Cached audits (within 7 days) return instantly. `--refresh` force-bypasses cache (counts against rate limits).

## Security & Safety Notes

- The skill executes `npx commitshow@0.3.23 audit ...`, which downloads and runs that exact npm package version locally, then calls the public API at `https://api.commit.show` (proxied to Supabase Edge Functions). Do not replace the exact version with `latest` or a semver range during normal use.
- Treat the CLI as external code with local process privileges. It must not be run in repositories containing secrets or sensitive uncommitted files unless the user has explicitly accepted that risk. No credentials are intentionally sent to the API, but the local process can access files and environment variables available to the current user.
- The CLI writes `.commitshow/audit.{md,json}` in the current working directory. These files are safe to commit (no secrets) but conventionally gitignored as transient artifacts.
- The audit engine **only reads** public GitHub signals. It does not modify the user's repo or push commits.
- All per-finding fix proposals must be shown as diffs and approved by the user before any edit. Never apply without explicit confirmation.

## Common Pitfalls

- **Problem:** Audit returns `not_found` for a private repo
  **Solution:** The engine pulls public GitHub signals only. Either make the repo public or use `--no-network` for local-only deterministic checks.

- **Problem:** Rate limit hit (`429`)
  **Solution:** Wait until next day (limits reset 00:00 UTC) or sign in at commit.show for higher per-repo caps.

- **Problem:** Score seems too low for a polished library / CLI
  **Solution:** The engine biases toward app form. CLI / library / scaffold gets a partial substitute score capped around 45/50 on the audit pillar. Calibration acknowledged trade-off.

- **Problem:** `concerns[]` is empty after re-running
  **Solution:** Re-audit may have hit cache. Use `--refresh` to force-bypass.

## Related Skills

- `@security-review` — In-session line-level security patterns. Run alongside this skill, not in place of.
- `@vibesec` — Editor-buffer security review for vibe-coded projects. Different lens.
- `@owasp-security` — OWASP Top 10 coverage during coding. Companion.
- `@trail-of-bits-skills` — CodeQL / Semgrep static analysis. Different layer.

## Additional Resources

- Canonical repo: <https://github.com/commitshow/production-audit>
- Audit engine source: <https://github.com/commitshow/commitshow/blob/main/supabase/functions/analyze-project/index.ts>
- 14-frame failure framework documented in the engine source above.
- JSON schema: stable at `schema_version: "1"` · additive-only changes.
- CLI: <https://github.com/commitshow/cli>
- Public REST API: `https://api.commit.show/audit?repo=...&format=json`
- skills.sh listing: <https://skills.sh/commitshow/production-audit>
