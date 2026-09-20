---
name: hunt-race-condition
description: Hunting skill for race condition vulnerabilities.
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
sources: github, hackerone_public, portswigger_research, flatt_security
report_count: 10
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

## Firing a race — two primitives (tooling-agnostic)

Winning a race needs requests that arrive in the *same* narrow window — sequential sends never
work. Use a single-packet / synchronized-send tool: **Burp Repeater** "Send group in parallel"
(HTTP/2 single-packet attack), **Turbo Intruder** (`engine=Engine.BURP2`, `gate` sync), or any
client that can flush N requests simultaneously. Two shapes:

- **Identical-copies race** — fire N IDENTICAL copies of one request at once (limit-overrun:
  double-spend a coupon/gift-card, exceed a one-per-user quota). Success = ≥2 of the N return 2xx.
- **Different-requests race (partial construction)** — fire a LIST of DIFFERENT requests in one
  synchronized window, repeated over several rounds. For register-then-confirm / TOCTOU races
  where the object exists in a usable state mid-creation. Example (email-verification bypass —
  register an arbitrary email, then confirm it through the construction window with a blank token):
  ```
  Request A:  POST /register   body: csrf=<csrf>&username=hacker&email=anything@exploit.net&password=pw
  Request B:  GET  /confirm    params: token=   (empty)
  Fire A and B together, repeat ~20 rounds.
  ```
  Get a fresh CSRF from `GET /register` first, then fire the batch. After it succeeds, log in as the
  new account and perform the objective (e.g. a state-changing admin action such as deleting a user).
  The blank-token confirm wins during the window where the user row exists but its verification
  token isn't set yet.

## Crown Jewel Targets

Race conditions are high-severity findings because they break financial, access control, and integrity assumptions that defenders rarely stress-test. Highest payouts come from:

- **Monetary/credit systems** — double-spending gift cards, coupons, referral bonuses, promotional credits, wallet balances
- **Vote/reputation manipulation** — upvoting the same content multiple times, gaming leaderboards or trending algorithms
- **Account limits bypass** — exceeding free-tier quotas, bypassing "one per user" restrictions on invites, trial activations, or API key generation
- **Privilege escalation** — racing role assignment or permission checks during user creation/upgrade flows
- **Deletion bypass** — reading or exfiltrating data during a narrow window between "marked for deletion" and "actually deleted"
- **Payment flows** — charging a card once but receiving multiple fulfillments

**Best-paying asset types:** Fintech apps, SaaS platforms with credit/subscription models, social platforms with reputation systems, e-commerce checkout flows, OAuth/SSO token endpoints.

---

## Attack Surface Signals

### URL Patterns
```
/vote, /upvote, /like, /favorite
/redeem, /apply-coupon, /use-code, /claim
/purchase, /checkout, /confirm-order, /pay
/transfer, /withdraw, /send-money
/invite, /referral, /accept-invite
/upgrade, /activate, /trial
/delete, /deactivate, /cancel
/follow, /subscribe
```

### Response Headers That Signal Race-Prone Backends
```
X-RateLimit-*        # rate limiting exists, but may not be atomic
X-Request-Id         # each request independently tracked
No Cache-Control     # stateful ops not idempotent
```

### JavaScript Patterns to Grep
```javascript
// Single-use action buttons with client-side disable
button.disabled = true
$('#btn').prop('disabled', true)
// Optimistic UI updates (state set before server confirms)
setState({ used: true })
// Sequential async calls without locking
await useVoucher(); await deductBalance();
```

### Tech Stack Signals
- **Ruby on Rails** without `with_lock` / `lock!` — ActiveRecord doesn't lock by default
- **Node.js** with async/await chains — non-atomic DB reads then writes
- **PHP** without `SELECT ... FOR UPDATE` — common in legacy codebases
- **Microservices** — inter-service calls introduce natural TOCTOU windows
- **Redis counters** without Lua scripts or `INCR` atomicity checks
- **Message queues** — idempotency keys often missing

---

## Step-by-Step Hunting Methodology

1. **Enumerate one-time or limited-use actions** — Map every endpoint that enforces a "once per user", "limited quantity", or "deduct balance" constraint. These are your primary targets.

2. **Understand the state machine** — For each target action, identify: (a) what state is read, (b) what state is written, (c) what validation sits between read and write. The gap between read and write is your window.

3. **Capture a clean baseline request** — Perform the action once legitimately with Burp Suite intercepting. Confirm you get the expected single-use behavior (e.g., coupon marked used, vote counted once).

4. **Set up parallel request tooling** — Use one of:
   - Burp Suite Repeater → "Send group in parallel" (Turbo Intruder for HTTP/2 single-packet attacks)
   - Turbo Intruder with `engine=Engine.BURP2` for last-byte sync
   - `curl` with `&` backgrounding
   - Python `threading` or `asyncio` with pre-built connections

5. **Execute the race** — Send 10–50 identical requests simultaneously. Key technique: **pre-connect and buffer all requests, release the final byte of all simultaneously** (single-packet attack when HTTP/2 is available).

6. **Analyze responses** — Look for:
   - Multiple `200 OK` where only one should succeed
   - Duplicate success messages
   - Database constraint errors (signals the race worked but hit the last-line-of-defense)
   - Inconsistent response times (one fast, rest slow = serialized; all same speed = parallel processing)

7. **Verify the effect** — Check the actual state: Was the credit applied twice? Did the vote count increment multiple times? Is the coupon still marked unused despite two successes?

8. **Determine exploitability window** — Re-run with decreasing parallelism (5 requests, 3 requests, 2 requests) to understand how tight the window is and reliability of exploitation.

9. **Test across account types** — Sometimes the race only works for new accounts, specific subscription tiers, or under specific server load. Test varied conditions.

10. **Document reproducibility** — Record exact timing, number of parallel requests needed, and success rate across 5 independent attempts before reporting.

---

## Payload & Detection Patterns

### Turbo Intruder — Basic Parallel Race
```python
# turbo_intruder_race.py
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           engine=Engine.BURP2)  # HTTP/2 single-packet
    for i in range(20):
        engine.queue(target.req, gate='race1')
    engine.openGate('race1')

def handleResponse(req, interesting):
    if '200' in req.status:
        table.add(req)
```

### curl — Parallel Requests (bash)
```bash
# Fire 15 simultaneous vote/redeem requests
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "https://target.com/api/vote" \
    -H "Cookie: session=YOUR_SESSION" \
    -H "Content-Type: application/json" \
    -d '{"report_id": "12345", "vote": "up"}' &
done
wait
```

### Python asyncio Race
```python
import asyncio, aiohttp

async def race_request(session, url, payload, headers):
    async with session.post(url, json=payload, headers=headers) as r:
        return await r.text()

async def main():
    url = "https://target.com/redeem"
    payload = {"code": "GIFT50"}
    headers = {"Cookie": "session=XXXXX"}
    
    async with aiohttp.ClientSession() as session:
        tasks = [race_request(session, url, payload, headers) for _ in range(20)]
        results = await asyncio.gather(*tasks)
    
    for r in results:
        print(r[:100])  # print first 100 chars of each response

asyncio.run(main())
```

### Grep Patterns for Source Code Auditing
```bash
# Look for read-then-write without locking
grep -rn "find_by\|where.*first" --include="*.rb" | grep -v "lock"
grep -rn "SELECT.*WHERE" --include="*.php" | grep -v "FOR UPDATE"

# JavaScript async without atomicity
grep -rn "await.*get\|await.*find" --include="*.js" -A2 | grep "await.*update\|await.*save"

# Python Django ORM without select_for_update
grep -rn "\.get(\|\.filter(" --include="*.py" | grep -v "select_for_update"
```

### HTTP/2 Single-Packet Check
```bash
# Verify target supports HTTP/2 (prerequisite for single-packet attack)
curl -sI --http2 https://target.com | grep -i "HTTP/2\|h2"
```

---

## Common Root Causes

1. **Check-Then-Act without atomic operations** — Developer reads state (`if voucher.used == false`), then writes state (`voucher.update(used: true)`) in two separate database operations. Any thread can read the same "unused" state before either writes.

2. **Missing database-level locking** — Using ORM methods like `find` or `filter` instead of `SELECT ... FOR UPDATE`. The fix is one line but developers don't think about concurrency.

3. **Optimistic concurrency without version checking** — Systems increment counters or mark records without checking if the record changed since it was read.

4. **Microservice TOCTOU** — Service A validates eligibility, Service B executes the action. No shared atomic transaction spans both services.

5. **Client-side "protection"** — Developers disable the button in JavaScript after first click, assuming that prevents duplicate submissions. Server-side logic is never hardened.

6. **Counter increments outside transactions** — `votes_count += 1; save()` instead of an atomic SQL `UPDATE SET votes = votes + 1 WHERE id = ?`.

7. **Async background jobs** — Eligibility checked synchronously, fulfillment done asynchronously. A second request passes the check before the first job completes.

8. **Caching without invalidation** — Cached "has user voted?" check returns stale `false` during a cache miss window when the first write hasn't propagated yet.

---

## Bypass Techniques

### What Defenders Implement (and How to Bypass)

**Defense: Per-user rate limiting**
- Bypass: Rate limits are checked before the action executes. Send requests simultaneously — all pass the rate-limit check before any is counted.

**Defense: Idempotency keys / unique request tokens**
- Bypass: If the server generates or reuses the token, try sending parallel requests without the token. Or check if the uniqueness check itself has a race window.

**Defense: Database unique constraints**
- Bypass: The constraint catches duplicates *after* the race. The first two may both succeed before DB enforces. Look for partial fulfillment — sometimes one succeeds and one errors but both are honored.

**Defense: Short time windows / expiring tokens**
- Bypass: Pre-stage all requests with valid tokens. Use single-packet HTTP/2 to release all in one TCP frame — server processes them in the same scheduler slot.

**Defense: Queue-based serialization**
- Bypass: Multiple queues (or multiple workers consuming the same queue) can pick up duplicate messages. Test by overwhelming the queue during the window.

**Defense: Application-layer mutex / locks**
- Bypass: Distributed systems running multiple app servers don't share in-process locks. Send requests to the same endpoint via different CDN nodes or load-balanced servers.

**Defense: "Already used" checks in application code**
- Bypass: The check and the update are separate. The check passes for both racing requests before either update completes. Only an atomic `UPDATE ... WHERE used=false RETURNING id` truly prevents this.

---

## Gate 0 Validation

Before writing the report, confirm all three:

1. **What can the attacker DO right now?**
   Can you demonstrate — with screenshots or logs — that the same one-time action succeeded more than once? (e.g., vote count shows +2 from one user, credit balance shows double-credit, coupon shows redeemed twice)

2. **What does the victim LOSE?**
   Is there concrete, measurable harm? Financial loss (credits issued in excess), integrity loss (manipulated rankings/votes), or security loss (access granted beyond entitlement)? "The counter went up twice" is only valid if that counter has real-world value.

3. **Can it be reproduced in 10 minutes from scratch?**
   Can you write a 20-line script, run it against a fresh test account, and reliably demonstrate the duplicate effect at least 3/5 attempts? If it requires perfect timing you cannot reliably control, the exploitability claim is weak.

---

## Real Impact Examples

### Scenario 1: Social Platform Vote Manipulation
A bug bounty platform's "popular reports" feature allowed upvotes to improve report visibility and researcher reputation scores. By sending ~15 parallel upvote requests for the same report using a single HTTP/2 connection (single-packet attack), a researcher was able to register 10–15 votes from a single account. This allowed artificial inflation of report rankings, manipulation of researcher reputation scores, and distortion of the platform's crowdsourced prioritization system — directly undermining trust in the platform's core feature for triaging vulnerability reports.

### Scenario 2: Major Social Network — Duplicate Promotional Actions
On a major social network (Facebook-scale), promotional or limited-use actions — such as adding a phone number for a one-time security credit, or claiming a one-time bonus — were vulnerable to simultaneous parallel requests. An attacker could race the claim endpoint and receive the promotional benefit multiple times, causing direct financial loss to the platform and allowing fraudulent accumulation of platform currency or benefits at scale. Given the user volume, even a brief window before patching represented significant financial exposure.

### Scenario 3: Cloud Infrastructure Provider — Resource Limit Bypass
A cloud hosting provider enforced limits on the number of resources (e.g., droplets, projects, or API keys) a free-tier user could create. The limit check and resource creation were non-atomic operations. By racing the creation endpoint with 20 simultaneous requests, an attacker bypassed the enforcement logic and created resources far exceeding their tier limit. This translated directly to unauthorized compute consumption, billing fraud, and abuse of infrastructure — impacting both the provider's revenue and system stability for legitimate users.

---

## Disclosed Report Citations (Backfill +9 — 2016-2024)

The following real, verified bug-bounty / coordinated-disclosure cases extend this skill. Four cases (#4, #11, #12, plus the bonus reference) use the modern **HTTP/2 single-packet attack** technique (Kettle DEF CON 31, 2023; Flatt Security expansion 2024) — the technique that makes most modern race exploits viable today.

4. **GitLab — CVE-2022-4037 email-verification race (Kettle DEF CON 31 case study)** ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-4037) · [PortSwigger Research](https://portswigger.net/research/smashing-the-state-machine))
    - Subclass: password-reset / email-change token race (TOCTOU on email verification)
    - Single-packet HTTP/2: **YES** — flagship case study in "Smashing the State Machine"
    - Payload: two concurrent `POST /-/profile` requests changing email to two different addresses; the verification token sent to address A becomes valid for address B because state transitions weren't atomic
    - Root cause: Devise (Rails auth) builds the confirmation token before the new email is persisted; concurrent updates misroute the token
    - Year: 2022 (disclosed 2023), CVSS 6.4, patched 15.7.2 / 15.6.4 / 15.5.7

5. **Worldcoin (Tools for Humanity) — World ID action-verification race** ([Medium writeup](https://medium.com/@gonzo-hacks/the-fast-and-the-curious-finding-a-race-condition-in-worldcoin-621c89bfbd61))
    - Subclass: vote/upvote inflation (one-human-one-action enforcement bypass)
    - Payload: ~20 parallel requests via Burp "Send in Parallel" against the verification endpoint
    - Root cause: `canVerifyForAction` appended to an array without DB-level locking; fix added `nullifiers` table with atomic UPSERT
    - Year: 2023 — **$3,000** (High)

6. **Stripe — Promotion code redeemed past limit** ([H1 #1717650](https://hackerone.com/reports/1717650))
    - Subclass: coupon double-redemption
    - Payload: create promo with redemption limit = 1; open two payment-link tabs of same merchant, apply coupon in both, click Pay simultaneously → both succeed
    - Root cause: redemption counter incremented post-charge, not atomically with charge; no row-level lock on `promotion_code.times_redeemed`
    - Year: 2022 — **$250**

7. **Stripe — Fee discounts redeemed many times** ([H1 #1849626](https://hackerone.com/reports/1849626))
    - Subclass: wallet/balance double-spend (Connect fee discount could be redeemed repeatedly)
    - Payload: parallel POSTs to redemption endpoint of a one-shot promotional credit before the credit-consumed flag flipped
    - Root cause: non-atomic check-then-decrement on the credit balance object
    - Year: 2023 — **$5,000**, ~$600 platform fee loss per redemption

8. **Reverb.com — Gift card multi-redemption** ([H1 #759247](https://hackerone.com/reports/759247))
    - Subclass: coupon double-redemption (gift card)
    - Payload: capture `POST /gift_cards/redeem` → duplicate N× → fire parallel → balance credited N× from a single card
    - Root cause: gift-card consumption marker written after balance credit, no `SELECT…FOR UPDATE` around the redemption read
    - Year: 2019 — **$1,500** (foundational/widely cited)

9. **Cosmos / Starport faucet — Double-mint race** ([H1 #1438052](https://hackerone.com/reports/1438052))
    - Subclass: wallet/balance double-spend (crypto faucet token issuance)
    - Payload: simultaneous `/faucet/transfer` requests; the `Transfer` Go function executes two state-mutating actions per request, both non-atomic
    - Root cause: faucet handler did not lock per-recipient; transfer() read-modify-write was not serialized
    - Year: 2022 — **$5,000** (CVSS 9.3)

10. **InnoGames — Email-activation race → unlimited diamonds** ([H1 #509629](https://hackerone.com/reports/509629))
    - Subclass: referral abuse multiplier / account-create race (one activation token → multiple "first activation bonus" payouts)
    - Payload: race the email-activation endpoint with the same one-time token before `token_used` flag committed → reward granted on every winning request
    - Root cause: token-consumption flag set in same transaction as reward grant, but transaction isolation level too low (READ COMMITTED)
    - Year: 2019 — **$2,000**

11. **RyotaK / Flatt Security — "First Sequence Sync" PIN-bruteforce (10,000-req single-packet expansion)** ([Flatt Security Research](https://flatt.tech/research/posts/beyond-the-limit-expanding-single-packet-race-condition-with-first-sequence-sync/))
    - Subclass: rate-limit bypass via race / MFA-OTP-validate race (6-digit PIN with 5-attempt cap)
    - Single-packet HTTP/2: **YES** — extends Kettle's single-packet from ~30 requests to 10,000 requests in 166 ms by splitting across IP fragments with synchronized TCP first-sequence
    - Payload: ~10,000 concurrent `POST /verify-pin` requests in 166 ms, each with a different 4-6 digit guess, all landing inside the rate-limit window
    - Root cause: rate-limit counter incremented per-request asynchronously; "5 attempts" gate read stale counter for the entire batch
    - Year: 2024 — **must-reference modern single-packet example**

12. **nopCommerce — CVE-2024-58248 gift-card double-redemption** ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2024-58248))
    - Subclass: coupon double-redemption (e-commerce checkout TOCTOU)
    - Single-packet HTTP/2: **YES** — single-packet attack reproduces it reliably
    - Payload: two parallel `POST /checkout/PlaceOrder` requests both applying the same gift card → both orders complete, gift card balance debited once
    - Root cause: order-placement code path did not implement locking on gift-card balance row → check-then-debit non-atomic
    - Year: 2024 (versions before 4.80.0)

---


## Contents

- [HTTP/2 Single-Packet Attack — Deep Reference](references/details.md)
- [Related Skills & Chains](references/details.md)

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
