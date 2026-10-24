---
name: hunt-ldap
description: Hunt LDAP Injection and XPath Injection
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
sources: hackerone_public, owasp, portswigger
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

# HUNT-LDAP — LDAP Injection & XPath Injection

> Grounding note: LDAP injection is rarely disclosed with verbatim payloads on
> public platforms (most live on internal-pentest reports). This skill is
> grounded in the **OWASP LDAP Injection Prevention / Testing Guide
> (WSTG-INPV-06)**, **PortSwigger Web Security Academy (LDAP injection)**, and
> the **RFC 4515** filter grammar — all publicly verifiable references rather
> than invented HackerOne IDs. Do not cite a report you cannot link.

## Crown Jewel Targets

LDAP injection that bypasses authentication = **Critical**. Blind attribute
exfiltration of credentials/secrets = **High**. AD enumeration alone = Medium-High.

**Highest-value chains:**
- **LDAP auth bypass** — close the `uid` filter and append an always-true OR so the
  bind/search returns the admin entry without a valid password.
- **Blind attribute exfil** — char-by-char extraction of an attribute value via a
  boolean oracle (login success/failure, result count, or response length).
- **userPassword hash exfil (non-AD only)** — on OpenLDAP/389-DS the
  `userPassword` attribute can hold `{SSHA}`/`{CRYPT}` hashes that ARE readable
  by query. See the AD-vs-generic warning below.
- **XPath injection auth bypass** — `' or '1'='1` against XML-backed auth.

---

## CRITICAL — Active Directory vs generic LDAP

Do **not** conflate the two. They behave very differently:

| | Generic LDAP (OpenLDAP, 389-DS, ApacheDS) | Active Directory |
|---|---|---|
| Password attribute | `userPassword` — may hold `{SSHA}`/`{MD5}`/`{CRYPT}` and **is readable** if ACL allows | `unicodePwd` — **write-only**, never returned by any search |
| Hash exfil via injection | **Possible** where ACLs leak `userPassword` | **Not possible** — there is no readable hash attribute over LDAP |
| Useful enum attrs | `uid`, `cn`, `mail`, `userPassword` | `sAMAccountName`, `userPrincipalName`, `mail`, `memberOf`, `description` (often holds plaintext secrets!) |

**Do not tell a reader that blind LDAP injection yields AD password hashes — it
does not.** `unicodePwd` is write-only. Against AD, the win is enumeration
(`sAMAccountName`, `memberOf`, `description`/`info` fields that admins misuse to
store passwords) and auth bypass — not hash dumping. The hash-exfil technique
applies **only** to non-AD directories exposing `userPassword`.

---

## Attack Surface Signals

```
Corporate SSO / intranet login pages (often legacy Java/Spring/PHP)
Windows + IIS + "integrated" directory auth
/api/ldap/*  /api/directory/*  /people  /address-book  /search?dir=
"Find a colleague" / org-chart / employee-search features
XML-backed config or auth → XPath injection candidate
Error strings that confirm an LDAP backend:
  javax.naming.NameNotFoundException
  javax.naming.directory.InvalidSearchFilterException
  LDAP: error code 49 - 80090308  (AD invalid creds / bind failure)
  com.sun.jndi.ldap.*  /  System.DirectoryServices  /  ldap_search():
  "Bad search filter"  /  net.ldap (Go)  /  python-ldap SERVER_DOWN
```

---

## LDAP filter grammar (RFC 4515) — why injection works

A login filter is typically built by string-concat:

```
(&(uid=<USERNAME>)(userPassword=<PASSWORD>))
```

`&` = AND, `|` = OR, `!` = NOT. **Filters are prefix/Polish notation** — the
operator comes first and every sub-filter is parenthesised. To inject you must
(a) escape the current `(uid=...)` group, (b) inject your own logic, and
(c) leave the overall parenthesis count **balanced** or the server throws a
filter-syntax error instead of executing.

### The special-character set — TEST EACH ONE

These characters are syntactically meaningful and MUST be escaped by a safe app
(RFC 4515 §3). A different response can suggest parser involvement but does not prove unescaped input or exploitability:

| Char | Filter escape | Why it matters |
|------|---------------|----------------|
| `*`  | `\2a` | wildcard — matches any value |
| `(`  | `\28` | opens a filter group |
| `)`  | `\29` | closes a filter group |
| `\`  | `\5c` | escape char itself |
| NUL  | `\00` | string terminator — truncates filter in C-backed servers |
| `,` | DN-context escaping | RDN separator; DN encoding differs from filter encoding |

**Search-filter context vs DN injection** are different bugs:
- **Search-filter injection** (most common): your input lands inside a
  `(attr=VALUE)` filter. Payloads use `* ( ) & | !`.
- **DN injection**: your input is concatenated into a Distinguished Name
  (`uid=VALUE,ou=people,dc=corp`). Here `,` `=` `+` `"` `\` `<` `>` `;` and leading/trailing spaces
  matter, and a `*` is NOT a wildcard. Test both — the payloads do not transfer.

---

## Step-by-Step Hunting Methodology

### Phase 1 — Confirm an LDAP backend (baseline first)

```bash
# ALWAYS capture a control response first — you compare everything to this.
BASE=$(curl -s -o /dev/null -w "%{http_code}|%{size_download}|%{time_total}" \
  -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"validlookinguser","password":"wrongpass"}')
echo "BASELINE (valid-format, wrong pw): $BASE"

# Send a single unbalanced paren. A SAFE (escaping) app → identical baseline.
# An INJECTABLE app → 500 / filter-syntax error / different size.
curl -s -X POST https://$TARGET/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test)","password":"x"}' | grep -iE \
  "naming|InvalidSearchFilter|error code 49|Bad search filter|jndi|ldap_search"
```

A lone `)` that produces a syntax error/500 while a balanced payload does not is
the cleanest LDAP-injection tell — note it, you will need it as proof.

### Phase 2 — Derive a controlled test from the actual expression

Do not copy a universal login payload. Record the full resulting filter, its
parentheses and the actual bind/search flow; LDAP filters have no SQL-style
comment syntax. A filter selecting a user does not itself authenticate a password.
In a local fixture where the complete predicate is `(uid=INPUT)`, `*` changes the
expression to `(uid=*)` and tests presence rather than a literal star. Compare
that with the correctly escaped literal `(uid=\2a)` and a nonexistent synthetic
UID. In a real nested AND filter, those results do not establish password bypass.

Use paired true/false controls on a public synthetic attribute and controlled
accounts, not a production credential value. Bound the requests, rate and runtime;
stop on lockout, elevated errors or unexpected personal data. Never expand to
password spraying, hash cracking or real attribute extraction without separately
scoped authorization and the exact command gate above.

### Phase 3 — XPath and evidence

For a known XPath 1.0 expression using a quoted string, a quote may alter syntax;
construct the entire predicate and verify precedence, quoting and selected nodes
in a disposable local XML fixture. Prefer variable binding in the application's
XPath API to concatenation. Error messages or response length alone do not prove
successful authentication or data access. Use a controlled test session and a
post-login resource only within scope; do not print cookies or account records.

### Phase 4 — Direct LDAP confirmation and remediation

If direct directory access is authorized, use certificate-verified LDAPS or
required StartTLS and prompt-based credentials (`ldapsearch -W`) rather than a
password in command arguments. Restrict requested attributes and search base.
Use the library's distinct filter-value and DN escaping APIs, least-privilege
bind accounts and proper bind authentication; reject empty passwords where the
application requires authentication. A referral-like filter attribute is not a
standard instruction to follow a URL. OOB callbacks require correlation and
controls and cannot automatically prove LDAP injection or exclude scanner noise.

Primary references: [RFC 4515](https://www.rfc-editor.org/rfc/rfc4515),
[OWASP prevention](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html).

## Chain Table

| LDAP finding | Chain to | Impact |
|--------------|----------|--------|
| Auth-bypass (always-true filter) | Admin/SSO panel as first directory entry | Critical |
| AD enumeration (`sAMAccountName`) | Username list → password spray / credential stuffing | Mass-ATO risk |
| `memberOf` enumeration | Identify Domain Admins → targeted phishing/spray | Targeted compromise |
| `description`/`info` field read | Plaintext creds admins stashed there | Direct credential leak |
| Blind exfil of `userPassword` **(non-AD only)** | `{SSHA}` (salted SHA-1) → hashcat `-m 111` (`{SSHA256}`=1411, `{SSHA512}`=1711); `{CRYPT}` → mode depends on the `$id$` prefix (`$1$`=500, `$6$`=1800) → offline crack | High |
| LDAP referral → Collaborator | Server-side request / internal directory reach | SSRF-class, confirms blind |

> AD has no readable password attribute — do not list "extract AD hashes" as a
> chain. Against AD, the credential win comes from `description`/`info` misuse or
> from enumerated usernames feeding a spray, never from `unicodePwd`.

---

## Validation — rule out the false positive BEFORE you report

A "bypass" or "match" is only real once you have eliminated syntax-error,
WAF-block, and length-jitter explanations.

- [ ] **Auth bypass:** the always-true payload returns a **valid authenticated
      session** (session cookie + access to a post-login resource), and the same
      request with one paren removed returns a **filter-syntax error** — proving
      the filter parsed and executed, not that the app fell open on every input.
- [ ] **Negative control:** an equivalently-shaped but logically-FALSE payload
      (`)(uid=NONEXISTENT_ZZZ)`) returns the **failure** response. If both
      true-class and false-class "succeed", you found a broken endpoint, not LDAP
      injection.
- [ ] **Blind exfil:** each recovered char reproduces 3x with stable size; the
      FALSE control still reads FALSE between rounds; recovered value verified by
      a direct lookup or by the auth-bypass payload that uses it.
- [ ] **XPath:** quotes/brackets remained balanced (no 500), and the bypass logged
      in to a real account context — not just a different error page.
- [ ] **OOB where possible:** a correlated callback requires mechanism-specific evidence and controls; it is not decisive on its own.
- [ ] **AD claim discipline:** if you say "AD", you enumerated AD-specific attrs
      (`sAMAccountName`/`memberOf`); never claim AD hash exfil.

**Severity:**
- Auth bypass landing as admin/privileged directory entry: **Critical**
- `userPassword` hash exfil (non-AD) or `description`-field credential read: **High**
- AD user/group enumeration only: **Medium-High**
- Blind boolean oracle confirmed but no useful attribute reachable: **Medium**

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

Severity labels above are triage hypotheses, not automatic CVSS outcomes. Generic LDAP userPassword values are readable only with suitable ACLs; AD unicodePwd is not returned by ordinary search, but that does not justify a blanket claim that no AD attribute can ever contain a secret. Do not imply a PortSwigger LDAP academy/lab exists without a verified direct reference. Missing report_count evidence is not a confirmed engagement history.
