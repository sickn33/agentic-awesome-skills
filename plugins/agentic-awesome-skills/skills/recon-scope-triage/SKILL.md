---
name: recon-scope-triage
description: Triage ASM/recon output for ownership before testing
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
sources: authorized-engagement
report_count: 1
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

## When to use this skill

Trigger when:
- The target brand is a common/dictionary word or shared term (e.g. `apex`, `summit`, `vertex`, `nova`, `core`, `orbit`, `pulse`, `unity`…)
- You receive an ASM report, recon export, breach combo, repo list, bucket list, or mobile-app list to act on
- A "Critical" count looks implausibly high (hundreds) for the org's size
- Any asset's ownership is asserted by the tool but not *proven*

The two failure modes this skill prevents:
1. **Wasting the engagement** testing/triaging assets that aren't the target's.
2. **Attacking an innocent third party** that merely shares the name — out of scope, and real harm.

**Rule: ownership is guilty-until-proven. An asset is the target's only when a concrete ownership signal ties it to the target — never because a scanner's keyword matched.**

---

## The collision sources (where keyword-matching lies)

| Recon source | How it collides | Verify ownership by |
|---|---|---|
| **GitHub repos** | Search matched the brand word in repo name / topic / a string | Repo owner is the org's GH org; commits from org emails; code references the org's real domains/infra. A repo named `<word>-backend` by a random user = noise. |
| **Cloud buckets** (S3/GCS) | Bucket names are a **global namespace**; `<word>-static`, `<word>-data`, `<word>-public` exist for *someone* | Bucket content references the target; bucket name correlates with a *confirmed* target subdomain (`x.target.com` ↔ `x-public`) AND content matches; ACL/owner metadata. Generic content (other-language, other-industry) = not theirs. |
| **Mobile apps** | Store search matched the brand word in app name / package | Publisher account = the org; package reverse-DNS = an owned domain (`com.<owneddomain>.app`); dev cert; app calls owned API hosts. Mature ASM tools emit an "apps_accepted=0" / ownership-confidence field — read it. |
| **Breach corpora / combos** | Email local-or-domain contains the brand word | **Exact** owned-domain match only (`@target.com`), not `@<word>group.com` / `@something<word>.com`. A different domain that contains the word is a different org. |
| **Typosquats** | Generated permutations of the name | These are *defensive*/brand-protection findings, not offensive scope — note and move on. |
| **Stack/forum/paste hits** | Brand word in body | Body references the target's real domain/subdomain/employee/secret. Ownership-confidence < threshold = drop. |

---

## Web "Critical" triage — the soft-404 control

Automated `.env` / `.git` / `actuator` / admin-panel "Criticals" are overwhelmingly **soft-404s**: SPA/framework catch-alls returning HTTP 200 (or 403) for *every* path. Verify EACH before believing it:
```bash
# the "finding"
curl -s -o /tmp/a -w "%{http_code} %{size_download}\n" https://host.target.com/.env
# a junk control on the same host
curl -s -o /tmp/b -w "%{http_code} %{size_download}\n" https://host.target.com/zzz-nonsense-$RANDOM
# identical byte length / body  →  FALSE POSITIVE (catch-all), discard
cmp -s /tmp/a /tmp/b && echo "SOFT-404 false positive" || echo "differs — investigate"
```
Real exposures have a content-type + signature that differs from the catch-all (`.git/config` starts `[core]`; `.env` has `KEY=value`; phpinfo has the XHTML-transitional doctype + `PHP Version`). A physical `.php`/`phpinfo.php` that returns a *bigger/different* body than the junk control is the real-vs-soft-404 tell.

---

## The triage workflow

1. **Confirm the canonical owned-domain set first** (the SOW/program domain + its verified subdomains + the verified Entra/Okta/Google tenant brand name). This is your ownership anchor.
2. **For each asset class, apply the verify-by column above.** No signal → quarantine, don't test.
3. **Re-baseline the severity counts** against only-owned assets. Report the *delta* — "N Criticals → M after ownership + soft-404 triage" is itself a finding about the ASM program.
4. **Quarantine collisions explicitly** (a `loot/quarantined_<source>.txt`) so it's auditable that you saw them and chose not to target them.
5. **Surface the meta-finding:** if the supplied ASM/recon feed is mostly false-positive, that misallocates the owner's remediation budget and buries real risk — write it up (Medium/Strategic).

---

## Anti-patterns

- **Trusting the tool's "owned" label.** Tools keyword-match; they don't prove ownership. Verify.
- **Targeting a same-named third party** because it was "in the report." Out of scope + real harm. A combo line `user@<word>company.com` is a different company's employee.
- **Reporting soft-404s as exposures.** Always run the junk-path control.
- **Counting typosquats / missing-headers / brand-collision repos as offensive findings.** They're defensive/hygiene/noise — they pad the report and erode credibility.
- **Skipping triage "to save time."** Untriaged, you spend the whole engagement on other people's assets and find nothing real.

---

## Why this matters (calibration)

For a target whose brand is a common word, expect the bulk of automated "owned" assets to be collisions:
- **Repos** that are unrelated open-source projects (ad-block lists, scrapers, student projects, a different company's SDK) merely containing the word.
- **Mobile apps** published by entirely different companies that share the name — banks, credit unions, dating apps, dispensaries, home-care services are all real-world collision categories. (Good ASM tooling will tell you it accepted *zero* as owned.)
- **Cloud buckets** in the global namespace holding some unrelated org's content (other-language documents, demo/sample data, another industry's files).
- **Breach combos** full of emails from sibling-named-but-different companies (`<word>group.com`, `<region><word>.com`).

On a real engagement against a dictionary-word brand, after clearing this noise the only genuinely-owned high-severity finding was discoverable solely by manual tradecraft (a JS-bundle → API discovery, see `hunt-spa-api`) — it was nowhere in the hundreds of scanner "Criticals." Triage-first is what made the engagement productive instead of a goose chase.

---

## Related Skills & Chains

- **`triage-validation`** — asset-ownership triage (this skill) precedes finding-validity triage (the 7-Question Gate). Ownership first, then validity.
- **`redteam-mindset`** — "aggressive default" means probe every *owned* live surface; this skill defines which surfaces are owned so persistence isn't wasted on collisions.
- **`hunt-spa-api`** — once an API host passes ownership triage, this is how you test it.
- **`offensive-osint` / `osint-methodology`** — feed ownership anchors (verified domains, tenant brand, dev accounts) from OSINT into this triage.

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
