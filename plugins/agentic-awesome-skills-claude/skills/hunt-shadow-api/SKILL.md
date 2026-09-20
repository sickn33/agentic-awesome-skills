---
name: hunt-shadow-api
description: Hunt shadow / zombie / undocumented API surface (OWASP API9 Improper
  Inventory Management)
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
sources: owasp_api_top10_2023, portswigger_research, public_research
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

## OWASP API9 — Improper Inventory Management (Shadow / Zombie APIs)

As an API evolves, old versions and internal/staging routes routinely stay reachable without
receiving the same security fixes as the current version — because nobody tracks that they
still exist. The bug is rarely in one endpoint; it's in the **delta** between what an old
version enforces and what the current version enforces on the same operation.

### When to use

Trigger when:
- Versioned paths are visible (`/v1/`, `/v2/`, `/api/2023-01-01/`) or `Accept`/`X-API-Version`
  headers are in play.
- A changelog, release notes, or deprecation notice references removed/old API behavior.
- A mobile APK/IPA (via `apk-redteam-pipeline` / `ios-redteam-pipeline`) hardcodes endpoints
  that look like an older backend version than the current web app calls.
- Multiple OpenAPI/Swagger specs are discoverable, or `info.version` in one spec implies others
  exist.

DO NOT use for single-version APIs with no version history — there's nothing to diff; go
straight to `hunt-api-misconfig` for direct exploitation of the one surface that exists.

---

## Stage 1 — Enumerate the Full Version Surface

```bash
# Path-based versioning
for v in v1 v2 v3 v4 beta alpha internal legacy old 2022-01-01 2023-01-01 2024-01-01; do
  curl -s -o /dev/null -w "%{http_code} /api/$v/\n" "https://$TARGET/api/$v/"
done

# Header-based versioning
curl -s -H "X-API-Version: 1" https://$TARGET/api/users
curl -s -H "Accept: application/vnd.company.v1+json" https://$TARGET/api/users

# Subdomain-based versioning
for sub in api api-v1 api-v2 apiv1 apiv2 legacy-api old-api internal-api staging-api; do
  curl -s -o /dev/null -w "%{http_code} $sub\n" "https://$sub.$TARGET/"
done
```

A `200`/`401`/`403` on an old version path (anything but `404`/connection-refused) means the
version is still live and worth carrying into Stage 3, even if it demands auth.

---

## Stage 2 — Pull Every Reachable Spec, Not Just the Linked One

```bash
for path in openapi.json swagger.json v1/swagger.json v2/swagger.json v3/api-docs \
            api-docs.json swagger/v1/swagger.json .well-known/openapi.json; do
  curl -s -o /dev/null -w "%{http_code} /$path\n" "https://$TARGET/$path"
done

# Wayback Machine — a DEPRECATED version's spec often stays indexed after the live link is removed
curl -s "http://web.archive.org/cdx/search/cdx?url=$TARGET/*swagger*&output=json&collapse=urlkey"
curl -s "http://web.archive.org/cdx/search/cdx?url=$TARGET/*openapi*&output=json&collapse=urlkey"
```

When more than one spec resolves (a current one and an archived/old one), diff the endpoint
inventories directly:
```bash
jq -r '.paths | keys[]' v1-swagger.json | sort > /tmp/v1_paths.txt
jq -r '.paths | keys[]' v2-swagger.json | sort > /tmp/v2_paths.txt
comm -23 /tmp/v1_paths.txt /tmp/v2_paths.txt   # in v1 only — candidates for "still live but forgotten"
```
For every path in that diff, confirm it's still reachable against the v1 base URL. A route
documented only in the old spec that still returns something other than `404` is a zombie-
endpoint candidate — carry it into Stage 3.

---

## Stage 3 — Behavioral Diff Between Old and Current Version

For each operation that exists in **both** versions, compare security-relevant behavior, not
response shape. Response shape differences are Informational; behavioral security regressions
are the finding.

- **Auth strength.** Does the old version accept no token, an expired token, or a lower-
  privilege token that the current version rejects?
  ```bash
  curl -s -H "Authorization: Bearer $EXPIRED_TOKEN" https://$TARGET/api/v1/users/me -w '\n%{http_code}\n'
  curl -s -H "Authorization: Bearer $EXPIRED_TOKEN" https://$TARGET/api/v2/users/me -w '\n%{http_code}\n'
  ```
- **Rate limiting.** Burst the same number of requests against both versions' equivalent
  endpoint; a missing `429` on the old version means rate-limiting was added later and never
  backported.
- **Input validation.** Send the identical injection/oversized/malformed payload to both; the
  old version accepting what the new one rejects means hardening happened forward-only —
  chain into whichever injection class the payload targets (`hunt-sqli`, `hunt-idor`, etc.).
- **Field exposure.** Does the old version's response body include fields — internal IDs, other
  users' data, internal notes, PII — that the current version has since redacted?

---

## Stage 4 — Deprecated / Internal Routes Never Referenced by the Current UI

- Grep JS bundles for API calls no visible UI flow triggers (`/internal/`, `/admin/`, `/debug/`,
  `/_internal/`, `/test/`, `/staging/`) — reuse `hunt-source-leak`'s JS-bundle grep patterns for
  this specifically.
- Check `robots.txt` / `sitemap.xml` for disallowed API paths — a self-inflicted disclosure.
- Mobile-app endpoint inventories (via `apk-redteam-pipeline` / `ios-redteam-pipeline`) very
  often reference an older backend version than the current web app calls. Treat every
  APK/IPA-sourced endpoint as a version-diff candidate against the live web API.

---

## False-Positive Gate

- A version difference alone (different response shape, cosmetic field renaming) is
  Informational. The finding is a **security-relevant regression** — auth, rate-limit, or
  validation that got weaker going backward in version history.
- Confirm the old endpoint is not simply an alias/proxy to the current implementation before
  claiming a behavioral difference — send a payload that would actually behave differently
  under old vs. new logic, not just compare a version string in the response body.
- A `200` on a path that just serves a static "this API version is deprecated, use v2" message
  is not a finding — confirm the underlying operation still executes.

---

## Severity Table

| Finding | Severity |
|---|---|
| Old version bypasses auth entirely where current version requires it | Critical |
| Old version missing rate-limit present on current version | Medium–High (chain via `hunt-brute-force`) |
| Old version leaks extra fields (PII, internal IDs) vs. current | Medium–High |
| Old version accepts payloads the current version now validates/sanitizes | High (chain to the underlying injection class) |
| Version is reachable but behaviorally identical to current | Informational |

---

## Related Skills & Chains

- **`hunt-api-misconfig`** — owns exploitation once a spec or endpoint is in hand (mass
  assignment, JWT attacks, OData, Swagger-chain attacks). This skill hands it a sharper target:
  "here's a zombie endpoint with weaker validation than the current one."
- **`hunt-subdomain`** — owns host/subdomain-level discovery (`api-v1.target.com` as its own
  host, potential takeover). This skill owns what happens once you're inside a given host's
  version surface.
- **`hunt-source-leak`** — JS-bundle grep for internal/undocumented calls; reused here
  specifically for version-diffing rather than secret extraction.
- **`apk-redteam-pipeline`** / **`ios-redteam-pipeline`** — mobile builds routinely hardcode an
  older API version; every mobile-sourced endpoint is a version-diff candidate.
- **`hunt-brute-force`** — a rate-limit regression found here is only a complete finding once
  chained to actual brute-forceable impact (login, OTP, enumeration).

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
