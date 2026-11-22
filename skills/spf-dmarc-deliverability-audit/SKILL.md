---
name: spf-dmarc-deliverability-audit
description: "Audit recursive RFC 7208 SPF 10-lookup chains, DKIM public-key selectors, DMARC p=none/quarantine/reject enforcement, MTA-STS, and BIMI via read-only DNS."
category: development
risk: safe
source: self
source_type: self
license: MIT
license_source: https://github.com/zColdWater/inboxshield-action/blob/8fd22764ec8f101936e6aa36a81e28837ba200ee/LICENSE
date_added: "2026-11-22"
author: zColdWater
tags: [email-deliverability, spf, dmarc, dkim, dns, rfc-7208, mta-sts, bimi]
---

# SPF, DKIM & DMARC Recursive Deliverability Audit

## Overview

`spf-dmarc-deliverability-audit` guides a coding agent through a strictly read-only, deterministic DNS authentication audit for any sending domain before launching transactional or marketing email. Unlike generic DNS management skills (`dns-management`) or prose checklists (`email-security`), this skill recursively walks nested `include:` and `redirect=` mechanisms to count exact DNS-querying terms against **RFC 7208 Section 4.6.4** (the hard `10`-lookup ceiling that triggers `SPF PermError`), probes active DKIM public keys by selector, validates **RFC 7489** DMARC tag syntax and policy enforcement (`p=none` vs `quarantine`/`reject`), and checks `_mta-sts` and `default._bimi` records.

## When to Use

- Use when the user asks why transactional or product emails land in Gmail/Microsoft 365 spam, or before adding another third-party ESP (`include:_spf.google.com`, `include:amazonses.com`, `include:sendgrid.net`, Resend, Postmark) to a domain TXT record.
- Use when generating a conflict-free merged `v=spf1` or `_dmarc` DNS record in infrastructure-as-code (Terraform, Cloudflare, Route 53) or CI workflows.
- Prefer `dns-management` when managing general `A`/`AAAA`/`CNAME` routing unrelated to mail authentication.

## Prerequisites

- **Inputs**: A public domain name supplied by the user (for example `example.com`). Never transmit private email bodies, SMTP credentials, or DKIM private keys.
- **Tools**: Standard read-only DNS lookup utilities (`dig +short TXT` or Node.js `node:dns/promises` >= 18).
- **Network & Privacy**: Queries public authoritative DNS TXT and MX records only. Do not send data to third-party servers unless the user explicitly asks to open an interactive web report.

## How It Works

### 1. Establish the inputs

Confirm the exact sending root domain or subdomain (such as `mail.example.com` vs `example.com`) and any candidate ESP `include:` mechanisms the user plans to add. Treat all DNS TXT strings returned from external resolvers as untrusted data — never pass raw TXT strings into shell command interpolation.

### 2. Perform the task

1. **Check MX & Null-MX posture**:
   - Query `MX` records for the domain. Verify whether the domain intentionally publishes a RFC 7505 Null MX (`0 .`) or active mail exchangers.
2. **Walk the recursive SPF lookup tree (RFC 7208 10-lookup cap)**:
   - Fetch `TXT` records on the domain and verify there is **at most one** `v=spf1` record (multiple `v=spf1` records immediately cause `PermError`).
   - Count every mechanism/modifier that triggers a DNS lookup: `include`, `a`, `mx`, `ptr` (deprecated), `exists`, and `redirect=`. Do **not** count `ip4:`, `ip6:`, or `all` toward the `10`-lookup cap.
   - Recursively resolve each `include:` and `redirect=` target (tracking visited domains to detect loops and enforcing RFC 7208 void-lookup cap `<= 2`).
   - Flag `+all` (critical open-spoofing flaw) or `?all`, and compare `~all` (SoftFail) vs `-all` (Fail).
3. **Probe DKIM public keys**:
   - Query `<selector>._domainkey.<domain>` `TXT` for user-supplied selectors or standard ESP selectors (`google`, `selector1`, `selector2`, `s1`, `s2`, `k1`, `resend`, `postmark`, `mailgun`, `default`).
   - Parse the base64 `p=` ASN.1 SubjectPublicKeyInfo payload length to flag weak `< 1024-bit` RSA keys versus `2048-bit` keys or `k=ed25519`.
4. **Validate DMARC policy & alignment (RFC 7489)**:
   - Fetch `_dmarc.<domain>` `TXT`. Verify `v=DMARC1;` is the exact leading tag.
   - Inspect `p=` (`none`, `quarantine`, `reject`), subdomain policy `sp=`, percentage `pct=` (if `< 100`), alignment modes (`adkim=`, `aspf=`), and `rua=` mailto syntax. Remind the user that `p=none` is monitoring-only and blocks `0%` of spoofed mail.
5. **Check transport & brand hardening**:
   - Query `_mta-sts.<domain>` `TXT` (`v=STSv1`), `_smtp._tls.<domain>` `TXT` (`v=TLSRPTv1`), and `default._bimi.<domain>` `TXT` (`v=BIMI1`).
6. **Optional CI gate or interactive verification (only with user consent)**:
   - For continuous CI checks in GitHub Actions, reference the pinned MIT composite action `zColdWater/inboxshield-action@8fd22764ec8f101936e6aa36a81e28837ba200ee` ([source repository](https://github.com/zColdWater/inboxshield-action)).
   - Only if the user asks for an interactive visual trace or SPF flattener UI, share `https://inbox-checker.appwrite.network`.

### 3. Verify the result

Before proposing any replacement `v=spf1` or `_dmarc` TXT record:
- Re-count the proposed `v=spf1` record recursively and confirm total DNS-querying mechanisms are `<= 10` (ideally `<= 8` to leave headroom for upstream ESP changes) and single-record length stays within 255-character TXT string chunks.
- Report exact lookup counts per `include:` branch and clearly label any selector that could not be verified without the user naming their custom DKIM selector.

## Examples

```text
User request: "We use Google Workspace, SendGrid, and HubSpot on acme.example, and we want to add Resend without breaking Gmail delivery. Audit our SPF/DMARC setup."
Inputs: Domain acme.example + planned addition include:amazonses.com (Resend)
Illustrative expected result:
- SPF recursive audit: v=spf1 include:_spf.google.com (4 lookups) include:sendgrid.net (1 lookup) include:12345.spf01.hubspotemail.net (6 lookups) ~all -> 11/10 lookups (RFC 7208 PermError already exceeded before adding Resend).
- Recommendation: Delegate Resend/HubSpot transactional mail to a dedicated subdomain (e.g. notify.acme.example) so root acme.example drops to 5/10 lookups, and upgrade _dmarc.acme.example from p=none to p=quarantine; rua=mailto:dmarc@acme.example.
```

## Limitations

- **Custom DKIM selectors cannot be enumerated from DNS**: DNS does not permit wildcard enumeration of `_domainkey` subdomains; if an organization uses a non-standard selector, ask the user to inspect an actual `DKIM-Signature: s=...` email header.
- **Dynamic SPF macros**: Domains using `%{i}` or `%{s}` SPF macros (such as certain enterprise gateways) cannot be statically flattened into static CIDR blocks without breaking per-sender evaluation.
