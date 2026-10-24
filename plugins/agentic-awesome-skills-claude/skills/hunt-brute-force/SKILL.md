---
name: hunt-brute-force
description: Hunt Missing/Weak Rate Limiting
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: public_research
report_count: 0
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-BRUTE-FORCE — Rate Limiting / Brute Force / Enumeration

> Grounding note: this skill is built from published technique classes, not from a
> curated set of named HackerOne reports. `report_count` is intentionally `0` — do
> not cite an exact payout or report ID you cannot verify. Where a public case is
> well-documented (e.g. Laxman Muthiyah's Instagram password-reset OTP race/rotation
> research, 2019–2021), it is named below as a *technique reference*, not a payout claim.

## Crown Jewel Targets

A uniform six-digit code has 1,000,000 possibilities; account-takeover feasibility depends on effective attempt budgets, binding, lifetime and other controls.

**Highest-value chains:**
- **OTP / 2FA brute → MFA bypass → ATO** — no effective rate limit on `/verify-otp`, full 000000–999999 keyspace reachable
- **Password-reset token brute** — short/predictable/non-expiring tokens + no rate limit → ATO (the Instagram 2019 case combined a 6-digit reset code, no rate limit per request-source, and IP rotation to make 10^6 tractable)
- **Username/email enumeration → targeted credential stuffing** — valid/invalid distinguishable by response string, status code, or timing, use only controlled synthetic identities; never acquire/spray breach corpora
- **Coupon / gift-card / referral code brute** — no rate limit on code validation → financial impact
- **ReDoS** — attacker-controlled input hits a catastrophic-backtracking regex → CPU exhaustion → DoS

---

## Controlled assessment procedure

Absence of a 429 after 3–5 attempts does not prove a missing limiter. Do not use
weak/default passwords, leaked credential corpora, account spraying, full OTP lists,
source/proxy rotation, mass registration or victim lockouts as the default probe.
Use two owner-controlled synthetic accounts and an explicit per-account/global
request, time and concurrency budget below agreed lockout/notification thresholds.
Prefer an isolated test environment with configurable small limits and known state.
Stop on throttling, account lockout, service errors or unexpected real data/messages.

1. Record endpoint/method, expected response, limiter key/window, token lifetime,
   maximum attempts, recovery path and the identity authorized for testing.
2. Establish known-good and known-bad synthetic controls before testing. Keep secrets
   out of command arguments, output, screenshots, predictable `/tmp` files and Git.
3. Exercise the approved tiny budget, recording status, latency, sanitized semantic
   outcome and server-side limiter events. Bound every request timeout/body length.
4. Distinguish account lockout, source throttling, CAPTCHA/challenge, delayed/queued
   processing and dropped submissions. An expired/consumed OTP, changed session or
   downstream failure can also reject a correct code; that is not proof of shadow
   throttling. A timing/body-size change is only a clue.
5. Compare trusted-proxy behavior in the lab with one controlled changed header;
   a restored 200 does not prove authentication attempts are processed or that every
   endpoint’s limits are defeated. Coordinate rather than bypass an active block.
6. For enumeration use only controlled valid/nonexistent identities and a randomized,
   small, preapproved comparison with statistical uncertainty and confounders. Do not
   cause real reset messages or registration churn. State whether information is
   intended public and what actual privacy boundary is crossed.
7. Reconcile persisted server state, clean up fixtures and report coverage/unknowns.
   No vulnerable/clean verdict follows from an incomplete or rejected request.

## Worked OTP feasibility example

For a uniformly random six-digit code, N=1,000,000. If the server permits five unique
attempts per code window, a single-window success probability is at most 5/N = 0.0005%
under the stated assumptions. At 50 requests/second with no other limit, exhaustively
covering N would take 20,000 seconds (~5.56 hours), but that is hypothetical throughput,
not proof a live service sustains it or that the code remains valid. Account/source
limits, cooldowns, code rotation, single-use state and independent windows matter.
Use measured approved limits/configuration and bound uncertainty; never actually
exhaust the keyspace to demonstrate impact. Severity depends on the complete access
boundary and threat model, not the six-digit format alone.

## Token unpredictability

Character-frequency Shannon entropy or a short token sample does not measure the
generator’s cryptographic entropy or predictability. Statistical suites cannot prove
a secure CSPRNG, and a universal 64-bit cutoff is inappropriate for all token types.
Review the generator, randomness source, secret state, format, effective lifetime,
rate limits and token binding. A counter/timestamp may be one public component of a
secure MAC-protected token; demonstrate a synthetic prediction/forgery before claiming
predictability. Do not collect thousands of password-reset emails for a heuristic.

## ReDoS boundary

Never send escalating catastrophic-backtracking inputs to a shared production service.
Review the actual regex/engine, then use a disposable subprocess with a hard wall-time
and memory cap, tiny synthetic cases and same-size benign controls. Remote latency
can reflect network/queue/cache/load; neither doubling latency nor a single slow
request proves regex-driven CPU exhaustion. Record engine/version, regex, input and
local CPU/time evidence without causing a real outage.

## Validation and reporting

- State exact approved scope, tested identities and budget; proposed checks are not results.
- Show a minimal repeatable synthetic unauthorized state transition or measured control
  failure; retain unknown processing/coverage states rather than claim no protection.
- Keep actual tokens/passwords/session cookies private and rotate/delete test artifacts.
- Classify severity by reachability, lifetime, impact and compensating controls; no
  automatic Critical/High from a missing header, sample count or body difference.
- Historical named cases in the overview are unverified technique leads, not payout,
  current-vulnerability or patch-status evidence. Fetch original disclosures before citation.
- No login/OTP/reset request, scanner, statistical test, brute-force or DoS was run here.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; review separately obtained official tools and provenance before installation.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
