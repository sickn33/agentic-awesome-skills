---
name: hunt-subdomain
description: Hunting skill for subdomain takeover vulnerabilities.
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
sources: github, hackerone_public, binarysecurity_research, can-i-take-over-xyz_research
report_count: 3
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

## Crown Jewel Targets

Subdomain takeover is high-value because it allows an attacker to serve content from a **trusted, company-owned domain** — bypassing browser same-origin trust, phishing filters, and user skepticism simultaneously.

**Highest payout contexts:**
- Subdomains of major SaaS brands (Shopify, Snapchat, Mozilla, Yelp) where the trusted domain has user session context
- CDN-backed subdomains (Fastly, CloudFront) where CNAME points to unclaimed origins
- Third-party service integrations: UserVoice, WordPress.com, GitHub Pages, GitLab Pages, Heroku, Zendesk
- Preview/staging/dev subdomains (`new.`, `preview.`, `course.`, `delivery.`, `addons-preview.`) — abandoned after feature launches
- Subdomains used for OAuth redirect URIs or SSO endpoints — these pay highest

**Asset types that matter most:**
- CNAME records pointing to deprovisioned third-party services
- NS delegations to abandoned zones
- A records pointing to unallocated cloud IPs (less common)
- GitLab/GitHub Pages with unclaimed project namespaces

---

## Attack Surface Signals

**DNS signals:**
- `CNAME` pointing to `*.github.io`, `*.gitlab.io`, `*.fastly.net`, `*.herokudns.com`, `*.wordpress.com`, `*.uservoice.com`, `*.zendesk.com`, `*.s3.amazonaws.com`, `*.azurewebsites.net`, `*.netlify.app`
- NXDOMAIN or `SERVFAIL` on the CNAME target while the parent record still exists
- NS records delegating to registrars where the zone is no longer registered

**HTTP response signals:**
- `"There isn't a GitHub Pages site here"`
- `"NoSuchBucket"` (S3)
- `"The specified bucket does not exist"`
- `"No such app"` (Heroku)
- `"Sorry, this shop is currently unavailable"` (Shopify)
- `"This UserVoice subdomain is available"`
- `"Do you want to register"` (any domain parking page)
- HTTP 404 with provider-specific error templates
- Fastly: `"Fastly error: unknown domain"`
- `"404 Web Site not found"` (Azure App Service)

**Tech stack signals:**
- Response headers: `X-Served-By: cache-*` (Fastly), `X-GitHub-Request-Id`, `Server: Netlify`
- `CNAME` chain resolving to provider infrastructure but returning provider 404
- SSL cert issued to provider wildcard (`*.fastly.net`) rather than company domain

---

## Step-by-Step Hunting Methodology

1. **Enumerate all subdomains** for the target using passive + active sources:
   - `subfinder -d target.com -all`
   - `amass enum -passive -d target.com`
   - `assetfinder --subs-only target.com`
   - Certificate transparency: `crt.sh/?q=%.target.com`

2. **Resolve all subdomains** and flag those with:
   - NXDOMAIN responses
   - CNAME pointing to a third-party provider
   ```bash
   cat subdomains.txt | dnsx -a -cname -o resolved.txt
   ```

3. **Cross-reference CNAMEs** against known vulnerable provider fingerprints using `nuclei` or `subjack`:
   ```bash
   subjack -w subdomains.txt -t 100 -timeout 30 -ssl -c fingerprints.json
   nuclei -l subdomains.txt -t takeovers/
   ```

4. **Manual verification** for each flagged subdomain:
   - `dig CNAME subdomain.target.com` — confirm CNAME exists
   - `dig A <cname-target>` — confirm NXDOMAIN or no resolution
   - `curl -sk https://subdomain.target.com` — check for provider error string

5. **Confirm claimability** — attempt to register the resource:
   - GitHub Pages: check if `<username>.github.io/<repo>` or org page is unclaimed
   - GitLab Pages: check project namespace
   - S3: attempt `aws s3api create-bucket --bucket <bucketname>`
   - UserVoice/Zendesk/WordPress: visit registration URL
   - Fastly: check if origin hostname is unregistered

6. **Claim the resource** (only enough to prove control — do NOT serve malicious content):
   - Create a minimal index page with your HackerOne username and a timestamp
   - Take screenshot showing your content served on `subdomain.target.com`

7. **Document the chain**: CNAME record → provider target → unclaimed resource → your content

8. **Assess impact escalation**:
   - Does the subdomain appear in OAuth redirect allowlists?
   - Does it share cookies with parent domain (`domain=.target.com`)?
   - Is it referenced in the app's CSP?
   - Can it receive authenticated API calls?

9. **Write report** before releasing the claim (some programs want to verify first)

---

## Payload & Detection Patterns

**Bulk CNAME extraction and NXDOMAIN detection:**
```bash
# Extract CNAMEs and check if target resolves
while read sub; do
  cname=$(dig +short CNAME "$sub" | head -1)
  if [ -n "$cname" ]; then
    result=$(dig +short A "$cname")
    if [ -z "$result" ]; then
      echo "[POTENTIAL] $sub -> $cname (NXDOMAIN)"
    fi
  fi
done < subdomains.txt
```

**Nuclei takeover scan:**
```bash
nuclei -l subdomains.txt -t ~/nuclei-templates/http/takeovers/ -severity medium,high,critical
```

**subjack with SSL:**
```bash
subjack -w subdomains.txt -t 100 -timeout 30 -ssl -c $GOPATH/src/github.com/haccer/subjack/fingerprints.json -v
```

**Provider fingerprint grep patterns:**
```bash
curl -sk "https://$subdomain" | grep -iE \
  "there isn't a github pages|no such bucket|no such app|this uservoice|fastly error: unknown domain|do you want to register|sorry, this shop|project not found|404 not found|unclaimed"
```

**Check if subdomain is in scope for cookies (shared parent domain):**
```bash
curl -Isk "https://target.com" | grep -i "set-cookie" | grep "domain=.target.com"
```

**Fastly-specific detection:**
```bash
curl -sI "https://subdomain.target.com" -H "Host: subdomain.target.com" | grep -i "fastly\|x-served-by\|x-cache"
curl -sk "https://subdomain.target.com" | grep -i "fastly error"
```

**S3 unclaimed bucket check:**
```bash
aws s3api head-bucket --bucket <extracted-bucket-name> 2>&1 | grep -i "NoSuchBucket\|403\|404"
```

**GitLab Pages specific:**
```bash
dig CNAME sub.target.com
# If pointing to *.gitlab.io — visit the gitlab.io URL directly
# 404 from gitlab.io project = claimable
```

---

## Common Root Causes

1. **Service offboarding without DNS cleanup** — Developer removes a Heroku app, UserVoice account, or WordPress site but never deletes the CNAME record. DNS lives forever; service does not.

2. **Staging/preview infrastructure abandoned post-launch** — `course.`, `new.`, `preview.`, `beta.` subdomains provisioned for a product launch, pointed at a third-party, then forgotten when the campaign ends.

3. **Subdomain provisioned by a third-party team** — Marketing sets up a UserVoice or Zendesk subdomain via IT, product sunset kills it, but DNS is owned by engineering who doesn't know.

4. **CDN misconfiguration without origin validation** — Fastly and similar CDNs historically allowed any domain to "claim" a backend hostname by creating a service pointing to it. Unregistered origin hostnames become claimable.

5. **GitHub/GitLab Pages namespace not reserved** — Organization renames, user accounts deleted, or repos made private/deleted while the Pages CNAME still points to the old namespace.

6. **Wildcard DNS entries** — `*.target.com` pointing to a cloud provider means *any* unclaimed subdomain potentially resolves to claimable infrastructure.

7. **Acquired/divested company DNS not cleaned** — Post-acquisition, former brand subdomains (like `oberlo.com` under Shopify) retain CNAMEs to services that are no longer paid for.

---

## Bypass Techniques

**Defense: Manual fingerprint review before publishing**
- Bypass: Use alternative error strings — providers change their 404 pages. Maintain an up-to-date fingerprint list. Some providers show *different* errors on HTTP vs HTTPS. Test both.

**Defense: Scope restrictions (only main domain in scope)**
- Bypass: Check program's asset list carefully — `*.target.com` wildcards often include subdomains implicitly. Escalate impact to get it in scope.

**Defense: "Can't reproduce" responses due to timing**
- Bypass: Screenshot immediately after claiming. Record a video walkthrough. The window can be short for popular subdomains.

**Defense: HTTPS certificate mismatch blocking proof**
- Bypass: Some providers (GitHub Pages, Netlify) auto-provision TLS for claimed domains. Others don't — show HTTP takeover and note TLS would be resolved by provider on claim.

**Defense: Provider-side validation (Fastly verifying domain ownership)**
- Bypass: Some Fastly configurations don't validate origin hostnames. Check if the CNAME target is a generic Fastly backend hostname vs. a customer-verified one. Try claiming anyway and observe behavior.

**Defense: Rate limiting on subdomain enumeration**
- Bypass: Use passive-only sources (SecurityTrails, Shodan, crt.sh, VirusTotal) to avoid triggering WAF/IDS. DNS resolution doesn't touch the web server.

**Defense: Program claims "low severity / no impact"**
- Bypass: Demonstrate same-origin cookie theft, OAuth redirect abuse, or CSP bypass to escalate. Find if the subdomain is listed in any `postMessage` `targetOrigin` checks in JS.

---

## Gate 0 Validation

1. **What can the attacker DO right now?**
   Can you register the unclaimed resource (GitHub repo, S3 bucket, Heroku app, UserVoice account) and serve arbitrary content — including phishing pages, credential harvesters, or malicious scripts — under the target's trusted domain name?

2. **What does the victim LOSE?**
   Users lose trust and safety: they see a company-branded URL serving attacker content. The company loses brand integrity, potentially leaks session cookies if the subdomain is in `domain=.target.com` scope, and may have OAuth/SSO flows hijacked. Depending on CSP configuration, XSS against the main application may be possible.

3. **Can it be reproduced in 10 minutes from scratch?**
   - `dig CNAME subdomain.target.com` → confirms CNAME to provider
   - `curl -sk https://subdomain.target.com` → confirms provider error string
   - Visit provider registration page → confirms namespace is available
   - Screenshots of all three steps = reproducible in under 10 minutes

If you cannot show the provider resource is *currently unclaimed and claimable*, it is not a valid report.

---

## Real Impact Examples

**Scenario A — Trusted Brand Phishing via Abandoned SaaS (Snapchat/UserVoice)**
An attacker finds `feedback.snapchat.com` CNAME pointing to a UserVoice subdomain. The UserVoice account was cancelled but the DNS record remained. The attacker registers the matching UserVoice subdomain for free, gaining control of `feedback.snapchat.com`. Any user navigating to that URL — perhaps from old bookmarks or Google results — sees attacker-controlled content on a Snapchat-branded domain. Since the domain is trusted by browsers, phishing campaigns sent from this subdomain bypass email security filters that check domain reputation.

**Scenario B — CDN Origin Takeover Enabling Same-Origin Attacks (Mozilla/Fastly)**
`addons-preview-cdn.mozilla.net` had a CNAME pointing to a Fastly origin hostname that was no longer registered to Mozilla's Fastly account. An attacker could create a Fastly service claiming that origin hostname, causing all requests to `addons-preview-cdn.mozilla.net` to be routed to attacker-controlled Fastly infrastructure. Since the subdomain shares the `mozilla.net` domain, it could be leveraged to serve malicious CDN assets that appear to come from Mozilla's infrastructure, potentially bypassing CSP rules that allowlist `*.mozilla.net`.

**Scenario C — Staging Subdomain Abandoned Post-Product Migration (Rails/GitHub Pages)**
`new.rubyonrails.org` was pointed at a GitHub Pages deployment for a website redesign project. After the new site launched and the old GitHub repo was deleted or made private, the DNS CNAME remained. An attacker could fork or create a matching GitHub Pages repository and claim the namespace, serving content under `new.rubyonrails.org`. Because this is the official Ruby on Rails domain, any content served there — including fake download links or malicious gems — carries the full trust of the Rails brand.

---

## Disclosed Report Citations (2022-2023)

The following coordinated-disclosure / writeup cases extend this skill with **modern provider fingerprints** (Vercel/Azure cloudapp/Zendesk era) and explicit ATO-chain examples. Citations #12 and #13 are external writeups (not disclosed HackerOne reports) — treat their payout figures as unverified; only #14 has a public H1 report ID.

12. **Microsoft Azure DevOps — Two `cloudapp.azure.com` subdomains + wildcard `*.visualstudio.com` OAuth reply_to → 1-click ATO** ([Binary Security writeup](https://www.binarysecurity.no/posts/2022/11/azure-devops-takeover))
    - Subclass: Azure `cloudapp.azure.com` regional-pool dangling CNAME — chained to ATO
    - ATO chain: **YES** — `app.vssps.visualstudio.com/_signin?reply_to=https://feedsprodwcus0dr.feeds.visualstudio.com/` whitelisted any `*.visualstudio.com`. Attacker claimed the dangling Azure VM hostnames, then crafted sign-in URLs that returned JWT + FedAuth tokens to attacker-controlled endpoints
    - Claim flow: identify dangling `cloudapp.azure.com` CNAME, deploy a free-tier VM in the same Azure region requesting the exact released hostname, Azure re-issues the name first-come-first-serve
    - Year: reported Feb 2021, disclosed Nov 2022 — MSRC explicitly out-of-scope (relied on subdomain takeover), $0

13. **Anonymous H1 — `admin-support.xyz.com` → unclaimed Zendesk → email interception → ATO** ([Writeup by 0xprial](https://0xprial.com/the-art-of-zendesk-hijacking/))
    - Subclass: Zendesk help-desk takeover via `xyzdocs.zendesk.com` host-mapping
    - ATO chain: **YES** — researcher configured email forwarding on the hijacked Zendesk instance, intercepted `support@xyz.com` tickets containing payment info + password-reset emails, then triggered password resets on customer accounts that delivered reset links into the attacker's Zendesk inbox
    - Claim flow: `dig CNAME` returns `xyzdocs.zendesk.com` (unregistered) → register free Zendesk trial → add `xyzdocs` as subdomain → enable host-mapping for `admin-support.xyz.com`
    - Year: 2023 — payout per the 0xprial writeup (blog source; no public HackerOne report ID, treat as unverified)

14. **Vercel deleted-project takeover** — a dangling `cname.vercel-dns.com` CNAME pointing to a removed Vercel project can be re-claimed by deploying a new project under that name.
    - Subclass: Vercel dangling CNAME (`cname.vercel-dns.com`) after project deletion
    - Impact: crypto-DEX phishing — `proxies.` subdomain trusted for RPC proxy routing; attacker could serve malicious wallet-drain JS under a "trusted" subdomain
    - Claim flow: subdomain returns Vercel 404 `DEPLOYMENT_NOT_FOUND` → create free Vercel project → Settings → Domains → add `proxies.sifchain.finance` — Vercel verifies the existing CNAME and auto-issues TLS without out-of-band ownership proof
    - Year: 2022 — Sifchain treated as Critical (web3 phishing vector)

**Fastly CDN dangling-service technique (general, not a single disclosed report):**
- Fingerprint: subdomain returns `Fastly error: unknown domain. Please check that this domain has been added to a service`
- Claim flow: sign up for Fastly free trial → create new CDN service → attach the dangling hostname as the service domain
- Root cause: Fastly historically does not verify CNAME ownership on service-creation; any CNAME pointing into Fastly's anycast can be attached to a fresh service
- Potential ATO chain: chains to CSP-bypass + JS-injection if the parent domain trusts the `assets.`/CDN host for `script-src`

---

## Chains & Compositions (Senior Hunting)

Subdomain takeover by itself is Low-Medium / Informational on most mature programs — defacement of a non-business-critical subdomain is unsexy. The chain payout is 10-100x the standalone. **Every takeover should be evaluated against the five chains below before submission.** If none apply, you have a Low; if one applies, you have a High; if two compose, you have a Critical.

### Chain 1 — Takeover + OAuth `redirect_uri` Whitelist → Auth-Code Theft → 1-Click ATO

- **A.** Enumerate the OAuth `redirect_uri` allowlist via `/oauth/authorize` flow. Look for any wildcard `*.target.com` or any takeover-candidate hostname in the static list (e.g., `feedsprod.feeds.visualstudio.com`, `legacy.target.com`).
- **B.** Find a takeover-able subdomain in that allowlist. Claim it via the provider's onboarding (Vercel project, Azure cloudapp regional pool, S3 bucket, Heroku app, Zendesk, Shopify storefront — see the Disclosed Report Citations above).
- **C.** Host an OAuth callback receiver on the claimed subdomain. Send victim to `/oauth/authorize?redirect_uri=https://legacy.target.com/cb&response_type=code&client_id=<legit>`. Victim's browser already has session → auth happens transparently → auth code lands on attacker host. Exchange via token endpoint → ATO.
- **Impact:** Persistent 1-click ATO across every user of the target. OAuth flow is implicit-to-the-user (no consent screen if previously consented), so requires only a single click on attacker's link.
- **Real shape:** Microsoft Azure DevOps `cloudapp.azure.com` + wildcard `*.visualstudio.com` reply_to chain (Binary Security, Nov 2022 — Disclosed Report Citation #12). Multiple H1 disclosures on SaaS programs with permissive OAuth allowlists.

### Chain 2 — Takeover at Sibling Subdomain + Cookie-Domain Wildcard → Session Fixation on Parent App

- **A.** Inspect cookies set by the main app (`app.target.com`). If `Set-Cookie` has `Domain=.target.com` (parent-scoped) instead of host-only, cookies bleed to every sibling subdomain — including taken-over ones.
- **B.** Take over any sibling (`legacy.target.com`, `feedback.target.com`, `assets.target.com`). The taken-over host can now `Set-Cookie` for the parent domain.
- **C.** Plant `Set-Cookie: SESSIONID=<attacker_session>; Domain=.target.com` via a script on the taken-over host. Victim visits `app.target.com` with attacker's session cookie attached. Server treats them as the attacker's account → session-fixation ATO.
- **Impact:** ATO without OAuth or password reset — pure cookie-domain bleed. Especially effective when the parent app uses a non-`__Host-` prefixed session cookie.
- **Real shape:** Discussed extensively in `hunt-auth-bypass` Duende BFF Attack Class 2 (cookie-domain wildcarding turns subdomain takeover into session fixation). Pattern class: S3-bucket-takeover combined with parent-scoped (`Domain=.target.com`) cookies.

### Chain 3 — Takeover + CSP `script-src` Includes the Taken-Over Host → Persistent Stored XSS on Main App

- **A.** Inspect CSP header on the main app's HTML response. Look for `script-src 'self' assets.target.com cdn.target.com legacy.target.com ...`.
- **B.** Take over one of the CSP-allowlisted subdomains (especially common: stale CNAMEs to deleted CDNs, deleted Vercel/Netlify projects, archived analytics services).
- **C.** Host attacker-controlled JavaScript at the takeover host. Every page load on the main app fetches `<script src="//taken-over-host/x.js">` because the host is on the CSP allowlist. JS executes with main-app origin — full session access, can call any same-origin API.
- **Impact:** Stored XSS-equivalent on every page of the main app, persistent until the CSP is updated. Bypasses every input sanitiser because the JS source is "trusted" per CSP.
- **Real shape:** Sifchain `proxies.sifchain.finance` Vercel takeover — Disclosed Report Citation #14 (web3 phishing); pattern documented in multiple H1 disclosures 2020-2024.

### Chain 4 — Takeover + CORS `Access-Control-Allow-Origin` Regex Match → Credentialed Cross-Origin API Read

- **A.** Inspect the API's CORS configuration. Look for any regex / wildcard / suffix-match in `Access-Control-Allow-Origin` that includes `*.target.com` or `target.com.*` (the second is a common bug).
- **B.** Take over any subdomain that the CORS regex would accept (or register a new `target.com.attacker.com` host if suffix-match is broken).
- **C.** Attacker page hosted on the taken-over subdomain issues `fetch('https://api.target.com/account', {credentials:'include'})`. CORS preflight passes. Server returns credentialed response. Attacker's JS reads it.
- **Impact:** Mass cross-tenant API read with credentials — sessions, PATs, account data, billing records — all reachable from a single attacker page.
- **Real shape:** Multiple disclosed cases; cross-refs `hunt-api-misconfig` CORS subsection. Pairs with `hunt-misc` step 1 (CORS regex enumeration).

### Chain 5 — Takeover at Email DNS (DKIM / SPF / MX) → Email Spoofing → Phishing Trusted by Parent Brand

- **A.** Enumerate the target's email DNS — DKIM selectors (`selector1._domainkey.target.com`), SPF includes (`include:_spf.takeover-candidate.com`), MX records (`mx.target.com → defunct-provider.example`).
- **B.** Take over any DKIM-selector or SPF-include host. Now the attacker can publish DKIM/SPF records that authorise their own server to send mail "from" `@target.com`.
- **C.** Send phishing email `From: support@target.com` to victim. Recipient mail server passes SPF + DKIM checks (because the takeover server is now authorised). Email lands in inbox with `target.com` brand, no security warning.
- **Impact:** Highly-effective phishing campaign exploiting the parent brand. Victims trust the email because every authentication check passes. Credential harvesting, BEC fraud, supply-chain access.
- **Real shape:** Multiple historical disclosures on DKIM selector takeover / SPF include chain hijacking. Cross-refs DMARC / SPF / DKIM section in `offensive-osint`.

### Operator-level pattern

The five chains above are exhaustive in practice — virtually every senior-tier subdomain-takeover payout maps to one of them. Before reporting any takeover, run through the checklist:

1. **OAuth `redirect_uri` allowlist** — does the taken-over host appear? → Chain 1, Critical.
2. **Parent-domain cookies** — does the main app set `Domain=.target.com`? → Chain 2, High.
3. **CSP `script-src`** — does the taken-over host appear in the allowlist? → Chain 3, Critical.
4. **CORS allowlist** — does any regex match the taken-over host? → Chain 4, High.
5. **Email DNS (DKIM selector / SPF include)** — does the taken-over host appear? → Chain 5, High.

If none apply, file at Low/Informational. **Do not file at Critical without demonstrating one of these chains** — triagers downgrade fast otherwise.

Cross-references:
- `hunt-oauth` — Chain 1 (`redirect_uri` bypass class)
- `hunt-auth-bypass` Duende BFF Attack Class 2 — Chain 2 (cookie scoping)
- `hunt-xss` Chain 4 — Chain 3 (CSP bypass via trusted-origin JS)
- `hunt-api-misconfig` CORS section — Chain 4
- `offensive-osint` email-security section — Chain 5

---

## Related Skills & Chains

- **`hunt-cloud-misconfig`** — Most stale CNAMEs point at deleted cloud assets (S3, CloudFront, Heroku). Chain primitive: Cloud misconfig (S3 deleted) + `hunt-subdomain` → unclaimed CNAME points to bucket → claim bucket name → full subdomain control.
- **`hunt-oauth`** — A takeover on an OAuth `redirect_uri` host = persistent ATO across the entire SSO surface. Chain primitive: Subdomain takeover at `auth.target.com` + OAuth redirect_uri allowlist → auth code theft → ATO every user that re-authenticates.
- **`hunt-api-misconfig`** — CORS regexes routinely allowlist a takeoverable subdomain. Chain primitive: Subdomain takeover + CORS `*.target.com` with credentials → credentialed cross-origin API read → mass IDOR.
- **`hunt-xss`** — A claimed subdomain is same-origin to session-cookie-domain siblings. Chain primitive: Subdomain takeover at `feedback.target.com` + cookie scope `.target.com` → JS hosted on takeover host reads main-app cookies → session hijack.
- **`security-arsenal`** — Load the 27+ Subdomain Takeover Fingerprint Table (NoSuchBucket, "no such app", GitHub Pages 404 strings, Heroku, Shopify, Fastly) and the `subzy`/`subjack` automation patterns.
- **`triage-validation`** — Apply the Unique-Marker gate: takeover claim is informational on its own; submit only after publishing a unique HTML marker on the claimed host AND demonstrating a downstream impact (cookie read, OAuth chain, CSP bypass).

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
