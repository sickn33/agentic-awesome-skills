---
name: hunt-tls-network
description: Hunt TLS/SSL and DNS misconfigurations
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
report_count: 6
sources: portswigger_research, ssl_labs_research, hstspreload_org
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

# HUNT-TLS-NETWORK — TLS/SSL & DNS Security

## Reality Check (Read First)

Most findings in this class are **Info/Low and routinely rejected** as "best-practice" / "missing-hardening" by triage. This skill exists to stop you wasting a submission. Two questions before you report anything here:

1. **Is there a real victim and a real action?** "Missing HSTS" is not a vulnerability — *demonstrated session-cookie capture from a victim you MitM'd* is. "Missing CAA" is never a vulnerability you can demonstrate.
2. **Does the program accept it?** Many programs explicitly list missing SPF/DMARC, missing security headers, weak ciphers without exploit, and CAA as **out of scope**. Read scope first; quote the in-scope line in your report.

**What actually pays in this class (in order):**
- **Dangling-CNAME / dangling-A subdomain takeover** — you control content on `target.com` subdomain. Real impact, real bounty. (Owned in depth by `hunt-subdomain`; covered here for the TLS/DNS recon angle.)
- **Spoofable DMARC, proven by delivered-to-inbox email** — not "p=none exists" but an actual mail from `ceo@target.com` landing in a real inbox with a passing/none DMARC verdict in the headers.
- **DNS AXFR returning internal hosts** — full internal hostname/IP map. Concrete recon value, often Medium.
- **mTLS / client-cert bypass on an internal service** — reaching authenticated-only functionality without the cert. Real auth bypass = High.
- **Exploited TLS weakness with a working decrypt/MitM PoC** — almost never achievable remotely in 2024-2026 against a patched stack; see Phase 1 caveats.

**What does NOT pay (do not report standalone):** missing CAA, missing HSTS with no MitM PoC, missing security headers alone, weak-cipher *support* without an exploit, self-signed cert on a non-prod host, TLS 1.0/1.1 *enabled* without a downgrade victim.

---

## Phase 1 — TLS/SSL Audit

```bash
# Quick TLS test with testssl.sh
brew install testssl
testssl.sh --fast $TARGET 2>/dev/null | grep -E "CRITICAL|HIGH|MEDIUM|OK|NOT" | head -30

# Or use sslyze (Python)
pip3 install sslyze
python3 -m sslyze $TARGET --json_out /tmp/sslyze_$TARGET.json 2>/dev/null
cat /tmp/sslyze_$TARGET.json | python3 -m json.tool | grep -i "vulnerability\|insecure\|error" | head -20

# Check certificate expiry and chain
echo | openssl s_client -connect $TARGET:443 -servername $TARGET 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer 2>/dev/null

# Check for weak ciphers manually (a successful handshake = the cipher is OFFERED, not exploitable)
openssl s_client -connect $TARGET:443 -cipher RC4-SHA 2>/dev/null | grep -i "cipher\|handshake"
openssl s_client -connect $TARGET:443 -cipher DES-CBC3-SHA 2>/dev/null | grep -i "cipher\|handshake"

# Protocol downgrade surface — TLS 1.0/1.1 still negotiable?
openssl s_client -connect $TARGET:443 -tls1   2>/dev/null | grep -E "Protocol|Cipher"
openssl s_client -connect $TARGET:443 -tls1_1 2>/dev/null | grep -E "Protocol|Cipher"
```

**Accuracy / triage notes — do not over-claim TLS bugs:**

- **Offered ≠ exploitable.** testssl/sslyze flagging RC4, 3DES, or TLS 1.0 means the server *negotiates* it. That is a hardening finding, **not** a demonstrated decrypt. Without a PoC it is Info/Low and frequently OOS.
- **SWEET32 (CVE-2016-2183)** — 3DES birthday attack. Requires a long-lived TLS session, an on-path attacker, and ~hundreds of GB / hours of same-key traffic. Realistically un-demonstrable in a bug bounty; report only the *support* of 3DES, expect Low/Info.
- **POODLE (CVE-2014-3566)** — SSLv3 CBC padding oracle. Needs **SSLv3 actually enabled**; almost no modern stack offers it. Confirm with `testssl.sh --poodle` (or `nmap --script ssl-poodle`) — modern OpenSSL 3.x dropped the `-ssl3` flag. If SSLv3 won't negotiate, there is no POODLE.
- **FREAK (CVE-2015-0204)** and **DROWN (CVE-2016-0800)** — require export-grade RSA / a shared SSLv2 endpoint respectively. Both are pre-conditions you must *prove present*, not assume. DROWN needs SSLv2 reachable on *some* host sharing the cert/key — scan for SSLv2 with `testssl.sh --drown` (or `nmap --script sslv2-drown`) across the cert's SAN list before claiming it; modern OpenSSL has no `-ssl2` flag.
- **Heartbleed (CVE-2014-0160)** — if you genuinely find an unpatched OpenSSL 1.0.1 leaking memory, that *is* High/Critical with a real PoC (dump containing keys/cookies). Verify with `testssl.sh --heartbleed` and capture leaked bytes; this is the rare TLS bug worth a full report.

---

## Phase 2 — HSTS Check

```bash
# Check HSTS header on main domain and all subdomains
curl -sI "https://$TARGET/" | grep -i "strict-transport-security"
# Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Check critical subdomains (login, api, auth)
for sub in login auth api account pay www; do
  HSTS=$(curl -sI "https://$sub.$TARGET/" 2>/dev/null | grep -i "strict-transport-security")
  if [ -z "$HSTS" ]; then
    echo "[!] MISSING HSTS: https://$sub.$TARGET/"
  else
    echo "[OK] $sub.$TARGET: $HSTS"
  fi
done

# Check HTTP (non-HTTPS) redirect
curl -sI "http://$TARGET/" | grep -i "location"
# Should redirect to HTTPS immediately

# HSTS preload check
curl -s "https://hstspreload.org/api/v2/status?domain=$TARGET" | python3 -m json.tool 2>/dev/null
```

---

## Phase 3 — DNS Zone Transfer (AXFR)

```bash
# Find nameservers
dig NS $TARGET +short

# Attempt zone transfer on each nameserver
for NS in $(dig NS $TARGET +short); do
  echo "=== Trying AXFR from $NS ==="
  dig AXFR $TARGET @$NS 2>/dev/null | grep -v "^;" | head -30
done

# Zone transfer via alternative tools
host -t AXFR $TARGET $(dig NS $TARGET +short | head -1) 2>/dev/null | head -30
nmap -sn --script dns-zone-transfer $TARGET 2>/dev/null | head -30

# If AXFR succeeds → full internal hostname map
# Look for: internal IPs, staging servers, admin hostnames, CI/CD servers
```

---

## Phase 4 — Email Security (SPF/DKIM/DMARC)

```bash
# Check SPF record
dig TXT $TARGET +short | grep "v=spf1"
# Missing SPF → potential email spoofing

# Check DMARC
dig TXT _dmarc.$TARGET +short
# Missing DMARC → attacker can send as @target.com with no enforcement

# Check DKIM selectors (common: default, google, mail, k1)
for selector in default google mail k1 selector1 selector2 s1 s2 dkim; do
  RESULT=$(dig TXT $selector._domainkey.$TARGET +short 2>/dev/null)
  [ -n "$RESULT" ] && echo "DKIM selector found: $selector → $RESULT"
done

# --- Spoofability evaluation (heuristic only; PROOF is the swaks test below) ---
SPF=$(dig +short TXT $TARGET | tr -d '"' | grep -i "v=spf1")
DMARC=$(dig +short TXT _dmarc.$TARGET | tr -d '"' | grep -i "v=DMARC1")

# SPF "+all" / "all" with no qualifier = pass-everything = spoofable from any IP
echo "$SPF" | grep -Eq '[+ ]all($|[^-~?])' && echo "[CRITICAL] SPF passes all senders (+all)"
echo "$SPF" | grep -q "~all" && echo "[INFO] SPF softfail (~all) — may still deliver to inbox"
[ -z "$SPF" ] && echo "[INFO] No SPF record"

# Correct DMARC-absence check: test the variable for emptiness, do NOT pipe dig|wc -c
if [ -z "$DMARC" ]; then
  echo "[INFO] No DMARC record (no published policy)"
else
  POLICY=$(echo "$DMARC" | grep -oiE 'p=[a-z]+' | head -1)
  echo "[INFO] DMARC present: $POLICY"
  echo "$POLICY" | grep -qi "p=none" && echo "  -> p=none: monitors only, does NOT block spoofed mail"
  echo "$POLICY" | grep -qiE "p=(quarantine|reject)" && echo "  -> enforcing policy: spoofing likely blocked at receiver"
fi
```

**Why the original `dig ... | wc -c | grep '^1$'` check was broken:** empty `dig +short` output is a zero-length string; piped through `wc -c` it usually yields `0`, and the surrounding newline handling is shell-dependent, so the `^1$` match misfires both ways. Always capture into a variable and test `[ -z "$VAR" ]`.

### Spoofability is a RECEIVER decision, not a record-reading exercise

Do not report "missing DMARC = email spoofing" from `dig` output alone. DMARC `p=none` (or absent) means the **sending domain published no enforcement** — but the **receiving** mail provider (Gmail, M365, the program's own MX) may still junk or reject your spoof based on SPF, its own heuristics, or ARC. The only proof that survives triage is a **message you delivered to a real inbox**.

```bash
# PROOF: send a spoofed mail and confirm INBOX delivery (use a tester account you own)
# Use an account on the receiver the program actually uses (check their MX: dig MX $TARGET)
swaks --to your-tester@gmail.com \
      --from "CEO <ceo@$TARGET>" \
      --header "Subject: [TEST] DMARC spoof PoC for $TARGET" \
      --body "Authorized bug-bounty test. Spoofed from-domain: $TARGET" \
      --server <an-smtp-relay-you-control-or-localhost>
```

**Confirmation gate — a spoof PoC is only valid if you can show:**
1. The message landed in **Inbox** (not Spam/Junk), screenshot the folder.
2. The raw headers: `Authentication-Results:` showing `dmarc=none|fail` AND the mail was still **delivered** (not bounced). A bounce or a Spam-folder landing is NOT a finding — note it and move on.
3. The visible `From:` shows `@$TARGET` to the recipient (header-from spoof, the one that matters for phishing), not just an `envelope-from` trick.

Severity is **Medium at best**, and only if delivered-to-inbox. Many programs mark email-auth findings OOS outright — check scope first.

---

## Phase 5 — Security Headers Audit

```bash
# Check all security headers
HEADERS=$(curl -sI "https://$TARGET/")

# Check each critical header
for HEADER in "Strict-Transport-Security" "Content-Security-Policy" "X-Frame-Options" \
              "X-Content-Type-Options" "Referrer-Policy" "Permissions-Policy"; do
  RESULT=$(echo "$HEADERS" | grep -i "$HEADER")
  if [ -z "$RESULT" ]; then
    echo "[MISSING] $HEADER"
  else
    echo "[OK] $HEADER: $RESULT"
  fi
done

# Automated security headers check
curl -s "https://securityheaders.com/?q=https://$TARGET&followRedirects=on" | \
  grep -oP "grade-\K[A-F+]" | head -3
```

---

## Phase 6 — Certificate Transparency (Subdomain Discovery)

```bash
# crt.sh — certificate transparency logs
curl -s "https://crt.sh/?q=%25.$TARGET&output=json" | \
  python3 -m json.tool 2>/dev/null | grep "name_value" | \
  grep -oP '"name_value": "\K[^"]+' | \
  sed 's/\*\.//g' | sort -u > recon/$TARGET/ct-subdomains.txt

echo "[+] CT subdomains found: $(wc -l < recon/$TARGET/ct-subdomains.txt)"

# Compare with existing subdomain list
comm -23 <(sort recon/$TARGET/ct-subdomains.txt) \
         <(sort recon/$TARGET/subdomains.txt 2>/dev/null) | head -20
# New entries = recently issued certs = new services to investigate
```

---

## Phase 6.5 — Dangling Records → Subdomain Takeover (the finding that actually pays)

This is the highest-impact item in the whole skill. A CNAME/A record pointing at a deprovisioned third-party resource (S3 bucket, Azure CDN/App Service, GitHub Pages, Heroku, Fastly, etc.) lets you claim that resource and serve content from `*.target.com`. Full depth lives in `hunt-subdomain`; here is the TLS/DNS-recon entry point.

```bash
# For each subdomain from CT logs, resolve the CNAME chain and check for a live origin
while read sub; do
  CNAME=$(dig +short CNAME "$sub" | head -1)
  [ -z "$CNAME" ] && continue
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "https://$sub/" 2>/dev/null)
  echo "$sub -> $CNAME  [http $CODE]"
done < recon/$TARGET/ct-subdomains.txt | tee recon/$TARGET/cname-map.txt

# Flag CNAMEs that point at known takeoverable providers, then confirm the
# fingerprint string in the body (e.g. "NoSuchBucket", "There isn't a GitHub Pages site here",
# "Fastly error: unknown domain", "The specified bucket does not exist", Azure "Web App - Unavailable").
```

**Validation gate — a takeover claim requires you to actually claim it:**
1. Confirm the dangling target is **unregistered/claimable** (the S3 bucket name is free, the Heroku app does not exist, etc.) — the provider error fingerprint alone is necessary but NOT sufficient.
2. **Register the resource yourself** and serve a unique canary file, e.g. `https://$sub/<random>.txt` returning a string only you know. Screenshot it served over the victim subdomain with valid TLS.
3. Tear it down immediately after PoC; never leave attacker-controlled content live on the target's domain.

Impact: cookie scope theft (cookies set for `.target.com`), OAuth `redirect_uri`/CORS-trust abuse, phishing on a trusted origin. Typically **High** (Critical if it sits at an OAuth/SSO redirect or shares session cookies).

---

## Phase 7 — CAA Records (recon signal only — NOT a reportable finding)

```bash
# CAA records DECLARE which CAs the domain owner permits to issue certs.
dig CAA $TARGET +short
dig CAA "*.$TARGET" +short
```

**Do NOT report "missing CAA" as a vulnerability.** This is the most common false positive in this class. Correct framing:

- A **missing CAA record does not let any attacker obtain a certificate.** It only means the owner has not *opted into* restricting which CAs may issue. With or without CAA, an attacker still needs to pass Domain Control Validation (HTTP-01 / DNS-01 / email) — which requires already controlling the domain, DNS, or web root.
- The "fraudulent issuance" scenario requires **CA compromise or social-engineering a CA** into mis-issuing. That is out of scope for essentially every bug-bounty program and is not something you can demonstrate. CAA enforcement is a CA-side control, not an attacker-facing surface.
- CAA is **Info-tier hardening at most**, and routinely closed as Won't-Fix / OOS. Mention it in a recon notes appendix if at all; never file it standalone.

**Where CAA recon IS useful (no finding, just intel):** the `issue`/`issuewild` values tell you which CA the org uses (e.g. `letsencrypt.org`, `digicert.com`, `amazon.com`). That hints at automation (ACME) and at where a *real* takeover (Phase 6.5 dangling records) could let you mint a valid cert via DCV because you'd control the host.

---

## Phase 8 — mTLS Bypass Attempts

```bash
# Check if endpoint requires client certificate
curl -sk "https://$TARGET/internal/" 2>&1 | grep -i "ssl\|certificate\|403\|401"

# Try without client cert (should fail)
curl -sk --cert "" "https://$TARGET/internal/api" | head -5

# Try common bypass paths (some apps skip mTLS on health checks)
for path in /health /ping /status /metrics /api/health; do
  STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "https://$TARGET$path")
  echo "$path: $STATUS"
done

# Header-injection bypass — nginx/HAProxy/Envoy commonly terminate mTLS at the edge and
# forward the verdict as a request header the backend trusts. If the edge does NOT strip
# client-supplied copies of that header, you spoof a verified client. Try the real header
# names used by each proxy:
for combo in \
  "X-SSL-Client-Verify: SUCCESS|X-SSL-Client-S-DN: CN=admin" \
  "ssl-client-verify: SUCCESS|ssl-client-subject-dn: CN=admin" \
  "X-Client-Verify: SUCCESS|X-Client-DN: CN=admin,O=target" \
  "X-Forwarded-Client-Cert: By=spiffe://x;Hash=0;Subject=\"CN=admin\""; do
  H1="${combo%%|*}"; H2="${combo##*|}"
  echo "== $H1 / $H2 =="
  curl -sk "https://$TARGET/internal/api" -H "$H1" -H "$H2" -o /dev/null -w "%{http_code}\n"
done
```

**mTLS-bypass validation — this is a real auth bypass, so prove access, not just a status code:**
- A `200` could be a generic page. Confirm you reached **authenticated-only functionality**: show data/an action that is impossible without the client cert (e.g. an admin-only object, an internal-only response body).
- Distinguish *server policy* from *server state*: a `403` flipping to `200` with the spoofed header is meaningful; a `200` for both with and without the header means the path was never protected (no finding).
- For the bypass-path angle (`/health`, `/metrics`): only a finding if that endpoint exposes **sensitive data** (internal IPs, build secrets, Prometheus metrics revealing internal topology) — an empty `200 OK` health probe is not.
- Capture the request/response pair in Burp Repeater so the spoofed header → privileged response is unambiguous.

---

## Chain Table

Severities below are calibrated to what triage actually accepts. They are deliberately conservative; do not inflate them in a report.

| TLS/DNS finding | Realistic standalone severity | Notes / what raises it |
|----------------|------|------|
| Dangling-CNAME subdomain takeover (claimed + canary served) | **High** | Critical if at OAuth `redirect_uri`/SSO or sharing `.target.com` session cookies |
| mTLS / client-cert bypass reaching authed functionality | **High** | Must show privileged data/action, not just a 200 |
| AXFR returning internal hosts/IPs | **Medium** | Recon value; pairs with internal-service findings |
| Spoofable DMARC, **delivered to a real inbox** (PoC headers) | **Medium** | Often OOS — check scope; Inbox (not Spam) + delivered required. *Reading `p=none` from `dig` alone = Info, do not file* |
| Heartbleed / live memory leak with captured secrets | **High–Critical** | Only with an actual dump containing keys/cookies |
| Missing HSTS on auth subdomain | **Low / Info** | NOT High — exploitation needs an active MitM position you cannot demonstrate remotely; report only with a working downgrade-capture PoC |
| Weak cipher *support* (RC4/3DES/SWEET32) with no decrypt PoC | **Info / Low** | Hardening only; frequently OOS |
| Missing CAA | **Info (do not file)** | Absence does not enable issuance; not attacker-demonstrable |

---

## Tools

```bash
# testssl.sh — comprehensive TLS audit
brew install testssl
testssl.sh $TARGET

# sslyze — Python TLS scanner
pip3 install sslyze

# MXToolbox for email security
curl -s "https://mxtoolbox.com/api/v1/Lookup/spf?argument=$TARGET" 2>/dev/null

# dmarc-inspector
curl -s "https://dmarcian.com/dmarc-inspector/?domain=$TARGET" 2>/dev/null
```

---

## Validation

Each finding ships only with the proof listed — never the `dig`/header output alone.

- **Subdomain takeover:** you registered the dangling resource and served a unique canary over `https://sub.target.com/` with valid TLS. Screenshot + canary string. (Tear down after.)
- **mTLS bypass:** spoofed client-verify header returns *privileged* data/action that the cert-required path otherwise denies. Burp request/response pair.
- **AXFR:** zone transfer returns internal hostnames/IPs from an authoritative NS. Full transcript.
- **DMARC spoof:** swaks-sent mail with `From: @target.com` **delivered to a real Inbox** (not Spam), raw `Authentication-Results` headers attached. A bounce or Spam landing = no finding.
- **HSTS missing:** only reportable with a working downgrade PoC capturing a victim cookie over plaintext — otherwise it is best-practice noise.

**Severity (conservative — matches the Chain Table):**
- Subdomain takeover (claimed): High (Critical at OAuth/SSO redirect or shared session cookie)
- mTLS bypass to authed functionality: High
- AXFR returning internal hosts: Medium
- DMARC spoof delivered-to-inbox: Medium (often OOS — verify scope)
- HSTS missing on auth (with downgrade PoC): Low–Medium; without PoC: Info
- Weak cipher support without decrypt PoC: Info–Low
- Missing security headers / missing CAA only: Info (usually do not file)

**Pre-submission scope gate:** before filing ANY item here, confirm the program does not list it as out of scope (email-auth, missing-headers, weak-TLS-without-exploit, and CAA are commonly OOS). Quote the in-scope line in your report.

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
